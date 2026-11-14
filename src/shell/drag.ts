// UI2 shell (lane SC): drag something out of a panel into the tank (moved from the old panel's dragOut). Past a few px a press becomes a drag: a label
// rides with the pointer, `drop` hears where it was let go (null = not over a tank's floor); the click that follows is swallowed. Mouse and pen only.
import type { Viewer } from '../render/viewer';
import type { Store } from '../scene/store';
import { placeAt, type PlaceAt } from '../interact/pointer';

export function dragOut(e: PointerEvent, label: string, viewer: () => Viewer | undefined, store: Store, drop: (at: PlaceAt | null) => void): void {
  if (e.button !== 0 || e.pointerType === 'touch') return;
  const x0 = e.clientX, y0 = e.clientY;
  let ghost: HTMLElement | null = null;
  const at = (ev: PointerEvent) => { const v = viewer(); return v ? placeAt(v, store, ev.clientX, ev.clientY) : null; };
  const mv = (ev: PointerEvent) => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      ghost = document.createElement('div'); ghost.className = 'dragGhost'; ghost.textContent = label;
      document.body.append(ghost); document.body.classList.add('placing');
    }
    ghost.style.transform = `translate(${ev.clientX + 14}px, ${ev.clientY + 10}px)`;
    ghost.classList.toggle('ok', !!at(ev));
  };
  const end = (ev: PointerEvent) => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
    if (!ghost) return;
    ghost.remove(); document.body.classList.remove('placing');
    const eat = (c: Event) => { c.stopPropagation(); c.preventDefault(); };
    addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => removeEventListener('click', eat, { capture: true }), 0);
    drop(ev.type === 'pointerup' ? at(ev) : null);
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', end); addEventListener('pointercancel', end);
}
