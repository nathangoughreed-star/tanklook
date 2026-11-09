// Capability-aware credit for owned gear (lane DX3). Kept apart from equipPlan.ts so demand/engine.ts can import it without a cycle.
// starter first: starter <-> stocking import each other, and starter needs stocking's constants only after both have loaded (entering through stocking first breaks it)
import './starter';
import type { TankSetup } from './types';
import { filterUnits, heatLoss, heaterUnits, withUnits } from './tech';
import { stockingOf } from './stocking';
import { lightOutCached } from './lightout';
import { parWanted } from '../demand/needs';
import type { Brief } from './brief';
import { projectExtras } from './brief';
import { equipmentOf } from './project';
import { ownedFit } from './ownedFit';

const WATT_SLACK = 0.95; // the same tolerance ownedFit uses

/** Is this owned item able to do its job in THIS design? Only the three gear items with a rated capability (light PAR, heater watts, filter load) are judged;
 *  anything else (test kit, net, lid ...) has no capability to fall short of. A tank is judged by ownedFit (`tank:small`). */
export interface Capable { light?: boolean; heater?: boolean; filter?: boolean }
export function capableOf(S: TankSetup): Capable {
  const out: Capable = {};
  if (!S.water.on) return out;
  if (S.light.owned) { const want = parWanted(S); out.light = !(want > 0 && (lightOutCached(S)?.mean ?? 0) < want); }
  const t = S.tech;
  if (t && heaterUnits(t).some(u => u.owned)) { const hl = heatLoss(S, t); out.heater = !(hl.needW > 0 && hl.units.filter(u => u.owned).reduce((s, u) => s + u.watts, 0) < hl.needW * WATT_SLACK); }
  if (t && filterUnits(t).some(u => u.owned)) out.filter = !(S.fish.length && stockingOf(S).filtrationPercent > 100);
  return out;
}

/** The scene priced for credit: an owned light / heater / filter that does not meet the requirement loses its $0 (it is priced as the gear the design needs). The
 *  scene is returned unchanged (same object) when every owned item is capable, so the common path costs one capability check. */
export function capableCredit(S: TankSetup): TankSetup {
  if (!S.water.on || (!S.light.owned && !S.tech)) return S;
  const c = capableOf(S);
  if (c.light !== false && c.heater !== false && c.filter !== false) return S;
  let out: TankSetup = S;
  if (c.light === false) out = { ...out, light: { ...out.light, owned: undefined } };
  if (c.heater === false && out.tech) out = { ...out, tech: withUnits(out.tech, 'heater', heaterUnits(out.tech).map(u => ({ ...u, owned: undefined }))) };
  if (c.filter === false && out.tech) out = { ...out, tech: withUnits(out.tech, 'filter', filterUnits(out.tech).map(u => ({ ...u, owned: undefined }))) };
  return out;
}


/** "No new equipment": the project allows nothing to be bought beyond what is owned. Stored in the project extras of the brief. */
export const noNewEquipment = (b: Brief): boolean => projectExtras(b).noNewEquipment === true;

export interface EquipFlag { id: string; item: string; text: string; blocks?: boolean }
/** What the light on screen delivers against what the plants want, and whether it caps them: a Must-use light that is too weak (PAR is the only thing that
 *  counts: CO2 and fertilizer never substitute). DX1's verdict reads `capsPlants` and `parHave / parWant`. */
export interface LightCapacity { parHave: number; parWant: number; shortfall: number; mustUse: boolean; capsPlants: boolean }
export function lightCapacity(S: TankSetup, b: Brief): LightCapacity {
  const want = S.water.on ? parWanted(S) : 0, have = lightOutCached(S)?.mean ?? 0, weak = want > 0 && have < want;
  const must = equipmentOf(b).items.some(i => i.key === 'light' && i.use === 'required') && !!S.light.owned;
  return { parHave: have, parWant: want, shortfall: weak ? want - have : 0, mustUse: must, capsPlants: must && weak };
}

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

