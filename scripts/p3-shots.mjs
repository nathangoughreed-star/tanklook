// P3: before / after shots of the Plants and Scape (Hardscape) panels (plant gate with greyed plants + reasons, add / nudge / duplicate / remove, the scatter brush bar) to prove the move of the item edits and plant gate into scene/itemEdit.ts and ui/logic/plantGate.ts changed nothing. Run once per build:
//   URL=http://localhost:5972/ TAG=before node scripts/p3-shots.mjs   (origin/main)
//   URL=http://localhost:5971/ TAG=after  node scripts/p3-shots.mjs   (this branch)
// Shots: research/screens/P3/<TAG>-<n>-<step>.png (full window) and -panel.png (the Tank section only), plus <TAG>-state.json.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5971/', TAG = process.env.TAG ?? 'after', PORT = 9300 + (TAG === 'before' ? 1 : 2);
const DIR = 'research/screens/P3'; mkdirSync(DIR, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/p3-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const states = {};
const SEC = { plants: 'plants', scape: 'hardscape' };
const step = async (name, sec) => {
  await sleep(1500);
  let r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${DIR}/${TAG}-${name}.png`, Buffer.from(r.result.data, 'base64'));
  const b = await ev(`(() => { const e = document.querySelector('details[data-sec="${SEC[sec]}"]'); e.scrollIntoView({ block: 'start' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, innerHeight - r.top) } })()`);
  await sleep(300);
  r = await send('Page.captureScreenshot', { format: 'png', clip: { ...b, scale: 1 } }); writeFileSync(`${DIR}/${TAG}-${name}-panel.png`, Buffer.from(r.result.data, 'base64'));
  states[name] = await ev(`(() => { const t = window.__gb.store.tank; return JSON.stringify({ items: t.items.map(i => [i.id, i.variant, +i.x.toFixed(2), +i.depth.toFixed(2), +i.lift.toFixed(2), i.yaw, i.size, i.seed]), gate: !!t.layout.gatePlants, hint: document.getElementById('gatePlantsHint')?.textContent ?? '', gated: [...document.querySelectorAll('#libPlant .gatedRow')].map(r => r.textContent), plist: [...document.querySelectorAll('#plantList .pr, #plantList .pg')].map(r => r.textContent), status: document.getElementById('status')?.textContent ?? '', brush: !document.getElementById('brushBar').hidden }) })()`).then(JSON.parse);
  console.log('shot', name);
};
const js = x => ev(`(() => { ${x}; return true })()`);
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await js(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.confirm = () => true`);
  await js(`const { store } = window.__gb; store.update(s => { s.units = 'in'; const t = s.tanks[0]; t.items = []; t.layout.fit = 'low'; t.layout.careSet = true; t.layout.gatePlants = true; t.grow.feed = 'low'; }); let a = 12345; Math.random = () => (a = (a * 1664525 + 1013904223) % 4294967296) / 4294967296`);
  await js(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); const d = document.querySelector('details[data-sec="plants"]'); d.open = true`);
  await step('1-plants-gate-greyed', 'plants');
  await js(`document.querySelector('#libPlant [data-lib]:not(.gated)').click()`);
  await step('2-add-plant', 'plants');
  await js(`document.querySelector('#libPlant [data-lib]:not(.gated)').click(); document.getElementById('iDup').click(); const e = document.getElementById('iYaw'); e.value = 40; e.dispatchEvent(new Event('input'))`);
  await step('3-two-more-yaw', 'plants');
  await js(`document.querySelector('#plantList .px').click()`);
  await step('4-remove-one', 'plants');
  await js(`document.getElementById('gatePlants').click()`);
  await step('5-gate-off', 'plants');
  await js(`document.querySelector('details[data-sec="plants"]').open = false; document.querySelector('details[data-sec="hardscape"]').open = true; document.querySelector('#libHard [data-lib]').click()`);
  await step('6-scape-add-piece', 'scape');
  await js(`for (const n of ['x1', 'y1', 'd-1']) { const b = document.querySelector('[data-nudge="' + n + '"]'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })) } document.getElementById('iDup').click()`);
  await step('7-scape-nudge-dup', 'scape');
  await js(`document.querySelector('.brushTog').click()`);
  await step('8-scape-brush-bar', 'scape');
  await js(`document.getElementById('brDone').click(); document.getElementById('itemsClearHard').click(); document.getElementById('itemsClearHard').click()`);
  await step('9-scape-remove-all', 'scape');
} catch (e) { console.log('ERROR', e.message); }
writeFileSync(`${DIR}/${TAG}-state.json`, JSON.stringify(states, null, 1));
ch.kill(); process.exit(0);
