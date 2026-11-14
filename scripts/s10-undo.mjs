// Lane S10 (2026-11-14): proof shots of shell step 10 (?ui=2): Tank section, docked picker, custom tank maker with its glass panel, phone,
// and the old shell unchanged. From a production build:
//   npx vite build && npx vite preview --port 6311 --strictPort   (another shell), then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/s10-shots.mjs
// -> research/screens/S10/*.jpg + facts.json. The tank is the "Planted community" example (mockup 01's), seeded as the autosave.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6311/', PORT = 9461, OUT = 'research/screens/S10';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s10u-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
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


const errors = []; let phase = 'start';
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(phase + ': ' + d.params.exceptionDetails.exception?.description?.slice(0, 200)); });
const waitFor = async (expr, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(700); } return false; };
await size(1600, 900);
await send('Page.navigate', { url: BASE }); await sleep(2500);
await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(seed)}); true`);
await send('Page.navigate', { url: BASE + '?ui=2' });
await waitFor(`document.body.dataset.ui2 === 'ready' && !!window.__gb`, 120000); await sleep(8000);
const snap = () => ev(`JSON.stringify(window.__gb.store.scene)`);
const facts = {};
const run = async (mode, apply) => {
  await click('.rail .ritem', 'Discover'); await sleep(300);
  if (!(await ev(`!!document.querySelector('.card.mode')`))) await click('.dback .btn', 'All modes');
  await click('.card.mode', mode); await click('.discover .btn.primary', '');
  await waitFor(`!!document.querySelector('.card.preview')`, 240000); await sleep(1500);
  const before = await snap(); const rev = await ev(`window.__gb.store.rev`);
  const during = await snap();   // the preview is showing: the design must be as it was
  await click('.dacts .btn', apply); await sleep(800); const after = await snap();
  await click('.apphead .btn[aria-label="Undo"]', ''); await sleep(800); const undone = await snap();
  await click('.apphead .btn[aria-label="Redo"]', ''); await sleep(500); const redone = await snap();
  await click('.apphead .btn[aria-label="Undo"]', ''); await sleep(500);
  facts[mode + ' ' + apply] = { previewWroteNothing: before === during, applyChanged: before !== after, undoRestoredExactly: before === undone, redoReapplied: redone === after, oneUndoStep: (await snap()) === before };
};
phase = 'remix apply'; await run('Remix', 'Apply');
phase = 'explore keep'; await run('Explore', 'Keep');
writeFileSync(`${OUT}/undo-facts.json`, JSON.stringify({ facts, errors }, null, 1)); console.log(JSON.stringify({ facts, errors }));
ws.close(); ch.kill(); process.exit(0);
