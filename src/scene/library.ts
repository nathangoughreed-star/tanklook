// "My tanks": named scenes saved in this browser, each with a small preview picture (Nathan 2026-10-12).
// Separate from the autosave slot (store.ts STORAGE_KEY): the index holds names + pictures, each scene its own key,
// so listing the tanks never parses every scene. Browser-only, so the UI keeps Download for anything worth keeping.
import type { Scene } from './types';
import { SceneError, parseScene } from './validate';

export const LIB_KEY = 'tanklook.library';
const sceneKey = (id: string) => `tanklook.lib.${id}`;

export interface LibEntry { id: string; name: string; saved: number; thumb: string; tanks: number }

type St = Storage | undefined;
const ls = (): St => { try { return globalThis.localStorage; } catch { return undefined; } };

const isEntry = (e: unknown): e is LibEntry => {
  const x = e as LibEntry;
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.saved === 'number' && typeof x.thumb === 'string';
};

/** Saved tanks, newest first. */
export function listLib(st: St = ls()): LibEntry[] {
  try {
    const a: unknown = JSON.parse(st?.getItem(LIB_KEY) ?? '[]');
    return Array.isArray(a) ? a.filter(isEntry).sort((p, q) => q.saved - p.saved) : [];
  } catch { return []; }
}

/** Save under `id` (replacing it) or as a new entry. Throws a readable error when storage is full or blocked. */
export function saveToLib(scene: Scene, thumb: string, id?: string, st: St = ls()): LibEntry {
  if (!st) throw new Error('This browser is blocking site storage, so tanks can’t be saved here. Use Download to keep a file.');
  const e: LibEntry = { id: id ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: scene.name, saved: Date.now(), thumb, tanks: scene.tanks.length };
  const list = listLib(st), prev = st.getItem(sceneKey(e.id)), prevIndex = st.getItem(LIB_KEY);
  try {
    st.setItem(sceneKey(e.id), JSON.stringify(scene));
    st.setItem(LIB_KEY, JSON.stringify([e, ...list.filter(x => x.id !== e.id)]));
  } catch {
    // put back what was there, so a half-written save never leaves a picture without its tank
    try {
      if (prev == null) st.removeItem(sceneKey(e.id)); else st.setItem(sceneKey(e.id), prev);
      if (prevIndex == null) st.removeItem(LIB_KEY); else st.setItem(LIB_KEY, prevIndex);
    } catch { /* nothing more to do */ }
    throw new Error('This browser’s storage is full. Delete some saved tanks, or use Download to keep this one as a file.');
  }
  return e;
}

/** Open a saved tank (older saves are upgraded exactly like old files). */
export function loadFromLib(id: string, st: St = ls()) {
  const txt = st?.getItem(sceneKey(id));
  if (!txt) throw new SceneError('That saved tank is no longer in this browser.');
  return parseScene(txt);
}

export function deleteFromLib(id: string, st: St = ls()) {
  try {
    st?.removeItem(sceneKey(id));
    st?.setItem(LIB_KEY, JSON.stringify(listLib(st).filter(x => x.id !== id)));
  } catch { /* storage blocked */ }
}
