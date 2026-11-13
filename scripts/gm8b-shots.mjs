// Lane GM8: CO2 tank with a 3D rock backdrop (front, 3/4 and a side view) and one without. Dev server URL env. Pictures: research/screens/GM8/*.png
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5981/', PORT = 9351;
mkdirSync('research/screens/GM8', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1500,900', '--user-data-dir=' + (process.env.TEMP + '/gm8-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/GM8/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
const setup = bd => ev(`(async () => {
  const E = await import('/src/examples/scenes.ts'), Te = await import('/src/scene/tech.ts');
  const sc = JSON.parse(E.SCENES.planted); const { store } = window.__gb; if (store.split) store.closeTank(1);
  const V = await import('/src/scene/validate.ts'); const P = V.parseScene(sc).scene, t = P.tanks[P.active];
  t.lid = 'open'; t.backdrop = ${bd ? `{ kind: 'rock', depth: 90, seed: 3 }` : `{ kind: 'none', depth: 0, seed: 1 }`}; t.grow.feed = 'co2'; delete t.tech;
  store.replace(P);
  const dbg = JSON.stringify([store.scene.active, store.scene.tanks.length, store.scene.tanks.map(x => x.tech?.rows?.co2)]);
  const G = await import('/src/render/gear3d.ts'); return dbg + JSON.stringify(store.scene.tanks[store.scene.active].tech?.rows) + ' | ' + G.gearPicks(store.scene.tanks[store.scene.active]).map(p => p.id).join(',');
})()`);
const cam = (az, el, zoom) => ev(`window.__gb.store.edit(t => { t.camera = { ...t.camera, az: ${az}, el: ${el}, zoom: ${zoom} }; })`);
try {
  await send('Page.enable'); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  for (const [bd, tag] of [[true, 'rock'], [false, 'plain']]) {
    console.log(await setup(bd)); await sleep(6000);
    for (const [n, az, el, z] of [['front', 0, 6, 1], ['34', 38, 14, 1], ['34r', -38, 14, 1]]) { await cam(az, el, z); await sleep(2500); await shot(`heater-${tag}-${n}`); }
  }
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
