import { describe, expect, it } from 'vitest';
import lib from '../src/data/tanks.json';
// @ts-expect-error plain .mjs script, no types
import { sweepList } from '../scripts/price-sweep.mjs';

// Lane S232: the price sweep walks the library itself, so a new entry with a url is swept with no list to edit.
describe('price sweep list', () => {
  const list = sweepList(lib) as { key: string; model: string; idx: number; url: string; host: string }[];
  it('covers retailer variants and resolves each key back to its variant', () => {
    expect(list.length).toBeGreaterThan(100);
    for (const i of list) {
      const v = (lib.tanks.find(t => t.id === i.model) as { variants: { url: string }[] }).variants[i.idx];
      expect(v.url).toBe(i.url);
    }
  });
  it('picks up a new variant and leaves out category pages and discontinued ones', () => {
    const copy = JSON.parse(JSON.stringify(lib));
    copy.tanks[0].variants.push({ brand: 'X', url: 'https://example.com/products/new-tank', price_usd: 10 }, { brand: 'Y', url: 'https://example.com/c/tanks' }, { brand: 'Z', url: 'https://example.com/products/old', discontinued: true });
    const l = sweepList(copy) as { url: string }[];
    expect(l.some(i => i.url.endsWith('/new-tank'))).toBe(true);
    expect(l.some(i => i.url.endsWith('/c/tanks') || i.url.endsWith('/old'))).toBe(false);
  });
});
