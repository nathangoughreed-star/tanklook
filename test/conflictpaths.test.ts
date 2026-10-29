// Lane NG4: every conflict is four paths (keep the vision, keep the limits, keep the look, save the ambition), each verified by re-running the generator; a welfare failure is never a tradeoff.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { briefFromWants, valueOf } from '../src/scene/brief';
import { suggestFromBrief, suggestSetups, type Wants } from '../src/demand/suggest';
import { applyAlternative } from '../src/demand/infeasible';
import { futureOf } from '../src/ui/setupBrief';
import { futureHtml, infeasibleCard } from '../src/ui/infeasibleCard';
import { budgetGap } from '../src/ui/stockPlanLogic';
import { tankOptions } from '../src/scene/tankfit';
import { summaryOf } from '../src/ui/stockSummary';

const P = defaultProfile(), NOW = Date.parse('2026-10-29');
const cap = (value: number) => ({ on: true, value });
const discus = [{ species: 'discus', n: 4 }];
// a group of discus, $250 ceiling, room for a 20 gal (30 x 12 in)
const w: Wants = { constraints: { startupUsd: cap(250), space: { on: true } }, space: { w: 762, d: 305 }, animals: discus };
const again = (b: ReturnType<typeof briefFromWants>) => suggestFromBrief(b, P, 'in', NOW);

describe('four conflict paths', () => {
  const r = suggestSetups(w, P, 'in', NOW), inf = r.infeasible!;
  it('discus / $250 / 20 gal: all four paths, nothing swapped', () => {
    expect(r.proposals).toEqual([]);
    expect(inf.paths!.map(p => p.id)).toEqual(['vision', 'limits', 'look', 'future']);
    const vis = inf.paths![0].facts!;
    expect(vis.gal).toBeGreaterThanOrEqual(75);
    expect(vis.breaks.join(' ')).toContain('$250');
    for (const p of inf.paths!) expect(p.alts.length > 0 || !!p.none, p.id).toBe(true);
    expect(inf.paths![2].none).toContain('Nothing simpler passes'); // no welfare-safe simplification exists for discus: said plainly, no button
  }, 300000);

  it('every button was verified: its edit re-runs to real proposals, with welfare intact', () => {
    const b0 = briefFromWants(w);
    for (const a of inf.alternatives.filter(x => x.edit)) {
      const rr = again(applyAlternative(b0, a.edit!));
      expect(rr.proposals.length, a.kind).toBeGreaterThan(0);
      for (const p of rr.proposals) expect(summaryOf(p.scene, 'in').cats.every(k => k.level !== 'problem' && k.level !== 'caution')).toBe(true);
      if (a.path !== 'limits' && a.kind !== 'save-ambition') expect(valueOf(applyAlternative(b0, a.edit!), 'animals.stock')).toEqual([{ species: 'discus', count: 4 }]);
    }
  }, 300000);

  it('keep the limits changes animals only on the click, and says so', () => {
    const l = inf.alternatives.filter(a => a.path === 'limits');
    expect(l.length).toBeGreaterThan(0);
    for (const a of l) { expect(a.text).toContain('only if you want them'); expect(a.text).toContain('stay locked until you choose'); expect(a.text).toContain('it is not the same animal'); }
  });

  it('save the ambition stores it with real requirements and a smaller project now', () => {
    const f = inf.alternatives.find(a => a.kind === 'save-ambition')!, b0 = briefFromWants(w), b1 = applyAlternative(b0, f.edit!);
    expect(futureOf(b0)).toEqual([]);
    expect(futureOf(b1)).toHaveLength(1);
    expect(futureOf(b1)[0].text).toMatch(/4 Discus in a \d+ gal tank: needs a \d+ gal tank.*to set up.*a month.*minutes a week/);
    expect(again(b1).proposals.length).toBeGreaterThan(0); // the smaller project fits the limits now
    expect(futureHtml(b1)).toContain('Saved for later');
    const card = infeasibleCard(inf, b1);
    for (const id of ['vision', 'limits', 'look', 'future']) expect(card).toContain(`data-path="${id}"`);
  }, 300000);

  it('a welfare failure is not a tradeoff: no vision button, no saved plan', () => {
    const bad = suggestSetups({ constraints: { startupUsd: cap(250) }, animals: [{ species: 'discus', n: 6 }] }, P, 'in', NOW).infeasible!;
    const v = bad.paths!.find(p => p.id === 'vision')!, fu = bad.paths!.find(p => p.id === 'future')!;
    expect(v.alts).toEqual([]); expect(v.none).toContain('welfare limit, not a tradeoff');
    expect(fu.alts).toEqual([]);
    expect(bad.alternatives.some(a => a.kind === 'keep-vision' || a.kind === 'save-ambition')).toBe(false);
  }, 300000);
});

describe('animal screen budget', () => {
  const animals = discus, t = tankOptions(animals).find(o => !o.fails.length)!.tank;
  it('over the max is a conflict; over only the target is a note; within both is nothing', () => {
    const g = budgetGap(animals, t, 250)!;
    expect(g.over).toBeGreaterThan(0); expect(g.cheapestUsd - 250).toBeGreaterThanOrEqual(g.over - 1);
    const soft = budgetGap(animals, t, 5000, 300)!; expect(soft.over).toBe(0); expect(soft.overTarget).toBeGreaterThan(0);
    expect(budgetGap(animals, t, 5000, 5000)).toBeUndefined();
    expect(budgetGap(animals, t)).toBeUndefined();
  });
});
