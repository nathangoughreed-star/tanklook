// Stocking check for reptiles and amphibians (Nathan 2026-10-19): what the enclosure on screen breaks, from the rules in
// data/herpstock.ts. Advice only: it warns, nothing is blocked. 'warn' = below what the sources accept or a pairing they
// advise against; 'note' = below the usual recommendation, or advice that applies to this many animals; 'info' = how long
// the enclosure will last a growing animal. A juvenile is judged by its length (the stage it is in), not as an adult.
import { HERP, ageAtLength, floorFor, SQFT_MM2, type HerpRule } from '../data/herpstock';
import { fishTL, getSpecies } from '../data/species';
import { footprint } from './shape';
import { minDataOf } from './tankMin';
import { countsAgainstWater } from './stocking';
import type { TankSetup } from './types';

export interface StockIssue { level: 'warn' | 'note' | 'info'; who: string; text: string }

const sq = (n: number) => `${+n.toFixed(2)} sq ft (${(n * 0.0929).toFixed(2)} m²)`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

const span = (months: number) => {
  const m = Math.round(months), y = Math.floor(m / 12), r = m % 12;
  return m < 1 ? 'under a month' : [y ? `${y} year${y > 1 ? 's' : ''}` : '', r ? `${r} month${r > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
};
const inches = (mm: number) => `${+(mm / 25.4).toFixed(1)} in`;

export function herpCheck(S: TankSetup): StockIssue[] {
  const by = new Map<string, { tl: number; g?: 'm' | 'f' }[]>(), out: StockIssue[] = [];
  for (const f of S.fish) {
    const sp = getSpecies(f.species);
    if (sp && HERP[sp.sci]) by.set(sp.sci, [...(by.get(sp.sci) ?? []), { tl: fishTL(f, sp), g: f.gender }]);
  }
  if (!by.size) return out;
  // 5 % / 1 in of slack: a 4 x 2 ft tank is often built 1200 x 600 mm (7.75 sq ft) or 17.9 in tall
  const raw = footprint(S.tank).area / SQFT_MM2, area = raw * 1.05, height = S.tank.H / 25.4 + 1;
  const others = (sci: string) => S.fish.map(f => getSpecies(f.species)).filter(sp => sp && sp.sci !== sci) as NonNullable<ReturnType<typeof getSpecies>>[];
  for (const [sci, group] of by) {
    const r: HerpRule = HERP[sci], who = r.name, n = group.length, big = Math.max(...group.map(a => a.tl));
    const st = r.stages.findIndex(x => big <= x.to), cur = r.stages[st], last = r.stages.length - 1;
    const grown = st === last, [min1, rec1] = floorFor(r, n), need = min1 * cur.k, want = rec1 * cur.k, hNeed = cur.h ?? (grown ? r.hMin : undefined);
    const kid = grown ? '' : ' at this size';
    // a water-side species with a red line is judged by the tank minimum (scene/tankMin.ts, lane MM); a second floor-area verdict here would contradict it
    const tsp = S.fish.map(f => getSpecies(f.species)).find(sp => sp?.sci === sci), tiered = !!tsp && countsAgainstWater(tsp) && !!minDataOf(tsp.id)?.red;
    if (n > r.max) out.push({ level: 'warn', who, text: `${plural(n, 'animal')}: sources support at most ${r.max} together. ${r.group}` });
    else if (n >= 2 && r.max > 1 && !(r.social && n >= r.social)) out.push({ level: 'note', who, text: `${plural(n, 'animal')} together. ${r.group}` });
    if (r.social && n < r.social) out.push({ level: 'note', who, text: `${n === 1 ? 'A single frog' : 'A pair'} is lonely: keep ${r.social} or more.` });
    const m = group.filter(a => a.g === 'm').length, fe = group.filter(a => a.g === 'f').length, u = n - m - fe;
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
    // how long it lasts: the first later stage that asks for more than this enclosure has
    if (!grown && (tiered || area >= need) && !(hNeed && height < hNeed)) {
      const now = ageAtLength(r, big);
      for (let j = st + 1; j <= last; j++) {
        const nj = min1 * r.stages[j].k, hj = r.stages[j].h ?? (j === last ? r.hMin : undefined);
        if (area >= nj && !(hj && height < hj)) continue;
        const at = r.stages[j - 1].to, why = area < nj ? `${sq(nj)} of floor` : `${hj} in of height`;
        out.push({ level: 'info', who, text: `this enclosure should last about ${span(ageAtLength(r, at) - now)}, until it is about ${inches(Math.min(at, r.grow[r.grow.length - 1][1]))} long; then it needs ${why}.` });
        break;
      }
    }
  }
  return out;
}
