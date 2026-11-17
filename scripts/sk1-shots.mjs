// SK1 shots: the Starters and kits screen, each tab at 1280x800 and the phone at 390.  node scripts/sk1-shots.mjs  (dev server on URL, default http://localhost:5173/)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5173/', PORT = 9552, OUT = 'shots/sk1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/sk1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 250)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
const waitFor = async (expr, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(500); } return false; };
const facts = {};
const tab = name => ev(`[...document.querySelectorAll('[role=tab]')].find(b => b.textContent.startsWith('${name}')).click()`);
async function run(tag, w, h, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url: BASE + '?ui=2' }); await sleep(6000);
  await waitFor(`!!window.__gb`);
  await ev(`document.querySelector('[aria-label="File menu"]').click()`); await sleep(300);
  await ev(`[...document.querySelectorAll('[role=menuitem]')].find(b => b.textContent.trim().startsWith('New')).click()`); await sleep(500);
  await shot(`${tag}-0-start`);
  await ev(`document.querySelector('[data-door=starters]').click()`); await sleep(1500);
  facts[tag + '-tabs'] = await ev(`[...document.querySelectorAll('[role=tab]')].map(b => b.textContent)`);
  facts[tag + '-fit'] = await ev(`(() => { const d = document.querySelector('.dlg.full').getBoundingClientRect(); return [d.width, d.height, innerWidth, innerHeight, document.documentElement.scrollWidth] })()`);
  await shot(`${tag}-1-starters`);
  for (const [n, f] of [['Bundles', '2-bundles'], ['On sale', '3-sale']]) { await tab(n); await sleep(800); facts[`${tag}-${n}-cards`] = await ev(`document.querySelectorAll('.dealcard').length`); await shot(`${tag}-${f}`); }
  if (tag === 'd1280') {
    await ev(`[...document.querySelectorAll('.dealsort .chip')].find(b => b.textContent.startsWith('% saved')).click()`); await sleep(400);
    facts.pctOrder = await ev(`[...document.querySelectorAll('.dealsave')].map(e => e.textContent).slice(0, 4)`);
    const before = await ev(`window.__gb.store.scene.name`);
    facts.title = await ev(`document.querySelector('.dealcard .t').textContent`);
    await ev(`[...document.querySelectorAll('.dealcard .btn.primary')][0].click()`); await sleep(2500);
    facts.started = [before, await ev(`window.__gb.store.scene.name`), await ev(`!!document.querySelector('.dlg.full')`)];
    await shot(`${tag}-4-started`);
  }
}
await run('d1280', 1280, 800, false);
await run('p390', 390, 844, true);
writeFileSync(`${OUT}/facts.json`, JSON.stringify(facts, null, 1));
console.log(JSON.stringify(facts, null, 1));
ch.kill(); ws.close(); process.exit(0);
