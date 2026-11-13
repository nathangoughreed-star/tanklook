// Hoods as real products (lane HD1, Nathan 2026-11-13): a hood is ONE item, a moulded top with its LED built in, sold for specific
// standard tank footprints. A hood is offered only where a product fits; every other tank (a custom size, 40 breeder, 55, 75, a bow...)
// gets a glass lid, mesh or an open top. Data: src/data/gear/hoods.json (own file: fit and light fields differ from lights.json).
import hoodData from './gear/hoods.json';
import type { LightSettings, Tank, TankSetup } from '../scene/types';
import { shapeOf } from '../scene/shape';

export interface HoodProduct {
  id: string; brand: string; model: string;
  /** the frame it sits on, inches: length x depth (front to back) */
  lengthIn: number; depthIn: number;
  /** the rated gallons of the standard tanks it is sold for */
  fitsGal: number[];
  /** the light built in: lamp type and watts feed the light model */
  light: { type: 'led' | 'tube'; tech: LightSettings['tech'] & string; watts: number; lamp: string; lumens?: number; par?: number; kelvin?: number };
  priceUsd: number; url: string; asOf: string; est: string[]; note?: string;
}
export const HOOD_PRODUCTS = hoodData as unknown as HoodProduct[];
export const hoodProduct = (id?: string) => (id ? HOOD_PRODUCTS.find(h => h.id === id) : undefined);

export const NO_HOOD_NOTE = 'No hood is sold for this size; a glass lid is the usual choice.';

/** A hood fits a plain rectangular tank whose outside length is within an inch of its frame and whose depth is the frame's up to 1.5 in more. */
export function hoodFits(h: HoodProduct, T: Tank): boolean {
  if (shapeOf(T) !== 'rect') return false;
  const L = T.L / 25.4, D = T.D / 25.4;
  return Math.abs(L - h.lengthIn) <= 1.2 && D >= h.depthIn - 0.6 && D <= h.depthIn + 1.6;
}
/** Every hood product sold for this tank, cheapest first. Empty for a custom size or any shape no hood is made for. */
export function hoodsFor(T: Tank): HoodProduct[] {
  return HOOD_PRODUCTS.filter(h => hoodFits(h, T)).sort((a, b) => a.priceUsd - b.priceUsd);
}
export const hoodExists = (T: Tank): boolean => hoodsFor(T).length > 0;
/** The hood this setup has: its picked one when it still fits, else the cheapest that fits; undefined = none is sold for the tank. */
export function hoodOf(S: Pick<TankSetup, 'tank'> & { hoodProduct?: string }): HoodProduct | undefined {
  const p = hoodProduct(S.hoodProduct);
  return p && hoodFits(p, S.tank) ? p : hoodsFor(S.tank)[0];
}
/** The light settings a hood product brings (its type and watts; no PAR override, so the model estimates). */
export function hoodLight(S: Pick<TankSetup, 'light'>, h: HoodProduct): LightSettings {
  const l: LightSettings = { ...S.light, type: h.light.type, tech: h.light.tech, count: 1, watts: h.light.watts };
  delete l.par; delete l.product; delete l.bulbW; delete l.owned; delete l.paidUsd;
  if (h.light.kelvin) l.kelvin = h.light.kelvin;
  return l;
}
/** True when the light on a hooded setup is the hood's own (no separately chosen light product). */
export const lightIsHoods = (S: Pick<TankSetup, 'light'>): boolean => !S.light.product;
/** A setup with a hood and the light inside it: the hood's light replaces the settings; with no product for the tank, the scene is returned unchanged. */
export function withHoodLight<T extends Pick<TankSetup, 'tank' | 'light' | 'lid'> & { hoodProduct?: string }>(S: T): T {
  if (S.lid !== 'hood' || !lightIsHoods(S)) return S;
  const h = hoodOf(S);
  return h ? { ...S, light: hoodLight(S, h) } : S;
}
