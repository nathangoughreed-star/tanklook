// Lane TP1 (R109, 2026-11-17): filters and sort for the picker's commercial list. Pure: no DOM. The picker (shell/tank.tsx) draws the controls,
// commercialRows (logic/tank.ts) applies them. Sizes are OUTER inches as sold, whatever units the person reads (the UI converts).
import { pickRimless } from '../../data/tanks';
import { isBundle, type DockOpt } from '../../ui/tankDockLogic';

export type Rim = 'any' | 'rimmed' | 'rimless';
export type Mat = 'any' | 'glass' | 'acrylic';
export type Build = 'any' | 'kit' | 'tank';
export type ShapeClass = 'rect' | 'cube' | 'bow' | 'column' | 'corner' | 'round' | 'other';
export const SHAPE_CLASSES: [ShapeClass, string][] = [['rect', 'Rectangle'], ['cube', 'Cube'], ['bow', 'Bowfront'], ['column', 'Column'], ['corner', 'Corner'], ['round', 'Round / bowl'], ['other', 'Other']];
export type SortKey = 'default' | 'price-asc' | 'price-desc' | 'gal-asc' | 'gal-desc' | 'len-asc' | 'len-desc' | 'name';
export const SORTS: [SortKey, string][] = [['default', 'Size, then maker'], ['price-asc', 'Price, low to high'], ['price-desc', 'Price, high to low'], ['gal-asc', 'Gallons, small to large'], ['gal-desc', 'Gallons, large to small'], ['len-asc', 'Length, short to long'], ['len-desc', 'Length, long to short'], ['name', 'Name, A to Z']];
/** A min / max pair; either end may be open. */
export type Range = [number | null, number | null];

export interface TankFilter {
  gal: Range; L: Range; D: Range; H: Range; price: Range;
  rim: Rim; mat: Mat; build: Build;
  shapes: ShapeClass[]; brands: string[];
  sort: SortKey;
}
export const NO_FILTER: TankFilter = { gal: [null, null], L: [null, null], D: [null, null], H: [null, null], price: [null, null], rim: 'any', mat: 'any', build: 'any', shapes: [], brands: [], sort: 'default' };
export const freshFilter = (): TankFilter => structuredClone(NO_FILTER);

export interface Facts { gal: number; L: number; D: number; H: number; price?: number; rimless: boolean; acrylic: boolean; shape: ShapeClass; brand: string; kit: boolean; name: string }
const ACRYLIC = /acryl|\bpmma\b|plexi/i;
export function shapeClass(o: DockOpt): ShapeClass {
  const m = o.m, tags = m.tags ?? [];
  if (m.shape === 'bow') return 'bow';
  if (m.shape === 'bowl' || m.shape === 'round') return 'round';
  if (m.shape === 'rect') {
    if (tags.includes('corner')) return 'corner';
    const L = o.v ? o.v.L_in : m.outer.L / 25.4, D = o.v ? o.v.D_in : m.outer.D / 25.4, H = o.v ? o.v.H_in : m.outer.H / 25.4;
    if (H >= 1.6 * Math.max(L, D) && H >= 30) return 'column';
    if (tags.includes('cube') || (Math.abs(L - D) <= 0.1 * L && Math.abs(L - H) <= 0.12 * L)) return 'cube';
    return 'rect';
  }
  return 'other';
}
export function factsOf(o: DockOpt): Facts {
  const v = o.v, m = o.m;
  return {
    gal: o.gal, L: v ? v.L_in : m.outer.L / 25.4, D: v ? v.D_in : m.outer.D / 25.4, H: v ? v.H_in : m.outer.H / 25.4,
    ...(o.usd != null ? { price: o.usd } : {}), rimless: !!pickRimless(m, v),
    acrylic: ACRYLIC.test(`${o.name} ${v?.brand ?? ''} ${v?.line ?? ''} ${m.name}`), shape: shapeClass(o), brand: v?.brand ?? '', kit: !!v && isBundle(v), name: o.name,
  };
}

const inRange = (x: number | undefined, r: Range) => (r[0] == null && r[1] == null) || (x != null && (r[0] == null || x >= r[0] - 1e-9) && (r[1] == null || x <= r[1] + 1e-9));
/** Does one tank pass every set filter? An unset filter never excludes; a price filter drops tanks with no known price. */
export function passes(f: Facts, t: TankFilter): boolean {
  return inRange(f.gal, t.gal) && inRange(f.L, t.L) && inRange(f.D, t.D) && inRange(f.H, t.H) && inRange(f.price, t.price)
    && (t.rim === 'any' || (t.rim === 'rimless') === f.rimless) && (t.mat === 'any' || (t.mat === 'acrylic') === f.acrylic)
    && (t.build === 'any' || (t.build === 'kit') === f.kit) && (!t.shapes.length || t.shapes.includes(f.shape)) && (!t.brands.length || t.brands.includes(f.brand));
}
/** How many filters are set (the phone's "Filters (n)"); sort does not count. */
export function activeCount(t: TankFilter): number {
  return [t.gal, t.L, t.D, t.H, t.price].filter(r => r[0] != null || r[1] != null).length + (t.rim !== 'any' ? 1 : 0) + (t.mat !== 'any' ? 1 : 0) + (t.build !== 'any' ? 1 : 0) + (t.shapes.length ? 1 : 0) + (t.brands.length ? 1 : 0);
}
/** Sorted copy: 'default' keeps the catalogue order; a tank with no price sorts last either way. */
export function sortRows<T>(rows: readonly T[], key: SortKey, facts: (r: T) => Facts): T[] {
  const out = [...rows];
  if (key === 'default') return out;
  if (key === 'name') return out.sort((a, b) => facts(a).name.localeCompare(facts(b).name, 'en', { numeric: true }));
  const pick = (f: Facts) => key.startsWith('price') ? f.price : key.startsWith('gal') ? f.gal : f.L, dir = key.endsWith('desc') ? -1 : 1;
  return out.sort((a, b) => { const x = pick(facts(a)), y = pick(facts(b)); if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1; return (x - y) * dir; });
}
/** The makers present in a list of tanks, most tanks first (the brand picker's options). Generic sizes have no maker. */
export function brandList(opts: readonly DockOpt[]): [string, number][] {
  const n = new Map<string, number>();
  for (const o of opts) { const b = o.v?.brand; if (b) n.set(b, (n.get(b) ?? 0) + 1); }
  return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// ---- the picture of a row: tiles are baked by LOOK (shape, rim, size to the nearest step), so rows that look alike share one file
/** The picture is framed to fill its tile, so only the SHAPE of a tank shows: rim, shape and the length / depth to height proportions (in ~15% steps). */
const ratio = (x: number) => Math.round(100 * Math.exp(Math.round(Math.log(Math.max(0.05, x)) / 0.15) * 0.15));
export interface TileSpec { key: string; shape: ShapeClass; rimless: boolean; l: number; d: number }
export function tileOf(o: DockOpt): TileSpec {
  const f = factsOf(o), l = ratio(f.L / f.H), d = ratio(f.D / f.H), rimless = f.rimless;
  return { key: `${f.shape}-${rimless ? 'n' : 'r'}-${l}x${d}`, shape: f.shape, rimless, l, d };
}
// ---- remembered per browser
const KEY = 'tanklook.ui2.tankfilter';
type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };
const ls = (): KV | undefined => { try { return typeof localStorage !== 'undefined' ? localStorage : undefined; } catch { return undefined; } };
const rng = (r: unknown): Range => Array.isArray(r) && r.length === 2 ? [typeof r[0] === 'number' ? r[0] : null, typeof r[1] === 'number' ? r[1] : null] : [null, null];
export function loadFilter(store: KV | undefined = ls()): TankFilter {
  try {
    const j = JSON.parse(store?.getItem(KEY) ?? 'null'); if (!j || typeof j !== 'object') return freshFilter();
    const pickOf = <T extends string>(v: unknown, all: readonly T[], d: T): T => all.includes(v as T) ? v as T : d;
    return { gal: rng(j.gal), L: rng(j.L), D: rng(j.D), H: rng(j.H), price: rng(j.price), rim: pickOf(j.rim, ['any', 'rimmed', 'rimless'], 'any'), mat: pickOf(j.mat, ['any', 'glass', 'acrylic'], 'any'),
      build: pickOf(j.build, ['any', 'kit', 'tank'], 'any'), shapes: Array.isArray(j.shapes) ? j.shapes.filter((s: unknown) => SHAPE_CLASSES.some(c => c[0] === s)) : [],
      brands: Array.isArray(j.brands) ? j.brands.filter((s: unknown) => typeof s === 'string') : [], sort: pickOf(j.sort, SORTS.map(s => s[0]), 'default') };
  } catch { return freshFilter(); }
}
export function saveFilter(t: TankFilter, store: KV | undefined = ls()): void { try { store?.setItem(KEY, JSON.stringify(t)); } catch { /* blocked storage: forget */ } }
