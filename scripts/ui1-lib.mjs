// UI1 (2026-11-13): tiny headless-Chrome driver over CDP for the UI inventory shots. Not app code.
// Start Chrome once:  node scripts/ui1-lib.mjs start   (headless, port 9551, 1600x900)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
export const PORT = 9551, URL = process.env.URL ?? 'http://localhost:5173/';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function connect() {
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' -> ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
  const shot = async (file, w = 1600, h = 900) => { await sleep(900); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(r.result.data, 'base64')); };
  const size = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await size(1600, 900); return { send, ev, shot, size, close: () => ws.close() };
}
if (process.argv[2] === 'start') {
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + process.env.TEMP + '/ui1-chrome', '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', URL], { detached: true, stdio: 'ignore' });
  ch.unref(); console.log('chrome started');
}
