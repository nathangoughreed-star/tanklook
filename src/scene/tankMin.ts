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
 * happier larger"; zebra danios, "at least a 20 long to swim in, then a medium school"). CARE.minL / minLengthMm are the default for BOTH
 * tiers; a species listed here overrides: `floor` is the least the tool may suggest for the smallest group (red below it), `comfort` the
 * size they are happier in (amber between the two). Keeper-practice estimates, not sourced (data/provenance.ts: 'claimed'); schooling
 * fish, frogs and newts first, other species stay one tier.
 */
type Size = { litres: number; lengthMm: number };
export const TIERS: Record<string, { floor?: Size; comfort?: Size }> = {
  adf: { floor: { litres: 21, lengthMm: 380 } }, // 5.5 gal for a pair; comfort is CARE 40 L, 45 cm with 5 or more friends
  danio: { comfort: { litres: 75, lengthMm: 760 } }, // 20 gal long to swim in; CARE 40 L, 60 cm is the floor
  whitecloud: { floor: { litres: 38, lengthMm: 450 } }, // cool, slow: a 10 gal holds a school; comfort is CARE 40 L, 60 cm
  tigerbarb: { comfort: { litres: 150, lengthMm: 900 } }, // fast and nippy: a 40 gal breeder to spread out; CARE 80 L, 75 cm is the floor
  cherrybarb: { comfort: { litres: 110, lengthMm: 750 } },
  firenewt: { floor: { litres: 38, lengthMm: 450 } }, // a 10 gal for a pair; comfort is CARE 75 L, 60 cm
  firetoad: { floor: { litres: 38, lengthMm: 450 } },
};

export interface MinRow { id: string; name: string; n: number; /** its absolute floor over the tank */ pct: number; /** its comfortable size over the tank */ comfortPct: number; floorL: number; floorLengthMm: number; comfortL: number; comfortLengthMm: number; minL: number; minLengthMm: number }
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
    const t = TIERS[sp.id], fl = t?.floor?.litres ?? minL, fm = t?.floor?.lengthMm ?? minLengthMm, cl = t?.comfort?.litres ?? minL, cm = t?.comfort?.lengthMm ?? minLengthMm;
    const pc = (l: number, m: number) => Math.max(litres > 0 ? l / litres : 0, lengthMm > 0 ? m / lengthMm : 0) * 100;
    by.set(sp.id, { id: sp.id, name: sp.name, n: 1, minL, minLengthMm, floorL: fl, floorLengthMm: fm, pct: pc(fl, fm), comfortPct: pc(cl, cm), comfortL: cl, comfortLengthMm: cm });
  }
  const rows = [...by.values()].sort((a, b) => b.pct - a.pct);
  return { percent: rows[0]?.pct ?? 0, comfortPercent: Math.max(0, ...rows.map(r => r.comfortPct)), litres, lengthMm, rows };
}
