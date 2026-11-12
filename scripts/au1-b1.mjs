import {connect} from './au1-lib.mjs';
const c=await connect(); const L=(...a)=>console.log(...a);
await c.size(1500,900); await c.load();
const R=async s=>JSON.stringify(await c.rect(s));
L('open: side',await R('#side'),'grip',await R('#sideGrip'),'tab',await R('#sideTab'),'close',await R('#sideClose'),'toolbar',await R('.viewtools'),'save',await R('#saveIcon'),'undo',await R('#undo'));
await c.shot('01-default-panel-open');
// collapse via arrow tab
await c.click('#sideTab'); await new Promise(r=>setTimeout(r,800));
L('collapsed: tab',await R('#sideTab'),'toolbar',await R('.viewtools'),'save',await R('#saveIcon'),'undo',await R('#undo'),'bar',await R('#hm2Bar'));
await c.shot('02-collapsed-arrow-position',{x:0,y:0,width:700,height:200});
await c.shot('02b-collapsed-full');
// reopen
await c.click('#sideTab'); await new Promise(r=>setTimeout(r,800));
L('reopened side width',(await c.rect('#side')).width);
// drag grip to 450
const g=await c.rect('#sideGrip'); const gx=g.x+g.width/2, gy=300;
const mouse=(t,x,y,b='left')=>c.send('Input.dispatchMouseEvent',{type:t,x,y,button:b,buttons:t==='mouseReleased'?0:1,clickCount:1});
const drag=async(x0,x1)=>{await mouse('mousePressed',x0,gy);for(let i=1;i<=8;i++){await mouse('mouseMoved',x0+(x1-x0)*i/8,gy);}await mouse('mouseReleased',x1,gy);await new Promise(r=>setTimeout(r,600));};
await drag(gx,450); L('after drag to 450 width',(await c.rect('#side')).width, 'ls',await c.ev(`JSON.stringify(Object.entries(localStorage).filter(([k])=>/side|panel|width/i.test(k)))`),'view w',(await c.rect('#view'))?.width);
await c.shot('03-dragged-narrow');
const g2=await c.rect('#sideGrip'); await drag(g2.x+4,1000); L('after drag to 1000 width',(await c.rect('#side')).width); await c.shot('04-dragged-wide');
const g3=await c.rect('#sideGrip'); await drag(g3.x+4,100); L('after drag to 100 (collapse?)',await c.ev(`document.getElementById('app').classList.contains('collapsed')`),(await c.rect('#side'))?.width);
await c.shot('05-dragged-below-min-collapses');
// open from collapsed edge by drag
const g4=await c.rect('#sideGrip'); L('grip collapsed',JSON.stringify(g4)); await drag(g4.x+2,600); L('after drag open collapsed:',await c.ev(`document.getElementById('app').classList.contains('collapsed')`),(await c.rect('#side'))?.width);
await c.shot('06-drag-from-collapsed-edge-opens');
// arrow returns to last dragged width
await c.click('#sideTab'); await new Promise(r=>setTimeout(r,700)); await c.click('#sideTab'); await new Promise(r=>setTimeout(r,700)); L('arrow close/open width (expect ~600)',(await c.rect('#side')).width);
// dblclick reset
const g5=await c.rect('#sideGrip'); const x=g5.x+g5.width/2;
for (const n of [1,2]) { await c.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y:300,button:'left',buttons:1,clickCount:n}); await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y:300,button:'left',buttons:0,clickCount:n}); }
await new Promise(r=>setTimeout(r,600)); L('after dblclick width (expect 700)',(await c.rect('#side')).width);
// reload persistence
await drag((await c.rect('#sideGrip')).x+4,520); const w1=(await c.rect('#side')).width; await c.load('',false); L('persist drag',w1,'after reload',(await c.rect('#side')).width);
c.close();
