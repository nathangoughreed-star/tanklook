// Lane PC1 (2026-11-15): shots of the Plants picker as picture cards. Needs the DEV server: npx vite --port 6411 --strictPort ; node scripts/pc1-shots.mjs
//   npx vite --port 6411 --strictPort ; then  URL=http://localhost:6411/ PHASE=before node scripts/s11-shots.mjs
// -> research/screens/S11/<PHASE>/<device>/NN-name.jpg, facts.json (overflow + small-target counts per shot, page errors), contact sheets via scripts/s11-sheet.py
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6411/', PORT = 9531, PHASE = process.env.PHASE ?? 'after';
const DEVICES = { desk1280: [1280, 800, false], phone390: [390, 844, true], _x: [0,0,false] }; const _unused = { phone390: [390, 844, true], phone360: [360, 780, true], tabP: [768, 1024, true], tabL: [1024, 768, true], d1600: [1600, 900, false], d1280: [1280, 720, false] };
const ONLYDEV = process.env.DEV?.split(',') ?? Object.keys(DEVICES), ONLYSEC = process.env.SEC?.split(',');
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/pc1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 250)); return r.result.result.value; };
const click = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)}) || b.getAttribute('aria-label')?.includes(${JSON.stringify(text)})); if (!e) throw new Error('no ' + ${JSON.stringify(css + ' ' + text)}); e.click(); return true })()`);
const seed = (() => { const j = JSON.parse(readFileSync('research/visual/vf0/scenes/nathan-20g-long-2026-11-13.json', 'utf8')); for (const t of j.tanks) t.fish = []; return JSON.stringify(j); })();
const prevF = (() => { try { return JSON.parse(readFileSync(`research/screens/PC1/facts.json`, 'utf8')); } catch { return {}; } })(); const facts = prevF.facts ?? {}, errors = [], fails = []; let phase = 'start', dev = '', OUT = '';
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(dev + '/' + phase + ': ' + d.params.exceptionDetails.exception?.description?.slice(0, 200)); });
const save = () => writeFileSync(`research/screens/PC1/facts.json`, JSON.stringify({ facts, fails, errors }, null, 1));
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
const tile = id => `document.querySelector('.ptile[data-plant="${id}"]')`;
const stat = async tag => { facts[dev + ' ' + tag] = await ev(`({ tiles: document.querySelectorAll('.ptile').length, loaded: [...document.querySelectorAll('.ptile img')].filter(i => i.complete && i.naturalWidth > 0).length, cols: new Set([...document.querySelectorAll('.ptile')].slice(0, 8).map(e => Math.round(e.getBoundingClientRect().left))).size, chips: [...document.querySelectorAll('.plants .chips .chip')].map(c => c.textContent.trim()), caps: [...document.querySelectorAll('.plants .pgroup .cap')].map(c => c.textContent.trim()) })`); };
const scrollTo = css => ev(`(() => { const e = document.querySelector(${JSON.stringify(css)}); e?.scrollIntoView({ block: 'start' }); return !!e; })()`);
mkdirSync('research/screens/PC1', { recursive: true });
for (dev of ['desk1280', 'phone390']) {
  const [w, h, mobile] = DEVICES[dev]; OUT = `research/screens/PC1/${dev}`; mkdirSync(OUT, { recursive: true });
  await open2(w, h, mobile);
  await tryStep('01-grid', async () => { await section('Plants'); await sleep(2500); await stat('grid'); await scrollTo('.plants .chips'); await shot('01-grid', 1500); await ev(`document.querySelector('.panel')?.scrollBy(0, 330); true`); await shot('01b-grid-scrolled', 800); });
  await tryStep('02-detail', async () => { await ev(`${tile('sword')}.querySelector('.pinfo').click(); true`); await sleep(1200); facts[dev + ' detail rows'] = await ev(`[...document.querySelectorAll('.rundown .drow')].map(r => r.textContent).join(' | ')`); await shot('02-detail-sword', 600); await click('.detail .back', 'Back'); await sleep(500); });
  await tryStep('03-click-does-nothing', async () => { await ev(`${tile('stem')}.querySelector('.tname').click(); true`); await sleep(500); facts[dev + ' detail after tile body click'] = await ev(`!!document.querySelector('.detail')`); });
  await tryStep('04-artificial', async () => { await click('.plants .chips .chip', 'Artificial'); await sleep(1500); await stat('artificial'); await scrollTo('.plants .chips'); await shot('04-artificial', 1200); await click('.plants .chips .chip', 'All'); await sleep(500); });
  await tryStep('05-stocked', async () => {
    const before = await ev(`document.querySelectorAll('.ptile').length`);
    for (const id of ['anubias', 'sword', 'stem']) { await ev(`${tile(id)}?.querySelector('.btn')?.click(); true`); await sleep(1200); }
    await ev(`document.querySelector('.panel')?.scrollTo(0, 0); true`); await sleep(500);
    facts[dev + ' tiles before/after 3 adds'] = [before, await ev(`document.querySelectorAll('.ptile').length`)]; facts[dev + ' hidden now'] = await ev(`['anubias','sword','stem'].map(id => !${tile('x').replace('x', '" + id + "')})`).catch(() => null);
    facts[dev + ' placed rows'] = await ev(`document.querySelectorAll('.pr').length`);
    await shot('05-stocked-top', 800); await scrollTo('.plants .chips'); await shot('05b-stocked-grid', 800);
  });
  await tryStep('06-search', async () => { await ev(`(() => { const i = document.querySelector('.search input'); i.value = 'anubias'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`); await sleep(1000); facts[dev + ' search anubias'] = await ev(`document.querySelector('.plants .hint:last-of-type')?.textContent`); facts[dev + ' search none'] = await ev(`[...document.querySelectorAll('.plants .hint')].map(h => h.textContent).filter(t => /already/.test(t))`); });
}
save(); ch.kill(); process.exit(0);
