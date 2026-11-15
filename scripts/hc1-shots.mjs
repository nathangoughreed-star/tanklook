// HC1: a cabinet's canister hoses enter through a back-panel cut-out. Run: URL=http://localhost:5198/ node scripts/cb2-shots.mjs  Shots: research/screens/HC1/
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5198/', PORT = 9393;
mkdirSync('research/screens/HC1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/cb2-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 120) + ' => ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/HC1/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
await send('Runtime.enable'); const errs = []; ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map(a => a.value ?? a.description).join(' ')); });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: URL });
for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
const TAG = process.env.TAG ?? 'after';
const setup = (az, el, dist, zoom) => ev(`(async () => { const { store } = window.__gb; const tv = (await import('/src/render/tankView.ts')).tankView, gv = (await import('/src/render/gear3d.ts')).gearView; console.log('flags', tv.empty, tv.ghost, gv.on); tv.empty = false; tv.ghost = false; gv.on = true;
  store.edit(S => { S.stand.show = false; S.wall.show = true; S.wall.side = 'back'; delete S.wall.gap; S.water.on = true; S.backdrop = { kind: 'rock', depth: 60, seed: 3 }; S.tech = { ...(S.tech ?? {}), filters: undefined, rows: { ...(S.tech?.rows ?? {}), filter: 'hob' } }; });
  store.cam(c => { c.az = ${az}; c.el = ${el}; c.dist = ${dist}; c.zoom = ${zoom} });
  await new Promise(r => setTimeout(r, 4000)); return true })()`);
await setup(90, 4, 1500, 1); console.log(await ev(`(async()=>{const g=await import('/src/render/gear3d.ts'); const S=window.__gb.store.scene.tanks[0]; const tv=(await import('/src/render/tankView.ts')).tankView, t=await import('/src/scene/tech.ts'); return JSON.stringify([g.gearPicks(S), g.gearView.on, tv.empty, tv.ghost, t.techParts(S).map(p=>[p.gear,p.model]), S.stockFirst, t.filterState(S)])})()`)); await shot(`side-${TAG}`);
await setup(15, 62, 1500, 1.4); await shot(`threequarter-${TAG}`);
console.log('ERRORS', errs.slice(0, 4).join(' || ').slice(0, 1500)); ch.kill(); process.exit(0);
