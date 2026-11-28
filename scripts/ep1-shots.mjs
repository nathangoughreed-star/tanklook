// Lane EP1 (R197 / R198, 2026-11-27): proof shots of tied epiphytes. Against a running dev server:
//   URL=http://localhost:5183/ TAG=after node scripts/ep1-shots.mjs [--drag]
// Front shot of each scene (photo-60t + research/screens/EP1/scenes/*.json) -> research/screens/EP1/<scene>-<TAG>.jpg.
// --drag: on photo-60t, selects fern #10 and drags it with real pointer events onto the lace rock (#5), past open water,
// a shot per step -> research/screens/EP1/drag-<n>.jpg; facts (tie data per step) -> drag-facts.json.
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', BASE = process.env.URL ?? 'http://localhost:5183/', TAG = process.env.TAG ?? 'after', PORT = 9400 + Math.floor(Math.random() * 80), OUT = 'research/screens/EP1';
const DRAG = process.argv.includes('--drag');
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,800', '--user-data-dir=' + (process.env.TEMP + '/ep1-chrome-' + Date.now()), '--no-first-run', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + (r.result.exceptionDetails.exception?.description ?? JSON.stringify(r.result.exceptionDetails)).slice(0, 400)); return r.result.result.value; };
/** A shot of the page, or (`close`) of the tank view's middle band alone, at the page's 3x pixels (the view pane is small beside the menus). */
const shot = async (name, wait = 2500, close = false) => { await sleep(wait); const clip = close ? await ev(`(() => { const r = __gb.viewer.host.getBoundingClientRect(); return { x: r.x, y: r.y + r.height * 0.3, width: r.width, height: r.height * 0.45, scale: 1 }; })()`) : undefined; const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88, clip: clip ?? { x: 0, y: 0, width: 1280, height: 800, scale: 1 / 3 } }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const mouse = (type, x, y, buttons = 0) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 3, mobile: false });
const errors = [];
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push((d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text).slice(0, 300)); });
const open = async scene => {
  await send('Page.navigate', { url: BASE });
  for (let i = 0; i < 120; i++) { if (await ev('!!window.__gb').catch(() => false)) break; await sleep(1000); } // a cold dev server: the app saves its own scene on unload
  await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(scene)}); true`);
  await send('Page.navigate', { url: BASE });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb?.viewer?.vps?.[0]?.itemMeshes?.length`).catch(() => false)) break; await sleep(1000); }
  await sleep(5000);
};
/** Screen point of a 3D world point in view 0. */
const toScreen = (expr) => ev(`(() => { const v = __gb.viewer, vp = v.vps[0], r = v.host.getBoundingClientRect(), p = (${expr}).clone().project(vp.cam); return [r.left + vp.x + (p.x + 1) / 2 * vp.w, r.top + vp.y + (1 - p.y) / 2 * vp.h]; })()`);
const tie = n => ev(`(() => { const it = __gb.store.tank.items.find(i => i.id === ${n}); return it && { x: it.x, depth: it.depth, lift: it.lift, host: it.host ?? null, hostAt: it.hostAt ?? null, pitch: it.pitch, tilt: it.tilt }; })()`);
// SCENES=<dir>: only the scene files in that folder (shot under their own names, TAG ignored)
const SC = process.env.SCENES, scenes = SC ? readdirSync(SC).filter(f => f.endsWith('.json')).map(f => [f.replace('.json', ''), `${SC}/${f}`]) : [['photo-60t', 'research/visual/vf0/scenes/photo-60t.json'], ...readdirSync(`${OUT}/scenes`).map(f => [f.replace('.json', ''), `${OUT}/scenes/${f}`])];
const facts = { tag: TAG, base: BASE, scenes: {} };
for (const [name, file] of DRAG ? scenes.slice(0, 1) : scenes) {
  await open(readFileSync(file, 'utf8'));
  facts.scenes[name] = await ev(`__gb.store.tank.items.filter(i => i.kind === 'plant' && ['fern','anubias','buce','moss'].includes(i.variant) && (i.lift > 2 || i.host)).map(i => ({ id: i.id, v: i.variant, lift: i.lift, host: i.host ?? null }))`);
  if (!DRAG) {
    await shot(SC ? `recipes/${name}` : `${name}-${TAG}`);
    if (SC) continue;
    // the proof view: only the tied plants (no fish, no stem / sword plants hiding the wood), closer, the tank view alone
    await ev(`(() => { __gb.store.edit(t => { t.fish = []; t.items = t.items.filter(i => i.kind !== 'plant' || ['fern','anubias','buce','moss'].includes(i.variant)); }); return true; })()`);
    await shot(`${name}-${TAG}-close`, 4000, true);
    continue;
  }
  // the swords and stem plants stand in front of the fern: out of the way (and the fish), so the pointer reaches it
  await ev(`(() => { __gb.store.edit(t => { t.fish = []; t.items = t.items.filter(i => i.kind !== 'plant' || ['fern','anubias','buce','moss'].includes(i.variant)); }); return true; })()`); await sleep(2500);
  // the drag: open Plants (pieces can be picked only while their menu is open), click the fern to select it, then drag it
  await ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Plants'); b?.click(); return !!b })()`); await sleep(2500);
  const fernAt = `(() => { const m = __gb.viewer.vps[0].itemMeshes.find(m => m.userData.item === 10 && m.userData.plant); return m.position.clone().setY(m.position.y + 45); })()`;
  const rockAt = `(() => { const m = __gb.viewer.vps[0].itemMeshes.find(m => m.userData.item === 5); m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); return new m.position.constructor((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * 0.6, (b.min.z + b.max.z) / 2); })()`;
  for (let i = 0; i < 30; i++) { if (await ev(`[10, 5].every(n => __gb.viewer.vps[0].itemMeshes?.some(m => m.userData.item === n))`).catch(() => false)) break; await sleep(1000); }
  const retry = async fn => { for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i > 25) { console.log('DUMP', await ev(`JSON.stringify(__gb.viewer.vps.map(p => (p.itemMeshes ?? []).map(m => [m.userData.item, !!m.userData.plant, m.type])))`)); throw e; } await sleep(1000); } } }; // the meshes are swapped while the view rebuilds
  const [fx, fy] = await retry(() => toScreen(fernAt)), [rx, ry] = await retry(() => toScreen(rockAt));
  await shot('drag-0-start', 500, true);
  await mouse('mousePressed', fx, fy, 1); await mouse('mouseReleased', fx, fy); await sleep(1500); // select
  facts.drag = [{ step: 'start', sel: await ev('__gb.store.selItem ?? null'), ...(await tie(10)) }];
  await sleep(800); await mouse('mousePressed', fx + 7, fy - 5, 1); // (a second press on the very spot picks what is behind: GD1 cycle)
  facts.drag.push({ step: 'pressed', sel: await ev('__gb.store.selItem ?? null'), under: await ev(`(() => { const h = __gb.viewer.hitTest(${fx + 7}, ${fy - 5}); return h ? { item: h.itemId ?? null, fish: h.fishId ?? null, mesh: !!h.mesh, dot: h.dot ?? null, pool: !!h.pool, editing: __gb.store.isEditing(0), pair: __gb.viewer.pairShown } : null; })()`), cam: await ev('JSON.stringify(__gb.store.camOf(0))'), el: await ev(`(() => { const e = document.elementFromPoint(${fx + 7}, ${fy - 5}); return e ? e.tagName + '.' + e.className : null; })()`) });
  const steps = 6;
  for (let k = 1; k <= steps; k++) {
    const t = k / steps, x = fx + (rx - fx) * t, y = fy + (ry - fy) * t;
    await mouse('mouseMoved', x, y, 1); await sleep(400);
    if (k % 2 === 0) { await shot(`drag-${k / 2}-step`, 800, true); facts.drag.push({ step: k, at: [x, y], cam: await ev('JSON.stringify(__gb.store.camOf(0))'), ...(await tie(10)) }); }
  }
  // past the rock up into open water: the plant keeps its last spot on the rock
  await mouse('mouseMoved', rx, ry - 260, 1); await sleep(600);
  await shot('drag-4-over-open-water', 800, true); facts.drag.push({ step: 'open water', ...(await tie(10)) });
  await mouse('mouseMoved', rx, ry, 1); await sleep(400);
  await mouse('mouseReleased', rx, ry); await sleep(1500);
  await shot('drag-5-released-on-rock', 1000, true); facts.drag.push({ step: 'released', ...(await tie(10)) });
}
facts.errors = errors;
writeFileSync(`${OUT}/${DRAG ? 'drag' : TAG}-facts.json`, JSON.stringify(facts, null, 1));
console.log(JSON.stringify(facts).slice(0, 1500));
ws.close(); ch.kill();
process.exit(0);
