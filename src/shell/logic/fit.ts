// UI2 shell step 5 (lane S5): "If it does not all fit" -> "Fill in what I left open" (Suggest) as a pure view-model.
// Engine calls: `suggestFromBrief` only (limits are read from the brief, no own fields); the cards are drawn from its Proposals.
import { fmtMin } from '../../units';
import type { Brief } from '../../scene/brief';
import { suggestFromBrief, type Proposal, type Suggestions } from '../../demand/suggest';
import type { UserProfile } from '../../demand';
import { getSpecies } from '../../data/species';
import type { Units } from '../../scene/types';
import { usd } from './constraints';

export interface FitCard { i: number; title: string; tank: string; animals: string; setup: string; monthly: string; minutes: string; checks: string[]; note: string; setupUsd: number }
export interface FitRun { cards: FitCard[]; /** nothing fit: one sentence, with what to raise when the engine knows */ message: string; res: Suggestions }

export function cardOf(p: Proposal, i: number): FitCard {
  const b = p.build, t = p.totals;
  return { i, title: p.archetype.title, tank: b.tank.name, animals: b.animals.map(a => `${a.n} ${getSpecies(a.species)?.name ?? a.species}`).join(', '),
    setup: usd(t.startupUsd), monthly: `${usd(t.monthlyUsd)}/mo`, minutes: `${fmtMin(t.minPerWeek)}/wk`, checks: p.status.map(s => `${s.label}: ${s.text}`), note: p.experienceNote ?? '', setupUsd: t.startupUsd };
}
/** Run Suggest on what the brief holds (budget, monthly, time, space, owned gear, No new equipment, experience through the profile). */
export function runFit(b: Brief, P: UserProfile, units: Units, now = Date.now()): FitRun {
  const res = suggestFromBrief(b, P, units, now);
  const cards = res.proposals.map(cardOf);
  const miss = res.misses[0];
  const message = cards.length ? '' : res.message ?? res.unavailable ?? (miss ? `Closest: ${miss.archetype.title}, if you raise a limit (${miss.text}).` : 'Nothing fits every limit yet. Raise a limit or loosen one.');
  return { cards, message, res };
}
