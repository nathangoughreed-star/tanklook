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
