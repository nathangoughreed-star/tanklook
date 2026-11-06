// Lane FL2 browser check (dev server, URL env): the default gear on a 2, 10 and 40 gal tank (and a 1 gal cube), one picture each, via the viewer's own PNG export.
// Headless Chrome over raw CDP, one page at a time. Pictures land in shots/fl2/<tag>-<size>.png (TAG env: before / after).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5811/', PORT = +(process.env.CDP ?? 9355), TAG = process.env.TAG ?? 'after';
mkdirSync('shots/fl2', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1200,800', '--user-data-dir=' + (process.env.TEMP + '/fl2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
// interior mm of the sizes shown (L x D x H): a 1 gal cube, the 2.5 gal, the 10 gal, the 40 gal breeder
const SIZES = { '1gal': [152, 152, 157], '2gal': [303, 151, 206], '10gal': [504, 257, 315], '40gal': [902, 445, 400] };
try {
  await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb?.store && !!window.__gb?.viewer`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
  for (const [name, [L, D, H]] of Object.entries(SIZES)) {
    await ev(`(() => { const { store } = window.__gb; store.edit(t => { t.tank = { ...t.tank, L: ${L}, D: ${D}, H: ${H} }; t.tech = undefined; t.items = []; t.fish = []; }); store.cam(c => { c.dist = ${Math.round(Math.max(L, H) * 3.2 + 700)}; c.az = -32; c.el = 10; c.zoom = 1; }); store.select(null); return 1; })()`);
    await sleep(1200);
    const info = await ev(`(async () => { const { store, viewer } = window.__gb; const b = await viewer.exportPNG(1); const u = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); return JSON.stringify({ png: u.split(',')[1], tech: store.tank.tech ?? null }); })()`);
    writeFileSync(`shots/fl2/${TAG}-${name}.png`, Buffer.from(JSON.parse(info).png, 'base64')); console.log('shot', TAG, name);
  }
} finally { ws.close(); ch.kill(); }
