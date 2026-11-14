// P8: before / after shots of the Equipment menu (heater, filter, light; US and metric) to prove the gear-choice move and the units module change nothing visible.
//   URL=http://localhost:6481/ TAG=before node scripts/p8-shots.mjs   (the base commit)
//   URL=http://localhost:5982/ TAG=after  node scripts/p8-shots.mjs   (this branch)
// Shots: research/screens/P8/<TAG>-<units>-<n>-<step>-panel.png (the Equipment section), plus <TAG>-state.json (tech + menu HTML length + status per step).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5982/', TAG = process.env.TAG ?? 'after', PORT = 9410 + (TAG === 'before' ? 1 : 2);
const DIR = 'research/screens/P8'; mkdirSync(DIR, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/p8-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' -> ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const states = {};
const click = sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing ' + ${JSON.stringify(sel)}; e.click(); return true })()`);
const shot = async name => { await sleep(1500); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${DIR}/${TAG}-${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const state = key => ev(`JSON.stringify((() => { const t = window.__gb.store.tank; return { tech: t.tech, light: t.light, owned: t.brief?.items?.['constraints.owned'] ?? null, equip: document.getElementById('equipLine')?.textContent ?? null }; })())`).then(v => { states[key] = JSON.parse(v); });
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.confirm = () => true; true`);
  await click('[data-pre="midplanted"]'); await sleep(800);
  // 1. the Equipment menu, heater row open
  await click('[data-row="heater"] .thead');
  await ev(`document.querySelector('details[data-sec="equipment"]').open = true; document.querySelector('details[data-sec="equipment"]').scrollIntoView({ block: 'start' }); true`);
  await shot('1-equipment-menu'); await state('equipment-menu');
  // 2. My equipment
  await click('#equipOpen'); await sleep(800); await shot('2-my-equipment-open'); await state('my-equipment');
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); true`);
  // 3. a Discover run
  await click('#discoverBtn'); await sleep(700); if (await ev(`!!document.querySelector('.abdock [data-act="restart"]')`)) await click('.abdock [data-act="restart"]');
  for (let i = 0; i < 120; i++) { if (await ev(`!!document.querySelector('.abdock .abfacts')`)) break; await sleep(1000); }
  await sleep(2500); await shot('3-discover-run'); await state('discover');
  states.discoverText = await ev(`(document.querySelector('.abdock')?.innerText ?? '').replace(/\d+ ?ms/g, '')`);
} catch (e) { console.log('ERROR', e.message); }
writeFileSync(`${DIR}/${TAG}-state.json`, JSON.stringify(states, null, 1));
ch.kill(); process.exit(0);
