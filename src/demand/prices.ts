// Per-item price lookup (lane KK phase 2): src/data/demand-items.json, researched 2026-10-19. A row missing here falls back to
// the category defaults in demand-defaults.json. Estimated rows (est: true, no listing found) are widened a little.
import data from '../data/demand-items.json';
import type { Range3 } from './types';

export interface PriceRow { lo: number; mode: number; hi: number; unit: string; url: string; est?: boolean; /** a bulb or tube's life, months: its replacement is upkeep (lane LT) */ lifeMonths?: number }
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

/** A bare glass tank's typical price at `gal` gallons: the tank:N rows between 5 and 125 gal, scaled in proportion past either end
 *  (the demand engine's own tank rule; the sump tank is priced by it too, lane SU). */
export function tankRowPrice(gal: number): Range3 | undefined {
  const r = interp('tank:', [5, 10, 20, 29, 40, 55, 75, 125], gal), k = gal > 125 ? gal / 125 : gal < 5 ? Math.max(0.3, gal / 5) : 1;
  return r && { lo: r.lo * k, mode: r.mode * k, hi: r.hi * k };
}
