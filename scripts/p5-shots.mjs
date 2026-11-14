// P5: before / after shots of the cost panel (Guardrails + Your situation) and the Equipment heater row + room temperature field.
//   URL=http://localhost:PORT/ TAG=before|after node scripts/p5-shots.mjs     -> research/screens/P5/<TAG>-*.png, <TAG>-state.json
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5981/', TAG = process.env.TAG ?? 'after', PORT = 9500 + (TAG === 'before' ? 1 : 2);
const DIR = 'research/screens/P5'; mkdirSync(DIR, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/p5-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' :: ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.value; };
const state = {};
const clip = async (sel, name) => {
  await sleep(1200);
  const b = await ev(`(() => { const e = ${sel === 'TECH' ? `document.getElementById('tRoom')?.closest('details')` : `document.querySelector(${JSON.stringify(sel)})`}; if (!e) return null; e.scrollIntoView({ block: 'start' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: Math.max(1, r.width), height: Math.max(1, Math.min(r.height, 800)) }; })()`);
  if (!b) { console.log('missing', sel); return; }
  await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { ...b, scale: 1 } }); writeFileSync(`${DIR}/${TAG}-${name}.png`, Buffer.from(r.result.data, 'base64'));
};
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  for (let i = 0; i < 90; i++) { if (await ev(`!!document.querySelector('.dm') && !!document.getElementById('tRoom')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.confirm = () => true; true`);
  // a stocked tank, units inches / deg F
  await ev(`(() => { const { store } = window.__gb; store.update(s => { s.units = 'in'; }); const d = document.querySelector('.dm .dmtog'); if (d && d.getAttribute('aria-expanded') !== 'true') d.click(); document.querySelectorAll('.dm details.dmset').forEach(x => x.open = true); return true })()`);
  await clip('.dm', '1-cost-panel-default');
  // set the profile through the panel's own controls: $300 budget, 45 min, water, rate, difficulty
  await ev(`(() => { const set = (id, v, ev = 'change') => { const e = document.getElementById(id); if (!e) throw new Error('no ' + id); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event(ev, { bubbles: true })); };
    set('dmSetupOn', true); set('dmSetup', '300'); set('dmMinOn', true); set('dmMin', '45'); set('dmRisk', 'moderate'); return true })()`);
  await sleep(500);
  await ev(`(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }; set('dmWater', 'own-ro'); set('dmKwh', '0.21'); return true })()`);
  await clip('.dm', '2-cost-panel-set');
  state.panel = await ev(`(() => JSON.stringify({ bars: [...document.querySelectorAll('.dmbars')].map(e => e.innerText), comp: document.querySelector('.dmcomp')?.innerText, water: document.getElementById('dmWater')?.value, kwh: document.getElementById('dmKwh')?.value, risk: document.getElementById('dmRisk')?.value, setup: document.getElementById('dmSetup')?.value, min: document.getElementById('dmMin')?.value }))()`);
  // the heater row + room temperature in Equipment
  await ev(`(() => { const e = document.getElementById('tRoom'); if (!e) return false; e.scrollIntoView({ block: 'center' }); e.value = '68'; e.dispatchEvent(new Event('change', { bubbles: true })); return true })()`);
  await sleep(800);
  await clip('TECH', '3-equipment-room-68F');
  state.room = await ev(`(() => JSON.stringify({ tRoom: document.getElementById('tRoom')?.value, heater: [...document.querySelectorAll('.tchip')].map(c => c.innerText).slice(0, 6) }))()`);
  state.stored = await ev(`(() => { const t = window.__gb.store.tank; return JSON.stringify({ techRoomC: t.tech?.roomC ?? null, briefRoomC: t.brief?.items?.['constraints.roomTempC']?.value ?? null, briefBudget: t.brief?.items?.['constraints.budget']?.value ?? null, home: t.brief?.project?.home ?? null, localDemand: localStorage.getItem('tanklook.demand') }) })()`);
  // reload: the setup (autosaved) reopens with both
  await sleep(1500); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.querySelectorAll('.dm details.dmset').forEach(x => x.open = true); const d = document.querySelector('.dm .dmtog'); if (d && d.getAttribute('aria-expanded') !== 'true') d.click(); true`);
  await clip('.dm', '4-after-reload');
  state.reload = await ev(`(() => JSON.stringify({ setup: document.getElementById('dmSetup')?.value, water: document.getElementById('dmWater')?.value, kwh: document.getElementById('dmKwh')?.value, tRoom: document.getElementById('tRoom')?.value }))()`);
} catch (e) { console.log('ERROR', e.message); state.error = e.message; }
writeFileSync(`${DIR}/${TAG}-state.json`, JSON.stringify(state, null, 1));
ch.kill(); process.exit(0);
