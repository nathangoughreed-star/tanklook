import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { hardTruths } from '../src/scene/plan';
import { filterState, withChoice } from '../src/scene/tech';
import { notesOf, planFor } from '../src/ui/stockPlanLogic';
import type { TankSetup } from '../src/scene/types';

// S207 review findings fixed in lane CF
const G75 = (tech?: TankSetup['tech']): TankSetup => {
  const S = structuredClone(parseScene(SCENES.planted).scene.tanks[0]);
  S.tank = { ...S.tank, L: 1219, D: 457, H: 533 }; S.fish = []; delete S.tech;
  if (tech) S.tech = tech;
  return S;
};
const roomLine = (S: TankSetup, species: string) => hardTruths(S, [{ species, n: 1 }], false).map(t => t.text).find(t => t.includes('room temperature'));

describe('CF: S207 review fixes', () => {
  it('the no-heater check reads the room the user set, and says too warm when it is', () => {
    expect(roomLine(G75(), 'discus')).toMatch(/too cold at room temperature \(21 C\)/);
    expect(roomLine(G75({ rows: {}, roomC: 29 }), 'discus')).toBeUndefined();
    expect(roomLine(G75({ rows: {}, roomC: 30 }), 'goldfish')).toMatch(/too warm at room temperature \(30 C\)/);
  });
  it('choosing a filter in the Tech menu clears the "no filter" tick', () => {
    const S = G75({ rows: { filter: 'none' }, filters: [], filterless: true });
    expect(filterState(S)).toBe('filterless');
    const t = withChoice(S, 'filter', 'hob');
    expect(t.filterless).toBeUndefined();
    expect(filterState({ ...S, tech: t })).toBe('chosen');
    expect(withChoice(S, 'filter', 'none').filterless).toBe(true);
  });
  it('an all-female group is not "short on females"', () => {
    const r = notesOf({ id: 'guppy', n: 0, f: 4 }).ratio ?? '';
    expect(r).not.toMatch(/short on females/);
    expect(r).toMatch(/no males/);
    expect(notesOf({ id: 'guppy', n: 3, f: 1 }).ratio).toMatch(/short on females/);
  });
  it('planFor answers the same picks once', () => {
    const a = planFor([{ id: 'neon', n: 8 }]);
    expect(planFor([{ id: 'neon', n: 8 }])).toBe(a);
    expect(planFor([{ id: 'neon', n: 9 }])).not.toBe(a);
  });
});
