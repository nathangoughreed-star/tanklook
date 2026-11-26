// Lane HV: panel-cropped screenshots of the honest-verdict cases (dev server with the __gb handle; URL env). Pictures in research/screens/HV/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5199/', TAG = 'pair', PORT = 9396;
mkdirSync('research/screens/HV', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/hv-chrome-' + TAG + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0, 90) + ' => ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
const shotSel = async (name, sel) => { const box = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width,height:Math.min(b.height, innerHeight-b.y)}})()`); if (!box || box.width < 2 || box.height < 2) { console.log('missing', sel, JSON.stringify(box)); return; } const r = await send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 1 } }); if (!r.result) { console.log('shot failed', name, JSON.stringify(r.error)); return; } writeFileSync(`research/screens/HV/${TAG}-${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const clickText = (sel, text) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent.includes(${JSON.stringify(text)})); if(!e) return 'missing ${text}'; e.click(); return 'ok'})()`);
const openHab = async () => { for (const w of ['Caution', 'Compatible', 'Not enough', 'Problem']) { const r = await clickText('button', w); if (r === 'ok') return w; } return 'no habitat button'; };
const setup = async (label, fishJs, tankJs, rows) => {
  await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500); await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await clickText('button', 'Just look around'); await sleep(500);
  await ev(`window.__gb.store.edit(S=>{ const f0=S.fish[0]; const mk=(sp,n,b)=>[...Array(n)].map((_,i)=>({...f0,species:sp,id:b+i,uid:undefined})); S.fish=${fishJs}; S.tank={...S.tank,...${tankJs}}; S.tech={rows:{...(S.tech?.rows||{}), ...${JSON.stringify(rows)}}}; })`);
  await sleep(2000); console.log(label);
};
const SC = ["[...mk('oscar',1,1000),...mk('neon',6,2000)]", '{L:1219,D:610,H:508}', { heater: 'one', filter: 'hob' }];
try {
  await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await setup('oscar+neon', ...SC); console.log(await openHab()); await sleep(1500); await shotSel('oscar-neon-after', '.drawer');
} catch (e) { console.log("ERR", String(e).slice(0, 400)); } finally { ch.kill(); ws.close(); process.exit(0); }
