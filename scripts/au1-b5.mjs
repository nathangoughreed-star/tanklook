import {connect} from './au1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a); const sl=ms=>new Promise(r=>setTimeout(r,ms));
await c.size(1500,900); await c.load();
await c.click('#openScene'); await sl(500);
await c.ev(`[...document.querySelectorAll('dialog[open] button')].find(b=>/starter tank/.test(b.textContent)).click()`); await sl(1000);
L(await c.ev(`document.querySelector('dialog[open]')?.innerText.slice(0,800)`));
await c.shot('99-starters');
c.close();
