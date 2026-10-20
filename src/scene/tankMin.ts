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

/**
 * Two tiers per species (Nathan 2026-10-20: African dwarf frogs, "absolute minimum a 5.5 gal for a pair, with warnings that they would be
 * happier larger"). CARE.minL / minLengthMm are the COMFORTABLE size; a species listed here also has a lower ABSOLUTE floor the tool may
 * suggest for the smallest group (bands.ok), below which it is red. Absent = floor equals comfortable (one tier). Keeper-practice estimates.
 */
export const FLOOR: Record<string, { litres: number; lengthMm: number }> = {
  adf: { litres: 21, lengthMm: 380 }, // 5.5 gal for a pair; comfortable is CARE.minL 40 L with 6 or more friends
};

export interface MinRow { id: string; name: string; n: number; /** its absolute floor over the tank */ pct: number; /** its comfortable size over the tank */ comfortPct: number; floorL: number; floorLengthMm: number; minL: number; minLengthMm: number }
export interface TankMinimum {
  /** the highest species percent; 0 with no animals in the water */
  percent: number;
  /** the highest comfortable-size percent: over 100 = workable but cramped, they would be happier in a bigger tank */
  comfortPercent: number;
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
    const fl = Math.min(minL, FLOOR[sp.id]?.litres ?? minL), fm = Math.min(minLengthMm, FLOOR[sp.id]?.lengthMm ?? minLengthMm);
    const pc = (l: number, m: number) => Math.max(litres > 0 ? l / litres : 0, lengthMm > 0 ? m / lengthMm : 0) * 100;
    by.set(sp.id, { id: sp.id, name: sp.name, n: 1, minL, minLengthMm, floorL: fl, floorLengthMm: fm, pct: pc(fl, fm), comfortPct: pc(minL, minLengthMm) });
  }
  const rows = [...by.values()].sort((a, b) => b.pct - a.pct);
  return { percent: rows[0]?.pct ?? 0, comfortPercent: Math.max(0, ...rows.map(r => r.comfortPct)), litres, lengthMm, rows };
}
