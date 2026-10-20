// The tank's minimum-size gate (Nathan 2026-10-20): separate from stocking density. Density (stocking.ts space / filtration) asks "is
// the water crowded for THIS many animals"; this asks "is the tank big enough for the species at all, however few": the litres and the
// tank length the most demanding species in it wants (CARE.minL, groups.ts minLengthMm). Zebra danios want about a 20 gal long to swim in;
// once they have it, a bigger school is fine and the density bars decide how many. Percent = what the tank would have to be / what it is,
// so 100 = exactly the minimum and over 100 = too small, like the other bars.
import { CARE } from '../data/care';
import { getSpecies } from '../data/species';
import { bioloadLitres } from './starter';
import { countsAgainstWater } from './stocking';
import type { TankSetup } from './types';

export interface MinRow { id: string; name: string; n: number; /** this species' own percent: its need over the tank */ pct: number; minL: number; minLengthMm: number }
export interface TankMinimum {
  /** the highest species percent; 0 with no animals in the water */
  percent: number;
  litres: number; lengthMm: number;
  /** species by percent, most demanding first */
  rows: MinRow[];
}

export function tankMinimum(S: TankSetup): TankMinimum {
  const litres = bioloadLitres(S), lengthMm = S.tank.L, by = new Map<string, MinRow>();
  for (const f of S.fish) {
    const sp = getSpecies(f.species);
    if (!sp || !countsAgainstWater(sp)) continue;
    const have = by.get(sp.id);
    if (have) { have.n++; continue; }
    const c = CARE[sp.id] as (typeof CARE)[string] & { minLengthMm?: number } | undefined, minL = c?.minL ?? 0, minLengthMm = c?.minLengthMm ?? 0;
    by.set(sp.id, { id: sp.id, name: sp.name, n: 1, minL, minLengthMm, pct: Math.max(litres > 0 ? minL / litres : 0, lengthMm > 0 ? minLengthMm / lengthMm : 0) * 100 });
  }
  const rows = [...by.values()].sort((a, b) => b.pct - a.pct);
  return { percent: rows[0]?.pct ?? 0, litres, lengthMm, rows };
}
