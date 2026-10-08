// The ground: the substrate (four corner depths) plus, for the swamp layout, land masses rising above the water with
// pools cut into them. Pure functions of scene data, shared by the renderer (substrate mesh, layouts, fish) and the
// placement rules (fish stay in the water). Pool shapes are fractions of L and D, the land height a fraction of H, so
// Tank B gets the same arrangement at the same relative spots.
import { rng } from '../art/paint';
import { clamp, substrateHeight } from './physics';
import type { LayoutSettings, SubstrateSettings, Tank } from './types';

export interface Ground { substrate: SubstrateSettings; layout: LayoutSettings }

/** Land top in the swamp layout, as a fraction of interior height (the water is set below it when it is chosen). */
export const SWAMP_LAND = 0.62;
/** Water level the swamp layout starts with (fraction of full), well below the land. */
export const SWAMP_LEVEL = 0.42;

interface Pool { x: number; d: number; rx: number; rd: number }
interface Swamp { pools: Pool[]; waves: [number, number, number, number][] }

const swamps = new Map<number, Swamp>();
/** The swamp's pools and land undulation for a seed (fractions of L, D). */
function swamp(seed: number): Swamp {
  let s = swamps.get(seed);
  if (s) return s;
  const r = rng(seed * 2654435761 + 17);
  // one pool always opens onto the front glass, so the water (and the fish) can be seen; often a second one behind
  const pools: Pool[] = [{ x: 0.3 + r() * 0.4, d: r() * 0.15, rx: 0.2 + r() * 0.12, rd: 0.45 + r() * 0.2 }];
  if (r() < 0.6) {
    const left = pools[0].x > 0.5;
    pools.push({ x: left ? 0.12 + r() * 0.12 : 0.76 + r() * 0.12, d: 0.35 + r() * 0.4, rx: 0.1 + r() * 0.06, rd: 0.18 + r() * 0.1 });
  }
  const waves = Array.from({ length: 4 }, () => [(r() - 0.5) * 14, (r() - 0.5) * 14, r() * 6.28, 0.4 + r() * 0.6] as [number, number, number, number]);
  s = { pools, waves }; swamps.set(seed, s);
  return s;
}

/** Swamp land height (mm) at (x, depth): a rolling bank at ~SWAMP_LAND x H, falling to 0 inside the pools. */
export function swampLand(T: Tank, seed: number, x: number, depth: number): number {
  const { pools, waves } = swamp(seed), u = clamp(x / T.L, 0, 1), v = clamp(depth / T.D, 0, 1);
  let wet = 0; // 1 inside a pool's core, easing to 0 across its bank
  for (const p of pools) {
    const e = Math.hypot((u - p.x) / p.rx, (v - p.d) / p.rd), k = clamp((1 - e) / 0.35, 0, 1);
    wet = Math.max(wet, k * k * (3 - 2 * k));
  }
  let n = 0; for (const [a, b, ph, amp] of waves) n += amp * Math.sin(a * u + b * v + ph);
  const top = T.H * (SWAMP_LAND + 0.05 * n / waves.length) - 0.06 * T.H * (1 - v); // a little lower toward the front
  return Math.max(0, top) * (1 - wet);
}

/** Ground height (mm above the tank floor) at (x, depth): substrate, or swamp land where it is higher. */
export function groundHeight(g: Ground, T: Tank, x: number, depth: number): number {
  const base = substrateHeight(g.substrate, T, x, depth);
  return g.layout.id === 'swamp' ? Math.max(base, swampLand(T, g.layout.seed, x, depth)) : base;
}

/**
 * The nearest spot (x, depth) to the given one where at least `need` mm of water stands over the ground, sampled on a
 * grid. If no spot has that much (a fish taller than the deepest water), the deepest spot; null only if the water is
 * below all the land.
 */
export function nearestWater(g: Ground, T: Tank, top: number, x: number, depth: number, need: number) {
  const N = 40;
  type Spot = { x: number; depth: number };
  let best: Spot | null = null, bd = Infinity, deep: Spot | null = null, dw = 0;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const px = T.L * (0.02 + 0.96 * i / N), pd = T.D * (0.02 + 0.96 * j / N);
    const water = top - groundHeight(g, T, px, pd);
    if (water > dw) { dw = water; deep = { x: px, depth: pd }; }
    if (water < need) continue;
    const dd = (px - x) ** 2 + (pd - depth) ** 2;
    if (dd < bd) { bd = dd; best = { x: px, depth: pd }; }
  }
  return best ?? deep;
}
