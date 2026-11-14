// Lane P2 (UI2 §7 P2): the stocking edits moved out of ui/panels.ts. Plain functions on a TankSetup, no DOM, no store:
// the caller passes the fresh id, the random seed and the new-animal size, and does its own status texts and undo grouping.
import { rng } from '../art/paint';
import { getSpecies, needsWater, type Sex, type Species } from '../data/species';
import { backdropDepth, clamp, clampFish, waterY } from './physics';
import { placeNew, randomPose, randomSize } from './scatter';
import { groundHeight, nearestLand } from './terrain';
import type { Fish, TankSetup } from './types';
import { LIMITS } from './validate';
import type { PlaceAt } from '../interact/pointer';

/** A saltwater tank: salt set and water on (a dry tank lists the freshwater and land animals). */
export const isSalt = (s: TankSetup) => s.water.on && !!s.water.salt;
/** Does this species belong in this tank? Species without `salt` are freshwater (or land). */
export const fitsWater = (sp: Species, s: TankSetup) => !!sp.salt === isSalt(s);
/** Animals in this tank that do not fit its water (offered for removal in the Water section). */
export const misfits = (s: TankSetup) => s.fish.filter(f => { const sp = getSpecies(f.species); return !!sp && !fitsWater(sp, s); });

/** Water surface for placement: the water line, or -1 in a dry tank (all ground counts as land). */
export const surfaceY = (s: TankSetup) => (s.water.on ? waterY(s.tank, s.water.level) : -1);
/** Why this species cannot be added right now ('' = it can). */
export function blocked(s: TankSetup, sp: Species): string {
  if (!s.water.on && needsWater(sp)) return 'Fish need water: turn Water on (Water section).';
  if (sp.habitat === 'land' && !nearestLand(s, s.tank, surfaceY(s), 0, 0))
    return 'Land animals need ground above the water: lower the water, or use the Swamp layout or Custom terrain.';
  return '';
}

/** Is this fish in the species' list row? A dimorphic species has a row per sex. */
export const inRow = (f: Fish, sp: Species, sex?: Sex) => f.species === sp.id && (!sp.female || (f.sex === 'f') === (sex === 'f'));
/** How many animals the species' row holds now. */
export const rowCount = (s: TankSetup, sp: Species, sex?: Sex) => s.fish.filter(f => inRow(f, sp, sex)).length;
/** Stocking name: "Betta (male)" / "Betta (female)" for a dimorphic species, else the name. */
export const rowName = (sp: Species, sex?: Sex) => sp.name + (sp.female ? (sex ? ' (female)' : ' (male)') : '');
/** The undo-coalescing key of a count edit (one undo step per burst of clicks). */
export const countKey = (sp: Species, sex?: Sex) => `count:${sp.id}:${sex ?? ''}`;

/** What a count edit would do to this tank: refused (why), refused for the animal limit, or fine. */
export type CountPlan = { kind: 'ok'; want: number; have: number } | { kind: 'blocked'; why: string } | { kind: 'full'; message: string };
export function planCount(s: TankSetup, sp: Species, to: (n: number) => number, sex?: Sex): CountPlan {
  const have = rowCount(s, sp, sex), want = Math.round(to(have));
  if (want > 0) { const why = blocked(s, sp); if (why) return { kind: 'blocked', why }; }
  if (want > have && s.fish.length >= LIMITS.maxFish) return { kind: 'full', message: `A tank holds at most ${LIMITS.maxFish} animals.` }; // audit #36
  return { kind: 'ok', want, have };
}

/** Set how many of a species the tank holds (`to` gets the row's current count). New animals take the species' sizes
 *  (`pct` = New fish size, % of adult); only they are placed (joining their species' school if it is already in the
 *  tank, else by the shuffle rules), everyone else stays put (Nathan 2026-10-13). 0 takes the species off the list.
 *  `first` is the id of the first newcomer, `seed` the dice; the same two make every edited view agree. */
export function applyCount(s: TankSetup, sp: Species, to: (n: number) => number, sex: Sex | undefined, o: { first: number; seed: number; pct: number; at?: PlaceAt }) {
  const r = rng(o.seed), mine = s.fish.filter(f => inRow(f, sp, sex)), added = new Set<number>();
  const n = clamp(Math.round(to(mine.length)), 0, mine.length + LIMITS.maxFish - s.fish.length);
  if (n === mine.length) return;
  if (n < mine.length) { const drop = new Set(mine.slice(n).map(f => f.id)); s.fish = s.fish.filter(f => !drop.has(f.id)); return; }
  for (let id = o.first; mine.length < n; id++) {
    const f: Fish = { id, species: sp.id, x: s.tank.L / 2, y: 0, depth: s.tank.D / 2, ...randomPose(sp, r, 0), ...(sex && sp.female ? { sex } : {}) };
    randomSize(f, sp, o.pct, r);
    mine.push(f); s.fish.push(f); added.add(id);
  }
  placeNew(s, r, added);
  // dropped into the tank: the newcomers, placed as above, move over together so they gather round the drop point,
  // each at its height above the ground there, and off the front and back glass (seen from the front, the ground
  // under the pointer is right behind the glass); the glass and land animals keep the spots their rules gave them
  const at = o.at;
  if (at && sp.habitat === 'water') {
    const fs = s.fish.filter(f => added.has(f.id) && f.surface !== 'glass'), T = s.tank, g = (x: number, d: number) => groundHeight(s, T, x, d);
    const top = s.water.on ? waterY(T, s.water.level) : T.H, wb = backdropDepth(s.backdrop, T);
    const dx = at.x - fs.reduce((a, f) => a + f.x, 0) / (fs.length || 1), dd = clamp(at.depth, T.D * 0.25, T.D * 0.75) - fs.reduce((a, f) => a + f.depth, 0) / (fs.length || 1);
    for (const f of fs) {
      const up = f.y - g(f.x, f.depth);
      f.x += dx; f.depth += dd; clampFish(f, T, wb, s.render.bgSides);
      f.y = clamp(g(f.x, f.depth) + up, 0, top);
      clampFish(f, T, wb, s.render.bgSides);
    }
  }
}

/** The count a drag-drop asks for: its start count when the row is empty, else one more (`start` = the species' start count). */
export const dropTarget = (k: number, start: number) => k + (k ? 1 : start);

/** Ids of the animals that do not fit the water, read from the tank the panel shows (a split view edits every
 *  ticked tank with these same ids, as before). */
export const misfitIds = (s: TankSetup) => new Set(misfits(s).map(f => f.id));
/** Take these animals off the list. */
export function removeFish(s: TankSetup, ids: Set<number>) { s.fish = s.fish.filter(f => !ids.has(f.id)); }
/** The status line after removing `n` misfits. */
export const misfitNote = (n: number) => `${n} animal${n > 1 ? 's' : ''} removed. Ctrl+Z brings them back.`;
