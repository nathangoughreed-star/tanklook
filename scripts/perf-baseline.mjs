// `node scripts/perf-baseline.mjs`: performance baseline for TankLook (lane E1, 2026-10-15). Re-runnable; changes no app code.
// Starts the dev server, drives headless Edge / Chrome on the HARDWARE GPU (--use-angle=d3d11; SwiftShader numbers mean
// nothing) over the DevTools protocol, and per view (every example in src/examples + a split of planted) records:
//   steady draw: GPU ms (EXT_disjoint_timer_query_webgl2 around viewer.draw()), CPU ms, draw calls, triangles
//   memory: geometries / textures / programs (three's renderer.info), JS heap after a forced GC
//   load: navigation -> first WebGL draw call -> next frame (dev server; the production build separately)
//   full rebuild: viewer.rebuild() + draw, warm (cold = the first frame after load)
//   edits: every edit in src/render/incrementalCheck.ts, store + panel time, build + draw time, time to pixels, GPU
// at 1050x850 (lane J2's size, DPR 1) and 375x812 (phone, DPR 3 -> the app caps it at 2). Then, for the worst views by
// GPU, a breakdown: each shader bucket (the materials' userData flags: plantClip, fish, solid, frost, sub, room ...) is
// hidden on alternate frames and the paired GPU difference is its cost. A/B timings ALWAYS alternate frames: load from
// other chats' dev servers shifts by tens of ms within seconds, so sequential blocks lie (memory perf-ab-alternate-frames).
// Last, `npm run build:single` and the single-file build's size and load -> first frame per example.
// Instrumentation lives in this script (injected into the page), never in src/.
//
// Options: --sizes desktop,phone  --views planted,iwagumi,...,split  --frames 40  --rounds 2 (edit rounds)
//          --breakdown 3 (worst N views, or a list: planted,iwagumi; 0 = none)  --pairs 30 (A/B frame pairs)
//          --no-edits  --no-prod  --no-build (measure the existing dist-single/)  --out research/efficiency/E1-baseline.json
//          --ab file.mjs: extra A/B in each breakdown view; the module exports [{ name, a: 'js', b: 'js' }], each a page
//          expression run before the frame of that side (handle: __gb.viewer / __gb.store, helpers: __pb)
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer as httpServer } from 'node:http';
import { cpus, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createServer } from 'vite';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const flag = k => argv.includes('--' + k);
const EXAMPLES = readdirSync('src/examples').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const VIEWS = opt('views', [...EXAMPLES, 'split'].join(',')).split(',');
const SIZES = { desktop: { width: 1050, height: 850, deviceScaleFactor: 1, mobile: false }, phone: { width: 375, height: 812, deviceScaleFactor: 3, mobile: true } };
const sizes = opt('sizes', 'desktop,phone').split(',');
const FRAMES = +opt('frames', 40), ROUNDS = +opt('rounds', 2), PAIRS = +opt('pairs', 30);
const BREAK = opt('breakdown', '3'), OUT = opt('out', 'research/efficiency/E1-baseline.json');
const extraAB = flag('ab') ? (await import(pathToFileURL(opt('ab')).href)).default : [];
const STORAGE_KEY = 'tanklook.scene';
const sceneText = n => readFileSync(`src/examples/${n === 'split' ? 'planted' : n}.json`, 'utf8');
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0).padStart(4)} s]`, ...a);

// ---------- machine load: who else is running (other chats' dev servers and browsers steal GPU and CPU) ----------
function cpuBusy(ms = 1000) {
  const snap = () => cpus().reduce((a, c) => { const t = c.times; a.idle += t.idle; a.all += t.user + t.nice + t.sys + t.idle + t.irq; return a; }, { idle: 0, all: 0 });
  const a = snap(), end = Date.now() + ms; while (Date.now() < end) { /* busy-wait a second: no sleep in a sync helper */ }
  const b = snap(); return Math.round(100 * (1 - (b.idle - a.idle) / (b.all - a.all)));
}
function machineLoad() {
  const sh = c => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };
  const tasks = sh('tasklist /fo csv /nh').split('\n').map(l => l.split('","')[0]?.replace(/^"/, '').toLowerCase()).filter(Boolean);
  const count = n => tasks.filter(t => t === n).length;
  const ports = [...new Set(sh('netstat -ano').split('\n').filter(l => /LISTENING/.test(l)).map(l => +l.trim().split(/\s+/)[1].split(':').pop()).filter(p => p >= 5100 && p < 5800))].sort((a, b) => a - b);
  const busy = cpuBusy();
  return { at: new Date().toISOString(), cpuBusyPct: busy, node: count('node.exe'), msedge: count('msedge.exe'), chrome: count('chrome.exe'), claude: count('claude.exe'), devPorts: ports, underLoad: busy > 25 || ports.length > 2 };
}

// ---------- the browser, over the DevTools protocol (Node's own WebSocket; no puppeteer) ----------
const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
if (!exe) { console.error('No Edge or Chrome found; set BROWSER_EXE.'); process.exit(1); }

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'perf-'));
  const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-extensions',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
  const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); const p = m.id && pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  await s('Page.addScriptToEvaluateOnNewDocument', { source: `(${INSTRUMENT})()` });
  const ev = async (expression, timeout = 300_000) => {
    const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(`page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  return { s, ev, close: async () => { try { await send('Browser.close'); } catch { /* already gone */ } proc.kill(); await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch { /* still locked */ } } };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Before any app script: count WebGL draw calls and stamp the first one (load -> first frame works on the production
// build too, which has no debugging handle).
const INSTRUMENT = () => {
  const P = window.__perf = { calls: 0, firstDraw: null, firstFrame: null };
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
      const f = C.prototype[k]; if (!f) continue;
      C.prototype[k] = function (a, b, c, d, e) {
        P.calls++;
        if (P.firstDraw === null) { P.firstDraw = performance.now(); requestAnimationFrame(() => { P.firstFrame = performance.now(); }); }
        return f.call(this, a, b, c, d, e);
      };
    }
  }
};

// The measuring kit, installed in the page as window.__pb once the app is up (dev server: needs window.__gb).
const PAGE = () => {
  const v = () => __gb.viewer, st = () => __gb.store, gl = () => v().renderer.getContext();
  const ext = gl().getExtension('EXT_disjoint_timer_query_webgl2');
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  const med = a => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(2); };
  const timed = fn => {
    const g = gl(); let q = null;
    if (ext) { q = g.createQuery(); g.beginQuery(ext.TIME_ELAPSED_EXT, q); }
    const t = performance.now(); fn(); const cpu = performance.now() - t;
    if (q) g.endQuery(ext.TIME_ELAPSED_EXT);
    return { cpu, q };
  };
  const resolve = async q => {
    if (!q) return null; const g = gl();
    for (let i = 0; i < 300; i++) {
      if (g.getQueryParameter(q, g.QUERY_RESULT_AVAILABLE)) { const bad = g.getParameter(ext.GPU_DISJOINT_EXT), ns = g.getQueryParameter(q, g.QUERY_RESULT); g.deleteQuery(q); return bad ? null : ns / 1e6; }
      await raf();
    }
    return null;
  };
  const sync = () => { const g = gl(); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4)); }; // wait until the GPU has drawn
  const scenes = () => v().active.map(vp => vp.scene).filter(Boolean);
  const meshes = () => { const out = []; for (const sc of scenes()) sc.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine) && o.material && o.visible) out.push(o); }); return out; };
  const FLAGS = ['plantClip', 'fish', 'fishCard', 'solid', 'frost', 'sub', 'room', 'card', 'post', 'plain', 'glow', 'cached', 'aq'];
  const bucketOf = o => {
    const m = [].concat(o.material)[0], u = m.userData ?? {};
    const f = FLAGS.filter(k => u[k] && k !== 'cached' && k !== 'aq');
    return (f.join('+') || m.type) + (m.transparent ? ' (transparent)' : '');
  };
  const tris = o => { const g = o.geometry; if (!g) return 0; const n = g.index ? g.index.count : g.attributes.position?.count ?? 0; return o.isMesh ? Math.round(n / 3 * (o.count ?? 1)) : 0; };
  return {
    gpuName() { const g = gl(), d = g.getExtension('WEBGL_debug_renderer_info'); return { renderer: d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER), timerQuery: !!ext, buffer: [g.drawingBufferWidth, g.drawingBufferHeight], pixelRatio: v().renderer.getPixelRatio() }; },
    async settle(ms = 1200) { await new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 3; i++) await raf(); },
    memory() { const i = v().renderer.info; return { geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? null }; },
    /** Steady draw: n frames of viewer.draw() (no build), one timer query each. */
    async steady(n) {
      for (let i = 0; i < 5; i++) { v().draw(); await raf(); }
      const info = v().renderer.info, auto = info.autoReset; info.autoReset = false;
      const gpu = [], cpu = [], calls = [], tri = [];
      for (let i = 0; i < n; i++) {
        info.reset(); const c0 = __perf.calls;
        const t = timed(() => v().draw());
        calls.push(__perf.calls - c0); tri.push(info.render.triangles); cpu.push(t.cpu);
        await raf(); gpu.push(await resolve(t.q));
      }
      info.autoReset = auto;
      return { gpu: med(gpu), gpuMin: +Math.min(...gpu.filter(x => x != null)).toFixed(2), cpu: med(cpu), calls: med(calls), triangles: med(tri), samples: gpu.filter(x => x != null).length };
    },
    /** Full rebuild + draw, warm caches: CPU of build + draw, time until the pixels are there, GPU. */
    async rebuild(n = 3) {
      const cpu = [], wall = [], gpu = [];
      for (let i = 0; i < n; i++) {
        await raf(); v().rebuild();
        const t0 = performance.now(), t = timed(() => v().draw()); sync();
        wall.push(performance.now() - t0); cpu.push(t.cpu); gpu.push(await resolve(t.q));
      }
      return { cpu: med(cpu), wall: med(wall), gpu: med(gpu), build: v().lastBuild.join(' / ') };
    },
    /** Every incrementalCheck edit, `rounds` times on the same scene: median per edit. */
    async edits(rounds) {
      const ic = await import('/src/render/incrementalCheck.ts'), out = {};
      v().incremental = true;
      for (let r = 0; r < rounds; r++) for (const [name, fn] of ic.edits()) {
        await raf(); await raf();
        const t0 = performance.now(); fn(st()); const t1 = performance.now();
        const t = timed(() => v().draw()); sync(); const t2 = performance.now();
        const o = out[name] ??= { store: [], draw: [], total: [], gpu: [], build: '' };
        o.store.push(t1 - t0); o.draw.push(t.cpu); o.total.push(t2 - t0); o.gpu.push(await resolve(t.q)); o.build = v().lastBuild.join(' / ');
      }
      for (const k in out) for (const f of ['store', 'draw', 'total', 'gpu']) out[k][f] = med(out[k][f]);
      return out;
    },
    /** Shader buckets of what is on screen: meshes, triangles. */
    buckets() {
      const b = {};
      for (const o of meshes()) { const k = bucketOf(o); (b[k] ??= { meshes: 0, triangles: 0 }); b[k].meshes++; b[k].triangles += tris(o); }
      return b;
    },
    /** A/B with alternating frames: setA / setB run before their frame. Paired difference = median of (B - A) per pair. */
    async ab(setA, setB, pairs) {
      const A = [], B = [], d = [], cA = [], cB = [];
      for (let i = 0; i < 4; i++) { (i % 2 ? setB : setA)(); v().draw(); await raf(); }
      for (let i = 0; i < pairs; i++) {
        setA(); const a = timed(() => v().draw()); await raf(); const ga = await resolve(a.q);
        setB(); const b = timed(() => v().draw()); await raf(); const gb = await resolve(b.q);
        A.push(ga); B.push(gb); cA.push(a.cpu); cB.push(b.cpu); if (ga != null && gb != null) d.push(gb - ga);
      }
      setA();
      return { gpuA: med(A), gpuB: med(B), delta: med(d), cpuA: med(cA), cpuB: med(cB), cpuDelta: +((med(cB) ?? 0) - (med(cA) ?? 0)).toFixed(2) };
    },
    /** Cost of each bucket: shown (A) vs hidden (B), alternate frames. Positive = what hiding it saves. */
    async bucketCosts(pairs) {
      const groups = {};
      for (const o of meshes()) (groups[bucketOf(o)] ??= []).push(o);
      const out = {};
      for (const [k, list] of Object.entries(groups)) {
        const r = await this.ab(() => { for (const o of list) o.visible = true; }, () => { for (const o of list) o.visible = false; }, pairs);
        out[k] = { meshes: list.length, saves: r.delta == null ? null : +(-r.delta).toFixed(2), gpuShown: r.gpuA, cpuSaves: +(-r.cpuDelta).toFixed(2) };
      }
      return out;
    },
    /** Programs in use with what they draw: three's program cache keys of the materials on screen. */
    programs() { return (v().renderer.info.programs ?? []).map(p => ({ name: p.name, usedTimes: p.usedTimes, key: String(p.cacheKey).slice(0, 60) })); },
  };
};

// ---------- servers ----------
log(`measuring ${execSync('git rev-parse --short HEAD').toString().trim()} (build ${execSync('git rev-list --count HEAD').toString().trim()})`);
const loadBefore = machineLoad(); log('machine load:', JSON.stringify(loadBefore));
const dev = await createServer({ root: process.cwd(), server: { port: 5623, strictPort: false }, logLevel: 'error' });
await dev.listen();
const DEV = dev.resolvedUrls.local[0];
log('dev server', DEV);

const br = await launch();
const result = {
  commit: execSync('git rev-parse HEAD').toString().trim(), build: +execSync('git rev-list --count HEAD').toString().trim(),
  dirty: execSync('git status --porcelain -- src').toString().trim() !== '', when: new Date().toISOString(), browser: exe,
  load: { before: loadBefore }, sizes: {}, breakdown: {}, prod: null,
};

/** Open `view` on a fresh page (its scene put in localStorage first, as a returning visitor's autosave). */
async function open(base, view, needHandle = true) {
  await br.s('Page.navigate', { url: base });
  await br.ev(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(sceneText(view))}); 1`);
  if (view === 'split') { // the split scene is planted + store.splitTank(), saved and reopened so the page starts with it
    await br.s('Page.navigate', { url: base }); await waitUp(true);
    await br.ev('__gb.store.splitTank(); __gb.store.saveLocal(); 1');
  }
  await br.s('Page.navigate', { url: base });
  return waitUp(needHandle);
}
async function waitUp(needHandle) {
  for (let i = 0; i < 1200; i++) {
    const r = await br.ev(`(() => { const p = window.__perf; return p && p.firstFrame != null && (${!needHandle} || !!window.__gb) ? { firstDraw: p.firstDraw, firstFrame: p.firstFrame, dcl: performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd ?? null } : null; })()`).catch(() => null);
    if (r) return r;
    await sleep(100);
  }
  throw new Error('page never drew');
}
const heap = async () => { await br.s('HeapProfiler.collectGarbage').catch(() => {}); const h = await br.s('Runtime.getHeapUsage'); return +(h.usedSize / 1048576).toFixed(1); };
const install = () => br.ev(`window.__pb = (${PAGE})(); 1`);

// ---------- per size, per view ----------
let gpuInfo = null;
for (const size of sizes) {
  await br.s('Emulation.setDeviceMetricsOverride', SIZES[size]);
  await br.s('Emulation.setTouchEmulationEnabled', { enabled: SIZES[size].mobile });
  await open(DEV, 'planted'); // warm-up: the dev server transforms every module on the first load
  const rows = result.sizes[size] = {};
  for (const view of VIEWS) {
    log(size, view);
    const up = await open(DEV, view); await install();
    gpuInfo ??= await br.ev('__pb.gpuName()');
    const row = rows[view] = { firstDrawMs: Math.round(up.firstDraw), firstFrameMs: Math.round(up.firstFrame), domContentLoadedMs: up.dcl && Math.round(up.dcl), gpu: await br.ev('__pb.gpuName()') };
    await br.ev('__pb.settle()');
    row.memory = await br.ev('__pb.memory()'); row.heapMB = await heap();
    row.steady = await br.ev(`__pb.steady(${FRAMES})`);
    row.rebuild = await br.ev('__pb.rebuild(3)');
    row.buckets = await br.ev('__pb.buckets()');
    if (!flag('no-edits')) row.edits = await br.ev(`__pb.edits(${ROUNDS})`);
    log(`  gpu ${row.steady.gpu} ms, cpu ${row.steady.cpu} ms, ${row.steady.calls} calls, ${row.steady.triangles} tris; rebuild ${row.rebuild.wall} ms; first frame ${row.firstFrameMs} ms`);
  }
}
result.gpu = gpuInfo;

// ---------- breakdown of the worst views (desktop size) ----------
const worst = BREAK === '0' ? [] : /^\d+$/.test(BREAK)
  ? Object.entries(result.sizes.desktop ?? result.sizes[sizes[0]]).sort((a, b) => (b[1].steady.gpu ?? 0) - (a[1].steady.gpu ?? 0)).slice(0, +BREAK).map(e => e[0])
  : BREAK.split(',');
if (worst.length) {
  await br.s('Emulation.setDeviceMetricsOverride', SIZES[sizes.includes('desktop') ? 'desktop' : sizes[0]]);
  for (const view of worst) {
    log('breakdown', view);
    await open(DEV, view); await install(); await br.ev('__pb.settle()');
    const b = result.breakdown[view] = { buckets: await br.ev(`__pb.bucketCosts(${PAIRS})`), programs: await br.ev('__pb.programs()'), extra: {} };
    for (const x of extraAB) b.extra[x.name] = await br.ev(`__pb.ab(() => { ${x.a} }, () => { ${x.b} }, ${PAIRS})`);
  }
}

// ---------- production build: size, load -> first frame ----------
if (!flag('no-prod')) {
  if (!flag('no-build')) { log('npm run build:single'); execSync('npm run build:single', { stdio: 'ignore' }); }
  const single = 'dist-single/tanklook.html', html = readFileSync(single);
  const assets = existsSync('dist/assets') ? readdirSync('dist/assets').map(f => ({ f, b: readFileSync(join('dist/assets', f)) })) : [];
  const kb = n => Math.round(n / 1024);
  const prod = result.prod = {
    singleKB: kb(html.length), singleGzipKB: kb(gzipSync(html).length),
    assets: assets.map(a => ({ file: a.f, kb: kb(a.b.length), gzipKB: kb(gzipSync(a.b).length) })).sort((a, b) => b.kb - a.kb).slice(0, 12),
    load: {},
  };
  const srv = httpServer((req, res) => {
    if (req.url === '/' || req.url.startsWith('/?')) { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const PROD = `http://127.0.0.1:${srv.address().port}/`;
  for (const size of sizes) {
    await br.s('Emulation.setDeviceMetricsOverride', SIZES[size]);
    prod.load[size] = {};
    for (const view of EXAMPLES) {
      const runs = [];
      for (let i = 0; i < 3; i++) runs.push(await open(PROD, view, false));
      const m = k => runs.map(r => r[k]).sort((a, b) => a - b)[1];
      prod.load[size][view] = { firstDrawMs: Math.round(m('firstDraw')), firstFrameMs: Math.round(m('firstFrame')), domContentLoadedMs: Math.round(m('dcl')), heapMB: await heap() };
    }
    log('prod', size, JSON.stringify(prod.load[size]));
  }
  srv.close();
}

await br.close(); await dev.close();
result.load.after = machineLoad();
result.seconds = Math.round((Date.now() - T0) / 1000);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(result, null, 1));

// ---------- summary ----------
const pad = (s, n) => String(s ?? '-').padStart(n);
console.log(`\nTankLook perf baseline: ${result.commit.slice(0, 7)} (build ${result.build}${result.dirty ? ', src DIRTY' : ''}), ${gpuInfo?.renderer}, timer queries ${gpuInfo?.timerQuery ? 'on' : 'OFF'}`);
console.log(`Load: before cpu ${loadBefore.cpuBusyPct} % (dev ports ${loadBefore.devPorts.join(' ') || 'none'}), after cpu ${result.load.after.cpuBusyPct} %${loadBefore.underLoad || result.load.after.underLoad ? '  -> numbers taken UNDER LOAD' : ''}`);
for (const [size, rows] of Object.entries(result.sizes)) {
  console.log(`\n${size} ${SIZES[size].width}x${SIZES[size].height}: view | GPU ms | CPU ms | calls | tris k | geo/tex/prog | heap MB | first frame ms (dev) | rebuild ms | edit median ms (worst)`);
  for (const [view, r] of Object.entries(rows)) {
    const ed = r.edits ? Object.entries(r.edits) : [], tot = ed.map(e => e[1].total).sort((a, b) => a - b), worstEdit = ed.sort((a, b) => b[1].total - a[1].total)[0];
    console.log(`${view.padEnd(12)}|${pad(r.steady.gpu, 7)} |${pad(r.steady.cpu, 7)} |${pad(r.steady.calls, 6)} |${pad(Math.round(r.steady.triangles / 1000), 6)} | ${`${r.memory.geometries}/${r.memory.textures}/${r.memory.programs}`.padEnd(12)}|${pad(r.heapMB, 7)} |${pad(r.firstFrameMs, 8)} |${pad(r.rebuild.wall, 8)} |${pad(tot[tot.length >> 1]?.toFixed(0), 5)} (${worstEdit ? `${worstEdit[0]} ${worstEdit[1].total.toFixed(0)}` : '-'})`);
  }
}
for (const [view, b] of Object.entries(result.breakdown)) {
  const top = Object.entries(b.buckets).sort((a, b) => (b[1].saves ?? 0) - (a[1].saves ?? 0)).slice(0, 6);
  console.log(`\nbreakdown ${view} (GPU ms saved by hiding, alternating frames): ${top.map(([k, x]) => `${k} ${x.saves} (${x.meshes})`).join(', ')}`);
  for (const [k, x] of Object.entries(b.extra)) console.log(`  ${k}: A ${x.gpuA} / B ${x.gpuB} ms GPU, B - A ${x.delta}; CPU ${x.cpuDelta}`);
}
if (result.prod) {
  console.log(`\nproduction single file ${result.prod.singleKB} KB (${result.prod.singleGzipKB} KB gzip); first frame per example (median of 3):`);
  for (const [size, rows] of Object.entries(result.prod.load)) console.log(`  ${size}: ${Object.entries(rows).map(([v, r]) => `${v} ${r.firstFrameMs}`).join(', ')} ms`);
}
console.log(`\nWritten ${OUT} in ${result.seconds} s.`);
process.exit(0);
