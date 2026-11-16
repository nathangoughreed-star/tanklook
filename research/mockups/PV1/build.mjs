// PV1 mockup generator: node research/mockups/PV1/build.mjs  -> writes the HTML files beside it.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));

const C = { clean: '#47a3ff', dirty: '#6f88a8', co2: '#34d57f', heat: '#ff5b52', cold: '#6fe0e8', waste: '#b8935f' };
const KINDS = Object.keys(C);

// ---------- SVG helpers ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = (x, y, s, cls = 't2', a = 'start') => s ? `<text x="${x}" y="${y}" class="${cls}" text-anchor="${a}">${esc(s)}</text>` : '';
/** an animated in / out arrow along path d. o.trk=false drops the wide faint track (strands riding on another pipe); o.g = group class (e.g. "loss") */
const pipe = (d, k, o = {}) => {
  const col = C[k], head = o.head === false ? '' : ` marker-end="url(#a-${k})"`;
  const cls = [o.g, o.faint ? 'faint' : ''].filter(Boolean).join(' ');
  return `<g class="${cls}">${o.trk === false ? '' : `<path d="${d}" class="trk" stroke="${col}" stroke-width="${o.tw || 9}"/>`}<path d="${d}" class="flow${o.dots ? ' dots' : ''}" stroke="${col}" stroke-width="${o.w || 3}" style="--o:${o.off || 0}px"${head}/></g>`;
};
const strand = (d, k, off) => pipe(d, k, { trk: false, dots: true, w: 4.5, head: false, off });
const box = (x, y, w, h, title, subs = [], o = {}) =>
  `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="box${o.dash ? ' dash' : ''}"${o.stroke ? ` style="stroke:${o.stroke}"` : ''}/>` +
  T(x + 10, y + 19, title, 't1') + subs.map((s, i) => T(x + 10, y + 35 + i * 14, s, 't2')).join('') + '</g>';
const defs = `<defs>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a6fc0" stop-opacity=".34"/><stop offset="1" stop-color="#1c4c86" stop-opacity=".18"/></linearGradient>
  ${KINDS.map(k => `<marker id="a-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${C[k]}"/></marker>`).join('')}
</defs>`;
const plants = (xs, base, hs) => xs.map((x, i) => { const h = hs[i % hs.length]; return `<path d="M${x} ${base} q${i % 2 ? 9 : -9} ${-h / 2} 0 ${-h} M${x + 6} ${base} q${i % 2 ? -8 : 8} ${-h / 3} 2 ${-h * .7}" class="plant"/>`; }).join('');
const lossA = ds => ds.map(d => pipe(d, 'heat', { faint: true, w: 2, trk: false, g: 'loss' })).join('');
const upG = (xs, y0, y1) => xs.map(x => pipe(`M${x} ${y0} L${x} ${y1}`, 'co2', { faint: true, w: 2, trk: false })).join('');

// ---------- the app frame ----------
const CSS = `
:root{--bg-app:#14181f;--bg-panel:#1b2029;--bg-raised:#242a35;--bg-hover:#2c3340;--bg-sunken:#11151b;--line:#2f3644;--text:#e8ebf1;--text-2:#a4adbd;--text-3:#6e7789;--accent:#4f8cff;--accent-weak:#4f8cff26;--ok:#3fb68b;--warn:#e3a33a;--bad:#e5565b;--ok-weak:#3fb68b22;--warn-weak:#e3a33a26;--glass:rgba(20,24,31,.86);
--font:"Segoe UI",system-ui,-apple-system,Roboto,sans-serif;--fs-xs:11px;--fs-sm:12px;--fs-md:13px;--s1:4px;--s2:8px;--s3:12px;--s4:16px;--ctl-h-sm:24px;--rail-w:64px;--header-h:48px;--r-ctl:6px;--r-pill:999px}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{background:var(--bg-app);color:var(--text);font:var(--fs-md)/1.4 var(--font);overflow:hidden}
button{font:inherit;color:inherit}
.app{display:grid;height:100vh;grid-template-columns:var(--rail-w) minmax(0,1fr);grid-template-rows:var(--header-h) minmax(0,1fr);grid-template-areas:"head head" "rail view"}
.head{grid-area:head;display:flex;align-items:center;gap:var(--s2);padding:0 var(--s4);background:var(--bg-panel);border-bottom:1px solid var(--line)}
.brand{font-weight:700;letter-spacing:.02em;margin-right:var(--s3)}.pname{color:var(--text-2)}.grow{flex:1}
.btn{height:var(--ctl-h-sm);padding:0 var(--s2);font-size:var(--fs-sm);border-radius:var(--r-ctl);border:1px solid var(--line);background:var(--bg-raised);display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}
.btn:hover{background:var(--bg-hover)}.btn.on{border-color:var(--accent);background:var(--accent-weak)}.btn.ghost{background:transparent;border-color:transparent;color:var(--text-2)}
.pill{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:var(--r-pill);font-size:var(--fs-xs);font-weight:600}
.pill.ok{background:var(--ok-weak);color:var(--ok)}.pill.warn{background:var(--warn-weak);color:var(--warn)}
.check{display:inline-flex;align-items:center;gap:8px;padding:0 10px;height:var(--ctl-h-sm);border-radius:var(--r-ctl);background:var(--bg-raised);border:1px solid var(--line);font-size:var(--fs-sm);font-weight:600}
.rail{grid-area:rail;background:var(--bg-panel);border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;padding:var(--s2) 0;gap:2px}
.ritem{width:56px;padding:6px 0;display:grid;justify-items:center;gap:3px;font-size:10.5px;color:var(--text-2);border-radius:8px}
.ritem i,.tabbar i{width:20px;height:20px;border:1.6px solid currentColor;border-radius:5px;opacity:.8}.ritem.sep{margin-top:10px}
.view{grid-area:view;position:relative;overflow:hidden;background:radial-gradient(1200px 700px at 50% 40%,#1a2029 0,#12161c 100%)}
.glass{background:var(--glass);border:1px solid var(--line);border-radius:var(--r-ctl);backdrop-filter:blur(6px)}
.seg{display:inline-flex;background:var(--bg-sunken);border:1px solid var(--line);border-radius:var(--r-ctl);padding:2px;gap:2px}
.seg button{height:24px;padding:0 var(--s3);border:0;border-radius:4px;background:transparent;color:var(--text-2);cursor:pointer;font-size:var(--fs-sm)}
.seg button.on{background:var(--bg-hover);color:var(--text);font-weight:600;box-shadow:inset 0 0 0 1px var(--accent)}
.vtop{position:absolute;top:var(--s3);left:var(--s3);right:var(--s3);display:flex;gap:var(--s2);align-items:flex-start;flex-wrap:wrap;z-index:3}
.chips{display:flex;gap:var(--s2);flex-wrap:wrap;margin-left:auto;justify-content:flex-end}
.chip{display:inline-flex;align-items:center;gap:8px;padding:4px 10px;font-size:var(--fs-sm);color:var(--text-2)}.chip b{color:var(--text);font-weight:600}
.vbot{position:absolute;left:var(--s3);right:var(--s3);bottom:var(--s3);display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s2);z-index:3;flex-wrap:wrap}
.legend{display:flex;gap:6px 14px;flex-wrap:wrap;padding:6px 10px;font-size:var(--fs-sm);color:var(--text-2);max-width:780px}
.legend span{display:inline-flex;align-items:center;gap:6px}.legend u{display:inline-block;width:22px;height:0;border-top:3px dashed;text-decoration:none}.legend u.dot{border-top-style:dotted;border-top-width:4px}
.ctl{display:flex;gap:var(--s2)}
svg.diag{position:absolute;inset:0;width:100%;height:100%;padding:56px 8px 64px}
.box{fill:var(--bg-raised);stroke:var(--line);stroke-width:1.2}.box.dash{fill:none;stroke-dasharray:5 4;stroke:var(--text-3)}
.t1{font:600 13px var(--font);fill:var(--text)}.t2{font:11.5px var(--font);fill:var(--text-2)}.t3{font:11px var(--font);fill:var(--text-3)}
.tg{font:600 11.5px var(--font);fill:#34d57f}.th{font:600 11.5px var(--font);fill:#ff5b52}.tc{font:600 11.5px var(--font);fill:#47a3ff}.td{font:600 11.5px var(--font);fill:#8aa3c3}
.glassw{fill:none;stroke:#3fb68b;stroke-opacity:.75;stroke-width:2.5}.plant{fill:none;stroke:#5f8a52;stroke-width:3;stroke-linecap:round}
.sub{fill:#8e7b58;opacity:.8}.stand{fill:#1c212b;stroke:var(--line)}
.trk{fill:none;opacity:.2;stroke-linecap:round;stroke-linejoin:round}
.flow{fill:none;stroke-dasharray:7 7;stroke-linejoin:round;animation:dash 1.2s linear infinite}
.flow.dots{stroke-dasharray:.1 14;stroke-linecap:round}
@keyframes dash{from{stroke-dashoffset:var(--o,0px)}to{stroke-dashoffset:calc(var(--o,0px) - 14px)}}
.faint{opacity:.5}
.loss{display:none}body.losses .loss{display:inline}
body.paused .flow{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.flow{animation:none}}
.tabbar{display:none}.port{display:none}
@media (max-width:699px){
 .app{grid-template-columns:1fr;grid-template-rows:var(--header-h) minmax(0,1fr) 60px;grid-template-areas:"head" "view" "tabs"}
 .rail,.brand,.pname,.lbl,.ok-l{display:none}.head{padding:0 var(--s2)}
 .tabbar{grid-area:tabs;display:grid;grid-template-columns:repeat(5,1fr);background:var(--bg-panel);border-top:1px solid var(--line)}
 .tabbar div{display:grid;justify-items:center;align-content:center;gap:2px;font-size:10.5px;color:var(--text-2)}
 .vtop{top:var(--s2);left:var(--s2);right:var(--s2)}.chips{margin-left:0;justify-content:flex-start}.chip{font-size:11px;padding:3px 8px}
 .vbot{left:var(--s2);right:var(--s2);bottom:var(--s2)}.legend{font-size:11px;gap:4px 10px;padding:5px 8px}
 .hasport{display:none}.port{display:block}
 svg.diag{padding:108px 2px 112px}
}`;

const frame = ({ title, project, chips, svgs, legend }) => { svgs = svgs.replace(/<g class="loss">[\s\S]*?<\/g>/g, '').replace(/<g class="loss"><path[\s\S]*?<\/g>/g, ''); return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body>
<div class="app">
 <header class="head"><span class="brand">TankLook</span><span class="pname">${esc(project)}</span><span class="grow"></span>
  <span class="check"><span class="ok-l">Habitat check</span><span class="pill ok">Compatible</span></span><span class="grow"></span>
  <button class="btn" type="button">◐ <span class="lbl">View ▾</span></button><button class="btn ghost" type="button">↶</button><button class="btn ghost" type="button">↷</button><button class="btn" type="button">Save</button></header>
 <nav class="rail" aria-label="Sections">${['Tank', 'Scape', 'Plants', 'Animals', 'Equipment'].map(s => `<div class="ritem"><i></i>${s}</div>`).join('')}<div class="ritem sep"><i></i>Preferences</div><div class="ritem"><i></i>Constraints</div><div class="ritem sep"><i></i>Discover</div><div class="ritem"><i></i>Print</div></nav>
 <main class="view">
  <div class="vtop"><div class="seg glass" role="tablist" aria-label="View"><button type="button" role="tab">Tank</button><button type="button" role="tab" class="on" aria-selected="true">Plumbing</button></div>
   <div class="chips">${chips.map(c => `<span class="chip glass"><b>${esc(c[0])}</b> ${esc(c[1])}${c[2] ? ` <span class="pill ${c[2]}">${esc(c[3])}</span>` : ''}</span>`).join('')}</div></div>
  ${svgs}
  <div class="vbot"><div class="legend glass">${legend}</div>
   <div class="ctl"><button class="btn glass" id="pz" type="button">❚❚ Pause</button></div></div>
 </main>
 <nav class="tabbar" aria-label="Sections">${['Tank', 'Scape', 'Plants', 'Animals', 'More'].map(s => `<div><i></i>${s}</div>`).join('')}</nav>
</div>
<script>
const b=document.body,pz=document.getElementById('pz');
const set=()=>{pz.textContent=b.classList.contains('paused')?'▶ Play':'❚❚ Pause';};
if(matchMedia('(prefers-reduced-motion:reduce)').matches)b.classList.add('paused');
if(location.hash.includes('pause'))b.classList.add('paused');
pz.onclick=()=>{b.classList.toggle('paused');set()};set();
</script></body></html>`; };

const lg = (k, label, dots) => `<span><u class="${dots ? 'dot' : ''}" style="border-color:${C[k]}"></u>${label}</span>`;
const LEG_BASE = lg('clean', 'clean water') + lg('dirty', 'dirty water to the filter');
const LEG_CO2 = lg('co2', 'CO₂ in, then out through plants + the surface', true);
const LEG_HEAT = lg('heat', 'heat in at the heater', true);

// ============ 1. HOB planted 20 long ============
const hob = `<svg class="diag" viewBox="0 90 860 450" role="img" aria-label="Plumbing: HOB filter on a 20 gallon long">${defs}
 <rect x="100" y="414" width="600" height="110" rx="4" class="stand"/><line x1="400" y1="414" x2="400" y2="524" stroke="#2f3644"/>${T(112, 438, 'stand', 't3')}
 <rect x="122" y="222" width="556" height="192" fill="url(#water)"/><rect x="122" y="388" width="556" height="26" class="sub"/>
 ${plants([470, 505, 540, 575, 610], 390, [58, 78, 48, 70, 54])}${plants([145, 168], 390, [44, 60])}
 <path d="M122 222 H678" stroke="#47a3ff" stroke-opacity=".5"/>
 <rect x="120" y="190" width="560" height="224" rx="3" class="glassw"/>
 ${T(128, 182, '30 × 12 × 12 in · 20 gal long (≈ 18 gal net)', 't2')}
 ${pipe('M665 384 L665 132 Q665 116 683 116 L722 116 L722 154', 'dirty')}
 ${box(700, 104, 134, 112, 'AquaClear 50', ['200 GPH rated · 9 W'])}
 <rect x="712" y="154" width="110" height="50" rx="4" fill="#11151b" stroke="#2f3644"/>${T(767, 174, 'sponge · carbon', 't3', 'middle')}${T(767, 190, 'bio media', 't3', 'middle')}
 ${pipe('M740 196 L612 196 L612 226', 'clean')}
 ${pipe('M612 236 Q575 272 480 272 L260 272', 'clean', { w: 2.5, tw: 7, head: false })}
 ${pipe('M260 272 Q165 272 165 322 Q165 372 240 374 L650 386', 'dirty', { w: 2.5, tw: 7 })}
 <rect x="300" y="322" width="120" height="12" rx="6" fill="#3a1d1f" stroke="${C.heat}" stroke-width="1.5"/>
 ${[330, 360, 390].map((x, i) => pipe(`M${x} 316 L${x} 288`, 'heat', { w: 2.5, tw: 6, off: i * 5 })).join('')}
 ${T(300, 352, 'Eheim Jäger 50 W · in tank', 'th')}
 ${T(560, 252, 'outflow lip', 'tc')}${T(640, 404, 'intake', 'td', 'end')}${T(690, 150, 'intake tube', 'td', 'end')}
 
</svg>`;

// ============ 2a. Planted 40 breeder, side cutaway ============
const RET = 'M420 440 L730 440 L730 85 L555 85 L555 118';
const cut = `<svg class="diag" viewBox="0 40 820 520" role="img" aria-label="Plumbing: canister with in-line CO2 reactor and in-line heater on a planted 40 breeder">${defs}
 <rect x="70" y="300" width="670" height="250" rx="4" class="stand"/>${T(690, 322, 'stand', 't3')}
 <rect x="92" y="95" width="516" height="205" fill="url(#water)"/><rect x="92" y="270" width="516" height="30" class="sub"/>
 ${plants([250, 290, 330, 370, 410, 450, 490, 530, 570], 272, [62, 90, 54, 80, 66, 96, 58, 76, 64])}
 <path d="M92 95 H608" stroke="#47a3ff" stroke-opacity=".5"/><rect x="90" y="70" width="520" height="230" rx="3" class="glassw"/>
 ${T(172, 322, '36 × 18 × 16 in · 40 gal breeder (≈ 38 gal net)', 't2')}
 ${pipe('M548 124 L280 132 Q158 136 150 190 L150 238', 'clean', { w: 2.5, tw: 7, head: false })}
 ${pipe('M150 238 L150 410 L300 410', 'dirty')}
 ${pipe(RET, 'clean', { w: 3.5, tw: 11 })}
 ${strand('M560 440 L730 440 L730 85 L555 85 L555 118', 'co2', 7)}${strand('M690 440 L730 440 L730 85 L555 85 L555 118', 'heat', 3)}
 ${box(300, 370, 120, 170, 'Fluval 307', ['canister', '303 GPH rated', '16 W'])}
 <rect x="312" y="450" width="96" height="78" rx="4" fill="#11151b" stroke="#2f3644"/>${T(360, 480, 'foam · bio rings', 't3', 'middle')}${T(360, 496, 'carbon', 't3', 'middle')}
 ${box(470, 420, 90, 40, '', [])}${T(515, 436, 'In-line CO₂', 't1', 'middle')}${T(515, 451, 'reactor', 't2', 'middle')}
 ${box(595, 420, 95, 40, '', [], { stroke: C.heat })}${T(642, 436, 'In-line heater', 't1', 'middle')}${T(642, 451, '200 W', 'th', 'middle')}
  ${box(470, 490, 90, 52, '', [])}${T(515, 508, 'CO₂ cylinder', 't1', 'middle')}${T(515, 523, '5 lb · regulator', 't2', 'middle')}${T(515, 536, 'bubble counter', 't3', 'middle')}
 ${pipe('M515 490 L515 462', 'co2', { w: 3, tw: 8 })}
 ${T(742, 250, 'return hose', 'tc')}${T(160, 360, 'intake hose', 'td')}${T(566, 150, 'outflow', 'tc')}
 ${upG([300, 380, 460, 540], 216, 196)}${T(420, 232, 'plant uptake', 'tg', 'middle')}
 ${upG([190, 270, 350, 430, 510], 104, 78)}${T(190, 64, 'off-gassing at the surface', 'tg')}
</svg>`;

// ============ 2b. flat layout (landscape + portrait) ============
const flatL = `<svg class="diag hasport" viewBox="0 40 980 545" role="img" aria-label="Flat plumbing diagram: canister, in-line CO2 reactor, in-line heater, tank">${defs}
 ${box(60, 60, 880, 200, '', [])}${T(76, 82, 'Planted 40 breeder · 40 gal (≈ 38 net)', 't1')}
 <rect x="76" y="96" width="848" height="104" rx="6" fill="url(#water)"/><rect x="76" y="188" width="848" height="12" class="sub"/>
 ${plants([300, 340, 380, 420, 460, 500, 540, 580, 620, 660], 190, [52, 70, 44, 66, 58, 74, 48, 62, 54, 68])}
 ${upG([660, 720, 780, 840], 108, 86)}${T(750, 80, 'off-gassing', 'tg', 'middle')}
 ${upG([360, 460, 560], 160, 140)}${T(460, 130, 'plant uptake', 'tg', 'middle')}
 ${pipe('M120 200 L120 380', 'dirty')}${T(132, 300, 'intake', 'td')}
 ${box(60, 380, 210, 110, 'Fluval 307 canister', ['303 GPH rated · 16 W', 'foam · bio rings · carbon', 'cleans the water'])}
 ${pipe('M270 435 L340 435', 'clean')}
 ${box(340, 400, 180, 70, 'In-line CO₂ reactor', ['dissolves CO₂ into the flow'])}
 ${pipe('M520 435 L590 435', 'clean')}${strand('M520 435 L590 435', 'co2', 7)}
 ${box(590, 400, 180, 70, 'In-line heater · 200 W', ['adds heat to the flow'], { stroke: C.heat })}
 ${pipe('M770 435 L880 435 L880 200', 'clean')}${strand('M770 435 L880 435 L880 200', 'co2', 7)}${strand('M770 435 L880 435 L880 200', 'heat', 3)}
 ${T(892, 330, 'clean, gassed,', 'tc')}${T(892, 344, 'warmed return', 'tc')}
 ${box(380, 510, 100, 62, '', [])}${T(430, 530, 'CO₂ cylinder', 't1', 'middle')}${T(430, 546, '5 lb · regulator', 't2', 'middle')}${pipe('M430 510 L430 472', 'co2', { w: 3 })}
 ${box(640, 540, 80, 34, '', [])}${T(680, 561, 'mains', 't2', 'middle')}${pipe('M680 540 L680 472', 'heat', { w: 3 })}
</svg>`;
const flatP = `<svg class="diag port" viewBox="0 0 390 610" role="img" aria-label="Flat plumbing diagram, phone layout">${defs}
 ${box(14, 8, 320, 160, '', [])}${T(26, 28, 'Planted 40 breeder · 40 gal', 't1')}
 <rect x="26" y="40" width="296" height="80" rx="6" fill="url(#water)"/><rect x="26" y="108" width="296" height="12" class="sub"/>
 ${plants([90, 120, 150, 180, 210, 240, 270], 110, [36, 50, 32, 46, 38, 52, 34])}
 ${upG([200, 240, 280], 50, 38)}${T(318, 36, 'off-gassing', 'tg', 'end')}
 ${upG([110, 160], 90, 74)}${T(140, 70, 'plant uptake', 'tg', 'middle')}
 ${pipe('M60 120 L60 206', 'dirty')}${T(70, 170, 'intake', 'td')}
 ${box(14, 206, 230, 84, 'Fluval 307 canister', ['303 GPH rated · 16 W', 'foam · bio rings · carbon'])}
 ${pipe('M129 290 L129 340', 'clean')}
 ${box(14, 340, 230, 60, 'In-line CO₂ reactor', ['dissolves CO₂ into the flow'])}
 ${box(262, 346, 86, 52, '', [])}${T(305, 366, 'CO₂ cyl.', 't1', 'middle')}${T(305, 381, '5 lb', 't2', 'middle')}${pipe('M262 372 L246 372', 'co2', { w: 3, tw: 8 })}
 ${pipe('M129 400 L129 450', 'clean')}${strand('M129 400 L129 450', 'co2', 7)}
 ${box(14, 450, 230, 60, 'In-line heater · 200 W', ['adds heat to the flow'], { stroke: C.heat })}
 ${pipe('M129 510 L129 560 L368 560 L368 70 L336 70', 'clean')}${strand('M129 510 L129 560 L368 560 L368 70', 'co2', 7)}${strand('M129 510 L129 560 L368 560 L368 70', 'heat', 3)}
 ${T(360, 590, 'clean, gassed, warmed return', 'tc', 'end')}
</svg>`;

// ============ 3. Reef 75 ============
const SUMP_FLOW = 'M270 450 L278 414 L304 414 L312 450 L388 450 L388 506 L418 506';
const reef = `<svg class="diag" viewBox="0 30 840 540" role="img" aria-label="Plumbing: reef 75 with overflow box, sump, skimmer, return pump, heater and ATO">${defs}
 <rect x="40" y="262" width="780" height="288" rx="4" class="stand"/>${T(52, 284, 'stand', 't3')}
 <rect x="62" y="92" width="458" height="168" fill="url(#water)"/><rect x="62" y="236" width="458" height="24" class="sub" opacity=".5"/>
 <path d="M72 236 q18 -34 34 -2 q16 -40 30 0 M180 236 q20 -50 38 -4 q14 -26 26 4 M300 236 q16 -40 36 -2 q18 -30 30 2" fill="none" stroke="#c46a5a" stroke-width="5" stroke-linecap="round" opacity=".8"/>
 <path d="M62 92 H520" stroke="#47a3ff" stroke-opacity=".5"/><rect x="60" y="62" width="462" height="198" rx="3" class="glassw"/>
 ${T(68, 80, '48 × 18 × 21 in · 75 gal display', 't2')}
 <rect x="452" y="84" width="68" height="120" fill="#161b23" stroke="#3fb68b" stroke-opacity=".7"/>${T(486, 108, 'overflow', 't2', 'middle')}${T(486, 121, 'box', 't2', 'middle')}${T(486, 140, '700 GPH', 't1', 'middle')}${T(486, 154, 'rated', 't3', 'middle')}
 ${pipe('M400 175 L456 175', 'dirty', { w: 2.5, tw: 7 })}
 ${pipe('M486 204 L486 290 L196 290 L196 420', 'dirty', { w: 3.5, tw: 11 })}${T(340, 282, 'drain to the sump', 'td', 'middle')}
 <rect x="150" y="360" width="370" height="170" rx="4" fill="none" stroke="#6e7789" stroke-width="1.6"/>
 <rect x="150" y="402" width="370" height="128" fill="url(#water)"/>
 <rect x="286" y="430" width="8" height="100" fill="#303846"/><rect x="396" y="378" width="8" height="112" fill="#303846"/>
 ${T(218, 376, '1  inlet + skimmer', 't1', 'middle')}${T(340, 376, '2  baffles', 't1', 'middle')}${T(460, 376, '3  return', 't1', 'middle')}
 <rect x="160" y="420" width="44" height="90" rx="4" fill="#161b23" stroke="#6e7789"/>${T(182, 468, 'sock', 't3', 'middle')}
 <rect x="216" y="410" width="54" height="110" rx="6" fill="#1b2029" stroke="${C.waste}"/>${T(243, 462, 'skimmer', 't3', 'middle')}
 ${pipe('M243 410 L243 348', 'waste', { w: 2.5, tw: 7 })}${box(213, 306, 60, 42, '', [])}${T(243, 323, 'cup', 't3', 'middle')}${T(243, 336, 'skimmate', 't3', 'middle')}
 ${pipe('M204 490 L216 490', 'dirty', { w: 2.5, tw: 7, head: false })}
 ${pipe(SUMP_FLOW, 'dirty', { w: 2.5, tw: 7, head: false })}
 ${pipe('M418 506 L418 482 L460 482', 'clean', { w: 2.5, tw: 7 })}
 <rect x="430" y="408" width="14" height="76" rx="7" fill="#3a1d1f" stroke="${C.heat}" stroke-width="1.5"/>${T(452, 420, 'Eheim Jäger', 'th')}${T(452, 433, '200 W', 'th')}
 ${pipe('M437 404 L437 384', 'heat', { w: 2.5, tw: 6 })}
 <rect x="460" y="464" width="46" height="36" rx="6" fill="#1b2029" stroke="${C.clean}"/>${T(483, 479, 'return', 't3', 'middle')}${T(483, 492, 'pump', 't3', 'middle')}
 ${T(335, 548, 'Sicce Voyager 2 return pump · 800 GPH · 7 W', 't2', 'middle')}
 ${pipe('M506 482 L545 482 L545 48 L420 48 L420 120', 'clean', { w: 3.5, tw: 11 })}${strand('M545 482 L545 48 L420 48 L420 120', 'heat', 4)}
 <rect x="505" y="296" width="80" height="44" rx="8" fill="#0f2f34" stroke="${C.cold}" stroke-dasharray="5 4"/>${T(545, 314, 'chiller', 't1', 'middle')}${T(545, 329, '(optional)', 't3', 'middle')}${pipe('M585 318 L625 318', 'cold', { w: 2, trk: false, faint: true })}${T(631, 322, 'cooling', 't3')}
 ${box(660, 410, 140, 120, 'ATO reservoir', ['5 gal fresh water', 'level sensor + pump'])}
 ${pipe('M730 410 L730 346 L551 346 A6 6 0 0 0 539 346 L490 346 L490 402', 'clean', { w: 2.5, tw: 7 })}${T(700, 338, 'top-off water', 't2', 'middle')}
 ${T(560, 40, 'return line (clean, warm)', 'tc', 'middle')}
</svg>`;

const mk = (file, o) => writeFileSync(join(here, file), frame(o));
mk('01-hob-20-long.html', {
  title: 'PV1 mockup 1: HOB planted 20 long', project: 'Planted 20 long',
  chips: [['Turnover', '200 GPH ÷ 18 gal = 11×/hr', 'ok', 'planted 4–12×'], ['Heater', '50 W ≈ 2.8 W/gal', 'ok', 'ok']],
  svgs: hob, legend: LEG_BASE + LEG_HEAT });
mk('02a-canister-40-cutaway.html', {
  title: 'PV1 mockup 2a: canister + in-line CO2 + in-line heater (side cutaway)', project: 'Planted 40 breeder',
  chips: [['Turnover', '303 GPH ÷ 38 gal = 8×/hr', 'ok', 'planted 4–12×'], ['Heater', '200 W ≈ 5 W/gal', 'ok', 'ok'], ['CO₂', 'on with the light', '', '']],
  svgs: cut, legend: LEG_BASE + LEG_CO2 + LEG_HEAT });
mk('02b-canister-40-flat.html', {
  title: 'PV1 mockup 2b: canister + in-line CO2 + in-line heater (flat)', project: 'Planted 40 breeder',
  chips: [['Turnover', '303 GPH ÷ 38 gal = 8×/hr', 'ok', 'planted 4–12×'], ['Heater', '200 W', 'ok', 'ok'], ['CO₂', 'on with the light', '', '']],
  svgs: flatL + flatP, legend: LEG_BASE + LEG_CO2 + LEG_HEAT });
mk('03-reef-75.html', {
  title: 'PV1 mockup 3: reef 75 with overflow, sump, return pump, skimmer, heater, ATO', project: 'Reef 75',
  chips: [['Turnover', '800 ÷ 95 gal system = 8.4×/hr', 'ok', 'reef 5–10×'], ['Heater', '200 W ≈ 2.1 W/gal', 'ok', 'ok']],
  svgs: reef, legend: LEG_BASE + lg('waste', 'skimmate out') + LEG_HEAT + lg('cold', 'cooling (optional chiller)') });
console.log('built');
