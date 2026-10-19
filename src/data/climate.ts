// Recommended temperature and humidity for the enclosure on screen (Nathan 2026-10-19). Advice from common husbandry
// practice, estimates like care.ts: water temperature for a tank with water, air temperature and relative humidity for a
// terrarium. A land animal's own entry wins over the style's, the style's over the generic one.
import { CARE } from './care';
import type { LayoutId, TankSetup } from '../scene/types';

export interface Climate {
  /** short heading: what the numbers are for */
  label: string;
  /** deg C; for a basking species the warm spot as a second band */
  c: [number, number];
  warm?: [number, number];
  /** relative humidity, %, for amphibian and reptile enclosures */
  rh?: [number, number];
  note?: string;
}
const T = (c: [number, number], rh?: [number, number], warm?: [number, number], note?: string): Omit<Climate, 'label'> => ({ c, rh, warm, note });
/** Air climate by species id (reptiles, amphibians, land inverts). */
const AIR: Record<string, Omit<Climate, 'label'>> = {
  crestedgecko: T([22, 26], [60, 80], undefined, 'Mist daily; let it dry a little between.'),
  crestedharlequin: T([22, 26], [60, 80], undefined, 'Mist daily; let it dry a little between.'),
  leopardgecko: T([24, 27], [30, 40], [31, 35], 'Warm basking spot; keep the cool end 24-27.'),
  ballpython: T([26, 28], [50, 60], [31, 33], 'Warm hide 31-33, cool hide 26-28; 65-70 % while shedding.'),
  dartfrog: T([22, 26], [70, 90]),
  treefrog: T([22, 28], [60, 80]),
  firetoad: T([18, 24], [60, 80], undefined, 'Cool: stays well below 26.'),
  firenewt: T([18, 24], [60, 80], undefined, 'Cool: stays well below 26.'),
  regaljumper: T([22, 27], [50, 70]),
  chacogoldenknee: T([22, 27], [50, 65], undefined, 'Keep one corner damp, the rest drier.'),
};
/** Air climate by terrarium style. */
const STYLE_AIR: Partial<Record<LayoutId, string>> = { rainforest: 'crestedgecko', arid: 'leopardgecko', jumper: 'regaljumper', python: 'ballpython', burrow: 'chacogoldenknee', frogs: 'treefrog' };

const overlap = (a: [number, number][]): [number, number] | null => {
  const lo = Math.max(...a.map(r => r[0])), hi = Math.min(...a.map(r => r[1]));
  return lo <= hi ? [lo, hi] : null;
};

/** The numbers to show for this enclosure: one or two rows (water, air). */
export function climateOf(S: TankSetup): Climate[] {
  const rows: Climate[] = [];
  const sp = [...new Set(S.fish.map(f => f.species))];
  const land = sp.filter(id => AIR[id]);
  if (S.water.on) {
    const ranges = sp.map(id => CARE[id]?.temp).filter((t): t is [number, number] => !!t);
    const fit = ranges.length ? overlap(ranges) : null;
    const fallback: [number, number] = S.water.salt ? [24, 27] : [22, 26];
    rows.push({
      label: 'Water', c: fit ?? fallback,
      note: ranges.length && !fit ? 'The animals in here want different temperatures: see their care notes.' : S.water.salt ? 'Hold it steady, within about 1 degree.' : undefined,
    });
  }
  const swampy = S.layout.id === 'swamp' || S.layout.id === 'paludarium';
  const styleSp = STYLE_AIR[S.layout.id];
  if (!S.water.on || swampy || land.length) {
    const id = land[0] ?? styleSp;
    const a = id ? AIR[id] : swampy ? T([22, 27], [70, 90]) : T([22, 26], [50, 70]);
    const mixed = land.length > 1 && !overlap(land.map(i => AIR[i].c));
    rows.push({ label: 'Air', ...a, note: mixed ? 'The animals in here want different climates: see their care notes.' : a.note });
  }
  return rows;
}
const F = (c: number) => Math.round(c * 9 / 5 + 32);
const band = (r: [number, number]) => `${r[0]}-${r[1]} °C (${F(r[0])}-${F(r[1])} °F)`;
/** One line per row, "Water 22-26 °C (72-79 °F)" plus warm spot and humidity where there is one. */
export function climateText(r: Climate) {
  return `${band(r.c)}${r.warm ? `, warm spot ${band(r.warm)}` : ''}${r.rh ? `, humidity ${r.rh[0]}-${r.rh[1]} %` : ''}`;
}
