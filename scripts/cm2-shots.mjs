// CM2: click a thing in the view under ?ui=2 -> the shell opens at it. Run: URL=http://localhost:5391/ node scripts/cm2-shots.mjs
// Finds a pixel for each target kind with clickTarget(), clicks it with real mouse events, saves a shot of each at desktop and 390 px.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5391/', PORT = 9452, OUT = 'research/screens/CM2';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/cm2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const click = async (x, y) => { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, pointerType: 'mouse' }); };
const shot = async name => { await sleep(1200); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
const report = {};
const SETUP = `(async () => {
  const { store } = window.__gb;
  const it = await import('/src/scene/items.ts'), sp = await import('/src/data/species.ts'), ie = await import('/src/scene/itemEdit.ts'), eq = await import('/src/shell/logic/equipment.ts'), an = await import('/src/shell/logic/animals.ts');
  const keys = Object.keys(it.LIBRARY), by = k => keys.filter(v => it.LIBRARY[v].kind === k);
  let n = 100; const put = (v, x, z) => store.edit(s => { const i = ie.addItem(s, v, n++, 7 + n); });
  put(by('stone')[0]); put(by('stone')[1]); put(by('plant')[0]); put(by('plant')[1]);
  store.edit(s => eq.applyPresetEdit(s, 'hightech'));
  const f = sp.SPECIES.find(x => /neon/i.test(x.id) || /neon/i.test(x.name || '')) ?? sp.SPECIES.find(x => x.habitat !== 'land');
  const r = an.setCount(store, f, k => k + 6, undefined, 100);
  return JSON.stringify({ fish: f.id, r, items: store.tank.items.map(i => i.kind + ':' + i.x + ',' + i.z), gear: !!window.__gb.viewer });
})()`;
const FIND = `(async () => {
  const { viewer, store } = window.__gb; const cm = await import('/src/interact/clickMenu.ts');
  const c = document.querySelector('canvas.vcanvas').getBoundingClientRect(), found = {};
  for (let y = c.top + 8; y < c.bottom - 8; y += 6) for (let x = c.left + 8; x < c.right - 8; x += 6) {
    const h = viewer.hitTest(x, y); if (!h) continue; const t = cm.clickTarget(viewer, store, h); if (!t) continue;
    const k = t.kind === 'gear' ? 'gear:' + t.row : t.kind === 'item' ? 'item:' + t.item : t.kind;
    (found[k] ??= []).push([Math.round(x), Math.round(y), t.id ?? null]);
  }
  return JSON.stringify(Object.fromEntries(Object.entries(found).map(([k, v]) => [k, { n: v.length, mid: v[v.length >> 1] }])));
})()`;
const mode = process.argv[2] ?? 'probe';
async function load(w, h, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url: BASE + '?ui=2' }); await sleep(2500);
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb && document.body.dataset.ui2==='ready'`).catch(() => false)) break; await sleep(1000); }
}
await load(1400, 900, false);
await ev(`localStorage.clear(); true`); await load(1400, 900, false);
console.log(await ev(SETUP)); await sleep(3000); // autosave lands
const TARGETS = [['fish', 'fish'], ['rock', 'item:stone'], ['plant', 'item:plant'], ['heater', 'gear:heater'], ['filter', 'gear:filter'], ['light', 'light'], ['stand', 'stand'], ['lid', 'lid']];
for (const [w, h, mobile, tag] of [[1400, 900, false, 'desktop'], [390, 844, true, 'phone']]) {
  for (const [name, key] of TARGETS) {
    await load(w, h, mobile); await sleep(3000);
    await ev(`window.__gb.store.edit(s => { s.light.type = '${name === 'light' ? 'led' : 'flat'}'; s.lid = '${name === 'lid' ? 'hood' : 'open'}'; }); true`); await sleep(2500);
    const found = JSON.parse(await ev(FIND)); const f = found[key];
    if (!f) { report[`${tag}-${name}`] = 'NO PIXEL'; continue; }
    await click(f.mid[0], f.mid[1]); await sleep(500);
    report[`${tag}-${name}`] = await ev(`JSON.stringify({ section: document.querySelector('.rail button.on, .rail [aria-current], .rail .on')?.getAttribute('aria-label') ?? document.querySelector('.panel h2, .panel .ph')?.textContent, sel: [window.__gb.store.selId, window.__gb.store.selItem], chip: document.querySelector('.cats .chip.on')?.textContent, openGroups: [...document.querySelectorAll('.group.open .gh')].map(e => e.firstChild.textContent), drawer: !!document.querySelector('.drawer'), bars: !!document.querySelector('.scapebar, .ebar, .editbar') })`);
    await shot(`${tag}-click-${name}`);
  }
}
// the old UI, unchanged: click a fish at ?ui=1 (UF1: no longer the default)
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '?ui=1' }); await sleep(3000);
for (let i = 0; i < 60; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
await sleep(2500);
const old = await ev(FIND.replace(`canvas.vcanvas`, `#c`)); const of = JSON.parse(old).fish;
if (of) { await click(of.mid[0], of.mid[1]); await sleep(1500); report['old-fish'] = await ev(`document.querySelector('details.sec[data-sec="fish"]')?.open`); await shot('old-ui-click-fish'); } else report['old-fish'] = 'NO PIXEL';
console.log(JSON.stringify(report, null, 1)); writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
ch.kill(); process.exit(0);
