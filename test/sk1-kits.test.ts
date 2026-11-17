// SK1: the Starters and kits screen: view-model rules and a render of the deal tabs.
import { describe, it, expect } from 'vitest';
import { kitsModel, cardOf, entriesFor, defaultSort, SORT_LABEL, SORTS } from '../src/shell/logic/kits';
import { startDeals } from '../src/ui/startEntries';
import { DealTab } from '../src/shell/kits';
import { DEALS } from '../src/data/deals';

const now = Date.parse('2026-11-17T12:00:00');
const text = (n: unknown): string => n == null || typeof n === 'boolean' ? '' : typeof n === 'string' || typeof n === 'number' ? String(n)
  : Array.isArray(n) ? n.map(text).join('') : (() => { const v = n as { type: unknown; props: { children?: unknown } & Record<string, unknown> };
    return typeof v.type === 'function' ? text((v.type as (p: unknown) => unknown)(v.props)) : text(v.props?.children); })();

describe('SK1 kits model', () => {
  it('uses the old chooser logic as is (30-day engine rule) and always has Starters', () => {
    const m = kitsModel(now), d = startDeals(now);
    expect(m.sale).toEqual(d.sale); expect(m.bundles).toEqual(d.bundles);
    expect(m.tabs[0]).toBe('starters');
    expect(m.tabs.includes('bundles')).toBe(d.bundles.length > 0); expect(m.tabs.includes('sale')).toBe(d.sale.length > 0);
  });
  it('hides empty deal tabs', () => { const m = kitsModel(now, []); expect(m.tabs).toEqual(['starters']); expect(m.land).toBe('starters'); });
  it('lands on the asked tab only when shown', () => { expect(kitsModel(now, undefined, 'sale').land).toBe(kitsModel(now).tabs.includes('sale') ? 'sale' : 'starters'); expect(kitsModel(now, [], 'bundles').land).toBe('starters'); });
  it('sort chips are named by their key; defaults match the old chooser', () => {
    expect(SORTS.map(s => SORT_LABEL[s])).toEqual(['$ saved, most first', '% saved, most first', 'Price, lowest first', 'Size, smallest first']);
    expect(defaultSort('sale')).toBe('usd'); expect(defaultSort('bundles')).toBe('cost');
  });
  it('bundles sort by price, lowest first, by default', () => {
    const m = kitsModel(now), p = entriesFor(m, 'bundles', 'cost').map(e => e.deal.price.usd);
    expect(p).toEqual([...p].sort((a, b) => a - b));
  });
  it('a card carries price, store, checked date and the parts list', () => {
    const e = kitsModel(now).bundles[0] ?? kitsModel(now).sale[0]; if (!e) return;
    const c = cardOf(e); expect(c.price).toMatch(/^\$/); expect(c.store).toBeTruthy(); expect(c.checked).toMatch(/\w+ \d+/); expect(c.comes.length).toBeGreaterThan(0);
  });
  it('same data exists', () => expect(DEALS.length).toBeGreaterThan(0));
});

describe('SK1 render', () => {
  it('a deal tab renders a card per entry with Start from this and the sort chips', () => {
    const m = kitsModel(now), tab = m.bundles.length ? 'bundles' : 'sale', n = (tab === 'bundles' ? m.bundles : m.sale).length;
    if (!n) return;
    const t = text(DealTab({ model: m, tab, by: defaultSort(tab), onSort: () => {}, files: {} as never }));
    expect(t.split('Start from this').length - 1).toBe(n);
    expect(t).toContain('Price, lowest first'); expect(t).toContain('% saved, most first'); expect(t).toContain('checked');
  });
});
