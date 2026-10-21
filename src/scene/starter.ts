// Starter sets, layer by layer (lane SD, 2026-10-15): the hardscape and plants come from scene/items.ts
// `starterItems`; this adds the animal layer and the regenerate the density sliders and Shuffle call. Each layer draws
// from its own random stream (seed x layer), so redrawing one leaves the layers it does not feed exactly as they were.
import { floorPerAnimal, litresPerAnimal } from './stocking';
import { rng } from '../art/paint';
import { getSpecies, type Species } from '../data/species';
import { DEFAULT_DENS, EPIPHYTES, STYLES, STYLE_KIND, clampItem, isLandStyle, isSwampy, layerOf, perch, starterItems, type Layer } from './items';
import { CARE } from '../data/care';
import { volume } from './physics';
import { hasCorals, whyAnimal } from './animalfit';
import { floorOf, minFit } from './tankMin';
import { groundEdited } from './scapeground';
import { placeNew, randomPose, randomSize } from './scatter';
import type { Fish, Item, LayoutId, TankSetup } from './types';

/** Share of the tank's bioload cap each animal stop fills (None .. Full). Full stays under the cap. */
export const ANIMAL_FILL = [0, 0.35, 0.6, 0.8, 0.9] as const;
/** Species tried per stop: a few kinds in a light tank, a community in a full one. */
const KINDS_PER_STOP = [0, 2, 3, 4, 5] as const;
/** A continuous animal value (0..6) between the stops: below Few it is Few thinned to a share of its animals (one at
 *  the least); past Full the fill keeps climbing, to a little over twice the safe cap at 6, more kinds, bigger groups
 *  (Nathan 2026-10-15: the slider goes on to where it no longer looks good). */
const lerpStops = (a: readonly number[], v: number) => { const i = Math.min(Math.floor(v), a.length - 2); return a[i] + (a[i + 1] - a[i]) * (v - i); };
const fillAt = (v: number) => v <= 4 ? lerpStops(ANIMAL_FILL, Math.max(v, 1)) : ANIMAL_FILL[4] + 0.6 * (v - 4);
const kindsAt = (v: number) => Math.round(v <= 4 ? lerpStops(KINDS_PER_STOP, Math.max(v, 1)) : KINDS_PER_STOP[4] + (v - 4));

const isInvert = (sp: Species) => sp.kind === 'snail' || sp.cat.endsWith('invert');
/** Water one animal needs, litres: its load from the stocking engine (FishBase mass^0.75 x metabolism, scene/stocking.ts; lane SE
 *  2026-10-19; the rule of thumb it replaced was 3 L x (tl/35)^1.6 per animal, half again for marine, a third for shrimp and snails). */
const female = (sp: Species): Species => sp.female?.tl ? { ...sp, tl: sp.female.tl } : sp;
export const litresFor = (sp: Species) => litresPerAnimal(sp); // a function, not an alias: stocking.ts and this file import each other (lane MW 2026-10-21: the demand engine now loads stocking first)
/** Litres for the `from`-th to (`from` + n - 1)-th animal of a species: a sexed species goes in as males and females in turn
 *  (`sex: 'f'` on every second one), each at its own size. At the male size alone the larger guppy females took the Full stop
 *  over 100 %, and a mean size undercounts a lone male where the females are smaller (kribensis, peacocks; S168 2026-10-20). */
const groupLitres = (sp: Species, from: number, n: number, per: (sp: Species) => number = litresPerAnimal) => {
  if (!sp.female?.tl) return n * per(sp);
  const fem = Math.floor((from + n) / 2) - Math.floor(from / 2);   // indices i in [from, from + n) with i odd
  return (n - fem) * per(sp) + fem * per(female(sp));
};
/** The water the bioload cap is counted on, litres: the tank to its water line (a swamp's shallow pools still count a
 *  third of the tank, for the animals on land). */
export function bioloadLitres(s: TankSetup) {
  return volume(s.tank).litres * Math.max(s.water.on ? s.water.level : 0, 0.3);
}
/** Litres the animals in the tank take up now (each at its own size: a female at the female length). */
export const bioload = (fish: Fish[]) => fish.reduce((a, f) => { const sp = getSpecies(f.species); return a + (sp ? litresPerAnimal(f.sex === 'f' ? female(sp) : sp) : 0); }, 0);

/** How a species is stocked: the first group, the step it grows by, the most of it. */
function stocking(sp: Species) {
  if (sp.pair) return { start: 2, step: 0, max: 2 };
  const g = CARE[sp.id]?.group ?? 0; // the smallest group it is kept in (lane CG hook)
  if (isInvert(sp)) return sp.kind === 'snail' ? { start: 2, step: 1, max: 4 } : sp.group ? { start: Math.max(5, g), step: 1, max: Math.max(10, g) } : { start: 1, step: 1, max: 3 };
  if (sp.habitat !== 'water') return { start: 2, step: 1, max: 6 }; // frogs, toads, newts
  return sp.group ? { start: Math.max(6, g), step: 2, max: 30 } : { start: 1, step: 0, max: 1 }; // a school or shoal; else a single fish
}

/** Most of a land species a terrarium starter keeps (lane SS2): geckos in a pair or a trio, a snake, spider or tarantula alone,
 *  frogs in a group. Land animals are not counted against the bioload (there is no water to foul). */
const LAND_MOST: Record<string, number> = { ballpython: 1, chacogoldenknee: 1, regaljumper: 1, leopardgecko: 2, crestedgecko: 2, crestedharlequin: 2, treefrog: 4, dartfrog: 5, firetoad: 5, firenewt: 4 };
const landCount = (sp: Species, v: number) => { const m = LAND_MOST[sp.id] ?? 3; return Math.max(1, Math.min(m, Math.round(m * fillAt(v) / ANIMAL_FILL[4]))); };

/**
 * The animal layer of a starter set at its animal stop: a few species from the style's pool that suit the tank (fresh
 * or salt, room to swim, land for land animals), groups grown in turn until the stop's share of the bioload cap is
 * used. Deterministic in (layout, seed, animal stop, tank). Ids from `firstId`; placed by the Shuffle rules (scatter.ts).
 */
export function starterAnimals(s: TankSetup, firstId: number): Fish[] {
  const id = s.layout.id, stop = (s.layout.dens ?? DEFAULT_DENS).animal;
  if (id === 'none' || stop <= 0) return [];
  const r = rng((s.layout.animalSeed ?? s.layout.seed) * 7919 + id.length * 104729 + 3 * 1000003), salt = s.water.on && !!s.water.salt;
  const swamp = isSwampy(id), land = isLandStyle(id), T = s.tank;
  const pool = STYLES[id].animals.map(getSpecies).filter((sp): sp is Species => !!sp && !!sp.salt === salt
    && T.L >= (sp.body === 'snake' ? 60 : sp.tl) * (sp.salt ? 6 : land || (swamp && id !== 'swamp') ? (sp.habitat === 'water' ? 5 : 2.5) : 5) && (sp.habitat === 'water' || (sp.habitat === 'both' && isInvert(sp) && !swamp && !land) ? s.water.on : swamp || land));
  // shuffled, with a schooling or shoaling swimmer up front (one whose group fits the tank) so there is a group to
  // watch; the same order at every stop, so a fuller stop adds to the tank rather than swapping its species
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  if (s.layout.gateStock) { // stock by the care gates (Quick Setup): only animals that suit the care level, the tank and each other
    const ex = s.layout.expertise ?? 1, litres = volume(T).litres, kept: Species[] = [];
    for (const sp of pool) if (!whyAnimal(sp, litres, ex, kept, { corals: hasCorals(s.items), fit: minFit(s) })) kept.push(sp);
    pool.splice(0, pool.length, ...kept);
  }
  const cap = bioloadLitres(s) * ANIMAL_FILL[4];
  const lead = pool.findIndex(sp => sp.group && sp.zone !== 'bottom' && !isInvert(sp) && sp.habitat === 'water' && groupLitres(sp, 0, stocking(sp).start) <= cap);
  if (lead > 0) pool.unshift(...pool.splice(lead, 1));
  const chosen = pool.slice(0, kindsAt(stop)), budget = bioloadLitres(s) * fillAt(stop), big = Math.max(1, fillAt(stop) / ANIMAL_FILL[4]);
  const count = new Map<Species, number>();
  const dry = (sp: Species) => (land || id === 'paludarium') && sp.habitat !== 'water'; // land animals in a terrarium style
  let used = 0, usedFloor = 0;
  // lane HB: the floor the bottom dwellers use is held to the same share of the tank's floor as the water budget is of its water (the
  // stocking engine's floor limit), so a starter's Full stays at or under 100 % on both
  const floorPerLitre = floorOf(T).areaCm2 / Math.max(1e-9, bioloadLitres(s));
  const add = (sp: Species, n: number, most = budget) => {
    const have = count.get(sp) ?? 0, l = groupLitres(sp, have, n), fl = groupLitres(sp, have, n, floorPerAnimal);
    if (n <= 0 || used + l > most || usedFloor + fl > most * floorPerLitre) return false;
    count.set(sp, have + n); used += l; usedFloor += fl; return true;
  };
  // the lead group goes in at any stop above None if it fits under the cap at all (a small tank's Few is then just
  // that one school); the rest join while the stop's share lasts
  for (const sp of chosen) if (dry(sp)) { // lane HB: semi-aquatic amphibians use the floor too; trim the group to the floor budget
    let n = landCount(sp, stop);
    while (n > 1 && usedFloor + groupLitres(sp, 0, n, floorPerAnimal) > cap * floorPerLitre) n--;
    count.set(sp, n); usedFloor += groupLitres(sp, 0, n, floorPerAnimal);
  }
  for (const [sp, n] of count) used += groupLitres(sp, 0, n); // semi-aquatic animals in a swamp / paludarium count against the water too (SE2 2026-10-20: Full stays at or under 100 %)
  chosen.forEach((sp, i) => !dry(sp) && add(sp, stocking(sp).start, i === 0 && lead >= 0 ? Math.max(cap, budget) : budget));
  for (let grew = true; grew;) { // grow each group in turn while the budget lasts
    grew = false;
    for (const [sp, n] of count) { if (dry(sp)) continue; const { step, max } = stocking(sp); if (step && n + step <= Math.round(max * big) && add(sp, step)) grew = true; }
  }
  if (stop < 1) { // below Few: the first animals only, one at the least
    let keep = Math.max(1, Math.floor([...count.values()].reduce((a, n) => a + n, 0) * stop)); // floor: with the engine's cheaper small fish a Few-sized set is 30+ animals, and the bottom of the range must stay one
    for (const [sp, n] of count) { const k = Math.min(n, keep); keep -= k; if (k) count.set(sp, k); else count.delete(sp); }
  }
  const fish: Fish[] = [], ids = new Set<number>();
  let next = firstId;
  for (const [sp, n] of count) for (let i = 0; i < n; i++) {
    const f: Fish = { id: next++, species: sp.id, x: T.L / 2, y: 0, depth: T.D / 2, ...randomPose(sp, r, 0), ...(sp.female && i % 2 ? { sex: 'f' as const } : {}) };
    randomSize(f, sp, 100, r); fish.push(f); ids.add(f.id);
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

/** A style drawn at random for "Any style" (Quick Setup): from the tank's own family, so a shuffle never turns a fish tank
 *  into a terrarium or a freshwater tank into a reef; a different one from the current style when there is a choice. */
export function randomStyle(s: TankSetup, roll: () => number): Exclude<LayoutId, 'none'> {
  const cur = s.layout.id, land = !s.water.on || isLandStyle(cur) || isSwampy(cur), salt = !land && !!s.water.salt;
  const ids = (Object.keys(STYLES) as Exclude<LayoutId, 'none'>[]).filter(id => land ? isLandStyle(id) || isSwampy(id) : salt ? STYLE_KIND[id] === 'salt' : STYLE_KIND[id] !== 'salt' && STYLE_KIND[id] !== 'land' && !isSwampy(id));
  const pool = ids.filter(id => id !== cur);
  return (pool.length ? pool : ids)[Math.floor(roll() * (pool.length || ids.length))];
}

/** The parts of an item a hand edit changes (a coral's lift is left out: the renderer seats it on the rock). */
const pose = (it: Item) => [it.variant, Math.round(it.x), Math.round(it.depth), Math.round(it.size), it.yaw, it.pitch ?? 0, it.tilt ?? 0, it.kind === 'coral' ? 0 : Math.round(it.lift)].join();
const sameItems = (a: Item[], b: Item[]) => a.length === b.length && a.map(pose).sort().join('|') === b.map(pose).sort().join('|');
const speciesCount = (fish: Fish[]) => fish.map(f => f.species + (f.sex ?? '')).sort().join();

/**
 * What a redraw of `what` would throw away that is not the starter set as drawn for the tank's current settings: pieces
 * moved, added, removed or resized by hand, or animals other than the stop's (Nathan 2026-10-15: redraw completely,
 * but warn first that it gets rid of the current scape). `ground`: the redraw restyles the substrate as well (the Quick
 * aquascape setup). Empty = nothing of the user's is lost; the caller just redraws.
 */
export function handEdits(s: TankSetup, what: Layer | 'all' | 'none', ground = false): ('substrate' | 'hardscape' | 'plants' | 'animals')[] {
  const out: ('substrate' | 'hardscape' | 'plants' | 'animals')[] = [], dens = s.layout.dens ?? DEFAULT_DENS;
  if (ground && groundEdited(s)) out.push('substrate'); // the quick setup redraws the ground too
  const hardNow = s.items.filter(it => layerOf(it) === 'hard'), plantNow = s.items.filter(it => layerOf(it) === 'plant');
  if (what === 'hard' || what === 'all') {
    if (!sameItems(hardNow, starterItems(s).filter(it => layerOf(it) === 'hard'))) out.push('hardscape');
  }
  if (what !== 'animal' && what !== 'none') {
    if (!sameItems(plantNow, starterItems(s, hardNow).filter(it => layerOf(it) === 'plant'))) out.push('plants');
  }
  if ((what === 'animal' || (what === 'all' && dens.animal > 0)) && s.fish.length && speciesCount(s.fish) !== speciesCount(starterAnimals(s, 1))) out.push('animals');
  return out;
}

/**
 * Hardscape's Shuffle (Nathan 2026-10-15: "should only be hardscape"): a new style and hardscape from `seed`; the plants
 * and animals stay as they are. The plant and animal seeds are pinned first so their layers keep drawing as before.
 * The plants follow the order things go in a tank: every epiphyte (fern, anubias, buce, moss) is tied onto the new
 * stone or wood nearest it; any other plant that stood on a piece now gone settles to the floor.
 */
export function shuffleHard(s: TankSetup, seed: number) {
  s.layout.plantSeed ??= s.layout.seed; s.layout.animalSeed ??= s.layout.seed;
  s.layout.seed = seed;
  const plants = s.items.filter(it => layerOf(it) === 'plant');
  let id = plants.reduce((m, it) => Math.max(m, it.id), 0);
  const hard = starterItems(s).filter(it => layerOf(it) === 'hard').map(it => ({ ...it, id: ++id }));
  s.items = [...hard, ...plants];
  const r = rng(seed * 31 + 7);
  for (const it of plants) {
    const at = EPIPHYTES.has(it.variant) ? perch(s, it.x, it.depth, r, hard) : null;
    if (!at && it.lift <= 0) continue;
    Object.assign(it, at ?? { lift: 0 }); clampItem(it, s.tank, s);
  }
}
