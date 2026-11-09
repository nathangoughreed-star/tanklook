// Lane DX4 browser check (dev server, URL env): the Discovery screen at desktop and 375 px, cards, stale banner, Keep this. Pictures in shots/dx4/.
import { spawn } from 'node:child_process';

import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9361;
mkdirSync('shots/dx4', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/dx4-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`shots/dx4/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const fire = (sel, val, type = 'change') => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; if(${JSON.stringify(val)}==='check') e.checked=true; else e.value=${JSON.stringify(val)}; e.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true})); return 'ok'})()`);
const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
try {
  await send('Page.enable'); await view(1400, 900, false); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
  await sleep(3000);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300);
  const IN = 25.4;
  await ev(`window.__gb.store.edit(S => { S.tank.L = ${36*IN}; S.tank.D = ${18*IN}; S.tank.H = ${16*IN}; S.water.on = true; S.fish = ['kuhli','ember'].flatMap((sp,k)=>Array.from({length:5},(_,i)=>({id:100*(k+1)+i,species:sp,x:100+i*20,y:100,depth:100,yaw:0,pitch:0,roll:0,bend:0}))); })`);
  await sleep(1500);
  for (const [w, h, mob, tag] of [[1400, 900, false, 'desktop'], [375, 812, true, 'm375']]) {
    await view(w, h, mob); await sleep(800);
    console.log(tag, 'open', await click('#discoverBtn'));
    await sleep(500); await shot(`${tag}-1-setup`);
    console.log(tag, 'run', await click('.dxp [data-a="run"]'));
    for (let i = 0; i < 60 && !(await ev(`document.querySelectorAll('.dxcard').length`)); i++) await sleep(1000);
    await sleep(4000);
    console.log(tag, 'cards', await ev(`document.querySelectorAll('.dxcard').length`), 'pics', await ev(`[...document.querySelectorAll('.dxpic')].filter(i=>i.src.startsWith('data:')).length`), 'text', await ev(`document.querySelector('.dxcard')?.innerText.slice(0,500)`));
    await shot(`${tag}-2-cards`);
    await ev(`document.querySelector('.dxres').scrollIntoView()`); 
    // stale: edit the project while the panel is open
    await ev(`window.__gb.store.edit(S => { S.layout.seed += 1; })`); await sleep(800);
    console.log(tag, 'stale banner', await ev(`!!document.querySelector('.dxstale')`)); await shot(`${tag}-3-stale`);
    await click('.dxp [data-a="close"]');
    await ev(`document.querySelector('details.sec[data-sec="plants"]').open = true`); await sleep(300);
    console.log(tag, 'keep box', await ev(`!!document.querySelector('details.sec[data-sec="plants"] .dxkeepbox')`));
    await ev(`document.querySelector('details.sec[data-sec="plants"] .dxkeeps').open = true; (()=>{const c=document.querySelector('details.sec[data-sec="plants"] input[data-uid]'); if(c){c.checked=true;c.dispatchEvent(new Event("change"));}})()`); await sleep(800);
    await ev(`document.querySelector('details.sec[data-sec="plants"]').scrollIntoView()`); await shot(`${tag}-4-keep`);
    console.log(tag, 'plants btn ->', await click('details.sec[data-sec="plants"] .dxbtn')); await sleep(400);
    console.log(tag, 'scope', await ev(`[...document.querySelectorAll('.dxp input[data-tab]:checked')].map(i=>i.dataset.tab).join()`), await ev(`document.querySelector('.dxlock')?.innerText`));
    await click('.dxp [data-a="close"]');
  }
} catch (e) { console.log("ERR", e.message) } finally { ch.kill(); process.exit(0); }
