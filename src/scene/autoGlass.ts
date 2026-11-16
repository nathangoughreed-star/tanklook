// W13 (2026-11-16, Nathan: "yes for custom tanks; commercial = real product thickness where known, else keep today's auto"): a CUSTOM tank's
// 'auto' glass is what GS1's solver says it needs (a rimless tank draws thicker than a rimmed one), as a size stocked in the person's units.
// A commercial tank keeps its product's glass_mm; any other 'auto' keeps the height table (physics.ts glassThickness). Pure, memoised.
import { solveGlass, IN_MM } from './glassSolver';
import { getGlassUnits, glassThickness } from './physics';
import { shapeOf } from './shape';
import type { Tank, Units } from './types';

const cache = new Map<string, number>();

/** Thinnest stocked glass (mm) the solver accepts for a box tank at the default safety factor, one thickness all round; null for other shapes. */
export function solvedGlass(T: Tank, rim: boolean, units: Units = getGlassUnits()): number | null {
  if (shapeOf(T) !== 'rect') return null;
  const key = `${Math.round(T.L)}|${Math.round(T.D)}|${Math.round(T.H)}|${rim ? 1 : 0}|${units}`;
  const hit = cache.get(key); if (hit != null) return hit;
  const sol = solveGlass({ L: T.L, D: T.D, H: T.H }, { topEdge: rim ? 'held' : 'free', mode: 'uniform', units: units === 'in' ? 'us' : 'metric', continuous: false });
  const t = sol.panes.front.thickness, e = sol.panes.left.thickness, b = sol.panes.bottom.thickness;
  if (t == null || e == null || b == null) return null;
  const v = Math.max(t, e, b);
  if (cache.size > 400) cache.clear();
  cache.set(key, v);
  return v;
}

/** The glass (mm) to put on a setup for a custom tank: a number stays; 'auto' is solved (box tanks) or follows the height table. */
export function customGlass(glass: 'auto' | number, T: Tank, rim: boolean, units: Units = getGlassUnits()): number {
  if (glass !== 'auto') return glass;
  return solvedGlass(T, rim, units) ?? glassThickness(T, 'auto');
}
export { IN_MM };
