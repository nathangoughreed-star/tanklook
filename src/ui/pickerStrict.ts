// Lane S254 (Nathan 2026-10-28, "rec"): the species picker and Suggest share one husbandry rule. Suggest rejects a setup when the stocking
// summary (stockSummary.ts, five categories) words anything as a Caution or a Problem; the picker now grays a species when ADDING it
// would put a new Caution / Problem line in that same summary, and says so in the summary's own words. The summary is the one source
// of truth: this file only adds the candidate to the stock and reads what the summary says that it did not say before.
import { getSpecies, type Species } from '../data/species';
import type { Fish, TankSetup, Units } from '../scene/types';
import { OK_FIT, type Fit } from '../scene/pickerKind';
import type { Rules } from '../scene/brief';
import { summaryOf, type StockSummary } from './stockSummary';
import { CARE } from '../data/care';
import { maxOf, sexFish, startPick, type Pk } from './stockPlanLogic';

/** How many of a species the picker's Add puts in (a pair, a school of six, else one). */
export const startCount = (sp: Species) => (sp.pair ? 2 : sp.kind !== 'snail' && sp.group ? 6 : 1);

/** AT1 (R43): the group the picker judges and Add puts in: a pair for a pair species, one animal for a loner or a snail, else the species'
 *  recommended minimum (a shoal of 8 for cardinals) and, for a species kept by sex, the smallest whole multiple of its ratio that reaches it
 *  (2 males + 6 females for black mollies). A lone fish is never what "fits this tank" judges: the group minimum and the sex ratio are
 *  about how many you keep, not whether the species can live in this tank. Never fewer than `startCount` (six). */
export function startGroup(sp: Species): Pk & { total: number } {
  const n1 = startCount(sp);
  if (n1 === 1 || sp.pair) return { id: sp.id, n: n1, total: n1 };
  const base = startPick(sp.id), r = CARE[sp.id]?.sexed?.ratio;
  if (!r) { const n = Math.max(n1, Math.min(base.n, maxOf(sp.id))); return { id: sp.id, n, total: n }; }
  const per = r[0] + r[1] || 1, k = Math.max(1, Math.ceil(Math.max(n1, base.n + (base.f ?? 0)) / per));
  return { id: sp.id, n: r[0] * k, f: r[1] * k, total: per * k };
}

/** The Caution / Problem lines of a summary, keyed so the same line in two summaries matches. */
const lines = (sm: StockSummary) => sm.cats.flatMap(c => c.items.filter(i => i.level !== 'unknown').map(i => ({ key: `${c.id}|${i.text}`, level: i.level as 'caution' | 'problem', text: i.text })));

/** The stock with the candidate added the way Add does (its start count, as males for a dimorphic species), without positions: the summary does not read them. */
export function withCandidate(S: TankSetup, sp: Species): TankSetup {
  let id = S.fish.reduce((m, f) => Math.max(m, f.id), 0) + 1;
  const g = startGroup(sp);
  const add: Fish[] = Array.from({ length: g.total }, () => ({ id: id++, species: sp.id, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
  sexFish(add, g);
  return { ...S, fish: [...S.fish, ...add] };
}

/**
 * One reader for a tank: `fitOf(sp)` is the candidate's Fit. Not already in the stock (Add would refuse a second row) and the stock itself
 * clean or not, a species is gray when the stock with it added has a Caution / Problem line the stock alone does not have; the text is that
 * line (worst first), the rest go in `more`. A tank that already has a Caution is not turned away from every animal by it: only what the
 * candidate adds counts. `base` is the cheap per-species reading (care gate) used for a species already in the stock and as the care-level gate.
 */
export function strictReader(S: TankSetup, units: Units, cheap: (sp: Species) => Fit): (sp: Species) => Fit {
  const have = new Set(S.fish.map(f => f.species));
  const before = new Set(lines(summaryOf(S, units)).map(l => l.key));
  const memo = new Map<string, Fit>();
  return sp => {
    const hit = memo.get(sp.id); if (hit) return hit;
    const c = cheap(sp);
    let fit = c;
    if (!have.has(sp.id) && getSpecies(sp.id)) {
      const fresh = lines(summaryOf(withCandidate(S, sp), units)).filter(l => !before.has(l.key)).sort((a, b) => (a.level === b.level ? 0 : a.level === 'problem' ? -1 : 1));
      // the care-level gate (the owner's own, not in the summary) still counts; everything else is the summary's
      const gate = c.level !== 'ok' && c.more.length === 0 && /^expertise:/.test(c.text) ? c : undefined;
      fit = fresh.length ? { level: fresh[0].level, text: fresh[0].text, more: fresh.slice(1).map(l => l.text) } : gate ?? OK_FIT;
    }
    memo.set(sp.id, fit);
    return fit;
  };
}

/** DQ9: the picker's reader for the project's rule set. Guided = `strictReader` (gray what would add a Caution / Problem); Sandbox = nothing is gray, anything may be added. */
export const pickerReader = (rules: Rules, S: TankSetup, units: Units, cheap: (sp: Species) => Fit): ((sp: Species) => Fit) => rules === 'sandbox' ? () => OK_FIT : strictReader(S, units, cheap);
