// UI2 P6 (lane S1, 2026-11-13): the habitat helpers live in ui/logic/habitat.ts; the old tile re-exports the same functions.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { stockingOf } from '../src/scene/stocking';
import { tankMinimum } from '../src/scene/tankMin';
import * as H from '../src/ui/logic/habitat';
import * as FT from '../src/ui/fullnessTile';
import type { TankSetup } from '../src/scene/types';

const ex = (name: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[name])).scene; return sc.tanks[sc.active]; };
const withFish = () => Object.keys(SCENES).map(ex).find(S => S.water.on && stockingOf(S).contributors.length >= 2)!;

describe('habitat helpers (P6)', () => {
  it('the old tile re-exports the very same functions (one copy)', () => {
    for (const k of ['bar', 'topBy', 'minBar', 'topMin', 'tankSizeLine', 'spaceReason', 'tileState', 'mg', 'nitrogenRows', 'waterChangeText', 'forkDue', 'fromUnits', 'overLine'] as const)
      expect(FT[k]).toBe(H[k]);
    expect(FT.NEAR_FULL).toBe(H.NEAR_FULL);
  });
  it('bar grades ok / near / over', () => {
    expect(H.bar(10).level).toBe('ok');
    expect(H.bar(H.NEAR_FULL).level).toBe('near');
    expect(H.bar(150)).toMatchObject({ level: 'over', fill: 100 });
  });
  it('topBy lists the biggest share first, shares summing to at most 1', () => {
    const r = stockingOf(withFish()), t = H.topBy(r, 'space', 5);
    expect(t.length).toBeGreaterThan(0);
    for (let i = 1; i < t.length; i++) expect(t[i - 1].share).toBeGreaterThanOrEqual(t[i].share);
    expect(t.reduce((s, x) => s + x.share, 0)).toBeLessThanOrEqual(1 + 1e-9);
  });
  it('minBar uses a word, not a percent; an unassessed tank says so', () => {
    const m = tankMinimum(withFish());
    expect(Object.values(H.MIN_WORD)).toContain(H.minBar(m).text);
    expect(H.minBar({ ...m, percent: Infinity }).text).toBe('Not assessed');
  });
  it('topMin prints inches in inch scenes', () => {
    const t = H.topMin(tankMinimum(withFish()), 'in');
    expect(t.length).toBeGreaterThan(0);
    expect(t.some(x => /"/.test(x.note ?? '') || /no minimum/.test(x.note ?? '') || /gal/.test(x.note ?? ''))).toBe(true);
  });
  it('tileState shows for a wet stocked tank and its head is the space bar or worse', () => {
    const S = withFish(), st = H.tileState(S, stockingOf(S), 'in');
    expect(st.show).toBe(true);
    expect(['ok', 'near', 'over']).toContain(st.head.level);
    expect(H.tankSizeLine(S, stockingOf(S), 'in')).toMatch(/^Tank .* in, .*gal/);
  });
  it('spaceReason is empty with no animals', () => {
    const S = withFish();
    expect(H.spaceReason(stockingOf({ ...S, fish: [] }))).toBe('');
  });
  it('overLine and the format helpers', () => {
    expect(H.overLine({ fits: false, over: { w: 254, d: 0, h: 0 } } as any, 'in')).toBe('10" too long for your space.');
    expect(H.fmtBox(254, 127, 'in')).toBe('10 × 5 in');
    expect(H.fmtLen(100, 'cm')).toBe('10 cm');
    expect(H.forkDue(true, false)).toBe(true);
    expect(H.forkDue(undefined, false)).toBe(false);
    expect(H.fromUnits(10, 'in')).toBe(254);
  });
  it('waterChangeText and mg format', () => {
    expect(H.mg(0.0012)).toBe('1.2 mg');
    expect(H.mg(0.05)).toBe('50 mg');
    const r = stockingOf(withFish());
    expect(H.nitrogenRows(r.nitrogen).at(-1)!.label).toBe('Nitrate-only water change');
  });
});
