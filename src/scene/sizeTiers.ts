// Discovery v2, lane AB5: tank SIZE as a real design variable. The Explore pool can try several catalogue sizes of one look (sizes 2-3); this gives each size ITS OWN stocking instead of the same small
// group in more water: the smallest tier is compact (fewer kinds, the smallest recommended groups), the next a community (more kinds, bigger groups), the largest expansive (still more kinds and the
// biggest group the welfare rules allow). Every grown roster must fit the tank (tankfit) and pass the same strict welfare rule the pool applies; otherwise the next smaller growth is used, so a tier never
// trades welfare for numbers. Plants and hardscape scale in the recipe itself (recipeBase re-runs per tank). Pure and deterministic; remembered per (look, tank, tier).
import { rosterPlan, type RosterPlan } from '../ui/discovery/animals';
import { fitIn, zoneOf, type AnimalCount } from './tankfit';
import { getSpecies } from '../data/species';
import { buildsFor } from './builds';
import { evaluateCandidate } from '../demand/suggest';
import { defaultProfile } from '../demand/types';
import type { Archetype } from './archetypes';
import type { TankModel } from '../data/tanks';

const P = defaultProfile(), OK = new Map<string, boolean>();
const key = (r: readonly AnimalCount[]) => r.map(x => `${x.species}${x.n}`).sort().join(',');
/** fits the tank and passes the strict welfare rule as built (no Problem or Caution line) */
function sound(roster: AnimalCount[], tank: TankModel): boolean {
  const k = `${tank.id}|${key(roster)}`; const hit = OK.get(k); if (hit !== undefined) return hit;
  let ok = false;
  try {
    const fit = fitIn(roster, tank);
    if (fit && !fit.fails.length) { const now = Date.now(), ev = evaluateCandidate({ constraints: {} }, P, 'in', now, { animals: roster, tank, build: buildsFor(roster, tank, now)[2] }); ok = !ev.welfareWords.length && ev.needsOk; }
  } catch { ok = false; }
  if (OK.size >= 3000) OK.delete(OK.keys().next().value!);
  OK.set(k, ok); return ok;
}
const SCHOOL_GROWTH = [4, 3, 2.5, 2, 1.5];
const memo = new Map<string, RosterPlan>();
const copy = (p: RosterPlan): RosterPlan => ({ ...p, roster: p.roster.map(r => ({ ...r })) });
const zonesOf = (roster: readonly AnimalCount[]) => new Set(roster.map(r => { const sp = getSpecies(r.species); return sp ? zoneOf(sp) : 'all'; }));
/** DQ5: stocking PHILOSOPHIES, not a ladder. The tier sets the room; behaviour decides how to use it.
 *  0 compact: 2 kinds at the smallest groups. 1: ONE big school when the lead animal really schools or shoals (the largest group that stays welfare-sound), else a community (3 kinds, bigger groups).
 *  2: a mixed-zone community (4 kinds at different levels, smallest groups: more variety, not more fish) when 4 kinds living at 3+ levels fit, else an open, lightly stocked display (2 kinds at the smallest
 *  groups: the extra water is swimming room). Counts therefore do not rise with size: a school can hold far more fish than the mixed-zone tier above it. Every roster still passes `sound` (fit + welfare). */
export function stockTier(a: Archetype, tank: TankModel, tier: number, exclude?: ReadonlySet<string>): RosterPlan {
  const t = Math.max(0, Math.min(2, tier)), k = `${a.id}|${tank.id}|${t}${exclude?.size ? `|x${[...exclude].sort().join(',')}` : ''}`, hit = memo.get(k);
  if (hit) return copy(hit);
  const base = rosterPlan(a, tank, 2, exclude);
  let plan: RosterPlan = { ...base, philosophy: 'compact' };
  if (t === 1 && base.roster.length) {
    const lead = base.roster[0], sp = getSpecies(lead.species);
    let done = false;
    if (sp?.group && !sp.pair) for (const m of SCHOOL_GROWTH) {
      const school: AnimalCount[] = [{ species: lead.species, n: Math.max(lead.n, Math.round(lead.n * m)), ...(lead.tl ? { tl: lead.tl } : {}) }];
      if (school[0].n > lead.n && sound(school, tank)) { plan = { roster: school, kinds: 1, source: 'generator-gates', focal: base.focal === lead.species ? lead.species : undefined, philosophy: 'school' }; done = true; break; }
    }
    if (!done) {
      let c = rosterPlan(a, tank, 3, exclude); if (!c.roster.length) c = base;
      plan = { ...c, philosophy: 'community' };
      for (const m of [2, 1.5]) {
        const grown = plan.roster.map(r => ({ ...r, n: Math.max(r.n, Math.round(r.n * m)) }));
        if (grown.some((g, i) => g.n !== plan.roster[i].n) && sound(grown, tank)) { plan = { ...plan, roster: grown }; break; }
      }
    }
  } else if (t === 2 && base.roster.length) {
    const m4 = rosterPlan(a, tank, 4, exclude);
    if (m4.roster.length >= 4 && zonesOf(m4.roster).size >= 3) plan = { ...m4, philosophy: 'mixed-zone' };
    else plan = { ...base, philosophy: 'open' };            // open water: the same modest groups in a bigger tank
  }
  if (memo.size >= 600) memo.delete(memo.keys().next().value!);
  memo.set(k, plan); return copy(plan);
}
export const clearSizeTiers = () => { memo.clear(); OK.clear(); };

// ---------------------------------------------------------------------------------------------------------------- dry habitats: size is footprint OR height, by what the animals need
import { clingsTo } from '../data/species';
/** Climbers (frogs, geckos, spiders: land animals that use the glass) need HEIGHT; ground animals need FLOOR AREA. Mixed rosters count as height when most of them climb. */
export function dryNeed(roster: readonly AnimalCount[]): 'height' | 'floor' {
  let climb = 0, all = 0;
  for (const r of roster) { const sp = getSpecies(r.species); if (!sp) continue; all += r.n; if (sp.habitat !== 'water' && clingsTo(sp, 'glass')) climb += r.n; }
  return all && climb * 2 >= all ? 'height' : 'floor';
}
/** Of the sizes tried for ONE dry look (smallest first), keep those whose needed dimension (height for climbers, floor area for ground animals) is at least 15 % more than the last kept: a larger tank that adds only the dimension
 *  the animals do not use is not a real step up. Pure; the input needs `tank` (the model), `roster`. */
export function meaningfulDryTiers<T extends { tank: { outer: { L: number; D: number; H: number }; ratedGal: number }; roster: AnimalCount[] }>(cands: T[]): T[] {
  const out: T[] = []; let last = 0;
  for (const c of [...cands].sort((a, b) => a.tank.ratedGal - b.tank.ratedGal)) {
    const dim = dryNeed(c.roster) === 'height' ? c.tank.outer.H : c.tank.outer.L * c.tank.outer.D;
    if (!out.length || dim >= last * 1.15) { out.push(c); last = dim; }
  }
  return out;
}
