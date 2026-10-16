// Plants that make more plants as Time runs (lane PR, 2026-10-16; design and Nathan's decisions in
// research/plant-propagation.md). Daughters are DERIVED from the parents, never stored while previewing: the n-th daughter
// of a plant always lands in the same direction and distance (seeded from its parent's seed) and is born at a fixed Time,
// so scrubbing Time either way gives the same tank. A preview puts them in `s.items` marked `brood` (drawn by the normal
// plant path and its GPU reveal, one built mesh per species and seed pool, born at growth 0); keeping drops the mark and
// they are real plants with a `parent`; undoing rolls the store back, moving Time back removes them.
import { BREED, type Breed, type PlantType, isFloat } from '../art/plants';
import { growRate, growthNow, plantedOf } from './growtime';
import { itemDims, makeItem, nextItemId, MAX_ITEMS } from './items';
import { inside } from './shape';
import type { GrowFeed, Item, Tank, TankSetup } from './types';

/** The most plants in a tank: past it a plant gets denser and taller instead of spawning. */
export const MAX_PLANTS = 250;
/** How much of the water line floaters may cover before they stop multiplying. */
export const FLOAT_COVER = 0.9;
/** Seeds a variant's daughters are drawn from (a small pool: one built mesh per seed, shared by every daughter). */
const POOL = 3, POOL_SEED = 7000;

const r3 = (v: number) => Math.round(v * 1000) / 1000;
/** A stable number in [0, 1) from (seed, n, k). */
function h01(seed: number, n: number, k: number) {
  let a = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(n + 1, 0x85ebca6b) ^ Math.imul(k + 7, 0xc2b2ae35)) >>> 0;
  a = Math.imul(a ^ (a >>> 15), 0x2c1b3c6d); a = Math.imul(a ^ (a >>> 12), 0x297a2d39); a ^= a >>> 15;
  return (a >>> 0) / 4294967296;
}

/** A daughter before it is an Item: where, what and when (Time) it is born. */
export interface Daughter {
  /** Which one of its parent's (0, 1, 2 ...). */
  n: number;
  /** Time it is born at (growth 0). */
  born: number;
  variant: string; seed: number; size: number;
  x: number; depth: number; lift: number; yaw: number;
  spread?: number; dens?: number;
}

/** How fast it breeds in this tank's feeding, over low-tech (the same factor that speeds its growth). */
const feedK = (type: string, feed: GrowFeed) => growRate(type, feed) / growRate(type, 'low');

/** The Time the parent's `n`-th daughter is born at (the parent mature from `planted`, breeding at its rate); stable per (seed, n). */
export function bornAt(variant: string, sd: number, planted: number, feed: GrowFeed, n: number, b: Breed): number {
  const rate = growRate(variant, feed), mature = b.from ?? 0.3;
  const t0 = planted >= mature ? 0 : (mature - planted) / rate;
  return r3(t0 + (n + 0.4 + 0.6 * h01(sd, n, 1)) / (b.rate * feedK(variant, feed)));
}

const D2R = Math.PI / 180;
/** (x, depth) in a hardscape piece's footprint (its box, shrunk by `k`: 1 = the whole piece). */
function onPiece(p: Item, x: number, d: number, k: number) {
  const c = Math.cos(p.yaw * D2R), s = Math.sin(p.yaw * D2R), dx = x - p.x, dz = p.depth - d;
  const [l, , w] = itemDims(p);
  return Math.abs(dx * c - dz * s) < l / 2 * k && Math.abs(dx * s + dz * c) < w / 2 * k;
}
const solid = (it: Item) => it.kind === 'stone' || it.kind === 'wood' || it.kind === 'cave';

/** The hardscape piece a plant stands on (it is lifted onto it, or its base is within it), if any. */
function hostOf(solids: Item[], it: Item) {
  if (it.lift <= 0) return null;
  return solids.find(p => onPiece(p, it.x, it.depth, 1.05)) ?? null;
}

/** Tank state a daughter's placement reads (hardscape is fixed during a Time move). */
export interface Context { T: Tank; solids: Item[]; water: boolean }
export const contextOf = (s: TankSetup): Context => ({ T: s.tank, solids: s.items.filter(solid), water: s.water.on });

/**
 * The daughters `it` has made by Time `t` (`planted` = its growth at Time 0; pure and deterministic in (it.seed, t, feed, tank)).
 * Up to the breed's cap; those that would land outside the tank, on a rock or piece of wood (a rhizome plant stays on its own),
 * or on the glass are skipped (their number is used up, so the rest do not move). `salt` mixes into the draws: a plant's
 * count of kept daughters (a later preview then goes in new directions), or a daughter's own key.
 */
export function daughtersAt(it: Item, t: number, feed: GrowFeed, tank: Tank | Context, planted = it.planted ?? growthNow(it), salt = 0): Daughter[] {
  const b = BREED[it.variant as PlantType];
  if (it.kind !== 'plant' || !b || b.mode === 'mat') return [];
  const ctx: Context = 'solids' in tank ? tank : { T: tank, solids: [], water: true };
  if (b.mode === 'float' && !ctx.water) return [];
  const out: Daughter[] = [], cap = b.cap ?? 10;
  const host = b.mode === 'rhizome' ? hostOf(ctx.solids, it) : null;
  for (let n = 0; n < cap; n++) {
    const sd = it.seed + salt;
    const born = bornAt(it.variant, sd, planted, feed, n, b);
    if (born > t) break;
    const base = b.mode === 'float' ? Math.max(40, it.spread ?? it.size) : 1;
    for (let k = 0; k < 8; k++) {
      const a = 2 * Math.PI * h01(sd, n, 10 + k), u = h01(sd, n, 30 + k);
      const dist = (b.hop[0] + (b.hop[1] - b.hop[0]) * (k ? Math.sqrt(u) : u)) * base;
      const x = it.x + Math.cos(a) * dist, depth = it.depth + Math.sin(a) * dist;
      const reach = b.mode === 'float' ? 6 : 12;
      if (!inside(ctx.T, x, depth, reach)) continue;
      if (b.mode === 'float') { /* the water line is free of rock */ } else if (host) { if (!onPiece(host, x, depth, 0.85)) continue; }
      else if (ctx.solids.some(p => onPiece(p, x, depth, 0.9))) continue;
      const seed = POOL_SEED + (it.seed + n) % POOL;
      const d: Daughter = {
        n, born, variant: it.variant, seed, size: it.size, x: r3(x), depth: r3(depth), lift: host ? it.lift : 0,
        yaw: Math.round(h01(sd, n, 50) * 360 - 180),
      };
      if (b.mode === 'float') { d.spread = Math.round(Math.max(60, (it.spread ?? it.size) * 0.5)); if (it.dens != null) d.dens = it.dens; }
      out.push(d);
      break;
    }
  }
  return out;
}

/** One planned daughter in a whole-tank pass: its key, its parent's key (a real plant's id as text) and what it is. */
export interface Plan { key: string; parent: string; d: Daughter; planted: number }

/**
 * Every daughter born by Time `t` in a tank, grandchildren too, in birth order, up to the plant cap (the earliest are
 * kept, so the set only ever grows with Time) and the floaters' share of the water line. `s.items` may hold preview
 * daughters (`brood`): they are ignored here and replaced by what this derives.
 */
export function planBroods(s: TankSetup, t: number, feed: GrowFeed = s.grow.feed): Plan[] {
  const ctx = contextOf(s), real = s.items.filter(it => it.brood == null);
  const plants = real.filter(it => it.kind === 'plant');
  const room = Math.max(0, Math.min(MAX_PLANTS - plants.length, MAX_ITEMS - real.length));
  const surface = ctx.T.L * ctx.T.D * FLOAT_COVER;
  let cover = plants.reduce((a, it) => a + (isFloat(it.variant) ? floatArea(it) : 0), 0);
  const have = new Map<number, number>(), hash = (k: string) => [...k].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0, 7);
  for (const it of real) if (it.parent != null) have.set(it.parent, (have.get(it.parent) ?? 0) + 1);
  // a breeder: a plant (real or already planned) and the daughters it has had so far
  interface Br { key: string; it: Item; planted: number; got: Daughter[]; next: number; at: number }
  const brs: Br[] = [];
  const add = (key: string, it: Item, planted: number, salt: number) => {
    const b = BREED[it.variant as PlantType];
    if (!b || b.mode === 'mat') return;
    const got = daughtersAt(it, t, feed, ctx, planted, salt);
    brs.push({ key, it, planted, got, next: 0, at: 0 });
  };
  for (const it of plants) add(String(it.id), it, plantedOf(it, s.grow.time, s.grow.feed), (have.get(it.id) ?? 0) * 101);
  const out: Plan[] = [];
  // events in birth order across all breeders (ties: the earlier key), so the cap and the cover keep the earliest births
  for (;;) {
    let pick: Br | null = null;
    for (const b of brs) {
      if (b.next >= b.got.length) continue;
      if (!pick || b.got[b.next].born < pick.got[pick.next].born) pick = b;
    }
    if (!pick || out.length >= room) break;
    const d = pick.got[pick.next++];
    if (isFloat(d.variant)) {
      const a = floatArea({ variant: d.variant, size: d.size, spread: d.spread } as Item);
      if (cover + a > surface) continue;
      cover += a;
    }
    const key = `${pick.key}/${d.n}`, rate = growRate(d.variant, feed), planted = r3(-d.born * rate);
    out.push({ key, parent: pick.key, d, planted });
    // a daughter breeds in its turn (its own daughters are born from its growth from its birth)
    const kid: Item = { id: -1, kind: 'plant', variant: d.variant, seed: d.seed, x: d.x, depth: d.depth, lift: d.lift, yaw: d.yaw, pitch: 0, tilt: 0, size: d.size,
      ...(d.spread ? { spread: d.spread } : {}), ...(d.dens ? { dens: d.dens } : {}) };
    add(key, kid, planted, hash(key));
  }
  return out;
}
const floatArea = (it: Pick<Item, 'variant' | 'size' | 'spread'>) => Math.PI * ((it.spread ?? it.size) / 2) ** 2;

/**
 * Make `s.items` hold the preview daughters for Time `t` (call before the plants' growth is written for that Time): add the
 * new, remove those no longer born, keep the rest. A daughter is an Item at growth 0 with a negative `planted`
 * (-born * rate) so the Time machinery grows it from its birth. Returns whether anything was added or removed.
 */
export function syncBroods(s: TankSetup, t: number, feed: GrowFeed = s.grow.feed): boolean {
  const plan = planBroods(s, t, feed), want = new Map(plan.map(p => [p.key, p]));
  const had = new Map<string, Item>();
  for (const it of s.items) if (it.brood != null) had.set(it.brood, it);
  let changed = false;
  const keep = s.items.filter(it => it.brood == null || want.has(it.brood));
  if (keep.length !== s.items.length) { s.items = keep; changed = true; }
  const idOf = new Map<string, number>();
  for (const it of s.items) idOf.set(it.brood ?? String(it.id), it.id);
  for (const p of plan) {
    let it = had.get(p.key);
    const { d } = p;
    if (!it) {
      it = makeItem(s.tank, d.variant, nextItemId(s), d.seed, d.x, d.depth, {
        lift: d.lift, yaw: d.yaw, size: d.size, growth: 0, planted: p.planted,
        ...(d.spread ? { spread: d.spread } : {}), ...(d.dens ? { dens: d.dens } : {}),
      }, s);
      s.items.push(it); changed = true;
    } else if (it.planted !== p.planted) it.planted = p.planted; // (feeding changed: born at another Time)
    it.brood = p.key; it.parent = idOf.get(p.parent);
    idOf.set(p.key, it.id);
  }
  return changed;
}
