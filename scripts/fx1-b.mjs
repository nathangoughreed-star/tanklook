// FX1 verification runs against the real app (dev server 5199, headless Chrome 9411). Usage: node scripts/fx1-b.mjs <3|11|12|cab|9|27|7>
import {connect,starter,sleep} from './fx1-lib.mjs';
import {readFileSync} from 'node:fs';
const c=await connect(); const L=(...a)=>console.log(...a);
const collapse=async()=>{ if(!(await c.ev(`document.getElementById('app').classList.contains('collapsed')`))) await c.click('#sideTab'); await sleep(1200); };
const loadScene=async f=>{ await c.send('Page.navigate',{url:'http://localhost:5199/'}); await sleep(1500); await c.ev(`localStorage.setItem('tanklook.scene', ${JSON.stringify(readFileSync(f,'utf8'))}); 1`); await c.load('',false); await collapse(); };
const only=process.argv[2];
const run=(k,f)=>(!only||only===k)?f():0;
await c.size(1500,900);
await run('3',async()=>{
  for (const [n,f] of [['glass-edge','research/visual/vf0/scenes/glass-edge.json'],['iwagumi','research/visual/vf0/scenes/iwagumi.json']]) { await loadScene(f); await sleep(2500); await c.shot('03-embed-'+n); }
});
await run('11',async()=>{
  await c.load(); await starter(c,'Planted community'); await collapse();
  await c.click('#rulesSandbox'); await sleep(900);
  L('sandbox checks text', await c.ev(`document.querySelector('.checks')?.innerText`));
  await c.ev(`document.querySelector('.checks summary')?.click()`); await sleep(500);
  L('sandbox open', await c.ev(`document.querySelector('.checks')?.innerText`));
  await c.shot('11-sandbox-checks-strip');
  await c.click('#rulesGuided'); await sleep(900); L('guided', await c.ev(`document.querySelector('.checks')?.innerText`)); await c.shot('11-guided-checks-strip');
});
await run('12',async()=>{
  await c.load('?ab=1'); await starter(c,'Planted community');
  await c.ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Discover')?.click()`); await sleep(2500);
  L('frozen before', await c.ev(`__gb.store.frozen`), 'pill/card', await c.ev(`!!document.querySelector('.dq10')&&!document.querySelector('.dq10').hidden`));
  await c.shot('12-before-reload-ab1');
  await c.load('',false); await sleep(2000);
  L('after resume (no ?ab): frozen', await c.ev(`__gb.store.frozen`), 'dq10 visible', await c.ev(`!!document.querySelector('.dq10')&&!document.querySelector('.dq10').hidden`));
  await c.shot('12-resume-no-ab');
});
await run('cab',async()=>{
  await c.size(1500,1400); await c.load(); await starter(c,'Planted community'); await collapse();
  const setup=(rows,cabinet=true)=>c.ev(`(()=>{const {store}=__gb; store.update(s=>{const t=s.tanks[0]; t.stand={...t.stand,show:${cabinet},style:'cabinet'}; t.water.on=true; t.tech={...(t.tech??{}),rows:{...(t.tech?.rows??{}),...${JSON.stringify(rows)}}};}); return 1})()`);
  const doors=async o=>{ await c.ev(`import('/src/render/tankView.ts').then(m=>{m.tankView.standOpen=${o}; __gb.viewer.rebuild()})`); await sleep(1200); };
  const cam=(az,el)=>c.ev(`__gb.store.update(s=>{s.tanks[0].camera={...s.tanks[0].camera,az:${az},el:${el}}},{history:false})`);
  await setup({}); await c.ev(`__gb.store.update(s=>{const t=s.tanks[0]; t.grow={...t.grow,feed:'co2'}})`); await sleep(2500);
  L('cabinetGear', await c.ev(`import('/src/scene/cabinetGear.ts').then(m=>JSON.stringify(m.cabinetGear(__gb.store.tank)))`));
  await cam(0,-8); await doors(true); await c.shot('30-cabinet-co2-canister-doors-open');
  await cam(180,-8); await doors(false); await c.shot('31-cabinet-back-view-closed');
  await cam(180,-8); await doors(true); await c.shot('31-cabinet-back-view-doors-open');
  await cam(165,-20); await sleep(800); await c.shot('31-cabinet-back-view-from-above-hoses');
  await setup({filter:'sump'}); await sleep(1500);
  L('sump gear', await c.ev(`import('/src/scene/cabinetGear.ts').then(m=>JSON.stringify(m.cabinetGear(__gb.store.tank)))`));
  await cam(0,-8); await doors(true); await c.shot('30-cabinet-sump-doors-open');
  await c.ev(`__gb.store.update(s=>{s.tanks[0].stand={...s.tanks[0].stand,show:false}})`); await sleep(1200); await c.shot('30-no-cabinet-gear-visible');
});
await run('9',async()=>{
  await c.load(); await starter(c,'Planted community'); await collapse();
  await c.ev(`(async()=>{const {store}=__gb; const {lockObject,lockRoster}=await import('/src/scene/locks.ts');
    store.update(s=>{const t=s.tanks[0]; t.tank={...t.tank,L:609.6,D:304.8,H:406.4}; const f=structuredClone(t.fish[0]); f.species='oscar'; f.uid='f-oscar'; t.fish=[f]; lockRoster(t,'oscar','exact',1); if(t.items[0]?.uid) lockObject(t,t.items[0].uid);}); return 1})()`);
  await sleep(1200);
  await c.ev(`(document.querySelector('.dq10-pill'))?.click()`); await sleep(500);
  await c.ev(`document.querySelector('[data-a=finish]')?.click()`);
  for(let i=0;i<90;i++){ if(await c.ev(`!!document.querySelector('.dq10-nofit, .dq10-prev')`)) break; await sleep(1000); }
  await sleep(1500);
  L('conflict', (await c.ev(`document.querySelector('.dq10')?.innerText`)).replace(/\n/g,' | ').slice(0,500));
  await c.shot('09-conflict-card-kept-20gal-oscar');
});
await run('27',async()=>{
  await c.load(); await starter(c,'Planted community'); await collapse();
  const set=js=>c.ev(`(()=>{__gb.store.update(s=>{const t=s.tanks[0]; ${js}}); return 1})()`);
  const plantItem=`{id:901,kind:'plant',variant:'sword',seed:1,x:300,depth:150,lift:0,yaw:0,pitch:0,tilt:0,size:200}`;
  const fishOf=(sp,id)=>`{id:${id},species:'${sp}',x:300,y:20,depth:150,yaw:0,pitch:0,roll:0,bend:0}`;
  const shotChecks=async n=>{ await sleep(3000); await c.ev(`(()=>{const d=document.querySelector('.checks details'); if(d&&!d.open) d.querySelector('summary').click()})()`); await sleep(600); await c.ev(`(()=>{const m=document.querySelector('.checks .ck-more'); if(m&&!m.open) m.querySelector('summary').click()})()`); await sleep(600); L(n, ((await c.ev(`document.querySelector('.checks')?.innerText`))||'').replace(/\n/g,' | ').slice(0,700)); await c.shot(n); };
  await set(`t.fish=[]; t.substrate={...t.substrate,type:'aragonite',fl:127,fr:127,bl:127,br:127};`); await shotChecks('27-anaerobic-5in-sand');
  await set(`t.substrate={...t.substrate,show:true,type:'gravel',fl:25.4,fr:25.4,bl:25.4,br:25.4}; t.items=[...t.items,${plantItem}];`); await shotChecks('27-plant-depth-sword-1in-gravel');
  await set(`t.items=t.items.filter(i=>i.id!==901); t.substrate={...t.substrate,type:'gravel',fl:50.8,fr:50.8,bl:50.8,br:50.8}; t.fish=[${fishOf('kuhli',902)}];`); await shotChecks('27-kuhli-on-gravel');
  await set(`t.substrate={...t.substrate,type:'coral'}; t.fish=[${fishOf('bronzecory',903)}];`); await shotChecks('27-cory-on-crushed-coral');
  await set(`t.fish=[]; t.substrate={...t.substrate,type:'aragonite',fl:127,fr:127,bl:127,br:127};`); await shotChecks('27-anaerobic-5in-sand');
});
await run('7',async()=>{
  await c.load(); await starter(c,'Planted community'); await collapse();
  await c.ev(`document.querySelector('.dq10-pill')?.click()`); await sleep(400);
  await c.ev(`document.querySelector('[data-a=finish]')?.click()`);
  for(let i=0;i<90;i++){ if(await c.ev(`!!document.querySelector('.dq10-prev, .dq10-nofit')`)) break; await sleep(1000); }
  await sleep(1000);
  await c.ev(`[...document.querySelectorAll('.dq10 button')].find(b=>/^Regenerate/.test(b.textContent.trim()))?.click()`); await sleep(6000);
  await c.ev(`document.querySelector('.dq13-open')?.click()`); await sleep(1500);
  L('compare cols', await c.ev(`document.querySelectorAll('.dq13-col').length`), 'imgs in compare', await c.ev(`document.querySelectorAll('.dq13-cmp img, .dq13-cmp canvas').length`), 'buttons', await c.ev(`[...document.querySelectorAll('.dq10 button')].map(b=>b.textContent.trim()).join(',')`));
  await c.shot('07-compare-card-not-covered');
  L('rects', JSON.stringify(await c.rect('.dq10')), JSON.stringify(await c.rect('.checks')));
});
c.close();
