// Lane AB3 browser check (dev server, URL env): the A/B Discover screen at desktop and 375 px, journeys A (blank slate), B (keep from the losing card), F (champion / fresh), G (history after locks).
// Pictures in research/screens/ab3/, a JSON log of the checks to stdout. Run through scripts/lowprio.ps1 on the shared machine.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5193/', PORT = 9373;
mkdirSync('research/screens/ab3', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/ab3-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' => ' + (r.result.exceptionDetails.exception?.description ?? '').slice(0, 100)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 25 }); writeFileSync(`research/screens/ab3/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
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
  for (const [w, h, mob, tag] of [[1280, 800, false, 'desktop'], [375, 812, true, 'm375']]) {
    await setup(w, h, mob); await sleep(800);
    log(tag + ' open', await click('#discoverBtn')); await sleep(800); if (await ev(`!!document.querySelector('.abx [data-act="restart"]')`)) { await shot(`${tag}-0-resume`); await click('.abx [data-act="restart"]'); } await waitPair();
    log(tag + ' cards', await ev(`document.querySelectorAll('.abx .abcard').length`));
    { const t0 = Date.now(); let n = 0; for (; Date.now() - t0 < 60000; ) { n = await ev(`[...document.querySelectorAll('.abx .abcard img.abpic')].filter(i=>i.src.startsWith('data:')).length`); if (n >= 2) break; await sleep(500); } log(tag + ' pics', { n, ms: Date.now() - t0 }); }
    log(tag + ' overflowX', await ev(`document.documentElement.scrollWidth > innerWidth || document.querySelector('.abx').scrollWidth > innerWidth`));
    await shot(`${tag}-1-first-pair`);
    // quick sheet open
    await click('.abx [data-act="sheet"]'); await sleep(400); await shot(`${tag}-2-quick-sheet`);
    // choose A -> reasons
    await click('.abx [data-act="choose"][data-o="A"]'); await sleep(300); log(tag + ' reasons shown', await ev(`document.querySelectorAll('.abx .abwhy .chip').length`)); await click('.abx .abwhy .chip'); await shot(`${tag}-3-reasons`);
    await click('.abx [data-act="next"]'); await waitPair(); log(tag + ' second banner', await ev(`document.querySelector('.abx .abbanner')?.innerText`));
    // journey F: explore something different
    await click('.abx [data-act="different"]'); await waitPair(); log(tag + ' fresh banner', await ev(`document.querySelector('.abx .abbanner')?.innerText ?? document.querySelector('.abx .abnone')?.innerText`));
    // journey B: keep an animal from a card (exact by default)
    if (!(await ev(`!!document.querySelector('.abx .abrow')`))) await click('.abx [data-act="sheet"]'); await sleep(300);
    log(tag + ' keep default mode', await ev(`document.querySelector('.abx .abmode')?.value`));
    log(tag + ' keep', await click('.abx .abkeep[data-t*="item"]')); await sleep(600);
    await waitPair();
    if (!(await ev(`!!document.querySelector('.abx .abcard')`))) { await shot(`${tag}-7-no-solution`); await ev(`window.__gb.store.update(s => { s.tanks[s.active].locks = { objects: [], roster: [] }; }, { history: false })`); await click('.abx [data-act="retry"]'); await waitPair(); }
    log(tag + ' after keep', await ev(`document.querySelector('.abx .abnone')?.innerText.slice(0,260) ?? document.querySelector('.abx .abnote')?.innerText`));
    log(tag + ' locked bar', await ev(`document.querySelector('.abx .ablocked').innerText.slice(0, 80)`));
    // freeze: Keep A's hardscape for now
    await ev(`document.querySelector('.abx .abnow summary').click()`); await click('.abx [data-act="keepnow"][data-tab="hardscape"]'); await sleep(400);
    log(tag + ' freeze note', await ev(`document.querySelector('.abx .abfrz')?.innerText`));
    // history drawer
    await click('.abx [data-act="hist-toggle"]'); await sleep(1500); await shot(`${tag}-4-history`);
    await click('.abx [data-act="hist-open"]'); await sleep(500); log(tag + ' detail', await ev(`document.querySelector('.abx .abthen')?.innerText.slice(0, 120)`)); await shot(`${tag}-5-history-detail`);
    // journey G: lock a species that the opened design lacks, then Make It Yours -> conflict -> adapt
    await click('.abx [data-act="hist-close"]');
    await ev(`window.__gb.store.update(s => { const t = s.tanks[s.active]; t.fish = Array.from({ length: 8 }, (_, i) => ({ id: 900 + i, species: 'ember', x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 })); t.locks = { objects: [], roster: [{ species: 'ember', mode: 'exact', n: 37 }] }; }, { history: false })`);
    await click('.abx [data-act="hist-open"]'); await sleep(300); await click('.abx .abmodal [data-act="miy"]'); await sleep(600);
    log(tag + ' miy conflicts', await ev(`document.querySelector('.abx .abconf')?.innerText.slice(0, 160)`)); await shot(`${tag}-6-make-it-yours-conflict`);
    log(tag + ' adapt', await click('.abx [data-act="adapt"]')); await sleep(600);
    log(tag + ' after adapt', await ev(`document.querySelector('.abx .abok')?.innerText ?? document.querySelector('.abx .abmsg')?.innerText`));
    await click('.abx [data-act="miy-cancel"]');
    await click('.abx [data-act="close"]');
    // resume: the project changed since the session last looked
    await ev(`window.__gb.store.edit(S => { S.layout.seed += 1; })`); await click('#discoverBtn'); await sleep(800); await shot(`${tag}-8-resume`); await click('.abx [data-act="close"]');
    // no-solution: nothing may change
    await ev(`window.__gb.store.update(s => { s.tanks[s.active].discoverOn = []; }, { history: false })`);
    await click('#discoverBtn'); await sleep(600); if (await ev(`!!document.querySelector('.abx [data-act="restart"]')`)) await click('.abx [data-act="restart"]'); await waitPair();
    log(tag + ' no-solution', await ev(`document.querySelector('.abx .abnone')?.innerText.slice(0, 140)`)); await shot(`${tag}-7-no-solution`); await click('.abx [data-act="close"]');
    await ev(`window.__gb.store.update(s => { s.tanks[s.active].locks = { objects: [], roster: [] }; }, { history: false })`);
  }
} catch (e) { console.log('ERR', e.message); } finally { ch.kill(); process.exit(0); }
