// AB11: A and B at one physical scale (20 gal long beside a 75 gal), desktop and 375 px (one pane: A then B). Asserts the shared window half-size (same fov = same px per inch),
// the dimensions in the chips, Fit Both. Run: URL=http://localhost:5195/ node scripts/ab11-shots.mjs   Shots: research/screens/AB11/
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5195/', PORT = 9391;
mkdirSync('research/screens/AB11', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/ab11-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 40 }); writeFileSync(`research/screens/AB11/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) fails++; };
const pair = (only) => ev(`(async () => { const { store, viewer } = window.__gb; const mk = (L, D, H) => { const s = structuredClone(store.scene.tanks[0]); s.tank = { ...s.tank, L: L * 25.4, D: D * 25.4, H: H * 25.4 }; return s; };
  viewer.showPair([mk(30, 12, 12), mk(48, 18, 21)], { ${only == null ? '' : 'only: ' + only + ','} info: ['★ Favourite', 'Challenger'] }); await new Promise(r => setTimeout(r, 2500)); return true })()`);
async function run(w, h, mobile, tag) {
  console.log(`--- ${tag} ---`);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  const geom = `JSON.stringify(window.__gb.viewer.shown.map(s => s && +s.hx.toFixed(4)))`;
  if (!mobile) {
    await pair(); await sleep(800);
    const g = JSON.parse(await ev(geom)), px = JSON.parse(await ev(`JSON.stringify(window.__gb.viewer.active.map(v => v.w))`));
    ok('both views share one window half-size (same fov and pane width = same px per inch)', g[0] === g[1] && px[0] === px[1], JSON.stringify(g));
    const txt = await ev(`document.getElementById('labA').textContent + '|' + document.getElementById('labB').textContent`);
    ok('chips show L x W x H and gallons', /30 × 12 × 12 in/.test(txt) && /48 × 18 × 21 in/.test(txt) && /gal/.test(txt), txt.slice(0, 80));
    ok('Fit Both visible', await ev(`!document.getElementById('fitBoth').hidden`));
    await shot('desktop-20gal-vs-75gal');
    await ev(`(async () => { const { store, viewer } = window.__gb; store.frozen = true; document.getElementById('camLock').click(); await new Promise(r => setTimeout(r, 400)); store.cam(c => { c.zoom = 1.6 }, 1); await new Promise(r => setTimeout(r, 400)); })()`);
    ok('zoom on B moves A too', await ev(`window.__gb.store.camOf(0).zoom === 1.6 && window.__gb.store.camOf(1).zoom === 1.6`));
    await ev(`window.__gb.viewer.fitBoth()`); await sleep(600);
    ok('Fit Both restores zoom 1 for both', await ev(`window.__gb.store.camOf(0).zoom === 1 && window.__gb.store.camOf(1).zoom === 1`));
  } else {
    const hxs = [];
    for (const o of [0, 1]) { await pair(o); await sleep(800); hxs.push(JSON.parse(await ev(geom)).find(x => x != null)); await shot(`375-${'AB'[o]}`); }
    ok('phone: A then B use the same window half-size (switching sides keeps the scale)', hxs[0] === hxs[1], JSON.stringify(hxs));
  }
}
try { await run(1280, 800, false, 'desktop'); await run(375, 812, true, '375 px'); } catch (e) { console.log('ERROR', e.message); fails++; }
ch.kill(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
