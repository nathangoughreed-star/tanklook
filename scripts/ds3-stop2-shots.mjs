// Lane DS3 stop 2: the generated castle-coloured-gravel tank at open / balanced / full. Raw -> research/screens/DS3/stop2-raw-*.png
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5990/', PORT = 9354;
mkdirSync('research/screens/DS3', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1500,900', '--user-data-dir=' + (process.env.TEMP + '/ds3b-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 800)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/DS3/stop2-raw-${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
const setup = d => ev(`(async () => {
  const R = await import('/src/scene/recipes.ts'), A = await import('/src/scene/archetypes.ts'), T = await import('/src/data/tanks.ts'), B = await import('/src/scene/brief.ts');
  const a = A.archetype('castle-coloured-gravel'), m = T.TANK_MODELS.find(x => x.name === '40 gal breeder' && !x.terrarium);
  const S = R.recipeScene(a, '${d}', m); S.brief = B.setVision(B.emptyBrief(), { secondaryLikes: [], archetypeId: a.id });
  const { store } = window.__gb; if (store.split) store.closeTank(1);
  store.edit(t => { Object.assign(t, structuredClone(S)); });
  const t = store.scene.tanks[0]; const c = {}; for (const i of t.items) c[i.variant] = (c[i.variant] ?? 0) + 1;
  return JSON.stringify(c) + ' | ' + t.substrate.type + ' | fish ' + t.fish.length + ' | air ' + t.tech?.rows?.air;
})()`);
const cam = (az, el, zoom) => ev(`window.__gb.store.edit(t => { t.camera = { ...t.camera, az: ${az}, el: ${el}, zoom: ${zoom} }; })`);
try {
  await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  for (const d of ['open', 'balanced', 'full']) {
    console.log(d, await setup(d)); await sleep(6000);
    await cam(0, 6, 1); await sleep(2500); await shot(d + '-front');
    if (d === 'balanced') { await cam(34, 14, 1); await sleep(2500); await shot(d + '-34'); }
  }
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
