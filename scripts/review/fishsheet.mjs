// Headless Chrome: review.html -> per-fish 4-view sheet PNGs, saved via the dev server's /__shot.
// usage: node fishsheet.mjs <port> <name> <ids,comma>
import { spawn } from 'node:child_process';
const [PORTAPP, NAME, IDS] = process.argv.slice(2);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', PORT = 9400 + Math.floor(Math.random() * 400);
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--window-size=1400,1000', '--user-data-dir=' + (process.env.TEMP + '/fs-' + Date.now()), '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (tabs.length) break; } catch {} await sleep(500); }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); return r.result.result?.value ?? r.result.exceptionDetails?.exception?.description; };
try {
  await send('Page.navigate', { url: `http://localhost:${PORTAPP}/review.html?q=${IDS}` });
  const want = IDS.split(',').length * 8;
  for (let i = 0; i < 120; i++) { await sleep(2000); const n = await ev(`[document.querySelectorAll('#list canvas,#list img').length, document.getElementById('status')?.innerText||'']`); if (n && n[0] >= want && !/Loading/.test(n[1])) break; if (i % 10 === 0) console.log('wait', JSON.stringify(n)); }
  await sleep(3000);
  console.log(await ev(`(async () => {
    const cards=[...document.querySelectorAll('#list > *')].filter(e=>e.querySelector('canvas,img'));
    const VW=260,VH=163,LBL=150,PAD=6; const out=document.createElement('canvas');
    out.width=LBL+4*(VW+PAD); out.height=34+cards.length*(VH+PAD);
    const g=out.getContext('2d'); g.fillStyle='#1b2329'; g.fillRect(0,0,out.width,out.height);
    g.fillStyle='#ddd'; g.font='bold 15px sans-serif'; ['Side','3/4','Front','Top'].forEach((t,k)=>g.fillText(t,LBL+k*(VW+PAD)+VW/2-15,22));
    cards.forEach((c,i)=>{const els=[...c.querySelectorAll('canvas,img')]; const y=34+i*(VH+PAD);
      for(let k=0;k<4;k++){const x=LBL+k*(VW+PAD); const gr=g.createLinearGradient(0,y,0,y+VH); gr.addColorStop(0,'#dce9f2'); gr.addColorStop(1,'#b6cede'); g.fillStyle=gr; g.fillRect(x,y,VW,VH); try{g.drawImage(els[k],x,y,VW,VH)}catch(e){}}
      const name=(c.querySelector('h2,h3,strong,.name')?.innerText||'').trim(); const meta=c.innerText.match(/· (\\w+) · (\\d+) mm/)||[];
      g.fillStyle='#fff'; g.font='bold 14px sans-serif'; const words=name.split(' '); let line='',ly=y+22; for(const w of words){ if(g.measureText(line+w).width>LBL-12){g.fillText(line,8,ly);ly+=17;line='';} line+=w+' ';} g.fillText(line,8,ly);
      g.fillStyle='#9bb'; g.font='12px sans-serif'; g.fillText((meta[1]||'')+' · '+(meta[2]? (meta[2]/25.4).toFixed(1)+' in':''),8,ly+18);});
    const blob=await new Promise(r=>out.toBlob(r,'image/png'));
    const r=await fetch('/__shot?name=${NAME}',{method:'POST',body:blob}); return cards.length+' fish, '+out.width+'x'+out.height+' '+r.status; })()`));
} finally { ch.kill(); process.exit(0); }
