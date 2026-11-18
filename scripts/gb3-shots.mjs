// Lane GB2/GB3 (2026-11-18): Sand 57 / Gravel 43 at Mixed 100 / 50 / 0, fx mix on and off.
//   dev server running; node scripts/gb1-shots.mjs <prefix>        (URL=http://localhost:5701/ OLD=1 for a build from before GB1,
//   whose blend holds the six old fields: one- and two-grain cases only)  -> shots/<prefix>_*.png at 1280 x 800
import { spawn } from 'node:child_process';
const PREFIX = process.argv[2] ?? 'gb3', BASE = process.env.URL ?? 'http://localhost:5173/', PORT = 9491 + Math.floor(Math.random() * 50), OLD = !!process.env.OLD;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,800', '--user-data-dir=' + (process.env.TEMP + '/gb2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' });
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
const ANG = { az: 9, el: 38 };
const SAND = '#cbb894', DARK = '#4a4034', PEB = '#8d8173';
const cases = [['3g_mix100', [G('sand', SAND, 38), G('gravel', DARK, 29), G('pebble', PEB, 33)], 1], ['3g_mix62', [G('sand', SAND, 38), G('gravel', DARK, 29), G('pebble', PEB, 33)], 0.62], ['3g_mix0', [G('sand', SAND, 38), G('gravel', DARK, 29), G('pebble', PEB, 33)], 0], ['2g_mix100', [G('sand', SAND, 57), G('gravel', DARK, 43)], 1]];
for (const [name, gs, mix] of cases) { const mixfx = false;
  const blend = { grains: gs, mix };
  const r = await ev(`(async () => { const {store} = window.__gb, g = window.__g; window.__fx.set({ mix: ${mixfx} });
    store.edit(t => { t.tank = {L:609.6,D:304.8,H:406.4}; t.items = []; t.fish = []; t.layout = {id:'none',seed:1}; t.terrain.on = false; t.water.on = true; Object.assign(t.substrate, {show:true,type:'custom',fl:50,fr:50,bl:50,br:50}); delete t.substrate.litter; t.substrate.custom = ${JSON.stringify(blend)}; });
    await new Promise(r => setTimeout(r, 900)); return await g.snap(${JSON.stringify(PREFIX + '_' + name)}, { dist: window.__c0.dist, zoom: window.__c0.zoom, ...${JSON.stringify(ANG)}, crop: [0, 0, 1, 1], mult: 1, w: 1280 }) })()`);
  console.log(name, JSON.stringify(r));
}
ch.kill(); process.exit(0);
