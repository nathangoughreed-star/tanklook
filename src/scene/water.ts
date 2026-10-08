// Keeps animals in the water: swimmers between the ground and the surface, bottom dwellers on submerged ground,
// glass snails below the water line. Floor snails may sit anywhere, emerged land included (Nathan, 2026-10-08).
import { fishTL, getSpecies } from '../data/species';
import { clamp, waterY } from './physics';
import { groundHeight, nearestWater } from './terrain';
import type { Fish, Scene } from './types';

/** Highest centre height (mm, Tank A) for this animal at water surface `top`; null = its height is not free. */
export function maxFishY(f: Fish, top: number): number | null {
  const sp = getSpecies(f.species); if (!sp) return null;
  if (sp.zone === 'bottom') return null;             // rests on the substrate
  const w = fishTL(f, sp);
  if (sp.kind === 'snail') return (f.surface ?? 'floor') === 'floor' ? null : Math.max(0, top - w / 2);
  return Math.max(0, top - w * sp.aspect / 2);
}

/** Move one fish into Tank A's water: onto a spot with enough water over the ground, then between ground and surface. */
export function fitFish(f: Fish, s: Scene) {
  const sp = getSpecies(f.species); if (!sp) return;
  const A = s.tankA, top = waterY(A, s.water.level), w = fishTL(f, sp);
  if (sp.kind === 'snail') {
    if ((f.surface ?? 'floor') !== 'floor') f.y = clamp(f.y, 0, Math.max(0, top - w / 2));
    return;
  }
  const h = w * sp.aspect;
  if (groundHeight(s, A, f.x, f.depth) + h > top) {
    const p = nearestWater(s, A, top, f.x, f.depth, h);
    if (p) { f.x = p.x; f.depth = p.depth; }
  }
  if (sp.zone === 'bottom') return;
  const lo = groundHeight(s, A, f.x, f.depth) + h / 2, hi = Math.max(0, top - h / 2);
  f.y = clamp(f.y, Math.min(lo, hi), hi);
}

/** Fit every fish into the water (after any scene change: level, tank size, layout, drags, new fish). */
export function keepInWater(s: Scene) {
  for (const f of s.fish) fitFish(f, s);
}

/** Change the water level, moving swimmers (and glass snails) with it so a school keeps its shape. */
export function setWaterLevel(s: Scene, level: number) {
  const A = s.tankA, k = waterY(A, level) / Math.max(1, waterY(A, s.water.level));
  for (const f of s.fish) if (maxFishY(f, Infinity) != null) f.y *= k;
  s.water.level = level;
}
