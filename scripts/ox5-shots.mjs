// Lane OX5: screenshots of the Explore screen, ONE batch only, one browser, one page (HANDOFF "Machine load": run through scripts/lowprio.ps1).
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/ox5-shots.mjs [dir=shots/ox5] [port=6152]
// Drives the real flow: Guided -> World = Open to anything -> Skip Equipment -> Skip Limits -> Explore, waits for the first batch's pictures, reacts to a few cards, then sets a $40 firm budget
// and returns through Adjust constraints for the no-result state. Writes PNGs and a report.json (batch size, picture sizes in kB: a blank frame is about 2 kB).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const opt = (k, d) => process.argv.slice(2).find(a => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const DIR = opt('dir', 'shots/ox5'), PORT = +opt('port', 6152), sleep = ms => new Promise(r => setTimeout(r, ms)), log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
mkdirSync(DIR, { recursive: true });
const { createServer } = await import('vite');
const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
if (!exe) { console.error('No Edge or Chrome found; set BROWSER_EXE.'); process.exit(1); }
const dev = await createServer({ root: process.cwd(), server: { port: PORT, strictPort: true }, logLevel: 'error' });
await dev.listen();
const profile = mkdtempSync(join(tmpdir(), 'ox5-'));
const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const report = { when: new Date().toISOString() };
try {
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
  await s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  const ev = async (expression, timeout = 300_000) => {
    const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(`page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  const until = async (expr, what, ms = 240_000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr).catch(() => false)) return; await sleep(400); } throw new Error('timed out: ' + what); };
  const snap = async name => { const { data } = await s('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(DIR, name), Buffer.from(data, 'base64')); log('saved', name); };
  const D = `document.querySelector('dialog.gs')`;
  const click = (sel, text) => ev(`(() => { const d = ${D}; const b = [...d.querySelectorAll(${JSON.stringify(sel)})].find(b => ${text ? `new RegExp(${JSON.stringify(text)}).test(b.textContent)` : 'true'}); if (!b) return false; b.click(); return true; })()`);

  await s('Page.navigate', { url: `http://localhost:${PORT}/` });
  await until('!!window.__gb && !!window.__gb.viewer', 'app');
  await sleep(3000);   // the app draws its own first frames before the first card (a thumbnail taken in the first moments of a GPU page can be a blank frame)
  await ev(`(() => { document.getElementById('newGo')?.click(); document.getElementById('modeGuided')?.click(); })()`); await sleep(800);
  await until(`!!${D} && ${D}.open`, 'guided dialog');
  await click('button', 'Open to anything'); await sleep(400);
  await click('button', 'Skip for now'); await sleep(400);   // Equipment
  await ev(`setTimeout(() => [...${D}.querySelectorAll('button')].find(b => /Skip for now/.test(b.textContent)).click(), 50)`);   // Limits -> Explore (the pool runs; do not block the page)
  log('explore started');
  await until(`${D}.querySelectorAll('.ex-batch .ex-card').length > 0`, 'first batch');
  report.batchSize = await ev(`${D}.querySelectorAll('.ex-batch .ex-card').length`);
  report.renderer = await ev(`(() => { const gl = window.__gb.viewer.renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info'); return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
  log('batch', report.batchSize, report.renderer);
  // pictures draw lazily as cards come into view: walk the batch
  for (let i = 0; i < report.batchSize; i++) { await ev(`${D}.querySelectorAll('.ex-batch .ex-card')[${i}].scrollIntoView({ block: 'center' })`); await sleep(600); }
  await until(`${D}.querySelectorAll('.ex-batch .ex-shot').length >= ${report.batchSize}`, 'pictures', 400_000).catch(e => log(String(e)));
  report.shotKb = await ev(`[...${D}.querySelectorAll('.ex-batch .ex-shot')].map(i => Math.round(i.src.length * .75 / 1024))`);
  await ev(`${D}.querySelector('.ex-batch').scrollIntoView({ block: 'start' }); ${D}.scrollTop = 0`); await sleep(500);
  await snap('1-first-batch.png');

  // reactions: like (with tags) x2, save, details, pass
  const card = i => `${D}.querySelectorAll('.ex-batch .ex-card')[${i}]`;
  const act = (i, what) => ev(`${card(i)}.querySelector('[data-ex="${what}"]').click()`);
  await act(0, 'like'); await sleep(300);
  await ev(`[...${card(0)}.querySelectorAll('[data-ex="tag"]')].slice(0, 2).forEach(b => b.click())`); await sleep(200);
  await snap('2-like-what-caught-your-eye.png');
  await ev(`${card(0)}.querySelector('[data-ex="tags-done"]').click()`); await sleep(300);
  await act(1, 'like'); await sleep(300); await ev(`[...${card(1)}.querySelectorAll('[data-ex="tag"]')].slice(0, 2).forEach(b => b.click())`); await ev(`${card(1)}.querySelector('[data-ex="tags-done"]').click()`); await sleep(300);
  await act(2, 'save'); await sleep(300);
  await act(3, 'details'); await sleep(300);
  if (report.batchSize > 4) { await act(4, 'pass'); await sleep(300); }
  await ev(`${card(3)}.scrollIntoView({ block: 'center' })`); await sleep(400);
  await snap('3-details-expanded.png');
  await ev(`${D}.querySelector('.ex-interpslot').scrollIntoView({ block: 'center' })`); await sleep(500);
  report.interp = await ev(`${D}.querySelector('.ex-interp')?.innerText ?? ''`);
  report.favourites = await ev(`${D}.querySelectorAll('.ex-fav').length`);
  await snap('4-learned-and-favourites.png');

  // no result: a firm $40 budget set in the brief, then Adjust constraints -> Continue -> Explore again
  await ev(`(async () => { const B = await import('/src/scene/brief.ts'), S = await import('/src/ui/setupBrief.ts'); S.editBrief(b => B.setItem(b, 'constraints.budget', 40, 'hard')); })()`);
  await click('[data-ex="adjust"]'); await sleep(600);
  await ev(`setTimeout(() => [...${D}.querySelectorAll('button')].find(b => /^Continue/.test(b.textContent.trim())).click(), 50)`);
  await until(`!!${D}.querySelector('.ex-none')`, 'no-result state', 300_000);
  await ev(`${D}.querySelector('.ex-none').scrollIntoView({ block: 'center' })`); await sleep(500);
  report.noResult = await ev(`${D}.querySelector('.ex-none').innerText.slice(0, 600)`);
  await snap('5-no-result.png');
  writeFileSync(join(DIR, 'report.json'), JSON.stringify(report, null, 1)); log('report', JSON.stringify(report).slice(0, 400));
  try { await send('Browser.close'); } catch { /* gone */ }
} finally { try { proc.kill(); } catch { /* gone */ } await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } try { await dev.close(); } catch { /* gone */ } }
process.exit(0);
