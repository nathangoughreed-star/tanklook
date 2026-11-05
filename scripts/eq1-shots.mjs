// Lane EQ1 browser check (dev server, URL env): the My equipment menu (desktop + 375 px), a Tech "I own one" shortcut opening it at the heater, and the cost panel
// with owned items. Headless Chrome over raw CDP, one page at a time. Pictures land in shots/eq1/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5183/', PORT = 9344;
mkdirSync('shots/eq1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/eq1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`shots/eq1/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const fire = (sel, val, type = 'change') => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; if(${JSON.stringify(val)}==='check') e.checked=true; else e.value=${JSON.stringify(val)}; e.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true})); return 'ok'})()`);
const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
try {
  await send('Page.enable'); await view(1400, 900, false); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('myEquip')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300);
  // a Tech shortcut: open the Tech section, the heater row, its "I own one" tab, then the button
  await ev(`document.querySelector('details.sec[data-sec="tech"]').open=true`); await sleep(500);
  console.log(await click('#techMenu [data-row="heater"] .thead')); await sleep(500);
  console.log(await click('#techMenu [data-gc-tab="heater|0|own"]')); await sleep(500);
  await ev(`document.querySelector('[data-gc-own-open="heater|0"]')?.scrollIntoView({block:'center'})`); await sleep(300);
  await shot('1-tech-own-tab');
  console.log(await click('[data-gc-own-open="heater|0"]')); await sleep(900);
  console.log('focus row', await ev(`document.querySelector('.owndlg .ownfocus')?.dataset.row`), 'heater ticked', await ev(`!!document.querySelector('.owndlg [data-item="heater"]:checked')`));
  await shot('2-tech-shortcut-opens-heater');
  console.log(await fire('.owndlg #ownHeater', 'generic'), await fire('.owndlg [data-paid="heater"]', '22'));
  console.log(await click('.owndlg [data-add="light"]'), await fire('.owndlg #ownLight', 'generic'));
  console.log(await click('.owndlg [data-add="testkit"]'), await click('.owndlg [data-add="stand"]'));
  console.log(await click('.owndlg [data-furn="table"]')); await sleep(300);
  console.log(await fire('.owndlg #ownFL', '48'), await fire('.owndlg #ownFH', '30'));
  await ev(`document.querySelector('.owndlg').scrollTo(0,0)`); await sleep(500);
  await shot('3-menu-desktop');
  await ev(`document.querySelector('.owndlg').scrollTo(0,9999)`); await sleep(300);
  await shot('4-menu-desktop-bottom');
  await view(375, 812, true); await sleep(900);
  await ev(`document.querySelector('.owndlg').scrollTo(0,0)`); await sleep(400);
  await shot('5-menu-375');
  await ev(`document.querySelector('.owndlg').scrollTo(0,420)`); await sleep(400);
  await shot('6-menu-375-stand');
  console.log('overflow-x at 375:', await ev(`document.querySelector('.owndlg').scrollWidth > document.querySelector('.owndlg').clientWidth`));
  console.log(await click('.owndlg #ownDone')); await sleep(600);
  await view(1400, 900, false); await sleep(900);
  // the cost panel with owned items
  await ev(`window.dispatchEvent(new Event('resize'))`); await sleep(500);
  if (await ev(`document.querySelector('#demandPanel .dmtog')?.getAttribute('aria-expanded')`) !== 'true') console.log(await click('#demandPanel .dmtog'));
  await sleep(800);
  console.log('cost lines', await ev(`JSON.stringify(document.querySelector('#demandPanel').innerText.split(String.fromCharCode(10)).filter(l => /you have|paid/.test(l)).slice(0, 8))`));
  await shot('7-cost-panel');
} finally { ws.close(); ch.kill(); }
