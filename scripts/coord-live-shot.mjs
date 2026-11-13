// Coordinator live check (Coordinator 23, 2026-11-12): headless Chrome over CDP against tanklook.com. It does one action and saves a cropped PNG.
// To use it, copy it to a scratchpad, edit the actions and the clip, then run it with node.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', PORT = 9417;
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/arrow-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result?.value;
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'https://tanklook.com/?v=' + Date.now() }); await sleep(12000);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  console.log('build', await ev(`(document.body.innerText.match(/build\s*\d+/)||[])[0]`));
  await ev(`document.getElementById('sideClose').click()`); await sleep(1500);
  console.log(JSON.stringify(await ev(`(() => { const t = document.getElementById('sideTab').getBoundingClientRect(); const v = document.querySelector('.viewtools').getBoundingClientRect(); return { collapsed: document.getElementById('app').classList.contains('collapsed'), arrow: [Math.round(t.left), Math.round(t.top), Math.round(t.width), Math.round(t.height)], toolbar: [Math.round(v.left), Math.round(v.top)] }; })()`)));
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 700, height: 300, scale: 1 } }); writeFileSync('arrow-collapsed.png', Buffer.from(r.result.data, 'base64'));
} finally { ch.kill(); process.exit(0); }
