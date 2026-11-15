// UI2 shell (lane SC): drag something out of a panel into the tank (moved from the old panel's dragOut). Past a few px a press becomes a drag: a label
// rides with the pointer, `drop` hears where it was let go (null = not over a tank's floor; `overView` = still let go over the view, so the caller may add it anywhere); the click that follows is swallowed. Mouse and pen only.
import type { Viewer } from '../render/viewer';
import type { Store } from '../scene/store';
import { placeAt, type PlaceAt } from '../interact/pointer';
import * as IE from '../scene/itemEdit';
import { LIBRARY, MAX_ITEMS } from '../scene/items';
import { isPatch } from '../art/plants';

/** A finger must rest this long on a card before it lifts (same as lane GD1's gear drag); a swipe before that scrolls the panel. */
export const LONG_PRESS_MS = 450;
const CHROME = '.panel, .drawer, .apphead, .tabbar, .checkstrip, .cluster, .checkwrap';

/** Carpets and floating plants spread over an area, so they are click-Add only. */
export const canDragPiece = (variant: string) => !!LIBRARY[variant] && !isPatch(variant);

/** Lane LD1: drag a hardscape / decor chip or a plant card into the tank (the old panel's dragItem). The piece appears under the
 *  pointer once it is over the tank, follows it, resting on the ground or the piece under it; let go there to place it, anywhere
 *  else to take it back out. One undo step. Mouse: past 6 px. Finger: a 0.45 s press lifts it (a swipe scrolls instead). */
export function dragPiece(e: PointerEvent, variant: string, viewer: () => Viewer | undefined, store: Store): void {
  if (e.button !== 0 || !canDragPiece(variant)) return;
  const touch = e.pointerType === 'touch', x0 = e.clientX, y0 = e.clientY;
  let id: number | null = null, vi = -1, ghost: HTMLElement | null = null, timer = 0, lifted = false, lx = x0, ly = y0;
  const key = `place:${Math.random()}`, yaw = IE.dragYaw(variant, Math.random);
  const at = (cx: number, cy: number): PlaceAt | null => {
    const v = viewer(); if (!v) return null;
    const r = v.host.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom || document.elementFromPoint(cx, cy)?.closest(CHROME)) return null;
    return placeAt(v, store, cx, cy, new Set(id == null ? [] : [id]));
  };
  const put = (p: PlaceAt) => {
    if (id == null) {
      if (store.tank.items.length >= MAX_ITEMS) return;
      if (p.vi !== store.scene.active) store.setActive(p.vi);
      id = store.nextItemId(); vi = p.vi;
      const nid = id, seed = 1 + Math.floor(Math.random() * 1e9);
      store.edit(s => { IE.placeAt(s, variant, nid, seed, p, yaw); }, { coalesce: key });
      store.selectItem(nid); return;
    }
    if (p.vi !== vi) return;
    const nid = id; store.edit(s => { IE.moveTo(s, nid, p); }, { coalesce: key });
  };
  const noScroll = (t: Event) => t.preventDefault();
  const noMenu = (c: Event) => c.preventDefault();
  const lift = () => {
    lifted = true; navigator.vibrate?.(12);
    ghost = document.createElement('div'); ghost.className = 'dragGhost'; ghost.textContent = LIBRARY[variant].label;
    document.body.append(ghost); document.body.classList.add('placing');
    if (touch) addEventListener('touchmove', noScroll, { passive: false });
    track(lx, ly);
  };
  const track = (cx: number, cy: number) => {
    if (!ghost) return;
    ghost.style.transform = `translate(${cx + 14}px, ${cy - 44}px)`;
    const p = at(cx, cy); ghost.classList.toggle('ok', !!p); if (p) put(p);
  };
  const mv = (ev: PointerEvent) => {
    lx = ev.clientX; ly = ev.clientY;
    if (!lifted) {
      const d = Math.hypot(lx - x0, ly - y0);
      if (touch) { if (d > 8) stop(); return; } // a swipe: let the panel scroll
      if (d < 6) return;
      lift();
    }
    track(lx, ly);
  };
  const stop = () => { clearTimeout(timer); removeEventListener('pointermove', mv); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); removeEventListener('contextmenu', noMenu, true); };
  const end = (ev: PointerEvent) => {
    stop(); removeEventListener('touchmove', noScroll);
    if (!lifted || !ghost) return;
    ghost.remove(); document.body.classList.remove('placing');
    const eat = (c: Event) => { c.stopPropagation(); c.preventDefault(); };
    addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => removeEventListener('click', eat, { capture: true }), 0);
    const p = ev.type === 'pointerup' ? at(ev.clientX, ev.clientY) : null;
    if (p) put(p);
    else if (id != null) { const nid = id; store.edit(s => { IE.removeItem(s, nid); }, { coalesce: key }); store.selectItem(null); }
    store.seal();
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  if (touch) { addEventListener('contextmenu', noMenu, true); timer = window.setTimeout(lift, LONG_PRESS_MS); } else e.preventDefault();
}

export function dragOut(e: PointerEvent, label: string, viewer: () => Viewer | undefined, store: Store, drop: (at: PlaceAt | null, overView: boolean) => void): void {
  if (e.button !== 0 || e.pointerType === 'touch') return;
  const x0 = e.clientX, y0 = e.clientY;
  let ghost: HTMLElement | null = null;
  const over = (ev: PointerEvent) => { const r = viewer()?.host.getBoundingClientRect(); return !!r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom && !(document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.panel, .drawer, .apphead, .tabbar, .checkstrip, .cluster, .checkwrap')); };
  const at = (ev: PointerEvent) => { const v = viewer(); return v ? placeAt(v, store, ev.clientX, ev.clientY) : null; };
  const mv = (ev: PointerEvent) => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      ghost = document.createElement('div'); ghost.className = 'dragGhost'; ghost.textContent = label;
      document.body.append(ghost); document.body.classList.add('placing');
    }
    ghost.style.transform = `translate(${ev.clientX + 14}px, ${ev.clientY + 10}px)`;
    ghost.classList.toggle('ok', !!at(ev) || over(ev));
  };
  const end = (ev: PointerEvent) => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
    if (!ghost) return;
    ghost.remove(); document.body.classList.remove('placing');
    const eat = (c: Event) => { c.stopPropagation(); c.preventDefault(); };
    addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => removeEventListener('click', eat, { capture: true }), 0);
    const up = ev.type === 'pointerup'; drop(up ? at(ev) : null, up && over(ev));
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', end); addEventListener('pointercancel', end);
}
