import {connect,starter,clickAt,sleep as sl} from './au1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a);
await c.size(1500,900); await c.load(); await starter(c,'Planted community');
L('tank',await c.ev(`JSON.stringify(window.__gb.store.scene.tanks[0].tank).slice(0,150)`),'fish n',await c.ev(`window.__gb.store.scene.tanks[0].fish?.length`));
await c.shot('13-planted-community-loaded');
L('tile',await c.ev(`[...document.querySelectorAll('.ftHead')].map(e=>e.title+' | '+e.textContent).join(' ;; ')`));
const t=await c.rect('.ftHead'); L('tile rect',JSON.stringify(t));
if(t) await c.shot('14-habitat-check-tile-rename',{x:Math.max(0,t.x-20),y:Math.max(0,t.y-20),width:Math.min(420,1500-t.x),height:260});
c.close();
