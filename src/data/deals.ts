import data from './deals.json';
import { kitById, kitGear } from './kits';
import type { FilterSpec } from '../demand/gear';

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
  /** the real filter / heater in the bundle when it lists one (product name, class, rating); matched to a generic model. Absent = the linked kit's, else the tank-size default */
  filter?: FilterSpec;
  heater?: { watts: number };
  /** the stand as pictured on the listing (default black cabinet) and the lid type (default: hood when a lid is included) */
  look?: { style?: 'cabinet' | 'frame'; finish?: 'black' | 'white' | 'oak'; lid?: 'glass' | 'hood' | 'mesh'; /** what the listing says about the light; anything absent is a guess and is shown as one */ light?: { brand?: string; model?: string; watts?: number; kelvin?: number; par?: number; /** the listing's own words */ says?: string }; /** things on this row that are guesses, in plain words (shown on the card and in the panel) */ guessed?: string[] };
  price: { usd: number; /** list price before the sale */ regularUsd?: number };
  /** ISO date the sale ends, when the listing says */
  saleEnds?: string;
  url: string;
  asOf: string;
  est?: boolean;
  note?: string;
}
/** Every guess behind a deal, in plain words: the row's own list plus a light whose power the listing does not give. */
export function dealGuesses(d: Deal): string[] {
  const g = [...(d.look?.guessed ?? [])];
  if (d.includes.includes('light')) {
    const L = d.look?.light;
    if (!L?.watts) g.push('light power and brightness: the listing gives no watts, so a typical budget LED for this tank size is assumed');
    else if (!L.par) g.push('light PAR: estimated from the watts');
  }
  return g;
}
export const DEALS = (data as unknown as { deals: Deal[] }).deals;
export const DEALS_AS_OF = (data as { asOf: string }).asOf;
export const DEAL_NOTE = 'as of the date shown; sales change, so check the current price';
/** Shown wherever deals are listed: the links are plain (no affiliate codes) and nobody pays to be listed. */
export const NOT_SPONSORED = 'We are not sponsored by any retailer or brand, and the links are plain links with no affiliate codes';
const day = (d: string) => Date.parse(d + 'T23:59:59');

/** Deals worth showing for a tank of `gal` rated gallons (within `tol` gallons), cheapest first; expired sales are dropped.
 *  `stand` = the user's build shows a stand: a deal that includes one only helps then. */
export function dealsFor(gal: number, stand: boolean, now = Date.now(), tol = 2.5, list: Deal[] = DEALS): Deal[] {
  return list
    .filter((d) => Math.abs(d.gal - gal) <= tol && (stand || !d.includes.includes('stand')) && (!d.saleEnds || day(d.saleEnds) >= now))
    .sort((a, b) => a.price.usd - b.price.usd);
}

/** The engine's `kit` option for a deal (its price replaces the parts it includes). */
export const dealAsKit = (d: Deal) => {
  const k = d.kit ? kitById(d.kit) : undefined, g = k ? kitGear(k) : undefined;
  return {
    id: d.id, priceUsd: d.price.usd, asOf: d.asOf, includes: d.includes as string[], label: `${d.retailer} ${d.name}`,
    filter: d.includes.includes('filter') ? d.filter ?? g?.filter : undefined,
    heater: d.includes.includes('heater') ? d.heater ?? g?.heater : undefined,
  };
};

/** Whole-percent discount from the list price, or undefined when the listing shows no higher regular price. */
export const pctOff = (d: Deal): number | undefined => (d.price.regularUsd && d.price.regularUsd > d.price.usd ? Math.round((1 - d.price.usd / d.price.regularUsd) * 100) : undefined);
