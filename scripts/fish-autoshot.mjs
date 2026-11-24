// Headless build-B fish pictures (method row 58): starts its own vite dev server and headless Chrome, opens /?photoart and runs
// scripts/fish-shots.js for each fish, so no Browser pane, no launch.json server and no hand steps. Shots land in shots/ as usual.
//   node scripts/fish-autoshot.mjs <id>:<tl_mm> [<id>:<tl_mm> ...] [--tag T] [--views side,top] [--url http://localhost:5197/]
// --url reuses a running dev server instead of starting one. Prints one JSON line: {"ok":[files...],"fail":[...]}.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const fish = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))).map(a => { const [id, tl] = a.split(':'); return { id, tl: +tl }; });
if (!fish.length || fish.some(f => !f.id || !(f.tl > 0))) { console.error('usage: node scripts/fish-autoshot.mjs <id>:<tl_mm> ... [--tag T] [--views a,b] [--url U]'); process.exit(2); }
const TAG = opt('--tag') ?? '', VIEWS = opt('--views')?.split(','), sleep = ms => new Promise(r => setTimeout(r, ms));
const VPORT = 6800 + Math.floor(Math.random() * 150), CPORT = VPORT + 1000;
const BASE = opt('--url') ?? `http://localhost:${VPORT}/`;
const kids = [];
const done = code => { for (const k of kids) { try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(k.pid), '/T', '/F'], { stdio: 'ignore' }) : k.kill(); } catch {} } setTimeout(() => process.exit(code), 800); };
mkdirSync('shots', { recursive: true });

if (!opt('--url')) kids.push(spawn('npx', ['vite', '--port', String(VPORT), '--strictPort'], { stdio: 'ignore', shell: true }));
const up = async (url, ms) => { const t = Date.now(); while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return true; } catch {} await sleep(500); } return false; };
if (!await up(BASE, 60000)) { console.log(JSON.stringify({ ok: [], fail: ['dev server did not start at ' + BASE] })); done(1); }
else {
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${CPORT}`, '--window-size=1400,900',
    '--user-data-dir=' + process.env.TEMP + '/fishshot-' + Date.now(), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
  kids.push(ch);
  let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${CPORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let n = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++n; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.error || !r.result) throw new Error('CDP: ' + JSON.stringify(r.error ?? r).slice(0, 300));   // e.g. a page reload mid-evaluate
    if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  const waitFor = async (expr, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(700); } return false; };
  const ok = [], fail = [];
  // the first navigate after a server start can land on / without the flag (handoff quirk): navigate until the flag is there
  for (let i = 0; i < 3; i++) { await send('Page.navigate', { url: BASE + '?photoart' }); if (await waitFor(`location.search.includes('photoart') && !!window.__gb?.viewer`, 90000)) break; }
  await sleep(4000);
  if (!await ev(`location.search.includes('photoart')`).catch(() => false)) fail.push('page never kept ?photoart');
  else for (const f of fish) {
    try { ok.push(...await ev(`import('/scripts/fish-shots.js').then(m => m.shootFish(${JSON.stringify(f.id)}, ${f.tl}, ${JSON.stringify({ tag: TAG, ...(VIEWS ? { views: VIEWS } : {}) })}))`)); }
    catch (e) { fail.push(f.id + ': ' + e.message); }
  }
  console.log(JSON.stringify({ ok, fail }));
  ws.close(); done(fail.length ? 1 : 0);
}
