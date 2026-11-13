// Lane DS2 stop 1: ship + treasure chest in a real tank (natural gravel, live plants), 6 views. Dev server URL env. Pictures: research/screens/DS2/raw-*.png
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5977/', PORT = 9347;
mkdirSync('research/screens/DS2', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1500,900', '--user-data-dir=' + (process.env.TEMP + '/ds2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/DS2/raw-${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
const setup = (chestFront) => ev(`(async () => {
  const R = await import('/src/scene/recipes.ts'), A = await import('/src/scene/archetypes.ts'), T = await import('/src/data/tanks.ts'), I = await import('/src/scene/items.ts');
  const a = A.archetype('planted-community'), m = T.TANK_MODELS.find(x => x.name === '40 gal breeder' && !x.terrarium);
  const S = R.recipeScene(a, 'balanced', m);
  const { store } = window.__gb; if (store.split) store.closeTank(1);
  store.edit(t => {
    Object.assign(t, structuredClone(S)); t.fish = [];
    const T0 = t.tank;
    t.items = t.items.filter(i => i.kind === 'plant' && i.variant !== 'carpet' && (i.depth < 110 || i.x < 90 || i.x > T0.L - 90));
    const mk = (v, id, x, d, o) => I.makeItem(T0, v, id, 7, x, d, o, t);
    const cx = T0.L / 2;
    if (${chestFront}) { t.items.push(mk('shipwreck', 901, cx - T0.L * 0.22, T0.D * 0.38, { size: 420, yaw: 18 }), mk('treasurechest', 902, cx + T0.L * 0.05, T0.D * 0.7, { size: 150, yaw: -12 })); }
    else { t.items.push(mk('shipwreck', 901, cx, T0.D * 0.42, { size: 420, yaw: 18 }), mk('treasurechest', 902, cx + T0.L * 0.3, T0.D * 0.72, { size: 140, yaw: -14 })); }
  });
  return store.scene.tanks[0].items.map(i => i.variant).join(',') + ' ' + store.scene.tanks[0].tank.L + 'x' + store.scene.tanks[0].tank.D;
})()`);
const cam = (az, el, zoom) => ev(`window.__gb.store.edit(t => { t.camera = { ...t.camera, az: ${az}, el: ${el}, zoom: ${zoom} }; })`);
try {
  await send('Page.enable'); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  console.log(await setup(true)); await sleep(5000);
  for (const [n, az, el, z] of [['ship-front', 0, 6, 1], ['ship-34', 38, 16, 1], ['ship-close', 22, 10, 2.3]]) { await cam(az, el, z); await sleep(2500); await shot(n); }
  console.log(await setup(false)); await sleep(5000);
  for (const [n, az, el, z] of [['chest-front', 0, 6, 1], ['chest-34', -32, 18, 1.6], ['chest-close', -10, 12, 3.2]]) { await cam(az, el, z); await sleep(2500); await shot(n); }
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
