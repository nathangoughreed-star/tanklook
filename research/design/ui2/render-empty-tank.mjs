// UI2: render an empty bow tank on a plain floor from the dev server, save the viewer image. Not app code.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 9563, URL = 'http://localhost:5183/', OUT = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + process.env.TEMP + '/ui2-chrome', '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', URL], { stdio: 'ignore' });
try {
  let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.some(t => t.type === 'page')) break; } catch {} await sleep(500); }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  for (let i = 0; i < 60 && !(await ev('!!window.__gb')); i++) await sleep(500);
  await ev(`(async () => {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    const { emptyScene } = await import('/src/scene/defaults.ts');
    const IN = 25.4, s = emptyScene(), t = s.tanks[0];
    t.tank = { L: 48*IN, H: 24*IN, D: 16*IN, shape: 'bow', bowMin: 13*IN };
    t.stand.show = false; t.water.on = false; t.lid = 'open'; delete t.tech;
    t.wall = { ...t.wall, show: false }; t.person = { ...t.person, show: false };
    t.camera = { dist: 4300, az: -24, el: 14, zoom: 0.7 };
    window.__gb.store.replace(s);
    const side = document.getElementById('side'); if (side) side.style.display = 'none'; for (const k of ['equipment','tech','gear']) window.__gb.viewer.hidden?.add?.(k); window.dispatchEvent(new Event('resize')); window.__gb.viewer.invalidate();
  })()`);
  await sleep(4000);
  const url = await ev(`window.__gb.viewer.thumbnail(1400)`);
  writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64'));
  console.log('saved', OUT, url.length);
  ws.close();
} finally { ch.kill(); }
