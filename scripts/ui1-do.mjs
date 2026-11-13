// usage: node scripts/ui1-do.mjs "<js to run>" [shotname|-] [waitMs] [scope: all|side]
import { connect, sleep } from './ui1-lib.mjs';
const [js, name, wait = '1000', scope = 'top'] = process.argv.slice(2);
const c = await connect(); const { ev, shot } = c;
const vis = String.raw`((scope)=>{const out=[];const ok=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!e.closest('[hidden]')&&s.display!=='none'};
const dlg=document.querySelector('dialog[open]'); let root=scope==='side'?document.getElementById('side'):dlg||document.body;
for(const e of root.querySelectorAll('button,select,input,summary,a,[role=tab],[role=button]')){ if(!ok(e))continue; if(!dlg&&scope==='top'&&e.closest('#side'))continue;
 const t=(e.textContent||e.value||e.getAttribute('aria-label')||e.placeholder||'').trim().replace(/\s+/g,' ').slice(0,45); out.push((e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+String(e.className).split(' ')[0])+'['+t+']');}
const ov=[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e);return (s.position==='fixed'||s.position==='absolute')&&ok(e)&&e.getBoundingClientRect().width>250&&e.getBoundingClientRect().height>150&&e.id&&e.tagName!=='CANVAS'}).map(e=>'#'+e.id);
return 'dlg:'+(dlg?dlg.id:'-')+' overlays:'+ov.join(',')+'\n'+out.join(' | ')})`;
if (js && js !== '-') console.log('eval ->', JSON.stringify(await ev(js)));
await sleep(+wait);
if (name && name !== '-') await shot(`research/screens/UI1/${name}.png`);
console.log((await ev(`${vis}('${scope}')`)).slice(0, 3000));
c.close();
