// Lane HV unit 1 (Fable strategy 2026-11-25, answer 6 item 1): the ONE "missing life support" function. A heater or a filter that the stocked animals need
// but the tank does not have is a Caution with a "Fix it" button: never green, never "Easy". The Habitat pill and drawer (ui/stockSummary.ts), the
// checklist, the cost drawer and the plan sheet all read this list, so they cannot disagree.
// "Needs a heater" is the existing temprange.ts assessment, no new threshold: the water as the setup holds it (target, or the room when there is no
// heater) is below the shared range ('outside' with an entered room, 'conditional' with the assumed default room), or a set target above the room
// has no heater to hold it. An assumed room INSIDE the range is 'unchecked' there and is not a missing heater (neon tetras in a 70 °F room).
import { getSpecies, type Species } from '../data/species';
import { countsAgainstWater } from './stocking';
import { operatingCheck, holdCheck, sharedRange, fmtC, fmtT } from './temprange';
import { filterState, tempEvidence } from './tech';
import type { TankSetup } from './types';

export type SupportKind = 'heater' | 'filter';
export interface Missing {
  kind: SupportKind;
  /** what is not chosen yet, as the print list's "Not chosen yet" says it */
  label: string;
  /** the one-line caution */
  text: string;
  /** the Fix it destination (shell/logic/noteFixes.ts GO_*) */
  go: SupportKind;
}

/** The aquatic species in the tank (each once). */
const wetSpecies = (S: TankSetup): Species[] => [...new Set(S.fish.map(f => f.species))].map(getSpecies).filter((x): x is Species => !!x && countsAgainstWater(x));

/** What the stocked animals need that the tank has not got. Empty for a tank with no water or no animals. */
export function lifeSupportOf(S: TankSetup, us = true): Missing[] {
  const out: Missing[] = [], sp = wetSpecies(S);
  if (!S.water.on || !sp.length) return out;
  const ev = tempEvidence(S, undefined, us), sh = sharedRange(sp);
  if (ev && !ev.heater && sh.range) {
    const op = operatingCheck(sh, ev), hold = holdCheck(ev), band = fmtC(sh.range, us);
    const cold = ev.target === undefined ? ev.room < sh.range[0] && (op.state === 'outside' || op.state === 'conditional')
      : hold?.state === 'outside' || (ev.target !== undefined && ev.target > ev.room + 0.5);
    if (cold) {
      const who = sh.counted.map(s => s.name).join(', '), why = ev.target !== undefined ? `the ${fmtT(ev.target, us)} target is warmer than the room` : `the water would follow the ${ev.roomSet ? '' : 'assumed '}${fmtT(ev.room, us)} room`;
      out.push({ kind: 'heater', label: 'a heater', go: 'heater', text: `Heater not chosen: ${who} ${sh.counted.length === 1 ? 'wants' : 'want'} ${band}, and ${why}` });
    }
  }
  if (filterState(S) === 'unset') out.push({ kind: 'filter', label: 'a filter', go: 'filter', text: 'Filter not chosen: a filter sized for this tank is strongly recommended' });
  return out;
}

/** The print list's opening line when something is missing; undefined when the tank is complete. */
export const notChosenLine = (m: Missing[]): string | undefined => m.length ? `Not chosen yet: ${m.map(x => x.label).join(' and ')}` : undefined;
