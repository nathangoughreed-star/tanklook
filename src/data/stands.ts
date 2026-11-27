// Stands as real products (lane SP1, Nathan 2026-11-16: "is that stand priced accurately to a real product?" "Yes, real stands").
// Data: src/data/gear/stands.json (brand, line, kind = cabinet | frame, finish, the tank footprints it is sold for, height, price + seller + dated URL).
// A stand fits a plain rectangular tank whose outside footprint is within 1.5 in (length) and 1.3 in (depth) of one of its footprints.
// No fitting product (a custom size, another shape): the engine keeps the generic by-gallons estimate and says so.
import standData from './gear/stands.json';
import type { StandFinish, Tank, TankSetup } from '../scene/types';
import { shapeOf } from '../scene/shape';

/** What the stand looks like, read off its product photos (R96): sampled colours, sheen, grain, layout. All optional; the model falls back to the three generic finishes without it. */
export interface StandLook {
  /** sampled front face and top (hex) */
  front?: string; top?: string;
  sheen?: 'matte' | 'satin' | 'gloss';
  /** 'oak' = visible wood grain (any wood colour), 'laminate' = plain printed finish, 'none' = paint / powder coat */
  grain?: 'none' | 'oak' | 'laminate';
  planks?: number; bodyHex?: string; doorW?: number; doorX?: number; noBack?: boolean; insetHex?: string; openShelf?: number; topPlate?: string; doors?: number; doorStyle?: 'flat' | 'louver' | 'plank' | 'raised' | 'bead' | 'barn';
  /** 'center' = two end doors with an open middle shelf; 'arch' = open front between two side panels */
  open?: 'none' | 'center' | 'arch' | 'half';
  /** open 'half': which half is closed (default 'right', the Seapora Roman), its share of the width (default 0.4), and a door on it (R183, Marineland Modern) */
  halfClosed?: 'left' | 'right'; halfW?: number; halfDoor?: boolean;
  handle?: 'none' | 'bar' | 'knob'; handleHex?: string;
  /** closed cabinets: the carcass (bodyHex) shows as a frame this wide (mm) round the doors and between them */
  frameMm?: number;
  base?: 'plinth' | 'recessed' | 'feet' | 'tapered' | 'poles' | 'block'; baseHex?: string;
  /** top slab thickness, base height, a thin base plate (mm, and how far it overhangs), plinth overhang, screw caps on a recessed plinth */
  topMm?: number; baseMm?: number; plate?: number; plateOver?: number; plinthOver?: number; caps?: boolean;
  overhangMm?: number;
  /** frames: tube colour and side (mm), lower shelf, bracing, a front apron panel height (mm) */
  tube?: string; tubeMm?: number; shelf?: 'none' | 'solid' | 'mesh'; shelfHex?: string; brace?: 'none' | 'x' | 'xside' | 'window' | 'rails'; apron?: number; drawers?: boolean;
  /** frames: shelf heights as fractions of the height, leg lean (degrees), foot blocks (mm) */
  shelfAt?: number[]; splayDeg?: number; feetMm?: number; shelfRails?: boolean; braceSpan?: [number, number]; motif?: boolean;
  /** which fields are estimates (no photo, or not readable from it) */
  est?: string[];
}
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
  /** R96: left out of the picker and the default (a stand whose tank footprint is not known) */
  hidden?: boolean;
  /** only sold inside a bundle (the bundle's own stand, drawn for its scene): never in the picker or the default. Its priceUsd / seller / url are
   *  those of `equiv`, the cheapest real stand sold alone for the same footprint (bundle parts sweep 2026-11-26), so a bundle's "vs the parts" saving uses a real price */
  kitOnly?: boolean; equiv?: string;
  /** R96: the look read off product photos (research/screens/SP1/ref/<id>-*.jpg) */
  look?: StandLook;
  /** R108: what the maker / retailer page states, left out when it does not (never derived from the footprint): the largest tank it is rated for (gallons, "for up to N gal" / "fits 40B"), the stated weight capacity (lb); where it was read is in ratingNote (the row's url is the page). */
  ratedGal?: number; maxLoadLb?: number; ratingNote?: string;
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
export const standsFor = (T: Tank): StandProduct[] => STAND_PRODUCTS.filter(p => !p.hidden && !p.kitOnly && standFits(p, T)).sort((a, b) => a.priceUsd - b.priceUsd);
/** The stand a setup has: its picked product while it fits, else the cheapest fitting one of the drawn kind (cabinet or frame) in the drawn finish. undefined = generic estimate. */
export function standOf(S: Pick<TankSetup, 'tank' | 'stand'>): StandProduct | undefined {
  const st = S.stand; if (!st.show || st.style === 'table' || st.style === 'custom') return undefined;
  const p = standProduct(st.product);
  if (p && standFits(p, S.tank)) return p;
  if (st.generic) return undefined; // R183: a bundle's stand we have no model for stays generic, never another product
  const same = standsFor(S.tank).filter(x => x.kind === (st.style === 'frame' ? 'frame' : 'cabinet'));
  return same.find(x => x.finish === st.finish) ?? same[0]; // the cheapest in the finish the scene shows, else the cheapest
}
/** "Aqueon Black cabinet stand 20 long / 29 / 37, black" */
export const standLabel = (p: StandProduct) => `${p.brand} ${p.line}, ${p.color.split(',')[0].split(' (')[0]}${p.kitOnly && p.equiv ? ` (bundle only; priced as ${p.equiv})` : ''}`;

/** R108: the one-line rating on a stand tile, "Rated 40 gal · 600 lb"; undefined when the page stated neither (nothing is implied). */
export const standRatingLine = (p: Pick<StandProduct, 'ratedGal' | 'maxLoadLb'>): string | undefined => {
  const parts = [p.ratedGal ? `Rated ${p.ratedGal} gal` : '', p.maxLoadLb ? `${p.maxLoadLb} lb` : ''].filter(Boolean);
  return parts.length ? (p.ratedGal ? parts.join(' · ') : `Rated ${parts[0]}`) : undefined;
};
export interface StandCheck { level: 'over' | 'soft'; text: string }
/** R108: a stand holding a tank heavier than its stated weight capacity is a clear warning; a tank bigger than its rated gallons a softer note.
 *  No stated rating, nothing to say (and nothing implied). filledLb = the tank filled to the line (shell/logic/tank.ts filledLb). */
export function standCheck(p: Pick<StandProduct, 'ratedGal' | 'maxLoadLb'> | undefined, filledLb: number, gallons: number): StandCheck | undefined {
  if (!p) return undefined;
  if (p.maxLoadLb && filledLb > p.maxLoadLb) return { level: 'over', text: `Filled tank ~${Math.round(filledLb / 10) * 10} lb is over this stand's ${p.maxLoadLb} lb rating` };
  // R122: a stand "for a 55" is fine under a true-volume 55 (about 56 gal); allow the usual ~6 % gap between sold-as and true volume
  if (p.ratedGal && gallons > p.ratedGal * 1.06 + 0.5) return { level: 'soft', text: `This tank holds about ${Math.round(gallons)} gal; the stand is rated for up to ${p.ratedGal} gal` };
  return undefined;
}
