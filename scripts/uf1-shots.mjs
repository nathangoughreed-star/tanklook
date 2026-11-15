// UF1 (2026-11-15): the new UI is the default. Needs a server: npm run build && npx vite preview --port 6511 --strictPort ; URL=http://localhost:6511/ node scripts/uf1-shots.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6511/', PORT = 9531, OUT = 'research/screens/UF1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/uf1-chrome-' + Date.now())], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async name => { await sleep(1500); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); };
const facts = {};
for (const [dev, w, h, mobile] of [['d1280', 1280, 800, false], ['p390', 390, 844, true]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Storage.clearDataForOrigin', { origin: new URL(BASE).origin, storageTypes: 'all' });
  await send('Page.navigate', { url: BASE }); await sleep(9000);
  facts[dev + '-plain'] = await ev(`JSON.stringify({ui2: document.body.dataset.ui2, title: document.title, fish: window.__gb?.store?.scene?.fish?.length})`);
  await shot(`${dev}-01-plain-url`);
  await send('Page.navigate', { url: BASE + '?ui=1' }); await sleep(9000);
  facts[dev + '-ui1'] = await ev(`JSON.stringify({ui2: document.body.dataset.ui2 ?? null, oldApp: !!document.getElementById('app')})`);
  await shot(`${dev}-02-ui1-old`);
  await send('Page.navigate', { url: BASE + '?ui=2' }); await sleep(9000);
  facts[dev + '-ui2'] = await ev(`document.body.dataset.ui2`);
  // Settings link (rail button) and the file menu link
  if (mobile) { await ev(`[...document.querySelectorAll('.tabbar button')].pop()?.click()`); await sleep(600); }
  await ev(`(() => { const b = [...document.querySelectorAll('button,[role=tab]')].find(e => /settings/i.test((e.getAttribute('aria-label')||'') + e.textContent)); b && b.click(); })()`);
  await sleep(800);
  facts[dev + '-settingsLink'] = await ev(`[...document.querySelectorAll('a')].filter(a => /old interface/i.test(a.textContent)).map(a => a.getAttribute('href')).join(',')`);
  await shot(`${dev}-03-settings-link`);
  await ev(`document.querySelector('[aria-label="File menu"]')?.click()`);
  facts[dev + '-menuLink'] = await ev(`[...document.querySelectorAll('[role=menuitem]')].filter(a => /old interface/i.test(a.textContent)).map(a => a.getAttribute('href')).join(',')`);
  await shot(`${dev}-04-menu-link`);
  await ev(`[...document.querySelectorAll('[role=menuitem]')].find(a => /old interface/i.test(a.textContent))?.click()`); await sleep(9000);
  facts[dev + '-afterClick'] = await ev(`JSON.stringify({url: location.search, oldApp: !!document.getElementById('app'), ui2: document.body.dataset.ui2 ?? null})`);
  await shot(`${dev}-05-after-link`);
}
writeFileSync(`${OUT}/facts.json`, JSON.stringify(facts, null, 1)); console.log(JSON.stringify(facts, null, 1));
ch.kill(); process.exit(0);
