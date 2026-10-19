import type { Range3, Rangeish } from './types';

export const r3 = (x: Rangeish | undefined): Range3 | undefined => x === undefined ? undefined : typeof x === 'number' ? { lo: x, mode: x, hi: x } : x;
export const mean3 = (r: Range3) => (r.lo + r.mode + r.hi) / 3;
export const scale3 = (r: Range3, k: number): Range3 => ({ lo: r.lo * k, mode: r.mode * k, hi: r.hi * k });
export const add3 = (a: Range3, b: Range3): Range3 => ({ lo: a.lo + b.lo, mode: a.mode + b.mode, hi: a.hi + b.hi });
/** Widen the band around the mode by w (1 = as is); the mode and so the mean's centre stay put. */
export const widen3 = (r: Range3, w: number): Range3 => ({ lo: Math.max(0, r.mode - (r.mode - r.lo) * w), mode: r.mode, hi: r.mode + (r.hi - r.mode) * w });
