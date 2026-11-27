// R123 (lane TL1, Nathan 2026-11-18): glass lids and mesh screen tops as real products for the standard tank sizes, like hoods
// (src/data/hoods.ts) but with no light built in. Data: src/data/gear/lids.json. A tank no product fits keeps the generic lid price.
import lidData from './gear/lids.json';
import type { Tank, TankSetup } from '../scene/types';
import { shapeOf } from '../scene/shape';

export interface LidProduct {
  id: string; kind: 'glass' | 'mesh'; brand: string; model: string;
  /** the frame it sits on, inches: length x depth (front to back) */
  lengthIn: number; depthIn: number;
  /** the rated gallons of the standard tanks it is sold for */
  fitsGal: number[];
  priceUsd: number; url: string; asOf: string; est: string[]; note?: string;
}
export const LID_PRODUCTS = lidData as unknown as LidProduct[];
export const lidProduct = (id?: string) => (id ? LID_PRODUCTS.find(p => p.id === id) : undefined);

/** Same footprint rule as a hood: length within 1.2 in, depth the frame's up to 1.6 in more (or 0.6 less). */
export function lidFits(p: LidProduct, T: Tank): boolean {
  if (shapeOf(T) !== 'rect') return false;
  const L = T.L / 25.4, D = T.D / 25.4;
  return Math.abs(L - p.lengthIn) <= 1.2 && D >= p.depthIn - 0.6 && D <= p.depthIn + 1.6;
}
/** Every lid product of this kind sold for the tank, cheapest first. */
export const lidsFor = (T: Tank, kind: 'glass' | 'mesh'): LidProduct[] => LID_PRODUCTS.filter(p => p.kind === kind && lidFits(p, T)).sort((a, b) => a.priceUsd - b.priceUsd);
/** The lid product this setup has: its picked one while it still fits the tank and the lid kind, else the cheapest that fits; undefined = none sold for the size. */
export function lidOf(S: Pick<TankSetup, 'tank' | 'lid'> & { lidProduct?: string; bundleLid?: string }): LidProduct | undefined {
  if (S.lid !== 'glass' && S.lid !== 'mesh') return undefined;
  if (S.bundleLid && !S.lidProduct) return undefined; // R135: the bundle's own lid is not a catalogue product
  const p = lidProduct(S.lidProduct);
  return p && p.kind === S.lid && lidFits(p, S.tank) ? p : lidsFor(S.tank, S.lid)[0];
}
