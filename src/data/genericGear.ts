// Generic-only gear (lane GM7, 2026-10-29; research/design/gear-model.md sections 2a, 8, 11): each type here is ONE tunable item with a
// stat block (limits and default in scene/gearSpec.ts), a price curve and, in render/gear/generic.ts, one simple model. No brands, no
// catalogue. The curves hang on the demand-items.json rows the Tech menu already prices (the default stat block is the unit the row
// stands for) and scale off them by the tunables; where a row is thin, absent or extrapolated the price says est and the range is wide.
// Pure: no UI. It changes no engine number: nothing in demand/* reads it (lane GM6 owns pricing); the gear card shows its price beside the sliders.
import { price } from '../demand/prices';
import type { Range3 } from '../demand/types';
import { GEAR_LIMITS, statsOf, type GenericType, type StatBlock } from '../scene/gearSpec';

/** A price off the curve: the range, whether it leans on an estimate, and the row(s) it hangs on. */
export interface GenericPrice { r: Range3; est: boolean; rows: string[] }
export interface StatMeta { stat: string; label: string; step: number; unit: string; tip: string; /** a stepped slider shows these names, not numbers */ labels?: string[] }
export interface GenericDef {
  type: GenericType; label: string; stats: StatMeta[]; note: string;
  /** the one-line effect of the current stats, shown under the sliders */
  derived: (s: never) => string;
  price: (s: never) => GenericPrice;
  /** mains draw while on, W (types that draw) */
  watts?: (s: never) => number;
}

const NONE: Range3 = { lo: 0, mode: 0, hi: 0 };
const row = (k: string): Range3 => price(k) ?? NONE;
const sc = (r: Range3, k: number): Range3 => ({ lo: r.lo * k, mode: r.mode * k, hi: r.hi * k });
const add = (a: Range3, b: Range3): Range3 => ({ lo: a.lo + b.lo, mode: a.mode + b.mode, hi: a.hi + b.hi });
const pow = (x: number, ref: number, e: number) => Math.pow(Math.max(x, 1e-6) / ref, e);
/** Piecewise-linear through points [x, y], flat past the ends. */
function curve(pts: [number, number][], x: number): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
}
const out = (r: Range3, rows: string[], est = false): GenericPrice => ({ r, est, rows });

/** A T5 HO tube's wattage by length (in): 12 in 8 W (shade-dweller), 22 in 24 W, 34 in 39 W, 46 in 54 W (the published sizes). */
export const uvbWatts = (lengthIn: number) => curve([[12, 8], [22, 24], [34, 39], [46, 54], [48, 56]], lengthIn);
/** A heat mat's size (mm along x, in depth) by watts: 6x8 in at 8 W, 8x12 in at 16 W, 8x18 in at 24 W, growing with the root past that. */
export const matMm = (watts: number): [number, number] => { const k = Math.sqrt(watts / 16); return [Math.round(Math.min(560, 305 * k)), Math.round(Math.min(300, 203 * k))]; };

/** tech.json heat.surface: the closed top's factor (glass 7, mesh 15, hood 6) blended with the open top's 18 by the open share. */
export function lidSurface(s: StatBlock['lid']): number {
  const closed = [7, 15, 6][Math.round(s.material)] ?? 7;
  return closed + (18 - closed) * Math.min(1, Math.max(0, s.openPct / 100));
}
const LID_ROWS = ['gear:lid-glass', 'gear:lid-mesh', 'gear:lid-hood'];

export const GENERIC_DEFS: { [T in GenericType]: GenericDef } = {
  thermometer: {
    type: 'thermometer', label: 'Thermometer', note: 'A generic thermometer: accuracy is not modelled, only the probes and the price.',
    stats: [{ stat: 'probes', label: 'Probes', step: 1, unit: '', tip: 'Warm and cool end of the tank' }],
    derived: () => 'It shows the water temperature, so a stuck heater is seen. No effect on the numbers.',
    price: ((s: StatBlock['thermometer']) => out(sc(row('gear:thermometer'), pow(s.probes, 1, 0.8)), ['gear:thermometer'], true)) as never,
  },
  hygrometer: {
    type: 'hygrometer', label: 'Hygrometer', note: 'A generic humidity gauge: accuracy is not modelled.',
    stats: [{ stat: 'probes', label: 'Probes', step: 1, unit: '', tip: 'One per zone (humid hide, dry end)' }],
    derived: () => 'It shows the humidity so misting can be tuned. No effect on the numbers.',
    price: ((s: StatBlock['hygrometer']) => out(sc(row('dry:gauge'), 0.55 * s.probes), ['dry:gauge'], true)) as never,
  },
  thermostat: {
    type: 'thermostat', label: 'Thermostat', note: 'On/off switches the heat fully; dimming holds the temperature smoothly and is the safer one.',
    stats: [{ stat: 'channels', label: 'Channels', step: 1, unit: '', tip: 'Heat sources it can control' }, { stat: 'dimming', label: 'Control', step: 1, unit: '', labels: ['On / off', 'Dimming'], tip: 'A dimming one lowers the power instead of cutting it' }],
    derived: ((s: StatBlock['thermostat']) => `${s.channels} channel${s.channels > 1 ? 's' : ''}, ${s.dimming ? 'dimming' : 'on / off'}.`) as never,
    price: ((s: StatBlock['thermostat']) => { const k = s.dimming ? 'dry:thermostat-dimming' : 'dry:thermostat-onoff'; return out(sc(row(k), 1 + 0.8 * (s.channels - 1)), [k], !!s.dimming || s.channels > 1); }) as never,
  },
  timer: {
    type: 'timer', label: 'Timer', note: 'An outlet timer: channels only.',
    stats: [{ stat: 'channels', label: 'Channels', step: 1, unit: '', tip: 'Outlets on their own schedule' }],
    derived: ((s: StatBlock['timer']) => `${s.channels} outlet${s.channels > 1 ? 's' : ''} on schedules.`) as never,
    price: ((s: StatBlock['timer']) => out(sc(row('dry:timer'), pow(s.channels, 1, 0.7)), ['dry:timer'], true)) as never,
  },
  heatlamp: {
    type: 'heatlamp', label: 'Heat lamp (dome and basking bulb)', note: 'A dome with a basking bulb: the watts and the distance decide the basking spot; the dome grows with the watts.',
    stats: [{ stat: 'watts', label: 'Bulb power', step: 5, unit: ' W', tip: 'Basking bulb watts' }],
    derived: ((s: StatBlock['heatlamp']) => `A ${s.watts} W bulb, replaced about every 3 months (about $${Math.round(row('dry:basking-bulb-tube').mode * pow(s.watts, 75, 0.5))} each).`) as never,
    price: ((s: StatBlock['heatlamp']) => out(add(row('dry:dome'), sc(row('dry:basking-bulb'), pow(s.watts, 75, 0.5))), ['dry:dome', 'dry:basking-bulb'], Math.abs(s.watts - 75) > 30)) as never,
    watts: ((s: StatBlock['heatlamp']) => s.watts) as never,
  },
  heatmat: {
    type: 'heatmat', label: 'Heat mat', note: 'An under-tank mat: its size follows its watts (6x8 in at 8 W, 8x12 in at 16 W, 8x18 in at 24 W).',
    stats: [{ stat: 'watts', label: 'Power', step: 1, unit: ' W', tip: 'Mat watts; the size follows' }],
    derived: ((s: StatBlock['heatmat']) => { const [l, d] = matMm(s.watts); return `About ${Math.round(l / 25.4)} x ${Math.round(d / 25.4)} in on the glass underside.`; }) as never,
    // the row's lo / mode / hi are the small, medium and large mats (8, 16 and 24 W); past 24 W it grows at about $0.60 a watt
    price: ((s: StatBlock['heatmat']) => { const r = row('dry:heat-mat'), f = (a: number, b: number, c: number) => curve([[8, a], [16, b], [24, c], [60, c + 36 * 0.6]], s.watts); return out({ lo: f(r.lo, r.lo + 2, r.mode), mode: f(r.lo, r.mode, r.hi), hi: f(r.mode, r.hi, r.hi + 3) }, ['dry:heat-mat'], s.watts > 24 || s.watts < 8); }) as never,
    watts: ((s: StatBlock['heatmat']) => s.watts) as never,
  },
  uvb: {
    type: 'uvb', label: 'UVB tube (T5 HO)', note: 'One tunable T5 HO tube: 2.4 for shade-dwellers, 5.0 for most forest animals, 10.0 for desert baskers, 12 the strongest. Real UVI by brand is not modelled.',
    stats: [{ stat: 'strengthPct', label: 'UVB strength', step: 0.5, unit: ' %', tip: 'UVB share of the lamp output: 2.4 shade-dweller, 5.0 forest, 10.0 desert, 12 strongest' }, { stat: 'lengthIn', label: 'Tube length', step: 1, unit: ' in', tip: 'Standard T5 HO lengths run 12, 22, 34 and 46 in' }],
    derived: ((s: StatBlock['uvb']) => `${Math.round(uvbWatts(s.lengthIn))} W of tube; replace it about every 12 months, because the UVB fades before the light does.`) as never,
    // the two priced kits (12 in $64, 22 in $75) joined along the length, then about $2 an inch past 22 in (not published: est); each % off 5.0 moves it about $1.2
    price: ((s: StatBlock['uvb']) => {
      const lo = row('dry:uvb-low'), hi = row('dry:uvb-t5-24'), t = Math.min(1, Math.max(0, (s.lengthIn - 12) / 10)), span = Math.max(0, s.lengthIn - 22) * 2, str = (s.strengthPct - 5) * 1.2;
      const f = (a: number, b: number) => a + (b - a) * t + span + str;
      return out({ lo: f(lo.lo, hi.lo), mode: f(lo.mode, hi.mode), hi: f(lo.hi, hi.hi) }, ['dry:uvb-low', 'dry:uvb-t5-24'], s.lengthIn > 24 || Math.abs(s.strengthPct - 5) > 0.1);
    }) as never,
    watts: ((s: StatBlock['uvb']) => uvbWatts(s.lengthIn)) as never,
  },
  mister: {
    type: 'mister', label: 'Misting system', note: 'A pump and reservoir feeding nozzles through the top; the nozzles spread the mist, the pump sets how much water goes out.',
    stats: [{ stat: 'nozzles', label: 'Nozzles', step: 1, unit: '', tip: 'Nozzles through the top' }, { stat: 'mlPerHour', label: 'Output', step: 50, unit: ' ml/h', tip: 'Water the pump sends out per hour on its schedule' }],
    derived: ((s: StatBlock['mister']) => `${Math.round(s.mlPerHour / s.nozzles)} ml an hour from each nozzle.`) as never,
    // the row's lo is a one-nozzle kit, mode the two-nozzle kit, hi the four-nozzle starter; past four about $10 a nozzle
    price: ((s: StatBlock['mister']) => { const r = row('dry:auto-mister'), f = (a: number, b: number, c: number) => curve([[1, a], [2, b], [4, c]], s.nozzles) + Math.max(0, s.nozzles - 4) * 10; return out({ lo: f(r.lo, (r.lo + r.mode) / 2, r.mode), mode: f(r.lo, r.mode, r.hi), hi: f(r.mode, r.hi, r.hi + 20) }, ['dry:auto-mister'], s.nozzles > 4); }) as never,
    watts: ((s: StatBlock['mister']) => 10 * pow(s.mlPerHour, 400, 0.5)) as never,
  },
  fogger: {
    type: 'fogger', label: 'Fogger', note: 'An ultrasonic fogger with a hose to the tank: output sets the body size and the water used.',
    stats: [{ stat: 'mlPerHour', label: 'Output', step: 50, unit: ' ml/h', tip: 'Water turned to fog per hour' }],
    derived: ((s: StatBlock['fogger']) => `${Math.round(25 * pow(s.mlPerHour, 400, 0.5))} W while running.`) as never,
    // no listing row: tech.json's first guess (25 / 40 / 60) at 400 ml/h
    price: ((s: StatBlock['fogger']) => out(sc({ lo: 25, mode: 40, hi: 60 }, pow(s.mlPerHour, 400, 0.5)), ['tech.json fogger fallback'], true)) as never,
    watts: ((s: StatBlock['fogger']) => 25 * pow(s.mlPerHour, 400, 0.5)) as never,
  },
  lilypipe: {
    type: 'lilypipe', label: 'Lily pipe', note: 'A glass or acrylic outlet that spreads the return flow; the diameter should match the hose.',
    stats: [{ stat: 'diameterIn', label: 'Outlet diameter', step: 0.25, unit: ' in', tip: 'Outer diameter of the trumpet' }],
    derived: ((s: StatBlock['lilypipe']) => `A ${s.diameterIn} in outlet: a gentler, wider flow than a bare pipe, with no extra pump.`) as never,
    price: ((s: StatBlock['lilypipe']) => out(sc({ lo: 9, mode: 20, hi: 40 }, pow(s.diameterIn, 1, 0.9)), ['judgement, no row'], true)) as never,
  },
  doser: {
    type: 'doser', label: 'Dosing pump', note: 'A peristaltic doser: one head per solution.',
    stats: [{ stat: 'heads', label: 'Heads', step: 1, unit: '', tip: 'Solutions it can dose' }],
    derived: ((s: StatBlock['doser']) => `${s.heads} head${s.heads > 1 ? 's' : ''}, about ${(0.5 + s.heads * 0.5).toFixed(1)} W.`) as never,
    price: ((s: StatBlock['doser']) => out(sc(row('gear:dosing-pump'), pow(s.heads, 4, 0.6)), ['gear:dosing-pump'], s.heads !== 4)) as never,
    watts: ((s: StatBlock['doser']) => 0.5 + s.heads * 0.5) as never,
  },
  feeder: {
    type: 'feeder', label: 'Automatic feeder', note: 'A drum feeder on a timer: priced by hoppers.',
    stats: [{ stat: 'hoppers', label: 'Hoppers', step: 1, unit: '', tip: 'Separate foods' }],
    derived: () => 'It drops a measured pinch on schedule; it does not change how much the fish need.',
    price: ((s: StatBlock['feeder']) => out(sc(row('gear:auto-feeder'), s.hoppers >= 2 ? 1.6 : 1), ['gear:auto-feeder'], s.hoppers >= 2)) as never,
  },
  rodi: {
    type: 'rodi', label: 'RO/DI unit', note: 'A reverse-osmosis and deionising unit: the rating is gallons a day.',
    stats: [{ stat: 'gpd', label: 'Rating', step: 25, unit: ' gpd', tip: 'Gallons of pure water per day' }],
    derived: ((s: StatBlock['rodi']) => `${(s.gpd / 24).toFixed(1)} gal an hour: a 20 gal change takes ${(20 / (s.gpd / 24)).toFixed(0)} h.`) as never,
    price: ((s: StatBlock['rodi']) => out(sc(row('gear:ro-unit'), pow(s.gpd, 75, 0.55)), ['gear:ro-unit'], s.gpd !== 75)) as never,
  },
  dropchecker: {
    type: 'dropchecker', label: 'Drop checker', note: 'A glass bulb that turns green at the right CO2.',
    stats: [{ stat: 'count', label: 'Count', step: 1, unit: '', tip: 'Spares, or a second one at the far end' }],
    derived: () => 'It shows the CO2 level by colour. No effect on the numbers.',
    price: ((s: StatBlock['dropchecker']) => out(sc(row('gear:drop-checker'), s.count), ['gear:drop-checker'])) as never,
  },
  sump: {
    type: 'sump', label: 'Sump tank', note: 'A second tank under the display; a larger one adds water volume and room for gear.',
    stats: [{ stat: 'gal', label: 'Size', step: 5, unit: ' gal', tip: 'Water volume of the sump' }],
    derived: ((s: StatBlock['sump']) => `About ${Math.round(s.gal * 0.7)} gal of working water with the baffles in.`) as never,
    price: ((s: StatBlock['sump']) => out(sc(row('gear:sump'), pow(s.gal, 55, 0.6)), ['gear:sump'], s.gal < 29 || s.gal > 120)) as never,
  },
  lid: {
    type: 'lid', label: 'Lid / hood', note: 'The top: every open inch lets water evaporate and heat escape (tech.json heat.surface).',
    stats: [
      { stat: 'material', label: 'Material', step: 1, unit: '', labels: ['Glass', 'Mesh', 'Hood'], tip: 'Glass is the tightest; mesh lets out the most air' },
      { stat: 'openPct', label: 'Left open', step: 5, unit: ' %', tip: 'Share of the top that is open' },
      { stat: 'lengthIn', label: 'Length', step: 2, unit: ' in', tip: 'Fits the tank length' },
      { stat: 'hoodLed', label: 'Hood LED', step: 1, unit: '', labels: ['No', 'Yes'], tip: 'A light built into a hood' },
    ],
    derived: ((s: StatBlock['lid']) => `Heat-loss surface factor ${lidSurface(s).toFixed(1)} (an open top is 18).`) as never,
    price: ((s: StatBlock['lid']) => { const key = LID_ROWS[Math.round(s.material)] ?? LID_ROWS[0]; return out(add(sc(row(key), pow(s.lengthIn, 24, 1.1)), s.hoodLed ? { lo: 20, mode: 35, hi: 60 } : NONE), [key], !!s.hoodLed); }) as never,
  },
  returnpump: {
    type: 'returnpump', label: 'Return pump', note: 'Lifts sump water back to the display; the flow is what it moves against the head.',
    stats: [{ stat: 'gph', label: 'Flow', step: 50, unit: ' gph', tip: 'Flow at the working head' }],
    derived: ((s: StatBlock['returnpump']) => `${Math.round(23 * pow(s.gph, 330, 0.8))} W; turns a 55 gal system ${(s.gph / 55).toFixed(1)} times an hour.`) as never,
    // tech.json: price ref 330 gph (55 gal x 6) with exponent 0.5, watts 23 at the ref with exponent 0.8
    price: ((s: StatBlock['returnpump']) => out(sc(row('gear:return-pump'), pow(s.gph, 330, 0.5)), ['gear:return-pump'])) as never,
    watts: ((s: StatBlock['returnpump']) => 23 * pow(s.gph, 330, 0.8)) as never,
  },
};

/** A generic-only piece's stats: the owner's over the defaults. */
export const genericStats = <T extends GenericType>(type: T, stats?: Partial<StatBlock[T]>): StatBlock[T] => statsOf({ type, stats });
export const genericPrice = <T extends GenericType>(type: T, stats?: Partial<StatBlock[T]>): GenericPrice => (GENERIC_DEFS[type].price as (s: StatBlock[T]) => GenericPrice)(genericStats(type, stats));
export const genericWatts = <T extends GenericType>(type: T, stats?: Partial<StatBlock[T]>): number => (GENERIC_DEFS[type].watts as ((s: StatBlock[T]) => number) | undefined)?.(genericStats(type, stats)) ?? 0;
export const genericLimits = (type: GenericType) => GEAR_LIMITS[type] as Record<string, [number, number]>;
