// Fullness tile (lane P3, path 1, Nathan 2026-10-20): a minimizable tile on the viewer with the stocking engine's two
// limits as bars, space and filtration (scene/stocking.ts stockingOf; the sidebar stocking line moved in here 2026-10-22), live as animals
// are added; hovering (or tapping) a bar lists who fills it most. "Set my space" records the area the owner has
// (layout.space, scene/space.ts), drawn in the viewer as a dashed outline (render/spaceOutline.ts); an edit that takes
// the tank past it calls the fork card hook (`onSpaceFork`: make room / swap; the card itself is lane P5's).
// The tile follows the view: hidden while the Animals Show box is off, faded with the rest while another menu is in focus.
import { compatLine, compatRisks, coverAdvice, crowdWarnings } from '../scene/territory';
import type { Viewer } from '../render/viewer';
import { defaultSpace, spaceFit, tankExtent, SPACE_MAX, SPACE_MIN, type SpaceFit } from '../scene/space';
import { IDEAL_MAX, isOver, plural, stockingDetail, stockingMemo, type Stocking } from '../scene/stocking';
import { MIN_SLACK_PCT } from '../scene/animalfit';
import { minDataOf, notesIn, reasonIn, tankMinimum, type MinLine, type MinRow, type TankMinimum } from '../scene/tankMin';
import { NO3_TO_N, PLANT_SHARE_MAX, type Nitrogen } from '../scene/nitrogen';
import { filterState, setFilterless, type FilterState } from '../scene/tech';
import dd from '../data/demand-defaults.json';
const ROUTINE_FLOOR = dd.time.waterChangeFraction.floor;
import type { Store } from '../scene/store';
import type { SpaceLimit, TankSetup, Units } from '../scene/types';
import { tankView } from '../render/tankView';

/** A bar at or over this reads "caution" (amber, past ideal); over 100 is over (red). */
export const NEAR_FULL = IDEAL_MAX;
export type Level = 'ok' | 'near' | 'over';
export interface Bar { pct: number; /** fill width, 0..100 */ fill: number; level: Level; text: string }
export interface MinWarn { level: 'over' | 'near'; text: string }
export interface TopRow { name: string; n: number; /** share of this bar's load, 0..1 */ share: number; /** printed in place of the share (the minimum bar: what the species wants) */ note?: string }
export interface TileState {
  /** anything to show: water on, and animals in it or a space set */
  show: boolean;
  space: Bar; filt: Bar;
  /** the tank against the most demanding species' red line (scene/tankMin.ts): red below a minimum, yellow below a Recommended mark, green at or past every one (Nathan 2026-10-21, "Bar back, keep lines") */
  min: Bar;
  /** species the tank is too small for (red), by name and unmet measure (scene/tankMin.ts), and advisories (yellow: deeper water than advised); empty when every species has its minimum */
  mins: MinWarn[];
  topSpace: TopRow[]; topFilt: TopRow[]; topMin: TopRow[];
  /** the two limits behind Space (lane HB): the water limit, the floor limit (bottom dwellers), which binds, and who uses the floor */
  water: Bar; floor: Bar; spaceBy: 'water' | 'floor'; topFloor: TopRow[];
  /** the larger of the two, for the minimized pill */
  head: Bar;
  reason: string;
  /** compatibility, apart from the bars (lane CP 2026-10-22): leads the tile's lines when the stock has a risk */
  compat?: { level: 'over' | 'near'; text: string };
  /** whose filter counts (scene/tech.ts filterState): 'unset' hides the Filtration bar and the ammonia fold behind "This tank needs a filter" */
  filter: FilterState;
  limit?: SpaceLimit; fit?: SpaceFit;
}

export function bar(pct: number): Bar {
  const p = Number.isFinite(pct) ? Math.max(0, pct) : Infinity, r = p === Infinity ? 'over 999' : String(Math.round(p));
  return { pct: p, fill: Math.min(100, p), level: isOver(p) ? 'over' : Math.round(p) >= NEAR_FULL ? 'near' : 'ok', text: `${r}%` };
}

/** The k animals that fill a bar most: by space or by waste load, with their share of it. */
export function topBy(r: Stocking, by: 'space' | 'load' | 'floor', k = 3): TopRow[] {
  const tot = r.contributors.reduce((s, c) => s + c[by], 0);
  return [...r.contributors].filter(c => c[by] > 0).sort((a, b) => b[by] - a[by]).slice(0, k).map(c => ({ name: c.name, n: c.n, share: tot ? c[by] / tot : 0 }));
}

const fmtOf = (units: Units) => ({ len: (mm: number) => `${toUnits(mm, units)}${units === 'in' ? '"' : ' cm'}`, area: (cm2: number) => units === 'in' ? `${Math.round(cm2 / 6.4516)} sq in` : `${Math.round(cm2)} cm²`,
  vol: (l: number) => units === 'in' ? `${Math.round(l / 3.785 * 10) / 10} gal` : `${Math.round(l)} L` });

/**
 * The tank-minimum lines under the bar (Nathan 2026-10-21): a red line per species below its minimum (or that cannot be assessed),
 * naming the unmet measure, sourced or "estimated from a gallon figure"; a yellow line for advisories (deeper water than advised).
 * Below the recommended size is said by the yellow bar and its list, not by a line. Same 10 % slack as the animal gate and the
 * tank-fit engine (MIN_SLACK_PCT) on the red line.
 */
export function minWarnings(m: TankMinimum, units: Units): MinWarn[] {
  const f = fmtOf(units), name = (x: MinRow) => plural(x.n, x.name), out: MinWarn[] = [];
  for (const x of [...m.rows].sort((a, b) => b.pct - a.pct)) if (x.pct > MIN_SLACK_PCT) out.push({ level: 'over', text: `${name(x)}: ${reasonIn(x, f)}` });
  for (const x of m.rows) if (x.pct <= MIN_SLACK_PCT) for (const n of notesIn(x, f)) out.push({ level: 'near', text: `${name(x)}: ${n}` });
  return out;
}

/** The tank-minimum bar: the fill is the tank against the most demanding red line; red below a minimum, yellow below a Recommended mark, green past every one. */
export const MIN_WORD = { over: 'Too small', near: 'Meets minimum', ok: 'Meets recommended' } as const;
export function minBar(m: TankMinimum): Bar {
  if (m.percent === Infinity) return { pct: Infinity, fill: 100, level: 'over', text: 'Not assessed' };
  const b = bar(m.percent), level = m.percent > MIN_SLACK_PCT ? 'over' as const : m.comfortPercent > 100 ? 'near' as const : 'ok' as const;
  // a word, not the percent (2026-10-22): "100 %" read as either "just met" or "at the limit"; the percent stays in the meter and its tip
  return { ...b, level, text: MIN_WORD[level] };
}

/** "at least 23.5" x 12"; Recommended 31.5" long": each species' red and green lines, most demanding first (the bar's list). */
export function topMin(m: TankMinimum, units: Units, k = 3): TopRow[] {
  const f = fmtOf(units), dims = (l: MinLine) => `${f.len(l.L)}${l.W ? ` x ${f.len(l.W)}` : ' long'}${l.areaCm2 ? `, ${f.area(l.areaCm2)} of floor` : ''}${l.mark === 'derived (est)' ? ' (est. from gallons)' : ''}`;
  return [...m.rows].sort((a, b) => b.pct - a.pct || b.comfortPct - a.comfortPct).slice(0, k).map(x => {
    const d = minDataOf(x.id), red = d?.red ? dims(d.red) : '', h = d?.hRed ? `${f.len(d.hRed.H)} tall` : '';
    const rec = d?.green ? dims(d.green) : d?.hGreen ? `${f.len(d.hGreen.H)} tall` : d?.vol ? `${units === 'in' ? `${d.vol.gal} gal` : `${Math.round(d.vol.gal * 3.785)} L`} of water` : '';
    const least = [red, h].filter(Boolean).join(', ');
    return { name: x.name, n: x.n, share: 0, note: [least ? `at least ${least}` : 'no minimum stated', rec && `Recommended ${rec}`].filter(Boolean).join('; ') };
  });
}

/** "Tank 24 × 13 in, 18.5 gal of water": the size the percents are of (2026-10-22: without it nobody can judge them). */
export const tankSizeLine = (S: TankSetup, r: Stocking, units: Units) => { const e = tankExtent(S.tank); return `Tank ${fmtBox(e.w, e.d, units)}, ${fmtOf(units).vol(r.capacity.litres)} of water`; };

/** The reason line from space alone, for a tank whose filter is not chosen yet. */
export function spaceReason(r: Stocking): string {
  if (!r.contributors.length) return '';
  const p = r.spacePercent, top = topBy(r, r.spaceBy === 'floor' ? 'floor' : 'space', 1)[0];
  if (isOver(p) && r.spaceBy === 'floor') return `The floor is too small for the bottom dwellers (${Math.round(p)}% of it), mainly the ${plural(top.n, top.name)}: no extra height fixes that, it needs about ${Math.ceil(r.floor.usedCm2 / 6.4516)} sq in of floor or fewer bottom dwellers.`;
  if (isOver(p)) return `The tank is too small for them (${Math.round(p)}% of its space), mainly the ${plural(top.n, top.name)}: it needs about ${Math.ceil(r.capacity.litres * r.waterPercent / 100)} L of water or fewer animals.`;
  return Math.round(p) >= NEAR_FULL ? (r.spaceBy === 'floor' ? 'Past ideal by floor: fewer bottom dwellers or a tank with a bigger base would help.' : 'Past ideal by space: tread carefully, room for a few small animals at most.') : `${Math.round(p)}% · limited by ${r.spaceBy === 'floor' ? 'floor' : 'swimming room'}. Ideal.`;
}
export function tileState(S: TankSetup, r: Stocking, units: Units = 'cm'): TileState {
  const m = tankMinimum(S), mins = minWarnings(m, units), tooSmall = mins.some(w => w.level === 'over'), limit = S.layout.space, fit = limit ? spaceFit(S.tank, limit) : undefined;
  // no filter of the owner's yet (Nathan 2026-10-21): the pill and the reason come from space alone, not from an assumed filter
  const filter = filterState(S), unset = filter === 'unset', head = bar(unset ? r.spacePercent : r.percent), cr = compatRisks(S);
  return {
    show: S.water.on && (r.contributors.length > 0 || !!limit),
    space: bar(r.spacePercent), filt: bar(r.filtrationPercent), min: minBar(m), mins, head: tooSmall && head.level !== 'over' ? { ...head, level: 'over', text: 'Too small' } : head,
    water: bar(r.waterPercent), floor: bar(r.floorPercent), spaceBy: r.spaceBy, topFloor: topBy(r, 'floor'),
    topSpace: topBy(r, r.spaceBy === 'floor' ? 'floor' : 'space'), topFilt: topBy(r, 'load'), topMin: topMin(m, units), reason: unset ? spaceReason(r) : r.reasons.join(' '), filter, // every reason, the fix that would bring it under 100 % too (the sidebar line moved here, Nathan 2026-10-22)
    ...(limit ? { limit, fit } : {}), ...(cr ? { compat: { level: cr.level === 'high' ? 'over' as const : 'near' as const, text: compatLine(cr) } } : {}),
  };
}

/** mg a day, as the breakdown prints it: one decimal under 10. */
export const mg = (g: number) => { const m = g * 1000; return `${m < 10 ? m.toFixed(1) : Math.round(m)} mg`; };
export interface NRow { label: string; value: string; note?: string }
/** Where the day's ammonia goes (the nitrogen budget behind the filtration bar), for the expanded tile. */
export function nitrogenRows(n: Nitrogen): NRow[] {
  const mgN = (g: number) => `${mg(g)} N`;
  const rows: NRow[] = [
    { label: 'Animals make', value: mgN(n.tan), note: `as ammonia (TAN), on ${n.feeding} feeding` },
    { label: 'Plants take', value: mgN(n.byPlants), note: !n.plants.count ? 'no live plants'
      : `of about ${mgN(n.plants.gN)} they can`
        + (n.byPlants >= n.tan * PLANT_SHARE_MAX - 1e-9 ? `; held to ${Math.round(PLANT_SHARE_MAX * 100)}% of the animals' ammonia, the filter keeps the rest for nights and feeding peaks` : '')
        + (n.plants.rootCount ? `. ${n.plants.rootCount} root feeder${n.plants.rootCount > 1 ? 's' : ''} counted at half: they feed from the substrate` : '') },
    { label: n.filter.kind === 'none' ? 'Surface bacteria' : 'Filter bacteria', value: mgN(n.byBacteria), note: `of about ${mgN(n.filterG)} they can; the bar is full at ${mgN(n.safeG)} (${n.filter.label})` },
  ];
  if (n.plants.count && n.byPlants > 0) rows.push({ label: 'Filter load without plants', value: `${pctText(n.plantFreeAmmoniaPercent)}%`, note: `with the plants ${pctText(n.ammoniaPercent)}%; new plants take weeks to grow in, so the filter carries this at first` });
  if (n.unprocessed > 0) rows.push({ label: 'Left in the water', value: mgN(n.unprocessed), note: 'ammonia builds up' });
  if (n.fert.gN > 0) rows.push({ label: 'Fertilizer adds', value: mgN(n.fert.gN), note: `as nitrate; plants use ${mgN(n.fert.toPlants)}`
    + (n.fert.toNitrate > 1e-6 ? `, ${mgN(n.fert.toNitrate)} is left to change out${n.fert.option === 'ei' ? ' (the big weekly EI change does that)' : ''}` : '') });
  if (n.plants.gN > 0) rows.push(n.fishCoverPlants
    ? { label: 'Plant nitrogen', value: 'likely from the animals', note: 'their waste probably covers what the plants take, so a fertilizer without nitrogen (potassium, iron, trace) may be enough; pale older leaves mean the plants want nitrogen too' }
    : n.plantRoom > 1e-6 ? { label: 'Plants could use', value: `${mgN(n.plantRoom)} more`, note: 'nitrogen a day beyond what the animals and fertilizer give: more animals or a fertilizer with nitrogen' }
    : { label: 'Plant nitrogen', value: 'animals + fertilizer', note: 'the fertilizer makes up what the animals do not give' });
  rows.push({ label: 'Nitrate-only water change', ...waterChangeText(n) });
  return rows;
}
const pctText = (p: number) => p === Infinity ? 'over 999' : String(Math.round(p));
/** The nitrate-only weekly water change in Decision 2's three states (research/tank-minimum-first-principles.md), beside the 10 % routine floor. */
export function waterChangeText(n: Nitrogen): { value: string; note: string } {
  const w = n.waterChange, tap = w.tapMgN > 0 ? ` with tap water at ${Math.round(w.tapMgN / NO3_TO_N)} ppm` : '';
  if (w.state === 'failure' && w.why === 'tap') return { value: 'cannot be met', note: `the tap water's nitrate (${Math.round(w.tapMgN / NO3_TO_N)} ppm) is at or above the 40 ppm target, so water changes cannot bring it down: use RO/DI or a nitrate-removing resin, or test the tap again` };
  if (w.state === 'failure') return { value: `${pctText(w.uncappedPct)}% a week`, note: `more than two 50 % changes a week${tap}: the stock makes more nitrate than water changes can hold near 40 ppm. Less stock or more plants` };
  if (w.state === 'high') return { value: `${pctText(w.uncappedPct)}% a week`, note: `high maintenance: over 50 % in one change. Two changes of about ${Math.round(w.perChangePct)}% a week hold about 40 ppm${tap}, or less stock` };
  return { value: w.uncappedPct >= 1 ? `${Math.round(w.uncappedPct)}% a week` : 'under 1% a week', note: `nitrate alone, to hold about 40 ppm${tap}; the routine ${Math.round(ROUTINE_FLOOR * 100)} % a week still applies (hardness, organics, phosphate)` };
}

/** The fork card is due when an edit takes the tank from inside the space to past it (not every frame it stays past). */
export const forkDue = (was: boolean | undefined, fits: boolean | undefined) => was === true && fits === false;

/** mm in the scene's units, as typed in the fields: whole cm, or inches to a tenth. */
export const toUnits = (mm: number, u: Units) => u === 'in' ? Math.round(mm / 25.4 * 10) / 10 : Math.round(mm / 10);
export const fromUnits = (v: number, u: Units) => Math.round(u === 'in' ? v * 25.4 : v * 10);
const fmt = (mm: number, u: Units) => `${toUnits(mm, u)}${u === 'in' ? '"' : ' cm'}`;
const fmtBox = (w: number, d: number, u: Units) => `${toUnits(w, u)} × ${toUnits(d, u)}${u === 'in' ? ' in' : ' cm'}`;

/** One line on what goes past the space: "14 cm too long and 5 cm too deep for your space." */
export function overLine(f: SpaceFit, u: Units): string {
  const p = [f.over.w && `${fmt(f.over.w, u)} too long`, f.over.d && `${fmt(f.over.d, u)} too deep`, f.over.h && `${fmt(f.over.h, u)} too tall`].filter(Boolean) as string[];
  return p.length ? `${p.length > 1 ? p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1] : p[0]} for your space.`.replace(/^./, c => c.toUpperCase()) : '';
}

/** What the fork card gets: the tank, the space, how far past it, and the stocking that asked for the tank. */
export interface SpaceFork { setup: TankSetup; limit: SpaceLimit; fit: SpaceFit; stocking: Stocking }
type ForkFn = (f: SpaceFork) => void;
let forkFn: ForkFn | null = null;
/** Lane P5's fork card registers here; returns the unregister. While none is registered the tile only says it is too big. */
export function onSpaceFork(fn: ForkFn) { forkFn = fn; return () => { if (forkFn === fn) forkFn = null; }; }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const MIN_KEY = 'tanklook.ftMin', N_KEY = 'tanklook.ftN', C_KEY = 'tanklook.ftCounts';

export function attachFullnessTile(viewer: Viewer, store: Store) {
  const host = document.getElementById('view')!, tools = host.querySelector('.viewtools'); // top-left, under the view's buttons (the demand panel holds the top right)
  const el = document.createElement('section');
  el.className = 'ft'; el.hidden = true; el.setAttribute('aria-label', 'How full the tank is');
  el.style.setProperty('--ideal', String(NEAR_FULL)); // the load bars' colour scale (style.css .ftLoad) follows IDEAL_MAX
  el.innerHTML = `<button class="ftHead" type="button" aria-expanded="true" title="Minimize the fullness tile"><span class="ftTitle">Fullness</span><span class="ftPill"></span><span class="ftChev" aria-hidden="true">▾</span></button>
<div class="ftBody"><div class="ftBars"></div><details class="ftN ftCounts"><summary>What counts</summary><ul class="ftCountsBody"></ul></details>
<details class="ftN"><summary>Where the ammonia goes, per day</summary><div class="ftNCtl">
<label>Feeding <select class="ftFeed" title="How heavily the animals are fed: sets the waste they make"><option value="light">Light (0.5 % of body weight a day)</option><option value="normal">Normal (1 %)</option><option value="heavy">Heavy (2 %)</option></select></label>
<label>Tap nitrate <input class="ftTap" type="number" min="0" max="200" step="1" placeholder="0" title="Nitrate in your tap (source) water, ppm as NO3, from a test kit or your water report; blank = 0"> ppm</label></div><div class="ftNBody"></div></details><div class="ftSpace"></div>
<form class="ftForm" hidden><div class="ftFields">
<label>Width <input name="w" type="number" inputmode="decimal" min="1" step="any" required></label>
<label>Depth <input name="d" type="number" inputmode="decimal" min="1" step="any" required></label>
<label>Height <input name="h" type="number" inputmode="decimal" min="1" step="any" placeholder="any"></label>
<span class="ftU"></span></div>
<div class="ftBtns"><button type="submit" class="primary">Done</button><button type="button" class="ftClear">Remove my space</button></div></form></div>`;
  host.append(el);
  // the button row wraps on a narrow view: the tile starts below its last row
  const place = () => { const v = host.getBoundingClientRect(), t = tools?.getBoundingClientRect(); el.style.top = `${t && t.height ? Math.round(t.bottom - v.top + 8) : 10}px`; };
  if (tools) new ResizeObserver(place).observe(tools);
  place();
  const $ = <T extends Element>(s: string) => el.querySelector(s) as T;
  const head = $<HTMLButtonElement>('.ftHead'), pill = $<HTMLElement>('.ftPill'), bars = $<HTMLElement>('.ftBars'), spaceEl = $<HTMLElement>('.ftSpace');
  const nEl = $<HTMLDetailsElement>('.ftN:not(.ftCounts)'), nBody = $<HTMLElement>('.ftNBody'), feed = $<HTMLSelectElement>('.ftFeed'), tap = $<HTMLInputElement>('.ftTap');
  const cEl = $<HTMLDetailsElement>('.ftCounts'), cBody = $<HTMLElement>('.ftCountsBody');
  try { nEl.open = localStorage.getItem(N_KEY) === '1'; } catch { /* storage blocked */ }
  try { cEl.open = localStorage.getItem(C_KEY) === '1'; } catch { /* storage blocked */ }
  cEl.ontoggle = () => { try { localStorage.setItem(C_KEY, cEl.open ? '1' : '0'); } catch { /* ignore */ } };
  nEl.ontoggle = () => { try { localStorage.setItem(N_KEY, nEl.open ? '1' : '0'); } catch { /* ignore */ } };
  const form = $<HTMLFormElement>('.ftForm'), inp = (n: string) => form.elements.namedItem(n) as HTMLInputElement;

  let min = matchMedia('(max-width: 700px)').matches; // a phone's view is short: minimized until opened once
  try { const v = localStorage.getItem(MIN_KEY); if (v) min = v === '1'; } catch { /* storage blocked */ }
  const setMin = (m: boolean, save = true) => {
    min = m; el.classList.toggle('min', m); head.setAttribute('aria-expanded', String(!m)); head.title = m ? 'Show the fullness tile' : 'Minimize the fullness tile';
    if (save) try { localStorage.setItem(MIN_KEY, m ? '1' : '0'); } catch { /* ignore */ }
  };
  setMin(min, false);
  head.onclick = () => setMin(!min);

  // Load bars (water, floor, filt; Nathan 2026-10-26): the track is the whole scale, green to the ideal (IDEAL_MAX), green -> amber to half
  // way to the limit, amber -> red at 100 and red past it, with a line where this tank is; the reached part is full strength, the part ahead
  // faint. Past 100 the scale runs to the tank's percent, so the zones shrink to make room (style.css .ftLoad, --pct on the track). The
  // minimum bar keeps one colour per level: its yellow line is Recommended, not the ideal.
  const LOAD_TIP = ` The scale: green to the ideal (${NEAR_FULL}%), amber half way to the limit, red at 100%; the line is this tank. Past 100% the scale stretches to reach it.`;
  const row = (key: string, label: string, b: Bar, top: TopRow[], what: string, hd = `Most of the ${what}:`, tip = '', none = 'No animals in the water yet.', load = key !== 'min') => {
    const t = (tip + (load ? LOAD_TIP : '')).trim();
    return `<div class="ftRow ft-${b.level}${load ? ' ftLoad' : ''}" tabindex="0" data-row="${key}"${t ? ` title="${esc(t)}"` : ''}><div class="ftLab"><span>${label}</span><b>${b.text}</b></div>`
      + `<div class="ftTrack" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(b.pct, 999))}" style="--pct:${Math.min(b.pct, 999)}"><i></i></div>`
      + `<div class="ftTop">${top.length ? `<div class="ftTopHd">${hd}</div>` + top.map(t => `<div>${esc(plural(t.n, t.name))} <b>${t.note ? esc(t.note) : `${Math.round(t.share * 100)}%`}</b></div>`).join('') : `<div>${none}</div>`}</div></div>`;
  };

  let lastSig = '', editing = false;
  const fitWas = new Map<number, boolean>(); // per tank: did it fit the space after the last edit

  const render = () => {
    const S = store.tank, r = stockingMemo(S), u = store.scene.units, st = tileState(S, r, u);
    const animalsHidden = viewer.hidden.has('fish');
    el.hidden = !st.show || animalsHidden || tankView.ghost; // no tank chosen yet on the stocking screen: nothing to be full
    const crowd = crowdWarnings(S), cover = coverAdvice(S); // S196: fighting limits, a warning only (never in the percents); lane CP2: cover
    const sig = JSON.stringify([st, u, editing, !!forkFn, tankExtent(S.tank), crowd, cover, stockingDetail(r), r.capacity, r.nitrogen, S.water.tapNitrate ?? 0]);
    if (sig === lastSig) return;
    lastSig = sig;
    el.classList.toggle('over', st.head.level === 'over' || st.fit?.fits === false);
    pill.textContent = (st.fit?.fits === false ? `${st.head.text} · too big` : st.head.text) + (st.compat ? ` · ${st.compat.level === 'over' ? 'compat risk' : 'compat concern'}` : ''); // lane CP: seen while minimized, the bar colours stay load-only
    pill.title = st.compat?.text ?? '';
    pill.className = `ftPill ft-${st.fit?.fits === false ? 'over' : st.head.level}`;
    const box = (on: boolean) => `<label class="ftNoFilt"><input type="checkbox" class="ftNoFilter"${on ? ' checked' : ''}> No filter: I am keeping this tank filterless (Walstad style)</label>`;
    // lane HB (Nathan 2026-10-21): Space split into its two limits; the pill and the tank fit use the larger
    const spaceRows = row('water', 'Water column', st.water, topBy(r, 'space'), 'water column', undefined, 'How full the water is: body size against the litres (fitted to AqAdvisor). More height counts here.')
      + row('floor', 'Floor', st.floor, st.topFloor, 'floor', 'Most of the floor:', 'Floor the bottom dwellers use: 15 sq in per inch of fish (research/habitat-model.md). A taller tank adds no floor.', 'No bottom dwellers: the floor is free.');
    bars.innerHTML = `<div class="ftWhy ftSize">${esc(tankSizeLine(S, r, u))}</div>` + (st.compat ? `<div class="ftWarn ft-${st.compat.level} ftCompat">${esc(st.compat.text)}</div>` : '') + spaceRows
      + (st.filter === 'unset' ? `<div class="ftWarn ft-near ftNeedFilter"><b>This tank needs a filter.</b> Add one in Tech › Filtration to see its filtration.${box(false)}</div>`
        : row('filt', 'Filtration', st.filt, st.topFilt, 'waste', undefined, 'Ammonia the filter bacteria can process, after the plants take their share. It does not measure nitrate, oxygen, pH or temperature.')
          + (st.filter === 'filterless' ? `<div class="ftWhy">${box(true)}: bacteria on glass, substrate and decor only.</div>` : ''))
      + (st.topMin.length ? row('min', 'Tank minimum', st.min, st.topMin, 'minimum', 'Smallest tank they want, whatever the count:', Number.isFinite(st.min.pct) ? `Their minimum tank is ${Math.round(st.min.pct)}% of this one: green past every Recommended size, yellow between the minimum and Recommended, red below the minimum.` : '') : '')
      + st.mins.map(w => `<div class="ftWarn ft-${w.level}">${esc(w.text)}</div>`).join('')
      + crowd.map(t => `<div class="ftWarn ft-near ftCrowd">${esc(t)}</div>`).join('')
      + cover.map(t => `<div class="ftWarn ft-near ftCover">${esc(t)}</div>`).join('')
      + (st.reason ? `<div class="ftWhy">${esc(st.reason)}</div>` : '');
    cEl.hidden = !r.contributors.length;
    if (!cEl.hidden) cBody.innerHTML = stockingDetail(r).map(t => `<li>${esc(t)}</li>`).join('') + `<li class="dim">Water ${u === 'in' ? `${Math.round(r.capacity.litres / 3.785)} gal` : `${Math.round(r.capacity.litres)} L`}, filter x${r.capacity.filter.toFixed(2)}${r.capacity.plantCount ? `, plants x${r.capacity.plants.toFixed(2)}` : ''}, ${u === 'in' ? `${Math.round(r.capacity.tempC * 9 / 5 + 32)} °F` : `${Math.round(r.capacity.tempC)} °C`}.</li>`;
    const n = r.nitrogen;
    if (document.activeElement !== feed) feed.value = n.feeding;
    if (document.activeElement !== tap) tap.value = S.water.tapNitrate ? String(S.water.tapNitrate) : '';
    nEl.hidden = !r.contributors.length || n.tan <= 0 || st.filter === 'unset';
    if (!nEl.hidden) {
      const seg = (cls: string, g: number) => g > 0 ? `<i class="${cls}" style="width:${g / n.tan * 100}%"></i>` : '';
      nBody.innerHTML = `<div class="ftNSplit" aria-hidden="true">${seg('p', n.byPlants)}${seg('b', n.byBacteria)}${seg('u', n.unprocessed)}</div>`
        + nitrogenRows(n).map(x => `<div class="ftNRow"><span>${esc(x.label)}</span><b>${esc(x.value)}</b></div>${x.note ? `<div class="ftNNote">${esc(x.note)}</div>` : ''}`).join('')
        + `<div class="ftNNote">Nitrate rises about ${n.nitrateMgNPerWeek.toFixed(1)} mg N/L a week.</div>`
        + `<div class="ftNNote">${st.filter === 'filterless' ? 'With no filter the bacteria build up on the surfaces slowly: let the plants grow in and add the animals a few at a time.' : 'A new filter has no bacteria yet: cycle it (about 4-6 weeks, ammonia and nitrite at 0) before the full stock goes in.'}</div>`
        + `<div class="ftNNote ftNCaveat">Rough figures: animals ±40 %, plant and bacteria rates from few studies.</div>`;
    }
    const e = tankExtent(S.tank);
    spaceEl.innerHTML = editing ? `<div class="ftHint">The dashed outline in the view is your space; the tank's back sits on its back edge.</div>`
      : !st.limit ? `<button type="button" class="ftSet" title="Enter the area you have for the tank; it is drawn as a dashed outline">Set my space</button>`
      : `<div class="ftMine ${st.fit!.fits ? 'ok' : 'bad'}"><span>Your space ${fmtBox(st.limit.w, st.limit.d, u)}${st.limit.h ? `, ${fmt(st.limit.h, u)} high` : ''} · tank ${fmtBox(e.w, e.d, u)}</span><button type="button" class="ftSet ftEdit">Edit</button></div>`
        + (st.fit!.fits ? '' : `<div class="ftOver">${esc(overLine(st.fit!, u))}${forkFn ? ' <button type="button" class="ftFork">Make room or swap…</button>' : ''}</div>`);
  };

  const fork = () => {
    const S = store.tank, limit = S.layout.space; if (!limit || !forkFn) return;
    const f = forkFn; queueMicrotask(() => f({ setup: S, limit, fit: spaceFit(S.tank, limit), stocking: stockingMemo(S) })); // after this change's listeners
  };
  const openForm = () => {
    const S = store.tank, s = S.layout.space ?? defaultSpace(S.tank, store.scene.units), u = store.scene.units;
    inp('w').value = String(toUnits(s.w, u)); inp('d').value = String(toUnits(s.d, u)); inp('h').value = s.h ? String(toUnits(s.h, u)) : '';
    $<HTMLElement>('.ftU').textContent = u === 'in' ? 'inches' : 'cm';
    editing = true; form.hidden = false;
    if (!S.layout.space) writeSpace(); // the outline shows at once, from the starting size
    inp('w').focus(); inp('w').select();
  };
  const closeForm = () => { editing = false; form.hidden = true; lastSig = ''; render(); };
  /** The fields to layout.space, clamped; one undo step per editing session (coalesced). */
  const writeSpace = () => {
    const u = store.scene.units, mm = (n: string) => { const v = parseFloat(inp(n).value); return Number.isFinite(v) && v > 0 ? Math.min(SPACE_MAX, Math.max(SPACE_MIN, fromUnits(v, u))) : 0; };
    const w = mm('w'), d = mm('d'), h = mm('h'); if (!w || !d) return;
    const i = store.scene.active;
    store.update(s => { s.tanks[i].layout.space = { w, d, ...(h ? { h } : {}) }; }, { coalesce: 'ftSpace' });
  };
  form.oninput = writeSpace;
  form.onsubmit = ev => { ev.preventDefault(); writeSpace(); store.seal(); closeForm(); const S = store.tank; if (S.layout.space && !spaceFit(S.tank, S.layout.space).fits) fork(); }; // a space smaller than the tank: the fork card at once
  form.onkeydown = ev => { if (ev.key === 'Escape') { ev.preventDefault(); store.seal(); closeForm(); } };
  $<HTMLButtonElement>('.ftClear').onclick = () => {
    const i = store.scene.active; store.seal();
    store.update(s => { delete s.tanks[i].layout.space; }); closeForm();
  };
  bars.onchange = ev => {
    const t = ev.target as HTMLInputElement;
    if (!t.classList.contains('ftNoFilter')) return;
    store.seal(); store.edit(s => setFilterless(s, t.checked)); store.seal();
  };
  feed.onchange = () => { const v = feed.value as 'light' | 'normal' | 'heavy'; store.edit(s => { s.feeding = v === 'normal' ? undefined : v; }); };
  tap.onchange = () => { const v = parseFloat(tap.value); store.edit(s => { s.water.tapNitrate = v > 0 ? v : undefined; }); };
  spaceEl.onclick = ev => {
    const t = ev.target as HTMLElement;
    if (t.closest('.ftSet')) openForm(); else if (t.closest('.ftFork')) fork();
  };
  // touch: a tap on a bar shows / hides who fills it (hover does it with a mouse)
  bars.onclick = ev => { const r = (ev.target as HTMLElement).closest('.ftRow'); if (r) r.classList.toggle('open'); };

  store.subscribe(kind => {
    if (kind === 'load') { fitWas.clear(); if (editing) closeForm(); }
    const S = store.tank, i = store.scene.active, fits = S.layout.space ? spaceFit(S.tank, S.layout.space).fits : undefined;
    if (kind === 'scene' && !editing && forkDue(fitWas.get(i), fits)) fork(); // an edit took the tank past the space
    if (fits === undefined) fitWas.delete(i); else fitWas.set(i, fits);
    render();
  });
  // the Show boxes and the menu focus live on the viewer: follow them after each frame (class / hidden flips only)
  viewer.onDrawn(() => {
    const mf = document.getElementById('app')?.classList.contains('collapsed') ? null : viewer.menuFocus;
    el.classList.toggle('ftFade', !!mf && mf !== 'fish');
    render();
  });
  render();
  return { render, el };
}
