// R104 (lane OR1): native range per species + the continent filter in the animal picker.
import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/data/species';
import { CONTINENTS, continentText, inContinent, originIds, originOf, regionText } from '../src/data/origin';
import { findSpecies, pickView, DEFAULT_QUERY } from '../src/shell/logic/animals';
import { createFitter } from '../src/ui/logic/animalPicker';
import { Store } from '../src/scene/store';

const keys = CONTINENTS.map(c => c[0]) as string[];

describe('native range data', () => {
  it('every row names a real species, a known place, a region line and a source', () => {
    const ids = new Set(SPECIES.map(s => s.id));
    for (const id of originIds()) {
      const o = originOf(id)!;
      expect(ids.has(id), id).toBe(true);
      expect(o.c.length, id).toBeGreaterThan(0);
      for (const c of o.c) expect(keys, `${id} ${c}`).toContain(c);
      expect(o.r.length, id).toBeGreaterThan(5);
      expect(o.s, id).toMatch(/FishBase|SeaLifeBase|AmphibiaWeb|Reptile Database|World Spider Catalog/);
    }
  });
  it('covers every species in the catalogue', () => {
    const missing = SPECIES.filter(s => !originOf(s.id)).map(s => s.id);
    expect(missing).toEqual([]);
  });
  it('marine species use ocean regions, freshwater species continents', () => {
    const sea = ['indopacific', 'caribbean', 'redsea'];
    for (const sp of SPECIES.filter(s => s.cat === 'sw-fish')) expect(originOf(sp.id)!.c.some(c => sea.includes(c)), sp.id).toBe(true);
    for (const sp of SPECIES.filter(s => s.cat === 'fw-fish')) expect(originOf(sp.id)!.c.every(c => !sea.includes(c)), sp.id).toBe(true);
  });
  it('hobby forms say so and state the wild range', () => {
    for (const id of ['guppy', 'goldfish', 'comet', 'cherryshrimp', 'crestedharlequin']) { expect(originOf(id)!.form, id).toBe('captive-bred'); expect(regionText(originOf(id)!)).toMatch(/^Captive-bred form; wild range: /); }
    expect(regionText(originOf('discus')!)).toMatch(/\(est\.\)$/);
    expect(continentText(originOf('molly')!)).toBe('North America, Central America and South America');
  });
});

describe('continent filter', () => {
  const S = new Store().tank;
  const fitter = createFitter();
  const names = (c?: string) => findSpecies(S, '', undefined, c as never).map(s => s.id);
  it('lists only species whose range touches the continent', () => {
    const asia = names('asia');
    expect(asia).toContain('betta');
    expect(asia).not.toContain('neon');
    for (const id of asia) expect(inContinent(id, 'asia')).toBe(true);
    expect(names('samerica')).toContain('neon');
    expect(names('africa')).toContain('kribensis');
  });
  it('combines with the group and the search', () => {
    expect(findSpecies(S, '', 'school', 'samerica').every(sp => inContinent(sp.id, 'samerica'))).toBe(true);
    expect(findSpecies(S, 'neon', undefined, 'asia')).toEqual([]);
  });
  it('the picker view offers place chips with counts that match the list', () => {
    const pv = pickView(S, 'in', 'sandbox', fitter, { ...DEFAULT_QUERY, fitsOnly: false, origin: 'asia' });
    expect(pv.origins[0].label).toBe('Anywhere');
    const asia = pv.origins.find(c => c.c === 'asia')!;
    expect(asia.n).toBe(pv.shown);
    expect(pv.groups.flatMap(g => g.rows).every(r => inContinent(r.id, 'asia'))).toBe(true);
  });
});
