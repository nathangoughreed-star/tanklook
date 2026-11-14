// Lane S7 (2026-11-14): proof shots of shell step 7 (?ui=2): Scape and Plants sections, piece editor, brush bar, growth, phone, round trip. From a production build:
//   npx vite build && npx vite preview --port 6337 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s7-shots.mjs
// -> research/screens/S7/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6337/', PORT = 9467, OUT = 'research/screens/S7';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s7-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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
const seedObj = JSON.parse(readFileSync('src/examples/planted.json', 'utf8')), seed = JSON.stringify(seedObj);
// the same example with the plant gate on: low light, low-tech care chosen (the light / care choice itself lives in steps 5 / 6)
const gated = structuredClone(seedObj); { const L = gated.tanks[gated.active].layout; L.fit = 'low'; L.careSet = true; L.gatePlants = true; gated.tanks[gated.active].grow = { feed: 'low', time: 0, mode: 'rel' }; }
const errors = []; let phase = 'start';
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(phase + ': ' + (d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text).slice(0, 300)); });
const facts = {};
const ready = async () => { for (let i = 0; i < 90; i++) { if (await ev(`document.body.dataset.ui2 === 'ready'`).catch(() => false)) break; await sleep(1000); } await sleep(9000); };
const open2 = async (scene) => {
  await send('Page.navigate', { url: BASE }); await sleep(1500);
  await ev(`localStorage.clear(); ${scene ? `localStorage.setItem('tanklook.scene', ${JSON.stringify(typeof scene === 'string' ? scene : JSON.stringify(scene))});` : ''} true`);
  await send('Page.navigate', { url: BASE + '?ui=2' });
  await ready();
};
const slider = (label, v) => ev(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); if (!e) throw new Error('no slider ${label}'); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true })()`);
const type = (label, v) => ev(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); return true })()`);
const sel = (label, v) => ev(`(() => { const e = document.querySelector('select[aria-label=${JSON.stringify(label)}]'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('change', { bubbles: true })); return true })()`);
const savedItems = `(() => { const sc = JSON.parse(localStorage.getItem('tanklook.scene')); const t = sc.tanks[sc.active]; return { n: t.items.length, subs: t.substrate.type + '/' + t.substrate.show, kept: (t.locks?.objects ?? []).length, variants: [...new Set(t.items.map(i => i.variant))].sort().join(',') }; })()`;
const waitOld = async () => { for (let i = 0; i < 90; i++) { if (await ev(`!!document.querySelector('#c')`).catch(() => false)) break; await sleep(1000); } await sleep(9000); };

// ---------- desktop 1600 x 900
await size(1600, 900);
await open2(null); phase = 'empty tank scape';
await click('.rail .ritem', 'Scape');
await shot('01-scape-empty-tank', 2500);
facts.empty = await ev(`document.querySelector('.placed .hint')?.textContent`);

await open2(seed); phase = 'substrate brush';
await click('.rail .ritem', 'Scape');
await click('.group .gh', 'Scatter brush'); await sel('Brush', 'pebble');
await click('.gb .btn', 'Paint with it'); await sleep(500);
await shot('02-scape-substrate-brush-in-use', 2500);
facts.brush = await ev(`({ bar: document.querySelector('.scapebars [aria-label=Brush]')?.innerText })`);
await click('.scapebars .btn', 'Done');

await click('.group .gh', 'Scatter brush'); phase = 'substrate';
await sel('Substrate type', 'custom'); await sleep(800);
await shot('03-scape-substrate-custom-blend', 2500);
facts.substrate = await ev(`document.querySelector('.group.open .gb')?.innerText.slice(0, 300)`);
await sel('Substrate type', 'gravel');

await click('.group .gh', 'Substrate'); await click('.group .gh', 'Terrain'); phase = 'terrain';
await click('.tglrow', 'Custom terrain'); await sleep(2000);
// turning custom terrain on starts point editing, as the old panel does
await shot('04-scape-terrain-open-edit-points', 3000);
facts.terrain = await ev(`document.querySelector('.group.open .gb')?.innerText.slice(0, 300)`);
await click('.gb .btn', 'Done editing'); await click('.tglrow', 'Custom terrain'); await click('.group .gh', 'Terrain');

phase = 'hardscape library';
await type('Search stones, wood, caves, decor', 'stone');
await scrollTo('.scape .cap', 'Add hardscape');
await shot('05-scape-hardscape-library-search', 2500);
facts.library = await ev(`[...document.querySelectorAll('.libRow')].map(r => r.querySelector('.cap').textContent + ': ' + r.querySelectorAll('.chip').length)`);
await type('Search stones, wood, caves, decor', '');
const before = await ev(`document.querySelectorAll('.placed .pr, .placed .pg').length`);
await click('.libRow .chip', 'Seiryu'); await sleep(1500);
phase = 'piece editor';
await shot('06-scape-piece-editor-keep', 2500);
await click('.pieced .btn', 'Keep'); await sleep(600);
facts.editor = await ev(`({ name: document.querySelector('.pieced .t')?.innerText, sliders: [...document.querySelectorAll('.pieced .row .lbl')].map(e => e.textContent), keepPressed: document.querySelector('.pieced .btn[aria-pressed=true]')?.textContent, placedBefore: ${before}, placedAfter: document.querySelectorAll('.placed .pr, .placed .pg').length })`);
await shot('07-scape-kept-piece', 1500);

await click('.rail .ritem', 'Plants'); phase = 'plants';
await shot('08-plants-planted-example', 3000);
facts.plants = await ev(`({ placed: document.querySelector('.placed .cap')?.innerText, rows: [...document.querySelectorAll('.placed .pr .nm, .placed .pg .nm')].slice(0, 8).map(e => e.textContent), gate: document.querySelector('.tglrow')?.getAttribute('aria-checked') })`);

phase = 'growth';
await slider('Time', 70); for (let i = 0; i < 120; i++) { if (await ev(`!!document.querySelector('.growask')`)) break; await sleep(1000); }
await shot('09-plants-growth-time-70', 2500);
facts.growth = await ev(`({ hint: document.querySelector('.group.open .hint')?.innerText, ask: document.querySelector('.growask')?.innerText, sum: document.querySelector('.group .sum')?.textContent })`);
await click('.growask .btn', 'Undo'); await sleep(1500);
facts.growthUndone = await ev(`document.querySelector('.group .sum')?.textContent`);

await open2(gated); phase = 'greyed';
await click('.rail .ritem', 'Plants'); await click('.group .gh', 'Growth over time');
await scrollTo('.plants .cap', 'Add plants');
await shot('10-plants-greyed-with-reason', 3000);
facts.greyed = await ev(`({ toggle: document.querySelector('.tglrow')?.innerText, hint: [...document.querySelectorAll('.plants > .hint')].map(e => e.innerText), greyed: [...document.querySelectorAll('.gatedRow')].slice(0, 6).map(r => r.innerText.split(String.fromCharCode(10)).join(' | ')) })`);

await open2(null); phase = 'round trip';
await click('.rail .ritem', 'Scape');
await sel('Substrate type', 'pea');
await click('.libRow .chip', 'Seiryu'); await sleep(800);
await click('.pieced .btn', 'Keep'); await sleep(600);
await click('.rail .ritem', 'Plants'); await click('.libRow .chip', 'Anubias'); await sleep(800);
await click('.libRow .chip', 'Vallisneria').catch(() => {}); await sleep(2000);
await shot('11-made-in-ui2', 2500);
facts.saved = await ev(savedItems);
const saved = await ev(`localStorage.getItem('tanklook.scene')`);
await send('Page.navigate', { url: BASE }); await sleep(1500);
await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(saved)}); true`);
await send('Page.navigate', { url: BASE }); phase = 'old ui';
await waitOld();
facts.oldUi = await ev(`({ hard: document.getElementById('itemCountHard')?.textContent, plant: document.getElementById('itemCountPlant')?.textContent, sub: document.getElementById('subType')?.value })`);
facts.oldUiSaved = await ev(savedItems);
await shot('12-old-ui-same-scape', 1500);

await size(390, 844, true);
await open2(seed); phase = 'phone';
await click('.tabbar button', 'Scape'); await shot('13-phone-scape-sheet', 2500);
await click('.tabbar button', 'Plants'); await shot('14-phone-plants-sheet', 2500);

await size(1600, 900);
await send('Page.navigate', { url: BASE }); await sleep(1500);
await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(seed)}); true`);
await send('Page.navigate', { url: BASE }); phase = 'old shell';
await waitOld();
await shot('15-old-shell-unchanged');
facts.oldShell = await ev(`({ ui2: !!document.getElementById('ui2'), app: !!document.getElementById('app') })`);

phase = 'compose'; await send('Page.navigate', { url: 'about:blank' }); await sleep(500);
await size(1600, 1890);
await ev(`(() => { document.documentElement.innerHTML = '<body style="margin:0;overflow:hidden;background:#111;color:#ddd;font:600 15px system-ui"><div style="padding:6px 10px">UI2 mockup 01 (approved design)</div><img style="display:block;width:1600px" src="data:image/png;base64,${readFileSync('research/screens/UI2/01-editor-desktop.png').toString('base64')}"><div style="padding:6px 10px">S7: Plants (planted example)</div><img style="display:block;width:1600px" src="data:image/jpeg;base64,${readFileSync(OUT + '/08-plants-planted-example.jpg').toString('base64')}"></body>'; return true })()`);
await shot('00-mockup01-vs-s7', 500);
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ errors }));
ws.close(); ch.kill();
process.exit(0);
