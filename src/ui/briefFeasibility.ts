// What the brief's choices cost, read from the engines that already know (lane U3): no numbers are worked out here.
//  - evaluateAnimals: the locked animals' smallest tank (ui/stockPlanLogic planFor) and the cheapest finished build for it (scene/builds buildsFor),
//    against the budget ceiling, so "goldfish + $200" is answered BEFORE anything is proposed.
//  - consequence: the tank on screen's totals against the brief's limits, through scene/constraints compliance.
import { getSpecies } from '../data/species';
import { demandOf } from '../demand/engine';
import type { UserProfile } from '../demand/types';
import { buildsFor } from '../scene/builds';
import { compliance, type Constraints } from '../scene/constraints';
import type { Units, TankSetup } from '../scene/types';
import { planFor } from './stockPlanLogic';
import { briefToWants } from '../scene/brief';
import { budgetOf, lockedStock, spaceOf, type Brief } from './setupBrief';

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export interface Evaluation { gal?: number; tank?: string; cheapestUsd?: number; fits?: boolean; text: string }
/** The locked animals against the budget: the smallest catalogue tank that holds them, its cheapest finished build, and whether that is within the ceiling. */
export function evaluateAnimals(b: Brief): Evaluation {
  const animals = lockedStock(b).filter(v => getSpecies(v.species));
  if (!animals.length) return { text: '' };
  const plan = planFor(animals.map(a => ({ id: a.species, n: a.n })));
  const m = plan.need?.tank;
  if (!m) return { text: 'These animals do not live in a tank from the catalogue, so a cost cannot be read yet.' };
  const cheapest = buildsFor(animals.map(a => ({ species: a.species, n: a.n })), m)[0];
  const cap = budgetOf(b);
  const base = `The smallest tank that holds them is about ${m.ratedGal} gal; the cheapest finished build is ${usd(cheapest.setupUsd)}.`;
  if (cap === undefined) return { gal: m.ratedGal, tank: m.name, cheapestUsd: cheapest.setupUsd, text: base };
  const fits = cheapest.setupUsd <= cap;
  return { gal: m.ratedGal, tank: m.name, cheapestUsd: cheapest.setupUsd, fits,
    text: `${base} ${fits ? `That is within your ${usd(cap)} ceiling, with ${usd(cap - cheapest.setupUsd)} to spare.` : `That is ${usd(cheapest.setupUsd - cap)} over your ${usd(cap)} ceiling: the animals' needs are not changed to fit it. Raise the ceiling, use gear you own, or pick other animals.`}` };
}

/** The brief's limits as the guardrail shape the tank stores (U1's adapter). */
export const constraintsFrom = (b: Brief): Constraints => briefToWants(b).constraints;
/** The tank on screen against the brief's limits: its totals, and how they stand against the ceiling, time and space. */
export function consequence(T: TankSetup, b: Brief, P: UserProfile, units: Units): { totals: string; line?: string; over: boolean } {
  const D = demandOf(T, P), t = D.totals;
  const totals = `${usd(t.setupUsd)} to set up, ${usd(t.upkeepUsdMo)} a month, ${Math.round(t.minPerWeek)} min a week`;
  const c = constraintsFrom(b);
  if (!Object.keys(c).length) return { totals, over: false };
  const S = { constraints: c, layout: { ...T.layout, space: spaceOf(b) ?? T.layout.space }, tank: T.tank };
  const r = compliance(S, t, P.limits, units);
  return { totals, line: r.line, over: r.over > 0 };
}
