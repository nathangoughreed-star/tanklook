// Lane SM1 (2026-11-14): proof shots of the blended substrate. Dev server running (npm run dev --port 5173), then
//   node scripts/sm1-shots.mjs <prefix>   -> shots/<prefix>_*.png (copied to research/screens/SM1 by hand)
import { spawn } from 'node:child_process';
const PREFIX = process.argv[2] ?? 'after', BASE = process.env.URL ?? 'http://localhost:5173/', PORT = 9481;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1500,900', '--user-data-dir=' + (process.env.TEMP + '/sm1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
await send('Page.navigate', { url: BASE }); await sleep(4000);
for (let i = 0; i < 60 && !(await ev('typeof window.__gb')).includes('object'); i++) await sleep(1000);
await ev(`(async () => { const g = await import('/scripts/ground-shots.js'); window.__g = g; await g.ex('terrarium'); return 1 })()`);
await ev(`window.__gb.store.cam(c => { window.__c0 = { dist: c.dist, zoom: c.zoom }; })`);
const SG = (mix, share = 30) => ({ grain: 'sand', color: '#cbb894', grain2: 'gravel', color2: '#4a4034', share, mix }), GP = { grain: 'gravel', color: '#7c705f', grain2: 'pebble', color2: '#b9a98e', share: 40, mix: 0.5 };
const ANG = { az: 9, el: 21 }, HIGH = { az: 0, el: 46 }, FLOOR = [0.1, 0.4, 0.9, 0.64], FLOORH = [0.06, 0.38, 0.94, 0.8];
const cases = JSON.parse(process.env.CASES ?? 'null') ?? [
  ...[0, 0.5, 1].flatMap(mix => { const m = String(mix).replace('.', ''); return [
    [`sand-gravel-mix${m}-angle`, SG(mix), ANG, null],
    [`sand-gravel-mix${m}-floor`, SG(mix), ANG, FLOOR],
    [`sand-gravel-mix${m}-above`, SG(mix), HIGH, FLOORH],
  ]; }),
  ['sand-gravel-mix05-transition-zoom', SG(0.5), ANG, [0.28, 0.5, 0.6, 0.63]],
  ['gravel-pebble-mix05-angle', GP, ANG, null],
  ['gravel-pebble-mix05-floor', GP, ANG, FLOOR],
];
for (const [name, o, view, crop] of cases) {
  const r = await ev(`(async () => { const {store} = window.__gb, g = window.__g;
    store.edit(t => { t.tank = {L:609.6,D:304.8,H:406.4}; t.items = []; t.fish = []; t.layout = {id:'none',seed:1}; t.terrain.on = false; t.water.on = true; Object.assign(t.substrate, {show:true,type:'custom',fl:50,fr:50,bl:50,br:50}); delete t.substrate.litter; Object.assign(t.substrate.custom, ${JSON.stringify(o)}); });
    await new Promise(r => setTimeout(r, 600)); return await g.snap(${JSON.stringify(PREFIX + '_' + name)}, { dist: window.__c0.dist, zoom: window.__c0.zoom, ...${JSON.stringify(view)}, crop: ${JSON.stringify(crop)}, mult: 3, w: 1600 }) })()`);
  console.log(name, JSON.stringify(r));
}
if (process.env.PERF) console.log('PERF (blend ground meshes on vs off, alternating per frame, median ms)', JSON.stringify(await ev(`window.__g.perf(60, o => o.isMesh && o.material?.userData?.blend)`)));
ch.kill(); process.exit(0);
