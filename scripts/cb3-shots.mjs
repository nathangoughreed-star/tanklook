// CB3: a cabinet's canister hoses enter through a back-panel cut-out. Run: URL=http://localhost:5198/ node scripts/cb2-shots.mjs  Shots: research/screens/CB3/
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5196/', PORT = 9394;
mkdirSync('research/screens/CB3', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/cb2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/CB3/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
await send('Runtime.enable'); const errs = []; ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map(a => a.value ?? a.description).join(' ')); });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
const TAG = process.env.TAG ?? 'after';
const setup = (rows, az, el, dist, zoom, open) => ev(`(async () => { const { store } = window.__gb; const tv = (await import('/src/render/tankView.ts')).tankView, gv = (await import('/src/render/gear3d.ts')).gearView; tv.empty = false; tv.ghost = false; gv.on = true; tv.standOpen = ${open};
  store.edit(S => { S.stand.show = true; S.stand.style = 'cabinet'; S.stand.finish = 'black'; S.wall.show = false; S.water.on = true; S.backdrop = { kind: 'none', depth: 0, seed: 1 }; S.tech = { ...(S.tech ?? {}), filters: undefined, rows: { ...(S.tech?.rows ?? {}), heater: 'none', ...${JSON.stringify(rows)} } }; });
  store.cam(c => { c.az = ${az}; c.el = ${el}; c.dist = ${dist}; c.zoom = ${zoom} });
  await new Promise(r => setTimeout(r, 4000)); return true })()`);
const click = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); await sleep(400); };
const clear = async () => { await click(688, 84); await click(412, 75); await sleep(1500); };
const PUMP = { filter: 'canister', air: 'airstone', uv: 'none', co2: 'none' }, FULL = { filter: 'canister', air: 'airstone', uv: 'uv', co2: 'pressurized' };
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await setup(PUMP, -30, 12, 1500, 0.42, false); await clear(); await shot(`nathan-view-${TAG}`);
if (TAG === 'after') { await setup(FULL, 15, 6, 1500, 0.42, true); await shot('doors-open-all-gear'); await setup(FULL, 180, 6, 1500, 0.6, false); await shot('behind-lines-through-cutouts'); }
console.log('ERRORS', errs.slice(0, 4).join(' || ').slice(0, 1500)); ch.kill(); process.exit(0);
