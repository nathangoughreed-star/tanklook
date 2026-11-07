// Lane UI4 browser check (dev server, URL env): the room-light slider on the viewing screen: empty room (high), tank with a light (low), a manual value, desktop + 375 px.
// Headless Chrome over raw CDP, one page at a time. Pictures land in shots/st3/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9356;
mkdirSync('shots/st3', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/st3-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`shots/st3/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const fire = (sel, val, type = 'change') => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; if(${JSON.stringify(val)}==='check') e.checked=true; else e.value=${JSON.stringify(val)}; e.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true})); return 'ok'})()`);
const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
try {
  await send('Page.enable'); await view(1400, 900, false); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('vRoom')`).catch(() => false)) break; await sleep(1000); }
  await sleep(2500);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
  for (let t = 0; t < 20; t++) { const r = await ev(`(()=>{document.querySelectorAll('dialog[open]:not(#modeDlg)').forEach(d=>d.close()); const dlg=document.getElementById('modeDlg'); if(!dlg.open){document.getElementById('newScene').click(); return 'new'} const c=[...document.querySelectorAll('#modeKindList button')].find(b=>/Freshwater/.test(b.innerText)); if(c && !document.getElementById('modeKinds').hidden){c.click(); return 'ok'} document.getElementById('modeSandbox').click(); return 'sandbox'})()`); if (r === 'ok') break; await sleep(1200); }
  await sleep(2500);
  for (const [q, name] of [['2 gal', 'a-2gal'], ['10 gal', 'b-10gal'], ['40 breeder', 'c-40']]) {
    await ev(`(()=>{const e=document.getElementById('tdQ'); e.value=${JSON.stringify(q)}; e.dispatchEvent(new Event('input', {bubbles:true}))})()`); await sleep(500);
    await click('#tdList .td-opt'); await sleep(2500); await shot(name + '-preview');
  }
  await ev(`(()=>{const e=document.getElementById('tdQ'); e.value='2 gal'; e.dispatchEvent(new Event('input', {bubbles:true}))})()`); await sleep(500);
  await click('#tdList .td-opt'); await sleep(900); await click('#tdChoose'); await sleep(1500); await click('#tdDone'); await sleep(2500);
  console.log('zoom', await ev(`window.__gb.store.tank.camera.zoom`));
  await shot('d-2gal-chosen');
  // the cost panel of the bare tank
  console.log('setup items', await ev(`(async()=>{const {demandOf,defaultProfile}=await import('/src/demand/index.ts'); return demandOf(window.__gb.store.tank, defaultProfile()).items.filter(i=>i.setup).map(i=>i.key).join(',')})()`));
  await sleep(500); await shot('e-cost-panel');
} finally { ws.close(); ch.kill(); }
