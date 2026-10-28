// Lane S254 (Nathan 2026-10-28, "rec"): the species picker and Suggest share one husbandry rule. Suggest rejects a setup when the stocking
// summary (stockSummary.ts, five categories) words anything as a Caution or a Problem; the picker now grays a species when ADDING it
// would put a new Caution / Problem line in that same summary, and says so in the summary's own words. The summary is the one source
// of truth: this file only adds the candidate to the stock and reads what the summary says that it did not say before.
import { getSpecies, type Species } from '../data/species';
import type { Fish, TankSetup, Units } from '../scene/types';
import { OK_FIT, type Fit } from '../scene/pickerKind';
import { summaryOf, type StockSummary } from './stockSummary';

/** How many of a species the picker's Add puts in (a pair, a school of six, else one). */
export const startCount = (sp: Species) => (sp.pair ? 2 : sp.kind !== 'snail' && sp.group ? 6 : 1);

/** The Caution / Problem lines of a summary, keyed so the same line in two summaries matches. */
const lines = (sm: StockSummary) => sm.cats.flatMap(c => c.items.filter(i => i.level !== 'unknown').map(i => ({ key: `${c.id}|${i.text}`, level: i.level as 'caution' | 'problem', text: i.text })));

/** The stock with the candidate added the way Add does (its start count, as males for a dimorphic species), without positions: the summary does not read them. */
export function withCandidate(S: TankSetup, sp: Species): TankSetup {
  let id = S.fish.reduce((m, f) => Math.max(m, f.id), 0) + 1;
  const add: Fish[] = Array.from({ length: startCount(sp) }, () => ({ id: id++, species: sp.id, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
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
