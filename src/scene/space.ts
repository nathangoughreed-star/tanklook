// The owner's space (lane P3, path 1, Nathan 2026-10-20): "Set my space" on the fullness tile records the area they have
// for the tank (width x depth, height optional) in `layout.space`; the viewer draws it as a dashed outline on the stand top
// (render/spaceOutline.ts), back edge on the tank's back, and a tank bigger than it opens the fork card (make room / swap).
import type { SpaceLimit, Tank } from './types';
import { footprint } from './shape';

/** Smallest and largest space a field takes (mm): 10 cm .. 10 m. */
export const SPACE_MIN = 100, SPACE_MAX = 10000;
const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= SPACE_MIN && v <= SPACE_MAX;

/** A saved `layout.space`, or undefined when absent or not a usable size (old files have none). */
export function parseSpace(v: unknown): SpaceLimit | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (!ok(o.w) || !ok(o.d)) return undefined;
  return { w: Math.round(o.w), d: Math.round(o.d), ...(ok(o.h) ? { h: Math.round(o.h) } : {}) };
}

/** The tank's outside size as the space counts it: the footprint's bounding box (any shape) and the glass height, mm. */
export function tankExtent(T: Tank): { w: number; d: number; h: number } {
  let w = 0, d = 0;
  for (const [x, dp] of footprint(T).ring) { w = Math.max(w, x); d = Math.max(d, dp); }
  return { w: Math.round(w), d: Math.round(d), h: Math.round(T.H) };
}

export interface SpaceFit {
  fits: boolean;
  /** how far the tank goes past the space on each side, mm (0 = within); h is 0 when no height is set */
  over: { w: number; d: number; h: number };
}

export function spaceFit(T: Tank, s: SpaceLimit): SpaceFit {
  const e = tankExtent(T), over = { w: Math.max(0, e.w - s.w), d: Math.max(0, e.d - s.d), h: s.h ? Math.max(0, e.h - s.h) : 0 };
  return { fits: !over.w && !over.d && !over.h, over };
}

/** What "Set my space" starts from: the tank's footprint with a little room around it, in whole 5 cm (2 in for US units). */
export function defaultSpace(T: Tank, units: 'cm' | 'in' = 'cm'): SpaceLimit {
  const e = tankExtent(T), q = units === 'in' ? 50.8 : 50, up = (mm: number) => Math.min(SPACE_MAX, Math.max(SPACE_MIN, Math.round(Math.ceil(mm / q - 1e-6) * q)));
  return { w: up(e.w + 100), d: up(e.d + 50) };
}
