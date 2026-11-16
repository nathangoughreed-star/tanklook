// R96 helper (dev server only): render a catalogue stand in the real viewer and POST the picture to scripts/r96-save-server.mjs.
// In the browser pane: const m = await import('/scripts/r96-shot.ts'); await m.shot('topfin-20-37', 0, 6, 1.4)
// @ts-nocheck
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { emptyScene } from '../src/scene/defaults';
import { setStandProduct } from '../src/scene/placement';
import { standProduct } from '../src/data/stands';
const TANK = { '20,10': 'g10', '24,12': 'g20h', '30,12': 'g20l', '36,18': 'g40b', '48,13': 'g55', '48,18': 'g75' };
export async function shot(id, az = 0, el = 4, zoom = 1, w = 900, tag = '') {
  const { store, viewer } = window.__gb, p = standProduct(id), key = p.fits[0].join(',');
  const sc = emptyScene(), S = sc.tanks[0];
  S.tank = { ...tankFromModel(getTankModel(TANK[key])), H: 40 }; S.water.on = false; S.lid = 'open'; S.person.show = false; S.render.rim = false; S.wall.show = false;
  S.stand.show = true; S.stand.need = 'added'; S.stand.style = p.kind; S.camera = { dist: 3000, az, el, zoom };
  setStandProduct(S, p); store.replace(sc);
  await new Promise(r => setTimeout(r, 900));
  const u = viewer.thumbnail(w), r = await fetch('http://localhost:5191/save?name=' + id + '_' + tag + az, { method: 'POST', body: u });
  return id + ' ' + (await r.text());
}
