// UI2 shell (request R91, 2026-11-15): Full screen and Tank only, as plain state and decisions (the Fullscreen API calls live in fullscreen.tsx).
// Full screen = the browser's element fullscreen with the normal UI. Tank only = the panel, header, rail and bars hidden for a clean view (with
// browser fullscreen too where there is one). iPhone Safari has no element fullscreen: there the Full screen item is hidden and Tank only is the fallback.
export interface FsEnv { api: boolean; iphone: boolean }
export interface FsState { fullscreen: boolean; tankOnly: boolean; /** Tank only entered the browser's fullscreen itself, so leaving fullscreen (Esc) leaves it too */ viaApi: boolean }
export const FS_OFF: FsState = { fullscreen: false, tankOnly: false, viaApi: false };
export type FsId = 'full' | 'tank';
export type FsAction = 'enter' | 'exit' | null;

export const fsAvailable = (e: FsEnv) => e.api && !e.iphone;
export const isIphone = (ua: string) => /iPhone|iPod/.test(ua);

export interface FsItem { id: FsId; label: string; hint: string }
/** The View menu's items for this state: Full screen is left out where the browser cannot do it. */
export function fsItems(s: FsState, e: FsEnv): FsItem[] {
  const out: FsItem[] = [];
  if (fsAvailable(e)) out.push({ id: 'full', label: s.fullscreen && !s.tankOnly ? 'Exit full screen' : 'Full screen', hint: 'F' });
  out.push({ id: 'tank', label: s.tankOnly ? 'Exit tank only' : 'Tank only', hint: 'Hides the panels and bars for a clean view' });
  return out;
}

/** What choosing an item does: the Fullscreen API call to make and the state after it. */
export function choose(s: FsState, e: FsEnv, id: FsId): { action: FsAction; next: FsState } {
  if (id === 'full') {
    if (!fsAvailable(e)) return { action: null, next: s };
    if (s.fullscreen) return { action: 'exit', next: { fullscreen: false, tankOnly: false, viaApi: false } };
    return { action: 'enter', next: { fullscreen: true, tankOnly: false, viaApi: false } };
  }
  if (s.tankOnly) return { action: s.viaApi && s.fullscreen ? 'exit' : null, next: { fullscreen: s.viaApi ? false : s.fullscreen, tankOnly: false, viaApi: false } };
  if (fsAvailable(e) && !s.fullscreen) return { action: 'enter', next: { fullscreen: true, tankOnly: true, viaApi: true } };
  return { action: null, next: { ...s, tankOnly: true, viaApi: false } };
}

/** The browser reported fullscreen on or off (Esc, the exit button, F11 never reaches here). Leaving fullscreen also leaves a Tank only that entered it. */
export function onFullscreenChange(s: FsState, nowFull: boolean): FsState {
  if (nowFull === s.fullscreen) return s;
  return !nowFull && s.viaApi ? { fullscreen: false, tankOnly: false, viaApi: false } : { ...s, fullscreen: nowFull };
}

/** The F key: toggles Full screen, never while typing in a field and never with Ctrl / Alt / Meta. Where there is no Full screen it toggles Tank only. */
export function keyChoice(e: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }, typing: boolean, env: FsEnv, s: FsState): FsId | null {
  if (typing || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 'f') return null;
  if (s.tankOnly) return s.fullscreen && fsAvailable(env) ? 'full' : 'tank';
  return fsAvailable(env) ? 'full' : 'tank';
}

/** The floating exit button shows right after a move and fades after this long without one. */
export const EXIT_IDLE_MS = 2000;
export const exitVisible = (sinceMoveMs: number) => sinceMoveMs < EXIT_IDLE_MS;
