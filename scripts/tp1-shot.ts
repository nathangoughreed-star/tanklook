// TP1 helper (dev server only): picture every distinct tank LOOK of the picker in the real viewer and POST it to scripts/tp1-save-server.mjs
// (writes scratch/tp1/<key>.jpg); scripts/tp1-tiles.py then cuts them out into public/gallery/tanks/<key>.webp.
// In the browser pane: const m = await import('/scripts/tp1-shot.ts'); await m.bake({ only: 'rect-r-24x12x16' })  /  await m.bake()
// @ts-nocheck
import { dockGroups } from '../src/ui/tankDockLogic';
import { previewSetup } from '../src/ui/tankDockLogic';
import { tileOf } from '../src/shell/logic/tankFilter';
import { bareTech } from '../src/scene/tech';
import { emptyScene } from '../src/scene/defaults';
export function looks() {
  const seen = new Map();
  for (const g of dockGroups('aquarium', '')) for (const b of g.bands) for (const o of b.opts) { const k = tileOf(o).key; if (!seen.has(k)) seen.set(k, o); }
  return seen;
}
export async function bake(a = {}) {
  const { store, viewer } = window.__gb, out = [], all = looks();
  let i = -1;
  for (const [key, o] of all) {
    i++; if (a.only && key !== a.only) continue; if (a.from != null && (i < a.from || i >= a.from + a.count)) continue;
    const sc = emptyScene(), base = sc.tanks[0];
    base.stand.show = false; base.person.show = false; base.wall.show = false; base.lid = 'open'; base.fish = []; base.items = [];
    const S = previewSetup(base, o); sc.tanks[0] = S; S.stand.show = false; S.person.show = false; S.wall.show = false; S.tech = bareTech(S); S.lid = 'open';
    const T = S.tank, d = Math.hypot(T.L, T.D, T.H);
    S.camera = { dist: 3000, az: a.az ?? 28, el: a.el ?? 14, zoom: a.zoom ?? 0.72 };
    store.replace(sc);
    await new Promise(r => setTimeout(r, a.wait ?? 350));
    const u = viewer.thumbnail(a.w ?? 480), r = await fetch('http://localhost:5197/save?name=' + key, { method: 'POST', body: u });
    out.push(key + ' ' + (await r.text()));
    if (a.only) break;
  }
  return out.length + ' of ' + all.size + ' ' + out.filter(x => !x.endsWith('ok')).join(';');
}
