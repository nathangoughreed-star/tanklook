// Lane DS3 stop 1: resin castle + tinted artificial plants on coloured gravel in a real tank. Raw shots -> research/screens/DS3/raw-*.png.
// URL env = dev server (default http://localhost:5990/).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5990/', PORT = 9353;
mkdirSync('research/screens/DS3', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1500,900', '--user-data-dir=' + (process.env.TEMP + '/ds3-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 800)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/DS3/raw-${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
// a 40 gal breeder, mixed colour gravel, the castle left of centre, tinted plants beside and behind it, no live plants
const setup = () => ev(`(async () => {
  const R = await import('/src/scene/recipes.ts'), A = await import('/src/scene/archetypes.ts'), T = await import('/src/data/tanks.ts'), I = await import('/src/scene/items.ts');
  const a = A.archetype('themed-scene'), m = T.TANK_MODELS.find(x => x.name === '40 gal breeder' && !x.terrarium);
  const S = R.recipeScene(a, 'balanced', m);
  const { store } = window.__gb; if (store.split) store.closeTank(1);
  store.edit(t => {
    Object.assign(t, structuredClone(S)); t.fish = []; t.substrate.type = 'clown';
    const T0 = t.tank; t.items = [];
    const mk = (v, id, x, d, o) => I.makeItem(T0, v, id, 7, x, d, o, t);
    const cx = T0.L / 2;
    t.items.push(mk('castle', 901, cx - T0.L * 0.12, T0.D * 0.5, { size: 254, yaw: 0 }),
      mk('silkstempink', 902, cx + T0.L * 0.3, T0.D * 0.55, { size: 230 }), mk('plasticswordpurple', 903, cx + T0.L * 0.17, T0.D * 0.78, { size: 200 }),
      mk('silkstempink', 904, cx - T0.L * 0.42, T0.D * 0.3, { size: 170 }), mk('plasticstemblue', 905, cx - T0.L * 0.36, T0.D * 0.7, { size: 190 }),
      mk('silkstemred', 906, cx + T0.L * 0.42, T0.D * 0.3, { size: 160 }));
  });
  const S2 = store.scene.tanks[0]; return S2.items.map(i => i.variant + ':' + Math.round(i.x) + ',' + Math.round(i.depth)).join(' ') + ' | ' + S2.substrate.type + ' | ' + S2.tank.L + 'x' + S2.tank.D;
})()`);
const cam = (az, el, zoom, at) => ev(`window.__gb.store.edit(t => { t.camera = { ...t.camera, az: ${az}, el: ${el}, zoom: ${zoom}${at ? ', ...' + at : ''} }; })`);
try {
  await send('Page.enable'); if (process.env.DPR) await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 900, deviceScaleFactor: +process.env.DPR, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  console.log(await setup()); await sleep(6000);
  const views = JSON.parse(process.env.VIEWS ?? '[["front",0,6,1],["34",36,16,1],["close",14,8,3.2],["plants",-18,10,3]]');
  for (const [n, az, el, z] of views) { await cam(az, el, z); await sleep(2500); await shot(n); }
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
