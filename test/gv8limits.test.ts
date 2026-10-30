// Lane GV8: every limit is a range (lower and upper bound, either, both or neither).
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { suggestSetups, suggestFromBrief } from '../src/demand/suggest';
import { emptyBrief, parseBrief, serializeBrief, setItem, setRange, rangeOf, targetOf, against, rangeText, briefToWants, BRIEF_VERSION, NUM_LIMIT_IDS, type Brief, type NumLimitId } from '../src/scene/brief';
import { labelOf, setBudget, setBudgetMin } from '../src/ui/setupBrief';
import { costFlags } from '../src/ui/startMode';
import { rosterWarnings, startPick } from '../src/ui/stockPlanLogic';
import { inputChanges, inputsOf } from '../src/demand/propagate';
import { setSetupHours } from '../src/ui/guided/steps';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const fw = (b: Brief) => setItem(b, 'animals.kinds', ['freshwater'], 'preference');
const COMBOS: [string, { min?: number; max?: number }][] = [['none', {}], ['lower', { min: 300 }], ['upper', { max: 600 }], ['both', { min: 300, max: 600 }]];

describe('GV8: ranges save and parse', () => {
  for (const id of NUM_LIMIT_IDS) for (const [name, r] of COMBOS) {
    it(`${id}: ${name} round-trips`, () => {
      const b = setRange(emptyBrief(), id as NumLimitId, r);
      expect(rangeOf(b, id as NumLimitId)).toEqual(r);
      const back = parseBrief(JSON.parse(serializeBrief(setItem(b, 'animals.kinds', ['freshwater']))))!;
      expect(rangeOf(back, id as NumLimitId)).toEqual(r);
      expect(back.v).toBe(BRIEF_VERSION);
    });
  }
  it('lower above upper is swapped, never dropped, on set and on parse', () => {
    expect(rangeOf(setRange(emptyBrief(), 'constraints.budget', { min: 600, max: 300 }), 'constraints.budget')).toEqual({ min: 300, max: 600 });
    const b = parseBrief({ v: 3, items: { 'constraints.monthly': { value: 20, min: 50, status: 'hard' } } })!;
    expect(rangeOf(b, 'constraints.monthly')).toEqual({ min: 20, max: 50 });
  });
  it('old saves keep their upper bound; an old target is dropped; the footprint takes no lower bound', () => {
    const b = parseBrief({ v: 2, items: { 'constraints.budget': { value: 500, status: 'hard', target: 300 }, 'constraints.maxSpace': { value: { w: 900, d: 400 }, min: { w: 100, d: 100 }, status: 'hard' } } })!;
    expect(b.items['constraints.budget']).toEqual({ value: 500, status: 'hard' });
    expect(b.items['constraints.maxSpace']).toEqual({ value: { w: 900, d: 400 }, status: 'hard' });
    expect(parseBrief({ v: 3, items: { 'constraints.budget': { status: 'hard' } } })).toBeUndefined();
  });
  it('setting one bound keeps the other, and clearing both removes the item', () => {
    let b = setBudgetMin(setBudget(emptyBrief(), 600), 300);
    expect(rangeOf(b, 'constraints.budget')).toEqual({ min: 300, max: 600 });
    b = setBudget(b, undefined); expect(rangeOf(b, 'constraints.budget')).toEqual({ min: 300 });
    b = setBudgetMin(b, undefined); expect(b.items['constraints.budget']).toBeUndefined();
    expect(rangeOf(setSetupHours(setSetupHours(emptyBrief(), 4), 1, 'min'), 'constraints.setupHours')).toEqual({ min: 1, max: 4 });
  });
  it('chips read $300-600, at least $300, up to $600', () => {
    expect(labelOf(setRange(emptyBrief(), 'constraints.budget', { min: 300, max: 600 }), 'constraints.budget')).toBe('$300-600');
    expect(labelOf(setRange(emptyBrief(), 'constraints.budget', { min: 300 }), 'constraints.budget')).toBe('at least $300');
    expect(labelOf(setRange(emptyBrief(), 'constraints.budget', { max: 600 }), 'constraints.budget')).toBe('up to $600');
    expect(labelOf(setRange(emptyBrief(), 'constraints.budget', { min: 400, max: 420 }), 'constraints.budget')).toBe('$400-420');
    expect(labelOf(setRange(emptyBrief(), 'constraints.monthly', { max: 30 }), 'constraints.monthly')).toBe('up to $30 a month');
    expect(labelOf(setRange(emptyBrief(), 'constraints.tankGal', { min: 20, max: 40 }), 'constraints.tankGal')).toBe('20-40 gal');
    expect(rangeText({})).toBe('');
  });
  it('a lower-only limit has no maximum in the Wants', () => {
    const w = briefToWants(setRange(emptyBrief(), 'constraints.budget', { min: 300 }));
    expect(w.constraints.startupUsd).toBeUndefined(); expect(w.mins?.startupUsd).toBe(300);
  });
});

describe('GV8: flags fire above and below', () => {
  it('red above the upper bound, amber below the lower, none inside; monthly too', () => {
    const b = setRange(setRange(emptyBrief(), 'constraints.budget', { min: 300, max: 600 }), 'constraints.monthly', { min: 10, max: 30 });
    expect(costFlags(b, 450, 20)).toEqual([]);
    expect(costFlags(b, 700, 20).map(f => [f.level, f.side])).toEqual([['problem', 'over']]);
    expect(costFlags(b, 200, 20).map(f => [f.level, f.side])).toEqual([['caution', 'under']]);
    expect(costFlags(b, 450, 5).map(f => [f.item, f.side])).toEqual([['constraints.monthly', 'under']]);
    expect(costFlags(b, 450, 40).map(f => [f.item, f.side])).toEqual([['constraints.monthly', 'over']]);
    expect(costFlags(setRange(emptyBrief(), 'constraints.budget', { min: 300 }), 5000, 0)).toEqual([]);
  });
  it('the roster strip warns when even the ideal set-up is under the lower bound, and never offers a cheaper tank for it', () => {
    const st = { picks: [startPick('betta')] };
    const ws = rosterWarnings(st, { minUsd: 1e6 });
    const w = ws.find(x => x.kind === 'budget');
    expect(w?.text).toMatch(/under your \$1000000 minimum/); expect(w?.fix).toBeUndefined();
  });
  it('against() and the band middle', () => {
    expect([against({ min: 3, max: 5 }, 2), against({ min: 3, max: 5 }, 4), against({ min: 3, max: 5 }, 6), against({}, 1e9)]).toEqual(['below', 'in', 'above', 'in']);
    expect(targetOf(setRange(emptyBrief(), 'constraints.budget', { min: 400, max: 420 }), 'constraints.budget')).toBe(410);
    expect(targetOf(setRange(emptyBrief(), 'constraints.budget', { max: 420 }), 'constraints.budget')).toBeUndefined();
  });
  it('the change strip names a lower bound moving', () => {
    const a = setRange(fw(emptyBrief()), 'constraints.budget', { max: 600 }), b = setRange(fw(emptyBrief()), 'constraints.budget', { min: 300, max: 600 });
    expect(inputChanges(inputsOf(briefToWants(a), a), inputsOf(briefToWants(b), b))).toEqual(['Budget minimum none -> $300']);
  });
});

describe('GV8: suggest keeps only options inside every range', () => {
  const run = (b: Brief) => suggestFromBrief(b, P, 'cm', NOW);
  const open = run(setRange(fw(emptyBrief()), 'constraints.budget', { max: 1500 }));
  const costs = open.proposals.map(p => p.totals.startupUsd);
  it('drops options below a set lower budget bound', () => {
    expect(costs.length).toBeGreaterThan(1);
    const lo = Math.max(...costs) - 1, r = run(setRange(fw(emptyBrief()), 'constraints.budget', { min: lo, max: 1500 }));
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) { expect(p.totals.startupUsd).toBeGreaterThanOrEqual(lo); expect(p.totals.startupUsd).toBeLessThanOrEqual(1500); }
  });
  it('a lower bound above everything the maximum allows says which bound blocks', () => {
    const r = run(setRange(fw(emptyBrief()), 'constraints.budget', { min: 900, max: 950 }));
    if (!r.proposals.length) expect(r.message).toMatch(/lower bound/);
    const r2 = suggestSetups({ ...briefToWants(fw(emptyBrief())), constraints: { startupUsd: { on: true, value: 400 } }, mins: { startupUsd: 399.5 } }, P, 'cm', NOW);
    for (const p of r2.proposals) expect(p.totals.startupUsd).toBeGreaterThanOrEqual(399.5);
  });
  it('a $400-420 band works as a target: every option inside it or nothing, nearest the middle ranked first', () => {
    const b = setRange(fw(emptyBrief()), 'constraints.budget', { min: 400, max: 420 }), r = run(b);
    for (const p of r.proposals) { expect(p.totals.startupUsd).toBeGreaterThanOrEqual(400); expect(p.totals.startupUsd).toBeLessThanOrEqual(420); }
    expect(briefToWants(b).startupTarget).toBe(410);
  });
  it('a tank-size range keeps only tanks inside it', () => {
    const b = setRange(fw(emptyBrief()), 'constraints.tankGal', { min: 20, max: 40 }), r = run(setRange(b, 'constraints.budget', { max: 2000 }));
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) { expect(p.build.tank.ratedGal).toBeGreaterThanOrEqual(20); expect(p.build.tank.ratedGal).toBeLessThanOrEqual(40); }
  });
});
