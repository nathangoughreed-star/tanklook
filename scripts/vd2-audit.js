// Dev server only (lane VD2): capability-audit contact sheets, one per visual family. Rows = the family's archetypes that have a
// mapped look, columns = open / balanced / full (scene/recipes.ts recipeBase), same camera and tank rule as vd4-shots.js.
// Console: `const s = await import('/scripts/vd2-audit.js'); await s.all()`, or `await s.family('fw-gardens')`.
// Sheets land in shots/vd2_<family>.png; `s.facts()` returns per-archetype numbers (animals per level, cover per level).
const wait = ms => new Promise(r => setTimeout(r, ms));
async function view(S) {
  const { store, viewer } = window.__gb;
  store.edit(t => { for (const k of Object.keys(t)) delete t[k]; Object.assign(t, structuredClone(S)); });
  store.cam(c => { c.az = 0; c.el = 8; c.zoom = 1.1; });
  store.select(null);
  await wait(400); await viewer.buildNow?.(); await viewer.exportPNG(1);
  return createImageBitmap(await viewer.exportPNG(1));
}
async function mods() {
  return { R: await import('/src/scene/recipes.ts'), A: await import('/src/scene/archetypes.ts'), T: await import('/src/data/tanks.ts') };
}
function tankFor({ R, T }, a) {
  const min = R.minTank(a), long20 = T.TANK_MODELS.find(m => m.name === '20 gal long' && !m.terrarium);
  return a.env === 'terrarium' || min.ratedGal > 20 ? min : long20;
}
export async function family(fid) {
  const M = await mods(), { R, A } = M, f = A.FAMILIES.find(x => x.id === fid);
  const rows = A.ARCHETYPES.filter(a => a.familyId === fid && a.support !== 'coming-soon' && R.recipeBase(a, tankFor(M, a)));
  if (!rows.length) return null;
  const w = 460, y0 = 0.1, y1 = 0.76, top = 40, lab = 26, cells = [];
  for (const a of rows) {
    const tank = tankFor(M, a), base = R.recipeBase(a, tank), ims = [];
    for (const d of R.DENSITIES) ims.push(await view(R.sceneAt(base, d)));
    cells.push({ a, tank, base, ims });
  }
  const h = Math.round(w * cells[0].ims[0].height * (y1 - y0) / cells[0].ims[0].width), rowH = h + lab;
  const c = new OffscreenCanvas(w * 3 + 20, top + rows.length * rowH), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#222'; g.font = 'bold 22px sans-serif';
  g.fillText(`${f.name} (${f.id}): partial / supported archetypes at open | balanced | full`, 10, 28);
  cells.forEach((r, k) => {
    const y = top + k * rowH; g.font = '15px sans-serif'; g.fillStyle = '#222';
    g.fillText(`${r.a.id} [${r.a.support}] looks ${r.a.recipe.looks.join('+')} | ${r.tank.name} | ${r.base.animals.map(x => `${x.n} ${x.species}`).join(', ') || 'no animals'} | cover ${R.DENSITIES.map(d => (R.coverOf(r.base.scenes[d]) * 100).toFixed(0)).join('/')} %`, 6, y + 18);
    r.ims.forEach((im, i) => g.drawImage(im, 0, im.height * y0, im.width, im.height * (y1 - y0), i * (w + 10), y + lab, w, h));
  });
  await fetch('/__shot?name=vd2_' + fid, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return `vd2_${fid} (${rows.length} rows)`;
}
export async function all() {
  const A = (await mods()).A, out = [];
  for (const f of A.FAMILIES) out.push(await family(f.id));
  return out;
}
/** Per partial archetype: animal lists per level equal?, item counts, cover. */
export async function facts() {
  const M = await mods(), { R, A } = M, out = [];
  for (const a of A.ARCHETYPES) {
    if (a.support === 'coming-soon') continue;
    const tank = tankFor(M, a), base = R.recipeBase(a, tank); if (!base) { out.push({ id: a.id, none: true }); continue; }
    const kinds = d => { const k = {}; for (const it of base.scenes[d].items) k[it.kind] = (k[it.kind] || 0) + 1; return k; };
    out.push({ id: a.id, tank: tank.name, animals: base.animals, animalsSame: R.DENSITIES.every(d => JSON.stringify(base.scenes[d].animals) === JSON.stringify(base.scenes.open.animals)),
      cover: R.DENSITIES.map(d => +R.coverOf(base.scenes[d]).toFixed(3)), kinds: R.DENSITIES.map(kinds) });
  }
  return out;
}
