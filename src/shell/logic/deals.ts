// Lane DL1 (2026-11-16): deals and bundles in the new UI. Pure view-models; the old UI's engines (data/deals.ts, data/gearDeals.ts,
// demand/dealmatch.ts, data/tanks.ts saleLive) pick and price, this file only decides what the shell SHOWS.
// Nathan (R112, 2026-11-18): "just keep them on until a recheck sweep proves otherwise": a deal stays shown, with its "as of <date>", until the
// sweep marks its row `expired` or `gone` in the data file. No retailer photos; links are plain (no affiliate codes).
// The engines keep their own 30-day rule for pricing (changing it would move every cost figure); this file adds no age rule.
import { boxList } from './boxList';
import { DEAL_NOTE, DEALS, dealAsKit, type Deal } from '../../data/deals';
import { GEAR_DEALS, gearPctOff, gearShip, gearTotalUsd, type GearDeal, type GearSlot } from '../../data/gearDeals';
import { saleLive, type TankVariant } from '../../data/tanks';
import { dealPartLines, dealSwaps, MIN_SAVING_USD, type DealSwap } from '../../demand/dealmatch';
import { kitTech } from '../../demand/tech';
import { pinTank } from '../../demand/pinned';
import { lockKitParts, unlockObject } from '../../scene/locks';
import type { Store } from '../../scene/store';
import { gearFits, pinGear, pinnedGear, unpinGear } from '../../demand/gearDeals';
import type { UserProfile } from '../../demand/types';
import type { TankSetup } from '../../scene/types';

const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
/** "Nov 14" from an ISO date. */
export const shortDate = (iso: string) => new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
/** Shown unless the sweep proved it gone: a row with a date, not marked `expired` or `gone` (R112). `_now` is kept so call sites read the same. */
export const showable = (asOf: string | undefined, _now?: number, row?: { expired?: boolean; gone?: boolean }) => !!asOf && !row?.expired && !row?.gone;
export { DEAL_NOTE };

// ---------- B: tank picker ----------
export interface TankSale { was: string; off: number; store: string; asOf: string; ends?: string; text: string }
/** The sale a catalogue variant is on right now, for display (live per the engine, not marked expired). */
export function tankSale(v: TankVariant | undefined, now = Date.now()): TankSale | undefined {
  if (!v || !saleLive(v, now) || !showable(v.checked, now, v as { expired?: boolean }) || v.price_usd == null || !v.regular_usd) return undefined;
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
  const fits = list.filter(d => d.slot === cat && gearFits(S, d, now) && gearTotalUsd(d) < d.price.regularUsd && (showable(d.asOf, now, d) || pin.has(d.id)));
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
export interface BundleLine { id: string; name: string; retailer: string; price: string; was?: string; saving: string; asOfText: string; url: string; includes: string; text: string; guessed: boolean; /** what the bundle's gear does worse for this build */ worse: string[] }
/** The one bundle worth a line in Cost and time: same tank, saves more than MIN_SAVING_USD, not marked expired; what it does worse is listed, not hidden. */
export function bundleLine(S: TankSetup, P: UserProfile, now = Date.now(), deals: Deal[] = DEALS): BundleLine | undefined {
  const fresh = deals.filter(d => !d.est && showable(d.asOf, now, d));
  if (!fresh.length || !S.water.on) return undefined;
  let m;
  try { m = dealSwaps(S, P, { units: 'in', now }, fresh).find(w => w.savingUsd > MIN_SAVING_USD); } catch { return undefined; }
  if (!m) return undefined;
  const d = m.deal, saving = usd(m.savingUsd), inc = boxList(d.includes).have.join(', ').toLowerCase();
  return { id: d.id, name: d.name, retailer: d.retailer, price: usd(d.price.usd), ...(d.price.regularUsd ? { was: usd(d.price.regularUsd) } : {}), saving, asOfText: shortDate(d.asOf), url: d.url,
    includes: inc, guessed: m.guesses.length > 0, worse: m.tradeoffs.slice(0, 3), text: `${d.retailer} ${d.name}, ${usd(d.price.usd)}: saves about ${saving} against buying the parts.` };
}
/** Sales for this build across every category, for the Cost drawer's one line ("2 sales fit this build"). */
export function gearSaleCount(S: TankSetup, now = Date.now()): { n: number; first?: GearSale } {
  const all = SLOTS.flatMap(c => gearSales(S, c, now, 1));
  return { n: all.length, first: all.sort((a, b) => b.off - a.off)[0] };
}

// ---------- R136: Apply the bundle ----------
export interface ApplyPlan { deal: Deal; title: string; price: string; saving: string; /** one line per part swapped in, better or worse in numbers */ lines: string[]; /** other consequences (stocking, tank, engine warnings) */ worse: string[]; /** what the user loses: a part they or a kit locked that the bundle replaces */ loses: string[]; swap: DealSwap }
const LOCKED: [string, string][] = [['light', 'light'], ['filter', 'filter'], ['heater', 'heater']];
/** What Apply on the bundle card would do, as lines for the confirm. Undefined when the bundle no longer fits the build. */
export function applyPlan(S: TankSetup, P: UserProfile, id: string, now = Date.now(), deals: Deal[] = DEALS): ApplyPlan | undefined {
  let w: DealSwap | undefined;
  try { w = dealSwaps(S, P, { units: 'in', now }, deals.filter(d => showable(d.asOf, now, d))).find(x => x.deal.id === id); } catch { return undefined; }
  if (!w) return undefined;
  const d = w.deal, lines = dealPartLines(S, w.setup, d);
  const loses = LOCKED.filter(([t]) => d.includes.includes(t as never) && S.locks?.objects.some(o => o.target === t))
    .map(([t, n]) => `Your locked ${n} is replaced${S.locks!.objects.find(o => o.target === t)?.kit ? ' (it was locked by the kit you started from)' : ' (you locked it)'}`);
  const worse = w.tradeoffs.filter(x => !/gph|PAR at the substrate|W heater/.test(x));
  return { deal: d, title: `${d.retailer} ${d.name}`, price: usd(d.price.usd), saving: usd(w.savingUsd), lines, worse, loses, swap: w };
}
/** Put the bundle's parts into the active tank as kit parts, held like a kit start (lockKitParts) and priced as the bundle (pinTank). One undo step. */
export function applyBundle(store: Store, plan: ApplyPlan) {
  const d = plan.deal, has = (p: string) => d.includes.includes(p as never), i = store.scene.active;
  // the replaced parts' old locks go first (a kit lock would make the store ask a second time)
  store.editTank(i, t => { for (const [g] of LOCKED) if (has(g)) unlockObject(t, g); }, { history: false });
  store.editTank(i, t => {
    const T = structuredClone(plan.swap.setup), kit = dealAsKit(d), kt = kitTech(T, kit);
    if (has('stand')) t.stand = T.stand;
    if (has('lid')) t.lid = T.lid;
    if (has('light')) t.light = T.light;
    if (kt) {
      const cur = structuredClone(t.tech ?? kt);
      if (has('filter')) { cur.rows.filter = kt.rows.filter; cur.filters = kt.filters; delete cur.filterProduct; delete cur.filterModel; }
      if (has('heater')) { cur.rows.heater = kt.rows.heater; cur.heaters = kt.heaters; delete cur.heaterProduct; delete cur.heaterW; }
      t.tech = cur;
    }
    lockKitParts(t, d.includes);
    pinTank(t, d);
  });
}
