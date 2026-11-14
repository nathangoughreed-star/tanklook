// P4: before / after shots of the Equipment menu (heater, filter, light; US and metric) to prove the gear-choice move and the units module change nothing visible.
//   URL=http://localhost:6481/ TAG=before node scripts/p4-shots.mjs   (the base commit)
//   URL=http://localhost:5982/ TAG=after  node scripts/p4-shots.mjs   (this branch)
// Shots: research/screens/P4/<TAG>-<units>-<n>-<step>-panel.png (the Equipment section), plus <TAG>-state.json (tech + menu HTML length + status per step).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5982/', TAG = process.env.TAG ?? 'after', PORT = 9400 + (TAG === 'before' ? 1 : 2);
const DIR = 'research/screens/P4'; mkdirSync(DIR, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/p4-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' -> ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const states = {};
let units = 'in', n = 0;
const step = async name => {
  await sleep(1200); n++;
  const b = await ev(`(() => { const e = document.querySelector('details[data-sec="equipment"]'); e.scrollIntoView({ block: 'start' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, 1800) } })()`);
  await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...b, scale: 1 } }); writeFileSync(`${DIR}/${TAG}-${units}-${n}-${name}-panel.png`, Buffer.from(r.result.data, 'base64'));
  states[`${units}-${n}-${name}`] = await ev(`(() => { const t = window.__gb.store.tank; const m = document.getElementById('techMenu'), l = document.getElementById('lProduct'); return JSON.stringify({ tech: t.tech, light: t.light, feed: t.grow.feed, menuText: m.innerText, lightText: l ? l.innerText : '' }); })()`);
  console.log('shot', units, name);
};
const click = sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing ' + ${JSON.stringify(sel)}; e.click(); return true })()`);
const setVal = (sel, v, evt = 'change') => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'missing'; e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event(${JSON.stringify(evt)}, { bubbles: true })); return true })()`);
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.confirm = () => true; true`);
  for (const u of ['in', 'cm']) {
    units = u; n = 0;
    await ev(`(() => { const { store } = window.__gb; store.update(s => { s.units = ${JSON.stringify(u)}; }); document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.querySelector('details[data-sec="equipment"]').open = true; return true })()`);
    await sleep(800);
    await click('[data-pre="midplanted"]');
    await step('1-preset-midplanted');
    await click('[data-row="heater"] .thead'); await step('2-heater-open');
    await click('[data-act="adding|heater"]'); await click('[data-act="addh|"]'); await step('3-added-generic-heater');
    await setVal('[data-gc-stat="watts"][data-gc^="heater|0"]', 120);
    await step('4-heater-watts-120');
    await setVal('#tRoom', u === 'in' ? 62 : 17); await setVal('#tTarget', u === 'in' ? 78 : 25.5); await step('5-room-and-target');
    await click('[data-row="filter"] .thead'); await step('6-filter-open');
    await click('[data-act="adding|filter"]'); await click('[data-act="adding|filter|canister"]'); await step('7-add-canister-picker');
    await click('[data-act="addf|canister|"]'); await step('8-canister-added');
    await click('[data-act="del|heater|1"]'); await step('9-heater-removed');
    await click('[data-row="sump"] .thead'); await click('[data-act="sump|add"]'); await step('10-sump-added');
    await setVal('[data-sz="L"]', u === 'in' ? 24 : 61); await step('11-sump-length');
    await ev(`(() => { document.querySelector('details[data-sub="lighting"]')?.setAttribute('open', ''); return true })()`); await step('12-lighting');
  }
} catch (e) { console.log('ERROR', e.message); }
writeFileSync(`${DIR}/${TAG}-state.json`, JSON.stringify(states, null, 1));
ch.kill(); process.exit(0);
