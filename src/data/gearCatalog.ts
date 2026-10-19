// Real aquarium gear by brand (lane TG, Nathan 2026-10-19: "a generic 50 W heater as the default as long as it's sized
// correctly, and the Top Fin 50 W to choose from"). Data in gear-catalog.json: each product's rating, measured size and
// a source; the drawing uses its own size, the Tech menu lists the products near the size the tank needs.
import data from './gear-catalog.json';

export interface HeaterProduct {
  id: string; brand: string; model: string; watts: number;
  /** overall length (tube + cap) and tube diameter, mm */
  lengthMm: number; diaMm: number;
  /** what it looks like: 'glass' (a clear tube), 'shroud' (a plastic guard over the glass), 'titanium' (a metal tube) */
  look: 'glass' | 'shroud' | 'titanium';
  galMin?: number; galMax?: number; priceUsd?: number; url: string; asOf: string;
  /** what it looks like, part by part, from product photos (Nathan 2026-10-19: true colours, simple shapes) */
  colors?: HeaterLook;
  /** colour fields not seen in a photo (cups hidden by the box), and what is not drawn (a separate controller) */
  colorsEst?: string[]; colorsNote?: string;
  /** fields that are estimates, not published */
  est?: string[];
}
/** A heater's colours part by part (hex), as researched from photos. */
export interface HeaterLook {
  /** the top cap; `ribbed`: a stack of rings (a grip) */
  cap: { hex: string; dial?: boolean; display?: string; led?: string; ribbed?: boolean; note?: string };
  /** the bottom end: absent = a rounded end in the cap's (or guard's) colour */
  foot?: { hex: string; ribbed?: boolean };
  /** the tube: 'opaque' = a solid sleeve in `hex`, clear only over `window` (shares of the length from the bottom) */
  tube: { kind: 'glass' | 'frosted' | 'metal' | 'hidden' | 'opaque'; hex: string; window?: [number, number] };
  /** a thermometer scale seen through the glass (white strip, red line) */
  thermometer?: boolean;
  element: { kind: 'coil' | 'wire' | 'none'; hex: string; note?: string };
  guard: { has: boolean; hex?: string; pattern?: 'slots' | 'mesh' | 'solid' };
  cord: string; cups: 'clear' | 'frosted' | 'black';
  /** 'flat': a flat rectangular body instead of a round tube */ shape?: 'tube' | 'flat';
  photo?: string;
}
export const HEATER_PRODUCTS = (data as { heaters: HeaterProduct[] }).heaters;
export const heaterProduct = (id?: string) => (id ? HEATER_PRODUCTS.find(h => h.id === id) : undefined);

/** The sizes heaters are sold in. */
export const HEATER_SIZES = [25, 50, 75, 100, 150, 200, 250, 300, 500];
/** The generic heater for a need of `w` watts (each heater when there are two): the smallest common size holding it. */
export const genericHeaterW = (w: number) => HEATER_SIZES.find(s => s >= w) ?? HEATER_SIZES[HEATER_SIZES.length - 1];

/** Products worth offering for a heater of `w` watts: the same size first, then the next sizes up and down, nearest first. */
export function heatersNear(w: number, n = 8): HeaterProduct[] {
  const g = genericHeaterW(w), i = HEATER_SIZES.indexOf(g), ok = new Set(HEATER_SIZES.slice(Math.max(0, i - 1), i + 2));
  return HEATER_PRODUCTS.filter(h => ok.has(genericHeaterW(h.watts)))
    .sort((a, b) => Math.abs(Math.log(a.watts / g)) - Math.abs(Math.log(b.watts / g)) || a.brand.localeCompare(b.brand)).slice(0, n);
}
