// Lane OR1 (R104, 2026-11-16): screenshots of the continent filter and the animal info card at 1280 and 390 px.
//   npx vite --port 5174 --strictPort ; URL=http://localhost:5174/ node scripts/or1-shots.mjs  ->  research/screens/OR1/
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5174/', PORT = +(process.env.PORT ?? 9577), OUT = 'research/screens/OR1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + process.env.TEMP + '/or1-chrome-' + Date.now(), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' -> ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text).slice(0, 200)); return r.result.result.value; };
const click = (css, re) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => new RegExp(${JSON.stringify(re)}, 'i').test(b.textContent.trim() + ' ' + (b.getAttribute('aria-label') ?? ''))); if (!e) return false; e.click(); return true; })()`);
const seed = (() => { const j = JSON.parse(readFileSync('research/visual/vf0/scenes/nathan-20g-long-2026-11-13.json', 'utf8')); for (const t of j.tanks) t.fish = []; return JSON.stringify(j); })();
const waitFor = async (expr, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(700); } return false; };
const shot = async name => { await sleep(900); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
await send('Runtime.enable');
for (const [dev, w, h, mobile] of [['1280', 1280, 800, false], ['390', 390, 844, true]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url: BASE }); await sleep(2500);
  await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(seed)}); true`);
  await send('Page.navigate', { url: BASE + '?ui=2' });
  await waitFor(`document.body.dataset.ui2 === 'ready' && !!window.__gb`); await sleep(5000);
  console.log(dev, 'animals', await click('button, [role=tab]', '^Animals'));
  await sleep(1200);
  console.log('origin chips', await ev(`[...document.querySelectorAll('.chips.origins .chip')].map(c => c.textContent).join(' | ')`));
  await click('.chips.origins .chip', '^South America'); await sleep(900);
  await ev(`document.querySelector('.origincap')?.scrollIntoView({ block: 'start' }); true`);
  await shot(`filter-${dev}`);
  await ev(`document.querySelector('.ptile .info')?.click(); true`); await sleep(900);
  await ev(`document.querySelector('.detail .origin')?.scrollIntoView({ block: 'center' }); true`);
  await shot(`info-${dev}`);
  console.log('origin line', await ev(`document.querySelector('.detail .origin')?.textContent`));
}
ws.close(); ch.kill();
