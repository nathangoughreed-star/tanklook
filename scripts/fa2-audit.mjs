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
  const ids = await ev(`(async () => {
    const E = await import('/src/examples/scenes.ts'); const sc = JSON.parse(E.SCENES.planted); const { store } = window.__gb; if (store.split) store.closeTank(1);
    const V = await import('/src/scene/validate.ts'); const P = V.parseScene(sc).scene, t = P.tanks[P.active]; t.fish = []; t.camera = { ...t.camera, az: 0, el: 4, zoom: 1 };
    store.replace(P); window.__fx.time(7.3); window.__fx.set(window.__fx.parse(${JSON.stringify(process.env.FX ?? '')}));
    const { SPECIES } = await import('/src/data/species.ts'); const { PLANS } = await import('/src/art/fishgen.ts');
    window.__ids = SPECIES.filter(s => PLANS[s.art ?? s.id] && !s.f && !/shrimp|snail|crab|lizard|frog|gecko|snake|spider|tarantula|millipede|isopod/i.test(s.group + s.id + (s.art ?? ''))).map(s => s.id);
    return window.__ids;
  })()`);
  if (process.env.EXTRA) await ev(process.env.EXTRA);
  const only = process.env.IDS ? process.env.IDS.split(',') : ids;
  await sleep(4000);
  // analysis in the page: fish mask = |with - without| > 12 in any channel; flank = central 40% x, middle 60% y of the mask bbox
  await ev(`window.__img = async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height); }`);
  const setFish = sp => ev(`(() => { window.__gb.store.edit(t => { t.fish = ${'${SP}'} ? [] : []; }); })()`).then(() => 0);
  const empty = await shotB64(); const e0 = await ev(`(async () => { window.__e = await window.__img(${JSON.stringify(empty)}); return 1; })()`);
  const out = [];
  for (const sp of only) {
    await ev(`window.__gb.store.edit(t => { t.fish = [{ id: 1, species: ${JSON.stringify(sp)}, x: t.tank.L / 2, y: t.tank.H * 0.5, depth: 25, yaw: 0, pitch: 0, roll: 0, bend: 0, tl: 420 }]; })`);
    await sleep(900);
    const b = await shotB64();
    if (process.env.SHOTS) writeFileSync(`research/screens/FA2/${TAG}-${sp}.png`, Buffer.from(b, 'base64'));
    const r = await ev(`(async () => { const a = await window.__img(${JSON.stringify(b)}), e = window.__e, W = a.width, H = a.height; let x0 = W, x1 = 0, y0 = H, y1 = 0; const m = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) { const qx = i % W, qy = (i / W) | 0; if (qx < 640 || qx > 1140 || qy < 215 || qy > 405) continue; const d = Math.max(Math.abs(a.data[i*4]-e.data[i*4]), Math.abs(a.data[i*4+1]-e.data[i*4+1]), Math.abs(a.data[i*4+2]-e.data[i*4+2])); if (d > 14) { m[i] = 1; const px = i % W, py = (i / W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; } }
      if (x1 <= x0) return null; const w = x1 - x0, h = y1 - y0, fx0 = x0 + w * 0.3, fx1 = x0 + w * 0.7, fy0 = y0 + h * 0.2, fy1 = y0 + h * 0.8; let n = 0, R = 0, G = 0, B = 0;
      for (let py = Math.floor(fy0); py < fy1; py++) for (let px = Math.floor(fx0); px < fx1; px++) { const i = py * W + px; if (m[i]) { n++; R += a.data[i*4]; G += a.data[i*4+1]; B += a.data[i*4+2]; } }
      return n ? { n, w, h, rgb: [R / n, G / n, B / n].map(v => Math.round(v)) } : null; })()`);
    out.push({ id: sp, ...r }); console.log(sp, JSON.stringify(r));
  }
  writeFileSync(`research/screens/FA2/audit-${TAG}.json`, JSON.stringify(out));
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
