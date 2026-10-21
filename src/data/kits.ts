import type { LidType, LightTech } from '../scene/types';
import data from './kits.json';
import { filterName, matchFilter, matchHeater, type FilterSpec } from '../demand/gear';

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
  /** false = the listing says the light is sold separately: an integrated kit then holds its filter and lid but not the light. */
  lightIncluded?: false;
  /** Approximate retail on `asOf`; absent when no price was found (see note). */
  price?: { usd: number; asOf: string; url: string };
  source: string[];
  note?: string;
}

export const KITS = data as KitModel[];
export const kitById = (id: string): KitModel | undefined => KITS.find((k) => k.id === id);

/** The kit's filter and heater as engine specs, plus the generic model each matches (named for display). */
export function kitGear(k: Pick<KitModel, 'filter' | 'heater' | 'tankRatedGal'>): { filter: FilterSpec; heater?: { watts: number }; filterName: string; heaterName?: string } {
  const filter: FilterSpec = { kind: k.filter?.kind, rating: k.filter?.rating == null ? undefined : String(k.filter.rating), gal: k.tankRatedGal };
  const fm = matchFilter(filter)?.model;
  return { filter, heater: k.heater && k.heater.watts ? k.heater : undefined, filterName: fm ? filterName(fm) : 'filter', heaterName: k.heater ? matchHeater(k.heater.watts).label : undefined };
}
