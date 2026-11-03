// Lane GS7 browser check (dev server on 6107): sex picks survive a revisit; 5 -> 8 in the editor. Headless Chrome over raw CDP, one page. Pictures land in shots/gs7/.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', URL = process.env.URL ?? 'http://localhost:6107/', PORT = 9333;
mkdirSync('shots/gs7', { recursive: true });
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,900', '--user-data-dir=' + (process.env.TEMP + '/gs7-chrome-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); writeFileSync(`shots/gs7/${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'missing ${sel}'; e.click(); return 'ok'})()`);
try {
  await send('Page.enable'); await send('Page.navigate', { url: URL });
  for (let i = 0; i < 60; i++) { if (await ev(`!!document.getElementById('startAnimal') && !!window.__gb`).catch(() => false)) break; await sleep(1000); }
  await sleep(2000);
  console.log(await click('#startAnimal')); await sleep(2500);
  console.log(await ev(`document.querySelector('aside.sp')?.hidden`));
  const type = t => ev(`(()=>{const q=document.querySelector('aside.sp .spQ'); q.value=${JSON.stringify(t)}; q.dispatchEvent(new Event('input',{bubbles:true})); return !!q})()`);
  console.log(await click(`.sgTile[data-id=guppy]`)); await sleep(2500);
  const state = () => ev(`JSON.stringify({stock: window.__gb.store.tank.brief?.items?.['animals.stock']?.value, fish: window.__gb.store.tank.fish.map(f=>f.species+':'+(f.gender??'u'))})`);
  console.log('after add', await state());
  console.log(await click(`[data-act=inc][data-id=guppy][data-w=f]`)); await sleep(500);
  console.log(await click(`[data-act=inc][data-id=guppy][data-w=f]`)); await sleep(500);
  console.log('females up', await state());
  await sleep(800); await shot('1-picked');
  console.log(await click(`[data-act=done]`)); await sleep(1500);
  console.log('closed', await state());
  console.log(await click('#startAnimal')); await sleep(2500);
  console.log('revisit', await ev('document.querySelector("aside.sp .spPick")?.innerText.slice(0,300)'));
  await sleep(800); await shot('1-revisit-keeps-females');
  // neon 5 -> 8 over the design
  console.log(await type('neon tetra')); await sleep(800);
  console.log(await click(`aside.sp [data-act=add][data-id=neon]`)); await sleep(1200);
  console.log('neon added', await state());
  for (let i = 0; i < 3; i++) { await click(`[data-act=dec][data-id=neon][data-w=n]`); await sleep(250); }
  await sleep(300);
  console.log('neon 5', JSON.parse(await state()).fish.filter(f => f.startsWith('neon')).length);
  const before = await ev(`JSON.stringify(window.__gb.store.tank.fish.filter(f=>f.species==='neon').map(f=>[f.id,f.x]))`);
  await shot('2-neon-5');
  for (let i = 0; i < 3; i++) { await click(`[data-act=inc][data-id=neon][data-w=n]`); await sleep(200); }
  await sleep(800);
  const after = JSON.parse(await ev(`JSON.stringify(window.__gb.store.tank.fish.filter(f=>f.species==='neon').map(f=>[f.id,f.x]))`));
  console.log('neon 8', after.length, 'first five unchanged:', JSON.stringify(JSON.parse(before)) === JSON.stringify(after.slice(0, 5)));
  await shot('2-neon-8');
} catch (e) { console.log('ERR', e.message); }
ws.close(); ch.kill();
