// GS2 (2026-11-15): proof shots of the Glass check Solve for modes (Size, Safety factor, the What can I build chart); dev server URL in URL, output research/screens/GS2. Pattern from ct1-shots (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6333 --strictPort   (another shell), then
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5175/', PORT = 9473, OUT = process.env.OUT ?? 'research/screens/GS2';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/gs2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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


const glassTab = () => scrollTo('.mform .group .gh', 'Glass check');
const pick = (css, text) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!e) throw new Error('no ' + ${JSON.stringify(text)}); e.click(); return true })()`);
const sizeTo = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const dims = async (l, d, h) => { await setNum('Length (in)', l); await setNum('Depth (in)', d); await setNum('Height (in)', h); await sleep(1500); };
async function run(tag, w, h, mobile) {
  await sizeTo(w, h, mobile);
  await open(BASE + '?ui=2', true);
  phase = tag; if (mobile) { await click('.tabbar button', 'Tank'); await sleep(800); } await click('.tankcard .btn', 'Change').catch(() => {}); await sleep(500); await click('.picker .btn', 'New custom tank'); await sleep(3000);
  await dims(36, 18, 16);
  await glassTab(); await pick('.mform .seg button', 'Size'); await sleep(3500); await glassTab();
  await shot(`${tag}-size`, 800);
  await sleep(500); await click('.mform .btn', 'Open the chart'); await sleep(4500); await shot(`${tag}-chart`, 500);
  await click('.envov .btn', 'Close'); await sleep(500);
  await pick('.mform .seg button', 'Safety factor'); await sleep(1500); await glassTab(); await shot(`${tag}-sf`, 800);
}
if (!process.env.ONLY || process.env.ONLY === '1280') await run('1280', 1280, 900, false);
if (!process.env.ONLY || process.env.ONLY === '390') await run('390', 390, 844, true);
console.log('errors', errors);
ch.kill();
process.exit(0);
