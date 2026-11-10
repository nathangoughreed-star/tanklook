// Lane AB5 Combine browser check (dev server, URL env): the quick sheet's Combine buttons and the combined pair.
// Pictures in research/screens/ab5/, a JSON log of the checks to stdout. Run through scripts/lowprio.ps1 on the shared machine.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5195/', PORT = 9377;
mkdirSync('research/screens/ab5', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/ab5d-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' => ' + (r.result.exceptionDetails.exception?.description ?? '').slice(0, 100)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 25 }); writeFileSync(`research/screens/ab5/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const clickText = (sel, text) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent.includes(${JSON.stringify(text)})); if(!e) return 'missing ${text}'; e.click(); return 'ok'})()`);
const view = (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const waitPair = async () => { for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('.abdock .abfacts, .abdock .abnone[role=status]')`)) break; await sleep(500); } await sleep(2500); };
const IN = 25.4, log = (k, v) => console.log(k, JSON.stringify(v));
try {
  await send('Page.enable');
  const setup = async (w, h, mob) => {
    await view(w, h, mob); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
  await sleep(3000);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300);
  await ev(`window.__gb.store.edit(S => { delete S.discoverOn; S.locks = undefined; })`);
  await sleep(1500);
  };
  const prefs = (p) => ev(`(async () => { const m = await import('/src/scene/prefsAdapter.ts'); m.holdQuickPrefs(${JSON.stringify(p)}); return 'set'; })()`);
  const summary = () => ev(`(() => { const nl = String.fromCharCode(10), flat = e => e.innerText.split(nl).join(' '); const t = [...document.querySelectorAll('.abdock .abfact')].map(flat); const sides = [...document.querySelectorAll('.abdock .abside')].map(e => flat(e.querySelector('h3')) + ' >> ' + [...e.querySelectorAll('.abbuy li')].map(flat).join(' | ')); return JSON.stringify({ facts: t, sides }); })()`);
  await setup(1280, 800, false); await sleep(800);
  for (const [tag, p] of [['no-co2', { world: 'freshwater', sizeGal: { lo: 20, hi: 60 }, plants: 'require', avoid: ['co2'] }], ['co2-allowed', { world: 'freshwater', sizeGal: { lo: 20, hi: 60 }, plants: 'require', avoid: [] }]]) {
    await prefs(p); log(tag + ' open', await click('#discoverBtn')); await sleep(800); if (await ev(`!!document.querySelector('.abdock [data-act="restart"]')`)) await click('.abdock [data-act="restart"]');
    const t0 = Date.now(); await waitPair(); log(tag + ' first pair ms', Date.now() - t0);
    await click('.abdock [data-act="more"]'); await sleep(800);
    log(tag + ' pair', JSON.parse(await summary()));
    await shot('demo-' + tag);
    await click('.abdock [data-act="close"]'); await sleep(600);
  }
} catch (e) { console.log("ERR", e.message); } finally { ch.kill(); process.exit(0); }
