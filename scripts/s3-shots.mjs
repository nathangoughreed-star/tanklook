// Lane S3 (2026-11-13): proof shots of shell step 3 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6333 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s3-shots.mjs
// -> research/screens/S3/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6333/', PORT = 9449, OUT = 'research/screens/S3';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s3-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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
phase = 'tank section';
await shot('01-tank-section-custom');                                                   // the planted example: a custom tank (P9 migration)
await click('.tankcard .btn', 'Change'); phase = 'picker';
await shot('02-picker-both-groups-closed');                                              // mockup 06
await click('.picker .gh', 'Custom tanks'); await click('.picker .gh', 'Commercial tanks');
await click('.picker .chip', '20-40');
await click('.picker .card.pick', '40 Gallon Breeder').catch(() => click('.picker .card.pick', '40'));
await shot('03-picker-open-row-previewed', 4000);                                        // mockup 06b: the highlighted row redraws in the room
facts.pickerRows = await ev(`[...document.querySelectorAll('.picker .card.pick')].length`);
await click('.pickfoot .btn', 'Choose'); phase = 'commercial';
await click('.group .gh', 'Sits on');
await shot('04-tank-section-commercial', 6000);                                          // mockup 01: commercial card, read-only spec, Sits on open
facts.commercialCard = await ev(`document.querySelector('.tankcard').textContent`);

// ---------- maker, from the commercial tank
await click('.btn', 'Make a custom tank from this'); phase = 'maker';
await shot('05-maker-from-commercial', 5000);                                            // mockup 07: own workspace, empty tank on a plain floor
// rimless 48 x 24 x 24 in
await setNum('Length (in)', 48); await setNum('Depth (in)', 24); await setNum('Height (in)', 24);
await click('.mform .seg button', 'Rimless');
await sleep(2500); await scrollTo('.mform .group .gh', 'Glass check');
await shot('06-maker-glass-rimless-48x24x24', 3000);
facts.rimless = await ev(`[...document.querySelectorAll('.mform .gtable')].map(t => t.innerText)`);
await click('.mform .seg button', 'Perimeter + cross'); await sleep(2500); await scrollTo('.mform .group .gh', 'Glass check');
await shot('07-maker-glass-rimless-48x24x24-cross-brace', 2000);
await click('.mform .btn', 'Use this glass');
// rimmed 75 gal (48 x 18 x 21 in)
await setNum('Length (in)', 48); await setNum('Depth (in)', 18); await setNum('Height (in)', 21);
await click('.mform .seg button', 'Rimmed');
await sleep(2500); await scrollTo('.mform .group .gh', 'Glass check');
await shot('08-maker-glass-rimmed-75gal', 3000);
facts.rimmed = await ev(`[...document.querySelectorAll('.mform .gtable')].map(t => t.innerText)`);
facts.rimmedChips = await ev(`[...document.querySelectorAll('.mfacts .fchip')].map(t => t.innerText)`);
await scrollTo('.mform .group .gh', 'Price');
await click('.mform .tglrow', 'Use my own price'); await setNum('My own price, dollars', 520);
await shot('09-maker-price-own', 1500);
await click('.mhead .btn', 'Preview in my setup'); await shot('10-maker-preview-in-my-setup', 4000);
await click('.mhead .btn', 'Back to the maker').catch(() => {}); await sleep(1500);
await ev(`(() => { const e = document.querySelector('.mform input[aria-label=Name]'); e.value = 'Living-room 75'; e.dispatchEvent(new Event('input', { bubbles: true })); return true })()`);
await click('.mhead .btn', 'Save and use in this setup'); phase = 'after save';
await shot('11-tank-section-after-save-and-use', 7000);
facts.afterSave = await ev(`({ card: document.querySelector('.tankcard').textContent, lib: JSON.parse(localStorage.getItem('tanklook.customTanks') || '[]').map(e => ({ name: e.name, v: e.version, price: e.priceUsd, build: !!e.glassBuild })) })`);
await click('.tankcard .btn', 'Change'); await sleep(500);
await shot('12-picker-custom-tank-in-use', 3000);
await click('.picker .sec-head .btn', '');
for (const g of ['Sits on', 'Lid and top', 'Background', 'Room']) await ev(`(() => { const e = [...document.querySelectorAll('.group .gh')].find(b => b.textContent.startsWith(${JSON.stringify(g)})); if (e && e.getAttribute('aria-expanded') !== 'true') e.click(); return true })()`);
await click('.group .gh', 'Tank model');
await shot('13-tank-section-all-groups', 2000);
await click('.tankcard .btn', 'Change'); await sleep(500); await click('.picker .btn', 'New custom tank');
await shot('18-maker-new-custom-tank-box-rimless', 5000);                                // Nathan 11-13: a new custom tank starts as a rimless box; Bow under More
facts.newDefault = await ev(`({ shape: document.querySelector('.mform .seg button.on')?.textContent, rim: [...document.querySelectorAll('.mform .seg button.on')].map(b => b.textContent) })`);
await click('.mhead .btn', 'Cancel');
facts.oldIds = await ev(`['app','side','view','c'].filter(i => document.getElementById(i))`);

// ---------- phone 390 x 844
await size(390, 844, true);
await open(BASE + '?ui=2', true); phase = 'phone';
await click('.tabbar button', 'Tank'); await shot('14-phone-tank-sheet', 2000);
await click('.tankcard .btn', 'Change'); await click('.picker .gh', 'Commercial tanks'); await shot('15-phone-picker', 2000);
await click('.picker .sec-head .btn', '');
await click('.btn', 'Edit').catch(() => {}); await shot('16-phone-maker', 4000);

// ---------- the live shell without ?ui=2: unchanged
await size(1600, 900);
await open(BASE, false); phase = 'old shell';
await shot('17-old-shell-unchanged');
facts.oldShell = await ev(`({ ui2: !!document.getElementById('ui2'), app: !!document.getElementById('app') })`);

// ---------- side by side with the UI2 mockups
const b64 = f => readFileSync(f).toString('base64');
phase = 'compose'; await send('Page.navigate', { url: 'about:blank' }); await sleep(500);
await size(1600, 1890);
for (const [n, mock, mine] of [['01', '01-editor-desktop.png', '04-tank-section-commercial.jpg'], ['06', '06-tank-picker.png', '02-picker-both-groups-closed.jpg'], ['06b', '06b-tank-picker-open.png', '03-picker-open-row-previewed.jpg'], ['07', '07-custom-tank-maker.png', '05-maker-from-commercial.jpg']]) {
  await ev(`(() => { document.documentElement.innerHTML = '<body style="margin:0;overflow:hidden;background:#111;color:#ddd;font:600 15px system-ui"><div style="padding:6px 10px">UI2 mockup ${n} (approved design)</div><img style="display:block;width:1600px" src="data:image/png;base64,${b64('research/screens/UI2/' + mock)}"><div style="padding:6px 10px">S3 build, ?ui=2</div><img style="display:block;width:1600px" src="data:image/jpeg;base64,${b64(OUT + '/' + mine)}"></body>'; return new Promise(r => setTimeout(r, 800)) })()`);
  await shot(`00-mockup${n}-vs-s3`, 500);
}

writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ errors }));
ws.close(); ch.kill();
process.exit(0);
