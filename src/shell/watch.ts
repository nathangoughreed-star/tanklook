// BR2 (R158): Watch mode. The bare tank (Full screen where the browser has it, else Tank only) with the screen kept awake by the Wake Lock API
// (nothing happens where it is missing), the cursor hidden, and out again on a tap on open water, Esc or the exit button. No sound.
import { chooseFs, getFs } from './fullscreen';
import { setWatching, WATCH_EXIT } from '../interact/viewLock';

type Lock = { release(): Promise<void>; addEventListener(t: 'release', f: () => void): void };
type WakeNav = Navigator & { wakeLock?: { request(t: 'screen'): Promise<Lock> } };
let lock: Lock | null = null, on = false, installed = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
export const watchOn = () => on;
export const onWatchChange = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

async function grab() {
  try { const w = (navigator as WakeNav).wakeLock; if (!w || lock) return; const l = await w.request('screen'); if (!on) { void l.release(); return; } lock = l; l.addEventListener('release', () => { if (lock === l) lock = null; }); } catch { /* no wake lock here, or the browser refused: Watch still works */ }
}
function drop() { const l = lock; lock = null; try { void l?.release(); } catch { /* already released */ } }
function set(v: boolean) { if (on === v) return; on = v; setWatching(v); document.body.classList.toggle('watching', v); if (v) void grab(); else drop(); emit(); }

export function enterWatch() {
  install();
  const s = getFs(); if (!s.tankOnly) chooseFs('full'); // 'full' falls back to Tank only where the browser has no fullscreen
  set(true);
}
export function exitWatch() { if (!on) return; set(false); const s = getFs(); if (s.tankOnly) chooseFs(s.viaApi ? 'full' : 'tank'); }

function install() {
  if (installed) return; installed = true;
  addEventListener(WATCH_EXIT, () => setTimeout(exitWatch, 60)); // after the tap's own click has been handled, so the tap does not also pick what is under it
  // the bare tank ended some other way (Esc out of browser fullscreen, the exit button, F): Watch ends with it
  const sync = () => { if (on && !getFs().tankOnly) set(false); };
  document.addEventListener('fullscreenchange', () => setTimeout(sync, 0)); document.addEventListener('webkitfullscreenchange', () => setTimeout(sync, 0));
  addEventListener('keydown', e => { if (on && e.key === 'Escape') exitWatch(); else if (on && e.key.toLowerCase() === 'f') setTimeout(sync, 0); });
  // the browser drops a wake lock when the tab is hidden; take it again when it is back
  document.addEventListener('visibilitychange', () => { if (on && document.visibilityState === 'visible') void grab(); });
}
