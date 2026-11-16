// Lane DL1 (2026-11-16): deals and bundles in the new UI. Pure view-models; the old UI's engines (data/deals.ts, data/gearDeals.ts,
// demand/dealmatch.ts, data/tanks.ts saleLive) pick and price, this file only decides what the shell SHOWS.
// Nathan (via C25, 2026-11-16): a deal older than 14 days is hidden; no retailer photos; links are plain (no affiliate codes).
// The engines keep their own 30-day rule for pricing (changing it would move every cost figure); only the display is stricter.
import { DEAL_NOTE, DEALS, type Deal } from '../../data/deals';
import { GEAR_DEALS, gearPctOff, gearShip, gearTotalUsd, type GearDeal, type GearSlot } from '../../data/gearDeals';
import { saleLive, type TankVariant } from '../../data/tanks';
import { dealSwaps, MIN_SAVING_USD } from '../../demand/dealmatch';
import { gearFits, pinGear, pinnedGear, unpinGear } from '../../demand/gearDeals';
import type { UserProfile } from '../../demand/types';
import type { TankSetup } from '../../scene/types';

export const DEAL_SHOW_DAYS = 14;
const DAY = 864e5;
const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
/** "Nov 14" from an ISO date. */
export const shortDate = (iso: string) => new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
/** A listing read within the last DEAL_SHOW_DAYS days (a future date counts as fresh). */
export const showable = (asOf: string | undefined, now = Date.now()) => !!asOf && now - Date.parse(asOf.slice(0, 10) + 'T00:00:00') <= DEAL_SHOW_DAYS * DAY;
export { DEAL_NOTE };

// ---------- B: tank picker ----------
export interface TankSale { was: string; off: number; store: string; asOf: string; ends?: string; text: string }
/** The sale a catalogue variant is on right now, for display (live per the engine AND read within 14 days). */
export function tankSale(v: TankVariant | undefined, now = Date.now()): TankSale | undefined {
  if (!v || !saleLive(v, now) || !showable(v.checked, now) || v.price_usd == null || !v.regular_usd) return undefined;
  const off = Math.round((1 - v.price_usd / v.regular_usd) * 100), store = v.retailer ?? 'a retailer', asOf = v.checked!;
  return { was: usd(v.regular_usd), off, store, asOf, ...(v.sale_ends ? { ends: v.sale_ends } : {}),
    text: `was ${usd(v.regular_usd)} · ${off}% off · ${store}, as of ${shortDate(asOf)}${v.sale_ends ? `, ends ${shortDate(v.sale_ends)}` : ''}` };
}

// ---------- A: Equipment ----------
export interface GearSale { id: string; slot: GearSlot; title: string; store: string; price: string; was: string; off: number; ship: string; asOf: string; asOfText: string; url: string; pinned: boolean }
const SLOTS: GearSlot[] = ['light', 'filter', 'heater', 'skimmer', 'co2'];
export const isGearSlot = (c: string): c is GearSlot => (SLOTS as string[]).includes(c);
/** Specialist-store sales that suit this tank in this category, biggest discount first, at most `k`; the pinned one always shows. */
export function gearSales(S: TankSetup, cat: string, now = Date.now(), k = 3, list: GearDeal[] = GEAR_DEALS): GearSale[] {
  if (!isGearSlot(cat)) return [];
  const pin = new Set(pinnedGear(S, now, list).map(d => d.id));
  const fits = list.filter(d => d.slot === cat && gearFits(S, d, now) && gearTotalUsd(d) < d.price.regularUsd && (showable(d.asOf, now) || pin.has(d.id)));
  const top = fits.sort((a, b) => Number(pin.has(b.id)) - Number(pin.has(a.id)) || gearPctOff(b) - gearPctOff(a)).slice(0, Math.max(k, [...pin].length));
  return top.map(d => ({
    id: d.id, slot: d.slot, title: d.title, store: d.store, price: usd(d.price.usd), was: usd(d.price.regularUsd), off: gearPctOff(d),
    ship: gearShip(d).usd ? `+${usd(gearShip(d).usd)} shipping` : 'free shipping', asOf: d.asOf, asOfText: shortDate(d.asOf), url: d.url, pinned: pin.has(d.id),
  }));
}
/** Put a sale on the design (its price replaces the row's) or take it off. One store.edit each. */
export function useGearSale(S: TankSetup, id: string, on: boolean, list: GearDeal[] = GEAR_DEALS) {
  const d = list.find(x => x.id === id);
  if (d) on ? pinGear(S, d) : unpinGear(S, d.slot);
}

// ---------- D: Cost and time ----------
export interface BundleLine { id: string; name: string; retailer: string; price: string; was?: string; saving: string; asOfText: string; url: string; includes: string; text: string; guessed: boolean }
/** The one bundle worth a line in Cost and time: same tank, saves more than MIN_SAVING_USD, read within 14 days. */
export function bundleLine(S: TankSetup, P: UserProfile, now = Date.now(), deals: Deal[] = DEALS): BundleLine | undefined {
  const fresh = deals.filter(d => !d.est && showable(d.asOf, now));
  if (!fresh.length || !S.water.on) return undefined;
  let m;
  try { m = dealSwaps(S, P, { units: 'in', now }, fresh).find(w => !w.tradeoffs.length && w.savingUsd > MIN_SAVING_USD); } catch { return undefined; }
  if (!m) return undefined;
  const d = m.deal, saving = usd(m.savingUsd), inc = d.includes.join(', ');
  return { id: d.id, name: d.name, retailer: d.retailer, price: usd(d.price.usd), ...(d.price.regularUsd ? { was: usd(d.price.regularUsd) } : {}), saving, asOfText: shortDate(d.asOf), url: d.url,
    includes: inc, guessed: m.guesses.length > 0, text: `${d.retailer} ${d.name}, ${usd(d.price.usd)}: saves about ${saving} against buying the parts.` };
}
/** Sales for this build across every category, for the Cost drawer's one line ("2 sales fit this build"). */
export function gearSaleCount(S: TankSetup, now = Date.now()): { n: number; first?: GearSale } {
  const all = SLOTS.flatMap(c => gearSales(S, c, now, 1));
  return { n: all.length, first: all.sort((a, b) => b.off - a.off)[0] };
}
