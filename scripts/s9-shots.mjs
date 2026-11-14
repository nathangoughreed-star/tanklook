// Lane S9 (2026-11-13): proof shots of shell step 9 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6339 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s9-shots.mjs
// -> research/screens/S9/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6339/', PORT = 9459, OUT = 'research/screens/S9';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s9-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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
const cnt = () => ev(`document.querySelectorAll('.cmpside').length`);
// ---------- desktop 1600 x 900
await size(1600, 900);
await open(BASE + '?ui=2', true); phase = 'desktop';
await shot('01-before-compare-one-tank', 800);
await click('.cluster .btn', 'Compare'); facts.sidesAfterCompare = await cnt();
await shot('02-compare-open-linked', 6000);
// a difference: tank B loses some animals and gets a different water level look; edit only B (default)
await ev(`(() => { const s = window.__gb.store; s.editTank(1, t => { t.fish = t.fish.slice(0, Math.max(1, Math.floor(t.fish.length / 2))); }); return true })()`);
await shot('03-compare-differences-marked', 4000);
facts.diffMarks = await ev(`document.querySelectorAll('.cmpside .check.differs').length`);
await ev(`document.querySelector('.cmpside.s1 .diffs').focus(); true`);
await shot('04-diffs-list-on-hover', 800);
await ev(`document.activeElement.blur(); true`);
await click('.cmpside.s0 .check', 'Habitat'); await shot('05-drawer-both-tanks', 1500);
await click('.cmpdrawer .btn', ''); // close
// linked orbit: drag/orbit through the store's camera, both views must move
facts.camBefore = await ev(`JSON.stringify(window.__gb.store.scene.tanks.map(t => [t.camera.az, t.camera.el]))`);
await ev(`window.__gb.store.cam(c => { c.az = 35; c.el = 12; }); true`); await shot('06-linked-orbit', 3000);
facts.camLinked = await ev(`JSON.stringify(window.__gb.store.scene.tanks.map(t => [t.camera.az, t.camera.el]))`);
await click('.cluster .btn', 'Views linked'); facts.linkWord = await ev(`[...document.querySelectorAll('.cluster .btn')].map(b => b.textContent.trim()).join('|')`);
await shot('07-views-independent', 800);
await click('.cluster .btn', 'Views independent');
await click('.editbar .seg button', 'Both'); await shot('08-editing-both', 800);
facts.edit = await ev(`document.querySelector('.editbar .seg .on')?.textContent`);
await click('.cmpside.s1 .useone', ''); facts.afterUse = await ev(`JSON.stringify({ tanks: window.__gb.store.scene.tanks.length, fish: window.__gb.store.tank.fish.length })`);
await shot('09-use-this-one-B-kept', 3000);
await ev(`window.__gb.store.undo(); true`); await sleep(600); facts.afterUndo = await ev(`window.__gb.store.scene.tanks.length`);
await click('.cluster .btn', 'End compare'); facts.afterEnd = await ev(`window.__gb.store.scene.tanks.length`);
await shot('10-end-compare', 2500);
// ---------- phone 390 x 844
await size(390, 844, true);
await open(BASE + '?ui=2', true); phase = 'phone';
await click('.cluster .btn', 'Compare');
await ev(`window.__gb.store.editTank(1, t => { t.fish = t.fish.slice(0, 3); }); true`);
await shot('11-phone-compare', 6000);
await click('.cmpstrip .seg button', 'Tank A'); await shot('12-phone-tank-A-checks', 1200);
await click('.cmpstrip .check', 'Habitat'); await shot('13-phone-drawer', 1500);
// ---------- the live shell without ?ui=2: split still works
await size(1600, 900);
await open(BASE, false); phase = 'old shell';
await ev(`document.getElementById('split').click(); true`); await shot('14-old-shell-split-still-works', 6000);
facts.oldSplit = await ev(`({ ui2: !!document.getElementById('ui2'), sv: document.querySelector('.sv-split') !== null || document.getElementById('camLock') !== null, lock: document.getElementById('camLock')?.textContent.trim() })`);
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ facts, errors }));
ws.close(); ch.kill();
process.exit(0);
