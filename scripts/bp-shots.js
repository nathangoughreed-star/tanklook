// Dev server only (lane BP): ball python review pictures. In the console:
// `const b = await import('/scripts/bp-shots.js'); await b.scene({ fish: [{ bend: 0, x: 300, depth: 150, yaw: 20, tl: 500 }] }); await b.snap('bp_x', { az: 0, el: 25 })`
// `await b.shuffled(11, 3)` = three snakes, Shuffle seed 11. Pictures land in shots/<name>.png.
const wait = ms => new Promise(r => setTimeout(r, ms));
export { snap } from '/scripts/ground-shots.js';
export async function scene({ fish = [], items = ['climb'], water = false } = {}) {
  const g = await import('/scripts/ground-shots.js'), { makeItem } = await import('/src/scene/items.ts');
  await g.dry20('soil');
  const { store } = window.__gb;
  store.edit(t => {
    const spots = { climb: [430, 150, { size: 380 }], corkflat: [140, 120, {}], ledge: [480, 200, { size: 200, lift: 120 }], limb: [300, 150, { size: 380, tilt: -70 }] };
    t.items = items.map((v, i) => { const [x, d, e] = spots[v]; return makeItem(t.tank, v === 'limb' ? 'climb' : v, i + 1, 7, x, d, e); });
    t.fish = fish.map((f, i) => ({ id: i + 1, species: 'ballpython', x: 300, y: 0, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0, surface: 'floor', ...f }));
  });
  await wait(1200);
}
export async function shuffled(seed, n = 3, items = ['climb', 'corkflat']) {
  const { shuffleFish } = await import('/scripts/../src/scene/scatter.ts'), { rng } = await import('/src/art/paint.ts');
  await scene({ items, fish: Array.from({ length: n }, () => ({})) });
  window.__gb.store.edit(t => { shuffleFish(t, rng(seed)); });
  await wait(1200);
}

/** Frame the animals: set the camera, find the animals' screen box and save that crop (`pad` = margin as a share of the box). */
export async function focus(name, { az = 0, el = 20, zoom = 1.5, pad = 0.25, w = 900, idx = null } = {}) {
  const g = await import('/scripts/ground-shots.js'), THREE = await import('three'), { store, viewer } = window.__gb;
  store.cam(c => { c.az = az; c.el = el; c.zoom = zoom; });
  store.select(null); await wait(300);
  await viewer.exportPNG(1);
  const vp = viewer.vps[0], box = new THREE.Box3();
  vp.fishMeshes.forEach((m, i) => { if (idx === null || idx === i) box.expandByObject(m.children[0]); });
  const c = vp.cam; c.updateMatrixWorld(); c.updateProjectionMatrix();
  const pts = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z).project(c));
  const xs = pts.map(p => (p.x + 1) / 2), ys = pts.map(p => (1 - p.y) / 2);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const px = (x1 - x0) * pad, py = (y1 - y0) * pad; x0 = Math.max(0, x0 - px); x1 = Math.min(1, x1 + px); y0 = Math.max(0, y0 - py); y1 = Math.min(1, y1 + py);
  return g.snap(name, { az, el, zoom, crop: [x0, y0, x1, y1], w });
}

/** A close crop round the point at fraction `at` of the first snake's spine (0 tail .. 1 snout), `r` mm round it, from the camera set by az / el / zoom. */
export async function closeup(name, { az = 0, el = 20, zoom = 6, at = 0.985, r = 40, w = 900, mult = 3, idx = 0 } = {}) {
  const g = await import('/scripts/ground-shots.js'), THREE = await import('three'), { snakeSpine } = await import('/src/render/snake3d.ts'), { store, viewer } = window.__gb;
  store.cam(c => { c.az = az; c.el = el; c.zoom = zoom; });
  store.select(null); await wait(300);
  const vp = viewer.vps[0], m = vp.fishMeshes[idx], f = store.scene.tanks[0].fish[idx];
  const sp = snakeSpine('ballpython', f.tl ?? 1200, 'floor', undefined, f.bend), p = sp.pts[Math.round(at * 280)].clone();
  m.updateMatrixWorld(true); p.applyMatrix4(m.matrixWorld);
  await viewer.exportPNG(1);
  const c = vp.cam; c.updateMatrixWorld(); c.updateProjectionMatrix();
  const pts = [-1, 1].flatMap(dx => [-1, 1].flatMap(dy => [-1, 1].map(dz => p.clone().add(new THREE.Vector3(dx, dy, dz).multiplyScalar(r)).project(c))));
  const xs = pts.map(q => (q.x + 1) / 2), ys = pts.map(q => (1 - q.y) / 2);
  return g.snap(name, { az, el, zoom, mult, w, crop: [Math.max(0, Math.min(...xs)), Math.max(0, Math.min(...ys)), Math.min(1, Math.max(...xs)), Math.min(1, Math.max(...ys))] });
}
