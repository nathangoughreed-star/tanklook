// DQ3: screenshots of the real "A overall, B's plants" example (specs dumped by test/dq3.test.ts: DQ3_DUMP=research/screens/DQ3) at one physical scale. Run: URL=http://localhost:5173/ node scripts/dq3-shots.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9393, DIR = 'research/screens/DQ3';
const rounds = JSON.parse(readFileSync(`${DIR}/example.json`, 'utf8'));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,800', '--user-data-dir=' + (process.env.TEMP + '/dq3-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text); return r.result.result.value; };
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 800, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
for (const [i, name] of [[0, 'first-pair'], [1, 'targeted']]) {
  const r = rounds[i], snaps = JSON.stringify([r.a.snapshot, r.b.snapshot]);
  const info = JSON.stringify(['A: ' + r.a.title + ' ' + r.a.gallons + ' gal, plants: ' + r.a.plants.length, 'B: ' + r.b.title + ' ' + r.b.gallons + ' gal, plants: ' + r.b.plants.length + (r.b.intent ? ' | ' + r.b.intent.text : '')]);
  await ev(`(async () => { const { viewer } = window.__gb; viewer.showPair(${snaps}, { info: ${info} }); await new Promise(r => setTimeout(r, 4000)); return true })()`);
  const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 40 }); writeFileSync(`${DIR}/${name}.jpg`, Buffer.from(s.result.data, 'base64')); console.log('shot', name);
}
ch.kill(); process.exit(0);
