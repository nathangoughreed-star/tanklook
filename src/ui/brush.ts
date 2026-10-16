// The brush bar (lane SB): the Brush button in the view toolbar and the strip over the view with the brush, Paint / Erase,
// size and density. The state lives in the Store (`store.brush`, never saved); strokes are handled in interact/pointer.ts,
// the patches themselves in scene/brush.ts.
import { BRUSHES, brushDef, plantBrushes } from '../scene/brush';
import type { Store } from '../scene/store';
import type { BrushId, LeafKind } from '../scene/types';

export function attachBrushBar(store: Store) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const bar = $('brushBar'), btn = $('brushBtn'), kind = $<HTMLSelectElement>('brKind'), leaf = $<HTMLSelectElement>('brLeaf');
  const size = $<HTMLInputElement>('brSize'), dens = $<HTMLInputElement>('brDens'), paint = $('brPaint'), erase = $('brErase');
  const opt = (b: { id: string; label: string }) => `<option value="${b.id}">${b.label}</option>`;
  kind.innerHTML = BRUSHES.map(opt).join('') + `<optgroup label="Plants">${plantBrushes().map(opt).join('')}</optgroup>`;
  const show = () => {
    const B = store.brush, def = brushDef(B.id);
    bar.hidden = !B.on; btn.classList.toggle('on', B.on); btn.setAttribute('aria-pressed', String(B.on));
    kind.value = B.id; leaf.value = B.leaf; leaf.hidden = B.id !== 'leaf';
    size.min = String(def.radius[0]); size.max = String(def.radius[1]); size.value = String(B.size); dens.value = String(B.density);
    $('oBrSize').textContent = `${B.size} mm`; $('oBrDens').textContent = `${B.density}%`;
    paint.classList.toggle('on', !B.erase); paint.setAttribute('aria-pressed', String(!B.erase));
    erase.classList.toggle('on', B.erase); erase.setAttribute('aria-pressed', String(B.erase));
    size.parentElement!.hidden = false; dens.parentElement!.hidden = B.erase;
  };
  store.subscribe(show); show();
  btn.onclick = () => store.setBrush({ on: !store.brush.on });
  kind.onchange = () => { const id = kind.value as BrushId, d = brushDef(id); store.setBrush({ id, erase: false, size: Math.min(d.radius[1], Math.max(d.radius[0], store.brush.size)) }); };
  leaf.onchange = () => store.setBrush({ leaf: leaf.value as LeafKind });
  size.oninput = () => store.setBrush({ size: +size.value });
  dens.oninput = () => store.setBrush({ density: +dens.value });
  paint.onclick = () => store.setBrush({ erase: false });
  erase.onclick = () => store.setBrush({ erase: true });
  $('brDone').onclick = () => store.setBrush({ on: false });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && store.brush.on) { const t = e.target as HTMLElement; if (t.tagName !== 'INPUT' || (t as HTMLInputElement).type === 'range') { e.stopImmediatePropagation(); store.setBrush({ on: false }); } }
  }, true);
}
