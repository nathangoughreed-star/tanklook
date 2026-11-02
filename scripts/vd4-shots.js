// Dev server only (lane VD4): density trios (scene/recipes.ts), one picture per visual family that has a partial
// archetype: open / balanced / full side by side, same camera. Console: `const s = await import('/scripts/vd4-shots.js');
// await s.all()`, or `await s.trio('iwagumi-stone-garden')`. Pictures land in shots/vd4_<archetype>.png.
const wait = ms => new Promise(r => setTimeout(r, ms));
async function view(S) {
  const { store, viewer } = window.__gb;
  store.edit(t => { for (const k of Object.keys(t)) delete t[k]; Object.assign(t, structuredClone(S)); });
  store.cam(c => { c.az = 0; c.el = 8; c.zoom = 1.1; });
  store.select(null);
  await wait(400); await viewer.buildNow?.(); await viewer.exportPNG(1);
  return createImageBitmap(await viewer.exportPNG(1));
}
export async function trio(id) {
  const R = await import('/src/scene/recipes.ts'), A = await import('/src/scene/archetypes.ts'), T = await import('/src/data/tanks.ts');
  const a = A.archetype(id), min = R.minTank(a);
  const long20 = T.TANK_MODELS.find(m => m.name === '20 gal long' && !m.terrarium);
  const tank = a.env === 'terrarium' || min.ratedGal > 20 ? min : long20;
  const base = R.recipeBase(a, tank);
  const ims = [];
  for (const d of R.DENSITIES) ims.push(await view(R.sceneAt(base, d)));
  const y0 = 0.1, y1 = 0.76, w = 600, h = Math.round(w * ims[0].height * (y1 - y0) / ims[0].width), top = 64, c = new OffscreenCanvas(w * 3 + 20, h + top), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#222'; g.font = 'bold 22px sans-serif';
  g.fillText(`${a.name} (${A.FAMILIES.find(f => f.id === a.familyId).name}), ${tank.name}, seed ${base.seed}, animals: ${base.animals.map(x => `${x.n} ${x.species}`).join(', ') || 'none'}`, 10, 26);
  g.font = '18px sans-serif';
  R.DENSITIES.forEach((d, i) => {
    g.drawImage(ims[i], 0, ims[i].height * y0, ims[i].width, ims[i].height * (y1 - y0), i * (w + 10), top, w, h);
    g.fillText(`${a.density[d].label}: cover ${(R.coverOf(base.scenes[d]) * 100).toFixed(0)} %`, i * (w + 10) + 6, top - 8);
  });
  await fetch('/__shot?name=vd4_' + id.replace(/[^\w-]/g, '_'), { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return `vd4_${id}`;
}
/** The first partial archetype of every family that has one. */
export async function all() {
  const A = await import('/src/scene/archetypes.ts'), out = [];
  for (const f of A.FAMILIES) { const a = A.ARCHETYPES.find(x => x.familyId === f.id && x.support !== 'coming-soon'); if (a) out.push(await trio(a.id)); }
  return out;
}
