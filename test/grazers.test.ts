// Grazer check (S168, Nathan 2026-10-21): past what a tank's algae feeds, an algae eater gets "feed or keep fewer" advice; the limit is
// the most generous stated guideline (research/sourcing/R5-grazers.json) and feeding never raises it.
import { describe, expect, it } from 'vitest';
import { GRAZE, grazerShort, grazersFed } from '../src/data/grazers';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import { defaultSetup } from '../src/scene/defaults';
import { IN, volume } from '../src/scene/physics';

const GAL = 3.785;
describe('grazers', () => {
  it('the limits follow the stated guidelines', () => {
    expect(grazersFed('turbo', 20 * GAL)).toBe(3);      // 2-3 per 20-30 gal
    expect(grazersFed('nerite', 20 * GAL)).toBe(4);     // 1 per 5 gal
    expect(grazersFed('oto', 20 * GAL)).toBe(6);        // 3-6 in a 20 gal
    expect(grazersFed('amano', 10 * GAL)).toBe(5);      // 1 per 2 gal
    expect(grazersFed('nerite', 5)).toBe(1);            // a tiny tank still feeds one
    expect(grazersFed('bristlenose', 200)).toBeUndefined(); // no density stated: its minimum tank stands
    expect(Object.keys(GRAZE).sort()).toEqual(['amano', 'nerite', 'oto', 'turbo']);
  });
  it('over the limit: feed or keep fewer; at or under it: nothing', () => {
    expect(grazerShort('turbo', 3, 20 * GAL)).toBeNull();
    const w = grazerShort('turbo', 4, 20 * GAL)!;
    expect(w).toMatch(/about 3/); expect(w).toMatch(/nori or algae wafers/); expect(w).toMatch(/keep 3/);
    expect(grazerShort('trumpet', 50, 20)).toBeNull();
  });
  it('the cost panel lists it and counts it once', () => {
    const S = defaultSetup(); S.tank = { ...S.tank, L: 24 * IN, D: 12 * IN, H: 16 * IN }; S.water.on = true; S.water.salt = false;
    const most = grazersFed('nerite', volume(S.tank).litres)!;
    const fish = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, species: 'nerite', x: 100, y: 0, depth: 50, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
    S.fish = fish(most) as typeof S.fish;
    const ok = demandOf(S, defaultProfile(), { now: Date.parse('2026-10-21') });
    expect(ok.warnings.some(w => /algae:/.test(w))).toBe(false);
    S.fish = fish(most + 2) as typeof S.fish;
    const over = demandOf(S, defaultProfile(), { now: Date.parse('2026-10-21') });
    expect(over.warnings.filter(w => /algae:/.test(w))).toHaveLength(1);
  });
});
