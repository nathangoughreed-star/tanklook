// Capability-aware credit for owned gear (lane DX3). Kept apart from equipPlan.ts so demand/engine.ts can import it without a cycle.
import type { TankSetup } from './types';
import { filterUnits, heatLoss, heaterUnits, withUnits } from './tech';
import { stockingOf } from './stocking';
import { lightOutCached } from './lightout';
import { parWanted } from '../demand/needs';

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

