// Lane S11 (2026-11-14): phone / tablet / desktop pass over every shell section. Needs the DEV server (window.__gb):
//   npx vite --port 6411 --strictPort ; then  URL=http://localhost:6411/ PHASE=before node scripts/s11-shots.mjs
// -> research/screens/S11/<PHASE>/<device>/NN-name.jpg, facts.json (overflow + small-target counts per shot, page errors), contact sheets via scripts/s11-sheet.py
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6411/', PORT = 9511, PHASE = process.env.PHASE ?? 'after';
const DEVICES = { phone390: [390, 844, true], phone360: [360, 780, true], tabP: [768, 1024, true], tabL: [1024, 768, true], d1600: [1600, 900, false], d1280: [1280, 720, false] };
const ONLYDEV = process.env.DEV?.split(',') ?? Object.keys(DEVICES), ONLYSEC = process.env.SEC?.split(',');
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/s11-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 250)); return r.result.result.value; };
const click = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)}) || b.getAttribute('aria-label')?.includes(${JSON.stringify(text)})); if (!e) throw new Error('no ' + ${JSON.stringify(css + ' ' + text)}); e.click(); return true })()`);
const seed = readFileSync('src/examples/planted.json', 'utf8');
const facts = {}, errors = [], fails = []; let phase = 'start', dev = '', OUT = '';
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(dev + '/' + phase + ': ' + d.params.exceptionDetails.exception?.description?.slice(0, 200)); });
const save = () => writeFileSync(`research/screens/S11/${PHASE}/facts.json`, JSON.stringify({ facts, fails, errors }, null, 1));
const waitFor = async (expr, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(700); } return false; };
const open2 = async (w, h, mobile) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: BASE }); await sleep(2500);
  await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(seed)}); true`);
  await send('Page.navigate', { url: BASE + '?ui=2' });
  await waitFor(`document.body.dataset.ui2 === 'ready' && !!window.__gb`); await sleep(6000);
};
// metrics: page scroll width, visible elements poking out of the right edge, visible controls under 44 px (touch sizes)
const measure = touch => ev(`(() => { const W = innerWidth, vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight; };
  const out = [], small = [];
  for (const e of document.querySelectorAll('.ui2app *, .scrim *, .maker *')) { if (!vis(e)) continue; const r = e.getBoundingClientRect();
    if (r.right > W + 1 && !e.closest('.checkbar,[data-scroll],canvas,.paper,.paperview,.paperinline') && e.children.length === 0 && r.left < W) out.push(e.className?.toString().slice(0, 30) + ':' + (e.textContent || '').slice(0, 20));
    if (${touch} && e.matches('button, a, select, input:not([type=range]):not([type=checkbox]):not([type=radio]), [role=button]') && (r.height < 43.5 || r.width < 43.5) && !e.closest('canvas')) small.push(((e.textContent || e.getAttribute('aria-label') || e.title || e.className) + '').trim().slice(0, 22) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  return { pageX: document.documentElement.scrollWidth - W, out: out.slice(0, 6), small: small.length, smallEx: [...new Set(small)].slice(0, 8) }; })()`);
const shot = async (name, wait = 900) => { await sleep(wait); await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }).then(r => writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64'))); facts[dev] ??= {}; facts[dev][name] = await measure(DEVICES[dev][2] && dev !== 'd1600'); console.log(dev, name, JSON.stringify(facts[dev][name]).slice(0, 160)); };
const tryStep = async (name, fn) => { if (ONLYSEC && !ONLYSEC.some(s => name.includes(s))) return; phase = name; try { await fn(); } catch (e) { fails.push(dev + ' ' + name + ': ' + String(e.message).slice(0, 160)); console.log('FAIL', dev, name, e.message.slice(0, 120)); } save(); };
const phoneW = () => ev(`innerWidth < 700`);
const closeAll = async () => { await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`); await sleep(300); };
const section = async (title) => { // phone: tab bar or More; others: rail
  if (await phoneW()) {
    const tab = await ev(`!![...document.querySelectorAll('.tabbar button')].find(b => b.textContent.trim() === ${JSON.stringify(title)})`);
    if (tab) await click('.tabbar button', title); else { await click('.tabbar button', 'More'); await sleep(300); await click('.morerow', title); }
  } else { const cur = await ev(`document.querySelector('.panel h2')?.textContent ?? ''`); if (cur !== title) await click('.rail .ritem', title); }
  await sleep(900);
};
mkdirSync('research/screens/S11/' + PHASE, { recursive: true });
for (dev of ONLYDEV) {
  const [w, h, mobile] = DEVICES[dev]; OUT = `research/screens/S11/${PHASE}/${dev}`; mkdirSync(OUT, { recursive: true });
  await open2(w, h, mobile);
  await tryStep('00-home', async () => { await shot('00-home', 500); });
  await tryStep('01-tank', async () => { await section('Tank'); await shot('01-tank'); });
  await tryStep('02-picker', async () => { await click('.panel .btn', 'Change'); await sleep(700); await shot('02-picker'); });
  await tryStep('03-maker', async () => { await click('.picker .btn', 'New custom tank'); await sleep(3500); await shot('03-maker', 800); await click('.maker .btn', 'Cancel').catch(() => {}); await sleep(500); });
  await tryStep('04-scape', async () => { await closeAll(); await section('Scape'); await shot('04-scape'); });
  await tryStep('05-plants', async () => { await section('Plants'); await shot('05-plants'); });
  await tryStep('06-animals', async () => { await section('Animals'); await shot('06-animals'); });
  await tryStep('07-equipment', async () => { await section('Equipment'); await shot('07-equipment'); });
  await tryStep('08-equip-heater', async () => { await click('.cats .chip', 'Heater'); await shot('08-equip-heater', 500); });
  await tryStep('09-equip-light', async () => { await click('.cats .chip', 'Light'); await shot('09-equip-light', 600); });
  await tryStep('10-preferences', async () => { await section('Preferences'); await shot('10-preferences'); });
  await tryStep('11-constraints', async () => { await section('Constraints'); await shot('11-constraints'); });
  await tryStep('12-discover', async () => { await section('Discover'); await shot('12-discover'); });
  await tryStep('13-discover-explore', async () => { await ev(`document.querySelector('.modes button, .modes .card')?.click(); true`); await shot('13-discover-explore', 1200); });
  await tryStep('14-discover-thisorthat', async () => { await click('.dback .btn', 'All modes').catch(() => {}); await sleep(400); await click('.modes button, .modes .card', 'This or that'); await shot('14-discover-thisorthat', 1500); });
  await tryStep('15-print', async () => { await section('Print'); await shot('15-print'); });
  await tryStep('16-settings', async () => { await section('Settings'); await shot('16-settings'); });
  await tryStep('17-check-water', async () => { await closeAll(); await click('.check', 'Water').catch(() => click('.check', '°')); await shot('17-check-water', 800); });
  await tryStep('18-check-cost', async () => { await closeAll(); await click('.check', 'No price').catch(() => click('.check', '$')); await shot('18-check-cost', 800); });
  await tryStep('19-file-menu', async () => { await closeAll(); await click('.apphead .btn', 'File'); await shot('19-file-menu', 500); await closeAll(); await ev(`document.body.click(); true`); });
  await tryStep('20-compare', async () => { await closeAll(); await click('.btn', 'Compare'); await sleep(1500); await shot('20-compare', 1500); await click('.btn', 'End compare').catch(() => {}); });
}
save(); ws.close(); ch.kill();
console.log('done; fails', fails.length, 'errors', errors.length);
process.exit(0);
