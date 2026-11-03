// Lane ED1: the default environment (room light 0.05, wall, person, camera) vs the old generated default, on six looks. Writes PNGs to out=DIR (old-N.png / new-N.png).
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/ed1-shots.mjs out=DIR [port=6121]
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const opt = (k, d) => process.argv.slice(2).find(a => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const OUT = opt('out', '.'), PORT = +opt('port', 6121);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { createServer } = await import('vite');
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const dev = await createServer({ root: process.cwd(), server: { port: PORT, strictPort: true }, logLevel: 'error' }); await dev.listen();
const profile = mkdtempSync(join(tmpdir(), 'ed1-'));
const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--no-first-run', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
  const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); const p = m.id && pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: 1300, height: 800, deviceScaleFactor: 1, mobile: false });
  const ev = async (expression, timeout = 120_000) => { const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  await s('Page.navigate', { url: `http://localhost:${PORT}/` });
  for (let i = 0; i < 300; i++) { if (await ev('!!window.__gb && !!window.__gb.viewer').catch(() => false)) break; await sleep(400); }
  await sleep(3000);
  // only the 3D view: hide the dialog and panels, then clip to the biggest canvas
  await ev(`(() => { const st = document.createElement('style'); st.textContent = 'body * { visibility: hidden !important } canvas { visibility: visible !important }'; document.head.appendChild(st); })()`);
  const CASES = [['sps-reef', 'reef'], ['planted-community', 'planted'], ['dart-frog-rainforest', 'terrarium'], ['blackwater-creek', 'blackwater'], ['planted-community', 'darktint'], ['overgrown-garden', 'opentop']];
  for (let n = 0; n < CASES.length; n++) for (const env of ['new', 'old']) {
    const [arch, tag] = CASES[n];
    const setup = `(async () => {
      const R = await import('/src/scene/recipes.ts'), T = await import('/src/data/tanks.ts'), D = await import('/src/scene/defaults.ts'), { store } = window.__gb;
      const terr = ${JSON.stringify(tag)} === 'terrarium', tank = terr ? T.TANK_MODELS.filter(m => m.terrarium).sort((a, b) => b.variants?.[0]?.L_in - a.variants?.[0]?.L_in)[0] : T.TANK_MODELS.find(m => m.name === '40 gal breeder' && !m.terrarium);
      const S = R.stopScene(R.recipeBase(${JSON.stringify(arch)}, tank), 2);
      if (${JSON.stringify(tag)} === 'darktint') { S.water.color = '#3f5f3a'; S.water.opacity = 0.35; }
      if (${JSON.stringify(env)} === 'old') { const d = D.defaultSetup(); S.light.room = d.light.room; S.wall = d.wall; S.person = d.person; S.stand.finish = d.stand.finish; S.camera = { ...S.camera, az: 0, el: 0, zoom: 1 }; }
      store.edit(t => { for (const k of Object.keys(t)) delete t[k]; Object.assign(t, structuredClone(S)); });
      return { room: S.light.room, light: S.light.type, lid: S.lid, color: S.water.color, op: S.water.opacity };
    })()`;
    const info = await ev(setup);
    await sleep(7000);
    const r = await ev(`(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0].getBoundingClientRect(); return { x: c.x, y: c.y, width: c.width, height: c.height }; })()`);
    const shot = await s('Page.captureScreenshot', { format: 'png', clip: { ...r, scale: 1 } });
    writeFileSync(join(OUT, `${env}-${n}-${tag}.png`), Buffer.from(shot.data, 'base64'));
    console.log(env, tag, JSON.stringify(info));
  }
} finally { try { proc.kill(); } catch {} await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch {} try { await dev.close(); } catch {} }
process.exit(0);
