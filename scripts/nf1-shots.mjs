// NF1 shots: Notes with "Fix these" hovered / after the click at 1280x800, and the phone at 390.  node scripts/nf1-shots.mjs  (dev server on URL, default http://localhost:5175/)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5175/', PORT = 9541, OUT = 'shots/nf1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/nf1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 250)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
const waitFor = async (expr, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(500); } return false; };
const facts = {};
async function run(tag, w, h, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: BASE }); await sleep(2500);
  await ev(`fetch('/_nf1scene.json').then(r => r.text()).then(t => { localStorage.clear(); localStorage.setItem('tanklook.scene', t); return 1; })`);
  await send('Page.navigate', { url: BASE }); await sleep(5000);
  await waitFor(`!!window.__gb`);
  const open = () => ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => /Notes/.test(b.textContent) && b.closest('.apphead, header, .checks, .bar') || /Notes/.test(b.textContent)); b.click(); return true })()`);
  await open(); await waitFor(`!!document.querySelector('.drawer .fixbtn')`); await sleep(800);
  facts[tag + '-before'] = await ev(`[document.querySelectorAll('.drawer .dlist li').length, [...document.querySelectorAll('.fixgo')].map(b => b.innerText)]`);
  if (!mobile) {
    const r = await ev(`(() => { const r = document.querySelector('.fixgo').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0], y: r[1] }); await sleep(400);
    await shot(`${tag}-1-hover`);
  } else { await ev(`document.querySelector('.drawer .fixes').scrollIntoView({ block: 'end' })`); await sleep(300); await shot(`${tag}-1-notes`); }
  facts[tag + '-tip'] = await ev(`document.querySelector('.fixtip').innerText`);
  facts[tag + '-groundBefore'] = await ev(`JSON.stringify(window.__gb.store.tank.terrain.on)`);
  await ev(`document.querySelector('.fixgo').click()`); await sleep(1500);
  facts[tag + '-after'] = await ev(`[document.querySelectorAll('.drawer .dlist li').length, document.querySelector('.drawer')?.innerText.slice(0, 300), window.__gb.store.tank.terrain.on, window.__gb.store.tank.items.map(i => i.lift).join()]`);
  await shot(`${tag}-2-after`);
  if (mobile) { await ev(`document.querySelector('.drawer .sec-body')?.scrollTo(0, 0)`); }
  await ev(`window.__gb.store.undo()`); await sleep(1200);
  facts[tag + '-undone'] = await ev(`[window.__gb.store.tank.terrain.on, document.querySelectorAll('.drawer .dlist li').length]`);
}
await run('d1280', 1280, 800, false);
await run('p390', 390, 844, true);
writeFileSync(`${OUT}/facts.json`, JSON.stringify(facts, null, 1));
ch.kill(); ws.close(); process.exit(0);
