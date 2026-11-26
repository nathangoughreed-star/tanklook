// (fd-waits.mjs, lane FD R165 inventory; same server and launch as fd-trace.mjs)
// `node scripts/fd-waits.mjs --dirs before=<dist>,after=dist [--net lte|slow4g|none] [--cpu 4] [--rounds 3] [--view betta-bowl] [--out file.json]`
// Cold load of the NEW shell (lane FD, 2026-11-25; cold-ab.mjs measures ?ui=1 only), fresh profile each load, network throttled over CDP.
// Per load: ms to the shell on screen (body.ui2), ms to the first tank part (performance mark "tank part 0" / "tank at once"), and the
// bytes (encoded, over the wire) fetched before each of those, split into JS+CSS, fish art (/art/fish/) and other.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const DIRS = opt('dirs', 'dist').split(',').map(s => { const [n, p] = s.includes('=') ? s.split('=') : [s, s]; return { name: n, dir: p }; });
const NETS = { lte: { down: 12e6 / 8, up: 5e6 / 8, lat: 70 }, slow4g: { down: 1.6e6 / 8, up: 0.75e6 / 8, lat: 150 }, none: null };
const NET = NETS[opt('net', 'lte')], CPU = +opt('cpu', 1), ROUNDS = +opt('rounds', 3), VIEW = opt('view', 'betta-bowl'), OUT = opt('out', null);
const SHOTS = opt('shots', null);
const [W, H] = opt('size', '1050x850').split('x').map(Number);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', webmanifest: 'application/manifest+json', woff2: 'font/woff2' };
for (const d of DIRS) {
  const srv = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html', f = join(d.dir, p);
    if (p === '__none') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>blank</title>'); return; }
    if (p.includes('..') || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
    const ext = p.split('.').pop(), buf = readFileSync(f), gz = ['js', 'css', 'json', 'html', 'svg'].includes(ext);   // gzip like the host does
    res.writeHead(200, { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'no-store', ...(gz ? { 'content-encoding': 'gzip' } : {}) }); res.end(gz ? gzipSync(buf) : buf);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); d.base = `http://127.0.0.1:${srv.address().port}/`; d.srv = srv;
}
const exe = process.env.BROWSER_EXE ?? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);


const PROFILE = opt('profile', 'desktop');   // desktop: no throttle; phone: 390x844 mobile, LTE, 4x CPU
const SCEN = opt('scen', null), DUMP = opt('dump', null);
const click = text => `(() => { const q = [...document.querySelectorAll('button, [role=button], [role=tab], a, summary')].filter(b => b.offsetParent !== null || b.getClientRects().length); const t = ${JSON.stringify(text)}; const b = q.find(b => (b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase() === t.toLowerCase()) || q.find(b => (b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase().includes(t.toLowerCase())); if (!b) return 'NOCLICK:' + t; b.click(); return 'ok'; })()`;
const BTNS = `[...document.querySelectorAll('button, [role=tab], [role=button]')].filter(b => b.offsetParent !== null).map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)).filter(Boolean).slice(0, 80).join(' | ')`;
const INST = `(() => { if (window.__w) return; const W = window.__w = { last: 0, lt: [], marks: 0 };
  new MutationObserver(() => { const n = performance.now(); W.last = n; if (W.armed && W.first == null) W.first = n; }).observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) { W.lt.push([e.startTime, e.duration]); W.last = Math.max(W.last, e.startTime + e.duration); } }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  new PerformanceObserver(l => { for (const e of l.getEntries()) { if (/^tank /.test(e.name)) { W.marks++; W.last = Math.max(W.last, e.startTime); } } }).observe({ type: 'mark', buffered: false }); })()`;

async function session(d, scene) {
  const profile = mkdtempSync(join(tmpdir(), 'fdwaits-'));
  const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const pf = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !existsSync(pf); i++) await sleep(100);
  const [port, path] = readFileSync(pf, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); const p = m.id && pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId), ev = async e => (await s('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
  await s('Page.enable'); await s('Runtime.enable'); await s('Network.enable');
  const phone = PROFILE === 'phone';
  await s('Emulation.setDeviceMetricsOverride', phone ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true } : { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await s('Page.navigate', { url: d.base + '__none' }); await sleep(300);
  if (scene) await ev(`localStorage.setItem('tanklook.scene', ${JSON.stringify(readFileSync(`src/examples/${scene}.json`, 'utf8'))}); 1`);
  await s('Page.addScriptToEvaluateOnNewDocument', { source: `(${INST.replace(/^\(\(\) => /, '(() => ')})` });
  if (phone) { await s('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: 12e6 / 8, uploadThroughput: 5e6 / 8 }); await s('Emulation.setCPUThrottlingRate', { rate: 4 }); }
  await s('Page.navigate', { url: d.base });
  // ready: shell up and the first reveal over
  let ok = false;
  for (let i = 0; i < 1500 && !ok; i++) { await sleep(100); ok = await ev(`!!document.getElementById('ui2') && performance.getEntriesByType('mark').some(m => /^tank (complete|at once)/.test(m.name))`).catch(() => false); }
  await sleep(1500);
  return { s, ev, ok, close: async () => { try { await send('Browser.close'); } catch { /* gone */ } proc.kill(); await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } } };
}
// one measured step: click, then wait until `until` (a page expression) is true; without it, until nothing has changed (DOM, long tasks, reveal marks) for 1.2 s.
// first = ms to the first DOM change after the click; ms = ms to `until` (or the last change); lt* = main-thread long tasks (>50 ms) in the window
async function step(b, label, text, until, limit = 120000) {
  await b.ev(`(() => { const W = window.__w; W.first = null; W.armed = true; W.lt = []; performance.clearMarks(); window.__t0 = performance.now(); W.last = window.__t0; })()`);
  const r = text ? await b.ev(click(text)) : 'ok';
  if (r !== 'ok') return { label, error: r };
  const stat = `(() => { const W = window.__w; return { first: W.first == null ? null : Math.round(W.first - window.__t0), lt: W.lt.length, ltMax: Math.round(Math.max(0, ...W.lt.map(x => x[1]))), ltSum: Math.round(W.lt.reduce((a, x) => a + x[1], 0)) }; })()`;
  for (let i = 0; i < limit / 50; i++) {
    await sleep(50);
    const q = await b.ev(until ? `(${until}) ? Math.round(performance.now() - window.__t0) : null` : `(() => { const W = window.__w, n = performance.now(); return n - W.last > 1200 ? Math.round(W.last - window.__t0) : null; })()`).catch(() => null);
    if (q != null) return { label, ms: q, ...(await b.ev(stat)), marks: await b.ev(`performance.getEntriesByType('mark').filter(m => /^tank/.test(m.name)).map(m => m.name.replace('tank ', '') + '@' + Math.round(m.startTime - window.__t0)).join(',')`) };
  }
  return { label, error: 'timeout', ...(await b.ev(stat)) };
}
const REVEALED = `performance.getEntriesByType('mark').some(m => /^tank (complete|at once)/.test(m.name))`;
const VIS = t => `[...document.querySelectorAll('button')].some(b => b.offsetParent !== null && !b.disabled && (b.textContent || '').trim().toLowerCase().includes(${JSON.stringify(t.toLowerCase())}))`;
const T = (label, text, until, limit) => ({ label, text, until, limit });
const GROUPS = {
  'example-planted': { scene: null, steps: [T('(open Example tank list)', 'Example tank', VIS('Planted community')), T('open example: Planted community (to reveal complete)', 'Planted community', REVEALED, 60000)] },
  'example-reef': { scene: null, steps: [T('(open Example tank list)', 'Example tank', VIS('Reef')), T('open example: Reef (to reveal complete)', 'Reef', REVEALED, 60000)] },
  'animal-door': { scene: null, steps: [T('open "From an animal I want" dialog', 'From an animal I want', VIS('Add')), T('pick an animal', 'Add', VIS('Plan a tank')), T('"Plan a tank for these" (to reveal complete)', 'Plan a tank for these', REVEALED, 90000)] },
  'discover': { scene: 'planted', steps: [T('open Discover section', 'Discover', VIS('Explore')), T('pick Explore mode', 'Explore', VIS('Show me an idea')), T('Discover Explore: Show me an idea', 'Show me an idea', VIS('Apply'), 90000), T('Discover: Show another', 'Show another', VIS('Apply'), 90000), T('back to modes', 'All modes', VIS('Whole tank')), T('pick Whole tank mode', 'Whole tank', VIS('Show me three setups')), T('Discover Whole tank: Show me three setups', 'Show me three setups', "document.querySelectorAll('.gal').length >= 3 && " + VIS('Apply'), 120000), T('Apply a Discover setup (to reveal complete, 20 s cap)', 'Apply', REVEALED, 20000)] },
  'picker': { scene: 'planted', steps: [T('open Animals section', 'Animals', VIS('Add')), T('add a fish from the picker (to quiet)', 'Add', null), T('open Plants section', 'Plants', VIS('Add')), T('add a plant (to quiet; plant worker)', 'Add', null), T('open Print section', 'Print', VIS('.txt')), T('export .txt (to quiet)', '.txt', null), T('Compare', 'Compare', null)] },
};
// --dump <scene|none> [--do "Text A;Text B"]: lists the visible buttons, after each click, to find the labels a scenario needs
if (DUMP) {
  const b = await session(DIRS[0], DUMP === 'none' ? null : DUMP);
  console.log('ready', b.ok, '\n', await b.ev(BTNS));
  for (const t of (opt('do', '') || '').split(';').filter(Boolean)) { const r = await step(b, t, t); console.log('>>', JSON.stringify(r), '\n', await b.ev(BTNS)); }
  await b.close(); process.exit(0);
}

const out = [];
for (const [name, g] of Object.entries(GROUPS)) {
  if (SCEN && !SCEN.split(',').includes(name)) continue;
  const b = await session(DIRS[0], g.scene);
  if (!b.ok) { console.log(name, 'never reached ready'); out.push({ group: name, error: 'boot' }); await b.close(); continue; }
  for (const st of g.steps) { const r = await step(b, st.label, st.text, st.until, st.limit); out.push({ group: name, profile: PROFILE, ...r }); console.log(PROFILE, name, JSON.stringify(r)); }
  await b.close();
}
if (OUT) writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), profile: PROFILE, out }, null, 1));
process.exit(0);
