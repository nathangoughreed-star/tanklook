// Lane S3 (2026-11-13): proof shots of shell step 3 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6333 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s3-shots.mjs
// -> research/screens/CT1/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6333/', PORT = 9465, OUT = 'research/screens/CT1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/ct1c-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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
await send('Runtime.enable'); await send('Page.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(phase + ': ' + d.params.exceptionDetails.exception?.description?.slice(0, 200)); });

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

send('Page.javascriptDialogOpening', {}); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true }); });
const setTxt = (label, v) => ev(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); if (!e) throw new Error('no input ' + ${JSON.stringify(label)}); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event('change', { bubbles: true })); return true })()`);
const side = async (i, v) => { await setTxt(`Side ${i} length (in)`, v); await sleep(1500); };
const boxClick = id => ev(`(() => { const e = [...document.querySelectorAll('.edgelab.editable')].find(b => b.getAttribute('aria-label').startsWith(${JSON.stringify(id + ' ')})); if (!e) throw new Error('no box ' + ${JSON.stringify(id)}); e.click(); return true })()`);
const key = k => send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: k === 'Enter' ? 13 : 27 });
await size(1600, 900);
await open(BASE + '?ui=2', true);
phase = 'dim'; await newMaker();
await shot('16-dimension-boxes-before', 600);
await boxClick('H'); await sleep(600); await shot('17-clicking-height-box-editing', 600);
await ev(`(() => { const e = document.querySelector('input.edgeinput'); e.value = '20'; e.dispatchEvent(new Event('input', { bubbles: true })); return true })()`); await sleep(300); await key('Enter'); await sleep(3000);
await shot('18-height-box-applied-20in', 600);
facts.heightAfter = await ev(`document.querySelector('input[aria-label="Height (in)"]').value`);
await boxClick('L'); await sleep(300); await ev(`(() => { const e = document.querySelector('input.edgeinput'); e.value = '60'; e.dispatchEvent(new Event('input', { bubbles: true })); return true })()`); await key('Enter'); await sleep(2500);
facts.lengthAfter60 = await ev(`document.querySelector('input[aria-label="Length (in)"]').value`);
await boxClick('H'); await sleep(400); await ev(`(() => { const e = document.querySelector('input.edgeinput'); e.value = '9999'; e.dispatchEvent(new Event('input', { bubbles: true })); return true })()`); await key('Enter'); await sleep(2500);
facts.heightAfter9999 = await ev(`document.querySelector('input[aria-label="Height (in)"]').value`);
facts.depthBefore = await ev(`document.querySelector('input[aria-label="Depth (in)"]').value`);
await boxClick('D'); await sleep(300); await ev(`(() => { const e = document.querySelector('input.edgeinput'); e.value = '7'; e.dispatchEvent(new Event('input', { bubbles: true })); return true })()`); await key('Escape'); await sleep(800);
facts.depthAfterEsc = await ev(`document.querySelector('input[aria-label="Depth (in)"]').value`);
facts.stillInMaker = await ev(`!!document.querySelector('.maker')`);
await size(375, 812, true);
await open(BASE + '?ui=2', true); phase = 'phone';
await click('.tabbar button', 'Tank'); await sleep(800); await click('.tankcard .btn', 'Change'); await sleep(500); await click('.picker .btn', 'New custom tank'); await sleep(3500);
await boxClick('L'); await sleep(600); await shot('19-phone-tap-length-box', 600);
writeFileSync(`${OUT}/facts2.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ errors, facts }));
ws.close(); ch.kill();
process.exit(0);
