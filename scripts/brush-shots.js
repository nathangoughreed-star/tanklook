// Dev server only (lane SB): review pictures of brush patches. Console:
// `const b = await import('/scripts/brush-shots.js'); await b.demo('t1_litter')` -> shots/sb_*.png
import { dry20, snap } from '/scripts/ground-shots.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
/** A stroke along a line or wave: x/depth pairs every `step` mm. */
export const line = (x0, d0, x1, d1, n = 14, wob = 0) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [x0 + (x1 - x0) * t, d0 + (d1 - d0) * t + Math.sin(t * 9) * wob].map(v => Math.round(v * 10) / 10); }).flat();
export async function setup(type = 'soil', patches = []) {
  await dry20(type);
  window.__gb.store.edit(t => { t.patches = patches.map((p, i) => ({ id: i + 1, seed: 11 + i, size: 50, density: 70, ...p })); });
  await wait(300);
}
export async function shot(name, o = {}) { return snap('sb_' + name, { az: 0, el: 35, ...o }); }
/** Like shot() but keeps the selection (snap() clears it). */
export async function shotSel(name, { az = 0, el = 50, crop = [0, 0, 1, 1], w = 1200 } = {}) {
  const { store, viewer } = window.__gb;
  store.cam(c => { c.az = az; c.el = el; });
  await viewer.buildNow?.(); await viewer.exportPNG(1);
  const im = await createImageBitmap(await viewer.exportPNG(1));
  const [x0, y0, x1, y1] = crop, sw = (x1 - x0) * im.width, sh = (y1 - y0) * im.height, h = Math.round(w * sh / sw);
  const c = new OffscreenCanvas(w, h); c.getContext('2d').drawImage(im, x0 * im.width, y0 * im.height, sw, sh, 0, 0, w, h);
  await fetch('/__shot?name=sb_' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
}
