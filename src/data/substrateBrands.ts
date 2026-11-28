// SB1 (2026-11-26, R186): real substrate products, compiled from research/substrates/brands-2026-11.md by scripts/substrate-brands-build.py.
// Pure data (no DOM). Each product is one pickable look: colours and grain size read off its reference photos, a sourced $/lb guess
// (dated retailer page; the user can override it per tank, TankSetup.substrate.priceLb) and what it does to the water.
import raw from './substrateBrands.json';
import type { BrandSub } from '../scene/types';

/** The picker's types (R185): type first, then colours / products within it. */
export type SubType = 'gravel' | 'natural' | 'pea' | 'sand' | 'soil' | 'marine';
export interface BrandProduct {
  id: BrandSub; brand: string; name: string; type: SubType;
  /** the colour this entry is, when the maker sells the product in several (aquarium gravel brands) */
  colour?: string;
  kind: 'sand' | 'pebble'; base: string; shades: string[];
  /** grain size, mm across (min, max) as the maker states it */
  mm: [number, number]; gloss: number; round: number;
  nutrient: 'inert' | 'active' | 'fertilized'; ph: 'none' | 'lowers' | 'raises' | 'buffers'; marine: boolean;
  /** sourced guess, USD per `per` ('lb', or 'L' for the soils sold by the litre), from the bag we read; `bag` = its size in that unit */
  price: number; per: 'lb' | 'L'; bag: number; url: string; date: string; retailer: string;
  note: string; photos: string[];
}
export const BRANDS: BrandProduct[] = (raw as unknown as { products: BrandProduct[] }).products;
const byId = new Map(BRANDS.map(b => [b.id as string, b]));
export const isBrandId = (id: string): id is BrandSub => byId.has(id);
export const brandOf = (id: string): BrandProduct | undefined => byId.get(id);
/** The sourced USD per lb (or per L) for a brand product; null for a generic type (its price is the demand engine's own). */
export const brandPrice = (id: string): number | null => byId.get(id)?.price ?? null;
export const NUTRIENT_TEXT: Record<BrandProduct['nutrient'], string> = { inert: 'Inert (adds nothing to the water)', active: 'Active (feeds plant roots, holds nutrients)', fertilized: 'Pre-fertilized' };
export const PH_TEXT: Record<BrandProduct['ph'], string> = { none: 'No effect on pH', lowers: 'Lowers pH and softens water', raises: 'Raises pH and hardness', buffers: 'Buffers pH' };
/** Loose substrate weighs about 1.6 kg a litre (the set-up sheet's figure), so a $/lb price is x3.53 per litre. */
const LB_PER_L = 1.6 * 2.2046;
/** USD per litre of bed for a chosen product, with the user's own price (in the product's unit) over the sourced guess; null for a generic substrate. */
export function brandUsdPerL(type: string, own?: number): { usd: number; name: string; own: boolean } | null {
  const b = byId.get(type); if (!b) return null;
  const p = own ?? b.price;
  return { usd: b.per === 'lb' ? p * LB_PER_L : p, name: `${b.brand} ${b.name}`, own: own != null };
}
