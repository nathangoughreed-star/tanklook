import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/data/species';
import { allRows, listView, speciesListMarkdown } from '../src/shell/logic/speciesList';

describe('R131 species list', () => {
  const rows = allRows('in');
  it('holds every species once, grouped by category', () => {
    expect(rows.length).toBe(SPECIES.length);
    expect(listView(rows, '', 'name', true).reduce((n, g) => n + g.rows.length, 0)).toBe(SPECIES.length);
  });
  it('searches name, scientific name and group; sorts by size', () => {
    expect(listView(rows, 'cichlid', 'name', true).flatMap(g => g.rows).length).toBeGreaterThanOrEqual(15);
    expect(listView(rows, 'pterophyllum', 'name').flatMap(g => g.rows).map(r => r.id)).toEqual(['angel']);
    const g = listView(rows, '', 'size')[0].rows; expect(g[0].tl).toBeLessThanOrEqual(g[g.length - 1].tl);
  });
  it('markdown lists every species', () => {
    const md = speciesListMarkdown();
    for (const sp of SPECIES) expect(md).toContain(`| ${sp.name}`);
  });
});

import { Store } from '../src/scene/store';
import { createFitter } from '../src/ui/logic/animalPicker';
import { DEFAULT_QUERY, pickView } from '../src/shell/logic/animals';
describe('R132 The Lab', () => {
  it('GloFish rows sit under The Lab, not under their wild continent; plain species keep theirs', () => {
    const S = new Store().tank, q = { ...DEFAULT_QUERY, fitsOnly: false }, f = createFitter();
    const all = pickView(S, 'in', 'guided', f, q), lab = pickView(S, 'in', 'guided', f, { ...q, origin: 'lab' }), asia = pickView(S, 'in', 'guided', f, { ...q, origin: 'asia' });
    const chip = all.origins.find(c => c.c === 'lab'); expect(chip?.label).toBe('The Lab'); expect(chip!.n).toBeGreaterThan(0);
    expect(lab.groups.map(g => g.role)).toEqual(['glo']); expect(lab.groups[0].rows.length).toBe(chip!.n);
    expect(asia.groups.some(g => g.role === 'glo')).toBe(false);
    expect(asia.chips.find(c => c.role === 'glo')).toBeUndefined();
  });
});
