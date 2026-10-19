// What the start chooser offers (lane SD): the pure part, so the sale / bundle split and the tab choice are testable.
// Entries: scratch (a button, always), bundle, sale, starter tank (the examples), open (saved / file).
import { DEALS, pctOff, type Deal } from '../data/deals';
import { defaultProfile } from '../demand/types';
import { dealOffers } from '../demand/deals';
import { sceneFromDeal } from '../demand/dealscene';
import type { Scene } from '../scene/types';

export type StartTab = 'sale' | 'bundles' | 'starters' | 'open';
export interface DealEntry { deal: Deal; scene: Scene; savingUsd: number }

const DAY = 864e5, FRESH_DAYS = 30;
/** A listing with a higher regular price whose sale has not ended. */
export const onSale = (d: Deal, now = Date.now()) =>
  !!pctOff(d) && !(d.saleEnds && Date.parse(d.saleEnds + 'T23:59:59') < now);

/** Bundles the chooser can start: a real catalog tank, a listing checked in the last 30 days, not an estimate-only row.
 *  `sale` = on sale now (best saving against buying the parts first); `bundles` = every other one (cheapest first),
 *  so a bundle appears once. An empty list hides its tab. */
export function startDeals(now = Date.now(), deals: Deal[] = DEALS): { sale: DealEntry[]; bundles: DealEntry[] } {
  const sale: DealEntry[] = [], bundles: DealEntry[] = [];
  for (const deal of deals) {
    if (deal.est || now - Date.parse(deal.asOf) > FRESH_DAYS * DAY) continue;
    if (deal.saleEnds && Date.parse(deal.saleEnds + 'T23:59:59') < now && pctOff(deal)) continue; // an ended sale is not a bundle at that price either
    const scene = sceneFromDeal(deal);
    if (!scene) continue;
    const off = dealOffers(scene.tanks[0], defaultProfile(), { now }, [deal])[0];
    (onSale(deal, now) ? sale : bundles).push({ deal, scene, savingUsd: off ? off.savingUsd : 0 });
  }
  sale.sort((a, b) => b.savingUsd - a.savingUsd);
  bundles.sort((a, b) => a.deal.price.usd - b.deal.price.usd);
  return { sale, bundles };
}

/** Deal-tab orders, each named by what it sorts on (Nathan 2026-10-19: no "Best first" that means different things per
 *  tab). usd = dollars saved against buying the parts, most first; pct = that saving as a share of the parts, most first;
 *  cost = price, lowest first; size = rated gallons, smallest first. Ties go to the lower price. */
export type DealSort = 'usd' | 'pct' | 'cost' | 'size';
/** Each tab's starting order: sale by dollars saved, bundles by price. */
export const DEFAULT_SORT: Record<'sale' | 'bundles', DealSort> = { sale: 'usd', bundles: 'cost' };
export const pctSaved = (e: DealEntry) => e.savingUsd > 0 ? e.savingUsd / (e.deal.price.usd + e.savingUsd) : 0;
export function sortDeals(list: DealEntry[], by: DealSort): DealEntry[] {
  const key = (e: DealEntry) => by === 'size' ? e.deal.gal : by === 'cost' ? e.deal.price.usd : by === 'usd' ? -e.savingUsd : -pctSaved(e);
  return [...list].sort((a, b) => key(a) - key(b) || a.deal.price.usd - b.deal.price.usd);
}
/** Tabs to show, in order: sale and bundles only when they have something; starters and open always. */
export function visibleTabs(n: { sale: number; bundles: number }): StartTab[] {
  return [...(n.sale ? ['sale' as const] : []), ...(n.bundles ? ['bundles' as const] : []), 'starters', 'open'];
}
/** The tab to land on: the one asked for when it is shown, else the first (sale, then bundles, then starters). */
export function pickTab(want: StartTab | undefined, shown: StartTab[]): StartTab {
  return want && shown.includes(want) ? want : shown[0];
}
