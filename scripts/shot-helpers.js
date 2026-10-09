// Dev server only: review pictures of one fish from fixed views, saved to shots/ through the /__shot endpoint
// (scripts/shots-plugin.mjs). In the browser console: `const h = await import('/scripts/shot-helpers.js');
// await h.views('48_discus', 'discus')` -> shots/48_discus_{side,right50,above25,headon75}_{before,after}.png,
// before = fish3d.fade off. Then `python <sheet script>` lays them out.

const wait = ms => new Promise(r => setTimeout(r, ms));

export async function shot(name, { species = 'discus', az = 0, el = 0, dist = 1200, zoom = 1.8, fade = true, crop = 0.62, mult = 2 } = {}) {
  const { store, viewer, fish3d } = window.__gb;
  fish3d.fade = fade;
  store.edit(t => {
    t.layout = { id: 'none', seed: 1 };
    t.fish = [{ id: 1, species, x: t.tank.L / 2, y: t.tank.H / 2, depth: t.tank.D / 2, yaw: 0, pitch: 0, roll: 0, bend: 0 }];
  });
  store.cam(c => { c.dist = dist; c.az = az; c.el = el; c.zoom = zoom; });
  store.select(null);
  await wait(400);
  const im = await createImageBitmap(await viewer.exportPNG(mult)), h = im.height * crop, c = new OffscreenCanvas(560, 560);
  // centred on the fish (bottom fish rest below the tank's middle)
  const vp = viewer.vps[0], m = vp.meshById.get(1), q = m.getWorldPosition(m.position.clone()).project(vp.cam);
  const cx = (q.x + 1) / 2 * im.width, cy = (1 - q.y) / 2 * im.height;
  c.getContext('2d').drawImage(im, cx - h / 2, cy - h / 2, h, h, 0, 0, 560, 560);
  await fetch('/__shot?name=' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
}

export const VIEWS = { side: [0, 0], right50: [50, 0], above25: [-30, 25], headon75: [75, 0] };

export async function views(pre, species, o = {}) {
  for (const [k, [az, el]] of Object.entries(VIEWS))
    for (const fade of [false, true]) await shot(`${pre}_${k}_${fade ? 'after' : 'before'}`, { species, az, el, fade, ...o });
  return 'ok';
}
