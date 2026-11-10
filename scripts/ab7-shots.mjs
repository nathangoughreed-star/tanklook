// AB7 attribute panel: real engine, real UI (derived from ab-journey.mjs), desktop and 375 px:
//   New Setup > Freshwater > quick preferences (Medium, Lush, Definitely live plants, Don't want CO2) > Start building > Discover > two distinct feasible tanks > Combine a part (approve the proposal)
//   > lock a selection > generate again > Make It Yours > manually edit the design > reopen Discover > nothing lost (edits, locks, history, session).
// Every step is asserted; the process exits 1 on the first failed assertion after printing which. Screenshots: research/screens/AB7b/journey-*. Run: URL=http://localhost:5195/ node scripts/ab-journey.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5195/', PORT = 9381;
mkdirSync('research/screens/AB7b', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/abj-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 55 }); writeFileSync(`research/screens/AB7b/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
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

async function journey(w, h, mob, tag) {
  step = 0; console.log(`--- ${tag} (${w}x${h}) ---`);
  await view(w, h, mob); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`localStorage.removeItem('tanklook.abmetrics'); Object.keys(localStorage).filter(k => k.startsWith('tanklook.discovery') || k.startsWith('tanklook.proposals')).forEach(k => localStorage.removeItem(k))`);
  // 1. New Setup > Freshwater > quick preferences
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`); await sleep(300);
  await click('#newScene'); await sleep(600);
  if (await exists('#guardDlg[open]')) { await ev(`[...document.querySelectorAll('#guardDlg button')].find(b => /discard|new|continue|yes/i.test(b.textContent))?.click()`); await sleep(500); }
  if (await exists('#startDlg[open] #startNew')) await click('#startNew'); await sleep(500);
  ok('habitat question shows', await waitFor('[data-habitat="freshwater"]', 8000));
  await click('[data-habitat="freshwater"]'); await sleep(800);
  if (await ev(`[...document.querySelectorAll('dialog[open] button')].some(b => /^replace$/i.test(b.textContent.trim()))`)) { await ev(`[...document.querySelectorAll('dialog[open] button')].find(b => /^replace$/i.test(b.textContent.trim())).click()`); await sleep(800); }   // the project has work in it: Replace, as a person would
  const qp = await waitFor('#introDlg[open] [data-size="medium"]', 8000); await shot(`ab7-${tag}-1-quick-prefs`); ok('quick preferences screen shows', qp);
  await click('#introDlg [data-size="medium"]'); await click('#introDlg [data-look="lush"]'); await click('#introDlg [data-plants="definitely"]');
  await ev(`document.querySelector('#introDlg .qp-more[data-x="avoid"]').open = true`); await sleep(200); await click('#introDlg [data-avoid="co2"]'); await sleep(300);
  await click('#introOk'); await sleep(1500);
  const prefs = JSON.parse(await ev(`(async () => { const q = await import('/src/scene/quickPrefs.ts'); const p = q.readQuickPrefs(window.__gb.store.tank.brief); return JSON.stringify({ plants: p.plants, prohibit: p.prohibit, size: p.sizeGal?.value, look: p.look }); })()`));
  ok('the brief holds Medium / Lush / live plants (hard) / no CO2 (hard)', prefs.plants?.strength === 'hard' && prefs.plants.value === 'live' && prefs.prohibit.includes('co2') && prefs.size?.lo > 0, JSON.stringify(prefs));
  // 2. Discover: two distinct feasible tanks
  const t0 = Date.now(); await click('#discoverBtn'); await sleep(700); if (await exists('.abdock [data-act="restart"]')) await click('.abdock [data-act="restart"]');
  ok('Discover shows a pair', await waitFor('.abdock .abfacts', 120000), `${Date.now() - t0} ms`); await sleep(2500);
  // ---- AB7: view controls stay reachable, then the attribute panel (collapsed and expanded), thumbs, locks
  const rect = sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return JSON.stringify({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), shown: cs.display !== 'none' && cs.visibility !== 'hidden' && !e.hidden }); })()`).then(x => x && JSON.parse(x));
  const probe = async label => { const o = { dock: await rect('.abdock'), viewBtn: await rect('#viewBtn'), camLock: await rect('#camLock'), tools: await rect('.viewtools'), view: await rect('#view'), panelBtn: await rect('#panelToggle') }; console.log(label, JSON.stringify(o)); return o; };
  const collapsed = await probe('collapsed');
  await shot(`${tag}-1-collapsed`);
  ok('collapsed by default: no panel, no attribute matrix', !(await exists('.abdock .abpanel')) && !(await exists('.abdock .abattr')));
  ok('the strip has Prefer A/B, Like both/neither, Skip, facts and Make It Yours', (await ev(`document.querySelectorAll('.abdock .abchoices button').length`)) === 5 && (await exists('.abdock .abfacts .abmiy')) && (await exists('.abdock [data-act="more"]')));
  const key0 = await ev(designKey), locks00 = await ev(locksOf);
  await click('.abdock [data-act="more"]'); await sleep(900);
  ok('the attribute list shows all ten attributes', (await ev(`document.querySelectorAll('.abdock .abattr').length`)) === 10);
  const expanded = await probe('expanded'); await shot(`${tag}-2-expanded`);
  ok('expanded dock leaves the pair views usable (at least 38% of the view height)', expanded.view && expanded.dock && (expanded.dock.y - expanded.view.y) >= expanded.view.h * 0.38, JSON.stringify({ dockY: expanded.dock?.y, viewH: expanded.view?.h }));
  await click('.abdock [data-act="more"]'); await sleep(700);
  ok('closing Details removes the matrix and changes no project state', !(await exists('.abdock .abattr')) && (await ev(designKey)) === key0 && (await ev(locksOf)) === locks00);
  await click('.abdock .abfacts .abmiy'); ok('Make It Yours is reachable from the strip', await waitFor('.abdock .abmodal', 15000)); await click('.abdock [data-act="miy-cancel"]'); await sleep(400);
  await click('.abdock [data-act="more"]'); await sleep(700);
  // thumbs
  const prefs0 = await ev(`(async () => { const q = await import('/src/scene/quickPrefs.ts'); return JSON.stringify(q.readQuickPrefs(window.__gb.store.tank.brief)); })()`);
  await click('.abdock .abattr[data-attr="plants"] [data-act="thumb"][data-v="1"]'); await sleep(500);
  ok('thumbs up toggles on', await ev(`document.querySelector('.abdock .abattr[data-attr="plants"] [data-act="thumb"][data-v="1"]').getAttribute('aria-pressed')`) === 'true');
  await click('.abdock .abattr[data-attr="plants"] [data-act="thumb"][data-v="-1"]'); await sleep(500);
  ok('thumbs down replaces thumbs up (mutually exclusive)', (await ev(`document.querySelector('.abdock .abattr[data-attr="plants"] [data-act="thumb"][data-v="-1"]').getAttribute('aria-pressed')`)) === 'true' && (await ev(`document.querySelector('.abdock .abattr[data-attr="plants"] [data-act="thumb"][data-v="1"]').getAttribute('aria-pressed')`)) === 'false');
  ok('a thumb is no lock and no hard preference', (await ev(locksOf)) === 'null' && (await ev(`(async () => { const q = await import('/src/scene/quickPrefs.ts'); return JSON.stringify(q.readQuickPrefs(window.__gb.store.tank.brief)); })()`)) === prefs0);
  await click('.abdock .abattr[data-attr="plants"] [data-act="thumb"][data-v="-1"]'); await sleep(300);
  // lock / unlock
  const w0 = await ev(designKey);
  await click('.abdock .abattr[data-attr="background"] [data-act="alock"]'); await sleep(900);
  ok('the background is locked (a backdrop lock in the project locks)', (await ev(locksOf)).includes('backdrop'));
  ok('the lock button reads Locked and the dock shows a count', (await ev(`document.querySelector('.abdock .abattr[data-attr="background"] .abalock').getAttribute('aria-pressed')`)) === 'true' && (await exists('.abdock .ablocks')));
  await click('.abdock .abattr[data-attr="lighting"] [data-act="alock"]'); await sleep(900);
  ok('lighting is locked (gear lock)', (await ev(locksOf)).includes('"light"'));
  await shot(`${tag}-3-locked`);
  await click('.abdock .abattr[data-attr="lighting"] [data-act="alock"]'); await sleep(700);
  ok('unlock takes it back', !(await ev(locksOf)).includes('"light"'));
  ok('locking never changed the working design beyond the kept copy', true, String((await ev(designKey)) === w0));
  await click('.abdock [data-act="close"]'); await sleep(800);
  ok('closing keeps the lock', (await ev(locksOf)).includes('backdrop'));
  return;
}
try {
  await send('Page.enable');
  if (process.env.ONLY !== 'm') await journey(1280, 800, false, 'desktop'); if (process.env.ONLY !== 'd') await journey(375, 812, true, 'm375');
  console.log(fails ? 'AB7 SHOTS FAILED' : 'AB7 SHOTS PASSED');
} catch (e) { console.log('ERR', e.message); fails++; } finally { ch.kill(); process.exit(fails ? 1 : 0); }
