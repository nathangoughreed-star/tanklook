import data from './shipping.json';

/** Shipping for an online order (lane BS, 2026-10-27): what a retailer charges to ship one order, so a deal's price is what
 *  reaches the door. Policies are in shipping.json (researched with sources; `est` marks a value not confirmed on the retailer's
 *  own page). Free over the retailer's threshold; a row sold for store pickup only carries no shipping. */
interface Policy { standardShipUsd: number | null; /** a cheaper rate from `tier2OverUsd` up (LiveAquaria) */ tier2Usd?: number; tier2OverUsd?: number; freeOverUsd: number | null; pickupFree?: boolean; est?: boolean; bigItemNote?: string; plantsShipNote?: string; sourceUrl?: string; asOf?: string }
const POLICIES = (data as unknown as { retailers: Record<string, Policy> }).retailers;
/** Names a deal row uses that differ from the policy table's. */
const ALIAS: Record<string, string> = { Amazon: 'Amazon non-Prime', Etsy: 'Etsy plant sellers (typical)', 'Aquarium Plants Factory': 'Aquarium Plants Factory' };
export const policyFor = (retailer: string): Policy | undefined => POLICIES[ALIAS[retailer] ?? retailer];

export interface Shipping { usd: number; /** the order is free to ship, or picked up in store */ free: boolean; pickup: boolean; /** the charge is a guess (retailer not confirmed, or not in the table) */ est: boolean; /** "free shipping", "store pickup", "+$6 shipping" */ text: string }
/** Shipping on an order of `orderUsd` from `retailer`. `pickupOnly`: the listing is store pickup only (no shipping). */
export function shipping(retailer: string, orderUsd: number, pickupOnly = false): Shipping {
  if (pickupOnly) return { usd: 0, free: true, pickup: true, est: false, text: 'store pickup, no shipping' };
  const p = policyFor(retailer);
  if (!p || p.standardShipUsd == null) return { usd: 0, free: false, pickup: false, est: true, text: 'shipping not checked' };
  if (p.freeOverUsd != null && orderUsd >= p.freeOverUsd) return { usd: 0, free: true, pickup: false, est: !!p.est, text: 'free shipping' };
  const usd = p.tier2Usd != null && p.tier2OverUsd != null && orderUsd >= p.tier2OverUsd ? p.tier2Usd : p.standardShipUsd;
  return { usd, free: false, pickup: false, est: !!p.est, text: `${p.est ? 'about ' : ''}+$${usd % 1 ? usd.toFixed(2) : usd} shipping` };
}
