// `node scripts/cold-ab.mjs --dirs before=<dist dir>,after=dist`: cold first-picture A/B of production builds (lane EF1,
// 2026-10-15). Every load is a FRESH browser profile (a first-time visitor: no GPU program cache), on the hardware GPU
// (headless Edge / Chrome, --use-angle=d3d11). Per round, per example, the builds alternate (and swap order each round),
// so load from other chats lands on both alike. Records navigation -> first frame (the first WebGL draw call + the next
// animation frame) and the ms spent in WebGL calls before it, with the calls over 100 ms (the program: gritK marks the
// hardscape material, "linear" its transmission-pass variant).
// Options: --rounds 3  --views betta-bowl,iwagumi,... (or scene .json paths)  --shots <dir> (a screenshot per view and build, once settled)
//          --probe <page expression> (logged per load)  --wait 1500 (x 100 ms before giving up)  --size 1050x850  --out research/efficiency/EF1-cold-ab.json
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const DIRS = opt('dirs', 'dist').split(',').map(s => { const [n, p] = s.includes('=') ? s.split('=') : [s, s]; return { name: n, dir: p }; });
const VIEWS = opt('views', readdirSync('src/examples').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).join(',')).split(',');
const ROUNDS = +opt('rounds', 3), OUT = opt('out', 'research/efficiency/EF1-cold-ab.json');
const SHOTS = opt('shots', null), PROBE = opt('probe', null);
const [W, H] = opt('size', '1050x850').split('x').map(Number);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0).padStart(4)} s]`, ...a);

// ---------- one static server per build ----------
const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', webmanifest: 'application/manifest+json', woff2: 'font/woff2' };
for (const d of DIRS) {
  if (d.dir.startsWith('http')) { d.base = d.dir; continue; } // a running server (the dev server: --probe can use __gb)
  const srv = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html', f = join(d.dir, p);
    if (p === '__none') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>blank</title>'); return; } // same origin, no app
    if (p.includes('..') || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[p.split('.').pop()] ?? 'application/octet-stream', 'cache-control': 'no-store' }); res.end(readFileSync(f));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  d.base = `http://127.0.0.1:${srv.address().port}/`; d.srv = srv;
}

// ---------- page instrument: time every WebGL call until the first frame ----------
const INSTRUMENT = () => {
  const P = window.__perf = { firstFrame: null, ms: 0, programs: 0, slow: [], settled: 0 };
  // the app's own frames (src/ on the dev server, the main chunk in a build), where a draw or a slow call came from
  const appStack = () => new Error().stack.split('\n').map(l => l.trim()).filter(l => /\/src\/|assets\/(index|main)/.test(l) && !/three/.test(l)).slice(0, 5).map(l => l.replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\//, '(')).join(' < ');
  const src = new WeakMap(), progInfo = new WeakMap(); let cur = null, fb = null; const orig = [];
  const DRAW = new Set(['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']);
  const info = s => ({ len: s.length, marks: ['gritK', 'vGlassW', 'aqLight', 'transmission'].filter(m => s.includes(m)).concat(/return LinearTransferOETF\( vec4/.test(s) ? ['linear'] : []) });
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    for (const k of Object.getOwnPropertyNames(C.prototype)) {
      const d = Object.getOwnPropertyDescriptor(C.prototype, k);
      if (!d || typeof d.value !== 'function' || k === 'constructor') continue;
      const f = d.value, draw = DRAW.has(k); orig.push([C, k, f]); // first frame: a draw into the tank view's canvas #c itself (not an off-screen target, e.g. plant3d uploadPlant)
      C.prototype[k] = function (...a) {
        if (draw && P.first == null && fb === null && this.canvas?.id === 'c') { P.first = performance.now(); P.stack = appStack(); requestAnimationFrame(() => { P.firstFrame = performance.now(); }); }
        if (k === 'shaderSource') src.set(a[0], a[1]);
        else if (k === 'attachShader') { const s = src.get(a[1]) ?? ''; if (/gl_FragColor|pc_fragColor|out\s+highp\s+vec4/.test(s) || !progInfo.has(a[0])) progInfo.set(a[0], info(s)); }
        else if (k === 'useProgram') cur = a[0];
        else if (k === 'bindFramebuffer' && a[0] !== 0x8ca8) fb = a[1]; // not READ_FRAMEBUFFER
        else if (k === 'linkProgram') P.programs++;
        const t = performance.now(), r = f.apply(this, a), dt = performance.now() - t;
        P.ms += dt; if (dt > 20) P.settled = performance.now();
        if (dt > 100) P.slow.push({ call: k, ms: Math.round(dt), at: Math.round(t), stack: appStack(), ...(progInfo.get(a[0] instanceof WebGLProgram ? a[0] : cur) ?? {}) });
        return r;
      };
    }
  }
};

// ---------- the browser over the DevTools protocol (as scripts/perf-baseline.mjs) ----------
const exe = process.env.BROWSER_EXE ?? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'coldab-'));
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
  await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await s('Page.addScriptToEvaluateOnNewDocument', { source: `(${INSTRUMENT})()` });
  const ev = async e => { const r = await s('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); return r.result?.value; };
  return { s, ev, close: async () => { try { await send('Browser.close'); } catch { /* gone */ } proc.kill(); await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } } };
}

async function cold(d, view) {
  const br = await launch();
  try {
    // the scene goes into localStorage on a page of the same origin where the app does not run (__none), so the app's
    // first start is already this example and nothing has warmed the program cache
    await br.s('Page.navigate', { url: d.base + '__none' }); await sleep(300);
    await br.ev(`localStorage.setItem('tanklook.scene', ${JSON.stringify(readFileSync(view.endsWith('.json') ? view : `src/examples/${view}.json`, 'utf8'))}); 1`);
    await br.s('Page.navigate', { url: d.base });
    for (let i = 0; i < +opt('wait', 1500); i++) {
      // done once nothing has linked for 4 s after the first frame: 'settled' = the end of the last WebGL call over 20 ms
      // (a program link), i.e. when the whole picture is up even if the app draws in steps
      const r = await br.ev(`(() => { const p = window.__perf; return p && p.firstFrame != null && performance.now() - Math.max(p.settled, p.firstFrame) > 4000 ? { firstFrame: Math.round(p.firstFrame), settled: Math.round(Math.max(p.settled, p.firstFrame)), glMs: Math.round(p.ms), programs: p.programs, slow: p.slow.sort((a, b) => b.ms - a.ms).slice(0, 6) } : null; })()`).catch(() => null);
      if (r) { if (PROBE) r.probe = await br.ev(PROBE).catch(e => String(e)); if (SHOTS) writeFileSync(`${SHOTS}/${basename(view, '.json')}-${d.name}.png`, Buffer.from((await br.s('Page.captureScreenshot', { format: 'png' })).data, 'base64')); return r; }
      await sleep(100);
    }
    return { error: 'never drew', probe: PROBE ? await br.ev(PROBE).catch(e => String(e)) : undefined };
  } finally { await br.close(); }
}

const result = { at: new Date().toISOString(), size: `${W}x${H}`, dirs: DIRS.map(d => d.name), runs: [] };
for (let r = 0; r < ROUNDS; r++) for (const view of VIEWS) {
  const order = r % 2 ? [...DIRS].reverse() : DIRS;
  for (const d of order) {
    const x = await cold(d, view);
    result.runs.push({ round: r, view, build: d.name, ...x });
    log(`r${r} ${view} ${d.name}${x.probe !== undefined ? ` probe ${JSON.stringify(x.probe)}` : ''}: first frame ${x.firstFrame} ms, settled ${x.settled} ms, GL ${x.glMs} ms, ${x.programs} programs; slow ${(x.slow ?? []).map(s => `${s.ms}${s.marks?.includes('gritK') ? 'G' : ''}${s.marks?.includes('linear') ? 'L' : ''}`).join(' ')}`);
  }
}
writeFileSync(OUT, JSON.stringify(result, null, 1));
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
console.log(`\ncold first frame, median of ${ROUNDS} (ms):`);
for (const view of VIEWS) console.log(`  ${view.padEnd(12)} ${DIRS.map(d => { const xs = result.runs.filter(x => x.view === view && x.build === d.name && x.firstFrame); return `${d.name} ${med(xs.map(x => x.firstFrame))} / ${med(xs.map(x => x.settled))} [${xs.map(x => `${x.firstFrame}/${x.settled}`).join(', ')}]`; }).join('  |  ')}`);
for (const d of DIRS) d.srv?.close();
process.exit(0);
