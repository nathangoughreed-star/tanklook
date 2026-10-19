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
// Options: --sizes desktop,phone (also desktop2x: 1050x850 at DPR 2, a high-DPI laptop)  --views planted,iwagumi,...,split  --frames 40  --rounds 2 (edit rounds)
//          --shots dir (raw + PNG canvas per view, for a before / after byte diff)  --incremental (incrementalCheck.runAll)
//          --profile-edits 'water colour,light power' (CPU profile of one such edit per breakdown view)  --no-buckets (skip the bucket A/B)
//          --breakdown 3 (worst N views, or a list: planted,iwagumi; 0 = none)  --pairs 30 (A/B frame pairs)
//          (a view may also be a path to a scene .json)  --no-edits  --no-prod  --no-build (measure the existing dist-single/)  --out research/efficiency/E1-baseline.json
//          --shaders --variants file.mjs: compile A/B of the module's edits (default export: { name: fs => fs })
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
const SIZES = { desktop: { width: 1050, height: 850, deviceScaleFactor: 1, mobile: false }, desktop2x: { width: 1050, height: 850, deviceScaleFactor: 2, mobile: false }, phone: { width: 375, height: 812, deviceScaleFactor: 3, mobile: true } };
const sizes = opt('sizes', 'desktop,phone').split(',');
if (flag('shaders') && !argv.includes('--sizes')) sizes.length = 0; // --shaders alone: only the compile A/B
const FRAMES = +opt('frames', 40), ROUNDS = +opt('rounds', 2), PAIRS = +opt('pairs', 30);
const BREAK = opt('breakdown', '3'), OUT = opt('out', 'research/efficiency/E1-baseline.json');
const extraAB = flag('ab') ? (await import(pathToFileURL(opt('ab')).href)).default : [];
const STORAGE_KEY = 'tanklook.scene';
// a view is an example name, 'split' (planted, split), or a path to a scene file (a variant, e.g. an example with a 3D wall)
const sceneText = n => readFileSync(n.endsWith('.json') ? n : `src/examples/${n === 'split' ? 'planted' : n}.json`, 'utf8');
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
  const P = window.__perf = { calls: 0, firstDraw: null, firstFrame: null, shader: { programs: 0, ms: 0, beforeFirstFrame: 0, byCall: {}, slow: [] } };
  // Until the first frame, every WebGL call is timed: on D3D11 (ANGLE -> HLSL) a cold program costs seconds, paid in
  // whichever call first needs the linked program (link status, a uniform lookup, the first draw with it). `byCall` =
  // ms per call name, `slow` = calls over 100 ms with the program in use (three's SHADER_NAME, #defines, app markers).
  const src = new WeakMap(), progInfo = new WeakMap(); let cur = null;
  const info = s => ({ name: (s.match(/#define SHADER_NAME (\S+)/) ?? [])[1] ?? '', len: s.length,
    defines: [...new Set(s.match(/#define (USE_\w+|\w*TRANSMISSION\w*|NUM_CLIPPING_PLANES \d+|ALPHA_TO_COVERAGE)/g) ?? [])].map(d => d.slice(8)),
    marks: ['aqLight', 'aqIrrAbs', 'aqFishFacing', 'vGlassW', 'gritK', 'aqWaterPath', 'aqNoise', 'uClip', 'transmission'].filter(m => s.includes(m)) });
  const orig = []; // restored at the first frame, so the steady numbers carry only the draw-call counter
  const DRAW = new Set(['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']);
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    for (const k of Object.getOwnPropertyNames(C.prototype)) {
      const d = Object.getOwnPropertyDescriptor(C.prototype, k);
      if (!d || typeof d.value !== 'function' || k === 'constructor') continue;
      const f = d.value, draw = DRAW.has(k);
      if (!draw) orig.push([C, k, f]);
      C.prototype[k] = function (...a) {
        if (draw) {
          P.calls++;
          if (P.firstDraw === null) { P.firstDraw = performance.now(); requestAnimationFrame(() => { P.firstFrame = performance.now(); for (const [C2, k2, f2] of orig) C2.prototype[k2] = f2; }); }
        }
        if (k === 'shaderSource') src.set(a[0], a[1]);
        else if (k === 'attachShader') { const s = src.get(a[1]) ?? ''; if (/gl_FragColor|pc_fragColor|out\s+highp\s+vec4/.test(s) || !progInfo.has(a[0])) progInfo.set(a[0], info(s)); }
        else if (k === 'useProgram') cur = a[0];
        else if (k === 'linkProgram') P.shader.programs++;
        if (P.firstFrame !== null) return f.apply(this, a);
        const t = performance.now(), r = f.apply(this, a), dt = performance.now() - t;
        P.shader.beforeFirstFrame += dt; P.shader.byCall[k] = (P.shader.byCall[k] ?? 0) + dt;
        if (dt > 100) P.shader.slow.push({ call: k, ms: Math.round(dt), ...(progInfo.get(a[0] instanceof WebGLProgram ? a[0] : cur) ?? {}) });
        return r;
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
      // plus a drag step of the tallest plant (E2 suspect 12: a plant capped under the lid gets a new height, and so a new
      // cache key, at every step where the ground height changes), three steps per round
      const t0s = s => s.scene.tanks[0], tall = s => t0s(s).items.filter(i => i.kind === 'plant').sort((a, b) => b.size - a.size)[0];
      const drag = ['tall plant drag', s => s.editTank(0, () => { const i = tall(s); if (i) i.x += 3; })];
      for (let r = 0; r < rounds; r++) for (const [name, fn] of [...ic.edits(), drag, drag, drag]) {
        await raf(); await raf();
        const t0 = performance.now(); fn(st()); const t1 = performance.now();
        const t = timed(() => v().draw()); sync(); const t2 = performance.now();
        const o = out[name] ??= { store: [], draw: [], total: [], gpu: [], build: '' };
        if (r === 0) { o.firstTotal = t2 - t0; o.firstBuild = v().lastBuild.join(' / '); }
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
    /**
     * Compile-time A/B of the app's own slowest shader (the one whose fragment source contains `mark`): its source is
     * read back from the live program, each variant (a string edit) is compiled + linked on a separate WebGL2 context
     * with a nonce comment (no cache hit), variants interleaved, `reps` rounds. Only the compile time is measured;
     * a variant need not draw the same picture.
     */
    async shaderAB(mark, variants, reps) {
      const g = gl(), progs = (v().renderer.info.programs ?? []).map(p => p.program);
      const srcs = progs.map(p => { const o = {}; for (const x of g.getAttachedShaders(p)) o[g.getShaderParameter(x, g.SHADER_TYPE) === g.VERTEX_SHADER ? 'vs' : 'fs'] = g.getShaderSource(x); return o; });
      const hits = srcs.filter(o => o.fs?.includes(mark)).sort((a, b) => b.fs.length - a.fs.length);
      if (!hits.length) return { error: `no program contains ${mark}` };
      const base = hits[0], c = document.createElement('canvas').getContext('webgl2'), out = {};
      const compile = (vs, fs) => {
        const n = `
// nonce ${Math.random()}
`, t = performance.now(), p = c.createProgram();
        for (const [type, s] of [[c.VERTEX_SHADER, vs + n], [c.FRAGMENT_SHADER, fs + n]]) { const sh = c.createShader(type); c.shaderSource(sh, s); c.compileShader(sh); c.attachShader(p, sh); }
        c.linkProgram(p); const ok = c.getProgramParameter(p, c.LINK_STATUS), log = ok ? '' : String(c.getProgramInfoLog(p)).slice(0, 200);
        return { ms: performance.now() - t, ok, log };
      };
      for (let r = 0; r < reps; r++) for (const [name, edit] of Object.entries(variants)) {
        const fs = new Function(`return (${edit})`)()(base.fs), x = compile(base.vs, fs);
        const o = out[name] ??= { ms: [], ok: x.ok, log: x.log, changed: fs !== base.fs }; o.ms.push(Math.round(x.ms));
      }
      return { fsLength: base.fs.length, programs: hits.length, variants: out };
    },
    /** n plain draws, a frame apart (for the CPU profiler). */
    async drawLoop(n) { for (let i = 0; i < n; i++) { v().draw(); await raf(); } },
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

let br = await launch();
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
    const r = await br.ev(`(() => { const p = window.__perf; return p && p.firstFrame != null && (${!needHandle} || !!window.__gb) ? { firstDraw: p.firstDraw, firstFrame: p.firstFrame, shaderMs: Math.round(p.shader.beforeFirstFrame), programs: p.shader.programs, slow: p.shader.slow, byCall: Object.fromEntries(Object.entries(p.shader.byCall).filter(e => e[1] > 50).map(([k, ms]) => [k, Math.round(ms)])), dcl: performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd ?? null } : null; })()`).catch(() => null);
    if (r) return r;
    await sleep(100);
  }
  throw new Error('page never drew');
}
const heap = async () => { await br.s('HeapProfiler.collectGarbage').catch(() => {}); const h = await br.s('Runtime.getHeapUsage'); return +(h.usedSize / 1048576).toFixed(1); };
const install = () => br.ev(`window.__pb = (${PAGE})(); 1`);

// ---------- --shaders: compile-time A/B of the slowest shader (the hardscape grit material, 10-22 s cold on D3D11) ----------
if (flag('shaders')) {
  // each variant is a function of the fragment source (sent to the page as its source text)
  const EDGE = 'for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++)';
  // --variants file.mjs: the module's default export (name -> fragment-source edit) instead of these (lane SG)
  const VARIANTS = flag('variants') ? (await import(pathToFileURL(opt('variants')).href)).default : {
    original: s => s,
    'crack loop: runtime bound': s => s.replace('varying vec4 vGrit;', 'varying vec4 vGrit; uniform int gOne;')
      .replace('for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++)', 'for (int z = -1; z <= gOne; z++) for (int y = -1; y <= gOne; y++) for (int x = -1; x <= gOne; x++)'),
    'no cracks (gEdge unused)': s => s.replace('float e = gEdge(q)', 'float e = 1.0'),
    // same picture: the five stone kinds share ONE gStone call (their roughness / cracks picked first), so the
    // compiler inlines gStone (and its unrolled 27-cell crack search) once instead of five times
    'one gStone call (same output)': s => s.replace(/  if \(t == 1\) k = gStone[\s\S]*?\n  \}\n  else if \(t == 6\)/, `  if (t >= 1 && t <= 5) {
    float rough = t == 1 ? 0.25 : t == 2 ? 0.6 : t == 3 ? 1.1 : t == 4 ? 1.4 : 0.4, cracks = t == 1 ? 0.3 : t == 2 ? 1.0 : t == 3 ? 0.6 : t == 4 ? 0.35 : 0.5;
    k = gStone(q, px, rough, cracks);
    if (t == 5) { float e = abs(gN(vec3(p.x * 0.02, p.y * 0.35, p.z * 0.02)) * 2.0 - 1.0), m = smoothstep(0.4, 0.6, gN(p * 0.03 + 4.0)); k *= 1.0 - 0.55 * gLine(e, 0.05) * m; }
  }
  else if (t == 6)`),
    'no grit at all': s => s.replace('diffuseColor.rgb *= gritK();', ''),
  };
  await br.s('Emulation.setDeviceMetricsOverride', SIZES.desktop);
  await open(DEV, 'iwagumi'); await install(); await br.ev('__pb.settle()');
  result.shaderAB = await br.ev(`__pb.shaderAB('gritK', ${JSON.stringify(Object.fromEntries(Object.entries(VARIANTS).map(([k, f]) => [k, String(f)])))}, ${+opt('reps', 2)})`, 1_800_000);
  for (const [k, x] of Object.entries(result.shaderAB.variants ?? {})) log(`shader ${k}: ${x.ms.join(' / ')} ms${x.ok ? '' : ' LINK FAILED ' + x.log}${x.changed || k === 'original' ? '' : ' (edit did not apply)'}`);
  if (result.shaderAB.error) log(result.shaderAB.error);
}

// ---------- per size, per view ----------
let gpuInfo = null;
for (const size of flag('checks-only') ? [] : sizes) { // --checks-only: only --shots / --incremental
  await br.s('Emulation.setDeviceMetricsOverride', SIZES[size]);
  await br.s('Emulation.setTouchEmulationEnabled', { enabled: SIZES[size].mobile });
  await open(DEV, 'planted'); // warm-up: the dev server transforms every module on the first load
  const rows = result.sizes[size] = {};
  for (const view of VIEWS) {
    log(size, view);
    try { await measureView(size, view, rows); } catch (e) { rows[view] = { error: String(e.message) }; log('  FAILED', e.message); }
  }
}
async function measureView(size, view, rows) {
  {
    const up = await open(DEV, view); await install();
    gpuInfo ??= await br.ev('__pb.gpuName()');
    const row = rows[view] = { firstDrawMs: Math.round(up.firstDraw), firstFrameMs: Math.round(up.firstFrame), shaderMs: up.shaderMs, programs: up.programs, domContentLoadedMs: up.dcl && Math.round(up.dcl), gpu: await br.ev('__pb.gpuName()') };
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
const worst = BREAK === '0' || !sizes.length && /^\d+$/.test(BREAK) ? [] : /^\d+$/.test(BREAK)
  ? Object.entries(result.sizes.desktop ?? result.sizes[sizes[0]]).sort((a, b) => (b[1].steady.gpu ?? 0) - (a[1].steady.gpu ?? 0)).slice(0, +BREAK).map(e => e[0])
  : BREAK.split(',');
if (worst.length) {
  await br.s('Emulation.setDeviceMetricsOverride', SIZES[sizes.includes('desktop') ? 'desktop' : sizes[0]]);
  for (const view of worst) {
    log('breakdown', view);
    await open(DEV, view); await install(); await br.ev('__pb.settle()');
    const b = result.breakdown[view] = { buckets: flag('no-buckets') ? null : await br.ev(`__pb.bucketCosts(${PAIRS})`), programs: await br.ev('__pb.programs()'), extra: {} };
    if (!flag('no-buckets')) b.cpuProfile = await profileDraws(60);
    // the slowest edits in the baseline (water colour 120-170 ms, light power 33-41 ms): one edit + its draw, profiled
    // (--profile-edits 'water colour,light power'; lane EF2)
    b.editProfiles = {};
    for (const name of opt('profile-edits', 'water colour').split(',').filter(Boolean)) {
      await open(DEV, view); await install(); await br.ev('__pb.settle()');
      // --idle-ms: a pause before the edit, as a person leaves between clicks (idle-time work, e.g. the light model warm-up, runs)
      if (+opt('idle-ms', 0)) { await sleep(+opt('idle-ms')); b.idleProbe = await br.ev('new Promise(r => requestIdleCallback(d => r(d.timeRemaining()), { timeout: 2000 }))'); }
      b.editProfiles[name] = await profileDraws(1, `(async () => { const ic = await import('/src/render/incrementalCheck.ts'); const e = ic.edits().find(x => x[0] === ${JSON.stringify(name)}); e[1](__gb.store); __gb.viewer.draw(); __gb.viewer.renderer.getContext().readPixels(0, 0, 1, 1, 6408, 5121, new Uint8Array(4)); })()`);
    }
    for (const x of extraAB) b.extra[x.name] = await br.ev(`__pb.ab(() => { ${x.a} }, () => { ${x.b} }, ${PAIRS})`);
    if (extraAB.length) b.extraApplied = await br.ev('window.__abApplied ?? null');
    // --orbit R0: real orbiting through the app's own loop (the camera moves each frame, the loop draws what changed) at pixel ratio R0
    // (3 = a stress stand-in for a weak GPU at the 1050x850 desktop size) and at fractions of it; frame gaps -> fps, plus the
    // sharp frame drawn at R0 once the camera stops (lane P1: the motion-time resolution drop). `--orbit-frost` also sweeps the film swap.
    if (opt('orbit')) {
      const R0 = +opt('orbit');
      b.orbit = await br.ev(`(async () => {
        const v = __gb.viewer, st = __gb.store, raf = () => new Promise(r => requestAnimationFrame(r)), R0 = ${R0}, out = [];
        const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1); };
        for (const f of [1, 0.75, 0.5, 0.375, 0.25]) {
          v.renderer.setPixelRatio(R0 * f); v.invalidate(); for (let i = 0; i < 8; i++) await raf();
          const dt = []; let last = performance.now();
          for (let i = 0; i < 90; i++) { st.cam(c => { c.az += 1.5; }); await raf(); const n = performance.now(); dt.push(n - last); last = n; }
          const m = q(dt, 0.5);
          out.push({ ratio: +(R0 * f).toFixed(2), frameMs: m, p95Ms: q(dt, 0.95), fps: +(1000 / m).toFixed(1) });
        }
        // the sharp frame at rest: back to R0 and draw, wall time until the next frame has been shown
        v.renderer.setPixelRatio(R0); const t0 = performance.now(); v.draw(); await raf(); await raf(); const sharp = +(performance.now() - t0).toFixed(1);
        v.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); v.invalidate(); await raf();
        return { R0, sweep: out, sharpFrameMs: sharp };
      })()`);
    }
    // --governor: checks the viewer's motion-time resolution (lane P1) on real orbiting: no change at the default budget, a step
    // down (never below half) when the budget cannot be held, the full ratio back after rest, a sharp first frame, export at full ratio.
    if (flag('governor')) {
      b.governor = await br.ev(`(async () => {
        const v = __gb.viewer, st = __gb.store, raf = () => new Promise(r => requestAnimationFrame(r)), sleep = ms => new Promise(r => setTimeout(r, ms));
        const orbit = async n => { for (let i = 0; i < n; i++) { st.cam(c => { c.az += 1.5; }); await raf(); } };
        const out = { dpr: devicePixelRatio, base: v.renderer.getPixelRatio() };
        await orbit(90); out.A_default = { ratio: v.renderer.getPixelRatio(), scale: v.govScale, gapEma: +v.govGap.toFixed(1) };
        v.govBudget = 1; await orbit(200); out.B_forcedMisses = { ratio: v.renderer.getPixelRatio(), scale: +v.govScale.toFixed(3) };
        await sleep(400); out.C_afterRest = { ratio: v.renderer.getPixelRatio(), applied: v.govApplied, scaleKept: +v.govScale.toFixed(3) };
        st.cam(c => { c.az += 1.5; }); await raf(); const first = v.renderer.getPixelRatio(); await orbit(5);
        out.D_nextOrbit = { firstFrameRatio: first, laterRatio: v.renderer.getPixelRatio() };
        const im = await createImageBitmap(await v.exportPNG(1)); out.E_export = { exportW: im.width, canvasW: v.renderer.domElement.width, ratioAfter: v.renderer.getPixelRatio() };
        v.adaptive = false; await orbit(5); out.F_adaptiveOff = { ratio: v.renderer.getPixelRatio() };
        v.adaptive = true; v.govBudget = 26; v.govScale = 1; await sleep(400); out.G_reset = { ratio: v.renderer.getPixelRatio() };
        return out; })()`);
    }
    // --ab-shots dir: per --ab entry, the canvas PNG with side a (as shipped) and with side b (the rung), for scoring how different it looks (lane P1)
    if (opt('ab-shots')) {
      const dir = opt('ab-shots'); mkdirSync(dir, { recursive: true });
      const grab = async js => (await br.ev(`(async () => { ${js} for (let i = 0; i < 3; i++) { __gb.viewer.draw(); await new Promise(r => requestAnimationFrame(r)); }
        __gb.viewer.draw(); return __gb.viewer.renderer.domElement.toDataURL('image/png'); })()`)).split(',')[1];
      const vname = view.replace(/[\/:]/g, '_');
      for (const [i, x] of extraAB.entries()) {
        writeFileSync(join(dir, `${vname}__${i}__A.png`), Buffer.from(await grab(x.a), 'base64'));
        writeFileSync(join(dir, `${vname}__${i}__B.png`), Buffer.from(await grab(x.b), 'base64'));
        await br.ev(x.a);
      }
    }
  }
}

// ---------- --shots dir: the canvas of every view (as loaded, and with the water tinted at opacity 0.3), raw RGBA +
// PNG, for a byte diff of before / after a same-picture change (lane EF2). --incremental: incrementalCheck.runAll ----------
if (opt('shots')) {
  const dir = opt('shots'); mkdirSync(dir, { recursive: true });
  await br.s('Emulation.setDeviceMetricsOverride', SIZES[sizes[0] ?? 'desktop']);
  for (const view of VIEWS) for (const [tag, js] of [['as-loaded', ''], ['water-0.3', '__gb.store.editTank(0, t => { t.water.opacity = 0.3; });']]) {
    await open(DEV, view); await install(); await br.ev('__pb.settle()');
    const r = await br.ev(`(async () => { ${js} for (let i = 0; i < 3; i++) { __gb.viewer.draw(); await new Promise(r => requestAnimationFrame(r)); }
      const v = __gb.viewer; v.draw(); const gl = v.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); let b = ''; for (let i = 0; i < px.length; i += 0x8000) b += String.fromCharCode(...px.subarray(i, i + 0x8000));
      return { w, h, raw: btoa(b), png: v.renderer.domElement.toDataURL('image/png') }; })()`);
    const name = `${view.replace(/[\/:]/g, '_')}-${tag}`;
    writeFileSync(join(dir, name + '.rgba'), Buffer.from(r.raw, 'base64'));
    writeFileSync(join(dir, name + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    log('shot', name, r.w + 'x' + r.h);
  }
}
if (flag('incremental')) {
  await br.s('Emulation.setDeviceMetricsOverride', SIZES[sizes[0] ?? 'desktop']);
  await open(DEV, 'planted'); await install(); await br.ev('__pb.settle()');
  result.incremental = await br.ev(`(async () => { const c = await import('/src/render/incrementalCheck.ts'); return c.runAll(__gb.store, __gb.viewer); })()`, 1_800_000);
  log('incrementalCheck', JSON.stringify(result.incremental).slice(0, 2000));
}

/**
 * CPU profile of n steady draws (V8 sampling profiler, 100 us): self and inclusive ms per draw for the top functions
 * (app code by file:line). Times the per-draw CPU suspects (lane E2) in place, without touching the app.
 */
async function profileDraws(n, expr = `__pb.drawLoop(${n})`) {
  await br.s('Profiler.enable'); await br.s('Profiler.setSamplingInterval', { interval: 100 });
  await br.ev('__pb.drawLoop(5)'); await br.s('Profiler.start'); await br.ev(expr);
  const { profile } = await br.s('Profiler.stop'); await br.s('Profiler.disable');
  const byId = new Map(profile.nodes.map(x => [x.id, x])), parent = new Map();
  for (const x of profile.nodes) for (const c of x.children ?? []) parent.set(c, x.id);
  const key = x => { const f = x.callFrame, file = f.url.replace(/^.*?\/src\//, 'src/').replace(/\?.*$/, '').replace(/^.*node_modules\/\.vite\/deps\//, 'deps/'); return `${f.functionName || '(anon)'} ${file ? `${file}:${f.lineNumber + 1}` : ''}`.trim(); };
  const self = new Map(), incl = new Map();
  profile.samples.forEach((id, i) => {
    const dt = (profile.timeDeltas[i] ?? 0) / 1000, seen = new Set();
    self.set(key(byId.get(id)), (self.get(key(byId.get(id))) ?? 0) + dt);
    for (let c = id; c != null; c = parent.get(c)) { const k = key(byId.get(c)); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) ?? 0) + dt); } }
  });
  const top = (m, k) => [...m].filter(([f]) => !/^\((idle|program|garbage collector|root)\)/.test(f)).sort((a, b) => b[1] - a[1]).slice(0, k).map(([f, ms]) => ({ f, msPerDraw: +(ms / n).toFixed(3) }));
  return { draws: n, self: top(self, 30), inclusive: top(incl, 40), gcMsPerDraw: +((self.get('(garbage collector)') ?? 0) / n).toFixed(3) };
}

// ---------- production build: size, load -> first frame ----------
// Load is measured on dist/ served over http (what the site serves). The single file is sized, and flagged when it still
// imports a chunk it did not inline (broken since d67ac73 split three into its own chunk; lane SF fixes the inliner).
if (!flag('no-prod')) {
  if (!flag('no-build')) { log('npm run build:single'); try { execSync('npm run build:single', { stdio: 'ignore' }); } catch { log('build:single failed (the single-file step); measuring dist/'); } }
  const kb = n => Math.round(n / 1024), walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  const files = walk('dist').map(f => ({ file: f.split('\\').join('/').replace(/^dist\//, ''), b: readFileSync(f) }));
  const code = files.filter(f => /\.(js|css|html)$/.test(f.file));
  const single = existsSync('dist-single/tanklook.html') ? readFileSync('dist-single/tanklook.html') : null;
  const prod = result.prod = {
    distKB: kb(files.reduce((a, f) => a + f.b.length, 0)), codeKB: kb(code.reduce((a, f) => a + f.b.length, 0)), codeGzipKB: kb(code.reduce((a, f) => a + gzipSync(f.b).length, 0)),
    files: files.map(f => ({ file: f.file, kb: kb(f.b.length), gzipKB: /\.(js|css|html|json|svg)$/.test(f.file) ? kb(gzipSync(f.b).length) : null })).sort((a, b) => b.kb - a.kb).slice(0, 15),
    single: single && { kb: kb(single.length), gzipKB: kb(gzipSync(single).length), broken: /from\s*["']\.\/[^"']+\.js["']|import\(["']\.\/[^"']+\.js["']\)/.test(single.toString()) },
    load: {},
  };
  const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', webmanifest: 'application/manifest+json', woff2: 'font/woff2' };
  const srv = httpServer((req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html', f = files.find(x => x.file === path);
    if (!f) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.split('.').pop()] ?? 'application/octet-stream', 'cache-control': 'no-store' }); res.end(f.b);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const PROD = `http://127.0.0.1:${srv.address().port}/`;
  // a fresh browser profile: the first example pays the cold shader compiles (D3D11 HLSL) a first-time visitor pays
  await br.close(); br = await launch();
  for (const size of sizes) {
    await br.s('Emulation.setDeviceMetricsOverride', SIZES[size]);
    prod.load[size] = {};
    for (const view of EXAMPLES) {
      const runs = [];
      try { for (let i = 0; i < 3; i++) runs.push(await open(PROD, view, false)); } catch (e) { prod.load[size][view] = { error: String(e.message) }; continue; }
      const m = k => runs.map(r => r[k]).sort((a, b) => a - b)[1];
      prod.load[size][view] = { coldFirstFrameMs: Math.round(runs[0].firstFrame), coldShaderMs: runs[0].shaderMs, coldByCall: runs[0].byCall, coldSlowPrograms: runs[0].slow.sort((a, b) => b.ms - a.ms).slice(0, 12), shaderMs: m('shaderMs'), programs: runs[0].programs, firstDrawMs: Math.round(m('firstDraw')), firstFrameMs: Math.round(m('firstFrame')), domContentLoadedMs: Math.round(m('dcl')), heapMB: await heap() };
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
  const top = Object.entries(b.buckets ?? {}).sort((a, b) => (b[1].saves ?? 0) - (a[1].saves ?? 0)).slice(0, 6);
  console.log(`\nbreakdown ${view} (GPU ms saved by hiding, alternating frames): ${top.map(([k, x]) => `${k} ${x.saves} (${x.meshes})`).join(', ')}`);
  if (b.cpuProfile) console.log(`  CPU self ms per draw: ${b.cpuProfile.self.slice(0, 8).map(x => `${x.f} ${x.msPerDraw}`).join(', ')}`);
  for (const [k, x] of Object.entries(b.extra)) console.log(`  ${k}: A ${x.gpuA} / B ${x.gpuB} ms GPU, B - A ${x.delta}; CPU ${x.cpuDelta}`);
}
if (result.prod) {
  const P = result.prod;
  console.log(`\nproduction dist/ ${P.distKB} KB, code ${P.codeKB} KB (${P.codeGzipKB} KB gzip); single file ${P.single ? `${P.single.kb} KB${P.single.broken ? ' (BROKEN: imports a chunk it did not inline)' : ''}` : 'none'}; first frame on dist/, cold (fresh profile) / warm median of 3, ms:`);
  for (const [size, rows] of Object.entries(P.load)) console.log(`  ${size}: ${Object.entries(rows).map(([v, r]) => `${v} ${r.coldFirstFrameMs}${r.coldShaderMs != null ? ` (shaders ${r.coldShaderMs})` : ''} / ${r.firstFrameMs}`).join(', ')}`);
}
console.log(`\nWritten ${OUT} in ${result.seconds} s.`);
process.exit(0);
