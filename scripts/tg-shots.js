// Dev server only (lane TG): review pictures of the tech gear. In the browser console:
// `const g = await import('/scripts/tg-shots.js'); await g.tank('tg_planted', 'planted', [{ id: 'canister-m' }, { id: 'heater-100' }])`
// -> shots/tg_planted.png. `g.model('hob-l')` = one piece in an empty tank, front and 3/4, cropped to its corner.
import { ex, snap } from '/scripts/ground-shots.js';
const wait = ms => new Promise(r => setTimeout(r, ms));

/** An example tank with the stub `tech.gear` picks (null = no stub: the inferred gear), saved from the front (or az/el). */
export async function tank(name, example, picks, { az = 0, el = 6, zoom = 1, crop = null, w = 1200, edit = null } = {}) {
  await ex(example);
  const T = await import('/src/scene/tech.ts');
  // picks: a Tech preset id (lane TM), a TechSetup, or null (no tech: the inferred gear)
  window.__gb.store.edit(s => { if (typeof picks === 'string') s.tech = T.applyPreset(s, picks); else if (picks) s.tech = picks; else delete s.tech; edit?.(s); });
  await wait(400);
  return snap(name, { az, el, zoom, crop, w });
}

/** The gear's box on the picture (fractions), square-ish, with a margin: from its meshes' vertices projected by the view's camera. */
export async function gearCrop(margin = 0.18, yMin = -100, row = null) {
  const { viewer } = window.__gb; await viewer.buildNow?.(); await viewer.exportPNG(1);
  const vp = viewer.vps[0], cam = vp.cam, W = viewer.renderer.domElement.width, H = viewer.renderer.domElement.height;
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0; const v = cam.position.clone();
  const pieces = row ? vp.scene.children.flatMap(o => o.userData.gearPieces ?? []).filter(p => p.row === row) : [];
  for (const pc of pieces) for (let i = 0; i < 8; i++) { v.set(i & 1 ? pc.box.max.x : pc.box.min.x, i & 2 ? pc.box.max.y : pc.box.min.y, i & 4 ? pc.box.max.z : pc.box.min.z).project(cam); const x = (v.x + 1) / 2, y = (1 - v.y) / 2; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (const m of row ? [] : vp.scene.children.filter(o => o.userData.gear)) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 5) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (v.y < yMin) continue; v.project(cam);
      const x = (v.x + 1) / 2, y = (1 - v.y) / 2; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  // the content box of the export is the canvas's tank region; approximate with the whole canvas (exportPNG crops to it)
  const c = viewer.content[0], cw = viewer.renderer.domElement.clientWidth, ch = viewer.renderer.domElement.clientHeight, mm = 0.06 * Math.max(c.x1 - c.x0, c.y1 - c.y0);
  const ox = Math.max(0, Math.floor(c.x0 - mm)), oy = Math.max(0, Math.floor(c.y0 - mm)), ow = Math.min(cw, Math.ceil(c.x1 + mm)) - ox, oh = Math.min(ch, Math.ceil(c.y1 + mm)) - oy; // viewer exportCrop
  const fx = t => (t * cw - ox) / ow, fy = t => (t * ch - oy) / oh;
  x0 = fx(x0); x1 = fx(x1); y0 = fy(y0); y1 = fy(y1);
  // a 4:5 window (pixels) round the gear plus a margin, kept inside the picture
  let w = (x1 - x0) * ow * (1 + 2 * margin) + 60, h = (y1 - y0) * oh * (1 + 2 * margin) + 60;
  if (w < 0.8 * h) w = 0.8 * h; else h = w / 0.8;
  w = Math.min(w, ow); h = Math.min(h, oh);
  const cx = Math.min(Math.max((x0 + x1) / 2 * ow, w / 2), ow - w / 2), cy = Math.min(Math.max((y0 + y1) / 2 * oh, h / 2), oh - h / 2);
  return [(cx - w / 2) / ow, (cy - h / 2) / oh, (cx + w / 2) / ow, (cy + h / 2) / oh];
}

/** One piece (plus `also`) in the planted example emptied of plants, rock and animals: front and 3/4 shots cropped to the gear's corner. */
export async function model(id, { also = [], side = 'left', name = 'tg_m_' + id, tankSize = null, salt = false, stand = null, full = false, yMin = -20, back = false } = {}) {
  await ex('planted');
  window.__gb.store.edit(s => {
    if (salt) s.water.salt = true;
    s.items = []; s.fish = []; s.layout = { id: 'none', seed: 1 };
    if (tankSize) s.tank = { ...s.tank, ...tankSize };
    if (stand) s.stand.style = stand;
    s.tech = { gear: [{ id }, ...also.map(a => ({ id: a }))] };
  });
  await wait(400);
  for (const [v, az, el] of back ? [['front', -88, 6], ['34', -60, 14]] : [['front', 0, 4], ['34', side === 'left' ? 35 : -35, 10]]) {
    window.__gb.store.cam(c => { c.az = az; c.el = el; c.zoom = full ? 0.6 : 1; });
    await snap(name + '_' + v, { az, el, zoom: full ? 0.6 : 1, crop: full ? null : await gearCrop(0.18, yMin), w: 900, mult: 2 });
  }
  return 'ok';
}

const NANO = { L: 609.6, D: 304.8, H: 355.6 };
/** Every model's close-ups (pictures shots/tg_m_<name>_{front,34}.png); `python scripts/tg-sheet.py` lays them out. */
export const MODELS = [
  ['sponge-s', { tankSize: NANO }], ['internal-s', { tankSize: NANO }], ['hob-s', { tankSize: NANO }], ['hob-l', {}],
  ['canister-m', { stand: 'frame' }], ['canister-l', { stand: 'frame', tankSize: { L: 1219, D: 457, H: 533 } }],
  ['heater-50', { tankSize: NANO }], ['heater-300', { tankSize: { L: 1219, D: 457, H: 533 } }], ['airstone', {}],
  ['co2', { also: ['canister-m'], stand: 'frame', full: true }], ['uv', { also: ['canister-m'], stand: 'frame', name: 'tg_m_uv-inline' }], ['uv', { also: ['hob-s'], name: 'tg_m_uv-internal' }],
  ['powerhead', { salt: true, full: true }], ['wavemaker', { salt: true, full: true }], ['skimmer', { salt: true }], ['sump', { salt: true, stand: 'frame', full: true }], ['uv', { also: ['canister-m'], stand: 'frame', name: 'tg_m_uv-inline-back', full: true, back: true }], ['ato', { salt: true }],
];
export async function all(only = null) { for (const [id, o] of MODELS) if (!only || only.includes(o.name ?? id)) await model(id, o); return 'ok'; }

/** The four whole tanks (front and 3/4), and an old file (no tech) with its inferred gear and with none. */
export const TANKS = [
  ['walstad', 'planted', 'walstad'], ['midplanted', 'planted', 'midplanted'], ['hightech', 'planted', 'hightech'], ['sps', 'reef', 'sps'],
  ['lowtech', 'planted', 'lowtech'], ['old-inferred', 'planted', null],
];
export async function tanks(only = null) {
  for (const [n, e, p] of TANKS) if (!only || only.includes(n)) {
    await tank(`tg_t_${n}_front`, e, p, { az: 0, el: 6 });
    await snap(`tg_t_${n}_34`, { az: 32, el: 16, zoom: 1, w: 1200 });
  }
  return 'ok';
}

/** A bundle deal opened as a new scene (as the start menu does), front and 3/4: shots/tg_k_<id>_{front,34}.png */
export async function bundle(id) {
  const { DEALS } = await import('/src/data/deals.ts'), { sceneFromDeal } = await import('/src/demand/dealscene.ts');
  const d = DEALS.find(x => x.id === id), sc = sceneFromDeal(d);
  window.__gb.store.replace(sc); await wait(600);
  await snap(`tg_k_${id}_front`, { az: 0, el: 6, zoom: 1, w: 900 });
  await snap(`tg_k_${id}_34`, { az: 32, el: 18, zoom: 1, w: 900 });
  return JSON.stringify(sc.tanks[0].tech);
}

/** The same 10 gal tank with each heater (null = the generic one): shots/tg_h_<id>.png, cropped to the heater. */
export async function heaters(ids = [null, 'topfin-50', 'tetra-ht-50', 'hygger-50']) {
  const T = await import('/src/scene/tech.ts');
  for (const id of ids) {
    await ex('planted');
    window.__gb.store.edit(s => {
      s.tank = { L: 508, D: 254, H: 305 }; s.items = []; s.fish = [];
      const t = T.applyPreset(s, 'midplanted'); if (id) t.heaterProduct = id; s.tech = t;
    });
    await wait(400);
    window.__gb.store.cam(c => { c.az = 0; c.el = 4; c.zoom = 1; });
    await snap('tg_h_' + (id ?? 'generic'), { az: 0, el: 4, zoom: 1, crop: await gearCrop(0.6, -20, 'heater'), w: 600, mult: 2 });
  }
  return 'ok';
}

/** Every catalogue heater upright in a tall bare tank, cropped to it: shots/tg_hc_<id>.png (for the drawn-vs-photo sheet). */
export async function heaterSheet() {
  const T = await import('/src/scene/tech.ts'), C = await import('/src/data/gearCatalog.ts');
  for (const id of [null, ...C.HEATER_PRODUCTS.map(h => h.id)]) {
    await ex('planted');
    window.__gb.store.edit(s => { s.tank = { L: 400, D: 300, H: 500 }; s.items = []; s.fish = []; s.render.bg = 'custom'; s.render.bgColor = '#d8dde2'; const t = T.applyPreset(s, 'walstad'); t.rows.heater = 'one'; if (id) t.heaterProduct = id; else t.heaterW = 50; s.tech = t; });
    await wait(400);
    window.__gb.store.cam(c => { c.az = 20; c.el = 6; c.zoom = 1; });
    await snap('tg_hc_' + (id ?? 'generic'), { az: 20, el: 6, zoom: 1, crop: await gearCrop(0.15, -20, 'heater'), w: 300, mult: 2 });
  }
  return 'ok';
}
