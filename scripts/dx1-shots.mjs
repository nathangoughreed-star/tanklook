// Lane EQ1 browser check (dev server, URL env): the My equipment menu (desktop + 375 px), a Tech "I own one" shortcut opening it at the heater, and the cost panel
// with owned items. Headless Chrome over raw CDP, one page at a time. Pictures land in shots/dx1/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:5173/', PORT = 9351;
mkdirSync('shots/dx1', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/dx1-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); writeFileSync(`shots/dx1/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
const fire = (sel, val, type = 'change') => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; if(${JSON.stringify(val)}==='check') e.checked=true; else e.value=${JSON.stringify(val)}; e.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true})); return 'ok'})()`);
const view = async (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const rect = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e||e.hidden) return null; const r=e.getBoundingClientRect(); return r.width&&r.height?[r.left,r.top,r.right,r.bottom]:null})()`);
const overlaps = async tag => {
  const c = await rect('.checks'); if (!c) { console.log(tag, 'strip hidden'); return; }
  for (const s of ['#roomChip', '#undo', '#redo', '#demandPanel', '.eqwarn', '#sideOpen', '#sideClose']) { const r = await rect(s); console.log(tag, s, !r ? 'absent' : (r[0] < c[2] && c[0] < r[2] && r[1] < c[3] && c[1] < r[3]) ? 'OVERLAPS' : 'clear'); }
};
try {
  await send('Page.enable'); await view(1400, 900, false); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 90; i++) { if (await ev(`!!window.__gb && !!document.getElementById('demandPanel')`).catch(() => false)) break; await sleep(1000); }
  await sleep(3000);
  await ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`); await sleep(300);
  const IN = 25.4;
  // healthy: the 40 gal breeder, 8 neons
  const set = (sp, n, cap) => ev(`window.__gb.store.edit(S => { S.tank.L = ${36*IN}; S.tank.D = ${18*IN}; S.tank.H = ${16*IN}; S.water.on = true; S.fish = Array.from({length:${n}}, (_, i) => ({id:i+1, species:'${sp}', x:0, y:0, depth:0, yaw:0, pitch:0, roll:0, bend:0})); S.constraints = ${cap ? '{ startupUsd: { on: true, value: 50 } }' : 'undefined'}; })`);
  const popup = () => ev(`(()=>{let e=document.querySelector('.eqwarn'); if(!e) return; e.hidden=false; e.innerHTML='<b>Your equipment</b><ul><li>Your light is too dim for these plants.</li></ul><div class="btns"><button>Open My equipment</button></div>'})()`);
  for (const [w, h, mob, tag] of [[1400, 900, false, 'desktop'], [375, 812, true, 'm375']]) {
    await view(w, h, mob); await sleep(800);
    await set('neon', 8, false); await sleep(2500); await ev(`document.querySelector('.eqwarn')&&(document.querySelector('.eqwarn').hidden=true)`);
    console.log(tag, 'healthy strip:', await ev(`(()=>{const e=document.querySelector('.checks'); return e && !e.hidden ? e.innerText.slice(0,200) : 'hidden'})()`));
    await shot(`${tag}-1-healthy`);
    await set('oscar', 4, true); await sleep(3500);
    console.log(tag, 'bad strip:', await ev(`document.querySelector('.checks')?.innerText.slice(0,400)`));
    await shot(`${tag}-2-gate-and-hard`);
    await overlaps(tag);
    await popup(); await sleep(300); await overlaps(tag + '+popup'); await shot(`${tag}-3-with-eq1-popup`);
  }
} finally { ws.close(); ch.kill(); }
