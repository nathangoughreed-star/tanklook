// Lane HV unit 2: "Fix it" that states its effect. For a heater or filter the animals need and the tank lacks (scene/lifeSupport.ts), the one sensible default, proved on a dry run
// (the line clears and nothing else is touched), as a FixPlan the drawer applies in ONE undo step (App.tsx onFix). The heater is the same sized, held-in-the-room heater the Notes
// drawer offers (lidTemp.ts tempFixes); the filter is the generic one the tank would have been given (tech.ts inferTech: hang-on-back to 60 gal, canister above).
import { commitTech } from '../../scene/techEdit';
import { filterState, inferTech, withChoice } from '../../scene/tech';
import { lifeSupportOf, type SupportKind } from '../../scene/lifeSupport';
import { tempFixes } from './lidTemp';
import type { FixPlan } from './noteFixes';
import type { TankSetup, Units } from '../../scene/types';

const FILTER_NAME: Record<string, string> = { hob: 'hang-on-back filter', canister: 'canister filter', sponge: 'sponge filter', sump: 'sump' };

export function lifeFixPlans(S: TankSetup, units: Units = 'in'): Partial<Record<SupportKind, FixPlan>> {
  const out: Partial<Record<SupportKind, FixPlan>> = {}, missing = lifeSupportOf(S, units === 'in');
  if (missing.some(m => m.kind === 'heater')) {
    const f = tempFixes(S, ['temp:hold:noheater'], undefined, units).find(x => x.kind === 'heater');
    if (f) out.heater = { kind: 'heater', label: f.what, what: f.what, count: 1, ids: ['life:heater'], describe: `${f.describe} It is added to the cost and time estimate, and you can change or remove it in Equipment.`, apply: f.apply };
  }
  if (missing.some(m => m.kind === 'filter')) {
    const id = inferTech(S).rows.filter;
    if (id && id !== 'none') {
      const copy = structuredClone(S); commitTech(copy, s => withChoice(s, 'filter', id));
      if (filterState(copy) === 'chosen') {
        const name = FILTER_NAME[id] ?? `${id} filter`;
        out.filter = { kind: 'filter', label: `Add a ${name}`, what: `Add a ${name}`, count: 1, ids: ['life:filter'],
          describe: `Adds a generic ${name}, the size this tank would have been given. It is added to the cost and time estimate, and you can pick a specific product or remove it in Equipment.`, apply: t => commitTech(t, s => withChoice(s, 'filter', id)) };
      }
    }
  }
  return out;
}
