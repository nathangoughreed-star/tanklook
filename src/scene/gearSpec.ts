// The gear model's spine (lane GM1, 2026-10-29; research/design/gear-model.md section 2): one StatBlock per equipment type is
// the only thing physics should read, whether the piece is a catalogue product (locked stats) or a generic one (the owner's
// numbers). PURE ADDITION: nothing calls this yet, no engine number moves; later lanes (gear card, pricing, new types) build on
// it. `statsOf(ref)` returns a product's stats or the generic's, and the adapters turn the three old shapes (HeaterUnit.w,
// FilterUnit.model, LightSettings.watts/product) into a GearRef, so saved files keep loading with no version bump.
import { FILTER_MODELS } from '../demand/gear';
import {
  ATO_PRODUCTS, CHILLER_PRODUCTS, CO2_PRODUCTS, FILTER_PRODUCTS, HEATER_PRODUCTS, LIGHT_PRODUCTS, PUMP_PRODUCTS, SKIMMER_PRODUCTS, UV_PRODUCTS,
  type FilterProductKind,
} from '../data/gearCatalog';
import type { FilterUnit, HeaterUnit } from './tech';
import type { LightSettings } from './types';

/** The library-class types of the design (section 2a): a generic piece AND a product catalogue. */
export type LibraryType = 'light' | 'heater' | 'filter' | 'powerhead' | 'wavemaker' | 'airpump' | 'skimmer' | 'uv' | 'co2' | 'ato' | 'chiller';
/** The generic-only types (lane GM7, design G5): ONE tunable item each, no brands and no catalogue (curves in data/genericGear.ts). */
export type GenericType = 'thermometer' | 'hygrometer' | 'thermostat' | 'timer' | 'heatlamp' | 'heatmat' | 'uvb' | 'mister' | 'fogger' | 'lilypipe' | 'doser' | 'feeder'
  | 'rodi' | 'dropchecker' | 'sump' | 'lid' | 'returnpump';
export type GearType = LibraryType | GenericType;
export const GEAR_TYPES: readonly LibraryType[] = ['light', 'heater', 'filter', 'powerhead', 'wavemaker', 'airpump', 'skimmer', 'uv', 'co2', 'ato', 'chiller'];
export const GENERIC_TYPES: readonly GenericType[] = ['thermometer', 'hygrometer', 'thermostat', 'timer', 'heatlamp', 'heatmat', 'uvb', 'mister', 'fogger', 'lilypipe', 'doser', 'feeder', 'rodi', 'dropchecker', 'sump', 'lid', 'returnpump'];
/** Library = a generic piece AND a product catalogue; generic = one tunable item only. */
export const GEAR_CLASS: Record<GearType, 'library' | 'generic'> = {
  light: 'library', heater: 'library', filter: 'library', powerhead: 'library', wavemaker: 'library', airpump: 'library',
  skimmer: 'library', uv: 'library', co2: 'library', ato: 'library', chiller: 'library',
  thermometer: 'generic', hygrometer: 'generic', thermostat: 'generic', timer: 'generic', heatlamp: 'generic', heatmat: 'generic', uvb: 'generic', mister: 'generic',
  fogger: 'generic', lilypipe: 'generic', doser: 'generic', feeder: 'generic', rodi: 'generic', dropchecker: 'generic', sump: 'generic', lid: 'generic', returnpump: 'generic',
};

export interface StatBlock {
  light: { watts: number; kelvin?: number; par?: number };
  heater: { watts: number };
  filter: { kind: FilterProductKind; gph?: number; watts?: number; galMin?: number; galMax?: number };
  powerhead: { gph?: number; watts?: number };
  wavemaker: { gph?: number; watts?: number };
  airpump: { airGph?: number; outlets?: number; watts?: number };
  skimmer: { ratedGal?: number; gph?: number; watts?: number };
  uv: { watts?: number; galMin?: number; galMax?: number };
  co2: { stages?: number; cartridgeG?: number };
  ato: { sensors?: number };
  chiller: { ratedGal?: number; hp?: string; watts?: number };
  // generic-only types (lane GM7): every number is the owner's, within GEAR_LIMITS; a flag is 0 or 1
  thermometer: { probes: number };
  hygrometer: { probes: number };
  thermostat: { channels: number; dimming: number };
  timer: { channels: number };
  heatlamp: { watts: number };
  heatmat: { watts: number };
  /** UVB output as % of the lamp's light (5.0 / 10.0 / 12 tubes: the welfare stat); length in inches */
  uvb: { strengthPct: number; lengthIn: number };
  mister: { nozzles: number; mlPerHour: number };
  fogger: { mlPerHour: number };
  lilypipe: { diameterIn: number };
  doser: { heads: number };
  feeder: { hoppers: number };
  rodi: { gpd: number };
  dropchecker: { count: number };
  sump: { gal: number };
  /** material 0 glass, 1 mesh, 2 hood (the keys of tech.json heat.surface); openPct = how much of the top is left open */
  lid: { openPct: number; material: number; hoodLed: number; lengthIn: number };
  returnpump: { gph: number };
}

/** What a scene stores for one piece: a product id (stats come from the library) or, absent, the generic's own stats. */
export interface GearRef<T extends GearType = GearType> { type: T; product?: string; stats?: Partial<StatBlock[T]>; owned?: boolean; paidUsd?: number }

/** Hard limits per tunable stat (min, max). Out-of-range values warn in the UI; they never block (design section 2). */
export const GEAR_LIMITS: { [T in GearType]?: { [K in keyof StatBlock[T]]?: [number, number] } } = {
  light: { watts: [3, 400] },
  heater: { watts: [25, 500] },
  filter: { gph: [20, 1500] },
  powerhead: { gph: [100, 5000] },
  wavemaker: { gph: [100, 5000] },
  thermometer: { probes: [1, 3] }, hygrometer: { probes: [1, 2] }, thermostat: { channels: [1, 4], dimming: [0, 1] }, timer: { channels: [1, 8] },
  heatlamp: { watts: [25, 250] }, heatmat: { watts: [4, 60] }, uvb: { strengthPct: [2, 14], lengthIn: [12, 48] }, mister: { nozzles: [1, 8], mlPerHour: [100, 2000] },
  fogger: { mlPerHour: [100, 1500] }, lilypipe: { diameterIn: [0.5, 2] }, doser: { heads: [1, 6] }, feeder: { hoppers: [1, 2] }, rodi: { gpd: [25, 300] },
  dropchecker: { count: [1, 2] }, sump: { gal: [5, 200] }, lid: { openPct: [0, 100], material: [0, 2], hoodLed: [0, 1], lengthIn: [12, 72] }, returnpump: { gph: [100, 3000] },
};

/** The listed fields of `o` that are present. */
const pick = (o: object, ...keys: string[]) => {
  const r: Record<string, unknown> = {};
  for (const k of keys) { const v = (o as Record<string, unknown>)[k]; if (v !== undefined) r[k] = v; }
  return r;
};
const byId = <P extends { id: string }>(list: readonly P[], id?: string) => (id ? list.find(p => p.id === id) : undefined);

/** A catalogue product's locked stats, or undefined when `id` names none. */
export function productStats<T extends GearType>(type: T, id?: string): StatBlock[T] | undefined {
  let s: Record<string, unknown> | undefined;
  switch (type) {
    case 'light': { const p = byId(LIGHT_PRODUCTS, id); if (p) s = pick(p, 'watts', 'kelvin', 'par'); break; }
    case 'heater': { const p = byId(HEATER_PRODUCTS, id); if (p) s = { watts: p.watts }; break; }
    case 'filter': { const p = byId(FILTER_PRODUCTS, id); if (p) s = { kind: p.kind, ...pick(p, 'gph', 'watts', 'galMin', 'galMax') }; break; }
    case 'powerhead': case 'wavemaker': { const p = byId(PUMP_PRODUCTS, id); if (p) s = pick(p, 'gph', 'watts'); break; }
    case 'airpump': { const p = byId(PUMP_PRODUCTS, id); if (p) s = pick(p, 'airGph', 'outlets', 'watts'); break; }
    case 'skimmer': { const p = byId(SKIMMER_PRODUCTS, id); if (p) s = pick(p, 'ratedGal', 'gph', 'watts'); break; }
    case 'uv': { const p = byId(UV_PRODUCTS, id); if (p) s = pick(p, 'watts', 'galMin', 'galMax'); break; }
    case 'co2': { const p = byId(CO2_PRODUCTS, id); if (p) s = pick(p, 'stages', 'cartridgeG'); break; }
    case 'ato': { const p = byId(ATO_PRODUCTS, id); if (p) s = pick(p, 'sensors'); break; }
    case 'chiller': { const p = byId(CHILLER_PRODUCTS, id); if (p) s = pick(p, 'ratedGal', 'hp', 'watts'); break; }
  }
  return s as StatBlock[T] | undefined;
}

/** Defaults for a generic piece's missing stats. */
const DEFAULTS: { [T in GearType]: StatBlock[T] } = {
  light: { watts: 20 }, heater: { watts: 50 }, filter: { kind: 'hob' }, powerhead: {}, wavemaker: {}, airpump: {},
  skimmer: {}, uv: {}, co2: {}, ato: {}, chiller: {},
  // generic-only defaults: the size the Tech menu's row has always priced (a 24 in 5.0 T5 HO, a 75 W basking bulb, a 1-channel on/off thermostat ...)
  thermometer: { probes: 1 }, hygrometer: { probes: 1 }, thermostat: { channels: 1, dimming: 0 }, timer: { channels: 1 }, heatlamp: { watts: 75 }, heatmat: { watts: 20 },
  uvb: { strengthPct: 5, lengthIn: 24 }, mister: { nozzles: 2, mlPerHour: 400 }, fogger: { mlPerHour: 400 }, lilypipe: { diameterIn: 1 }, doser: { heads: 2 }, feeder: { hoppers: 1 },
  rodi: { gpd: 75 }, dropchecker: { count: 1 }, sump: { gal: 20 }, lid: { openPct: 0, material: 0, hoodLed: 0, lengthIn: 24 }, returnpump: { gph: 600 },
};

/** The stats physics reads for a piece: the product's locked stats when it names a catalogue product, else the generic's own over defaults. */
export function statsOf<T extends GearType>(ref: GearRef<T>): StatBlock[T] {
  return productStats(ref.type, ref.product) ?? ({ ...DEFAULTS[ref.type], ...ref.stats } as StatBlock[T]);
}

// ---- adapters from the old fields (no saved-file change)

/** A heater unit as a GearRef: its catalogue product, else the generic at `w` watts (absent `w`: the type default). */
export const heaterRef = (u: HeaterUnit): GearRef<'heater'> => ({ type: 'heater', product: u.product, stats: u.w !== undefined ? { watts: u.w } : undefined });
/** A filter unit as a GearRef: its catalogue product, else the generic gear-models.json `model` (its gph and watts). */
export function filterRef(u: FilterUnit): GearRef<'filter'> {
  const m = u.model ? FILTER_MODELS.find(x => x.id === u.model) : undefined;
  return { type: 'filter', product: u.product, stats: { kind: (m?.kind ?? u.kind) as FilterProductKind, ...(m ? { gph: m.gph, watts: m.watts, galMin: m.galMin, galMax: m.galMax } : {}) } };
}
/** A light as a GearRef: its catalogue product, else the generic fixture's watts / kelvin / PAR override. */
export const lightRef = (l: Pick<LightSettings, 'product' | 'watts' | 'kelvin' | 'par'>): GearRef<'light'> =>
  ({ type: 'light', product: l.product, stats: { ...(l.watts !== undefined ? { watts: l.watts } : {}), ...(l.kelvin !== undefined ? { kelvin: l.kelvin } : {}), ...(l.par ? { par: l.par } : {}) } });
