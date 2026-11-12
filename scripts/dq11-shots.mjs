// DQ11: drives the real editor: Keep this / Like / Dislike on a category header, a selected piece, a plant row and Discover's preview card. Asserts the locks / feedback / live "N kept, M open".
// Run: URL=http://localhost:5173/ node scripts/dq11-shots.mjs   Shots: research/screens/DQ11/
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9393;
mkdirSync('research/screens/DQ11', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/dq11-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) fails++; };
const clip = async (name, sel) => {
  const r = await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center', behavior: 'instant' }); const b = e.getBoundingClientRect(); return { x: Math.max(0, b.x - 10), y: Math.max(0, b.y - 10), width: b.width + 20, height: b.height + 20 }; })()`);
  if (!r) { ok('found ' + sel, false); return; } await sleep(600);
  const s = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false, ...(r.y + r.height < 880 && r.y > 0 ? { clip: { ...r, scale: 1.6 } } : {}) }); writeFileSync(`research/screens/DQ11/${name}.png`, Buffer.from(s.result.data, 'base64'));
};
const click = sel => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
const S = 'window.__gb.store';
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  await ev(`(async () => { const { store } = window.__gb; const { regenerate } = await import('/src/scene/starter.ts');
    store.update(s => { const t = s.tanks[0]; t.tank = { ...t.tank, L: 914.4, D: 457.2, H: 406.4 }; t.water.on = true; t.water.level = 0.9; t.lid = 'glass'; t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = [1, 2, 3, 4].map(n => ({ id: n, species: n < 3 ? 'neon' : 'angel', x: 200 + n * 80, y: 150, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0 })); }); return true })()`);
  await sleep(1500);
  await ev(`for (const s of ['hardscape', 'plants', 'fish']) document.querySelector('details.sec[data-sec="' + s + '"]').open = true`); await sleep(800);

  // category header
  ok('category headers have the three buttons', (await ev(`['hardscape','plants','fish'].map(s => document.querySelectorAll('details.sec[data-sec="' + s + '"] .dxkeepbox .dq11-b').length).join()`)) === '3,3,3');
  await clip('1-category-header-hardscape', 'details.sec[data-sec="hardscape"] .dxkeepbox');
  await click('details.sec[data-sec="hardscape"] .dxkeepbox [data-d=like]'); await sleep(300);
  ok('category Like writes a category entry', (await ev(`JSON.stringify(${S}.tank.brief?.project?.feedback?.map(f => [f.level, f.cat, f.v]))`)) === '[["category","hardscape",1]]');
  ok('confirmation line shown', /Noted: more hardscape pieces like these/.test(await ev(`document.querySelector('.dq11-toast').textContent`)));
  await click('details.sec[data-sec="hardscape"] .dxkeepbox [data-d=like]'); await sleep(300);
  ok('same press takes it back', (await ev(`${S}.tank.brief?.project?.feedback?.length ?? 0`)) === 0);

  // item: selection panel
  await ev(`(() => { const s = ${S}; s.selectItem(s.tank.items.find(i => i.kind !== 'plant').id); })()`); await sleep(700);
  ok('selection panel has the bar', (await ev(`document.querySelectorAll('#itemBox .dq11-sel .dq11-b').length`)) === 3);
  await click('#itemBox .dq11-sel [data-d=keep]'); await sleep(400);
  ok('Keep writes the default props (look/size/pose/other, no position)', (await ev(`(() => { const s = ${S}, id = s.selectedItem.uid; return JSON.stringify(s.tank.locks.objects.find(o => o.target === id)?.props) })()`)) === '["look","size","pose","other"]');
  ok('padlock badge: pressed, hover says what is held', await ev(`(() => { const b = document.querySelector('#itemBox .dq11-sel [data-d=keep]'); return b.getAttribute('aria-pressed') === 'true' && /Kept: 1 piece/.test(b.title) })()`));
  await click('#itemBox .dq11-sel [data-d=pin]'); await sleep(300);
  ok('Pin position adds position', (await ev(`(() => { const s = ${S}, id = s.selectedItem.uid; return s.tank.locks.objects.find(o => o.target === id).props.includes('position') })()`)));
  await click('#itemBox .dq11-sel [data-d=dislike]'); await sleep(300);
  ok('item Dislike + Keep sit together', (await ev(`JSON.stringify([${S}.tank.brief.project.feedback.map(f => [f.level, f.v]), ${S}.tank.locks.objects.length])`)) === '[[["item",-1]],1]');
  ok('"fewer pieces like this" line', /Noted: fewer pieces like this/.test(await ev(`document.querySelector('.dq11-toast').textContent`)));
  await clip('2-item-selection-panel', '#itemBox .dq11-sel');

  // plant row
  await ev(`${S}.selectItem(null); document.querySelector('details.sec[data-sec="plants"]').open = true`); await sleep(600);
  ok('plant rows have the bar', (await ev(`document.querySelectorAll('#plantList .dq11-row .dq11-b').length`)) >= 3);
  await click('#plantList .dq11-row [data-d=like]'); await sleep(300);
  await click('#plantList .dq11-row [data-d=ask]').catch(() => {}); await sleep(200);
  await click('#plantList .dq11-row [data-attr=material]').catch(() => {}); await sleep(300);
  ok('"what do you like?" sets attr only when asked', (await ev(`${S}.tank.brief.project.feedback.find(f => f.level === 'item' && f.cat === 'plants')?.attr`)) === 'material');
  await clip('3-plant-list-row', '#plantList .pr, #plantList .pg');

  // animal row
  await ev(`document.querySelector('details.sec[data-sec="fish"]').open = true`); await sleep(600);
  ok('animal rows have the bar', (await ev(`document.querySelectorAll('#list .sr .dq11-b').length`)) >= 3);
  await click('#list .sr .dq11-row [data-d=keep]'); await sleep(300);
  ok('animal Keep = exact roster lock', (await ev(`${S}.tank.locks.roster.length`)) >= 1);
  await clip('4-animal-row', '#list');

  // preview card: live "N kept, M open"
  await ev(`document.querySelector('.dq10-pill').click()`); await sleep(500);
  const c0 = await ev(`document.querySelector('.dq10-count').textContent`);
  await click('[data-a=finish]');
  for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('.dq10-prev, .dq10-nofit')`)) break; await sleep(1000); }
  await sleep(1500);
  ok('card shows the bar', (await ev(`document.querySelectorAll('.dq10 .dq11-b').length`)) === 3);
  await clip('5-preview-card', '.dq10-card');
  await click('.dq10 [data-d=like]'); await sleep(400);
  ok('design Like writes a design entry and the preview stays fresh (not stale)', (await ev(`${S}.tank.brief.project.feedback.some(f => f.level === 'design' && f.v === 1)`)) && !(await ev(`!!document.querySelector('.dq10-warn')`)));
  await clip('5b-preview-card-liked', '.dq10-card');
  const kept = n => Number(n.match(/(\d+) kept/)[1]);
  await click('details.sec[data-sec="plants"] .dxkeepbox [data-d=keep]'); await sleep(900);
  const c1 = await ev(`document.querySelector('.dq10-count').textContent`);
  ok('kept count updates live on the open card', kept(c1) > kept(c0), `${c0} -> ${c1}`);
} catch (e) { console.log('ERROR', e.message); fails++; }
ch.kill(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
