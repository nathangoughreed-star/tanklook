// Gear sales in the demand panel (lane GD): which specialist-store sales fit this build's light, filter, heater, skimmer and
// CO2 rows, and the ones the user chose to price a row with. A choice rides on the tank object as `gearPins` (slot -> deal id),
// like `dealPin` (pinned.ts): undo and split carry it, a saved file drops it. A pin stops counting, silently, once the deal no
// longer fits (the tank was resized, the heater changed) or is older than GEAR_DEAL_DAYS; the deal's own sale price is what
// the row then costs, so picking a dearer product than the typical one raises the cost (that is the point: it is the real thing).
import { GEAR_DEALS, GEAR_DEAL_DAYS, gearPctOff, gearShip, gearTotalUsd, type GearDeal, type GearSlot } from '../data/gearDeals';
import { heatLoss } from '../scene/tech';
import { volume } from '../scene/physics';
import type { TankSetup } from '../scene/types';
import type { Demand } from './types';
import { mean3 } from './range';

export const GEAR_SLOT_NAME: Record<GearSlot, string> = { light: 'light', filter: 'filter', heater: 'heater', skimmer: 'protein skimmer', co2: 'CO2 kit' };
const fresh = (d: GearDeal, now: number) => now - Date.parse(d.asOf + 'T00:00:00') <= GEAR_DEAL_DAYS * 864e5;

/** Does deal `d` do the job of this tank's `d.slot` row? Unsized rows are never offered (co2 needs no size). */
export function gearFits(S: TankSetup, d: GearDeal, now = Date.now()): boolean {
  if (!S.water.on || !fresh(d, now)) return false;
  const salt = !!S.water.salt, gal = volume(S.tank).gallons;
  switch (d.slot) {
    case 'light': return d.salt === salt && !!d.fitMm && S.tank.L >= d.fitMm[0] && S.tank.L <= d.fitMm[1];
    case 'heater': { if (!d.watts) return false; const w = heatLoss(S).heater.watts; return d.watts >= w * 0.8 && d.watts <= w * 1.6; }
    case 'filter': return !!d.galMax && d.galMax >= gal && d.galMax <= gal * 4;
    case 'skimmer': return salt && !!d.galMax && d.galMax >= gal && d.galMax <= gal * 3;
    case 'co2': return !salt;
  }
}

type Pins = Partial<Record<GearSlot, string>>;
const pins = (t?: TankSetup): Pins => (t as (TankSetup & { gearPins?: Pins }) | undefined)?.gearPins ?? {};
export function pinGear(t: TankSetup, d: GearDeal) { (t as TankSetup & { gearPins?: Pins }).gearPins = { ...pins(t), [d.slot]: d.id }; }
export function unpinGear(t: TankSetup, slot: GearSlot) {
  const p = { ...pins(t) }; delete p[slot];
  (t as TankSetup & { gearPins?: Pins }).gearPins = p;
}
/** The deals pricing this tank's rows now (a pin that no longer fits is left out). */
export function pinnedGear(S: TankSetup, now = Date.now(), list: GearDeal[] = GEAR_DEALS): GearDeal[] {
  return Object.values(pins(S)).map(id => list.find(d => d.id === id)).filter((d): d is GearDeal => !!d && gearFits(S, d, now));
}
/** The engine's `parts` option: each pinned deal's price for its row. */
export function gearParts(S: TankSetup, now = Date.now()) {
  const out: Record<string, { usd: number; asOf: string; label: string }> = {};
  for (const d of pinnedGear(S, now)) out[d.slot] = { usd: gearTotalUsd(d), asOf: d.asOf, label: `${d.title}, on sale at ${d.store}${gearShip(d).usd ? ` (+$${gearShip(d).usd} shipping)` : ''}` };
  return out;
}

/** Sales worth showing for this build: per row that has a set-up price and is not pinned, the biggest discount that fits and
 *  costs at most `maxOver` times what the row is priced at now (a $900 reef light is no offer for a $60 light row). */
export function gearOffers(S: TankSetup, D: Demand, now = Date.now(), maxOver = 2.5, list: GearDeal[] = GEAR_DEALS): GearDeal[] {
  const pinned = new Set(pinnedGear(S, now, list).map(d => d.slot)), out: GearDeal[] = [];
  for (const slot of Object.keys(GEAR_SLOT_NAME) as GearSlot[]) {
    const row = D.items.find(c => c.key === slot);
    if (!row?.setup || pinned.has(slot)) continue;
    const typical = mean3(row.setup), cap = typical * maxOver;
    const best = list.filter(d => d.slot === slot && gearTotalUsd(d) <= cap && gearTotalUsd(d) < d.price.regularUsd && gearFits(S, d, now)).sort((a, b) => gearPctOff(b) - gearPctOff(a))[0];
    if (best) out.push(best);
  }
  return out;
}
