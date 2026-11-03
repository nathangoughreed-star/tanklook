// Dev server only (lane OG1): the Overflowing Garden at a tank size and a density stop, with its suggested roster. Console:
// `const s = await import('/scripts/og1-shots.js'); await s.shot('40 gal breeder', 2)`. Pictures land in shots/og1_<tank>_stop<n>.png.
const wait = ms => new Promise(r => setTimeout(r, ms));
export async function shot(tankName, stop, cam = {}) {
  const R = await import('/src/scene/recipes.ts'), A = await import('/src/scene/archetypes.ts'), T = await import('/src/data/tanks.ts'), N = await import('/src/ui/discovery/animals.ts');
  const a = A.archetype('overgrown-garden'), tank = T.TANK_MODELS.find(m => m.name === tankName && !m.terrarium);
  const plan = N.rosterPlan(a, tank), base = R.recipeBase(a, tank, plan.roster), S = R.stopScene(base, stop);
  const { store, viewer } = window.__gb;
  store.edit(t => { for (const k of Object.keys(t)) delete t[k]; Object.assign(t, structuredClone(S)); });
  store.cam(c => { c.az = cam.az ?? 18; c.el = cam.el ?? 10; c.zoom = cam.zoom ?? 0.95; });
  store.select(null);
  await wait(cam.wait ?? 4000); await viewer.buildNow?.(); await wait(1500);
  const blob = await viewer.exportPNG(1), name = `og1_${tankName.replace(/\W+/g, '_')}_stop${stop}`;
  await fetch('/__shot?name=' + name, { method: 'POST', body: blob });
  return { name, animals: plan.roster.map(r => `${r.n} ${r.species}`).join(', '), level: S.water.level, lid: S.lid };
}
