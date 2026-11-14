// P10: old UI's Your-limits Experience control at each value: the same animals must be greyed before (origin/main) and after.
//   URL=http://localhost:PORT/ TAG=before|after node scripts/p10-shots.mjs
// P10: before / after shots of the Animals panel (a stocked example, care gates on so one animal is greyed with its reason, Add, + / - on a row) to prove the move of the stocking edits and picker fit / gate logic into scene/stockEdit.ts and ui/logic/animalPicker.ts changed nothing. Run once per build:
//   URL=http://localhost:5972/ TAG=before node scripts/p2-shots.mjs   (origin/main)
//   URL=http://localhost:5971/ TAG=after  node scripts/p2-shots.mjs   (this branch)
// Shots: research/screens/P10/<TAG>-<n>-<step>.png (full window) and -panel.png (the Tank section only), plus <TAG>-state.json.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5971/', TAG = process.env.TAG ?? 'after', PORT = 9400 + (TAG === 'before' ? 1 : 2);
const DIR = 'research/screens/P10'; mkdirSync(DIR, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/p10-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const states = {};
const grey = () => ev(`(() => JSON.stringify([...document.querySelectorAll('#spResults button.gated, #spResults .gated')].map(b => b.textContent.trim().slice(0, 30)).sort()))()`);
const shot = async name => {
  await sleep(2500);
  let r = await send('Page.captureScreenshot', { format: 'png' });
  const b = await ev(`(() => { const e = document.querySelector('details[data-sec="fish"]'); e.scrollIntoView({ block: 'start' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, innerHeight - r.top) } })()`);
  await sleep(300);
  r = await send('Page.captureScreenshot', { format: 'png', clip: { ...b, scale: 1 } }); writeFileSync(`${DIR}/${TAG}-${name}-panel.png`, Buffer.from(r.result.data, 'base64'));
  states[name] = JSON.parse(await grey()); console.log(name, states[name].length);
};
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.confirm = () => true; true`);
  await ev(`(() => { const { store } = window.__gb; store.update(s => { s.units = 'in'; const t = s.tanks[0]; t.layout.gateStock = true; t.layout.gateAnimals = true; }); return true })()`);
  await ev(`(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); const d = document.querySelector('details[data-sec="fish"]'); d.open = true; return true })()`);
  for (const x of [0, 1, 2]) {
    await ev(`(async () => { const m = await import('/src/ui/setupBrief.ts'); m.editBrief(b => m.setExperience(b, ${x})); return true })()`);
    await shot(`exp${x}-` + ['beginner', 'some', 'experienced'][x]);
  }
} catch (e) { console.log('ERROR', e.message); }
writeFileSync(`${DIR}/${TAG}-state.json`, JSON.stringify(states, null, 1));
ch.kill(); process.exit(0);
