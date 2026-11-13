import {connect,starter,sleep} from './fx1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a);
const R=async s=>JSON.stringify(await c.rect(s));
const ov=(a,b)=>a&&b&&a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
async function probe(tag){
  const r={}; for(const s of ['.dq10','.encl','.checks','#side','#mapShow','.viewtools']) r[s]=await c.rect(s);
  L(tag,'dq10',JSON.stringify(r['.dq10']),'encl',JSON.stringify(r['.encl']),'checks',JSON.stringify(r['.checks']),'side',r['#side']?.width,'dq∩encl',ov(r['.dq10'],r['.encl']),'checks∩side',ov(r['.checks'],r['#side']),'checks∩dq',ov(r['.checks'],r['.dq10']),'checks∩map',ov(r['.checks'],r['#mapShow']));
}
await c.size(1500,900); await c.load(); await starter(c,'Planted community'); await sleep(1500);
await probe('1500 pill'); await c.shot('A-desktop-1500-pill-above-water-chip');
await c.ev(`document.querySelector('.checks summary')?.click()`); await sleep(500);
await probe('1500 checks open'); await c.shot('B-desktop-1500-checks-open');
await c.ev(`document.querySelector('.checks summary')?.click()`);
await c.click('.dq10-pill'); await sleep(800); await probe('1500 card'); await c.shot('A-desktop-1500-discover-card-open');
for (const w of [1280,1920]) { await c.size(w,900); await sleep(900); await c.ev(`document.querySelector('.dq10-x')&&0`); await probe(w+' card'); await c.shot(`A-desktop-${w}-discover-card`); }
// wide panel
await c.size(1500,900); await sleep(500);
await c.ev(`document.getElementById('app').style.setProperty('--side-w','1000px')`); await sleep(600); await probe('1500 panel 1000'); await c.shot('B-desktop-1500-panel-dragged-wide');
await c.ev(`document.getElementById('app').style.removeProperty('--side-w')`);
await c.click('#sideTab'); await sleep(800); await probe('collapsed'); await c.shot('B-desktop-1500-panel-collapsed');
// phone
await c.size(375,812,true); await c.load(); await starter(c,'Planted community'); await sleep(1500);
await probe('phone'); await c.shot('A-phone-pill-and-checks');
await c.ev(`document.querySelector('.checks summary')?.click()`); await sleep(500); await probe('phone checks open'); await c.shot('B-phone-checks-open');
c.close();
