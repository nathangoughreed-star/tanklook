// Bake gallery stills for chosen build-B looks only (same framing as scripts/bake-gallery.mjs BAKE), headless.
// For new species whose catalogue row does not exist yet: SO1/SO2 copy <look>.webp to public/gallery/<id>.webp.
// usage: node scripts/review/bake-looks.mjs <devPort> <outDir> <look1,look2,...>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [PORTAPP, OUT, IDS] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', PORT = 9400 + Math.floor(Math.random() * 400);
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1200,900', '--user-data-dir=' + (process.env.TEMP + '/bk-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); return r.result.result?.value ?? r.result.exceptionDetails?.exception?.description; };
try {
  await send('Page.navigate', { url: `http://localhost:${PORTAPP}/?photoart` });
  for (let i = 0; i < 60; i++) { await sleep(2000); if (await ev(`!!window.__gb?.viewer`)) break; }
  await sleep(8000);   // build-B images load after the viewer
  const res = await ev(`(async () => {
    const { SPECIES } = await import('/src/data/species.ts'), { SpeciesPreview } = await import('/src/render/preview3d.ts');
    const want = ${JSON.stringify(IDS.split(','))}, tool = new SpeciesPreview(1), out = {};
    for (const look of want) {
      const sp = SPECIES.find(s => s.look === look || s.id === look); if (!sp) { out[look] = 'no species row'; continue; }
      tool.snapshot(sp, 480, 300);
      const src = tool.canvas, w = src.width, h = src.height, c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
      const a = g.getImageData(0, 0, w, h).data; let x0 = w, x1 = -1, y0 = h, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { out[look] = 'empty'; continue; }
      const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.05);
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
      const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
      o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
      out[look] = o.toDataURL('image/webp', 0.85);
    }
    return out; })()`);
  if (typeof res !== 'object') { console.log('page error:', res); }
  else for (const [k, v] of Object.entries(res)) {
    if (!String(v).startsWith('data:')) { console.log(k, v); continue; }
    fs.writeFileSync(`${OUT}/${k}.webp`, Buffer.from(v.split(',')[1], 'base64')); console.log('wrote', k);
  }
} finally { ch.kill(); process.exit(0); }
