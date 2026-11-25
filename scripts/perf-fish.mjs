// `node scripts/perf-fish.mjs [--dist dist-perf] [--view planted] [--pairs 60] [--w 1050 --h 850 --dpr 1] [--out file.json]`
// Frame-time split for a tank with every fish free-swimming, on the PRODUCTION build with the debug handle:
//   VITE_GB_HANDLE=1 npx vite build --outDir dist-perf   (this script serves dist-perf itself)
// Headless Edge / Chrome on the hardware GPU over the DevTools protocol (as scripts/perf-baseline.mjs). Per condition it
// times viewer.draw() (CPU ms, GPU ms by timer query, draw calls) and the pieces inside it (roam / crawl / cling update,
// renderer.render). Conditions are measured ALTERNATING frame by frame (house rule: sequential runs lie on a shared machine).
// A condition is a page expression (variable v = the viewer) run before its frame. Prints a table, writes JSON to --out.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const DIST = opt('dist', 'dist-perf'), VIEW = opt('view', 'planted'), PAIRS = +opt('pairs', 60), OUT = opt('out', '');
const W = +opt('w', 1050), H = +opt('h', 850), DPR = +opt('dpr', 1);
const CONDS = opt('conds', '') ? JSON.parse(readFileSync(opt('conds', ''), 'utf8')) : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const srv = createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = join(DIST, p); if (!existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); r.end(readFileSync(f));
}).listen(0);
const base = `http://127.0.0.1:${srv.address().port}/`;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const profile = mkdtempSync(join(tmpdir(), 'pf-'));
const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const portFile = join(profile, 'DevToolsActivePort'); for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`); await new Promise((a, b) => { ws.onopen = a; ws.onerror = b; });
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); const p = m.id && pend.get(m.id); if (p) { pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId); await s('Page.enable'); await s('Runtime.enable');
await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
const ev = async (expression, timeout = 600_000) => {
  const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value;
};
try {
  await s('Page.navigate', { url: base });
  const scene = readFileSync(VIEW.endsWith('.json') ? VIEW : `src/examples/${VIEW}.json`, 'utf8');
  await ev(`localStorage.setItem('tanklook.scene', ${JSON.stringify(scene)}); localStorage.setItem('tanklook.swim','1'); localStorage.setItem('tanklook.sway','1'); 1`);
  for (let attempt = 0; attempt < 5; attempt++) { // the page sometimes comes up not drawing (panel state): reload until it draws
    await s('Page.navigate', { url: base });
    for (let i = 0; i < 300; i++) { if (await ev('!!window.__gb && __gb.viewer.renderer.info.render.calls > 0')) break; await sleep(200); }
    for (let i = 0; i < 300; i++) { if (await ev('!__gb.viewer.reveal && !__gb.viewer.needsBuild')) break; await sleep(200); }
    for (let i = 0; i < 40; i++) { await ev("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Done')?.click(); 1"); await sleep(500); if (await ev('__gb.viewer.renderer.domElement.width > 900')) break; } await sleep(2500);
    if (await ev('(__gb.viewer.draw(), __gb.viewer.renderer.info.render.calls > 100)')) break;
  }
  if (opt('shot', '')) { const r = await s('Page.captureScreenshot', { format: 'png' }); writeFileSync(opt('shot', ''), Buffer.from(r.data, 'base64')); }
  if (opt('eval', '')) { console.log(JSON.stringify(await ev(readFileSync(opt('eval', ''), 'utf8')), null, 1)); throw new Error('eval done'); }
  const res = await ev(`(async () => {
    const v = __gb.viewer, gl = v.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2'), raf = () => new Promise(r => requestAnimationFrame(() => r()));
    const med = a => { const x = a.filter(y => y != null && isFinite(y)).sort((p, q) => p - q); return x.length ? +x[x.length >> 1].toFixed(2) : null; };
    const acc = { roam: 0, crawl: 0, cling: 0, render: 0 };
    const wrap = (o, k, name) => { const f = o[k].bind(o); o[k] = (...a) => { const t = performance.now(); const r = f(...a); acc[name] += performance.now() - t; return r; }; };
    wrap(v.roam, 'update', 'roam'); wrap(v.crawl, 'update', 'crawl'); wrap(v.cling, 'update', 'cling'); wrap(v.renderer, 'render', 'render');
    v.scanMovers();
    const conds = ${JSON.stringify(CONDS)} ?? {
      full: 'v.swim=true; v.swimAuto=false; v.sway=true; v.drifters.forEach(m=>m.visible=true)',
      'swim off': 'v.swim=false; v.sway=true; v.drifters.forEach(m=>m.visible=true)',
      'sway off': 'v.swim=true; v.swimAuto=false; v.sway=false; v.drifters.forEach(m=>m.visible=true)',
      'both off': 'v.swim=false; v.sway=false; v.drifters.forEach(m=>m.visible=true)',
      'fish hidden': 'v.swim=true; v.swimAuto=false; v.sway=true; v.drifters.forEach(m=>m.visible=false)',
    };
    const names = Object.keys(conds), R = Object.fromEntries(names.map(n => [n, { cpu: [], gpu: [], roam: [], crawl: [], cling: [], render: [], calls: [], tris: [] }]));
    const info = v.renderer.info; info.autoReset = false;
    for (let i = 0; i < 8; i++) { v.swayT += 33; v.draw(); await raf(); }
    for (let k = 0; k < ${PAIRS}; k++) for (const n of names) {
      new Function('v', conds[n])(v);
      for (const key in acc) acc[key] = 0; info.reset(); v.swayT += 33;
      const q = ext ? gl.createQuery() : null; if (q) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      const t = performance.now(); v.draw(); const cpu = performance.now() - t; if (q) gl.endQuery(ext.TIME_ELAPSED_EXT);
      const r = R[n]; r.cpu.push(cpu); for (const key in acc) r[key].push(acc[key]); r.calls.push(info.render.calls); r.tris.push(info.render.triangles);
      await raf();
      if (q) { for (let j = 0; j < 100 && !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE); j++) await raf(); const bad = gl.getParameter(ext.GPU_DISJOINT_EXT); r.gpu.push(bad ? null : gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q); }
    }
    const out = {}; for (const n of names) { const r = R[n]; out[n] = { cpu: med(r.cpu), gpu: med(r.gpu), roam: med(r.roam), crawl: med(r.crawl), cling: med(r.cling), render: med(r.render), calls: med(r.calls), tris: med(r.tris) }; }
    return { fish: v.drifters.length, canvas: [v.renderer.domElement.width, v.renderer.domElement.height], out };
  })()`);
  console.log(`${VIEW}  fish=${res.fish}  canvas=${res.canvas}  (median ms over ${PAIRS} alternating frames)`);
  console.table(res.out);
  if (OUT) writeFileSync(OUT, JSON.stringify({ view: VIEW, pairs: PAIRS, ...res }, null, 1));
} catch (e) { if (e.message !== 'eval done') throw e; } finally { try { await send('Browser.close'); } catch { /* gone */ } proc.kill(); srv.close(); await sleep(400); try { rmSync(profile, { recursive: true, force: true }); } catch { /* busy */ } }
