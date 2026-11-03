// `node scripts/wt1-render.mjs --before <checkout of the old code> [--pairs 40] [--out shots]` (lane WT1, 2026-11-03):
// the water-tint review pictures (Nathan's blackwater cube, a reef, a paludarium) from the old checkout and this one, saved to
// <out>/wt1_<case>_<before|after>.png, and the GPU cost of both builds on the blackwater cube as a paired A/B on ALTERNATING
// frames (one draw in each build's page in turn; GPU timer queries, so the shared machine's CPU noise does not enter).
// One headless Edge / Chrome (hardware GPU, ANGLE d3d11), one page per build, run through scripts/lowprio.ps1. Changes no app code.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const BEFORE = resolve(opt('before', '.')), AFTER = process.cwd(), PAIRS = +opt('pairs', 40), OUT = opt('out', 'shots');
const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const builds = [{ name: 'before', root: BEFORE, port: 5441 }, { name: 'after', root: AFTER, port: 5442 }];
for (const b of builds) { b.srv = await createServer({ root: b.root, configFile: join(b.root, 'vite.config.ts'), server: { port: b.port, strictPort: false }, logLevel: 'warn' }); await b.srv.listen(); b.url = b.srv.resolvedUrls.local[0]; }
const profile = mkdtempSync(join(tmpdir(), 'wt1-'));
const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const portFile = join(profile, 'DevToolsActivePort');
for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); const p = m.id && pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
async function page(url) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' }), { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable'); await s('Emulation.setDeviceMetricsOverride', { width: 1050, height: 850, deviceScaleFactor: 1, mobile: false });
  await s('Page.navigate', { url });
  const ev = async (expression, timeout = 300000) => { const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  for (let i = 0; i < 200; i++) { if (await ev('typeof window.__gb').catch(() => '') === 'object') break; await sleep(300); }
  return { ev, s, targetId, front: () => s('Page.bringToFront') };
}

// the scene builders run in the page (the same code on both builds)
const LIB = `(() => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ex = async name => { const { SCENES } = await import('/src/examples/scenes.ts'), { parseScene } = await import('/src/scene/validate.ts'); __gb.store.replace(parseScene(JSON.parse(SCENES[name])).scene); };
  const scape = async (id, kind, tank, extra = () => {}) => {
    const { store } = __gb, S = await import('/src/scene/starter.ts'), G = await import('/src/scene/scapeground.ts');
    await ex(kind);
    store.edit(s => { s.tank = { ...tank }; s.fish = []; s.items = []; s.layout = { id, seed: 1, dens: { hard: 2, plant: 2, animal: 3 } }; extra(s); G.styleGround(s); S.regenerate(s, 'all', 1000); });
    await wait(6000);
  };
  const CASES = {
    cube: () => scape('blackwater', 'planted', { L: 304.8, D: 304.8, H: 304.8 }, s => Object.assign(s.water, { color: '#6b3d14', opacity: 0.42 })),
    reef: () => scape('reef', 'reef', { L: 609.6, D: 304.8, H: 406.4 }),
    paludarium: () => scape('paludarium', 'planted', { L: 609.6, D: 457.2, H: 609.6 }, s => { s.water.on = true; s.water.level = 0.42; Object.assign(s.water, { color: '#6b3d14', opacity: 0.42 }); }),
  };
  const b64 = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(String(f.result).split(',')[1]); f.readAsDataURL(blob); });
  const gl = () => __gb.viewer.renderer.getContext(), ext = () => gl().getExtension('EXT_disjoint_timer_query_webgl2');
  window.__wt = {
    async shot(name, az = 0, el = 8, zoom = 1.1) {
      await CASES[name](); __gb.store.cam(c => { c.az = az; c.el = el; c.zoom = zoom; }); __gb.store.select(null);
      await __gb.viewer.buildNow?.(); await __gb.viewer.exportPNG(1); await wait(300); return b64(await __gb.viewer.exportPNG(1));
    },
    async gpu() { // one draw's GPU ms (null if the timer was disjoint)
      const g = gl(), e = ext(), q = g.createQuery(); g.beginQuery(e.TIME_ELAPSED_EXT, q); __gb.viewer.draw(); g.endQuery(e.TIME_ELAPSED_EXT);
      for (let i = 0; i < 400; i++) { if (g.getQueryParameter(q, g.QUERY_RESULT_AVAILABLE)) { const bad = g.getParameter(e.GPU_DISJOINT_EXT), ns = g.getQueryParameter(q, g.QUERY_RESULT); g.deleteQuery(q); return bad ? null : ns / 1e6; } await wait(4); }
      return null;
    },
    prep: async name => { await CASES[name](); __gb.store.cam(c => { c.az = 0; c.el = 8; c.zoom = 1.1; }); await __gb.viewer.buildNow?.(); for (let i = 0; i < 5; i++) { __gb.viewer.draw(); await wait(30); } },
  };
  return 'ok';
})()`;

const pages = {};
try {
  for (const b of builds) { pages[b.name] = await page(b.url); await pages[b.name].ev(LIB); }
  for (const b of builds) for (const c of ['cube', 'reef', 'paludarium']) {
    await pages[b.name].front(); const png = await pages[b.name].ev(`__wt.shot(${JSON.stringify(c)})`);
    writeFileSync(join(OUT, `wt1_${c}_${b.name}.png`), Buffer.from(png, 'base64')); console.log('saved', `wt1_${c}_${b.name}.png`);
  }
  // paired A/B on alternating frames, the blackwater cube in both builds
  for (const b of builds) { await pages[b.name].front(); await pages[b.name].ev(`__wt.prep('cube')`); }
  const med = a => { const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); const m = s.length >> 1; return s.length ? +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(3) : null; };
  const A = [], B = [], D = [];
  for (let i = 0; i < PAIRS; i++) {
    const first = i % 2 ? 'after' : 'before', second = first === 'before' ? 'after' : 'before', r = {};
    await pages[first].front(); r[first] = await pages[first].ev('__wt.gpu()'); await pages[second].front(); r[second] = await pages[second].ev('__wt.gpu()');
    A.push(r.before); B.push(r.after); if (r.before != null && r.after != null) D.push(r.after - r.before);
  }
  const res = { pairs: PAIRS, gpuBeforeMs: med(A), gpuAfterMs: med(B), gpuDeltaMs: med(D), valid: D.length };
  console.log('PERF', JSON.stringify(res)); writeFileSync(join(OUT, 'wt1_perf.json'), JSON.stringify(res, null, 1));
} finally {
  try { ws.close(); } catch {}
  proc.kill(); for (const b of builds) await b.srv.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(0);
}


