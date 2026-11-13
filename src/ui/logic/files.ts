// File operations (UI2 §7 P7, lane P7, 2026-11-13): the rules behind the scene library, Open (file, example, saved tank,
// share link), Save, Save as, per-tank download, resume and the "replace your project?" guard, moved out of
// ui/panels.ts so the old shell and the new shell (src/shell/) share one copy. No DOM: dialogs, the spinner and the
// status line stay with the caller, which passes in what it needs and shows what comes back. Storage is injectable.
import type { Scene } from '../../scene/types';
import { SceneError, parseScene } from '../../scene/validate';
import { deleteFromLib, libText, listLib, loadFromLib, saveToLib, type LibEntry } from '../../scene/library';
import { sceneImageIds, withImages } from '../../scene/images';
import { LONG_LINK } from '../../scene/share';
import { needsAsk } from '../projectStart';

type St = Storage | undefined;
const ls = (): St => { try { return globalThis.localStorage; } catch { return undefined; } };

/** The browser-saved tank this scene came from (or was last saved as): Save updates it without asking. */
export const LIB_CUR = 'tanklook.libCurrent';
export const UI_KEY = 'tanklook.ui';
export const MAX_FILE_BYTES = 5e6;
export const NAME_MAX = 80;

export const libId = (st: St = ls()): string | null => { try { return st?.getItem(LIB_CUR) ?? null; } catch { return null; } };
export const setLibId = (id: string | null, st: St = ls()): void => { try { if (id) st?.setItem(LIB_CUR, id); else st?.removeItem(LIB_CUR); } catch { /* ignore */ } };

/** A project name as typed: trimmed, at most 80 characters; '' when blank. */
export const cleanName = (v: string): string => v.trim().slice(0, NAME_MAX);
/** The scene's name field: blank falls back to "My tank". */
export const sceneNameOf = (v: string): string => cleanName(v) || 'My tank';
/** A name from Save as: a rename only when it is non-blank and differs from the current one, else null. */
export const renameFor = (typed: string, current: string): string | null => { const v = cleanName(typed); return v && v !== current ? v : null; };

export const slug = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tank';
export const when = (t: number): string => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// ---------- the replace guard ----------
/** The stored text of the saved tank this project came from (null when unsaved): a project saved as it stands has nothing to lose. */
export const savedText = (st: St = ls()): string | null => { const id = libId(st); return id ? libText(id, st) : null; };
/** True when the project is saved exactly as it stands (what New's "save first" checks after saving). */
export const isSavedAsIs = (scene: Scene, st: St = ls()): boolean => { const now = libId(st); return !!now && JSON.stringify(scene) === libText(now, st); };
/** Would replacing the project lose work (unsaved edits or locks)? The caller asks only when this is true. */
export const replaceNeedsAsk = (scene: Scene, st: St = ls()): boolean => needsAsk(scene, savedText(st));

// ---------- the library ----------
/** Delete a saved tank; clears "current" when it was the one. Returns false when there was no such entry. */
export function deleteSaved(id: string, st: St = ls()): boolean {
  if (!listLib(st).some(x => x.id === id)) return false;
  deleteFromLib(id, st);
  if (libId(st) === id) setLibId(null, st);
  return true;
}

/** What Save will do: add a new entry, update the tank this project came from, or replace a different tank of the same name (ask first). */
export type SavePlan = { kind: 'new' | 'update' | 'replace'; existing?: LibEntry };
export function planSave(scene: Scene, st: St = ls()): SavePlan {
  const same = listLib(st).find(x => x.name === scene.name), cur = libId(st);
  if (!same) return { kind: 'new' };
  return { kind: same.id !== cur ? 'replace' : 'update', existing: same };
}
export const replaceQuestion = (name: string, savedAt: number): string =>
  `A different tank called “${name}” is already saved in this browser (${when(savedAt)}). Replace it?\n\nCancel, then change the name, to keep both.`;

export type SaveResult = { ok: true; entry: LibEntry; count: number; message: string } | { ok: false; message: string };
/** Save into this browser under the scene's name (the caller has already asked about a 'replace'). Becomes the current tank. */
export function saveHere(scene: Scene, thumb: string, st: St = ls()): SaveResult {
  const list = listLib(st), same = list.find(x => x.name === scene.name);
  try {
    const e = saveToLib(scene, thumb, same?.id, st);
    setLibId(e.id, st);
    const count = list.length + (same ? 0 : 1);
    return { ok: true, entry: e, count, message: `Saved “${e.name}” in this browser (${count} saved). Save as… keeps a file you can back up or share.` };
  } catch (err) { return { ok: false, message: (err as Error).message }; }
}

// ---------- open ----------
export type Opened = { scene: Scene; warnings: string[] };
export type OpenFail = { message: string };
export const isFail = (r: Opened | OpenFail): r is OpenFail => 'message' in r;
export const tooLarge = (size: number): boolean => size > MAX_FILE_BYTES;
export const TOO_LARGE_MESSAGE = 'That file is too large to be a scene (over 5 MB).';

/** Parse the text of a scene file; the message is what to show on failure. */
export function parseOpened(text: string): Opened | OpenFail {
  try { return parseScene(text); } catch (e) { return { message: e instanceof SceneError ? e.message : 'Could not open that file.' }; }
}

/** After an opened file replaced the project: it goes straight into the saved list; the same file opened again reuses its entry. */
export function addOpenedToLibrary(scene: Scene, thumb: () => string, st: St = ls()): { id: string | null; note: string } {
  try {
    const txt = JSON.stringify(scene), twin = listLib(st).find(x => x.name === scene.name && st?.getItem(`tanklook.lib.${x.id}`) === txt);
    let th = ''; try { th = thumb(); } catch { /* no picture: still save the tank */ }
    const id = saveToLib(scene, th, twin?.id, st).id;
    setLibId(id, st);
    return { id, note: ' Added to your saved tanks.' };
  } catch (err) { setLibId(null, st); return { id: null, note: ' ' + (err as Error).message }; }
}
export const openedFileMessage = (name: string, note: string, warnings: readonly string[]): string => `Opened "${name}".${note}` + (warnings.length ? ' ' + warnings.join(' ') : '');

/** Open a saved tank by id (the caller makes it current once the scene is in); a message and bad=true when it is gone or unreadable. */
export function openSaved(id: string, st: St = ls()): { scene?: Scene; message: string; bad: boolean } {
  try {
    const { scene, warnings } = loadFromLib(id, st);
    return { scene, message: `Opened "${scene.name}". Undo brings the previous one back.` + (warnings.length ? ' ' + warnings.join(' ') : ''), bad: warnings.length > 0 };
  } catch (err) { return { message: err instanceof SceneError ? err.message : 'Could not open that tank.', bad: true }; }
}
export const savedName = (id: string, st: St = ls()): string => listLib(st).find(x => x.id === id)?.name ?? 'tank';

export const exampleMessage = (name: string): string => `Opened the example "${name}". Undo brings the previous tank back; Save keeps your own copy.`;
export const sharedMessage = (name: string, warnings: readonly string[]): string =>
  `Opened the shared tank "${name}". Undo brings your previous tank back; Save keeps your own copy.` + (warnings.length ? ' ' + warnings.join(' ') : '');
export const shareFailMessage = (e: unknown): string => e instanceof SceneError ? e.message : 'Could not open that share link.';

// ---------- download / share ----------
/** The downloadable file: pictures included, the scene's own name as the file name. */
export const sceneFile = (scene: Scene): { text: string; filename: string } => ({ text: JSON.stringify(withImages(scene), null, 1), filename: `${slug(scene.name)}.json` });
/** One tank of a split on its own, as an ordinary single-tank scene (Nathan 2026-10-08); null when there is no such tank. */
export function singleTank(scene: Scene, i: number): { scene: Scene; message: string } | null {
  const t = scene.tanks[i]; if (!t) return null;
  const name = `${scene.name} - Tank ${'AB'[i]}`.slice(0, NAME_MAX);
  return { scene: { ...scene, name, tanks: [structuredClone(t)], active: 0, camLock: true }, message: `Downloaded Tank ${'AB'[i]} on its own as "${name}".` };
}
/** The status after a share link was copied. */
export function shareCopiedMessage(scene: Scene, length: number): string {
  const n = length.toLocaleString();
  return (length > LONG_LINK
    ? `Copied a share link (${n} characters). It is long: some apps (Discord, texts) cut links past about 2,000 characters, so paste it into a shortener like tinyurl.com, or use Save as… to download a file.`
    : `Copied a share link (${n} characters). Whoever opens it gets this tank as a new, unsaved copy.`)
    + (sceneImageIds(scene).length ? ' Background pictures are too big for a link, so it goes without them; Save as… keeps them in the file.' : '');
}
export const SHARE_UNSUPPORTED = 'This browser cannot make share links (it is too old). Save as… can download a file instead.';
/** The base a share link points at: a file:// build links to the live site. */
export const shareBase = (protocol: string, href: string): string => protocol === 'file:' ? 'https://tanklook.com/' : href;

// ---------- resume ----------
/** What a return visit reopens: the section and whether a Discovery was in progress (from `tanklook.ui`). */
export function resumeState(st: St = ls()): { sec?: string; disc: boolean } {
  try {
    const u = JSON.parse(st?.getItem(UI_KEY) ?? '{}') as { sec?: string; disc?: boolean };
    return { sec: u.sec || undefined, disc: !!u.disc };
  } catch { return { disc: false }; }
}
