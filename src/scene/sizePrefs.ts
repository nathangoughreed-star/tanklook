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
/** The size slider: the track is three equal bands (Small | Medium | Large), so the position 0..1 reads back as exactly one size, and inside a band it is a linear
 *  position between that band's low and high end (gallons for an aquarium). The stored answer stays the band; the position is only where the thumb sits. */
export const sizeAtBand = (at: number): SizeChoice => at < 1 / 3 ? 'small' : at < 2 / 3 ? 'medium' : 'large';
/** The thumb position that stands for a size when none was set: the middle of its band. */
export const sizeAtMid = (s: SizeChoice): number => (SIZE_CHOICES.indexOf(s) + 0.5) / 3;
/** Gallons the thumb points at (aquarium habitats), rounded to a whole gallon. */
export const galAt = (d: HabitatDirection, at: number): number => { const s = sizeAtBand(at), r = aq(d)[s], f = Math.min(1, Math.max(0, at * 3 - SIZE_CHOICES.indexOf(s))); return Math.round(r.lo + f * (r.hi - r.lo)); };
/** GR-RANGE (2026-11-10, Nathan): aquariums answer size as a MIN-MAX GALLON RANGE on one continuous number line (two thumbs), with the three bands drawn under it.
 *  The line runs from the smallest Small to the largest Large and is LOGARITHMIC: on a linear 5-150 gal line Small would be the left 10 %; on a log line the three
 *  bands are close to equal (freshwater 39 / 30 / 31 %). Positions are 0..1; gallons snap to 1 gal under 30, 5 gal under 100, 10 gal above. */
export const galSpan = (d: HabitatDirection): GalRange => { const g = aq(d); return { lo: g.small.lo, hi: g.large.hi }; };
const c01 = (x: number) => Math.min(1, Math.max(0, x));
export const galToPos = (d: HabitatDirection, gal: number): number => { const s = galSpan(d); return c01(Math.log(gal / s.lo) / Math.log(s.hi / s.lo)); };
const snapGal = (g: number) => g < 30 ? Math.round(g) : g < 100 ? Math.round(g / 5) * 5 : Math.round(g / 10) * 10;
export const posToGal = (d: HabitatDirection, p: number): number => { const s = galSpan(d); return Math.min(s.hi, Math.max(s.lo, snapGal(s.lo * Math.pow(s.hi / s.lo, c01(p))))); };
/** The graduations: round tank sizes inside the line. */
export const galTicks = (d: HabitatDirection): number[] => { const s = galSpan(d); return [5, 10, 15, 20, 30, 40, 55, 75, 100, 150, 200].filter(g => g >= s.lo && g <= s.hi); };
/** Where each band sits on the line (0..1): edges halfway between one band's top and the next band's bottom. */
export const bandSpans = (d: HabitatDirection): Record<SizeChoice, { from: number; to: number }> => {
  const g = aq(d), mid = (a: number, b: number) => galToPos(d, (a + b) / 2);
  return { small: { from: 0, to: mid(g.small.hi, g.medium.lo) }, medium: { from: mid(g.small.hi, g.medium.lo), to: mid(g.medium.hi, g.large.lo) }, large: { from: mid(g.medium.hi, g.large.lo), to: 1 } };
};
/** The bands a gallon range touches, in order. */
export const bandsIn = (d: HabitatDirection, r: GalRange): SizeChoice[] => SIZE_CHOICES.filter(s => { const x = aq(d)[s]; return x.lo <= r.hi && r.lo <= x.hi; });
/** The readout: "20-54 gal · Medium", "15-40 gal · Small to Medium". */
export const galRangeText = (d: HabitatDirection, r: GalRange): string => {
  const b = bandsIn(d, r); return `${r.lo === r.hi ? `${r.lo} gal` : galText(r)}${b.length ? ` · ${SIZE_LABEL[b[0]]}${b.length > 1 ? ` to ${SIZE_LABEL[b[b.length - 1]]}` : ''}` : ''}`;
};
/** "5-19 gal" (US gallons). */
export const galText = (r: GalRange): string => `${r.lo}-${r.hi} gal`;
/** What shows under a size choice: gallons for an aquarium, floor and height for a dry build. */
export const sizeText = (d: HabitatDirection, s: SizeChoice): string => isDry(d) ? SIZE_DRY[d][s].text : galText(aq(d)[s]);
/** The size a gallon range stands for in this aquarium habitat, or undefined when it is not one of the three (a hand-typed limit). */
export function sizeOf(d: HabitatDirection, r: { lo?: number; hi?: number } | undefined): SizeChoice | undefined {
  if (!r || isDry(d)) return undefined;
  return SIZE_CHOICES.find(s => { const x = aq(d)[s]; return r.lo === x.lo && r.hi === x.hi; });
}
