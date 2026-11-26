// `node scripts/fd-trace.mjs --dirs before=<dist>,after=dist [--net lte|slow4g|none] [--cpu 4] [--rounds 3] [--view betta-bowl] [--out file.json]`
// Cold load of the NEW shell (lane FD, 2026-11-25; cold-ab.mjs measures ?ui=1 only), fresh profile each load, network throttled over CDP.
// Per load: ms to the shell on screen (body.ui2), ms to the first tank part (performance mark "tank part 0" / "tank at once"), and the
// bytes (encoded, over the wire) fetched before each of those, split into JS+CSS, fish art (/art/fish/) and other.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const DIRS = opt('dirs', 'dist').split(',').map(s => { const [n, p] = s.includes('=') ? s.split('=') : [s, s]; return { name: n, dir: p }; });
const NETS = { lte: { down: 12e6 / 8, up: 5e6 / 8, lat: 70 }, slow4g: { down: 1.6e6 / 8, up: 0.75e6 / 8, lat: 150 }, none: null };
const NET = NETS[opt('net', 'lte')], CPU = +opt('cpu', 1), ROUNDS = +opt('rounds', 3), VIEW = opt('view', 'betta-bowl'), OUT = opt('out', null);
const [W, H] = opt('size', '1050x850').split('x').map(Number);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', webmanifest: 'application/manifest+json', woff2: 'font/woff2' };
for (const d of DIRS) {
  const srv = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html', f = join(d.dir, p);
    if (p === '__none') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>blank</title>'); return; }
    if (p.includes('..') || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[p.split('.').pop()] ?? 'application/octet-stream', 'cache-control': 'no-store' }); res.end(readFileSync(f));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); d.base = `http://127.0.0.1:${srv.address().port}/`; d.srv = srv;
}
const exe = process.env.BROWSER_EXE ?? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);

async function load(d) {
  const profile = mkdtempSync(join(tmpdir(), 'fdtrace-'));
  const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const pf = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !existsSync(pf); i++) await sleep(100);
  const [port, path] = readFileSync(pf, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(), events = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } } else events.push({ ...m, t: performance.now() }); };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  try {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId), ev = async e => (await s('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
    await s('Page.enable'); await s('Runtime.enable'); await s('Network.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: d.base + '__none' }); await sleep(300);
    await ev(`localStorage.setItem('tanklook.scene', ${JSON.stringify(readFileSync(`src/examples/${VIEW}.json`, 'utf8'))}); 1`);
    await s('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const T = window.__t = { shell: null }; new MutationObserver(() => { if (T.shell == null && document.getElementById('ui2')) T.shell = performance.now(); }).observe(document, { childList: true, subtree: true }); })()` });
    if (NET) await s('Network.emulateNetworkConditions', { offline: false, latency: NET.lat, downloadThroughput: NET.down, uploadThroughput: NET.up });
    if (CPU > 1) await s('Emulation.setCPUThrottlingRate', { rate: CPU });
    events.length = 0;
    const t0 = Date.now(); await s('Page.navigate', { url: d.base }); const nav0 = performance.now();
    let r = null;
    for (let i = 0; i < 1200 && !r; i++) {
      await sleep(100);
      r = await ev(`(() => { const m = performance.getEntriesByType('mark').filter(x => /^tank (part|at once)/.test(x.name)); const T = window.__t; return T && m.length ? { shell: T.shell, part0: m[0].startTime, name: m[0].name } : null; })()`).catch(() => null);
    }
    const reqs = new Map();
    for (const e of events) {
      const p = e.params;
      if (e.method === 'Network.requestWillBeSent') reqs.set(p.requestId, { url: p.request.url, t: e.t - nav0 });
      else if (e.method === 'Network.loadingFinished') { const q = reqs.get(p.requestId); if (q) { q.done = e.t - nav0; q.bytes = p.encodedDataLength; } }
    }
    const kind = u => /\/art\/fish\//.test(u) ? 'fish' : /\.(js|css)(\?|$)/.test(u) ? 'jscss' : 'other';
    const sum = (until, k) => Math.round([...reqs.values()].filter(q => q.done != null && q.done <= until && (!k || kind(q.url) === k)).reduce((a, q) => a + q.bytes, 0) / 1024);
    if (!r) return { error: 'no tank part in 120 s', ms: Date.now() - t0 };
    // the page clock and this process's clock differ: the shell / part times are on the page's clock, request times on the navigation's; align by the first request
    const first = [...reqs.values()][0]?.t ?? 0, off = 0 * first;
    const shell = r.shell, part0 = r.part0;
    return { shellMs: Math.round(shell), partMs: Math.round(part0), partName: r.name, kbBeforeShell: { jscss: sum(shell + off, 'jscss'), fish: sum(shell + off, 'fish'), all: sum(shell + off) }, kbBeforePart: { jscss: sum(part0 + off, 'jscss'), fish: sum(part0 + off, 'fish'), all: sum(part0 + off) }, fishFiles: [...reqs.values()].filter(q => kind(q.url) === 'fish').length };
  } finally { try { await send('Browser.close'); } catch { /* gone */ } proc.kill(); await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } }
}
const runs = [];
for (let r = 0; r < ROUNDS; r++) for (const d of (r % 2 ? [...DIRS].reverse() : DIRS)) {
  const x = await load(d); runs.push({ round: r, build: d.name, ...x });
  console.log(`r${r} ${d.name} [${opt('net', 'lte')} cpu${CPU}]:`, JSON.stringify(x));
}
if (OUT) writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), net: opt('net', 'lte'), cpu: CPU, view: VIEW, runs }, null, 1));
const med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s[s.length >> 1]; };
for (const d of DIRS) { const rs = runs.filter(x => x.build === d.name && !x.error); console.log(`median ${d.name}: shell ${med(rs.map(x => x.shellMs))} ms, first part ${med(rs.map(x => x.partMs))} ms, KB before shell ${med(rs.map(x => x.kbBeforeShell?.all))} (fish ${med(rs.map(x => x.kbBeforeShell?.fish))}), KB before part ${med(rs.map(x => x.kbBeforePart?.all))} (fish ${med(rs.map(x => x.kbBeforePart?.fish))})`); }
process.exit(0);
