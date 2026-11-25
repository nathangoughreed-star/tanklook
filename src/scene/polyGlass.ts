// Lane GC2 (Nathan 2026-11-25: "add the solver for polygons but nothing curved"): the glass check for polygon tanks. Every side of a polygon is a flat
// pane, and the box solver's wall model (a plate of the side's length x the height, supported on both ends and the bottom, free top) does not care
// what angle the corner makes, so each side is checked as that plate. The bottom on a flat stand is matched to the walls, as for a box; on its edges
// ('perimeter') it is a plate over the polygon's bounding box, which is conservative. No brace (a free polygon top is the common build) and no silicone
// joint check (the joint model is for square corners). Pure.
import { IN_MM, STOCK_METRIC, STOCK_US_PICK, solveGlass } from './glassSolver';
import { footprint, polySides, shapeOf } from './shape';
import type { Tank } from './types';

export const isPoly = (T: Tank) => shapeOf(T) === 'poly';
export interface PolyPanes { wall: number; bottom: number }
export interface PolySide { len: number; sf: number; defl: number }
export interface PolyCheck { sides: PolySide[]; bottomSf: number | null; minSf: number; ok: boolean; governs: 'walls' | 'bottom' | 'deflection'; deflRatio: number }
type Bottom = 'full' | 'perimeter';

/** Distinct side lengths (to 0.1 mm), longest first. */
const distinct = (T: Tank) => [...new Set(polySides(T).map(v => Math.round(v * 10) / 10))].sort((a, b) => b - a);
const OPTS = { safetyFactor: 0.01, deflection: { thicknessRatio: 1e6 }, continuous: false } as const;

/** One side as a plate: its safety factor and deflection / thickness at thickness t (mm), filled to depth `fill` (default the brim). */
function sidePlate(len: number, H: number, t: number, rim: boolean, fill: number): PolySide {
  const s = solveGlass({ L: len, D: len, H, waterDepth: fill }, { ...OPTS, fixed: { long: t, end: t, bottom: t }, topEdge: rim ? 'held' : 'free', bottomSupport: 'full' });
  return { len, sf: s.panes.front.sf, defl: s.panes.front.deflection / t };
}
function bottomPlate(T: Tank, t: number, fill: number): number {
  const f = footprint(T), xs = f.ring.map(p => p[0]), ys = f.ring.map(p => p[1]);
  const L = Math.max(...xs) - Math.min(...xs), D = Math.max(...ys) - Math.min(...ys);
  return solveGlass({ L, D, H: T.H, waterDepth: fill }, { ...OPTS, fixed: { long: t, end: t, bottom: t }, bottomSupport: 'perimeter' }).panes.bottom.sf;
}

export function polyCheck(T: Tank, rim: boolean, p: PolyPanes, sf: number, bottom: Bottom, fill = T.H): PolyCheck {
  const sides = distinct(T).map(l => sidePlate(l, T.H, p.wall, rim, fill));
  const bottomSf = bottom === 'perimeter' ? bottomPlate(T, p.bottom, fill) : null;
  const wallSf = Math.min(...sides.map(s => s.sf)), deflRatio = Math.max(...sides.map(s => s.defl));
  const minSf = Math.min(wallSf, bottomSf ?? Infinity);
  const ok = minSf + 1e-9 >= sf && deflRatio <= 1 + 1e-9;
  const governs = deflRatio > 1 + 1e-9 && wallSf + 1e-9 >= sf ? 'deflection' : bottomSf != null && bottomSf < wallSf ? 'bottom' : 'walls';
  return { sides, bottomSf, minSf, ok, governs, deflRatio };
}

/** The thinnest stock glass for the walls (set by the longest side) and the bottom. Null = nothing in stock is thick enough. */
export function polySolve(T: Tank, rim: boolean, sf: number, bottom: Bottom, u: 'in' | 'cm', fill = T.H - 25): { wall: number | null; bottom: number | null; check: PolyCheck | null } {
  const stock = (u === 'in' ? STOCK_US_PICK : STOCK_METRIC).slice().sort((a, b) => a - b), L = distinct(T)[0];
  const wall = stock.find(t => { const s = sidePlate(L, T.H, t, rim, fill); return s.sf + 1e-9 >= sf && s.defl <= 1 + 1e-9; }) ?? null;
  if (wall == null) return { wall: null, bottom: null, check: null };
  const bt = bottom === 'full' ? wall : stock.find(t => t >= wall - 1e-9 && bottomPlate(T, t, fill) + 1e-9 >= sf) ?? null;
  return { wall, bottom: bt, check: bt == null ? null : polyCheck(T, rim, { wall, bottom: bt }, sf, bottom, fill) };
}

/** Glass area (sq ft) of the walls (every side x the height) and the bottom. */
export const polyAreas = (T: Tank) => { const f = footprint(T), k = 92903.04; return { wall: f.perimeter * T.H / k, bottom: f.area / k }; };
export { IN_MM };
