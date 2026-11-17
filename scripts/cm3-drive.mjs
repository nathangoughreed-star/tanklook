// CM3: run a JS expression (file) in headless Chrome against the dev server; optional screenshot. Usage:
// URL=http://localhost:5177/ node scripts/cm3-drive.mjs <expr-file> [shot.png] [width] [height]
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5177/', PORT = 9460 + Math.floor(Math.random() * 30);
const [file, shotPath, W = '1280', H = '800'] = process.argv.slice(2);
const mobile = +W < 600;
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--user-data-dir=' + (process.env.TEMP + '/cm3-chrome-' + Date.now()), '--no-first-run', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.some(t => t.type === 'page')) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile });
await send('Page.navigate', { url: BASE + (process.env.QS ?? '?ui=2') });
await sleep(+(process.env.WAIT ?? 6000));
const r = await send('Runtime.evaluate', { expression: readFileSync(file, 'utf8'), awaitPromise: true, returnByValue: true });
console.log(r.result.exceptionDetails ? 'ERR ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails) : JSON.stringify(r.result.result.value));
if (shotPath) { await sleep(800); const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(shotPath, Buffer.from(s.result.data, 'base64')); }
ch.kill(); ws.close(); process.exit(0);
