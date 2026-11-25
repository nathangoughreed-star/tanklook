// Lane GC (R148; Nathan 2026-11-25: "have a guessed price that can be overridden with user input, this is how every price should work").
// Glass price per SQUARE FOOT cut to size, by thickness: a researched default (research/glass-prices.md) plus the person's own figure per
// thickness (saved with the custom tank as CustomTankSpec.glassPrices). Pure.
import { IN_MM } from './glassSolver';

export type GlassKind = 'standard' | 'lowiron';
/** Default US $/sq ft, glass cut to size at a glass shop (nominal inches): [thickness in, float, low-iron]. Sources and dates: research/glass-prices.md. */
export const GLASS_PRICE_TABLE: [number, number, number][] = [
  [0.125, 5, 10], [0.1875, 7, 14], [0.25, 12, 20], [0.375, 18, 28], [0.5, 26, 40], [0.625, 35, 52], [0.75, 45, 65], [1, 60, 90],
];
/** Overrides: $/sq ft keyed by thickness in mm to 0.1 ({ "6.4": 11 }). */
export type GlassPrices = Record<string, number>;
export const priceKey = (mm: number) => (Math.round(mm * 10) / 10).toFixed(1);

/** The researched default for a thickness (mm): the nearest listed thickness, interpolated between neighbours. */
export function estimateSqFt(mm: number, kind: GlassKind): number {
  const col = kind === 'lowiron' ? 2 : 1, ti = mm / IN_MM, t = GLASS_PRICE_TABLE;
  if (ti <= t[0][0]) return t[0][col] * Math.max(0.5, ti / t[0][0]);
  for (let i = 1; i < t.length; i++) if (ti <= t[i][0] + 1e-9) { const a = t[i - 1], b = t[i], f = (ti - a[0]) / (b[0] - a[0]); return a[col] + f * (b[col] - a[col]); }
  const a = t[t.length - 2], b = t[t.length - 1]; return b[col] + (ti - b[0]) / (b[0] - a[0]) * (b[col] - a[col]);
}
/** The $/sq ft in force: the person's figure for this thickness, else the estimate. */
export const priceSqFt = (mm: number, kind: GlassKind, over?: GlassPrices): { usd: number; own: boolean } => {
  const o = over?.[priceKey(mm)];
  return typeof o === 'number' && Number.isFinite(o) && o >= 0 ? { usd: o, own: true } : { usd: estimateSqFt(mm, kind), own: false };
};
/** A saved override table from untrusted JSON: only sane entries, undefined when none. */
export function parsePrices(raw: unknown): GlassPrices | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: GlassPrices = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (/^\d{1,2}(\.\d)?$/.test(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 2000) out[k] = Math.round(v * 100) / 100;
  return Object.keys(out).length ? out : undefined;
}
export const MM2_PER_SQFT = 92903.04;
