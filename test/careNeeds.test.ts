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
