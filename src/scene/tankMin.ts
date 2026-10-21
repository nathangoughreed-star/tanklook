// The tank's minimum-size gate (Nathan 2026-10-20): separate from stocking density. Density (stocking.ts space / filtration) asks "is
// the water crowded for THIS many animals"; this asks "is the tank big enough for the species at all, however few": the litres and the
// tank length the most demanding species in it wants (weighed per kind of animal: floor area, length and water, MIN_WEIGHTS) (CARE.minL, groups.ts minLengthMm). Zebra danios want about a 20 gal long to swim in;
// once they have it, a bigger school is fine and the density bars decide how many. Percent = what the tank would have to be / what it is,
// so 100 = exactly the minimum and over 100 = too small, like the other bars.
import { CARE } from '../data/care';
import { getSpecies, type Species } from '../data/species';
import { bioloadLitres } from './starter';
import { zoneOf, type Zone } from './tankfit';
import { tankExtent } from './space';
import { footprint } from './shape';
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
  adf: { floor: { litres: 18, lengthMm: 380 } }, // a 5.5 gal for a pair (about 18 L of water at the working fill; bottom dwellers are held to floor area, not run); comfort is CARE 40 L, 45 cm with 5 or more friends
  danio: { comfort: { litres: 75, lengthMm: 760 } }, // 20 gal long to swim in; CARE 40 L, 60 cm is the floor
  whitecloud: { floor: { litres: 33, lengthMm: 450 } }, // cool, slow: a 10 gal (about 33 L of water) holds a school; comfort is CARE 40 L, 60 cm
  tigerbarb: { comfort: { litres: 150, lengthMm: 900 } }, // fast and nippy: a 40 gal breeder to spread out; CARE 80 L, 75 cm is the floor
  cherrybarb: { comfort: { litres: 110, lengthMm: 750 } },
  firenewt: { floor: { litres: 33, lengthMm: 450 } }, // a 10 gal for a pair; comfort is CARE 75 L, 60 cm
  firetoad: { floor: { litres: 33, lengthMm: 450 } },
};

/**
 * How much each of the three things a litres figure on a care sheet stands in for counts, by where the animal lives (Nathan 2026-10-20: "3
 * gallons" is shorthand for floor space, which few keepers can state). `vol` weighs the water itself (tank litres against the species'
 * litres): a tall tank on the same floor must not read as roomier for a fish that never uses the height. `area` weighs floor area (cm2, the
 * species' litres taken at REF_DEPTH_CM), `run` the longest floor side against its stated length. A bottom dweller lives on the floor and
 * barely uses the column; surface fish need the length and the surface (floor) under it; midwater swimmers use the whole column, so volume
 * counts for most there, still less than the run. The percent is the largest of the three weighted shares.
 */
export const MIN_WEIGHTS: Record<Zone, { vol: number; area: number; run: number }> = {
  bottom: { vol: 0.25, area: 1, run: 0 },
  top: { vol: 0.4, area: 0.6, run: 1 },
  middle: { vol: 0.5, area: 0.4, run: 1 },
  all: { vol: 0.5, area: 0.4, run: 1 },
};

/** A bottom dweller's footprint need, from its litres: a tank holding them at this water depth (cm). Swimmers are held to the run (the longest floor side) instead. */
export const REF_DEPTH_CM = 30;
export const areaFor = (litres: number) => litres * 1000 / REF_DEPTH_CM;
/** The tank's floor area, cm2, any shape (outer footprint); its longest floor side and its shortest (front to back for a rectangle), mm. */
export function floorOf(T: TankSetup['tank']): { areaCm2: number; runMm: number; widthMm: number } {
  const ring = footprint(T).ring, e = tankExtent(T);
  let a = 0;
  for (let i = 0; i < ring.length; i++) { const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length]; a += x1 * y2 - x2 * y1; }
  return { areaCm2: Math.abs(a) / 2 / 100, runMm: Math.max(e.w, e.d), widthMm: Math.min(e.w, e.d) };
}

/** What a tank offers: water (litres at the working fill), floor area, longest and shortest floor side. */
export interface Geometry { litres: number; areaCm2: number; lengthMm: number; widthMm: number }
export const geometryOf = (S: TankSetup): Geometry => { const f = floorOf(S.tank); return { litres: bioloadLitres(S), areaCm2: f.areaCm2, lengthMm: f.runMm, widthMm: f.widthMm }; };

/** The thing that holds a species to this tank size: the constraint with the largest share. */
export type Limit = 'length' | 'width' | 'floor area' | 'water';
export interface Measured { pct: number; limiting: Limit; /** what the species wants of the limiting measure and what the tank has, in its own unit (mm, mm, cm2, L) */ need: number; have: number }

/**
 * One species at one size (`litres`, `lengthMm`, optionally a front-to-back `widthMm` need) against a tank: the largest of the shares.
 * Length and width are the species' own stated needs and count in full; water and floor area are what a care sheet's gallon figure stands
 * for, so they are weighed by MIN_WEIGHTS (the fallback where no dimension is stated). A species with a stated floor area (`areaCm2`:
 * a footprint recommendation that allows an equivalent shape, e.g. 120 x 30 cm) is held to that area in full instead of the area derived
 * from its litres; `widthMm` is a strict front-to-back need (turning room), `lengthMm` a strict length. Over 100 = at least one measure falls short.
 */
export function measureMinimum(zone: Zone, litres: number, lengthMm: number, widthMm: number, g: Geometry, areaCm2 = 0): Measured {
  const w = MIN_WEIGHTS[zone];
  const terms: { limiting: Limit; k: number; need: number; have: number }[] = [
    { limiting: 'water', k: w.vol, need: litres, have: g.litres },
    { limiting: 'floor area', k: areaCm2 > 0 ? 1 : w.area, need: areaCm2 > 0 ? areaCm2 : areaFor(litres), have: g.areaCm2 },
    { limiting: 'length', k: w.run, need: lengthMm, have: g.lengthMm },
    { limiting: 'width', k: widthMm > 0 ? 1 : 0, need: widthMm, have: g.widthMm },
  ];
  let best: Measured = { pct: 0, limiting: 'length', need: 0, have: 0 };
  for (const t of terms) { const pct = t.k * 100 * (t.have > 0 ? t.need / t.have : 0); if (pct > best.pct) best = { pct, limiting: t.limiting, need: t.need, have: t.have }; }
  return best;
}
/** How a length and a floor area print (cm by default; the tile passes its own units). */
export interface Fmt { len: (mm: number) => string; area: (cm2: number) => string }
/** "wants a tank at least 120 cm long, this one is 91 cm": the unmet measure in words. */
export function reasonOf(m: Measured, f: Fmt = { len: mm => `${Math.round(mm / 10)} cm`, area: cm2 => `${Math.round(cm2)} cm2` }): string {
  switch (m.limiting) {
    case 'length': return `wants a tank at least ${f.len(m.need)} long, this one is ${f.len(m.have)}`;
    case 'width': return `wants a tank at least ${f.len(m.need)} front to back, this one is ${f.len(m.have)}`;
    case 'floor area': return `wants about ${f.area(m.need)} of floor, this tank has ${f.area(m.have)}`;
    default: return `wants about ${Math.round(m.need)} L of water, this tank holds ${Math.round(m.have)} L`;
  }
}

export interface MinRow { id: string; name: string; n: number; /** what the species is held to besides litres: 'run' (longest floor side, swimmers) or 'area' (floor area, bottom dwellers) */ kind: 'run' | 'area'; floorCm2: number; comfortCm2: number; /** its absolute floor over the tank */ pct: number; /** its comfortable size over the tank */ comfortPct: number; floorL: number; floorLengthMm: number; comfortL: number; comfortLengthMm: number; minL: number; minLengthMm: number; /** front-to-back need, mm (0 = none stated) */ minWidthMm: number; /** the measure that holds it to this size, and the sentence for it (absolute floor) */ limiting: Limit; reason: string; /** the absolute-floor measurement behind `reason`, to print in other units */ measure: Measured }
export interface TankMinimum {
  /** the highest species percent; 0 with no animals in the water */
  percent: number;
  /** the highest comfortable-size percent: over 100 = workable but cramped, they would be happier in a bigger tank */
  comfortPercent: number;
  litres: number; lengthMm: number;
  /** species by percent, most demanding first */
  rows: MinRow[];
}

const careFor = (id: string) => CARE[id] as (typeof CARE)[string] & { minLengthMm?: number; minWidthMm?: number; minAreaCm2?: number } | undefined;

/** One species against a tank (the same answer the Fullness bar, the tank-fit engine, the animal gate and the hard truths all use). */
export function speciesMinimum(sp: Species, g: Geometry): MinRow {
  const c = careFor(sp.id), minL = c?.minL ?? 0, minLengthMm = c?.minLengthMm ?? 0, minWidthMm = c?.minWidthMm ?? 0, minAreaCm2 = c?.minAreaCm2 ?? 0;
  const t = TIERS[sp.id], fl = t?.floor?.litres ?? minL, fm = t?.floor?.lengthMm ?? minLengthMm, cl = t?.comfort?.litres ?? minL, cm = t?.comfort?.lengthMm ?? minLengthMm;
  const zone = zoneOf(sp), floor = measureMinimum(zone, fl, fm, minWidthMm, g, minAreaCm2), comfort = measureMinimum(zone, cl, cm, minWidthMm, g, minAreaCm2);
  return { id: sp.id, name: sp.name, n: 1, kind: zone === 'bottom' ? 'area' : 'run', floorCm2: minAreaCm2 || areaFor(fl), comfortCm2: minAreaCm2 || areaFor(cl), minL, minLengthMm, minWidthMm, floorL: fl, floorLengthMm: fm, comfortL: cl, comfortLengthMm: cm, pct: floor.pct, comfortPct: comfort.pct, limiting: floor.limiting, reason: reasonOf(floor), measure: floor };
}

export function tankMinimum(S: TankSetup): TankMinimum {
  const g = geometryOf(S), by = new Map<string, MinRow>();
  for (const f of S.fish) {
    const sp = getSpecies(f.species);
    if (!sp || !countsAgainstWater(sp)) continue;
    const have = by.get(sp.id);
    if (have) { have.n++; continue; }
    by.set(sp.id, speciesMinimum(sp, g));
  }
  const rows = [...by.values()].sort((a, b) => b.pct - a.pct);
  return { percent: rows[0]?.pct ?? 0, comfortPercent: Math.max(0, ...rows.map(r => r.comfortPct)), litres: g.litres, lengthMm: g.lengthMm, rows };
}

/** The animal gate's view of a tank: each species against this tank's geometry (pass as AnimalEnv.fit). */
export const minFit = (S: TankSetup) => { const g = geometryOf(S); return (sp: Species) => { const r = speciesMinimum(sp, g); return { pct: r.pct, reason: r.reason }; }; };
