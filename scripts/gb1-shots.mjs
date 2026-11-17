// Lane GB1 (2026-11-17): proof shots of the n-grain custom blend, and the before / after check for two grains.
//   dev server running; node scripts/gb1-shots.mjs <prefix>        (URL=http://localhost:5701/ OLD=1 for a build from before GB1,
//   whose blend holds the six old fields: one- and two-grain cases only)  -> shots/<prefix>_*.png at 1280 x 800
import { spawn } from 'node:child_process';
const PREFIX = process.argv[2] ?? 'gb1', BASE = process.env.URL ?? 'http://localhost:5173/', PORT = 9491 + Math.floor(Math.random() * 50), OLD = !!process.env.OLD;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,800', '--user-data-dir=' + (process.env.TEMP + '/gb1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' -> ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.value; };
await send('Page.navigate', { url: BASE }); await sleep(4000);
for (let i = 0; i < 90; i++) { let t; try { t = await ev('typeof window.__gb'); } catch {} if (String(t).includes('object')) break; await sleep(1000); }
await ev(`(async () => { const g = await import('/scripts/ground-shots.js'); window.__g = g; await g.ex('terrarium'); return 1 })()`);
await ev(`window.__gb.store.cam(c => { window.__c0 = { dist: c.dist, zoom: c.zoom }; })`);
const G = (grain, color, share) => ({ grain, color, share });
const SAND = '#cbb894', DARK = '#4a4034', PEB = '#8d8173', BUFF = '#b5a58c', MUD = '#2f2620';
const ANG = { az: 9, el: 21 };
const cases = [
  ['1-sand', [G('sand', SAND, 100)], 0.5],
  ['1-gravel', [G('gravel', '#7c705f', 100)], 0.5],
  ['2-sand-gravel', [G('sand', SAND, 70), G('gravel', DARK, 30)], 0.5],
  ['2-gravel-pebble', [G('gravel', '#7c705f', 60), G('pebble', '#b9a98e', 40)], 0.5],
  ['2-sand-sand', [G('sand', SAND, 60), G('sand', DARK, 40)], 0.7],
  ['2-mud-sand-patchy', [G('mud', MUD, 50), G('sand', SAND, 50)], 0.1],
  ['3-sand-gravel-pebble', [G('sand', SAND, 50), G('gravel', DARK, 30), G('pebble', PEB, 20)], 0.5],
  ['4-mixed', [G('sand', SAND, 40), G('gravel', DARK, 25), G('pebble', PEB, 20), G('mud', MUD, 15)], 0.4],
  ['5-mixed', [G('sand', SAND, 35), G('gravel', DARK, 20), G('pebble', PEB, 15), G('mud', MUD, 15), G('gravel', BUFF, 15)], 0.5],
].filter(([, gs]) => !OLD || gs.length <= 2);
const want = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const [name, gs, mix] of cases) {
  if (want && !want.includes(name)) continue;
  // old builds: { grain, color, grain2, color2, share (the second's), mix }
  const blend = OLD ? { grain: gs[0].grain, color: gs[0].color, grain2: gs[1]?.grain ?? 'none', color2: gs[1]?.color ?? '#6f6556', share: gs[1]?.share ?? 30, mix } : { grains: gs, mix };
  const r = await ev(`(async () => { const {store} = window.__gb, g = window.__g;
    store.edit(t => { t.tank = {L:609.6,D:304.8,H:406.4}; t.items = []; t.fish = []; t.layout = {id:'none',seed:1}; t.terrain.on = false; t.water.on = true; Object.assign(t.substrate, {show:true,type:'custom',fl:50,fr:50,bl:50,br:50}); delete t.substrate.litter; t.substrate.custom = ${JSON.stringify(blend)}; });
    await new Promise(r => setTimeout(r, 700)); return await g.snap(${JSON.stringify(PREFIX + '_' + name)}, { dist: window.__c0.dist, zoom: window.__c0.zoom, ...${JSON.stringify(ANG)}, crop: [0, 0, 1, 1], mult: 1, w: 1280 }) })()`);
  console.log(name, JSON.stringify(r));
}
if (process.env.PERF) console.log('PERF', JSON.stringify(await ev(`window.__g.perf(60, o => o.isMesh && o.material?.userData?.blend)`)));
ch.kill(); process.exit(0);
