// Habitat check helpers (UI2 §7 P6, lane S1, 2026-11-13): the pure view-model behind the habitat check, moved out of
// ui/fullnessTile.ts so the old tile and the new shell's Habitat drawer (src/shell/) share one copy. No DOM here.
import { compatLine, compatRisks } from '../../scene/territory';
import { spaceFit, tankExtent, type SpaceFit } from '../../scene/space';
import { IDEAL_MAX, isOver, plural, type Stocking } from '../../scene/stocking';
import { MIN_SLACK_PCT } from '../../scene/animalfit';
import { minDataOf, tankMinimum, type MinLine, type TankMinimum } from '../../scene/tankMin';
import { NO3_TO_N, PLANT_SHARE_FILTERLESS, PLANT_SHARE_MAX, type Nitrogen } from '../../scene/nitrogen';
import { filterState, type FilterState } from '../../scene/tech';
import dd from '../../data/demand-defaults.json';
import type { SpaceLimit, TankSetup, Units } from '../../scene/types';
import { minWarnings, toUnits, fmtOf, type MinWarn } from '../stockSummary';
const ROUTINE_FLOOR = dd.time.waterChangeFraction.floor;

/** A bar at or over this reads "caution" (amber, past ideal); over 100 is over (red). */
export const NEAR_FULL = IDEAL_MAX;
export type Level = 'ok' | 'near' | 'over';
export interface Bar { pct: number; /** fill width, 0..100 */ fill: number; level: Level; text: string }
export interface TopRow { name: string; n: number; /** share of this bar's load, 0..1 */ share: number; /** printed in place of the share (the minimum bar: what the species wants) */ note?: string }
export interface TileState {
  /** anything to show: water on, and animals in it or a space set */
  show: boolean;
  space: Bar;
  /** the tank against the most demanding species' red line (scene/tankMin.ts): red below a minimum, yellow below a Recommended mark, green at or past every one (Nathan 2026-10-21, "Bar back, keep lines") */
  min: Bar;
  /** species the tank is too small for (red), by name and unmet measure (scene/tankMin.ts), and advisories (yellow: deeper water than advised); empty when every species has its minimum */
  mins: MinWarn[];
  topSpace: TopRow[]; topMin: TopRow[];
  /** the two limits behind Space (lane HB): the water limit, the floor limit (bottom dwellers), which binds, and who uses the floor */
  water: Bar; floor: Bar; spaceBy: 'water' | 'floor'; topFloor: TopRow[];
  /** the larger of the two, for the minimized pill */
  head: Bar;
  reason: string;
  /** compatibility, apart from the bars (lane CP 2026-10-22): leads the tile's lines when the stock has a risk */
  compat?: { level: 'over' | 'near'; text: string };
  /** whose filter counts (scene/tech.ts filterState): 'unset' shows a note recommending a filter sized for the tank (the Filtration bar is shelved, Nathan 2026-10-30) */
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
    const gl = (x.alone && d?.greenAlone) || d?.green, rec = gl ? dims(gl) : d?.hGreen ? `${f.len(d.hGreen.H)} tall` : d?.vol ? `${units === 'in' ? `${d.vol.gal} gal` : `${Math.round(d.vol.gal * 3.785)} L`} of water` : '';
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
  // Filtration bar shelved (Nathan 2026-10-30): the engine still runs (scene/nitrogen.ts, builds, plan sheet sizing), only the bar is gone; the headline is room only
  const filter = filterState(S), head = bar(r.spacePercent), cr = compatRisks(S);
  return {
    show: S.water.on && (r.contributors.length > 0 || !!limit),
    space: bar(r.spacePercent), min: minBar(m), mins, head: tooSmall && head.level !== 'over' ? { ...head, level: 'over', text: 'Too small' } : head,
    water: bar(r.waterPercent), floor: bar(r.floorPercent), spaceBy: r.spaceBy, topFloor: topBy(r, 'floor'),
    topSpace: topBy(r, r.spaceBy === 'floor' ? 'floor' : 'space'), topMin: topMin(m, units), reason: r.reasons.join(' '), filter, // every reason, the fix that would bring it under 100 % too (the sidebar line moved here, Nathan 2026-10-22)
    ...(limit ? { limit, fit } : {}), ...(cr ? { compat: { level: cr.level === 'high' ? 'over' as const : 'near' as const, text: compatLine(cr) } } : {}),
  };
}

/** mg a day, as the breakdown prints it: one decimal under 10. */
export const mg = (g: number) => { const m = g * 1000; return `${m < 10 ? m.toFixed(1) : Math.round(m)} mg`; };
export interface NRow { label: string; value: string; note?: string }
/** Where the day's ammonia goes (the nitrogen budget behind the filtration bar), for the expanded tile. */
export function nitrogenRows(n: Nitrogen): NRow[] {
  const mgN = (g: number) => `${mg(g)} N`;
  const share = n.filter.kind === 'none' ? PLANT_SHARE_FILTERLESS : PLANT_SHARE_MAX;
  const rows: NRow[] = [
    { label: 'Animals make', value: mgN(n.tan), note: `as ammonia (TAN), on ${n.feeding} feeding` },
    { label: 'Plants take', value: mgN(n.byPlants), note: !n.plants.count ? 'no live plants'
      : `of about ${mgN(n.plants.gN)} they can`
        + (n.byPlants >= n.tan * share - 1e-9 ? `; held to ${Math.round(share * 100)}% of the animals' ammonia, ${n.filter.kind === 'none' ? 'the surface bacteria keep the rest' : 'the filter keeps the rest'} for nights and feeding peaks` : '')
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

export const fromUnits = (v: number, u: Units) => Math.round(u === 'in' ? v * 25.4 : v * 10);
export const fmtLen = (mm: number, u: Units) => `${toUnits(mm, u)}${u === 'in' ? '"' : ' cm'}`;
export const fmtBox = (w: number, d: number, u: Units) => `${toUnits(w, u)} × ${toUnits(d, u)}${u === 'in' ? ' in' : ' cm'}`;

/** One line on what goes past the space: "14 cm too long and 5 cm too deep for your space." */
export function overLine(f: SpaceFit, u: Units): string {
  const p = [f.over.w && `${fmtLen(f.over.w, u)} too long`, f.over.d && `${fmtLen(f.over.d, u)} too deep`, f.over.h && `${fmtLen(f.over.h, u)} too tall`].filter(Boolean) as string[];
  return p.length ? `${p.length > 1 ? p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1] : p[0]} for your space.`.replace(/^./, c => c.toUpperCase()) : '';
}

/** What the fork card gets: the tank, the space, how far past it, and the stocking that asked for the tank. */
export interface SpaceFork { setup: TankSetup; limit: SpaceLimit; fit: SpaceFit; stocking: Stocking }
