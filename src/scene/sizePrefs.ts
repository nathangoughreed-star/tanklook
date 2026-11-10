// AB6 (2026-11-10): the quick-preference SIZE answer. Small / Medium / Large always show as words; what they MEAN depends on the habitat, in ONE file:
//   AQUARIUMS (freshwater, saltwater, "I don't know yet" = freshwater) map to US GALLONS.
//   DRY-LAND builds (terrarium, paludarium, vivarium) map to FLOOR AREA (sq in) and HEIGHT (in), because gallons mean nothing for a land enclosure.
// Sources: the tank catalogue's spread (src/data/tanks.json, 146 models: data/tanks.ts BANDS nano < 15, small 15-39, mid 40-74, large 75-124, monster 125+) for the aquatic columns;
// the terrarium presets (8x8x8, 12x12x12, 18x18x18, 18x24x18, 24x12x12, 24x18x24, 36x18x18, 24x48x24, 48x18x24 in) and the paludarium extras for the dry ones.
//   freshwater   20 to 55 gal is the classic community range; nano under 20, stand-alone displays over 55     saltwater   10 gal is the smallest sensible marine tank, 30 to 75 the usual reef range
//   terrarium    floors 64 to 1152 sq in (8x8 to 24x48)                                                         paludarium  a notch bigger: water takes part of the floor
// Ranges are inclusive and do not overlap, so a figure reads back as exactly one size.
import type { HabitatDirection } from './discoveryTypes';

export type SizeChoice = 'small' | 'medium' | 'large';
export const SIZE_CHOICES: readonly SizeChoice[] = ['small', 'medium', 'large'];
export const SIZE_LABEL: Record<SizeChoice, string> = { small: 'Small', medium: 'Medium', large: 'Large' };
export interface GalRange { lo: number; hi: number }
export const SIZE_GAL: Record<'freshwater' | 'saltwater', Record<SizeChoice, GalRange>> = {
  freshwater: { small: { lo: 5, hi: 19 }, medium: { lo: 20, hi: 54 }, large: { lo: 55, hi: 150 } },
  saltwater: { small: { lo: 10, hi: 29 }, medium: { lo: 30, hi: 74 }, large: { lo: 75, hi: 200 } },
};
export interface DrySize { floorSqIn: GalRange; heightIn: GalRange; /** shown under the choice */ text: string }
export const SIZE_DRY: Record<'terrarium' | 'paludarium', Record<SizeChoice, DrySize>> = {
  terrarium: {
    small: { floorSqIn: { lo: 64, hi: 200 }, heightIn: { lo: 8, hi: 18 }, text: 'about 12 x 12 in floor, 12 in tall' },
    medium: { floorSqIn: { lo: 201, hi: 500 }, heightIn: { lo: 18, hi: 30 }, text: 'about 18 x 18 in floor, 24 in tall' },
    large: { floorSqIn: { lo: 501, hi: 1300 }, heightIn: { lo: 24, hi: 48 }, text: 'about 24 x 36 in floor, 24 in tall' },
  },
  paludarium: {
    small: { floorSqIn: { lo: 144, hi: 324 }, heightIn: { lo: 12, hi: 24 }, text: 'about 18 x 12 in floor, 18 in tall' },
    medium: { floorSqIn: { lo: 325, hi: 700 }, heightIn: { lo: 18, hi: 30 }, text: 'about 24 x 18 in floor, 24 in tall' },
    large: { floorSqIn: { lo: 701, hi: 1300 }, heightIn: { lo: 24, hi: 48 }, text: 'about 36 x 24 in floor, 30 in tall' },
  },
};
export const isDry = (d: HabitatDirection): d is 'terrarium' | 'paludarium' => d === 'terrarium' || d === 'paludarium';
const aq = (d: HabitatDirection) => SIZE_GAL[d === 'saltwater' ? 'saltwater' : 'freshwater'];
/** Gallons for an aquarium habitat (a dry habitat has no gallon range: use `dryOf`). */
export const sizeRange = (d: HabitatDirection, s: SizeChoice): GalRange => aq(d)[s];
export const dryOf = (d: HabitatDirection, s: SizeChoice): DrySize | undefined => isDry(d) ? SIZE_DRY[d][s] : undefined;
/** "5-19 gal" (US gallons). */
export const galText = (r: GalRange): string => `${r.lo}-${r.hi} gal`;
/** What shows under a size choice: gallons for an aquarium, floor and height for a dry build. */
export const sizeText = (d: HabitatDirection, s: SizeChoice): string => isDry(d) ? SIZE_DRY[d][s].text : galText(aq(d)[s]);
/** The size a gallon range stands for in this aquarium habitat, or undefined when it is not one of the three (a hand-typed limit). */
export function sizeOf(d: HabitatDirection, r: { lo?: number; hi?: number } | undefined): SizeChoice | undefined {
  if (!r || isDry(d)) return undefined;
  return SIZE_CHOICES.find(s => { const x = aq(d)[s]; return r.lo === x.lo && r.hi === x.hi; });
}
