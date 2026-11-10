// Discovery v2, lane AB5 (Combine): take ONE tab of a donor design into a target design. This file holds the PURE parts: the splice and the ladder of small repairs.
// The validation (lock confinement, verdict and Explore gates, equipPlan, facts) is the generator's own road: `combine` in pairGen.ts runs every attempt through it, so a combined
// design is judged exactly like any other candidate. Nothing here writes a project or a record; a repair only ever touches the tab that was combined (never the rest of the target).
import { confine } from './discover';
import { TABS, diffTouches, type Tab } from './scope';
import { layerOf } from './items';
import { ensureUids } from './uid';
import { struggleOf } from './lightcheck';
import { wattsOf, lightOutCached } from './lightout';
import { parWanted } from '../demand/needs';
import type { Fish, TankSetup } from './types';

export const COMBINE_TABS: readonly Tab[] = TABS;

/** `target` with the donor's `tab` put in, ids renumbered and uids stable; null when the pieces cannot be placed (a piece outside the tank). Never mutates its inputs. */
export function splice(target: TankSetup, donor: TankSetup, tab: Tab): TankSetup | null {
  const t = structuredClone(target);
  if (tab === 'tank') {
    // the contents keep their place in proportion when the room changes shape (a piece never ends up outside the new tank)
    const kx = donor.tank.L / target.tank.L, kz = donor.tank.D / target.tank.D, top = donor.tank.H * 0.9;
    for (const o of [...t.items, ...t.fish] as { x: number; depth: number; y?: number }[]) { o.x *= kx; o.depth *= kz; if (typeof o.y === 'number') o.y = Math.min(o.y, top); }
  }
  const d = structuredClone(donor);
  if (tab !== 'tank' && (donor.tank.L !== target.tank.L || donor.tank.D !== target.tank.D)) {
    // the donor's pieces keep their place in proportion in a tank of another size
    const kx = target.tank.L / donor.tank.L, kz = target.tank.D / donor.tank.D;
    for (const o of [...d.items, ...d.fish] as { x: number; depth: number }[]) { o.x *= kx; o.depth *= kz; }
  }
  const c = confine(t, d, [tab]); if (!c) return null;
  // gear and the rest of the target's own state (light, tech, layout ...) stay the target's; only the combined tab comes from the donor
  for (const k of diffTouches(t, c).support) { const v = (t as unknown as Record<string, unknown>)[k]; if (v === undefined) delete (c as unknown as Record<string, unknown>)[k]; else (c as unknown as Record<string, unknown>)[k] = structuredClone(v); }
  return ensureUids(c);
}

/** One step down the ladder of animal trims: each species to `keep` of its count (at least one, except species the user fixed), then whole species, most numerous first. */
export function trimAnimals(S: TankSetup, step: number, fixed: ReadonlySet<string>): { scene: TankSetup; said: string } | null {
  const by = new Map<string, Fish[]>(); for (const f of S.fish) (by.get(f.species) ?? by.set(f.species, []).get(f.species)!).push(f);
  const out = structuredClone(S), ladder = [0.75, 0.5, 0.35, 0.25, 0.15];
  if (step < ladder.length) {
    const drop = new Set<string>();
    for (const [sp, fs] of by) { if (fixed.has(sp)) continue; const keep = Math.max(1, Math.round(fs.length * ladder[step])); for (const f of fs.slice(keep)) drop.add(f.uid ?? `id:${f.id}`); }
    if (!drop.size) return null;
    out.fish = out.fish.filter(f => !drop.has(f.uid ?? `id:${f.id}`));
    return { scene: ensureUids(out), said: `fewer animals (${S.fish.length} to ${out.fish.length})` };
  }
  const species = [...by].filter(([sp]) => !fixed.has(sp)).sort((a, b) => b[1].length - a[1].length), n = step - ladder.length;
  if (n >= species.length || species.length < 2) return null;
  const gone = species[n][0]; out.fish = out.fish.filter(f => f.species !== gone);
  return { scene: ensureUids(out), said: `without the ${gone}` };
}

/** Plants that will struggle in this design's light, as uids (a plant the light cannot carry is left out rather than shown struggling). */
export function strugglingPlants(S: TankSetup, min = 0.6): string[] {
  try { return S.items.filter(i => layerOf(i) === 'plant' && i.uid && struggleOf(S as never, i) >= min).map(i => i.uid!); } catch { return []; }
}
export function dropPlants(S: TankSetup, uids: ReadonlySet<string>): { scene: TankSetup; said: string } | null {
  const out = structuredClone(S), was = out.items.length; out.items = out.items.filter(i => !(i.uid && uids.has(i.uid)));
  const ids = new Set(out.items.map(i => i.id)); for (const i of out.items) if (i.parent != null && !ids.has(i.parent)) delete i.parent;
  return out.items.length === was ? null : { scene: ensureUids(out), said: `${was - out.items.length} plant${was - out.items.length > 1 ? 's' : ''} left out that the light cannot carry` };
}

/** The combined plants want more light than the design's own (not owned, not required) light gives: the smallest stronger light that carries them. It is a purchase the design's gear then prices. null = nothing to do or nothing sensible to do. */
export function strongerLight(S: TankSetup): { scene: TankSetup; said: string } | null {
  if (!S.water.on || S.light.owned || S.light.product) return null;
  const w0 = wattsOf(S), want = parWanted(S);
  if (!(w0 > 0) || !(want > 0) || (lightOutCached(S)?.mean ?? 0) >= want) return null;
  for (const k of [1.25, 1.5, 2, 2.5, 3, 4]) {
    const t = structuredClone(S); t.light = { ...t.light, watts: Math.round(w0 * k) };
    if ((lightOutCached(t)?.mean ?? 0) >= want) return { scene: t, said: `a stronger light (${Math.round(w0)} W to ${t.light.watts} W) because the plants want more light` };
  }
  return null;
}
