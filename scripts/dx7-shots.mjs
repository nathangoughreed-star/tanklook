// Lane DX7 browser check (dev server, URL env): the seven menus, the Discovery switches, the Discover panel with the same switches, the View popover. Pictures in shots/dx7/.
import { spawn } from 'node:child_process';

import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9367;
mkdirSync('shots/dx7', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/dx7-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`shots/dx7/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const fire = (sel, val, type = 'change') => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; if(${JSON.stringify(val)}==='check') e.checked=true; else e.value=${JSON.stringify(val)}; e.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true})); return 'ok'})()`);
const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const open = (key, on = true) => ev(`(()=>{const d=document.querySelector('details.sec[data-sec="${key}"]'); d.open=${on}; return d.open})()`);
const sw = (tab) => click(`details.sec summary [data-sw="${tab}"]`);
try {
  await send('Page.enable'); await view(1400, 900, false); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && document.querySelectorAll('[data-sw]').length===5 && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
  await sleep(3000);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300);
  const IN = 25.4;
  await ev(`window.__gb.store.edit(S => { S.tank.L = ${36*IN}; S.tank.D = ${18*IN}; S.tank.H = ${16*IN}; S.water.on = true; })`); await sleep(1200);
  for (const [w, h, mob, tag] of [[1400, 900, false, 'desktop'], [375, 812, true, 'm375']]) {
    await view(w, h, mob); await sleep(800);
    await ev(`document.querySelectorAll('details.sec').forEach(d=>d.open=false)`);
    console.log(tag, 'menus', await ev(`[...document.querySelectorAll('details.sec > summary h2')].map(h=>h.textContent).join(' | ')`));
    await shot(`${tag}-1-menus-all-on`);
    await sw('plants'); await sw('animals'); await sleep(300);
    console.log(tag, 'state', await ev(`JSON.stringify(window.__gb.store.tank.discoverOn)`));
    await shot(`${tag}-2-menus-plants-animals-off`);
    for (const k of ['tank', 'fish', 'brief', 'equipment']) { await open(k); await sleep(500); await ev(`document.querySelector('details.sec[data-sec="${k}"]').scrollIntoView()`); await shot(`${tag}-3-open-${k}`); }
    await ev(`document.querySelectorAll('details.sec').forEach(d=>d.open=false)`);
    console.log(tag, 'discover', await click('#discoverBtn')); await sleep(600);
    console.log(tag, 'panel switches', await ev(`[...document.querySelectorAll('.dxp [data-sw]')].map(b=>b.dataset.sw+'='+b.getAttribute('aria-checked')).join(' ')`));
    await shot(`${tag}-4-discover-panel`);
    await ev(`document.querySelector('.dxp .dxq').open = true`); await sleep(400);
    await ev(`document.querySelector('.dxp .dxq').scrollIntoView()`); await shot(`${tag}-5-discover-quick-setup`);
    await click('.dxp [data-sw="plants"]'); await sleep(300);
    console.log(tag, 'after panel flip, menu header plants =', await ev(`document.querySelector('details.sec[data-sec="plants"] summary [data-sw]').getAttribute('aria-checked')`), 'state', await ev(`JSON.stringify(window.__gb.store.tank.discoverOn)`));
    await click('.dxp [data-a="close"]'); await sleep(300);
    console.log(tag, 'quick block home', await ev(`document.getElementById('quickBlock').parentElement.id`));
    await click('#viewBtn'); await sleep(500); await shot(`${tag}-6-view-popover`);
    await click('#viewBtn'); await sleep(200);
    await ev(`window.__gb.store.update(s=>{delete s.tanks[s.active].discoverOn},{history:false})`);
  }
} finally { ch.kill(); process.exit(0); }
