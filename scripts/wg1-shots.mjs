// Lane WG1: headless pictures of the stand, grain on / off (HANDOFF "Machine load": run through scripts/lowprio.ps1).
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/wg1-shots.mjs [tank="40 gal breeder"] [stops=2,4] [port=6110] [cam=zoom,el,az]
// Starts a vite server and a headless Edge / Chrome, draws each stop through scripts/wg1-shots.js (its pictures land in shots/og2_<tank>_stop<n>.png).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const opt = (k, d) => process.argv.slice(2).find(a => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const PORT = +opt('port', 6110);
const sleep = ms => new Promise(r => setTimeout(r, ms)), log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const { createServer } = await import('vite');
const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
if (!exe) { console.error('No Edge or Chrome found; set BROWSER_EXE.'); process.exit(1); }
const dev = await createServer({ root: process.cwd(), server: { port: PORT, strictPort: true }, logLevel: 'error' });
await dev.listen();
const profile = mkdtempSync(join(tmpdir(), 'wg1-'));
const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
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
  await s('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false });
  const ev = async (expression, timeout = 300_000) => {
    const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(`page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  await s('Page.navigate', { url: `http://localhost:${PORT}/` });
  for (let i = 0; i < 300; i++) { if (await ev('!!window.__gb && !!window.__gb.viewer').catch(() => false)) break; await sleep(400); }
  await sleep(3000);
  for (const [f, g, o] of JSON.parse(opt('jobs', opt('jobsfile') ? (await import('node:fs')).readFileSync(opt('jobsfile'), 'utf8') : '[["oak",true],["oak",false],["black",true],["white",true]]'))) log(JSON.stringify(await ev(`import('/scripts/wg1-shots.js').then(m => m.shot(${JSON.stringify(f)}, ${g}, ${JSON.stringify(o ?? {})}))`)));
} finally { try { proc.kill(); } catch { /* gone */ } await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } try { await dev.close(); } catch { /* gone */ } }
process.exit(0);
