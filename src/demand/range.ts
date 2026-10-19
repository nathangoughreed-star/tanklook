import type { Range3, Rangeish } from './types';

export const r3 = (x: Rangeish | undefined): Range3 | undefined => x === undefined ? undefined : typeof x === 'number' ? { lo: x, mode: x, hi: x } : x;
export const mean3 = (r: Range3) => (r.lo + r.mode + r.hi) / 3;
export const var3 = (r: Range3) => (r.lo * r.lo + r.mode * r.mode + r.hi * r.hi - r.lo * r.mode - r.lo * r.hi - r.mode * r.hi) / 18;
export const scale3 = (r: Range3, k: number): Range3 => ({ lo: r.lo * k, mode: r.mode * k, hi: r.hi * k });
export const mul3 = (a: Range3, b: Range3): Range3 => ({ lo: a.lo * b.lo, mode: a.mode * b.mode, hi: a.hi * b.hi });
export const add3 = (a: Range3, b: Range3): Range3 => ({ lo: a.lo + b.lo, mode: a.mode + b.mode, hi: a.hi + b.hi });
/** Widen the band around the mode by w (1 = as is); the mode and so the mean's centre stay put. */
export const widen3 = (r: Range3, w: number): Range3 => ({ lo: Math.max(0, r.mode - (r.mode - r.lo) * w), mode: r.mode, hi: r.mode + (r.hi - r.mode) * w });
/** Inverse CDF of the triangular distribution. */
export function triInv(r: Range3, u: number): number {
  const { lo, mode, hi } = r;
  if (hi <= lo) return mode;
  const f = (mode - lo) / (hi - lo);
  return u < f ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
}
/** Standard normal CDF (Abramowitz-Stegun 7.1.26). */
export function phi(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}
/** mulberry32: a small seeded generator, so results are stable run to run. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { u, z: () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u()) };
}
