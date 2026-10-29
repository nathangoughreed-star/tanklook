// The gear the owner already has (lane GM6, design gear-model.md section 4): the heaters, filters and light marked "I own one", as $0 "you have" lines
// for the cost lines (demand/costlines.ts) and an "Already have" section for the setup sheet (setupsheet.ts). Pure; no price is computed here.
import type { TankSetup } from './types';
import { filterFor, filterUnits, heatLoss, optionDef } from './tech';
import { lightProduct, productName } from '../data/gearCatalog';
import { wattsOf } from './lightout';

export interface OwnedLine { label: string; usd: 0; note: string; layer: 'welfare' }

/** The gear the owner marked "I own one" (lane GM6: a heater, a filter or the light), each its own $0 "you have" line; `paidUsd` is shown in the note, never priced.
 *  Its power and welfare effects stay in the totals: only the set-up price is zero. */
export function ownedGearLines(S: TankSetup): OwnedLine[] {
  const out: OwnedLine[] = [], note = (u: { paidUsd?: number }) => u.paidUsd !== undefined ? `paid $${Math.round(u.paidUsd)}` : 'you have';
  if (!S.water.on) return out;
  const t = S.tech;
  if (t) {
    for (const u of heatLoss(S, t).units) if (u.owned) out.push({ label: `Heater: ${u.product ? productName(u.product) : `generic ${u.watts} W`}`, usd: 0, note: note(u), layer: 'welfare' as const });
    for (const u of filterUnits(t)) if (u.owned) {
      const kind = optionDef('filter', u.kind)?.kind, f = kind ? filterFor(S, kind, u.model, u.product) : undefined;
      out.push({ label: `Filter: ${f?.product ? productName(f.product) : `generic ${u.kind}`}`, usd: 0, note: note(u), layer: 'welfare' as const });
    }
  }
  if (S.light.owned) { const p = lightProduct(S.light.product); out.push({ label: `Light: ${p ? productName(p) : `generic ${Math.round(wattsOf(S))} W`}`, usd: 0, note: note(S.light), layer: 'welfare' as const }); }
  return out;
}
