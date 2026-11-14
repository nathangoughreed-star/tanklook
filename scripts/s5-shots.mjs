// Lane S5 (2026-11-14): proof shots of shell step 5 (?ui=2): Constraints, Preferences, Suggest at $300, Discover gating, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6350 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s5-shots.mjs
// -> research/screens/S5/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6350/', PORT = 9465, OUT = 'research/screens/S5';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s5-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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

const planted = JSON.parse(seed);
const noFish = JSON.parse(seed); for (const t of noFish.tanks) { t.fish = []; t.pairs = []; }
async function openWith(url, sceneText) {
  await send('Page.navigate', { url: BASE }); await sleep(1500);
  await ev(`localStorage.clear(); ${sceneText ? `localStorage.setItem('tanklook.scene', ${JSON.stringify(sceneText)});` : ''} true`);
  await send('Page.navigate', { url }); phase = url.replace(BASE, '/') + ' ' + (await ev('innerWidth').catch(() => ''));
  for (let i = 0; i < 90; i++) { if (await ev(`document.body.dataset.ui2 === 'ready'`).catch(() => false)) break; await sleep(1000); }
  await sleep(9000);
}
const waitFor = async (expr, ms = 90000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(700); } return false; };
const saved = () => ev(`localStorage.getItem('tanklook.scene')`);
const facts = {};
const typeIn = (label, v) => ev(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); if (!e) throw new Error('no input ' + ${JSON.stringify(label)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
const text = css => ev(`document.querySelector(${JSON.stringify(css)})?.innerText ?? null`);
await size(1600, 900);
await openWith(BASE + '?ui=2', seed);
phase = 'constraints off';
await click('.rail .ritem', 'Constraints'); await sleep(500);
facts.expOff = await text('#expoff');
await shot('01-constraints-experience-off', 800);
phase = 'budget';
await typeIn('Set-up budget ($)', '300'); await typeIn('Monthly limit ($ a month)', '25'); await typeIn('Time per week (min)', '60'); await sleep(400);
facts.budgetRead = await ev(`[...document.querySelectorAll('.limrow input')].map(e => e.value)`);
await shot('02-constraints-budget-set', 600);
phase = 'experience on';
await click('.tglrow', 'Count my experience'); await sleep(300);
await click('.seg button', 'New to it'); await sleep(300);
await shot('03-constraints-experience-on', 600);
await click('.btn', 'More detail'); await sleep(300); await click('.row .seg button', 'Experienced'); await sleep(300);
await shot('04-constraints-per-area', 600);
await click('.row .seg button', 'New to it'); await sleep(200);
phase = 'home';
await click('.group .gh', 'Your home'); await sleep(300);
await typeIn('Room temperature (deg F)', '70'); await typeIn('Electricity ($ per kWh)', '0.15'); await sleep(400);
await ev(`(() => { const s = document.querySelector('select[aria-label="Water source"]'); s.value = 'well'; s.dispatchEvent(new Event('change', { bubbles: true })); return true })()`); await sleep(300);
await scrollTo('.group .gh', 'Your home'); await shot('05-constraints-your-home', 600);
facts.homeRead = await ev(`[...document.querySelectorAll('#lim-home input, #lim-home select')].map(e => e.value)`);
facts.stored = await ev(`(() => { const s = JSON.parse(localStorage.getItem('tanklook.scene')); const b = s.tanks[s.active].brief; return { budget: b.items['constraints.budget'], room: b.items['constraints.roomTempC'], home: b.project?.home, tc: s.tanks[s.active].constraints } })()`);
phase = 'link';
await click('.rail .ritem', 'Tank'); await sleep(300);
await ev(`dispatchEvent(new CustomEvent('ui2:open', { detail: { section: 'constraints', group: 'home' } })); true`); await sleep(600);
facts.linkOpened = await ev(`[document.querySelector('.panel')?.getAttribute('aria-label'), !!document.querySelector('#lim-home .group.open')]`);
phase = 'suggest';
await click('.group .gh', 'If it does not all fit'); await sleep(300);
await click('.btn.primary', 'Fill in what I left open');
facts.suggest = await waitFor(`!!document.querySelector('.fitcard') || !!document.querySelector('#fitnone')`, 240000);
await sleep(1200);
await scrollTo('.group .gh', 'If it does not all fit'); await shot('06-suggest-300-budget', 800);
facts.suggestCards = await ev(`[...document.querySelectorAll('.fitcard')].map(e => e.innerText)`);
phase = 'prefs';
await click('.rail .ritem', 'Preferences'); await sleep(600);
await shot('07-preferences-style-cards', 1200);
await click('.card.style', 'Iwagumi'); await click('.card.style', 'Colorful decorative'); await click('.card.style', 'Themed'); await click('.card.style', 'Themed'); await click('.avoidchips .btn', 'Snails'); await sleep(500);
facts.cardStates = await ev(`[...document.querySelectorAll('.card.style')].map(e => e.querySelector('.sname').textContent + ': ' + e.querySelector('.sst').textContent)`);
await shot('08-preferences-liked-and-dont-want', 600);
await click('.group .gh', 'Browse looks'); await sleep(400); await shot('09-preferences-browse-looks', 600);
phase = 'discover gated';
await click('.rail .ritem', 'Discover'); await sleep(500);
await click('.card.mode', 'Whole tank'); await click('.discover .btn.primary', '');
facts.gallery = await waitFor(`document.querySelectorAll('.card.gal').length >= 1 && !document.querySelector('.discover .hint[role=status]')`, 240000);
await sleep(2500); await shot('10-discover-experience-new', 800);
facts.galleryText = await ev(`[...document.querySelectorAll('.card.gal')].map(e => e.innerText).join(' --- ')`);
phase = 'phone';
await size(390, 844, true);
await openWith(BASE + '?ui=2', seed);
await click('.tabbar button', 'More'); await click('.morerow', 'Constraints'); await sleep(800); await shot('11-phone-constraints', 1200);
await click('.tabbar button', 'More'); await click('.morerow', 'Preferences'); await sleep(800); await shot('12-phone-preferences', 1200);
phase = 'old reads';
await size(1600, 900);
await send('Page.navigate', { url: BASE }); await sleep(1500);
await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(seed)}); true`);
await send('Page.navigate', { url: BASE + '?ui=2' });
for (let i = 0; i < 90; i++) { if (await ev(`document.body.dataset.ui2 === 'ready'`).catch(() => false)) break; await sleep(1000); }
await sleep(6000);
await click('.rail .ritem', 'Constraints'); await sleep(400);
await typeIn('Set-up budget ($)', '300'); await typeIn('Monthly limit ($ a month)', '25'); await click('.tglrow', 'No new equipment'); await click('.group .gh', 'Your home'); await typeIn('Room temperature (deg F)', '70'); await sleep(1500);
await send('Page.navigate', { url: BASE }); await waitFor(`!!document.querySelector('#c')`, 90000); await sleep(6000);
await ev(`document.querySelector('details[data-sec=limits]').open = true; true`); await sleep(1500);
facts.oldLimits = await ev(`({ inputs: [...document.querySelectorAll('#limitsHost input, #limitsHost select')].map(e => (e.type === 'checkbox' ? e.checked : e.value)), noNew: document.getElementById('cnNoNew').checked, text: document.getElementById('limitsHost').innerText.slice(0, 300) })`);
await shot('13-old-ui-limits-read-ui2-values', 800);
facts.oldShell = await ev(`({ ui2: !!document.getElementById('ui2'), app: !!document.getElementById('app') })`);
facts.errors = errors;
writeFileSync(`${OUT}/facts.json`, JSON.stringify(facts, null, 1));
console.log(JSON.stringify({ errors, facts: Object.keys(facts) }));
ws.close(); ch.kill(); process.exit(0);
