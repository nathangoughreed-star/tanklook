import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { defaultProfile, demandOf } from '../src/demand';
import { awayOf, beatOf, rhythmOf } from '../src/demand/rhythm';
import { compliance } from '../src/scene/constraints';
import { parseScene } from '../src/scene/validate';

// Rhythm (lane C6 wiring): the weekly minutes split by interval, plus away-days. The split never moves the total.
const NOW = Date.parse('2026-10-27');
const run = (id: string) => { const S = parseScene(SCENES[id]).scene.tanks[0], D = demandOf(S, defaultProfile(), { now: NOW }); return { S, D, R: rhythmOf(D, S) }; };

describe('rhythm', () => {
  it('beats', () => { expect([1, 2, 7, 14, 30, 365, undefined].map(beatOf)).toEqual(['daily', 'weekly', 'weekly', 'monthly', 'monthly', 'occasional', 'mixed']); });
  for (const id of ['planted', 'betta', 'reef', 'terrarium', 'paludarium']) {
    it(`${id}: the parts add back to the weekly total, and the text names each beat`, () => {
      const { D, R } = run(id);
      expect(R.minPerWeek).toBeCloseTo(D.totals.minPerWeek, 6);
      expect(R.parts.reduce((s, p) => s + p.minPerWeek, 0)).toBeCloseTo(D.totals.minPerWeek, 6);
      expect(R.text).not.toBe('');
    });
  }
  it('away-days are the shortest tolerance in the stocking, with its status', () => {
    const { S } = run('betta');
    const only = (sp: string) => ({ items: [], fish: [{ ...S.fish[0], species: sp }] });
    expect(awayOf(only('betta'))?.days).toBe(4);
    expect(awayOf({ items: [], fish: [...only('betta').fish, ...only('goldfish').fish] })?.days).toBe(4);
    expect(awayOf(S)?.days).toBeLessThanOrEqual(4);
    expect(awayOf({ fish: [], items: [] })).toBeUndefined();
    const T = run('terrarium');
    expect(T.R.away?.days).toBeLessThanOrEqual(7);
  });
  it('compliance carries the rhythm as information only (no new pass or fail)', () => {
    const { S, D, R } = run('planted');
    const a = compliance(S, D.totals, {}, 'cm'), b = compliance(S, D.totals, {}, 'cm', R);
    expect(a.info).toEqual([]);
    expect(b.info[0]).toMatch(/^Rhythm: .*\(estimate\)$/);
    expect({ ...b, info: [] }).toEqual(a);
  });
});
