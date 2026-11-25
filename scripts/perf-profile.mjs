// `node scripts/perf-profile.mjs --dist dist-perfn [--view planted] [--n 120] [--hide fish]`: CPU profile (V8 sampling) of N full viewer.draw() calls with the fish swimming,
// on an UNMINIFIED production build (VITE_GB_HANDLE=1 npx vite build --minify false --outDir dist-perfn). Prints the top self-time functions.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const DIST = opt('dist', 'dist-perfn'), VIEW = opt('view', 'planted'), N = +opt('n', 120), HIDE = opt('hide', '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const srv = createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = join(DIST, p); if (!existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); r.end(readFileSync(f)); }).listen(0);
const base = `http://127.0.0.1:${srv.address().port}/`;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const profile = mkdtempSync(join(tmpdir(), 'pp-'));
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
await s('Emulation.setDeviceMetricsOverride', { width: 1050, height: 850, deviceScaleFactor: 1, mobile: false });
const ev = async (expression, timeout = 600_000) => { const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
try {
  await s('Page.navigate', { url: base });
  await ev(`localStorage.setItem('tanklook.scene', ${JSON.stringify(readFileSync(`src/examples/${VIEW}.json`, 'utf8'))}); localStorage.setItem('tanklook.swim','1'); localStorage.setItem('tanklook.sway','1'); 1`);
  await s('Page.navigate', { url: base });
  for (let i = 0; i < 300; i++) { if (await ev('!!window.__gb && __gb.viewer.renderer.info.render.calls > 0')) break; await sleep(200); }
  for (let i = 0; i < 300; i++) { if (await ev('!__gb.viewer.reveal && !__gb.viewer.needsBuild')) break; await sleep(200); }
  for (let i = 0; i < 40; i++) { await ev("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Done')?.click(); 1"); await sleep(500); if (await ev('__gb.viewer.renderer.domElement.width > 900')) break; } await sleep(2500);
  await ev(`(async () => { const v = __gb.viewer; v.scanMovers(); ${HIDE === 'fish' ? 'v.drifters.forEach(m => m.visible = false);' : ''} for (let i = 0; i < 10; i++) { v.swayT += 33; v.draw(); await new Promise(r => requestAnimationFrame(r)); } })()`);
  await s('Profiler.enable'); await s('Profiler.setSamplingInterval', { interval: 100 }); await s('Profiler.start');
  await ev(`(async () => { const v = __gb.viewer; for (let i = 0; i < ${N}; i++) { v.swayT += 33; v.draw(); await new Promise(r => requestAnimationFrame(r)); } })()`);
  const { profile: prof } = await s('Profiler.stop');
  const self = new Map(), byId = new Map(prof.nodes.map(n => [n.id, n])); let total = 0;
  const dts = prof.timeDeltas; prof.samples.forEach((sid, i) => { const n = byId.get(sid), f = n.callFrame, k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`; self.set(k, (self.get(k) ?? 0) + dts[i] / 1000); total += dts[i] / 1000; });
  console.log(`total sampled ${total.toFixed(0)} ms over ${N} draws = ${(total / N).toFixed(1)} ms/draw (incl. idle); top self time per draw:`);
  // callers: for the top self-time functions, the chain above them (summed per chain)
  const parent = new Map(); for (const n of prof.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const chains = new Map(); prof.samples.forEach((sid, i) => { const n = byId.get(sid), f = n.callFrame; const name = f.functionName; if (!['toArray', 'flatten', 'getParameters', 'getProgram', 'upload'].includes(name)) return; let k = [], p = sid; for (let d = 0; d < 7 && p; d++, p = parent.get(p)) { const q = byId.get(p).callFrame; k.push((q.functionName || '(anon)') + ':' + (q.lineNumber + 1)); } const key = k.join(' < '); chains.set(key, (chains.get(key) ?? 0) + dts[i] / 1000); });
  console.log('--- callers'); [...chains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, ms]) => console.log((ms / N).toFixed(2).padStart(7), 'ms', k));
  [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28).forEach(([k, ms]) => console.log((ms / N).toFixed(2).padStart(7), 'ms', k));
} finally { try { await send('Browser.close'); } catch { /* gone */ } proc.kill(); srv.close(); await sleep(400); try { rmSync(profile, { recursive: true, force: true }); } catch { /* busy */ } }
