// Per-item price lookup (lane KK phase 2): src/data/demand-items.json, researched 2026-10-19. A row missing here falls back to
// the category defaults in demand-defaults.json. Estimated rows (est: true, no listing found) are widened a little.
import data from '../data/demand-items.json';
import type { Range3 } from './types';

export interface PriceRow { lo: number; mode: number; hi: number; unit: string; url: string; est?: boolean }
const ROWS = data.rows as Record<string, PriceRow>;
export const PRICES_AS_OF = data.asOf;
export const priceRow = (key: string) => ROWS[key];
const EST_WIDEN = 1.25;
export function price(key: string): Range3 | undefined {
  const r = ROWS[key];
  if (!r) return undefined;
  return r.est ? { lo: r.mode - (r.mode - r.lo) * EST_WIDEN, mode: r.mode, hi: r.mode + (r.hi - r.mode) * EST_WIDEN } : { lo: r.lo, mode: r.mode, hi: r.hi };
}
/** Piecewise-linear price between rows `${prefix}${x0}`... keyed by a number (gallons, stand size): clamps at the ends. */
export function interp(prefix: string, xs: number[], x: number): Range3 | undefined {
  const pts = xs.map(v => ({ v, p: price(prefix + v) })).filter((a): a is { v: number; p: Range3 } => !!a.p);
  if (!pts.length) return undefined;
  if (x <= pts[0].v) return pts[0].p;
  for (let i = 1; i < pts.length; i++) if (x <= pts[i].v) {
    const a = pts[i - 1], b = pts[i], t = (x - a.v) / (b.v - a.v);
    return { lo: a.p.lo + (b.p.lo - a.p.lo) * t, mode: a.p.mode + (b.p.mode - a.p.mode) * t, hi: a.p.hi + (b.p.hi - a.p.hi) * t };
  }
  return pts[pts.length - 1].p;
}
