// PB2: shots of the new Overflow box and Sump categories in the Equipment tab, at 1280 and 390.
// Run (dev server up): URL=http://localhost:5183/ node scripts/pb2-shots.mjs   -> research/screens/PB2/{w1280,w390}-{overflow,sump}.jpg
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9452;
mkdirSync('research/screens/PB2', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1280,900', '--user-data-dir=' + (process.env.TEMP + '/pb2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' -> ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const clickText = (sel, re) => ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => ${re}.test(e.textContent.trim())); if (!b) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true; })()`);
for (const [tag, w, h, mobile] of [['w1280', 1280, 900, false], ['w390', 390, 844, true]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url: URL }); await sleep(3000);
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2000);
  await clickText('button', '/^Just look around/'); await sleep(500);
  await ev(`window.__gb.store.edit(S => { S.water.on = true; S.water.salt = true; S.tech = { rows: { filter: 'sump', heater: 'one', skimmer: 'sump' }, filters: [{ kind: 'sump' }] }; }); true`);
  await sleep(800);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); true`);
  if (!(await clickText('button', '/^Equipment$/'))) { await clickText('button', '/^More$/'); await sleep(600); await clickText('button', '/^Equipment/'); } await sleep(900);
  const tidy = () => ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); [...document.querySelectorAll('button')].filter(b => /^(✕|×)$/.test(b.textContent.trim()) && /Start a tank|Get started/.test(b.parentElement?.textContent ?? '')).forEach(b => b.click()); true`);
  const has = re => ev(`[...document.querySelectorAll('button')].some(e => ${re}.test(e.textContent.trim()))`);
  if (!(await has('/^Overflow box/'))) { await clickText('button', '/^More equipment/'); await sleep(500); }
  for (const [name, re] of [['overflow', '/^Overflow box/'], ['sump', '/^Sump/']]) {
    await clickText('button', re); await sleep(700);
    await ev(`(() => { const b = [...document.querySelectorAll('button')].find(e => ${re}.test(e.textContent.trim())); b?.scrollIntoView({ block: 'start' }); return true; })()`); await sleep(600);
    await tidy(); await sleep(300);
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); writeFileSync(`research/screens/PB2/${tag}-${name}.jpg`, Buffer.from(r.result.data, 'base64'));
    await clickText('button', re); await sleep(300); // fold it again
  }
}
ws.close(); ch.kill();
console.log('done');
