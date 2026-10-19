// Recommended temperature and humidity for the enclosure on screen (Nathan 2026-10-19). Advice from common husbandry
// practice, estimates like care.ts: water temperature for a tank with water, air temperature and relative humidity for a
// terrarium. A land animal's own entry wins over the style's, the style's over the generic one.
import { CARE } from './care';
import { getSpecies } from './species';
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
  /** each inhabitant's own band, and the point the recommendation sits at (deg C, % RH) */
  bands: Band[];
  at: number;
  atRh?: number;
}
const T = (c: [number, number], rh?: [number, number], warm?: [number, number], note?: string) => ({ c, rh, warm, note });
/** Air climate by species id (reptiles, amphibians, land inverts). */
const AIR: Record<string, ReturnType<typeof T>> = {
  crestedgecko: T([22, 26], [60, 80], undefined, 'Mist daily; let it dry a little between.'),
  crestedharlequin: T([22, 26], [60, 80], undefined, 'Mist daily; let it dry a little between.'),
  greenanole: T([24, 29], [60, 80], [32, 35], 'Basking spot 32-35 with UVB; mist the leaves twice a day (it drinks drops).'),
  greenanolebrown: T([24, 29], [60, 80], [32, 35], 'Basking spot 32-35 with UVB; mist the leaves twice a day (it drinks drops).'),
  brownanole: T([24, 30], [60, 75], [32, 35], 'Basking spot 32-35 with UVB; mist daily and let it dry between.'),
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

/** One inhabitant's own band (or the style's default when nothing living is in the enclosure). */
export interface Band { name: string; c: [number, number]; warm?: [number, number]; rh?: [number, number] }
/** The recommended point inside the bands: the middle of what they share, else the middle of the gap between them. */
const pick = (r: [number, number][]) => {
  const o = overlap(r);
  if (o) return (o[0] + o[1]) / 2;
  const lo = Math.max(...r.map(x => x[0])), hi = Math.min(...r.map(x => x[1]));
  return (lo + hi) / 2;
};
const round1 = (n: number) => Math.round(n * 2) / 2;

/** The numbers to show for this enclosure: one or two rows (water, air). */
export function climateOf(S: TankSetup): Climate[] {
  const rows: Climate[] = [];
  const sp = [...new Set(S.fish.map(f => f.species))];
  const nm = (id: string) => getSpecies(id)?.name ?? id;
  const land = sp.filter(id => AIR[id]);
  if (S.water.on) {
    const own = sp.filter(id => CARE[id]?.temp);
    const ranges = own.map(id => CARE[id].temp!);
    const fit = ranges.length ? overlap(ranges) : null;
    const fallback: [number, number] = S.water.salt ? [24, 27] : [22, 26];
    rows.push({
      label: 'Water', c: fit ?? fallback,
      bands: own.map(id => ({ name: nm(id), c: CARE[id].temp! })),
      at: ranges.length ? round1(pick(ranges)) : round1((fallback[0] + fallback[1]) / 2),
      note: ranges.length && !fit ? 'The animals in here want different temperatures: see their care notes.' : S.water.salt ? 'Hold it steady, within about 1 degree.' : undefined,
    });
  }
  const swampy = S.layout.id === 'swamp' || S.layout.id === 'paludarium';
  const styleSp = STYLE_AIR[S.layout.id];
  if (!S.water.on || swampy || land.length) {
    const ids = land.length ? land : styleSp ? [styleSp] : [];
    const dflt = swampy ? T([22, 27], [70, 90]) : T([22, 26], [50, 70]);
    const bands: Band[] = ids.map(id => ({ name: land.length ? nm(id) : `${nm(id)} (this style)`, c: AIR[id].c, warm: AIR[id].warm, rh: AIR[id].rh }));
    const cs = bands.map(x => x.c), rhs = bands.map(x => x.rh!);
    const c = cs.length ? overlap(cs) ?? [Math.min(...cs.map(x => x[1])), Math.max(...cs.map(x => x[0]))] as [number, number] : dflt.c;
    const rh = rhs.length ? overlap(rhs) ?? [Math.min(...rhs.map(x => x[1])), Math.max(...rhs.map(x => x[0]))] as [number, number] : dflt.rh;
    const one = ids.length === 1 ? AIR[ids[0]] : undefined;
    rows.push({
      label: 'Air', c, rh, warm: one?.warm, bands,
      at: round1(pick(cs.length ? cs : [dflt.c])), atRh: Math.round(pick(rhs.length ? rhs : [dflt.rh!])),
      note: land.length > 1 && !overlap(cs) ? 'The animals in here want different climates: see their care notes.' : one?.note ?? (ids.length ? undefined : dflt.note),
    });
  }
  return rows;
}
const F = (c: number) => Math.round(c * 9 / 5 + 32);
const band = (r: [number, number]) => `${r[0]}-${r[1]} °C (${F(r[0])}-${F(r[1])} °F)`;
/** One line per row, "Water 22-26 °C (72-79 °F)" plus warm spot and humidity where there is one. */
export function climateText(r: Climate) {
  return `${band(r.c)}${r.warm ? `, warm spot ${band(r.warm)}` : ''}${r.rh ? `, humidity ${r.rh[0]}-${r.rh[1]} %` : ''}`;
}

/** Bands on one axis (deg C or % RH), one row per inhabitant, the recommended value as a vertical line through all of them. */
function axis(title: string, unit: string, rows: { name: string; r: [number, number]; warm?: [number, number] }[], at: number, lo0: number, hi0: number) {
  const lo = Math.min(lo0, ...rows.flatMap(x => [x.r[0], x.warm?.[0] ?? Infinity])), hi = Math.max(hi0, ...rows.flatMap(x => [x.r[1], x.warm?.[1] ?? -Infinity]));
  const span = hi - lo, pc = (v: number) => (100 * (v - lo) / span).toFixed(1);
  const seg = (r: [number, number], cls: string) => `<i class="${cls}" style="left:${pc(r[0])}%;width:${(100 * (r[1] - r[0]) / span).toFixed(1)}%"></i>`;
  return `<div class="clAx"><div class="clT">${title}</div>${rows.map(x => `<div class="clR"><span class="clN">${x.name}</span><span class="clB">${seg(x.r, 'a')}${x.warm ? seg(x.warm, 'w') : ''}</span><span class="clV">${x.r[0]}-${x.r[1]}</span></div>`).join('')}`
    + `<div class="clR"><span class="clN"></span><span class="clB clScale"><b style="left:${pc(lo)}%">${lo}</b><b style="left:${pc(hi)}%">${hi}${unit}</b></span><span class="clV"></span></div>`
    + `<span class="clLine" style="left:calc(var(--cl-n) + (100% - var(--cl-n) - var(--cl-v)) * ${(+pc(at) / 100).toFixed(4)})" title="Recommended: ${at}${unit}"><em>${at}${unit}</em></span></div>`;
}
/** The expanded view of one row: where the recommendation comes from. */
export function climateChart(r: Climate) {
  if (!r.bands.length) return '';
  let h = axis(`${r.label} temperature, °C`, '', r.bands.map(b => ({ name: b.name, r: b.c, warm: b.warm })), r.at, Math.floor(r.at) - 4, Math.ceil(r.at) + 4);
  if (r.rh && r.atRh != null) h += axis('Relative humidity, %', '%', r.bands.filter(b => b.rh).map(b => ({ name: b.name, r: b.rh! })), r.atRh, 0, 100);
  return h;
}
