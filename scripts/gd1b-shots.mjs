// GD1: click and drag equipment in the view under ?ui=2. Run: URL=http://localhost:5174/ node scripts/gd1-shots.mjs
// Sequences at 1280: heater back glass -> left glass vertical -> horizontal (menu chips); HOB slid along the rim; CO2 diffuser moved with its tube.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5174/', PORT = 9463, OUT = 'research/screens/GD1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,800', '--user-data-dir=' + (process.env.TEMP + '/gd1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const mouse = (type, x, y, b = 'left') => send('Input.dispatchMouseEvent', { type, x, y, button: b, buttons: type === 'mouseReleased' || type === 'mouseMoved' ? 0 : 1, clickCount: 1, pointerType: 'mouse' });
const shot = async name => { await sleep(1000); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const drag = async (a, b, mid) => {
  await mouse('mouseMoved', a[0], a[1]); await mouse('mousePressed', a[0], a[1]);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', a[0] + (b[0] - a[0]) * i / 12, a[1] + (b[1] - a[1]) * i / 12); await sleep(40); if (i === 6 && mid) await mid(); }
  await mouse('mouseReleased', b[0], b[1]);
};
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '?ui=2' }); await sleep(2500);
for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb && document.body.dataset.ui2==='ready'`).catch(() => false)) break; await sleep(1000); }
await ev(`localStorage.clear(); localStorage.setItem('tanklook.ui2.checklist','off'); true`); await send('Page.navigate', { url: BASE + '?ui=2' }); await sleep(3000);
for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb && document.body.dataset.ui2==='ready'`).catch(() => false)) break; await sleep(1000); }
await ev(`(async () => { const { store } = window.__gb; const eq = await import('/src/shell/logic/equipment.ts'); store.edit(s => eq.applyPresetEdit(s, 'hightech')); return 1; })()`);
await ev(`window.__gb.store.editTank(0, t => { t.tech = { ...t.tech, rows: { ...t.tech.rows, filter: 'hob' } }; }); 1`); await ev(`window.__gb.store.cam(c => { c.zoom = 1.25; c.az = 16; c.el = 10; }); 1`); await sleep(2500);
const FIND = row => `(async () => {
  const { viewer, store } = window.__gb; const gd = await import('/src/interact/gearDrag.ts');
  const c = document.querySelector('canvas.vcanvas').getBoundingClientRect(), pts = [];
  for (let y = c.top + 8; y < c.bottom - 8; y += 4) for (let x = c.left + 8; x < c.right - 8; x += 4) { const h = viewer.hitTest(x, y); if (!h) continue; const g = gd.gearGrab(h); if (g && g.row.split('.')[0] === ${JSON.stringify(row)}) pts.push([x, y]); }
  return JSON.stringify(pts.length ? pts[pts.length >> 1] : null);
})()`;
// where a world point (mm: x, y up, depth in front of the back wall) lands on the screen
const PROJ = (x, y, z) => `(async () => { const { viewer, store } = window.__gb; const T = store.tank.tank; const vp = viewer.vps[0]; const c = document.querySelector('canvas.vcanvas').getBoundingClientRect();
  const v = new vp.cam.position.constructor(${x}, ${y}, ${z}).project(vp.cam); return JSON.stringify([c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]); })()`;
const info = () => ev(`JSON.stringify({ sel: (async()=>0)() && 0, tank: window.__gb.store.tank.tank, place: window.__gb.store.tank.tech?.place })`);
const T = JSON.parse(await ev(`JSON.stringify(window.__gb.store.tank.tank)`)); console.log('tank', T.L, T.H, T.D);
const rows = JSON.parse(await ev(`(async()=>{const g=await import('/src/render/gear3d.ts'); return JSON.stringify(g.gearPicks(window.__gb.store.tank).map(p=>p.row+':'+p.id))})()`)); console.log(rows);

// ---- part 2: front glass, bottom, tight boxes, click cycle, phone long-press ----
const cam = (az, el, zoom) => ev(`window.__gb.store.cam(c => { c.zoom = ${zoom}; c.az = ${az}; c.el = ${el}; }); 1`);
const dismissed = await ev(`localStorage.getItem('tanklook.ui2.checklist')`);
// 1. heater to the bottom (pointer on the substrate), then the front glass (view from behind)
let h = JSON.parse(await ev(FIND('heater')));
await mouse('mouseMoved', h[0], h[1]); await mouse('mousePressed', h[0], h[1]); await mouse('mouseReleased', h[0], h[1]);
const fl = JSON.parse(await ev(PROJ(T.L * 0.5, 2, -T.D * 0.5)));
await drag(h, fl, () => shot('4b-heater-mid-drag-to-bottom')); await shot('4c-heater-on-bottom');
console.log('bottom', await ev(`JSON.stringify(window.__gb.store.tank.tech?.place?.heater)`));
await cam(180, 12, 1.25); await sleep(1500);
h = JSON.parse(await ev(FIND('heater'))); console.log('heater (from behind) at', h);
await shot('5a-from-behind-heater-on-bottom');
if (h) {
  await mouse('mouseMoved', h[0], h[1]); await mouse('mousePressed', h[0], h[1]); await mouse('mouseReleased', h[0], h[1]);
  const fr = JSON.parse(await ev(PROJ(T.L * 0.5, T.H * 0.5, -3)));
  await drag(h, fr, () => shot('5b-heater-mid-drag-to-front')); await shot('5c-heater-on-front-glass');
  console.log('front', await ev(`JSON.stringify(window.__gb.store.tank.tech?.place?.heater)`));
  await ev(`document.querySelector('[data-orient="horizontal"]')?.click(); true`); await shot('5d-front-heater-horizontal');
}
// 2. tight boxes
await cam(16, 10, 1.25); await sleep(1500);
for (const [row, tag] of [['co2', '6a-co2-tight-box'], ['filter', '6b-hob-tight-box']]) {
  const p = JSON.parse(await ev(FIND(row))); if (!p) continue;
  await mouse('mouseMoved', p[0], p[1]); await mouse('mousePressed', p[0], p[1]); await mouse('mouseReleased', p[0], p[1]); await shot(tag);
}
// 3. click cycle: a plant behind the HOB, two clicks at one spot
await ev(`window.__hobX = window.__gb.viewer.vps[0].scene.children.flatMap(o => o.userData.gearPieces ?? []).find(p => p.row.startsWith('filter')).box.getCenter(new window.__gb.viewer.vps[0].cam.position.constructor()).x; 1`);
await ev(`(async () => { const { store } = window.__gb; const it = await import('/src/scene/items.ts'), ie = await import('/src/scene/itemEdit.ts'); const v = Object.keys(it.LIBRARY).find(k => it.LIBRARY[k].kind === 'plant'); store.edit(s => { ie.addItem(s, v, 900, 7); }); const id = store.tank.items.at(-1).id; store.editTank(0, t => { const q = t.items.find(i => i.id === id); q.x = window.__hobX; q.depth = t.tank.D * 0.985; }); store.select(null); return 1; })()`);
await sleep(2500);
const c = JSON.parse(await ev(`(async () => { const { viewer, store } = window.__gb; const cm = await import('/src/interact/clickMenu.ts'); const r = document.querySelector('canvas.vcanvas').getBoundingClientRect(), pts = [];
  for (let y = r.top + 8; y < r.bottom - 8; y += 4) for (let x = r.left + 8; x < r.right - 8; x += 4) { const h = viewer.hitTest(x, y); if (!h) continue; (window.__cnt ??= { item: 0, gear: 0, both: 0 }); const ct = cm.clickTarget(viewer, store, h); if (h.itemId != null) window.__cnt.item++; if (ct?.kind === 'gear') window.__cnt.gear++; if (h.itemId != null && ct?.kind === 'gear') { window.__cnt.both++; pts.push([x, y]); } } return JSON.stringify(pts.length ? pts[pts.length >> 1] : null); })()`)); console.log('cycle spot', c, await ev(`JSON.stringify(window.__cnt)`));
if (c) {
  const clk = async () => { await mouse('mouseMoved', c[0], c[1]); await mouse('mousePressed', c[0], c[1]); await mouse('mouseReleased', c[0], c[1]); };
  await clk(); await shot('7a-click1-gear'); console.log('sel after 1', await ev(`JSON.stringify([window.__gb.store.selItem, !!document.querySelector('[data-orient]')])`));
  await clk(); await shot('7b-click2-what-is-behind'); console.log('sel after 2', await ev(`JSON.stringify(window.__gb.store.selItem)`));
  await clk(); await shot('7c-click3-gear-again');
}
// 4. phone: long-press picks gear up, then drag; a quick swipe on it still turns the view
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await ev(`window.__gb.store.cam(c => { c.zoom = 1.6; c.az = 16; c.el = 10; }); 1`); await sleep(2000);
const ph = JSON.parse(await ev(FIND('heater'))); console.log('phone heater', ph);
const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
if (ph) {
  await touch('touchStart', ph[0], ph[1]); await sleep(700); await shot('8a-phone-held-picked-up');
  const to = JSON.parse(await ev(PROJ(T.L * 0.5, T.H * 0.5, -T.D * 0.4)));
  for (let i = 1; i <= 8; i++) { await touch('touchMove', ph[0] + (to[0] - ph[0]) * i / 8, ph[1] + (to[1] - ph[1]) * i / 8); await sleep(40); }
  await touch('touchEnd'); await shot('8b-phone-dropped'); console.log('phone place', await ev(`JSON.stringify(window.__gb.store.tank.tech?.place?.heater)`));
  const az0 = await ev(`window.__gb.store.camOf(0).az`); const p2 = JSON.parse(await ev(FIND('filter')));
  if (p2) { await touch('touchStart', p2[0], p2[1]); for (let i = 1; i <= 6; i++) { await touch('touchMove', p2[0] + i * 12, p2[1]); await sleep(30); } await touch('touchEnd'); console.log('swipe az', az0, '->', await ev(`window.__gb.store.camOf(0).az`), 'filter place', await ev(`JSON.stringify(window.__gb.store.tank.tech?.place?.filter)`)); }
}
ws.close(); ch.kill(); process.exit(0);
