// Lane AB6 browser check (dev server, URL env): the quick-preferences screen per habitat, the limits link, the Constraints Preferences block; desktop and 375 px. Pictures in research/screens/ab6/.
// Run through scripts/lowprio.ps1 on the shared machine.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5193/', PORT = 9376;
mkdirSync('research/screens/ab6', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/ab6-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' => ' + (r.result.exceptionDetails.exception?.description ?? '').slice(0, 100)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 25 }); writeFileSync(`research/screens/ab6/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const clickText = (sel, text) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent.includes(${JSON.stringify(text)})); if(!e) return 'missing ${text}'; e.click(); return 'ok'})()`);
const view = (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const waitPair = async () => { for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('.abx .abcard, .abx .abnone[role=status]')`)) break; await sleep(500); } await sleep(2500); };
const IN = 25.4, log = (k, v) => console.log(k, JSON.stringify(v));
try {
  await send('Page.enable');
  const boot = async (w, h, mob) => {
    await view(w, h, mob); await send('Page.navigate', { url: URL });
    for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
    await sleep(2500);
  };
  const toScreen = async hab => {
    await ev(`(()=>{ if (document.getElementById('startDlg').open) return; [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'New')?.click(); })()`); await sleep(400);
    await click('#startNew'); await sleep(300); await click(`[data-habitat="${hab}"]`); await sleep(800);
    await ev(`[...document.querySelectorAll('dialog[open] button')].find(b => b.textContent.trim() === 'Replace')?.click()`); await sleep(2500);
  };
  for (const [w, h, mob, tag] of [[1280, 800, false, 'desktop'], [375, 812, true, 'm375']]) {
    await boot(w, h, mob);
    await ev(`document.querySelectorAll('dialog[open]').forEach(d=>{ if(d.id!=='startDlg') d.close() })`);
    for (const hab of ['freshwater', 'terrarium']) {
      await ev(`(()=>{const s=document.getElementById('startDlg'); if(!s.open) s.showModal()})()`); await sleep(300);
      await toScreen(hab);
      log(tag + ' ' + hab + ' screen', await ev(`document.getElementById('introDlg')?.open`));
      await shot(`${tag}-1-${hab}-collapsed`);
      log(tag + ' ' + hab + ' fold+overflow', await ev(`(()=>{const r=document.getElementById('qpSkip').getBoundingClientRect(), o=document.getElementById('introDlg'); return {skipBottom: Math.round(r.bottom), innerH: innerHeight, dlgScrollW: o.scrollWidth, dlgClientW: o.clientWidth, pageOverflowX: document.documentElement.scrollWidth > innerWidth}})()`));
      await click('#introDlg [data-size="medium"]'); await click('#introDlg [data-plants="prefer"]');
      await ev(`document.querySelectorAll('#introDlg details.qp-more').forEach(d=>d.open=true)`); await sleep(300);
      await ev(`(()=>{const i=document.querySelector('#introDlg [data-limit="budget"]'); i.value='300'; i.dispatchEvent(new Event('change',{bubbles:true}));})()`); await click('#introDlg [data-avoid="co2"]'); await click('#introDlg [data-firm="budget:1"]'); await sleep(300);
      log(tag + ' ' + hab + ' expanded overflow', await ev(`(()=>{const o=document.getElementById('introDlg'); return {dlgScrollW: o.scrollWidth, dlgClientW: o.clientWidth, skipVisible: document.getElementById('qpSkip').getBoundingClientRect().bottom <= innerHeight}})()`));
      await shot(`${tag}-2-${hab}-expanded`);
      await click('#introDlg #introOk'); await sleep(800);
      log(tag + ' ' + hab + ' brief', await ev(`JSON.stringify(window.__gb.store.tank.brief.items['constraints.budget'] ?? null) + ' ' + JSON.stringify(window.__gb.store.tank.brief.project?.quick)`));
      await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
      if (hab === 'freshwater') {
        await ev(`document.querySelector('details.sec[data-sec="prefs"]').open = true`); await ev(`document.getElementById('prefsHost').scrollIntoView()`); await sleep(500);
        log(tag + ' overflowX', await ev(`document.documentElement.scrollWidth > innerWidth`));
        await shot(`${tag}-3-constraints-block`);
      }
    }
  }
} finally { ch.kill(); ws.close(); process.exit(0); }
