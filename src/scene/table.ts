// Table stand (tank shapes phase 2, Nathan 2026-10-08): a table top (rectangular or round) larger than the tank, with
// the tank placed anywhere on it. The room (wall, scale person) then sits relative to the table's edge (answer 5).
// Footprint coordinates as in shape.ts: (x, depth), depth growing toward the back.
import { WALL_GAP, clamp, glassThickness } from './physics';
import { offsetRing, type P } from './shape';
import type { Tank, TableSettings, TankSetup } from './types';

/** Table top thickness (mm). */
export const TABLE_TOP = 32;
/** Largest table side / diameter (mm). */
export const TABLE_MAX = 3000;

export const tableOn = (S: TankSetup) => S.stand.show && S.stand.style === 'table';

/** The tank's outline on the table: the outer glass, or the rim when rimmed (the rim sits on the top too). */
function tankOuter(S: TankSetup, T: Tank) {
  const t = glassThickness(T, S.render.glass);
  return offsetRing(T, S.render.rim ? t + 8 : t);
}

/** Table centre in footprint coordinates: (x, z) is the tank's offset from it (x right, z toward the back). */
export const tableCentre = (T: Tank, tb: TableSettings): P => [T.L / 2 - tb.x, T.D / 2 - tb.z];

/** The table top outline (footprint coordinates, counter-clockwise like the tank's ring). */
export function tableRing(T: Tank, tb: TableSettings): P[] {
  const [cx, cd] = tableCentre(T, tb);
  if (tb.shape === 'round') {
    const r = tb.L / 2, n = 64;
    return Array.from({ length: n }, (_, i) => [cx + r * Math.cos(2 * Math.PI * i / n), cd + r * Math.sin(2 * Math.PI * i / n)] as P);
  }
  const hx = tb.L / 2, hd = tb.D / 2;
  return [[cx - hx, cd - hd], [cx + hx, cd - hd], [cx + hx, cd + hd], [cx - hx, cd + hd]];
}

/** The tank's outline relative to its bounding-box centre. */
const tankRel = (S: TankSetup) => tankOuter(S, S.tank).map(([x, d]) => [x - S.tank.L / 2, d - S.tank.D / 2] as P);
const span = (q: P[], k: 0 | 1) => [Math.min(...q.map(p => p[k])), Math.max(...q.map(p => p[k]))];
/** Round top: does the tank at offset (x, z) lie on it? */
const onRound = (q: P[], r: number, x: number, z: number) => q.every(p => Math.hypot(p[0] + x, p[1] + z) <= r + 0.01);

/**
 * Keep the table valid for its tank: big enough for the tank's outline (it grows, never shrinks), round = D equal to
 * L, and the offset clamped so the whole outline stays on the top. Mutates `S.stand.table`.
 */
export function fitTable(S: TankSetup) {
  const tb = S.stand.table, q = tankRel(S);
  if (tb.shape === 'round') {
    const r = Math.max(...q.map(p => Math.hypot(p[0], p[1])));
    tb.L = tb.D = clamp(Math.max(tb.L, Math.ceil(2 * r)), 0, TABLE_MAX);
    const fits = (s: number) => onRound(q, tb.L / 2, tb.x * s, tb.z * s);
    if (!fits(1)) { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; } tb.x *= lo; tb.z *= lo; }
    return;
  }
  const [x0, x1] = span(q, 0), [d0, d1] = span(q, 1);
  tb.L = clamp(Math.max(tb.L, Math.ceil(x1 - x0)), 0, TABLE_MAX); tb.D = clamp(Math.max(tb.D, Math.ceil(d1 - d0)), 0, TABLE_MAX);
  tb.x = clamp(tb.x, -tb.L / 2 - x0, tb.L / 2 - x1); tb.z = clamp(tb.z, -tb.D / 2 - d0, tb.D / 2 - d1);
}

/**
 * Slider limits for a (fitted) table: the smallest top that holds the tank, and how far the tank can move each way
 * (round: along x with z as it is, and along z with x as it is).
 */
export function tableRange(S: TankSetup) {
  const tb = S.stand.table, q = tankRel(S), [x0, x1] = span(q, 0), [d0, d1] = span(q, 1);
  if (tb.shape === 'rect') return { minL: x1 - x0, minD: d1 - d0, x0: -tb.L / 2 - x0, x1: tb.L / 2 - x1, z0: -tb.D / 2 - d0, z1: tb.D / 2 - d1 };
  const r = tb.L / 2, minL = 2 * Math.max(...q.map(p => Math.hypot(p[0], p[1])));
  // the offsets that fit form a convex set holding the current one: search outward from it
  const reach = (ok: (v: number) => boolean, from: number, to: number) => { let a = from, b = to; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; } return a; };
  const okX = (v: number) => onRound(q, r, v, tb.z), okZ = (v: number) => onRound(q, r, tb.x, v);
  return { minL, minD: minL, x0: reach(okX, tb.x, -r), x1: reach(okX, tb.x, r), z0: reach(okZ, tb.z, -r), z1: reach(okZ, tb.z, r) };
}

/**
 * Footprint bounds of what stands in the room: the outer glass, and the table top when there is one. The room wall
 * and the scale person keep clear of this (with a table, relative to its edge).
 */
export function roomBox(S: TankSetup, T: Tank) {
  const t = glassThickness(T, S.render.glass);
  let x0 = -t, x1 = T.L + t, d0 = -t, d1 = T.D + t;
  if (tableOn(S)) for (const [x, d] of tableRing(T, S.stand.table)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); d0 = Math.min(d0, d); d1 = Math.max(d1, d); }
  return { x0, x1, d0, d1 };
}

/** Where the room wall stands, in world coordinates: back = its z; ends = its x. */
export function wallPlane(S: TankSetup, T: Tank) {
  const b = roomBox(S, T);
  return { back: -b.d1 - WALL_GAP, left: b.x0 - WALL_GAP, right: b.x1 + WALL_GAP };
}
