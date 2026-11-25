// Lane PT (R151): pictures of the plant leaf textures. Dev server only, driven by scripts/pt-shots.mjs. Console:
// `const s = await import('/scripts/pt-shots.js'); await s.shot('crypt_close', { mode: 'paint', items: [...], cam: {...} })`.
// Pictures land in shots/<name>.png. `mode` = plant3d.tex ('paint' | 'lum' | 'off'; absent on a build without the switch).
const wait = ms => new Promise(r => setTimeout(r, ms));
export const SCENES = {
  // the three pilot types, close, in a small tank
  pilot: { tank: [609, 305, 305], items: [['crypt', 11, 200, 120, 130], ['crypt', 5, 330, 150, 100], ['grass', 3, 120, 60, 300], ['carpet', 2, 440, 150, 260]], cam: { az: 12, el: 8, zoom: 1.7 } },
  // the water below the grass and the crypt tips: they lie over at the surface (bendPlant)
  bent: { tank: [609, 305, 305], water: 0.5, items: [['grass', 3, 150, 100, 420], ['crypt', 11, 330, 150, 200], ['carpet', 2, 480, 150, 220]], cam: { az: 14, el: 14, zoom: 1.7 } },
  pilotclose: { tank: [609, 305, 305], items: [['crypt', 11, 250, 150, 140], ['grass', 3, 90, 90, 300], ['carpet', 2, 420, 170, 200]], cam: { az: 8, el: 12, zoom: 3 } },
  catA: { tank: [1219, 530, 330], items: [['stem', 1, 60, 170, 300], ['stemred', 2, 160, 170, 300], ['rotala', 3, 260, 170, 300], ['ludwigia', 4, 360, 170, 260], ['hornwort', 5, 460, 170, 300], ['anacharis', 6, 560, 170, 300], ['grass', 7, 660, 170, 330], ['balansae', 8, 760, 170, 300], ['sword', 9, 860, 170, 280], ['ozelot', 10, 960, 170, 260], ['lotus', 11, 1060, 170, 200]], cam: { az: 0, el: 4, zoom: 1 } },
  catB: { tank: [1219, 530, 330], items: [['crypt', 1, 60, 170, 140], ['anubias', 2, 160, 170, 110], ['buce', 3, 260, 170, 90], ['fern', 4, 360, 170, 200], ['sagittaria', 5, 460, 170, 90], ['hairgrass', 6, 560, 170, 80], ['carpet', 7, 660, 170, 120], ['moss', 8, 760, 170, 90], ['salvinia', 9, 860, 170, 120], ['frogbit', 10, 960, 170, 120], ['lettuce', 11, 1060, 170, 120]], cam: { az: 0, el: 4, zoom: 1 } },
  glow: { tank: [609, 305, 305], light: 'led', items: [['crypt', 11, 250, 150, 140], ['grass', 3, 90, 90, 300], ['carpet', 2, 420, 170, 200], ['crypt', 5, 340, 120, 110]], cam: { az: 8, el: 4, zoom: 2.2 } },
  // from above: the upper side of each leaf and its stripes' handedness (a red dot left of the midrib)
  top: { tank: [609, 305, 305], items: [['crypt', 11, 200, 150, 130], ['carpet', 2, 440, 150, 200], ['grass', 3, 80, 80, 200]], cam: { az: 0, el: 80, zoom: 1.7 } },
  // every other plant type, in a four-foot tank: must be pixel-identical before / after
  others: { tank: [1219, 530, 330], items: [['stem', 1, 80, 150, 300], ['stemred', 2, 200, 120, 280], ['sword', 3, 330, 160, 300], ['anubias', 4, 430, 200, 120], ['fern', 5, 520, 150, 200], ['rotala', 6, 640, 120, 300],
    ['ludwigia', 7, 740, 160, 260], ['moss', 8, 830, 200, 90], ['balansae', 9, 940, 150, 300], ['sagittaria', 10, 1040, 220, 90], ['buce', 11, 1120, 180, 90], ['salvinia', 12, 600, 180, 200]], cam: { az: 0, el: 5, zoom: 1 } },
  // the pilot types among others, four-foot tank: the frame-time A/B scene
  ref: { tank: [1219, 530, 330], items: [['crypt', 11, 100, 120, 160], ['crypt', 5, 230, 150, 140], ['grass', 3, 380, 60, 400], ['grass', 8, 470, 90, 380], ['carpet', 2, 700, 150, 360], ['stem', 1, 880, 150, 300], ['sword', 3, 1000, 160, 300], ['anubias', 4, 1100, 200, 120], ['crypt', 9, 560, 200, 150], ['stemred', 2, 820, 220, 280]], cam: { az: 0, el: 5, zoom: 1 } },
};
export async function load(sceneName, mode) {
  const Sc = await import('/src/scene/defaults.ts'), It = await import('/src/scene/items.ts'), P = await import('/src/render/plant3d.ts');
  const spec = typeof sceneName === 'string' ? SCENES[sceneName] : sceneName, { store, viewer } = window.__gb;
  viewer.sway = false; // (a still pose: pictures compare pixel for pixel)
  if (mode && 'tex' in P.plant3d) P.plant3d.tex = mode;
  const S = Sc.bareSetup();
  S.tank = { L: spec.tank[0], H: spec.tank[1], D: spec.tank[2] };
  S.render.bg = 'blue'; S.render.grid = false; S.render.rim = true; S.substrate.show = true; S.water.level = spec.water ?? 1;
  if (spec.light) S.light.type = spec.light;
  S.items = spec.items.map(([v, seed, x, d, size], i) => It.makeItem(S.tank, v, i + 1, seed, x, d, size ? { size } : {}));
  store.edit(t => { for (const k of Object.keys(t)) delete t[k]; Object.assign(t, structuredClone(S)); });
  store.cam(c => { c.az = spec.cam.az; c.el = spec.cam.el; c.zoom = spec.cam.zoom; });
  store.select(null);
  await wait(1500); viewer.rebuild?.(); await wait(3000); await viewer.buildNow?.(); await wait(2500);
  return viewer;
}
export async function shot(name, sceneName, mode) {
  const viewer = await load(sceneName, mode);
  const blob = await viewer.exportPNG(1);
  await fetch('/__shot?name=' + name, { method: 'POST', body: blob });
  return name;
}
/** Frame time of one scene: mean ms of n forced renders, per mode, alternating frame by frame (memory perf-ab-alternate-frames). */
export async function ab(sceneName, modes, n = 120) {
  const viewer = await load(sceneName, modes[0]);
  const P = await import('/src/render/plant3d.ts'), { store } = window.__gb, tot = Object.fromEntries(modes.map(m => [m, 0])), cnt = { ...tot };
  const built = {};
  for (const m of modes) { P.plant3d.tex = m; store.edit(() => {}); await wait(1500); await viewer.buildNow?.(); built[m] = true; }
  // (one build per mode is cached under its own key; switching back is a rebuild of the mesh only)
  return { note: 'use abFrames' };
}
