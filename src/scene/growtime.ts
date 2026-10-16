// The tank's growth timeline (lane GR3, 2026-10-15). No calendar units (growth depends on light, CO2 and ferts): Time
// runs 0 = as planted .. 1 = everything overgrown in a low-tech tank, each species grows at its speed (slow / medium /
// fast, PLANT3D[].grow.speed) and the tank's feeding scales that. Moving Time writes each plant's growth (so the
// renderer's cheap reveal path draws it) and keeps the growth it had at Time 0 in `planted`, so Time runs both ways.
// A move is a preview (2026-10-15, Nathan): beginGrow sets Time 0 to the tank as it is ('rel') or to every plant just
// planted ('abs'), and endGrow keeps where it ended (the panel asks; undone = the store rolls back).
import { PLANT3D, growthOf, type PlantType } from '../art/plants';
import type { GrowFeed, GrowMode, Item, TankSetup } from './types';

type Speed = 'slow' | 'medium' | 'fast';

/** Growth per unit of Time. A slow plant in a low-tech tank takes all of Time from planted to overgrown; feeding helps
 *  fast growers most (CO2 is what stem plants wait for; an anubias hardly notices). */
export const GROW_RATE: Record<GrowFeed, Record<Speed, number>> = {
  low: { slow: 1, medium: 1.5, fast: 2 },
  ferts: { slow: 1.25, medium: 2, fast: 3 },
  co2: { slow: 1.5, medium: 3, fast: 5 },
};
export const GROW_RATE_MAX = 5;

export const FEED_NAMES: Record<GrowFeed, string> = { low: 'Low-tech', ferts: 'Ferts', co2: 'CO2 + ferts' };

export const speedOf = (type: string): Speed => PLANT3D[type as PlantType]?.grow?.speed ?? 'medium';
export const growRate = (type: string, feed: GrowFeed) => GROW_RATE[feed][speedOf(type)];

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A plant's growth now (no planted growth stored: what it shows). */
export const growthNow = (it: Item) => it.growth ?? growthOf(it.variant as PlantType, it.size);

/** The growth a plant planted at `planted` has at Time `t`. */
export const grownAt = (planted: number, t: number, rate: number) => r3(clamp01(planted + t * rate));

/** The growth a plant had at Time 0, given what it shows at Time `t` (a plant that never had one is planted now). */
export function plantedOf(it: Item, t: number, feed: GrowFeed) {
  if (it.planted != null) return it.planted;
  return r3(growthNow(it) - t * growRate(it.variant, feed));
}

/** The plants whose growth changes when Time goes to `t` (or the feeding to `feed`), and to what. */
export function timeChanges(s: TankSetup, t: number, feed: GrowFeed = s.grow.feed) {
  const out: { id: number; planted: number; growth: number; first: boolean }[] = [];
  for (const it of s.items) {
    if (it.kind !== 'plant') continue;
    const planted = plantedOf(it, s.grow.time, s.grow.feed), growth = grownAt(planted, t, growRate(it.variant, feed));
    if (it.growth == null && growth === r3(growthNow(it))) continue; // unchanged: a starter plant keeps drawing as it did
    if (growth !== it.growth || planted !== it.planted) out.push({ id: it.id, planted, growth, first: it.growth == null });
  }
  return out;
}

/** Move the tank's Time to `t` (and its feeding to `feed`): every plant grows from its planted growth. `only` limits
 *  it to those ids (the rest wait for a later call: a plant's first growth builds its extras once, so a dense tank
 *  spreads those over frames). Returns the ids still waiting. */
export function setGrowTime(s: TankSetup, t: number, feed: GrowFeed = s.grow.feed, only?: (c: { id: number; first: boolean }) => boolean) {
  t = r3(clamp01(t));
  const changes = timeChanges(s, t, feed), byId = new Map(s.items.map(it => [it.id, it]));
  const waiting: number[] = [];
  for (const c of changes) {
    if (only && !only(c)) { waiting.push(c.id); continue; }
    const it = byId.get(c.id)!;
    it.growth = c.growth; it.planted = c.planted;
  }
  if (!waiting.length) {
    s.grow.time = t; s.grow.feed = feed;
    // back at Time 0 a plant shows its planted growth: nothing more to keep (one put in later keeps its place in Time)
    // (a starter plant that had no growth of its own goes back to none, so it draws exactly as it did)
    if (t === 0) for (const it of s.items) if (it.planted != null && it.planted >= 0) {
      delete it.planted;
      if (it.growth === r3(growthOf(it.variant as PlantType, it.size))) delete it.growth;
    }
  }
  return waiting;
}

/** Start a Time preview: Time 0 = the tank as it is now ('rel') or every plant just planted ('abs'). */
export function beginGrow(s: TankSetup, mode: GrowMode = s.grow.mode) {
  s.grow.mode = mode; s.grow.time = 0;
  for (const it of s.items) if (it.kind === 'plant') { if (mode === 'abs') it.planted = 0; else delete it.planted; }
}

/** Keep a Time preview: each plant keeps the growth it shows. Time stays as the tank's age from planting ('abs'), or
 *  goes back to 0 ('rel': the tank as it is now is where the next move starts). */
export function endGrow(s: TankSetup) {
  // (a preview's daughters stop being previews: real plants, still with their `parent`; scene/propagate.ts)
  for (const it of s.items) if (it.kind === 'plant') { delete it.planted; delete it.brood; }
  if (s.grow.mode === 'rel') s.grow.time = 0;
}

/** A plant's own Growth slider: it shows `g` now (no preview to keep its place in). */
export function setPlantGrowth(it: Item, g: number, _s?: TankSetup) {
  it.growth = r3(clamp01(g));
  delete it.planted;
}
