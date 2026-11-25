// Lane PT (R151): headless pictures of the plant leaf textures (run through scripts/lowprio.ps1, HANDOFF "Machine load").
//   node scripts/pt-shots.mjs [port=6151] [shots=pilot:paint:pt_pilot_paint;pilot:lum:pt_pilot_lum;pilot:off:pt_pilot_off] [dump=ref:shots/pt_ref_scene.json]
// Starts a vite server and a headless Edge / Chrome and draws each `scene:mode:name` through scripts/pt-shots.js (pictures land in shots/<name>.png).
// `dump` also saves a scene as json (for scripts/perf-baseline.mjs --views).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const opt = (k, d) => process.argv.slice(2).find(a => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const PORT = +opt('port', 6151), SHOTS = opt('shots', 'pilot:paint:pt_pilot_paint').split(';').filter(Boolean), DUMP = opt('dump', '');
const sleep = ms => new Promise(r => setTimeout(r, ms)), log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const { createServer } = await import('vite');
const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
if (!exe) { console.error('No Edge or Chrome found; set BROWSER_EXE.'); process.exit(1); }
const dev = await createServer({ root: process.cwd(), server: { port: PORT, strictPort: true }, logLevel: 'error' });
await dev.listen();
const profile = mkdtempSync(join(tmpdir(), 'pt-'));
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
  for (const sh of SHOTS) { const [scene, mode, name] = sh.split(':'); log(await ev(`import('/scripts/pt-shots.js').then(m => m.shot(${JSON.stringify(name)}, ${JSON.stringify(scene)}, ${JSON.stringify(mode)}))`)); }
  if (DUMP) { const [scene, file] = DUMP.split(':'); const json = await ev(`import('/scripts/pt-shots.js').then(async m => { await m.load(${JSON.stringify(scene)}, 'paint'); return JSON.stringify(window.__gb.store.scene); })`); (await import('node:fs')).writeFileSync(file, json); log('scene saved', file); }
} finally { try { proc.kill(); } catch { /* gone */ } await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } try { await dev.close(); } catch { /* gone */ } }
process.exit(0);
