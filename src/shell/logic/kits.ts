// Lane SK1 / SK3 (2026-11-17): the "Bundles and sales" screen of the new shell (example tanks have their own screen, shell/kits.tsx). Pure view-models; the rules are the old start
// chooser's (lane SD, ui/startEntries.ts, reused as is): which bundles exist (real catalog tank, listing checked in the last
// 30 days by the ENGINE rule, not estimate-only), the sale / bundle split, the sort keys and the empty-tab hiding.
// DL1's open question (14-day display vs 30-day engine) is untouched: this screen shows what startDeals() returns, i.e. 30 days.
import { DEAL_NOTE, dealShip, pctOff, savingLine, type Deal } from '../../data/deals';
import { startDeals, sortDeals, pctSaved, onSale, DEFAULT_SORT, type DealEntry, type DealSort } from '../../ui/startEntries';
import { shortDate } from './deals';
import { boxList } from './boxList';
import { GEAR_DEALS, GEAR_DEAL_DAYS, gearPctOff, type GearDeal } from '../../data/gearDeals';
import { TANK_MODELS, saleLive, type TankModel } from '../../data/tanks';
import { tileOf } from './tankFilter';
import type { DockOpt } from '../../ui/tankDockLogic';
import imgs from '../../data/saleImgs.json';
export { boxList, BOX_ORDER, BOX_NEEDS } from './boxList';

/** SK3 (Nathan 2026-11-17): three deal categories, each hidden when empty. A deal lands in exactly one. */
export type KitTab = 'bundles' | 'bundlesSale' | 'items';
export const KIT_TAB_LABEL: Record<KitTab, string> = { bundles: 'Bundles', bundlesSale: 'Bundles on sale', items: 'Items on sale' };
/** Sort chips, named by what they sort on (Nathan 2026-10-19). */
export const SORT_LABEL: Record<DealSort, string> = { usd: '$ saved, most first', pct: '% saved, most first', cost: 'Price, lowest first', size: 'Size, smallest first' };
export const SORTS: DealSort[] = ['usd', 'pct', 'cost', 'size'];
export const defaultSort = (tab: KitTab): DealSort => tab === 'bundles' ? DEFAULT_SORT.bundles : DEFAULT_SORT.sale;

/** Which category a bundle listing is in: a bundle with an active sale (the engine's onSale rule) is under Bundles on sale ONLY, every other one under Bundles. */
export const dealCategory = (d: Deal, now = Date.now()): 'bundles' | 'bundlesSale' => onSale(d, now) ? 'bundlesSale' : 'bundles';

const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');

/** The card shows the photo at card size: PetSmart / Target's scene7 server resizes on request (2000 px / 240 KB down to 500 px / 47 KB); other hosts as listed. */
export const photoSrc = (u: string): string => /^https:\/\/(s7d2|target)\.scene7\.com\/is\/image\//.test(u) && !u.includes('?') ? `${u}?wid=500&hei=500&fmt=jpeg&qlt=80` : u;

export interface DealCard {
  id: string; title: string; store: string; gal: number; price: string; was?: string; off?: number; saved?: string; savedPct?: string;
  savingLine: string; ship: string; checked: string; ends?: string; comes: string[]; notIncluded: string[]; img?: string; guessed: string[]; url: string; estimate: boolean;
}
export const cardOf = (e: DealEntry): DealCard => {
  const d: Deal = e.deal, off = pctOff(d), p = Math.round(pctSaved(e) * 100);
  return {
    id: d.id, title: d.name, store: d.retailer, gal: d.gal, price: usd(d.price.usd), ...(d.price.regularUsd && off ? { was: usd(d.price.regularUsd) } : {}), ...(off ? { off } : {}),
    ...(e.savingUsd > 0 ? { saved: usd(e.savingUsd) } : {}), ...(p > 0 ? { savedPct: `${p}%` } : {}),
    savingLine: savingLine(d, e.savingUsd), ship: dealShip(d).text, checked: shortDate(d.asOf), ...(d.saleEnds ? { ends: shortDate(d.saleEnds) } : {}),
    comes: boxList(d.includes).have, notIncluded: boxList(d.includes).missing, ...(d.img ? { img: d.img } : {}), guessed: d.look?.guessed ?? [], url: d.url, estimate: !!d.est,
  };
};


// ---------- individual items on sale: catalogue tanks and specialist-store gear, each its own card ----------
export interface ItemEntry {
  id: string; kind: string; title: string; store: string; gal?: number; usd: number; regularUsd: number; saveUsd: number; off: number; ends?: string; asOf: string; url: string;
  /** a verified retailer photo (hotlinked), else a baked catalogue still of this product's look, else none (the card shows its kind) */
  img?: string; still?: string;
}
const KIND_WORD: Record<string, string> = { light: 'Light', filter: 'Filter', heater: 'Heater', skimmer: 'Skimmer', co2: 'CO2' };
const productUrl = (u?: string): u is string => !!u && !/\/(category|c)\//.test(u);
/** The photo verified for this product page (scripts-free sweep, src/data/saleImgs.json), if any. */
export const itemPhoto = (url: string): string | undefined => (imgs as Record<string, string>)[url];

/** Tanks on sale right now (engine rule saleLive: read in the last 30 days, end date not passed) that have their own product page, plus gear sales read in the last 30 days. */
export function saleItems(now = Date.now(), models: TankModel[] = TANK_MODELS, gear: GearDeal[] = GEAR_DEALS): ItemEntry[] {
  const out: ItemEntry[] = [], seen = new Set<string>();
  for (const m of models) for (const v of m.variants ?? []) {
    if (!saleLive(v, now) || v.discontinued || !productUrl(v.url)) continue;
    const title = `${v.brand}${v.line ? ' ' + v.line : ''}`, key = v.url + '|' + title; if (seen.has(key)) continue; seen.add(key);
    const o = { key: key, m, v, name: title, gal: m.ratedGal } as unknown as DockOpt;
    let still: string | undefined; try { still = `gallery/tanks/${tileOf(o).key}.webp`; } catch { /* no picture */ }
    const img = itemPhoto(v.url);
    out.push({ id: 'tank-' + out.length, kind: m.terrarium ? 'Terrarium' : v.price_kind === 'kit' ? 'Tank kit' : 'Tank', title, store: v.retailer ?? 'a retailer', gal: m.ratedGal, usd: v.price_usd!, regularUsd: v.regular_usd!,
      saveUsd: v.regular_usd! - v.price_usd!, off: Math.round((1 - v.price_usd! / v.regular_usd!) * 100), ...(v.sale_ends ? { ends: v.sale_ends } : {}), asOf: v.checked!, url: v.url, ...(img ? { img } : {}), ...(still ? { still } : {}) });
  }
  for (const g of gear) {
    if (now - Date.parse(g.asOf.slice(0, 10) + 'T00:00:00') > GEAR_DEAL_DAYS * 864e5 || g.price.usd >= g.price.regularUsd) continue;
    const img = itemPhoto(g.url), still = g.slot === 'co2' ? 'gallery/gear/generic-co2.webp' : g.slot === 'skimmer' ? 'gallery/gear/generic-skimmer.webp' : undefined;
    out.push({ id: g.id, kind: KIND_WORD[g.slot] ?? g.slot, title: g.title, store: g.store, ...(g.galMax ? { gal: g.galMax } : {}), usd: g.price.usd, regularUsd: g.price.regularUsd, saveUsd: g.price.regularUsd - g.price.usd,
      off: gearPctOff(g), asOf: g.asOf, url: g.url, ...(img ? { img } : {}), ...(still ? { still } : {}) });
  }
  return out;
}
export function sortItems(list: ItemEntry[], by: DealSort): ItemEntry[] {
  const key = (e: ItemEntry) => by === 'size' ? e.gal ?? 1e9 : by === 'cost' ? e.usd : by === 'usd' ? -e.saveUsd : -e.off;
  return [...list].sort((a, b) => key(a) - key(b) || a.usd - b.usd);
}
export interface ItemCard { id: string; kind: string; title: string; store: string; size?: string; price: string; was: string; off: number; saved: string; checked: string; ends?: string; url: string; img?: string; still?: string }
export const itemCardOf = (e: ItemEntry): ItemCard => ({ id: e.id, kind: e.kind, title: e.title, store: e.store, ...(e.gal ? { size: `${e.gal < 10 ? +e.gal.toFixed(1) : Math.round(e.gal)} gal` } : {}),
  price: usd(e.usd), was: usd(e.regularUsd), off: e.off, saved: usd(e.saveUsd), checked: shortDate(e.asOf), ...(e.ends ? { ends: shortDate(e.ends) } : {}), url: e.url, ...(e.img ? { img: e.img } : {}), ...(e.still ? { still: e.still } : {}) });

export interface KitsModel { tabs: KitTab[]; land: KitTab; bundles: DealEntry[]; bundlesSale: DealEntry[]; items: ItemEntry[]; note: string }
/** The deals screen: Bundles, Bundles on sale and Items on sale, each shown only when it has something (30-day engine freshness rule unchanged). Lands on the first shown, or the one asked for. */
export function kitsModel(now = Date.now(), deals?: Deal[], want?: KitTab, items?: ItemEntry[]): KitsModel {
  const { sale, bundles } = startDeals(now, deals), it = items ?? (deals ? [] : saleItems(now));
  const tabs: KitTab[] = [...(bundles.length ? ['bundles' as const] : []), ...(sale.length ? ['bundlesSale' as const] : []), ...(it.length ? ['items' as const] : [])];
  return { tabs, land: want && tabs.includes(want) ? want : tabs[0], bundles, bundlesSale: sale, items: it, note: `Prices as of the date on each card; ${DEAL_NOTE.replace(/^as of the date shown; /, '')}. Plain links, no affiliate codes.` };
}
export const entriesFor = (m: KitsModel, tab: 'bundles' | 'bundlesSale', by: DealSort): DealEntry[] => sortDeals(tab === 'bundlesSale' ? m.bundlesSale : m.bundles, by);
export const itemsFor = (m: KitsModel, by: DealSort): ItemEntry[] => sortItems(m.items, by);
