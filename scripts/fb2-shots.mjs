// FB2 proof: a danio school in the real app at 1280x800, three frames of each style it switches between (pulse-glide, slow cruise, hover), then a contact sheet.
// Usage: URL=http://localhost:5175/ node scripts/fb2-shots.mjs   (shots -> research/screens/FB2/; headless Chrome on 9411)
import { writeFileSync, mkdirSync } from 'node:fs';
import { connect, sleep } from './fx1-lib.mjs';
const OUT = 'research/screens/FB2'; mkdirSync(OUT, { recursive: true });
const c = await connect(); const L = (...a) => console.log(...a);
const shotTo = async (path, clip) => { const p = { format: 'png' }; if (clip) p.clip = { ...clip, scale: 1 }; const r = await c.send('Page.captureScreenshot', p); writeFileSync(path, Buffer.from(r.result.data, 'base64')); };
await c.size(1280, 800);
await c.load('?ui=1');
await c.ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
await c.ev(`(()=>{const g=__gb; g.store.update(s=>{const t=s.tanks[0]; t.water.on=true; t.substrate={...t.substrate,show:true,type:'aragonite',fl:40,fr:40,bl:50,br:50}; t.light={...t.light,type:'led'};
  const mk=(id,sp,x,depth,y,yaw)=>({id,species:sp,x,y,depth,yaw,pitch:0,roll:0,bend:0}); t.fish=[];
  for(let i=0;i<8;i++) t.fish.push(mk(i+1,'danio',200+(i%4)*30,120+(i%3)*25,150+Math.floor(i/4)*30,20));
  t.camera={dist:430,az:0,el:3,zoom:1}; }); })()`);
await sleep(3000);
const probe = () => c.ev(`(()=>{const g=__gb, vp=g.viewer.vps[0], cv=document.querySelector('#view canvas'), r=cv.getBoundingClientRect(); let sx=0, sy=0, n=0, sub; const ys=[];
  vp.scene.traverse(o=>{ if(!o.userData.roam) return; const v=o.getWorldPosition(o.position.clone()).project(vp.cam); sx+=r.x+(v.x+1)/2*r.width; sy+=r.y+(1-v.y)/2*r.height; n++; if(o.userData.id===1) sub=o.userData.sub; });
  return {x:sx/n, y:sy/n, sub, n}})()`);
const names = ['pulse-glide', 'slow-cruise', 'hover'], got = [0, 0, 0], last = [0, 0, 0], t0 = Date.now();
while (Date.now() - t0 < 10 * 60 * 1000 && got.some(g => g < 3)) {
  await c.ev(`__gb.viewer.lastInput = performance.now()`); const f = await probe(); await sleep(120);
  const s = f.sub; if (s === undefined || got[s] >= 3 || Date.now() - last[s] < 700) continue;
  const clip = { x: Math.max(0, f.x - 230), y: Math.max(0, f.y - 150), width: 460, height: 300 };
  await shotTo(`${OUT}/${names[s]}-${got[s] + 1}.png`, clip); got[s]++; last[s] = Date.now(); L('shot', names[s], got[s]);
}
// contact sheet
const rows = names.map(n => `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><b style="width:110px;font:14px sans-serif">${n}</b>${[1, 2, 3].map(k => `<img src="${n}-${k}.png" width="380">`).join('')}</div>`).join('');
writeFileSync(`${OUT}/sheet.html`, `<body style="margin:8px;background:#fff">${rows}</body>`);
await c.send('Page.navigate', { url: 'file:///' + process.cwd().split('\\').join('/') + `/${OUT}/sheet.html` }); await sleep(1000);
await shotTo(`${OUT}/danio-styles-sheet.png`);
c.close(); L('done', got);
