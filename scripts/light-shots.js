// Dev server only (2026-10-20): review pictures of the catalogued lights (data/gear-catalog.json `lights`), one per fixture
// shape, each on a tank it fits. In the browser console: `const l = await import('/scripts/light-shots.js'); await l.all()`
// (a tall pane, e.g. 900 x 1300, leaves room above the tank for the fixture) -> shots/light_<id>_{front,three}.png (front = straight on; three = 3/4 from a little below the rim, the LEDs showing).
import { ex } from '/scripts/ground-shots.js';
const wait = ms => new Promise(r => setTimeout(r, ms));

/** Like ground-shots' snap, but the whole canvas (exportPNG crops to the tank and stand, which cuts off a fixture above
 *  the rim); `crop` = [x0, y0, x1, y1] fractions of the canvas. */
export async function grab(name, { az, el, dist, zoom, crop = [0, 0, 1, 1], w = 1000, mult = 2 } = {}) {
  const { store, viewer: v } = window.__gb;
  store.cam(c => { if (az != null) c.az = az; if (el != null) c.el = el; if (dist != null) c.dist = dist; if (zoom != null) c.zoom = zoom; });
  store.select(null);
  await v.buildNow?.(); await v.exportPNG(1);
  v.renderer.setPixelRatio(v.fullRatio() * mult); v.exporting = true; v.draw(); v.exporting = false;
  const W = v.canvas.width, H = v.canvas.height, [x0, y0, x1, y1] = crop, sw = (x1 - x0) * W, sh = (y1 - y0) * H, h = Math.round(w * sh / sw);
  const c = new OffscreenCanvas(w, h); c.getContext('2d').drawImage(v.canvas, x0 * W, y0 * H, sw, sh, 0, 0, w, h);
  v.renderer.setPixelRatio(v.baseRatio()); v.dirty = true;
  await fetch('/__shot?name=' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return [W, H];
}

/** The tank each shape is shown on (mm): a 24 in for the bars and the stick, a 2.5 gal nano for the gooseneck. */
const TANKS = { 'datoo-mini-clip-7w': { L: 406, D: 203, H: 254 }, 'nicrew-classicled-36-48': { L: 1219, D: 457, H: 508 } };
export const SHOWN = ['aquaneat-18-24', 'hygger-clip-24-7', 'datoo-mini-clip-7w', 'hygger-submersible-24-7', 'nicrew-c10-18-24', 'nicrew-classicled-36-48'];

export async function one(id, { views = ['front', 'three'] } = {}) {
  await ex('planted');
  const { applyLightProduct } = await import('/src/scene/lightproduct.ts'), { lightProduct } = await import('/src/data/gearCatalog.ts');
  window.__gb.store.edit(s => {
    s.tank = { ...s.tank, ...(TANKS[id] ?? { L: 609.6, D: 304.8, H: 304.8 }) }; s.lid = 'open';
    applyLightProduct(s.light, s.tank, lightProduct(id));
  });
  await wait(400);
  const out = [];
  if (views.includes('front')) out.push(await grab(`light_${id}_front`, { az: 0, el: 6, zoom: 1, dist: 3000, crop: [0, 0.1, 1, 0.6], w: 900 }));
  if (views.includes('three')) out.push(await grab(`light_${id}_three`, { az: 30, el: -2, zoom: 1.25, dist: 3000, crop: [0, 0.08, 1, 0.42], w: 1100 }));
  return out;
}
export async function all() { for (const id of SHOWN) await one(id); return SHOWN.length; }
