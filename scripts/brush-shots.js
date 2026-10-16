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
