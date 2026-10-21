// Species data table (species-data.html, internal; Nathan 2026-10-21): every variable the tool tracks per species, and the constants each
// species carries, in one sortable table. Read straight from the same modules the app uses (nothing copied), so it cannot drift.
// Dev server only: vite.config.ts lists only index.html and review.html as build inputs, so this page is never published.
import { CATEGORIES, SPECIES, restsOnFloor, onLeaves, leafUp, speciesTag, type Species } from '../data/species';
import { CARE, EXPERTISE_NAME } from '../data/care';
import { AIRDATA } from '../data/climatedata';
import { GRAZE } from '../data/grazers';
import { HERP } from '../data/herpstock';
import { SPACE_FACTOR, SPACE_FACTOR_CLASS } from '../data/spacefactor';
import { MET_CLASS, animalLoad, countsAgainstWater, litresPerAnimal, massG, metClass, spaceFactor, spaceOf } from '../scene/stocking';
import { LARGE_BODY_MM, minDataOf, whoOf, type MinLine } from '../scene/tankMin';
import { zoneOf } from '../scene/tankfit';
import bm from '../data/bodymass.json';
import aq from '../data/aqadvisor.json';
import manifest from '../data/model-versions.json';

type Units = 'us' | 'metric';
type Cell = [sort: number | string, text: string] | null;
interface Col { key: string; label: string; group: string; left?: boolean; get: (s: Species) => Cell }

const GAL = 3.785411784, IN = 25.4, SQIN = 6.4516, OZ = 28.3495, SQFT_M2 = 0.092903;
let units: Units = 'us';
const us = () => units === 'us';
const f1 = (n: number) => String(Math.round(n * 10) / 10), f2 = (n: number) => String(Math.round(n * 100) / 100);
const txt = (s: string | undefined): Cell => !s ? null : [s, s];
const flag = (b: boolean | undefined): Cell => b ? ['yes', 'yes'] : null;
const range = (r: [number, number] | undefined, conv: (n: number) => number, d = 0): Cell => r ? [r[0], `${conv(r[0]).toFixed(d)}–${conv(r[1]).toFixed(d)}`] : null;
const tC = (c: number) => us() ? c * 9 / 5 + 32 : c;
const litres = (l: number | undefined): Cell => !l ? null : [l, us() ? `${f1(l / GAL)} gal` : `${Math.round(l)} L`];
const len = (mm: number | undefined): Cell => !mm ? null : [mm, us() ? `${f1(mm / IN)} in` : `${f1(mm / 10)} cm`];
const area = (cm2: number | undefined): Cell => !cm2 ? null : [cm2, us() ? `${Math.round(cm2 / SQIN)} sq in` : `${Math.round(cm2)} cm²`];
const mass = (g: number): Cell => !g ? null : [g, us() && g >= OZ ? `${f1(g / OZ)} oz` : g >= 10 ? `${Math.round(g)} g` : `${f2(g)} g`];

const MASS = bm.species as unknown as Record<string, { a: number; b: number; src: string; model?: number; flag?: boolean }>;
const AQ = aq as unknown as Record<string, { aq: string; name: string; standIn?: boolean }>;
const REC = (manifest as { models: Record<string, { v: number; build: number; date: string }> }).models;
type CareRow = (typeof CARE)[string] & { zone?: string; maxDepthMm?: number; minLengthMm?: number; minWidthMm?: number; minAreaCm2?: number; bands?: { ok: number; good: number; great: number }; max?: number; sexed?: { ratio: [number, number] }; flow?: string; appeal?: string[] };
const careOf = (s: Species) => CARE[s.id] as CareRow | undefined;
const wet = (s: Species) => countsAgainstWater(s);
const air = (s: Species) => AIRDATA[s.id];
// lane MM: the decided red (minimum) / green (Recommended) lines, src/data/tankmin.json; mark: sourced, (est) = no conditions stated, derived = from a gallon figure
const md = (s: Species) => minDataOf(s.id);
const mk = (m: string | undefined) => m === 'sourced' ? '' : m === 'derived (est)' ? ' derived' : m ? ' (est)' : '';
const lineCell = (l: MinLine | undefined): Cell => !l ? null : [l.L, `${len(l.L)![1]}${l.W ? ` x ${len(l.W)![1]}` : ''}${l.areaCm2 ? ` + ${area(l.areaCm2)![1]}` : ''}${mk(l.mark)} · ${l.site}`];
const held = (s: Species) => { const w = whoOf(s), l = md(s)?.red; if (!l) return 'none (never fails on size)';
  return l.mark === 'derived (est)' ? (w.floor ? 'floor area' : 'length') : [w.floor || l.areaCm2 ? 'floor area' : '', 'length', l.W && (w.floor || w.tl >= LARGE_BODY_MM) ? 'width' : ''].filter(Boolean).join(' + '); };

const COLS: Col[] = [
  // identity
  { key: 'name', label: 'Species', group: 'Identity', left: true, get: s => [s.name, s.name] },
  { key: 'id', label: 'id', group: 'Identity', left: true, get: s => txt(s.id) },
  { key: 'sci', label: 'Scientific name', group: 'Identity', left: true, get: s => txt(s.sci) },
  { key: 'cat', label: 'Category', group: 'Identity', left: true, get: s => txt(CATEGORIES.find(c => c[0] === s.cat)?.[1]) },
  { key: 'water', label: 'Water', group: 'Identity', left: true, get: s => txt(s.salt ? 'salt' : s.habitat === 'land' ? 'dry' : 'fresh') },
  { key: 'habitat', label: 'Habitat', group: 'Identity', left: true, get: s => txt(s.habitat) },
  { key: 'care', label: 'Care level', group: 'Identity', get: s => { const c = careOf(s); return c ? [c.care, `${c.care} ${EXPERTISE_NAME[c.care]}`] : null; } },
  { key: 'note', label: 'Note', group: 'Identity', left: true, get: s => txt(s.note) },
  // size
  { key: 'tl', label: 'Adult length', group: 'Size and mass', get: s => len(s.tl) },
  { key: 'ftl', label: 'Female length', group: 'Size and mass', get: s => s.female ? len(s.female.tl) : null },
  { key: 'mass', label: 'Adult mass', group: 'Size and mass', get: s => mass(massG(s.id, s.tl)) },
  { key: 'ma', label: 'Mass a', group: 'Size and mass', get: s => { const m = MASS[s.id]; return m ? [m.a, String(m.a)] : null; } },
  { key: 'mb', label: 'Mass b', group: 'Size and mass', get: s => { const m = MASS[s.id]; return m ? [m.b, String(m.b)] : null; } },
  { key: 'msrc', label: 'Mass source', group: 'Size and mass', left: true, get: s => txt(MASS[s.id]?.src) },
  { key: 'mmodel', label: '3D body / table mass', group: 'Size and mass', get: s => { const m = MASS[s.id]; return m?.model === undefined ? null : [m.model, `${m.model}${m.flag ? ' ⚑' : ''}`]; } },
  { key: 'aspect', label: 'Card aspect', group: 'Size and mass', get: s => [s.aspect, f2(s.aspect)] },
  // model
  { key: 'art', label: 'Art / model', group: 'Model', left: true, get: s => txt(s.art) },
  { key: 'mv', label: 'Model version', group: 'Model', get: s => { const r = REC[s.look]; return r ? [r.v, `v${r.v}`] : null; } },
  { key: 'mbuild', label: 'Model build', group: 'Model', get: s => { const r = REC[s.look]; return r ? [r.build, `${r.build} (${r.date})`] : null; } },
  { key: 'fmv', label: 'Female model version', group: 'Model', get: s => { const r = s.female && REC[s.female.look]; return r ? [r.v, `v${r.v}`] : null; } },
  { key: 'rest', label: 'Rest offset (widths)', group: 'Model', get: s => [s.rest, f2(s.rest)] },
  // placement and shuffle
  { key: 'zone', label: 'Zone (tank fit)', group: 'Placement and Shuffle', left: true, get: s => txt(zoneOf(s)) },
  { key: 'level', label: 'Swims at', group: 'Placement and Shuffle', left: true, get: s => txt(s.level ?? (wet(s) && !restsOnFloor(s) ? 'mid water' : undefined)) },
  { key: 'szone', label: 'Bottom only', group: 'Placement and Shuffle', get: s => flag(s.zone === 'bottom') },
  { key: 'rests', label: 'Rests on floor', group: 'Placement and Shuffle', get: s => flag(restsOnFloor(s)) },
  { key: 'grp', label: 'Group swim', group: 'Placement and Shuffle', left: true, get: s => txt(s.group) },
  { key: 'pair', label: 'Kept as pair', group: 'Placement and Shuffle', get: s => flag(s.pair) },
  { key: 'surf', label: 'Clings to', group: 'Placement and Shuffle', left: true, get: s => txt(s.surfaces?.join(', ')) },
  { key: 'leaf', label: 'Sits on leaves', group: 'Placement and Shuffle', get: s => onLeaves(s) ? [leafUp(s), `yes (up ${leafUp(s)})`] : null },
  { key: 'tag', label: 'List tag', group: 'Placement and Shuffle', left: true, get: s => txt(speciesTag(s)) },
  { key: 'kind', label: 'Kind / body', group: 'Placement and Shuffle', left: true, get: s => txt([s.kind, s.body].filter(Boolean).join(' ')) },
  { key: 'flow', label: 'Flow', group: 'Placement and Shuffle', left: true, get: s => txt(careOf(s)?.flow) },
  // water and air
  { key: 'temp', label: 'Temp comfortable', group: 'Water and air', get: s => range(careOf(s)?.temp, tC) },
  { key: 'tol', label: 'Temp tolerable', group: 'Water and air', get: s => { const c = careOf(s), r = range(c?.tol, tC); return r && c?.tolEst ? [r[0], r[1] + ' ~'] : r; } },
  { key: 'ph', label: 'pH', group: 'Water and air', get: s => range(careOf(s)?.ph, x => x, 1) },
  { key: 'gh', label: 'GH (dGH)', group: 'Water and air', get: s => range(careOf(s)?.gh, x => x) },
  { key: 'atemp', label: 'Air temp', group: 'Water and air', get: s => range(air(s)?.c, tC) },
  { key: 'atol', label: 'Air temp tolerable', group: 'Water and air', get: s => range(air(s)?.tol, tC) },
  { key: 'awarm', label: 'Warm spot', group: 'Water and air', get: s => range(air(s)?.warm, tC) },
  { key: 'anight', label: 'Night temp', group: 'Water and air', get: s => range(air(s)?.night, tC) },
  { key: 'rh', label: 'Humidity %', group: 'Water and air', get: s => range(air(s)?.rh, x => x) },
  { key: 'maxd', label: 'Max water depth', group: 'Water and air', get: s => len(careOf(s)?.maxDepthMm) },
  // minimum tank
  { key: 'minL', label: 'Care minimum (CARE.minL)', group: 'Minimum tank', get: s => litres(careOf(s)?.minL) },
  { key: 'red', label: 'Red: minimum', group: 'Minimum tank', left: true, get: s => lineCell(md(s)?.red) },
  { key: 'green', label: 'Green: Recommended', group: 'Minimum tank', left: true, get: s => lineCell(md(s)?.green) },
  { key: 'held', label: 'Red line holds', group: 'Minimum tank', left: true, get: s => txt(held(s)) },
  { key: 'hred', label: 'Height red / green', group: 'Minimum tank', get: s => { const d = md(s); return d?.hRed || d?.hGreen ? [d.hRed?.H ?? d.hGreen!.H, `${d.hRed ? len(d.hRed.H)![1] : '-'} / ${d.hGreen ? len(d.hGreen.H)![1] : '-'}`] : null; } },
  { key: 'vol', label: 'Volume (advisory)', group: 'Minimum tank', get: s => { const v = md(s)?.vol; return v ? [v.gal, `${us() ? `${v.gal} gal` : `${Math.round(v.gal * GAL)} L`}${mk(v.mark)} · ${v.site}`] : null; } },
  { key: 'depth', label: 'Depth note', group: 'Minimum tank', left: true, get: s => txt(md(s)?.depth?.note) },
  { key: 'mwhy', label: 'Why these lines', group: 'Minimum tank', left: true, get: s => txt(md(s)?.why) },
  { key: 'minW', label: 'Min front to back (groups, unused)', group: 'Minimum tank', get: s => len(careOf(s)?.minWidthMm) },
  { key: 'herp', label: 'Herp floor min / rec', group: 'Minimum tank', get: s => { const h = HERP[s.sci]; return h ? [h.min, us() ? `${h.min} / ${h.rec} sq ft` : `${f2(h.min * SQFT_M2)} / ${f2(h.rec * SQFT_M2)} m²`] : null; } },
  { key: 'herpe', label: 'Herp floor per extra', group: 'Minimum tank', get: s => { const h = HERP[s.sci]; return h ? [h.each, us() ? `${h.each} sq ft` : `${f2(h.each * SQFT_M2)} m²`] : null; } },
  { key: 'herph', label: 'Herp min height', group: 'Minimum tank', get: s => { const h = HERP[s.sci]; return h?.hMin ? [h.hMin, us() ? `${h.hMin} in` : `${Math.round(h.hMin * 2.54)} cm`] : null; } },
  // stocking calculator
  { key: 'met', label: 'Metabolic class', group: 'Stocking calculator', left: true, get: s => txt(metClass(s)) },
  { key: 'metf', label: 'Metabolism factor', group: 'Stocking calculator', get: s => { const f = MET_CLASS[metClass(s)]; return [f, String(f)]; } },
  { key: 'wetc', label: 'Counts against water', group: 'Stocking calculator', left: true, get: s => wet(s) ? ['yes', 'yes'] : ['no', 'no'] },
  { key: 'load', label: 'Waste load, one adult (LU)', group: 'Stocking calculator', get: s => { const v = animalLoad(s, s.tl, 25, !!s.salt); return v ? [v, f2(v)] : null; } },
  { key: 'sf', label: 'Space factor', group: 'Stocking calculator', get: s => { const f = spaceFactor(s); return [f, f2(f) + (SPACE_FACTOR[s.id] ? '' : ' (class)')]; } },
  { key: 'sfn', label: 'Space factor basis', group: 'Stocking calculator', left: true, get: s => { const o = SPACE_FACTOR[s.id]; if (o) return txt(o[1]); const f = spaceFactor(s), k = Object.keys(SPACE_FACTOR_CLASS).find(k => SPACE_FACTOR_CLASS[k][0] === f); return txt(k ? `class: ${SPACE_FACTOR_CLASS[k][1]}` : s.salt ? 'salt: 1' : undefined); } },
  { key: 'space', label: 'Space load, one adult', group: 'Stocking calculator', get: s => { const v = wet(s) ? spaceOf(s, s.tl) : 0; return v ? [v, f2(v)] : null; } },
  { key: 'lpa', label: 'Water per adult (starters)', group: 'Stocking calculator', get: s => litres(litresPerAnimal(s)) },
  { key: 'graze', label: 'Grazer limit', group: 'Stocking calculator', left: true, get: s => txt(GRAZE[s.id]?.per) },
  { key: 'aq', label: 'AqAdvisor id', group: 'Stocking calculator', left: true, get: s => { const a = AQ[s.id]; return a ? [a.aq, a.aq + (a.standIn ? ' (stand-in)' : '')] : null; } },
  // compatibility
  { key: 'temper', label: 'Temper', group: 'Compatibility', left: true, get: s => { const c = careOf(s); return c ? [c.temper, ['peaceful', 'territorial', 'aggressive'][c.temper]] : null; } },
  { key: 'gmin', label: 'Group minimum', group: 'Compatibility', get: s => { const c = careOf(s), n = c?.bands?.ok ?? c?.group; return n ? [n, String(n)] : null; } },
  { key: 'bands', label: 'Group bands ok / good / great', group: 'Compatibility', get: s => { const b = careOf(s)?.bands; return b ? [b.ok, `${b.ok} / ${b.good} / ${b.great}`] : null; } },
  { key: 'gmax', label: 'Most per tank', group: 'Compatibility', get: s => { const m = careOf(s)?.max; return m ? [m, String(m)] : null; } },
  { key: 'sexed', label: 'Sex ratio M : F', group: 'Compatibility', get: s => { const r = careOf(s)?.sexed?.ratio; return r ? [r[0] / r[1], `${r[0]} : ${r[1]}`] : null; } },
  { key: 'solo', label: 'One per tank', group: 'Compatibility', left: true, get: s => { const c = careOf(s); return c?.solo ? ['yes', c.fam ? `yes (${c.fam})` : 'yes'] : null; } },
  { key: 'prey', label: 'Eats animals up to', group: 'Compatibility', get: s => { const p = careOf(s)?.prey; return p ? [p.mm, `${len(p.mm)![1]}${p.cats ? ' of ' + p.cats.join(', ') : ''}`] : null; } },
  { key: 'slow', label: 'Long fins (target)', group: 'Compatibility', get: s => flag(careOf(s)?.slow) },
  { key: 'nip', label: 'Nips fins', group: 'Compatibility', get: s => flag(careOf(s)?.nip) },
  { key: 'coral', label: 'Coral', group: 'Compatibility', left: true, get: s => { const c = careOf(s)?.coral; return c ? [c, c === 2 ? 'eats corals' : 'may nip'] : null; } },
  { key: 'appeal', label: 'Appeal tags', group: 'Compatibility', left: true, get: s => txt(careOf(s)?.appeal?.join(', ')) },
];

const GROUPS = [...new Set(COLS.map(c => c.group))];
const hidden = new Set<string>();
let sortKey = 'name', desc = false, query = '', cat = '';
const $ = (id: string) => document.getElementById(id)!;

const cells = new Map<string, Map<string, Cell>>();
const visible = () => { const q = query.trim().toLowerCase(); return SPECIES.filter(s => (!cat || s.cat === cat) && (!q || `${s.name} ${s.id} ${s.sci} ${s.cat}`.toLowerCase().includes(q))); };

function render() {
  cells.clear();
  for (const s of SPECIES) cells.set(s.id, new Map(COLS.map(c => [c.key, c.get(s)])));
  const cols = COLS.filter(c => !hidden.has(c.group));
  const rows = visible().sort((a, b) => {
    const x = cells.get(a.id)!.get(sortKey), y = cells.get(b.id)!.get(sortKey);
    if (!x && !y) return a.name.localeCompare(b.name);
    if (!x) return 1;
    if (!y) return -1; // blanks last either way
    const r = typeof x[0] === 'number' && typeof y[0] === 'number' ? x[0] - y[0] : String(x[0]).localeCompare(String(y[0]), undefined, { numeric: true });
    return desc ? -r : r;
  });
  const gspan = GROUPS.filter(g => !hidden.has(g)).map(g => `<th class="l${g === 'Identity' ? ' sticky' : ''}" colspan="${cols.filter(c => c.group === g).length}">${g}</th>`).join('');
  const head = cols.map(c => `<th data-k="${c.key}" class="${c.left ? 'l ' : ''}${c.key === 'name' ? 'sticky ' : ''}${c.key === sortKey ? 'sorted' + (desc ? ' desc' : '') : ''}" title="${c.group}">${c.label}</th>`).join('');
  const body = rows.map(s => `<tr>${cols.map(c => { const v = cells.get(s.id)!.get(c.key), st = c.key === 'name' ? ' sticky' : ''; return v ? `<td class="${c.left ? 'l' : ''}${st}">${v[1]}</td>` : `<td class="na${st}">–</td>`; }).join('')}</tr>`).join('');
  $('t').innerHTML = `<thead><tr class="g">${gspan}</tr><tr class="h">${head}</tr></thead><tbody>${body}</tbody>`;
  $('count').textContent = `${rows.length} of ${SPECIES.length} species · ${cols.length} columns · – = not set for that species`;
  document.querySelectorAll<HTMLElement>('#t th[data-k]').forEach(th => th.onclick = () => { const k = th.dataset.k!; if (k === sortKey) desc = !desc; else { sortKey = k; desc = false; } render(); });
}

function tsv() {
  const cols = COLS.filter(c => !hidden.has(c.group));
  return [cols.map(c => c.label).join('\t'), ...visible().map(s => cols.map(c => cells.get(s.id)!.get(c.key)?.[1] ?? '').join('\t'))].join('\n');
}

$('meta').textContent = `Build ${__BUILD__.n} · ${__BUILD__.date} · ${SPECIES.length} species · click a header to sort; toggle column groups below. Read live from species.json, care, groups, waterchem, climatedata, herpstock, tankMin, stocking, spacefactor and bodymass.`;
$('cat').innerHTML = `<option value="">All categories</option>` + CATEGORIES.map(c => `<option value="${c[0]}">${c[1]}</option>`).join('');
$('groups').innerHTML = GROUPS.map(g => `<button data-g="${g}" class="on">${g}</button>`).join('');
document.querySelectorAll<HTMLButtonElement>('#groups button').forEach(b => b.onclick = () => { const g = b.dataset.g!; if (hidden.has(g)) hidden.delete(g); else hidden.add(g); b.classList.toggle('on', !hidden.has(g)); render(); });
document.querySelectorAll<HTMLButtonElement>('[data-units]').forEach(b => b.onclick = () => { units = b.dataset.units as Units; document.querySelectorAll('[data-units]').forEach(x => x.classList.toggle('on', x === b)); render(); });
($('filter') as HTMLInputElement).oninput = e => { query = (e.target as HTMLInputElement).value; render(); };
($('cat') as HTMLSelectElement).onchange = e => { cat = (e.target as HTMLSelectElement).value; render(); };
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(tsv()); $('count').textContent = 'Copied the table as tab-separated text.'; } catch { $('count').textContent = 'Clipboard blocked by the browser.'; } };
render();
