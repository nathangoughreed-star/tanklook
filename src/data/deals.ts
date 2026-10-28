import data from './deals.json';
import { kitById, kitGear } from './kits';
import { shipping } from './shipping';
import type { FilterSpec } from '../demand/gear';

/** Retailer bundle deals (lane KD, 2026-10): a tank sold with its stand (and sometimes lid, light, filter, heater) for one price.
 *  Rows are researched by the sweep in prompts/deals-sweep.md; `est` marks a row with no live listing found. */
export type DealPart = 'tank' | 'stand' | 'lid' | 'light' | 'filter' | 'heater' | 'dome' | 'bulb' | 'uvb' | 'gauge';
/** The demand-engine row each terrarium part replaces (the Tech rows of scene/tech.ts: the heat lamp row is the dome fixture and the bulb together); the aquarium parts use their own names. A kit's UVB
 *  is listed in `includes` only when it is worth using in place of the build's own (a 23 W compact is not a linear T5). */
const DRY_KEY: Partial<Record<DealPart, string>> = { dome: 'heatlamp', bulb: 'heatlamp', uvb: 'uvb', gauge: 'gauge' };
export interface Deal {
  id: string;
  retailer: string;
  name: string;
  /** rated gallons of the tank in the bundle */
  gal: number;
  /** TankModel id (src/data/tanks.json) when the bundle's tank is a catalog size */
  tank?: string;
  /** the bundle tank's own OUTER size in inches, from the listing or the box; it re-sizes the catalog tank (whose shape still applies). Absent = the catalog size stands in, shown as a guess */
  dims?: { L_in: number; D_in: number; H_in: number };
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
  /** the listing's own product photo (the retailer's image server, linked not copied); absent = the scene snapshot or sketch */
  img?: string;
  asOf: string;
  est?: boolean;
  /** a land enclosure (terrarium) kit or tank: matched by `dims` to the build's terrarium, never offered for an aquarium (lane KT, 2026-10-27) */
  terrarium?: boolean;
  /** how sure the row is: 'low' = read from a search snippet, page not opened (such a row never prices a build, whether or not it is `est`) */
  confidence?: 'high' | 'medium' | 'low';
  /** sold for store pickup only: no shipping to add (lane BS) */
  pickupOnly?: boolean;
  note?: string;
}
/** Every guess behind a deal, in plain words: the row's own list plus a light whose power the listing does not give. */
export function dealGuesses(d: Deal): string[] {
  const g = [...(d.look?.guessed ?? [])];
  if (d.tank && !d.dims) g.push('tank size: the listing\'s dimensions are not recorded, so the standard catalog tank of this size is used');
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
    // rated vs measured: a tank measures a little over its label (a 75 is about 79 gal inside), so the slack is one-sided
    .filter((d) => !d.terrarium && d.gal - gal <= tol && gal - d.gal <= Math.max(tol, gal * 0.07) &&
 (stand || !d.includes.includes('stand')) && (!d.saleEnds || day(d.saleEnds) >= now))
    .sort((a, b) => a.price.usd - b.price.usd);
}

/** What it costs to get the deal to your door: free over the retailer's threshold, none for store pickup (shipping.json). */
export const dealShip = (d: Deal) => shipping(d.retailer, d.price.usd, d.pickupOnly);
/** Listing price plus shipping: what the deal costs you. */
export const dealTotalUsd = (d: Deal) => d.price.usd + dealShip(d).usd;

/** The engine's `kit` option for a deal (its price, shipping included, replaces the parts it includes). */
export const dealAsKit = (d: Deal) => {
  const k = d.kit ? kitById(d.kit) : undefined, g = k ? kitGear(k) : undefined;
  return {
    id: d.id, priceUsd: dealTotalUsd(d), asOf: d.asOf, includes: d.includes.map((p) => DRY_KEY[p] ?? p), label: `${d.retailer} ${d.name}`,
    filter: d.includes.includes('filter') ? d.filter ?? g?.filter : undefined,
    heater: d.includes.includes('heater') ? d.heater ?? g?.heater : undefined,
  };
};

/** A deal's saving split into its two sources, which stack: the sale (list price minus sale price) and the bundle
 *  (buying the parts separately, the app's estimate, minus the bundle's list price). `total` = parts minus what you pay. */
export function savingSplit(d: Deal, totalUsd: number): { total: number; sale: number; bundle: number } {
  const sale = d.price.regularUsd && d.price.regularUsd > d.price.usd ? d.price.regularUsd - d.price.usd : 0;
  return { total: totalUsd, sale, bundle: totalUsd - sale };
}
/** One line for a card or the demand panel, e.g. "Save about $95: $30 sale + $65 bundle, against buying the parts". */
export function savingLine(d: Deal, totalUsd: number): string {
  const { total, sale, bundle } = savingSplit(d, totalUsd), $ = (v: number) => '$' + Math.round(Math.abs(v)).toLocaleString('en-US');
  if (sale > 0 && bundle > 1) return `Save about ${$(total)}: ${$(sale)} sale + ${$(bundle)} bundle, against buying the parts`;
  if (sale > 0 && total > 1) return `Save about ${$(total)}, all from the ${$(sale)} sale (at full price the bundle is about ${$(bundle)} over buying the parts)`;
  if (sale > 0) return total >= -1 ? `${$(sale)} off on sale, which brings it to about the same as buying the parts` : `${$(sale)} off on sale, but still about ${$(total)} over buying the parts`;
  if (bundle > 1) return `Save about ${$(bundle)} as a bundle, against buying the parts`;
  return Math.abs(bundle) <= 1 ? 'About the same as buying the parts' : `About ${$(bundle)} over buying the parts`;
}
/** Whole-percent discount from the list price, or undefined when the listing shows no higher regular price. */
export const pctOff = (d: Deal): number | undefined => (d.price.regularUsd && d.price.regularUsd > d.price.usd ? Math.round((1 - d.price.usd / d.price.regularUsd) * 100) : undefined);
