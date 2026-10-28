// `node scripts/a4-perf.mjs [--species curlyhair,emperorscorpion,...] [--counts 1,6] [--pairs 40] [--out file.json] [--shot dir]` (lane A4, 2026-10-28):
// cost of the heavy arthropod models in the terrarium example. Per species and count N: the animals' triangles and draw calls (every visible mesh whose
// material is flagged `fish`) and the GPU ms they add, measured as a paired A/B on ALTERNATING frames (animals hidden / shown; sequential timings lie on a
// shared machine). Hardware GPU via ANGLE d3d11, headless Edge / Chrome over the DevTools protocol. Changes no app code.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const SPECIES = opt('species', 'curlyhair,emperorscorpion,indianstick,orchidmantis').split(','), COUNTS = opt('counts', '1,6').split(',').map(Number), PAIRS = +opt('pairs', 40);
const OUT = opt('out', ''), SHOT = opt('shot', ''), CMP = opt('compare', ''); // --compare dir: a crop of the tank view around the animal with the far coat (as drawn) and with the full coat forced
const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const base = JSON.parse(readFileSync('src/examples/terrarium.json', 'utf8'));
const scene = (sp, n) => {
  const s = JSON.parse(JSON.stringify(base)), t = s.tanks[0];
  if (opt('dist', '')) t.camera.dist = +opt('dist', '');
  t.fish = Array.from({ length: n }, (_, i) => ({ id: i + 1, species: sp, x: n === 1 ? 560 : 240 + (i % 3) * 270, y: 0, depth: n === 1 ? 330 : 230 + Math.floor(i / 3) * 230, yaw: (i * 53) % 360 - 180, pitch: 0, roll: 0, bend: 0, surface: 'floor' }));
  return JSON.stringify(s);
};
const dev = await createServer({ server: { port: 5431, strictPort: false }, logLevel: 'warn' }); await dev.listen();
const URL_ = dev.resolvedUrls.local[0];
const profile = mkdtempSync(join(tmpdir(), 'a4-'));
const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const portFile = join(profile, 'DevToolsActivePort');
for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); const p = m.id && pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' }); const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s('Page.enable'); await s('Runtime.enable'); await s('Emulation.setDeviceMetricsOverride', { width: 1050, height: 850, deviceScaleFactor: 1, mobile: false });
const ev = async (expression, timeout = 300000) => { const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
const PAGE = `(() => {
  const v = () => __gb.viewer, gl = () => v().renderer.getContext(), ext = gl().getExtension('EXT_disjoint_timer_query_webgl2');
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  const med = a => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(3); };
  const animals = () => { const out = []; for (const vp of v().active) vp.scene?.traverseVisible(o => { if (o.isMesh && [].concat(o.material)[0]?.userData?.fish) out.push(o); }); return out; };
  const timed = fn => { const g = gl(); const q = g.createQuery(); g.beginQuery(ext.TIME_ELAPSED_EXT, q); const t = performance.now(); fn(); const cpu = performance.now() - t; g.endQuery(ext.TIME_ELAPSED_EXT); return { cpu, q }; };
  const resolve = async q => { const g = gl(); for (let i = 0; i < 300; i++) { if (g.getQueryParameter(q, g.QUERY_RESULT_AVAILABLE)) { const bad = g.getParameter(ext.GPU_DISJOINT_EXT), ns = g.getQueryParameter(q, g.QUERY_RESULT); g.deleteQuery(q); return bad ? null : ns / 1e6; } await raf(); } return null; };
  const mats = new Set(); for (const o of animals()) mats.add([].concat(o.material)[0]); // material.visible, not mesh.visible: an LOD resets its levels' flags each frame
  const set = vis => mats.forEach(m => { m.visible = vis; });
  return {
    first: () => animals()[0],
    async stats() { for (const m of mats) m.visible = true; let err = ''; try { for (let i = 0; i < 3; i++) { v().draw(); await raf(); } } catch (e) { err = String(e.stack).slice(0, 400); } const ms = animals(); let tris = 0; const geos = new Set(); for (const o of ms) { const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; geos.add(g.uuid); } return { err, meshes: ms.length, tris: Math.round(tris), uniqueGeos: geos.size, lod: (() => { const o = []; for (const vp of v().active) vp.scene?.traverse(x => { if (x.isLOD) o.push(x.levels.map(l => l.object.visible).concat([+x.matrixWorld.getMaxScaleOnAxis().toFixed(1), +vp.cam.position.distanceTo(x.getWorldPosition(vp.cam.position.clone())).toFixed(0), vp.cam.fov, vp.cam.zoom])); }); return o; })(), per: ms.map(o => { const g = o.geometry; return Math.round((g.index ? g.index.count : g.attributes.position.count) / 3); }) }; },
    async ab(pairs) {
      const A = [], B = [], d = [], cA = [], cB = [];
      for (let i = 0; i < 6; i++) { set(i % 2 === 0); v().draw(); await raf(); }
      for (let i = 0; i < pairs; i++) {
        set(false); const a = timed(() => v().draw()); await raf(); const ga = await resolve(a.q);
        set(true); const b = timed(() => v().draw()); await raf(); const gb = await resolve(b.q);
        A.push(ga); B.push(gb); cA.push(a.cpu); cB.push(b.cpu); if (ga != null && gb != null) d.push(gb - ga);
      }
      set(true); return { gpuHidden: med(A), gpuShown: med(B), gpuDelta: med(d), cpuDelta: +(med(cB) - med(cA)).toFixed(3) };
    },
  };
})()`;
const results = [];
for (const sp of SPECIES) for (const n of COUNTS) {
  await s('Page.navigate', { url: URL_ });
  await ev(`localStorage.setItem('tanklook.scene', ${JSON.stringify(scene(sp, n))}); 1`);
  await s('Page.navigate', { url: URL_ });
  for (let i = 0; i < 300; i++) { if (await ev('!!window.__gb && !!__gb.viewer && __gb.viewer.active.length > 0').catch(() => false)) break; await sleep(200); }
  await sleep(6000); await ev(`window.__pb = ${PAGE}; 1`);
  const stats = await ev('__pb.stats()'); const ab = await ev(`__pb.ab(${PAIRS})`);
  const r = { species: sp, n, ...stats, ...ab }; results.push(r); console.log(JSON.stringify(r));
  if (CMP) { // the LOD's two coats at the tank's own distance, same pixels around the animal
    mkdirSync(CMP, { recursive: true });
    const at = await ev(`(() => { const vp = __gb.viewer.active[0], o = __pb.first(); const p = o.getWorldPosition(new o.position.constructor()).project(vp.cam), r = __gb.viewer.renderer.domElement.getBoundingClientRect(); return [r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]; })()`);
    const clip = { x: Math.max(0, at[0] - 90), y: Math.max(0, at[1] - 70), width: 180, height: 140, scale: 4 };
    for (const mode of ['far', 'near']) {
      await ev(`(() => { for (const vp of __gb.viewer.active) vp.scene.traverse(o => { if (o.isLOD) o.update = function () { this.levels[0].object.visible = ${mode === 'near'}; this.levels[1].object.visible = ${mode === 'far'}; }; }); __gb.viewer.draw(); 1 })()`);
      await sleep(400);
      const png = await s('Page.captureScreenshot', { format: 'png', clip }); writeFileSync(join(CMP, `${sp}-${n}-${mode}.png`), Buffer.from(png.data, 'base64'));
    }
  }
  if (SHOT) { mkdirSync(SHOT, { recursive: true }); const png = await s('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(SHOT, `${sp}-${n}.png`), Buffer.from(png.data, 'base64')); }
}
if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 1));
try { await send('Browser.close'); } catch { /* gone */ } proc.kill(); await dev.close(); await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
process.exit(0);
