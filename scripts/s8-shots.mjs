// Lane S8 (2026-11-13): proof shots of shell step 8 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6338 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s8-shots.mjs
// -> research/screens/S8/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6338/', PORT = 9458, OUT = 'research/screens/S8';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s8-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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

// ---------- desktop 1600 x 900
await size(1600, 900);
await open(BASE + '?ui=2', true);
phase = 'view';
await click('.cluster .btn', 'View');
await shot('01-view-popover', 1200);
await click('.viewpop .tglrow', 'Top view'); await ev(`document.activeElement.blur(); true`);
await shot('02-view-map-on', 1500);
facts.mapDefaultBefore = await ev(`localStorage.getItem('tanklook.ui2.viewmap')`);
await click('.viewpop .tglrow', 'Top view'); await click('.viewpop .tglrow', 'Plants'); await click('.viewpop .chip', 'From above');
await shot('03-view-plants-hidden-from-above', 2500);
await click('.viewpop .chip', 'Straight on'); await click('.viewpop .tglrow', 'Plants'); await click('.cluster .btn', 'View'); // closes the popover
await click('.cluster .btn', 'Another moment'); await sleep(800);
facts.momentNote = await ev(`document.querySelector('.viewnote')?.textContent ?? null`);
phase = 'settings';
await click('.rail .ritem', 'Settings');
await shot('04-settings', 1200);
await click('.group .gh', 'Graphics'); await shot('05-settings-graphics', 1200);
facts.gfxRows = await ev(`[...document.querySelectorAll('.panel .tglrow')].map(b => b.textContent)`);
await click('.seg button', 'Metric'); await sleep(500); facts.unitsMetric = await ev(`document.querySelector('.seg button.on').textContent`); await click('.seg button', 'US');
await click('.seg button', 'Sandbox'); await shot('06-settings-sandbox-rules', 800); await click('.seg button', 'Guided');
phase = 'print';
await click('.rail .ritem', 'Print');
await shot('07-print-shopping-list', 6000);                                              // mockup 08
facts.shopping = await ev(`({ ticks: document.querySelector('.sgroup h3 .n')?.textContent, to: document.querySelector('.pp-tot')?.innerText, groups: [...document.querySelectorAll('.paper h2')].map(h => h.innerText.replace(/\s+/g, ' ')) })`);
await click('.preset', 'Setup sheet'); await shot('08-print-setup-sheet', 2500);
await click('.preset', 'Full report'); await shot('09-print-full-report', 2500);
await click('.preset', 'Shopping list'); await click('.tick', 'Where to buy'); await click('.tick', 'Picture of the tank'); await shot('10-print-shopping-where-and-picture', 4000);
facts.csv = await ev(`document.querySelector('.printbar').innerText`);
// ---------- phone 390 x 844
await size(390, 844, true);
await open(BASE + '?ui=2', true); phase = 'phone';
await click('.tabbar button', 'More'); await click('.morerow', 'Print'); await sleep(2500);
await ev(`document.querySelector('.panel .sec-body').scrollTop = 0; true`);
await shot('11-phone-print', 3000);
await ev(`document.querySelector('.paperinline')?.scrollIntoView(); true`); await shot('12-phone-print-paper', 1500);
// ---------- the live shell without ?ui=2: unchanged
await size(1600, 900);
await open(BASE, false); phase = 'old shell';
await shot('13-old-shell-unchanged');
facts.oldShell = await ev(`({ ui2: !!document.getElementById('ui2'), app: !!document.getElementById('app'), viewBtn: !!document.getElementById('viewBtn') })`);
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ errors }));
ws.close(); ch.kill();
process.exit(0);
