// P2: before / after shots of the Animals panel (a stocked example, care gates on so one animal is greyed with its reason, Add, + / - on a row) to prove the move of the stocking edits and picker fit / gate logic into scene/stockEdit.ts and ui/logic/animalPicker.ts changed nothing. Run once per build:
//   URL=http://localhost:5972/ TAG=before node scripts/p2-shots.mjs   (origin/main)
//   URL=http://localhost:5971/ TAG=after  node scripts/p2-shots.mjs   (this branch)
// Shots: research/screens/P2/<TAG>-<n>-<step>.png (full window) and -panel.png (the Tank section only), plus <TAG>-state.json.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5971/', TAG = process.env.TAG ?? 'after', PORT = 9300 + (TAG === 'before' ? 1 : 2);
const DIR = 'research/screens/P2'; mkdirSync(DIR, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/p2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const states = {};
const step = async name => {
  await sleep(1500);
  let r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${DIR}/${TAG}-${name}.png`, Buffer.from(r.result.data, 'base64'));
  const b = await ev(`(() => { const e = document.querySelector('details[data-sec="fish"]'); e.scrollIntoView({ block: 'start' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, innerHeight - r.top) } })()`);
  await sleep(300);
  r = await send('Page.captureScreenshot', { format: 'png', clip: { ...b, scale: 1 } }); writeFileSync(`${DIR}/${TAG}-${name}-panel.png`, Buffer.from(r.result.data, 'base64'));
  states[name] = await ev(`(() => { const t = window.__gb.store.tank, c = {}; for (const f of t.fish) c[f.species] = (c[f.species] ?? 0) + 1; return JSON.stringify({ counts: c, status: document.getElementById('status')?.textContent ?? '', picks: [...document.querySelectorAll('#spResults button')].slice(0, 12).map(b => b.textContent + '|' + b.title), list: [...document.querySelectorAll('.sr')].map(r => r.textContent) }) })()`).then(JSON.parse);
  console.log('shot', name);
};
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.confirm = () => true; true`);
  await ev(`(() => { const { store } = window.__gb; store.update(s => { s.units = 'in'; const t = s.tanks[0]; t.layout.gateStock = true; t.layout.gateAnimals = true; t.layout.expertise = 1; }); Math.random = (() => { let a = 12345; return () => (a = (a * 1664525 + 1013904223) % 4294967296) / 4294967296; })(); return true })()`);
  await ev(`(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); const d = document.querySelector('details[data-sec="fish"]'); d.open = true; return true })()`);
  await step('1-animals-gated');
  await ev(`(() => { document.getElementById('spSearch').value = 'discus'; document.getElementById('spSearch').dispatchEvent(new Event('input')); return true })()`);
  await sleep(1500);
  await step('2-search-discus-greyed');
  await ev(`(() => { document.getElementById('spSearch').value = 'cherry'; document.getElementById('spSearch').dispatchEvent(new Event('input')); return true })()`);
  await sleep(500);
  await ev(`(() => { document.getElementById('addFish').click(); return true })()`);
  await step('3-add-cherry-barb');
  await ev(`(() => { document.querySelector('#stockList .up, .sr .up').click(); document.querySelector('.sr .up').click(); return true })()`);
  await step('4-plus-twice');
  await ev(`(() => { document.querySelector('.sr .dn').click(); return true })()`);
  await step('5-minus-once');
} catch (e) { console.log('ERROR', e.message); }
writeFileSync(`${DIR}/${TAG}-state.json`, JSON.stringify(states, null, 1));
ch.kill(); process.exit(0);
