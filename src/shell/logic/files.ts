// UI2 shell step 2 (lane S2, 2026-11-13): the file menu's view-models. Pure (storage injectable); every rule itself lives in P7's
// src/ui/logic/files.ts, this only shapes what the header menu, the Open window and Save as draw.
import type { Scene } from '../../scene/types';
import type { LibEntry } from '../../scene/library';
import { listLib } from '../../scene/library';
import { emptyScene } from '../../scene/defaults';
import { applyKind } from '../../scene/pickerKind';
import { SHARE_PREFIX } from '../../scene/share';
import { cleanName, libId, sceneNameOf, renameFor, when, savedText, planSave } from '../../ui/logic/files';

type St = Storage | undefined;

export type FileAction = 'new' | 'open' | 'saveas' | 'share' | 'download';
export const FILE_MENU: readonly { id: FileAction; label: string; hint: string }[] = [
  { id: 'new', label: 'New', hint: 'Start an empty tank' },
  { id: 'open', label: 'Open…', hint: 'Your saved tanks, the examples, a file or a share link' },
  { id: 'saveas', label: 'Save as…', hint: 'A new name, a file, or a share link' },
  { id: 'share', label: 'Share link', hint: 'Copy a link to this tank' },
  { id: 'download', label: 'Download', hint: 'Save a file you can back up or send' },
];

/** A fresh project: one empty tank of the given water type, the current units and camera. */
export function newProject(units: Scene['units'], kind: Parameters<typeof applyKind>[1], camera: Scene['tanks'][number]['camera']): Scene {
  const s = emptyScene(); s.name = 'New tank'; applyKind(s.tanks[0], kind); s.tanks[0].camera = { ...camera }; s.units = units;
  return s;
}

export interface LibRow { id: string; name: string; when: string; tanks: string; thumb: string; current: boolean }
/** The saved tanks as the Open window draws them: newest first; the one this project came from is marked. */
export function libraryRows(st?: St): LibRow[] {
  const cur = libId(st);
  return listLib(st).slice().sort((a, b) => b.saved - a.saved).map((e: LibEntry) => ({ id: e.id, name: e.name, when: when(e.saved), tanks: e.tanks > 1 ? '2 tanks' : '', thumb: e.thumb, current: e.id === cur }));
}
export const EMPTY_LIBRARY = 'No saved tanks yet in this browser. Save puts the tank you are working on here.';

/** What the header says about where this project lives. */
export function savedLine(scene: Scene, autosaved: boolean, st?: St): string {
  const plan = planSave(scene, st), cur = libId(st);
  const inLib = plan.kind === 'update' && plan.existing?.id === cur;
  if (!autosaved) return 'Saving…';
  return inLib ? `Saved in this browser as “${scene.name}”` : 'Autosaved. Save puts it in your saved tanks.';
}

/** The Save as window: what Save in this browser will do for the typed name, and the rename (null = keep the current name). */
export function saveAsView(typed: string, scene: Scene, st?: St): { rename: string | null; name: string; effect: 'new' | 'update' | 'replace'; note: string } {
  const rename = renameFor(typed, scene.name), name = rename ?? scene.name;
  // a new name is a new entry (the old one stays), unless it matches a different saved tank, which it would replace (old shell: setLibId(null) then Save)
  const effect: 'new' | 'update' | 'replace' = rename ? (listLib(st).some(x => x.name === name) ? 'replace' : 'new') : planSave(scene, st).kind;
  const note = effect === 'replace' ? `A different tank called “${name}” is already saved here; saving replaces it (you will be asked).`
    : effect === 'new' ? 'Saved as a new entry; the others stay.' : 'Updates the saved tank this came from.';
  return { rename, name, effect, note };
}

export { cleanName, sceneNameOf, savedText };

/** The share hash inside whatever was pasted (a whole link or just the #tank=… part); null when there is none. */
export function hashOf(pasted: string): string | null {
  const i = pasted.indexOf(SHARE_PREFIX);
  return i < 0 ? null : pasted.slice(i).trim();
}

/** A return visit resumes the autosave; a first visit (or an unreadable save, with a message) opens a new tank. */
export function startMode(restored: unknown, error?: string): { mode: 'resume' | 'new'; message?: string } {
  if (restored) return { mode: 'resume' };
  return { mode: 'new', message: error ? `Your last saved tank could not be opened (${error}). This is a new tank; use ... > Open to find a saved one.` : undefined };
}
