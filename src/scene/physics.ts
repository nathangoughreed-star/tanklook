// Pure physical rules shared by the renderer, the UI and the tests. No three.js here.
import type { Fish, RenderSettings, Scene, StandSettings, SubstrateSettings, Tank, Units } from './types';

export const IN = 25.4;
export const D2R = Math.PI / 180;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Glass thickness (mm): explicit choice, or typical commercial thickness by interior height. */
export function glassThickness(T: Tank, glass: RenderSettings['glass']): number {
  if (glass !== 'auto') return glass;
  const h = T.H / IN;
  return h <= 13 ? 5 : h <= 17 ? 6 : h <= 21 ? 8 : h <= 25 ? 10 : h <= 30 ? 12 : 15;
}

/** Rim strip height and how far the bottom rim drops below the bottom glass (mm). */
export const RIM_H = 20, RIM_DROP = 2;

/** y of the underside of the tank (bottom glass, or bottom rim when rimmed) = top of the stand. */
export function tankUnderside(T: Tank, R: RenderSettings) {
  return -glassThickness(T, R.glass) - (R.rim ? RIM_DROP : 0);
}

/** y of the room floor: under the stand if there is one, else directly under the tank. */
export function floorY(T: Tank, R: RenderSettings, stand: StandSettings) {
  return tankUnderside(T, R) - (stand.show ? stand.height : 0);
}

/** Gap between the outside of the glass and the room wall (mm). */
export const WALL_GAP = 50;

/** Highest a substrate corner may go, as a fraction of interior height. */
export const SUBSTRATE_CAP = 0.6;

/**
 * Substrate surface height (mm above the tank floor) at (x, depth): bilinear blend of the four corner depths.
 * Depths are physical, so a different tank gets the same thickness, not a proportional one.
 */
export function substrateHeight(s: SubstrateSettings, T: Tank, x: number, depth: number): number {
  if (!s.show) return 0;
  const cap = T.H * SUBSTRATE_CAP, c = (v: number) => Math.min(v, cap);
  const u = clamp(x / T.L, 0, 1), v = clamp(depth / T.D, 0, 1);
  return (c(s.fl) * (1 - u) + c(s.fr) * u) * (1 - v) + (c(s.bl) * (1 - u) + c(s.br) * u) * v;
}

/** Map a Tank-A position into tank T at the same relative spot. */
export function mapToTank(A: Tank, T: Tank, p: { x: number; y: number; depth: number }) {
  return { x: p.x * T.L / A.L, y: p.y * T.H / A.H, depth: p.depth * T.D / A.D };
}

/** Straight-on apparent size ratio of an object at `depth` vs the same object at the front glass. */
export const depthRatio = (dist: number, depth: number) => dist / (dist + depth);

/** Rescale everything positioned in Tank A when Tank A's dimensions change, so items keep their relative spot. */
export function rescaleTankA(s: Scene, next: Tank) {
  const old = s.tankA;
  for (const f of s.fish) { f.x *= next.L / old.L; f.y *= next.H / old.H; f.depth *= next.D / old.D; }
  s.plant.x *= next.L / old.L; s.plant.depth *= next.D / old.D;
  s.tankA = { ...next };
}

/** Keep a fish inside Tank A. */
export function clampFish(f: Fish, A: Tank) {
  f.x = clamp(f.x, 0, A.L); f.y = clamp(f.y, 0, A.H); f.depth = clamp(f.depth, 0, A.D);
}

// ---------- Units & formatting ----------
export const unitMM = (u: Units) => (u === 'in' ? IN : 10);
export function fmtLen(mm: number, u: Units, digits = 1) {
  return u === 'in' ? (mm / IN).toFixed(digits) + '″' : (mm / 10).toFixed(digits) + ' cm';
}
export function fmtDims(T: Tank, u: Units) {
  const k = unitMM(u), suf = u === 'in' ? '″' : ' cm';
  return `${+(T.L / k).toFixed(1)} × ${+(T.H / k).toFixed(1)} × ${+(T.D / k).toFixed(1)}${suf} (L×H×D)`;
}
export const toUnit = (mm: number, u: Units) => +(mm / unitMM(u)).toFixed(2);
export const fromUnit = (v: number, u: Units) => v * unitMM(u);

/** Interior volume in US gallons and litres. */
export function volume(T: Tank) {
  const litres = T.L * T.H * T.D / 1e6;
  return { litres, gallons: litres / 3.785411784 };
}
