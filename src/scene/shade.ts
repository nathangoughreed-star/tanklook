// Scape shading for the Light map (lane PG step 2, 2026-10-16): "Account for the aquascape". Off = the fixture's own
// numbers, as before. On, every plant and hardscape piece is a vertical shadow column under the lamp (a disc: centre,
// radius, how much light it passes, and the height it reaches): floaters shade the whole water column below them, a
// plant canopy shades what is under its top, a stone, wood or cave casts a near-black shadow. A column model, not ray
// tracing: the lamp is taken as overhead (the real shadow of a rock leans away from the lamp), but it is cheap enough
// for the shader (render/lighting.ts aqShade is a port of shadeAt) and the hover. The numbers are estimates, in one place.
import { isCarpet, isFloat } from '../art/plants';
import { itemDims } from './items';
import { clamp } from './physics';
import { groundHeight, type Ground } from './terrain';
import type { Item, Tank } from './types';

/** x, z (z = -depth), radius (mm), light passed (0-1) at full cover, and the top (mm): points below it are shaded. */
export type Shade = [number, number, number, number, number];
export const SHADE_MAX = 32 // the shader's array size;

/** Light a dense, full mat of each floater passes (1 = none lost). Estimates from the look of the mats: hobbyist reports
 *  put a full surface of salvinia / water lettuce / frogbit at 5-20 % of the light reaching the plants below (flag). */
export const FLOAT_T: Record<string, number> = { salvinia: 0.1, lettuce: 0.15, frogbit: 0.2, redroot: 0.12 };
export const CANOPY_T = 0.5; // a leafy plant's canopy
export const STONE_T = 0.04; // rock, wood, caves: opaque

const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** The shadow columns of a setup's items, the biggest first, at most SHADE_MAX. */
export function shadesOf(S: Ground & { tank: Tank; items?: Item[] }, ys: number): Shade[] {
  const out: { s: Shade; a: number }[] = [];
  for (const it of S.items ?? []) {
    if (it.kind === 'coral') continue;
    const [w, h, d] = itemDims(it), base = groundHeight(S, S.tank, it.x, it.depth) + it.lift;
    let r: number, t: number, top: number;
    if (it.kind === 'plant') {
      if (isFloat(it.variant)) {
        r = w / 2; top = Number.isFinite(ys) ? ys : base + h;
        t = 1 - Math.min(1, 0.6 * (it.dens ?? 1)) * (1 - (FLOAT_T[it.variant] ?? 0.15)); // cover 0.6 at the species' own density
      } else if (isCarpet(it.variant) || h < 40) continue;
      else { r = w * 0.3; t = CANOPY_T; top = base + h; }
    } else { r = Math.max(w, d) * 0.35; t = STONE_T; top = base + h; }
    if (r >= 8) out.push({ s: [it.x, -it.depth, r, Math.round(t * 1000) / 1000, Math.round(top)], a: r * r * (1 - t) });
  }
  return out.sort((p, q) => q.a - p.a).slice(0, SHADE_MAX).map(o => o.s);
}

/** The share of direct light left at p after the columns above it (the shader's aqShade is this). */
export function shadeAt(list: readonly Shade[], px: number, py: number, pz: number): number {
  let f = 1;
  for (const [x, z, r, t, top] of list) {
    if (py >= top) continue;
    f *= 1 - (1 - t) * (1 - smooth(r * 0.6, r, Math.hypot(px - x, pz - z)));
  }
  return f;
}
