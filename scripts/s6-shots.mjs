// Lane S6 (2026-11-14): proof shots of shell step 3 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6336 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s6-shots.mjs
// -> research/screens/S6/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6336/', PORT = 9461, OUT = 'research/screens/S6';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s6-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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
const b64 = p => readFileSync(p).toString('base64');
const facts = {};
const ready = async () => { for (let i = 0; i < 90; i++) { if (await ev(`document.body.dataset.ui2 === 'ready'`).catch(() => false)) break; await sleep(1000); } await sleep(9000); };
const open2 = async (scene) => {
  await send('Page.navigate', { url: BASE }); await sleep(1500);
  await ev(`localStorage.clear(); ${scene ? `localStorage.setItem('tanklook.scene', ${JSON.stringify(scene)});` : ''} true`);
  await send('Page.navigate', { url: BASE + '?ui=2' });
  await ready();
};
const type = (label, v) => ev(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); return true })()`);
const counts = `(() => [...document.querySelectorAll('.stock .sr')].map(r => r.querySelector('.t').textContent + ' x' + r.querySelector('input').value))()`;


const hoodScene = (() => { const j = JSON.parse(seed); const t = j.tanks[0]; t.tank.L = 762; t.tank.D = 305; t.lid = 'hood'; return JSON.stringify(j); })();
const clickRow = (name, label) => ev(`(() => { const r = [...document.querySelectorAll('.erow')].find(x => x.querySelector('.t').textContent.includes(${JSON.stringify(name)})); if (!r) throw new Error('no row ' + ${JSON.stringify(name)}); const b = [...r.querySelectorAll('button')].find(x => (x.getAttribute('aria-label') || x.textContent).includes(${JSON.stringify(label)})); if (!b) throw new Error('no btn ' + ${JSON.stringify(label)}); b.click(); return true; })()`);
const firstRow = (i = 0) => ev(`document.querySelectorAll('.group.open .erow')[${i}]?.querySelector('.t').textContent`);
const rows = () => ev(`[...document.querySelectorAll('.erow')].map(r => r.innerText.split(String.fromCharCode(10)).join(' | '))`);
const chip = t => click('.cats .chip', t);

// ---------- desktop 1600 x 900
await size(1600, 900);
await open2(seed); phase = 'heater';
await click('.rail .ritem', 'Equipment'); await chip('Heater');
facts.heaterNote = await ev(`document.querySelector('.catnote').innerText`);
const buy0 = await ev(`[...document.querySelectorAll('.erow')].map(r => r.querySelector('.t').textContent)`);
// own the first two Buy heaters, use the first, lock the second ("For sure")
const n1 = buy0[0], n2 = buy0[1];
await clickRow(n1, 'I own it'); await sleep(300); await clickRow(n2, 'I own it'); await sleep(300);
await clickRow(n1, 'Use'); await sleep(300);
await clickRow(n2, 'for sure'); await sleep(300);
facts.heaterRows = await rows();
await shot('01-equipment-heater-own-buy-lock', 2500);
facts.cost = await ev(`document.querySelector('.checkbar')?.innerText`);

phase = 'filter'; await chip('Filter'); await shot('02-equipment-filter', 1500); facts.filterRows = await rows();

phase = 'preset ladder';
await click('.ladder .chip', 'High-tech'); await sleep(500); await chip('CO2');
facts.ladder = await ev(`[...document.querySelectorAll('.ladder .chip')].map(c => c.textContent + (c.classList.contains('on') ? ' *' : ''))`);
await shot('03-preset-ladder-high-tech-applied', 2500);
await click('.ladder .chip', 'Low-tech'); await sleep(300);

phase = 'light + hood'; await open2(hoodScene);
await click('.rail .ritem', 'Equipment'); await chip('Light');
facts.lightRows = await rows();
await shot('04-equipment-light-hood-products', 2500);
const hoodName = await ev(`[...document.querySelectorAll('.erow')].find(r => r.innerText.includes('hood'))?.querySelector('.t').textContent`);
await clickRow(hoodName, 'Use'); await sleep(500);
facts.lightInHood = await ev(`document.querySelector('.catnote')?.innerText`);
await click('.group .gh', 'Light map'); await sleep(300);
await click('.tglrow', 'Show the light map'); await sleep(500);
facts.mapOpen = await ev(`document.querySelector('.group.open .gb').innerText`);
await scrollTo('.group .gh', 'Light map');
await shot('05-light-map-open', 4000);

phase = 'owned pill';
await open2(seed); await click('.rail .ritem', 'Tank'); await click('button', 'Change'); await sleep(1500);
const key = await ev(`document.querySelector('.card.pick')?.dataset.key`); facts.ownedKey = key;
const ownScene = (() => { const j = JSON.parse(seed); j.tanks[0].brief = { v: 5, items: {}, project: { gear: { tank: { owned: [key.split('|')[0]], locked: [] } } } }; return JSON.stringify(j); })();
await open2(ownScene); await click('.rail .ritem', 'Tank'); await click('button', 'Change'); await sleep(1500);
facts.pickRows = await ev(`[...document.querySelectorAll('.card.pick')].slice(0, 4).map(r => r.innerText.split(String.fromCharCode(10)).join(' | '))`);
await shot('06-tank-picker-owned-pill', 800);

// the old UI sees the same gear
phase = 'old ui';
await open2(seed); await click('.rail .ritem', 'Equipment'); await chip('Heater');
const nm = (await ev(`[...document.querySelectorAll('.erow')].map(r => r.querySelector('.t').textContent)`))[2];
await clickRow(nm, 'Use'); await sleep(1500); facts.usedInNew = nm; await sleep(1500);
await send('Page.navigate', { url: BASE }); phase = 'old ui read';
for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('#c')`).catch(() => false)) break; await sleep(1000); } await sleep(6000);
facts.oldHeater = await ev(`[...document.querySelectorAll('#techMenu *, .tunit .tun')].map(e => e.textContent.trim()).filter(t => t && t.length < 80).slice(0, 40)`);
await shot('07-old-ui-same-heater', 1500);

// ---------- phone 390 x 844
await size(390, 844, true);
await open2(seed); phase = 'phone';
await click('.tabbar button', 'More'); await click('.morerow', 'Equipment'); await chip('Heater'); await shot('08-phone-equipment-heater', 2500);
await chip('Light'); await shot('09-phone-equipment-light', 1500);

// ---------- the old site, no ?ui=2
await size(1600, 900);
await open(BASE, false); phase = 'old shell';
await shot('10-old-shell-unchanged');
facts.oldShell = await ev(`({ ui2: !!document.getElementById('ui2'), app: !!document.getElementById('app') })`);
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ errors }));
ws.close(); ch.kill();
process.exit(0);
