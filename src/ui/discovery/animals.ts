// Guided Setup Rev 03, Look First: the Suitable Animals step (lane GS3, 2026-11-02; spec research/design/guided-setup-rev03.md section 4, step 5).
// After Density: the animals that suit the chosen archetype in the enclosure the pictures were drawn in, each addable in one click, plus one ready
// stocking suggestion. Everything is optional ("Continue to Make It Your Own" works with none) and nothing here sets stocking from the look: the
// density never changes it, and the engine's welfare checks (animalfit.ts, tankfit.ts) stay the authority, so an animal is only offered when it passes
// them on its own and together with the ones already added. Pure: no DOM, tested in test/discoveryanimals.test.ts.
import type { Archetype } from '../../scene/archetypes';
import { SPECIES, type Species } from '../../data/species';
import { CARE, EXPERTISE_NAME } from '../../data/care';
import type { TankModel } from '../../data/tanks';
import { whyAnimal } from '../../scene/animalfit';
import { fitIn, zoneOf, type AnimalCount, type Zone } from '../../scene/tankfit';
import { animalsOf, rankTankmates, startPick, type Pk } from '../stockPlanLogic';
import { focalAnimals, recipeLook } from '../../scene/recipes';
import { STYLES } from '../../scene/items';
import { fits, knownOf } from './logic';

export interface Suggestion {
  sp: Species;
  /** the group it is added as (its recommended smallest, males and females together for a sexed species) */
  add: AnimalCount;
  /** care level and where it lives, e.g. "Beginner, swims mid-water, a group of 6" */
  line: string;
  /** it is one of this look's own animals (the archetype's headliner or the look's pool), so it leads the list */
  ofLook: boolean;
}
export interface Suitable {
  list: Suggestion[];
  /** how many more suit the look but would need a bigger enclosure than this one */
  tooBig: number;
  /** why the list is empty when it is for a reason other than "nothing suits" (brackish: no species carries the flag yet) */
  note?: string;
}

const ZONE_WORD: Record<Zone, string> = { top: 'near the top', middle: 'mid-water', bottom: 'on the bottom', all: 'at every level' };

/** Whether this kind of animal belongs in this world: water animals in an aquarium (and the salt flag matching the water), land animals in a
 *  terrarium, either in a paludarium. Snails and other 'both' animals count as water animals. */
export function belongsIn(a: Archetype, sp: Species): boolean {
  const env = a.resolvesTo ?? a.env;
  if (env === 'aquarium') return sp.habitat !== 'land' && !!sp.salt === (a.water === 'saltwater');
  if (env === 'terrarium') return sp.habitat === 'land';
  return true;
}
/** The archetype's water chemistry and temperature tags against the animal's own (the discovery flow's own `fits`, with the animal as the roster). */
const suits = (a: Archetype, sp: Species): boolean => {
  const k = knownOf([sp.id]);
  return fits(a, { ...k, env: undefined, water: undefined, gallons: undefined });
};

const invert = (sp: Species) => /invert$/.test(sp.cat);
const present = (chosen: readonly AnimalCount[]) => chosen.flatMap(c => SPECIES.find(s => s.id === c.species) ?? []);

/** The look's own animals, headliner first: the archetype's focal animal, then the look's pool (scene/items.ts STYLES). */
const lookPool = (a: Archetype, tank: TankModel): string[] => {
  const look = recipeLook(a), pool = look && a.recipe.looks[0] !== 'none' && a.water !== 'brackish' ? STYLES[look].animals : [];
  return [...new Set([...focalAnimals(a, tank).map(c => c.species), ...pool])];
};

/** The animals that suit this archetype in this enclosure: the look's own animals first, then the easiest. With some added already, the ones
 *  `rankTankmates` likes best with them come first.
 `chosen` (already added) are left out and the list only holds animals that
 *  suit all of them and still fit with them; a group is judged at its recommended smallest. Capped at `max`. */
export function suitableAnimals(a: Archetype, tank: TankModel, chosen: readonly AnimalCount[] = [], max = 12): Suitable {
  if (a.water === 'brackish') return { list: [], tooBig: 0, note: 'We do not list brackish animals yet. Add any in the editor: its welfare checks apply to them like any other.' };
  const pool = lookPool(a, tank), mates = chosen.length ? new Map(rankTankmates(chosen.map((c): Pk => ({ id: c.species, n: c.n, ...(c.f ? { f: c.f } : {}) })), tank).filter(m => m.fits).map(m => [m.sp.id, m.score])) : undefined;
  const have = present(chosen), taken = new Set(chosen.map(c => c.species)), out: { s: Suggestion; rank: number }[] = [];
  let tooBig = 0;
  for (const sp of SPECIES) {
    if (taken.has(sp.id) || !CARE[sp.id] || !belongsIn(a, sp) || !suits(a, sp)) continue;
    if (have.length && whyAnimal(sp, Infinity, 3, have)) continue;
    const add = animalsOf([startPick(sp.id)])[0], here = fitIn([...chosen, add], tank);
    if (!here || here.fails.length) { tooBig++; continue; }
    const c = CARE[sp.id], n = add.n;
    const line = [EXPERTISE_NAME[c.care], sp.habitat === 'land' ? undefined : `${ZONE_WORD[zoneOf(sp)]}`, n > 1 ? `a group of ${n}` : 'one'].filter(Boolean).join(', ');
    const at = pool.indexOf(sp.id);
    out.push({ s: { sp, add, line, ofLook: at >= 0 }, rank: (at >= 0 ? at - 1000 : 0) + c.care * 10 + c.temper * 6 + (invert(sp) ? 15 : 0) + (have.some(h => zoneOf(h) === zoneOf(sp)) ? 3 : 0) - (mates?.get(sp.id) ?? 0) / 20 });
  }
  out.sort((x, y) => x.rank - y.rank || x.s.sp.name.localeCompare(y.s.sp.name));
  return { list: out.slice(0, max).map(o => o.s), tooBig };
}

/** One ready stocking suggestion for the archetype in the enclosure: up to three kinds that suit each other, living at different levels where they
 *  can, each at its smallest recommended group, the whole set judged to fit. A starting point to change, never a requirement. */
export function stockingSuggestion(a: Archetype, tank: TankModel, kinds = 3): AnimalCount[] {
  const set: AnimalCount[] = [], zones = new Set<Zone>();
  while (set.length < kinds) {
    // the list is re-ranked against the set so far before each pick: the easiest one at a level not yet used, else the easiest left
    // at most one invertebrate in a set: the fish are the stocking, the shrimp and snails a bonus
    const haveInv = set.some(c => { const sp = SPECIES.find(s => s.id === c.species); return !!sp && invert(sp); });
    const list = suitableAnimals(a, tank, set, 40).list.filter(s => !(haveInv && invert(s.sp))), pick = list.find(s => !zones.has(zoneOf(s.sp))) ?? list[0];
    if (!pick) break;
    set.push(pick.add); zones.add(zoneOf(pick.sp));
  }
  return set;
}

/** Add (or replace) one animal in the chosen list. */
export const addAnimal = (chosen: readonly AnimalCount[], add: AnimalCount): AnimalCount[] => [...chosen.filter(c => c.species !== add.species), add];
export const dropAnimal = (chosen: readonly AnimalCount[], id: string): AnimalCount[] => chosen.filter(c => c.species !== id);
