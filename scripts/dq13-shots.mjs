// DQ13: header Discover -> card, Compare view. Run: URL=http://localhost:5183/ node scripts/dq13-shots.mjs   Shots: research/screens/DQ13/
// the dimensions in the chips, Fit Both. Run: URL=http://localhost:5183/ node scripts/dq10-shots.mjs   Shots: research/screens/DQ13/
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5183/', PORT = 9393;
mkdirSync('research/screens/DQ13', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/dq13-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 40 }); writeFileSync(`research/screens/DQ13/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) fails++; };
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  // a tank with a stocked design and one kept piece
  await ev(`(async () => { const { store } = window.__gb; const { regenerate } = await import('/src/scene/starter.ts'); const { lockObject } = await import('/src/scene/locks.ts');
    store.update(s => { const t = s.tanks[0]; t.tank = { ...t.tank, L: 914.4, D: 457.2, H: 406.4 }; t.water.on = true; t.water.level = 0.9; t.lid = 'glass'; regenerate(t, 'all', 3); });
    store.update(s => { const t = s.tanks[0]; if (t.items[0]?.uid) lockObject(t, t.items[0].uid); }, { history: false }); return true })()`);
  await sleep(1500);
  await ev(`[...document.querySelectorAll('.tb-main button')].find(b => b.textContent === 'Discover').click()`); await sleep(600);
  ok('header Discover opens the in-editor card (A/B not open)', !!(await ev(`!!document.querySelector('.dq10-card')`)) && !(await ev(`window.__gb.store.frozen`)));
  await shot('1-header-discover-card');
  await ev(`document.querySelector('[data-a=finish]').click()`);
  for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('.dq10-prev, .dq10-nofit')`)) break; await sleep(1000); }
  if (!(await ev(`!!document.querySelector('.dq10-prev')`))) { await ev(`document.querySelector('[data-a=relax]')?.click()`); for (let i = 0; i < 60; i++) { await sleep(1000); if (await ev(`!!document.querySelector('.dq10-prev')`)) break; } }
  for (let k = 0; k < 2; k++) { await ev(`document.querySelector('[data-a=regen]').click()`); await sleep(400);
    for (let i = 0; i < 60; i++) { if (await ev(`!document.querySelector('[data-a=regen]')?.disabled && !document.querySelector('.dq10-note[role=status]')`)) break; await sleep(1000); } }
  await sleep(800);
  ok('Compare button shows', !!(await ev(`!!document.querySelector('[data-a=compare]')`)));
  const key = `JSON.stringify([window.__gb.store.rev, window.__gb.store.snapshotAll().undo.length])`, b0 = await ev(key);
  await ev(`document.querySelector('[data-a=compare]').click()`); await sleep(500);
  ok('Compare view lists 2-3 designs', (await ev(`document.querySelectorAll('.dq13-col').length`)) >= 2);
  await shot('2-compare-view');
  await ev(`document.querySelector('[data-a=pick]').click()`); await sleep(500);
  ok('pick writes no design', (await ev(key)) === b0);
  ok('pick leaves a Like', (await ev(`JSON.stringify(window.__gb.store.tank.brief?.project?.feedback ?? [])`)).includes('"v":1'));
  await shot('3-after-pick');
} finally { ws.close(); ch.kill(); }
console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
