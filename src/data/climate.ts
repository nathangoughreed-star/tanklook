// Recommended temperature and humidity for the enclosure on screen (Nathan 2026-10-19). Advice from common husbandry
// practice, estimates like care.ts: water temperature for a tank with water, air temperature and relative humidity for a
// terrarium. Every inhabitant has a COMFORTABLE band (where it thrives, long term) and a wider TOLERABLE band (survives, not
// for the long haul). The recommended value is not an average: it is the setting that minimises the worst compromise anyone
// has to make (each inhabitant's stress is how far into its own tolerable margin the value lands), and the agreement score says
// how much compromise is left, for whom, and whether it is fine long term. A tolerable band that has not been researched yet
// is estimated from the comfortable one (marked `est`).
import { CARE } from './care';
import { getSpecies } from './species';
import type { LayoutId, TankSetup } from '../scene/types';

type R = [number, number];
/** One inhabitant on one axis (deg C or % RH). */
export interface Band { name: string; ok: R; tol: R; est?: boolean }
export type Status = 'ideal' | 'fine' | 'stretch' | 'unsafe';
export interface Per {
  name: string;
  /** 0 inside its comfortable band, 1 at the edge of its tolerable band, over 1 outside it */
  cost: number;
  status: Status;
  /** signed distance outside its comfortable band: + too warm / too humid, - too cold / too dry (0 inside) */
  delta: number;
  est?: boolean;
}
export interface Fit {
  /** the recommended value */
  at: number;
  /** the values that are equally good (the shared comfortable band when everyone can have it) */
  zone: R;
  /** 0-100: 100 means every inhabitant is inside its comfortable band */
  score: number;
  longTerm: boolean;
  per: Per[];
  /** one or two plain sentences */
  summary: string;
}

/** Stress at which a compromise is still fine long term (a third of the way into the tolerable margin). */
const FINE = 0.35;
const cost = (v: number, b: Band, minMargin: number) => {
  if (v >= b.ok[0] && v <= b.ok[1]) return 0;
  if (v < b.ok[0]) return (b.ok[0] - v) / Math.max(minMargin, b.ok[0] - b.tol[0]);
  return (v - b.ok[1]) / Math.max(minMargin, b.tol[1] - b.ok[1]);
};
const statusOf = (c: number): Status => c <= 0 ? 'ideal' : c <= FINE ? 'fine' : c <= 1 ? 'stretch' : 'unsafe';

/** The value minimising the worst stress (then the total), searched on a grid; the middle of the best values. */
export function solve(bands: Band[], lo: number, hi: number, step: number, unit: string): Fit | null {
  if (!bands.length) return null;
  const minMargin = unit === '%' ? 5 : 1;
  const grid: { v: number; max: number; sum: number }[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) {
    const cs = bands.map(b => cost(v, b, minMargin));
    grid.push({ v, max: Math.max(...cs), sum: cs.reduce((a, b) => a + b, 0) });
  }
  const best = Math.min(...grid.map(g => g.max));
  const top = grid.filter(g => g.max <= best + 0.02);
  const minSum = Math.min(...top.map(g => g.sum));
  const tied = top.filter(g => g.sum <= minSum + 0.02);
  const at = tied[Math.floor((tied.length - 1) / 2)].v;
  const zone: R = [tied[0].v, tied[tied.length - 1].v];
  const per: Per[] = bands.map(b => {
    const c = cost(at, b, minMargin);
    return { name: b.name, cost: c, status: statusOf(c), delta: at > b.ok[1] ? at - b.ok[1] : at < b.ok[0] ? at - b.ok[0] : 0, est: b.est };
  });
  const max = Math.max(...per.map(p => p.cost)), mean = per.reduce((a, p) => a + p.cost, 0) / per.length;
  const score = Math.max(0, Math.round(100 - 35 * Math.min(max, 2) - 25 * Math.min(mean, 1)));
  const longTerm = per.every(p => p.status === 'ideal' || p.status === 'fine');
  const u = unit === '%' ? ' %' : ' °C';
  const off = per.filter(p => p.status !== 'ideal').sort((x, y) => y.cost - x.cost);
  const dir = (p: Per) => `${Math.abs(p.delta).toFixed(1).replace(/\.0$/, '')}${u} ${p.delta > 0 ? (unit === '%' ? 'wetter' : 'warmer') : (unit === '%' ? 'drier' : 'cooler')} than its comfortable range`;
  const verdict = (p: Per) => p.status === 'fine' ? 'a small compromise, fine long term'
    : p.status === 'stretch' ? 'tolerable for a while, not recommended long term' : 'outside what it tolerates: do not keep it with the others';
  const summary = !off.length ? `Everyone is inside their comfortable range at ${at}${u}.`
    : off.slice(0, 3).map(p => `${p.name}: ${dir(p)}, ${verdict(p)}${p.est ? ' (tolerance estimated)' : ''}.`).join(' ') + (off.length > 3 ? ` +${off.length - 3} more.` : '');
  return { at, zone, score, longTerm, per, summary };
}

export interface Climate {
  /** short heading: what the numbers are for */
  label: string;
  /** deg C; for a basking species the warm spot as a second band */
  c: R;
  warm?: R;
  /** relative humidity, %, for amphibian and reptile enclosures */
  rh?: R;
  note?: string;
  /** each inhabitant's own bands and the fits for them (null when nothing here has data) */
  bands: Band[];
  rhBands: Band[];
  at: number;
  atRh?: number;
  fit: Fit | null;
  fitRh: Fit | null;
}
/** Air climate of a land animal: comfortable temp, tolerable temp, humidity, tolerable humidity, warm spot, note. */
interface Air { c: R; tol?: R; rh: R; rhTol?: R; warm?: R; note?: string }
const AIR: Record<string, Air> = {
  crestedgecko: { c: [22, 26], rh: [60, 80], note: 'Mist daily; let it dry a little between.' },
  crestedharlequin: { c: [22, 26], rh: [60, 80], note: 'Mist daily; let it dry a little between.' },
  // researched 2026-10-19 (research/climate/pilot.md)
  leopardgecko: { c: [22, 26], tol: [20, 28], rh: [30, 40], rhTol: [20, 50], warm: [32, 35], note: 'Warm basking spot 32-35; night 18-22; a humid hide (60-80 %) helps a shed.' },
  ballpython: { c: [24, 27], tol: [22, 28], rh: [50, 65], rhTol: [45, 80], warm: [30, 33], note: 'Warm hide 30-33, cool hide 24-27, night 22-26; 65-80 % while shedding.' },
  dartfrog: { c: [22, 26], rh: [70, 90] },
  treefrog: { c: [22, 28], rh: [60, 80] },
  firetoad: { c: [18, 24], rh: [60, 80], note: 'Cool: stays well below 26.' },
  firenewt: { c: [18, 24], rh: [60, 80], note: 'Cool: stays well below 26.' },
  regaljumper: { c: [22, 27], rh: [50, 70] },
  chacogoldenknee: { c: [22, 27], rh: [50, 65], note: 'Keep one corner damp, the rest drier.' },
};
const pad = (r: R, by: number, min = 0, max = Infinity): R => [Math.max(min, r[0] - by), Math.min(max, r[1] + by)];
/** Air climate by terrarium style. */
const STYLE_AIR: Partial<Record<LayoutId, string>> = { rainforest: 'crestedgecko', arid: 'leopardgecko', jumper: 'regaljumper', python: 'ballpython', burrow: 'chacogoldenknee', frogs: 'treefrog' };
const round1 = (n: number) => Math.round(n * 2) / 2;

/** The numbers to show for this enclosure: one or two rows (water, air). */
export function climateOf(S: TankSetup): Climate[] {
  const rows: Climate[] = [];
  const sp = [...new Set(S.fish.map(f => f.species))];
  const nm = (id: string) => getSpecies(id)?.name ?? id;
  const land = sp.filter(id => AIR[id]);
  if (S.water.on) {
    const own = sp.filter(id => CARE[id]?.temp);
    const bands: Band[] = own.map(id => { const c = CARE[id]; return { name: nm(id), ok: c.temp!, tol: c.tol ?? pad(c.temp!, 2), est: !c.tol }; });
    const fit = solve(bands, 0, 40, 0.5, '°C');
    const fallback: R = S.water.salt ? [24, 27] : [22, 26];
    rows.push({
      label: 'Water', c: fit?.zone ?? fallback, bands, rhBands: [], fit, fitRh: null,
      at: fit?.at ?? round1((fallback[0] + fallback[1]) / 2),
      note: S.water.salt ? 'Hold it steady, within about 1 degree.' : undefined,
    });
  }
  const swampy = S.layout.id === 'swamp' || S.layout.id === 'paludarium';
  const styleSp = STYLE_AIR[S.layout.id];
  if (!S.water.on || swampy || land.length) {
    const ids = land.length ? land : styleSp ? [styleSp] : [];
    const dflt = { c: [22, 26] as R, rh: (swampy ? [70, 90] : [50, 70]) as R };
    if (swampy) dflt.c = [22, 27];
    const bands: Band[] = ids.map(id => ({ name: land.length ? nm(id) : `${nm(id)} (this style)`, ok: AIR[id].c, tol: AIR[id].tol ?? pad(AIR[id].c, 2), est: !AIR[id].tol }));
    const rhBands: Band[] = ids.map(id => ({ name: bands[ids.indexOf(id)].name, ok: AIR[id].rh, tol: AIR[id].rhTol ?? pad(AIR[id].rh, 10, 0, 100), est: !AIR[id].rhTol }));
    const fit = solve(bands, 0, 40, 0.5, '°C'), fitRh = solve(rhBands, 0, 100, 5, '%');
    const one = ids.length === 1 ? AIR[ids[0]] : undefined;
    rows.push({
      label: 'Air', c: fit?.zone ?? dflt.c, rh: fitRh?.zone ?? dflt.rh, warm: one?.warm, bands, rhBands, fit, fitRh,
      at: fit?.at ?? round1((dflt.c[0] + dflt.c[1]) / 2), atRh: fitRh?.at ?? Math.round((dflt.rh[0] + dflt.rh[1]) / 2),
      note: one?.note,
    });
  }
  return rows;
}
const F = (c: number) => Math.round(c * 9 / 5 + 32);
const band = (r: R) => `${r[0]}-${r[1]} °C (${F(r[0])}-${F(r[1])} °F)`;
/** The collapsed line: "Set to 24 °C (75 °F)", the warm spot and humidity where there are some, and the agreement score. */
export function climateText(r: Climate) {
  const score = [r.fit, r.fitRh].filter((f): f is Fit => !!f).map(f => f.score);
  return `Set to ${r.at} °C (${F(r.at)} °F)${r.warm ? `, warm spot ${band(r.warm)}` : ''}${r.atRh != null ? `, humidity ${r.atRh} %` : ''}`
    + (score.length ? ` · Agreement ${Math.min(...score)}/100` : '');
}

const STATUS_TXT: Record<Status, string> = { ideal: 'ideal', fine: 'ok', stretch: 'not long term', unsafe: 'too far' };
/** Bands on one axis, one row per inhabitant (tolerable behind, comfortable in front), the recommendation as a vertical line. */
function axis(title: string, unit: string, fit: Fit, bands: Band[], warm: Record<string, R | undefined>, lo0: number, hi0: number) {
  const lo = Math.min(lo0, ...bands.map(b => b.tol[0])), hi = Math.max(hi0, ...bands.map(b => b.tol[1]), ...Object.values(warm).map(w => w?.[1] ?? -Infinity));
  const span = hi - lo, pc = (v: number) => (100 * (v - lo) / span).toFixed(1);
  const seg = (r: R, cls: string) => `<i class="${cls}" style="left:${pc(r[0])}%;width:${(100 * (r[1] - r[0]) / span).toFixed(1)}%"></i>`;
  const row = (b: Band) => {
    const p = fit.per.find(x => x.name === b.name)!;
    const w = warm[b.name], d = p.delta ? ` ${p.delta > 0 ? '+' : ''}${p.delta.toFixed(1).replace(/\.0$/, '')}` : '';
    return `<div class="clR"><span class="clN" title="${b.name}${b.est ? ' (tolerable band estimated)' : ''}">${b.name}${b.est ? '*' : ''}</span><span class="clB">${seg(b.tol, 't')}${seg(b.ok, 'a')}${w ? seg(w, 'w') : ''}</span>`
      + `<span class="clV s-${p.status}" title="${b.ok[0]}-${b.ok[1]} comfortable, ${b.tol[0]}-${b.tol[1]} tolerable">${STATUS_TXT[p.status]}${d}</span></div>`;
  };
  return `<div class="clAx"><div class="clT">${title} <span class="clScore ${fit.longTerm ? 'good' : 'bad'}">Agreement ${fit.score}/100${fit.longTerm ? '' : ' · not recommended long term'}</span></div>`
    + bands.map(row).join('')
    + `<div class="clR"><span class="clN"></span><span class="clB clScale"><b style="left:${pc(lo)}%">${lo}</b><b style="left:${pc(hi)}%">${hi}${unit}</b></span><span class="clV"></span></div>`
    + `<span class="clLine" style="left:calc(var(--cl-n) + (100% - var(--cl-n) - var(--cl-v)) * ${(+pc(fit.at) / 100).toFixed(4)})" title="Recommended: ${fit.at}${unit}"><em>${fit.at}${unit}</em></span>`
    + `<div class="clSum">${fit.summary}</div></div>`;
}
/** The expanded view of one row: where the recommendation comes from and what compromise it makes. */
export function climateChart(r: Climate) {
  if (!r.fit) return '';
  const warm = Object.fromEntries(r.bands.map(b => [b.name, undefined as R | undefined]));
  if (r.warm && r.bands.length === 1) warm[r.bands[0].name] = r.warm;
  let h = axis(`${r.label} temperature, °C`, '', r.fit, r.bands, warm, Math.floor(r.fit.at) - 4, Math.ceil(r.fit.at) + 4);
  if (r.fitRh) h += axis('Relative humidity, %', '%', r.fitRh, r.rhBands, {}, 0, 100);
  if ([...r.bands, ...r.rhBands].some(b => b.est)) h += '<div class="clSum">* Tolerable band estimated from the comfortable one; not yet researched.</div>';
  return h;
}
