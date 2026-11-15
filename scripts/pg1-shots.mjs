// PG1 browser check (dev server on 6190): the old UI's PAR guide, light-map hover and contour labels, and the new UI's Lighting group. Pictures land in shots/pg1/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6190/', PORT = 9351;
const W = +(process.env.W ?? 1400), H = +(process.env.H ?? 900), TAG = process.env.TAG ?? '';
mkdirSync('shots/pg1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--user-data-dir=' + (process.env.TEMP + '/pg1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`shots/pg1/${name}${TAG}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
const mouse = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
const load = () => ev(`(async () => {
  const R = await import('/src/scene/recipes.ts'), A = await import('/src/scene/archetypes.ts'), T = await import('/src/data/tanks.ts'), B = await import('/src/scene/brief.ts');
  const a = A.archetype('mixed-reef'), m = T.TANK_MODELS.find(x => x.name === '60 gal breeder' && !x.terrarium);
  const S = R.recipeScene(a, 'balanced', m); S.brief = B.setVision(B.emptyBrief(), { secondaryLikes: [], archetypeId: a.id });
  const { store } = window.__gb;
  store.edit(t => { Object.assign(t, structuredClone(S)); t.fish = []; t.render.beams = true; });
  const t = store.tank; return JSON.stringify({ salt: t.water.salt, light: t.light.type, bright: t.light.bright, lid: t.lid, beams: t.render.beams });
})()`);
const mode = process.env.MODE ?? 'old';
try {
  await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 500 });
  await send('Page.navigate', { url: BASE + (mode === 'new' ? '?ui=2' : '') });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  console.log(await load()); await sleep(5000);
  if (mode === 'old') {
    await ev(`window.__gb.store.cam(c => { c.az = 12; c.el = 14; c.zoom = 2.2; })`);
    await ev(`{ for (let e = document.getElementById('lMapBanner'); e; e = e.parentElement) if (e.tagName === 'DETAILS') e.open = true; }`); await sleep(1500);
    await shot('old-map');
    const pos = JSON.parse(await ev(`(() => { const r = document.getElementById('c').getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height * 0.62]); })()`));
    if (W < 500) {
      await ev(`document.querySelector('.panel button[aria-label="Close"]')?.click()`); await sleep(800);
      const t = [W * 0.5, H * 0.3];
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: t[0], y: t[1] }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(900);
    } else { await mouse(pos[0], pos[1]); await mouse(pos[0] + 5, pos[1] + 2); await sleep(900); } await shot('old-hover');
    console.log(await ev(`document.getElementById('lightTip')?.textContent + ' hidden=' + document.getElementById('lightTip')?.hidden + ' contours=' + document.querySelectorAll('.lightContour').length`));
    await ev(`(() => { const b = document.getElementById('lMapBanner'); b.scrollIntoView({ block: 'start' }); b.click(); })()`); await sleep(800); await shot('old-par');
  } else {
    const click = t => ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(t)})); if (!b) return 'no ' + ${JSON.stringify(t)}; b.click(); return 'ok'; })()`);
    if (W < 500) { console.log(await click('More')); await sleep(500); }
    console.log(await click('Equipment')); await sleep(700);
    console.log(await click('Lighting')); await sleep(600);
    console.log(await ev(`[...document.querySelectorAll('.gh, .cat button, [class*=cat] button')].map(b => b.textContent.trim().slice(0, 30)).join(' | ')`));
    console.log(await ev(`(() => { const g = [...document.querySelectorAll('.group')].find(g => g.querySelector('.gh')?.textContent.startsWith('Lighting')); g.querySelector('.kh').click(); return 'kh'; })()`)); await sleep(700);
    console.log(await click('Light map')); await sleep(600);
    await ev(`[...document.querySelectorAll('.parcue')].forEach(b => b.click())`); await sleep(400);
    await ev(`(() => { document.querySelectorAll('button[aria-label*="lose"]').forEach(b => b.closest('.gs, .checklist, [class*=started]') && b.click()); const g = document.querySelector('.lightmap'); g && g.scrollIntoView({ block: 'start' }); })()`); await sleep(500);
    await shot('new-lighting');
    const pos = JSON.parse(await ev(`(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return JSON.stringify([r.left + r.width * 0.55, r.top + r.height * 0.7]); })()`));
    await ev(`window.__gb.store.cam(c => { c.az = 12; c.el = 14; c.zoom = 2.2; })`); await sleep(1200);
    if (W < 500) {
      await ev(`document.querySelector('.panel button[aria-label="Close"]')?.click()`); await sleep(800);
      const t = [W * 0.5, H * 0.3];
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: t[0], y: t[1] }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(900);
    } else { await mouse(pos[0], pos[1]); await mouse(pos[0] + 5, pos[1] + 2); await sleep(900); }
    console.log(await ev(`document.getElementById('lightTip')?.textContent + ' hidden=' + document.getElementById('lightTip')?.hidden + ' contours=' + document.querySelectorAll('.lightContour').length`));
    await shot('new-hover');
  }
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
