// QP3 (2026-11-10): re-render the Quick Preferences archetype thumbnails from the app's OWN renderer.
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/qp3-thumbs.mjs [only=freshwater-jungle,...] [port=5641] [gl=d3d11]
// For each QUICK_ARCHETYPES entry (src/scene/quickArchetypes.ts): the card's first layout, built exactly like an Explore card (ui/discovery/tiles.ts Previews: the recipe scene at the
// balanced density stop, the stocking suggestion for its roster, TILE_VIEW camera/lighting, same tank rule as the Explore pool), drawn by viewer.thumbnail, then cropped 3:2, scaled to 320 px
// wide and written as webp (quality searched down until the file is under BUDGET bytes) to public/art/quick/<habitat>-<id>.webp. Also one contact sheet per habitat in
// research/screens/QP3/ (labelled, shown at 160 px wide = the card size, next to the file size) so siblings can be compared.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const e = argv.find(x => x.startsWith(k + '=')); return e ? e.slice(k.length + 1) : d; };
const PORT = +opt('port', 5641), GL = opt('gl', 'd3d11'), ONLY = opt('only')?.split(','), W = +opt('w', 320), BUDGET = +opt('budget', 24000), SETTLE = +opt('settle', 3000);
mkdirSync('public/art/quick', { recursive: true }); mkdirSync('research/screens/QP3', { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { createServer } = await import('vite');
const dev = await createServer({ root: process.cwd(), server: { port: PORT, strictPort: true }, logLevel: 'error' });
await dev.listen();

const PAGE = `(async () => {
  const Q = await import('/src/scene/quickArchetypes.ts'), A = await import('/src/scene/archetypes.ts'), R = await import('/src/scene/recipes.ts'), AN = await import('/src/ui/discovery/animals.ts');
  const TF = await import('/src/scene/tankfit.ts'), TL = await import('/src/ui/discovery/tiles.ts'), BU = await import('/src/scene/builds.ts');
  const { store, viewer } = window.__gb;
  const ZOOMOF = T => T.tank.H / T.tank.L > 0.7 ? ${opt('zoomtall', 0.95)} : ${opt('zoom', 1.3)}, YOFF = ${opt('yoff', 0.38)}, only = ${JSON.stringify(ONLY ?? null)}, W = ${W}, H = Math.round(W * 2 / 3), BUDGET = ${BUDGET};
  const shot = T => { const orig = structuredClone(store.tank), put = S => store.update(s => { Object.assign(s.tanks[s.active], structuredClone(S), { brief: orig.brief }); }, { history: false });
    try { put({ ...T, person: { ...T.person, show: false }, camera: { ...T.camera, az: 18, el: 8, zoom: ZOOMOF(T) } }); return viewer.thumbnail(960); } finally { put(orig); } };
  for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(() => r()));
  await new Promise(r => setTimeout(r, ${SETTLE}));
  const tankOf = a => { const land = a.env === 'terrarium', all = TF.catalogueSizes(land).map(c => c.m), g = R.minTank(a).ratedGal, want = land ? g : Math.max(g, 29); return all.find(m => m.ratedGal >= want) ?? all[all.length - 1]; };
  const pv = new TL.Previews(shot), res = [], img = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
  const blobOf = (c, q) => new Promise(r => c.toBlob(r, 'image/webp', q));
  const b64 = async b => { const u8 = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(s); };
  const done = [];
  for (const q of Q.QUICK_ARCHETYPES) {
    if (only && !only.includes(q.key)) continue;
    const a = A.archetype(q.layouts[0]); if (!a) { res.push({ key: q.key, error: 'no archetype ' + q.layouts[0] }); continue; }
    const tank = tankOf(a); let r = AN.stockingSuggestion(a, tank); if (!r.length) r = R.focalAnimals(a, tank);
    const hand = r.length ? BU.buildsFor(r, tank)[2].setup : undefined, s = pv.render(a, 2, tank, hand);
    if (!s) { res.push({ key: q.key, error: 'cannot be drawn' }); continue; }
    const im = await img(s.url), sw = im.width, sh = Math.round(sw * 2 / 3), sy = Math.max(0, Math.round((im.height - sh) * YOFF));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, sy, sw, Math.min(sh, im.height), 0, 0, W, H);
    let quality = 0.86, blob = await blobOf(c, quality); while (blob.size > BUDGET && quality > 0.3) { quality -= 0.06; blob = await blobOf(c, quality); }
    done.push({ q, c, blob, layout: a.id, tank: tank.name, animals: hand?.fish.length ?? 0 });
    res.push({ key: q.key, layout: a.id, tank: tank.name, animals: hand?.fish.length ?? 0, bytes: blob.size, quality: +quality.toFixed(2), webp: await b64(blob) });
  }
  const sheets = {};
  for (const hab of [...new Set(done.map(d => d.q.habitat))]) {
    const items = done.filter(d => d.q.habitat === hab), cols = Math.min(3, items.length), rows = Math.ceil(items.length / cols), cw = W + 16, ch = H + 46;
    const c = document.createElement('canvas'); c.width = cols * cw + 16; c.height = rows * ch + 44; const g = c.getContext('2d'); g.fillStyle = '#10161c'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.fillText('QP3 ' + hab + ' - one image per archetype (320 px; cards show them at 160 px)', 16, 26);
    items.forEach((d, i) => { const x = 16 + (i % cols) * cw, y = 44 + Math.floor(i / cols) * ch; g.drawImage(d.c, x, y, W, H);
      g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(d.q.label, x, y + H + 18); g.fillStyle = '#9ab'; g.font = '12px sans-serif'; g.fillText(d.q.key + '  ' + (d.blob.size / 1024).toFixed(1) + ' KB  [' + d.layout + ']', x, y + H + 34);
      // the real card size, bottom-right of each cell, so thumbnail-distinctness can be judged
      g.drawImage(d.c, x + W - 160, y + H - 107 , 160, 107); g.strokeStyle = '#fff'; g.strokeRect(x + W - 160, y + H - 107, 160, 107); });
    const sm = document.createElement('canvas'); sm.width = c.width; sm.height = c.height; sm.getContext('2d').drawImage(c, 0, 0);
    sheets[hab] = await b64(await new Promise(r => c.toBlob(r, 'image/png')));
  }
  return { res, sheets };
})()`;

const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
if (!exe) { console.error('No Edge or Chrome found; set BROWSER_EXE.'); process.exit(1); }
const profile = mkdtempSync(join(tmpdir(), 'qp3-'));
const proc = spawn(exe, ['--headless=new', `--use-angle=${GL}`, '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let code = 0;
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
  const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); const p = m.id && pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  const ev = async expression => { const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 900_000 }); if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)); return r.result.value; };
  await s('Page.navigate', { url: `http://localhost:${PORT}/` });
  for (let i = 0; i < 300; i++) { if (await ev('!!window.__gb && !!window.__gb.viewer').catch(() => false)) break; await sleep(200); }
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  const out = await ev(PAGE); let total = 0;
  for (const r of out.res) {
    if (r.error) { console.log('FAIL', r.key, r.error); code = 1; continue; }
    writeFileSync(`public/art/quick/${r.key}.webp`, Buffer.from(r.webp, 'base64')); total += r.bytes;
    console.log(`${r.key.padEnd(30)} ${(r.bytes / 1024).toFixed(1).padStart(5)} KB q${r.quality}  ${r.layout} / ${r.tank} / ${r.animals} animals`);
  }
  for (const [h, b] of Object.entries(out.sheets)) writeFileSync(`research/screens/QP3/${h}.png`, Buffer.from(b, 'base64'));
  console.log(`total ${(total / 1024).toFixed(0)} KB for ${out.res.filter(r => !r.error).length} images`);
} catch (e) { console.error(e); code = 1; }
finally { proc.kill(); await dev.close(); process.exit(code); }
