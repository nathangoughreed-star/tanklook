// Dev server only (lane WT1): the water-tint review pictures, front view, saved to shots/wt1_<name>.png.
// Console: `const w = await import('/scripts/wt1-shots.js'); await w.cube('after'); await w.reef('after'); await w.paludarium('after')`
// (`cube('before')` on a checkout of the old shader gives the "before" picture.)
import { ex, snap } from '/scripts/ground-shots.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
async function scape(id, kind, tank, extra = () => {}) {
  const { store } = window.__gb, S = await import('/src/scene/starter.ts'), G = await import('/src/scene/scapeground.ts');
  await ex(kind);
  store.edit(s => {
    s.tank = { ...tank }; s.fish = []; s.items = []; s.layout = { id, seed: 1, dens: { hard: 2, plant: 2, animal: 3 } };
    extra(s); G.styleGround(s); S.regenerate(s, 'all', 1000);
  });
  await wait(700);
}
/** Nathan's blackwater look: a 12 in cube (about 7.5 gal), driftwood, leaf litter, cardinals. */
export async function cube(tag) {
  await scape('blackwater', 'planted', { L: 304.8, D: 304.8, H: 304.8 }, s => Object.assign(s.water, { color: '#6b3d14', opacity: 0.42 }));
  return snap(`wt1_cube_${tag}`, { az: 0, el: 8, zoom: 1.1, w: 900 });
}
export async function reef(tag) { await scape('reef', 'reef', { L: 609.6, D: 304.8, H: 406.4 }); return snap(`wt1_reef_${tag}`, { az: 0, el: 8, zoom: 1.1, w: 900 }); }
export async function paludarium(tag) {
  await scape('paludarium', 'planted', { L: 609.6, D: 457.2, H: 609.6 }, s => { s.water.on = true; s.water.level = 0.42; Object.assign(s.water, { color: '#6b3d14', opacity: 0.42 }); });
  return snap(`wt1_paludarium_${tag}`, { az: 0, el: 8, zoom: 1.1, w: 900 });
}
