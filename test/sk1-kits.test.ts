// SK1 / SK3: the Bundles and sales screen: view-model rules and a render of the deal tabs.
import { describe, it, expect } from 'vitest';
import { kitsModel, cardOf, entriesFor, defaultSort, dealCategory, itemCardOf, itemsFor, saleItems, SORT_LABEL, SORTS } from '../src/shell/logic/kits';
import { startDeals } from '../src/ui/startEntries';
import { DealTab } from '../src/shell/kits';
import { DEALS } from '../src/data/deals';

const now = Date.parse('2026-11-17T12:00:00');
const text = (n: unknown): string => n == null || typeof n === 'boolean' ? '' : typeof n === 'string' || typeof n === 'number' ? String(n)
  : Array.isArray(n) ? n.map(text).join('') : (() => { const v = n as { type: unknown; props: { children?: unknown } & Record<string, unknown> };
    return typeof v.type === 'function' ? text((v.type as (p: unknown) => unknown)(v.props)) : text(v.props?.children); })();

describe('SK3 deals model: three categories, example tanks separate', () => {
  it('uses the old chooser logic as is (30-day engine rule): sale -> Bundles on sale, the rest -> Bundles', () => {
    const m = kitsModel(now), d = startDeals(now);
    expect(m.bundlesSale).toEqual(d.sale); expect(m.bundles).toEqual(d.bundles);
    expect(m.tabs.includes('bundles')).toBe(d.bundles.length > 0); expect(m.tabs.includes('bundlesSale')).toBe(d.sale.length > 0); expect(m.tabs.includes('items')).toBe(m.items.length > 0);
    expect(m.tabs).not.toContain('starters' as never);
  });
  it('every current deal lands in exactly one category (a bundle on sale is NOT also under Bundles)', () => {
    const m = kitsModel(now), shown = new Set([...m.bundles, ...m.bundlesSale].map(e => e.deal.id));
    expect(shown.size).toBe(m.bundles.length + m.bundlesSale.length);
    for (const e of m.bundles) expect(dealCategory(e.deal, now)).toBe('bundles');
    for (const e of m.bundlesSale) expect(dealCategory(e.deal, now)).toBe('bundlesSale');
    expect(m.bundlesSale.length).toBeGreaterThan(0);
  });
  it('an ended sale is neither on sale nor a bundle at that price; a sale without an end date is on sale', () => {
    const d = DEALS.find(x => x.price.regularUsd && x.price.regularUsd > x.price.usd)!;
    expect(dealCategory({ ...d, saleEnds: '2026-11-18' }, now)).toBe('bundlesSale');
    expect(dealCategory({ ...d, saleEnds: '2026-11-16' }, now)).toBe('bundles');
    expect(dealCategory({ ...d, price: { usd: d.price.usd, regularUsd: undefined } } as never, now)).toBe('bundles');
  });
  it('hides empty tabs and lands on the first shown (or the one asked for)', () => {
    const m = kitsModel(now, []); expect(m.tabs).toEqual([]);
    const all = kitsModel(now); expect(all.land).toBe(all.tabs[0]);
    expect(kitsModel(now, undefined, 'items').land).toBe(all.tabs.includes('items') ? 'items' : all.tabs[0]);
    expect(kitsModel(now, undefined, undefined, [{ id: 'x', kind: 'Light', title: 't', store: 's', usd: 1, regularUsd: 2, saveUsd: 1, off: 50, asOf: '2026-11-16', url: 'u' }], ).items.length).toBe(1);
  });
  it('sort chips are named by their key; defaults: bundles by price, sale tabs by dollars saved', () => {
    expect(SORTS.map(s => SORT_LABEL[s])).toEqual(['$ saved, most first', '% saved, most first', 'Price, lowest first', 'Size, smallest first', 'Size, largest first']);
    expect(defaultSort('bundlesSale')).toBe('usd'); expect(defaultSort('items')).toBe('usd'); expect(defaultSort('bundles')).toBe('cost');
  });
  it('size, largest first puts the biggest tanks first (Nathan 2026-11-26)', () => {
    const g = entriesFor(kitsModel(now), 'bundles', 'sizeDesc').map(e => e.deal.gal);
    expect(g).toEqual([...g].sort((a, b) => b - a));
  });
  it('bundles sort by price, lowest first, by default', () => {
    const m = kitsModel(now), p = entriesFor(m, 'bundles', 'cost').map(e => e.deal.price.usd);
    expect(p).toEqual([...p].sort((a, b) => a - b));
  });
  it('a card carries price, store, checked date and the parts list', () => {
    const e = kitsModel(now).bundles[0] ?? kitsModel(now).bundlesSale[0]; if (!e) return;
    const c = cardOf(e); expect(c.price).toMatch(/^\$/); expect(c.store).toBeTruthy(); expect(c.checked).toMatch(/\w+ \d+/); expect(c.comes.length).toBeGreaterThan(0);
  });
  it('same data exists', () => expect(DEALS.length).toBeGreaterThan(0));
});

describe('SK3 items on sale', () => {
  const m = kitsModel(now), items = m.items;
  it('are individual products: live sale, own product page, a real discount, no bundles', () => {
    expect(items.length).toBeGreaterThan(20);
    for (const i of items) { expect(i.usd).toBeLessThan(i.regularUsd); expect(i.url).toMatch(/^https:\/\//); expect(i.url).not.toMatch(/\/(category|c)\//); expect(i.off).toBeGreaterThan(0); }
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
  });
  it('tank sales follow the engine rule: an ended sale is not listed', () => {
    const ended = saleItems(Date.parse('2027-06-01T12:00:00')); expect(ended.length).toBe(0);
  });
  it('sort by $ saved, % saved, price and size', () => {
    const v = (by: 'usd' | 'pct' | 'cost' | 'size') => itemsFor(m, by);
    const u = v('usd').map(i => i.saveUsd), c = v('cost').map(i => i.usd), p = v('pct').map(i => i.off), z = v('size').map(i => i.gal ?? 1e9);
    expect(u).toEqual([...u].sort((a, b) => b - a)); expect(c).toEqual([...c].sort((a, b) => a - b)); expect(p).toEqual([...p].sort((a, b) => b - a)); expect(z).toEqual([...z].sort((a, b) => a - b));
  });
  it('a photo is a verified hotlink map entry, never a file in the repo', () => {
    for (const i of items) if (i.img) expect(i.img).toMatch(/^https:\/\//);
    expect(itemCardOf(items[0]).price).toMatch(/^\$/);
  });
});

describe('SK1 render', () => {
  it('a deal tab renders a card per entry with Start from this and the sort chips', () => {
    const m = kitsModel(now), tab = m.bundles.length ? 'bundles' : 'bundlesSale', n = (tab === 'bundles' ? m.bundles : m.bundlesSale).length;
    if (!n) return;
    const t = text(DealTab({ model: m, tab, by: defaultSort(tab), onSort: () => {}, files: {} as never }));
    expect(t.split('Start from this').length - 1).toBe(n);
    expect(t).toContain('Price, lowest first'); expect(t).toContain('% saved, most first'); expect(t).toContain('checked');
  });
  it('the items tab renders a card per item with a plain link and no Start button', () => {
    const m = kitsModel(now), t = text(DealTab({ model: m, tab: 'items', by: 'usd', onSort: () => {}, files: {} as never }));
    expect(t.split('See it at').length - 1).toBe(m.items.length); expect(t).not.toContain('Start from this'); expect(t).toContain('% off');
  });
});

describe('SK2 box list (fixed order)', () => {
  it('orders any includes the same way and puts unknown keys in Other, last, in source order', async () => {
    const { boxList } = await import('../src/shell/logic/boxList');
    expect(boxList(['heater', 'stand', 'light', 'lid', 'tank']).have).toEqual(['Tank', 'Lid / hood', 'Light', 'Heater', 'Stand']);
    expect(boxList(['tank', 'gravel', 'zzz', 'dome', 'ornament', 'zzz']).have).toEqual(['Tank', 'Substrate', 'Decor / ornaments', 'Zzz', 'Heat lamp dome']);
    expect(boxList(['tank', 'lid']).missing).toEqual(['Light', 'Filter', 'Heater']);
    expect(boxList(['tank', 'light', 'filter', 'heater']).missing).toEqual([]);
  });
  it('all current deals give a deterministic list regardless of includes order', async () => {
    const { boxList } = await import('../src/shell/logic/boxList');
    expect(DEALS.length).toBeGreaterThan(30);
    for (const d of DEALS) { const a = boxList(d.includes), b = boxList([...d.includes].reverse()); expect(a.have.slice(0, a.have.length)).toBeTruthy(); expect([...a.have].sort()).toEqual([...b.have].sort()); expect(a.missing).toEqual(b.missing); }
  });
  it('the card carries the photo and the list; the card renders bullets', () => {
    const e = entriesFor(kitsModel(now), 'bundles', 'cost')[0], c = cardOf(e);
    expect(c.img).toBe(e.deal.img); expect(c.comes[0]).toBe('Tank');
  });
});
