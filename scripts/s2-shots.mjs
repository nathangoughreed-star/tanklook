// Lane S2 (2026-11-13): proof shots of shell step 2 (?ui=2): header file menu, Open, Save as, Share link, round trip, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6333 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s2-shots.mjs
// -> research/screens/S2/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6333/', PORT = 9452, OUT = 'research/screens/S2';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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
const text = css => ev(`document.querySelector(${JSON.stringify(css)})?.innerText ?? null`);
const store = () => ev(`JSON.parse(localStorage.getItem('tanklook.scene') || 'null')?.name ?? null`);
await size(1600, 900);
await open(BASE + '?ui=2', true);
phase = 'menu';
await click('.menuwrap .btn', ''); await shot('01-header-file-menu', 800);          // mockup 01 header + the ... menu
facts.menu = await ev(`[...document.querySelectorAll('.pop.menu .btn')].map(b => b.textContent)`);
await click('.menuwrap .btn', '');
// rename by clicking the name
await click('.pnamebtn'); await ev(`(() => { const i = document.querySelector('.pnameedit'); i.value = 'Kitchen planted 40'; i.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true})); return true; })()`);
await sleep(900);
facts.renamed = await ev(`document.querySelector('.pnamebtn').textContent`);
// Save into this browser
await click('.apphead .btn', 'Save'); await shot('02-saved-toast', 800);
facts.afterSave = await ev(`({ lib: JSON.parse(localStorage.getItem('tanklook.library') || '[]').map(e => e.name), cur: localStorage.getItem('tanklook.libCurrent') })`);
// Open window: library + examples
await click('.menuwrap .btn', ''); await click('.pop.menu .btn', 'Open'); await shot('03-open-saved-tanks', 1200);
facts.openRows = await ev(`[...document.querySelectorAll('.dlg .libcard .t')].map(e => e.textContent)`);
await click('.dlg .seg button', 'Examples'); await shot('04-open-examples', 1500);
await click('.dlg .seg button', 'File or link'); await shot('05-open-file-or-link', 800);
await ev(`document.querySelector('.dlg [aria-label=Close]').click(); true`);
// Save as
await click('.menuwrap .btn', ''); await click('.pop.menu .btn', 'Save as'); await shot('06-save-as', 800);
await ev(`document.querySelector('.dlg [aria-label=Close]').click(); true`);
// Share link (clipboard may be blocked headless: prompt() is stubbed)
await ev(`window.prompt = t => { window.__prompted = t; return null; }; true`);
await click('.menuwrap .btn', ''); await click('.pop.menu .btn', 'Share link'); await sleep(2500); await shot('07-share-link', 500);
facts.share = await ev(`document.querySelector('.fstatus')?.innerText ?? ('prompt:' + !!window.__prompted)`);
// round trip: reload resumes the autosave
await send('Page.navigate', { url: BASE + '?ui=2' }); await sleep(2500);
for (let i = 0; i < 60; i++) { if (await ev(`document.body.dataset.ui2 === 'ready'`).catch(() => false)) break; await sleep(1000); }
await sleep(9000); phase = 'resume';
await shot('08-resume-after-reload', 500);
facts.resumed = await ev(`document.querySelector('.pnamebtn')?.textContent`);
facts.autosave = await store();
// the same scene in the OLD site (no ?ui=2): same storage, same autosave
await send('Page.navigate', { url: BASE }); phase = 'old shell'; await sleep(12000);
await shot('09-old-site-opens-same-scene', 500);
facts.old = await ev(`({ ui2: !!document.getElementById('ui2'), app: !!document.getElementById('app'), name: document.getElementById('sceneName')?.value, lib: JSON.parse(localStorage.getItem('tanklook.library') || '[]').map(e => e.name) })`);
await send('Page.navigate', { url: BASE + '?ui=2' }); await sleep(2500);
for (let i = 0; i < 60; i++) { if (await ev(`document.body.dataset.ui2 === 'ready'`).catch(() => false)) break; await sleep(1000); }
await sleep(6000);
// replace guard: edit something unsaved, then open an example
await ev(`(() => { const s = window.__gb; return !!s; })()`).catch(() => {});
await click('.menuwrap .btn', ''); await click('.pop.menu .btn', 'New'); await sleep(1500); await shot('10-new-project-no-question', 500);
facts.newName = await ev(`document.querySelector('.pnamebtn')?.textContent`);
// phone
await size(390, 844, true); await open(BASE + '?ui=2', true); phase = 'phone';
await shot('11-phone-header', 800);
await click('.menuwrap .btn', ''); await shot('12-phone-menu', 600);
await click('.pop.menu .btn', 'Open'); await shot('13-phone-open', 1200);
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ facts, errors }, null, 1));
ws.close(); ch.kill();
