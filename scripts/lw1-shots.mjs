// NF1 shots: Notes with "Fix these" hovered / after the click at 1280x800, and the phone at 390.  node scripts/lw1-shots.mjs  (dev server on URL, default http://localhost:5175/)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:5175/', PORT = 9561, OUT = 'research/screens/LW1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/lw1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 250)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
const waitFor = async (expr, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(500); } return false; };
const facts = {};
const FISH = (sp, i) => `{ id: ${i}, species: '${sp}', x: 150, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 }`;
const setup = async (kind) => ev(`(() => { const st = window.__gb.store; st.editTank(st.scene.active, t => { t.water.on = true; ${kind === 'lid' ? `t.lid = 'open'; t.fish = [${FISH('trumpet', 1)}, ${FISH('neon', 2)}];` : `t.lid = 'glass'; t.fish = [${FISH('neon', 1)}, ${FISH('neon', 2)}]; t.tech = { rows: { heater: 'one' }, roomC: 10, targetC: 25, heaterW: 25 };`} }); return 1; })()`);
const click = (t, first) => ev(`(() => { const l = [...document.querySelectorAll('button')].filter(b => b.textContent.trim().startsWith(${JSON.stringify(t)})); const b = ${first ? 'l[0]' : 'l[l.length - 1]'}; if (!b) return false; b.click(); return true })()`);
async function run(tag, w, h, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: BASE }); await sleep(2500);
  await ev(`localStorage.clear()`);
  await send('Page.navigate', { url: BASE }); await sleep(5000);
  await waitFor(`!!window.__gb`);
  await click('Just look around', true); await sleep(600);
  await setup('lid'); await sleep(800);
  // Tank screen, Lid and top group
  await click('Tank'); await sleep(800);
  await ev(`(() => { if (!document.querySelector('[data-open-top]')) document.querySelector('[data-group=lid] .gh')?.click(); return 1 })()`); await sleep(800);
  facts[tag + '-opentop'] = await ev(`document.querySelector('[data-open-top]')?.innerText.slice(0, 400) ?? null`);
  await ev(`document.querySelector('[data-open-top]')?.scrollIntoView({ block: 'center' })`); await sleep(400);
  await shot(`${tag}-1-tank-lid-warning`);
  console.log(JSON.stringify(facts)); await click('Done'); await sleep(500);
  // Notes with the fix
  await click('Notes', true); await waitFor(`!!document.querySelector('.drawer .fixbtn')`); await sleep(600);
  facts[tag + '-notes'] = await ev(`[document.querySelector('.drawer').innerText.slice(0, 500), [...document.querySelectorAll('.fixgo')].map(b => b.innerText), document.querySelector('.fixtip')?.innerText]`);
  await shot(`${tag}-2-notes-lid`);
  await ev(`document.querySelector('.fixbtn[data-fix=lid] .fixgo').click()`); await sleep(1200);
  facts[tag + '-afterfix'] = await ev(`[window.__gb.store.tank.lid, document.querySelector('.drawer')?.innerText.slice(0, 200)]`);
  await shot(`${tag}-3-lid-fixed`);
  await ev(`window.__gb.store.undo()`); await sleep(500);
  facts[tag + '-undone'] = await ev(`window.__gb.store.tank.lid`);
  // heater cannot hold
  await setup('heat'); await sleep(800);
  await ev(`document.querySelector('.drawer .fixes')?.scrollIntoView({ block: 'end' })`);
  facts[tag + '-heat-notes'] = await ev(`[document.querySelector('.drawer')?.innerText.slice(0, 700), [...document.querySelectorAll('.fixgo')].map(b => b.innerText)]`);
  await shot(`${tag}-4-notes-heater`);
  facts[tag+'-closebtns'] = await ev(`[...document.querySelectorAll('.drawer button')].map(b => b.getAttribute('aria-label') || b.textContent.trim().slice(0, 12)).join('|')`); await ev(`[...document.querySelectorAll('.drawer button')].find(b => /close|×|✕/i.test(b.getAttribute('aria-label') || b.textContent))?.click()`); await sleep(500);
  await click('Done'); await sleep(400); await click('More'); await sleep(800); facts[tag+'-more'] = await ev(`[...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t && t.length < 25).join('|')`); await click('Equipment'); await sleep(1000); for (let k = 0; k < 3; k++) { await ev(`[...document.querySelectorAll('.gh[aria-expanded=false]')].filter(e => /^(Heat|Temperature)/.test(e.textContent.trim())).forEach(e => e.click())`); await sleep(500); } await click('Heater'); await sleep(800); facts[tag+'-ghs'] = await ev(`[...document.querySelectorAll('.gh')].map(e => e.textContent.trim().slice(0, 30)).join('|')`);
  facts[tag + '-equip'] = await ev(`document.querySelector('[data-temp-warn]')?.innerText ?? null`);
  await ev(`document.querySelector('[data-temp-warn]')?.scrollIntoView({ block: 'center' })`); await sleep(300);
  await shot(`${tag}-5-equipment-heater`);
}
await run('d1280', 1280, 800, false);
await run('p390', 390, 844, true);
writeFileSync(`${OUT}/facts.json`, JSON.stringify(facts, null, 1));
ch.kill(); ws.close(); process.exit(0);
