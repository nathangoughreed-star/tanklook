import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/data/species';
import { applyRosterFix, planFor, rankTankmates, rosterTotals, rosterWarnings, startPick, type RosterState } from '../src/ui/stockPlanLogic';
import { costTiers } from '../src/demand/tiers';
import { defaultProfile } from '../src/demand';
import { emptyScene } from '../src/scene/defaults';

const st = (ids: string[], chosen?: string): RosterState => ({ picks: ids.map(startPick), chosen });

describe('animal-first roster (lane GV4)', () => {
  it('an incompatible species is still offered, with a reason, and adding it raises a warning', () => {
    const base = st(['betta']);
    const no = rankTankmates(base.picks).filter(m => !m.ok);
    expect(no.length).toBeGreaterThan(0);
    expect(no.every(m => m.why.length > 0)).toBe(true);
    const bad = no[0].sp.id, next: RosterState = { ...base, picks: [...base.picks, startPick(bad)] };
    expect(rosterWarnings(next).length).toBeGreaterThan(0);
  });
  it('totals move when a species is added; minimum <= ideal always', () => {
    const one = rosterTotals(st(['neon']))!, two = rosterTotals(st(['neon', 'cherryshrimp']))!;
    expect(two.tiers.ideal.setupUsd).not.toBe(one.tiers.ideal.setupUsd);
    for (const r of [one, two]) for (const k of ['setupUsd', 'upkeepUsdMo', 'minPerWeek'] as const) expect(r.tiers.minimum[k]).toBeLessThanOrEqual(r.tiers.ideal[k]);
    for (const sp of SPECIES.slice(0, 40)) { const t = rosterTotals(st([sp.id])); if (t) expect(t.tiers.minimum.setupUsd, sp.id).toBeLessThanOrEqual(t.tiers.ideal.setupUsd); }
  });
  it('costTiers of a scene: minimum <= ideal', () => {
    const S = emptyScene().tanks[0], t = costTiers(S, defaultProfile());
    expect(t.minimum.setupUsd).toBeLessThanOrEqual(t.ideal.setupUsd);
  });
  it('each fix applies and its $ delta matches the recomputed minimum set-up', () => {
    const cases: RosterState[] = [st(['neon']), st(['betta', 'neon']), st(['oscar', 'neon'], planFor([startPick('neon')]).options[0]?.tank.id)];
    let fixes = 0;
    for (const s of cases) {
      const t0 = rosterTotals(s)?.tiers.minimum.setupUsd ?? 0;
      for (const w of rosterWarnings(s, { maxUsd: 1 })) if (w.fix) {
        fixes++;
        const after = applyRosterFix(s, w.fix.op), t1 = rosterTotals(after)?.tiers.minimum.setupUsd ?? 0;
        expect(w.fix.deltaUsd).toBe(Math.round(t1 - t0));
      }
    }
    expect(fixes).toBeGreaterThan(0);
  });
  it('a school below its minimum warns and the fix adds the missing animals', () => {
    const s: RosterState = { picks: [{ id: 'neon', n: 2 }] };
    const w = rosterWarnings(s).find(x => x.kind === 'school');
    expect(w?.fix?.op).toMatchObject({ op: 'add', id: 'neon' });
    expect(applyRosterFix(s, w!.fix!.op).picks[0].n).toBeGreaterThanOrEqual(6);
  });
});
