// Dev server only (lane SS2): one starter style at a seed, front view, saved to shots/<name>.png.
// Console: `const s = await import('/scripts/ss2-shots.js'); await s.style('rainforest', 1)`; `await s.sheet(['rainforest', 'arid'])`
// = each style at its default seed 1 and two Shuffles (seeds 7, 23). Pictures land in shots/ss2_<id>_<seed>.png.
import { ex, snap } from '/scripts/ground-shots.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const TANKS = { land: { L: 609.6, D: 457.2, H: 609.6 }, python: { L: 1219, D: 609, H: 457 }, small: { L: 300, D: 300, H: 400 }, nano: { L: 609.6, D: 304.8, H: 406.4 } };
const SIZE = { rainforest: 'land', frogs: 'land', arid: 'python', python: 'python', burrow: 'land', jumper: 'small', paludarium: 'land', clownnano: 'nano' };
const KIND = { reef: 'reef', softreef: 'reef', spsreef: 'reef', clownnano: 'reef', paludarium: 'paludarium' };
export async function style(id, seed = 1, { animals = 3, az = 0, el = 8, name } = {}) {
  const { store } = window.__gb, S = await import('/src/scene/starter.ts'), G = await import('/src/scene/scapeground.ts'), I = await import('/src/scene/items.ts');
  await ex(KIND[id] ?? 'planted');
  store.edit(s => {
    if (SIZE[id]) s.tank = { ...TANKS[SIZE[id]] };
    s.fish = []; s.items = []; s.layout = { id, seed, dens: { hard: 2, plant: 2, animal: animals } };
    if (I.isLandStyle(id)) s.water.on = false; else if (id === 'paludarium') { s.water.on = true; s.water.level = 0.42; }
    if (id === 'blackwater') Object.assign(s.water, { color: '#6b3d14', opacity: 0.42 });
    G.styleGround(s); S.regenerate(s, 'all', 1000);
  });
  await wait(600);
  return snap(name ?? `ss2_${id}_${seed}`, { az, el, zoom: 1.1, w: 900 });
}
export async function sheet(ids, seeds = [1, 7, 23]) { for (const id of ids) for (const sd of seeds) await style(id, sd); return 'ok'; }
