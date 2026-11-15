// Dev server only (lane FE1): fin posture pictures. In the console:
// `const f = await import('/scripts/fe1-shots.js'); await f.all()` -> shots/fe1_<species>_fin<0|50|100>.png (side view, one fish, wide tank)
// `await f.shuffle('fe1_shuffle', 7)` -> before / after a Shuffle, same camera.
const wait = ms => new Promise(r => setTimeout(r, ms));
export async function one(species, fin, name, { tl, w = 900 } = {}) {
  const g = await import('/scripts/ground-shots.js'), b = await import('/scripts/bp-shots.js');
  await g.ex('terrarium');
  const { store } = window.__gb;
  store.edit(t => {
    t.tank = { L: 760, D: 250, H: 380 }; t.items = []; t.layout = { id: 'none', seed: 1 }; t.terrain.on = false; t.water.on = true; t.water.level = 100;
    t.fish = [{ id: 1, species, x: 380, y: 200, depth: 125, yaw: 0, pitch: 0, roll: 0, bend: 0, ...(fin == null ? {} : { fin }), ...(tl ? { tl } : {}) }];
  });
  await wait(900);
  return frame(name, w);
}
export async function all() {
  for (const sp of ['bristlenose', 'betta', 'angel', 'bluetang']) for (const fin of [0, 0.5, 1]) await one(sp, fin, `fe1_${sp}_fin${Math.round(fin * 100)}`);
}
export async function shuffle(name, seed) {
  const g = await import('/scripts/ground-shots.js'), { shuffleFish } = await import('/src/scene/scatter.ts'), { rng } = await import('/src/art/paint.ts');
  await g.ex('terrarium');
  const { store } = window.__gb;
  store.edit(t => {
    t.tank = { L: 900, D: 400, H: 450 }; t.items = []; t.layout = { id: 'none', seed: 1 }; t.terrain.on = false; t.water.on = true; t.water.level = 100;
    t.fish = ['bristlenose', 'betta', 'angel', 'bluetang', 'oscar'].map((species, i) => ({ id: i + 1, species, x: 150 + i * 150, y: 200, depth: 200, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
  });
  await wait(900); await g.snap(name + '_before', { az: 0, el: 5, zoom: 1.1, w: 1400 });
  store.edit(t => { shuffleFish(t, rng(seed)); });
  await wait(900); await g.snap(name + '_after', { az: 0, el: 5, zoom: 1.1, w: 1400 });
  return store.scene.tanks[0].fish.map(f => [f.species, f.fin]);
}

/** Side view of the one fish: the middle of the tank, cropped. */
async function frame(name, w) {
  const g = await import('/scripts/ground-shots.js');
  return g.snap(name, { az: 0, el: 0, zoom: 1, crop: [0.3, 0.17, 0.7, 0.47], w });
}
