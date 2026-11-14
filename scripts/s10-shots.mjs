// Lane S10 (2026-11-14): proof shots of shell step 10 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6310 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s10-shots.mjs
// -> research/screens/S10/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6310/', PORT = 9460, OUT = 'research/screens/S10';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s10-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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
// ---------- desktop 1600 x 900
await size(1600, 900);
await openWith(BASE + '?ui=2', seed);
await click('.rail .ritem', 'Discover'); await shot('01-discover-modes', 1200);
facts.modes = await ev(`[...document.querySelectorAll('.card.mode .t')].map(e => e.textContent)`);
for (const [m, name] of [['Explore', '02-explore-preview'], ['Remix', '03-remix-preview'], ['Refine', '04-refine-preview']]) {
  phase = m;
  await click('.card.mode', m);
  await click('.discover .btn.primary', ''); 
  facts[m] = await waitFor(`!!document.querySelector('.card.preview') || !!document.querySelector('.dfail')`);
  await sleep(2500); await shot(name, 800);
  facts[m + 'Rows'] = await ev(`document.querySelector('.card.preview')?.innerText ?? document.querySelector('.dfail')?.innerText ?? ''`);
  if (m === 'Remix') {   // Apply then Undo restores the design exactly
    const before = await saved(); phase = 'apply';
    await click('.dacts .btn', 'Apply'); await sleep(1500); const after = await saved();
    await click('.apphead .btn[aria-label="Undo"]', ''); await sleep(1500); const undone = await saved();
    facts.applyUndo = { changedByApply: before !== after, note: 'exact restore is checked in s10-undo.mjs (dev build, store JSON)' };
    await click('.dback .btn', 'All modes'); continue;
  }
  await click('.dback .btn', 'All modes');
}

const typeIn = (label, v) => ev(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
// ---------- Fill only the gaps (a tank with no animals)
phase = 'gaps';
await openWith(BASE + '?ui=2', JSON.stringify(noFish));
await click('.rail .ritem', 'Discover'); await click('.card.mode', 'Fill only the gaps'); await sleep(500);
facts.gapChips = await ev(`[...document.querySelectorAll('.chip')].map(e => e.textContent)`);
await click('.chip', 'Fill Animals'); await waitFor(`!!document.querySelector('.card.preview') || !!document.querySelector('.dfail')`); await sleep(2500); await shot('05-fill-gaps-preview', 800);
facts.gapRows = await ev(`document.querySelector('.card.preview')?.innerText ?? document.querySelector('.dfail')?.innerText ?? ''`);
// ---------- Whole tank gallery
phase = 'whole';
await click('.dback .btn', 'All modes'); await click('.card.mode', 'Whole tank'); await click('.discover .btn.primary', '');
facts.gallery = await waitFor(`document.querySelectorAll('.card.gal').length >= 2 && !document.querySelector('.discover .hint[role=status]')`, 240000);
await sleep(2500); await shot('06-whole-tank-gallery', 800);
facts.galleryN = await ev(`document.querySelectorAll('.card.gal').length`);
// ---------- This or that
phase = 'thisthat';
await click('.dback .btn', 'All modes'); await click('.card.mode', 'This or that');
facts.pair = await waitFor(`!!document.querySelector('.pairs') || !!document.querySelector('.dnote')`, 240000);
await sleep(3500); await shot('07-this-or-that', 800);
facts.pairText = await ev(`document.querySelector('.pairs')?.innerText ?? document.querySelector('.dnote')?.innerText ?? ''`);
await click('.dback .btn', 'All modes');
// ---------- Ideas for Plants
phase = 'ideas';
await openWith(BASE + '?ui=2', seed);
await click('.rail .ritem', 'Plants'); await shot('08a-ideas-button-in-plants-header', 800);
facts.ideasBtn = await ev(`document.querySelector('.panel .sec-head .btn.ideas')?.textContent ?? null`);
await click('.btn.ideas', ''); await sleep(600);
facts.scoped = await ev(`document.querySelector('.dscope')?.innerText ?? null`);
await click('.card.mode', 'Remix'); await click('.discover .btn.primary', '');
await waitFor(`!!document.querySelector('.card.preview') || !!document.querySelector('.dfail')`); await sleep(2500); await shot('08-ideas-for-plants-scoped', 800);
facts.scopedRows = await ev(`document.querySelector('.card.preview')?.innerText ?? document.querySelector('.dfail')?.innerText ?? ''`);
// ---------- Get started on a new tank, and the animal-first door
phase = 'checklist';
await openWith(BASE + '?ui=2', null);
await shot('09-get-started-new-tank', 1500);
facts.checklist = await ev(`document.querySelector('.getstarted')?.innerText ?? null`);
await click('.gsanimal', ''); await typeIn('Search animals', 'neon'); await sleep(500);
await click('.animalfound .card', ''); await sleep(600); await shot('10-animal-door', 800);
facts.door = await ev(`document.querySelector('.doorplan')?.innerText ?? null`);
await click('.dlg .btn.primary', 'Plan this tank'); await sleep(9000); await shot('11-animal-door-result', 800);
facts.afterDoor = await ev(`({ name: document.querySelector('.proj, .apphead')?.innerText?.slice(0, 60), card: !!document.querySelector('.getstarted') })`);
// ---------- phone 390 x 844
await size(390, 844, true);
phase = 'phone';
await openWith(BASE + '?ui=2', seed);
await click('.tabbar button', 'More'); await click('.morerow', 'Discover'); await sleep(800); await shot('12-phone-discover-modes', 1200);
await click('.card.mode', 'Remix'); await click('.discover .btn.primary', '');
await waitFor(`!!document.querySelector('.card.preview') || !!document.querySelector('.dfail')`); await sleep(2500); await shot('13-phone-remix-preview', 800);
await openWith(BASE + '?ui=2', null);
await ev(`document.querySelector('.gstitle')?.click(); true`); await shot('14-phone-get-started', 1200);
await click('.gsanimal', ''); await typeIn('Search animals', 'neon'); await sleep(500); await click('.animalfound .card', ''); await shot('15-phone-animal-door', 800);
// ---------- the live shell without ?ui=2: unchanged
await size(1600, 900);
phase = 'old shell';
await send('Page.navigate', { url: BASE }); await sleep(1500);
await ev(`localStorage.clear(); true`);
await send('Page.navigate', { url: BASE });
await waitFor(`!!document.querySelector('#c')`, 90000); await sleep(6000);
await shot('16-old-shell-unchanged');
facts.oldShell = await ev(`({ ui2: !!document.getElementById('ui2'), app: !!document.getElementById('app') })`);
phase = 'done';
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1)); console.log(JSON.stringify({ errors })); ws.close(); ch.kill(); process.exit(0);
