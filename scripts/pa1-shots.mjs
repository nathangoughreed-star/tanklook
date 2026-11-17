// PA1: before/after pictures of the top gaps, true 1280x800, headless Chrome over CDP.
//   Chrome:  chrome --headless=new --remote-debugging-port=9631 --user-data-dir=<tmp> --window-size=1280,800 about:blank
//   Run:     BASE=http://localhost:5183 node scripts/pa1-shots.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 9631, BASE = process.env.BASE ?? 'http://localhost:5183';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) console.log('ev err', x.slice(0, 80), JSON.stringify(r.result.exceptionDetails).slice(0, 200)); return r.result.result?.value; };
mkdirSync('research/screens/PA1', { recursive: true });
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`research/screens/PA1/${n}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', n); };
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
async function load(q) {
  await send('Page.navigate', { url: BASE + '/' + q }); await sleep(2500);
  await ev(`(async()=>{const ex=await import('/src/examples/index.ts');const sc=await ex.exampleScenes();localStorage.setItem('tanklook.scene',sc.planted);})()`); await sleep(500);
  await send('Page.navigate', { url: BASE + '/' + q }); await sleep(9000);
}
const clickText = (sel, re) => ev(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>${re}.test(x.textContent.trim()));if(!b)return 'no';b.click();return 'ok'})()`);
const openAll = () => ev(`(async()=>{for(let k=0;k<3;k++){document.querySelectorAll('.ui2app .group:not(.open) > .gh').forEach(b=>b.click());await new Promise(r=>setTimeout(r,250));}})()`);
const rail = n => ev(`(()=>{const b=[...document.querySelectorAll('.rail button')].find(b=>(b.getAttribute('aria-label')||b.textContent).trim().startsWith(${JSON.stringify(n)}));if(b&&(!b.classList.contains('on')||document.querySelector('.ui2app').classList.contains('panel-off')))b.click();return !!b})()`);
const scrollTo = s => ev(`(()=>{const e=${s};if(e){e.scrollIntoView({block:'start'});}return !!e})()`);

// 1 Habitat check: What counts + ammonia
await load('?ui=1');
console.log(await ev(`(()=>{const h=[...document.querySelectorAll('button,div,summary')].find(e=>e.children.length<5&&/^Habitat check/.test(e.innerText||'')&&e.offsetParent);h&&h.click();return !!h})()`)); await sleep(800);
await ev(`[...document.querySelectorAll('summary')].filter(s=>/What counts|ammonia/.test(s.textContent)).forEach(s=>{s.parentElement.open=true})`); await sleep(600);
await shot('1-habitat-before-old');
await load('');
await ev(`document.querySelector('.checkbar button.check').click()`); await sleep(1500);
await shot('1-habitat-after-shell');
// 2 Cost: three builds, Tank B, heater deal
await load('?ui=1');
await ev(`[...document.querySelectorAll('button')].find(b=>/^\\$1,\\d{3}/.test(b.textContent))?.click()`); await sleep(900);
await ev(`document.getElementById('demandPanel').scrollTop=0`); await sleep(300);
await shot('2-cost-before-old');
await load('');
await ev(`document.querySelectorAll('.checkbar button.check')[1].click()`); await sleep(1500);
await shot('2-cost-after-shell');
// 3 open-top lid warning: old cost panel scrolled to it; shell Tank > Lid and top
await load('?ui=1');
await ev(`[...document.querySelectorAll('button')].find(b=>/^\\$1,\\d{3}/.test(b.textContent))?.click()`); await sleep(900);
await ev(`(()=>{const e=[...document.querySelectorAll('#demandPanel *')].find(x=>x.children.length===0&&/get out of an open top/.test(x.textContent));e&&e.scrollIntoView({block:'center'})})()`); await sleep(400);
await shot('3-lid-before-old');
await load('');
await rail('Tank'); await sleep(900); await openAll(); await sleep(600);
await ev(`[...document.querySelectorAll('.gh')].find(b=>/^Lid and top/.test(b.textContent.trim()))?.scrollIntoView({block:'center'})`); await sleep(300);
await shot('3-lid-after-shell');
// 4 Light map options: old Lighting section; shell Equipment > Light map
await load('?ui=1');
await ev(`(()=>{const d=document.querySelector('details.sec[data-sec="equipment"]');d.open=true;const l=document.getElementById('lShade');l&&l.scrollIntoView({block:'center'})})()`); await sleep(800);
await shot('4-lightmap-before-old');
await load('');
await rail('Equipment'); await sleep(1000);
await ev(`[...document.querySelectorAll('.panel button,.wscat button')].find(b=>/^Light(Generic| )/.test(b.textContent.trim())||/^Light/.test(b.textContent.trim())&&b.textContent.length<40)?.click()`); await sleep(900);
await openAll(); await sleep(600);
await ev(`[...document.querySelectorAll('.gh')].find(b=>/Light map/i.test(b.textContent))?.scrollIntoView({block:'center'})`); await sleep(300);
await shot('4-lightmap-after-shell');
// 5 Constraints
await load('?ui=1');
await ev(`(()=>{const d=document.querySelector('details.sec[data-sec="limits"]');d.open=true;d.scrollIntoView({block:'start'});const s=document.querySelector('#side')||document.scrollingElement;})()`); await sleep(900);
await ev(`(()=>{const s=document.getElementById('side');const t=[...document.querySelectorAll('#side *')].find(e=>e.children.length===0&&/Your resources and limits/.test(e.textContent));t&&t.scrollIntoView({block:'start'})})()`); await sleep(500);
await shot('5-constraints-before-old');
await load('');
await rail('Constraints'); await sleep(900); await openAll(); await sleep(700);
await shot('5-constraints-after-shell');
ws.close();
