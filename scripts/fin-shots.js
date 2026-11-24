// Fin transparency test pictures (method row 61), for a REAL browser (the Browser pane or Chrome, not the headless SwiftShader
// autoshot: alpha-to-coverage and MSAA differ there). In the page (?photoart, tank panel closed):
//   const m = await import('/scripts/fin-shots.js'); await m.finShots(['convictb', 'bettab'], { tag: 'after' });
// Saves shots/fin-<id>-<bg>-<view>[-<tag>].png via the dev server's /__shot, one per background x view, plus fin-overlap-<bg>[-<tag>].png
// (three fish in a row, each half behind the next, three-quarter view) when `overlap` lists fish.
const wait = ms => new Promise(r => setTimeout(r, ms));
export const BGS = { dark: 'black', light: 'white', plants: 'plantscene' };
export const VIEWS = {
  side: { yaw: 0, el: 0, z: 1 },
  q34: { yaw: 40, el: 15, z: 0.8 },
  edge: { yaw: 78, el: 8, z: 0.8 },        // fins near edge-on
  below: { yaw: 25, el: -35, z: 0.8 },     // paired fins over the body and each other, seen from below
};
const TL = { convictb: 100, cherrybarbb: 50, bettab: 65, neonb: 38, gbrb: 50, royalgrammab: 80, oscarb: 300, betta: 65, neontetra: 38 };

async function grab(name) {
  const v = globalThis.__gb.viewer, c = v.renderer.domElement;
  for (let i = 0; i < 4; i++) { v.dirty = true; v.draw(); await wait(250); }
  v.dirty = true; v.draw(); const url = c.toDataURL('image/png');
  const r = await fetch('/__shot?name=' + encodeURIComponent(name), { method: 'POST', body: await (await fetch(url)).blob() });
  if (!r.ok) throw new Error('shot ' + name + ': ' + r.status);
  return name;
}
const place = (species, tl, o, bg, extra = []) => globalThis.__gb.store.update(s => {
  const t = s.tanks[s.active]; t.tank = { L: 72 * 25.4, H: 24 * 25.4, D: 24 * 25.4 }; t.render = { ...t.render, bg, pop: 0.15 };
  t.fish = [{ id: 901, species, x: 0.5 * t.tank.L, y: 0.5 * t.tank.H, depth: 0.5 * t.tank.D, yaw: o.yaw, pitch: 0, roll: 0, bend: 0 }, ...extra.map((e, i) => ({ id: 902 + i, species, y: 0.5 * t.tank.H, pitch: 0, roll: 0, bend: 0, ...e, x: 0.5 * t.tank.L + e.x * tl, depth: 0.5 * t.tank.D + e.depth * tl }))];
  t.camera = { ...t.camera, az: 0, el: o.el, zoom: 28 * 50 / tl * o.z };
});

export async function finShots(ids, { tag = '', bgs = ['dark', 'light'], views = Object.keys(VIEWS), overlap = ids, settle = 1500, tl = {} } = {}) {
  Object.assign(TL, tl);   // total lengths in mm for fish not in the table (framing)
  const v = globalThis.__gb.viewer, out = [], mv = v.host.parentElement, css = mv.style.cssText;
  mv.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:720px;z-index:9999';   // the panel takes most of a narrow window: shoot at a fixed size
  try { return await shots(v, out, ids, tag, bgs, views, overlap, settle); } finally { mv.style.cssText = css; }
}
async function shots(v, out, ids, tag, bgs, views, overlap, settle) {
  v.swim = false; v.sway = false; v.drifters.length = 0;
  let first = true;
  for (const id of ids) for (const b of bgs) for (const vn of views) {
    place(id, TL[id] ?? 60, VIEWS[vn], BGS[b]); await wait(first ? settle + 2500 : settle); first = false;
    out.push(await grab(`fin-${id}-${b}-${vn}${tag ? '-' + tag : ''}`));
  }
  // fish overlapping in depth: the same species three times, each 0.45 TL nearer and 0.35 TL along, three-quarter view
  for (const id of overlap) for (const b of bgs) {
    const tl = TL[id] ?? 60;
    place(id, tl, { yaw: 30, el: 10, z: 0.55 }, BGS[b], [{ x: 0.35, depth: -0.45, yaw: 20 }, { x: 0.7, depth: -0.9, yaw: 40 }]); await wait(settle);
    out.push(await grab(`fin-${id}-${b}-overlap${tag ? '-' + tag : ''}`));
  }
  return out;
}
