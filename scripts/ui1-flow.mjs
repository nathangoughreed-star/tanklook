import { connect, sleep, URL } from './ui1-lib.mjs';
const c = await connect(); const { ev, send, shot, size } = c;
export const vis = `(()=>{const out=[];const ok=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!e.closest('[hidden]')};
for(const e of document.querySelectorAll('button,select,input,summary,a,[role=tab]')){ if(!ok(e))continue; const t=(e.textContent||e.value||e.getAttribute('aria-label')||e.placeholder||'').trim().replace(/\s+/g,' ').slice(0,40); out.push((e.id?'#'+e.id:e.tagName.toLowerCase()+(e.className?'.'+String(e.className).split(' ')[0]:''))+'['+t+']');}
return out.join(' | ')})()`;
const step = async (name, js, wait = 900, file) => { if (js) await ev(js); await sleep(wait); if (file) await shot(`research/screens/UI1/${file}.png`); console.log('\n## ' + name + ' | dlg:' + await ev(`[...document.querySelectorAll('dialog[open]')].map(d=>d.id).join(',')`) + '\n' + (await ev(vis)).slice(0, 2500)); };
await size(1600, 900);
await send('Page.navigate', { url: URL }); await sleep(2000);
await ev(`localStorage.clear(); true`); await send('Page.navigate', { url: URL });
for (let i = 0; i < 120; i++) { if (await ev(`!!window.__gb`).catch(() => false)) break; await sleep(1000); }
await sleep(2500);
await step('home', null, 100, '01-start-home');
await step('new', `document.getElementById('startNew').click()`, 900, '02-start-new-habitat');
await step('starters', `document.getElementById('startBack').click(); document.getElementById('startStarters').click()`, 1500, '03-start-starters');
await step('open', `document.getElementById('startBack').click(); document.getElementById('startOpen').click()`, 800, '04-start-open-existing');
await step('deals', `document.getElementById('startBack').click(); document.getElementById('startNew').click(); document.getElementById('startDeals').click()`, 2000, '05-start-deals');
c.close();
