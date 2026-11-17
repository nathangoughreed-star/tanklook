// VT1 helper (dev server only): picture the Tank workspace's picture tiles in the real viewer (same pipeline as TP1's tank tiles) and POST them to
// scripts/vt1-save-server.mjs (writes scratch/vt1/<key>.jpg); scripts/vt1-tiles.py then cuts them to public/gallery/tank-ui/<key>.webp.
// Browser pane: const m = await import('/scripts/vt1-shot.ts'); await m.bake()   (or m.bake({ only: 'bg-blue' }))
// @ts-nocheck
import { emptyScene } from '../src/scene/defaults';
import { bareTech } from '../src/scene/tech';
import { putOnFloor, putOnStand, putOnMyFurniture } from '../src/scene/placement';
import { BACKGROUNDS } from '../src/render/build';
import { SITS_TILES, BG_TILES } from '../src/shell/logic/tankTiles';
export async function bake(a = {}) {
  const { store, viewer } = window.__gb, out = [];
  const jobs = [
    ...SITS_TILES.map(t => ({ key: t.img, bg: 'blue', sit: t.id, zoom: t.id === 'floor' ? 0.66 : 0.42, el: 8 })),
    ...BG_TILES.map(t => ({ key: t.img, bg: t.id, sit: 'floor', zoom: 0.72, el: 12 })),
  ];
  for (const j of jobs) {
    if (a.only && j.key !== a.only) continue;
    const sc = emptyScene(), S = sc.tanks[0];
    S.person.show = false; S.wall.show = false; S.lid = 'open'; S.fish = []; S.items = []; S.tech = bareTech(S);
    if (j.sit === 'floor') putOnFloor(S); else if (j.sit === 'stand') putOnStand(S); else putOnMyFurniture(S);
    S.render.bg = j.bg; S.render.bgSides = ['back']; if (j.bg === 'custom') S.render.bgColor = '#2f4a36';
    S.camera = { dist: 3000, az: a.az ?? 26, el: j.el, zoom: j.zoom };
    store.replace(sc);
    await new Promise(r => setTimeout(r, a.wait ?? 450));
    const u = viewer.thumbnail(a.w ?? 480), r = await fetch('http://localhost:5196/save?name=' + j.key, { method: 'POST', body: u });
    out.push(j.key + ' ' + (await r.text()));
  }
  return out.length + ' ' + out.filter(x => !x.endsWith('ok')).join(';');
}
