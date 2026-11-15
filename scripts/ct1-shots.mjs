// Lane S3 (2026-11-13): proof shots of shell step 3 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6333 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s3-shots.mjs
// -> research/screens/CT1/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6333/', PORT = 9461, OUT = 'research/screens/CT1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/ct1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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


const pick = (css, text) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!e) throw new Error('no ' + ${JSON.stringify(text)}); e.click(); return true })()`);
const setSel = (label, v) => ev(`(() => { const e = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event('change', { bubbles: true })); return true })()`);
const orbit = async (dx, dy) => { const x = 1100, y = 450; const m = (type, X, Y, b) => send('Input.dispatchMouseEvent', { type, x: X, y: Y, button: 'left', buttons: b, clickCount: 1 }); await m('mouseMoved', x, y, 0); await m('mousePressed', x, y, 1); for (let k = 1; k <= 6; k++) await m('mouseMoved', x + dx * k / 6, y + dy * k / 6, 1); await m('mouseReleased', x + dx, y + dy, 0); };
const facts = {};
const newMaker = async () => { await click('.tankcard .btn', 'Change').catch(() => {}); await sleep(500); await click('.picker .btn', 'New custom tank'); await sleep(3000); };
const dims = async (l, d, h) => { await setNum('Length (in)', l); await setNum('Depth (in)', d); await setNum('Height (in)', h); await sleep(2500); };
const glassTab = () => scrollTo('.mform .group .gh', 'Glass check');
await size(1600, 900);
await open(BASE + '?ui=2', true);
phase = 'maker'; await newMaker();
await dims(48, 18, 20);
await orbit(0, 90); await sleep(800);
await glassTab(); await pick('.mform .seg button', 'Perimeter'); await sleep(2500);
await shot('01-maker-48x18x20-perimeter', 1500);
facts.perimeter = await ev(`document.querySelector('.mform').innerText.slice(-1800)`);
await setSel('Number of cross braces', 2); await sleep(2500); await glassTab();
await shot('02-maker-48x18x20-perimeter-plus-2-cross', 1500);
await pick('.mform .seg button', 'No brace'); await sleep(2500); await glassTab();
await shot('03-optimize-before-no-brace', 1500);
await click('.mform .btn', 'Optimize'); await sleep(6000); await glassTab();
await shot('04-optimize-after', 1500);
facts.optimize = await ev(`[...document.querySelectorAll('.mform [role=status], .mform .hint')].map(e => e.innerText).filter(t => /perimeter|No brace|glass/i.test(t))`);
await setSel('Brace strip thickness', 0.375 * 25.4); await sleep(500);
await click('.mform .btn', 'Optimize'); await sleep(6000);
await click('.mhead .btn', 'Save and use in this setup'); await sleep(8000);
await shot('05-room-view-with-braces', 3000);
await orbit(-250, 160); await sleep(1500); await shot('05b-room-3-4-top-angle', 2500);
await orbit(250, -160);
// preview in my setup stays until Back now (R39)
await newMaker(); await dims(48, 18, 20); await click('.mhead .btn', 'Preview in my setup'); await sleep(30000);
await shot('05c-preview-in-setup-after-30s', 500);
facts.previewAfter30s = await ev(`!!document.querySelector('.mbanner')`);
await click('.mbanner .btn', 'Back now'); await sleep(1500); await click('.mhead .btn', 'Cancel').catch(() => {}); await sleep(500); await ev(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cancel')?.click(); true`).catch(() => {});
// the name following the size
await newMaker(); await dims(36, 10, 10);
await shot('06-name-follows-36x10x10', 1500);
facts.name = await ev(`({ value: document.querySelector('.mform input[aria-label=Name]').value, placeholder: document.querySelector('.mform input[aria-label=Name]').placeholder })`);
await click('.mhead .btn', 'Save to my tanks'); await sleep(1500);
facts.lib = await ev(`JSON.parse(localStorage.getItem('tanklook.customTanks') || '[]').map(e => ({ name: e.name, brace: e.glassBuild?.brace ?? null }))`);
// phone
await size(375, 812, true);
await open(BASE + '?ui=2', true); phase = 'phone';
await click('.tabbar button', 'Tank'); await sleep(800); await click('.tankcard .btn', 'Change'); await sleep(500); await click('.picker .btn', 'New custom tank'); await sleep(3000);
await shot('07-phone-maker', 2000);
await glassTab(); await pick('.mform .seg button', 'Perimeter + cross').catch(() => {}); await sleep(2500);
await shot('08-phone-maker-brace-fields', 1500);
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ errors }));
ws.close(); ch.kill();
process.exit(0);
