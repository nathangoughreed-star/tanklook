// Lane S1 (2026-11-13): proof shots of the UI2 shell skeleton (?ui=2) from a production build, and the old shell unchanged.
// Run: npx vite build && npx vite preview --port 6331 --strictPort  (in another shell), then
//      powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s1-shots.mjs
// -> research/screens/S1/*.jpg. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6331/', PORT = 9447, OUT = 'research/screens/S1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const size = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
const shot = async name => { await sleep(800); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel.css)})].find(b => b.textContent.includes(${JSON.stringify(sel.text ?? '')})); if (!e) throw new Error('no ' + ${JSON.stringify(JSON.stringify(sel))}); e.click(); return true })()`);
const seed = readFileSync('src/examples/planted.json', 'utf8');
const errors = []; let phase = 'start';
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(phase + ': ' + d.params.exceptionDetails.exception?.description?.slice(0, 200)); });

async function open(url, ui2) {
  await send('Page.navigate', { url: BASE }); await sleep(1500);
  await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(seed)}); true`);
  await send('Page.navigate', { url }); phase = url.replace(BASE, '/') + (await ev('innerWidth').catch(() => ''));
  for (let i = 0; i < 90; i++) { if (await ev(ui2 ? `document.body.dataset.ui2 === 'ready'` : `!!document.querySelector('#c')`).catch(() => false)) break; await sleep(1000); }
  await sleep(9000); // the tank builds and draws (software WebGL)
}

// desktop 1600 x 900
await size(1600, 900);
await open(BASE + '?ui=2', true);
await shot('01-ui2-desktop-tank-section');                                        // Tank section open (an empty placeholder for now)
await click({ css: '.rail .ritem', text: 'Animals' }); await shot('02-ui2-desktop-animals-section');
await click({ css: '.check', text: 'Habitat' }); await sleep(600); await shot('03-ui2-desktop-habitat-drawer');   // the drawer pushes the view aside
await click({ css: '.check', text: '/mo' }); await sleep(600); await shot('04-ui2-desktop-cost-drawer');
await click({ css: '.check', text: '°' }); await sleep(600); await shot('05-ui2-desktop-water-drawer');
await click({ css: '.check', text: 'Notes' }); await sleep(600); await shot('06-ui2-desktop-notes-drawer');
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true`);
await click({ css: '.rail .ritem', text: 'Animals' }); await sleep(600); await shot('07-ui2-desktop-panel-folded');   // the open section's icon folds the panel
const facts = await ev(`({ title: document.title, oldIds: ['app','side','view','c'].filter(i => document.getElementById(i)), checks: [...document.querySelectorAll('.checkbar .check')].map(c => c.textContent.trim()), canvas: [document.querySelector('.vcanvas').width, document.querySelector('.vcanvas').height] })`);

// phone 390 x 844
await size(390, 844, true);
await open(BASE + '?ui=2', true);
await shot('08-ui2-phone');
await click({ css: '.tabbar button', text: 'Tank' }); await sleep(600); await shot('09-ui2-phone-tank-sheet');
await click({ css: '.tabbar button', text: 'More' }); await sleep(600); await shot('10-ui2-phone-more');
await click({ css: '.checkstrip .check', text: 'Habitat' }); await sleep(600); await shot('11-ui2-phone-habitat-drawer');

// the live shell without ?ui=2: unchanged
await size(1600, 900);
await open(BASE, false);
await shot('12-old-shell-unchanged');
const oldFacts = await ev(`({ ui2: !!document.getElementById('ui2'), app: !!document.getElementById('app') })`);

// side by side with UI2 mockup 01
const b64 = f => readFileSync(f).toString('base64');
const mine = b64(`${OUT}/01-ui2-desktop-tank-section.jpg`), mock = b64('research/screens/UI2/01-editor-desktop.png');
phase = 'compose (about:blank)'; await send('Page.navigate', { url: 'about:blank' }); await sleep(500);
await size(1600, 1890);
await ev(`(() => { document.documentElement.innerHTML = '<body style="margin:0;overflow:hidden;background:#111;color:#ddd;font:600 15px system-ui"><div style="padding:6px 10px">UI2 mockup 01 (approved design)</div><img style="display:block;width:1600px" src="data:image/png;base64,${mock}"><div style="padding:6px 10px">S1 build, ?ui=2 (Tank section is a placeholder until shell step 3)</div><img style="display:block;width:1600px" src="data:image/jpeg;base64,${mine}"></body>'; return new Promise(r => setTimeout(r, 800)) })()`);
await shot('00-mockup01-vs-ui2');

writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, oldFacts, errors }, null, 1));
console.log(JSON.stringify({ facts, oldFacts, errors }));
ws.close(); ch.kill();
process.exit(0);
