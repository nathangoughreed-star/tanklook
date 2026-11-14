// Lane S4 (2026-11-14): proof shots of shell step 3 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6334 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s4-shots.mjs
// -> research/screens/S4/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6334/', PORT = 9459, OUT = 'research/screens/S4';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s4-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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

// ---------- desktop 1600 x 900
await size(1600, 900);
await open2(null); phase = 'empty tank';
await click('.rail .ritem', 'Animals');
await shot('01-animals-empty-tank', 2500);
facts.emptyTank = await ev(`({ stock: document.querySelector('.animals .hint')?.textContent, fits: document.querySelector('.tglrow')?.getAttribute('aria-checked'), rows: document.querySelectorAll('.prow').length })`);

await open2(seed); phase = 'stocked';
await click('.rail .ritem', 'Animals');
await shot('02-animals-stocked-example', 3000);
facts.stocked = await ev(counts);
await click('.group .gh', 'Water look'); await shot('03-animals-water-look-open', 1500);
facts.water = await ev(`document.querySelector('.group.open .gb').innerText`);
await click('.group .gh', 'Water look');

// a greyed animal with its reason: "Fits this tank" off, search a big one
await click('.tglrow', 'Fits this tank'); await type('Search animals', 'oscar'); phase = 'greyed';
await scrollTo('.animals .cap', 'Add animals');
await shot('04-animals-greyed-with-reason', 2500);
facts.greyed = await ev(`[...document.querySelectorAll('.prow')].map(r => r.innerText.replace(/\n/g, ' | '))`);
await click('.tglrow', 'Fits this tank'); await type('Search animals', '');
facts.fitsBackOn = await ev(`document.querySelector('.tglrow').getAttribute('aria-checked')`);

// Selection drawer: click a row of the list
await click('.stock .sr .nm', ''); phase = 'selection';
await shot('05-selection-drawer-open', 3000);
facts.selection = await ev(`document.querySelector('.drawer')?.innerText`);
facts.rowHighlighted = await ev(`!!document.querySelector('.sr.sel')`);

// a stocking made here: add a betta, wait for the autosave, read the saved scene
await click('.drawer .btn[aria-label="Close"]', ''); await type('Search animals', 'betta');
await click('.prow .btn', 'Add'); await sleep(1500);
await shot('06-added-an-animal', 2000);
await sleep(800);
facts.ui2List = await ev(counts);
facts.savedCounts = await ev(`(() => { const sc = JSON.parse(localStorage.getItem('tanklook.scene')); const t = sc.tanks[sc.active]; const m = {}; for (const f of t.fish) m[f.species] = (m[f.species] ?? 0) + 1; return m; })()`);
const saved = await ev(`localStorage.getItem('tanklook.scene')`);

// tank change -> misfits: the saved scene made saltwater, reloaded
await ev(`(() => { const sc = JSON.parse(localStorage.getItem('tanklook.scene')); sc.tanks[sc.active].water.salt = true; localStorage.setItem('tanklook.scene', JSON.stringify(sc)); return true })()`);
await send('Page.navigate', { url: BASE + '?ui=2' }); await ready();
await click('.rail .ritem', 'Animals').catch(() => {}); phase = 'misfits';
await shot('07-misfits-after-tank-change', 2500);
facts.misfit = await ev(`document.querySelector('.misnote')?.innerText`);

// the old UI opens the scene saved above: the same counts
await send('Page.navigate', { url: BASE }); await sleep(1500);
await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(saved)}); true`);
await send('Page.navigate', { url: BASE }); phase = 'old ui counts';
for (let i = 0; i < 90; i++) { if (await ev(`!!document.querySelector('#c')`).catch(() => false)) break; await sleep(1000); }
await sleep(9000);
facts.oldList = await ev(`[...document.querySelectorAll('#list .sr')].map(r => r.querySelector('.nm').textContent.trim() + ' x' + r.querySelector('input').value)`);
await shot('08-old-ui-same-counts', 1500);

// ---------- phone 390 x 844
await size(390, 844, true);
await open2(seed); phase = 'phone';
await click('.tabbar button', 'Animals'); await shot('09-phone-animals-sheet', 2500);
await click('.stock .sr .nm', ''); await shot('10-phone-selection-drawer', 2500);

// ---------- the old site, no ?ui=2
await size(1600, 900);
await open(BASE, false); phase = 'old shell';
await shot('11-old-shell-unchanged');
facts.oldShell = await ev(`({ ui2: !!document.getElementById('ui2'), app: !!document.getElementById('app') })`);

phase = 'compose'; await send('Page.navigate', { url: 'about:blank' }); await sleep(500);
await size(1600, 1890);
for (const [n, mock, mine] of [['01', '01-editor-desktop.png', '02-animals-stocked-example.jpg'], ['03', '03-split-desktop.png', '05-selection-drawer-open.jpg']]) {
  await ev(`(() => { document.documentElement.innerHTML = '<body style="margin:0;overflow:hidden;background:#111;color:#ddd;font:600 15px system-ui"><div style="padding:6px 10px">UI2 mockup ${n} (approved design)</div><img style="display:block;width:1600px" src="data:image/png;base64,${b64('research/screens/UI2/' + mock)}"><div style="padding:6px 10px">S4 build, ?ui=2</div><img style="display:block;width:1600px" src="data:image/jpeg;base64,${b64(OUT + '/' + mine)}"></body>'; return new Promise(r => setTimeout(r, 800)) })()`);
  await shot(`00-mockup${n}-vs-s4`, 500);
}
await size(1000, 1000);
await ev(`(() => { document.documentElement.innerHTML = '<body style="margin:0;overflow:hidden;background:#111;color:#ddd;font:600 15px system-ui;display:flex;gap:10px"><div><div style="padding:6px 10px">UI2 mockup 02 (phone)</div><img style="display:block;height:844px" src="data:image/png;base64,${b64('research/screens/UI2/02-editor-phone.png')}"></div><div><div style="padding:6px 10px">S4 build, 390 x 844</div><img style="display:block;height:844px" src="data:image/jpeg;base64,${b64(OUT + '/09-phone-animals-sheet.jpg')}"></div></body>'; return new Promise(r => setTimeout(r, 800)) })()`);
await shot('00-mockup02-vs-s4', 500);
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, errors }, null, 1));
console.log(JSON.stringify({ errors }));
ws.close(); ch.kill();
process.exit(0);
