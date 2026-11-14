// Gear-choice edits (lane P4, 2026-11-14), moved out of ui/techMenu.ts: what picking, adding, removing and tuning the
// tank's heaters, filters, sump, pumps, catalogue products, temperatures and light does to the scene. No DOM, no store:
// each tech edit is `(S: TankSetup, ...) => TechSetup` to hand to `commitTech` (inside store.edit); the light edits
// change `s.light` in place. The Tech menu keeps its markup, tabs, previews and status; the new shell can call these.
import { FILTER_MODELS, type FilterKind } from '../demand/gear';
import { FILTER_PRODUCTS, HEATER_PRODUCTS, genericHeaterW, lightProduct } from '../data/gearCatalog';
import { fromUnits } from '../units';
import { applyLightProduct } from './lightproduct';
import {
  applyPreset, feedFor, filterUnits, heatLoss, keepSet, optionDef, ownKeep, setFeed, sumpDefault, sumpFromModel, sumpOf, techOf, withChoice, withUnits, withoutUnit,
  type FilterUnit, type HeaterUnit, type TechSetup,
} from './tech';
import type { TankSetup } from './types';
import type { TankModel } from '../data/tanks';

/** The store edit body of every tech change: rows never touched stay inferred (lane GV9); the CO2 / ferts rows set grow.feed. */
export const commitTech = (s: TankSetup, fn: (s: TankSetup) => TechSetup): void => { s.tech = keepSet(s, fn(s)); if (s.water.on) s.grow.feed = feedFor(s); };

/** The tank priced with its tech made explicit (an older file's inferred gear becomes rows), the base for previews. */
export const withTech = (S: TankSetup, t: TechSetup): TankSetup => { const x = { ...S, tech: t }; return { ...x, grow: { ...S.grow, feed: feedFor(x) } }; };

/** The Plant care slider / Feeding select wrote grow.feed: carry it into the CO2 + ferts rows (the menu's re-sync edit). */
export const syncFeed = (s: TankSetup): void => { s.tech = keepSet(s, setFeed(techOf(s), s.grow.feed, !!s.water.salt)); };

// ---- presets and rows
export const pickPreset = (S: TankSetup, id: string): TechSetup => applyPreset(S, id);
export const pickRowOption = (S: TankSetup, row: string, opt: string): TechSetup => withChoice(S, row, opt);

// ---- heaters
/** The heaters as saved units, each at the size it has now (a heater sized to the need keeps that size once another is added). */
export const heatersNow = (S: TankSetup, t: TechSetup): HeaterUnit[] => heatLoss(S, t).units.map(u => ({ ...(u.product ? { product: u.product.id } : { w: u.watts }), ...(u.kit ? { kit: true } : {}), ...ownKeep(u) }));
/** The generic heater to add: the size still missing for a cold night, else a full-size backup. */
export const nextHeaterW = (S: TankSetup, t: TechSetup): number => { const h = heatLoss(S, t), more = h.needW - h.totalW; return genericHeaterW(Math.max(more > 0.5 ? more : h.needW, 1)); };
/** Add a heater: a catalogued product, or a generic one at the size still missing. */
export const addHeater = (S: TankSetup, productId?: string): TechSetup => { const t = techOf(S); return withUnits(t, 'heater', [...heatersNow(S, t), productId ? { product: productId } : { w: nextHeaterW(S, t) }]); };
/** Remove heater `i` (the units are made explicit first, so the others keep their sizes). */
export const removeHeater = (S: TankSetup, i: number): TechSetup => { const t = techOf(S); return withoutUnit({ ...t, heaters: heatersNow(S, t) }, 'heater', i); };
/** Heater `i` becomes a catalogued product; its owned mark stays. */
export const pickHeaterProduct = (S: TankSetup, i: number, id: string): TechSetup => { const t = techOf(S); return withUnits(t, 'heater', heatersNow(S, t).map((u, k) => k === i ? { product: id, ...(u.kit ? { kit: true } : {}), ...ownKeep(u) } : u)); };
/** A generic heater's watts, rounded and held to 5-2000 W. */
export const setHeaterWatts = (S: TankSetup, i: number, w: number): TechSetup => { const t = techOf(S); return withUnits(t, 'heater', heatersNow(S, t).map((u, k) => k === i ? { ...u, w: Math.min(2000, Math.max(5, Math.round(w))) } : u)); };
/** "Tune as generic": a catalogue heater becomes a generic with its watts (unchanged when it is not a product). */
export const tuneHeater = (S: TankSetup, i: number): TechSetup => { const t = techOf(S), us = heatersNow(S, t), p = HEATER_PRODUCTS.find(x => x.id === us[i]?.product); return p ? withUnits(t, 'heater', us.map((u, k) => k === i ? { w: p.watts, ...(u.kit ? { kit: true } : {}), ...ownKeep(u) } : u)) : t; };

// ---- filters
/** The generic sizes of one filter kind, smallest flow first. */
export const filterModels = (kind: FilterKind) => FILTER_MODELS.filter(m => m.kind === kind).sort((a, b) => a.gph - b.gph);
/** Add a filter of `kind`: generic, or a catalogued product of that kind. */
export const addFilter = (S: TankSetup, kind: string, productId?: string): TechSetup => { const t = techOf(S); return withUnits(t, 'filter', [...filterUnits(t), { kind, ...(productId ? { product: productId } : {}) }]); };
export const removeFilter = (S: TankSetup, i: number): TechSetup => withoutUnit(techOf(S), 'filter', i);
/** Filter `i` takes generic size `model` (a model id). */
export const setFilterModel = (S: TankSetup, i: number, model: string): TechSetup => { const t = techOf(S); return withUnits(t, 'filter', filterUnits(t).map((u, k) => k === i ? { ...u, model } : u)); };
/** The slider form: filter `i` takes the `idx`-th generic size of its kind (unchanged when there is none). */
export const setFilterSize = (S: TankSetup, i: number, idx: number): TechSetup => {
  const t = techOf(S), us = filterUnits(t), kind = optionDef('filter', us[i]?.kind ?? '')?.kind, m = kind ? filterModels(kind)[Math.round(idx)] : undefined;
  return m ? withUnits(t, 'filter', us.map((u, k) => k === i ? { kind: u.kind, model: m.id, ...(u.kit ? { kit: true } : {}), ...ownKeep(u) } : u)) : t;
};
/** Filter `i` becomes a catalogued product; its owned mark stays. */
export const pickFilterProduct = (S: TankSetup, i: number, id: string): TechSetup => { const t = techOf(S); return withUnits(t, 'filter', filterUnits(t).map((u, k) => k === i ? { kind: u.kind, product: id, ...(u.kit ? { kit: true } : {}), ...ownKeep(u) } : u)); };
/** "Tune as generic": a catalogue filter becomes the generic size nearest its flow (unchanged when it is not a product). */
export const tuneFilter = (S: TankSetup, i: number): TechSetup => {
  const t = techOf(S), us = filterUnits(t), p = FILTER_PRODUCTS.find(x => x.id === us[i]?.product);
  if (!p) return t;
  const near = filterModels(p.kind as FilterKind).sort((a, b) => Math.abs(Math.log(a.gph / (p.gph ?? a.gph))) - Math.abs(Math.log(b.gph / (p.gph ?? b.gph))))[0];
  return withUnits(t, 'filter', us.map((x, k) => k === i ? { kind: x.kind, ...(near ? { model: near.id } : {}), ...(x.kit ? { kit: true } : {}), ...ownKeep(x) } : x));
};

// ---- sump
export const addSump = (S: TankSetup): TechSetup => { const t = techOf(S); return { ...withUnits(t, 'filter', [...filterUnits(t), { kind: 'sump' } as FilterUnit]), sump: t.sump ?? sumpDefault(S) }; };
export const removeSump = (S: TankSetup): TechSetup => { const t = techOf(S); return withoutUnit(t, 'filter', filterUnits(t).findIndex(u => u.kind === 'sump')); };
export const pickSump = (S: TankSetup, m: TankModel): TechSetup => ({ ...techOf(S), sump: sumpFromModel(m) });
/** One side of a custom sump typed in the viewer's units (L, D or H), held to 50-3000 mm. */
export const setSumpSide = (S: TankSetup, side: 'L' | 'D' | 'H', v: number, units: 'in' | 'cm'): TechSetup => {
  const t = techOf(S), z = sumpOf(S, true)!, mm = Math.min(3000, Math.max(50, fromUnits(v, units)));
  return { ...t, sump: { L: z.L, D: z.D, H: z.H, [side]: mm } };
};

// ---- pumps and catalogue products on the other rows
/** A pump product for a gear part (airpump, powerhead, wavemaker); empty id = generic. */
export const setPump = (S: TankSetup, gear: string, id: string): TechSetup => { const t = { ...techOf(S) }, pumps = { ...t.pumps }; if (id) pumps[gear] = id; else delete pumps[gear]; if (Object.keys(pumps).length) t.pumps = pumps; else delete t.pumps; return t; };
/** A catalogue product for a reef / planted row (lane GX); empty id = the generic part. */
export const setRowProduct = (S: TankSetup, row: string, id: string): TechSetup => { const t = { ...techOf(S) }, products = { ...t.products }; if (id) products[row] = id; else delete products[row]; if (Object.keys(products).length) t.products = products; else delete t.products; return t; };

// ---- temperatures (typed in the viewer's units: `fToC` converts when `us` is true, i.e. °F)
const hold = (c: number) => Math.min(40, Math.max(0, c));
/** Target / measured water temperature; an empty string clears it. */
export const setWaterTemp = (S: TankSetup, key: 'targetC' | 'measuredC', value: string, us: boolean, fToC: (f: number) => number): TechSetup => {
  const t = { ...techOf(S) };
  if (value === '') delete t[key]; else t[key] = hold(us ? fToC(+value) : +value);
  return t;
};
export const setRoomTemp = (S: TankSetup, value: number, us: boolean, fToC: (f: number) => number): TechSetup => ({ ...techOf(S), roomC: hold(us ? fToC(value) : value) });

// ---- light (these change the light in place: call inside store.edit)
export const pickLightProduct = (s: TankSetup, id: string): void => { applyLightProduct(s.light, s.tank, lightProduct(id)); };
export const setLightWatts = (s: TankSetup, v: number): void => { s.light.watts = Math.min(1000, Math.max(1, Math.round(v))); };
export const tuneLight = (s: TankSetup): void => { delete s.light.product; };
