// Tank catalog (lane KA, 2026-10-19): real aquarium sizes, nano to monster, plus the terrarium presets. OUTER dimensions
// (what people measure and what the label says) are the source of truth; the app's Tank is INTERIOR mm with glass added outside,
// so `tankFromModel` derives the interior once. Data in tanks.json; the check is scripts/check-tanks.mjs + test/tanks.test.ts.
import type { LidType, Tank, TankShape } from '../scene/types';
import { glassThickness, IN, volume } from '../scene/physics';
import { archBulge, normTank, offsetRing } from '../scene/shape';
import data from './tanks.json';

export type TankBand = 'nano' | 'small' | 'mid' | 'large' | 'monster';
export const BANDS: [TankBand, string][] = [['nano', 'Nano (under 15 gal)'], ['small', 'Small (15-39 gal)'], ['mid', 'Mid (40-74 gal)'], ['large', 'Large (75-124 gal)'], ['monster', 'Monster (125 gal and up)']];
/** Band by rated gallons: under 15 / 15-39 / 40-74 / 75-124 / 125 and up. */
export const bandOf = (gal: number): TankBand => (gal < 15 ? 'nano' : gal < 40 ? 'small' : gal < 75 ? 'mid' : gal < 125 ? 'large' : 'monster');

export interface Outer { L: number; H: number; D: number }
/** One real product at a catalog size: a maker's own outer size (often a little off the generic one) and typical new US price. */
export interface TankVariant {
  brand: string;
  line?: string;
  /** Outer inches as sold (glass included). */
  L_in: number; D_in: number; H_in: number;
  glass_mm?: number | null;
  rimless?: boolean;
  price_usd?: number | null;
  /** 'msrp' | 'street' | 'kit' (kit includes stand / light / filter). */
  price_kind?: string;
  /** On sale: `price_usd` is the sale price and this is the list price the page shows struck through. */
  regular_usd?: number;
  /** ISO date the sale ends, when the page says. */
  sale_ends?: string;
  /** The retailer the price was read at (for "on sale at PetSmart"). */
  retailer?: string;
  price_note?: string;
  /** An all-in-one that only runs on its own gear (data/kits.json record `kit`): picking it applies that kit and locks what it supplies (scene/integrated.ts). */
  kit?: string;
  /** What the product is sold with (S233b, Nathan 2026-10-26: "Exactly what it comes with is important to figure out for every
   *  commercial tank"). A key left out = not recorded; false / 'none' = sold without it. A variant with `kit` takes this from its
   *  kits.json record unless it sets its own. What it includes is held like the rim (scene/integrated.ts); the rest is free. */
  includes?: Includes;
  discontinued?: boolean;
  url?: string;
  checked?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface Includes { lid?: LidType | 'none'; light?: boolean; filter?: boolean; heater?: boolean; stand?: boolean }

export interface TankModel {
  id: string;
  name: string;
  /** What the label says (US gallons). */
  ratedGal: number;
  shape: TankShape;
  sides?: number;
  /** bow: depth at the ends, OUTER mm. */
  bowMin?: number;
  pieDeg?: number;
  /** arch (front pane curved top to bottom): how far the front bulges out of the frame line at mid-height, mm. */
  frontBulge?: number;
  /** Outer size in mm as sold (glass included). Pie: L is the width across the chord and D the radius, both outside. */
  outer: Outer;
  glassMm: number;
  rimless?: boolean;
  band: TankBand;
  /** A dry vivarium preset (listed last in the picker). */
  terrarium?: boolean;
  tags?: string[];
  /** Where the size came from, or 'estimate' when no maker listing was checked. */
  source: string;
  note?: string;
  /** Real products at this size (research/tanks merged in); absent = only the generic size is known. */
  variants?: TankVariant[];
}

export const TANK_MODELS = (data as { tanks: TankModel[] }).tanks;
export const getTankModel = (id: string) => TANK_MODELS.find(m => m.id === id);

/** A sale counts while its page was read in the last SALE_DAYS days and its end date, when given, has not passed (S224, Nathan
 *  2026-10-26: prices are kept by a sweep that re-reads the pages; a sale nobody has seen lately falls back to the list price). */
export const SALE_DAYS = 30;
export function saleLive(v: TankVariant, now = Date.now()): boolean {
  if (v.price_usd == null || !v.regular_usd || v.regular_usd <= v.price_usd || !v.checked) return false;
  const age = now - Date.parse(v.checked);
  return age >= 0 && age <= SALE_DAYS * 864e5 && !(v.sale_ends && Date.parse(v.sale_ends + 'T23:59:59') < now);
}
/** What the product costs now: the sale price while the sale is live, else the list price. */
export const variantUsd = (v: TankVariant, now = Date.now()): number | undefined => (v.regular_usd && !saleLive(v, now) ? v.regular_usd : v.price_usd ?? undefined);

export interface TankSale { usd: number; regularUsd: number; retailer: string; product: string; saleEnds?: string; checked: string }
/** The cheapest bare glass tank on sale now at about this size and shape (rated gallons within `tol`), read from a retailer
 *  page in the last 30 days and not past its sale end. Undefined when none is known. Kits, acrylic and terrariums are left out. */
export function tankSaleFor(gal: number, shape: TankShape = 'rect', now = Date.now(), tol = 2.5, models: TankModel[] = TANK_MODELS, dims?: { L: number; D: number; H: number }): TankSale | undefined {
  let best: TankSale | undefined;
  // with the build's interior size, match by footprint (a 75 measures 79 gal inside, a 40 breeder is not a 37)
  const near = (m: TankModel) => {
    if (!dims) return Math.abs(m.ratedGal - gal) <= tol;
    const t = tankFromModel(m), r = (a: number, b: number) => Math.abs(a / b - 1);
    return r(t.L, dims.L) <= 0.1 && r(t.D, dims.D) <= 0.15 && r(t.H, dims.H) <= 0.2;
  };
  for (const m of models) {
    if (m.terrarium || m.shape !== shape || !near(m)) continue;
    for (const v of m.variants ?? []) {
      if (!saleLive(v, now) || v.price_kind === 'kit' || v.discontinued) continue;
      if (/acrylic/i.test(`${v.line ?? ''} ${v.price_note ?? ''}`)) continue;
      if (!best || v.price_usd! < best.usd) best = { usd: v.price_usd!, regularUsd: v.regular_usd!, retailer: v.retailer ?? 'a retailer', product: `${v.brand}${v.line ? ' ' + v.line : ''}`, saleEnds: v.sale_ends, checked: v.checked! };
    }
  }
  return best;
}

/** Outer extents (mm) of an interior tank with glass `g` on every side: the offset outline's box and interior height plus the bottom pane. */
export function outerOf(T: Tank, g: number): Outer {
  const r = offsetRing(T, g), ext = (k: 0 | 1) => Math.max(...r.map(p => p[k])) - Math.min(...r.map(p => p[k]));
  return { L: ext(0), H: T.H + g, D: ext(1) + archBulge(T) }; // an arch's front bulges past its frame line
}

interface OuterSpec { shape?: TankShape; sides?: number; bowMin?: number; pieDeg?: number; frontBulge?: number; outer: Outer }

/** Interior Tank from outer dimensions and a known glass thickness (mm). Exact for rectangles; shapes with slanted or curved panes
 * converge in a few steps of correcting the interior by the outer error. */
function solveInterior(m: OuterSpec, g: number): Tank {
  const o = m.outer, shape = m.shape ?? 'rect';
  let T: Tank = normTank({ L: o.L - 2 * g, H: o.H - g, D: o.D - 2 * g, shape, sides: m.sides, pieDeg: m.pieDeg, frontBulge: m.frontBulge, bowMin: m.bowMin == null ? undefined : m.bowMin - 2 * g });
  if (shape === 'rect') return T;
  for (let i = 0; i < 8; i++) {
    const e = outerOf(T, g), dL = o.L - e.L, dD = o.D - e.D;
    if (Math.abs(dL) < 0.01 && Math.abs(dD) < 0.01) break;
    // pie: L follows its radius D; round: D follows L; poly: D follows L; bow and rect: both free
    const free = shape === 'pie' ? { D: T.D + dD } : shape === 'round' || shape === 'poly' ? { L: T.L + dL } : { L: T.L + dL, D: T.D + dD };
    T = normTank({ ...T, ...free });
  }
  return { ...T, L: +T.L.toFixed(2), D: +T.D.toFixed(2) };
}

/** The app's interior Tank for a catalog entry, and the glass thickness (mm) to set on the scene so the outside matches the label. */
export function tankFromModel(m: TankModel): Tank { return solveInterior(m, m.glassMm); }

/** A custom tank typed in OUTER dimensions. glass 'auto' solves the app's height-based glass thickness (a 2-3 step fixed point). */
export function tankFromOuter(m: OuterSpec, glass: number | 'auto' = 'auto'): { tank: Tank; glass: number } {
  if (glass !== 'auto') return { tank: solveInterior(m, glass), glass };
  let g = 5, T = solveInterior(m, g);
  for (let i = 0; i < 6; i++) {
    const g2 = glassThickness(T, 'auto');
    if (g2 === g) break;
    g = g2; T = solveInterior(m, g);
  }
  return { tank: T, glass: g };
}

/** The catalog entry re-sized to one maker's variant (outer dims and glass from that product), for tankFromModel. */
export function modelOfVariant(m: TankModel, v: Pick<TankVariant, 'L_in' | 'D_in' | 'H_in' | 'glass_mm'>): TankModel {
  return { ...m, outer: { L: v.L_in * IN, D: v.D_in * IN, H: v.H_in * IN }, glassMm: v.glass_mm ?? m.glassMm };
}
export const dimsInches = (o: Outer) => `${+(o.L / IN).toFixed(1)}×${+(o.D / IN).toFixed(1)}×${+(o.H / IN).toFixed(1)}`;

/** One choice for the tank picker: a group heading plus its entries, in display order. */
export interface TankChoice { value: string; label: string; group: string; model: TankModel }
const dimsIn = (o: Outer) => `${+(o.L / IN).toFixed(1)}×${+(o.D / IN).toFixed(1)}×${+(o.H / IN).toFixed(1)}`;
/** The catalog as picker choices: one group per band (nano first), terrariums last. The seam the guided-start wizard calls too. */
export function tankChoices(opts: { terrariums?: boolean } = {}): TankChoice[] {
  const out: TankChoice[] = [];
  for (const [b, title] of BANDS) for (const m of TANK_MODELS) if (!m.terrarium && m.band === b) out.push({ value: m.id, label: `${m.name} ${dimsIn(m.outer)} in`, group: title, model: m });
  if (opts.terrariums !== false) for (const m of TANK_MODELS) if (m.terrarium) out.push({ value: m.id, label: `${m.name} ${dimsIn(m.outer)} in`, group: 'Terrariums', model: m });
  return out;
}

/** Catalog volume in US gallons from the derived interior (what the check compares with ratedGal). */
export const modelGallons = (m: TankModel) => volume(tankFromModel(m)).gallons;

/** Rimless when the product says so (a variant's own flag wins over its size's). */
export const pickRimless = (m: TankModel, v?: TankVariant) => !!(v ? v.rimless ?? m.rimless : m.rimless);
/** A product's key within its size: maker, line, outer inches and retailer (stable when products are added; an index is not). */
export const variantKey = (v: TankVariant) => [v.brand, v.line ?? '', `${v.L_in}x${v.D_in}x${v.H_in}`, v.retailer ?? ''].join('|');
export const variantByKey = (m: TankModel, key: string) => m.variants?.find(v => variantKey(v) === key);
/** "Imagitarium (Petco) Open-Glass Rimless 10 gal": the maker and line as the listing names them. */
export const variantName = (v: TankVariant) => `${v.brand}${v.line ? ' ' + v.line : ''}`;
/** A size named after one maker's product ("Fluval Flex 9 (curved front)"), not a generic catalogue size: the panel names it as itself,
 *  not "standard ...", and picking its row picks its product when it has only one (soleProduct). */
export const namedModel = (m: TankModel) => !!m.variants?.some(v => m.name.toLowerCase().startsWith(v.brand.toLowerCase().split(' ')[0]));
/** A size named after one product with only that product under it: picking the size is picking the product. */
export const soleProduct = (m: TankModel) => (namedModel(m) && m.variants?.length === 1 ? m.variants[0] : undefined);
