import { describe, expect, it } from 'vitest';
import { LOOK_TILES, animalsFor, defaultSize, isLandLook, lookOption, lookSizes, lookWithAnimals } from '../src/scene/looks';
import { allowedStyles } from '../src/scene/scapes';

describe('create a look', () => {
  it('every tile has size chips and a default size', () => {
    for (const s of LOOK_TILES) { const z = lookSizes(s); expect(z.length).toBeGreaterThan(1); expect(z).toContain(defaultSize(s)); }
  });
  it('a look in an empty tank is priced and has no animals', () => {
    for (const s of ['nature', 'reef', 'rainforest'] as const) {
      const o = lookOption(s, defaultSize(s), 'live', 0);
      expect(o.setup.fish).toHaveLength(0); expect(o.setup.layout.id).toBe(s); expect(o.setupUsd).toBeGreaterThan(0);
      expect(o.setup.water.on).toBe(!isLandLook(s));
    }
  });
  it('animals offered suit the look and fit the tank', () => {
    const t = defaultSize('nature'), a = animalsFor('nature', t);
    expect(a.length).toBeGreaterThan(0);
    for (const x of a) expect(allowedStyles([{ species: x.id, n: 1 }])).toContain('nature');
    expect(a[0].inPool).toBe(true);
  });
  it('picking animals re-plans the gear and puts them in the scaped tank', () => {
    const t = defaultSize('nature'), a = animalsFor('nature', t).slice(0, 2).map(x => ({ species: x.id, n: x.n }));
    const r = lookWithAnimals('nature', t, 'live', a, 0);
    expect(r.setup.fish.length).toBe(a.reduce((s, x) => s + x.n, 0)); expect(r.setup.layout.id).toBe('nature');
  });
});
