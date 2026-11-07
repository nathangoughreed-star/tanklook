// Does the gear the person already owns still suit what they are building? (lane EQ1, Nathan 2026-11-07: owned gear has ONE state, available; the tool uses it
// whenever it suits, and warns when the design has outgrown it or no longer uses it.) Pure: the notes come from the brief's owned equipment and the tank on
// screen, never from a setting. `id` is stable across edits (no numbers in it) so a note the person has seen is not shown again until it clears and returns.
import type { Brief } from './brief';
import type { TankSetup } from './types';
import { getTankModel } from '../data/tanks';
import { equipmentOf, galOfDims } from './project';
import { filterUnits, heatLoss, heaterUnits } from './tech';
import { stockingOf } from './stocking';
import { volume } from './physics';
import { lightOutCached } from './lightout';
import { parWanted } from '../demand/needs';

export interface OwnedNote { id: string; item: 'tank' | 'light' | 'heater' | 'filter'; text: string }

const IN = 25.4;
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(6, b * 0.06);

export function ownedFit(S: TankSetup, b: Brief): OwnedNote[] {
  const out: OwnedNote[] = [], items = equipmentOf(b).items, has = (k: string) => items.some(i => i.key === k);
  const note = (id: string, item: OwnedNote['item'], text: string) => out.push({ id, item, text });
  const tank = items.find(i => i.key === 'tank');
  if (tank && (tank.model || tank.dimsIn)) {
    const m = tank.model ? getTankModel(tank.model) : undefined, d = tank.dimsIn, gal = m ? m.ratedGal : d ? galOfDims(d) : 0;
    const same = m ? S.product?.model === m.id : d ? close(S.tank.L, d.L * IN) && close(S.tank.D, d.D * IN) && close(S.tank.H, d.H * IN) : true;
    const now = Math.round(volume(S.tank).gallons);
    if (!same) note('tank:unused', 'tank', `This design is in a ${now} gal tank, not your ${Math.round(gal)} gal one, so your tank is no longer used.`);
    else if (S.fish.length && stockingOf(S).spacePercent > 100) note('tank:small', 'tank', `Your ${Math.round(gal)} gal tank is too small for these animals.`);
  }
  if (!S.water.on) return out;
  if (has('light')) {
    if (!S.light.owned) note('light:unused', 'light', 'Your light is no longer in this design.');
    else { const want = parWanted(S), got = lightOutCached(S)?.mean ?? 0; if (want > 0 && got < want) note('light:dim', 'light', 'Your light is too dim for these plants.'); }
  }
  const t = S.tech;
  if (has('heater')) {
    const owned = t ? heaterUnits(t).filter(u => u.owned) : [];
    if (!owned.length) note('heater:unused', 'heater', 'Your heater is no longer in this design.');
    else { const hl = heatLoss(S, t), w = hl.units.filter(u => u.owned).reduce((s, u) => s + u.watts, 0); if (hl.needW > 0 && w < hl.needW * 0.95) note('heater:small', 'heater', 'Your heater is too small for this tank.'); }
  }
  if (has('filter')) {
    const owned = t ? filterUnits(t).filter(u => u.owned) : [];
    if (!owned.length) note('filter:unused', 'filter', 'Your filter is no longer in this design.');
    else if (S.fish.length && stockingOf(S).filtrationPercent > 100) note('filter:small', 'filter', 'Your filter is too small for these animals.');
  }
  return out;
}
