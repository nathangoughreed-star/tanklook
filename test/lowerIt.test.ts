import { describe, expect, it } from 'vitest';
import { Store } from '../src/scene/store';
import { defaultProfile } from '../src/demand';
import { lowerIt } from '../src/shell/logic/lowerIt';
import { fmtMin, fmtMinDelta, roundMinWk } from '../src/units';

describe('R137 minutes are shown in 5-minute steps', () => {
  it('rounds to 5, never under 5, hours past 60', () => {
    expect([roundMinWk(1), roundMinWk(52), roundMinWk(58)]).toEqual([5, 50, 60]);
    expect(fmtMin(2)).toBe('5 min'); expect(fmtMin(56)).toBe('55 min'); expect(fmtMin(60)).toBe('1 h'); expect(fmtMin(77)).toBe('1 h 15 min');
    expect(fmtMinDelta(-12)).toBe('-10 min'); expect(fmtMinDelta(3)).toBe('+5 min'); expect(fmtMinDelta(1)).toBe('0 min');
  });
});
describe('R138 Lower it?', () => {
  it('lists only what applies, in 5-minute steps, biggest saving first; nothing is applied', () => {
    const st = new Store(), before = JSON.stringify(st.tank), items = lowerIt(st.tank, defaultProfile());
    expect(JSON.stringify(st.tank)).toBe(before);
    for (const i of items) { expect(i.saves % 5).toBe(0); expect(i.saves).toBeGreaterThanOrEqual(5); }
    expect(items.map(i => i.saves)).toEqual([...items.map(i => i.saves)].sort((a, b) => b - a));
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
  });
});
