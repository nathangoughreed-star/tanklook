// Keeps animals where they live: swimmers between the ground and the surface, bottom dwellers on submerged ground,
// glass snails below the water line, land animals on ground above it; amphibious ('both') animals swim where the water is
// deep enough for them and rest on the ground elsewhere. Floor snails may sit anywhere, emerged land included.
import { fishTL, getSpecies, type Species } from '../data/species';
import { clamp, clampFish, waterY } from './physics';
import { groundHeight, nearestLand, nearestWater } from './terrain';
import type { Fish, Tank, TankSetup } from './types';

/** Does this (non-snail) animal rest on the ground at (x, depth) in tank T, rather than swim? h = its card height. */
export function restsOnGround(s: TankSetup, T: Tank, sp: Species, x: number, depth: number, h: number): boolean {
  if (sp.zone === 'bottom' || sp.habitat === 'land') return true;
  if (sp.habitat !== 'both') return false;
  return !s.water.on || waterY(T, s.water.level) - groundHeight(s, T, x, depth) < h;
}

/** Highest centre height (mm) for this animal at water surface `top`; null = its height is not free. */
export function maxFishY(f: Fish, top: number): number | null {
  const sp = getSpecies(f.species); if (!sp) return null;
  if (sp.zone === 'bottom' || sp.habitat === 'land') return null; // rests on the ground
  const w = fishTL(f, sp);
  if (sp.kind === 'snail') return (f.surface ?? 'floor') === 'floor' ? null : Math.max(0, top - w / 2);
  return Math.max(0, top - w * sp.aspect / 2);
}

/** Move one fish into its tank's water: onto a spot with enough water over the ground, then between ground and surface. */
export function fitFish(f: Fish, s: TankSetup) {
  const sp = getSpecies(f.species); if (!sp) return;
  const A = s.tank, top = waterY(A, s.water.level), w = fishTL(f, sp);
  if (sp.kind === 'snail') {
    if ((f.surface ?? 'floor') !== 'floor') f.y = clamp(f.y, 0, Math.max(0, top - w / 2));
    return;
  }
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
  for (const f of s.fish) clampFish(f, s.tank); // inside the footprint, glass snails on the glass
  if (!s.water.on) return; // dry tank: fish are hidden, nothing to keep in
  for (const f of s.fish) fitFish(f, s);
}

/** Change the water level, moving swimmers (and glass snails) with it so a school keeps its shape. */
export function setWaterLevel(s: TankSetup, level: number) {
  const A = s.tank, k = waterY(A, level) / Math.max(1, waterY(A, s.water.level));
  for (const f of s.fish) if (maxFishY(f, Infinity) != null) f.y *= k;
  s.water.level = level;
}
