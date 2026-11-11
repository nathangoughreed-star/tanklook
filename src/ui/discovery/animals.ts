// Lane RC1 (2026-11-03): stockingSuggestion now builds its roster through the generator gates (rosterPlan below).
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
import { catalogueSizes, fitIn, zoneOf, type AnimalCount, type Zone } from '../../scene/tankfit';
import { animalsOf, rankTankmates, startPick, type Pk } from '../stockPlanLogic';
import { focalAnimals, recipeLook } from '../../scene/recipes';
import { STYLES } from '../../scene/items';
import { fits, knownOf } from './logic';
import { buildsFor } from '../../scene/builds';
import { evaluateCandidate } from '../../demand/suggest';
import { defaultProfile } from '../../demand/types';

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

/** Whether an animal belongs in THIS look's enclosure, stricter than `belongsIn`: a paludarium holds water animals and amphibians (reptiles and land
 *  invertebrates need a dry enclosure: animalfit.ts says so itself), and a terrarium holds only the KINDS of animal its look names (the look's pool
 *  and the headliner: a dart-frog rainforest is amphibians, a tarantula burrow is tarantulas), never another world's animal that merely tolerates it. */
function worldHas(a: Archetype, sp: Species, kinds: ReadonlySet<string>): boolean {
  const env = a.resolvesTo ?? a.env;
  if (env === 'paludarium') return !sp.salt && (sp.habitat !== 'land' || sp.cat === 'amphibian');
  if (env === 'terrarium') return sp.habitat === 'land' && (!kinds.size || kinds.has(sp.cat));
  return belongsIn(a, sp);
}
/** The animal an archetype is named for (recipes.ts FOCAL), when it is not simply the first of its look's pool: judged in the biggest enclosure, where it fits if it ever does. */
function namedHeadliner(a: Archetype): string | undefined {
  const big = catalogueSizes(a.env === 'terrarium').at(-1)?.m, id = big ? focalAnimals(a, big)[0]?.species : undefined, look = recipeLook(a);
  if (!id || (look && a.recipe.looks[0] !== 'none' && STYLES[look].animals[0] === id)) return undefined;
  return SPECIES.find(s => s.id === id)?.name;
}
/** A stable 0..1 number for a key: the same look in the same tank always makes the same roster, while two looks that share a pool do not. */
function jitter(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** How a suggested roster was made: through the generator's own gates, and, when it stops short of the kinds asked for, why. */
export interface RosterPlan {
  roster: AnimalCount[];
  /** how many kinds of animal it holds */
  kinds: number;
  /** every roster here passed the generator's strict welfare rule (`evaluateCandidate`) as built, one kind at a time */
  source: 'generator-gates';
  /** the look's headliner, when it fits this tank and leads the roster */
  focal?: string;
  /** why the roster is shorter than 2 kinds (or empty): the generator's own reason, never left unexplained */
  why?: string;
  /** DQ5: the stocking approach this roster follows (set by sizeTiers `stockTier`): compact, school, community, mixed-zone or open */
  philosophy?: 'compact' | 'school' | 'community' | 'mixed-zone' | 'open';
}
const WELFARE_P = defaultProfile(), plans = new Map<string, RosterPlan>(), WELFARE = new Map<string, string | undefined>();
const rosterKey = (r: readonly AnimalCount[]) => r.map(x => `${x.species}${x.n}`).sort().join(',');
/** The generator's strict welfare rule on one roster in one tank (suggest.ts `evaluateCandidate`, the gate the Explore pool applies to the same roster): no Problem or Caution line
 *  in any of the five stocking categories on the balanced build's scene, and the build meets the animals' own needs. Returns the first line that fails, else undefined. Remembered. */
function welfareProblem(roster: AnimalCount[], tank: TankModel): string | undefined {
  const k = `${tank.id}|${rosterKey(roster)}`;
  if (WELFARE.has(k)) return WELFARE.get(k);
  const now = Date.now(), b = buildsFor(roster, tank, now)[2], ev = evaluateCandidate({ constraints: {} }, WELFARE_P, 'in', now, { animals: roster, tank, build: b });
  const why = ev.welfareWords[0] ?? (ev.needsOk ? undefined : 'the gear this tank needs for them does not fit');
  if (WELFARE.size >= 2000) WELFARE.delete(WELFARE.keys().next().value!);
  WELFARE.set(k, why); return why;
}

/** The roster this look would be stocked with in this tank, built through the generator's own gates (lane RC1): the headliner first (kept whenever it fits the tank), then up to
 *  `kinds` - 1 animals of the look's own world that suit it and each other, at different levels where they can, each at its smallest recommended group, every step judged by the strict
 *  welfare rule on the whole set as built (a set is never cut to fewer kinds after the fact). Deterministic for (archetype, tank). */
export function rosterPlan(a: Archetype, tank: TankModel, kinds = 3, exclude?: ReadonlySet<string>): RosterPlan {
  const ck = `${a.id}|${tank.id}|${kinds}${exclude?.size ? `|x${[...exclude].sort().join(',')}` : ''}`;
  let plan = plans.get(ck);
  if (!plan) { plan = buildPlan(a, tank, kinds, exclude); if (plans.size >= 600) plans.delete(plans.keys().next().value!); plans.set(ck, plan); }
  return { ...plan, roster: plan.roster.map(r => ({ ...r })) };
}
/** Forget the remembered plans (tests: a plan must come out the same when made afresh). */
export const clearRosterPlans = () => { plans.clear(); };
/** DQ2: `exclude` = species ids a HARD prohibition rules out (no snails, shrimp, large animals): they are never considered, so no roster is built only to be thrown away at the final check. */
function buildPlan(a: Archetype, tank: TankModel, kinds: number, exclude?: ReadonlySet<string>): RosterPlan {
  const none = (why: string): RosterPlan => ({ roster: [], kinds: 0, source: 'generator-gates', why });
  if (a.water === 'brackish') return none('No brackish animals are in the data yet.');
  const head = focalAnimals(a, tank).filter(c => !exclude?.has(c.species)).map(c => { const full = animalsOf([startPick(c.species)])[0], ok = fitIn([full], tank); return ok && !ok.fails.length ? full : c; }), pool = lookPool(a, tank);
  const focal = head;
  // an archetype named for one animal (an oscar showcase, a goldfish palace) is not stocked with others when that animal does not fit: it needs a bigger enclosure
  if (!focal.length) { const named = namedHeadliner(a); if (named) return none(`${named} is what this look is for, and it needs a bigger enclosure than this.`); }
  const kindsOf = new Set<string>([...pool, ...focal.map(c => c.species)].flatMap(id => SPECIES.find(s => s.id === id)?.cat ?? []));
  // the look's own animals first (their order shuffled per archetype by a fixed hash, so looks that share a pool do not all share a roster), then the easiest of the world
  const ranked = SPECIES.flatMap(sp => {
    if (exclude?.has(sp.id) || !CARE[sp.id] || !worldHas(a, sp, kindsOf) || !suits(a, sp)) return [];
    const at = pool.indexOf(sp.id), c = CARE[sp.id], j = jitter(`${a.id}|${sp.id}`);
    return [{ sp, rank: at >= 0 ? (focal.some(f => f.species === sp.id) ? -100 : at / 2 + j * Math.max(6, pool.length) - 50) : c.care * 10 + c.temper * 6 + (invert(sp) ? 15 : 0) + j * 8 }];
  }).sort((x, y) => x.rank - y.rank || x.sp.name.localeCompare(y.sp.name)).map(o => o.sp);

  const reasons = new Map<string, number>(), why = (t: string) => reasons.set(t, (reasons.get(t) ?? 0) + 1);
  const topReason = () => [...reasons.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
  /** one more animal onto `set`: the first in rank order (an unused level first) that fits with them, suits them and passes the welfare rule as built */
  const extend = (set: AnimalCount[], skip: ReadonlySet<string> = new Set()): AnimalCount | undefined => {
    const have = present(set), taken = new Set(set.map(c => c.species)), zones = new Set(have.map(zoneOf)), haveInv = have.some(invert);
    const open = ranked.filter(sp => {
      if (taken.has(sp.id) || skip.has(sp.id) || (haveInv && invert(sp))) return false;
      const w = have.length ? whyAnimal(sp, Infinity, 3, have) : null;
      if (w) why(`${sp.name}: ${w.text.replace(/^compatibility: /, '')}`);
      return !w;
    });
    let tries = 0;
    for (const sp of [...open.filter(s => !zones.has(zoneOf(s))), ...open.filter(s => zones.has(zoneOf(s)))]) {
      const add = animalsOf([startPick(sp.id)])[0], here = fitIn([...set, add], tank);
      if (!here || here.fails.length) { why(`${sp.name} would not fit alongside in this tank`); continue; }
      if (++tries > 14) break;
      const bad = welfareProblem([...set, add], tank);
      if (!bad) return add;
      why(bad);
    }
    return undefined;
  };

  // the headliner when it fits (a welfare problem of its own is the look's, not a reason to drop it); else the first animal of the world that passes alone, trying a few leads
  let best: AnimalCount[] = [], bestWhy: string | undefined;
  const tried = new Set<string>();
  for (let lead = 0; lead < (focal.length ? 1 : 3); lead++) {
    reasons.clear();
    let set: AnimalCount[] = focal.slice(0, 1);
    if (!set.length) { const first = extend([], tried); if (!first) break; tried.add(first.species); set = [first]; reasons.clear(); }
    while (set.length < kinds) { const next = extend(set); if (!next) break; set.push(next); }
    if (set.length > best.length) { best = set; bestWhy = topReason(); }
    if (best.length >= 2) break;
  }
  if (!best.length) return none(`Nothing of this look's world suits this tank${topReason() ? `: ${topReason()}` : ''}.`);
  const first = SPECIES.find(s => s.id === best[0].species)?.name ?? best[0].species;
  return { roster: best, kinds: best.length, source: 'generator-gates', ...(focal.length && best[0].species === focal[0].species ? { focal: focal[0].species } : {}),
    ...(best.length < 2 ? { why: `${first} is the only kind here${bestWhy ? `: ${bestWhy.replace(/^compatibility: /, '')}` : ''}.` } : {}) };
}

/** One ready stocking suggestion for the archetype in the enclosure (`rosterPlan`'s roster): up to three kinds that suit the look's world and each other, living at different levels
 *  where they can, each at its smallest recommended group, the whole set passing the welfare rule as built. A starting point to change, never a requirement. */
export function stockingSuggestion(a: Archetype, tank: TankModel, kinds = 3): AnimalCount[] {
  return rosterPlan(a, tank, kinds).roster;
}

/** Add (or replace) one animal in the chosen list. */
export const addAnimal = (chosen: readonly AnimalCount[], add: AnimalCount): AnimalCount[] => [...chosen.filter(c => c.species !== add.species), add];
export const dropAnimal = (chosen: readonly AnimalCount[], id: string): AnimalCount[] => chosen.filter(c => c.species !== id);
