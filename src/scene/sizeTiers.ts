// Discovery v2, lane AB5: tank SIZE as a real design variable. The Explore pool can try several catalogue sizes of one look (sizes 2-3); this gives each size ITS OWN stocking instead of the same small
// group in more water: the smallest tier is compact (fewer kinds, the smallest recommended groups), the next a community (more kinds, bigger groups), the largest expansive (still more kinds and the
// biggest group the welfare rules allow). Every grown roster must fit the tank (tankfit) and pass the same strict welfare rule the pool applies; otherwise the next smaller growth is used, so a tier never
// trades welfare for numbers. Plants and hardscape scale in the recipe itself (recipeBase re-runs per tank). Pure and deterministic; remembered per (look, tank, tier).
import { rosterPlan, type RosterPlan } from '../ui/discovery/animals';
import { fitIn, type AnimalCount } from './tankfit';
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
const GROWTH: number[][] = [[1], [2, 1.5], [3, 2.5, 2, 1.5]];
const KINDS = [2, 3, 4];
const memo = new Map<string, RosterPlan>();
export function stockTier(a: Archetype, tank: TankModel, tier: number): RosterPlan {
  const t = Math.max(0, Math.min(2, tier)), k = `${a.id}|${tank.id}|${t}`, hit = memo.get(k);
  if (hit) return { ...hit, roster: hit.roster.map(r => ({ ...r })) };
  let plan = rosterPlan(a, tank, KINDS[t]);
  if (!plan.roster.length && t > 0) plan = rosterPlan(a, tank);                                   // a look that cannot add kinds keeps the base roster
  if (plan.roster.length && t > 0) {
    for (const m of GROWTH[t]) {
      const grown = plan.roster.map(r => ({ ...r, n: Math.max(r.n, Math.round(r.n * m)) }));
      if (grown.some((g, i) => g.n !== plan.roster[i].n) && sound(grown, tank)) { plan = { ...plan, roster: grown }; break; }
    }
  }
  if (memo.size >= 600) memo.delete(memo.keys().next().value!);
  memo.set(k, plan); return { ...plan, roster: plan.roster.map(r => ({ ...r })) };
}
export const clearSizeTiers = () => { memo.clear(); OK.clear(); };
