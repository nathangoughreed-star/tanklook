import {connect,starter,sleep as sl} from './au1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a);
await c.size(1500,900); await c.load(); await starter(c,'Iwagumi');
await c.ev(`document.querySelectorAll('#side details').forEach(d=>{if(/substrate/i.test(d.querySelector('summary')?.textContent))d.open=true})`); await sl(600);
await c.ev(`document.getElementById('subRoughness').scrollIntoView({block:'center'})`); await sl(500);
L('rough',await c.ev(`document.getElementById('subRoughness').value+' '+document.getElementById('oSubRoughness').textContent`));
await c.shot('12-substrate-roughness-default-50',{x:0,y:0,width:700,height:900});
c.close();
