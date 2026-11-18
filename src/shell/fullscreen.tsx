// UI2 shell (request R91): the Fullscreen API on the page, the shared Full screen / Tank only state, the F key and the floating exit button.
import { useEffect, useState } from 'preact/hooks';
import { Icon } from './ui';
import { setViewLocked } from '../interact/viewLock';
import { FS_OFF, lookOnly, choose, fsItems, isIphone, keyChoice, onFullscreenChange, EXIT_IDLE_MS, type FsEnv, type FsId, type FsState } from './logic/fullscreen';

type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
const env = (): FsEnv => ({ api: !!(document.documentElement.requestFullscreen || (document.documentElement as FsEl).webkitRequestFullscreen), iphone: isIphone(navigator.userAgent) });
const isFull = () => !!(document.fullscreenElement || (document as FsDoc).webkitFullscreenElement);

let state: FsState = { ...FS_OFF, fullscreen: isFull() };
const subs = new Set<() => void>();
const set = (s: FsState) => { state = s; setViewLocked(lookOnly(s)); subs.forEach(f => f()); setTimeout(() => dispatchEvent(new Event('resize')), 50); }; // the viewer follows the new size

export function chooseFs(id: FsId) {
  const r = choose(state, env(), id);
  set(r.next);
  const el = document.documentElement as FsEl, d = document as FsDoc;
  if (r.action === 'enter') (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch(() => set({ ...state, fullscreen: isFull(), viaApi: false }) /* the browser said no: Tank only still applies */);
  else if (r.action === 'exit' && isFull()) (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.())?.catch(() => { /* already out */ });
}

let installed = false;
function install() {
  if (installed) return; installed = true;
  const change = () => set(onFullscreenChange(state, isFull()));
  document.addEventListener('fullscreenchange', change); document.addEventListener('webkitfullscreenchange', change);
  addEventListener('keydown', e => {
    const typing = !!(e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]');
    const id = keyChoice(e, typing, env(), state);
    if (id) { e.preventDefault(); chooseFs(id); } else if (e.key === 'Escape' && state.tankOnly && !state.fullscreen) chooseFs('tank'); // no browser Esc to lean on
  });
}

export function useFs(): FsState {
  const [, n] = useState(0);
  useEffect(() => { install(); const f = () => n(x => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return state;
}
export const useFsItems = () => { const s = useFs(); return { state: s, items: fsItems(s, env()) }; };

/** Small floating exit button in Tank only; it fades after 2 s without a pointer move or touch. */
export function FsExit({ full }: { full: boolean }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    let t = 0;
    const wake = () => { setShown(true); clearTimeout(t); t = window.setTimeout(() => setShown(false), EXIT_IDLE_MS); };
    wake(); addEventListener('pointermove', wake); addEventListener('pointerdown', wake);
    return () => { clearTimeout(t); removeEventListener('pointermove', wake); removeEventListener('pointerdown', wake); };
  }, []);
  return <button type="button" class={`btn sm fsexit glass${shown ? '' : ' idle'}`} title="Back to the app (F or Esc)" onClick={() => chooseFs(full ? 'full' : 'tank')}><Icon name="x" /> {full ? 'Exit full screen' : 'Exit tank only'}</button>;
}
