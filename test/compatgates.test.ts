import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { SPECIES, getSpecies } from '../src/data/species';
import { groupShort, hasCorals, whyAnimal } from '../src/scene/animalfit';

const sp = (id: string) => getSpecies(id)!;
describe('compatibility gates (lane CG, 2026-10-19)', () => {
  // a species added without its care data fails here, so no fish lane can ship one half-done
  it('every species has care data; every aquatic one has temperature, tolerance and pH', () => {
    for (const s of SPECIES) {
      const c = CARE[s.id];
      expect(c, `${s.id}: no CARE entry`).toBeTruthy();
      if (s.habitat === 'land') continue;
      expect(c.temp, `${s.id}: no temp`).toBeTruthy();
      expect(c.tol, `${s.id}: no tol`).toBeTruthy();
      expect(c.ph, `${s.id}: no pH`).toBeTruthy();
      for (const r of [c.temp!, c.tol!, c.ph!, ...(c.gh ? [c.gh] : [])]) expect(r[0], s.id).toBeLessThan(r[1]);
      expect(c.tol![0] <= c.temp![0] && c.tol![1] >= c.temp![1], `${s.id}: tol inside temp`).toBe(true);
    }
  });
  it('marine species share one pH band and no hardness check', () => {
    const salt = SPECIES.filter(s => s.salt);
    expect(salt.length).toBeGreaterThan(0);
    for (const s of salt) { expect(CARE[s.id].ph).toEqual([8.0, 8.4]); expect(CARE[s.id].gh).toBeUndefined(); }
    expect(whyAnimal(sp('chromis'), 500, 3, [sp('ocellaris'), sp('cleanershrimp')])).toBeNull();
  });
  it('soft-water fish against hard-water fish', () => {
    expect(whyAnimal(sp('cardinal'), 500, 3, [sp('molly')])?.text).toMatch(/pH|hardness/);
    expect(whyAnimal(sp('cardinal'), 500, 3, [sp('peacock')])?.text).toMatch(/pH/);
    expect(whyAnimal(sp('platy'), 200, 3, [sp('neon')])?.text).toMatch(/hardness|pH/);
    expect(whyAnimal(sp('peacock'), 500, 3, [sp('yellowlab')])).toBeNull();
    expect(whyAnimal(sp('neon'), 200, 1, [sp('harlequin'), sp('pandacory')])).toBeNull();
  });
  it('coral nippers only matter with corals in the tank', () => {
    expect(whyAnimal(sp('coralbeauty'), 400, 3, [])).toBeNull();
    expect(whyAnimal(sp('coralbeauty'), 400, 3, [], { corals: true })?.text).toMatch(/caution/);
    expect(whyAnimal(sp('yellowtang'), 600, 3, [], { corals: true })).toBeNull();
    expect(hasCorals([{ kind: 'coral', variant: 'macroalgae' }, { kind: 'stone', variant: 'liverock' }])).toBe(false);
    expect(hasCorals([{ kind: 'coral', variant: 'hammer' }])).toBe(true);
  });
  it('group advice under the smallest group', () => {
    expect(groupShort(sp('neon'), 2)).toBe('group: wants 6 or more, you have 2');
    expect(groupShort(sp('neon'), 6)).toBeNull();
    expect(groupShort(sp('betta'), 1)).toBeNull();
  });
});
