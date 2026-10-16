// Dev server only (lane CP): pictures of new pieces. Console: `const c = await import('/scripts/cp-shots.js');
// await c.line('dish', [['dish',80],['dish',120],['stonedish',120]], {type:'tsand'})` -> shots/cp_<name>_{front,q}.png
const wait = ms => new Promise(r => setTimeout(r, ms));
export async function line(name, list, { type = 'tsand', wet = false, dist = 330, zoom = 2.2, views = { front: [0, 18], q: [35, 28] }, y = 0.5 } = {}) {
  const g = await import('/scripts/ground-shots.js'), { makeItem } = await import('/src/scene/items.ts');
  const { store } = window.__gb;
  await g.dry20(type);
  if (wet) store.edit(t => { t.water.on = true; });
  store.edit(t => {
    t.items = list.map(([v, size, extra], i) => makeItem(t.tank, v, i + 1, 7 + i, t.tank.L * (0.5 + (i - (list.length - 1) / 2) * 0.17), t.tank.D * y, { ...(size ? { size } : {}), ...(extra ?? {}) }));
  });
  await wait(500);
  for (const [k, [az, el]] of Object.entries(views)) await g.snap(`cp_${name}_${k}`, { az, el, dist, zoom, w: 1000, crop: [0.1, 0.3, 0.9, 0.8] });
  return 'ok';
}

/** One plant at growth 0 / 0.5 / 1, front and 3/4: shots/cp2_<variant>_g<growth>_{front,q}.png (then scripts/pp-sheet.py <variant> cp2). */
export async function plant(variant, { type = 'tsand', size, extra = {}, dist = 420, zoom = 2, depth = 0.8, growths = [0, 0.5, 1], crop = [0.15, 0.3, 0.85, 0.95] } = {}) {
  const g = await import('/scripts/ground-shots.js'), { makeItem } = await import('/src/scene/items.ts');
  const { store } = window.__gb;
  for (const gr of growths) {
    await g.dry20(type);
    store.edit(t => { t.items = [makeItem(t.tank, variant, 1, 7, t.tank.L / 2, t.tank.D * depth, { growth: gr, ...(size ? { size } : {}), ...extra })]; });
    await wait(400);
    for (const [k, [az, el]] of Object.entries({ front: [0, 12], q: [30, 16] })) await g.snap(`cp2_${variant}_g${Math.round(gr * 100)}_${k}`, { az, el, dist, zoom, w: 700, crop });
  }
  return 'ok';
}
