// The tank's tech level (lane TM, 2026-10-19): filtration, heating, CO2, ferts, aeration, UV, water and salt gear, Walstad
// to SPS reef. Data in src/data/tech.json (rows of choices, each a list of gear parts; gear priced, powered and maintained
// for THIS tank). Pure: the demand engine (src/demand/tech.ts), the Tech menu (ui/techMenu.ts) and lane TG's 3D gear
// (render/gear3d.ts, via techParts) all read the tank's tech through techOf. A file without `tech` gets the gear the
// demand engine always inferred (inferTech), so its numbers do not move. grow.feed is derived from the CO2 + ferts rows
// (feedOf); the Plant care slider sets those rows (setFeed).
import { fitsInStand } from './standspace';
import { dryInferred } from './drygear';
import data from '../data/tech.json';
import { CARE } from '../data/care';
import { climateOf } from '../data/climate';
import { getSpecies } from '../data/species';
import { FILTER_MODELS, HEATER_MODELS, matchHeater, type FilterKind, type FilterModel, type HeaterModel } from '../demand/gear';
import { price as rowPrice, tankRowPrice } from '../demand/prices';
import type { Range3 } from '../demand/types';
import { volume } from './physics';
import { filterProduct, genericHeaterW, heaterProduct, listedPrice, type FilterProduct, type HeaterProduct } from '../data/gearCatalog';
import { footprint } from './shape';
import { getTankModel, TANK_MODELS, tankFromModel, type TankModel } from '../data/tanks';
import type { GrowFeed, TankSetup } from './types';
import type { TempEvidence } from './temprange';

// ---- types (the saved field; lane TG builds against TechSetup / GearPlace / TechPiece)

/** Where a row's gear sits (lane TG draws it there): the tank wall it hangs on or stands against, and how far along that
 *  wall, 0 = left end (back wall, seen from the front) or front end (side walls) .. 1 = the other end. */
export interface GearPlace {
  /** 'floor' (lane TG 2026-10-19): gear that stands on the ground (sponge filter, airstone); 'lid' (2026-10-21): a dry
   *  tank's lamps and misting nozzle, anywhere on the top (mesh, glass or hood; with no lid, on the rim) */
  wall: 'back' | 'left' | 'right' | 'floor' | 'lid';
  /** floor and lid: the x share, 0 = left .. 1 = right */
  at?: number;
  /** glass mounts: height share from the ground (0) to the water line (1); floor and lid: depth share, 0 = front .. 1 = back */
  y?: number;
  /** heaters: degrees off vertical, -90..90 (90 = lying flat; the owner's Shift + wheel) */
  lean?: number;
}

/** The tank's tech (TankSetup.tech; optional, no version bump). A row left out takes the inferred default (inferTech). */
export interface TechSetup {
  /** the preset last applied; 'custom' once a row is changed by hand; absent = inferred from an older file */
  preset?: string;
  /** row id -> option id (tech.json rows) */
  rows: Record<string, string>;
  /** step the filter up or down: a gear-models.json filter id of the chosen kind; absent = the model sized for the tank */
  filterModel?: string;
  /** a real filter picked from the gear catalogue (lane TG step 3): its flow sets the turnover, its price the cost, its
   *  size and colours are drawn; it must be of the chosen filter kind */
  filterProduct?: string;
  /** the owner keeps this tank without a filter on purpose (Walstad style; Nathan 2026-10-21): the Filtration bar then shows the
   *  surface bacteria alone. Absent with no filter chosen = the tank still needs a filter (filterState 'unset'). */
  filterless?: boolean;
  /** heater watts each (a gear-models.json heater class); absent = sized from the heat loss */
  heaterW?: number;
  /** a real heater picked from the gear catalogue (data/gear-catalog.json; lane TG): its watts size the heat, its size is drawn */
  heaterProduct?: string;
  /** room temperature, deg C, where the tank stands; absent = tech.json roomC (21) */
  roomC?: number;
  /** the tank's target water temperature, deg C (the intended operating temperature, whatever holds it: heater, cooling or the room);
   *  absent = not set (the heater is sized for the climate's recommendation, and the temperature checks say unchecked) */
  targetC?: number;
  /** a measured water temperature, deg C (an existing tank); absent = none supplied */
  measuredC?: number;
  /** where lane TG draws each row's gear (row id -> place; a second unit of a row is 'heater.1', 'filter.1', ...); absent = TG's default side */
  place?: Record<string, GearPlace>;
  /** the heaters, one entry each (Nathan 2026-10-20: add as many as you like, each generic or a catalogue product);
   *  absent = the older fields (rows.heater, heaterW, heaterProduct). rows.heater follows the count (withUnits). */
  heaters?: HeaterUnit[];
  /** the filtration, one entry per unit, each of a filter kind (tech.json filter option id), generic or a product;
   *  absent = the older fields (rows.filter, filterModel, filterProduct). rows.filter follows the main unit (withUnits). */
  filters?: FilterUnit[];
  /** the sump (lane SU, Nathan 2026-10-22): a second tank under the display, interior mm like the display's; `model` = the tank
   *  catalogue size it was picked from (absent = a custom size). Counts only while a sump is in the filtration; absent = sumpDefault. */
  sump?: SumpSize;
}
/** A sump's size: interior mm, and the catalogue model it came from, if any. */
export interface SumpSize { model?: string; L: number; D: number; H: number }
/** One heater: a catalogue product, or a generic one of `w` watts (absent = sized to the tank's need). `kit`: the one the
 *  bundle the tank was started from ships (its price is in the bundle's while the bundle is pinned). */
export interface HeaterUnit { product?: string; w?: number; kit?: boolean }
/** One filter: `kind` a filter option id (sponge, internal, hob, canister, sump); a catalogue product of that kind, or a
 *  generic gear-models.json `model` (absent = sized for the tank). `kit` as for heaters. */
export interface FilterUnit { kind: string; product?: string; model?: string; kit?: boolean }

/** 'dry' (2026-10-21): a dry tank's rows (heat lamp, UVB, misting) */
export type Water = 'wet' | 'fresh' | 'salt' | 'dry';
export interface TechOption {
  id: string; label: string; parts: string[]; note?: string;
  /** filter kind sized from gear-models.json */
  kind?: FilterKind;
  /** fraction of AqAdvisor's stocking capacity this filtration supports (1 = a matched HOB) */
  capacity?: number;
  /** risk points this option adds (negative = takes away), before the skill scaling */
  risk?: number;
  /** CO2 / ferts strength, for feedOf */
  co2?: number; fert?: number;
  /** heaters: how many units the power is split over; powerheads: how many pumps */
  heaters?: number; count?: number;
  /** salt: the coral care level this skimmer / flow / dosing option supports (0 soft, 1 LPS, 2 SPS); see reefFeedOf */
  tier?: number;
  /** smallest tank this option makes sense on */
  minGal?: number;
  /** another row's option this one needs (an in-sump skimmer needs the sump) */
  needs?: Record<string, string>;
}
export interface TechRow { id: string; label: string; water: Water; options: TechOption[]; /** a quality-of-life row: it saves time (water-change hose, automatic feeder) */ qol?: boolean }
type Num3 = { lo: number; mode: number; hi: number };
export interface GearDef {
  label: string;
  sized?: 'filter' | 'heater';
  price?: { key?: string; fallback?: Num3 };
  /** consumables, USD per month at `ref` gallons; or a price row key */
  monthly?: Num3 | { key: string; /** the pack lasts this many months at `ref` gallons (absent = the row is per month) */ months?: number };
  /** minutes per week at `ref` gallons, per unit */
  minutes?: Num3;
  watts?: number; hours?: number;
  ref?: number;
  exp?: { price?: number; watts?: number; minutes?: number; monthly?: number };
  byKind?: Record<string, number>;
  /** filters: price multiplier for a model that shares its price row with a smaller one */
  modelPriceK?: Record<string, number>;
  gphPerGal?: number;
  refill?: { key: string; galMonthsPerRefill: number };
  perWaterChange?: { key: string; perGal: number };
  cutsDosing?: boolean;
  inWaterChange?: boolean;
  /** a dry tank's piece that has a body in the 3D scene though it draws no power (thermostat, gauge, mist bottle) */
  draw?: boolean;
}
export interface Preset { id: string; label: string; water: 'fresh' | 'salt'; rows: Record<string, string>; needs?: { substrate?: string; plants?: string } }

/** Rows that take chores off the user's hands (lane MW 2026-10-21): listed under "Quality of life" in the Tech menu and added by the least-work build. */
const QOL_ROWS = new Set(['wcmethod', 'feeder']);
export const TECH_ROWS = (data.rows as unknown as TechRow[]).map(r => (QOL_ROWS.has(r.id) ? { ...r, qol: true } : r));
export const GEAR = data.gear as unknown as Record<string, GearDef>;
export const PRESETS = data.presets as unknown as Preset[];
export const ROOM_C = data.roomC;
const HEAT = data.heat;
const rowDef = (id: string) => TECH_ROWS.find(r => r.id === id);
export const optionDef = (row: string, opt: string) => rowDef(row)?.options.find(o => o.id === opt);

const galOf = (S: TankSetup) => volume(S.tank).gallons;
/** A wet tank with a land animal in it: a paludarium (the land side needs its own dry gear). */
export const hasLand = (S: TankSetup) => S.water.on && S.fish.some(f => getSpecies(f.species)?.habitat === 'land');
const isSalt = (S: TankSetup) => S.water.on && !!S.water.salt;
/** The rows this tank shows: a dry tank its own (heat lamp, UVB, misting); fresh-only rows (CO2, ferts) not on salt, salt rows only on salt. */
export function rowsFor(S: TankSetup): TechRow[] {
  if (!S.water.on) return TECH_ROWS.filter(r => r.water === 'dry');
  const land = hasLand(S); // a paludarium (lane S241): the land animals' heat, UVB and misting rows join the water rows
  return TECH_ROWS.filter(r => (land && r.water === 'dry') || r.water !== 'dry' && (r.water === 'wet' || (r.water === 'salt') === isSalt(S)));
}

// ---- defaults, presets, choices

/** The gear the demand engine always assumed (before the Tech menu): HOB up to 60 gal, canister above; one heater; CO2 /
 *  ferts from grow.feed; a skimmer on salt (hang-on, in the sump when the filter is one). Rows the engine did not count are 'none' (or the cheapest real choice). */
export function inferTech(S: TankSetup): TechSetup {
  // a dry tank: the cheapest gear its animals call for (scene/drygear.ts: heat, thermostat, UVB, gauge, misting), one model for the Tech menu, the 3D and the totals
  if (!S.water.on) return { rows: dryInferred(S.fish.map(f => f.species)) };
  const gal = galOf(S), feed = S.grow.feed, salt = isSalt(S);
  const rows: Record<string, string> = {
    filter: gal <= 60 ? 'hob' : 'canister', heater: 'one', chiller: 'none', air: 'none', uv: 'none',
    conditioner: salt ? 'none' : 'yes', rodi: 'none', ato: 'none',
  };
  // a tank started from its animals (path 1): no filter or heater until the owner adds one (Nathan 2026-10-26)
  if (S.stockFirst) Object.assign(rows, { filter: 'none', heater: 'none' });
  if (hasLand(S)) Object.assign(rows, dryInferred(S.fish.filter(f => getSpecies(f.species)?.habitat === 'land').map(f => f.species)));
  // the skimmer follows the filter (lane SF): in the sump with one, else hang-on
  if (salt) Object.assign(rows, { skimmer: rows.filter === 'sump' ? 'sump' : 'hob', flow: feed === 'co2' ? 'wave' : feed === 'ferts' ? 'two' : 'none', dosing: feed === 'co2' ? 'doser' : feed === 'ferts' ? 'twopart' : 'none', salinity: 'refractometer', saltmix: 'mix' });
  else Object.assign(rows, { co2: feed === 'co2' ? 'pressurized' : 'none', ferts: feed === 'low' ? 'none' : 'aio' });
  return { rows };
}

/** Whose filter the budget counts (Nathan 2026-10-21): 'chosen' = the owner's own tech has a filter; 'filterless' = the owner ticked
 *  "no filter" and none is in; 'unset' = no filter of the owner's (inferred gear, or set to none by a kit or the Tech menu). */
export type FilterState = 'chosen' | 'filterless' | 'unset';
export function filterState(S: TankSetup): FilterState {
  const t = S.tech;
  if (t && (t.filters?.length || (t.rows.filter && t.rows.filter !== 'none'))) return 'chosen';
  return t?.filterless ? 'filterless' : 'unset';
}
/** Tick or untick "no filter" (one edit): ticking writes filter none, no filters, filterless, and leaves the other rows inferred. */
export function setFilterless(S: TankSetup, on: boolean) {
  if (on) { const t = S.tech ?? { rows: {} }; S.tech = { ...t, rows: { ...t.rows, filter: 'none' }, filters: [], filterless: true }; }
  else if (S.tech) delete S.tech.filterless;
}
/** The tank's tech: its own `tech` with any missing row filled from the inferred defaults. */
export function techOf(S: TankSetup): TechSetup {
  const inf = inferTech(S);
  if (!S.tech) return inf;
  const t: TechSetup = { ...S.tech, rows: { ...inf.rows, ...S.tech.rows } };
  // a missing skimmer follows the saved filters, not the inferred one (lane SF)
  if (inf.rows.skimmer && S.tech.rows.skimmer === undefined) t.rows.skimmer = hasSump(t) ? 'sump' : 'hob';
  return t;
}
export const choiceOf = (S: TankSetup, row: string) => techOf(S).rows[row] ?? 'none';

/** Plant growth feed from the CO2 + ferts rows: injected gas (DIY or pressurized) with a water-column fert = 'co2'; a
 *  water-column fert, or root tabs with liquid carbon = 'ferts'; root tabs or liquid carbon alone stay 'low'. A dry or salt tank keeps its own grow.feed. */
export function feedOf(t: TechSetup, fallback: GrowFeed = 'low'): GrowFeed {
  const c = t.rows.co2, f = t.rows.ferts;
  if (c === undefined && f === undefined) return fallback;
  const gas = optionDef('co2', c ?? 'none')?.co2 ?? 0, fert = optionDef('ferts', f ?? 'none')?.fert ?? 0;
  if (gas >= 1 && fert >= 1) return 'co2';
  return gas + fert >= 1 ? 'ferts' : 'low';
}
/** Reef care from the salt gear (lane TM step 5): the lowest tier of the skimmer, water movement and calcium / alkalinity rows
 *  (0 = soft corals, 1 = LPS, 2 = SPS), as the grow feed plantfit reads for corals (low = light dosing, ferts = regular,
 *  co2 = daily). So corals gate on the tech without plantfit changing. */
const TIER_FEED: GrowFeed[] = ['low', 'ferts', 'co2'];
export function reefFeedOf(t: TechSetup, fallback: GrowFeed = 'low'): GrowFeed {
  if (t.rows.dosing === undefined && t.rows.flow === undefined && t.rows.skimmer === undefined) return fallback;
  const tier = (r: string) => optionDef(r, t.rows[r] ?? 'none')?.tier ?? 0;
  return TIER_FEED[Math.max(0, Math.min(2, tier('dosing'), tier('flow'), tier('skimmer')))];
}
/** The tank's growth feed: derived from its tech when it has one (CO2 + ferts fresh, salt gear on a reef), else the saved grow.feed. */
export const feedFor = (S: TankSetup): GrowFeed => !S.tech || !S.water.on ? S.grow.feed : isSalt(S) ? reefFeedOf(techOf(S), S.grow.feed) : feedOf(techOf(S), S.grow.feed);

/** The Plant care slider as a shortcut: set the CO2 + ferts rows (salt: dosing, flow, skimmer) so the derived feed is `feed`,
 *  keeping what already fits. */
export function setFeed(t: TechSetup, feed: GrowFeed, salt = false): TechSetup {
  const rows = { ...t.rows };
  if (salt) {
    const want = TIER_FEED.indexOf(feed), tier = (r: string) => optionDef(r, rows[r] ?? 'none')?.tier ?? 0;
    // raise each row to the cheapest option that reaches the tier; the dosing row also drops back (the cheapest lever)
    const reach = (r: string, ids: string[]) => { if (tier(r) < want) rows[r] = ids.find(id => (optionDef(r, id)?.tier ?? 0) >= want) ?? rows[r]; };
    reach('dosing', ['none', 'twopart', 'doser']); reach('flow', ['none', 'one', 'wave']); reach('skimmer', ['none', 'hob']);
    if (tier('dosing') > want) rows.dosing = ['none', 'twopart', 'doser'][want];
    return { ...t, rows, preset: 'custom' };
  }
  const gas = optionDef('co2', rows.co2 ?? 'none')?.co2 ?? 0, fert = optionDef('ferts', rows.ferts ?? 'none')?.fert ?? 0;
  if (feed === 'low') { rows.co2 = 'none'; if (rows.ferts !== 'roottabs') rows.ferts = 'none'; } // root tabs alone stay low
  else if (feed === 'ferts') { if (gas >= 1) rows.co2 = 'none'; if (fert + (optionDef('co2', rows.co2 ?? 'none')?.co2 ?? 0) < 1) rows.ferts = 'aio'; }
  else { if (gas < 1) rows.co2 = 'pressurized'; if (fert < 1) rows.ferts = 'aio'; }
  return { ...t, rows, preset: 'custom' };
}

/** This tank's water temperature inputs for the temperature checks (temprange.ts): the target, a measurement, the heater and chiller,
 *  the room (entered or assumed). Undefined for a dry tank. `heater` overrides the tech's heater row (the plan sheet passes the shopping
 *  list's); a tank with no tech chosen counts as heated (the inferred tech has one). */
export function tempEvidence(S: TankSetup, heater?: boolean): TempEvidence | undefined {
  if (!S.water.on) return undefined;
  const t = techOf(S), heated = heater ?? (!S.tech || (t.rows.heater ?? 'one') !== 'none');
  const ev: TempEvidence = { heater: heated, chiller: t.rows.chiller === 'chiller', room: t.roomC ?? ROOM_C, roomSet: S.tech?.roomC !== undefined };
  if (S.tech?.targetC !== undefined) { ev.target = S.tech.targetC; if (heated) { const h = heatLoss(S, t); ev.heatHolds = h.totalW >= h.lossW; } }
  if (S.tech?.measuredC !== undefined) ev.measured = S.tech.measuredC;
  return ev;
}

/** One row changed by hand: the tech is now custom. Choosing an option that needs another row's option sets that too. */
export function withChoice(S: TankSetup, row: string, opt: string): TechSetup {
  const t = techOf(S), rows = { ...t.rows, [row]: opt };
  for (const [r, o] of Object.entries(optionDef(row, opt)?.needs ?? {})) rows[r] = o;
  // an in-sump skimmer without a sump falls back to a hang-on one
  if (row === 'filter' && opt !== 'sump' && rows.skimmer === 'sump') rows.skimmer = 'hob';
  const next: TechSetup = { ...t, rows, preset: 'custom' };
  if (row === 'filter') { delete next.filterModel; delete next.filterProduct; delete next.filters; if (opt !== 'none') delete next.filterless; } // as withUnits (S207 review)
  if (row === 'heater') { delete next.heaterW; delete next.heaterProduct; delete next.heaters; }
  return next;
}

// ---- the heaters and filters as lists of units (Nathan 2026-10-20)

/** The heaters: the saved list, else the older fields read as one (or two identical) units. */
export function heaterUnits(t: TechSetup): HeaterUnit[] {
  if (t.heaters) return t.heaters;
  const r = t.rows.heater ?? 'none';
  if (r === 'none') return [];
  const u: HeaterUnit = { ...(t.heaterProduct ? { product: t.heaterProduct } : {}), ...(t.heaterW ? { w: t.heaterW } : {}) };
  return r === 'two' ? [u, { ...u }] : [u];
}
/** The filters: the saved list, else the older fields read as one unit. */
export function filterUnits(t: TechSetup): FilterUnit[] {
  if (t.filters) return t.filters;
  const r = t.rows.filter ?? 'none';
  if (r === 'none') return [];
  return [{ kind: r, ...(t.filterProduct ? { product: t.filterProduct } : {}), ...(t.filterModel ? { model: t.filterModel } : {}) }];
}
const heaterRow = (n: number) => n === 0 ? 'none' : n === 1 ? 'one' : 'two';
/** The filter option a list stands for: its unit of the highest capacity (it sets the stocking and the risk), 'none' when empty. */
const filterRow = (us: FilterUnit[]) => us.reduce<string>((best, u) => (optionDef('filter', u.kind)?.capacity ?? 0) > (optionDef('filter', best)?.capacity ?? 0) ? u.kind : best, 'none');
/** The tech with `row`'s units replaced by `units` (custom; the row's option follows; the older fields dropped). */
export function withUnits(t: TechSetup, row: 'heater', units: HeaterUnit[]): TechSetup;
export function withUnits(t: TechSetup, row: 'filter', units: FilterUnit[]): TechSetup;
export function withUnits(t: TechSetup, row: 'heater' | 'filter', units: HeaterUnit[] | FilterUnit[]): TechSetup {
  const next: TechSetup = { ...t, rows: { ...t.rows }, preset: 'custom' };
  if (row === 'heater') { delete next.heaterW; delete next.heaterProduct; next.heaters = units as HeaterUnit[]; next.rows.heater = heaterRow(units.length); }
  else {
    delete next.filterModel; delete next.filterProduct; next.filters = (units as FilterUnit[]).filter((u, i, us) => u.kind !== 'sump' || us.findIndex(x => x.kind === 'sump') === i); // one sump: it has one size (lane SU)
    next.rows.filter = filterRow(next.filters);
    if (units.length) delete next.filterless; // a filter added: removing it later asks again ("This tank needs a filter"), not filterless
    for (const [r, o] of Object.entries(optionDef('filter', next.rows.filter)?.needs ?? {})) next.rows[r] = o;
    if (!next.filters.some(u => u.kind === 'sump') && next.rows.skimmer === 'sump') next.rows.skimmer = 'hob';
  }
  return next;
}
/** Remove unit `i` of `row`: the units after it move down one place key ('heater.2' -> 'heater.1'). */
export function withoutUnit(t: TechSetup, row: 'heater' | 'filter', i: number): TechSetup {
  const key = (k: number) => k ? `${row}.${k}` : row;
  const n = (row === 'heater' ? heaterUnits(t) : filterUnits(t)).length;
  const next = row === 'heater' ? withUnits(t, row, heaterUnits(t).filter((_, k) => k !== i)) : withUnits(t, row, filterUnits(t).filter((_, k) => k !== i));
  if (t.place) {
    const place = { ...t.place };
    for (let k = i; k < n; k++) { const v = t.place[key(k + 1)]; if (v) place[key(k)] = v; else delete place[key(k)]; }
    next.place = place;
  }
  return next;
}
/** The tech as priced for option `opt` of `row`: a list that no longer stands for that option (a preview or a preset
 *  picks another) is dropped, so the option's own default unit is priced. */
function unitsFor(t: TechSetup, row: 'heater' | 'filter', opt: string): TechSetup {
  if (row === 'heater' && t.heaters && heaterRow(t.heaters.length) !== opt) { const x = { ...t }; delete x.heaters; delete x.heaterW; delete x.heaterProduct; return x; }
  if (row === 'filter' && t.filters && filterRow(t.filters) !== opt) { const x = { ...t }; delete x.filters; delete x.filterModel; delete x.filterProduct; return x; }
  return t;
}
/** A tech holding just this one filter unit (the older single-filter fields), to price or size it alone. */
export const singleFilter = (t: TechSetup, u: FilterUnit): TechSetup => {
  const x: TechSetup = { ...t, rows: { ...t.rows, filter: u.kind } };
  delete x.filters; delete x.filterModel; delete x.filterProduct;
  if (u.model) x.filterModel = u.model;
  if (u.product) x.filterProduct = u.product;
  return x;
};
/** The units of `row` not in the bundle, when any unit is the bundle's (else none: the whole row is the bundle's or none of it). */
export function extraUnits(t: TechSetup, row: 'heater' | 'filter'): number[] {
  const us: { kit?: boolean }[] = row === 'heater' ? heaterUnits(t) : filterUnits(t);
  return us.some(u => u.kit) ? us.flatMap((u, i) => u.kit ? [] : [i]) : [];
}
/** The bundle's own unit of `row` as a fingerprint (dealdrift.ts): what it is, or 'none' once removed. An older tech
 *  without lists: its row option and sizing, as before. */
export function kitUnitSig(t: TechSetup, row: 'heater' | 'filter'): unknown[] {
  if (row === 'heater' && !t.heaters) return [t.rows.heater ?? 'none', t.heaterW ?? null];
  if (row === 'filter' && !t.filters) return [t.rows.filter ?? 'none', t.filterModel ?? null];
  const us: (HeaterUnit | FilterUnit)[] = row === 'heater' ? t.heaters! : t.filters!;
  const u = us.find(x => x.kit) ?? (us.length && !us.some(x => x.kit) ? us[0] : undefined);
  return u ? [JSON.stringify({ ...u, kit: undefined })] : ['none'];
}

/** A preset's rows for this tank (the tank's room, target and measured temperatures and gear places kept). */
export function applyPreset(S: TankSetup, id: string): TechSetup {
  const p = PRESETS.find(x => x.id === id);
  const t = techOf(S);
  if (!p) return t;
  return { rows: { ...inferTech(S).rows, ...p.rows }, preset: id, ...(t.roomC !== undefined ? { roomC: t.roomC } : {}), ...(t.targetC !== undefined ? { targetC: t.targetC } : {}), ...(t.measuredC !== undefined ? { measuredC: t.measuredC } : {}), ...(t.place ? { place: t.place } : {}), ...(t.sump ? { sump: t.sump } : {}) };
}
export const presetsFor = (S: TankSetup) => !S.water.on ? [] : PRESETS.filter(p => p.water === (isSalt(S) ? 'salt' : 'fresh'));

/** What a Walstad tank needs that this one lacks: a soil substrate and heavy planting. */
export function walstadGaps(S: TankSetup): string[] {
  const out: string[] = [];
  const soil = S.substrate.show && (S.substrate.type === 'soil' || S.substrate.type === 'layered' || (S.substrate.type === 'custom' && JSON.stringify(S.substrate.custom).includes('soil')));
  if (!soil) out.push('Walstad needs a soil substrate under a gravel or sand cap.');
  const plants = S.items.filter(i => i.kind === 'plant').length, m2 = footprint(S.tank).area / 1e6;
  if (plants / Math.max(m2, 0.01) < 40) out.push(`Walstad needs heavy planting: ${plants} plant${plants === 1 ? '' : 's'} here, about ${Math.ceil(40 * m2)} for this footprint.`);
  return out;
}

// ---- sizing for this tank

const clampK = (k: number) => Math.min(6, Math.max(0.25, k));
const sizeK = (g: GearDef, gal: number, f: keyof NonNullable<GearDef['exp']>) => clampK(Math.pow(gal / (g.ref ?? 20), g.exp?.[f] ?? 0));
const s3 = (r: Num3, k: number): Range3 => ({ lo: r.lo * k, mode: r.mode * k, hi: r.hi * k });
const a3 = (a: Range3, b: Range3): Range3 => ({ lo: a.lo + b.lo, mode: a.mode + b.mode, hi: a.hi + b.hi });
const Z: Range3 = { lo: 0, mode: 0, hi: 0 };
const EST_WIDEN = 1.25;
const estWiden = (r: Num3): Range3 => ({ lo: Math.max(0, r.mode - (r.mode - r.lo) * EST_WIDEN), mode: r.mode, hi: r.mode + (r.hi - r.mode) * EST_WIDEN });
/** A gear part's unit price: its demand-items.json row when present, else the first-guess fallback (widened, est). */
function unitPrice(p: GearDef['price']): { r: Range3; est: boolean } | undefined {
  if (!p) return undefined;
  const row = p.key ? rowPrice(p.key) : undefined;
  if (row) return { r: row, est: false };
  return p.fallback ? { r: estWiden(p.fallback), est: true } : undefined;
}

export interface FilterPick { model: FilterModel; n: number; gph: number; turnover: number; /** the real product picked, if any */ product?: FilterProduct }
/** The filter for this tank and kind: the model whose tank range holds the volume, else the largest of the kind, as many
 *  units as it takes to cover the volume (sponges on a big tank); `filterModel` steps it up or down. */
export function filterFor(S: TankSetup, kind: FilterKind, override?: string, productId?: string): FilterPick {
  const gal = galOf(S), pool = FILTER_MODELS.filter(m => m.kind === kind).sort((a, b) => a.gph - b.gph);
  // a real product of this kind (lane TG step 3): its own flow and rated range; the generic model nearest its flow stands in for the rest
  const fp = filterProduct(productId);
  if (fp && fp.kind === kind) {
    const near = (m: FilterModel) => Math.abs(Math.log(m.gph / (fp.gph ?? m.gph)));
    const model = [...pool].sort((a, b) => near(a) - near(b))[0];
    const n = Math.min(4, Math.max(1, Math.ceil(gal / (fp.galMax ?? model.galMax)))), gph = (fp.gph ?? model.gph) * n;
    return { model, n, gph, turnover: gph / Math.max(gal, 0.1), product: fp };
  }
  const model = pool.find(m => m.id === override) ?? pool.find(m => gal >= m.galMin && gal <= m.galMax) ?? (gal < pool[0].galMin ? pool[0] : pool[pool.length - 1]);
  const n = Math.min(4, Math.max(1, Math.ceil(gal / model.galMax)));
  const gph = model.gph * n;
  return { model, n, gph, turnover: gph / Math.max(gal, 0.1) };
}
/** The filter models one step smaller / larger than the current one (same kind), for the step up / down buttons. */
export function filterSteps(kind: FilterKind, current: string) {
  const pool = FILTER_MODELS.filter(m => m.kind === kind).sort((a, b) => a.gph - b.gph), i = pool.findIndex(m => m.id === current);
  return { down: i > 0 ? pool[i - 1] : undefined, up: i >= 0 && i < pool.length - 1 ? pool[i + 1] : undefined };
}

export interface HeatLoss {
  /** m2 of glass below the waterline (walls), of floor, and of open water; the sump's included (lane SF) */
  wallM2: number; floorM2: number; surfaceM2: number;
  /** W per K through all of it */
  wPerK: number;
  targetC: number; roomC: number;
  /** average W the heater has to replace (0 when the room is warm enough) */
  lossW: number;
  /** heater power needed for a cold night, W */
  needW: number;
  /** the heater class (the first unit's), how many, and their duty cycle */
  heater: HeaterModel; n: number; duty: number;
  /** each heater: its watts, the class it is priced as, the catalogue product */
  units: { watts: number; model: HeaterModel; product?: HeaterProduct; kit?: boolean }[];
  /** all the heaters together, W */
  totalW: number;
  /** kWh per month the heaters use (what the tank loses) */
  kwhMo: number;
  /** the room is warmer than the tank should be: the W a chiller must pull out, and its kWh per month */
  coolW: number; chillerKwhMo: number;
}
/** Heat loss through the glass and the water surface (Nathan 2026-10-19: area, tank temperature, room temperature; not
 *  gallons). Target = the user's target water temperature (Tech menu), else the one the stocked species agree on (climate.ts); the lid
 *  sets the surface loss. */
export function heatLoss(S: TankSetup, t: TechSetup = techOf(S)): HeatLoss {
  const fp = footprint(S.tank), hw = S.tank.H * Math.min(1, Math.max(0, S.water.level)) / 1000;
  // the sump (lane SF): its glass up to its water line (SUMP_FILL), its floor, and its water surface, open to the cabinet (the display's lid does not cover it)
  const z = S.water.on && hasSump(t) ? t.sump ?? sumpDefault(S) : undefined;
  const zWall = z ? 2 * (z.L + z.D) / 1000 * z.H * SUMP_FILL / 1000 : 0, zFloor = z ? z.L * z.D / 1e6 : 0;
  const wallM2 = fp.perimeter / 1000 * hw + zWall, floorM2 = fp.area / 1e6 + zFloor, surfaceM2 = floorM2;
  const surf = (HEAT.surface as Record<string, number>)[S.lid] ?? HEAT.surface.open;
  const wPerK = HEAT.wall * wallM2 + HEAT.bottom * floorM2 + surf * (surfaceM2 - zFloor) + HEAT.surface.open * zFloor;
  const targetC = t.targetC ?? climateOf(S).find(c => c.label === 'Water')?.at ?? (isSalt(S) ? 25.5 : 24), roomC = t.roomC ?? ROOM_C;
  const dT = targetC - roomC, lossW = Math.max(0, wPerK * dT), needW = Math.max(0, wPerK * (dT + HEAT.nightDropK) * HEAT.headroom);
  const us = heaterUnits(t), n = us.length;
  const units = us.map(u => {
    // a generic one not sized by hand: the smallest common size holding its share of the need (what is drawn and named)
    const product = heaterProduct(u.product), watts = product?.watts ?? u.w ?? genericHeaterW(needW / Math.max(n, 1)), model = matchHeater(watts);
    return { watts, model, ...(product ? { product } : {}), ...(u.kit ? { kit: true } : {}) };
  });
  const heater = units[0]?.model ?? matchHeater(Math.max(needW, 1)), totalW = units.reduce((a, u) => a + u.watts, 0);
  const duty = totalW ? Math.min(1, lossW / totalW) : 0;
  const coolW = Math.max(0, -wPerK * dT);
  return {
    wallM2, floorM2, surfaceM2, wPerK, targetC, roomC, lossW, needW, heater, n, duty, units, totalW,
    kwhMo: n ? Math.min(lossW, totalW) * 24 * 30 / 1000 : 0,
    coolW, chillerKwhMo: coolW * 24 * 30 / 1000 / HEAT.chillerCop,
  };
}
/** Offer two heaters: when one would be bigger than the twoAboveW class. */
export const offerTwoHeaters = (S: TankSetup) => heatLoss(S).needW > HEAT.twoAboveW;
/** Offer a chiller: the room runs warmer than the target by over a degree. */
export const offerChiller = (S: TankSetup) => { const h = heatLoss(S); return h.roomC > h.targetC + 1; };

// ---- the sump (lane SU, Nathan 2026-10-22: "an additional section in the 'tech'. Reuse the same presets or custom size tanks for it.")

/** The share of the sump's own volume that holds water while the return pump runs: the rest is room for what drains down from the display when the power goes. */
export const SUMP_FILL = 0.5;
/** A sump picked for the display when none is chosen: at least this share of the display's volume, and no longer than the display (it stands in the stand). */
export const SUMP_SHARE = 0.25;
/** Water over the overflow that drains down when the return pump stops, mm over the display's surface (about 1 in). */
export const SUMP_DRAIN_MM = 25.4;
/** Litres the return line siphons back into the sump when the pump stops (about 0.1 gal). */
export const SUMP_LINE_L = 0.5;
/** The plain glass sizes a sump is picked from (tankfit's own list: rectangles with a generic name). No fixed minimum (Nathan 2026-10-26,
 *  lane SF: "drop"): the limit is the drain-down (sumpTooSmall). */
export const SUMP_MODELS: TankModel[] = TANK_MODELS.filter(m => !m.terrarium && (m.shape ?? 'rect') === 'rect' && /^[\d.]+ (gal|ft)/.test(m.name));
const boxLitres = (z: { L: number; D: number; H: number }) => z.L * z.D * z.H / 1e6;
/** A catalogue size as a sump size. */
export const sumpFromModel = (m: TankModel): SumpSize => { const T = tankFromModel(m); return { model: m.id, L: T.L, D: T.D, H: T.H }; };
/** The sump this display gets when none is chosen: the smallest plain size of at least SUMP_SHARE of its volume that holds the drain-down and fits inside
 *  the stand (no stand: no longer than the display), else the largest that fits. */
export function sumpDefault(S: TankSetup): SumpSize {
  const want = SUMP_SHARE * volume(S.tank).litres, all = SUMP_MODELS.map(sumpFromModel).sort((a, b) => boxLitres(a) - boxLitres(b));
  // it stands inside the stand (lane SF); with no stand, beside the tank, no longer than it
  const fit = all.filter(z => S.stand.show ? fitsInStand(S, z) : z.L <= S.tank.L), down = sumpDrainDown(S);
  return fit.find(z => boxLitres(z) >= want && boxLitres(z) * (1 - SUMP_FILL) >= down) ?? fit.at(-1) ?? all[0];
}
/** Litres that drain into the sump when the return pump stops: SUMP_DRAIN_MM over the display's surface, plus the return line. */
export const sumpDrainDown = (S: TankSetup): number => footprint(S.tank).area * SUMP_DRAIN_MM / 1e6 + SUMP_LINE_L;
/** The tank's sump cannot hold the drain-down in its empty part (the share above SUMP_FILL): it would overflow when the power goes. */
export function sumpTooSmall(S: TankSetup): boolean {
  const z = sumpOf(S);
  return !!z && boxLitres(z) * (1 - SUMP_FILL) < sumpDrainDown(S);
}
const hasSump = (t: TechSetup) => filterUnits(t).some(u => u.kind === 'sump');
/** The tank's sump: its own size, else the default; undefined with no sump in the filtration (or `asIf` forces one, to judge the option). */
export function sumpOf(S: TankSetup, asIf = false): SumpSize | undefined {
  if (!S.water.on) return undefined;
  const t = techOf(S);
  return hasSump(t) || asIf ? t.sump ?? sumpDefault(S) : undefined;
}
/** Litres of water the sump adds to the system (its volume x SUMP_FILL); 0 without one. */
export const sumpLitres = (S: TankSetup, asIf = false): number => { const z = sumpOf(S, asIf); return z ? boxLitres(z) * SUMP_FILL : 0; };
/** "20 gal long tank, 57 L of water" style name: the catalogue size, else the custom size in cm. */
export const sumpName = (z: SumpSize) => `${getTankModel(z.model ?? '')?.name ?? `${Math.round(z.L / 10)} x ${Math.round(z.D / 10)} x ${Math.round(z.H / 10)} cm`} tank, ${Math.round(boxLitres(z) * SUMP_FILL)} L of water`;
/** True where tankfit and the builds may pick a sump: any wet tank (Nathan 2026-10-23: "offer it on any tank. Why not?"). */
export const sumpOffered = (S: TankSetup): boolean => S.water.on;
/** The sump tank's price: a bare glass tank of its gallons (the tank:N rows; a catalogue size by its rated gallons). Not its catalogue
 *  listings: those are display tanks (rimless, reef-ready, kits), dearer than the plain glass box a sump is. */
function sumpTankPrice(z: SumpSize): Range3 | undefined {
  return tankRowPrice(getTankModel(z.model ?? '')?.ratedGal ?? boxLitres(z) / 3.785);
}

// ---- what one option costs this tank

export interface PartCost {
  gear: string; label: string; n: number;
  setup?: Range3; est?: boolean;
  /** consumables, USD per month */
  monthly: Range3;
  watts: number; kwhMo: number;
  minutes: Range3;
}
export interface OptionCost {
  row: string; option: string;
  parts: PartCost[];
  setup: Range3; monthly: Range3; kwhMo: number; minutes: Range3;
  /** at the given $/kWh: consumables + power, USD per month */
  monthlyUsd: Range3;
  /** any part priced from a first guess, not a researched row */
  est: boolean;
  /** filtration: flow per hour as a multiple of the tank volume */
  turnover?: number;
}
/** A real product's own listed price (one retailer, one day): a narrow band for sales and other stores. */
const pricePoint = (usd: number): Range3 => ({ lo: usd * 0.9, mode: usd, hi: usd * 1.1 });
const DOSING = new Set(['aio', 'ei', 'twopart', 'liquidcarbon']);
const KWH_USD = 0.17;
/** Weekly water change in gallons (the nitrogen budget's fraction, scene/stocking.ts). */
/** Registered by scene/stocking.ts (it imports this file, so this file cannot import it): the share of the tank changed a week. */
let wcFraction: (S: TankSetup) => number = () => 0.1;
export const setWaterChangeFraction = (f: (S: TankSetup) => number) => { wcFraction = f; };
const wcGalWk = (S: TankSetup) => (galOf(S) + sumpLitres(S) / 3.785) * wcFraction(S); // lane SU: all the water, the sump's too

/** Setup, consumables, power and minutes of one row's option on this tank (every figure sized to it). */
export function optionCost(S: TankSetup, row: string, opt: string, o: { kwhUsd?: number; tech?: TechSetup } = {}): OptionCost {
  const t0 = o.tech ?? techOf(S), t = { ...(row === 'heater' || row === 'filter' ? unitsFor(t0, row, opt) : t0) }, def = optionDef(row, opt), gal = galOf(S), kwhUsd = o.kwhUsd ?? KWH_USD;
  t.rows = { ...t.rows, [row]: opt };
  // a list of filters: each priced alone (as the older single-filter fields), then added up (their flows add)
  if (row === 'filter' && t.filters?.length) return mergeCosts(row, opt, t.filters.map(u => optionCost(S, row, u.kind, { ...o, tech: singleFilter(t, u) })));
  const parts: PartCost[] = [];
  let turnover: number | undefined;
  const doser = (def?.parts ?? []).includes('doser');
  for (const id of def?.parts ?? []) {
    const g = GEAR[id];
    if (!g) continue;
    let n = def?.count ?? 1, setup: Range3 | undefined, est = false, watts = (g.watts ?? 0) * sizeK(g, gal, 'watts'), hours = g.hours ?? 24;
    let minutes: Range3 = g.minutes ? s3(g.minutes, sizeK(g, gal, 'minutes')) : Z, monthly: Range3 = Z, kwhMo: number | undefined;
    if (g.sized === 'filter' && def?.kind) {
      const f = filterFor(S, def.kind, row === 'filter' ? t.filterModel : undefined, row === 'filter' ? t.filterProduct : undefined);
      n = f.n; watts = f.product?.watts ?? f.model.watts; turnover = f.turnover;
      const lp = listedPrice(f.product), p = lp ? pricePoint(lp) : rowPrice(f.model.priceKey);
      setup = p && s3(p, g.modelPriceK?.[f.model.id] ?? 1); est = !p;
      minutes = s3(minutes, g.byKind?.[def.kind] ?? 1);
      // sponges run off one air pump, however many there are (its price is spread over the units, as setup is multiplied by n below)
      if (def.kind === 'sponge') { watts += (GEAR.airpump.watts ?? 2.5) / f.n; const ap = unitPrice(GEAR.airpump.price); if (setup && ap) setup = a3(setup, s3(ap.r, 1 / f.n)); }
    } else if (g.sized === 'heater') {
      // each heater its own price (a product's listing, else its class's row), spread over the units as setup is multiplied by n below
      const h = heatLoss(S, t), each = h.units.map(heaterPrice);
      n = h.n; watts = h.totalW / Math.max(n, 1); kwhMo = h.kwhMo / Math.max(n, 1);
      if (n && each.every(Boolean)) setup = s3(each.reduce<Range3>((a, r) => a3(a, r!), Z), 1 / n);
    } else if (id === 'sump') {
      const p = sumpTankPrice(t.sump ?? sumpDefault(S)); // the sump is a tank of its own size (lane SU), not scaled from the display
      if (p) setup = p;
    } else if (id === 'chiller') {
      const h = heatLoss(S, t);
      kwhMo = h.chillerKwhMo; watts = h.coolW / HEAT.chillerCop;
    }
    if (!setup) { const u = unitPrice(g.price); if (u) { setup = s3(u.r, sizeK(g, gal, 'price')); est = u.est; } }
    if (g.monthly) {
      const m = 'key' in g.monthly ? (r => r && s3(r, 1 / (g.monthly as { months?: number }).months! || 1))(rowPrice(g.monthly.key)) : g.monthly;
      if (m) monthly = s3(m, sizeK(g, gal, 'monthly'));
    }
    if (g.refill) { const r = rowPrice(g.refill.key); if (r) monthly = a3(monthly, s3(r, gal / g.refill.galMonthsPerRefill)); }
    if (g.perWaterChange) { const r = rowPrice(g.perWaterChange.key); if (r) monthly = a3(monthly, s3(r, wcGalWk(S) * 4.33 * g.perWaterChange.perGal)); }
    if (g.gphPerGal && id === 'returnpump') turnover = g.gphPerGal;
    if (doser && DOSING.has(id)) minutes = s3(minutes, 0.2);
    const kwh = kwhMo ?? watts * hours * 30 / 1000;
    parts.push({ gear: id, label: g.label, n, setup: setup && s3(setup, n), est, monthly: s3(monthly, 1), watts: watts * n, kwhMo: kwh * n, minutes: s3(minutes, n) });
  }
  const sum = (f: (p: PartCost) => Range3) => parts.reduce((s, p) => a3(s, f(p)), Z);
  const setup = sum(p => p.setup ?? Z), monthly = sum(p => p.monthly), minutes = sum(p => p.minutes), kwhMo = parts.reduce((s, p) => s + p.kwhMo, 0);
  const power = kwhMo * kwhUsd;
  return { row, option: opt, parts, setup, monthly, kwhMo, minutes, monthlyUsd: { lo: monthly.lo + power, mode: monthly.mode + power, hi: monthly.hi + power }, est: parts.some(p => p.est), turnover };
}

const heaterPrice = (u: HeatLoss['units'][number]): Range3 | undefined => { const lp = listedPrice(u.product); return lp ? pricePoint(lp) : rowPrice(u.model.priceKey); };
/** Several units' costs as one row's (setup, consumables, power, minutes and flow added). */
function mergeCosts(row: string, option: string, cs: OptionCost[]): OptionCost {
  const sum = (f: (c: OptionCost) => Range3) => cs.reduce((a, c) => a3(a, f(c)), Z), turns = cs.filter(c => c.turnover !== undefined);
  return {
    row, option, parts: cs.flatMap(c => c.parts), setup: sum(c => c.setup), monthly: sum(c => c.monthly), kwhMo: cs.reduce((a, c) => a + c.kwhMo, 0),
    minutes: sum(c => c.minutes), monthlyUsd: sum(c => c.monthlyUsd), est: cs.some(c => c.est),
    ...(turns.length ? { turnover: turns.reduce((a, c) => a + c.turnover!, 0) } : {}),
  };
}
/** Each unit of the heater or filter row on its own (setup, power, minutes; a heater's power its share of the heating). */
export function unitCosts(S: TankSetup, row: 'heater' | 'filter', o: { kwhUsd?: number; tech?: TechSetup } = {}): OptionCost[] {
  const t = o.tech ?? techOf(S);
  if (row === 'filter') return filterUnits(t).map(u => optionCost(S, 'filter', u.kind, { ...o, tech: singleFilter(t, u) }));
  const all = optionCost(S, 'heater', t.rows.heater ?? 'none', { ...o, tech: t }), h = heatLoss(S, t);
  return h.units.map(u => {
    const k = h.totalW ? u.watts / h.totalW : 0, p = heaterPrice(u), kwhMo = all.kwhMo * k, power = kwhMo * (o.kwhUsd ?? KWH_USD);
    return { row, option: all.option, parts: [], setup: p ?? Z, monthly: s3(all.monthly, k), kwhMo, minutes: s3(all.minutes, k), monthlyUsd: { lo: all.monthly.lo * k + power, mode: all.monthly.mode * k + power, hi: all.monthly.hi * k + power }, est: !p };
  });
}

/** Every chosen row's cost on this tank. */
export function techCosts(S: TankSetup, o: { kwhUsd?: number } = {}): OptionCost[] {
  const t = techOf(S);
  return rowsFor(S).map(r => optionCost(S, r.id, t.rows[r.id] ?? 'none', { ...o, tech: t }));
}

// ---- what it buys

/** Fraction of AqAdvisor's stocking capacity the chosen filtration supports: the option's capacity, cut in proportion
 *  when the turnover falls under 4x the volume an hour. A stocking % divides by it. */
export function stockCapacity(S: TankSetup, t: TechSetup = techOf(S)): number {
  const opt = t.rows.filter ?? 'none', def = optionDef('filter', opt); // with several filters: the best one's (rows.filter follows it)
  const cap = def?.capacity ?? 1;
  const turn = optionCost(S, 'filter', opt, { tech: t }).turnover;
  return turn === undefined ? cap : cap * Math.min(1, turn / 4);
}

/** Water-temperature verdict for a species at a temperature: inside its comfortable band, tolerable, or out. */
export function tempFit(speciesId: string, c: number): 'ok' | 'tolerable' | 'out' | 'unknown' {
  const k = CARE[speciesId];
  if (!k?.temp) return 'unknown';
  if (c >= k.temp[0] && c <= k.temp[1]) return 'ok';
  const tol = k.tol ?? [k.temp[0] - 2, k.temp[1] + 2];
  return c >= tol[0] && c <= tol[1] ? 'tolerable' : 'out';
}
/** No heater: the stocked species whose comfortable range does not hold the room temperature (tropical ones). */
export function coldSpecies(S: TankSetup, t: TechSetup = techOf(S)): { id: string; name: string; fit: 'tolerable' | 'out' }[] {
  if (!S.water.on || (t.rows.heater ?? 'one') !== 'none') return [];
  const room = t.roomC ?? ROOM_C, out: { id: string; name: string; fit: 'tolerable' | 'out' }[] = [];
  for (const id of new Set(S.fish.map(f => f.species))) {
    const v = tempFit(id, room);
    if (v === 'tolerable' || v === 'out') out.push({ id, name: getSpecies(id)?.name ?? id, fit: v });
  }
  return out;
}

/** Risk points of the chosen tech (before the skill scaling): each option's own, plus a stuck-on heater when the heater is
 *  far bigger than the tank needs. */
export function techRisk(S: TankSetup, t: TechSetup = techOf(S)): number {
  let r = 0;
  for (const row of rowsFor(S)) r += optionDef(row.id, t.rows[row.id] ?? 'none')?.risk ?? 0;
  return r;
}

// ---- the gear lane TG draws

export interface TechPiece {
  /** tech.json row and option, and the gear part */
  row: string; option: string; gear: string;
  /** gear-models.json id (filters and heaters), units, flow, watts each */
  model?: string; n: number; gph?: number; watts?: number;
  /** filters: the catalogue product picked (data/gear-catalog.json), drawn at its own size and colours */
  product?: string;
  place?: GearPlace;
}
/** The pieces of gear in this tank, for lane TG: one entry per part (units in n). Filters / heaters name their model. */
export function techParts(S: TankSetup): TechPiece[] {
  const t = techOf(S), out: TechPiece[] = [];
  for (const row of rowsFor(S)) {
    const opt = t.rows[row.id] ?? 'none', def = optionDef(row.id, opt);
    // heaters and filters: one piece per unit, each with its own place key ('heater', 'heater.1', ...)
    if (row.id === 'heater') {
      heatLoss(S, t).units.forEach((u, i) => { const key = i ? `heater.${i}` : 'heater'; out.push({ row: key, option: opt, gear: 'heater', model: u.model.id, n: 1, watts: u.watts, ...(u.product ? { product: u.product.id } : {}), ...(t.place?.[key] ? { place: t.place[key] } : {}) }); });
      continue;
    }
    if (row.id === 'filter' && t.filters) {
      t.filters.forEach((u, i) => {
        const key = i ? `filter.${i}` : 'filter', one: TechSetup = { ...singleFilter(t, u), place: t.place?.[key] ? { filter: t.place[key] } : {} };
        for (const p of techParts({ ...S, tech: one })) if (p.row === 'filter') out.push({ ...p, row: key });
      });
      continue;
    }
    for (const gear of def?.parts ?? []) {
      const g = GEAR[gear];
      if (!g || g.inWaterChange || g.perWaterChange || (!g.watts && !g.sized && !g.draw && !['dropchecker', 'diyco2', 'sump', 'refractometer', 'hydrometer', 'chiller', 'rodi'].includes(gear))) continue;
      const piece: TechPiece = { row: row.id, option: opt, gear, n: def?.count ?? 1, ...(t.place?.[row.id] ? { place: t.place[row.id] } : {}) };
      if (g.sized === 'filter' && def?.kind) { const f = filterFor(S, def.kind, t.filterModel, t.filterProduct); Object.assign(piece, { model: f.model.id, n: f.n, gph: f.product?.gph ?? f.model.gph, watts: f.product?.watts ?? f.model.watts, ...(f.product ? { product: f.product.id } : {}) }); }
      else if (g.sized === 'heater') { const h = heatLoss(S, t); Object.assign(piece, { model: h.heater.id, n: h.n, watts: h.heater.watts }); }
      else if (g.watts) piece.watts = g.watts;
      if (gear === 'returnpump') piece.gph = Math.round(galOf(S) * (g.gphPerGal ?? 6));
      out.push(piece);
    }
  }
  return out;
}

// ---- file

const WALLS = new Set(['back', 'left', 'right', 'floor', 'lid']);
/** A saved sump: a catalogue size by its id (its size re-read from the catalogue), else a custom size, each side 50-3000 mm. */
function parseSump(raw: unknown): SumpSize | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const z = raw as Partial<SumpSize>;
  if (typeof z.model === 'string') { const m = SUMP_MODELS.find(x => x.id === z.model); return m ? sumpFromModel(m) : undefined; }
  const side = (v: unknown) => typeof v === 'number' && isFinite(v) ? Math.min(3000, Math.max(50, Math.round(v))) : undefined;
  const L = side(z.L), D = side(z.D), H = side(z.H);
  return L && D && H ? { L, D, H } : undefined;
}
/** Read a saved `tech` (validate.ts): unknown rows / options dropped, numbers clamped. Undefined when absent or empty. */
export function parseTech(raw: unknown): TechSetup | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>, rows: Record<string, string> = {};
  if (r.rows && typeof r.rows === 'object') for (const [k, v] of Object.entries(r.rows as Record<string, unknown>)) if (typeof v === 'string' && optionDef(k, v)) rows[k] = v;
  const t: TechSetup = { rows };
  if (typeof r.preset === 'string' && (r.preset === 'custom' || PRESETS.some(p => p.id === r.preset))) t.preset = r.preset;
  if (typeof r.filterModel === 'string' && FILTER_MODELS.some(m => m.id === r.filterModel)) t.filterModel = r.filterModel;
  if (typeof r.heaterW === 'number' && HEATER_MODELS.some(m => m.watts === r.heaterW)) t.heaterW = r.heaterW;
  if (typeof r.filterProduct === 'string' && filterProduct(r.filterProduct)) t.filterProduct = r.filterProduct;
  if (typeof r.heaterProduct === 'string' && heaterProduct(r.heaterProduct)) t.heaterProduct = r.heaterProduct;
  if (Array.isArray(r.heaters)) t.heaters = (r.heaters as unknown[]).slice(0, 8).flatMap(v => {
    const u = v as Partial<HeaterUnit> | null; if (!u || typeof u !== 'object') return [];
    return [{ ...(typeof u.product === 'string' && heaterProduct(u.product) ? { product: u.product } : {}), ...(typeof u.w === 'number' && isFinite(u.w) ? { w: Math.min(2000, Math.max(5, Math.round(u.w))) } : {}), ...(u.kit === true ? { kit: true } : {}) }];
  });
  if (Array.isArray(r.filters)) t.filters = (r.filters as unknown[]).slice(0, 8).flatMap(v => {
    const u = v as Partial<FilterUnit> | null; if (!u || typeof u !== 'object' || typeof u.kind !== 'string' || u.kind === 'none' || !optionDef('filter', u.kind)) return [];
    return [{ kind: u.kind, ...(typeof u.product === 'string' && filterProduct(u.product)?.kind === u.kind ? { product: u.product } : {}), ...(typeof u.model === 'string' && FILTER_MODELS.some(m => m.id === u.model && m.kind === u.kind) ? { model: u.model } : {}), ...(u.kit === true ? { kit: true } : {}) }];
  });
  if (t.filters) t.filters = t.filters.filter((u, i, us) => u.kind !== 'sump' || us.findIndex(x => x.kind === 'sump') === i); // one sump (lane SU)
  if (t.heaters) rows.heater = heaterRow(t.heaters.length);
  if (t.filters) rows.filter = filterRow(t.filters);
  if (r.filterless === true && !t.filters?.length) t.filterless = true;
  const sump = parseSump(r.sump);
  if (sump) t.sump = sump;
  if (typeof r.roomC === 'number' && isFinite(r.roomC)) t.roomC = Math.min(40, Math.max(0, r.roomC));
  if (typeof r.targetC === 'number' && isFinite(r.targetC)) t.targetC = Math.min(40, Math.max(0, r.targetC));
  if (typeof r.measuredC === 'number' && isFinite(r.measuredC)) t.measuredC = Math.min(40, Math.max(0, r.measuredC));
  if (r.place && typeof r.place === 'object') {
    const place: Record<string, GearPlace> = {};
    for (const [k, v] of Object.entries(r.place as Record<string, unknown>)) {
      const p = v as Partial<GearPlace> | null;
      const num = (n: unknown, lo: number, hi: number) => typeof n === 'number' && isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined;
      if (p && typeof p.wall === 'string' && WALLS.has(p.wall)) {
        const at = num(p.at, 0, 1), y = num(p.y, 0, 1), lean = num(p.lean, -90, 90);
        place[k] = { wall: p.wall, ...(at != null ? { at } : {}), ...(y != null ? { y } : {}), ...(lean != null ? { lean } : {}) };
      }
    }
    if (Object.keys(place).length) t.place = place;
  }
  return Object.keys(rows).length || t.preset || t.heaters || t.filters || t.filterless || t.sump ? t : undefined;
}

/** The filter option the budget assumes while the owner has chosen none (filterState 'unset'): what inferTech picks for a tank not started from its animals
 *  (hang-on up to 60 gal, canister above). The tile says "assumed" and the summary says "No filter chosen" (Nathan 2026-10-27, B1 audit). */
export function assumedFilter(S: TankSetup): string | undefined {
  if (filterState(S) !== 'unset') return undefined;
  const t = techOf(S).rows.filter;
  return t && t !== 'none' ? undefined : (galOf(S) <= 60 ? 'hob' : 'canister');
}
