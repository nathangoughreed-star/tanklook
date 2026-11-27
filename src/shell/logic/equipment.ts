// UI2 shell step 6 (lane S6, 2026-11-14): the Equipment section's view-models and edits (screen map §2a "Section Equipment").
// Per category two groups: "I own" (the owned list, $0, not necessarily in use) and "Buy" (catalogue products that fit this tank), the item
// in use marked, and an independent "Use this one for sure" lock per item. Pure: no DOM. Engine calls go only through scene/techEdit.ts (P4),
// scene/gearOwn.ts (P8) and src/units.ts; the catalogue lists are read from data/gearCatalog.ts and data/hoods.ts.
import { tempIssues } from './lidTemp';
import { commitTech, withTech, addReturnInline, removeReturnInline, setReturnOutlet, addHeater, pickHeaterProduct, tuneHeater, addFilter, pickFilterProduct, tuneFilter, setPump, setAirValve, setRowProduct, pickLightProduct, tuneLight, pickPreset, setHeaterWatts, setLightWatts } from '../../scene/techEdit';
import { editGear, gearOfTank, GENERIC, isLockedItem, isOwned, lockItem, ownItem, ownedFor, setInUse, unlockItem, unownItem, type GearModel } from '../../scene/gearOwn';
import { airValveOf, deliveredFlow, filterUnits, heatLoss, heaterUnits, presetsFor, roomOf, rowsFor, specialHeaters, techOf, withChoice, rowProduct, GEAR } from '../../scene/tech';
import {
  FILTER_PRODUCTS, HEATER_PRODUCTS, REEF_ROWS, hoseLabel, inlineFor, inlineKinds, type InlineKind, filterProduct, heaterProduct, lightProduct, lightsFor, listedPrice, productName, pumpProduct, pumpRatedFor, pumpsFor,
  reefOptionProducts, reefProduct, skimmerSuitsGal, type SkimmerProduct, type ChillerProduct, type UvProduct, type SumpProduct, type OverflowProduct,
} from '../../data/gearCatalog';
import { hoodProduct, hoodsFor, lightIsHoods, hoodOf } from '../../data/hoods';
import { volume } from '../../scene/physics';
import { fmtTempHalf } from '../../units';
import type { Tone } from './checks';
import type { Scene, TankSetup } from '../../scene/types';

type Units = Scene['units'];
export type { GearModel };

/** The return pump the engine sizes a sump system for (tech.json gear.returnpump gphPerGal), gal/h per display gallon: an overflow rated under it cannot carry the flow. */
const RETURN_GPH_PER_GAL = GEAR.returnpump.gphPerGal ?? 6;
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const galOf = (S: TankSetup) => volume(S.tank).gallons;
const galText = (g: number) => `${g < 10 ? +g.toFixed(1) : Math.round(g)} gal`;

// ---------------------------------------------------------------- categories

/** The category ids the screen offers, in chip order. Light, filter and heater always; the rest when the tank's tech rows have them and the catalogue holds products. */
const ORDER = ['filter', 'heater', 'light', 'co2', 'air', 'uv', 'skimmer', 'chiller', 'ato', 'overflow', 'sump', 'flow', 'surfskim', 'ferts', 'conditioner', 'rodi', 'wcmethod', 'feeder', 'dosing', 'salinity', 'saltmix', 'heatlamp', 'thermostat', 'uvb', 'gauge', 'mist', 'timer'] as const;
export type CatId = (typeof ORDER)[number];
const LABEL: Record<CatId, string> = { filter: 'Filter', heater: 'Heater', light: 'Light', co2: 'CO2', air: 'Air', uv: 'UV', skimmer: 'Skimmer', chiller: 'Chiller', ato: 'Top-off', overflow: 'Overflow box', sump: 'Sump', flow: 'Flow', surfskim: 'Surface skimmer', ferts: 'Fertilizer', conditioner: 'Conditioner', rodi: 'RO/DI', wcmethod: 'Water changes', feeder: 'Feeder', dosing: 'Dosing', salinity: 'Salinity', saltmix: 'Salt mix', heatlamp: 'Heat lamp', thermostat: 'Thermostat', uvb: 'UVB', gauge: 'Gauge', mist: 'Misting', timer: 'Timer' };
const SINGULAR: Record<CatId, string> = { filter: 'filter', heater: 'heater', light: 'light', co2: 'CO2 kit', air: 'air pump', uv: 'UV sterilizer', skimmer: 'skimmer', chiller: 'chiller', ato: 'auto top-off', overflow: 'overflow box', sump: 'sump tank', flow: 'powerhead', surfskim: 'surface skimmer', ferts: 'fertilizer', conditioner: 'water conditioner', rodi: 'RO/DI unit', wcmethod: 'water-change tool', feeder: 'auto feeder', dosing: 'dosing setup', salinity: 'salinity tester', saltmix: 'salt mix', heatlamp: 'heat lamp', thermostat: 'thermostat', uvb: 'UVB lamp', gauge: 'gauge', mist: 'misting setup', timer: 'timer' };
export const catLabel = (c: string) => LABEL[c as CatId] ?? c;
export const isCat = (c: string): c is CatId => (ORDER as readonly string[]).includes(c);

export function categories(S: TankSetup): { id: CatId; label: string }[] {
  const have = new Set(rowsFor(S).map(r => r.id));
  if (S.water.on && techOf(S).rows.filter === 'sump') { have.add('overflow'); have.add('sump'); } // PB2: a sump's tank and its overflow box are picked under the filter row's sump option
  return ORDER.filter(c => c === 'filter' || c === 'heater' || c === 'light' || have.has(c)).map(id => ({ id, label: LABEL[id] }));
}

// ---------------------------------------------------------------- the presets ladder

export interface PresetChip { id: string; label: string; on: boolean }
/** Walstad ... high-tech (fresh) or FOWLR ... SPS (salt): the preset whose rows all match the tank's are lit. */
export function presetLadder(S: TankSetup): PresetChip[] {
  const t = techOf(S);
  return presetsFor(S).map(p => ({ id: p.id, label: p.label, on: Object.entries(p.rows).every(([r, o]) => (t.rows[r] ?? 'none') === o) }));
}
export const applyPresetEdit = (S: TankSetup, id: string): void => commitTech(S, s => pickPreset(s, id));

// ---------------------------------------------------------------- "Add one I own (any brand)"

/** An owned item of any brand is stored as the id `own:<name>` or `own:<name>|<watts>`: the gear model holds strings, and the name is all a person knows. */
export const isCustom = (item: string) => item.startsWith('own:');
const CUSTOM_MAX = 70;
/** Where the engine needs a number to size the thing: a heater's and a light's watts. */
export const specOf = (cat: string): { label: string; unit: string; min: number; max: number } | undefined =>
  cat === 'heater' ? { label: 'Wattage', unit: 'W', min: 5, max: 2000 } : cat === 'light' ? { label: 'Wattage', unit: 'W', min: 1, max: 1000 } : undefined;
export function customItem(cat: string, name: string, watts?: number): string | undefined {
  const n = name.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CUSTOM_MAX - 12);
  if (!n) return undefined;
  const sp = specOf(cat);
  if (sp) { if (watts === undefined || !Number.isFinite(watts) || watts < sp.min || watts > sp.max) return undefined; return `own:${n}|${Math.round(watts)}`; }
  return `own:${n}`;
}
export function customOf(item: string): { name: string; watts?: number } | undefined {
  if (!isCustom(item)) return undefined;
  const [name, w] = item.slice(4).split('|'); const watts = w ? +w : undefined;
  return { name, ...(watts && Number.isFinite(watts) ? { watts } : {}) };
}
/** "Add one I own (any brand)": the owned list gains the named item (one store.edit by the caller). false = the form was not complete. */
export function addOwnAny(S: TankSetup, cat: CatId, name: string, watts?: number): boolean {
  const item = customItem(cat, name, watts); if (!item) return false;
  setOwned(S, cat, item, true); return true;
}

// ---------------------------------------------------------------- what is in use

/** The item in use for a category on the design right now: a product id, GENERIC, or undefined (nothing). Read from the scene, which is the truth. */
export function inUseItem(S: TankSetup, cat: string): string | undefined {
  const t = techOf(S);
  switch (cat) {
    case 'heater': { const u = heaterUnits(t)[0]; return u ? (u.product ?? GENERIC) : undefined; }
    case 'filter': { const u = filterUnits(t)[0]; return u ? (u.product ?? GENERIC) : undefined; }
    case 'light': return S.lid === 'hood' && lightIsHoods(S) ? hoodOf(S)?.id : S.light.product ?? GENERIC;
    case 'air': return t.pumps?.airpump;
    case 'flow': return t.pumps?.powerhead;
    case 'overflow': case 'sump': { const p = rowProduct(t, cat); return p ? p.id : t.rows.filter === 'sump' && cat === 'sump' ? GENERIC : undefined; }
    default: { const p = reefProduct(cat, t.products?.[cat]); const on = (t.rows[cat] ?? 'none') !== 'none'; return p && reefOptionProducts(cat, t.rows[cat] ?? 'none').includes(p) ? p.id : on ? GENERIC : undefined; }
  }
}

// ---------------------------------------------------------------- one row

export interface Fit { tone: Tone; text: string }
export interface GearRow {
  cat: string; item: string; name: string;
  /** one line of facts: size, power, kind */
  sub: string;
  /** "$38", "~$45" (a first guess), "Owned · $0", "" (not priced) */
  price: string;
  fit: Fit | null;
  owned: boolean; inUse: boolean; locked: boolean;
  /** hoods are products of the Light category with their light built in (HD1) */
  hood?: boolean;
  /** EQ2: the type within the kind ("Canister", "Glass tube") and the size band ("20-40 gal") the Buy tree files the product under */
  type?: string; band?: string;
}
interface Entry { item: string; name: string; sub: string; usd?: number; est?: boolean; fit: Fit | null; rank: number; hood?: boolean; ty: string; sz?: number }

const ratedFit = (gal: number, lo?: number, hi?: number): Fit | null => {
  if (lo === undefined && hi === undefined) return null;
  if (hi !== undefined && gal > hi * 1.15) return { tone: 'warn', text: `too small for ${galText(gal)}` };
  if (lo !== undefined && gal < lo * 0.85) return { tone: 'warn', text: `too big for ${galText(gal)}` };
  return { tone: 'ok', text: `fits ${galText(gal)}` };
};
const price = (p: { priceUsd?: number; est?: string[] }): Pick<Entry, 'usd' | 'est'> => {
  const lp = listedPrice(p);
  return lp !== undefined ? { usd: lp } : p.priceUsd ? { usd: p.priceUsd, est: true } : {};
};
const kindWord: Record<string, string> = { 'hang-on': 'hang-on box', external: 'external box', hob: 'hang-on-back', canister: 'canister', internal: 'internal', sponge: 'sponge', sump: 'in-sump', surface: 'surface', fan: 'fan', compressor: 'compressor', inline: 'inline', regulator: 'regulator', cartridge: 'cartridge kit', diy: 'DIY yeast', air: 'air pump', powerhead: 'powerhead', wavemaker: 'wavemaker' };
const kindType = (k: string) => { const w = kindWord[k] ?? k; return w.charAt(0).toUpperCase() + w.slice(1); };
const HEAT_TYPE: Record<string, string> = { glass: 'Glass tube', shroud: 'Guarded (plastic shroud)', titanium: 'Titanium' };
const LIGHT_TYPE: Record<string, string> = { bar: 'LED bar', 'rim-legs': 'LED bar on legs', gooseneck: 'Clamp-on', hanging: 'Hanging', submersible: 'Submersible', lid: 'LED bar on the lid' };
const rank = (f: Fit | null) => (f?.tone === 'ok' ? 0 : f ? 1 : 0.5);

/** Every catalogue entry of a category worth offering for this tank (the "Buy" group before it is sorted). Hoods ride in Light. */
function catalogue(S: TankSetup, cat: CatId, units: Units): Entry[] {
  const gal = galOf(S), L = S.tank.L, us = units === 'in';
  const cm = (mm: number) => us ? `${Math.round(mm / 25.4)} in` : `${Math.round(mm / 10)} cm`;
  switch (cat) {
    case 'heater': {
      const need = heatLoss(S).needW;
      return HEATER_PRODUCTS.map(h => {
        const small = h.watts < need * 0.85, big = h.watts > need * 2.6;
        const fit: Fit = small ? { tone: 'warn', text: `too small for ${galText(gal)}` } : h.galMax !== undefined && gal > h.galMax * 1.15 ? { tone: 'warn', text: `rated for ${h.galMax} gal` } : big ? { tone: 'neutral', text: 'more than this tank needs' } : { tone: 'ok', text: `about right (needs ${Math.round(need)} W)` };
        return { item: h.id, name: productName(h), sub: `${h.watts} W · ${h.look} · ${cm(h.lengthMm)}`, ty: HEAT_TYPE[h.look] ?? 'Other', sz: h.watts, ...price(h), fit, rank: rank(fit) + Math.abs(Math.log(h.watts / Math.max(need, 1))) * 0.1 };
      });
    }
    case 'filter':
      return FILTER_PRODUCTS.map(f => { const fit = ratedFit(gal, f.galMin, f.galMax); return { item: f.id, name: productName(f), sub: `${kindWord[f.kind]}${f.gph ? ` · ${f.gph} gph` : ''}${f.galMin !== undefined || f.galMax !== undefined ? ` · ${f.galMin ?? '?'}-${f.galMax ?? '?'} gal` : ''}`, ty: kindType(f.kind), sz: f.galMax ?? f.galMin, ...price(f), fit, rank: rank(fit) }; });
    case 'light': {
      const lights = lightsFor(L).map((p): Entry => ({ item: p.id, name: productName(p), sub: `${p.watts} W · ${p.tech.replace('led-', 'LED ')} · ${p.mount === 'bar' ? 'bar' : p.mount === 'rim-legs' ? 'on legs' : p.mount === 'gooseneck' ? 'clamp-on' : p.mount === 'hanging' ? 'hanging' : p.mount === 'lid' ? 'on the lid' : 'submersible'}`, ...price(p), fit: { tone: 'ok', text: `fits a ${cm(L)} tank` }, rank: 0.2, ty: LIGHT_TYPE[p.mount] ?? 'Other', sz: p.lengthMm / 25.4 }));
      const hoods = hoodsFor(S.tank).map((h): Entry => ({ item: h.id, name: productName(h), sub: `hood · ${h.light.watts} W ${h.light.type === 'led' ? 'LED' : h.light.tech} built in`, usd: h.priceUsd, est: h.est.includes('priceUsd'), fit: { tone: 'ok', text: 'light included, one price' }, rank: 0, hood: true, ty: 'Hood with light', sz: h.lengthIn }));
      return [...hoods, ...lights];
    }
    case 'air': case 'flow':
      return pumpsFor(cat === 'air' ? 'airpump' : 'powerhead', gal).map(p => { const r = pumpRatedFor(p, gal); const fit: Fit | null = r === undefined ? null : r ? { tone: 'ok', text: `rated for ${galText(gal)}` } : { tone: 'warn', text: `not rated for ${galText(gal)}` }; return { item: p.id, name: productName(p), sub: `${kindWord[p.kind]}${p.gph ? ` · ${p.gph} gph` : p.airGph ? ` · ${p.airGph} gph air` : ''} · ${p.watts} W`, ty: kindType(p.kind), sz: p.galMax ?? p.galMin, ...price(p), fit, rank: rank(fit) }; });
    default:
      return (REEF_ROWS[cat] ?? []).map(p => {
        const k = (p as { kind?: string }).kind;
        let fit: Fit | null = null, facts = k ? kindWord[k] ?? k : '';
        if (cat === 'skimmer' || cat === 'surfskim') { const s = skimmerSuitsGal(p as SkimmerProduct); fit = s === undefined ? null : s >= gal * 0.85 ? { tone: 'ok', text: `suits ${galText(gal)}` } : { tone: 'warn', text: `too small for ${galText(gal)}` }; }
        else if (cat === 'chiller') { const s = (p as ChillerProduct).suitsGal ?? (p as ChillerProduct).ratedGal; fit = s === undefined ? null : s >= gal * 0.85 ? { tone: 'ok', text: `suits ${galText(gal)}` } : { tone: 'warn', text: `too small for ${galText(gal)}` }; }
        else if (cat === 'uv') fit = ratedFit(gal, (p as UvProduct).galMin, (p as UvProduct).galMax);
        else if (cat === 'sump') { const q = p as SumpProduct; fit = ratedFit(gal, undefined, q.ratedGal); facts = `${q.waterGal !== undefined ? `${q.waterGal} gal of water · ` : ''}${q.dimsIn.l} x ${q.dimsIn.w} x ${q.dimsIn.h} in${q.material ? ` · ${q.material}` : ''}`; }
        else if (cat === 'overflow') { const q = p as OverflowProduct, need = gal * RETURN_GPH_PER_GAL; fit = q.ratedGph >= need ? { tone: 'ok', text: `handles a ${Math.round(need)} gph return` } : { tone: 'warn', text: `${q.ratedGph} gph is under a ${Math.round(need)} gph return` }; facts = `${kindWord[q.kind] ?? q.kind} · ${q.ratedGph} gph rated${q.drains ? ` · ${q.drains} drain${q.drains > 1 ? 's' : ''}` : ''}`; }
        if (p.watts) facts += `${facts ? ' · ' : ''}${p.watts} W`;
        const q = p as { ratedGal?: number; suitsGal?: number; galMax?: number; galMin?: number };
        return { item: p.id, name: productName(p), sub: facts || 'catalogue product', ty: k ? kindType(k) : 'Standard', sz: cat === 'skimmer' || cat === 'surfskim' ? skimmerSuitsGal(p as SkimmerProduct) : cat === 'overflow' ? (p as OverflowProduct).ratedGph : cat === 'sump' ? (p as SumpProduct).waterGal : q.suitsGal ?? q.ratedGal ?? q.galMax ?? q.galMin, ...price(p), fit, rank: rank(fit) };
      });
  }
}

/** A name for any item id a category can hold: a product's, "Generic <thing>", or the id itself (an owned-sheet answer). */
export function itemName(cat: string, item: string): string {
  if (item === GENERIC) return `Generic ${SINGULAR[cat as CatId] ?? cat}`;
  const c = customOf(item); if (c) return c.name;
  const p = filterProduct(item) ?? heaterProduct(item) ?? lightProduct(item) ?? pumpProduct(item) ?? reefProduct(cat, item) ?? hoodProduct(item);
  return p ? productName(p) : item;
}

export interface CategoryView {
  id: CatId; label: string; singular: string;
  /** the one-line fact under the chips: the heater's room temperature, what a light needs ... */
  note: string;
  owned: GearRow[];
  buy: GearRow[];
  /** how many Buy rows the group holds in all (the list shows the first few) */
  buyTotal: number;
  /** the heater row shows the room temperature read-only, with a link to Constraints > Your home */
  roomLink: boolean;
  inUse: string | undefined;
  /** LW1: the old Tech menu's hold-the-temperature warnings (heater cannot hold the target, room warmer than the tank, measured temp out of range), on the Heater row and the Chiller row */
  warnings: string[];
}
const priceText = (e: Pick<Entry, 'usd' | 'est'> | undefined) => !e || e.usd === undefined ? '' : `${e.est ? '~' : ''}${usd(e.usd)}`;

export function categoryView(S: TankSetup, cat: CatId, units: Units, o: { showAll?: boolean; limit?: number } = {}): CategoryView {
  const g = gearOfTank(S), scene = inUseItem(S, cat), list = catalogue(S, cat, units), mu = g[cat]?.use;
  // a brand we do not list is on the design as the generic one: the model remembers which of the owned ones it is
  const inUse = scene === GENERIC && mu && isCustom(mu) ? mu : scene;
  const bs = bandSpec(S, cat, units);
  const row = (item: string, e: Entry | undefined, own: boolean): GearRow => ({
    type: e ? e.ty : 'Any brand', band: e ? bs.labelOf(e.sz) : bs.labels[0],
    cat, item, name: e?.name ?? itemName(cat, item), sub: e?.sub ?? (item === GENERIC ? 'any brand' : customOf(item) ? `your own${customOf(item)!.watts ? ` · ${customOf(item)!.watts} W` : ''}` : ''),
    price: own ? 'Owned · $0' : priceText(e), fit: e?.fit ?? null, owned: own, inUse: inUse === item, locked: isLockedItem(g, cat, item), ...(e?.hood ? { hood: true } : {}),
  });
  const ownedRows = ownedFor(g, cat).map(it => row(it, list.find(x => x.item === it), true));
  const own = new Set(ownedFor(g, cat));
  const sorted = list.filter(e => !own.has(e.item)).sort((a, b) => a.rank - b.rank || (a.usd ?? 1e9) - (b.usd ?? 1e9));
  // the item in use (bought) stays on top of Buy even when it would be cut off; a locked one too
  const pinned = sorted.filter(e => e.item === inUse || isLockedItem(g, cat, e.item));
  const limit = o.limit ?? 4, shown = o.showAll ? sorted : [...pinned, ...sorted.filter(e => !pinned.includes(e))].slice(0, Math.max(limit, pinned.length));
  const buy = shown.map(e => row(e.item, e, false));
  if (cat === 'heater' || cat === 'filter' || cat === 'light' || !list.length) buy.push(row(GENERIC, undefined, false));
  let note = '';
  const builtIn = specialHeaters(S, techOf(S));
  if (cat === 'heater' && builtIn.length) { // lane IL1: a heater built into the filter, or in line on its return, is the tank's heater
    const h = heatLoss(S);
    note = `${builtIn.map(x => x.builtIn ? `Built into ${productName(x.builtIn)}: ${x.w} W` : `In line on the canister return: ${productName(x.inline!)}, ${x.w} W`).join('; ')}. That is the tank's heater (no separate one, no second price): ${Math.round(h.totalW)} W of the ${Math.round(h.needW)} W a cold night needs.`;
  } else if (cat === 'co2' && deliveredFlow(S, techOf(S))?.items.some(p => p.kind !== 'heater')) {
    const p = deliveredFlow(S, techOf(S))!.items.find(q => q.kind !== 'heater')!;
    note = `The diffuser is the ${p.kind === 'reactor' ? 'reactor' : 'in-line diffuser'} on the canister return (${productName(p)}): a kit's own in-tank diffuser is replaced. The regulator and cylinder come from the kit.`;
  } else if (cat === 'heater') {
    const h = heatLoss(S), r = roomOf(S);
    note = `${galText(galOf(S))} at ${fmtTempHalf(h.targetC, units)}, room ${fmtTempHalf(r.c, units)}${r.set ? '' : ' (assumed)'}: needs about ${Math.round(h.needW)} W.`;
  } else if (cat === 'light') note = S.lid === 'hood' ? 'The hood holds its own light: pick a hood to change it, or a light product to put the hood away.' : `${list.filter(e => !e.hood).length} lights fit a ${units === 'in' ? Math.round(S.tank.L / 25.4) + ' in' : Math.round(S.tank.L / 10) + ' cm'} tank.`;
  return { id: cat, label: LABEL[cat], singular: SINGULAR[cat], note, owned: ownedRows, buy, buyTotal: sorted.length + (cat === 'heater' || cat === 'filter' || cat === 'light' || !list.length ? 1 : 0), roomLink: cat === 'heater', inUse, warnings: cat === 'heater' ? tempIssues(S, units).map(i => i.text) : cat === 'chiller' ? tempIssues(S, units).filter(i => i.id === 'temp:chiller' || i.id === 'temp:hold:cool').map(i => i.text) : [] };
}

// ---------------------------------------------------------------- EQ2: kinds in five categories, then type, then size band

export interface KindStatus { id: CatId; label: string; status: string; owned: number }
export interface CategoryGroup { id: string; label: string; kinds: KindStatus[] }
const GROUPS: { id: string; label: string; kinds: CatId[] }[] = [
  { id: 'filtration', label: 'Filtration & Water Clarity', kinds: ['filter', 'surfskim', 'uv'] },
  { id: 'temperature', label: 'Temperature Control', kinds: ['heater', 'chiller'] },
  { id: 'lighting', label: 'Lighting', kinds: ['light'] },
  { id: 'aeration', label: 'Aeration & CO₂', kinds: ['air', 'co2'] },
  { id: 'maintenance', label: 'Maintenance & Water Care', kinds: ['ato', 'wcmethod', 'rodi', 'conditioner', 'ferts', 'feeder'] },
];
const FIVE = new Set<string>(GROUPS.flatMap(g => g.kinds));
/** Nathan's five categories (and "More equipment" for reef / reptile kinds he did not list), each with its kinds and a one-line status: what is chosen, or "none". */
export function categoryGroups(S: TankSetup): CategoryGroup[] {
  const have: CatId[] = categories(S).map(c => c.id).filter(id => id !== 'ferts'), g = gearOfTank(S); // fertiliser lives in the Plants card (PL2), not here
  const status = (id: CatId): KindStatus => { const u = inUseItem(S, id); return { id, label: LABEL[id], status: u ? itemName(id, u) : 'none', owned: g[id]?.owned.length ?? 0 }; };
  const groups = [...GROUPS, { id: 'more', label: 'More equipment', kinds: have.filter(c => !FIVE.has(c)) }];
  return groups.map(x => ({ id: x.id, label: x.label, kinds: x.kinds.filter(k => have.includes(k)).map(status) })).filter(x => x.kinds.length);
}
export const groupOfKind = (S: TankSetup, kind: string): string | undefined => categoryGroups(S).find(g => g.kinds.some(k => k.id === kind))?.id;

interface BandSpec { labels: string[]; tank: number; labelOf: (v: number | undefined) => string }
/** Size bands per kind: gallons of rating (filters, UV, pumps, skimmers, chillers), watts (heaters), inches of length (lights). The band the tank falls in is `tank`. */
function bandSpec(S: TankSetup, cat: CatId, units: Units): BandSpec {
  const none = 'Rating not listed';
  const make = (edges: number[], unit: string, tankV: number, text?: (lo: number | undefined, hi: number | undefined) => string): BandSpec => {
    const labels = edges.map((hi, i) => text ? text(edges[i - 1], hi) : i === 0 ? `Rated up to ${hi} ${unit}` : `${edges[i - 1]}-${hi} ${unit}`);
    labels.push(text ? text(edges[edges.length - 1], undefined) : `${edges[edges.length - 1]}+ ${unit}`, none);
    const idx = (v: number | undefined) => v === undefined || !Number.isFinite(v) ? labels.length - 1 : (() => { const i = edges.findIndex(e => v <= e); return i < 0 ? edges.length : i; })();
    return { labels, tank: idx(tankV), labelOf: v => labels[idx(v)] };
  };
  if (cat === 'heater') return make([50, 100, 200, 300], 'W', heatLoss(S).needW);
  if (cat === 'light') {
    const us = units === 'in', f = us ? 1 : 2.54;
    return make([20, 30, 40, 48].map(n => Math.round(n * f)), us ? 'in' : 'cm', S.tank.L / (us ? 25.4 : 10));
  }
  if (['filter', 'uv', 'air', 'flow', 'skimmer', 'surfskim', 'chiller'].includes(cat)) return make([20, 40, 75, 125], 'gal', galOf(S));
  if (cat === 'overflow') return make([400, 800, 1000], 'gph rated', galOf(S) * RETURN_GPH_PER_GAL); // PB2: the maker's flow rating against the return the engine sizes
  if (cat === 'sump') return make([15, 25, 35], 'gal of water', galOf(S) * 0.25);
  return { labels: ['All sizes'], tank: 0, labelOf: () => 'All sizes' };
}
export interface BandView { label: string; rows: GearRow[]; hasTank: boolean }
export interface TypeView { label: string; count: number; bands: BandView[] }
/** The Buy list of a kind as Type -> Size band -> rows, every product once. Types: the one holding a product that fits the tank first; bands: the tank's band first, the rest by size, "Rating not listed" last. */
export function buyTree(S: TankSetup, cat: CatId, units: Units): TypeView[] {
  const rows = categoryView(S, cat, units, { showAll: true }).buy, bs = bandSpec(S, cat, units);
  const order = [bs.tank, ...bs.labels.map((_, i) => i).filter(i => i !== bs.tank)];
  const types = new Map<string, GearRow[]>();
  for (const r of rows) { const t = r.type ?? 'Other'; (types.get(t) ?? types.set(t, []).get(t)!).push(r); }
  const bestRank = (rs: GearRow[]) => Math.min(...rs.map(r => r.fit?.tone === 'ok' ? 0 : r.fit ? 1 : 0.5));
  return [...types.entries()].sort((a, b) => (a[0] === 'Any brand' ? 1 : 0) - (b[0] === 'Any brand' ? 1 : 0) || bestRank(a[1]) - bestRank(b[1]) || b[1].length - a[1].length)
    .map(([label, rs]) => ({
      label, count: rs.length,
      bands: order.map(i => ({ label: bs.labels[i], hasTank: i === bs.tank, rows: rs.filter(r => r.band === bs.labels[i]) })).filter(b => b.rows.length),
    }));
}

// ---------------------------------------------------------------- edits (the caller wraps each in store.edit: one undo step)

/** "Use": put the item on the design, and record it as the category's item in use. */
export function useItem(S: TankSetup, cat: CatId, item: string): void {
  const own = customOf(item), orig = item;
  if (own) item = GENERIC;   // a brand we do not list is put on the design as the generic one, sized by its watts where the engine needs them
  const hood = hoodProduct(item);
  switch (cat) {
    case 'heater':
      commitTech(S, s => item === GENERIC ? (heaterUnits(techOf(s)).length ? tuneHeater(s, 0) : addHeater(s)) : heaterUnits(techOf(s)).length ? pickHeaterProduct(s, 0, item) : addHeater(s, item));
      if (own?.watts) commitTech(S, s => setHeaterWatts(s, 0, own.watts!));
      break;
    case 'filter': {
      const p = filterProduct(item);
      commitTech(S, s => item === GENERIC || !p ? (filterUnits(techOf(s)).length ? tuneFilter(s, 0) : addFilter(s, 'hob')) : filterUnits(techOf(s)).length ? pickFilterProduct(s, 0, item) : addFilter(s, p.kind, item));
      break;
    }
    case 'light':
      if (hood) { S.lid = 'hood'; S.hoodProduct = hood.id; tuneLight(S); }
      else {
        if (S.lid === 'hood') S.lid = 'glass';   // a hood holds its own lamps (HD1): a separate light means no hood
        if (item === GENERIC) tuneLight(S); else pickLightProduct(S, item);
        if (own?.watts) setLightWatts(S, own.watts);
      }
      break;
    case 'air': case 'flow': {
      const gear = cat === 'air' ? 'airpump' : 'powerhead', opt = cat === 'air' ? 'airstone' : 'one';
      commitTech(S, s => { const t = (techOf(s).rows[cat] ?? 'none') === 'none' ? withChoice(s, cat, opt) : techOf(s); return setPump(withTech(s, t), gear, item); });
      break;
    }
    case 'overflow': case 'sump': // PB2: both live under the filter row's sump option; picking one turns the sump on
      commitTech(S, s => { const t = techOf(s).rows.filter === 'sump' ? techOf(s) : withChoice(s, 'filter', 'sump'); return setRowProduct(withTech(s, t), cat, item === GENERIC ? '' : item); });
      break;
    default: {
      const opt = optionFor(cat, item);
      if (opt) commitTech(S, s => { const t = withChoice(s, cat, opt); return setRowProduct(withTech(s, t), cat, item); });
      else if (item === GENERIC) { const first = rowsFor(S).find(r => r.id === cat)?.options.find(o => o.id !== 'none'); if (first && (techOf(S).rows[cat] ?? 'none') === 'none') commitTech(S, s => withChoice(s, cat, first.id)); }
    }
  }
  editGear(S, g => setInUse(g, cat, orig));
}
/** The Tech option a reef / planted product belongs to (the row it fills when "Use" turns the row on). */
function optionFor(row: string, id: string): string | undefined {
  const opts: Record<string, string[]> = { overflow: ['sump'], sump: ['sump'], skimmer: ['hob', 'sump'], surfskim: ['surface'], uv: ['uv'], co2: ['pressurized', 'cartridge', 'diy'], ato: ['ato'], chiller: ['fan', 'chiller'] };
  return (opts[row] ?? []).find(o => reefOptionProducts(row, o).some(p => p.id === id));
}
/** "I have this" / "I don't have this". Owning never changes what is in use, except the first thing owned in a category when nothing was. */
export const setOwned = (S: TankSetup, cat: CatId, item: string, on: boolean): void => editGear(S, g => on ? (isOwned(g, cat, item) ? g : ownItem(g, cat, item)) : unownItem(g, cat, item));
/** "Use this one for sure": independent of owned and in use (P8). */
export const setLock = (S: TankSetup, cat: CatId, item: string, on: boolean): void => editGear(S, g => on ? (isLockedItem(g, cat, item) ? g : lockItem(g, cat, item)) : unlockItem(g, cat, item));

/** Every category's lock and owned counts, for the chips' small marks. */
export function marks(S: TankSetup): Record<string, { owned: number; locked: number }> {
  const g: GearModel = gearOfTank(S);
  return Object.fromEntries(Object.entries(g).map(([c, v]) => [c, { owned: v.owned.length, locked: v.locked.length }]));
}
/** The group's one-line summary. */
export const ownSum = (n: number) => (n ? `$0, the planner prefers these when they fit` : 'nothing yet');

// ---------------------------------------------------------------- the canister's return hose (lane IL1)

export interface ReturnItem { id: string; name: string; kind: string; price: string; flow: string; shows: string; warn?: string }
export interface ReturnOption { kind: string; label: string; rows: { id: string; name: string; sub: string; price: string; shows: string }[] }
export interface ReturnView { hose: string; items: ReturnItem[]; delivered: string; options: ReturnOption[]; outlet: 'lily' | 'spraybar' | 'nozzle' }
/** What sits on the canister's return hose and what could be added (only what fits the hose). Undefined without a canister. */
export function returnView(S: TankSetup): ReturnView | undefined {
  const t = techOf(S), d = deliveredFlow(S, t); if (!d) return undefined;
  const px = (p: { priceUsd?: number; est?: string[] }) => p.priceUsd ? `${p.est?.includes('priceUsd') ? '~' : ''}${usd(p.priceUsd)}` : '';
  const shows = (p: { kind: InlineKind; mistVisible: boolean }) => p.kind === 'heater' ? 'out of sight' : p.mistVisible ? 'fine mist visible in the tank' : 'no bubbles in the tank';
  const items = d.items.map((p): ReturnItem => ({ id: p.id, name: productName(p), kind: inlineKinds[p.kind], price: px(p), shows: shows(p), flow: `-${p.flowLossPct}% flow${p.est?.includes('flowLossPct') ? ' (est.)' : ''}`,
    ...(p.minFlowGph > d.delivered ? { warn: `needs ${p.minFlowGph}+ gph, the canister gives ${Math.round(d.delivered)}` } : {}) }));
  const on = new Set(d.items.map(p => p.id)), fit = inlineFor(d.hoseIn).filter(p => !on.has(p.id));
  const options = (['heater', 'diffuser', 'reactor'] as const).map((k): ReturnOption => ({ kind: k, label: inlineKinds[k], rows: fit.filter(p => p.kind === k).map(p => ({ id: p.id, name: productName(p), sub: `${p.watts ? `${p.watts} W · ` : ''}-${p.flowLossPct}% flow`, price: px(p), shows: shows(p) })) })).filter(o => o.rows.length);
  return { hose: hoseLabel(d.hoseIn), items, delivered: `${Math.round(d.delivered)} of ${Math.round(d.rated)} gph delivered`, options, outlet: t.returnOutlet ?? 'lily' };
}
export const addInline = (S: TankSetup, id: string): void => commitTech(S, s => addReturnInline(s, id));
export const removeInline = (S: TankSetup, id: string): void => commitTech(S, s => removeReturnInline(s, id));
/** The canister's outlet in the tank: lily pipe, spray bar or nozzle (scene/flow.ts: it sets the current plants and fish feel). */
export const setOutlet = (S: TankSetup, kind: 'lily' | 'spraybar' | 'nozzle'): void => commitTech(S, s => setReturnOutlet(s, kind));
/** The air pump's valve (Nathan 2026-11-27), 0..1. */
export const setValve = (S: TankSetup, v: number): void => commitTech(S, s => setAirValve(s, v));
/** The air valve card: null when nothing in the tank runs on air (no airstone, no sponge filter). */
export function airView(S: TankSetup): { valve: number; columns: string; stone: boolean; sponges: number } | null {
  if (!S.tech || !S.water.on) return null;
  const t = techOf(S), stone = t.rows.air === 'airstone', sponges = filterUnits(t).filter(u => u.kind === 'sponge').length;
  if (!stone && !sponges) return null;
  const parts = [stone ? 'the airstone' : '', sponges ? (sponges > 1 ? `${sponges} sponge filters` : 'the sponge filter') : ''].filter(Boolean);
  return { valve: airValveOf(t), columns: parts.join(' and '), stone, sponges };
}
