// Terrarium kit deals (lane KT, 2026-10-27): a reptile starter kit (enclosure, lid, dome lamp, basking bulb, gauge) priced in place of
// the separate rows it covers, for the suggest-a-setup builds. A kit is worth only the parts the build would buy anyway: its UVB
// is left out of `includes` (a 23 W compact is not a linear T5), and a part the build does not use (a dome on a heat-mat build) is
// not credited, so a kit that does not fit the build's gear simply prices higher and is not chosen.
import { DEALS, type Deal } from '../data/deals';
import type { TankModel } from '../data/tanks';
import { techOf } from '../scene/tech';
import type { TankSetup } from '../scene/types';

const DAY = 864e5, FRESH_DAYS = 30, IN = 25.4, SIDE_FRAC = 0.1, SIDE_MIN_MM = 38;

/** Terrarium deals sold in this enclosure's size (each side within 10 % or 1.5 in of the catalogue terrarium's outer size), still live, whose lamps the build uses,
 *  read on the retailer's page in the last 30 days and not low-confidence snippets (`est`), cheapest first. */
export function dryDealsFor(m: TankModel, now = Date.now(), S?: TankSetup, list: Deal[] = DEALS): Deal[] {
  // a kit's lamp fixtures only count when the build heats with a dome lamp (a heat-mat build would not use them)
  const lamp = !S || techOf(S).rows.heatlamp === 'dome';
  const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(SIDE_MIN_MM, SIDE_FRAC * b);
  return list.filter(d => d.terrarium && !d.est && (lamp || !d.includes.some(p => p === 'dome' || p === 'bulb')) && d.confidence !== 'low' && d.dims &&
    near(d.dims.L_in * IN, m.outer.L) && near(d.dims.D_in * IN, m.outer.D) && near(d.dims.H_in * IN, m.outer.H) &&
    now - Date.parse(d.asOf + 'T00:00:00') <= FRESH_DAYS * DAY && (!d.saleEnds || Date.parse(d.saleEnds + 'T23:59:59') >= now))
    .sort((a, b) => a.price.usd - b.price.usd);
}
