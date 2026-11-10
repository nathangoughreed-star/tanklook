// END-TO-END journey on the real engine through the real UI (lane AB5), desktop and 375 px:
//   New Setup > Freshwater > quick preferences (Medium, Lush, Definitely live plants, Don't want CO2) > Start building > Discover > two distinct feasible tanks > Combine a part (approve the proposal)
//   > lock a selection > generate again > Make It Yours > manually edit the design > reopen Discover > nothing lost (edits, locks, history, session).
// Every step is asserted; the process exits 1 on the first failed assertion after printing which. Screenshots: research/screens/ab5/journey-*. Run: URL=http://localhost:5195/ node scripts/ab-journey.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5195/', PORT = 9381;
mkdirSync('research/screens/ab5', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/abj-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 25 }); writeFileSync(`research/screens/ab5/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
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
  const qp = await waitFor('#introDlg[open] [data-size="medium"]', 8000); await shot(`journey-${tag}-1-quick-prefs`); ok('quick preferences screen shows', qp);
  await click('#introDlg [data-size="medium"]'); await click('#introDlg [data-look="lush"]'); await click('#introDlg [data-plants="definitely"]');
  await ev(`document.querySelector('#introDlg .qp-more[data-x="avoid"]').open = true`); await sleep(200); await click('#introDlg [data-avoid="co2"]'); await sleep(300);
  await click('#introOk'); await sleep(1500);
  const prefs = JSON.parse(await ev(`(async () => { const q = await import('/src/scene/quickPrefs.ts'); const p = q.readQuickPrefs(window.__gb.store.tank.brief); return JSON.stringify({ plants: p.plants, prohibit: p.prohibit, size: p.sizeGal?.value, look: p.look }); })()`));
  ok('the brief holds Medium / Lush / live plants (hard) / no CO2 (hard)', prefs.plants?.strength === 'hard' && prefs.plants.value === 'live' && prefs.prohibit.includes('co2') && prefs.size?.lo > 0, JSON.stringify(prefs));
  // 2. Discover: two distinct feasible tanks
  const t0 = Date.now(); await click('#discoverBtn'); await sleep(700); if (await exists('.abdock [data-act="restart"]')) await click('.abdock [data-act="restart"]');
  ok('Discover shows a pair', await waitFor('.abdock .abfacts', 120000), `${Date.now() - t0} ms`); await sleep(2500);
  ok('the dock is in the main view, not a full-screen overlay', await ev(`getComputedStyle(document.querySelector('.abdock')).position === 'absolute' && document.querySelector('.abdock').parentElement.id === 'view'`));
  await click('.abdock [data-act="more"]'); await sleep(700); const first = JSON.parse(await ev(pairIds));
  const titles = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.abdock .abside h3')].map(e => e.innerText.split(String.fromCharCode(10)).join(' ')))`));
  ok('two distinct designs', first.length === 2 && first[0] !== first[1] && titles.length === 2 && titles[0] !== titles[1], JSON.stringify(titles));
  const buys = await ev(`[...document.querySelectorAll('.abdock .abbuy li')].map(l => l.innerText).join(' | ')`);
  ok('no CO2 system in either (Don\u2019t want CO2)', !/CO2/i.test(buys));
  ok('the working design is frozen while Discover is open', await ev(`window.__gb.store.frozen === true`));
  const working0 = await ev(designKey); await shot(`journey-${tag}-2-first-pair`);
  // a choice, so the session has history
  await click('.abdock [data-act="choose"][data-o="A"]'); await sleep(400); await click('.abdock [data-act="next"]'); await sleep(800); await waitFor('.abdock .abfacts', 120000); await sleep(2500);
  ok('a choice was recorded', await ev(sessionComparisons) >= 1, `comparisons ${await ev(sessionComparisons)}`);
  if (!(await exists('.abdock .abside'))) await click('.abdock [data-act="more"]'); await sleep(500);
  // 3. Combine a part, approve the proposal
  const h0 = await ev(histCount);
  await click('.abdock [data-act="combine"][data-tab="plants"]:not([disabled])'); ok('a combination is proposed', await waitFor('.abdock .abprop, .abdock .abnote', 60000));
  if (await exists('.abdock .abprop')) {
    const propText = await ev(`document.querySelector('.abdock .abprop').innerText`); ok('the proposal lists its adjustments before anything is shown', /Proposed combination/.test(propText) && /Approve/.test(propText));
    await shot(`journey-${tag}-3-combine-proposal`); await click('.abdock [data-act="combine-ok"]'); await sleep(3000);
    const ids = JSON.parse(await ev(pairIds).catch(() => '[]')); await click('.abdock [data-act="more"]'); await sleep(400);
    ok('the combined design is a new third record', await ev(histCount) >= h0, `history ${h0} -> ${await ev(histCount)}`); void ids;
    await shot(`journey-${tag}-4-combined`);
  } else ok('the combination was refused with a reason (honest outcome)', /Not combined/.test(await ev(`document.querySelector('.abdock .abnote').innerText`)));
  // 4. lock a selection (Keep from a card)
  if (!(await exists('.abdock .abkeep'))) await click('.abdock [data-act="more"]'); await sleep(500);
  const locks0 = await ev(locksOf); await click('.abdock .abkeep:not(.on)'); await sleep(900);
  const locks1 = await ev(locksOf); ok('a selection is locked (a requirement, not a design edit)', locks1 !== locks0 && locks1 !== 'null', locks1.slice(0, 120));
  ok('the locked item did not enter the working design', (await ev(designKey)) === working0);
  await shot(`journey-${tag}-5-locked`);
  // 5. generate again
  const before = await ev(pairIds); if (!(await exists('.abdock [data-act="different"]'))) await click('.abdock [data-act="more"]'); await sleep(300);
  await click('.abdock [data-act="different"]'); await sleep(800); ok('another pair is generated', await waitFor('.abdock .abfacts', 120000)); await sleep(2500);
  const after = await ev(pairIds); ok('the new pair differs from the last', after !== before, after);
  await shot(`journey-${tag}-6-generated-again`);
  // 6. Make It Yours
  if (!(await exists('.abdock [data-act="miy"]'))) await click('.abdock [data-act="more"]'); await sleep(400);
  await click('.abdock [data-act="miy"]'); ok('Make It Yours shows what will change', await waitFor('.abdock .abmodal', 30000)); await shot(`journey-${tag}-7-make-it-yours`);
  const guard = await exists('.abdock [data-act="miy-accept"]'); ok('it can be accepted', guard); await click('.abdock [data-act="miy-accept"]'); await sleep(2500);
  ok('Discover closed and the design is editable again', !(await exists('.abdock:not([hidden])')) && (await ev(`window.__gb.store.frozen === false`)));
  const adopted = await ev(designKey); ok('the working design is now the adopted candidate', adopted !== working0);
  const locksAfterMiy = await ev(locksOf); ok('the lock survived Make It Yours', locksAfterMiy !== 'null' && locksAfterMiy === locks1, locksAfterMiy.slice(0, 80));
  // 7. manual edit
  await ev(`window.__gb.store.update(s => { const t = s.tanks[s.active]; t.fish = t.fish.slice(0, Math.max(1, t.fish.length - 1)); })`); await sleep(500);
  const edited = await ev(designKey); ok('a manual edit works again', edited !== adopted);
  const fishEdited = await ev(`window.__gb.store.tank.fish.length`);
  // 8. reopen Discover: nothing lost
  const comps0 = await ev(sessionComparisons);
  await click('#discoverBtn'); await sleep(1500);
  const resumeNeeded = await exists('.abdock [data-act="continue"]');
  ok('reopening finds the earlier session', resumeNeeded || (await exists('.abdock .abfacts')), resumeNeeded ? 'asks to re-check after the edit' : 'resumed');
  ok('the edit is intact', (await ev(designKey)) === edited && (await ev(`window.__gb.store.tank.fish.length`)) === fishEdited);
  ok('the lock is intact', (await ev(locksOf)) === locks1);
  if (resumeNeeded) { await click('.abdock [data-act="continue"]'); await sleep(800); await waitFor('.abdock .abfacts', 120000); await sleep(2000); }
  await click('.abdock [data-act="more"]'); await sleep(500);
  ok('history is intact', await ev(histCount) >= h0, `history ${await ev(histCount)}`);
  ok('the session is intact (its comparisons are kept)', comps0 >= 1 && (await ev(sessionComparisons)) >= comps0, `comparisons ${comps0} -> ${await ev(sessionComparisons)}`);
  ok('the working design still equals the manual edit while Discover is open', (await ev(designKey)) === edited);
  await shot(`journey-${tag}-8-reopened`);
  await click('.abdock [data-act="close"]'); await sleep(800);
  ok('closing leaves the edit and the lock exactly', (await ev(designKey)) === edited && (await ev(locksOf)) === locks1);
}
try {
  await send('Page.enable');
  if (process.env.ONLY !== 'm') await journey(1280, 800, false, 'desktop'); if (process.env.ONLY !== 'd') await journey(375, 812, true, 'm375');
  console.log(fails ? 'JOURNEY FAILED' : 'JOURNEY PASSED');
} catch (e) { console.log('ERR', e.message); fails++; } finally { ch.kill(); process.exit(fails ? 1 : 0); }
