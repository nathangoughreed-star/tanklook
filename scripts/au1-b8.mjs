import {connect,starter,clickAt,sleep as sl} from './au1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a);
await c.size(1500,900); await c.load('?v=1'); 
for (const name of ['Planted community','Reef']) {
  await starter(c,name); await c.click('#sideTab').catch(()=>{}); await sl(1200);
  L(name,'panel collapsed',await c.ev(`document.getElementById('app').classList.contains('collapsed')`));
  await c.ev(`window.__gb.store.cam&&0`);
  await c.shot('16-cabinet-'+name.split(' ')[0]+'-closed');
  c.name=name;
}
c.close();
