// Stands as real products (lane SP1, Nathan 2026-11-16: "is that stand priced accurately to a real product?" "Yes, real stands").
// Data: src/data/gear/stands.json (brand, line, kind = cabinet | frame, finish, the tank footprints it is sold for, height, price + seller + dated URL).
// A stand fits a plain rectangular tank whose outside footprint is within 1.5 in (length) and 1.3 in (depth) of one of its footprints.
// No fitting product (a custom size, another shape): the engine keeps the generic by-gallons estimate and says so.
import standData from './gear/stands.json';
import type { StandFinish, Tank, TankSetup } from '../scene/types';
import { shapeOf } from '../scene/shape';

export interface StandProduct {
  id: string; brand: string; line: string;
  /** 'cabinet' = a closed wood cabinet with doors; 'frame' = a metal (or open) frame */
  kind: 'cabinet' | 'frame';
  /** the nearest of the three drawn finishes, and the maker's colour in words */
  finish: StandFinish; color: string;
  /** the tank footprints (L x D, inches) it is sold for */
  fits: [number, number][];
  heightIn: number; priceUsd: number; seller: string; url: string; asOf: string;
  /** fields that are estimates or not confirmed from the page */
  est: string[]; note?: string;
}
export const STAND_PRODUCTS = standData as unknown as StandProduct[];
export const standProduct = (id?: string) => (id ? STAND_PRODUCTS.find(p => p.id === id) : undefined);
export const GENERIC_STAND_NOTE = 'Generic stand: a price estimate by tank size, no product fits this size.';

export function standFits(p: StandProduct, T: Tank): boolean {
  if (shapeOf(T) !== 'rect') return false;
  const L = T.L / 25.4, D = T.D / 25.4;
  return p.fits.some(([l, d]) => Math.abs(L - l) <= 1.5 && Math.abs(D - d) <= 1.3);
}
/** Every stand sold for this tank, cheapest first. */
export const standsFor = (T: Tank): StandProduct[] => STAND_PRODUCTS.filter(p => standFits(p, T)).sort((a, b) => a.priceUsd - b.priceUsd);
/** The stand a setup has: its picked product while it fits, else the cheapest fitting one of the drawn kind (cabinet, else frame). undefined = generic estimate. */
export function standOf(S: Pick<TankSetup, 'tank' | 'stand'>): StandProduct | undefined {
  const st = S.stand; if (!st.show || st.style === 'table' || st.style === 'custom') return undefined;
  const p = standProduct(st.product);
  if (p && standFits(p, S.tank)) return p;
  return standsFor(S.tank).find(x => x.kind === (st.style === 'frame' ? 'frame' : 'cabinet'));
}
/** "Aqueon Black cabinet stand 20 long / 29 / 37, black" */
export const standLabel = (p: StandProduct) => `${p.brand} ${p.line}, ${p.color.split(',')[0].split(' (')[0]}`;
