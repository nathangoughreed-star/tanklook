// Lane AB6 browser check (dev server, URL env): the quick-preferences screen per habitat, the limits link, the Constraints Preferences block; desktop and 375 px. Pictures in research/screens/cp1/.
// Run through scripts/lowprio.ps1 on the shared machine.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5193/', PORT = 9377;
mkdirSync('research/screens/cp1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/cp1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' => ' + (r.result.exceptionDetails.exception?.description ?? '').slice(0, 100)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 }); writeFileSync(`research/screens/cp1/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const clickText = (sel, text) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent.includes(${JSON.stringify(text)})); if(!e) return 'missing ${text}'; e.click(); return 'ok'})()`);
const view = (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const waitPair = async () => { for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('.abx .abcard, .abx .abnone[role=status]')`)) break; await sleep(500); } await sleep(2500); };
const IN=25.4, log = (k, v) => console.log(k, JSON.stringify(v));
try {
  await send('Page.enable'); await view(1400, 900, false); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`(()=>{const d=document.getElementById('startDlg'); if(d&&d.open) d.close();})()`);
    await ev(`document.querySelectorAll('details.sec').forEach(d=>d.open=false)`); await sleep(500); await shot('menu-both-closed');
  await ev(`document.querySelector('details.sec[data-sec="prefs"]').open=true`); await sleep(800); await shot('preferences-open');
  await ev(`document.querySelector('details.sec[data-sec="limits"]').open=true`); await sleep(800); await shot('constraints-open');
  await ev(`document.querySelectorAll('details.sec').forEach(d=>d.open=false)`); await sleep(300);
  log('door', await click('#expertiseOpen')); await sleep(800);
  log('open', await ev(`[...document.querySelectorAll('details.sec')].filter(d=>d.open).map(d=>d.dataset.sec)`));
  await shot('door-edit-limits-lands-on-constraints');
  await ev(`document.querySelectorAll('details.sec').forEach(d=>d.open=false)`); await sleep(300);
  log('chip', await click('.bbPanel')); await sleep(800);
  log('open', await ev(`[...document.querySelectorAll('details.sec')].filter(d=>d.open).map(d=>d.dataset.sec)`));
  await shot('door-brief-chip-your-limits');
} finally { ws.close(); ch.kill(); process.exit(0); }
