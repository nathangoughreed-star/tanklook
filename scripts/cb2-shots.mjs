// CB2: a cabinet's canister hoses enter through a back-panel cut-out. Run: URL=http://localhost:5199/ node scripts/cb2-shots.mjs  Shots: research/screens/CB2/
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5199/', PORT = 9392;
mkdirSync('research/screens/CB2', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/cb2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/CB2/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
const setup = (style, az, el, dist) => ev(`(async () => { const { store } = window.__gb;
  store.edit(S => { S.stand.show = true; S.stand.style = '${style}'; S.wall.show = false; S.water.on = true; S.tech = { ...(S.tech ?? {}), rows: { ...(S.tech?.rows ?? {}), filter: 'canister' } }; });
  store.cam(c => { c.az = ${az}; c.el = ${el}; ${dist ? `c.dist = ${dist};` : ''} c.zoom = 1 });
  await new Promise(r => setTimeout(r, 2500)); return true })()`);
await setup('cabinet', 180, 5); await shot('behind-cabinet-after');
await setup('cabinet', 180, 5, 1500); await shot('behind-cabinet-after-wide');
await setup('cabinet', 20, 12); await shot('front-34-cabinet');
await setup('frame', 180, 5, 1500); await shot('behind-open-stand');
ch.kill(); process.exit(0);
