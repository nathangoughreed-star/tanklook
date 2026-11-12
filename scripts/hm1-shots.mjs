// Lane HM1 browser check: header toolbar (4 buttons), Open chooser, Save chooser, Save as. Old:  (dev server, URL env): the My equipment menu (desktop + 375 px), a Tech "I own one" shortcut opening it at the heater, and the cost panel
// with owned items. Headless Chrome over raw CDP, one page at a time. Pictures land in research/screens/HM1/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5183/', PORT = 9346;
mkdirSync('research/screens/HM1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/hm1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/HM1/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const clip = async (name, sel) => { const b = await ev(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()`); const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, b[0] - 8), y: Math.max(0, b[1] - 8), width: b[2] + 16, height: b[3] + 16, scale: 2 } }); writeFileSync(`research/screens/HM1/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const wait = async () => { for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); } await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300); };
try {
  await send('Page.enable');
  for (const [tag, w, h, mobile] of [['desktop', 1400, 900, false], ['375', 375, 812, true]]) {
    await view(w, h, mobile); await send('Page.navigate', { url: URL }); await wait();
    console.log(tag, await ev(`[...document.querySelectorAll('.toolbar button')].map(b=>b.textContent+':'+Math.round(b.getBoundingClientRect().width)).join(' | ')`), 'myEquip', await ev(`!!document.getElementById('myEquip')`), 'scrollW', await ev(`document.documentElement.scrollWidth`));
    await clip(`${tag}-1-header`, 'header.top'); await clip(`${tag}-1b-toolbar`, '.toolbar');
    await click('#openScene'); await sleep(500); await shot(`${tag}-2-open-chooser`); await ev(`document.querySelector('#openDlg').close()`);
    await click('#saveScene'); await sleep(500); await shot(`${tag}-3-save-menu`);
    await click('#saveAs'); await sleep(500); await shot(`${tag}-4-save-as`); await ev(`document.querySelector('#dlDlg').close()`);
    console.log(tag, 'equipOpen', await ev(`!!document.getElementById('equipOpen')`));
  }
} finally { ws.close(); ch.kill(); }
