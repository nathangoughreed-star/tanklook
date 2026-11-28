// Headless invert lab shots (invert build method, 2026-11-28): starts its own vite dev server and headless Chrome (as
// scripts/fish-autoshot.mjs), opens scripts/invert-lab/lab.html?m=<model> for each model and saves the four-view strip.
//   node scripts/invert-lab/shot.mjs <outDir> <model> [<model> ...]      model = snail art | shrimp art | coral:<variant>[@seed]
// Prints one JSON line {"ok":[files],"fail":[...]}.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
const [OUT, ...models] = process.argv.slice(2);
if (!OUT || !models.length) { console.error('usage: node scripts/invert-lab/shot.mjs <outDir> <model> ...'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = () => new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const VPORT = await freePort(), CPORT = await freePort(), BASE = `http://localhost:${VPORT}/`;
const kids = [spawn('npx', ['vite', '--port', String(VPORT), '--strictPort'], { stdio: 'ignore', shell: true })];
const done = code => { for (const k of kids) { try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(k.pid), '/T', '/F'], { stdio: 'ignore' }) : k.kill(); } catch {} } setTimeout(() => process.exit(code), 800); };
const up = async (url, ms) => { const t = Date.now(); while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return true; } catch {} await sleep(500); } return false; };
if (!await up(BASE, 60000)) { console.log(JSON.stringify({ ok: [], fail: ['vite did not start'] })); done(1); }
else {
  kids.push(spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${CPORT}`, '--window-size=1700,500',
    '--user-data-dir=' + process.env.TEMP + '/invlab-' + Date.now(), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' }));
  let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${CPORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let n = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++n; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value;
  const ok = [], fail = [];
  for (const spec of models) {
    const [m, sd] = spec.split('@');
    await send('Page.navigate', { url: `${BASE}scripts/invert-lab/lab.html?m=${encodeURIComponent(m)}${sd ? '&seed=' + sd : ''}` });
    let t = Date.now(); while (Date.now() - t < 90000 && !await ev('window.__labDone === true').catch(() => false)) await sleep(500);
    const png = await ev(`document.getElementById('out')?.toDataURL('image/png')`);
    if (!png || !await ev('window.__labDone === true')) { fail.push(spec + ': ' + (await ev('document.body.innerText').catch(() => '')).slice(0, 200)); continue; }
    const f = `${OUT}/${spec.replace(/[:@]/g, '-')}.png`; writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); ok.push(f);
  }
  console.log(JSON.stringify({ ok, fail })); done(0);
}
