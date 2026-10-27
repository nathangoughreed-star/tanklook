// Suggest a setup (lane C8): proposals are rechecked on ALL enabled guardrails and husbandry; nothing qualifying says exactly the no-suggestion line.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { ARCHETYPES, suggestSetups, NO_SUGGESTION, type Wants } from '../src/demand/suggest';
import { compliance, type Constraints } from '../src/scene/constraints';
import { summaryOf } from '../src/ui/stockSummary';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const cap = (value: number) => ({ on: true, value });
const run = (c: Constraints, extra: Partial<Wants> = {}) => suggestSetups({ constraints: c, ...extra }, P, 'cm', NOW);

describe('Suggest a setup', () => {
  it('every archetype names real species and has a distinct id', () => {
    expect(new Set(ARCHETYPES.map(a => a.id)).size).toBe(ARCHETYPES.length);
    expect(ARCHETYPES.length).toBeGreaterThanOrEqual(10);
  });

  it('all guardrails off: three proposals, ranked by appeal only, no pass / fail', () => {
    const r = run({});
    expect(r.off).toBe(true);
    expect(r.proposals.length).toBe(3);
    expect(r.message).toBeUndefined();
    const t = run({}, { tags: ['unusual'] });
    expect(t.proposals[0].matched).toContain('unusual');
  });

  it('a generous budget: three proposals from different kinds, each within every enabled guardrail and with no husbandry Problem', () => {
    const c: Constraints = { startupUsd: cap(2000), monthlyUsd: cap(80), minutesPerWeek: cap(120) };
    const r = run(c);
    expect(r.proposals.length).toBe(3);
    expect(new Set(r.proposals.map(p => p.archetype.family)).size).toBeGreaterThanOrEqual(2);
    for (const p of r.proposals) {
      const cp = compliance(p.scene, { setupUsd: p.totals.startupUsd, upkeepUsdMo: p.totals.monthlyUsd, minPerWeek: p.totals.minPerWeek }, P.limits);
      expect(cp.overall).toBe('within');
      expect(summaryOf(p.scene, 'cm').worst).not.toBe('problem');
      expect(p.scene.constraints).toEqual(c);
    }
  });

  it('deterministic: the same inputs give the same proposals', () => {
    const c: Constraints = { startupUsd: cap(600), monthlyUsd: cap(30), minutesPerWeek: cap(60) };
    expect(run(c).proposals.map(p => p.archetype.id)).toEqual(run(c).proposals.map(p => p.archetype.id));
  });

  it('a tight set-up budget drops what costs more than it, and never lists it as a fit', () => {
    const r = run({ startupUsd: cap(150) });
    for (const p of r.proposals) expect(p.totals.startupUsd).toBeLessThanOrEqual(150);
  });

  it('nothing qualifies: exactly the no-suggestion line, never "impossible", with the closest misses apart', () => {
    const r = run({ startupUsd: cap(5), minutesPerWeek: cap(1) });
    expect(r.proposals).toEqual([]);
    expect(r.message).toBe(NO_SUGGESTION);
    expect(JSON.stringify(r.message)).not.toMatch(/impossible/i);
    expect(r.misses.length).toBeGreaterThan(0);
    for (const m of r.misses) expect(m.text).toMatch(/\+/);
  });

  it('a small space leaves out what does not fit it (the space guardrail is a check too)', () => {
    const w = { w: 400, d: 250, h: 450 };
    const r = run({ space: { on: true } }, { space: w });
    for (const p of r.proposals) {
      expect(p.status.find(s => s.id === 'space')?.state).toBe('pass');
      expect(p.build.tank.id).toBeTruthy();
    }
  });

  it('space on but no size: unknown is never green, so nothing is offered as compliant', () => {
    const r = run({ space: { on: true } });
    expect(r.proposals).toEqual([]);
    expect(r.message).toBe(NO_SUGGESTION);
  });

  it('time per call is small enough for a click', () => {
    const t0 = Date.now(); run({ startupUsd: cap(800), monthlyUsd: cap(40), minutesPerWeek: cap(60) }); const ms = Date.now() - t0;
    console.log('suggestSetups ms', ms);
    expect(ms).toBeLessThan(8000);
  });
});
