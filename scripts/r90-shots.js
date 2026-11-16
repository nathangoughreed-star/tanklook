// Dev server only (R90): frame strip of crawlers (shrimp, crab, snails) walking a small tank. In the console:
// `const r = await import('/scripts/r90-shots.js'); await r.strip()` -> shots/r90_crawl.png (frames across 60 simulated seconds, top view + a front glass view)
// Also returns each animal's start and end spot and how far it went (in), for the notes. Drives the viewer's own draw with a faked clock.
const wait = ms => new Promise(r => setTimeout(r, ms));
export async function setup(set = 'crawl') {
  const g = await import('/scripts/ground-shots.js'); await g.ex('terrarium');
  const { store, viewer } = window.__gb;
  const { LIBRARY } = await import('/src/scene/items.ts'), ie = await import('/src/scene/itemEdit.ts');
  store.edit(t => {
    t.tank = { L: 600, D: 300, H: 300 }; t.items = []; t.layout = { id: 'none', seed: 1 }; t.terrain.on = false; t.water.on = true; t.water.level = 250;
    const fish = [];
    const add = (species, x, depth, yaw, surface, y, tl) => fish.push({ id: fish.length + 1, species, x, y: y ?? 8, depth, yaw, pitch: 0, roll: 0, bend: 0, surface, ...(tl ? { tl } : {}) });
    if (set === 'cling') { add('oto', 120, 80, 20); add('oto', 160, 220, 200); add('oto', 300, 0, 0, 'glass', 110); add('oto', 450, 300, 0, 'glass', 90); add('bristlenose', 400, 150, 90); add('hillstream', 520, 220, 180); add('oto', 80, 150, 90, 'glass', 150); t.fish = fish; return; }
    add('cherryshrimp', 120, 80, 20); add('cherryshrimp', 160, 220, 200); add('amano', 300, 150, 90); add('redclaw', 480, 220, 180, undefined, undefined, 90);
    add('nerite', 380, 70, 0); add('mystery', 200, 150, 120); add('ramshorn', 520, 120, 300);
    add('nerite', 250, 0, 0, 'glass', 120); // on the front pane
    t.fish = fish;
  });
  const keys = Object.keys(LIBRARY), stone = keys.find(k => LIBRARY[k].kind === 'stone'), plant = keys.find(k => LIBRARY[k].kind === 'plant');
  store.edit(t => { let n = 100; if (stone) ie.addItem(t, stone, n++, 7); if (plant) ie.addItem(t, plant, n++, 9); });
  await wait(900); await viewer.buildNow?.();
  viewer.swim = true; viewer.swimAuto = false;
  return window.__gb.store.scene?.fish?.length ?? 0;
}
export async function strip({ frames = 6, span = 60, w = 560, set = 'crawl', name = 'r90_crawl' } = {}) {
  await setup(set);
  const { store, viewer } = window.__gb, cv = viewer.renderer.domElement;
  const views = { top: { az: 0, el: 88 }, front: { az: 0, el: 12 } };
  const imgs = [], spots = {};
  const run = async (secs) => { viewer.swayScan = true; viewer.dirty = true; viewer.draw(); for (let k = 0; k < secs * 10; k++) { viewer.swayT += 100; viewer.roam.update(viewer.drifters, 0.1, true, false); viewer.crawl.update(viewer.crawlers, 0.1, true, false); viewer.cling.update(viewer.clingers, 0.1, true, false); } viewer.roamT = viewer.swayT; }; // steps the sims without drawing (a draw is slow in a hidden pane)
  for (const [vn, v] of Object.entries(views)) {
    store.cam(c => { c.az = v.az; c.el = v.el; c.zoom = 1.3; }); store.select(null); await viewer.buildNow?.(); await wait(300);
    viewer.swayT += 1; viewer.crawl.reset(); viewer.cling.reset(); viewer.roam.reset(); viewer.swayScan = true; viewer.dirty = true; viewer.draw();
    const row = [];
    for (let i = 0; i < frames; i++) {
      viewer.draw(); row.push(await createImageBitmap(cv));
      if (vn === 'top') { // where each crawler is, from the meshes
        for (const m of [...viewer.crawlers, ...viewer.clingers]) { const id = (m.userData.crawl ?? m.userData.cling).spec.id; (spots[id] ??= []).push([+m.position.x.toFixed(0), +(-m.position.z).toFixed(0)]); }
      }
      await run(span / (frames - 1));
    }
    imgs.push(row);
  }
  const W = imgs[0][0].width, H = imgs[0][0].height, sc = w / W, h = Math.round(H * sc);
  const c = new OffscreenCanvas(w * frames, h * imgs.length), x = c.getContext('2d');
  imgs.forEach((row, r) => row.forEach((im, i) => x.drawImage(im, i * w, r * h, w, h)));
  await fetch('/__shot?name=' + name, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  const walked = Object.fromEntries(Object.entries(spots).map(([id, p]) => [id, +(p.slice(1).reduce((a, q, k) => a + Math.hypot(q[0] - p[k][0], q[1] - p[k][1]), 0) / 25.4).toFixed(1)]));
  return { size: [c.width, c.height], walkedInchesBetweenFrames: walked, n: Object.keys(spots).length };
}

/** R93: a frame strip of one African dwarf frog's breathing trip (rest on the substrate, kick up, pause at the top, dart down). `r.adf()` -> shots/r93_adf.png */
const field_top = () => 0;
export async function adf({ w = 300 } = {}) {
  const g = await import('/scripts/ground-shots.js'); await g.ex('terrarium');
  const { store, viewer } = window.__gb;
  store.edit(t => {
    t.tank = { L: 600, D: 300, H: 300 }; t.items = []; t.layout = { id: 'none', seed: 1 }; t.terrain.on = false; t.water.on = true; t.water.level = 250;
    t.fish = [{ id: 1, species: 'adf', x: 300, y: 8, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0 }];
  });
  await wait(900); await viewer.buildNow?.(); viewer.swim = true; viewer.swimAuto = false;
  store.cam(c => { c.az = 0; c.el = 8; c.zoom = 1.6; }); store.select(null); await viewer.buildNow?.(); await wait(300);
  viewer.swayScan = true; viewer.dirty = true; viewer.draw(); viewer.crawl.reset();
  const tick = (dt = 0.1) => { viewer.swayT += dt * 1000; viewer.crawl.update(viewer.crawlers, dt, true, false); viewer.roamT = viewer.swayT; };
  const m = viewer.crawlers[0], y0 = m.position.y, cv = viewer.renderer.domElement; let n = 0;
  const frames = [], snap = async () => { viewer.dirty = true; viewer.draw(); frames.push([await createImageBitmap(cv), m.position.y]); };
  await snap(); // at rest on the substrate
  while (m.position.y < y0 + 15 && n++ < 20000) tick(0.1); // wait for the first trip
  
  let phase = 0, peak = y0, tTop = 0; n = 0;
  while (phase < 7 && n++ < 4000) {
    const y = m.position.y; peak = Math.max(peak, y);
    if (phase === 0 && y > y0 + 50) { await snap(); phase = 1; }
    else if (phase === 1 && y > y0 + 110) { await snap(); phase = 2; }
    else if (phase === 2 && y > y0 + 170) { await snap(); phase = 3; tTop = 0; }
    else if (phase === 3) { tTop += 0.05; if (tTop > 1.0) { await snap(); phase = 4; } }
    else if (phase === 4 && y < peak - 40 && tTop > 0) { await snap(); phase = 5; }
    else if (phase === 5 && y < peak - 120) { await snap(); phase = 6; }
    else if (phase === 6 && y < y0 + 2) { await snap(); phase = 7; }
    tick(0.05);
  }
  const W = frames[0][0].width, H = frames[0][0].height, cw = W * 0.22, sc = w / cw, h = Math.round(H * sc);
  const { Vector3 } = await import('three'), vp = viewer.vps[0], q = new Vector3(m.position.x, 120, m.position.z).project(vp.cam), cx = (q.x + 1) / 2 * W;
  const c = new OffscreenCanvas(w * frames.length, h), x = c.getContext('2d');
  frames.forEach(([im], i) => x.drawImage(im, cx - cw / 2, 0, cw, H, i * w, 0, w, h));
  await fetch('/__shot?name=r93_adf', { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }) });
  return { ys: frames.map(f => Math.round(f[1])), size: [c.width, c.height] };
}
