// The tank's minimum-size gate (Nathan 2026-10-20): separate from stocking density. Density (stocking.ts space / filtration) asks "is
// the water crowded for THIS many animals"; this asks "is the tank big enough for the species at all, however few".
// Lane MM (2026-10-21) moved it onto the lines Nathan decided (research/sourcing/decisions.md MX1-MX9, research/tank-minimum-first-principles.md
// "Decisions"): per species a RED line, the minimum (below it the species fails), and an optional GREEN line, the Recommended mark (at or
// above it all is well); between the two = yellow, "below the recommended size", allowed. Data: src/data/tankmin.json (scripts/tank-min-data.mjs
// from research/sourcing/tank-minimum/summary.json); every value is sourced, sourced (est) or derived (est) from a gallon figure.
// Each measure is held on its own (no surplus covers a shortfall); water volume is never a gate (Decision 2): it only gives the yellow note.
// Percent = what the tank would have to be / what it is, so 100 = exactly the line and over 100 = short of it, like the other bars.
import TM from '../data/tankmin.json';
import { getSpecies, type Species } from '../data/species';
import { bioloadLitres } from './starter';
import { careOf, zoneOf } from './zone';
import { tankExtent } from './space';
import { footprint } from './shape';
import { countsAgainstWater } from './stocking';
import { MIN_SLACK_PCT } from './animalfit';
import { SUBSTRATE_CAP, volume, waterY } from './physics';
import type { TankSetup } from './types';

/** Where a value comes from (Decision 5): a page states it; a page states it without conditions; or worked out from a gallon figure via the smallest catalogue tank holding it. */
export type Mark = 'sourced' | 'sourced (est)' | 'derived (est)';
/** A footprint line, mm (L the longest floor side, W front to back) and, where a page states one "or equivalent", a floor area (cm2). */
export interface MinLine { L: number; W?: number; areaCm2?: number; mark: Mark; site: string; url: string; states: string; from: string; ref?: string }
export interface HeightLine { H: number; mark: Mark; site: string; url: string; states: string }
/** Decision 4 depth notes (no page states a required minimum water depth for any species, MX7). */
export interface DepthNote { recommendedTankHeightMm?: number; advisoryTankHeightMm?: number; maxWaterDepthMm?: number; mark?: string; note: string }
export interface MinData { red?: MinLine; green?: MinLine; hRed?: HeightLine; hGreen?: HeightLine; depth?: DepthNote; vol?: { gal: number; mark: string; site: string; url: string }; why: string }
const lines = (TM as unknown as { species: Record<string, MinData> }).species;
/** The decided lines of one species; undefined = none (aquatic invertebrates and the regal jumper: never fail on size). */
export const minDataOf = (id: string): MinData | undefined => lines[id];

/** Decision 3: a large-bodied swimmer is held to the stated front-to-back width as well as the length; smaller swimmers to the length. Adult length at or over this, mm. */
export const LARGE_BODY_MM = 150;
const GAL_L = 3.785;

/** The tank's floor area, cm2, any shape (outer footprint); its longest floor side and its shortest (front to back for a rectangle), mm. */
export function floorOf(T: TankSetup['tank']): { areaCm2: number; runMm: number; widthMm: number } {
  const ring = footprint(T).ring, e = tankExtent(T);
  let a = 0;
  for (let i = 0; i < ring.length; i++) { const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length]; a += x1 * y2 - x2 * y1; }
  return { areaCm2: Math.abs(a) / 2 / 100, runMm: Math.max(e.w, e.d), widthMm: Math.min(e.w, e.d) };
}

/** What a tank offers: water (litres at the working fill), floor area, longest and shortest floor side; its height, its usable water depth and its full volume where known. */
export interface Geometry { litres: number; areaCm2: number; lengthMm: number; widthMm: number; heightMm?: number; /** water level minus substrate, mm (Decision 4); absent = no water */ depthMm?: number; /** the tank's full volume, L, for the gallon advisory (a "10 gal" figure is a tank size); absent = `litres` */ tankLitres?: number }
export const geometryOf = (S: TankSetup): Geometry => {
  const f = floorOf(S.tank), T = S.tank, s = S.substrate, cap = T.H * SUBSTRATE_CAP, sub = s?.show ? (Math.min(s.fl, cap) + Math.min(s.fr, cap) + Math.min(s.bl, cap) + Math.min(s.br, cap)) / 4 : 0;
  return { litres: bioloadLitres(S), areaCm2: f.areaCm2, lengthMm: f.runMm, widthMm: f.widthMm, heightMm: T.H, tankLitres: volume(T).litres,
    ...(S.water.on ? { depthMm: Math.max(0, waterY(T, S.water.level) - sub) } : {}) };
};
/** Usable water depth: the measured one, else 90 % of the tank height (labelled fallback, Decision 4), else the water spread over the floor. */
const depthOf = (g: Geometry) => g.depthMm ?? (g.heightMm ? 0.9 * g.heightMm : g.litres * 1e4 / Math.max(1, g.areaCm2));

export type Limit = 'length' | 'width' | 'floor area' | 'height' | 'water';
export interface Measured {
  pct: number; limiting: Limit;
  /** what the species wants of the limiting measure and what the tank has, in its own unit (mm, mm, cm2, mm, L) */
  need: number; have: number;
  /** where the line comes from; `derived (est)` = estimated from a gallon figure (its failure reads differently) */
  mark: Mark | 'advisory'; site: string; states: string;
}
/** What a species is held to and how it lives: a bottom dweller or land animal lives on the floor, swimmers use the run. */
export interface Who { floor: boolean; water: boolean; tl: number }
export const whoOf = (sp: Species): Who => ({ floor: sp.habitat === 'land' || zoneOf(sp) === 'bottom', water: sp.habitat === 'water', tl: sp.tl });

type Check = Omit<Measured, 'pct'>;
/**
 * The measures one line holds (Decision 3: classes choose which measures to look for, the species' values populate them).
 * Floor dwellers (bottom zone, land animals): the floor area, and the length and width a page states. Swimmers: the length; the width
 * too for a large-bodied fish; a stated "or equivalent" floor area (swordtail) on its own. A line DERIVED from a gallon figure gives one
 * requirement only (Decision 5): the floor area for floor dwellers, the length for swimmers.
 */
function checksOf(w: Who, l: MinLine | undefined, h: HeightLine | undefined, g: Geometry): Check[] {
  const out: Check[] = [];
  if (l) {
    const derived = l.mark === 'derived (est)', at = { mark: l.mark, site: l.site, states: l.states };
    const area = l.areaCm2 ?? (w.floor && l.W ? l.L * l.W / 100 : 0);
    if (area > 0) out.push({ limiting: 'floor area', need: area, have: g.areaCm2, ...at });
    if (!(derived && w.floor && area > 0)) out.push({ limiting: 'length', need: l.L, have: g.lengthMm, ...at });
    if (l.W && !derived && (w.floor || w.tl >= LARGE_BODY_MM)) out.push({ limiting: 'width', need: l.W, have: g.widthMm, ...at });
  }
  if (h && g.heightMm) out.push({ limiting: 'height', need: h.H, have: g.heightMm, mark: h.mark, site: h.site, states: h.states });
  return out;
}
const worst = (cs: Check[]): Measured => cs.reduce<Measured>((b, c) => { const pct = 100 * (c.have > 0 ? c.need / c.have : Infinity); return pct > b.pct ? { ...c, pct } : b; },
  { pct: 0, limiting: 'length', need: 0, have: 0, mark: 'sourced', site: '', states: '' });

export interface Lines {
  /** against the red line (the minimum); pct 0 = no line */
  red: Measured;
  /** against the green line (the Recommended mark; the red line where none is stated) and the gallon figure (advisory) */
  green: Measured;
  /** false = the tank cannot be judged for this species (Decision 3: kuhli in 2 in of water): not a pass */
  assessed: boolean;
  /** usable water depth, mm, and the advisory maximum it is over (ADF: deeper water than advised; never fails), 0 = none */
  depthMm: number; tooDeepMm: number;
}
/** How a length, a floor area and a volume print (cm by default; the tile passes its own units). */
export interface Fmt { len: (mm: number) => string; area: (cm2: number) => string; vol?: (litres: number) => string }
const CM: Fmt = { len: mm => `${Math.round(mm / 10)} cm`, area: cm2 => `${Math.round(cm2)} cm2` };

/** One species' lines against a tank geometry. */
export function measureLines(w: Who, d: MinData | undefined, g: Geometry): Lines {
  const red = worst(checksOf(w, d?.red, d?.hRed, g));
  const gc = checksOf(w, d?.green ?? d?.red, d?.hGreen ?? d?.hRed, g);
  // Decision 2: the gallon figure is husbandry guidance, a Recommended mark (mystery snail 5 gal), never a gate
  // a gallon figure names the catalogue size and the glass holds up to 10 % less (a 20 gal long, 30 x 12 x 12 in, is 71 L, not 75.7): the red lines' 10 % slack applies (Nathan 2026-10-26)
  if (d?.vol) gc.push({ limiting: 'water', need: d.vol.gal * GAL_L * 100 / MIN_SLACK_PCT, have: g.tankLitres ?? g.litres, mark: 'advisory', site: d.vol.site, states: `${d.vol.gal} gal` });
  const depth = depthOf(g), max = d?.depth?.maxWaterDepthMm ?? 0;
  // no page states a minimum water depth (MX7): water shallower than the animal is long is not assessed, not a pass
  return { red, green: worst(gc), assessed: !(w.water && depth < w.tl), depthMm: depth, tooDeepMm: max && depth > max ? max : 0 };
}

const what = (m: Measured, f: Fmt, n: number) => m.limiting === 'length' ? `${f.len(n)} long` : m.limiting === 'width' ? `${f.len(n)} front to back`
  : m.limiting === 'height' ? `${f.len(n)} tall` : m.limiting === 'floor area' ? `${f.area(n)} of floor` : (f.vol ?? (l => `${Math.round(l)} L`))(n);
const haveOf = (m: Measured, f: Fmt) => m.limiting === 'floor area' ? `this tank has ${what(m, f, m.have)}` : m.limiting === 'water' ? `this tank holds ${what(m, f, m.have)}` : `this one is ${what(m, f, m.have)}`;
/** The unmet red measure in words. A derived line says it is estimated from a gallon figure (Decision 5), a sourced one names its page. */
export function reasonOf(m: Measured, f: Fmt = CM): string {
  if (m.mark === 'derived (est)') return `estimated from a gallon figure (${m.site}: ${m.states.replace(/ -> /, ', the smallest such tank is a ')}): wants about ${what(m, f, m.need)}, ${haveOf(m, f)}`;
  return `wants ${m.limiting === 'floor area' ? '' : 'a tank '}at least ${what(m, f, m.need)} (${m.site}), ${haveOf(m, f)}`;
}
/** The yellow line: below the Recommended mark (allowed). */
export function recommendedOf(m: Measured, f: Fmt = CM): string {
  if (m.limiting === 'water') return `below the recommended size: ${m.site} gives ${m.states} of water, ${haveOf(m, f)}; a small volume swings fast`;
  return `below the recommended size: ${m.site} recommends ${m.mark === 'derived (est)' ? 'about ' : ''}${what(m, f, m.need)}, ${haveOf(m, f)}`;
}
/** The red sentence of a row in these units: the unmet measure, or why it is not assessed. */
export const reasonIn = (x: MinRow, f: Fmt = CM) => x.assessed ? reasonOf(x.measure, f) : `not assessed: ${f.len(x.depthMm)} of water is shallower than its own length (${f.len(x.tl)}), and no source states a minimum water depth`;
/** Advisories that never fail, in these units. */
export const notesIn = (x: MinRow, f: Fmt = CM) => x.tooDeepMm ? [`${f.len(x.depthMm)} of water, deeper than advised (${minDataOf(x.id)?.depth?.note})`] : [];

export interface MinRow {
  id: string; name: string; n: number;
  /** floor dwellers are held to floor area, swimmers to the run (the longest floor side) */
  kind: 'run' | 'area';
  /** against the red line (over 100 = short of the minimum; Infinity = not assessed) and the green line (over 100 = below the recommended size) */
  pct: number; comfortPct: number;
  /** the red line's length, mm (0 = no line) */
  minLengthMm: number;
  limiting: Limit;
  /** the sentence for the red line (or "not assessed"), and for the green one, in cm (reasonIn / recommendedOf print other units) */
  reason: string; comfortReason: string;
  measure: Measured; comfort: Measured;
  /** the red line's limiting measure is derived from a gallon figure */
  derived: boolean;
  assessed: boolean;
  /** usable water depth (mm), adult length (mm), the advisory maximum depth it is over (0 = none) */
  depthMm: number; tl: number; tooDeepMm: number;
  /** the deepest water it tolerates, mm (GroupCare maxDepthMm, a limit even beside a sourced advisory maximum: ADF, Nathan 2026-10-22); Infinity = no limit */
  maxDepthMm: number;
}
export interface TankMinimum {
  /** the highest species percent; 0 with no animals in the water; Infinity when a species cannot be assessed */
  percent: number;
  /** the highest Recommended percent: over 100 = below the recommended size for some species (allowed) */
  comfortPercent: number;
  litres: number; lengthMm: number;
  /** species by percent, most demanding first */
  rows: MinRow[];
  /** Pass / fail limits the tank-fit engine reads (lane HB, 2026-10-21; they used to live in tankfit.ts): the tank is shorter than some
   *  species' red-line length by more than the 10 % slack every red line gets (MIN_SLACK_PCT; S207 2026-10-22: strict, it failed the 29 gal
   *  for rummynose on a line derived from the 20 long, 756 vs 765 mm inside, while the tile passed it at 101 %), and its water is deeper than some species
   *  tolerates. `depthMm` is the usable water depth, `maxDepthMm` the shallowest limit (Infinity = none). */
  lengthShort: boolean; tooDeep: boolean; depthMm: number; maxDepthMm: number;
}

/** One species against a tank (the same answer the Fullness tile, the tank-fit engine, the animal gate and the hard truths all use). */
export function speciesMinimum(sp: Species, g: Geometry): MinRow {
  const w = whoOf(sp), d = minDataOf(sp.id), r = measureLines(w, d, g);
  const row: MinRow = { id: sp.id, name: sp.name, n: 1, kind: w.floor ? 'area' : 'run', pct: r.assessed ? r.red.pct : Infinity, comfortPct: r.green.pct, minLengthMm: d?.red?.L ?? 0,
    limiting: r.red.limiting, reason: '', comfortReason: recommendedOf(r.green), measure: r.red, comfort: r.green,
    derived: r.red.mark === 'derived (est)', assessed: r.assessed, depthMm: r.depthMm, tl: w.tl, tooDeepMm: r.tooDeepMm,
    maxDepthMm: careOf(sp.id)?.maxDepthMm ?? Infinity };
  row.reason = reasonIn(row);
  return row;
}

export function tankMinimum(S: TankSetup): TankMinimum {
  const g = geometryOf(S), by = new Map<string, MinRow>();
  for (const fi of S.fish) {
    const sp = getSpecies(fi.species);
    if (!sp || !countsAgainstWater(sp)) continue;
    const have = by.get(sp.id);
    if (have) { have.n++; continue; }
    by.set(sp.id, speciesMinimum(sp, g));
  }
  const rows = [...by.values()].sort((a, b) => b.pct - a.pct);
  const depthMm = depthOf(g), maxDepthMm = Math.min(Infinity, ...rows.map(r => r.maxDepthMm));
  return { percent: rows[0]?.pct ?? 0, comfortPercent: Math.max(0, ...rows.map(r => r.comfortPct)), litres: g.litres, lengthMm: g.lengthMm, rows,
    lengthShort: rows.some(r => r.minLengthMm / Math.max(1, g.lengthMm) * 100 > MIN_SLACK_PCT), tooDeep: depthMm > maxDepthMm, depthMm, maxDepthMm };
}

/** The animal gate's view of a tank: each species against this tank's geometry (pass as AnimalEnv.fit). */
export const minFit = (S: TankSetup) => { const g = geometryOf(S); return (sp: Species) => { const r = speciesMinimum(sp, g); return { pct: r.pct, reason: r.reason }; }; };
