// Lane SC (2026-11-14): proof shots for the shell cleanup. Needs the DEV server (window.__gb): npx vite --port 6377 --strictPort, then
//   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/sc-shots.mjs  -> research/screens/SC/*.jpg + facts.json
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6377/', PORT = 9477, OUT = 'research/screens/SC';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/sc-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const size = (width, height, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
const shot = async (name, wait = 1500) => { await sleep(wait); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 74 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)})); if (!e) throw new Error('no ' + ${JSON.stringify(css + ' ' + text)}); e.click(); return true })()`);
const setNum = (label, v) => ev(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); if (!e) throw new Error('no input ' + ${JSON.stringify(label)}); e.value = ${JSON.stringify(String(v))}; e.dispatchEvent(new Event('change', { bubbles: true })); return true })()`);
const scrollTo = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)})); e?.scrollIntoView({ block: 'start' }); return !!e })()`);
const seed = readFileSync('src/examples/planted.json', 'utf8');
const errors = []; let phase = 'start';
await send('Runtime.enable'); ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(phase + ': ' + d.params.exceptionDetails.exception?.description?.slice(0, 200)); });

const waitFor = async (expr, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(700); } return false; };
import { existsSync } from 'node:fs';
const prev = existsSync(`${OUT}/facts.json`) ? JSON.parse(readFileSync(`${OUT}/facts.json`, 'utf8')) : { facts: {}, fails: [] };
const facts = prev.facts, fails = [], ONLY = process.env.ONLY?.split(',');
const save = () => writeFileSync(`${OUT}/facts.json`, JSON.stringify({ facts, fails, errors }, null, 1));
const step = async (name, fn) => { if (ONLY && !ONLY.includes(name)) return; phase = name; try { await fn(); } catch (e) { fails.push(name + ': ' + String(e.message).slice(0, 200)); console.log('FAIL', name, e.message.slice(0, 150)); } save(); };
const open2 = async (scene, q = '?ui=2') => {
  await send('Page.navigate', { url: BASE }); await sleep(2500);
  await ev(`localStorage.clear(); ${scene ? `localStorage.setItem('tanklook.scene', ${JSON.stringify(scene)});` : ''} true`);
  await send('Page.navigate', { url: BASE + q });
  await waitFor(q ? `document.body.dataset.ui2 === 'ready' && !!window.__gb` : `!!window.__gb`); await sleep(7000);
};
const snap = () => ev(`JSON.stringify(window.__gb.store.scene)`);
const rail = async t => { const cur = await ev(`document.querySelector('.panel h2')?.textContent ?? ''`); if (cur !== t) await click('.rail .ritem', t); };
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const typeIn = (label, v) => ev(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
await size(1600, 900);

await step('link', async () => {
  await open2(seed); await rail('Equipment'); await click('.cats .chip', 'Heater'); await sleep(400);
  await click('.linkbtn', 'Edit the room'); await sleep(1200);
  facts.link = await ev(`(() => { const g = document.getElementById('lim-home'); return { found: !!g, className: g?.className, inView: g ? g.getBoundingClientRect().top < innerHeight : false, heading: document.querySelector('.panel h2')?.textContent }; })()`);
  await shot('01-heater-room-link-opens-constraints-home', 600);
});
await step('tank kind', async () => { await rail('Tank'); await sleep(600); facts.kind = await ev(`[...document.querySelectorAll('[aria-label="Kind"] button')].map(b => b.textContent + (b.classList.contains('on') ? '*' : ''))`); await shot('02-tank-kind-control', 600); });
await step('maker labels', async () => {
  await click('.panel .btn', 'Change'); await sleep(800); await click('.picker .btn', 'New custom tank'); await sleep(4000);
  facts.edgeLabels = await ev(`[...document.querySelectorAll('.edgelab')].map(e => e.textContent + '@' + Math.round(parseFloat(e.style.left)) + ',' + Math.round(parseFloat(e.style.top)))`);
  await shot('03-maker-dimension-labels-on-edges', 800);
  await click('.maker .btn', 'Cancel').catch(() => {}); await sleep(600);
});
await step('owned pill', async () => {
  await open2(seed);
  await ev(`(async () => { const g = await import('/src/scene/gearOwn.ts'), t = await import('/src/shell/logic/tank.ts'), S = window.__gb.store; const rows = t.commercialRows(S.tank, {}).rows; const id = rows[2].opt.m.id; S.edit(s => g.editGear(s, m => g.ownItem(m, 'tank', id))); return id; })()`);
  await rail('Tank'); await click('.panel .btn', 'Change'); await sleep(800); await click('.picker .gh', 'Commercial'); await sleep(900);
  facts.ownedPills = await ev(`[...document.querySelectorAll('.picker .card.pick')].filter(r => r.textContent.includes('Owned')).map(r => r.querySelector('.t').textContent).join(', ')`);
  await ev(`[...document.querySelectorAll('.picker .card.pick')].find(r => r.textContent.includes('Owned'))?.scrollIntoView({ block: 'center' })`);
  await shot('04-owned-pill-on-commercial-row', 800);
});
await step('animals', async () => {
  await open2(seed); await rail('Animals'); await sleep(600);
  facts.aq = await ev(`document.querySelector('.aqrow')?.innerText ?? null`);
  await ev(`document.querySelector('input[aria-label="New animal size"]').scrollIntoView({ block: 'center' })`);
  await typeIn('New animal size', '60'); await sleep(500);
  facts.sizeText = await ev(`document.querySelector('input[aria-label="New animal size"]').closest('.row').innerText`);
  await shot('05-animals-new-animal-size', 700);
  await ev(`document.querySelector('.aqrow')?.scrollIntoView({ block: 'center' })`); await shot('05b-animals-aqadvisor-row', 500);
});
await step('life stages', async () => {
  await ev(`(async () => { const t = await import('/src/shell/logic/tank.ts'); t.setKind(window.__gb.store, 'terrarium'); })()`); await sleep(1500);
  await click('.tglrow', 'Fits this tank'); await sleep(300);
  await typeIn('Search animals', 'crested'); await sleep(900);
  await ev(`document.querySelector('.prow')?.click()`); await sleep(500);
  facts.stages = await ev(`[...document.querySelectorAll('[aria-label="Life stage"] button')].map(b => b.textContent + (b.classList.contains('on') ? '*' : ''))`);
  await ev(`document.querySelector('input[aria-label="New animal size"]').scrollIntoView({ block: 'center' })`);
  await shot('06-life-stage-buttons', 700);
  if (facts.stages.length > 1) { await click('[aria-label="Life stage"] button', facts.stages[0].replace('*', '')); await sleep(400); facts.stageSet = await ev(`document.querySelector('input[aria-label="New animal size"]').closest('.row').innerText`); }
});
await step('copies', async () => {
  await open2(seed); await rail('Animals'); await sleep(500);
  const n0 = await ev(`window.__gb.store.tank.fish.length`);
  await ev(`window.__gb.store.select(window.__gb.store.tank.fish[0].id)`); await sleep(900);
  await click('.drawer .btn', 'Copies'); await sleep(400);
  await shot('07-copies-box', 500);
  await click('.copybox .btn', 'Make copies'); await sleep(1500);
  facts.copies = { before: n0, after: await ev(`window.__gb.store.tank.fish.length`), msg: await ev(`document.querySelector('.drawer [role=status]')?.textContent`) };
  await shot('07b-copies-made', 800);
});
await step('drag in', async () => {
  await open2(seed); await rail('Animals'); await sleep(500);
  await typeIn('Search animals', 'neon'); await sleep(900);
  const n0 = await ev(`window.__gb.store.tank.fish.length`);
  const p = await ev(`(() => { const r = document.querySelector('.prow .pi').getBoundingClientRect(); return [r.left + 20, r.top + r.height / 2]; })()`);
  await mouse('mouseMoved', p[0], p[1]); await mouse('mousePressed', p[0], p[1]);
  for (let i = 1; i <= 12; i++) await mouse('mouseMoved', p[0] + (1000 - p[0]) * i / 12, p[1] + (520 - p[1]) * i / 12);
  await shot('08a-dragging-a-species', 300);
  await mouse('mouseReleased', 1000, 520); await sleep(1500);
  facts.drag = { before: n0, after: await ev(`window.__gb.store.tank.fish.length`) };
  await shot('08-dropped-in-the-tank', 800);
});
await step('apply undo', async () => {
  await open2(seed); await rail('Discover'); await sleep(400);
  const run = async (mode, apply) => {
    if (!(await ev(`!!document.querySelector('.card.mode')`))) await click('.dback .btn', 'All modes');
    await click('.card.mode', mode); await click('.discover .btn.primary', '');
    await waitFor(`!!document.querySelector('.card.preview')`, 240000); await sleep(1500);
    const before = await snap(); await click('.dacts .btn', apply); await sleep(900); const after = await snap();
    await shot('09-discover-applied', 300);
    await click('.apphead .btn[aria-label="Undo"]', ''); await sleep(900); const undone = await snap();
    await click('.apphead .btn[aria-label="Redo"]', ''); await sleep(600); const redone = await snap();
    await click('.apphead .btn[aria-label="Undo"]', ''); await sleep(600);
    facts['applyUndo ' + mode] = { applyChanged: before !== after, undoRestoredSceneJsonExactly: before === undone, redoReapplied: redone === after, oneUndoStep: (await snap()) === before };
    await shot('09b-discover-after-undo', 300);
  };
  await run('Remix', 'Apply');
});
await step('experience', async () => {
  await open2(seed);
  await ev(`(async () => { const e = await import('/src/demand/experience.ts'); e.setAllLevels(0); e.setExperienceOn(true); })()`); await sleep(600);
  await rail('Discover'); await sleep(400);
  const seen = [];
  for (const mode of ['Explore', 'Remix']) {
    if (!(await ev(`!!document.querySelector('.card.mode')`))) await click('.dback .btn', 'All modes');
    await click('.card.mode', mode); await click('.discover .btn.primary', '');
    await waitFor(`!!document.querySelector('.card.preview') || !!document.querySelector('.dfail')`, 240000); await sleep(1500);
    seen.push(await ev(`document.querySelector('.card.preview')?.innerText ?? document.querySelector('.dfail')?.innerText ?? ''`));
    await shot('10-discover-new-to-it-' + mode.toLowerCase(), 300);
  }
  facts.experienceRows = seen;
  facts.experienceLeaksCarpetOrPressurized = seen.some(t => /carpet|pressuri[sz]ed/i.test(t));
  facts.gate = await ev(`(async () => { const g = await import('/src/scene/experienceGate.ts'); return { gatedInCurrentDesign: g.gatedIn(window.__gb.store.tank).map(x => x.id), kinds: g.gearKindsOf(window.__gb.store.tank) }; })()`);
  await ev(`(async () => { const e = await import('/src/demand/experience.ts'); e.setExperienceOn(false); })()`);
});
await step('pref cards', async () => {
  await open2(seed); await rail('Preferences'); await sleep(800);
  await ev(`document.querySelector('.stylecards [data-key="freshwater-decorative"]')?.scrollIntoView({ block: 'center' })`); await sleep(900);
  facts.decorativeImgOk = await ev(`['freshwater-decorative', 'freshwater-themed'].map(k => { const i = document.querySelector('.stylecards [data-key="' + k + '"] img'); return k + ':' + (i ? i.naturalWidth : 'no img'); })`);
  await shot('11-preferences-decorative-card-pictures', 500);
});
await step('equipment submenus', async () => {
  await open2(seed);
  await ev(`(async () => { const t = await import('/src/shell/logic/tank.ts'); t.setKind(window.__gb.store, 'terrarium'); })()`); await sleep(1500);
  await rail('Equipment'); await sleep(600);
  facts.terrariumCats = await ev(`[...document.querySelectorAll('.cats .chip')].map(c => c.textContent)`);
  const cat = facts.terrariumCats.find(c => /Heat lamp|Thermostat/.test(c)); if (cat) await click('.cats .chip', cat.replace(/·.*/, '').trim());
  await sleep(500); facts.genericRows = await ev(`[...document.querySelectorAll('.erow .t')].map(e => e.textContent)`);
  await shot('12-equipment-submenu-without-catalogue', 600);
});
await step('add own', async () => {
  await open2(seed); await rail('Equipment'); await click('.cats .chip', 'Heater'); await sleep(400);
  await click('.addrow', 'Add one I own'); await sleep(300);
  await typeIn('Name', 'Hydor 150'); await typeIn('Wattage (W)', '150');
  await shot('13-add-one-i-own-asks-name-and-wattage', 400);
  await click('.addown .btn', 'Add to I own'); await sleep(600);
  await ev(`[...document.querySelectorAll('.erow')].find(r => r.textContent.includes('Hydor'))?.querySelector('.btn.sm')?.click()`); await sleep(1200);
  facts.ownHeater = await ev(`(async () => { const t = await import('/src/scene/tech.ts'); return { rows: [...document.querySelectorAll('.erow')].filter(r => r.textContent.includes('Hydor')).map(r => r.innerText.replace(/\n/g, ' | ')), watts: t.heaterUnits(t.techOf(window.__gb.store.tank)).map(u => u.w) }; })()`);
  await shot('13b-own-heater-in-use', 500);
  await sleep(3000);   // the autosave
});
await step('old ui same heater', async () => {
  await send('Page.navigate', { url: BASE }); await waitFor(`!!window.__gb`); await sleep(7000);
  facts.oldUiHeater = await ev(`(async () => { const t = await import('/src/scene/tech.ts'); return t.heaterUnits(t.techOf(window.__gb.store.tank)).map(u => u.w); })()`);
  await shot('14-old-ui-same-heater', 800);
});
await step('old site unchanged', async () => { await open2(seed, ''); await shot('16-old-site-unchanged', 800); facts.oldSiteHasShell = await ev(`!!document.querySelector('.rail')`); });
await step('phone', async () => {
  await size(390, 844, true); await open2(seed);
  await click('button', 'More'); await sleep(500);
  await click('button', 'Equipment'); await sleep(900);
  await click('.cats .chip', 'Heater'); await sleep(500); await shot('15a-phone-equipment-heater', 600);
  await click('.cats .chip', 'Light'); await sleep(500); await shot('15b-phone-equipment-light', 600);
  await size(1600, 900);
});
save(); console.log(JSON.stringify({ fails, errors }));
ws.close(); ch.kill(); process.exit(0);
