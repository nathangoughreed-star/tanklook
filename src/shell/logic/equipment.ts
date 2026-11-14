// UI2 shell step 6 (lane S6, 2026-11-14): the Equipment section's view-models and edits (screen map §2a "Section Equipment").
// Per category two groups: "I own" (the owned list, $0, not necessarily in use) and "Buy" (catalogue products that fit this tank), the item
// in use marked, and an independent "Use this one for sure" lock per item. Pure: no DOM. Engine calls go only through scene/techEdit.ts (P4),
// scene/gearOwn.ts (P8) and src/units.ts; the catalogue lists are read from data/gearCatalog.ts and data/hoods.ts.
import { commitTech, withTech, addHeater, pickHeaterProduct, tuneHeater, addFilter, pickFilterProduct, tuneFilter, setPump, setRowProduct, pickLightProduct, tuneLight, pickPreset } from '../../scene/techEdit';
import { editGear, gearOfTank, GENERIC, isLockedItem, isOwned, lockItem, ownItem, ownedFor, setInUse, unlockItem, unownItem, type GearModel } from '../../scene/gearOwn';
import { filterUnits, heatLoss, heaterUnits, presetsFor, roomOf, rowsFor, techOf, withChoice } from '../../scene/tech';
import {
  FILTER_PRODUCTS, HEATER_PRODUCTS, REEF_ROWS, filterProduct, heaterProduct, lightProduct, lightsFor, listedPrice, productName, pumpProduct, pumpRatedFor, pumpsFor,
  reefOptionProducts, reefProduct, skimmerSuitsGal, type SkimmerProduct, type ChillerProduct, type UvProduct,
} from '../../data/gearCatalog';
import { hoodProduct, hoodsFor, lightIsHoods, hoodOf } from '../../data/hoods';
import { volume } from '../../scene/physics';
import { fmtTempHalf } from '../../units';
import type { Tone } from './checks';
import type { Scene, TankSetup } from '../../scene/types';

type Units = Scene['units'];
export type { GearModel };

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const galOf = (S: TankSetup) => volume(S.tank).gallons;
const galText = (g: number) => `${g < 10 ? +g.toFixed(1) : Math.round(g)} gal`;

// ---------------------------------------------------------------- categories

/** The category ids the screen offers, in chip order. Light, filter and heater always; the rest when the tank's tech rows have them and the catalogue holds products. */
const ORDER = ['filter', 'heater', 'light', 'co2', 'air', 'uv', 'skimmer', 'chiller', 'ato', 'flow', 'surfskim'] as const;
export type CatId = (typeof ORDER)[number];
const LABEL: Record<CatId, string> = { filter: 'Filter', heater: 'Heater', light: 'Light', co2: 'CO2', air: 'Air', uv: 'UV', skimmer: 'Skimmer', chiller: 'Chiller', ato: 'Top-off', flow: 'Flow', surfskim: 'Surface skimmer' };
const SINGULAR: Record<CatId, string> = { filter: 'filter', heater: 'heater', light: 'light', co2: 'CO2 kit', air: 'air pump', uv: 'UV sterilizer', skimmer: 'skimmer', chiller: 'chiller', ato: 'auto top-off', flow: 'powerhead', surfskim: 'surface skimmer' };
export const catLabel = (c: string) => LABEL[c as CatId] ?? c;
export const isCat = (c: string): c is CatId => (ORDER as readonly string[]).includes(c);

export function categories(S: TankSetup): { id: CatId; label: string }[] {
  const have = new Set(rowsFor(S).map(r => r.id));
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
}
interface Entry { item: string; name: string; sub: string; usd?: number; est?: boolean; fit: Fit | null; rank: number; hood?: boolean }

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
const kindWord: Record<string, string> = { hob: 'hang-on-back', canister: 'canister', internal: 'internal', sponge: 'sponge', sump: 'in-sump', surface: 'surface', fan: 'fan', compressor: 'compressor', inline: 'inline', regulator: 'regulator', cartridge: 'cartridge kit', diy: 'DIY yeast', air: 'air pump', powerhead: 'powerhead', wavemaker: 'wavemaker' };
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
        return { item: h.id, name: productName(h), sub: `${h.watts} W · ${h.look} · ${cm(h.lengthMm)}`, ...price(h), fit, rank: rank(fit) + Math.abs(Math.log(h.watts / Math.max(need, 1))) * 0.1 };
      });
    }
    case 'filter':
      return FILTER_PRODUCTS.map(f => { const fit = ratedFit(gal, f.galMin, f.galMax); return { item: f.id, name: productName(f), sub: `${kindWord[f.kind]}${f.gph ? ` · ${f.gph} gph` : ''}${f.galMin !== undefined || f.galMax !== undefined ? ` · ${f.galMin ?? '?'}-${f.galMax ?? '?'} gal` : ''}`, ...price(f), fit, rank: rank(fit) }; });
    case 'light': {
      const lights = lightsFor(L).map((p): Entry => ({ item: p.id, name: productName(p), sub: `${p.watts} W · ${p.tech.replace('led-', 'LED ')} · ${p.mount === 'bar' ? 'bar' : p.mount === 'rim-legs' ? 'on legs' : p.mount === 'gooseneck' ? 'clamp-on' : p.mount === 'hanging' ? 'hanging' : 'submersible'}`, ...price(p), fit: { tone: 'ok', text: `fits a ${cm(L)} tank` }, rank: 0.2 }));
      const hoods = hoodsFor(S.tank).map((h): Entry => ({ item: h.id, name: productName(h), sub: `hood · ${h.light.watts} W ${h.light.type === 'led' ? 'LED' : h.light.tech} built in`, usd: h.priceUsd, est: h.est.includes('priceUsd'), fit: { tone: 'ok', text: 'light included, one price' }, rank: 0, hood: true }));
      return [...hoods, ...lights];
    }
    case 'air': case 'flow':
      return pumpsFor(cat === 'air' ? 'airpump' : 'powerhead', gal).map(p => { const r = pumpRatedFor(p, gal); const fit: Fit | null = r === undefined ? null : r ? { tone: 'ok', text: `rated for ${galText(gal)}` } : { tone: 'warn', text: `not rated for ${galText(gal)}` }; return { item: p.id, name: productName(p), sub: `${kindWord[p.kind]}${p.gph ? ` · ${p.gph} gph` : p.airGph ? ` · ${p.airGph} gph air` : ''} · ${p.watts} W`, ...price(p), fit, rank: rank(fit) }; });
    default:
      return (REEF_ROWS[cat] ?? []).map(p => {
        const k = (p as { kind?: string }).kind;
        let fit: Fit | null = null, facts = k ? kindWord[k] ?? k : '';
        if (cat === 'skimmer' || cat === 'surfskim') { const s = skimmerSuitsGal(p as SkimmerProduct); fit = s === undefined ? null : s >= gal * 0.85 ? { tone: 'ok', text: `suits ${galText(gal)}` } : { tone: 'warn', text: `too small for ${galText(gal)}` }; }
        else if (cat === 'chiller') { const s = (p as ChillerProduct).suitsGal ?? (p as ChillerProduct).ratedGal; fit = s === undefined ? null : s >= gal * 0.85 ? { tone: 'ok', text: `suits ${galText(gal)}` } : { tone: 'warn', text: `too small for ${galText(gal)}` }; }
        else if (cat === 'uv') fit = ratedFit(gal, (p as UvProduct).galMin, (p as UvProduct).galMax);
        if (p.watts) facts += `${facts ? ' · ' : ''}${p.watts} W`;
        return { item: p.id, name: productName(p), sub: facts || 'catalogue product', ...price(p), fit, rank: rank(fit) };
      });
  }
}

/** A name for any item id a category can hold: a product's, "Generic <thing>", or the id itself (an owned-sheet answer). */
export function itemName(cat: string, item: string): string {
  if (item === GENERIC) return `Generic ${SINGULAR[cat as CatId] ?? cat}`;
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
}
const priceText = (e: Pick<Entry, 'usd' | 'est'> | undefined) => !e || e.usd === undefined ? '' : `${e.est ? '~' : ''}${usd(e.usd)}`;

export function categoryView(S: TankSetup, cat: CatId, units: Units, o: { showAll?: boolean; limit?: number } = {}): CategoryView {
  const g = gearOfTank(S), inUse = inUseItem(S, cat), list = catalogue(S, cat, units);
  const row = (item: string, e: Entry | undefined, own: boolean): GearRow => ({
    cat, item, name: e?.name ?? itemName(cat, item), sub: e?.sub ?? (item === GENERIC ? 'any brand' : ''),
    price: own ? 'Owned · $0' : priceText(e), fit: e?.fit ?? null, owned: own, inUse: inUse === item, locked: isLockedItem(g, cat, item), ...(e?.hood ? { hood: true } : {}),
  });
  const ownedRows = ownedFor(g, cat).map(it => row(it, list.find(x => x.item === it), true));
  const own = new Set(ownedFor(g, cat));
  const sorted = list.filter(e => !own.has(e.item)).sort((a, b) => a.rank - b.rank || (a.usd ?? 1e9) - (b.usd ?? 1e9));
  // the item in use (bought) stays on top of Buy even when it would be cut off; a locked one too
  const pinned = sorted.filter(e => e.item === inUse || isLockedItem(g, cat, e.item));
  const limit = o.limit ?? 4, shown = o.showAll ? sorted : [...pinned, ...sorted.filter(e => !pinned.includes(e))].slice(0, Math.max(limit, pinned.length));
  const buy = shown.map(e => row(e.item, e, false));
  if (cat === 'heater' || cat === 'filter' || cat === 'light') buy.push(row(GENERIC, undefined, false));
  let note = '';
  if (cat === 'heater') {
    const h = heatLoss(S), r = roomOf(S);
    note = `${galText(galOf(S))} at ${fmtTempHalf(h.targetC, units)}, room ${fmtTempHalf(r.c, units)}${r.set ? '' : ' (assumed)'}: needs about ${Math.round(h.needW)} W.`;
  } else if (cat === 'light') note = S.lid === 'hood' ? 'The hood holds its own light: pick a hood to change it, or a light product to put the hood away.' : `${list.filter(e => !e.hood).length} lights fit a ${units === 'in' ? Math.round(S.tank.L / 25.4) + ' in' : Math.round(S.tank.L / 10) + ' cm'} tank.`;
  return { id: cat, label: LABEL[cat], singular: SINGULAR[cat], note, owned: ownedRows, buy, buyTotal: sorted.length + (cat === 'heater' || cat === 'filter' || cat === 'light' ? 1 : 0), roomLink: cat === 'heater', inUse };
}

// ---------------------------------------------------------------- edits (the caller wraps each in store.edit: one undo step)

/** "Use": put the item on the design, and record it as the category's item in use. */
export function useItem(S: TankSetup, cat: CatId, item: string): void {
  const hood = hoodProduct(item);
  switch (cat) {
    case 'heater':
      commitTech(S, s => item === GENERIC ? (heaterUnits(techOf(s)).length ? tuneHeater(s, 0) : addHeater(s)) : heaterUnits(techOf(s)).length ? pickHeaterProduct(s, 0, item) : addHeater(s, item));
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
      }
      break;
    case 'air': case 'flow': {
      const gear = cat === 'air' ? 'airpump' : 'powerhead', opt = cat === 'air' ? 'airstone' : 'one';
      commitTech(S, s => { const t = (techOf(s).rows[cat] ?? 'none') === 'none' ? withChoice(s, cat, opt) : techOf(s); return setPump(withTech(s, t), gear, item); });
      break;
    }
    default: {
      const opt = optionFor(cat, item);
      if (opt) commitTech(S, s => { const t = withChoice(s, cat, opt); return setRowProduct(withTech(s, t), cat, item); });
    }
  }
  editGear(S, g => setInUse(g, cat, item));
}
/** The Tech option a reef / planted product belongs to (the row it fills when "Use" turns the row on). */
function optionFor(row: string, id: string): string | undefined {
  const opts: Record<string, string[]> = { skimmer: ['hob', 'sump'], surfskim: ['surface'], uv: ['uv'], co2: ['pressurized', 'cartridge', 'diy'], ato: ['ato'], chiller: ['fan', 'chiller'] };
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
