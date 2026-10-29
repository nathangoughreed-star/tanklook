// Generic gear prices from curves fitted to the library's own listed prices (lane GM6, design gear-model.md section 4).
// A generic filter of a kind costs a * gph^b where the library of that kind fits well (data/gear-price-curves.json: n >= 7, r2 >= 0.7:
// HOB and internal filters today); elsewhere the hand-set demand-items.json row stands. The curve sets the MODE; lo / hi keep the row's proportions.
import data from '../data/gear-price-curves.json';
import { price } from './prices';
import type { Range3 } from './types';

export interface Curve { driver: string; a: number; b: number; n: number; r2: number; sdLog: number; xMin: number; xMax: number; use: boolean }
export const CURVES = data.curves as Record<string, Curve>;
/** The curve value at `x`, the stat held inside the range the library covers (no extrapolation). */
export const curveAt = (c: Curve, x: number) => c.a * Math.max(c.xMin, Math.min(c.xMax, x)) ** c.b;

/** A generic filter model's price: its kind's fitted curve at its flow where there is one in use, else its price row. */
export function filterModelPrice(m: { kind: string; gph: number; priceKey: string }): Range3 | undefined {
  const row = price(m.priceKey), c = CURVES[`filter:${m.kind}`];
  if (!row || !c?.use) return row;
  const k = curveAt(c, m.gph) / row.mode;
  return { lo: row.lo * k, mode: row.mode * k, hi: row.hi * k };
}
