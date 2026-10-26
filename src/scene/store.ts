// Holds the scene, the selection and undo/redo history. Every mutation goes through update().
import { emptyScene } from './defaults';
import { parseScene } from './validate';
import { clearCams, eyeClear, limitOrbit } from './orbit';
import { fitTable } from './table';
import { sameGrid, sampleTerrain } from './terrain';
import { keepInWater } from './water';
import { clearTopGear } from './topgear';
import { clampItem } from './items';
import { holdIntegrated } from './integrated';
import { prunePairs } from './pairs';
import { groupSize, type Group } from './duplicate';
import type { BrushState } from './brush';
import type { CameraSettings, Fish, Item, Scene, TankSetup } from './types';

/** 'scene' = 3D content changed (rebuild), 'view' = camera only (redraw), 'select' = selection only. */
export type ChangeKind = 'scene' | 'view' | 'select' | 'load';
export type Listener = (kind: ChangeKind) => void;

export interface UpdateOptions {
  kind?: ChangeKind;
  /** false = not undoable (camera moves). Default true for 'scene'. */
  history?: boolean;
  /** Consecutive updates with the same key within COALESCE_MS form one undo step (slider drags, pointer drags). */
  coalesce?: string;
}

const COALESCE_MS = 1200, MAX_HISTORY = 200;
export const STORAGE_KEY = 'tanklook.scene';

/** Custom terrain (a swamp's land, since 2026-10-16) is drawn in the substrate, so it always has its substrate shown:
 *  the Substrate panel then says what you see, not "Bare bottom" (audit #15). */
const swampGround = (t: TankSetup) => { if (t.terrain.on) t.substrate.show = true; };

export class Store {
  scene: Scene;
  selId: number | null = null;
  /** The selected aquascape item (rock, wood, cave, plant); at most one of selId / selItem is set. */
  selItem: number | null = null;
  /** More animals / pieces selected along with the one above (lane MS): the group is selId / selItem plus these. */
  extraFish: number[] = [];
  extraItems: number[] = [];
  /** Painted patches in the selection (lane SB); cleared by a plain select. */
  selPatches: number[] = [];
  /** Scatter brush (lane SB): the brush tool's state; a UI state, never saved. */
  brush: BrushState = { on: false, erase: false, target: null, id: 'leaf', size: 60, density: 60, leaf: 'mixed' };
  setBrush(b: Partial<BrushState>) { Object.assign(this.brush, b); if (b.on) this.multi = false; this.emit('select'); }
  /** Multi mode (the Multi button, for touch): a plain tap adds to or takes from the group, an empty drag draws a box. */
  multi = false;
  /** Per view: does the panel's editing apply to that tank (the "Edit" box on each view's tab). UI state, not saved. */
  editOn: boolean[] = [true, false];
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private lastKey: string | null = null;
  private lastTime = 0;
  private listeners = new Set<Listener>();
  /** The view whose camera moved last (UI state): re-locking copies its camera to the other view. */
  lastCam = 0;
  /** What the last 'load' was: a new scene (open, new, a start) or undo / redo stepping through history. */
  loadedBy: 'replace' | 'history' = 'replace';

  constructor(scene: Scene = emptyScene()) {
    this.scene = scene;
    this.editOn = [0, 1].map(k => k === scene.active);
    // nothing starts selected (Nathan 2026-10-13: a refresh or an opened tank showed a fish highlighted)
  }

  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(kind: ChangeKind) { for (const fn of this.listeners) fn(kind); }

  /** The tank the panel shows (one of the tanks being edited, when any is). The selection always refers to a fish in this tank. */
  get tank(): TankSetup { return this.scene.tanks[this.scene.active] ?? this.scene.tanks[0]; }
  get split() { return this.scene.tanks.length > 1; }
  get selected(): Fish | undefined { return this.tank.fish.find(f => f.id === this.selId); }
  get selectedItem(): Item | undefined { return this.tank.items.find(it => it.id === this.selItem); }
  /** Everything selected, of the shown tank (the lead one first; ids that no longer exist are dropped). */
  get group(): Group {
    const T = this.tank, uniq = (a: (number | null)[]) => [...new Set(a.filter((v): v is number => v != null))];
    return {
      fish: uniq([this.selId, ...this.extraFish]).filter(id => T.fish.some(f => f.id === id)),
      items: uniq([this.selItem, ...this.extraItems]).filter(id => T.items.some(it => it.id === id)),
      ...(this.selPatches.length ? { patches: this.selPatches.filter(id => T.patches?.some(p => p.id === id)) } : {}),
    };
  }
  get groupCount() { return groupSize(this.group); }
  inGroup(kind: 'fish' | 'item', id: number) { return (kind === 'fish' ? this.group.fish : this.group.items).includes(id); }

  /** Indices of the tanks the panel edits (the views with "Edit" ticked); the shown tank first. A single tank is
   *  always edited; split, it is empty while no box is ticked (the panel is then closed). */
  get targets(): number[] {
    const n = this.scene.tanks.length, a = this.scene.active;
    if (n === 1) return [0];
    return [...Array(n).keys()].filter(i => this.editOn[i]).sort((x, y) => +(y === a) - +(x === a));
  }
  isEditing(i: number) { return this.targets.includes(i); }

  /** Mutate every tank being edited (same options as update), all in one undo step. */
  edit(fn: (t: TankSetup, s: Scene) => void, opts: UpdateOptions = {}) {
    const ts = this.targets;
    this.update(s => { for (const i of ts) if (s.tanks[i]) fn(s.tanks[i], s); }, opts);
  }

  /** Mutate tank i only (direct manipulation in its view: dragging a fish or a terrain dot). */
  editTank(i: number, fn: (t: TankSetup, s: Scene) => void, opts: UpdateOptions = {}) {
    this.update(s => { if (s.tanks[i]) fn(s.tanks[i], s); }, opts);
  }

  /** Move a camera (not undoable): view i's (orbit / zoom in that view), or else every edited tank's (panel sliders).
   *  While the cameras are locked, both views move together. */
  cam(fn: (c: CameraSettings) => void, i?: number) {
    this.lastCam = i ?? this.scene.active;
    this.update(s => {
      for (const k of s.camLock ? [i ?? s.active] : i != null ? [i] : this.targets) {
        const A = s.tanks[k]; if (!A) continue;
        const prev = { ...A.camera }; fn(A.camera);
        // the eye stops at the room wall (every locked tank's wall, since they share the view)
        const ok = (c: CameraSettings) => (s.camLock ? s.tanks : [A]).every(t => eyeClear(t, c));
        const c = A.camera = limitOrbit(prev, A.camera, ok);
        if (s.camLock) for (const t of s.tanks) t.camera = { ...c };
      }
    }, { kind: 'view' });
  }

  /** Make tank i the one the panel shows (it must be one being edited). Keeps the selection when the same fish id exists there. */
  setActive(i: number) {
    if (i === this.scene.active || !this.scene.tanks[i] || !this.editOn[i]) return;
    this.scene.active = i; this.seal();
    if (!this.tank.fish.some(f => f.id === this.selId)) this.selId = null;
    if (!this.tank.items.some(it => it.id === this.selItem)) this.selItem = null;
    this.emit('select');
  }

  /** Tick / untick view i's "Edit" box. The panel shows a ticked tank: ticking one while the shown tank is unticked
   *  shows it; unticking the shown tank shows the other if that one is ticked. */
  setEditing(i: number, on: boolean) {
    const n = this.scene.tanks.length; if (i >= n) return;
    this.editOn[i] = on; this.seal();
    const a = this.scene.active;
    if (on && !this.editOn[a]) this.scene.active = i;
    if (!on && i === a) { const o = this.editOn.findIndex((v, k) => v && k < n); if (o >= 0) this.scene.active = o; }
    if (!this.tank.fish.some(f => f.id === this.selId)) this.selId = null;
    if (!this.tank.items.some(it => it.id === this.selItem)) this.selItem = null;
    this.emit('select');
  }

  /** A fish id free in every tank, so a fish added to both tanks gets the same id (the selection then covers both). */
  nextId() { return Math.max(...this.scene.tanks.map(t => t.fish.reduce((m, f) => Math.max(m, f.id), 0))) + 1; }
  /** An item id free in every tank (the same item added to both tanks shares it, like fish). */
  nextItemId() { return Math.max(...this.scene.tanks.map(t => t.items.reduce((m, it) => Math.max(m, it.id), 0))) + 1; }

  /** Split: copy the current tank into a second, independent one, which becomes active. Undoable. */
  splitTank() {
    if (this.split) return;
    this.editOn = [false, true]; // before update(), so listeners see the new targets
    this.update(s => { s.tanks.push(structuredClone(s.tanks[0])); s.active = 1; });
  }

  /** Split with Tank B built from tank A by `make` (lane DM: A with a bundle's gear swapped in), in one undo step. */
  splitTankWith(make: (a: TankSetup) => TankSetup) {
    if (this.split) return;
    this.editOn = [false, true];
    this.update(s => { s.tanks.push(make(structuredClone(s.tanks[0]))); s.active = 1; });
  }

  /** Close tank i; the other one stays as the single tank. Undoable. */
  closeTank(i: number) {
    if (!this.split) return;
    this.editOn = [true, false];
    this.update(s => { s.tanks.splice(i, 1); s.active = 0; });
    if (!this.tank.fish.some(f => f.id === this.selId)) this.selId = null;
  }

  /** Lock / unlock the two cameras. Re-locking snaps the other view to the camera of the view moved last (audit #21;
   *  was always the original tank's, Nathan 2026-10-08), so the view you were working in keeps its angle. */
  setCamLock(on: boolean) {
    this.update(s => {
      s.camLock = on; if (!on) return;
      const c = { ...(s.tanks[this.lastCam] ?? s.tanks[0]).camera };
      for (const t of s.tanks) t.camera = { ...c };
      clearCams(s.tanks, true);
    }, { kind: 'view' });
  }

  update(fn: (s: Scene) => void, opts: UpdateOptions = {}) {
    const kind = opts.kind ?? 'scene', history = opts.history ?? kind === 'scene';
    if (history) {
      const now = performance.now();
      const merge = opts.coalesce != null && opts.coalesce === this.lastKey && now - this.lastTime < COALESCE_MS;
      if (!merge) this.pushUndo();
      this.lastKey = opts.coalesce ?? null; this.lastTime = now;
    }
    fn(this.scene);
    // a terrain grid of another kind than its tank's (copied from the other tank, or a new shape) is resampled onto it
    const regrid = (t: TankSetup) => { const te = t.terrain; if (te.h.length && !sameGrid(te, t.tank)) t.terrain = { ...sampleTerrain(t, t.tank, te.cols), on: te.on }; };
    if (kind === 'scene') { for (const t of this.scene.tanks) { holdIntegrated(t); prunePairs(t); regrid(t); swampGround(t); keepInWater(t); fitTable(t); clearTopGear(t); for (const it of t.items) clampItem(it, t.tank, t); } clearCams(this.scene.tanks, this.scene.camLock); }
    if (this.selId != null && !this.tank.fish.some(f => f.id === this.selId)) this.selId = null;
    if (this.selItem != null && !this.tank.items.some(it => it.id === this.selItem)) this.selItem = null;
    this.pruneExtras();
    this.emit(kind);
  }

  /** End any coalescing group, so the next update starts a new undo step (call at gesture end). */
  seal() { this.lastKey = null; }

  select(id: number | null) {
    if (id === this.selId && (id != null || this.selItem == null) && !this.extraFish.length && !this.extraItems.length && !this.selPatches.length) return;
    this.selId = id; this.selItem = null; this.extraFish = []; this.extraItems = []; this.selPatches = []; this.emit('select');
  }
  selectItem(id: number | null) {
    if (id === this.selItem && this.selId == null && !this.extraFish.length && !this.extraItems.length && !this.selPatches.length) return;
    this.selItem = id; this.selId = null; this.extraFish = []; this.extraItems = []; this.selPatches = []; this.emit('select');
  }
  /** Select exactly this group (the lead is the first animal, else the first piece). */
  selectGroup(g: Group) {
    const [lf, ...rf] = g.fish, [li, ...ri] = g.items;
    this.selId = lf ?? null; this.selItem = lf == null ? li ?? null : null;
    this.extraFish = rf; this.extraItems = lf == null ? ri : g.items; this.selPatches = [...(g.patches ?? [])];
    this.emit('select');
  }
  /** Add an animal / piece to the group, or take it out if it is in (shift-click, the Multi button). */
  toggle(kind: 'fish' | 'item', id: number) {
    const g = this.group, list = kind === 'fish' ? g.fish : g.items, at = list.indexOf(id);
    if (at >= 0) list.splice(at, 1); else list.push(id);
    this.selectGroup(g);
  }
  /** Select exactly this painted patch (a click on it). */
  selectPatch(id: number | null) { this.selectGroup({ fish: [], items: [], ...(id != null ? { patches: [id] } : {}) }); }
  /** Add a painted patch to the selection, or take it out. */
  togglePatch(id: number) {
    const g = this.group, list = g.patches ?? [], at = list.indexOf(id);
    if (at >= 0) list.splice(at, 1); else list.push(id);
    this.selectGroup({ ...g, patches: list });
  }
  /** Make a member of the group the lead (the one the panel shows and a drag follows) without changing the group. */
  lead(kind: 'fish' | 'item', id: number) {
    const g = this.group; if (!(kind === 'fish' ? g.fish : g.items).includes(id)) return;
    const rest = (a: number[]) => a.filter(v => v !== id);
    this.selId = null; this.selItem = null;
    if (kind === 'fish') { this.selId = id; this.extraFish = rest(g.fish); this.extraItems = g.items; }
    else { this.selItem = id; this.extraItems = rest(g.items); this.extraFish = g.fish; }
    this.emit('select');
  }
  /** Add these to the group (a box select with shift held). */
  addToGroup(g: Group) {
    const cur = this.group;
    this.selectGroup({ fish: [...new Set([...cur.fish, ...g.fish])], items: [...new Set([...cur.items, ...g.items])], patches: [...new Set([...(cur.patches ?? []), ...(g.patches ?? [])])] });
  }
  setMulti(on: boolean) { if (this.multi !== on) { this.multi = on; if (on) this.brush.on = false; this.emit('select'); } }

  /** Drop group members that no longer exist (deleted, undone, another tank). */
  private pruneExtras() {
    const T = this.tank;
    this.extraFish = this.extraFish.filter(id => T.fish.some(f => f.id === id));
    this.extraItems = this.extraItems.filter(id => T.items.some(it => it.id === id));
    this.selPatches = this.selPatches.filter(id => T.patches?.some(p => p.id === id));
  }

  private pushUndo() {
    this.undoStack.push(JSON.stringify(this.scene));
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  undo() { this.step(this.undoStack, this.redoStack); }
  redo() { this.step(this.redoStack, this.undoStack); }
  /** The undo depth now, for squash / rollback: a preview (the growth Time slider) that is kept or undone as a whole. */
  get mark() { return this.undoStack.length; }
  /** Every step since `mark` becomes one undo step (the preview kept). */
  squash(mark: number) { if (this.undoStack.length > mark + 1) this.undoStack.length = mark + 1; this.seal(); }
  /** Back to the scene at `mark`, the steps since dropped from history (the preview undone). */
  rollback(mark: number) {
    if (this.undoStack.length <= mark) return;
    const snap = this.undoStack[mark]; this.undoStack.length = mark;
    this.restore(snap);
  }
  private step(from: string[], to: string[]) {
    const snap = from.pop(); if (!snap) return;
    to.push(JSON.stringify(this.scene));
    this.restore(snap);
  }
  private restore(snap: string) {
    const cams = this.scene.tanks.map(t => t.camera), lock = this.scene.camLock; // the view is not part of history
    this.scene = JSON.parse(snap) as Scene;
    this.scene.tanks.forEach((t, i) => { if (cams[i]) t.camera = cams[i]; });
    this.scene.camLock = lock;
    if (lock) for (const t of this.scene.tanks) t.camera = { ...this.scene.tanks[0].camera };
    this.scene.active = Math.min(this.scene.active, this.scene.tanks.length - 1);
    this.syncEditOn();
    this.seal();
    if (this.selId != null && !this.tank.fish.some(f => f.id === this.selId)) this.selId = this.tank.fish.at(-1)?.id ?? null;
    if (this.selItem != null && !this.tank.items.some(it => it.id === this.selItem)) this.selItem = null;
    this.pruneExtras();
    this.loadedBy = 'history'; this.emit('load');
  }

  /** Untick every view (the panel was closed). */
  clearEditing() {
    if (!this.editOn.some(Boolean)) return;
    this.editOn = [false, false]; this.seal(); this.emit('select');
  }

  /** A tank that no longer exists is not ticked. */
  private syncEditOn() {
    const n = this.scene.tanks.length;
    this.editOn = [0, 1].map(k => k < n && !!this.editOn[k]);
  }

  /** Replace the whole scene (open file, new). Undoable. */
  replace(scene: Scene) {
    this.pushUndo(); this.seal();
    this.scene = scene;
    this.editOn = [0, 1].map(k => k === scene.active);
    this.selId = null; this.selItem = null; this.extraFish = []; this.extraItems = []; this.selPatches = [];
    this.loadedBy = 'replace'; this.emit('load');
  }

  // ---------- Persistence ----------
  saveLocal(storage: Storage | undefined = globalThis.localStorage) {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(this.scene)); } catch { /* storage full or blocked: autosave is best-effort */ }
  }
  static loadLocal(storage: Storage | undefined = globalThis.localStorage): Scene | null {
    try {
      const txt = storage?.getItem(STORAGE_KEY);
      return txt ? parseScene(txt).scene : null;
    } catch { return null; }
  }
}
