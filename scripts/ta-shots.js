// Lane TA review pictures, dev server only: a small dry terrarium with one tarantula in the pose asked for, rendered by the real
// viewer (the tank lighting changes the animals' colours, so the lab page's pictures are not the truth) and cropped round it.
// In the browser console: `const h = await import('/scripts/ta-shots.js'); await h.ta('ta_walk', { az: 25, el: 30 })` -> shots/ta_walk.png
// then `python scripts/ta-sheet.py <out> <title> <cols> name:label ...`.
const it = (id, variant, kind, x, depth, size, extra = {}) => ({ id, kind, variant, seed: 3, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size, ...extra });

export async function ta(name, { sex = 'f', bend = 0, surface = 'floor', yaw = 0, az = 25, el = 30, dist = 330, zoom = 2.2, hide = false, cork = false, x = 150, depth = 110, y = 0, fixed = false, pad = 1.5, mult = 2 } = {}) {
  const { store, viewer } = window.__gb;
  if (store.scene.tanks.length > 1) store.update(s => { s.tanks = [s.tanks[s.active]]; s.active = 0; });
  store.edit(t => {
    t.water.on = false; t.layout = { id: 'none', seed: 1 };
    t.tank = { ...t.tank, shape: 'rect', L: 300, D: 220, H: 250 };
    t.substrate = { ...t.substrate, type: 'soil' }; t.light = { ...t.light, bright: 0.7 };
    t.items = hide ? [it(1, 'halflog', 'cave', 150, 110, 150, { yaw: 0 })] : cork ? [it(1, 'corkflat', 'wood', 150, 110, 150, { yaw: 0 })] : [];
    t.fish = [{ id: 1, species: 'chacogoldenknee', ...(sex === 'f' ? { sex: 'f' } : {}), x, y, depth, yaw, pitch: 0, roll: 0, bend, surface }];
  });
  store.cam(c => { c.dist = dist; c.az = az; c.el = el; c.zoom = zoom; });
  store.select(null);
  await viewer.exportPNG(1);
  const im = await createImageBitmap(await viewer.exportPNG(mult)), c = new OffscreenCanvas(640, 480);
  const vp = viewer.vps[0], m = vp.meshById.get(1), b = new (m.position.constructor)(), box = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
  m.updateWorldMatrix(true, true);
  m.traverse(o => { const p = o.geometry?.attributes?.position; if (!p || o.material?.visible === false || o.visible === false) return;
    for (let i = 0; i < p.count; i += 9) { b.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).project(vp.cam);
      const px = (b.x + 1) / 2 * im.width, py = (1 - b.y) / 2 * im.height;
      box.x0 = Math.min(box.x0, px); box.x1 = Math.max(box.x1, px); box.y0 = Math.min(box.y0, py); box.y1 = Math.max(box.y1, py); } });
  let cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, w = pad * Math.max(box.x1 - box.x0, (box.y1 - box.y0) * 4 / 3), h = w * 3 / 4;
  if (fixed) { cx = im.width / 2; cy = im.height / 2; w = im.width * fixed; h = w * 3 / 4; } // a close crop: the middle of the view
  c.getContext('2d').drawImage(im, cx - w / 2, cy - h / 2, w, h, 0, 0, 640, 480);
  await fetch('/__shot?name=' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return { box, w };
}
