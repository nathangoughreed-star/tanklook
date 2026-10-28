// Gear on sale at specialist stores (lane GD, 2026-10-20): Buce Plant, Aqua Forest Aquarium, Aquarium Co-Op, CO2Art (Shopify
// product feeds) and Bulk Reef Supply (its product pages), read by scripts/gear-deals.py with no model calls. Each row is one
// product (or one size of it) in stock and at least 5 % off; sizes come from the product name (see the script).
import data from './gear-deals.json';
import { shipping } from './shipping';

/** The demand engine row a deal can stand in for. */
export type GearSlot = 'light' | 'filter' | 'heater' | 'skimmer' | 'co2';
export interface GearDeal {
  id: string;
  store: string;
  slot: GearSlot;
  /** reef gear (a reef light is offered only for salt water) */
  salt: boolean;
  title: string;
  /** light: the tank lengths it suits, mm */
  fitMm?: [number, number];
  /** heater */
  watts?: number;
  /** filter / skimmer: rated gallons */
  galMax?: number;
  price: { usd: number; regularUsd: number };
  url: string;
  asOf: string;
}
export const GEAR_DEALS = (data as unknown as { rows: GearDeal[] }).rows;
export const GEAR_DEALS_AS_OF = (data as { asOf: string }).asOf;
/** A sale read longer ago than this is not offered (the bundle strip uses the same 30 days). */
export const GEAR_DEAL_DAYS = 30;
/** Shipping on this sale (free over the store's threshold, shipping.json) and what the part costs delivered. */
export const gearShip = (d: GearDeal) => shipping(d.store, d.price.usd);
export const gearTotalUsd = (d: GearDeal) => d.price.usd + gearShip(d).usd;
export const gearPctOff = (d: GearDeal) => Math.round((1 - d.price.usd / d.price.regularUsd) * 100);
