// How far a hang-on-back filter reaches behind the tank (lane HC1, Nathan 2026-11-15): the room wall stands at least this far
// off the back glass, so the body never clips into it. Pure numbers; render/gear/filter.ts hob() draws the same body.
import { FILTER_MODELS } from '../demand/gear';
import { filterProduct } from '../data/gearCatalog';
import { filterState, techParts } from './tech';
import type { TankSetup } from './types';

/** Gap between the glass and the body's front, as hob() hangs it (mm), and the room left between its back and the wall (1/2 in). */
export const HOB_OFF_GLASS = 6, HOB_WALL_MARGIN = 12.7;

/** The deepest hang-on-back filter body's reach behind the back glass's outer face, mm (0 = none, or one the filter row has not chosen). */
export function hobReach(S: TankSetup): number {
  if (S.stockFirst && filterState(S) !== 'chosen') return 0;
  let reach = 0;
  for (const p of techParts(S)) {
    if (p.gear !== 'filter' || !p.model) continue;
    const m = FILTER_MODELS.find(x => x.id === p.model); if (m?.kind !== 'hob') continue;
    const pr = filterProduct(p.product), s = pr?.gph ? Math.cbrt(pr.gph / 100) : Math.cbrt(m.gph / 100), D = pr?.bodyMm.d ?? 105 * s;
    reach = Math.max(reach, HOB_OFF_GLASS + D + (pr?.colors?.accent && /wheel/i.test(pr.colors.accent.where) ? 6 : 0));
  }
  return reach;
}

/** The wall gap a hang-on-back filter needs (mm), or 0 when the back wall is off / not behind the tank or there is no such filter. */
export const hobWallGap = (S: TankSetup) => (S.wall.show && S.wall.side === 'back' ? Math.ceil(hobReach(S) + HOB_WALL_MARGIN) : 0);
