// PM1 helper (dev server only): render a catalogue hood or light over a rimmed 20 gal in the real viewer and POST the picture to scripts/pm1-save-server.mjs.
// In the browser pane: const m = await import('/scripts/pm1-shot.ts'); await m.shot('nicrew-c10-18-24', 0.5, 20, 1.2)
// @ts-nocheck
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { emptyScene } from '../src/scene/defaults';
import { pickLightProduct } from '../src/scene/techEdit';
import { hoodProduct } from '../src/data/hoods';
export async function shot(id, az = 0.5, el = 20, zoom = 1, w = 900, tag = '', tankId = "g20h", dist = 3000) {
  const { store, viewer } = window.__gb, h = hoodProduct(id);
  const sc = emptyScene(), S = sc.tanks[0];
  S.tank = tankFromModel(getTankModel(h ? ({ 20: 'g10', 24: 'g20h', 30: 'g20l' }[h.lengthIn] ?? tankId) : tankId)); S.water.on = true; S.person.show = false; S.wall.show = false;
  S.camera = { dist, az, el, zoom };
  if (h) { S.lid = 'hood'; S.hoodProduct = id; } else { S.lid = 'open'; pickLightProduct(S, id); }
  store.replace(sc);
  await new Promise(r => setTimeout(r, 1000));
  const u = viewer.thumbnail(w), r = await fetch('http://localhost:5193/save?name=' + id + '_' + tag + az, { method: 'POST', body: u });
  return id + ' ' + (await r.text());
}
/** The product alone on a transparent ground (the baked-tile renderer), at a chosen yaw / pitch (radians): for the photo-vs-model compare images. */
export async function still(id, yaw = 0.5, pitch = 0.5, w = 900, tag = 's') {
  const { gearStill } = await import('../src/render/gearStill');
  const spec = hoodProduct(id) ? { kind: 'hood', id } : { kind: 'light', id };
  const u = gearStill(spec, w, Math.round(w * 0.62), { yaw, pitch });
  const r = await fetch('http://localhost:5193/save?name=' + id + '_' + tag, { method: 'POST', body: u });
  return id + ' ' + (await r.text());
}
/** The planted example with a hood product or a catalogue light on it, in the real viewer (1280 wide pane). */
export async function inTank(id, az = 0.45, el = 22, zoom = 1.15, tag = 'tank') {
  const { store, viewer } = window.__gb, { SCENES } = await import('../src/examples/scenes'), { parseScene } = await import('../src/scene/validate');
  const sc = parseScene(JSON.parse(SCENES.planted)).scene, S = sc.tanks[0], h = hoodProduct(id);
  if (h) { S.lid = 'hood'; S.hoodProduct = id; } else { S.lid = 'open'; pickLightProduct(S, id); }
  S.camera = { ...S.camera, az, el, zoom };
  store.replace(sc);
  await new Promise(r => setTimeout(r, 1500));
  const u = viewer.thumbnail(1280), r = await fetch('http://localhost:5193/save?name=' + id + '_' + tag, { method: 'POST', body: u });
  return id + ' ' + (await r.text());
}
