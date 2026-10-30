// Narrowing (lane GV6): variations of a pick, one axis each, every one inside the brief's max limits; Back restores the previous round; taste from picks and passes.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { changedAxes, narrowBack, narrowPick, narrowStart, narrowTaste, picksOf, suggestSetups, variationsOf, type Option, type Wants } from '../src/demand/suggest';
import { compliance, effectiveLimits } from '../src/scene/constraints';
import { summaryOf } from '../src/ui/stockSummary';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const W: Wants = { kinds: ['freshwater'], constraints: { startupUsd: { on: true, value: 600 }, monthlyUsd: { on: true, value: 40 }, minutesPerWeek: { on: true, value: 60 } } };
const round1 = suggestSetups(W, P, 'cm', NOW).proposals;
const anchor = round1[0];
const vars = variationsOf(anchor, W, P, 'cm', NOW);

describe('variations of a pick', () => {
  it('round 1 has options and round 2 has 3-4 variations', () => {
    expect(round1.length).toBeGreaterThanOrEqual(3);
    expect(vars.length).toBeGreaterThanOrEqual(3);
    expect(vars.length).toBeLessThanOrEqual(4);
  });
  it('each variation differs from the anchor in exactly its labelled axis, one axis per variation', () => {
    for (const v of vars) expect(changedAxes(anchor, v)).toEqual([v.variation!.axis]);
    expect(new Set(vars.map(v => v.variation!.axis)).size).toBe(vars.length);
  });
  it('every variation passes the brief\'s max limits and the welfare rule', () => {
    for (const v of vars) {
      const c = compliance(v.scene, { setupUsd: v.totals.startupUsd, upkeepUsdMo: v.totals.monthlyUsd, minPerWeek: v.totals.minPerWeek }, effectiveLimits(v.scene, P.limits), 'cm');
      expect(c.overall).toBe('within');
      expect(v.totals.startupUsd).toBeLessThanOrEqual(600);
      expect(summaryOf(v.scene, 'cm').cats.some(x => x.level === 'problem' || x.level === 'caution')).toBe(false);
    }
  });
  it('the delta is the variation minus the anchor', () => {
    for (const v of vars) expect(v.variation!.delta.startupUsd).toBe(v.totals.startupUsd - anchor.totals.startupUsd);
  });
  it('locked animals are never varied, an existing tank never resized', () => {
    const locked: Wants = { ...W, animals: anchor.build.animals, ownTank: anchor.build.tank };
    const a = suggestSetups(locked, P, 'cm', NOW).proposals[0];
    expect(a).toBeDefined();
    const v = variationsOf(a, locked, P, 'cm', NOW);
    expect(v.some(x => x.variation!.axis === 'stocking' || x.variation!.axis === 'size')).toBe(false);
    for (const x of v) expect(changedAxes(a, x)).toEqual([x.variation!.axis]);
  });
});

describe('rounds', () => {
  it('a pick anchors the next round; Back restores the previous round unchanged; repeatable', () => {
    let calls = 0;
    const vary = (a: Option) => { calls++; return a === anchor ? vars : vars.slice(0, 2); };
    const n0 = narrowStart(round1), n1 = narrowPick(n0, 0, vary);
    expect(n1.rounds).toHaveLength(2);
    expect(n1.rounds[1].anchor).toBe(anchor);
    expect(n1.rounds[1].options).toBe(vars);
    const n2 = narrowPick(n1, 1, vary);
    expect(picksOf(n2)).toEqual([anchor, vars[1]]);
    const b1 = narrowBack(n2);
    expect(b1.rounds[1]).toBe(n1.rounds[1]);
    expect(narrowBack(b1).rounds[0]).toBe(n0.rounds[0]);
    expect(narrowBack(narrowBack(b1))).toEqual(narrowBack(b1)); // round 1 has no Back
    expect(calls).toBe(2);
  });
  it('a pick feeds taste: a pass per other look shown, then the pick', () => {
    const ev = narrowTaste(round1, 0), pick = round1[0].build.finish?.style;
    if (pick) expect(ev[ev.length - 1]).toEqual({ style: pick, kind: 'pick' });
    for (const e of ev.slice(0, -1)) { expect(e.kind).toBe('reject'); expect(e.style).not.toBe(pick); }
  });
});


describe('make it mine', () => {
  it('applies the option to the tank, keeps the brief, and Undo brings the old tank back', async () => {
    const { Store } = await import('../src/scene/store');
    const { defaultScene } = await import('../src/scene/defaults');
    const { makeItMine } = await import('../src/ui/suggest');
    const st = new Store(defaultScene()), was = structuredClone(st.scene), brief = st.tank.brief, v = vars[0];
    makeItMine(st, v);
    expect(st.scene.name).toBe(v.archetype.title);
    expect(st.tank.tank.L).toBe(v.build.setup.tank.L);
    expect(st.tank.fish.map(f => f.species).sort()).toEqual(v.build.animals.flatMap(a => Array(a.n).fill(a.species)).sort());
    // lane GV10: the brief is kept, with the chosen tank in its Tank row
    const { emptyBrief, setTank } = await import('../src/ui/setupBrief');
    expect(st.tank.brief).toEqual(setTank(brief ?? emptyBrief(), { id: v.build.tank.id }));
    st.undo();
    expect(st.scene.name).toBe(was.name);
    expect(st.scene.tanks.map(t => [t.tank, t.fish.length, t.items.length])).toEqual(was.tanks.map(t => [t.tank, t.fish.length, t.items.length]));
  });
});
