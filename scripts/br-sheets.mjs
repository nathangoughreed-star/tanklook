// Lane BR: headless frames of the roaming tank (vite dev server + headless Chrome over DevTools), for contact sheets.
//   node scripts/br-sheets.mjs out=research/fable/7-alive/after/raw [port=6120] [jobs=planted,reef,betta,angels]
// Each job writes <out>/<job>_<n>.png (the viewer's own rectangle) and <out>/<job>.json (what it measured in the page).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const opt = (k, d) => process.argv.slice(2).find(a => a.startsWith(k + '='))?.slice(k.length + 1) ?? d;
const PORT = +opt('port', 6120), OUT = opt('out', 'research/fable/7-alive/after/raw'), JOBS = opt('jobs', 'planted,reef,betta,angels').split(',');
const sleep = ms => new Promise(r => setTimeout(r, ms)), log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
mkdirSync(OUT, { recursive: true });
const { createServer } = await import('vite');
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const dev = await createServer({ root: process.cwd(), server: { port: PORT, strictPort: true }, logLevel: 'error' });
await dev.listen();
const profile = mkdtempSync(join(tmpdir(), 'br-'));
const proc = spawn(exe, ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
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
  await s('Emulation.setDeviceMetricsOverride', { width: 1500, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = async (expression, timeout = 300_000) => {
    const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(`page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  // a fresh page per job: loading a second scene into the same page left the roam clock stopped
  const fresh = async () => {
    await s('Page.navigate', { url: `http://localhost:${PORT}/` });
    for (let i = 0; i < 300; i++) { if (await ev('!!window.__gb && !!window.__gb.viewer').catch(() => false)) break; await sleep(400); }
    await sleep(3000);
    await ev(`[...document.querySelectorAll('button')].find(b => /just look around/i.test(b.textContent))?.click()`);
  };
  const shot = async (name) => {
    const r = await ev(`(() => { const r = __gb.viewer.host.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
    const { data } = await s('Page.captureScreenshot', { format: 'png', clip: { x: r[0], y: r[1], width: r[2], height: r[3], scale: 1 } });
    writeFileSync(join(OUT, name + '.png'), Buffer.from(data, 'base64'));
  };
  // load a scene: an example by id (the app's own scene files), then optional edits
  const load = (exId, edit = '') => ev(`(async () => {
    const { exampleScenes } = await import('/src/examples/index.ts'), { parseScene } = await import('/src/scene/validate.ts'), { store, viewer } = __gb;
    const text = (await exampleScenes())[${JSON.stringify(exId)}]; store.replace(parseScene(text).scene);
    ${edit}
    const { perf } = await import('/src/render/perf.ts'); perf.auto = false; perf.level = 0; // a slow headless GPU must not lower the quality and stop the redraw
    store.select(null); viewer.setSwim(true); viewer.dirty = true; await new Promise(r => setTimeout(r, 4000)); return true; })()`);
  // in-page recorder: every 0.5 s, the worst fin height over the water line, pair distance, neon / harlequin mixing, rush counter
  const probe = `(async () => { const { swimFieldFor } = await import('/src/render/swimWorld.ts'); const v = __gb.viewer; const rows = v.drifters.map(m => m.userData.roam);
    const wf = swimFieldFor(rows[0].world), top = wf.field.waterTop, kinds = rows.map(r => r.spec.kind);
    const pos = () => v.drifters.map(m => [m.position.x, m.position.y, m.position.z]);
    const sample = () => { const p = pos(); let worst = -1e9; rows.forEach((r, i) => { worst = Math.max(worst, p[i][1] + (r.spec.tall ?? 0) - top); });
      const o = rows.map((r, i) => r.spec.kind === 'ocellaris' ? i : -1).filter(i => i >= 0); let od = null; if (o.length === 2) od = Math.hypot(p[o[0]][0] - p[o[1]][0], p[o[0]][1] - p[o[1]][1], p[o[0]][2] - p[o[1]][2]) / rows[o[0]].spec.len;
      let mixed = 0, tot = 0; rows.forEach((r, i) => { if (r.spec.kind !== 'neon' && r.spec.kind !== 'harlequin') return; let bd = 1e18, bk = ''; rows.forEach((q, j) => { if (j === i) return; const d = (p[i][0] - p[j][0]) ** 2 + (p[i][1] - p[j][1]) ** 2 + (p[i][2] - p[j][2]) ** 2; if (d < bd) { bd = d; bk = q.spec.kind; } }); tot++; if (bk !== r.spec.kind) mixed++; });
      return { simT: v.roam.t, over: worst, ocLen: od, mixed: tot ? mixed / tot : null, ev: { ...v.roam.events } }; };
    window.__brSamples = []; window.__brTimer = setInterval(() => window.__brSamples.push(sample()), 500); return top; })()`;
  const stats = () => ev(`(() => { clearInterval(window.__brTimer); const a = window.__brSamples, mx = f => Math.max(...a.map(f).filter(x => x != null)); const mean = f => { const b = a.map(f).filter(x => x != null); return b.reduce((x, y) => x + y, 0) / (b.length || 1); };
    return { samples: a.length, worstOverWaterMm: mx(x => x.over), simSeconds: a[a.length - 1].simT - a[0].simT, ocellarisMaxLen: a.some(x => x.ocLen != null) ? mx(x => x.ocLen) : null, ocellarisMaxLenAfter12s: a.some(x => x.ocLen != null) ? Math.max(...a.filter(x => x.simT - a[0].simT > 12).map(x => x.ocLen)) : null, neonHarlMixedFrac: mean(x => x.mixed), events: a[a.length - 1].ev }; })()`);
  const sec = (job, frames, every) => (async () => { for (let i = 0; i < frames; i++) { await shot(`${job}_${String(i).padStart(2, '0')}`); await sleep(every); } })();
  for (const job of JOBS) {
    log('job', job); await fresh();
    if (job === 'planted') { await load('planted'); await ev(probe); await sec('planted', 13, 4500); writeFileSync(join(OUT, 'planted.json'), JSON.stringify(await stats(), null, 1)); }
    if (job === 'reef') { await load('reef'); await ev(probe); await sec('reef', 13, 4500); writeFileSync(join(OUT, 'reef.json'), JSON.stringify(await stats(), null, 1)); }
    if (job === 'angels') {
      await load('planted', `store.edit(t => { for (let k = 0; k < 2; k++) t.fish.push({ id: 900 + k, species: 'angel', x: 300 + k * 300, y: 250, depth: 300, yaw: k * 180, pitch: 0, roll: 0, bend: 0 }); });`);
      await ev(probe); await sec('angels', 13, 4500); writeFileSync(join(OUT, 'angels.json'), JSON.stringify(await stats(), null, 1));
    }
    if (job === 'betta') {
      await load('planted', `store.edit(t => { t.fish.length = 0; t.items = t.items.filter(i => i.kind !== 'plant').slice(0, 3); t.tank.L = 610; t.tank.D = 305; t.tank.H = 406; let id = 1; const add = (sp, k) => { for (let i = 0; i < k; i++) t.fish.push({ id: id++, species: sp, x: 100 + Math.random() * 400, y: 60 + Math.random() * 250, depth: 50 + Math.random() * 200, yaw: Math.random() * 360, pitch: 0, roll: 0, bend: 0 }); }; add('betta', 1); add('guppy', 6); });`);
      await ev(probe);
      // wait for a rush, then 8 frames 0.35 s apart
      let n0 = 0, hit = false;
      for (let t = 0; t < 5000 && !hit; t++) { const e = await ev('__gb.viewer.roam.events.chases'); if (e > n0) { hit = true; break; } await sleep(80); if (t % 50 === 0) log('sim t', await ev('__gb.viewer.roam.t')); }
      log('rush seen', hit);
      for (let i = 0; i < 10; i++) { await shot(`betta_${String(i).padStart(2, '0')}`); await sleep(300); }
      writeFileSync(join(OUT, 'betta.json'), JSON.stringify({ rushSeen: hit, ...(await stats()) }, null, 1));
    }
  }
} finally { try { proc.kill(); } catch { /* gone */ } await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } try { await dev.close(); } catch { /* gone */ } }
process.exit(0);
