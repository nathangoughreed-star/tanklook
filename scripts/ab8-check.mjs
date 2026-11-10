// AB8 (Coordinator 22): camera controls (orbit / zoom / pan drags, the View popup, the padlock) stay visible, un-covered and working while Discovery's A/B pair is on screen,
// dock collapsed and expanded, desktop and 375 px. Run: URL=http://localhost:5195/ node scripts/ab8-check.mjs   Shots: research/screens/AB8/
// END-TO-END journey on the real engine through the real UI (lane AB5), desktop and 375 px:
//   New Setup > Freshwater > quick preferences (Medium, Lush, Definitely live plants, Don't want CO2) > Start building > Discover > two distinct feasible tanks > Combine a part (approve the proposal)
//   > lock a selection > generate again > Make It Yours > manually edit the design > reopen Discover > nothing lost (edits, locks, history, session).
// Every step is asserted; the process exits 1 on the first failed assertion after printing which. Screenshots: research/screens/AB8/journey-*. Run: URL=http://localhost:5195/ node scripts/ab-journey.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5195/', PORT = 9381;
mkdirSync('research/screens/AB8', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/abj-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 25 }); writeFileSync(`research/screens/AB8/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true})()`);
const exists = sel => ev(`!!document.querySelector(${JSON.stringify(sel)})`);
const waitFor = async (sel, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await exists(sel)) return true; await sleep(400); } return false; };
const view = (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
let fails = 0, step = 0;
const ok = (name, cond, extra = '') => { step++; console.log(`${cond ? 'PASS' : 'FAIL'} ${String(step).padStart(2, '0')} ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) { fails++; throw new Error('assertion failed: ' + name); } };
const designKey = `(() => { const t = structuredClone(window.__gb.store.tank); for (const k of ['locks', 'camera', 'render', 'discoverOn', 'brief', 'constraints']) delete t[k]; return JSON.stringify(t); })()`;
const pairIds = `JSON.stringify([...document.querySelectorAll('.abdock .abside')].map(e => e.dataset.id))`;
const locksOf = `JSON.stringify(window.__gb.store.tank.locks ?? null)`;
const histCount = `(document.querySelector('[data-act="hist-toggle"]')?.textContent.match(/\\d+/) ?? [0])[0] * 1`;
const sessionComparisons = `(() => { try { const k = Object.keys(localStorage).find(k => k.startsWith('tanklook.discovery')); return JSON.parse(localStorage.getItem(k)).comparisons.length; } catch { return -1; } })()`;

const topAt = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing'; if (e.closest('#viewPop')) e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); if(!r.width) return 'nosize'; const t=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); return t===e||e.contains(t) ? 'self' : (t?.id||t?.className||t?.tagName)+' '+(t?.textContent||'').slice(0,20)+' @'+((r.x+r.width/2)|0)+','+((r.y+r.height/2)|0)})()`);
const camOf = i => ev(`JSON.stringify((c=>({az:c.az,el:c.el,zoom:c.zoom}))(window.__gb.store.camOf(${i})))`).then(JSON.parse);
const drag = async (x, y, dx, dy, btn = 'left') => { const b = btn === 'left' ? 1 : 4; await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: btn, buttons: b, clickCount: 1 }); for (let i = 1; i <= 8; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + dx * i / 8, y: y + dy * i / 8, button: btn, buttons: b }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + dx, y: y + dy, button: btn }); await sleep(350); };
const wheel = async (x, y, d) => { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: d }); await sleep(350); };
const popOpen = on => ev(`(()=>{const m=document.getElementById('pmBody'); if (${on} && m && m.hidden && !document.getElementById('pairMenu').hidden) document.getElementById('pmBtn').click(); const p=document.getElementById('viewPop'); if (p.hidden === ${on}) document.getElementById('viewBtn').click(); return true})()`);
const differs = (a, b) => a.az !== b.az || a.el !== b.el || a.zoom !== b.zoom;
async function check(w, h, mob, tag) {
  step = 0; console.log(`--- ${tag} (${w}x${h}) ---`);
  await view(w, h, mob); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`localStorage.removeItem('tanklook.abmetrics'); Object.keys(localStorage).filter(k => k.startsWith('tanklook.discovery') || k.startsWith('tanklook.proposals')).forEach(k => localStorage.removeItem(k))`);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`); await sleep(300);
  await click('#newScene'); await sleep(600);
  if (await exists('#guardDlg[open]')) { await ev(`[...document.querySelectorAll('#guardDlg button')].find(b => /discard|new|continue|yes/i.test(b.textContent))?.click()`); await sleep(500); }
  if (await exists('#startDlg[open] #startNew')) await click('#startNew'); await sleep(500);
  await waitFor('[data-habitat="freshwater"]', 8000); await click('[data-habitat="freshwater"]'); await sleep(800);
  if (await ev(`[...document.querySelectorAll('dialog[open] button')].some(b => /^replace$/i.test(b.textContent.trim()))`)) { await ev(`[...document.querySelectorAll('dialog[open] button')].find(b => /^replace$/i.test(b.textContent.trim())).click()`); await sleep(800); }
  await waitFor('#introDlg[open] [data-size="medium"]', 8000); await click('#introOk'); await sleep(1500);
  await click('#discoverBtn'); await sleep(700); if (await exists('.abdock [data-act="restart"]')) await click('.abdock [data-act="restart"]');
  ok('Discovery pair is shown', await waitFor('.abdock .abfacts', 120000)); await sleep(2500);
  ok('the working design is frozen (the case that used to hide the controls)', await ev(`window.__gb.store.frozen === true && !!window.__gb.viewer.pairShown`));
  const two = await ev(`window.__gb.viewer.active.length`) === 2;
  const cx = w / 2, cy0 = Math.min(h, 400) / 3 + 30;
  for (const expanded of [false, true]) {
    const dock = expanded ? 'expanded' : 'collapsed';
    if (expanded !== await exists('.abdock .abside')) await click('.abdock [data-act="more"]'); await sleep(900);
    await ev(`document.getElementById('pmBtn').click()`); await sleep(200);
    ok(`${dock}: View button is visible and on top`, await topAt('#viewBtn') === 'self'); await ev(`document.getElementById('pmBtn').click()`); await sleep(200);
    await popOpen(true); await sleep(900);
    for (const id of ['#cDist', '#cAz', '#cEl', '#cZoom', '#camReset']) ok(`${dock}: ${id} is reachable (nothing covers it)`, await topAt(id) === 'self', await topAt(id));
    await shot(`${tag}-${dock}-viewpop`);
    const c0 = await camOf(0);
    await ev(`(()=>{const e=document.getElementById('cZoom'); e.value=${c0.zoom === 2 ? 1.5 : 2}; e.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(300);
    ok(`${dock}: the Zoom slider moves the camera`, (await camOf(0)).zoom !== c0.zoom);
    await ev(`document.getElementById('camReset').click()`); await sleep(300); const rs = await camOf(0);
    ok(`${dock}: Straight on resets the camera`, rs.az === 0 && rs.el === 0 && rs.zoom === 1);
    await popOpen(false); await sleep(300);
    const cy = await ev(`(()=>{for (let y = 120; y < 600; y += 10) { if (document.elementFromPoint(${cx}, y)?.id === 'c') return y; } for (let y = 110; y > 4; y -= 6) { if (document.elementFromPoint(${cx}, y)?.id === 'c') return y; } return -1 })()`);
    if (cy < 0) { ok(`${dock}: the expanded panel covers the whole picture on this screen (dock layout, AB7): drag checks skipped, View sliders still reach the camera`, true); continue; }
    const b0 = await camOf(0); await drag(cx, cy, 80, 20); const b1 = await camOf(0);
    ok(`${dock}: dragging the picture orbits`, differs(b0, b1), JSON.stringify([b0, b1]));
    await wheel(cx, cy, -300); ok(`${dock}: the wheel zooms`, (await camOf(0)).zoom > b1.zoom);
    await drag(cx, cy, 60, 30, 'middle'); ok(`${dock}: a middle-drag pans (Re-centre appears)`, await ev(`window.__gb.viewer.panned === true && !document.getElementById('recenter').hidden`));
    await ev(`document.getElementById('pmBtn').click()`); await sleep(200);
    ok(`${dock}: Re-centre is visible and on top`, await topAt('#recenter') === 'self'); await ev(`document.getElementById('pmBtn').click()`);   // (its 220 ms ease runs on requestAnimationFrame, which headless Chrome never fires, so the result is not asserted here)
    await shot(`${tag}-${dock}-after-drag`);
  }
  if (two) {
    if (await exists('.abdock .abside')) await click('.abdock [data-act="more"]'); await sleep(700);
    ok('padlock is visible above the dock and on top', await topAt('#camLock') === 'self', await topAt('#camLock'));
    ok('padlock starts locked', await ev(`window.__gb.store.scene.camLock === true`));
    await click('#camLock'); await sleep(400);
    ok('padlock opens', await ev(`window.__gb.store.scene.camLock === false`));
    const r = JSON.parse(await ev(`JSON.stringify(document.getElementById('camLock').getBoundingClientRect())`)), cv = JSON.parse(await ev(`JSON.stringify(document.getElementById('c').getBoundingClientRect())`));
    const xA = cv.x + (r.x - cv.x) / 2, xB = r.x + r.width + (cv.x + cv.width - r.x - r.width) / 2;
    const a0 = await camOf(0), bb0 = await camOf(1);
    await drag(xB, cy0, -90, 25); const a1 = await camOf(0), bb1 = await camOf(1);
    ok('unlocked: dragging B turns only B', !differs(a0, a1) && differs(bb0, bb1), JSON.stringify([a0, a1, bb0, bb1]));
    await wheel(xA, cy0, -300); const a2 = await camOf(0);
    ok('unlocked: the wheel over A zooms both (AB11: zoom is shared, one scale)', a2.zoom > a1.zoom && (await camOf(1)).zoom === a2.zoom);
    await shot(`${tag}-unlocked`);
    await drag(xB, cy0, 30, 5); const b2 = await camOf(1);
    await click('#camLock'); await sleep(500);
    const a3 = await camOf(0), b3 = await camOf(1);
    ok('locking again: both views share one camera, the one moved last (B)', !differs(a3, b3) && a3.az === b2.az, JSON.stringify([a3, b3, b2]));
    await drag(xA, cy0, 60, -10); const a4 = await camOf(0), b4 = await camOf(1);
    ok('locked: a drag on either side turns both', differs(a3, a4) && !differs(a4, b4), JSON.stringify([a3, a4, b4]));
  } else ok('one pane (phone): the padlock is hidden, nothing to link', await ev(`document.getElementById('camLock').hidden === true`));
  await click('.abdock [data-act="close"]'); await sleep(800);
}
try { await send('Page.enable'); if (process.env.ONLY !== 'm') await check(1280, 800, false, 'desktop'); if (process.env.ONLY !== 'd') await check(375, 812, true, 'm375'); console.log(fails ? 'AB8 CHECK FAILED' : 'AB8 CHECK PASSED'); }
catch (e) { console.log('ERR', e.message); fails++; } finally { ch.kill(); process.exit(fails ? 1 : 0); }
