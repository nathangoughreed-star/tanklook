// Lane NG3: live loop propagation (diffs), target ranks / max filters.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { emptyBrief, setItem, type Brief } from '../src/scene/brief';
import { briefToWants } from '../src/scene/brief';
import { setLimitTarget } from '../src/ui/setupBrief';
import { suggestSetups, suggestFromBrief, targetBonus, TARGET_WEIGHT } from '../src/demand/suggest';
import { changeStrip, inputChanges, inputsOf, resultDiff, tankShift } from '../src/demand/propagate';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const base = (usd: number): Brief => setItem(setItem(emptyBrief(), 'animals.kinds', ['freshwater'], 'preference'), 'constraints.budget', usd, 'hard');
const run = (b: Brief) => suggestFromBrief(b, P, 'cm', NOW);

describe('propagate', () => {
  it('names a budget change and counts the upgrades it buys', () => {
    const a = base(300), b = base(900), ra = run(a), rb = run(b);
    const ia = inputsOf(briefToWants(a), a), ib = inputsOf(briefToWants(b), b);
    expect(inputChanges(ia, ib)).toEqual(['Budget $300 -> $900']);
    const s = changeStrip(ia, ib, ra, rb)!;
    expect(s.text).toMatch(/^Budget \$300 -> \$900: /);
    expect(resultDiff(ra, rb).upgrades).toBeGreaterThan(0);
    expect(s.text).toMatch(/upgrades? now fit/);
  });
  it('no strip when nothing the person asked moved', () => {
    const a = base(500), i = inputsOf(briefToWants(a), a);
    expect(changeStrip(i, i, run(a), run(a))).toBeUndefined();
  });
  it('tank edit: 20 gal high -> 20 gal long', () => {
    expect(tankShift({ gal: 20, L: 616, D: 318, H: 425 }, { gal: 20, L: 760, D: 330, H: 305 })).toBe('20 gal high -> 20 gal long');
    expect(tankShift({ gal: 10, L: 510, D: 260, H: 310 }, { gal: 20, L: 760, D: 330, H: 305 })).toBe('10 gal -> 20 gal');
  });
  it('says so when no setup fits any more', () => {
    const a = base(900), b = base(10), ia = inputsOf(briefToWants(a), a), ib = inputsOf(briefToWants(b), b);
    expect(changeStrip(ia, ib, run(a), run(b))!.text).toContain('no setup fits now');
  });
  it('owned gear shows in the strip', () => {
    const a = base(600), w = briefToWants(a), i0 = inputsOf(w, a), i1 = inputsOf({ ...w, owned: { filter: 'care' } }, a);
    expect(inputChanges(i0, i1)).toEqual(['You own a filter']);
  });
});

describe('target ranks, max filters', () => {
  it('targetBonus: 0 without a target, peaks on it, never negative', () => {
    expect(targetBonus(300)).toBe(0);
    expect(targetBonus(300, 300)).toBe(TARGET_WEIGHT);
    expect(targetBonus(450, 300)).toBeLessThan(targetBonus(330, 300));
    expect(targetBonus(2000, 300)).toBe(0);
  });
  it('no target: numbers unchanged; a target never lets a concept past the max', () => {
    const b = base(900), t = setLimitTarget(b, 'constraints.budget', 400);
    const w0 = briefToWants(b), r0 = suggestSetups(w0, P, 'cm', NOW), r1 = suggestSetups({ ...w0, startupTarget: 400 }, P, 'cm', NOW);
    expect(r1.proposals.every(p => p.totals.startupUsd <= 900)).toBe(true);
    const gap = (r: typeof r0) => Math.abs(r.proposals[0].totals.startupUsd - 400);
    expect(gap(r1)).toBeLessThanOrEqual(gap(r0));
    expect(t).toBeDefined();
  });
});
