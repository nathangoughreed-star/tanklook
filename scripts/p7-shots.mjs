// P7: before / after shots of Save, Save as, Share and Open (saved tanks) - the file operations moved to src/ui/logic/files.ts must look identical.
// Run: BEFORE=http://localhost:5180/ AFTER=http://localhost:5173/ node scripts/p7-shots.mjs  -> research/screens/P7/{before,after}-*.jpg + results.json
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', PORT = 9447;
mkdirSync('research/screens/P7', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/p7-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 200)); return r.result.result.value; };
const results = {};
await send('Page.enable');
ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Page.javascriptDialogOpening') { results.dialog = (results.dialog ?? '') + d.params.message.slice(0, 60) + ' / '; send('Page.handleJavaScriptDialog', { accept: true }); } });
async function run(tag, url) {
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url }); await sleep(2500); await ev(`localStorage.clear(); true`).catch(() => {}); await send('Page.navigate', { url });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  const closeAll = () => ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); true`);
  const shot = async name => { await sleep(900); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 }); writeFileSync(`research/screens/P7/${tag}-${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
  const status = () => ev(`(() => { const s = document.getElementById('status'); return s && !s.hidden ? s.textContent : ''; })()`);
  await closeAll();
  await ev(`(() => { const n = document.getElementById('sceneName'); n.value = 'P7 test tank'; n.onchange(new Event('change')); return true })()`);
  await ev(`document.getElementById('saveScene').click(); true`); await shot('01-save'); // Save / Save as chooser
  await ev(`document.getElementById('saveHere').click(); true`); await sleep(600); results[`${tag}-saved`] = await status(); await shot('02-saved-status');
  await ev(`document.getElementById('saveScene').click(); document.getElementById('saveAs').click(); true`); await shot('03-save-as');
  await closeAll();
  await ev(`document.getElementById('saveScene').click(); document.getElementById('saveAs').click(); document.getElementById('shareScene').click(); true`); await sleep(1500);
  results[`${tag}-share`] = await status(); await shot('04-share');
  await closeAll();
  await ev(`document.getElementById('openScene').click(); true`); await sleep(1200);
  await ev(`document.getElementById('startOpen').click(); true`); await sleep(1500); await ev(`document.querySelector('[data-tab="saved"]')?.click(); true`); await shot('05-open-saved');
  results[`${tag}-lib`] = await ev(`document.getElementById('libList').innerText`);
  results[`${tag}-store`] = await ev(`JSON.stringify({ cur: localStorage.getItem('tanklook.libCurrent') ? 'set' : null, lib: JSON.parse(localStorage.getItem('tanklook.library') || '[]').map(e => e.name) })`);
}
try {
  await run('before', process.env.BEFORE); await run('after', process.env.AFTER);
  writeFileSync('research/screens/P7/results.json', JSON.stringify(results, null, 1));
  console.log(JSON.stringify(results, null, 1));
} finally { ws.close(); ch.kill(); }
