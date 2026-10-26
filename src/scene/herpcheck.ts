// Stocking check for reptiles and amphibians (Nathan 2026-10-19): what the enclosure on screen breaks, from the rules in
// data/herpstock.ts. Advice only: it warns, nothing is blocked. 'warn' = below what the sources accept or a pairing they
// advise against; 'note' = below the usual recommendation, or advice that applies to this many animals; 'info' = how long
// the enclosure will last a growing animal. A juvenile is judged by its length (the stage it is in), not as an adult.
import { HERP, floorFor, SQFT_MM2, type HerpRule } from '../data/herpstock';
import { firstFail, lengthIn, span } from './outgrows';
import { fishTL, getSpecies } from '../data/species';
import { footprint } from './shape';
import { minDataOf } from './tankMin';
import { countsAgainstWater } from './stocking';
import type { TankSetup } from './types';

export interface StockIssue { level: 'warn' | 'note' | 'info'; who: string; text: string }

const sq = (n: number) => `${+n.toFixed(2)} sq ft (${(n * 0.0929).toFixed(2)} m²)`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

const inches = (mm: number) => `${+(mm / 25.4).toFixed(1)} in`;

/** One herp species' room in an enclosure: the floor and height it needs at its largest animal's stage, and what the enclosure has. */
export interface HerpRoom {
  sci: string; id: string; who: string; n: number; rule: HerpRule;
  /** the largest animal's length, mm, and whether it is in the adult stage */
  big: number; grown: boolean;
  /** floor (sq ft) needed and recommended at this stage, the height (in) needed; the enclosure's floor (with 5 % slack, and as built) and height (with 1 in) */
  need: number; want: number; hNeed?: number; area: number; raw: number; height: number;
  /** a water-side species with a red line: the tank minimum judges its size, not this floor (lane MM) */
  tiered: boolean;
}
/** The room of every herp species in S (S228: shared by the check, its growth line and the planner's tank list). */
export function herpRooms(S: TankSetup): HerpRoom[] {
  const by = new Map<string, { tl: number; g?: 'm' | 'f'; id: string }[]>();
  for (const f of S.fish) {
    const sp = getSpecies(f.species);
    if (sp && HERP[sp.sci]) by.set(sp.sci, [...(by.get(sp.sci) ?? []), { tl: fishTL(f, sp), g: f.gender, id: sp.id }]);
  }
  // 5 % / 1 in of slack: a 4 x 2 ft tank is often built 1200 x 600 mm (7.75 sq ft) or 17.9 in tall
  const raw = footprint(S.tank).area / SQFT_MM2, area = raw * 1.05, height = S.tank.H / 25.4 + 1;
  return [...by].map(([sci, group]) => {
    const r: HerpRule = HERP[sci], n = group.length, big = Math.max(...group.map(a => a.tl));
    const st = r.stages.findIndex(x => big <= x.to), cur = r.stages[st], last = r.stages.length - 1;
    const grown = st === last, [min1, rec1] = floorFor(r, n);
    const tsp = getSpecies(group[0].id), tiered = !!tsp && countsAgainstWater(tsp) && !!minDataOf(tsp.id)?.red;
    return { sci, id: group[0].id, who: r.name, n, rule: r, big, grown, need: min1 * cur.k, want: rec1 * cur.k, hNeed: cur.h ?? (grown ? r.hMin : undefined), area, raw, height, tiered };
  });
}
/** What a herp's enclosure lacks at its stage, in words (floor first, then height), else undefined. */
export const herpShort = (x: HerpRoom) => x.area < x.need ? `${sq(x.need)} of floor` : x.hNeed && x.height < x.hNeed ? `${x.hNeed} in of height` : undefined;

export function herpCheck(S: TankSetup): StockIssue[] {
  const out: StockIssue[] = [], rooms = herpRooms(S);
  if (!rooms.length) return out;
  const others = (sci: string) => S.fish.map(f => getSpecies(f.species)).filter(sp => sp && sp.sci !== sci) as NonNullable<ReturnType<typeof getSpecies>>[];
  for (const x of rooms) {
    const { sci, rule: r, who, n, grown, need, want, hNeed, area, raw, height, tiered } = x;
    const kid = grown ? '' : ' at this size';
    const group = S.fish.filter(f => getSpecies(f.species)?.sci === sci);
    if (r.max !== undefined && n > r.max) out.push({ level: 'warn', who, text: `${plural(n, 'animal')}: sources support at most ${r.max} together. ${r.group}` });
    else if (n >= 2 && (r.max ?? 2) > 1 && !(r.social && n >= r.social)) out.push({ level: 'note', who, text: `${plural(n, 'animal')} together. ${r.group}` });
    if (r.social && n < r.social) out.push({ level: 'note', who, text: `${n === 1 ? 'A single frog' : 'A pair'} is lonely: keep ${r.social} or more.` });
    const m = group.filter(a => a.gender === 'm').length, fe = group.filter(a => a.gender === 'f').length, u = n - m - fe;
    if (n >= 2) {
      if (r.males2 && m >= 2) out.push({ level: 'warn', who, text: `${m} males: males fight, even in a big enclosure. Keep one male.` });
      if (r.females2 && fe >= 2) out.push({ level: 'warn', who, text: `${fe} females: females turn on each other as they mature. Keep one, or be ready to separate them.` });
      if (r.mixed && m && fe) out.push({ level: 'note', who, text: 'A male and a female together will breed, again and again, which wears the female out.' });
      if ((r.males2 || r.females2 || r.mixed) && u) out.push({ level: 'note', who, text: `${plural(u, 'animal')} not sexed yet: ${r.sexing.how}` });
    }
    if (tiered) { /* tank-minimum bar decides */ }
    else if (area < need) out.push({ level: 'warn', who, text: `floor ${sq(raw)}; ${plural(n, 'animal')}${kid} need at least ${sq(need)}` });
    else if (area < want) out.push({ level: 'note', who, text: `floor ${sq(raw)}; ${sq(want)} is the usual recommendation for ${plural(n, 'animal')}${kid}` });
    if (hNeed && height < hNeed) out.push({ level: 'warn', who, text: `enclosure ${(height - 1).toFixed(0)} in tall; it needs at least ${hNeed} in${kid}` });
    if (r.water && !S.water.on) out.push({ level: 'warn', who, text: 'needs water in the enclosure' });
    const bad = new Set(others(sci).filter(o => !r.mates.includes(o.cat)).map(o => o.name));
    if (bad.size) out.push({ level: 'warn', who, text: `not with ${[...bad].join(', ')}. ${r.mateNote}` });
    else if (r.mates.length && others(sci).length) out.push({ level: 'note', who, text: r.mateNote });
    // how long it lasts (S228: the shared stepping, scene/outgrows.ts): the first month its stage asks for more than this enclosure has
    if (!grown && !herpShort(x)) {
      const o = firstFail(S.fish, at => { const y = herpRooms({ ...S, fish: at }).find(z => z.sci === sci); return y && herpShort(y); });
      if (o) out.push({ level: 'info', who, text: `this enclosure should last about ${span(o.months)}, until it is about ${inches(lengthIn(o, x.id))} long; then it needs ${o.why}.` });
    }
  }
  return out;
}
