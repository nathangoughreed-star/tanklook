// Lane S11 (2026-11-14): phone / tablet / desktop pass over every shell section. Needs the DEV server (window.__gb):
//   npx vite --port 6411 --strictPort ; then  URL=http://localhost:6411/ PHASE=before node scripts/s11-shots.mjs
// -> research/screens/S11/<PHASE>/<device>/NN-name.jpg, facts.json (overflow + small-target counts per shot, page errors), contact sheets via scripts/s11-sheet.py
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6411/', PORT = 9531, PHASE = process.env.PHASE ?? 'after';
const DEVICES = { desk1280: [1280, 800, false], phone390: [390, 844, true], _x: [0,0,false] }; const _unused = { phone390: [390, 844, true], phone360: [360, 780, true], tabP: [768, 1024, true], tabL: [1024, 768, true], d1600: [1600, 900, false], d1280: [1280, 720, false] };
const ONLYDEV = process.env.DEV?.split(',') ?? Object.keys(DEVICES), ONLYSEC = process.env.SEC?.split(',');
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/at1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 250)); return r.result.result.value; };
const click = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)}) || b.getAttribute('aria-label')?.includes(${JSON.stringify(text)})); if (!e) throw new Error('no ' + ${JSON.stringify(css + ' ' + text)}); e.click(); return true })()`);
const seed = (() => { const j = JSON.parse(readFileSync('research/visual/vf0/scenes/nathan-20g-long-2026-11-13.json', 'utf8')); for (const t of j.tanks) t.fish = []; return JSON.stringify(j); })();
const prevF = (() => { try { return JSON.parse(readFileSync(`research/screens/AT1/facts.json`, 'utf8')); } catch { return {}; } })(); const facts = prevF.facts ?? {}, errors = [], fails = []; let phase = 'start', dev = '', OUT = '';
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(dev + '/' + phase + ': ' + d.params.exceptionDetails.exception?.description?.slice(0, 200)); });
const save = () => writeFileSync(`research/screens/AT1/facts.json`, JSON.stringify({ facts, fails, errors }, null, 1));
const waitFor = async (expr, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(700); } return false; };
const open2 = async (w, h, mobile) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: BASE }); await sleep(2500);
  await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(seed)}); true`);
  await send('Page.navigate', { url: BASE + '?ui=2' });
  await waitFor(`document.body.dataset.ui2 === 'ready' && !!window.__gb`); await sleep(6000);
};
// metrics: page scroll width, visible elements poking out of the right edge, visible controls under 44 px (touch sizes)
const measure = touch => ev(`(() => { const W = innerWidth, vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight; };
  const out = [], small = [];
  for (const e of document.querySelectorAll('.ui2app *, .scrim *, .maker *')) { if (!vis(e)) continue; const r = e.getBoundingClientRect();
    if (r.right > W + 1 && !e.closest('.checkbar,[data-scroll],canvas,.paper,.paperview,.paperinline') && e.children.length === 0 && r.left < W) out.push(e.className?.toString().slice(0, 30) + ':' + (e.textContent || '').slice(0, 20));
    if (${touch} && e.matches('button, a, select, input:not([type=range]):not([type=checkbox]):not([type=radio]), [role=button]') && (r.height < 43.5 || r.width < 43.5) && !e.closest('canvas')) small.push(((e.textContent || e.getAttribute('aria-label') || e.title || e.className) + '').trim().slice(0, 22) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  return { pageX: document.documentElement.scrollWidth - W, out: out.slice(0, 6), small: small.length, smallEx: [...new Set(small)].slice(0, 8) }; })()`);
const shot = async (name, wait = 900) => { await sleep(wait); await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }).then(r => writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64'))); facts[dev] ??= {}; facts[dev][name] = await measure(DEVICES[dev][2] && dev !== 'd1600'); console.log(dev, name, JSON.stringify(facts[dev][name]).slice(0, 160)); };
const tryStep = async (name, fn) => { if (ONLYSEC && !ONLYSEC.some(s => name.includes(s))) return; phase = name; try { await fn(); } catch (e) { fails.push(dev + ' ' + name + ': ' + String(e.message).slice(0, 160)); console.log('FAIL', dev, name, e.message.slice(0, 120)); } save(); };
const phoneW = () => ev(`innerWidth < 700`);
const closeAll = async () => { await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`); await sleep(300); };
const section = async (title) => { // phone: tab bar or More; others: rail
  if (await phoneW()) {
    const tab = await ev(`!![...document.querySelectorAll('.tabbar button')].find(b => b.textContent.trim() === ${JSON.stringify(title)})`);
    if (tab) await click('.tabbar button', title); else { await click('.tabbar button', 'More'); await sleep(300); await click('.morerow', title); }
  } else { const cur = await ev(`document.querySelector('.panel h2')?.textContent ?? ''`); if (cur !== title) await click('.rail .ritem', title); }
  await sleep(900);
};
mkdirSync('research/screens/AT1', { recursive: true });
const sel = async (css, text) => ev(`!![...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)}))`);
const search = async q => { await ev(`(() => { const i = document.querySelector('.search input'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`); await sleep(1500); };
const tile = (name) => `[...document.querySelectorAll('.ptile')].find(e => e.querySelector('.tname')?.textContent.startsWith(${JSON.stringify(name)}))`;
for (dev of ['desk1280', 'phone390']) {
  const [w, h, mobile] = DEVICES[dev]; OUT = `research/screens/AT1/${dev}`; mkdirSync(OUT, { recursive: true });
  await open2(w, h, mobile);
  await tryStep('01-water-look-in-tank', async () => { await section('Tank'); await click('.panel .gh', 'Water look'); await sleep(500); await ev(`document.querySelector('.panel .group.open .gb')?.scrollIntoView({block:'center'}); true`); await shot('01-water-look-in-tank', 500); });
  await tryStep('02-animals-without-water-look', async () => { await section('Animals'); facts[dev + '-animals-has-water-look'] = await sel('.panel .gh', 'Water look'); facts[dev + '-animals-has-size-slider'] = await ev(`!!document.querySelector('[aria-label="New animal size"]')`); await shot('02-animals-without-water-look'); });
  await tryStep('03-card-grid', async () => {
    const on = await ev(`document.querySelector('.tglrow')?.getAttribute('aria-checked')`); if (on !== 'true') await click('.tglrow', 'Fits');
    await sleep(2500); await ev(`document.querySelector('.search')?.scrollIntoView({block:'start'}); true`);
    facts[dev + ' tiles'] = await ev(`document.querySelectorAll('.ptile').length`);
    facts[dev + ' tile columns'] = await ev(`new Set([...document.querySelectorAll('.ptile')].slice(0, 12).map(e => Math.round(e.getBoundingClientRect().left))).size`);
    for (const q of ['Black molly', 'Cardinal tetra', 'Cherry barb', 'Chili rasbora']) facts[dev + ' listed ' + q] = await ev(`!!(${tile(q)})`);
    facts[dev + ' tiles with a loaded picture'] = await ev(`[...document.querySelectorAll('.ptile img')].filter(i => i.complete && i.naturalWidth > 0).length`);
    await shot('03-card-grid', 1200);
    await ev(`window.scrollTo(0, 0); document.querySelector('.panel')?.scrollBy(0, 420); true`); await shot('03b-card-grid-scrolled', 800);
  });
  await tryStep('04-short-list', async () => { await search('chili'); facts[dev + ' short list'] = await ev(`document.querySelector('.endnote')?.textContent`); await shot('04-short-list-one-result', 600); await search(''); });
  await tryStep('05-detail-white-cloud', async () => { await search('white cloud'); await ev(`(${tile('White cloud')})?.querySelector('.tname')?.click(); true`); await sleep(400); facts[dev + ' tile click opens detail (must be false)'] = await ev(`!!document.querySelector('.detail')`); facts[dev + ' info button'] = await ev(`JSON.stringify(document.querySelector('.ptile .info')?.getBoundingClientRect())`); await ev(`(${tile('White cloud')})?.querySelector('.info')?.click(); true`); await sleep(1200); facts[dev + ' detail rows'] = await ev(`[...document.querySelectorAll('.rundown .drow')].map(r => r.textContent).join(' | ')`); await shot('05-detail-white-cloud', 600); await ev(`document.querySelector('.panel')?.scrollBy(0, 900); true`); await shot('05b-detail-white-cloud-lower', 600); });
  await tryStep('06-rows-and-plus-minus', async () => {
    await click('.detail .btn', 'Add'); await sleep(1200); await click('.detail .back', 'Back'); await sleep(600); await ev(`document.querySelector('.panel')?.scrollTo(0, 0); true`);
    facts[dev + ' stock rows'] = await ev(`document.querySelectorAll('.srow').length`);
    facts[dev + ' stock row box'] = await ev(`JSON.stringify(document.querySelector('.srow')?.getBoundingClientRect())`);
    facts[dev + ' plus/minus'] = await ev(`!!document.querySelector('.srow [aria-label^="One more"]') && !!document.querySelector('.srow [aria-label^="One fewer"]')`);
    facts[dev + ' white cloud tile still listed after Add (must be false)'] = await ev(`!!(${tile('White cloud')})`); facts[dev + ' shown note'] = await ev(`document.querySelector('.endnote')?.textContent`);
    await shot('06-stock-rows-with-plus-minus', 600);
    await ev(`document.querySelector('.srow [aria-label^="One more"]')?.click(); true`); await sleep(800);
    facts[dev + ' count after +'] = await ev(`document.querySelector('.srow input')?.value`);
  });
  await tryStep('07-detail-held-back', async () => {
    const off = await ev(`document.querySelector('.tglrow')?.getAttribute('aria-checked')`); if (off === 'true') await click('.tglrow', 'Fits'); await sleep(1500);
    await search('oscar'); await ev(`(${tile('Oscar')})?.querySelector('.info')?.click(); true`); await sleep(1200);
    facts[dev + ' held-back fit box'] = await ev(`document.querySelector('.fitbox')?.textContent`);
    await shot('07-detail-held-back', 600); await ev(`document.querySelector('.panel')?.scrollBy(0, 900); true`); await shot('07b-detail-held-back-lower', 600);
    await click('.detail .back', 'Back'); await sleep(400);
  });
  await tryStep('08-selection-size', async () => {
    await click('.srow .nm', ''); await sleep(1200);
    facts[dev + ' drawer size'] = await ev(`document.querySelector('[aria-label="Size, percent of adult size"]')?.value`);
    await shot('08-selection-size-control', 800);
    if (!facts[dev + ' drawer size']) { facts[dev + ' drawer opened'] = false; throw new Error('selection drawer did not stay open (phone: App.tsx closes the selection when the Animals section closes)'); }
    await ev(`(() => { const s = document.querySelector('[aria-label="Size, percent of adult size"]'); s.value = 60; s.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`); await sleep(900);
    facts[dev + ' size after 60'] = await ev(`document.querySelector('[aria-label="Size, percent of adult size"]')?.closest('.field')?.querySelector('.val')?.textContent`);
    await shot('09-selection-size-60', 600);
  });
  save();
}
save(); ws.close(); ch.kill(); console.log(JSON.stringify({ fails, errors: errors.slice(0, 5) }, null, 1)); process.exit(0);
