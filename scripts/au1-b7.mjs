import {connect,starter,clickAt,sleep as sl} from './au1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a);
await c.size(1500,900); await c.load(); await starter(c,'Planted community');
const doors=()=>c.ev(`JSON.stringify(window.__gb.store.scene.tanks[0].tank.stand??null).slice(0,200)`);
L('stand',await doors());
const cases=[['door-handle-1',1050,545],['between-handles-low',1078,700]];
for (const [n,x,y] of cases){ await c.ev(`document.getElementById('side').querySelectorAll('details').forEach(d=>d.open=false)`); await clickAt(c,x,y); L(n,await c.ev(`JSON.stringify([...document.querySelectorAll('#side details[open] > summary')].map(e=>e.textContent.trim().slice(0,20)))`)); await sl(1500); try{await c.shot('15-stand-click-'+n);}catch(e){L('shot fail',e.message)} }
c.close();
