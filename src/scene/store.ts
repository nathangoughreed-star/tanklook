// Holds the scene, the selection and undo/redo history. Every mutation goes through update().
import { defaultScene } from './defaults';
import { parseScene } from './validate';
import { clearCams, eyeClear, limitOrbit } from './orbit';
import { fitTable } from './table';
import { keepInWater } from './water';
import type { CameraSettings, Fish, Scene, TankSetup } from './types';

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

export class Store {
  scene: Scene;
  selId: number | null = null;
  /** Per view: does the panel's editing apply to that tank (the "Edit" box on each view's tab). UI state, not saved. */
  editOn: boolean[] = [true, false];
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private lastKey: string | null = null;
  private lastTime = 0;
  private listeners = new Set<Listener>();

  constructor(scene: Scene = defaultScene()) {
    this.scene = scene;
    this.editOn = [0, 1].map(k => k === scene.active);
    this.selId = this.tank.fish[0]?.id ?? null;
  }

  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(kind: ChangeKind) { for (const fn of this.listeners) fn(kind); }

  /** The tank the panel shows (always one of the tanks being edited). The selection always refers to a fish in this tank. */
  get tank(): TankSetup { return this.scene.tanks[this.scene.active] ?? this.scene.tanks[0]; }
  get split() { return this.scene.tanks.length > 1; }
  get selected(): Fish | undefined { return this.tank.fish.find(f => f.id === this.selId); }

  /** Indices of the tanks the panel edits (the views with "Edit" ticked); the shown tank first. Never empty. */
  get targets(): number[] {
    const n = this.scene.tanks.length, a = this.scene.active;
    return [a, ...[...Array(n).keys()].filter(i => i !== a && this.editOn[i])];
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
    this.emit('select');
  }

  /** Tick / untick view i's "Edit" box. At least one tank stays ticked; unticking the shown tank shows the other. */
  setEditing(i: number, on: boolean) {
    const n = this.scene.tanks.length; if (i >= n) return;
    if (!on && !this.editOn.some((v, k) => v && k !== i && k < n)) return;
    this.editOn[i] = on; this.seal();
    if (!on && i === this.scene.active) this.scene.active = this.editOn.findIndex((v, k) => v && k < n);
    if (!this.tank.fish.some(f => f.id === this.selId)) this.selId = null;
    this.emit('select');
  }

  /** A fish id free in every tank, so a fish added to both tanks gets the same id (the selection then covers both). */
  nextId() { return Math.max(...this.scene.tanks.map(t => t.fish.reduce((m, f) => Math.max(m, f.id), 0))) + 1; }

  /** Split: copy the current tank into a second, independent one, which becomes active. Undoable. */
  splitTank() {
    if (this.split) return;
    this.editOn = [false, true]; // before update(), so listeners see the new targets
    this.update(s => { s.tanks.push(structuredClone(s.tanks[0])); s.active = 1; });
  }

  /** Close tank i; the other one stays as the single tank. Undoable. */
  closeTank(i: number) {
    if (!this.split) return;
    this.editOn = [true, false];
    this.update(s => { s.tanks.splice(i, 1); s.active = 0; });
    if (!this.tank.fish.some(f => f.id === this.selId)) this.selId = null;
  }

  /** Lock / unlock the two cameras. Re-locking snaps the second view to the original tank's camera (Nathan 2026-10-08). */
  setCamLock(on: boolean) {
    this.update(s => { s.camLock = on; if (on) { for (const t of s.tanks) t.camera = { ...s.tanks[0].camera }; clearCams(s.tanks, true); } }, { kind: 'view' });
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
    if (kind === 'scene') { for (const t of this.scene.tanks) { keepInWater(t); fitTable(t); } clearCams(this.scene.tanks, this.scene.camLock); }
    if (this.selId != null && !this.tank.fish.some(f => f.id === this.selId)) this.selId = null;
    this.emit(kind);
  }

  /** End any coalescing group, so the next update starts a new undo step (call at gesture end). */
  seal() { this.lastKey = null; }

  select(id: number | null) {
    if (id === this.selId) return;
    this.selId = id; this.emit('select');
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
  private step(from: string[], to: string[]) {
    const snap = from.pop(); if (!snap) return;
    to.push(JSON.stringify(this.scene));
    const cams = this.scene.tanks.map(t => t.camera), lock = this.scene.camLock; // the view is not part of history
    this.scene = JSON.parse(snap) as Scene;
    this.scene.tanks.forEach((t, i) => { if (cams[i]) t.camera = cams[i]; });
    this.scene.camLock = lock;
    if (lock) for (const t of this.scene.tanks) t.camera = { ...this.scene.tanks[0].camera };
    this.scene.active = Math.min(this.scene.active, this.scene.tanks.length - 1);
    this.syncEditOn();
    this.seal();
    if (this.selId != null && !this.tank.fish.some(f => f.id === this.selId)) this.selId = this.tank.fish.at(-1)?.id ?? null;
    this.emit('load');
  }

  /** The shown tank is always ticked; a tank that no longer exists is not. */
  private syncEditOn() {
    const n = this.scene.tanks.length;
    this.editOn = [0, 1].map(k => k < n && (k === this.scene.active || !!this.editOn[k]));
  }

  /** Replace the whole scene (open file, new). Undoable. */
  replace(scene: Scene) {
    this.pushUndo(); this.seal();
    this.scene = scene;
    this.editOn = []; this.syncEditOn();
    this.selId = this.tank.fish[0]?.id ?? null;
    this.emit('load');
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
