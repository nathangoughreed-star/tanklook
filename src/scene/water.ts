// Keeps animals where they live: swimmers between the ground and the surface, bottom dwellers on submerged ground,
// animals on the glass below the water line (tree frogs above it), land animals on ground above it; amphibious ('both') animals swim where the water is
// deep enough for them and rest on the ground elsewhere. Floor snails may sit anywhere, emerged land included.
import { fishTL, speciesOf, type Species } from '../data/species';
import { backdropDepth, clamp, clampFish, waterY } from './physics';
import { groundHeight, nearestLand, nearestWater } from './terrain';
import type { Fish, Tank, TankSetup } from './types';

/** Does this (non-snail) animal rest on the ground at (x, depth) in tank T, rather than swim? h = its card height. */
export function restsOnGround(s: TankSetup, T: Tank, sp: Species, x: number, depth: number, h: number): boolean {
  if (sp.zone === 'bottom' || sp.habitat === 'land') return true;
  if (sp.habitat !== 'both') return false;
  return !s.water.on || waterY(T, s.water.level) - groundHeight(s, T, x, depth) < h;
}

/** The heights (mm) an animal `w` long on the glass may sit at over ground `sub`: a land climber (tree frog) between the
 *  water line (or the ground) and the top of the pane, anything else between the ground and the water line. */
export function glassBand(s: TankSetup, T: Tank, sp: Species, w: number, sub: number): [number, number] {
  const water = s.water.on ? waterY(T, s.water.level) : T.H;
  const lo = (sp.habitat === 'land' && s.water.on ? Math.max(sub, water) : sub) + w / 2, top = sp.habitat === 'land' ? T.H : water;
  return [lo, Math.max(lo, top - w / 2)];
}

/** Highest centre height (mm) for this animal at water surface `top`; null = its height is not free. */
export function maxFishY(f: Fish, top: number): number | null {
  const sp = speciesOf(f); if (!sp) return null;
  const w = fishTL(f, sp);
  if (f.surface === 'glass') return sp.habitat === 'land' ? null : Math.max(0, top - w / 2); // a snail or pleco on the glass (a tree frog stays above it)
  if (sp.zone === 'bottom' || sp.habitat === 'land' || sp.kind === 'snail') return null; // rests on the ground or hardscape
  return Math.max(0, top - w * sp.aspect / 2);
}

/** Move one fish into its tank's water: onto a spot with enough water over the ground, then between ground and surface. */
export function fitFish(f: Fish, s: TankSetup) {
  const sp = speciesOf(f); if (!sp) return;
  const A = s.tank, top = waterY(A, s.water.level), w = fishTL(f, sp);
  if (f.surface === 'glass') { f.y = clamp(f.y, ...glassBand(s, A, sp, w, sp.habitat === 'land' ? groundHeight(s, A, f.x, f.depth) : 0)); return; }
  if (sp.kind === 'snail') return;
  const h = w * sp.aspect;
  if (sp.habitat === 'land') { // onto the nearest ground above the water; left where it is if the tank has no land
    if (groundHeight(s, A, f.x, f.depth) < top) { const p = nearestLand(s, A, top, f.x, f.depth); if (p) { f.x = p.x; f.depth = p.depth; } }
    return;
  }
  if (sp.habitat === 'both') {
    if (restsOnGround(s, A, sp, f.x, f.depth, h)) return; // on land or in the shallows
    f.y = clamp(f.y, groundHeight(s, A, f.x, f.depth) + h / 2, top - h / 2);
    return;
  }
  if (groundHeight(s, A, f.x, f.depth) + h > top) {
    const p = nearestWater(s, A, top, f.x, f.depth, h);
    if (p) { f.x = p.x; f.depth = p.depth; }
  }
  if (sp.zone === 'bottom') return;
  const lo = groundHeight(s, A, f.x, f.depth) + h / 2, hi = Math.max(0, top - h / 2);
  f.y = clamp(f.y, Math.min(lo, hi), hi);
}

/** Fit every fish into the water (after any scene change: level, tank size, layout, drags, new fish). */
export function keepInWater(s: TankSetup) {
  for (const f of s.fish) clampFish(f, s.tank, backdropDepth(s.backdrop, s.tank), s.render.bgSides); // inside the footprint, glass snails on the glass
  if (!s.water.on) return; // dry tank: fish are hidden, nothing to keep in
  for (const f of s.fish) fitFish(f, s);
}

// Where each fish was before a lower level pushed it (height as a share of the water, x, depth), and where the push
// left it: raising the level again starts from the first, not from the clamped spot (final check item 5). An entry
// counts only while the fish is still exactly where the push left it, so a drag in between wins.
const pushed = new Map<number, { r: number; x: number; depth: number; at: [number, number, number] }>();

/** Change the water level, moving swimmers (and glass snails) with it so a school keeps its shape. */
export function setWaterLevel(s: TankSetup, level: number) {
  const A = s.tank, was = Math.max(1, waterY(A, s.water.level)), top = waterY(A, level);
  s.water.level = level;
  for (const f of s.fish) {
    if (maxFishY(f, Infinity) == null) continue;
    const m = pushed.get(f.id), held = m && m.at[0] === f.x && m.at[1] === f.y && m.at[2] === f.depth;
    const r = held ? m.r : f.y / was;
    if (held) { f.x = m.x; f.depth = m.depth; }
    const x = f.x, depth = f.depth;
    f.y = r * top;
    if (s.water.on) fitFish(f, s);
    if (f.x !== x || f.depth !== depth || Math.abs(f.y - r * top) > 1e-6) pushed.set(f.id, { r, x, depth, at: [f.x, f.y, f.depth] });
    else pushed.delete(f.id);
  }
}
