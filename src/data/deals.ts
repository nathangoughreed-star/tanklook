import data from './deals.json';

/** Retailer bundle deals (lane KD, 2026-10): a tank sold with its stand (and sometimes lid, light, filter, heater) for one price.
 *  Rows are researched by the sweep in prompts/deals-sweep.md; `est` marks a row with no live listing found. */
export type DealPart = 'tank' | 'stand' | 'lid' | 'light' | 'filter' | 'heater';
export interface Deal {
  id: string;
  retailer: string;
  name: string;
  /** rated gallons of the tank in the bundle */
  gal: number;
  /** TankModel id (src/data/tanks.json) when the bundle's tank is a catalog size */
  tank?: string;
  /** kit id (src/data/kits.json) giving the light and lid spec when the bundle is a known kit */
  kit?: string;
  includes: DealPart[];
  price: { usd: number; /** list price before the sale */ regularUsd?: number };
  /** ISO date the sale ends, when the listing says */
  saleEnds?: string;
  url: string;
  asOf: string;
  est?: boolean;
  note?: string;
}
export const DEALS = (data as unknown as { deals: Deal[] }).deals;
export const DEALS_AS_OF = (data as { asOf: string }).asOf;
export const DEAL_NOTE = 'as of the date shown; sales change, so check the current price';
const day = (d: string) => Date.parse(d + 'T23:59:59');

/** Deals worth showing for a tank of `gal` rated gallons (within `tol` gallons), cheapest first; expired sales are dropped.
 *  `stand` = the user's build shows a stand: a deal that includes one only helps then. */
export function dealsFor(gal: number, stand: boolean, now = Date.now(), tol = 2.5, list: Deal[] = DEALS): Deal[] {
  return list
    .filter((d) => Math.abs(d.gal - gal) <= tol && (stand || !d.includes.includes('stand')) && (!d.saleEnds || day(d.saleEnds) >= now))
    .sort((a, b) => a.price.usd - b.price.usd);
}

/** The engine's `kit` option for a deal (its price replaces the parts it includes). */
export const dealAsKit = (d: Deal) => ({ id: d.id, priceUsd: d.price.usd, asOf: d.asOf, includes: d.includes as string[], label: `${d.retailer} ${d.name}` });
