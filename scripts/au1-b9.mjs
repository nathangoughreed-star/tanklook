import {connect,starter,clickAt,sleep as sl} from './au1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a);
await c.size(1500,900); await c.load(); await starter(c,'Reef');
if(!(await c.ev(`document.getElementById('app').classList.contains('collapsed')`))) await c.click('#sideTab'); await sl(1500);
await c.ev(`document.querySelector('.ftHead')?.click()`);
await c.shot('16-cabinet-Reef-closed');
c.close();
