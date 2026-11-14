// Lane P3 (UI2 §7 P3): the aquascape item edits moved out of ui/panels.ts. Plain functions on a TankSetup / Item, no DOM,
// no store: the caller passes the fresh id and seed, and does its own selection, status text and undo grouping.
import { rng } from '../art/paint';
import { isFloat, isPatch } from '../art/plants';
import { EPIPHYTES, LIBRARY, clampItem, itemDims, makeItem, perch } from './items';
import { setPlantGrowth } from './growtime';
import { groundHeight } from './terrain';
import type { Item, ItemKind, TankSetup } from './types';
import type { PlaceAt } from '../interact/pointer';

export type ScapeSec = 'hardscape' | 'plants';
/** Which menu a piece lives under: plants, corals and artificial plants under Plants, the rest under Hardscape. */
export const scapeSec = (k: ItemKind): ScapeSec => k === 'plant' || k === 'coral' || k === 'artificial' ? 'plants' : 'hardscape';

/** Add a piece at an open spot (the candidate farthest from every other piece, front-middle preferred). The caller draws
 *  `id` and `seed`, so every tank being edited gets the same piece. */
export function addItem(s: TankSetup, variant: string, id: number, seed: number): Item {
  const r = rng(seed), T = s.tank;
  const it = makeItem(T, variant, id, seed, T.L / 2, T.D / 2, { yaw: LIBRARY[variant].kind === 'plant' ? 0 : Math.round((r() - 0.5) * 60) }, s);
  let best = -1;
  for (let k = 0; k < 16; k++) {
    const x = T.L * (0.15 + r() * 0.7), d = T.D * (0.2 + r() * 0.6);
    const gap = Math.min(...s.items.filter(q => q.kind !== 'plant' || !isPatch(q.variant)).map(q => Math.hypot(q.x - x, q.depth - d)), 1e6) - Math.abs(x - T.L / 2) * 0.15;
    if (gap > best) { best = gap; it.x = x; it.depth = d; }
  }
  // a fern, anubias, buce or moss goes on the stone or wood nearest that open spot (on the floor if there is none)
  const at = EPIPHYTES.has(variant) ? perch(s, it.x, it.depth, r) : null;
  if (at) Object.assign(it, at);
  clampItem(it, T, s); s.items.push(it);
  return it;
}
/** The starting yaw of a piece dragged out of the library (plants stand straight; the rest turn up to 30 degrees either way). */
export const dragYaw = (variant: string, rand: () => number) => LIBRARY[variant].kind === 'plant' ? 0 : Math.round((rand() - 0.5) * 60);
/** A piece dragged into the tank appears under the pointer, resting on the ground or on the piece under it. */
export function placeAt(s: TankSetup, variant: string, id: number, seed: number, at: PlaceAt, yaw: number): void {
  const it = makeItem(s.tank, variant, id, seed, at.x, at.depth, { yaw }, s); it.lift = at.lift; clampItem(it, s.tank, s); s.items.push(it);
}
/** ...and follows the pointer there. */
export function moveTo(s: TankSetup, id: number, at: PlaceAt): void {
  const it = s.items.find(q => q.id === id); if (!it) return;
  it.x = at.x; it.depth = at.depth; it.lift = at.lift; clampItem(it, s.tank, s);
}
/** Apply `fn` to item `id` then clamp it into the tank (the old editItem body). */
export function editItem(s: TankSetup, id: number, fn: (it: Item, s: TankSetup) => void): void {
  const it = s.items.find(q => q.id === id); if (it) { fn(it, s); clampItem(it, s.tank, s); }
}
/** A floater's spread is the patch fully grown: one not grown yet is shown fully grown once it has one. */
export const fullFloat = (it: Item, s: TankSetup) => { if (isFloat(it.variant) && it.growth == null) setPlantGrowth(it, 1, s); };

/** Slider / box edits of one piece, by the id of the control that sets them (value as the control reads it). */
export const ITEM_FIELDS: Record<string, (it: Item, v: number, s: TankSetup) => void> = {
  iSize: (it, v) => { it.size = v; },
  iGrowth: (it, v, s) => setPlantGrowth(it, v / 100, s),
  iSpread: (it, v, s) => { it.spread = v; fullFloat(it, s); },
  iDens: (it, v, s) => { it.dens = v / 100; fullFloat(it, s); },
  iStems: (it, v) => { it.stems = v; },
  iYaw: (it, v) => { it.yaw = v; },
  iPitch: (it, v) => { it.pitch = v; },
  iTilt: (it, v) => { it.tilt = v; },
  iX: (it, v) => { it.x = v; },
  iDepth: (it, v) => { it.depth = v; },
  iLift: (it, v) => { it.lift = v; },
};
/** Reshape (a new random look) and drop to the ground. */
export const reshape = (it: Item, seed: number) => { it.seed = seed; };
export const dropToGround = (it: Item) => { it.lift = 0; };
/** Free placement: step the piece along x, height (y) or depth; pieces may pass through each other, and a sideways step
 *  keeps its height in the tank (not above the ground, which may slope under it). */
export function nudge(it: Item, s: TankSetup, axis: string, dir: number, step: number): void {
  if (axis === 'y') { it.lift += dir * step; return; }
  const y = groundHeight(s, s.tank, it.x, it.depth) + it.lift;
  if (axis === 'x') it.x += dir * step; else it.depth += dir * step;
  clampItem(it, s.tank, s);
  it.lift = y - groundHeight(s, s.tank, it.x, it.depth);
}
export const removeItem = (s: TankSetup, id: number) => { s.items = s.items.filter(q => q.id !== id); };
/** A copy beside the original, turned 25 degrees, under the fresh id. Returns it (null when the source is gone). */
export function duplicateItem(s: TankSetup, src: number, id: number): Item | null {
  const it = s.items.find(q => q.id === src); if (!it) return null;
  const n: Item = { ...it, id, x: it.x + Math.max(20, itemDims(it)[0] * 0.8), yaw: it.yaw + 25 };
  clampItem(n, s.tank, s); s.items.push(n);
  return n;
}
/** Remove all: that menu's pieces only. */
export const clearSection = (s: TankSetup, sec: ScapeSec) => { s.items = s.items.filter(q => scapeSec(q.kind) !== sec); };
