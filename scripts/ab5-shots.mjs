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
  for (const [w, h, mob, tag] of (process.env.ONLY ? [[375, 812, true, 'm375']] : [[1280, 800, false, 'desktop'], [375, 812, true, 'm375']])) {
    await setup(w, h, mob); await sleep(800);
    const key = `JSON.stringify((()=>{const t=structuredClone(window.__gb.store.tank); delete t.locks; delete t.camera; delete t.render; delete t.discoverOn; delete t.brief; return t})())`;
    const before = await ev(key);
    log(tag + ' open', await click('#discoverBtn')); await sleep(800); if (await ev(`!!document.querySelector('.abdock [data-act="restart"]')`)) await click('.abdock [data-act="restart"]'); await waitPair();
    log(tag + ' frozen', await ev(`window.__gb.store.frozen`)); log(tag + ' menu note', await ev(`document.querySelector('.abmenunote')?.innerText`));
    await shot(`${tag}-1-main-view-ab`);
    await click('.abdock [data-act="more"]'); await sleep(600); await shot(`${tag}-2-details-open`);
    // a blocked manual edit while Discovery is on
    await ev(`window.__gb.store.update(s => { s.tanks[s.active].tank.L += 50; })`);
    log(tag + ' edit blocked (design unchanged)', (await ev(key)) === before);
    // Combine B's plants into A: a PROPOSAL first
    await ev(`document.querySelector('.abdock .abcols')?.scrollIntoView()`);
    log(tag + ' combine', await ev(`(()=>{const b=document.querySelector('.abdock [data-act="combine"][data-tab="plants"]'); if(!b) return 'none'; b.click(); return b.textContent})()`));
    for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('.abdock .abprop, .abdock .abnote')`)) break; await sleep(300); }
    log(tag + ' proposal', await ev(`document.querySelector('.abdock .abprop')?.innerText.replace(/\s+/g,' ') ?? document.querySelector('.abdock .abnote')?.innerText`));
    await ev(`document.querySelector('.abdock .abpanel')?.scrollTo(0,0)`); await shot(`${tag}-3-combine-proposal`);
    if (await ev(`!!document.querySelector('.abdock [data-act="combine-ok"]')`)) { await click('.abdock [data-act="combine-ok"]'); await sleep(2500); log(tag + ' roles', await ev(`[...document.querySelectorAll('#labA .abchip, #labB .abchip')].map(e=>e.innerText).join(' | ')`)); await shot(`${tag}-4-combined-pair`); }
    await click('.abdock [data-act="close"]'); await sleep(800);
    log(tag + ' working design identical after close', (await ev(key)) === before); log(tag + ' frozen after close', await ev(`window.__gb.store.frozen`));
  }
} catch (e) { console.log("ERR", e.message); } finally { ch.kill(); process.exit(0); }
