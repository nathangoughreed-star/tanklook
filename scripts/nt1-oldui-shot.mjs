// Lane NT1 (2026-11-14): New = fresh; Get started ticks + hide / restore. DEV server needed:  npx vite --port 6431 --strictPort ; node scripts/nt1-shots.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BASE = process.env.URL ?? 'http://localhost:6431/', PORT = 9514, OUT = 'research/screens/NT1';
mkdirSync(OUT, { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1600,900', '--user-data-dir=' + (process.env.TEMP + '/nt1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const click = (css, text = '') => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(b => b.textContent.includes(${JSON.stringify(text)}) || b.getAttribute('aria-label')?.includes(${JSON.stringify(text)})); if (!e) throw new Error('no ' + ${JSON.stringify(css + ' ' + text)}); e.click(); return true })()`);
const waitFor = async (expr, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(700); } return false; };
const shot = async name => { await sleep(1200); const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); writeFileSync(`${OUT}/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name, await ev(`document.querySelector('.getstarted')?.textContent?.slice(0, 40) ?? 'no card'`)); };
const edit = body => ev(`(async () => { const { store } = window.__gb; const IE = await import('/src/scene/itemEdit.ts'), L = await import('/src/scene/items.ts'), T = await import('/src/scene/tech.ts'); store.edit((t, s) => { ${body} }); return true })()`);
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Storage.clearDataForOrigin', { origin: new URL(BASE).origin, storageTypes: 'all' });
await send('Page.navigate', { url: BASE + '?ui=1&r=' + Date.now() }); await sleep(30000);
await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }).then(r => writeFileSync(`${OUT}/oldui-first-visit-new.jpg`, Buffer.from(r.result.data, 'base64')));
console.log(await ev(`JSON.stringify({stand: __gb.store.tank.stand.show, wall: __gb.store.tank.wall.show, person: __gb.store.tank.person.show})`));
ch.kill(); process.exit(0);
