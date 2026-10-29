// Generic-only gear on the Tech menu (lane GM7, 2026-10-29): the sliders, the price off the curve and the one-line effect for a piece
// that has no brands (data/genericGear.ts, scene/gearSpec.ts), shown as a gear card with no Library or I-own tabs under the row's options.
// The values are SESSION-ONLY previews for now (like GM2's "I own one"): they do not change the scene or the demand numbers; pricing the
// tuned piece is lane GM6's. Pure string building plus one module-level map of the owner's tuned values; techMenu.ts routes the data-gc="gen|type" events here.
import { GENERIC_DEFS, genericLimits, genericPrice, genericStats, genericWatts } from '../data/genericGear';
import type { GenericType, StatBlock } from '../scene/gearSpec';
import { gearCard, wattText, type GearCardSpec, type GearSlider } from './gearCard';

/** The generic types a Tech row's option stands for (the row ids and option ids of data/tech.json), with the stats that option starts from. */
const FOR_OPTION: Record<string, Record<string, { type: GenericType; start?: Record<string, number> }[]>> = {
  heatlamp: { dome: [{ type: 'heatlamp' }], mat: [{ type: 'heatmat' }] },
  thermostat: { onoff: [{ type: 'thermostat', start: { dimming: 0 } }], dimming: [{ type: 'thermostat', start: { dimming: 1 } }] },
  uvb: { low: [{ type: 'uvb', start: { strengthPct: 2.4, lengthIn: 12 } }], tube: [{ type: 'uvb' }] },
  mist: { mister: [{ type: 'mister' }], fogger: [{ type: 'fogger' }] },
  timer: { yes: [{ type: 'timer' }] },
  gauge: { yes: [{ type: 'thermometer' }, { type: 'hygrometer' }] },
  rodi: { unit: [{ type: 'rodi' }] },
  feeder: { auto: [{ type: 'feeder' }] },
  ferts: { doser: [{ type: 'doser' }] },
  dosing: { doser: [{ type: 'doser' }] },
  co2: { cartridge: [{ type: 'dropchecker' }], pressurized: [{ type: 'dropchecker' }] },
};

const tuned = new Map<string, Record<string, number>>();
const keyOf = (row: string, type: GenericType) => `${row}:${type}`;
const money = (v: number) => (v >= 100 ? `$${Math.round(v / 5) * 5}` : `$${Math.round(v)}`);

/** The generic cards for the picked option of a Tech row ('' when the row has none): one card per type, named, with its price line. */
export function genericPanel(row: string, opt: string): string {
  return (FOR_OPTION[row]?.[opt] ?? []).map(g => card(row, g.type, g.start)).join('');
}
function card(row: string, type: GenericType, start?: Record<string, number>): string {
  const def = GENERIC_DEFS[type], k = keyOf(row, type), stats = { ...start, ...tuned.get(k) } as Partial<StatBlock[typeof type]>, s = genericStats(type, stats) as unknown as Record<string, number>;
  const lim = genericLimits(type), p = genericPrice(type, stats), w = genericWatts(type, stats);
  const sliders: GearSlider[] = def.stats.map(m => {
    const [lo, hi] = lim[m.stat], v = s[m.stat];
    return { stat: m.stat, label: m.label, min: lo, max: hi, step: m.step, value: v, show: m.labels ? m.labels[Math.round(v)] : `${v}${m.unit}`, unit: m.unit, ...(m.labels ? { labels: m.labels } : {}), tip: m.tip };
  });
  const effect = (def.derived as (x: unknown) => string)(genericStats(type, stats));
  const spec: GearCardSpec = {
    key: `gen|${k}`, type, tab: 'generic', product: false, owned: false, genericOnly: true, sliders, library: { groups: [], stats: [], notes: [] },
    genericNote: `${def.note} ${effect}${w ? ` Draws ${wattText(w)}.` : ''} Price off the curve: ${money(p.r.lo)} to ${money(p.r.hi)}, about ${money(p.r.mode)}${p.est ? ' (estimate)' : ''}. Preview only: the plan still prices the row's standard kit.`,
  };
  return `<div class="tunit"><div class="tuh"><span class="tun">${def.label}</span></div>${gearCard(spec)}</div>`;
}

/** A generic card slider or number box moved: remembers the value. True when `key` (the data-gc value) was one of these. */
export function genericSet(key: string, stat: string, v: number): boolean {
  if (!key.startsWith('gen|')) return false;
  const k = key.slice(4);
  tuned.set(k, { ...tuned.get(k), [stat]: v });
  return true;
}
