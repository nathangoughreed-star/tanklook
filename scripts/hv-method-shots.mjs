// Lane HV unit 2: desktop and phone-width pictures of the "How we calculate" page (URL env, default the preview server). Pictures in research/screens/HV/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5197/how-we-calculate.html', PORT = 9391;
mkdirSync('research/screens/HV', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--user-data-dir=' + (process.env.TEMP + '/hv-m-' + Date.now()), '--no-first-run'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
try {
  await send('Page.enable');
  for (const [tag, w, h, mob] of [['desktop', 1100, 900, false], ['phone', 375, 812, true]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: mob });
    await send('Page.navigate', { url: URL }); await sleep(1500);
    const m = await send('Runtime.evaluate', { expression: 'JSON.stringify({sw: document.documentElement.scrollWidth, iw: innerWidth, sh: document.documentElement.scrollHeight})', returnByValue: true });
    console.log(tag, m.result.result.value);
    const { sh } = JSON.parse(m.result.result.value);
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: Math.min(sh, 3000), scale: 1 } });
    writeFileSync(`research/screens/HV/method-${tag}.png`, Buffer.from(r.result.data, 'base64'));
  }
} catch (e) { console.log('ERR', String(e).slice(0, 300)); } finally { ch.kill(); process.exit(0); }
