// "Fine for now" (S228, Nathan 2026-10-26; research/outgrows.md): every stocking check is run at the animals' current sizes and then
// stepped forward along all their growth curves together (data/growth.ts), to the first step at which a check fails. One stepping
// function for every reader: the herp check's "should last" line, the editor's growth line for fish, the planner's tank list and verdict.
import { fishTL, getSpecies } from '../data/species';
import { grownLength, monthsToAdult } from '../data/growth';
import type { Fish, TankSetup } from './types';

/** Something that grows: a species, a current length (mm; undefined = adult) and, for a female, her own adult length. */
interface Sized { species: string; tl?: number; sex?: 'f' }
const adultOf = (a: Sized) => { const sp = getSpecies(a.species); return sp ? fishTL({ sex: a.sex }, sp) : 0; };

/** Each animal `months` later: a young one at its grown length, one grown by then back at its adult length (tl dropped). */
export function grownBy<T extends Sized>(xs: T[], months: number): T[] {
  return xs.map(a => {
    const sp = getSpecies(a.species);
    if (!sp || a.tl === undefined || months <= 0) return a;
    const mm = grownLength(sp, a.tl, months, adultOf(a));
    if (mm === undefined) { const { tl: _gone, ...rest } = a; return rest as T; }
    return { ...a, tl: mm };
  });
}

/** Months until every animal is grown (0 = all adult already). */
export const horizonOf = (xs: Sized[]) => Math.max(0, ...xs.map(a => { const sp = getSpecies(a.species); return sp && a.tl !== undefined ? monthsToAdult(sp, a.tl, adultOf(a)) : 0; }));

/** The months looked at: monthly for two years, quarterly to five, then yearly; the last is the horizon (all grown). */
const gridTo = (h: number) => {
  const g: number[] = [];
  for (let m = 1; m < h; m += m < 24 ? 1 : m < 60 ? 3 : 12) g.push(m);
  return [...g, h];
};

export interface Outgrow<W> {
  /** months from now until the check fails */
  months: number;
  /** the animals then */
  at: Sized[];
  /** what the check said */
  why: W;
}

/**
 * The first time `fails` says something as the animals grow (undefined: never, or they are all adult already). It is not asked about
 * today's sizes (the caller has that verdict). Growing only ever asks more of a tank, so the months are searched by halves (a few calls,
 * whatever the horizon): the grid finds the first failing step, then halving between it and the step before finds the month (`fine`
 * halvings; 0 = to the grid).
 */
export function firstFail<T extends Sized, W>(xs: T[], fails: (at: T[]) => W | undefined, fine = 6): Outgrow<W> | undefined {
  const h = horizonOf(xs);
  if (h <= 0) return undefined;
  const grid = gridTo(h);
  let why = fails(grownBy(xs, h));
  if (why === undefined) return undefined;
  let lo = -1, hi = grid.length - 1; // grid[hi] fails; grid[lo] (or now) does not
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1, w = fails(grownBy(xs, grid[mid]));
    if (w === undefined) lo = mid; else { hi = mid; why = w; }
  }
  let a = lo < 0 ? 0 : grid[lo], b = grid[hi];
  for (let i = 0; i < fine && b - a > 0.02; i++) {
    const mid = (a + b) / 2, w = fails(grownBy(xs, mid));
    if (w === undefined) a = mid; else { b = mid; why = w; }
  }
  return { months: b, at: grownBy(xs, b), why };
}

/** The tank's animals `months` later (positions and everything else as they are). */
export const grownSetup = (S: TankSetup, months: number): TankSetup => ({ ...S, fish: grownBy<Fish>(S.fish, months) });

/** How long, in words: "under a month", "2 months", "1 year 3 months". */
export const span = (months: number) => {
  const m = Math.round(months), y = Math.floor(m / 12), r = m % 12;
  return m < 1 ? 'under a month' : [y ? `${y} year${y > 1 ? 's' : ''}` : '', r ? `${r} month${r > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
};
/** A length to one decimal in inches, or whole cm. */
export const lenAbout = (mm: number, u: 'in' | 'cm' = 'in') => u === 'in' ? `${+(mm / 25.4).toFixed(1)} in` : `${Math.round(mm / 10)} cm`;
/** The length the grown animal of `species` has at an Outgrow (its adult length when grown by then). */
export const lengthIn = (o: Outgrow<unknown>, species: string) => { const sp = getSpecies(species); return Math.max(0, ...o.at.filter(x => x.species === species).map(a => a.tl ?? (sp ? fishTL({ sex: a.sex }, sp) : 0))); };
