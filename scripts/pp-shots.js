// Dev server only (lane PP): plant review pictures. In the console:
// `const p = await import('/scripts/pp-shots.js'); await p.row('fittonia')` -> shots/pp_<species>_g{0,50,100}_{front,q}.png
const wait = ms => new Promise(r => setTimeout(r, ms));
export async function row(species, { growths = [0, 0.5, 1], size, pre = 'pp', views = { front: [0, 14], q: [35, 22] }, spread, dist = 420, zoom = 2.3, wet = false, extra } = {}) {
  const g = await import('/scripts/ground-shots.js'), { makeItem, LIBRARY } = await import('/src/scene/items.ts');
  const { store, viewer } = window.__gb;
  for (const gr of growths) {
    await g.dry20('soil');
    if (wet) store.edit(t => { t.water.on = true; });
    store.edit(t => {
      const it = makeItem(t.tank, species, 1, 7, t.tank.L / 2, t.tank.D * 0.55, { growth: gr, ...(size ? { size } : {}), ...(spread ? { spread } : {}), ...(extra ?? {}) });
      t.items = [it];
    });
    await wait(400);
    for (const [k, [az, el]] of Object.entries(views)) await g.snap(`${pre}_${species}_g${Math.round(gr * 100)}_${k}`, { az, el, dist, zoom, w: 700, crop: [0.15, 0.25, 0.85, 0.85] });
  }
  return 'ok';
}
