import {connect} from './au1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a); const sl=ms=>new Promise(r=>setTimeout(r,ms));
await c.size(1500,900); await c.load();
L('gb keys',await c.ev(`Object.keys(window.__gb).join(',')`));
await c.ev(`document.querySelectorAll('#side details').forEach(d=>d.open=false)`);
L('subRoughness',await c.ev(`document.getElementById('subRoughness')?.value+' / '+document.getElementById('oSubRoughness')?.textContent`),'scene sub.rough',await c.ev(`JSON.stringify(window.__gb.store.scene.tanks[0].substrate?.rough)`));
// open substrate section
await c.ev(`[...document.querySelectorAll('#side > details, #side details')].find(d=>/substrate/i.test(d.querySelector('summary')?.textContent))?.setAttribute('open','')`); await sl(500);
const r=await c.rect('#subRoughness'); L('slider rect',JSON.stringify(r));
await c.ev(`document.getElementById('subRoughness').scrollIntoView({block:'center'})`); await sl(400);
await c.shot('12-substrate-roughness-default-50');
L('after open',await c.ev(`document.getElementById('subRoughness').value+' / '+document.getElementById('oSubRoughness').textContent`));
// set 0 and reload
await c.ev(`const s=document.getElementById('subRoughness');s.value=0;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}))`); await sl(1500);
L('stored after 0',await c.ev(`JSON.stringify(window.__gb.store.scene.tanks[0].substrate)`));
await c.load('',false); await c.ev(`[...document.querySelectorAll('#side details')].find(d=>/substrate/i.test(d.querySelector('summary')?.textContent))?.setAttribute('open','')`);await sl(500);
L('after reload slider',await c.ev(`document.getElementById('subRoughness').value`));
c.close();
