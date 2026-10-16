// Dev server only (lane T1): review pictures of the ground. In the browser console:
// `const g = await import('/scripts/ground-shots.js'); await g.snap('t1_soil', { az: 0, el: 12 })` -> shots/t1_soil.png.
// `g.ex('terrarium')` loads an example (parsed like a file); `g.perf()` times frames with litter on / off alternating.
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function ex(name) {
  const { SCENES } = await import('/src/examples/scenes.ts'), { parseScene } = await import('/src/scene/validate.ts');
  window.__gb.store.replace(parseScene(JSON.parse(SCENES[name])).scene);
}

/** An empty dry 20-gallon (24 x 12 x 16 in) terrarium: the terrarium example's room and light, no items or animals. */
export async function dry20(type = 'soil', litter = null) {
  await ex('terrarium');
  window.__gb.store.edit(t => {
    t.tank = { L: 609.6, D: 304.8, H: 406.4 }; t.items = []; t.fish = []; t.layout = { id: 'none', seed: 1 }; t.terrain.on = false;
    Object.assign(t.substrate, { show: true, type, fl: 50, fr: 50, bl: 50, br: 50 }); if (litter) t.substrate.litter = litter; else delete t.substrate.litter;
  });
  await wait(300);
}

/** Render the active view now and save it (cropped to `crop`: [x0, y0, x1, y1] fractions of the picture). */
export async function snap(name, { az, el, dist, zoom, mult = 1, crop = null, w = 1200 } = {}) {
  const { store, viewer } = window.__gb;
  store.cam(c => { if (az != null) c.az = az; if (el != null) c.el = el; if (dist != null) c.dist = dist; if (zoom != null) c.zoom = zoom; });
  store.select(null);
  await viewer.buildNow?.(); await viewer.exportPNG(1); // build now: a hidden pane runs no frames
  const im = await createImageBitmap(await viewer.exportPNG(mult));
  const [x0, y0, x1, y1] = crop ?? [0, 0, 1, 1], sw = (x1 - x0) * im.width, sh = (y1 - y0) * im.height, h = Math.round(w * sh / sw);
  const c = new OffscreenCanvas(w, h); c.getContext('2d').drawImage(im, x0 * im.width, y0 * im.height, sw, sh, 0, 0, w, h);
  await fetch('/__shot?name=' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return [im.width, im.height];
}

/** GPU time (ms) of one frame with the chosen meshes on vs off, alternating, by the GPU's own timer
 *  (EXT_disjoint_timer_query_webgl2): free of the shared machine's CPU noise. Medians of `frames` each. */
export async function gpuPerf(frames = 40, only = o => o.userData.scatter) {
  const { viewer } = window.__gb; await viewer.buildNow?.();
  const vp = viewer.vps[0], r = viewer.renderer, gl = r.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return 'no timer query';
  const meshes = []; vp.scene.traverse(o => { if (only(o)) meshes.push(o); });
  const t = { on: [], off: [] };
  for (let i = 0; i < frames * 2; i++) {
    const on = i % 2 === 0; for (const o of meshes) o.visible = on;
    const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); r.render(vp.scene, vp.cam); gl.endQuery(ext.TIME_ELAPSED_EXT);
    let n = 0; while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) && n++ < 200) await wait(5);
    if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) (on ? t.on : t.off).push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
    gl.deleteQuery(q);
  }
  for (const o of meshes) o.visible = true;
  const med = a => a.sort((x, y) => x - y)[a.length >> 1];
  return { count: meshes.reduce((a, m) => a + m.count, 0), on: +med(t.on).toFixed(2), off: +med(t.off).toFixed(2), delta: +(med(t.on) - med(t.off)).toFixed(2), n: t.on.length };
}

/** Frame time (ms, GPU-finished via readPixels) of the litter on vs off, alternating per frame (shared machine). */
export async function perf(frames = 40, only = o => o.userData.scatter) {
  const { store, viewer } = window.__gb, vp = viewer.vps[0], r = viewer.renderer, px = new Uint8Array(4);
  const litter = []; vp.scene.traverse(o => { if (only(o)) litter.push(o); });
  const t = { on: [], off: [] };
  for (let i = 0; i < frames * 2; i++) {
    const on = i % 2 === 0; for (const o of litter) o.visible = on;
    r.readPixels?.(0, 0, 1, 1, px);
    const t0 = performance.now(); viewer.renderNow ? viewer.renderNow() : r.render(vp.scene, vp.cam);
    const gl = r.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    (on ? t.on : t.off).push(performance.now() - t0);
    await wait(5);
  }
  for (const o of litter) o.visible = true;
  const med = a => a.sort((x, y) => x - y)[a.length >> 1];
  return { leaves: litter.reduce((a, m) => a + m.count, 0), meshes: litter.length, on: med(t.on).toFixed(2), off: med(t.off).toFixed(2) };
}
