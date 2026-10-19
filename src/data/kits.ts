import type { LidType, LightTech } from '../scene/types';
import data from './kits.json';

/** All-in-one aquarium kits (lane KB, 2026-10). Light type and watts come from listings; filter and heater are class only. */
export interface KitModel {
  id: string;
  brand: string;
  name: string;
  /** TankModel id (src/data/tanks.json) once lane KA lands; until then `tankDims` is the source of truth. */
  tank?: string;
  tankRatedGal: number;
  /** Outer dimensions as sold, mm; absent when no listing gives them (see note). */
  tankDims?: { L: number; H: number; D: number };
  water: 'fresh' | 'salt';
  /** watts null = not published (spec 'guess'); callers fall back to the tier default. */
  light: { type: 'flat' | 'spot' | 'tube' | 'led'; tech: LightTech; count: number; watts: number | null; par?: number; /** where `par` was measured; absent = at the substrate */ parAt?: 'surface' | 'substrate'; spec: 'published' | 'listing' | 'guess' };
  lid: LidType;
  stand?: boolean;
  filter: { kind: 'hob' | 'canister' | 'sponge' | 'internal'; rating?: number };
  heater?: { watts: number };
  tier: 'budget' | 'mid' | 'plant' | 'reef';
  /** Approximate retail on `asOf`; absent when no price was found (see note). */
  price?: { usd: number; asOf: string; url: string };
  source: string[];
  note?: string;
}

export const KITS = data as KitModel[];
export const kitById = (id: string): KitModel | undefined => KITS.find((k) => k.id === id);
