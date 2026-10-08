// Holds the scene, the selection and undo/redo history. Every mutation goes through update().
import { defaultScene } from './defaults';
import { parseScene } from './validate';
import { keepInWater } from './water';
import type { Fish, Scene } from './types';

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
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private lastKey: string | null = null;
  private lastTime = 0;
  private listeners = new Set<Listener>();

  constructor(scene: Scene = defaultScene()) {
    this.scene = scene;
    this.selId = scene.fish[0]?.id ?? null;
  }

  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(kind: ChangeKind) { for (const fn of this.listeners) fn(kind); }

  get selected(): Fish | undefined { return this.scene.fish.find(f => f.id === this.selId); }

  update(fn: (s: Scene) => void, opts: UpdateOptions = {}) {
    const kind = opts.kind ?? 'scene', history = opts.history ?? kind === 'scene';
    if (history) {
      const now = performance.now();
      const merge = opts.coalesce != null && opts.coalesce === this.lastKey && now - this.lastTime < COALESCE_MS;
      if (!merge) this.pushUndo();
      this.lastKey = opts.coalesce ?? null; this.lastTime = now;
    }
    fn(this.scene);
    if (kind === 'scene') keepInWater(this.scene);
    if (this.selId != null && !this.scene.fish.some(f => f.id === this.selId)) this.selId = null;
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
    const cam = this.scene.camera;       // the view is not part of history: keep where the user is looking
    this.scene = JSON.parse(snap) as Scene;
    this.scene.camera = cam;
    this.seal();
    if (this.selId != null && !this.scene.fish.some(f => f.id === this.selId)) this.selId = this.scene.fish.at(-1)?.id ?? null;
    this.emit('load');
  }

  /** Replace the whole scene (open file, new). Undoable. */
  replace(scene: Scene) {
    this.pushUndo(); this.seal();
    this.scene = scene;
    this.selId = scene.fish[0]?.id ?? null;
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
