// Lane DX5 browser check (dev server, URL env): the My equipment menu (desktop + 375 px), a Tech "I own one" shortcut opening it at the heater, and the cost panel
// with owned items. Headless Chrome over raw CDP, one page at a time. Pictures land in shots/dx5/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5183/', PORT = 9355;
mkdirSync('shots/dx5', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/dx5-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`shots/dx5/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const fire = (sel, val, type = 'change') => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; if(${JSON.stringify(val)}==='check') e.checked=true; else e.value=${JSON.stringify(val)}; e.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true})); return 'ok'})()`);

const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Page.navigate', { url: URL }); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') console.log('PAGE ERROR', JSON.stringify(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text).slice(0, 300)); });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('newScene')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  const closeAll = () => ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
  await closeAll(); await sleep(300);
  for (let i = 0; i < 30 && !(await ev(`!!document.getElementById('newScene')`).catch(() => false)); i++) await sleep(500);
  console.log(await click('#newScene')); await sleep(1200);
  await shot('1-new-tank-menu-desktop');
  await view(375, 812, true); await sleep(900); await shot('2-new-tank-menu-375');
  await view(1400, 900, false); await sleep(600); await closeAll();
  for (let i = 0; i < 30 && !(await ev(`!!window.__gb?.store?.tank`).catch(() => false)); i++) await sleep(500);
  // a project with a locked tank and a fish: New must ask first
  await ev(`window.__gb.store.update(s => { const T = s.tanks[s.active]; T.locks = { objects: [{ target: 'tank' }], roster: [] }; })`); await sleep(300);
  await click('#newScene'); await sleep(800); console.log(await click('#modeExploring')); await sleep(1200);
  console.log('ask dialog open', await ev(`document.getElementById('newDlg').open`), await ev(`document.getElementById('newDlgText').textContent`));
  await shot('3-start-new-project-ask-desktop');
  await view(375, 812, true); await sleep(900); await shot('4-start-new-project-ask-375');
  console.log('cancel', await click('#newCancel')); await sleep(500);
  console.log('locks kept after Cancel', await ev(`JSON.stringify(window.__gb.store.tank.locks)`));
  await view(1400, 900, false);
} catch (e) { console.log('FAILED', e.message); }
finally { try { ws.close(); } catch {} ch.kill(); }
