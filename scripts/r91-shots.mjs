// Lane R91 (2026-11-13): proof shots of shell step 8 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6391 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/r91-shots.mjs
// -> research/screens/R91/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6391/', PORT = 9491, OUT = 'research/screens/R91';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,800', '--user-data-dir=' + (process.env.TEMP + '/r91-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const size = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
const shot = async (name, wait = 1500) => { await sleep(wait); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 74 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)})); if (!e) throw new Error('no ' + ${JSON.stringify(css + ' ' + text)}); e.click(); return true })()`);
const setNum = (label, v) => ev(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); if (!e) throw new Error('no input ' + ${JSON.stringify(label)}); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event('change', { bubbles: true })); return true })()`);
const scrollTo = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)})); e?.scrollIntoView({ block: 'start' }); return !!e })()`);
const seed = readFileSync('src/examples/planted.json', 'utf8');
const errors = []; let phase = 'start';
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(phase + ': ' + d.params.exceptionDetails.exception?.description?.slice(0, 200)); });

async function open(url, ui2) {
  await send('Page.navigate', { url: BASE }); await sleep(1500);
  await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(seed)}); true`);
  await send('Page.navigate', { url }); phase = url.replace(BASE, '/') + ' ' + (await ev('innerWidth').catch(() => ''));
  for (let i = 0; i < 90; i++) { if (await ev(ui2 ? `document.body.dataset.ui2 === 'ready'` : `!!document.querySelector('#c')`).catch(() => false)) break; await sleep(1000); }
  await sleep(9000); // the tank builds and draws (software WebGL)
}
const facts = {};
const gesture = expr => send('Runtime.evaluate', { expression: expr, userGesture: true, awaitPromise: true, returnByValue: true });
const clickG = async (css, text) => gesture(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)})); if (!e) throw new Error('no ' + ${JSON.stringify(text)}); e.click(); return true })()`);
const st = () => ev(`({ fs: !!document.fullscreenElement, tank: !!document.querySelector('.ui2app.tankonly'), labels: [...document.querySelectorAll('.fsitem')].map(b => b.textContent) })`);
await size(1280, 800);
await open(BASE + '?ui=2', true);
await click('.cluster .btn', 'View'); facts.menu = await st();
await shot('01-view-menu-full-screen-item', 1000);
await clickG('.fsitem', 'Full screen'); await sleep(1200); facts.afterFull = await st();
await shot('02-full-screen', 1200);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'f', text: 'f' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'f' }); await sleep(800); facts.afterF = await st();
await click('.cluster .btn', 'View'); await clickG('.fsitem', 'Tank only'); await sleep(300); facts.afterTank = await st();
facts.exitStyle = await ev(`(() => { const e = document.querySelector('.fsexit'); if (!e) return null; const c = getComputedStyle(e), r = e.getBoundingClientRect(); return { cls: e.className, op: c.opacity, disp: c.display, pos: c.position, z: c.zIndex, rect: [r.x, r.y, r.width, r.height] } })()`);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 300 });
await shot('03-tank-only-exit-button-visible', 0);
await sleep(2600); await shot('04-tank-only-button-faded', 300);
facts.fadedClass = await ev(`document.querySelector('.fsexit')?.className`);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 600, y: 400 }); await sleep(300);
await clickG('.fsexit', 'Exit'); await sleep(1000); facts.afterExit = await st();
await size(390, 844, true);
await open(BASE + '?ui=2', true); phase = 'phone';
await click('.cluster .btn', 'View'); facts.phoneMenu = await st();
await shot('05-phone-view-menu', 1200);
await click('.fsitem', 'Tank only'); await sleep(1200); await shot('06-phone-tank-only', 600);
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ errors })); ws.close(); ch.kill(); process.exit(0);
