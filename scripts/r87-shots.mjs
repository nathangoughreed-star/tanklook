// R87 browser check (dev server on 6190): the old UI's PAR guide, light-map hover and contour labels, and the new UI's Lighting group. Pictures land in shots/r87/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6190/', PORT = 9361;
const W = +(process.env.W ?? 1400), H = +(process.env.H ?? 900), TAG = process.env.TAG ?? '';
mkdirSync('shots/r87', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--user-data-dir=' + (process.env.TEMP + '/r87-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`shots/r87/${name}${TAG}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
const mouse = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
const load = () => ev(`(async () => {
  const R = await import('/src/scene/recipes.ts'), A = await import('/src/scene/archetypes.ts'), T = await import('/src/data/tanks.ts'), B = await import('/src/scene/brief.ts');
  const a = A.archetype('mixed-reef'), m = T.TANK_MODELS.find(x => x.name === '60 gal breeder' && !x.terrarium);
  const S = R.recipeScene(a, 'balanced', m); S.brief = B.setVision(B.emptyBrief(), { secondaryLikes: [], archetypeId: a.id });
  const { store } = window.__gb;
  store.edit(t => { Object.assign(t, structuredClone(S)); t.fish = []; t.render.beams = true; t.lid = 'open'; });
  const t = store.tank; return JSON.stringify({ salt: t.water.salt, light: t.light.type, bright: t.light.bright, lid: t.lid, beams: t.render.beams });
})()`);

const click = t => ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(t)})); if (!b) return 'no ' + ${JSON.stringify(t)}; b.click(); return 'ok'; })()`);
const fix = (fx, extra = '') => ev(`(async () => { const L = await import('/src/ui/logic/lightLayout.ts'); window.__gb.store.edit(s => { L.setFixture(s, '${fx}'); ${extra} s.render.beams = true; }); return JSON.stringify(window.__gb.store.tank.light); })()`);
try {
  await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 500 });
  await send('Page.navigate', { url: BASE + '?ui=2' });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  console.log(await load()); await sleep(3000);
  console.log(await fix('puck', 's.light.count = 3; s.light.rows = 2; s.light.spacing = 0; s.light.height = 150;'));
  await ev(`window.__gb.store.cam(c => { c.az = 0; c.el = 50; c.zoom = 0.9; })`);
  if (W < 500) { await click('More'); await sleep(500); }
  await click('Equipment'); await sleep(700);
  await click('Lighting'); await sleep(600);
  await ev(`(() => { const g = [...document.querySelectorAll('.group')].find(g => g.querySelector('.gh')?.textContent.startsWith('Lighting')); g.querySelector('.kh').click(); })()`); await sleep(700);
  await click('Light layout'); await sleep(700);
  await ev(`document.querySelector('.lightlayout')?.scrollIntoView({ block: 'start' })`); await sleep(1200);
  await shot('pucks-3x2');
  console.log(await ev(`[...document.querySelectorAll('.lightlayout .row .lbl')].map(e => e.textContent).join(' | ')`));
  // a bar on a bow-front tank: before / after Optimize
  console.log(await ev(`(async () => { const L = await import('/src/ui/logic/lightLayout.ts'); window.__gb.store.edit(s => { s.tank.shape = 'bow'; s.tank.bowMin = 200; L.setFixture(s, 'led'); s.light.pos = 60; s.render.beams = true; }); return window.__gb.store.tank.light.pos; })()`)); await sleep(1500);
  await ev(`document.querySelector('.lightlayout')?.scrollIntoView({ block: 'start' })`); await sleep(800);
  await shot('bar-before-optimize');
  console.log(await click('Optimize')); await sleep(1500);
  console.log('pos after', await ev(`window.__gb.store.tank.light.pos`));
  await ev(`document.querySelector('.lightlayout')?.scrollIntoView({ block: 'start' })`); await sleep(500);
  await shot('bar-after-optimize');
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
