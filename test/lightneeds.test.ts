import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/scene/items';
import { FRESH_RANGE, FRESH_TIERS, NEEDS, REEF_TIERS, isCoralNeed, isLand, lightVerdict, parRange } from '../src/scene/lightneeds';

describe('light needs', () => {
  it('tags every plant and coral variant, and nothing else', () => {
    const want = Object.entries(LIBRARY).filter(([, v]) => v.kind === 'plant' || v.kind === 'coral').map(([k]) => k).sort();
    expect(Object.keys(NEEDS).sort()).toEqual(want);
  });
  it('freshwater plants carry fresh bands, corals reef bands, salt flag agrees', () => {
    for (const [k, n] of Object.entries(NEEDS)) {
      if (isLand(n)) continue;
      expect(isCoralNeed(n), k).toBe(LIBRARY[k].kind === 'coral');
      const [lo, hi] = parRange(n);
      expect(lo, k).toBeLessThan(hi);
    }
  });
  it('tiers are contiguous and the bands come from them', () => {
    for (let i = 1; i < FRESH_TIERS.length; i++) expect(FRESH_TIERS[i].lo).toBe(FRESH_TIERS[i - 1].hi);
    expect(REEF_TIERS.length).toBe(4);
    expect(FRESH_RANGE.low[1]).toBe(50);
  });
  it('verdicts', () => {
    expect(lightVerdict('anubias', 20)).toBe('fine');
    expect(lightVerdict('anubias', 90)).toBe('bright');
    expect(lightVerdict('carpet', 25)).toBe('dim');
    expect(lightVerdict('acropora', 90)).toBe('dim');
    expect(lightVerdict('pothos', 5)).toBe('fine');
  });
});
