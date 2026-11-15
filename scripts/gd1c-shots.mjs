// GD1: click and drag equipment in the view under ?ui=2. Run: URL=http://localhost:5174/ node scripts/gd1-shots.mjs
// Sequences at 1280: heater back glass -> left glass vertical -> horizontal (menu chips); HOB slid along the rim; CO2 diffuser moved with its tube.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5174/', PORT = 9465, OUT = 'research/screens/GD1';
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

// ---- HOB: slide along the back rim, clamp at the corner, hang it on the left end and slide there ----
const cam = (az, el, zoom) => ev(`window.__gb.store.cam(c => { c.zoom = ${zoom}; c.az = ${az}; c.el = ${el}; }); 1`);
const place = async () => console.log('place', await ev(`JSON.stringify(window.__gb.store.tank.tech?.place?.filter)`));
let f = JSON.parse(await ev(FIND('filter'))); console.log('filter at', f);
await mouse('mouseMoved', f[0], f[1]); await mouse('mousePressed', f[0], f[1]); await mouse('mouseReleased', f[0], f[1]); await shot('9a-hob-selected');
const farRight = JSON.parse(await ev(PROJ(T.L * 1.3, T.H, -T.D)));
await drag(f, farRight, () => shot('9b-hob-mid-drag')); await shot('9c-hob-held-at-right-corner'); await place();
await ev(`document.querySelector('[data-rimwall="left"]')?.click(); true`); await cam(40, 18, 1.2); await sleep(1500); await shot('9d-hob-hung-on-left-end'); await place();
f = JSON.parse(await ev(FIND('filter'))); console.log('filter on left at', f);
if (f) { const to = JSON.parse(await ev(PROJ(0, T.H, -T.D * 0.2))); await drag(f, to, () => shot('9e-hob-sliding-on-left')); await shot('9f-hob-near-front-corner-held'); await place(); }
ws.close(); ch.kill(); process.exit(0);
