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

// Bundles (Nathan 2026-11-26): deals.json rows are swept with the tanks and updated by the same rules.
import deals from '../src/data/deals.json';
// @ts-expect-error plain .mjs script, no types
import { applyDeal, dealSweepList } from '../scripts/price-sweep.mjs';
describe('price sweep: bundles', () => {
  type Row = { id: string; url: string; price: { usd: number; regularUsd?: number }; saleEnds?: string; asOf: string };
  const rep = () => ({ changed: [], sales: [], saleEnded: [], dead: [], held: [], unreadable: [], same: 0, soldOut: [] });
  const one = (patch: Partial<Row> = {}) => ({ deals: [{ id: 'd1', retailer: 'R', name: 'Kit', url: 'https://example.com/p/kit', price: { usd: 400, regularUsd: 650 }, saleEnds: '2026-11-25', asOf: '2026-11-01', ...patch }] });
  it('lists every bundle with a url under a deal| key', () => {
    const l = dealSweepList(deals) as { key: string; url: string }[];
    const withUrl = (deals as unknown as { deals: Row[] }).deals.filter(d => d.url);
    expect(l.length).toBe(withUrl.length);
    for (const i of l) expect(i.key).toMatch(/^deal\|/);
  });
  it('a new sale price, list price and end date land; asOf moves', () => {
    const D = one(), r = rep();
    applyDeal(D, { key: 'deal|d1', url: 'https://example.com/p/kit', status: 'ok', price: 349.99, regular: 649.99, sale_ends: '2026-11-29' }, '2026-11-30', r);
    expect(D.deals[0]).toMatchObject({ price: { usd: 349.99, regularUsd: 649.99 }, saleEnds: '2026-11-29', asOf: '2026-11-30' });
    expect(r.sales.length).toBe(1); expect(r.changed.length).toBe(1);
  });
  it('a sale that is gone clears the list price and end date', () => {
    const D = one({ price: { usd: 500, regularUsd: 650 } }), r = rep(); // a page price within x1.6 of the stored one and above 98 % of the list
    applyDeal(D, { key: 'deal|d1', url: 'https://example.com/p/kit', status: 'ok', price: 645 }, '2026-11-30', r);
    expect(D.deals[0].price).toEqual({ usd: 645 }); expect(D.deals[0].saleEnds).toBeUndefined(); expect(r.saleEnded.length).toBe(1);
  });
  it('a far move is held and a dead page left as it was', () => {
    const D = one(), r = rep();
    applyDeal(D, { key: 'deal|d1', url: 'https://example.com/p/kit', status: 'ok', price: 99 }, '2026-11-30', r);
    applyDeal(D, { key: 'deal|d1', url: 'https://example.com/p/kit', status: 'dead', note: 'HTTP 404' }, '2026-11-30', r);
    expect(D.deals[0]).toMatchObject({ price: { usd: 400, regularUsd: 650 }, asOf: '2026-11-01' });
    expect(r.held.length).toBe(1); expect(r.dead.length).toBe(1);
  });
});
