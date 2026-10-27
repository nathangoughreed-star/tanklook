// S247-style "Tank minimums" calculation (Nathan 2026-10-27): regardless of fullness, the smallest catalogue tank that holds the species'
// recommended MINIMUM group (bands.ok, else CARE.group: 6 neons' band floor, a pair of apistogramma). Pure read of the existing lines:
// tankmin.json red lines are sourced "for a full-grown animal in a viable group" (research/tank-minimum-first-principles.md Decision 1), so
// the group's smallest tank is the smallest catalogue size every red measure passes, with the same 10 % slack the tile and tankfit use
// (MIN_SLACK_PCT). No engine number is read back or moved. Missing data (no red line and no care-table minimum, or a species the catalogue
// cannot hold) = undefined: the check does not fire, the caller counts it in "N checks had no data".
// Goldfish second source (cross-check only, never the minimum): Aquarium Co-Op's rule, 20 gal for one fish plus 10 gal per extra fish
// (https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-size). Fishkeeping World's 20 gal stays the sourced minimum.
import { getSpecies, type Species } from '../data/species';
import { dimsInches, modelGallons } from '../data/tanks';
import { MIN_SLACK_PCT } from './animalfit';
import { catalogueSizes } from './tankfit';
import { floorOf, speciesMinimum, minDataOf, type Geometry, type Mark } from './tankMin';
import { recommendedMin } from './zone';
import { countsAgainstWater } from './stocking';
import type { TankSetup } from './types';

export interface GroupTank {
  /** catalogue size name ("20 gal long"), actual US gallons, outside dimensions L x D x H in inches */
  tank: string; gal: number; dims: string;
  /** the group the answer is for (the species' recommended minimum) */
  n: number;
  /** where the line comes from: tankmin.json (mark = sourced / sourced (est) / derived (est)) or the care table's minimum volume */
  basis: 'tankmin' | 'care table'; mark: Mark | 'advisory'; site: string;
  /** the measure that last forced the size up (the limiting one at the next size down), for the line's wording */
  limiting?: string;
  /** a second source's answer, shown beside it and never replacing it */
  crossCheck?: { site: string; url: string; states: string; tank: string; gal: number; dims: string; /** true when it asks for a bigger tank than `tank` */ larger: boolean };
}
const COOP = { site: 'Aquarium Co-Op', url: 'https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-size' };
const GAL_L = 3.785;
const COOP_GOLDFISH = new Set(['goldfish']); // the rule is for fancy goldfish; comets are pond fish with their own (larger) minimum

const geometryOfModel = (c: { T: TankSetup['tank']; litres: number }): Geometry => {
  const f = floorOf(c.T);
  return { litres: c.litres, tankLitres: c.litres, areaCm2: f.areaCm2, lengthMm: f.runMm, widthMm: f.widthMm, heightMm: c.T.H };
};

/** Smallest catalogue tank for `sp`'s recommended minimum group, or undefined (no data / nothing in the catalogue holds it). */
export function groupMinimum(sp: Species | string): GroupTank | undefined {
  const s = typeof sp === 'string' ? getSpecies(sp) : sp;
  if (!s || !countsAgainstWater(s)) return undefined;
  const d = minDataOf(s.id), n = recommendedMin(s.id);
  let prev: ReturnType<typeof speciesMinimum> | undefined;
  for (const c of catalogueSizes(s.habitat === 'land')) {
    const row = speciesMinimum(s, geometryOfModel(c));
    if (row.measure.pct === 0) return undefined; // no red line and no care-table minimum: no check
    if (row.assessed && row.pct <= MIN_SLACK_PCT) {
      const out: GroupTank = { tank: c.m.name, gal: +modelGallons(c.m).toFixed(1), dims: dimsInches(c.m.outer), n, basis: d?.red ? 'tankmin' : 'care table',
        mark: row.measure.mark, site: row.measure.site, ...(prev ? { limiting: prev.limiting } : {}) };
      if (COOP_GOLDFISH.has(s.id)) out.crossCheck = coopGoldfish(n, out.gal);
      return out;
    }
    prev = row;
  }
  return undefined;
}

/** Aquarium Co-Op's goldfish rule for `n` fish (20 gal + 10 gal per extra fish) as the smallest catalogue tank holding it, with the same 10 % slack on the gallon figure. */
export function coopGoldfish(n: number, vsGal: number): NonNullable<GroupTank['crossCheck']> {
  const gal = 20 + 10 * Math.max(0, n - 1), need = gal * GAL_L * 100 / MIN_SLACK_PCT;
  const c = catalogueSizes(false).find(x => x.litres >= need);
  const base = { ...COOP, states: `${gal} gal for ${n} (20 gal for the first, +10 gal per extra)` };
  return c ? { ...base, tank: c.m.name, gal: +modelGallons(c.m).toFixed(1), dims: dimsInches(c.m.outer), larger: modelGallons(c.m) > vsGal + 0.5 } : { ...base, tank: 'no catalogue tank', gal, dims: '', larger: true };
}

export interface StockingMinimum {
  /** per species, in the order given */
  rows: { id: string; name: string; min?: GroupTank }[];
  /** the largest of the per-species answers: the smallest tank holding every species' minimum group (floors are held on their own, so the largest single answer holds all) */
  tank?: GroupTank & { by: string };
  /** species with no answer (the "N checks had no data" line) */
  noData: string[];
}
/** The whole stocking's group-minimum tank. Each species' minimum group is judged on its own; the stocking's answer is the biggest of them. */
export function stockingGroupMinimum(ids: string[]): StockingMinimum {
  const rows = [...new Set(ids)].map(id => ({ id, name: getSpecies(id)?.name ?? id, min: groupMinimum(id) }));
  const best = rows.reduce<(typeof rows)[number] | undefined>((b, r) => r.min && (!b?.min || r.min.gal > b.min.gal) ? r : b, undefined);
  return { rows, ...(best?.min ? { tank: { ...best.min, by: best.name } } : {}), noData: rows.filter(r => !r.min).map(r => r.name) };
}
