// Essential care conditions are evaluated apart from the group count (lane RF; research/rules-spec.md section 6, first finding).
import { describe, expect, it } from 'vitest';
import { GROUPS } from '../src/data/groups';
import { NEEDS } from '../src/data/careNeeds';
import { notesOf } from '../src/ui/stockPlanLogic';

describe('care needs', () => {
  it('the mandarin feeding and maturity lines show at every count, whatever the group band', () => {
    for (const n of [1, 2, 3]) {
      const t = notesOf({ id: 'mandarin', n }).needs.map(x => x.text).join(' | ');
      expect(t).toMatch(/copepods/);
      expect(t).toMatch(/mature reef/);
    }
  });
  it('a species with needs keeps them in a favourable band', () => {
    const nt = notesOf({ id: 'hatchet', n: 10 });
    expect(nt.band).not.toBe('avoid');
    expect(nt.needs.some(x => /lid/.test(x.text))).toBe(true);
  });
  it('no care condition is left inside a group band message', () => {
    for (const id of Object.keys(NEEDS)) for (const m of Object.values(GROUPS[id]?.msg ?? {})) expect(m).not.toMatch(/pod|lid|shell/i);
  });
});

describe('group-size line beside the tank (lane RF item 2)', () => {
  it('is labelled as the group size, and a failing tank holds it (9 dwarf frogs in a 10 gal never read "Great" as the verdict)', async () => {
    const { planFor, groupLineIn } = await import('../src/ui/stockPlanLogic');
    const { tankOptions, tankLabel } = await import('../src/scene/tankfit');
    const p = { id: 'adf', n: 9 }, t = tankOptions([{ species: 'adf', n: 9 }]).find(o => tankLabel(o.tank, 'in').includes('10 gal'))!;
    const plan = planFor([p], t.tank.id), nt = notesOf(p);
    expect(nt.line).toMatch(/^Group size: /);
    expect(plan.problem).toBeTruthy();
    const g = groupLineIn(nt, plan);
    expect(g.held).toBe(true);
    expect(g.text).toMatch(/group only: this tank fails \(too full/);
    const roomy = tankOptions([{ species: 'adf', n: 9 }]).find(o => !o.fails.length)!;
    expect(groupLineIn(nt, planFor([p], roomy.tank.id)).held).toBe(false);
  });
});
