// Lane EQ1 browser check (dev server, URL env): the My equipment menu (desktop + 375 px), a Tech "I own one" shortcut opening it at the heater, and the cost panel
// with owned items. Headless Chrome over raw CDP, one page at a time. Pictures land in shots/dx3/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5183/', PORT = 9344;
mkdirSync('shots/dx3', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/dx3-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`shots/dx3/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const fire = (sel, val, type = 'change') => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; if(${JSON.stringify(val)}==='check') e.checked=true; else e.value=${JSON.stringify(val)}; e.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true})); return 'ok'})()`);
const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
try {
  await send('Page.enable'); await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') console.log('PAGE ERROR', JSON.stringify(d.params.exceptionDetails).slice(0, 200)); }); await view(1400, 900, false); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('myEquip')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300); for (let i = 0; i < 30 && !(await ev(`!!document.querySelector('.owndlg[open]')`)); i++) { await click('#myEquip'); await sleep(1500); } console.log('dlg', await ev(`!!document.querySelector('.owndlg[open]')`));
  console.log(await click('.owndlg [data-add="heater"]'), await fire('.owndlg #ownHeater', 'generic'));
  console.log(await click('.owndlg [data-add="filter"]'), await fire('.owndlg #ownFilter', 'generic'));
  console.log(await click('.owndlg [data-add="light"]'), await fire('.owndlg #ownLight', 'generic'));
  console.log(await click('.owndlg [data-must="heater"]'));
  await ev(`document.querySelector('.owndlg').close()`); await sleep(300);
  await ev(`window.__gb.store.edit(S => { S.tank.L *= 2; S.tank.D *= 1.5; })`); await sleep(1500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300); console.log(await click('#myEquip')); await sleep(1500); console.log('dlg', await ev(`!!document.querySelector('.owndlg')`));
  await shot('1-three-groups-desktop');
  console.log(await click('.owndlg #ownNoNew')); await sleep(500);
  await ev(`document.querySelector('.owndlg').scrollTo(0,9999)`); await sleep(300);
  await shot('2-no-new-infeasible-desktop');
  console.log('menu text', await ev(`document.querySelector('.owndlg').innerText.split(String.fromCharCode(10)).filter(l=>/Must use|Have available|To purchase|cannot work|Still to buy|too small|No new/.test(l)).join(' | ')`));
  await view(375, 812, true); await sleep(900);
  await ev(`document.querySelector('.owndlg').scrollTo(0,0)`); await sleep(400);
  await shot('3-menu-375-top');
  await ev(`document.querySelector('.owndlg').scrollTo(0,9999)`); await sleep(400);
  await shot('4-menu-375-bottom');
  console.log('overflow-x at 375:', await ev(`document.querySelector('.owndlg').scrollWidth > document.querySelector('.owndlg').clientWidth`));
  await ev(`document.querySelector('.owndlg').close()`); await view(1400, 900, false); await sleep(900);
  if (await ev(`document.querySelector('#demandPanel .dmtog')?.getAttribute('aria-expanded')`) !== 'true') await click('#demandPanel .dmtog');
  await sleep(800); await shot('5-cost-panel');
]*|Must use[^
]*/)?.[0] ?? 'none'`));
} finally { ws.close(); ch.kill(); }
