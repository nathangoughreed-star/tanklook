// FB2 proof in the real app at 1280x800 (dev server, headless Chrome on 9411). The headless sim runs slowly, so each frame is taken after the page fast-forwards
// the sim by a fixed step (viewer.roam / crawl .update with a chosen dt), then a screenshot.
// Usage: URL=http://localhost:5175/ node scripts/fb2-shots.mjs [danio|shrimp|cory]   -> research/screens/FB2/
import { writeFileSync, mkdirSync } from 'node:fs';
import { connect, sleep } from './fx1-lib.mjs';
const OUT = 'research/screens/FB2'; mkdirSync(OUT, { recursive: true });
const c = await connect(); const L = (...a) => console.log(...a);
const shotTo = async (path, clip, scale = 1) => { const p = { format: 'png' }; if (clip) p.clip = { ...clip, scale }; const r = await c.send('Page.captureScreenshot', p); writeFileSync(path, Buffer.from(r.result.data, 'base64')); };
const MODE = process.argv[2] ?? 'danio';
await c.size(1280, 800);
await c.load('?ui=1');
await c.ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
const fishJs = { danio: `for(let i=0;i<8;i++) t.fish.push(mk(i+1,'danio',200+(i%4)*30,120+(i%3)*25,150+Math.floor(i/4)*30,20));`,
  shrimp: `for(let i=0;i<3;i++) t.fish.push(mk(i+1,'cherryshrimp',250+i*60,90+i*20,40,30+i*40));`,
  cory: `for(let i=0;i<6;i++) t.fish.push(mk(i+1,'bronzecory',150+i*55,80+(i%3)*30,40,(i*60)%360));` }[MODE];
await c.ev(`(()=>{const g=__gb; g.store.update(s=>{const t=s.tanks[0]; t.water.on=true; t.substrate={...t.substrate,show:true,type:'aragonite',fl:40,fr:40,bl:50,br:50}; t.light={...t.light,type:'led'};
  const mk=(id,sp,x,depth,y,yaw)=>({id,species:sp,x,y,depth,yaw,pitch:0,roll:0,bend:0}); t.fish=[]; ${fishJs}
  t.camera=${MODE === 'danio' ? '{dist:430,az:0,el:3,zoom:1}' : MODE === 'shrimp' ? '{dist:430,az:0,el:16,zoom:5}' : '{dist:300,az:0,el:8,zoom:1}'}; }); })()`);
await sleep(3500);
// fast-forward the sim by dt seconds, in 0.1 s steps
const warp = (secs) => c.ev(`(()=>{const v=__gb.viewer, vp=v.vps[0], r=[], k=[]; vp.scene.traverse(o=>{ if(o.userData.roam) r.push(o); if(o.userData.crawl) k.push(o); }); v.lastInput=performance.now();
  for(let t=0;t<${secs};t+=0.1){ if(r.length) v.roam.update(r,0.1,true,false); if(k.length) v.crawl.update(k,0.1,true,false); } v.dirty=true; return [r.length,k.length]})()`);
const probe = () => c.ev(`(()=>{const g=__gb, vp=g.viewer.vps[0], cv=document.querySelector('#view canvas'), r=cv.getBoundingClientRect(); let sx=0, sy=0, n=0, sub, breath=0, fan=0, dig=0;
  vp.scene.traverse(o=>{ if(!o.userData.roam && !o.userData.crawl) return; const v=o.getWorldPosition(o.position.clone()).project(vp.cam); sx+=r.x+(v.x+1)/2*r.width; sy+=r.y+(1-v.y)/2*r.height; n++; if(o.userData.id===1){ sub=o.userData.sub; breath=o.userData.breath||0; } });
  return {x:sx/n, y:sy/n, sub, breath, n}})()`);
const names = ['pulse-glide', 'slow-cruise', 'hover'];
if (MODE === 'danio') {
  const got = [0, 0, 0]; let tick = 0;
  for (let it = 0; it < 4000 && got.some(g => g < 3); it++) {
    await warp(0.3); await sleep(250); const f = await probe(); const s = f.sub; if (s === undefined || got[s] >= 3) { if (++tick % 20 === 0) L('seek', got.join(',')); continue; }
    await shotTo(`${OUT}/${names[s]}-${got[s] + 1}.png`, { x: Math.max(0, f.x - 230), y: Math.max(0, f.y - 150), width: 460, height: 300 }); got[s]++; L('shot', names[s], got[s]);
  }
  const rows = names.map(n => `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><b style="width:110px;font:14px sans-serif">${n}</b>${[1, 2, 3].map(k => `<img src="${n}-${k}.png" width="380">`).join('')}</div>`).join('');
  writeFileSync(`${OUT}/sheet.html`, `<body style="margin:8px;background:#fff">${rows}</body>`);
  await c.send('Page.navigate', { url: 'file:///' + process.cwd().split('\\').join('/') + `/${OUT}/sheet.html` }); await sleep(1000);
  await shotTo(`${OUT}/danio-styles-sheet.png`); L('done', got);
} else {
  // shrimp / cory: a short strip, 5 frames 0.15 s of sim apart, cropped round the animals, at 2x
  await warp(MODE === 'shrimp' ? 25 : 60); await sleep(500);
  for (let k = 0; k < 5; k++) { await warp(0.15); await sleep(200); const f = await probe(); await shotTo(`${OUT}/${MODE}-strip-${k + 1}.png`, { x: Math.max(0, f.x - 150), y: Math.max(0, f.y - 80), width: 300, height: 170 }, MODE === 'shrimp' ? 3 : 2); L('shot', MODE, k + 1, JSON.stringify({ breath: f.breath })); }
  const rows = `<div style="display:flex;gap:4px">${[1, 2, 3, 4, 5].map(k => `<img src="${MODE}-strip-${k}.png" width="250">`).join('')}</div>`;
  writeFileSync(`${OUT}/sheet-${MODE}.html`, `<body style="margin:8px;background:#fff">${rows}</body>`);
  await c.send('Page.navigate', { url: 'file:///' + process.cwd().split('\\').join('/') + `/${OUT}/sheet-${MODE}.html` }); await sleep(1000);
  await shotTo(`${OUT}/${MODE}-strip-sheet.png`); L('done');
}
c.close();
