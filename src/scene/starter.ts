// Starter sets, layer by layer (lane SD, 2026-10-15): the hardscape and plants come from scene/items.ts
// `starterItems`; this adds the animal layer and the regenerate the density sliders and Shuffle call. Each layer draws
// from its own random stream (seed x layer), so redrawing one leaves the layers it does not feed exactly as they were.
import { rng } from '../art/paint';
import { getSpecies, type Species } from '../data/species';
import { DEFAULT_DENS, STYLES, layerOf, starterItems, type Layer } from './items';
import { volume } from './physics';
import { placeNew, randomPose, randomSize } from './scatter';
import type { Fish, TankSetup } from './types';

/** Share of the tank's bioload cap each animal stop fills (None .. Full). Full stays under the cap. */
export const ANIMAL_FILL = [0, 0.35, 0.6, 0.8, 0.9] as const;
/** Species tried per stop: a few kinds in a light tank, a community in a full one. */
const KINDS_PER_STOP = [0, 2, 3, 4, 5] as const;

const isInvert = (sp: Species) => sp.kind === 'snail' || sp.cat.endsWith('invert');
/**
 * Water one animal needs, litres: a rule of thumb near AqAdvisor's for small community fish (about 3 L per neon tetra,
 * about 30 L per angelfish: bioload rises faster than length), half again for marine fish, a third for shrimp and snails.
 */
export function litresFor(sp: Species) {
  return 3 * (sp.tl / 35) ** 1.6 * (sp.salt ? 1.5 : 1) * (isInvert(sp) ? 0.3 : 1);
}
/** The water the bioload cap is counted on, litres: the tank to its water line (a swamp's shallow pools still count a
 *  third of the tank, for the animals on land). */
export function bioloadLitres(s: TankSetup) {
  return volume(s.tank).litres * Math.max(s.water.on ? s.water.level : 0, 0.3);
}
/** Litres the animals in the tank take up now (`litresFor` each). */
export const bioload = (fish: Fish[]) => fish.reduce((a, f) => { const sp = getSpecies(f.species); return a + (sp ? litresFor(sp) : 0); }, 0);

/** How a species is stocked: the first group, the step it grows by, the most of it. */
function stocking(sp: Species) {
  if (sp.pair) return { start: 2, step: 0, max: 2 };
  if (isInvert(sp)) return sp.kind === 'snail' ? { start: 2, step: 1, max: 4 } : sp.group ? { start: 5, step: 1, max: 10 } : { start: 1, step: 1, max: 3 };
  if (sp.habitat !== 'water') return { start: 2, step: 1, max: 6 }; // frogs, toads, newts
  return sp.group ? { start: 6, step: 2, max: 30 } : { start: 1, step: 0, max: 1 }; // a school or shoal; else a single fish
}

/**
 * The animal layer of a starter set at its animal stop: a few species from the style's pool that suit the tank (fresh
 * or salt, room to swim, land for land animals), groups grown in turn until the stop's share of the bioload cap is
 * used. Deterministic in (layout, seed, animal stop, tank). Ids from `firstId`; placed by the Shuffle rules (scatter.ts).
 */
export function starterAnimals(s: TankSetup, firstId: number): Fish[] {
  const id = s.layout.id, stop = (s.layout.dens ?? DEFAULT_DENS).animal;
  if (id === 'none' || stop <= 0) return [];
  const r = rng(s.layout.seed * 7919 + id.length * 104729 + 3 * 1000003), salt = s.water.on && !!s.water.salt;
  const swamp = id === 'swamp', T = s.tank;
  const pool = STYLES[id].animals.map(getSpecies).filter((sp): sp is Species => !!sp && !!sp.salt === salt
    && T.L >= sp.tl * (sp.salt ? 6 : 5) && (sp.habitat === 'water' ? s.water.on : swamp));
  // shuffled, with a schooling or shoaling swimmer up front (one whose group fits the tank) so there is a group to
  // watch; the same order at every stop, so a fuller stop adds to the tank rather than swapping its species
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const cap = bioloadLitres(s) * ANIMAL_FILL[4];
  const lead = pool.findIndex(sp => sp.group && sp.zone !== 'bottom' && !isInvert(sp) && sp.habitat === 'water' && stocking(sp).start * litresFor(sp) <= cap);
  if (lead > 0) pool.unshift(...pool.splice(lead, 1));
  const chosen = pool.slice(0, KINDS_PER_STOP[stop]), budget = bioloadLitres(s) * ANIMAL_FILL[stop];
  const count = new Map<Species, number>();
  let used = 0;
  const add = (sp: Species, n: number, most = budget) => {
    if (n <= 0 || used + n * litresFor(sp) > most) return false;
    count.set(sp, (count.get(sp) ?? 0) + n); used += n * litresFor(sp); return true;
  };
  // the lead group goes in at any stop above None if it fits under the cap at all (a small tank's Few is then just
  // that one school); the rest join while the stop's share lasts
  chosen.forEach((sp, i) => add(sp, stocking(sp).start, i === 0 && lead >= 0 ? cap : budget));
  for (let grew = true; grew;) { // grow each group in turn while the budget lasts
    grew = false;
    for (const [sp, n] of count) { const { step, max } = stocking(sp); if (n + step <= max && add(sp, step)) grew = true; }
  }
  const fish: Fish[] = [], ids = new Set<number>();
  let next = firstId;
  for (const [sp, n] of count) for (let i = 0; i < n; i++) {
    const f: Fish = { id: next++, species: sp.id, x: T.L / 2, y: 0, depth: T.D / 2, ...randomPose(sp, r, 0), ...(sp.female && i % 2 ? { sex: 'f' as const } : {}) };
    randomSize(f, sp, 92, r); fish.push(f); ids.add(f.id);
  }
  const t = { ...s, fish };
  placeNew(t, r, ids);
  return t.fish;
}

/**
 * Redraw a layer of the tank's starter set after a slider moved (one undo step, the caller's store.edit). 'plant': plants
 * and corals only, placed round the hardscape where it stands; 'hard': the hardscape and the plants round it (animals
 * stay, they swim); 'animal': the animals only; 'all' (a new layout or Shuffle): every piece, and the animals when the
 * animal stop is above None (at None the user's own animals stay). `firstFishId`: the store's next free animal id.
 */
export function regenerate(s: TankSetup, what: Layer | 'all', firstFishId: number) {
  if (what === 'plant') s.items = starterItems(s, s.items.filter(it => layerOf(it) === 'hard'));
  else if (what !== 'animal') s.items = starterItems(s);
  if (what === 'animal' || (what === 'all' && (s.layout.dens ?? DEFAULT_DENS).animal > 0)) s.fish = starterAnimals(s, firstFishId);
}
