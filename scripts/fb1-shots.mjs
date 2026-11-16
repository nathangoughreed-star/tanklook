// FB1 proof shots against the real app (dev server, headless Chrome on 9411): a kuhli mid-dig, buried and wriggling out, and a gourami hovering with fanned pectorals.
// Usage: URL=http://localhost:5176/ node scripts/fb1-shots.mjs   (shots -> research/screens/FB1/)
import { writeFileSync, mkdirSync } from 'node:fs';
import { connect, sleep } from './fx1-lib.mjs';
const OUT = 'research/screens/FB1'; mkdirSync(OUT, { recursive: true });
const c = await connect(); const L = (...a) => console.log(...a);
const shot = async (name, clip) => { const p = { format: 'png' }; if (clip) p.clip = { ...clip, scale: 2 }; const r = await c.send('Page.captureScreenshot', p); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); L('shot', name); };
await c.size(1400, 900);
await c.load('?ui=1');
await c.ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
const MODE = process.argv[2] ?? 'dig';
const dark = process.env.LIT ? 'led' : 'flat';
await c.ev(`(()=>{const g=__gb; g.store.update(s=>{const t=s.tanks[0]; t.water.on=true; t.substrate={...t.substrate,show:true,type:'aragonite',fl:50,fr:50,bl:60,br:60}; t.light={...t.light,type:'${dark}'};
  const mk=(id,sp,x,depth,y,yaw)=>({id,species:sp,x,y,depth,yaw,pitch:0,roll:0,bend:0}); t.fish=[];
  ${MODE==='dig' ? `for(let i=0;i<5;i++) t.fish.push(mk(i+1,'kuhli',120+i*80,70+(i%3)*45,60,(i*70)%360));` : `t.fish.push(mk(11,'gourami',200,150,200,0)); t.fish.push(mk(12,'betta',440,100,120,180));`}
  t.camera={dist:430,az:0,el:3,zoom:1}; }); })()`);
await sleep(3000);
// where each roaming fish is on screen, and what the sim says it is doing
const probe = () => c.ev(`(()=>{const g=__gb, vp=g.viewer.vps[0], cv=document.querySelector('#view canvas'), r=cv.getBoundingClientRect(), out=[];
  vp.scene.traverse(o=>{ if(!o.userData.roam) return; const v=o.getWorldPosition(o.position.clone()).project(vp.cam); out.push({id:o.userData.id, sp:o.userData.roam.spec.zone, len:o.userData.roam.spec.len, dig:o.userData.dig||0, fan:o.userData.fanA||0, calm:o.userData.calm, x:r.x+(v.x+1)/2*r.width, y:r.y+(1-v.y)/2*r.height, k:r.width}) });
  return out})()`);
const crop = (f, pad = 130) => ({ x: Math.max(0, f.x - pad), y: Math.max(0, f.y - pad * 0.7), width: pad * 2, height: pad * 1.4 });
const got = { dig: 0, hold: 0, out: 0, fan: 0 }, t0 = Date.now(), seen = [];
let prevDig = new Map();
while (Date.now() - t0 < 12 * 60 * 1000 && (MODE === 'dig' ? (got.dig < 3 || got.hold < 2 || got.out < 2) : got.fan < 6)) {
  await sleep(250); await c.ev(`__gb.viewer.lastInput = performance.now()`); // the viewer only animates while there is input (idle pause)
  const fs = await probe(); seen.push(fs.map(f => ({ id: f.id, dig: +f.dig.toFixed(1), fan: +f.fan.toFixed(2) })));
  for (const f of fs) {
    const pd = prevDig.get(f.id) ?? 0; prevDig.set(f.id, f.dig);
    if (f.sp === 'bottom' && f.dig > 6 && f.dig > pd + 0.3 && got.dig < 3) { await shot(`kuhli-digging-in-${got.dig + 1}`, crop(f)); got.dig++; }
    else if (f.sp === 'bottom' && f.dig > 12 && Math.abs(f.dig - pd) < 0.4 && got.hold < 2) { await shot(`kuhli-half-buried-${got.hold + 1}`, crop(f)); got.hold++; }
    else if (f.sp === 'bottom' && f.dig > 6 && f.dig < pd - 0.3 && got.out < 2) { await shot(`kuhli-wriggling-out-${got.out + 1}`, crop(f)); got.out++; }
    else if (f.id === 11 && f.fan > 0.6 && got.fan < 6) { await shot(`gourami-fanning-${got.fan + 1}`, crop(f, 150)); got.fan++; await sleep(150); }
  }
}
L('got', JSON.stringify(got), 'samples', seen.length);
await shot('tank-overview');
writeFileSync(`${OUT}/samples.json`, JSON.stringify(seen.slice(-400)));
c.close();
