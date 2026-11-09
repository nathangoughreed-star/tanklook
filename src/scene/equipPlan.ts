// Equipment as inventory + obligation + a derived shopping list (lane DX3, Nathan's Discovery spec section 3). Pure; no UI.
//   - OWNERSHIP (`constraints.owned` / `existingTank`) and OBLIGATION (`project.use === 'required'`, "Must use") are separate facts: moving an item between
//     "Must use" and "Have available" never un-owns it, and un-owning never drops a stated must-use (setOwnedUse / removeEquipment in project.ts keep that split).
//   - CREDIT: owned gear is $0 only when it MEETS the requirement (`capableCredit`, called by demand/engine.ts `demandOf`). Owned but inadequate = not credited, flagged.
//   - Must-use gear that is inadequate stays in the design, with a supplement to buy (a second filter, a heater to make up the watts), unless the project says
//     "No new equipment": then the design is INFEASIBLE with the reason (`equipPlan().infeasible`), never pretended sufficient.
//   - A Must-use light that is too weak CAPS the plants (`lightCapacity`): CO2 and fertilizer never substitute for light.
import type { Brief } from './brief';
import type { TankSetup } from './types';
import { equipmentOf, type EquipItem } from './project';
import { demandOf } from '../demand/engine';
import { defaultProfile, type UserProfile, type Range3 } from '../demand/types';
import { mean3 } from '../demand/range';
import { ownedFit } from './ownedFit';
import { capableOf, capableCredit, noNewEquipment, lightCapacity, withSupplements, type EquipFlag } from './equipCredit';
export { capableOf, capableCredit, noNewEquipment, lightCapacity, withSupplements };
export type { LightCapacity, EquipFlag } from './equipCredit';
export type { Capable } from './equipCredit';

export interface BuyLine { key: string; label: string; usd: number; kind: 'design' | 'supplement' }
export interface EquipPlan {
  /** owned items the design must use / owned items that may go unused (ownership untouched by the split) */
  mustUse: EquipItem[]; available: EquipItem[];
  /** the derived shopping list for THIS design: gear and furniture with a price left to pay (owned and capable = $0, so absent), supplements marked */
  toBuy: BuyLine[]; supplementUsd: number;
  /** every owned item that does not suit: not credited; must-use ones say what was added */
  flags: EquipFlag[];
  /** set when the design cannot work under the project's rules (a must-use item is too small and no new equipment is allowed, or a must-use tank is too small) */
  infeasible?: string;
  /** the scene that was priced: the design plus supplements */
  scene: TankSetup;
  /** what still has to be bought for the whole design (gear, animals, plants, hardscape, consumables; owned and capable = $0) and the monthly running cost, each a range */
  remaining: Range3; monthly: Range3; capsPlants: boolean;
}

const ZERO: Range3 = { lo: 0, mode: 0, hi: 0 };
const sumR = (xs: (Range3 | undefined)[]): Range3 => xs.reduce<Range3>((s, r) => r ? { lo: s.lo + r.lo, mode: s.mode + r.mode, hi: s.hi + r.hi } : s, ZERO);
const fitTo = (r: Range3, mean: number): Range3 => { const m = mean3(r), k = m > 0 ? mean / m : 0; return { lo: r.lo * k, mode: r.mode * k, hi: r.hi * k }; };

/** The whole equipment picture for the design on screen. */
export function equipPlan(S: TankSetup, b: Brief, P: UserProfile = defaultProfile()): EquipPlan {
  const items = equipmentOf(b).items;
  const sup = withSupplements(S, b), c = capableOf(S), flags: EquipFlag[] = [...sup.added];
  // every owned item that does not suit is flagged; the must-use ones already said what happened above
  for (const n of ownedFit(S, b)) if (!flags.some(f => f.item === n.item && /supplement|capped/.test(f.id)) && /small|dim/.test(n.id)) flags.push({ id: n.id, item: n.item, text: `${n.text} It is not counted as yours (priced as new gear).` });
  void c;
  const D = demandOf(sup.scene, P), plain = demandOf(S, P);
  const row = (i: Contribution2) => ({ key: i.key, label: i.label, usd: Math.round(mean3(i.setup!)) });
  const rows = D.items.filter(i => i.setup && (i.group === 'gear' || i.group === 'tank') && mean3(i.setup) >= 0.5);
  const baseKeys = new Set(plain.items.filter(i => i.setup && mean3(i.setup) >= 0.5).map(i => i.key));
  const toBuy: BuyLine[] = rows.map(i => ({ ...row(i), kind: 'design' as const }));
  // a supplement shows as its own line: the part of the filter / heater price the plain design did not have
  let supplementUsd = 0;
  for (const k of sup.supplemented) {
    const a = D.items.find(i => i.key === k), p = plain.items.find(i => i.key === k), d = Math.round(mean3(a?.setup ?? ZERO) - mean3(p?.setup ?? ZERO));
    if (d > 0) { supplementUsd += d; const line = toBuy.find(l => l.key === k); if (line) { line.usd -= d; line.kind = 'design'; } toBuy.push({ key: `${k}:supplement`, label: k === 'filter' ? 'Second filter (adds to the one you must use)' : 'Added heater (adds to the one you must use)', usd: d, kind: 'supplement' }); }
  }
  void baseKeys;
  const setups = sumR(D.items.map(i => i.setup)), ups = sumR(D.items.map(i => i.upkeep));
  return {
    mustUse: items.filter(i => i.use === 'required'), available: items.filter(i => i.use !== 'required'),
    toBuy: toBuy.filter(l => l.usd >= 1), supplementUsd, flags, ...(sup.infeasible ? { infeasible: sup.infeasible } : {}), scene: sup.scene,
    remaining: fitTo(setups, D.totals.setupUsd), monthly: fitTo(ups, D.totals.upkeepUsdMo), capsPlants: lightCapacity(S, b).capsPlants,
  };
}
type Contribution2 = import('../demand/types').Contribution;
