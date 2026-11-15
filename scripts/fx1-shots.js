// Dev server only (lane FX1): frame strips of a fish swimming in place. In the console:
// `const f = await import('/scripts/fx1-shots.js'); await f.strip('danio')` -> shots/fx1_<species>_<view>.png (8 frames over about one tail beat, rows = views)
// Drives the viewer's own clock (viewer.swayT) and draws, so it shows exactly what the swim shader does.
const wait = ms => new Promise(r => setTimeout(r, ms));
const VIEWS = { side: { az: 0, el: 0 }, threeq: { az: 38, el: 22 }, top: { az: 0, el: 70 } };
export async function strip(species = 'danio', { tl = 90, frames = 8, step = 0.05, views = ['side', 'threeq', 'top'], w = 260, name = 'fx1_' + species, still = false } = {}) {
  const g = await import('/scripts/ground-shots.js'); await g.ex('terrarium');
  const { store, viewer } = window.__gb;
  store.edit(t => {
    t.tank = { L: 300, D: 200, H: 220 }; t.items = []; t.layout = { id: 'none', seed: 1 }; t.terrain.on = false; t.water.on = true; t.water.level = 100;
    t.fish = [{ id: 1, species, x: 150, y: 110, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0, tl }];
  });
  await wait(900); await viewer.buildNow?.();
  const out = [], centres = [];
  const cv = viewer.renderer.domElement;
  for (const vname of views) {
    const v = VIEWS[vname]; store.cam(c => { c.az = v.az; c.el = v.el; c.zoom = 2.0; }); store.select(null);
    await viewer.buildNow?.(); await wait(400);
    const row = [];
    for (let i = 0; i < frames; i++) {
      viewer.swayT = i * step * 1000; viewer.swayScan = true; viewer.dirty = true; viewer.draw(); // the same draw the loop makes
      const im = await createImageBitmap(cv); row.push(im);
      if (i === 0) { // where the fish is on screen: the crop follows it
        const { Vector3 } = await import('three'), vp = viewer.vps[0], q = new Vector3(150, 110, -100).project(vp.cam);
        centres.push([(q.x + 1) / 2 * im.width, (1 - q.y) / 2 * im.height]);
      }
    }
    out.push(row);
  }
  const W = row0(out).width, H = row0(out).height, cw = W * 0.5, ch = cw * 0.8, sc = w / cw, h = Math.round(ch * sc);
  const c = new OffscreenCanvas(w * frames, h * out.length), x = c.getContext('2d');
  out.forEach((row, r) => row.forEach((im, i) => x.drawImage(im, centres[r][0] - cw / 2, centres[r][1] - ch / 2, cw, ch, i * w, r * h, w, h)));
  await fetch('/__shot?name=' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return [W, H, c.width, c.height];
}
const row0 = o => o[0][0];
