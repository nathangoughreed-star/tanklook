// Lane FA2 PERF: fish light cap A/B on alternating frames (cap 1 vs 0), 40 fish: median / p95 synced wall ms. (derived from fa2-audit.mjs)
// Lane FA2: fish colour audit. One fish at a time, large, side-on in the planted tank; the flank mean is read from the screenshot
// (fish pixels = pixels that differ from the same view with no fish). Env: TAG=before|after, FX="" (eg tonemap:none), IDS=a,b (default: all fish),
// URL, SHOTS=1 saves each picture. Output: research/screens/FA2/audit-<TAG>.json
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5992/', PORT = 9362 + Math.floor(Math.random() * 50), TAG = process.env.TAG ?? 'before';
mkdirSync('research/screens/FA2', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1200,700', '--user-data-dir=' + (process.env.TEMP + '/fa2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
const shotB64 = async () => (await send('Page.captureScreenshot', { format: 'png' })).result.data;
try {
  await send('Page.enable'); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  await ev(`(async () => {
    const E = await import('/src/examples/scenes.ts'); const sc = JSON.parse(E.SCENES.planted); const { store } = window.__gb; if (store.split) store.closeTank(1);
    const V = await import('/src/scene/validate.ts'); const P = V.parseScene(sc).scene, t = P.tanks[P.active];
    const ids = ['neon','pygmycory','oscar','guppy','angel','goldfish','oto','betta','danio','kribensis']; t.fish = ids.map((s, i) => ({ id: i + 1, species: s, x: 150 + (i % 5) * 170, y: 160 + (i % 2) * 170, depth: 60 + (i % 3) * 70, yaw: i % 2 ? 0 : 6, pitch: 0, roll: 0, bend: 0 }));
    t.camera = { ...t.camera, zoom: 1 }; store.replace(P); window.__fx.time(7.3); return 1; })()`);
  await sleep(20000);
  for (const [tag, v, empty] of [['old', 0, 0], ['new', 1, 0], ['nofish', 1, 1]]) {
    await ev(`window.__fishCap.value = ${v}; ${empty ? "window.__gb.store.edit(t => { t.fish = []; })" : ''}`); await ev(`for (let i = 0; i < 3; i++) window.__gb.viewer.draw()`); await sleep(1200);
    writeFileSync(`research/screens/FA2/tank-${tag}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64')); console.log(tag);
  }
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
