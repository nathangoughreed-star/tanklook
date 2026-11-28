// Lane BD1 (R199): the 3D backdrop in every style, front and 3/4, in the planted example scene.
// Usage: URL=http://localhost:6171/ TAG=before node scripts/bd1-shots.mjs [kinds...]   Pictures: research/screens/BD1/<TAG>-<kind>-<view>.png
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:6171/', PORT = 9000 + Math.floor(Math.random() * 400), TAG = process.env.TAG ?? 'shot';
const KINDS = process.argv.slice(2).length ? process.argv.slice(2) : ['rock', 'cork', 'river', 'reef', 'moss', 'jungle'];
const OUT = 'research/screens/BD1'; mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1500,900', '--user-data-dir=' + (process.env.TEMP + '/bd1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=d3d11', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
const shot = async name => { const b = await ev(`(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0].getBoundingClientRect(); return { x: c.x, y: c.y, width: c.width, height: c.height, scale: 1 }; })()`); const r = await send('Page.captureScreenshot', { format: 'png', clip: b }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
const setup = kind => ev(`(async () => {
  const E = await import('/src/examples/scenes.ts'), V = await import('/src/scene/validate.ts');
  const { store } = window.__gb; if (store.split) store.closeTank(1);
  const P = V.parseScene(JSON.parse(E.SCENES.${process.env.SCENE ?? 'planted'})).scene, t = P.tanks[P.active];
  t.lid = 'open'; t.backdrop = { kind: '${kind}', depth: ${process.env.DEPTH ?? 70}, seed: 3 };
  store.replace(P); return 'ok';
})()`);
const cam = (az, el, zoom) => ev(`window.__gb.store.edit(t => { t.camera = { ...t.camera, az: ${az}, el: ${el}, zoom: ${zoom} }; })`);
try {
  await send('Page.enable'); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  // the start dialog off ("Just look around"), then shots cropped to the 3D view at 2x
  await ev(`[...document.querySelectorAll('button, a, div')].find(e => e.textContent.trim() === 'Just look around')?.click()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 900, deviceScaleFactor: 2, mobile: false });
  for (const kind of KINDS) {
    console.log(kind, await setup(kind)); await sleep(5000);
    for (const [n, az, el, z] of [['front', 0, 3, 1], ['34', 30, 10, 1]]) { await cam(az, el, z); await sleep(2500); await shot(`${TAG}-${kind}-${n}`); }
  }
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
