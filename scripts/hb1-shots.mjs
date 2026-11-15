// Lane HB1 (2026-11-14): header bars proof. DEV server: npx vite --port 6412 --strictPort ; PHASE=before|after URL=http://localhost:6412/ node scripts/hb1-shots.mjs
// -> research/screens/HB1/<PHASE>/<device>-<step>.png + facts.json (header overflow, overlap of header items)
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6412/', PORT = 9512, PHASE = process.env.PHASE ?? 'after';
const DEVICES = { d1920: [1920, 1080, false], d1280: [1280, 720, false], tab1024: [1024, 768, false], tab768: [768, 1024, false], phone390: [390, 844, true] };
const ONLY = process.env.DEV?.split(',') ?? Object.keys(DEVICES);
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/hb1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 250)); return r.result.result.value; };
const click = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)}) || (b.title||'').includes(${JSON.stringify(text)})); if (!e) throw new Error('no ' + ${JSON.stringify(css + ' ' + text)}); e.click(); return true })()`);
const seed = readFileSync('research/visual/vf0/scenes/nathan-20g-long-2026-11-13.json', 'utf8');
const facts = {}, fails = [];
const OUT = `research/screens/HB1/${PHASE}`; mkdirSync(OUT, { recursive: true });
const waitFor = async (expr, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(700); } return false; };
for (const dev of ONLY) {
  const [w, h, mobile] = DEVICES[dev];
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: BASE }); await sleep(2500);
  await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(seed)}); true`);
  await send('Page.navigate', { url: BASE + '?ui=2' });
  await waitFor(`document.body.dataset.ui2 === 'ready' && !!window.__gb`); await sleep(6000);
  const shot = async name => { await sleep(900); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${dev}-${name}.png`, Buffer.from(r.result.data, 'base64'));
    facts[dev + '-' + name] = await ev(`(() => { const hd = document.querySelector('.apphead'); const r = hd.getBoundingClientRect(); const kids = [...hd.querySelectorAll('button, .brand, .pname, .checkbar')].map(e => e.getBoundingClientRect()).filter(k => k.width); return { headH: r.height, headScroll: hd.scrollWidth - hd.clientWidth, past: kids.filter(k => k.right > innerWidth + 1).length, pageX: document.documentElement.scrollWidth - innerWidth, canvasTop: Math.round(document.querySelector('.vcanvas')?.getBoundingClientRect().top ?? -1) }; })()`); console.log(dev, name, JSON.stringify(facts[dev + '-' + name])); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { fails.push(dev + ' ' + name + ': ' + e.message.slice(0, 150)); console.log('FAIL', dev, name, e.message.slice(0, 120)); } };
  const esc = async () => { await ev(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`); await sleep(300); };
  await step('home', async () => { if (!(w < 700)) await click('.rail .ritem', 'Tank').catch(() => {}); await esc(); await shot('01-home'); });
  await step('check', async () => { await click('.check', 'Habitat').catch(() => click('.check', 'Water')); await shot('02-check-open'); await esc(); });
  await step('view', async () => { await click('.cluster .btn', 'View').catch(() => click('.cluster .btn', 'Camera')); await shot('03-view-menu'); await ev(`document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})); true`); await esc(); });
  await step('compare', async () => { if (w < 700) { await click('.cluster .btn', 'Camera'); await sleep(400); await click('.phoneacts .btn', 'Compare'); } else await click('.cluster .btn', 'Compare').catch(() => click('.cluster .btn', 'tank B')); await sleep(2500); await shot('04-compare'); if (w < 700) { await click('.cluster .btn', 'Camera'); await click('.phoneacts .btn', 'End').catch(() => {}); } else await click('.cluster .btn', 'End').catch(() => {}); });
}
writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, fails }, null, 1));
ch.kill(); process.exit(0);
