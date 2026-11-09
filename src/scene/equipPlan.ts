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
import { projectExtras } from './brief';
import { filterUnits, heatLoss, heaterUnits, withUnits } from './tech';
import { stockingOf } from './stocking';
import { lightOutCached } from './lightout';
import { parWanted } from '../demand/needs';
import { demandOf } from '../demand/engine';
import { defaultProfile, type UserProfile, type Range3 } from '../demand/types';
import { mean3 } from '../demand/range';
import { ownedFit } from './ownedFit';
import { capableOf, capableCredit } from './equipCredit';
export { capableOf, capableCredit };
export type { Capable } from './equipCredit';

/** "No new equipment": the project allows nothing to be bought beyond what is owned. Stored in the project extras of the brief. */
export const noNewEquipment = (b: Brief): boolean => projectExtras(b).noNewEquipment === true;

/** What the light on screen delivers against what the plants want, and whether it caps them: a Must-use light that is too weak (PAR is the only thing that
 *  counts: CO2 and fertilizer never substitute). DX1's verdict reads `capsPlants` and `parHave / parWant`. */
export interface LightCapacity { parHave: number; parWant: number; shortfall: number; mustUse: boolean; capsPlants: boolean }
export function lightCapacity(S: TankSetup, b: Brief): LightCapacity {
  const want = S.water.on ? parWanted(S) : 0, have = lightOutCached(S)?.mean ?? 0, weak = want > 0 && have < want;
  const must = equipmentOf(b).items.some(i => i.key === 'light' && i.use === 'required') && !!S.light.owned;
  return { parHave: have, parWant: want, shortfall: weak ? want - have : 0, mustUse: must, capsPlants: must && weak };
}

export interface BuyLine { key: string; label: string; usd: number; kind: 'design' | 'supplement' }
export interface EquipFlag { id: string; item: string; text: string; blocks?: boolean }
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

/** The design as the project can actually build it: must-use gear kept, a supplement added where it falls short (when new equipment is allowed). */
export function withSupplements(S: TankSetup, b: Brief): { scene: TankSetup; added: EquipFlag[]; infeasible?: string; supplemented: Set<string> } {
  const items = equipmentOf(b).items, must = (k: string) => items.some(i => i.key === k && i.use === 'required'), none = noNewEquipment(b);
  const c = capableOf(S), added: EquipFlag[] = [], supplemented = new Set<string>();
  let out = S, infeasible: string | undefined;
  const fail = (why: string) => { infeasible ??= why; };
  // a must-use tank too small for the animals: nothing can be added to a tank
  if (must('tank')) for (const n of ownedFit(S, b)) if (n.id === 'tank:small') fail(`${n.text} It is marked Must use, and a tank cannot be added to: pick a smaller stock or give up Must use on the tank.`);
  if (!S.water.on) return { scene: out, added, ...(infeasible ? { infeasible } : {}), supplemented };
  if (must('filter') && c.filter === false && out.tech) {
    if (none) fail('Your filter is marked Must use and is too small for these animals, and the project allows no new equipment. Add a filter, drop a few animals, or allow new equipment.');
    else {
      const owned = filterUnits(out.tech).filter(u => u.owned), kind = owned[0]?.kind ?? 'canister';
      for (let i = 0; i < 2 && stockingOf(out).filtrationPercent > 100; i++) out = { ...out, tech: withUnits(out.tech!, 'filter', [...filterUnits(out.tech!), { kind }]) };
      supplemented.add('filter');
      added.push({ id: 'filter:supplement', item: 'filter', text: `Your filter is kept (Must use) and a second one is added to cover the load.` });
      if (stockingOf(out).filtrationPercent > 100) fail('Your must-use filter plus two more still cannot keep up with these animals. Drop animals or choose a bigger tank.');
    }
  }
  if (must('heater') && c.heater === false && out.tech) {
    if (none) fail('Your heater is marked Must use and is too small for this tank, and the project allows no new equipment. Add heat, pick a smaller or warmer-room setup, or allow new equipment.');
    else {
      const hl = heatLoss(out, out.tech), have = hl.units.filter(u => u.owned).reduce((s, u) => s + u.watts, 0), w = Math.max(25, Math.ceil((hl.needW - have) / 25) * 25);
      out = { ...out, tech: withUnits(out.tech, 'heater', [...heaterUnits(out.tech), { w }]) };
      supplemented.add('heater');
      added.push({ id: 'heater:supplement', item: 'heater', text: `Your heater is kept (Must use) and a ${w} W one is added to make up the heat.` });
    }
  }
  if (must('light') && c.light === false) {
    const lc = lightCapacity(S, b);
    if (none) added.push({ id: 'light:capped', item: 'light', text: `Your light is Must use and too dim for these plants, so the plants are limited to what it can grow (no new equipment).`, blocks: false });
    else added.push({ id: 'light:capped', item: 'light', text: `Your light is Must use and too dim for these plants (${Math.round(lc.parHave)} of ${Math.round(lc.parWant)} PAR). It caps the plants; CO2 and fertilizer do not make up for light. Allow a second light or drop Must use to grow them.`, blocks: false });
  }
  return { scene: out, added, ...(infeasible ? { infeasible } : {}), supplemented };
}

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
