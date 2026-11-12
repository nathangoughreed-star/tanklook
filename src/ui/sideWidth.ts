// LP1: the left panel's width. Pure helpers (clamp, storage) plus the drag handle's wiring. The width is a per-viewer preference
// (localStorage), never scene data; null = the default, min(700px, 50vw).
export const SIDE_MIN = 280;
export const SIDE_MAX_FRAC = 0.8;
export const SIDE_DEFAULT_MAX = 700;
export const SIDE_KEY = 'tanklook.sideW';

/** The default width for a window: min(700, 50 % of it). */
export const defaultSideWidth = (winW: number): number => Math.min(SIDE_DEFAULT_MAX, winW * 0.5);

/** The widest the panel may be: about 80 % of the window (never below the minimum). */
export const maxSideWidth = (winW: number): number => Math.max(SIDE_MIN, Math.floor(winW * SIDE_MAX_FRAC));

/** Clamp a dragged width into [min, max]. */
export const clampSideWidth = (w: number, winW: number): number => Math.round(Math.min(maxSideWidth(winW), Math.max(SIDE_MIN, w)));

/** A drag that ends this far under the minimum collapses the panel. */
export const dragCollapses = (w: number): boolean => w < SIDE_MIN - 40;

/** Read the saved width (null when none, unreadable or not a number). */
export function loadSideWidth(store: Pick<Storage, 'getItem'> | null = safeStorage()): number | null {
  try { const v = parseFloat(store?.getItem(SIDE_KEY) ?? ''); return Number.isFinite(v) && v > 0 ? v : null; } catch { return null; }
}
/** Save the width; null forgets it (back to the default). */
export function saveSideWidth(w: number | null, store: Pick<Storage, 'setItem' | 'removeItem'> | null = safeStorage()): void {
  try { if (w == null) store?.removeItem(SIDE_KEY); else store?.setItem(SIDE_KEY, String(Math.round(w))); } catch { /* storage blocked */ }
}
function safeStorage(): Storage | null { try { return localStorage; } catch { return null; } }

/** Wire the grip on the panel's right edge. `setOpen` collapses / opens the panel (showSide); the width lives in --side-w on #app. */
export function initSideResize(app: HTMLElement, grip: HTMLElement, setOpen: (on: boolean) => void): void {
  let w = loadSideWidth(); // last dragged width, null = default
  const apply = () => {
    if (w == null) app.style.removeProperty('--side-w');
    else app.style.setProperty('--side-w', clampSideWidth(w, innerWidth) + 'px');
  };
  apply();
  addEventListener('resize', apply);
  const cur = () => app.classList.contains('collapsed') ? 0 : app.querySelector<HTMLElement>('#side')!.getBoundingClientRect().width;
  grip.addEventListener('pointerdown', e => {
    if (e.button !== 0 || innerWidth <= 760) return;
    e.preventDefault(); grip.setPointerCapture(e.pointerId);
    const startX = e.clientX, startW = cur(), wasCollapsed = app.classList.contains('collapsed');
    let moved = false;
    app.classList.add('resizing');
    const move = (ev: PointerEvent) => {
      const raw = startW + ev.clientX - startX;
      if (Math.abs(ev.clientX - startX) > 2) moved = true;
      if (!moved) return;
      if (dragCollapses(raw)) { if (!app.classList.contains('collapsed')) setOpen(false); return; }
      if (app.classList.contains('collapsed')) setOpen(true);
      w = clampSideWidth(raw, innerWidth); apply();
    };
    const up = () => {
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
      app.classList.remove('resizing');
      if (moved && !app.classList.contains('collapsed')) saveSideWidth(w);
      else if (!moved && wasCollapsed) { /* a plain click on the closed edge does nothing: the arrow opens it */ }
    };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
  });
  grip.addEventListener('dblclick', () => { w = null; saveSideWidth(null); apply(); if (app.classList.contains('collapsed')) setOpen(true); });
}
