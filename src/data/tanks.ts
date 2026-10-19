// Tank catalog (lane KA, 2026-10-19): real aquarium sizes, nano to monster, plus the terrarium presets. OUTER dimensions
// (what people measure and what the label says) are the source of truth; the app's Tank is INTERIOR mm with glass added outside,
// so `tankFromModel` derives the interior once. Data in tanks.json; the check is scripts/check-tanks.mjs + test/tanks.test.ts.
import type { Tank, TankShape } from '../scene/types';
import { glassThickness, IN, volume } from '../scene/physics';
import { normTank, offsetRing } from '../scene/shape';
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
  price_note?: string;
  discontinued?: boolean;
  url?: string;
  checked?: string;
  confidence?: 'high' | 'medium' | 'low';
}

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

/** Outer extents (mm) of an interior tank with glass `g` on every side: the offset outline's box and interior height plus the bottom pane. */
export function outerOf(T: Tank, g: number): Outer {
  const r = offsetRing(T, g), ext = (k: 0 | 1) => Math.max(...r.map(p => p[k])) - Math.min(...r.map(p => p[k]));
  return { L: ext(0), H: T.H + g, D: ext(1) };
}

interface OuterSpec { shape?: TankShape; sides?: number; bowMin?: number; pieDeg?: number; outer: Outer }

/** Interior Tank from outer dimensions and a known glass thickness (mm). Exact for rectangles; shapes with slanted or curved panes
 * converge in a few steps of correcting the interior by the outer error. */
function solveInterior(m: OuterSpec, g: number): Tank {
  const o = m.outer, shape = m.shape ?? 'rect';
  let T: Tank = normTank({ L: o.L - 2 * g, H: o.H - g, D: o.D - 2 * g, shape, sides: m.sides, pieDeg: m.pieDeg, bowMin: m.bowMin == null ? undefined : m.bowMin - 2 * g });
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
export function modelOfVariant(m: TankModel, v: TankVariant): TankModel {
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
