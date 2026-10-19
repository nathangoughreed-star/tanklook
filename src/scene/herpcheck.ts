// Stocking check for reptiles and amphibians (Nathan 2026-10-19): what the enclosure on screen breaks, from the rules in
// data/herpstock.ts. Advice only: it warns, nothing is blocked. 'warn' = below what the sources accept or a pairing they
// advise against; 'note' = below the usual recommendation, or advice that applies to this many animals.
import { HERP, floorFor, SQFT_MM2, type HerpRule } from '../data/herpstock';
import { getSpecies } from '../data/species';
import { footprint } from './shape';
import type { TankSetup } from './types';

export interface StockIssue { level: 'warn' | 'note'; who: string; text: string }

const sq = (n: number) => `${+n.toFixed(2)} sq ft (${(n * 0.0929).toFixed(2)} m²)`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function herpCheck(S: TankSetup): StockIssue[] {
  const counts = new Map<string, number>(), out: StockIssue[] = [];
  for (const f of S.fish) {
    const sp = getSpecies(f.species);
    if (sp && HERP[sp.sci]) counts.set(sp.sci, (counts.get(sp.sci) ?? 0) + 1);
  }
  if (!counts.size) return out;
  // 5 % / 1 in of slack: a 4 x 2 ft tank is often built 1200 x 600 mm (7.75 sq ft) or 17.9 in tall
  const area = footprint(S.tank).area / SQFT_MM2 * 1.05, height = S.tank.H / 25.4 + 1;
  const others = (sci: string) => S.fish.map(f => getSpecies(f.species)).filter(sp => sp && sp.sci !== sci) as NonNullable<ReturnType<typeof getSpecies>>[];
  for (const [sci, n] of counts) {
    const r: HerpRule = HERP[sci], who = r.name, [need, want] = floorFor(r, n);
    if (n > r.max) out.push({ level: 'warn', who, text: `${plural(n, 'animal')}: sources support at most ${r.max} together. ${r.group}` });
    else if (n >= 2 && r.max > 1) out.push({ level: 'note', who, text: `${plural(n, 'animal')} together. ${r.group}` });
    if (r.social && n < r.social) out.push({ level: 'note', who, text: `${n === 1 ? 'A single frog' : 'A pair'} is lonely: keep ${r.social} or more.` });
    if (area < need) out.push({ level: 'warn', who, text: `floor ${sq(area / 1.05)}, ${plural(n, 'animal')} need at least ${sq(need)}` });
    else if (area < want) out.push({ level: 'note', who, text: `floor ${sq(area / 1.05)}; ${sq(want)} is the usual recommendation for ${plural(n, 'animal')}` });
    if (r.hMin && height < r.hMin) out.push({ level: 'warn', who, text: `enclosure ${(height - 1).toFixed(0)} in tall; it needs at least ${r.hMin} in` });
    if (r.water && !S.water.on) out.push({ level: 'warn', who, text: 'needs water in the enclosure' });
    const bad = new Set(others(sci).filter(o => !r.mates.includes(o.cat)).map(o => o.name));
    if (bad.size) out.push({ level: 'warn', who, text: `not with ${[...bad].join(', ')}. ${r.mateNote}` });
    else if (r.mates.length && others(sci).length) out.push({ level: 'note', who, text: r.mateNote });
  }
  return out;
}
