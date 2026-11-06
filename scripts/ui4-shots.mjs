// Lane UI4 browser check (dev server, URL env): the room-light slider on the viewing screen: empty room (high), tank with a light (low), a manual value, desktop + 375 px.
// Headless Chrome over raw CDP, one page at a time. Pictures land in shots/ui4/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9355;
mkdirSync('shots/ui4', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/ui4-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`shots/ui4/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const fire = (sel, val, type = 'change') => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; if(${JSON.stringify(val)}==='check') e.checked=true; else e.value=${JSON.stringify(val)}; e.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true})); return 'ok'})()`);
const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
try {
  await send('Page.enable'); await view(1400, 900, false); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('vRoom')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  const room = () => ev(`JSON.stringify({ v: document.getElementById('vRoom').value, auto: !document.getElementById('vRoomAuto').hidden ? 'AUTO-button-shown(manual)' : 'following-tank' })`);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
  // 1. the empty Sandbox room (no tank light): New -> Sandbox -> Freshwater card, before a tank is chosen
  await click('#newScene'); await sleep(600); await click('#modeSandbox'); await sleep(600);
  await ev(`[...document.querySelectorAll('.start-mode-card')].find(b => /Freshwater/.test(b.innerText)).click()`); await sleep(2500);
  console.log('empty room', await room()); await view(1400, 900, false); await shot('1-empty-room-high-desktop');
  await view(375, 812, true); await sleep(1200); await shot('2-empty-room-high-375');
  console.log('375 overflow-x', await ev(`document.documentElement.scrollWidth > document.documentElement.clientWidth`));
  await view(1400, 900, false); await sleep(800);
  // the slider works in the empty room too: low by hand, then back to Auto
  await ev(`(()=>{const e=document.getElementById('vRoom'); e.value='0.05'; e.dispatchEvent(new Event('input', {bubbles:true}))})()`); await sleep(1200);
  console.log('empty room, dimmed by hand', await room()); await shot('1b-empty-room-dimmed-by-hand');
  await click('#vRoomAuto'); await sleep(900);
  // 2. choose a 40 gal tank (still no light: stays high), then add a light (low)
  await ev(`(()=>{const q=document.getElementById('tdQ'); q.value='40 breeder'; q.dispatchEvent(new Event('input', {bubbles:true}))})()`); await sleep(500);
  await click('#tdList .td-opt'); await sleep(900); await click('#tdChoose'); await sleep(1500); await click('#tdDone'); await sleep(2500);
  console.log('tank chosen, no light', await room()); await shot('3-tank-no-light-high-desktop');
  await ev(`(async () => { const { store } = window.__gb; const { applyKitLight } = await import('/src/scene/kitlight.ts'); store.edit(s => { Object.assign(s, applyKitLight(s, { light: { type: 'led', tech: 'led-white', count: 1, watts: 20, spec: 'listing' }, lid: 'open' })); }); })()`).catch(e => console.log('light', String(e).slice(0, 120)));
  await sleep(1800); console.log('tank + light', await room());
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(600);
  await shot('4-tank-with-light-low-desktop');
  await view(375, 812, true); await sleep(1200); await shot('5-tank-with-light-low-375'); await view(1400, 900, false); await sleep(800);
  // 3. by hand: the slider keeps the person's value, Auto hands it back
  await ev(`(()=>{const e=document.getElementById('vRoom'); e.value='0.3'; e.dispatchEvent(new Event('input', {bubbles:true}))})()`); await sleep(1200);
  console.log('moved by hand to the top', await room()); await shot('6-manual-high-with-light');
  await click('#vRoomAuto'); await sleep(1000); console.log('Auto pressed', await room());
} finally { ws.close(); ch.kill(); }
