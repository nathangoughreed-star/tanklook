// SV1: split view, one set of overlays per side. Run: URL=http://localhost:5391/ node scripts/sv1-shots.mjs   Shots: research/screens/SV1/
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5391/', PORT = 9393;
mkdirSync('research/screens/SV1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/sv1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/SV1/${name}.png`, Buffer.from(r.result.data, 'base64')); };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) fails++; };
const rect = sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? [r.left, r.top, r.right, r.bottom] : null })()`);
const hit = (a, b) => a && b && a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1;
const overlays = ['.ft.sv', '.dmfloat.sv', '.checks.sv', '.climate.sv'];
const checkOverlap = async (tag) => {
  const rs = {}; for (const s of ['A', 'B']) for (const o of overlays) rs[s + o] = await rect(`.sideov[data-side="${s}"] ${o}`);
  const others = { map: await rect('.vmap:not(.off)'), mapBtn: await rect('#mapShow'), dq: await rect('.dq10'), tools: await rect('.viewtools'), labA: await rect('#labA'), labB: await rect('#labB') };
  const keys = Object.keys(rs).filter(k => rs[k]); const bad = [];
  for (const k of keys) for (const [n, r] of Object.entries(others)) if (hit(rs[k], r)) bad.push(`${k}x${n}`);
  for (const k of keys) for (const k2 of keys) if (k < k2 && hit(rs[k], rs[k2])) bad.push(`${k}x${k2}`);
  ok(`${tag}: no overlay overlaps another, the map, Discover, buttons or tank tabs`, !bad.length, bad.join(' ') + ' shown=' + keys.join(','));
};
const setup = async () => {
  await ev(`(async () => { const { SPECIES } = await import('/src/data/species.ts'); const sp = id => SPECIES.find(x => x.id.includes(id) && x.habitat !== 'land')?.id; const fishOf = (ids, t) => ids.map((id, i) => ({ id: i + 1, species: sp(id), x: (i % 5) * 40, y: 100 + (i % 3) * 30, depth: (i % 4) * 30, yaw: 0, pitch: 0, roll: 0, bend: 0 })); const { store } = window.__gb; const { regenerate } = await import('/src/scene/starter.ts');
    store.update(s => { const t = s.tanks[0]; t.tank = { ...t.tank, L: 914.4, D: 457.2, H: 406.4 }; t.water.on = true; t.water.level = 0.9; t.lid = 'glass'; regenerate(t, 'all', 3); t.fish = fishOf(['neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'cory'], t); });
    store.splitTank();
    store.update(s => { const t = s.tanks[1]; t.tank = { ...t.tank, L: 600, D: 300, H: 360 }; regenerate(t, 'all', 11); t.fish = fishOf(['neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'cory', 'cory', 'cory', 'cory', 'cory', 'cory'], t); });
    return true })()`);
  await sleep(2500);
};
const side = (s, sel) => `document.querySelector('.sideov[data-side="${s}"] ${sel}')`;
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 850, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  await ev(`(async () => { const { store } = window.__gb; const { regenerate } = await import('/src/scene/starter.ts'); const { SPECIES } = await import('/src/data/species.ts'); const sp = SPECIES.find(x => x.id.includes('neon') && x.habitat !== 'land').id; store.update(s => { const t = s.tanks[0]; t.water.on = true; regenerate(t, 'all', 3); t.fish = [1, 2, 3, 4].map(i => ({ id: i, species: sp, x: i * 40, y: 100, depth: 30, yaw: 0, pitch: 0, roll: 0, bend: 0 })); }); return true })()`); await sleep(2000);
  ok('single tank: no side overlays, the one Habitat check shows', !(await rect('.sideov')) && !!(await rect('.ft:not(.sv)')));
  await shot('0-single-tank');
  await setup();
  const info = await ev(`JSON.stringify({ n: window.__gb.store.scene.tanks.length, sides: [...document.querySelectorAll('.sideov')].map(e => e.dataset.side + ':' + !e.hidden), globalFt: getComputedStyle(document.querySelector('.ft:not(.sv)')).display, globalDm: getComputedStyle(document.querySelector('.dmfloat:not(.sv)')).display })`);
  ok('split: two side containers shown, the global ones hidden', info.includes('A:true') && info.includes('B:true') && info.includes('"none"'), info);
  const txt = s => ev(`${side(s, '.ftPill')}?.textContent + '|' + ${side(s, '.dmsum')}?.textContent + '|' + ${side(s, '.climate')}?.textContent`);
  const ta = await txt('A'), tb = await txt('B');
  ok('each side reads its own tank (habitat pill, cost, water differ)', ta !== tb && !/undefined/.test(ta + tb), ta + ' || ' + tb);
  await checkOverlap('1500 panel open, minimized');
  await shot('1-split-1500-panel-open-minimized');
  await ev(`${side('A', '.ftHead')}.click(); ${side('B', '.dmtog')}.click(); ${side('A', '.climate')}.click(); ${side('B', '.checks summary')}?.click()`); await sleep(800);
  // (every card open at once on a 396 px side is a stress shot: cards expanded together may cover each other; nothing is asserted)
  await shot('2-split-1500-A-habitat-B-cost-open');
  ok('open state is per side (B habitat still minimized, A open)', await ev(`${side('B', '.ft')}.classList.contains('min') && !${side('A', '.ft')}.classList.contains('min')`));
  await ev(`${side('A', '.ftHead')}.click(); ${side('B', '.dmtog')}.click(); ${side('A', '.climate')}.click(); ${side('B', '.ftHead')}.click()`); await sleep(500);
  await ev(`${side('B', '.ftSet')}.click()`); await sleep(800);
  ok('Set my space on side B writes tank B only', await ev(`!!window.__gb.store.scene.tanks[1].layout.space && !window.__gb.store.scene.tanks[0].layout.space`));
  await shot('3-split-1500-B-set-space');
  await ev(`${side('B', '.ftClear')}.click(); ${side('B', '.ftHead')}.click()`); await sleep(400);
  await ev(`document.getElementById('sideClose').click()`); await sleep(1500);
  await checkOverlap('1500 panel collapsed');
  await shot('4-split-1500-panel-collapsed');
  await ev(`document.getElementById('sideOpen').click()`); await sleep(800);
  for (const w of [1280, 1920]) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: 850, deviceScaleFactor: 1, mobile: false }); await sleep(1500); await checkOverlap(`${w} panel open`); await shot(`5-split-${w}-panel-open`); }
  await send('Emulation.setDeviceMetricsOverride', { width: 820, height: 800, deviceScaleFactor: 1, mobile: false }); await sleep(1500);
  await checkOverlap('820 narrow'); await shot('6-split-820-narrow');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }); await sleep(2000);
  await ev(`document.getElementById('sideClose')?.click()`); await sleep(1200);
  await checkOverlap('390 phone'); await shot('7-split-390-phone');
  await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 850, deviceScaleFactor: 1, mobile: false }); await sleep(800);
  await ev(`window.__gb.store.update(s => { s.tanks.splice(1, 1); s.active = 0; })`); await sleep(1500);
  ok('back to one tank: side overlays hidden, the single Habitat check is back', !(await rect('.sideov')) && !!(await rect('.ft:not(.sv)')));
} catch (e) { console.log('ERROR', e.message); fails++; }
ch.kill(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
