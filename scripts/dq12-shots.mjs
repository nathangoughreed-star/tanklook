// DQ12: A and B at one physical scale (20 gal long beside a 75 gal), desktop and 375 px (one pane: A then B). Asserts the shared window half-size (same fov = same px per inch),
// the dimensions in the chips, Fit Both. Run: URL=http://localhost:5183/ node scripts/dq12-shots.mjs   Shots: research/screens/DQ12/
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5183/', PORT = 9392;
mkdirSync('research/screens/DQ12', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/dq12-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 40 }); writeFileSync(`research/screens/DQ12/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) fails++; };
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  await ev(`(async () => { const { store } = window.__gb; const { regenerate } = await import('/src/scene/starter.ts'); const { lockObject } = await import('/src/scene/locks.ts');
    store.update(s => { const t = s.tanks[0]; t.tank = { ...t.tank, L: 914.4, D: 457.2, H: 406.4 }; t.water.on = true; t.water.level = 0.9; t.lid = 'glass'; regenerate(t, 'all', 3); t.fish = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, uid: 'f-neon' + i, species: 'neon', x: -100 + i * 25, y: 120, depth: -20 + (i % 3) * 20, yaw: 0, pitch: 0, roll: 0, bend: 0 })); });
    store.update(s => { const t = s.tanks[0]; if (t.items[0]?.uid) lockObject(t, t.items[0].uid); }, { history: false }); return true })()`);
  await sleep(1500);
  await ev(`document.querySelector('.dq10-pill').click()`); await sleep(500);
  const flat = x => x.split(String.fromCharCode(10)).join(' | ');
  const txt = () => ev(`document.querySelector('.dq10').innerText`);
  ok('presets shown', /Explore[\s\S]*Remix[\s\S]*Refine/.test(await txt()));
  ok('tank-kept line', /Tank: kept/.test(await txt()), flat(await txt()).slice(0, 160));
  await shot('1-presets-tank-kept');
  await ev(`document.querySelector('[data-a=finish]').click()`);
  for (let i = 0; i < 90; i++) { if (await ev(`!!document.querySelector('.dq10-prev, .dq10-nofit')`)) break; await sleep(1000); }
  await sleep(1500);
  ok('N designs fit shown', /(\d+ designs fit|Only this one fits)/.test(await txt()), (await txt()).match(/\d+ designs fit|Only this one fits/)?.[0] ?? '');
  await shot('2-n-designs-fit');
  // conflict: kept 20 gal tank + kept Oscar
  await ev(`(async () => { const { store } = window.__gb; const { lockRoster } = await import('/src/scene/locks.ts');
    store.update(s => { const t = s.tanks[0]; t.tank = { ...t.tank, L: 609.6, D: 304.8, H: 406.4 }; const f = structuredClone(t.fish[0]); f.species = 'oscar'; f.uid = 'f-oscar'; t.fish = [f]; lockRoster(t, 'oscar', 'exact', 1); }); return true })()`);
  await sleep(1000);
  await ev(`document.querySelector('[data-a=close]').click()`); await sleep(300); await ev(`document.querySelector('.dq10-pill').click()`); await sleep(300);
  await ev(`document.querySelector('[data-a=finish]').click()`);
  for (let i = 0; i < 90; i++) { if (await ev(`!!document.querySelector('.dq10-nofit, .dq10-prev')`)) break; await sleep(1000); }
  await sleep(1500);
  const t3 = await txt();
  ok('conflict card with kept line and relax buttons', /You kept:/.test(t3) && (await ev(`document.querySelectorAll('[data-a=relax]').length`)) >= 2, flat(t3).slice(0, 400));
  await shot('3-conflict-card');
  await ev(`document.querySelector('[data-a=relax]').click()`); await sleep(500);
  for (let i = 0; i < 90; i++) { if (!(await ev(`!!document.querySelector('.dq10-note[role=status]')`))) break; await sleep(1000); }
  await sleep(1500); await shot('4-after-one-relaxation');
} catch (e) { console.log('ERROR', e.message); fails++; }
ch.kill(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);

