// Dev server only: review pictures of one fish from fixed views, saved to shots/ through the /__shot endpoint
// (scripts/shots-plugin.mjs). In the browser console: `const h = await import('/scripts/shot-helpers.js');
// await h.views('48_discus', 'discus')` -> shots/48_discus_{side,right50,above25,headon75}_{before,after}.png,
// before = fish3d.fade off. Then `python <sheet script>` lays them out.

const wait = ms => new Promise(r => setTimeout(r, ms));

export async function shot(name, { species = 'discus', az = 0, el = 0, dist = 1200, zoom = 1.8, fade = true, wrap = true, on = true, crop = 0.62, mult = 2, frame = null } = {}) {
  const { store, viewer, fish3d } = window.__gb;
  fish3d.fade = fade; fish3d.wrap = wrap; fish3d.on = on;
  // one tank (split views shrink the picture), no hardscape
  if (store.scene.tanks.length > 1) store.update(s => { s.tanks = [s.tanks[s.active]]; s.active = 0; });
  store.edit(t => {
    t.layout = { id: 'none', seed: 1 }; t.items = [];
    t.fish = [{ id: 1, species, x: t.tank.L / 2, y: t.tank.H / 2, depth: t.tank.D / 2, yaw: 0, pitch: 0, roll: 0, bend: 0 }];
  });
  store.cam(c => { c.dist = dist; c.az = az; c.el = el; c.zoom = zoom; });
  store.select(null);
  await viewer.exportPNG(1); // builds the scene now (a hidden tab throttles timers to about one a minute)
  const im = await createImageBitmap(await viewer.exportPNG(mult)), c = new OffscreenCanvas(560, 560);
  // centred on the fish (bottom fish rest below the tank's middle); crop 'fit' = its projected box plus a margin
  const vp = viewer.vps[0], m = vp.meshById.get(1), q = m.getWorldPosition(m.position.clone()).project(vp.cam);
  let cx = (q.x + 1) / 2 * im.width, cy = (1 - q.y) / 2 * im.height, h = im.height * crop;
  if (crop === 'fit') {
    const b = new (m.position.constructor)(), box = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    m.updateWorldMatrix(true, true);
    m.traverse(o => { const p = o.geometry?.attributes?.position; if (!p) return;
      for (let i = 0; i < p.count; i += 7) { b.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).project(vp.cam);
        const x = (b.x + 1) / 2 * im.width, y = (1 - b.y) / 2 * im.height;
        box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x); box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y); } });
    cx = (box.x0 + box.x1) / 2; cy = (box.y0 + box.y1) / 2; h = 1.25 * Math.max(box.x1 - box.x0, box.y1 - box.y0);
  }
  if (frame) ({ cx, cy, h } = frame); // reuse another shot's framing (card vs 3D at the same scale)
  c.getContext('2d').drawImage(im, cx - h / 2, cy - h / 2, h, h, 0, 0, 560, 560);
  await fetch('/__shot?name=' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return { cx, cy, h };
}

export const VIEWS = { side: [0, 0], right50: [50, 0], above25: [-30, 25], headon75: [75, 0] };

export async function views(pre, species, o = {}) {
  for (const [k, [az, el]] of Object.entries(VIEWS))
    for (const fade of [false, true]) await shot(`${pre}_${k}_${fade ? 'after' : 'before'}`, { species, az, el, fade, ...o });
  return 'ok';
}

/** Before/after of the lengthwise smear (`fish3d.wrap`): shots/<pre>_<view>_{before,after}.png. */
export async function wrapViews(pre, species, o = {}) {
  for (const [k, [az, el]] of Object.entries(VIEWS))
    for (const wrap of [false, true]) await shot(`${pre}_${k}_${wrap ? 'after' : 'before'}`, { species, az, el, wrap, ...o });
  return 'ok';
}

/** Card vs 3D (review sheets): shots/<pre>_<view>_{card,3d}.png. */
export async function cardViews(pre, species, o = {}) {
  for (const [k, [az, el]] of Object.entries(VIEWS)) {
    const frame = await shot(`${pre}_${k}_3d`, { species, az, el, on: true, ...o }); // the card at the 3D shot's framing
    await shot(`${pre}_${k}_card`, { species, az, el, on: false, ...o, frame });
  }
  window.__gb.fish3d.on = true;
  return 'ok';
}
