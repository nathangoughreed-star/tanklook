import { describe, expect, it } from 'vitest';
import { DEALS, type Deal } from '../src/data/deals';
import { onSale, pickTab, startDeals, visibleTabs } from '../src/ui/startEntries';

const base = DEALS.find(d => d.tank && !d.est && !d.price.regularUsd)!;
const day = (d: Deal) => Date.parse(d.asOf);
const sale: Deal = { ...base, id: 'sale', price: { usd: base.price.usd, regularUsd: base.price.usd + 100 } };

describe('start chooser entries', () => {
  it('splits a bundle on sale from a plain bundle, each once', () => {
    const r = startDeals(day(base), [base, sale]);
    expect(r.sale.map(e => e.deal.id)).toEqual(['sale']);
    expect(r.bundles.map(e => e.deal.id)).toEqual([base.id]);
  });
  it('drops an ended sale, a stale listing, an estimate-only row and one without a catalog tank', () => {
    const now = day(base);
    expect(startDeals(now, [{ ...sale, saleEnds: '2000-01-01' }])).toEqual({ sale: [], bundles: [] });
    expect(startDeals(now + 40 * 864e5, [base, sale])).toEqual({ sale: [], bundles: [] });
    expect(startDeals(now, [{ ...base, est: true }, { ...base, tank: undefined }])).toEqual({ sale: [], bundles: [] });
  });
  it('onSale needs a higher regular price and a sale that has not ended', () => {
    expect(onSale(base, day(base))).toBe(false);
    expect(onSale(sale, day(base))).toBe(true);
    expect(onSale({ ...sale, saleEnds: '2099-01-01' }, day(base))).toBe(true);
    expect(onSale({ ...sale, saleEnds: '2000-01-01' }, day(base))).toBe(false);
  });
  it('sorts sales by saving and bundles cheapest first', () => {
    const cheap = { ...base, id: 'cheap', price: { usd: 10 } }, dear = { ...base, id: 'dear', price: { usd: 900 } };
    expect(startDeals(day(base), [dear, cheap]).bundles.map(e => e.deal.id)).toEqual(['cheap', 'dear']);
  });
  it('hides empty sale / bundle tabs and lands on the first shown tab', () => {
    expect(visibleTabs({ sale: 0, bundles: 0 })).toEqual(['starters', 'open']);
    expect(visibleTabs({ sale: 2, bundles: 1 })).toEqual(['sale', 'bundles', 'starters', 'open']);
    expect(pickTab(undefined, ['bundles', 'starters', 'open'])).toBe('bundles');
    expect(pickTab('open', ['starters', 'open'])).toBe('open');
    expect(pickTab('sale', ['starters', 'open'])).toBe('starters');
  });
});
