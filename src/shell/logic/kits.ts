// Lane SK1 (2026-11-17): the "Starters and kits" browse screen of the new shell. Pure view-models; the rules are the old start
// chooser's (lane SD, ui/startEntries.ts, reused as is): which bundles exist (real catalog tank, listing checked in the last
// 30 days by the ENGINE rule, not estimate-only), the sale / bundle split, the sort keys and the empty-tab hiding.
// DL1's open question (14-day display vs 30-day engine) is untouched: this screen shows what startDeals() returns, i.e. 30 days.
import { DEAL_NOTE, dealShip, pctOff, savingLine, type Deal, type DealPart } from '../../data/deals';
import { startDeals, sortDeals, pctSaved, DEFAULT_SORT, type DealEntry, type DealSort } from '../../ui/startEntries';
import { shortDate } from './deals';

export type KitTab = 'starters' | 'bundles' | 'sale';
export const KIT_TAB_LABEL: Record<KitTab, string> = { starters: 'Starters', bundles: 'Bundles', sale: 'On sale' };
/** Sort chips, named by what they sort on (Nathan 2026-10-19). */
export const SORT_LABEL: Record<DealSort, string> = { usd: '$ saved, most first', pct: '% saved, most first', cost: 'Price, lowest first', size: 'Size, smallest first' };
export const SORTS: DealSort[] = ['usd', 'pct', 'cost', 'size'];
export const defaultSort = (tab: 'sale' | 'bundles'): DealSort => DEFAULT_SORT[tab];

const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
const PART_NAME: Record<DealPart, string> = { tank: 'tank', stand: 'stand', lid: 'lid', light: 'light', filter: 'filter', heater: 'heater', dome: 'heat lamp dome', bulb: 'heat bulb', uvb: 'UVB lamp', gauge: 'gauge' };

export interface DealCard {
  id: string; title: string; store: string; gal: number; price: string; was?: string; off?: number; saved?: string; savedPct?: string;
  savingLine: string; ship: string; checked: string; ends?: string; comes: string[]; notIncluded: string[]; guessed: string[]; url: string; estimate: boolean;
}
export const cardOf = (e: DealEntry): DealCard => {
  const d: Deal = e.deal, off = pctOff(d), p = Math.round(pctSaved(e) * 100);
  return {
    id: d.id, title: d.name, store: d.retailer, gal: d.gal, price: usd(d.price.usd), ...(d.price.regularUsd && off ? { was: usd(d.price.regularUsd) } : {}), ...(off ? { off } : {}),
    ...(e.savingUsd > 0 ? { saved: usd(e.savingUsd) } : {}), ...(p > 0 ? { savedPct: `${p}%` } : {}),
    savingLine: savingLine(d, e.savingUsd), ship: dealShip(d).text, checked: shortDate(d.asOf), ...(d.saleEnds ? { ends: shortDate(d.saleEnds) } : {}),
    comes: d.includes.map(x => PART_NAME[x] ?? x), notIncluded: (['filter', 'heater'] as const).filter(x => !d.includes.includes(x)), guessed: d.look?.guessed ?? [], url: d.url, estimate: !!d.est,
  };
};

export interface KitsModel { tabs: KitTab[]; land: KitTab; sale: DealEntry[]; bundles: DealEntry[]; note: string }
/** Starters always show; Bundles and On sale only when they have something. Lands on Starters (the first tab) unless asked. */
export function kitsModel(now = Date.now(), deals?: Deal[], want?: KitTab): KitsModel {
  const { sale, bundles } = startDeals(now, deals);
  const tabs: KitTab[] = ['starters', ...(bundles.length ? ['bundles' as const] : []), ...(sale.length ? ['sale' as const] : [])];
  return { tabs, land: want && tabs.includes(want) ? want : 'starters', sale, bundles, note: `Prices as of the date on each card; ${DEAL_NOTE.replace(/^as of the date shown; /, '')}. Plain links, no affiliate codes.` };
}
export const entriesFor = (m: KitsModel, tab: 'sale' | 'bundles', by: DealSort): DealEntry[] => sortDeals(tab === 'sale' ? m.sale : m.bundles, by);
