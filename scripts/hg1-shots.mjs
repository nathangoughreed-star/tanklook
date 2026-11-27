// Lane HG1 (R187, 2026-11-27): proof shots of the generated-hardscape editor in the Scape section (Type, Shuffle, colour,
// look sliders) at 1280 and 390 wide, on the photo-55g reference scene. Against a running dev server:
//   URL=http://localhost:5287/ node scripts/hg1-shots.mjs      -> research/screens/HG1/ui-*.jpg + ui-facts.json
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5287/', PORT = 9481, OUT = 'research/screens/HG1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/hg1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const size = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
const shot = async (name, wait = 2500) => { await sleep(wait); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.trim().includes(${JSON.stringify(text)})); if (!e) throw new Error('no ' + ${JSON.stringify(css + ' ' + text)}); e.click(); return true })()`);
const slider = (label, v) => ev(`(() => { const e = [...document.querySelectorAll('.genlook input[aria-label=${JSON.stringify(label)}]')][0]; if (!e) throw new Error('no slider ${label}'); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true })()`);
const scrollTo = css => ev(`(() => { const e = document.querySelector(${JSON.stringify(css)}); e?.scrollIntoView({ block: 'center' }); return !!e })()`);
const scene = readFileSync('research/visual/vf0/scenes/photo-55g.json', 'utf8');
const errors = [];
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push((d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text).slice(0, 300)); });
const open = async () => {
  await send('Page.navigate', { url: BASE }); await sleep(1500);
  await ev(`localStorage.clear(); localStorage.setItem('tanklook.scene', ${JSON.stringify(scene)}); true`);
  await send('Page.navigate', { url: BASE });
  for (let i = 0; i < 120; i++) { if (await ev(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Hardscape')`).catch(() => false)) break; await sleep(1000); }
  await sleep(6000);
};
const toPiece = async name => {
  await click('button', 'Hardscape'); await sleep(2500);
  await click('button', 'placed'); await sleep(1500);
  await click('.pr .pn', name); await sleep(2000);
  await scrollTo('.genlook');
};
const facts = {};
for (const [w, h, mob, tag] of [[1280, 800, false, '1280'], [390, 844, true, '390']]) {
  await size(w, h, mob); await open();
  await toPiece('Spider wood');
  await shot(`ui-${tag}-1-spider-editor`);
  facts[tag] = { editor: await ev(`document.querySelector('.genlook')?.innerText.replace(/\\s+/g, ' ').slice(0, 300)`), overflow: await ev(`document.documentElement.scrollWidth > innerWidth`) };
  await click('.genlook button', 'Shuffle'); await slider('Branches', 85); await slider('Gnarl', 75); await click('.genlook .colsw[aria-label="Weathered grey"]', '').catch(() => ev(`document.querySelector('.genlook .colsw[aria-label="Weathered grey"]').click()`));
  await scrollTo('.genlook');
  await shot(`ui-${tag}-2-spider-shuffled-edited`);
  facts[tag].saved = await ev(`(() => { const sc = JSON.parse(localStorage.getItem('tanklook.scene') ?? 'null'); const it = sc?.tanks[sc.active].items.find(i => i.variant === 'spider'); return it ? { seed: it.seed, hs: it.hs } : null })()`);
}
facts.errors = errors;
writeFileSync(`${OUT}/ui-facts.json`, JSON.stringify(facts, null, 1));
console.log(JSON.stringify(facts).slice(0, 800));
ws.close(); ch.kill();
process.exit(0);
