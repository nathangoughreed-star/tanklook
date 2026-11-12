import {connect} from './au1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a); const sl=ms=>new Promise(r=>setTimeout(r,ms));
await c.size(1500,900); await c.load();
// sticky undo/redo: open all sections, scroll side
await c.ev(`document.querySelectorAll('#side details').forEach(d=>d.open=true); document.getElementById('side').scrollTop=1200;`); await sl(500);
L('undo after scroll',JSON.stringify(await c.rect('#undo')),'scrollTop',await c.ev(`document.getElementById('side').scrollTop`),'scrollH',await c.ev(`document.getElementById('side').scrollHeight`));
await c.shot('07-undo-redo-sticky-scrolled',{x:0,y:0,width:700,height:300});
await c.ev(`document.getElementById('side').scrollTop=0`);
// save icon vs header save
await c.ev(`window.__saveCalls=[];const oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__saveCalls.push(this.download||this.href.slice(0,30));};const oco=URL.createObjectURL;`);
await c.click('#saveScene'); await sl(800); L('header save ->',await c.ev(`JSON.stringify(window.__saveCalls)+' dialogs:'+[...document.querySelectorAll('dialog[open]')].map(d=>d.id||d.className).join(',')`));
await c.ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());window.__saveCalls=[]`);
await c.click('#saveIcon'); await sl(800); L('icon save ->',await c.ev(`JSON.stringify(window.__saveCalls)+' dialogs:'+[...document.querySelectorAll('dialog[open]')].map(d=>d.id||d.className).join(',')`));
await c.shot('08-save-icon-click');
await c.ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
// View menu
await c.click('#viewBtn'); await sl(600);
L('viewPop hidden?',await c.ev(`document.getElementById('viewPop').hidden`),'light controls:',await c.ev(`JSON.stringify([...document.querySelectorAll('#viewPop input[type=range],#viewPop input[type=checkbox]')].map(e=>e.id))`));
L('toolbar still has light?',await c.ev(`JSON.stringify([...document.querySelectorAll('.viewtools input,.viewtools label')].map(e=>e.id||e.textContent.slice(0,20)))`));
await c.shot('09-view-menu-open');
await c.ev(`document.getElementById('viewPop').scrollTop=9999`);
c.close();
