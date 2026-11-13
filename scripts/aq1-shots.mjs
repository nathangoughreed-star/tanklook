// AQ1: before / after shots of every place that used to show a terrarium / paludarium / herp option (src/scope.ts).
// Run: URL=http://localhost:5173/ node scripts/aq1-shots.mjs   -> research/screens/AQ1/{before,after}-*.jpg + scan.json
// "before" = ?scope=all (today's app), "after" = the default (aquarium scope). Also lists every remaining hit of the herp words on screen.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9441;
mkdirSync('research/screens/AQ1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/aq1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 100) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 200)); return r.result.result.value; };
const SCAN = `(()=>{const re=/(terrarium|paludarium|vivarium|reptile|gecko|herp|amphibian|lizard|snake|tarantula|UVB|basking|mister|\bfrogs?\b)/i;const out=[];for(const e of document.querySelectorAll('body *')){if(e.closest('dialog:not([open])'))continue;const hid=!e.offsetParent&&getComputedStyle(e).position!=='fixed';if(hid)continue;for(const a of ['title','placeholder','aria-label']){const v=e.getAttribute(a);if(v&&re.test(v))out.push(a+'@'+(e.id||e.tagName)+': '+v.slice(0,100))}if(e.children.length===0&&re.test(e.textContent||''))out.push((e.id||e.tagName)+': '+e.textContent.slice(0,100))}return out})()`;
const results = {};
async function run(tag, url) {
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  const closeAll = () => ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); true`);
  const shot = async name => { await sleep(900); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 55 }); writeFileSync(`research/screens/AQ1/${tag}-${name}.jpg`, Buffer.from(r.result.data, 'base64')); results[`${tag}-${name}`] = await ev(SCAN); };
  await closeAll();
  const section = async (sec, scrollTo) => { await ev(`(() => { document.getElementById('app').classList.remove('collapsed'); document.querySelectorAll('details.sec').forEach(d => d.open = d.dataset.sec === '${sec}'); const t = ${scrollTo ? `document.querySelector('${scrollTo}')` : `document.querySelector('details.sec[data-sec="${sec}"]')`}; t?.scrollIntoView(); return true })()`); };
  // 1 start screen: the habitat question
  await ev(`document.getElementById('newScene').click(); true`); await sleep(800); await shot('01-new-habitat'); await closeAll();
  // 2 Browse looks (Guided look flow, first step)
  await ev(`document.getElementById('browseLooks')?.click(); true`); await sleep(3500); await shot('02-browse-looks-world'); await closeAll();
  // 3 Discover
  await ev(`document.getElementById('discoverBtn').click(); true`); await sleep(1500); await shot('03-discover'); await closeAll();
  // 4 Tank section: kind buttons and style list (style options dumped as text)
  await section('tank'); await shot('04-tank-kind');
  results[`${tag}-styles`] = await ev(`[...document.querySelectorAll('#layout optgroup')].map(g => g.label + ': ' + [...g.querySelectorAll('option')].map(o => o.textContent).join(', '))`);
  results[`${tag}-substrates`] = await ev(`[...document.querySelectorAll('optgroup')].filter(g => /Aquarium|Terrarium/.test(g.label)).map(g => g.label + ': ' + [...g.querySelectorAll('option')].map(o => o.textContent).join(', '))`);
  await ev(`document.getElementById('layout')?.scrollIntoView(); true`); await shot('05-tank-styles');
  // 5 Plants and Hardscape lists
  await section('plants'); await shot('06-plants');
  results[`${tag}-plantButtons`] = await ev(`[...document.querySelectorAll('#libPlant [data-lib]')].map(b => b.textContent)`);
  await section('hardscape'); await shot('07-hardscape');
  results[`${tag}-hardscapeButtons`] = await ev(`[...document.querySelectorAll('#libHard [data-lib]')].map(b => b.textContent)`);
  // 6 Animals
  await section('fish'); await shot('08-animals');
  results[`${tag}-animalChips`] = await ev(`[...document.querySelectorAll('details.sec[data-sec="fish"] .chips button, details.sec[data-sec="fish"] [data-role]')].map(b => b.textContent).slice(0, 40)`);
  // 6b the dwarf frog stays: search the Animals list for it
  await ev(`(() => { const i = document.querySelector('details.sec[data-sec="fish"] input[type="search"]'); i.value = 'dwarf'; i.dispatchEvent(new Event('input', { bubbles: true })); i.scrollIntoView(); return true })()`); await shot('08b-animals-dwarf-frog');
  results[`${tag}-dwarfRows`] = await ev(`[...document.querySelectorAll('details.sec[data-sec="fish"] [data-sp], details.sec[data-sec="fish"] .sprow')].map(e => e.textContent.slice(0, 40)).slice(0, 5)`);
  // 7 Equipment
  await ev(`document.getElementById('equipOpen')?.click(); true`); await sleep(1000); await shot('09-equipment'); await closeAll();
  // 7b the other panels, scanned only (constraints / brief, report) and the tank size dialog
  await section('brief'); await shot('09b-constraints-brief'); await section('report'); await shot('09c-report');
  await ev(`document.getElementById('presetA')?.click(); true`); await sleep(2500); await shot('09d-presets'); await closeAll(); await sleep(500);
  // 8 Start screen starters (reloaded: the tank-size panel above stays pinned)
  await send('Page.navigate', { url }); await sleep(3000); for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); } await sleep(2500); await closeAll();
  await ev(`document.getElementById('openScene').click(); true`); await sleep(500); await ev(`document.getElementById('openStarter')?.click(); true`); await sleep(1500); await shot('10-starters'); await closeAll();
  // 9 How to use
  await ev(`(() => { document.getElementById('help').open = true; document.getElementById('help').scrollIntoView(); return true })()`); await shot('11-how-to-use');
  // 10 a saved terrarium still opens (dev server only: the example scene is imported from source), with the paused note in aquarium scope
  await closeAll(); await ev(`(async () => { const m = await import('/src/examples/scenes.ts'); window.__gb.store.replace(JSON.parse(m.SCENES.arid)); return true })()`); await sleep(1200); await shot('12-saved-terrarium-opens');
  results[`${tag}-savedNote`] = await ev(`document.getElementById('status').hidden ? '' : document.getElementById('status').textContent`);
  results[`${tag}-title`] = await ev(`document.title + ' | ' + (document.querySelector('.sub')?.textContent ?? '')`);
}
try {
  await run('before', URL + '?scope=all');
  await run('after', URL);
  writeFileSync('research/screens/AQ1/scan.json', JSON.stringify(results, null, 1));
  console.log(Object.entries(results).filter(([k]) => k.startsWith('after')).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n'));
} finally { ch.kill(); }
