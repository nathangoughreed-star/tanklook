// `node scripts/vf-shots.mjs`: pictures and numbers for plan VF (visual fidelity; lane VF-A, 2026-11-11).
// Run it through scripts/lowprio.ps1 (HANDOFF "Machine load"):
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/vf-shots.mjs --fx "none;tonemap:agx;tonemap:aces"
// The three reference tanks (research/visual/vf0/scenes: planted 4 ft, rimless nano, reef bow-front) have their camera,
// light and seeds locked in the file. Per tank and per fx set (render/fx.ts syntax, sets separated by ';'), three
// pictures: the front view, a close-up of the substrate (front centre) and a close-up of the largest rock / wood.
// The fx sets are switched in the page (__fx.set), so every set draws the very same scene.
// Numbers, per tank: GPU ms (timer query around viewer.draw()), CPU ms and p95, draw calls, triangles, for each fx set
// against the first one with ALTERNATING frames (memory perf-ab-alternate-frames: sequential blocks lie on this machine).
//
// Options: --fx "none;all"   --scenes planted4,nano,reef (names in the scenes dir, or .json paths)   --dir research/visual/vf0 (not --out: lowprio.ps1 would take it)
//          --views front,ground,rock,plant:grass (plant:<variant> = a close-up of the front-most one; lane VF-B)
//          --times 7.3,7.8,8.3   shoot each view at these caustic-clock times (a strip of the motion)
//          --size 1050x850   --pairs 40   --no-shots   --no-numbers   --sheet (one side-by-side PNG per tank and view)
//          --rest 20 [--throttle 4]   tank left alone / orbiting / idle for 20 s per fx set, normal CPU and 4x slower (caustic safeguards)
//          --measure   (lane ART1) per-plant-variant S / L / S>0.8 share / low-vs-top darkening, pass / fail against the gates, into vf-shots.json
//          --plant "on=1,sat=0.9,glow=1"   (lane ART1) plant tone constants / the PT glow switch, set at load through ?plant= (dev server only)
//          --differs-from <dir>   exit 4 if any picture is byte-identical to the same-named one in <dir> (a switch that did nothing)
//          --abplant "on=0|on=1"   (lane ART1) frame-time A/B of two plant specs on alternating frames (--pairs N)
//          --anchors   (lane ART1) list every string-anchored shader patch that matched nothing (exit code 3 if any)
//          --perf   also run scripts/perf-baseline.mjs on the tanks (steady draw, programs, first frame) into <out>/perf-baseline.json
//          --cold <dist dir>   also run scripts/cold-ab.mjs: cold first frame (program link) of <dist dir> (before) vs a fresh `npm run build` (after)
// Headless Edge / Chrome on the hardware GPU (--use-angle=d3d11), as perf-baseline.mjs.
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createServer } from 'vite';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const flag = k => argv.includes('--' + k);
const SCENE_DIR = 'research/visual/vf0/scenes';
const SCENES = opt('scenes', 'planted4,nano,reef').split(',').map(s => (s.endsWith('.json') ? s : `${SCENE_DIR}/${s}.json`));
const FXSETS = opt('fx', 'none').split(';').map(s => s.trim()).filter(Boolean);
const TIMES = opt('times', '') ? opt('times', '').split(',').map(Number) : [null];
const OUT = opt('dir', 'research/visual/vf0'), PAIRS = +opt('pairs', 40);
const [W, H] = opt('size', '1050x850').split('x').map(Number);
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0).padStart(4)} s]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tag = fx => fx.replace(/(^|[,;])-/g, '$1no-').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'none';
mkdirSync(OUT, { recursive: true });

// ---------- browser over the DevTools protocol (as perf-baseline.mjs) ----------
const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'];
const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'vfshots-'));
  const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
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
  const ev = async (expression, timeout = 300_000) => {
    const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(`page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  return { s, ev, close: async () => { try { await send('Browser.close'); } catch { /* gone */ } proc.kill(); await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } } };
}

// ---------- in-page kit ----------
const KIT = () => {
  const v = () => __gb.viewer, st = () => __gb.store, gl = () => v().renderer.getContext();
  // the saved front camera, read once: store.cam() writes into the scene's camera, so after a close-up S.camera.zoom is the
  // close-up's (the second fx set's front view came out zoomed in; lanes VF-B and VF-C, 2026-11-12)
  const front0 = structuredClone(st().scene.tanks[0].camera);
  const pans = {}; // the close-ups' pan, found once per view and reused for every fx set (the first set's centring came out apart)
  const WL_GAP = 25; // scene/physics WATERLINE_GAP (the 'line' close-up)
  const ext = gl().getExtension('EXT_disjoint_timer_query_webgl2');
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  const q = (a, p) => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2) : null; };
  const resolve = async qq => {
    if (!qq) return null; const g = gl();
    for (let i = 0; i < 300; i++) {
      if (g.getQueryParameter(qq, g.QUERY_RESULT_AVAILABLE)) { const bad = g.getParameter(ext.GPU_DISJOINT_EXT), ns = g.getQueryParameter(qq, g.QUERY_RESULT); g.deleteQuery(qq); return bad ? null : ns / 1e6; }
      await raf();
    }
    return null;
  };
  let calls = 0; // draw calls, counted on the context
  const g0 = gl(); for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const f = g0[k].bind(g0); g0[k] = (...a) => { calls++; return f(...a); }; }
  const frame = () => {
    const g = gl(); let qq = null; const c0 = calls, info = v().renderer.info; info.autoReset = false; info.reset();
    if (ext) { qq = g.createQuery(); g.beginQuery(ext.TIME_ELAPSED_EXT, qq); }
    const t = performance.now(); v().draw(); const cpu = performance.now() - t;
    if (qq) g.endQuery(ext.TIME_ELAPSED_EXT);
    info.autoReset = true;
    return { cpu, qq, calls: calls - c0, tris: info.render.triangles };
  };
  const fxOf = spec => __fx.parse(spec, __fx.parse('none'));
  const zoom0 = st().scene.tanks[0].camera.zoom; // the saved view's zoom (close-ups change the live one)
  __fx.time?.(7.3); // caustics (VF5) frozen at one moment: every picture and A/B frame shows the same pattern
  return {
    async settle(ms = 1500) {
      for (let i = 0; i < 600 && (v().reveal || v().needsBuild); i++) await raf();
      await new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 4; i++) { v().draw(); await raf(); }
    },
    async setFx(spec) { __fx.set(fxOf(spec)); await this.settle(300); },
    /** The canvas after a few draws (preserveDrawingBuffer is off: read in the same task as the draw). */
    async shot() { for (let i = 0; i < 3; i++) { v().draw(); await raf(); } v().draw(); return v().renderer.domElement.toDataURL('image/png'); },
    /** Camera: 'front' (as saved), 'ground' (front centre of the substrate), 'rock' (the largest stone or wood), 'line' (the water line on the front glass), 'under' (the water's underside, looking up from below it). */
    async view(kind) {
      const S = st().scene.tanks[0], T = S.tank;
      st().cam(c => { if (kind === 'front') Object.assign(c, front0); else if (kind === 'under') Object.assign(c, front0, { el: -28, zoom: 2.6 }); else if (kind.startsWith('at:')) { const a = kind.slice(3).split('/').map(Number); c.zoom = a[3] ?? 3; if (a[4] != null) c.az = a[4]; if (a[5] != null) c.el = a[5]; } else c.zoom = kind === 'ground' ? 3.2 : kind === 'line' ? 4 : 2.6; }, 0);
      v().setPan(0, 0, 0); v().draw(); await raf();
      if (kind === 'front') return;
      // ('plant:<variant>', lane VF-B: the front-most plant of that variant, its middle)
      const pv = kind.startsWith('plant:') && kind.slice(6), hs = pv ? S.items.filter(i => i.kind === 'plant' && i.variant === pv).sort((a, b) => a.depth - b.depth)[0] : S.items.filter(i => i.kind === 'stone' || i.kind === 'wood').sort((a, b) => b.size - a.size)[0];
      // 'line' (VF6): the water line on the front glass, a third of the way along
      const P = kind.startsWith('at:') ? (a => [a[0], a[1], -a[2]])(kind.slice(3).split('/').map(Number)) : kind === 'under' ? [T.L / 2, S.water.level * (T.H - WL_GAP), -T.D / 2] : kind === 'line' ? [T.L * 0.3, S.water.level * (T.H - WL_GAP), 0] : kind === 'ground' || !hs ? [T.L / 2, (S.substrate.fl + S.substrate.bl) / 2 + T.H * 0.18, -T.D * 0.3] : [hs.x, hs.size * (pv ? 0.45 : 0.25), -hs.depth];
      const vp = v().active[0];
      if (pans[kind]) { v().setPan(0, ...pans[kind]); v().draw(); await raf(); return; }
      for (let k = 0; k < 4; k++) { // pan until P is in the middle of the picture
        v().draw(); const p = new vp.cam.position.constructor(...P).project(vp.cam);
        const sx = (p.x + 1) / 2 * vp.w, sy = (1 - p.y) / 2 * vp.h, pan = v().pans[0];
        v().setPan(0, pan.x + (vp.w / 2 - sx), pan.y + (vp.h / 2 - sy));
      }
      pans[kind] = [v().pans[0].x, v().pans[0].y];
      v().draw(); await raf();
    },
    /** fx set B against set A on alternating frames: GPU ms median / p95, CPU ms median / p95, calls, triangles. */
    async ab(specA, specB, pairs) {
      const A = fxOf(specA), B = fxOf(specB), r = { A: { gpu: [], cpu: [] }, B: { gpu: [], cpu: [] }, d: [] };
      for (let i = 0; i < 6; i++) { __fx.set(i % 2 ? B : A); v().draw(); await raf(); }
      let cA = 0, cB = 0, tA = 0, tB = 0;
      for (let i = 0; i < pairs; i++) {
        __fx.set(A); const a = frame(); await raf(); const ga = await resolve(a.qq);
        __fx.set(B); const b = frame(); await raf(); const gb = await resolve(b.qq);
        r.A.gpu.push(ga); r.B.gpu.push(gb); r.A.cpu.push(a.cpu); r.B.cpu.push(b.cpu); cA = a.calls; cB = b.calls; tA = a.tris; tB = b.tris;
        if (ga != null && gb != null) r.d.push(gb - ga);
      }
      __fx.set(A);
      const sum = (x, c, t) => ({ gpuMs: q(x.gpu, 0.5), gpuP95: q(x.gpu, 0.95), cpuMs: q(x.cpu, 0.5), cpuP95: q(x.cpu, 0.95), calls: c, triangles: t });
      return { A: sum(r.A, cA, tA), B: sum(r.B, cB, tB), gpuDelta: q(r.d, 0.5), gpuDeltaP95: q(r.d, 0.95), timer: !!ext };
    },
    /**
     * The tank left alone (or orbiting) for `secs` with fx `spec`, the caustic clock running (not frozen): draws per second,
     * CPU busy (% of one core, the draw calls only), GPU busy (% of the GPU, timer query per draw), the loop's frame gap
     * median / p95 (ms), and what the caustic motion ended up doing (viewer.causState: moving / still and why).
     * `idle`: pretend the last input was a minute ago (the idle pause).
     */
    async rest(spec, secs, orbit, idle) {
      __fx.time(null); __fx.set(fxOf(spec)); v().causReset(); v().noteInput();
      await this.settle(300);
      const V = v(), orig = V.draw; let n = 0, cpu = 0; const qs = [];
      V.draw = function () { const g = gl(); let qq = null; if (ext) { qq = g.createQuery(); g.beginQuery(ext.TIME_ELAPSED_EXT, qq); } const t = performance.now(); orig.call(V); cpu += performance.now() - t; if (qq) { g.endQuery(ext.TIME_ELAPSED_EXT); qs.push(qq); } n++; };
      if (idle) V.lastInput = performance.now() - 61_000;
      const gaps = [], az0 = st().scene.tanks[0].camera.az, t0 = performance.now(); let last = t0;
      try {
        while (performance.now() - t0 < secs * 1000) {
          await raf(); const now = performance.now(); gaps.push(now - last); last = now;
          if (orbit) { st().cam(c => { c.az = az0 + 25 * Math.sin((now - t0) / 1000); }, 0); V.noteInput(); }
        }
      } finally { delete V.draw; }
      const el = (performance.now() - t0) / 1000;
      let gpu = 0, ok = 0; for (const qq of qs) { const ms = await resolve(qq); if (ms != null) { gpu += ms; ok++; } }
      if (orbit) { st().cam(c => { c.az = az0; }, 0); await this.settle(200); }
      __fx.time(7.3);
      return { drawsPerS: +(n / el).toFixed(1), cpuBusyPct: +(cpu / el / 10).toFixed(1), gpuBusyPct: ok ? +((gpu / ok) * n / el / 10).toFixed(1) : null, gpuMsPerDraw: ok ? +(gpu / ok).toFixed(2) : null, gapMed: q(gaps, 0.5), gapP95: q(gaps, 0.95), caustics: V.causState() };
    },
    /**
     * ART1: plant colour per variant (HSV S, Rec.709 luma L of the sRGB pixels, 0..1), as rendered. A plant's pixels = those that change when
     * its meshes are hidden (the same draw, same light), so occlusion, haze and glass are all in. Per variant: pixel count, median S and L,
     * share of pixels above S 0.8, and 'low' = median L of the lowest third of the plant's pixel rows minus the top third's, as a share
     * of the top third's (negative = darker near the substrate; the gate wants at most -15 %).
     */
    async measure() {
      const px = async () => { const u = await this.shot(); const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; }); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
      const items = new Map(st().scene.tanks[0].items.map(i => [i.id, i.variant])), meshes = [];
      for (const vp of v().vps) vp.scene?.traverse(o => { if (o.userData.plant && items.has(o.userData.item)) meshes.push(o); });
      const A = await px(), out = {}, variants = [...new Set(meshes.map(m => items.get(m.userData.item)))];
      const med = a => { if (!a.length) return null; const s = Float32Array.from(a).sort(); return s[s.length >> 1]; };
      for (const va of [...variants, '*']) {
        const hid = meshes.filter(m => va === '*' || items.get(m.userData.item) === va);
        hid.forEach(m => { m.visible = false; }); const B = await px(); hid.forEach(m => { m.visible = true; });
        const S = [], L = [], rows = []; let hi = 0;
        for (let i = 0; i < A.data.length; i += 4) {
          const dr = A.data[i] - B.data[i], dg = A.data[i + 1] - B.data[i + 1], db = A.data[i + 2] - B.data[i + 2];
          if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) < 24) continue;
          const r = A.data[i] / 255, g = A.data[i + 1] / 255, b = A.data[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0;
          S.push(s); L.push(0.2126 * r + 0.7152 * g + 0.0722 * b); rows.push((i >> 2) / A.width | 0); if (s > 0.8) hi++;
        }
        const n = S.length; let low = null;
        if (n > 300) { const ys = [...rows].sort((a, b) => a - b), y0 = ys[0], y1 = ys[n - 1], top = [], bot = []; rows.forEach((y, k) => { const f = (y - y0) / Math.max(1, y1 - y0); if (f < 1 / 3) top.push(L[k]); else if (f > 2 / 3) bot.push(L[k]); }); const t = med(top), b = med(bot); low = t && b ? +((b - t) / t).toFixed(3) : null; }
        out[va] = { px: n, medS: n ? +med(S).toFixed(3) : null, medL: n ? +med(L).toFixed(3) : null, pctS80: n ? +(hi / n).toFixed(3) : null, bottomVsTop: low };
      }
      return out;
    },
    /** ART1 --plant "sat=0.9,exposure=0.55,low=0.55,glow=1": set the plant tone constants (items.ts PLANT_TONE) and the PT glow switch, recompile the plant materials. */
    /* (lighting's progKey replaces a material's own cache key: userData.ng is the part of it a material can still vary, so the plant materials get it) */
    async plant(spec) {
      const T = globalThis.__plantTone, F = globalThis.__plantFx;
      for (const kv of spec.split(',').filter(Boolean)) { const [k, x] = kv.split('='); if (k === 'glow') F.glow = x === '1'; else T[k] = +x; }
      for (const vp of v().vps) vp.scene?.traverse(o => { if (o.userData.plant && o.material) { o.material.userData.ng = JSON.stringify([T, F.glow]); o.material.needsUpdate = true; } });
      await this.settle(300);
    },
    /**
     * ART1 --anchors: every string-anchored shader patch that finds nothing. All materials are recompiled (needsUpdate re-runs every onBeforeCompile) with
     * String.prototype.replace watched: a string or RegExp pattern that leaves a shader source (anything with `void main`) unchanged is a missing anchor.
     */
    async anchors() {
      const orig = String.prototype.replace, miss = new Map();
      String.prototype.replace = function (p, r) {
        const src = String(this), out = orig.call(src, p, r); 
        if (out === src && (typeof p === 'string' || p instanceof RegExp) && src.includes('void main')) {
          const fr = (new Error().stack || '').split('\n').slice(2, 7).map(l => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\/(src\/)?/, '').replace(/\?t=\d+/, ''));
          if (/node_modules/.test(fr.find(l => !/String\.replace/.test(l)) ?? '')) return out; // three's own replaces
          const k = String(p).slice(0, 110) + ' @ ' + (fr.find(l => !/String\.replace|lighting\.ts.*aqPatch$/.test(l) && /\.ts/.test(l)) ?? fr[0]);
          miss.set(k, (miss.get(k) ?? 0) + 1);
        }
        return out;
      };
      const saved = [];
      try {
        const seen = new Set(); // (three runs onBeforeCompile only for a program it has not cached: the key is changed for this pass)
        for (const vp of v().vps) vp.scene?.traverse(o => { for (const m of [].concat(o.material ?? [])) if (!seen.has(m)) { seen.add(m); const k0 = m.customProgramCacheKey; m.customProgramCacheKey = function () { return (k0 ? k0.call(this) : '') + '|anchors'; }; m.needsUpdate = true; saved.push([m, k0]); } });
        for (let i = 0; i < 3; i++) { v().draw(); await raf(); }
      } finally { String.prototype.replace = orig; for (const [m, k0] of saved) { m.customProgramCacheKey = k0; m.needsUpdate = true; } }
      return [...miss.entries()];
    },
    /** ART1: plant spec B against plant spec A (`--plant` syntax, plus on=0) on alternating frames: GPU ms median / p95 of each and the paired delta. */
    async abPlant(a, b, pairs) {
      const T = globalThis.__plantTone, F = globalThis.__plantFx, base = { ...T, glow: F.glow };
      const set = spec => { Object.assign(T, base); F.glow = base.glow; for (const kv of spec.split(',').filter(Boolean)) { const [k, x] = kv.split('='); if (k === 'glow') F.glow = x === '1'; else T[k] = +x; } for (const vp of v().vps) vp.scene?.traverse(o => { if (o.userData.plant && o.material) { o.material.userData.ng = JSON.stringify([T, F.glow]); o.material.needsUpdate = true; } }); };
      const r = { A: [], B: [], d: [], ca: [], cb: [] };
      for (let i = 0; i < 6; i++) { set(i % 2 ? b : a); v().draw(); await raf(); }
      for (let i = 0; i < pairs; i++) {
        set(a); v().draw(); await raf(); const fa = frame(); await raf(); const ga = await resolve(fa.qq);
        set(b); v().draw(); await raf(); const fb = frame(); await raf(); const gb = await resolve(fb.qq);
        r.A.push(ga); r.B.push(gb); if (ga != null && gb != null) r.d.push(gb - ga);
      }
      set(a);
      return { A: q(r.A, 0.5), B: q(r.B, 0.5), A95: q(r.A, 0.95), B95: q(r.B, 0.95), delta: q(r.d, 0.5), delta95: q(r.d, 0.95), n: r.d.length };
    },
    gpu() { const g = gl(), d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); },
    /** Side-by-side sheet of data URLs with labels (drawn in the page: no image library needed). */
    async sheet(urls, labels, title) {
      const ims = await Promise.all(urls.map(u => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = u; })));
      const w = ims[0].width, h = ims[0].height, pad = 34, c = document.createElement('canvas');
      c.width = w * ims.length; c.height = h + pad * 2; const x = c.getContext('2d');
      x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#eee'; x.font = '20px sans-serif';
      x.fillText(title, 10, 24);
      ims.forEach((im, i) => { x.drawImage(im, i * w, pad); x.fillText(labels[i], i * w + 10, pad + h + 24); });
      return c.toDataURL('image/png');
    },
  };
};

// ---------- run ----------
const commit = execSync('git rev-parse --short HEAD').toString().trim(), build = +execSync('git rev-list --count HEAD').toString().trim();
const dirty = execSync('git status --porcelain -- src').toString().trim() !== '';
log(`vf-shots at ${commit} (build ${build}${dirty ? ', src dirty' : ''}); fx sets: ${FXSETS.join(' | ')}`);
const dev = await createServer({ root: process.cwd(), server: { port: 6031, strictPort: false }, logLevel: 'error' });
await dev.listen();
const BASE = dev.resolvedUrls.local[0];
const PLANT_Q = opt('plant', '') ? '&plant=' + encodeURIComponent(opt('plant', '').split(',').map(kv => kv.replace('=', ':')).join(';')) : ''; // --plant is read by the app at load (items.ts), the real path
const br = await launch();
await br.s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: +(process.env.DPR ?? 1), mobile: false });
const result = { commit, build, dirty, when: new Date().toISOString(), size: [W, H], fx: FXSETS, gpu: null, scenes: {} };
const save = (file, url) => writeFileSync(join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
try {
  for (const file of SCENES) {
    const name = basename(file, '.json'); log(name);
    await br.s('Page.navigate', { url: BASE + '?ui=1' + PLANT_Q });
    for (let i = 0; i < 300 && !(await br.ev('document.readyState === "complete"').catch(() => false)); i++) await sleep(100);
    await br.ev(`localStorage.setItem('tanklook.scene', ${JSON.stringify(readFileSync(file, 'utf8'))}); 1`);
    // Performance setting back to Full quality, held (auto off): an automatic step-down in one tank's throttled orbit would
    // otherwise carry into the next tank (it is saved in the browser) and stop the caustics there
    await br.ev(`localStorage.setItem('tanklook.perf', '{"level":0,"auto":false}'); 1`);
    await br.s('Page.navigate', { url: BASE + '?ui=1' + PLANT_Q });
    for (let i = 0; i < 1200 && !(await br.ev('!!(window.__gb && window.__fx && __gb.viewer)').catch(() => false)); i++) await sleep(100);
    await br.ev(`window.__vf = (${KIT})(); 1`);
    await br.ev('__vf.settle(2500)');
    result.gpu ??= await br.ev('__vf.gpu()');
    if (opt('abplant', '')) { const [a, b] = opt('abplant', '').split('|'); await br.ev('__vf.view("front")'); const r = (result.abPlant ??= {})[name] = await br.ev(`__vf.abPlant(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${PAIRS})`, 900_000); log(`  plant A/B [${a}] -> [${b}]: GPU ${r.A} -> ${r.B} ms (paired delta ${r.delta}, p95 ${r.delta95}, n ${r.n})`); }
    if (flag('anchors')) { const m = (result.anchors ??= {})[name] = await br.ev('__vf.anchors()'); for (const [k, n] of m) log(`  MISSING ANCHOR x${n}: ${k}`); log(`  ${name}: ${m.length} missing shader anchor(s)`); if (m.length) process.exitCode = 3; }
    const row = result.scenes[name] = { shots: [], ab: {} };
    if (!flag('no-shots')) {
      const grid = {}, labels = {};
      for (const fx of FXSETS) {
        await br.ev(`__vf.setFx(${JSON.stringify(fx)})`);
        if (opt('pre', '')) { const r = await br.ev(opt('pre', '')); if (r != null) log('pre:', JSON.stringify(r).slice(0, 3000)); } // --pre "<js>": debug hook run in the page after each fx set (viewer = __gb.viewer)
        for (const view of opt('views', 'front,ground,rock').split(',')) {
          await br.ev(`__vf.view(${JSON.stringify(view)})`);
          for (const t of TIMES) { // --times: the caustic clock frozen at each (a strip of the motion); else the fixed 7.3 s
            if (t != null) await br.ev(`__fx.time(${t})`);
            const url = await br.ev('__vf.shot()'), f = `${name}-${view.replace(/[:/]/g, '-')}-${tag(fx)}${t != null ? `-t${t}` : ''}.png`;
            save(f, url); row.shots.push(f); (grid[view] ??= []).push(url); (labels[view] ??= []).push(t != null ? `${fx} @ ${t} s` : fx);
          }
          if (TIMES[0] != null) await br.ev('__fx.time(7.3)');
        }
      }
      await br.ev('__vf.view("front")');
      if (flag('sheet') && (FXSETS.length > 1 || TIMES.length > 1)) for (const [view, urls] of Object.entries(grid)) {
        save(`sheet-${name}-${view.replace(":", "-")}.png`, await br.ev(`__vf.sheet(${JSON.stringify(urls)}, ${JSON.stringify(labels[view])}, ${JSON.stringify(`${name} ${view} (build ${build} ${commit})`)})`, 600_000));
      }
    }
    if (flag('measure')) { // ART1: plant colour per variant against the gates (green median S <= 0.60 and L <= 0.45, <= 15 % of pixels above S 0.8, >= 15 % darker low than high)
      await br.ev('__vf.view("front")'); await br.ev('__vf.setFx(' + JSON.stringify(FXSETS[0]) + ')');
      const m = row.measure = await br.ev('__vf.measure()', 600_000), G = { S: 0.60, L: 0.45, hi: 0.15, low: -0.15 };
      for (const [va, r] of Object.entries(m)) {
        const bad = r.px < 300 ? 'too few pixels' : [r.medS > G.S && 'S', r.medL > G.L && 'L', r.pctS80 > G.hi && 'S>0.8 share', (r.bottomVsTop == null || r.bottomVsTop > G.low) && 'no low darkening'].filter(Boolean).join(', ');
        log(`  ${name} ${va === '*' ? 'ALL plants' : va.padEnd(10)} px ${String(r.px).padStart(6)}  S ${r.medS}  L ${r.medL}  S>0.8 ${r.pctS80}  low-vs-top ${r.bottomVsTop}  ${bad ? 'FAIL: ' + bad : 'pass'}`);
      }
    }
    if (opt('rest', '')) { // --rest SECS [--throttle N]: at rest, orbiting, idle; each fx set; normal CPU and N x slower
      const secs = +opt('rest', '20'), rates = [1, +opt('throttle', '4')].filter((x, i, a) => a.indexOf(x) === i);
      await br.ev('__vf.view("front")');
      row.rest = [];
      for (const rate of rates) {
        await br.s('Emulation.setCPUThrottlingRate', { rate });
        for (const fx of FXSETS) for (const mode of ['rest', 'orbit', 'idle']) {
          const r = await br.ev(`__vf.rest(${JSON.stringify(fx)}, ${secs}, ${mode === 'orbit'}, ${mode === 'idle'})`, 900_000);
          row.rest.push({ rate, fx, mode, ...r });
          log(`  cpu x${rate} ${fx} ${mode}: ${r.drawsPerS} draws/s, CPU ${r.cpuBusyPct} %, GPU ${r.gpuBusyPct} % (${r.gpuMsPerDraw} ms/draw), frame gap ${r.gapMed} / p95 ${r.gapP95} ms; caustics ${r.caustics.why} @${r.caustics.rate}/s (cpu ${r.caustics.cpuMs}, gap ${r.caustics.gapMs})`);
        }
      }
      await br.s('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
    if (!flag('no-numbers')) {
      await br.ev('__vf.view("front")');
      const sets = FXSETS.length > 1 ? FXSETS.slice(1) : [FXSETS[0]];
      for (const fx of sets) {
        row.ab[fx] = await br.ev(`__vf.ab(${JSON.stringify(FXSETS[0])}, ${JSON.stringify(fx)}, ${PAIRS})`, 900_000);
        const a = row.ab[fx];
        log(`  ${FXSETS[0]} -> ${fx}: GPU ${a.A.gpuMs} -> ${a.B.gpuMs} ms (paired delta ${a.gpuDelta}, p95 ${a.gpuDeltaP95}); CPU p95 ${a.A.cpuP95} -> ${a.B.cpuP95}; calls ${a.A.calls} -> ${a.B.calls}`);
      }
    }
  }
} finally {
  writeFileSync(join(OUT, 'vf-shots.json'), JSON.stringify(result, null, 1));
  await br.close(); await dev.close();
}
log(`wrote ${join(OUT, 'vf-shots.json')}`);
// --differs-from <dir>: every picture written here must differ from the same-named one there (a variant that comes out identical to its neighbour = a switch that did nothing)
if (opt('differs-from', '')) {
  let same = 0;
  for (const row of Object.values(result.scenes)) for (const f of row.shots) { const o = join(opt('differs-from', ''), f); if (existsSync(o) && readFileSync(o).equals(readFileSync(join(OUT, f)))) { log(`IDENTICAL to ${o}: ${f}`); same++; } }
  if (same) { log(`${same} picture(s) identical to ${opt('differs-from', '')}: the variant did nothing`); process.exit(4); }
  log(`all pictures differ from ${opt('differs-from', '')}`);
}

// ---------- optional: the existing perf and cold-load scripts on the same tanks ----------
const run = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' }); p.on('exit', c => (c ? rej(new Error(`${cmd} exit ${c}`)) : res())); });
if (flag('perf')) await run('node', ['scripts/perf-baseline.mjs', '--views', SCENES.join(','), '--sizes', 'desktop', '--no-edits', '--no-prod', '--breakdown', '0', '--out', join(OUT, 'perf-baseline.json')]);
if (opt('cold')) {
  await run('npm', ['run', 'build']);
  await run('node', ['scripts/cold-ab.mjs', '--dirs', `before=${opt('cold')},after=dist`, '--views', SCENES.join(','), '--rounds', '3', '--out', join(OUT, 'cold-ab.json')]);
}
process.exit(0);
