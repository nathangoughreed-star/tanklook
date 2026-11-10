// Discovery v2, lane AB5: the final whole-candidate validation, run on the FINISHED candidate (after resizing, stocking, planting, gear choice and backdrop), on top of verdictOf and the Explore gate:
//   fit        the animals fit the tank they are in (tankfit)
//   gear       the light reaches the PAR the drawn plants want (CO2 feed was set by gearFit); a short light is said, never assumed adequate
//   dry        ventilation and humidity for a dry habitat, and the land / water split of a paludarium, are NOT modelled: said as unknowns, never assumed
// Returns what blocks the candidate, and the unknowns to put in its assumptions. Pure.
import { fitIn, type AnimalCount } from './tankfit';
import { parWanted } from '../demand/needs';
import { lightOutCached } from './lightout';
import { climateOf } from '../data/climate';
import { tankModelOf, rosterOf } from './pairFacts';
import type { Wants } from '../demand/suggest';
import type { TankSetup } from './types';

export interface FinalCheck { blocked?: string; unknowns: string[] }
export function finalCheck(S: TankSetup, w: Wants): FinalCheck {
  const unknowns: string[] = [];
  if (S.fish.length) {
    const fit = fitIn(rosterOf(S) as AnimalCount[], tankModelOf(S, w));
    if (fit?.fails.length) return { blocked: `the animals do not fit this tank: ${String((fit.fails[0] as { text?: string })?.text ?? fit.fails[0])}`, unknowns };
  }
  if (S.water.on && S.items.some(i => i.kind === 'plant')) {
    const want = parWanted(S), par = lightOutCached(S)?.mean;
    if (want > 0 && par === undefined) unknowns.push('The light reaching the plants could not be worked out, so the plants drawn are not confirmed to be carried by it.');
    else if (want > 0 && par! < want - 0.5) unknowns.push(`The light gives about ${Math.round(par!)} PAR at the substrate and the plants drawn want about ${Math.round(want)}: they may grow thinner than drawn.`);
  }
  if (!S.water.on) {
    const rows = S.fish.length ? climateOf(S) : [];
    if (S.fish.length && !rows.some(r => r.rhBands.length)) unknowns.push('No recorded humidity range for these animals: the humidity this design needs is not assumed.');
    unknowns.push('Ventilation is not modelled for this enclosure: its adequacy is not assumed.');
  } else if (S.layout.id === 'paludarium' || S.fish.some(f => /frog|newt|salamander/i.test(f.species))) unknowns.push('The land and water split is not modelled for this enclosure: its adequacy is not assumed.');
  return { unknowns };
}
