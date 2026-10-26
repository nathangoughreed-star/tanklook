// One growth model for every animal (S228 "outgrows", Nathan 2026-10-26; research/outgrows.md): the length an animal reaches after
// some months, and the age a length means, so every stocking check can be run at today's sizes and stepped forward.
//   reptiles, amphibians, arachnids with a herpstock rule: its `grow` curve (months -> mm), as herpcheck has read it since 2026-10-19;
//   fish: von Bertalanffy, L(t) = Linf - (Linf - L0) e^(-K t), with Linf = the app's adult length (aquarium TL, so the curve ends where
//         every other check already does) and K per year from FishBase where it publishes one (GROWTH_K, with its page), else a class
//         default by adult length, marked est;
//   everything else (shrimp, snails, crabs, corals): no curve, always adult.
import { HERP, ageAtLength, lengthAtAge, type HerpRule } from './herpstock';
import { fishTL, getSpecies, type Species } from './species';

/** A sourced growth rate: K per year from a FishBase growth table (median of its usable rows), with the page it came from. */
export interface SourcedK { K: number; url: string; note: string }
/** From FishBase growth tables (research/outgrows/fishbase-growth.json, fetched 2026-10-26): of the 28 fish with a size picker only
 *  these have usable rows (chromis' one row is flagged questionable). All are WILD growth, slower than a warm, well-fed tank; they are
 *  used as published (the median of the rows), and the line says where the rate comes from. */
const FB = (id: number, g: string, s: string) => `https://www.fishbase.se/PopDyn/PopGrowthList.php?ID=${id}&GenusName=${g}&SpeciesName=${s}&fc=1`;
export const GROWTH_K: Record<string, SourcedK> = {
  goldfish: { K: 0.22, url: FB(271, 'Carassius', 'auratus'), note: 'median of 2 wild rows (Dongjiang, Amur): K 0.165, 0.284' },
  comet: { K: 0.22, url: FB(271, 'Carassius', 'auratus'), note: 'Carassius auratus, as goldfish' },
  kuhli: { K: 0.37, url: FB(12276, 'Pangio', 'kuhlii'), note: '1 wild row (Sarawak, 29 C)' },
  yellowtang: { K: 0.16, url: FB(6018, 'Zebrasoma', 'flavescens'), note: 'median of 4 wild rows (West Hawaii): K 0.3, 0.25, 0.073, 0.075' },
};

/** Class defaults, K per year by adult length (est): small fish reach adult size within a few months, large cichlids in about a year
 *  (an oscar about 9 in at a year on this curve; keepers quote 10 to 12 in), the way keeper reports have it. */
const DEFAULT_K: [number, number][] = [[60, 3], [150, 2], [Infinity, 1.5]];
/** A fish's length when it starts to feed (the curve's start), mm. */
const FRY = (linf: number) => Math.min(8, linf * 0.1);
/** Along a von Bertalanffy curve an animal counts as grown at this share of Linf (the curve only approaches it). */
export const GROWN_SHARE = 0.97;

export interface Curve {
  /** length (mm) after `months` from the curve's start */
  lengthAt: (months: number) => number;
  /** age (months) at `mm`; past the end of growth, the age it is grown */
  ageAt: (mm: number) => number;
  /** age (months) at which it is grown: the herp curve's last point, or GROWN_SHARE of Linf */
  grownAt: number;
  /** its grown length, mm */
  adult: number;
  /** where the rate comes from: the herp rule, FishBase, or a class default (est) */
  source: 'herp' | 'fishbase' | 'est';
}

const herpCurve = (r: HerpRule): Curve => {
  const last = r.grow[r.grow.length - 1];
  return { lengthAt: m => lengthAtAge(r, m), ageAt: mm => ageAtLength(r, mm), grownAt: last[0], adult: last[1], source: 'herp' };
};

const isFish = (sp: Pick<Species, 'cat'>) => sp.cat.endsWith('-fish');

/** K per year for a fish: FishBase where published, else the class default. */
export const kOf = (sp: Pick<Species, 'id' | 'tl'>): { K: number; est: boolean } => {
  const s = GROWTH_K[sp.id];
  return s ? { K: s.K, est: false } : { K: DEFAULT_K.find(([tl]) => sp.tl < tl)![1], est: true };
};

/** The species' growth curve; undefined = it does not grow in a way the checks read (always adult). `adultMm` = its grown length
 *  (a female's own adult length where it differs). */
export function curveOf(sp: Pick<Species, 'id' | 'sci' | 'cat' | 'tl'>, adultMm = sp.tl): Curve | undefined {
  const r = HERP[sp.sci];
  if (r) return herpCurve(r);
  if (!isFish(sp)) return undefined;
  const { K, est } = kOf(sp), linf = adultMm, l0 = FRY(linf), k = K / 12;
  const ageAt = (mm: number) => mm >= linf * GROWN_SHARE ? -Math.log(1 - GROWN_SHARE) / k + Math.log((linf - l0) / linf) / k
    : mm <= l0 ? 0 : -Math.log((linf - mm) / (linf - l0)) / k;
  return { lengthAt: m => linf - (linf - l0) * Math.exp(-k * m), ageAt, grownAt: ageAt(linf), adult: linf, source: est ? 'est' : 'fishbase' };
}

/** The length (mm) an animal now `mm` long reaches `months` later; undefined = grown by then (judge it at its adult length). */
export function grownLength(sp: Pick<Species, 'id' | 'sci' | 'cat' | 'tl'>, mm: number, months: number, adultMm = sp.tl): number | undefined {
  const c = curveOf(sp, adultMm);
  if (!c) return undefined;
  const age = c.ageAt(mm) + months;
  return age >= c.grownAt ? undefined : Math.max(mm, c.lengthAt(age));
}

/** Months until an animal now `mm` long is grown (0 = already). */
export function monthsToAdult(sp: Pick<Species, 'id' | 'sci' | 'cat' | 'tl'>, mm: number, adultMm = sp.tl): number {
  const c = curveOf(sp, adultMm);
  return c && mm < adultMm ? Math.max(0, c.grownAt - c.ageAt(mm)) : 0;
}

/** At or above this share of its adult length an animal counts as adult for the size-scaled checks (tank minimum, prey gate): the
 *  ordinary spread of adult sizes (the editor scatters animals about 10 % either side) must not move an adult's verdict. */
export const ADULT_SHARE = 0.85;
/** How much of an adult a `tl` mm animal counts as, for checks that scale with length (Nathan 2026-10-26: linearly, the cautious
 *  choice, as the herp stages do); 1 when undefined or within the adult spread. */
export const shareOf = (tl: number | undefined, adultMm: number) => tl === undefined || tl >= adultMm * ADULT_SHARE ? 1 : Math.max(0.05, tl / adultMm);

/** Each species' largest animal, as a length on the species' (male) scale, mm; only the ones that count as young (shareOf under 1).
 *  The checks that scale with length judge a species by its largest animal. */
export function youngLengths(fish: { species: string; tl?: number; sex?: 'f' }[]): Record<string, number> {
  const big: Record<string, number> = {};
  for (const f of fish) {
    const sp = getSpecies(f.species); if (!sp) continue;
    const mm = fishTL(f, sp) / fishTL({ sex: f.sex }, sp) * sp.tl;
    big[sp.id] = Math.max(big[sp.id] ?? 0, mm);
  }
  for (const id of Object.keys(big)) if (shareOf(big[id], getSpecies(id)!.tl) >= 1) delete big[id];
  return big;
}
