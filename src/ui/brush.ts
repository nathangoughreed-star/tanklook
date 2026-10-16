// The brush bar (lane SB): the Brush button in the view toolbar and the strip over the view with the brush, Paint / Erase,
// size and density. The state lives in the Store (`store.brush`, never saved); strokes are handled in interact/pointer.ts,
// the patches themselves in scene/brush.ts.
import { BRUSHES, brushDef, isPlantBrush, plantBrushes } from '../scene/brush';
import { patchSel } from '../render/brushmesh';
import type { Store } from '../scene/store';
import type { BrushId, LeafKind } from '../scene/types';

export function attachBrushBar(store: Store) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const bar = $('brushBar'), btn = $('brushBtn'), kind = $<HTMLSelectElement>('brKind'), leaf = $<HTMLSelectElement>('brLeaf');
  const single = $('brSingle'), size = $<HTMLInputElement>('brSize'), dens = $<HTMLInputElement>('brDens'), paint = $('brPaint'), erase = $('brErase');
  const opt = (b: { id: string; label: string }) => `<option value="${b.id}">${b.label}</option>`;
  kind.innerHTML = BRUSHES.map(opt).join('') + `<optgroup label="Plants">${plantBrushes().map(opt).join('')}</optgroup>`;
  const sel = () => store.group.patches?.length === 1 && store.groupCount === 1 ? store.tank.patches?.find(p => p.id === store.group.patches![0]) : undefined;
  const patchRow = $('gbPatch');
  const show = () => {
    patchSel.ids = new Set(store.group.patches ?? []);
    const P = sel(); patchRow.hidden = !P;
    if (P) {
      const plant = isPlantBrush(P.brush), d = brushDef(P.brush);
      for (const id of ['gpDens', 'gpWidth']) $(id).parentElement!.hidden = !!P.single; $('gpAdd').hidden = !!P.single;
      $('gpName').textContent = d.label; $('gpGrowL').hidden = !plant;
      const dn = $<HTMLInputElement>('gpDens'), gr = $<HTMLInputElement>('gpGrow'), wd = $<HTMLInputElement>('gpWidth');
      dn.value = String(P.density); gr.value = String(Math.round((P.growth ?? 0.5) * 100)); wd.min = String(d.radius[0]); wd.max = String(d.radius[1]); wd.value = String(P.size);
      $('oGpDens').textContent = `${P.density}%`; $('oGpGrow').textContent = P.growth == null ? 'auto' : `${Math.round(P.growth * 100)}%`; $('oGpWidth').textContent = `${P.size} mm`;
      const mine = store.brush.on && store.brush.target === P.id;
      $('gpAdd').classList.toggle('on', mine && !store.brush.erase); $('gpRemove').classList.toggle('on', mine && store.brush.erase);
    }
    if (store.brush.target != null && !store.tank.patches?.some(p => p.id === store.brush.target)) { store.brush.target = null; store.brush.on = false; }
    const B = store.brush, def = brushDef(B.id), tgt = B.target != null;
    kind.hidden = tgt;
    bar.hidden = !B.on || tgt; btn.classList.toggle('on', B.on); btn.setAttribute('aria-pressed', String(B.on));
    kind.value = B.id; leaf.value = B.leaf; leaf.hidden = tgt || B.id !== 'leaf';
    size.min = String(def.radius[0]); size.max = String(def.radius[1]); size.value = String(B.size); dens.value = String(B.density);
    $('oBrSize').textContent = `${B.size} mm`; $('oBrDens').textContent = `${B.density}%`;
    paint.classList.toggle('on', !B.erase); paint.setAttribute('aria-pressed', String(!B.erase));
    erase.classList.toggle('on', B.erase); erase.setAttribute('aria-pressed', String(B.erase));
    single.classList.toggle('on', !!B.single); single.setAttribute('aria-pressed', String(!!B.single)); single.hidden = tgt;
    size.parentElement!.hidden = !!B.single && !B.erase; dens.parentElement!.hidden = B.erase || tgt || !!B.single;
  };
  store.subscribe(show); show();
  btn.onclick = () => store.setBrush({ on: !store.brush.on, target: null });
  const edit = (id: 'gpDens' | 'gpGrow' | 'gpWidth', fn: (p: NonNullable<ReturnType<typeof sel>>, v: number) => void) => {
    const el = $<HTMLInputElement>(id); el.oninput = () => { const P = sel(); if (!P) return; store.edit(t => { const q = t.patches?.find(v => v.id === P.id); if (q) fn(q, +el.value); }, { coalesce: 'patch-' + id }); };
  };
  edit('gpDens', (p, v) => { p.density = v; }); edit('gpGrow', (p, v) => { p.growth = v / 100; }); edit('gpWidth', (p, v) => { p.size = v; });
  const target = (erase: boolean) => { const P = sel(); if (!P) return; const on = store.brush.on && store.brush.target === P.id && store.brush.erase === erase; store.setBrush(on ? { on: false, target: null } : { on: true, target: P.id, erase, size: Math.min(P.size, 120) }); };
  $('gpAdd').onclick = () => target(false); $('gpRemove').onclick = () => target(true);
  kind.onchange = () => { const id = kind.value as BrushId, d = brushDef(id); store.setBrush({ id, erase: false, size: Math.min(d.radius[1], Math.max(d.radius[0], store.brush.size)) }); };
  leaf.onchange = () => store.setBrush({ leaf: leaf.value as LeafKind });
  size.oninput = () => store.setBrush({ size: +size.value });
  dens.oninput = () => store.setBrush({ density: +dens.value });
  paint.onclick = () => store.setBrush({ erase: false });
  single.onclick = () => store.setBrush({ single: !store.brush.single, erase: false });
  erase.onclick = () => store.setBrush({ erase: true });
  $('brDone').onclick = () => store.setBrush({ on: false, target: null });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && store.brush.on) { const t = e.target as HTMLElement; if (t.tagName !== 'INPUT' || (t as HTMLInputElement).type === 'range') { e.stopImmediatePropagation(); store.setBrush({ on: false, target: null }); } }
  }, true);
}
