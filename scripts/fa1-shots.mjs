// Lane FA1: zebra danio shoal in a planted tank, close + normal view, three light levels. TAG=before|after, URL env. Pictures: research/screens/FA1/<tag>-*.png
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5990/', PORT = 9361, TAG = process.env.TAG ?? 'before';
mkdirSync('research/screens/FA1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1500,900', '--user-data-dir=' + (process.env.TEMP + '/fa1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/FA1/${TAG}-${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
const setup = () => ev(`(async () => {
  const E = await import('/src/examples/scenes.ts'); const sc = JSON.parse(E.SCENES.planted); const { store } = window.__gb; if (store.split) store.closeTank(1);
  const V = await import('/src/scene/validate.ts'); const P = V.parseScene(sc).scene, t = P.tanks[P.active];
  const { SPECIES } = await import('/src/data/species.ts'); const sp = SPECIES.find(x => x.id === 'danio') ? 'danio' : SPECIES.find(x => x.id.includes('danio')).id;
  t.fish = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, species: sp, x: 150 + (i % 5) * 70, y: 180 + (i % 3) * 40, depth: 60 + (i % 4) * 30, yaw: (i % 2 ? 0 : 6), pitch: 0, roll: 0, bend: 0 }));
  store.replace(P); window.__base = store.scene.tanks[store.scene.active].light.bright; return window.__base + ' ' + sp;
})()`);
const cam = (az, el, zoom) => ev(`window.__gb.store.edit(t => { t.camera = { ...t.camera, az: ${az}, el: ${el}, zoom: ${zoom} }; })`);
const lit = k => ev(`window.__gb.store.edit(t => { t.light.bright = window.__base * ${k}; })`);
try {
  await send('Page.enable'); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  console.log(await setup()); await sleep(6000);
  for (const [ln, k] of [['default', 1], ['dim', 0.4], ['strong', 1.8]]) {
    await lit(k); await sleep(1500);
    for (const [n, az, el, z] of [['normal', 0, 6, 1], ['close', 0, 6, 2.6]]) { await cam(az, el, z); await sleep(2500); await shot(`${ln}-${n}`); }
  }
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
