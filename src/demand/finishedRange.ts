// Lane FR1 (2026-11-05): the finished-tank price range the tank picker shows beside each size, per kind of setup.
// lo = the tank with the cheapest adequate gear, cheap substrate and decor and a light stock of cheap animals or plants; hi = a semi-professional
// finish (designed planted / reef / terrarium scape in luxury materials, quality gear, a fuller stock). A stand or furniture is NOT in either end
// (the picker asks for it next). Every dollar is the demand engine's own row price; the tank is the engine's list-price rule by gallons (never a sale). The table is precomputed (src/data/finishedRange.json, built by finishedRangeBuild.ts through
// `GEN_FINISHED=1 npx vitest run test/finishedRange.test.ts`) so the picker can call this for every row.
import table from '../data/finishedRange.json';

export type FinishedKind = 'freshwater' | 'saltwater' | 'terrarium' | 'vivarium';
export interface FinishedRange { lo: number; hi: number; basis?: string }

interface Table { asOf: string; basis: Record<FinishedKind, { lo: string; hi: string }>; rows: Record<string, [number, number]> }
const T = table as unknown as Table;

/** Display rounding: nearest $10 under $500, nearest $50 above. */
export const roundFinished = (usd: number) => usd < 500 ? Math.round(usd / 10) * 10 : Math.round(usd / 50) * 50;

/** The finished range of this catalogue tank as this kind of setup, rounded for display; null when the kind does not suit the tank (a terrarium kind
 *  for a glass aquarium, an aquarium kind for a terrarium, a vivarium in a tank under 12 in tall or not a plain rectangle) or the id is unknown. */
export function finishedRange(modelId: string, kind: FinishedKind): FinishedRange | null {
  const r = T.rows[`${modelId}|${kind}`];
  if (!r) return null;
  return { lo: r[0], hi: r[1], basis: `Low: ${T.basis[kind].lo}. High: ${T.basis[kind].hi}. No stand or furniture. Prices as of ${T.asOf}.` };
}

/** Current spend against expected spend (Nathan 2026-11-05: "as you progress through it, the horizons should narrow and eventually be close"):
 *  the money already committed is a floor under both ends, and `share` (0..1, how much of the setup's decisions are made: tank, gear, decor, animals) pulls
 *  the two ends together, so a finished build reads as one number. `spent` is the scene's own setup cost (demandOf totals.setupUsd, owned gear already
 *  credited). Pure; the caller says how far along it is. */
export function expectedFinished(range: Pick<FinishedRange, 'lo' | 'hi'>, spent: number, share = 0): { spent: number; lo: number; hi: number } {
  const s = Math.max(0, Math.min(1, share)), lo0 = Math.max(range.lo, spent), hi0 = Math.max(range.hi, lo0);
  const mid = (lo0 + hi0) / 2, k = 1 - s;
  return { spent, lo: Math.round(mid - (mid - lo0) * k), hi: Math.round(mid + (hi0 - mid) * k) };
}
