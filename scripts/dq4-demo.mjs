// DQ4: the spec section 10 PRODUCT ACCEPTANCE DEMO, end to end in the real UI (real onboarding, real A/B screen), desktop and 375 px.
//   1 new Freshwater project; Medium (size slider), the Lush archetype card (Interested), "No injected CO2" (Don't want, firm)  2 first pair: two viable, visibly distinct planted tanks, Medium a PREFERENCE, no CO2
//   3 "A overall, B's plants" (optional attribute row): no lock, working design unchanged  4 next challenger tests B-inspired planting in A (visible line)
//   5 lock one animal group, hardscape shuffle OFF, generate again: lock + held hardscape in every proposal  6 Explore Something Different: still no CO2, same lock, same hold
//   7 remove the CO2 prohibition: low-tech stays eligible, no forced all-high-tech  8 Close without adopting: design unchanged; Make It Yours commits as ONE undoable change
// Every step is asserted (exit 1 on the first failure). Specs of every pair seen -> research/screens/DQ4/spec-<tag>.json; screenshots research/screens/DQ4/demo-<tag>-*.jpg.
// Run with the dev server up: URL=http://localhost:5173/ node scripts/dq4-demo.mjs   (ONLY=d desktop only, ONLY=m 375 px only)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9397, DIR = 'research/screens/DQ4';
mkdirSync(DIR, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/dq4-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 140) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
let TAG = 'x';
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 40 }); writeFileSync(`${DIR}/demo-${TAG}-${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true})()`);
const exists = sel => ev(`!!document.querySelector(${JSON.stringify(sel)})`);
const waitFor = async (sel, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await exists(sel)) return true; await sleep(400); } return false; };
const view = (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
let fails = 0, step = 0;
const ok = (name, cond, extra = '') => { step++; console.log(`${cond ? 'PASS' : 'FAIL'} ${String(step).padStart(2, '0')} ${name}${extra ? ' :: ' + extra : ''}`); if (!cond) { fails++; throw new Error('assertion failed: ' + name); } };
const designKey = `(() => { const t = structuredClone(window.__gb.store.tank); for (const k of ['locks', 'camera', 'render', 'discoverOn', 'brief', 'constraints']) delete t[k]; return JSON.stringify(t); })()`;
const locksOf = `JSON.stringify(window.__gb.store.tank.locks ?? null)`;
const briefPrefs = `(async () => { const q = await import('/src/scene/quickPrefs.ts'); const p = q.readQuickPrefs(window.__gb.store.tank.brief); return JSON.stringify({ plants: p.plants, prohibit: p.prohibit, size: p.sizeGal, interested: p.arch.interested }); })()`;
/** the pair on screen, as specs: the history lines (facts) and the stored scene of the two current ids */
const pairSpec = `(() => { const ls = localStorage, sk = Object.keys(ls).find(k => k.startsWith('tanklook.discovery')), cur = JSON.parse(ls.getItem(sk)).current; if (!cur) return null;
  const hk = 'tanklook.history.tanklook.scene'; const idx = JSON.parse(ls.getItem(hk) ?? '[]');
  const one = i => { const l = idx.find(x => x.id === i); const snap = ls.getItem(hk + '.' + i) ?? ''; if (!l) return null; const f = l.facts; return { id: i, title: f.title, gal: f.gallons, newSpend: Math.round(f.newSpendUsd.mean), monthly: f.monthlyUsd ? Math.round(f.monthlyUsd.mean) : null, weeklyMin: Math.round(f.weeklyMin.mean), stocking: f.stocking.map(s => s.n + ' ' + s.name), plants: f.plants, hardscape: f.hardscape, substrate: f.substrate, toBuy: f.toBuy.map(b => b.name ?? b.label ?? JSON.stringify(b).slice(0, 60)), co2: /co2/i.test(JSON.stringify(f.toBuy)) || /"co2"\\s*:\\s*\\{"on":true/i.test(snap) || /co2 ?(system|regulator|cylinder)/i.test(snap), purpose: l.purpose, intent: l.intent ?? null, key: l.key }; };
  return { aId: cur.aId, bId: cur.bId, a: one(cur.aId), b: one(cur.bId) }; })()`;
const lines = [];

async function demo(w, h, mob, tag) {
  step = 0; TAG = tag; console.log(`--- ${tag} (${w}x${h}) ---`); lines.length = 0;
  const specs = [], grab = async label => { const p = await ev(pairSpec); if (p) specs.push({ label, ...p }); return p; };
  await view(w, h, mob); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb && !!document.getElementById('discoverBtn')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`Object.keys(localStorage).filter(k => k.startsWith('tanklook.discovery') || k.startsWith('tanklook.history') || k === 'tanklook.abmetrics').forEach(k => localStorage.removeItem(k))`);
  // 1. a new Freshwater project: Medium, Lush (Interested), no injected CO2 (firm)
  await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`); await sleep(300);
  await click('#newScene'); await sleep(600);
  if (await exists('#guardDlg[open]')) { await ev(`[...document.querySelectorAll('#guardDlg button')].find(b => /discard|new|continue|yes/i.test(b.textContent))?.click()`); await sleep(500); }
  if (await exists('#startDlg[open] #startNew')) await click('#startNew'); await sleep(500);
  ok('habitat question shows', await waitFor('[data-habitat="freshwater"]', 8000));
  await click('[data-habitat="freshwater"]'); await sleep(800);
  if (await ev(`[...document.querySelectorAll('dialog[open] button')].some(b => /^replace$/i.test(b.textContent.trim()))`)) { await ev(`[...document.querySelectorAll('dialog[open] button')].find(b => /^replace$/i.test(b.textContent.trim())).click()`); await sleep(800); }
  ok('quick preferences screen shows', await waitFor('#introDlg[open] [data-sizeat]', 8000)); await shot('1-quick-prefs');
  await ev(`(() => { const r = document.querySelector('#introDlg [data-sizeat]'); r.value = 500; r.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(300);
  ok('the size reads Medium', /Medium/.test(await ev(`document.querySelector('#introDlg .qp-read')?.textContent ?? ''`)), await ev(`document.querySelector('#introDlg .qp-read')?.textContent`));
  await click('#introDlg [data-arch="freshwater-jungle"]'); await sleep(200);
  await ev(`document.querySelector('#introDlg .qp-more[data-x="avoid"]').open = true`); await sleep(200); await click('#introDlg [data-avoid="co2"]'); await sleep(300);
  await click('#introOk'); await sleep(1500);
  const p0 = JSON.parse(await ev(briefPrefs));
  ok('the brief holds Medium (a PREFERENCE), Lush Interested, no CO2 (hard)', p0.size?.strength === 'prefer' && p0.size.value.lo > 0 && p0.interested.includes('freshwater-jungle') && p0.prohibit.includes('co2'), JSON.stringify(p0));
  // 2. the first pair
  const work0 = await ev(designKey), t0 = Date.now(); await click('#discoverBtn'); await sleep(700); if (await exists('.abdock [data-act="restart"]')) await click('.abdock [data-act="restart"]');
  ok('Discover shows a pair', await waitFor('.abdock .abfacts'), `${Date.now() - t0} ms`); await sleep(2500);
  const s1 = await grab('first pair'); await shot('2-first-pair');
  ok('two viable, different planted freshwater designs', !!s1.a && !!s1.b && s1.a.key !== s1.b.key && s1.a.plants.length > 0 && s1.b.plants.length > 0, `A ${s1.a.gal} gal ${s1.a.title} | B ${s1.b.gal} gal ${s1.b.title}`);
  ok('neither has injected CO2; the numbers are coherent', !s1.a.co2 && !s1.b.co2 && s1.a.newSpend > 0 && s1.b.newSpend > 0, `$${s1.a.newSpend} / $${s1.b.newSpend}`);
  const tg = await ev(`(() => { const t = window.__gb.store.tank.brief?.items?.['constraints.tankGal']; return JSON.stringify(t ? { status: t.status, v: t.value } : null); })()`);
  ok('Medium is a preference, not a hidden bound on the tank', !tg || /preference/.test(tg), tg + ` sizes ${s1.a.gal} / ${s1.b.gal} gal`);
  ok('the working design is frozen and unchanged', (await ev(`window.__gb.store.frozen === true`)) && (await ev(designKey)) === work0);
  // scenario 23: the default comparison dominates; attribute feedback is collapsed and the controls are operable at this width
  ok('the attribute panel is collapsed by default, the vote buttons are in the first view', !(await exists('.abdock .abpanel')) && (await ev(`(() => { const b = document.querySelector('.abdock [data-act="choose"][data-o="A"]').getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight && b.width >= 40 && b.height >= 28; })()`)));
  ok('no horizontal page scroll', (await ev(`document.documentElement.scrollWidth <= innerWidth + 1`)), `scrollWidth ${await ev('document.documentElement.scrollWidth')} / ${w}`);
  // 3. A overall, B's plants (optional attribute row)
  await click('.abdock [data-act="more"]'); await sleep(700);
  const hasRow = await exists('.abdock [data-act="rel"][data-attr="plants"][data-v="B"]');
  ok('the optional plants comparison is offered (the pair differs in plants)', hasRow);
  const locks0 = await ev(locksOf); await click('.abdock [data-act="rel"][data-attr="plants"][data-v="B"]'); await sleep(300);
  await click('.abdock [data-act="choose"][data-o="A"]'); await sleep(500); await click('.abdock [data-act="next"]'); await sleep(800); await waitFor('.abdock .abfacts'); await sleep(2500);
  ok('no lock was added and the design is unchanged', (await ev(locksOf)) === locks0 && (await ev(designKey)) === work0);
  // 4. the targeted challenger
  const s2 = await grab('targeted challenger'); await shot('3-targeted-challenger');
  const intent = await ev(`document.querySelector('.abdock .abintent')?.innerText ?? ''`);
  ok('the challenger says what it tests (or why it could not)', /B-inspired|Could not test|no longer available|nothing new/i.test(intent), intent);
  console.log('   A:', JSON.stringify(s2.a.plants), '$' + s2.a.newSpend, '| B:', JSON.stringify(s2.b.plants), '$' + s2.b.newSpend);
  // 5. lock one animal group; hardscape shuffle OFF; generate again
  if (!(await exists('.abdock .abalock'))) await click('.abdock [data-act="more"]'); await sleep(500);
  const lockSide = (await exists('.abdock .abalock[data-attr="stocking"]:not([disabled])')); ok('an animal-group lock is offered', lockSide);
  await click('.abdock .abalock[data-attr="stocking"]:not([disabled])'); await sleep(900);
  const lk = await ev(locksOf); ok('the animals are locked (a requirement, not a design edit)', lk !== 'null' && lk !== locks0, lk.slice(0, 400));
  await ev(`document.querySelector('[data-sw="hardscape"]')?.click()`); await sleep(600);
  ok('the Hardscape shuffle is off', (await ev(`document.querySelector('[data-sw="hardscape"]')?.getAttribute('aria-checked')`)) === 'false');
  const keepers = []; let held = null; const LOCKED = ['Angelfish', 'Honey gourami', 'Kuhli loach'];
  for (let i = 0; i < 1; i++) {
    if (!(await exists('.abdock [data-act="choose"][data-o="A"]'))) await click('.abdock [data-act="more"]'); await sleep(300);
    await click('.abdock [data-act="choose"][data-o="A"]'); await sleep(500); await click('.abdock [data-act="next"]'); await sleep(800); await waitFor('.abdock .abfacts'); await sleep(2500);
    const s = await grab(`generate again ${i + 1}`); keepers.push(s); held ??= JSON.stringify(s.a.hardscape);
    ok(`pair ${i + 1}: every proposal keeps the animal lock and the held hardscape`, JSON.stringify(s.a.hardscape) === held && JSON.stringify(s.b.hardscape) === held && (await ev(locksOf)) === lk && [s.a, s.b].every(r => LOCKED.every(n => r.stocking.some(x => x.includes(n)))), `hardscape ${held.slice(0, 70)} | animals A ${s.a.stocking.join(', ')} | B ${s.b.stocking.join(', ')}`);
  }
  await shot('4-locked-held');
  // 6. Explore Something Different
  if (!(await exists('.abdock [data-act="different"]'))) await click('.abdock [data-act="more"]'); await sleep(300);
  await click('.abdock [data-act="different"]'); await sleep(800); ok('Explore Something Different draws a pair', await waitFor('.abdock .abfacts')); await sleep(2500);
  const s6 = await grab('explore something different'); await shot('5-explore-different');
  ok('it never breaks the CO2 prohibition, the lock or the hardscape hold', !s6.a.co2 && !s6.b.co2 && (await ev(locksOf)) === lk && JSON.stringify(s6.a.hardscape) === held && JSON.stringify(s6.b.hardscape) === held, `A ${s6.a.title} B ${s6.b.title}`);
  // 7. remove the CO2 prohibition in Constraints
  await ev(`document.querySelector('#prefsHost [data-avoid="co2"]')?.click()`); await sleep(800);
  const p7 = JSON.parse(await ev(briefPrefs)); ok('the CO2 prohibition is gone from the brief (the rest stays)', !p7.prohibit.includes('co2') && p7.interested.includes('freshwater-jungle') && p7.size?.value.lo > 0, JSON.stringify(p7.prohibit));
  const seen = [];
  for (let i = 0; i < 3; i++) {
    if (!(await exists('.abdock [data-act="different"]'))) await click('.abdock [data-act="more"]'); await sleep(300);
    await click('.abdock [data-act="different"]'); await sleep(800); await waitFor('.abdock .abfacts'); await sleep(2500);
    const s = await grab(`after CO2 removed ${i + 1}`); seen.push(s.a, s.b);
    ok(`pair ${i + 1} after removal keeps the lock and the hold`, (await ev(locksOf)) === lk && JSON.stringify(s.a.hardscape) === held && JSON.stringify(s.b.hardscape) === held);
  }
  await shot('6-co2-allowed');
  const withCo2 = seen.filter(x => x.co2).length;
  ok('low-tech designs remain eligible; high-tech is not forced', withCo2 < seen.length, `${withCo2} of ${seen.length} designs with CO2`);
  // 8. Close without adopting; then Make It Yours as ONE undo step
  await click('.abdock [data-act="close"]'); await sleep(1000);
  ok('closing without adopting leaves the saved working design exactly as it was', (await ev(designKey)) === work0 && (await ev(`window.__gb.store.frozen === false`)));
  await click('#discoverBtn'); await sleep(1500); if (await exists('.abdock [data-act="continue"]')) { await click('.abdock [data-act="continue"]'); await sleep(800); }
  await waitFor('.abdock .abfacts'); await sleep(2000);
  if (!(await exists('.abdock [data-act="miy"]'))) await click('.abdock [data-act="more"]'); await sleep(400);
  const depth = await ev(`window.__gb.store.mark`); await click('.abdock [data-act="miy"]'); ok('Make It Yours shows what will change', await waitFor('.abdock .abmodal', 30000)); await shot('7-make-it-yours');
  await click('.abdock [data-act="miy-accept"]'); await sleep(2500);
  const adopted = await ev(designKey); ok('the working design is now the adopted candidate', adopted !== work0);
  ok('it is ONE undoable change', (await ev(`window.__gb.store.mark`)) === depth + 1, `mark ${depth} -> ${await ev('window.__gb.store.mark')}`);
  await ev(`window.__gb.store.undo()`); await sleep(500);
  ok('Undo steps back to the design before Make It Yours', (await ev(designKey)) === work0);
  writeFileSync(`${DIR}/spec-${tag}.json`, JSON.stringify(specs, null, 1));
}
try {
  await send('Page.enable');
  if (process.env.ONLY !== 'm') await demo(1280, 800, false, 'desktop'); if (process.env.ONLY !== 'd') await demo(375, 812, true, 'm375');
  console.log(fails ? 'DEMO FAILED' : 'DEMO PASSED');
} catch (e) { console.log('ERR', e.message); console.log('DOCK:', (await ev(`document.querySelector('.abdock')?.innerText ?? ''`).catch(() => '')).split(String.fromCharCode(10)).join(' | ').slice(0, 1500)); await shot('failure').catch(() => {}); fails++; } finally { ch.kill(); process.exit(fails ? 1 : 0); }
