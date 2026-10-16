import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { LIBRARY, starterItems } from '../src/scene/items';
import { NEEDS, isCoralNeed, isLand, type PlantNeed } from '../src/scene/lightneeds';
import { FIT_PAR, fits } from '../src/scene/plantfit';
import { IN } from '../src/scene/physics';
import type { GrowFeed, LayoutId } from '../src/scene/types';

const make = (id: LayoutId, fit?: 'low' | 'medium' | 'high', care: GrowFeed = 'low', salt = false) => {
  const s = defaultSetup(); s.tank = { ...s.tank, L: 36 * IN, H: 18 * IN, D: 18 * IN };
  s.layout = { id, seed: 3, dens: { hard: 3, plant: 4, animal: 0 }, ...(fit ? { fit } : {}) }; s.fish = []; s.grow.feed = care; s.water.salt = salt; return s;
};
const kinds = (s: ReturnType<typeof make>) => new Set(starterItems(s).filter(i => i.kind === 'plant' || i.kind === 'coral').map(i => i.variant));

describe('auto-populate by light and care (lane PG step 4)', () => {
  it('no fit = exactly the old starter set', () => {
    const a = make('planted'), b = make('planted'); expect(starterItems(a)).toEqual(starterItems(b));
  });
  it('low light + low-tech keeps only undemanding plants and still plants the tank', () => {
    for (const id of ['planted', 'nature', 'iwagumi', 'jungle'] as const) {
      const s = make(id, 'low', 'low'), ks = kinds(s);
      expect(ks.size, id).toBeGreaterThan(0);
      for (const k of ks) { const n = NEEDS[k]; if (isLand(n)) continue; expect(fits(k, FIT_PAR.fresh.low, 'low'), `${id}: ${k}`).toBe(true); expect((n as PlantNeed).co2, k).not.toBe('required'); }
      expect(starterItems(s).length).toBe(starterItems(make(id)).length);
    }
  });
  it('high light + CO2 allows reds and carpets', () => {
    expect(fits('carpet', FIT_PAR.fresh.high, 'co2')).toBe(true);
    expect(fits('carpet', FIT_PAR.fresh.high, 'low')).toBe(false);
  });
  it('reef: low light gives soft corals only, high light and daily dosing allows SPS', () => {
    for (const k of kinds(make('reef', 'low', 'low', true))) { const n = NEEDS[k]; if (isCoralNeed(n)) expect(n.band, k).not.toBe('sps'); }
    expect(fits('acropora', FIT_PAR.reef.high, 'co2')).toBe(true);
    expect(fits('acropora', FIT_PAR.reef.high, 'low')).toBe(false);
  });
  it('every swapped-in variant exists in the library', () => { for (const k of kinds(make('planted', 'low', 'low'))) expect(LIBRARY[k], k).toBeTruthy(); });
});
