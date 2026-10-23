// Builds the v4 stocking survey from scenarios-v4.json: survey-v4.html (people: buttons only, autosave, export) and
// survey-v4-llm-<module>.md + survey-v4-llm-all.md (LLM experts: text scenarios, one JSON answer per module).
// Plain node, no dependencies: `node research/calib/v4/make-survey-v4.mjs` (writes beside itself).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)); // a folder with a space ("Glass Box") reads as %20 in a URL's pathname
const J = JSON.parse(fs.readFileSync(path.join(here, 'scenarios-v4.json'), 'utf8'));

// ---------- build id: a hash of the tanks and stocks, so answers are tied to the scenarios they answered ----------
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
const BUILD = fnv(JSON.stringify(J.scenarios.map(s => [s.id, s.tank, J.tanks[s.tank].in, s.env, s.stock, s.focal ?? null, s.ask])));

// ---------- helpers ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sp = id => J.species[id];
const plural = (n, id) => { const nm = sp(id).name; if (n === 1) return nm; const l = nm.toLowerCase(); if (/(s|fish|shrimp)$/.test(l)) return nm; if (/(ch|sh|x)$/.test(l)) return nm + 'es'; if (/[^aeiou]y$/.test(l)) return nm.slice(0, -1) + 'ies'; return nm + 's'; };
const lower = id => plural(2, id).toLowerCase();
const mm = v => `${v} mm (${(v / 25.4).toFixed(1)} in)`;
function tankLine(key) {
  const t = J.tanks[key], [L, D, H] = t.in, cu = L * D * H, gal = cu / 231, l = cu * 0.0163871, floor = L * D;
  return { name: t.name, kind: t.kind, dims: `${L} x ${D} x ${H} in (${Math.round(L * 2.54)} x ${Math.round(D * 2.54)} x ${Math.round(H * 2.54)} cm, L x D x H)`,
    vol: `${gal.toFixed(gal < 10 ? 1 : 0)} gal / ${Math.round(l)} L`, floor: `${floor} sq in (${(floor / 144).toFixed(2)} sq ft)` };
}
function envLine(s) {
  const e = s.env, t = J.tanks[s.tank];
  const w = e.water === 'fresh' ? 'Fresh water' : e.water === 'salt' ? 'Salt water' : e.water === 'half' ? 'Half land, half water' : t.kind === 'terrarium' ? 'Terrarium, no standing water beyond a dish' : 'No water';
  const parts = [w];
  if (e.tempC) parts.push(`water ${e.tempC} °C (${Math.round(e.tempC * 9 / 5 + 32)} °F)`);
  if (e.planted) parts.push('planted');
  if (e.note) parts.push(e.note);
  return parts.join('; ');
}
function sexText(x) { if (!x.sex) return ''; if (x.sex === 'm') return x.n === 1 ? 'male' : 'all males'; if (x.sex === 'f') return x.n === 1 ? 'female' : 'all females'; return `${x.sex[0]} male${x.sex[0] === 1 ? '' : 's'}, ${x.sex[1]} female${x.sex[1] === 1 ? '' : 's'}`; }
function stockRows(s) {
  return s.stock.map(x => { const z = sp(x.id); const len = z.ftl && z.ftl !== z.tl ? `${mm(z.tl)} male, ${mm(z.ftl)} female` : mm(z.tl);
    return { n: x.n, name: plural(x.n, x.id), sex: sexText(x), note: x.note || '', len, lives: z.lives, id: x.id, focal: s.focal === x.id }; });
}
const ASSUME = 'Assume: adults at the lengths shown, no breeding counted, sexes as listed. Filtration, water changes, heating, lighting and furnishing (plants, cover, hides, sight breaks, rockwork) are whatever these animals need: never the limit. Judge these animals, at these counts, in this tank.';
const VERDICTS = [['ideal', 'Ideal', 'comfortable long term with ordinary care'], ['caution', 'Caution', 'workable but past ideal: tread carefully'], ['problems', 'Problems likely', 'long-term trouble even with good care'], ['unworkable', 'Not workable', 'as described, no']];
const CHANGES = [['nothing', 'Nothing'], ['fewer', 'Fewer of ...'], ['bigger', 'Bigger tank'], ['drop', 'Drop ...'], ['ratio', 'Group size or sex ratio'], ['notroom', 'Not room: food, maturity or habitat'], ['other', 'Something else (note)']];
const TOGETHER = [['yes', 'Yes'], ['caution', 'With caution'], ['no', 'No']];
const REASONS = [['eat', 'Would eat or injure'], ['nip', 'Fin nipping or harassment'], ['aggression', 'Aggression or territory'], ['temperature', 'Temperature'], ['chemistry', 'Water chemistry (pH, hardness, salt)'], ['habitat', 'Humidity or habitat'], ['food', 'Food or diet'], ['disease', 'Disease or toxins'], ['breeding', 'Breeding or sex mix'], ['other', 'Other (note)']];
const CONF = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];
const KINDS = [['keeper', 'Fishkeeper / herp keeper'], ['professional', 'Professional (shop, breeder, vet)'], ['ai', 'AI model']];

// ---------- HTML ----------
function scenarioCard(s) {
  const t = tankLine(s.tank), rows = stockRows(s);
  return `<div class="card">
<div class="tank"><b>${esc(t.name)}</b> <span class="dim">${esc(t.dims)}</span><br><span class="dim">${esc(t.vol)} · floor ${esc(t.floor)}</span></div>
<div class="env">${esc(envLine(s))}</div>
<table class="stock"><thead><tr><th>#</th><th>Animal</th><th>Adult length</th><th>Lives</th></tr></thead><tbody>
${rows.map(r => `<tr${r.focal ? ' class="focal"' : ''}><td>${r.n}</td><td>${esc(r.name)}${r.sex ? ` <i>(${esc(r.sex)})</i>` : ''}${r.note ? ` <i>(${esc(r.note)})</i>` : ''}</td><td>${esc(r.len)}</td><td>${esc(r.lives)}</td></tr>`).join('\n')}
</tbody></table>
<div class="assume">Assume adults as listed, no breeding counted. Filtration, water changes, heat, light and furnishing (plants, cover, hides, rockwork) are never the limit.</div>
</div>`;
}
const btns = (q, opts, cls = 'b') => opts.map(([v, l, d]) => `<button class="${cls}" data-q="${q}" data-v="${esc(v)}"${d ? ` title="${esc(d)}"` : ''}>${esc(l)}</button>`).join('');
function questions(s) {
  const q = [], names = id => plural(2, id), speciesChips = (qn) => s.stock.map(x => `<button class="chip" data-q="${qn}" data-v="${x.id}">${esc(names(x.id))}</button>`).join('');
  q.push(`<div class="q"><div class="ql">1. Your verdict on this tank as shown</div><div class="opts">${btns('verdict', VERDICTS)}<button class="b skip" data-q="verdict" data-v="skip" title="Nothing else is asked for this tank">I don't know these animals well enough: skip</button></div>
</div>`);
  let n = 2;
  if (s.ask.includes('change')) q.push(`<div class="q"><div class="ql">${n++}. The first thing you would change</div><div class="opts">${btns('change', CHANGES)}</div>
<div class="sub" data-show="change=fewer"><span>Fewer of:</span> ${speciesChips('changeSp')}</div><div class="sub" data-show="change=drop"><span>Drop:</span> ${speciesChips('changeSp')}</div></div>`);
  if (s.ask.includes('compat')) {
    const one = new Set(s.stock.map(x => x.id)).size === 1;
    q.push(`<div class="q"><div class="ql">${n++}. ${one ? `Keep these ${s.stock[0].n} ${esc(lower(s.stock[0].id))} together long term?` : 'Keep these species together long term?'}</div><div class="opts">${btns('together', TOGETHER)}</div>
<div class="sub" data-show="together=caution,no"><span>Why (all that apply):</span> ${REASONS.map(([v, l]) => `<button class="chip" data-q="reasons" data-v="${v}">${esc(l)}</button>`).join('')}</div>
${!one && s.stock.length > 2 ? `<div class="sub" data-show="together=caution,no"><span>The problem is with:</span> ${speciesChips('problem')}</div>` : ''}</div>`);
  }
  if (s.ask.includes('counts')) {
    const others = s.stock.filter(x => x.id !== s.focal);
    q.push(`<div class="q"><div class="ql">${n++}. ${others.length ? `With the others as shown, how many <b>${esc(lower(s.focal))}</b> here?` : `How many <b>${esc(lower(s.focal))}</b> in this tank?`}</div>
<div class="opts counts"><label>Ideal <input type="number" min="0" step="1" inputmode="numeric" data-q="ideal"></label><label>At most <input type="number" min="0" step="1" inputmode="numeric" data-q="limit"></label></div>
<div class="sub always"><span>or, instead of numbers:</span> <button class="chip" data-q="countStatus" data-v="cant-say">Can't say</button><button class="chip" data-q="countStatus" data-v="no-valid-count">No count works as described</button></div>
<div class="hint">Ideal = what you would aim for; at most = past this, long-term problems become likely; 0 is valid.</div></div>`);
  }
  if (s.ask.includes('min')) {
    const m = s.min;
    q.push(`<div class="q"><div class="ql">${n++}. Is this tank big enough for an adult <b>${esc(sp(m.species).name.toLowerCase())}</b> at all?</div><div class="opts">${btns('bigEnough', [['yes', 'Yes'], ['no', 'No']])}</div>
<div class="sub always"><span>Smallest you would use for ${esc(lower(m.species))}${m.label ? ` ${esc(m.label)}` : ', as stocked here'}:</span> ${m.sizes.map(z => `<button class="chip one" data-q="smallest" data-v="${esc(z)}">${esc(z)}</button>`).join('')}<button class="chip one" data-q="smallest" data-v="larger">Larger than these</button></div></div>`);
  }
  if (s.ask.includes('max')) for (const m of s.max) q.push(`<div class="q"><div class="ql">${n++}. Most <b>${esc(lower(m.species))}</b> you would keep in this tank${m.label ? `, ${esc(m.label)}` : ', whatever else is in it'}</div><div class="opts">${m.options.map(o => `<button class="b" data-q="max:${m.species}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`);
  if (s.ask.includes('maxMales')) for (const m of s.maxMales) q.push(`<div class="q"><div class="ql">${n++}. Most <b>male ${esc(lower(m.species))}</b> in this tank</div><div class="opts">${m.options.map(o => `<button class="b" data-q="maxMales:${m.species}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`);
  q.push(`<div class="q"><div class="ql">${n++}. How sure are you?</div><div class="opts">${btns('confidence', CONF)}</div></div>`);
  q.push(`<div class="q note"><div class="ql" style="display:inline-block;margin-right:8px">Note (optional)</div><textarea data-q="note" rows="1" placeholder="Anything the buttons could not say"></textarea></div>`);
  return q.join('\n');
}

const SCN = J.scenarios.map(s => ({ id: s.id, module: s.module, tank: s.tank, focal: s.focal ?? null, ask: s.ask, stock: s.stock, pairOf: s.pairOf ?? null }));
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stocking survey v4</title>
<style>
:root{--ink:#1d2430;--mute:#5d6673;--line:#d9dee5;--bg:#f5f7fa;--card:#fff;--acc:#1f6feb;--on:#1f6feb;--onInk:#fff;--warn:#b26a00}
*{box-sizing:border-box}body{margin:0;font:14px/1.35 system-ui,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg)}
header{display:flex;gap:12px;align-items:center;padding:5px 14px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
header .t{font-weight:600}header .p{color:var(--mute)}header .sp{flex:1}header .muted{color:var(--mute);font-size:12px;margin-right:6px}
button{font:inherit;cursor:pointer}
.b,.chip{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:6px;padding:4px 9px;margin:2px 3px 2px 0}
.b.on,.chip.on{background:var(--on);border-color:var(--on);color:var(--onInk)}
.b.skip{border-style:dashed;color:var(--mute)}.b.skip.on{background:#6b7280;border-color:#6b7280}
.chip{padding:2px 8px;font-size:12.5px;border-radius:12px}
.nav{border:1px solid var(--line);background:var(--card);border-radius:6px;padding:6px 14px}.nav.primary{background:var(--acc);color:#fff;border-color:var(--acc)}
main{max-width:1340px;margin:0 auto;padding:8px 14px}
.grid{display:grid;grid-template-columns:minmax(340px,400px) 1fr;gap:12px;align-items:start}
@media (max-width:900px){.grid{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.tank b{font-size:16px}.dim{color:var(--mute)}.env{margin:6px 0 8px;color:var(--ink)}
table.stock{border-collapse:collapse;width:100%;font-size:12.5px}table.stock th{text-align:left;color:var(--mute);font-weight:500;border-bottom:1px solid var(--line);padding:3px 6px 3px 0}
table.stock td{padding:2px 6px 2px 0;border-bottom:1px solid #eef1f4;vertical-align:top}table.stock tr.focal td{background:#eef4ff}table.stock td:first-child{font-weight:600;white-space:nowrap}
.assume{margin-top:6px;font-size:11.5px;color:var(--mute);line-height:1.3}
.q{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:4px 10px 5px;margin-bottom:4px}
.ql{font-weight:600;margin-bottom:2px}.opts{display:flex;flex-wrap:wrap;align-items:center}.hint{font-size:11px;color:var(--mute);margin-top:1px}
.sub{display:none;margin-top:2px;padding-top:2px;border-top:1px dashed var(--line)}.sub.always,.sub.show{display:block}.sub>span{color:var(--mute);margin-right:4px}
.counts label{margin-right:14px}.counts input{width:70px;font:inherit;padding:4px 6px;border:1px solid var(--line);border-radius:6px;margin-left:4px}
.q.note textarea{width:calc(100% - 120px);vertical-align:middle}textarea{width:100%;font:inherit;padding:4px 6px;border:1px solid var(--line);border-radius:6px;resize:vertical}
.off .q:not(:first-child){opacity:.35;pointer-events:none}
.start{max-width:760px;margin:20px auto}.start h1{font-size:20px;margin:0 0 8px}.start p{margin:6px 0}.start label{display:block;margin:8px 0 4px;font-weight:600}
.start input[type=text]{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;width:280px}
.mods .b{display:block;width:100%;text-align:left;margin:4px 0;padding:8px 10px}.mods .b small{display:block;color:inherit;opacity:.8;font-weight:400}
.foot{display:flex;gap:8px;align-items:center;margin:10px 0 20px;flex-wrap:wrap}.foot .sp{flex:1}.foot .muted{color:var(--mute);font-size:12px}
.done{background:#e8f5e9;border-color:#a5d6a7}
</style></head><body>
<header><span class="t">Stocking survey v4</span><span class="p" id="prog"></span><span class="sp"></span><span class="muted" id="open"></span><button class="nav" id="prev" hidden>Previous</button><button class="nav primary" id="next" hidden>Next</button><button class="nav" id="toStart">Start page</button><button class="nav" id="export">Export answers</button></header>
<main>
<section class="start" id="start">
<h1>Stocking and compatibility survey, v4</h1>
<p>${J.scenarios.length} tanks in four modules, each described in words (no picture: a camera angle or the decor changes how full a tank looks). Answer only the modules you know; skip any tank whose animals you do not know. <b>Every question is a button</b> except the two count boxes. Answers save in this browser as you go; <b>Export answers</b> downloads a file to send back.</p>
<p><b>The scale.</b> ${esc(J.scale)} Caution lies between the two.</p>
<p>${esc(ASSUME)}</p>
<label>Your name or initials (only to tell answer files apart)</label><input type="text" id="who" placeholder="e.g. ngr">
<label>Answering as</label><div class="opts" id="kind">${KINDS.map(([v, l]) => `<button class="b" data-v="${v}">${esc(l)}</button>`).join('')}</div>
<label>Modules you will answer (pick one or more)</label><div class="mods" id="mods">${J.modules.map(m => `<button class="b" data-v="${m.id}">${esc(m.id)}. ${esc(m.name)}<small>${esc(m.for)}</small></button>`).join('')}</div>
<div class="foot"><button class="nav primary" id="go">Start</button><button class="nav" id="importBtn">Import answers</button><input type="file" id="importFile" accept="application/json" hidden><span class="sp"></span><button class="nav" id="reset">Start over</button></div>
<p class="muted">Build ${BUILD}. Tanks and counts never change inside a build; an answer file from another build is kept apart, never loaded onto these tanks.</p>
</section>
<section id="tank" hidden>
<div class="grid"><div id="left"></div><div id="right"></div></div>

</section>
</main>
<script>
const BUILD=${JSON.stringify(BUILD)}, KEY='calib-v4-'+BUILD, SCN=${JSON.stringify(SCN)};
const CARDS=${JSON.stringify(Object.fromEntries(J.scenarios.map(s => [s.id, scenarioCard(s)])))};
const QS=${JSON.stringify(Object.fromEntries(J.scenarios.map(s => [s.id, questions(s)])))};
const $=id=>document.getElementById(id);
let S=load(); function load(){try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j&&j.build===BUILD)return j;}catch(e){}return{survey:'v4',build:BUILD,expert:'',expertKind:null,modules:[],answers:{},carried:[],made:null};}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
let list=[],i=0,t0=0;
function order(){list=SCN.filter(s=>S.modules.includes(s.module)).map(s=>s.id);}
function ans(id){return S.answers[id]||(S.answers[id]={});}
function openIds(){return list.filter(id=>{const a=S.answers[id];return!(a&&(a.verdict||a.skip));});}
// start page
$('who').value=S.expert||'';$('who').oninput=e=>{S.expert=e.target.value;save();};
for(const b of $('kind').querySelectorAll('button')){b.classList.toggle('on',S.expertKind===b.dataset.v);b.onclick=()=>{S.expertKind=b.dataset.v;save();for(const x of $('kind').querySelectorAll('button'))x.classList.toggle('on',S.expertKind===x.dataset.v);};}
for(const b of $('mods').querySelectorAll('button')){b.classList.toggle('on',S.modules.includes(b.dataset.v));b.onclick=()=>{const v=b.dataset.v;S.modules=S.modules.includes(v)?S.modules.filter(x=>x!==v):[...S.modules,v].sort();b.classList.toggle('on');save();};}
$('go').onclick=()=>{if(!S.modules.length){alert('Pick at least one module.');return;}if(!S.expertKind){alert('Pick who is answering.');return;}order();const o=openIds();i=o.length?list.indexOf(o[0]):0;show();};
$('toStart').onclick=()=>{$('tank').hidden=true;$('start').hidden=false;$('prog').textContent='';$('open').textContent='';$('prev').hidden=$('next').hidden=true;};
$('prev').onclick=()=>{if(i>0){i--;show();}};
$('next').onclick=()=>{if(i<list.length-1){i++;show();}else{$('toStart').click();alert(openIds().length?openIds().length+' tank(s) still open: '+openIds().join(', '):'All '+list.length+' tanks answered. Export answers to send them back.');}};
function show(){const id=list[i],a=ans(id);t0=Date.now();$('start').hidden=true;$('tank').hidden=false;$('prev').hidden=$('next').hidden=false;$('next').textContent=i<list.length-1?'Next':'Finish';$('prog').textContent=id+' · '+(i+1)+' of '+list.length+' · module '+SCN.find(s=>s.id===id).module;
$('left').innerHTML=CARDS[id];$('right').innerHTML=QS[id];const R=$('right');R.classList.toggle('off',!!a.skip);
for(const b of R.querySelectorAll('button[data-q]')){const q=b.dataset.q,v=b.dataset.v;b.classList.toggle('on',isOn(a,q,v));b.onclick=()=>{toggle(a,q,v,b);paint(R,a);touch(a);};}
for(const inp of R.querySelectorAll('input[type=number]')){inp.value=a[inp.dataset.q]??'';inp.oninput=()=>{const v=inp.value===''?null:Math.max(0,Math.round(+inp.value));a[inp.dataset.q]=v;if(v!==null)delete a.countStatus;paint(R,a);touch(a);};}
const ta=R.querySelector('textarea');ta.value=a.note||'';ta.oninput=()=>{a.note=ta.value;touch(a);};
paint(R,a);$('open').textContent=openIds().length+' open of '+list.length;window.scrollTo(0,0);}
const MULTI=new Set(['changeSp','reasons','problem']);
function isOn(a,q,v){if(MULTI.has(q))return Array.isArray(a[q])&&a[q].includes(v);if(q==='verdict'&&v==='skip')return!!a.skip;if(q==='countStatus')return a.countStatus===v;return a[q]===v;}
function toggle(a,q,v,b){if(q==='verdict'&&v==='skip'){a.skip=!a.skip;if(a.skip)delete a.verdict;return;}
if(q==='verdict')delete a.skip;
if(MULTI.has(q)){const arr=Array.isArray(a[q])?a[q]:[];a[q]=arr.includes(v)?arr.filter(x=>x!==v):[...arr,v];return;}
if(q==='countStatus'){if(a.countStatus===v)delete a.countStatus;else{a.countStatus=v;a.ideal=null;a.limit=null;}return;}
if(q==='change'&&a.change!==v)a.changeSp=[];
a[q]=a[q]===v?null:v;}
function paint(R,a){R.classList.toggle('off',!!a.skip);for(const b of R.querySelectorAll('button[data-q]'))b.classList.toggle('on',isOn(a,b.dataset.q,b.dataset.v));
for(const d of R.querySelectorAll('.sub[data-show]')){const [q,vs]=d.dataset.show.split('=');d.classList.toggle('show',vs.split(',').includes(String(a[q])));}
for(const inp of R.querySelectorAll('input[type=number]'))if(a.countStatus)inp.value='';}
function touch(a){a.ms=(a.ms||0)+(Date.now()-t0);t0=Date.now();S.made=new Date().toISOString();save();$('open').textContent=openIds().length+' open of '+list.length;}
function clean(){const out={};for(const [id,a] of Object.entries(S.answers)){const c={};for(const [k,v] of Object.entries(a)){if(v===null||v===''||(Array.isArray(v)&&!v.length))continue;const m=/^(max|maxMales):(.+)$/.exec(k);if(m){(c[m[1]]=c[m[1]]||{})[m[2]]=v;continue;}c[k]=v;}if(Object.keys(c).length)out[id]=c;}return out;}
function exportFile(){const data={survey:'v4',build:BUILD,expert:S.expert||'anon',expertKind:S.expertKind,modules:S.modules,made:new Date().toISOString(),source:'survey-v4.html',answers:clean(),carried:S.carried||[]};
const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='survey-v4-'+(S.expert||'anon').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.json';a.click();}
$('export').onclick=exportFile;
$('importBtn').onclick=()=>$('importFile').click();
$('importFile').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{let j;try{j=JSON.parse(t);}catch(x){alert('Not a JSON answers file.');return;}
if(j.build===BUILD&&j.survey==='v4'){const flat={};for(const [id,a] of Object.entries(j.answers||{})){const f={};for(const [k,v] of Object.entries(a)){if((k==='max'||k==='maxMales')&&v&&typeof v==='object'){for(const [s,x] of Object.entries(v))f[k+':'+s]=x;}else f[k]=v;}flat[id]=f;}S.answers=Object.assign({},S.answers,flat);S.expert=j.expert||S.expert;S.expertKind=j.expertKind||S.expertKind;S.modules=[...new Set([...(S.modules||[]),...(j.modules||[])])].sort();save();location.reload();}
else{S.carried=[...(S.carried||[]),{file:f.name,build:j.build,survey:j.survey,answers:j.answers}];save();alert('That file answers another build ('+j.build+'). Kept apart; it will travel inside your export, not onto these tanks.');}});e.target.value='';};
$('reset').onclick=()=>{if(!confirm('Download the answers so far, then clear this browser\\'s copy?'))return;exportFile();localStorage.removeItem(KEY);location.reload();};
</script></body></html>`;
fs.writeFileSync(path.join(here, 'survey-v4.html'), html);

// ---------- LLM packs ----------
function scenarioText(s) {
  const t = tankLine(s.tank), rows = stockRows(s);
  const lines = [`### ${s.id}`, `Tank: ${t.name}, ${t.dims}; ${t.vol}; floor ${t.floor}.`, `Setting: ${envLine(s)}.`, 'Animals:'];
  for (const r of rows) lines.push(`- ${r.n} ${r.name}${r.sex ? ` (${r.sex})` : ''}${r.note ? ` (${r.note})` : ''}: adult ${r.len}; lives ${r.lives}${r.focal ? '  <- the counted species' : ''}`);
  const asks = [];
  asks.push('verdict: one of ideal | caution | problems | unworkable | skip');
  if (s.ask.includes('change')) asks.push(`change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from ${s.stock.map(x => x.id).join(', ')}]`);
  if (s.ask.includes('compat')) asks.push(`together: yes | caution | no; if not yes, reasons: [any of ${REASONS.map(r => r[0]).join(' | ')}]${s.stock.length > 2 ? `; problem: [species ids]` : ''}`);
  if (s.ask.includes('counts')) asks.push(`ideal and limit: whole numbers of ${lower(s.focal)} (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count`);
  if (s.ask.includes('min')) asks.push(`bigEnough: yes | no (for an adult ${sp(s.min.species).name.toLowerCase()}); smallest: one of ${s.min.sizes.map(z => JSON.stringify(z)).join(' | ')} | "larger"${s.min.label ? ` (${s.min.label})` : ''}`);
  if (s.ask.includes('max')) for (const m of s.max) asks.push(`max.${m.species}: one of ${m.options.join(' | ')}${m.label ? ` (${m.label})` : ' (most you would keep here whatever else is in the tank)'}`);
  if (s.ask.includes('maxMales')) for (const m of s.maxMales) asks.push(`maxMales.${m.species}: one of ${m.options.join(' | ')}`);
  asks.push('confidence: low | medium | high; note: free text (optional)');
  lines.push('Answer:'); for (const a of asks) lines.push(`- ${a}`);
  return lines.join('\n');
}
function template(s) {
  const o = { verdict: '', change: '' };
  if (!s.ask.includes('change')) delete o.change;
  if (s.ask.includes('compat')) { o.together = ''; o.reasons = []; if (s.stock.length > 2) o.problem = []; }
  if (s.ask.includes('counts')) { o.ideal = null; o.limit = null; }
  if (s.ask.includes('min')) { o.bigEnough = ''; o.smallest = ''; }
  if (s.ask.includes('max')) { o.max = {}; for (const m of s.max) o.max[m.species] = ''; }
  if (s.ask.includes('maxMales')) { o.maxMales = {}; for (const m of s.maxMales) o.maxMales[m.species] = ''; }
  o.confidence = ''; o.note = '';
  return o;
}
const INTRO = (mods) => `# Stocking and compatibility survey v4 (build ${BUILD}) — ${mods.map(m => `module ${m.id}: ${m.name}`).join('; ')}

You are answering as an expert keeper. Each tank below is described in words. ${ASSUME}

The scale: ${J.scale} "caution" lies between the two. A count of 0 is valid (even one would cross the line). If you do not know the animals, answer verdict "skip" and nothing else for that tank: a guessed number is worse than no number.

Answer with ONE JSON object per module, exactly in the shape of the template at the end: keys are the tank ids, values hold only the fields that tank asks for, using only the listed values. Put reasoning in "note", not outside the JSON. Do not add tanks or fields. Species ids are the short codes in the animal lists (e.g. neon, bronzecory).

Field meanings:
- verdict: ideal (comfortable long term with ordinary care) | caution (workable but past ideal) | problems (long-term trouble likely even with good care) | unworkable (not as described) | skip.
- change: the first thing you would change: nothing | fewer (of changeSp) | bigger (tank) | drop (changeSp) | ratio (group size or sex ratio) | notroom (the limit is food, maturity or habitat, not room) | other (say in note).
- together / reasons / problem: would you keep these together long term; why not, from: eat (would eat or injure), nip (fin nipping or harassment), aggression (aggression or territory), temperature, chemistry (pH, hardness, salinity), habitat (humidity or habitat), food (food or diet), disease (disease or toxins), breeding (breeding or sex mix), other.
- ideal / limit: the counted species only, with the other animals held as shown. countStatus replaces both numbers: cant-say, or no-valid-count (no count works as described).
- bigEnough / smallest: whether the tank is big enough for one adult of that species at all, and the smallest of the offered sizes you would use for it as stocked here ("larger" if none).
- max.<species>: the most of that species you would keep in this tank, whatever else is in it. maxMales.<species>: the most males.
- confidence: low | medium | high.
`;
const packs = [];
for (const m of J.modules) {
  const scn = J.scenarios.filter(s => s.module === m.id);
  const md = INTRO([m]) + '\n## Tanks\n\n' + scn.map(scenarioText).join('\n\n') + '\n\n## Answer template (fill in, keep the shape)\n\n```json\n' + JSON.stringify({ survey: 'v4', build: BUILD, module: m.id, expert: '<name>', expertKind: 'ai', answers: Object.fromEntries(scn.map(s => [s.id, template(s)])) }, null, 1) + '\n```\n';
  fs.writeFileSync(path.join(here, `survey-v4-llm-${m.id}.md`), md);
  packs.push(md);
}
fs.writeFileSync(path.join(here, 'survey-v4-llm-all.md'), packs.join('\n\n---\n\n'));
const idx = ['# Survey v4 scenario index (build ' + BUILD + ')', '', 'One line per tank: what is in it, what is asked (V verdict, Ch change, Co compat, N counts, M minimum, X max, XM max males, all with confidence) and which engine component the answers inform.', ''];
for (const m of J.modules) { idx.push('## ' + m.id + '. ' + m.name + ' (' + J.scenarios.filter(s => s.module === m.id).length + ' tanks)', '', '| id | tank | stock | asks | tests | why |', '|---|---|---|---|---|---|');
  for (const s of J.scenarios.filter(s => s.module === m.id)) { const t = J.tanks[s.tank]; const st = s.stock.map(x => x.n + ' ' + lower(x.id) + (x.id === s.focal ? '*' : '') + (x.sex ? ' (' + sexText(x) + ')' : '')).join(', ');
    const asks = s.ask.filter(a => a !== 'confidence').map(a => ({ verdict: 'V', change: 'Ch', compat: 'Co', counts: 'N', min: 'M', max: 'X', maxMales: 'XM' })[a]).join(' ');
    idx.push('| ' + s.id + (s.pairOf ? ' (pair of ' + s.pairOf + ')' : '') + ' | ' + t.name + ', ' + t.in.join(' x ') + ' in' + (s.env.tempC ? ', ' + s.env.tempC + ' °C' : '') + (s.env.note ? ', ' + s.env.note : '') + ' | ' + st + ' | ' + asks + ' | ' + s.tests.join(', ') + ' | ' + s.why + ' |'); } idx.push(''); }
fs.writeFileSync(path.join(here, 'survey-v4-index.md'), idx.join('\n'));
console.log(`build ${BUILD}: ${J.scenarios.length} scenarios; survey-v4.html ${(fs.statSync(path.join(here, 'survey-v4.html')).size / 1024).toFixed(0)} kB; LLM packs for modules ${J.modules.map(m => m.id).join(', ')}`);
