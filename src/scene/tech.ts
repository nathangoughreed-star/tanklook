// The tank's tech level (lane TM, 2026-10-19): filtration, heating, CO2, ferts, aeration, UV, water and salt gear, Walstad
// to SPS reef. Data in src/data/tech.json (rows of choices, each a list of gear parts; gear priced, powered and maintained
// for THIS tank). Pure: the demand engine (src/demand/tech.ts), the Tech menu (ui/techMenu.ts) and lane TG's 3D gear
// (render/gear3d.ts, via techParts) all read the tank's tech through techOf. A file without `tech` gets the gear the
// demand engine always inferred (inferTech), so its numbers do not move. grow.feed is derived from the CO2 + ferts rows
// (feedOf); the Plant care slider sets those rows (setFeed).
import data from '../data/tech.json';
import dd from '../data/demand-defaults.json';
import { CARE } from '../data/care';
import { climateOf } from '../data/climate';
import { getSpecies } from '../data/species';
import { FILTER_MODELS, HEATER_MODELS, matchHeater, type FilterKind, type FilterModel, type HeaterModel } from '../demand/gear';
import { price as rowPrice } from '../demand/prices';
import type { Range3 } from '../demand/types';
import { volume } from './physics';
import { footprint } from './shape';
import type { GrowFeed, TankSetup } from './types';

// ---- types (the saved field; lane TG builds against TechSetup / GearPlace / TechPiece)

/** Where a row's gear sits (lane TG draws it there): the tank wall it hangs on or stands against, and how far along that
 *  wall, 0 = left end (back wall, seen from the front) or front end (side walls) .. 1 = the other end. */
export interface GearPlace {
  /** 'floor' (lane TG 2026-10-19): gear that stands on the ground (sponge filter, airstone) */
  wall: 'back' | 'left' | 'right' | 'floor';
  /** floor: the x share, 0 = left .. 1 = right */
  at?: number;
  /** glass mounts: height share from the ground (0) to the water line (1); floor: depth share, 0 = front .. 1 = back */
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
  /** heater watts each (a gear-models.json heater class); absent = sized from the heat loss */
  heaterW?: number;
  /** room temperature, deg C, where the tank stands; absent = tech.json roomC (21) */
  roomC?: number;
  /** where lane TG draws each row's gear (row id -> place); absent = TG's default side */
  place?: Record<string, GearPlace>;
}

export type Water = 'wet' | 'fresh' | 'salt';
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
export interface TechRow { id: string; label: string; water: Water; options: TechOption[] }
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
}
export interface Preset { id: string; label: string; water: 'fresh' | 'salt'; rows: Record<string, string>; needs?: { substrate?: string; plants?: string } }

export const TECH_ROWS = data.rows as unknown as TechRow[];
export const GEAR = data.gear as unknown as Record<string, GearDef>;
export const PRESETS = data.presets as unknown as Preset[];
export const ROOM_C = data.roomC;
const HEAT = data.heat;
const rowDef = (id: string) => TECH_ROWS.find(r => r.id === id);
export const optionDef = (row: string, opt: string) => rowDef(row)?.options.find(o => o.id === opt);

const galOf = (S: TankSetup) => volume(S.tank).gallons;
const isSalt = (S: TankSetup) => S.water.on && !!S.water.salt;
/** The rows this tank shows: none for a dry tank; fresh-only rows (CO2, ferts) not on salt, salt rows only on salt. */
export function rowsFor(S: TankSetup): TechRow[] {
  if (!S.water.on) return [];
  return TECH_ROWS.filter(r => r.water === 'wet' || (r.water === 'salt') === isSalt(S));
}

// ---- defaults, presets, choices

/** The gear the demand engine always assumed (before the Tech menu): HOB up to 60 gal, canister above; one heater; CO2 /
 *  ferts from grow.feed; a skimmer on salt. Rows the engine did not count are 'none' (or the cheapest real choice). */
export function inferTech(S: TankSetup): TechSetup {
  if (!S.water.on) return { rows: {} };
  const gal = galOf(S), feed = S.grow.feed, salt = isSalt(S);
  const rows: Record<string, string> = {
    filter: gal <= 60 ? 'hob' : 'canister', heater: 'one', chiller: 'none', air: 'none', uv: 'none',
    conditioner: salt ? 'none' : 'yes', rodi: 'none', ato: 'none',
  };
  if (salt) Object.assign(rows, { skimmer: 'sump', flow: feed === 'co2' ? 'wave' : feed === 'ferts' ? 'two' : 'none', dosing: feed === 'co2' ? 'doser' : feed === 'ferts' ? 'twopart' : 'none', salinity: 'refractometer', saltmix: 'mix' });
  else Object.assign(rows, { co2: feed === 'co2' ? 'pressurized' : 'none', ferts: feed === 'low' ? 'none' : 'aio' });
  return { rows };
}

/** The tank's tech: its own `tech` with any missing row filled from the inferred defaults. */
export function techOf(S: TankSetup): TechSetup {
  const inf = inferTech(S);
  if (!S.tech) return inf;
  return { ...S.tech, rows: { ...inf.rows, ...S.tech.rows } };
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

/** No heater: the water temperature the animals live at (the room's), for the Animals gate; undefined with a heater. */
export const unheatedC = (S: TankSetup): number | undefined => { const t = techOf(S); return S.water.on && S.tech && t.rows.heater === 'none' ? t.roomC ?? ROOM_C : undefined; };

/** One row changed by hand: the tech is now custom. Choosing an option that needs another row's option sets that too. */
export function withChoice(S: TankSetup, row: string, opt: string): TechSetup {
  const t = techOf(S), rows = { ...t.rows, [row]: opt };
  for (const [r, o] of Object.entries(optionDef(row, opt)?.needs ?? {})) rows[r] = o;
  // an in-sump skimmer without a sump falls back to a hang-on one
  if (row === 'filter' && opt !== 'sump' && rows.skimmer === 'sump') rows.skimmer = 'hob';
  const next: TechSetup = { ...t, rows, preset: 'custom' };
  if (row === 'filter') delete next.filterModel;
  if (row === 'heater') delete next.heaterW;
  return next;
}

/** A preset's rows for this tank (the tank's room temperature and gear places kept). */
export function applyPreset(S: TankSetup, id: string): TechSetup {
  const p = PRESETS.find(x => x.id === id);
  const t = techOf(S);
  if (!p) return t;
  return { rows: { ...inferTech(S).rows, ...p.rows }, preset: id, ...(t.roomC !== undefined ? { roomC: t.roomC } : {}), ...(t.place ? { place: t.place } : {}) };
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

export interface FilterPick { model: FilterModel; n: number; gph: number; turnover: number }
/** The filter for this tank and kind: the model whose tank range holds the volume, else the largest of the kind, as many
 *  units as it takes to cover the volume (sponges on a big tank); `filterModel` steps it up or down. */
export function filterFor(S: TankSetup, kind: FilterKind, override?: string): FilterPick {
  const gal = galOf(S), pool = FILTER_MODELS.filter(m => m.kind === kind).sort((a, b) => a.gph - b.gph);
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
  /** m2 of glass below the waterline (walls), of floor, and of open water */
  wallM2: number; floorM2: number; surfaceM2: number;
  /** W per K through all of it */
  wPerK: number;
  targetC: number; roomC: number;
  /** average W the heater has to replace (0 when the room is warm enough) */
  lossW: number;
  /** heater power needed for a cold night, W */
  needW: number;
  /** the heater class each unit, how many, and its duty cycle */
  heater: HeaterModel; n: number; duty: number;
  /** kWh per month the heaters use (what the tank loses) */
  kwhMo: number;
  /** the room is warmer than the tank should be: the W a chiller must pull out, and its kWh per month */
  coolW: number; chillerKwhMo: number;
}
/** Heat loss through the glass and the water surface (Nathan 2026-10-19: area, tank temperature, room temperature; not
 *  gallons). Target = the water temperature the stocked species agree on (climate.ts); the lid sets the surface loss. */
export function heatLoss(S: TankSetup, t: TechSetup = techOf(S)): HeatLoss {
  const fp = footprint(S.tank), hw = S.tank.H * Math.min(1, Math.max(0, S.water.level)) / 1000;
  const wallM2 = fp.perimeter / 1000 * hw, floorM2 = fp.area / 1e6, surfaceM2 = floorM2;
  const surf = (HEAT.surface as Record<string, number>)[S.lid] ?? HEAT.surface.open;
  const wPerK = HEAT.wall * wallM2 + HEAT.bottom * floorM2 + surf * surfaceM2;
  const targetC = climateOf(S).find(c => c.label === 'Water')?.at ?? (isSalt(S) ? 25.5 : 24), roomC = t.roomC ?? ROOM_C;
  const dT = targetC - roomC, lossW = Math.max(0, wPerK * dT), needW = Math.max(0, wPerK * (dT + HEAT.nightDropK) * HEAT.headroom);
  const n = t.rows.heater === 'none' ? 0 : t.rows.heater === 'two' ? 2 : 1;
  const heater = t.heaterW ? matchHeater(t.heaterW) : matchHeater(Math.max(needW / Math.max(n, 1), 1));
  const duty = n ? Math.min(1, lossW / (heater.watts * n)) : 0;
  const coolW = Math.max(0, -wPerK * dT);
  return {
    wallM2, floorM2, surfaceM2, wPerK, targetC, roomC, lossW, needW, heater, n, duty,
    kwhMo: n ? Math.min(lossW, heater.watts * n) * 24 * 30 / 1000 : 0,
    coolW, chillerKwhMo: coolW * 24 * 30 / 1000 / HEAT.chillerCop,
  };
}
/** Offer two heaters: when one would be bigger than the twoAboveW class. */
export const offerTwoHeaters = (S: TankSetup) => heatLoss(S).needW > HEAT.twoAboveW;
/** Offer a chiller: the room runs warmer than the target by over a degree. */
export const offerChiller = (S: TankSetup) => { const h = heatLoss(S); return h.roomC > h.targetC + 1; };

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
const DOSING = new Set(['aio', 'ei', 'twopart', 'liquidcarbon']);
const KWH_USD = 0.17;
/** Weekly water change in gallons (the demand engine's fraction for this kind of tank). */
const wcGalWk = (S: TankSetup) => galOf(S) * (dd.time.waterChangeFraction as Record<string, number>)[!S.water.on ? 'terrarium' : isSalt(S) ? 'salt' : S.fish.length ? 'fish' : 'planted'];

/** Setup, consumables, power and minutes of one row's option on this tank (every figure sized to it). */
export function optionCost(S: TankSetup, row: string, opt: string, o: { kwhUsd?: number; tech?: TechSetup } = {}): OptionCost {
  const t = { ...(o.tech ?? techOf(S)) }, def = optionDef(row, opt), gal = galOf(S), kwhUsd = o.kwhUsd ?? KWH_USD;
  t.rows = { ...t.rows, [row]: opt };
  const parts: PartCost[] = [];
  let turnover: number | undefined;
  const doser = (def?.parts ?? []).includes('doser');
  for (const id of def?.parts ?? []) {
    const g = GEAR[id];
    if (!g) continue;
    let n = def?.count ?? 1, setup: Range3 | undefined, est = false, watts = (g.watts ?? 0) * sizeK(g, gal, 'watts'), hours = g.hours ?? 24;
    let minutes: Range3 = g.minutes ? s3(g.minutes, sizeK(g, gal, 'minutes')) : Z, monthly: Range3 = Z, kwhMo: number | undefined;
    if (g.sized === 'filter' && def?.kind) {
      const f = filterFor(S, def.kind, row === 'filter' ? t.filterModel : undefined);
      n = f.n; watts = f.model.watts; turnover = f.turnover;
      const p = rowPrice(f.model.priceKey);
      setup = p && s3(p, g.modelPriceK?.[f.model.id] ?? 1); est = !p;
      minutes = s3(minutes, g.byKind?.[def.kind] ?? 1);
      // sponges run off one air pump, however many there are (its price is spread over the units, as setup is multiplied by n below)
      if (def.kind === 'sponge') { watts += (GEAR.airpump.watts ?? 2.5) / f.n; const ap = unitPrice(GEAR.airpump.price); if (setup && ap) setup = a3(setup, s3(ap.r, 1 / f.n)); }
    } else if (g.sized === 'heater') {
      const h = heatLoss(S, t);
      n = h.n; watts = h.heater.watts; setup = rowPrice(h.heater.priceKey); kwhMo = h.kwhMo / Math.max(n, 1);
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

/** Every chosen row's cost on this tank. */
export function techCosts(S: TankSetup, o: { kwhUsd?: number } = {}): OptionCost[] {
  const t = techOf(S);
  return rowsFor(S).map(r => optionCost(S, r.id, t.rows[r.id] ?? 'none', { ...o, tech: t }));
}

// ---- what it buys

/** Fraction of AqAdvisor's stocking capacity the chosen filtration supports: the option's capacity, cut in proportion
 *  when the turnover falls under 4x the volume an hour. A stocking % divides by it. */
export function stockCapacity(S: TankSetup, t: TechSetup = techOf(S)): number {
  const opt = t.rows.filter ?? 'none', def = optionDef('filter', opt);
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
  place?: GearPlace;
}
/** The pieces of gear in this tank, for lane TG: one entry per part (units in n). Filters / heaters name their model. */
export function techParts(S: TankSetup): TechPiece[] {
  const t = techOf(S), out: TechPiece[] = [];
  for (const row of rowsFor(S)) {
    const opt = t.rows[row.id] ?? 'none', def = optionDef(row.id, opt);
    for (const gear of def?.parts ?? []) {
      const g = GEAR[gear];
      if (!g || g.inWaterChange || g.perWaterChange || (!g.watts && !g.sized && !['dropchecker', 'diyco2', 'sump', 'refractometer', 'hydrometer', 'chiller', 'rodi'].includes(gear))) continue;
      const piece: TechPiece = { row: row.id, option: opt, gear, n: def?.count ?? 1, ...(t.place?.[row.id] ? { place: t.place[row.id] } : {}) };
      if (g.sized === 'filter' && def?.kind) { const f = filterFor(S, def.kind, t.filterModel); Object.assign(piece, { model: f.model.id, n: f.n, gph: f.model.gph, watts: f.model.watts }); }
      else if (g.sized === 'heater') { const h = heatLoss(S, t); Object.assign(piece, { model: h.heater.id, n: h.n, watts: h.heater.watts }); }
      else if (g.watts) piece.watts = g.watts;
      if (gear === 'returnpump') piece.gph = Math.round(galOf(S) * (g.gphPerGal ?? 6));
      out.push(piece);
    }
  }
  return out;
}

// ---- file

const WALLS = new Set(['back', 'left', 'right', 'floor']);
/** Read a saved `tech` (validate.ts): unknown rows / options dropped, numbers clamped. Undefined when absent or empty. */
export function parseTech(raw: unknown): TechSetup | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>, rows: Record<string, string> = {};
  if (r.rows && typeof r.rows === 'object') for (const [k, v] of Object.entries(r.rows as Record<string, unknown>)) if (typeof v === 'string' && optionDef(k, v)) rows[k] = v;
  const t: TechSetup = { rows };
  if (typeof r.preset === 'string' && (r.preset === 'custom' || PRESETS.some(p => p.id === r.preset))) t.preset = r.preset;
  if (typeof r.filterModel === 'string' && FILTER_MODELS.some(m => m.id === r.filterModel)) t.filterModel = r.filterModel;
  if (typeof r.heaterW === 'number' && HEATER_MODELS.some(m => m.watts === r.heaterW)) t.heaterW = r.heaterW;
  if (typeof r.roomC === 'number' && isFinite(r.roomC)) t.roomC = Math.min(40, Math.max(0, r.roomC));
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
  return Object.keys(rows).length || t.preset ? t : undefined;
}
