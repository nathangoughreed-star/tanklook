// R194: what a user sees when a bamboo shark is added to a stock tank: the verdict says plainly that no stock tank fits, with the size in gallons and inches.
import { describe, expect, it } from 'vitest';
import { catalogueSizes } from '../src/scene/tankfit';
import { speciesLive } from '../src/ui/discovery/animalsLive';

describe('bamboo shark in the largest stock tank', () => {
  it('is too small, names 82 in / 227 gal, and says no stock tank fits', () => {
    const cs = catalogueSizes(false), lines = speciesLive([{ species: 'bambooshark', n: 1 }], cs[cs.length - 1].m, true)[0].lines.map(l => l.text).join('\n');
    expect(lines).toMatch(/Tank at least 82 in long, about 227 gal\. Too small for it/);
    expect(lines).toMatch(/custom tank about 7 ft x 41 in; no stock tank fits/);
  });
});
