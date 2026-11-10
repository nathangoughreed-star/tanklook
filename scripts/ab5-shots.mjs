// Lane AB5 Combine browser check (dev server, URL env): the quick sheet's Combine buttons and the combined pair.
// Pictures in research/screens/ab5/, a JSON log of the checks to stdout. Run through scripts/lowprio.ps1 on the shared machine.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5195/', PORT = 9375;
mkdirSync('research/screens/ab5', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/ab5-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
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
const waitPair = async () => { for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('.abx .abcard, .abx .abnone[role=status]')`)) break; await sleep(500); } await sleep(2500); };
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
  for (const [w, h, mob, tag] of (process.env.ONLY ? [[375, 812, true, 'm375']] : [[1280, 800, false, 'desktop'], [375, 812, true, 'm375']])) {
    await setup(w, h, mob); await sleep(800);
    log(tag + ' open', await click('#discoverBtn')); await sleep(800); if (await ev(`!!document.querySelector('.abx [data-act="restart"]')`)) await click('.abx [data-act="restart"]'); await waitPair();
    // make the first pair's A the favourite so the next pair is favourite vs challenger
    await click('.abx [data-act="choose"][data-o="A"]'); await click('.abx [data-act="next"]'); await waitPair();
    let done = false;
    for (const tab of ['plants', 'hardscape', 'animals', 'substrate']) {
      if (!(await ev(`!!document.querySelector('.abx [data-act="combine"]')`))) { await ev(`document.querySelectorAll('.abx [data-act="sheet"]')[1].click()`); await sleep(400); }
      if (!done) { await ev(`document.querySelector('.abx [data-act="combine"][data-tab="${tab}"]').scrollIntoView({block:'center'})`); await sleep(300); await shot(`${tag}-1-combine-sheet`); done = true; }
      const t0 = Date.now(); log(tag + ' combine ' + tab, await ev(`(()=>{const b=document.querySelector('.abx [data-act="combine"][data-tab="${tab}"]'); const t=b.textContent; b.click(); return t})()`));
      await sleep(500); for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('.abx .abnote')`)) break; await sleep(300); }
      log(tag + ' combine ms', Date.now() - t0); await sleep(2500);
      const note = await ev(`document.querySelector('.abx .abnote')?.innerText`); log(tag + ' note', note);
      if (/^Combined/.test(note)) break;
    }
    log(tag + ' roles', await ev(`[...document.querySelectorAll('.abx .abrole')].map(e=>e.innerText).join(' | ')`));
    await ev(`document.querySelector('.abx').scrollTop = 0`);
    await shot(`${tag}-2-combined-pair`);
  }
} catch (e) { console.log("ERR", e.message); } finally { ch.kill(); process.exit(0); }
