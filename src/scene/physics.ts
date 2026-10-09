// Pure physical rules shared by the renderer, the UI and the tests. No three.js here.
import { clampIn, footprint, glassAt, inside, nearestGlass, normTank, wallSpan } from './shape';
import type { Fish, RenderSettings, StandSettings, SubstrateSettings, Surface, Tank, TankSetup, Units } from './types';

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

/** A full tank's water line sits this far below the interior top (mm). */
export const WATERLINE_GAP = 25;

/** Height of the water surface above the tank floor (mm): `level` is the fraction of a full tank. */
export const waterY = (T: Tank, level: number) => clamp(level, 0, 1) * (T.H - WATERLINE_GAP);

/** Tint strength per mm of water for an opacity (the share of the water colour after 300 mm). */
export const waterK = (opacity: number) => -Math.log(1 - clamp(opacity, 0, 0.97)) / 300;

/**
 * A random spot for a snail on ground `h` of crawling length `size`: every point of the substrate and of the inside of the
 * glass (below the water line, `top`) is equally likely, so floor and glass are chosen in proportion to their area. On
 * glass, (x, depth) is the point on the glass (any pane or curved shell) and yaw the heading there.
 */
export function spawnSnail(h: (x: number, depth: number) => number, T: Tank, size: number, r: () => number, top = T.H - WATERLINE_GAP) {
  const f = footprint(T), m = size / 2, yaw = Math.round(r() * 360 - 180);
  const meanSub = f.ring.reduce((a, p) => a + h(p[0], p[1]), 0) / f.ring.length, hw = Math.max(0, top - meanSub);
  if (r() * (f.area + f.perimeter * hw) < f.area) {
    let x = T.L / 2, depth = T.D / 2;
    for (let k = 0; k < 200; k++) {
      const px = m + r() * Math.max(0, T.L - 2 * m), pd = m + r() * Math.max(0, T.D - 2 * m);
      if (inside(T, px, pd, m)) { x = px; depth = pd; break; }
    }
    return { surface: 'floor' as Surface, x, depth, y: h(x, depth), yaw };
  }
  // on glass: a uniform point along the outline, kept half a body from the corners of a flat pane
  let g = glassAt(T, r() * f.perimeter);
  if (!f.walls[g.wall].curved) { const [s0, s1] = wallSpan(T, g.wall); if (s1 - s0 > 2 * m) g = glassAt(T, clamp(g.s, s0 + m, s1 - m)); }
  const lo = h(g.x, g.depth) + m, hi = Math.max(lo, top - m);
  return { surface: 'glass' as Surface, x: g.x, depth: g.depth, y: lo + r() * (hi - lo), yaw };
}

/** Map a Tank-A position into tank T at the same relative spot. */
export function mapToTank(A: Tank, T: Tank, p: { x: number; y: number; depth: number }) {
  return { x: p.x * T.L / A.L, y: p.y * T.H / A.H, depth: p.depth * T.D / A.D };
}

/** Straight-on apparent size ratio of an object at `depth` vs the same object at the front glass. */
export const depthRatio = (dist: number, depth: number) => dist / (dist + depth);

/** Rescale everything positioned in a tank when its dimensions change, so items keep their relative spot. */
export function rescaleTank(s: TankSetup, next: Tank) {
  const old = s.tank; next = normTank(next);
  for (const f of s.fish) { f.x *= next.L / old.L; f.y *= next.H / old.H; f.depth *= next.D / old.D; }
  s.tank = { ...next };
}

/** Keep a fish inside its tank: within the footprint (a glass snail on the glass), between the floor and the top. */
export function clampFish(f: Fish, A: Tank) {
  f.y = clamp(f.y, 0, A.H);
  const p = f.surface === 'glass' ? nearestGlass(A, f.x, f.depth) : clampIn(A, clamp(f.x, 0, A.L), clamp(f.depth, 0, A.D));
  f.x = p.x; f.depth = p.depth;
}

// ---------- Units & formatting ----------
export const unitMM = (u: Units) => (u === 'in' ? IN : 10);
export function fmtLen(mm: number, u: Units, digits = 1) {
  return u === 'in' ? (mm / IN).toFixed(digits) + '″' : (mm / 10).toFixed(digits) + ' cm';
}
export function fmtDims(T: Tank, u: Units) {
  const k = unitMM(u), suf = u === 'in' ? '″' : ' cm';
  const dims = `${+(T.L / k).toFixed(1)} × ${+(T.H / k).toFixed(1)} × ${+(T.D / k).toFixed(1)}${suf} (L×H×D)`;
  const sh = T.shape ?? 'rect';
  return sh === 'rect' ? dims : `${sh === 'bow' ? 'bowfront' : sh === 'round' ? 'round' : `${T.sides}-sided`} ${dims}`;
}
export const toUnit = (mm: number, u: Units) => +(mm / unitMM(u)).toFixed(2);
export const fromUnit = (v: number, u: Units) => v * unitMM(u);

/** Dimensions, then capacity and floor area (interior): `24 × 12 × 12″, 15 gallons, 288 in²`. */
export function fmtSize(T: Tank, u: Units) {
  const v = volume(T), a = footprint(T).area, dims = fmtDims(T, u).replace(' (L×H×D)', '');
  return u === 'in' ? `${dims}, ${+v.gallons.toFixed(1)} gallons, ${Math.round(a / (IN * IN)).toLocaleString()} in²`
    : `${dims}, ${Math.round(v.litres)} L, ${Math.round(a / 100).toLocaleString()} cm²`;
}

/** Interior volume in US gallons and litres (footprint area x height). */
export function volume(T: Tank) {
  const litres = footprint(T).area * T.H / 1e6;
  return { litres, gallons: litres / 3.785411784 };
}
