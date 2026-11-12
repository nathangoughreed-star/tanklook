// Substrate depth and bottom-dweller data (lane SD1, 2026-11-12). Sources and evidence grades: research/substrate-depth-2026-11-12.md.
// Hobby consensus ranges, not measured thresholds: the checks word them as "needs / may", never as proof.
import type { Grain, SubstrateType } from '../scene/types';

export const MM_IN = 25.4;

/** Grain size order, finest first. */
export const GRAIN_ORDER: Grain[] = ['mud', 'sand', 'gravel', 'pebble'];
export const grainRank = (g: Grain) => GRAIN_ORDER.indexOf(g);

/** Our substrate types as grain + sharpness (the one table; see the doc's mapping). Terrestrial grounds are absent: not checked. */
export const SUBSTRATE_TRAITS: Partial<Record<SubstrateType, { grain: Grain; sharp: boolean; name: string }>> = {
  gravel: { grain: 'gravel', sharp: false, name: 'natural gravel' },
  pea: { grain: 'pebble', sharp: false, name: 'pea gravel' },
  clown: { grain: 'gravel', sharp: false, name: 'coloured gravel' },
  blue: { grain: 'gravel', sharp: false, name: 'coloured gravel' },
  onyx: { grain: 'gravel', sharp: false, name: 'coloured gravel' },
  black: { grain: 'gravel', sharp: false, name: 'coloured gravel' },
  white: { grain: 'gravel', sharp: false, name: 'coloured gravel' },
  aragonite: { grain: 'sand', sharp: false, name: 'aragonite sand' },
  coral: { grain: 'gravel', sharp: true, name: 'crushed coral' },
};

/** Bed depth (mm) above which a bed of this grain may go anoxic in pockets (advisory; the doc's table). */
export const DEEP_MM: Record<Grain, number> = { mud: 3 * MM_IN, sand: 4 * MM_IN, gravel: 6 * MM_IN, pebble: 8 * MM_IN };

/** Rooting depth (mm) per plant variant: the least that anchors it, and the depth the hobby recommends. Absent = no substrate need (epiphytes, floaters, land plants). */
export const PLANT_DEPTH: Record<string, { min: number; rec: number }> = {
  sword: { min: 2 * MM_IN, rec: 4 * MM_IN }, ozelot: { min: 2 * MM_IN, rec: 4 * MM_IN },
  crypt: { min: 2 * MM_IN, rec: 3 * MM_IN }, balansae: { min: 2 * MM_IN, rec: 3 * MM_IN },
  sagittaria: { min: 2 * MM_IN, rec: 3 * MM_IN }, lotus: { min: 3 * MM_IN, rec: 4 * MM_IN },
  stem: { min: 1.5 * MM_IN, rec: 2.5 * MM_IN }, stemred: { min: 1.5 * MM_IN, rec: 2.5 * MM_IN },
  rotala: { min: 1.5 * MM_IN, rec: 2.5 * MM_IN }, ludwigia: { min: 1.5 * MM_IN, rec: 2.5 * MM_IN },
  grass: { min: 2 * MM_IN, rec: 3 * MM_IN },
  carpet: { min: 1.2 * MM_IN, rec: 1.75 * MM_IN }, hairgrass: { min: 1.2 * MM_IN, rec: 1.75 * MM_IN },
};

/** Animal substrate rules, by species id. `needs`: coarsest grain it can live on (a mismatch is a welfare Caution; Guided Discover drops it).
 *  `prefers`: coarsest grain it likes (a soft advisory). `minDepth`: mm of bed it needs to bury in. `sharp`: sharp / rough substrate is a Caution. */
export interface DwellerRule { needs?: Grain; prefers?: Grain; minDepth?: number; sharp?: boolean; why: string }
export const DWELLER: Record<string, DwellerRule> = {
  kuhli: { needs: 'sand', minDepth: 1 * MM_IN, sharp: true, why: 'buries itself in soft sand and scrapes its barbels and belly on coarse or sharp material' },
  bronzecory: { prefers: 'sand', sharp: true, why: 'sifts the bottom with its barbels, which sharp or coarse gravel can wear down and infect' },
  pandacory: { prefers: 'sand', sharp: true, why: 'sifts the bottom with its barbels, which sharp or coarse gravel can wear down and infect' },
  sterbai: { prefers: 'sand', sharp: true, why: 'sifts the bottom with its barbels, which sharp or coarse gravel can wear down and infect' },
  pygmycory: { sharp: true, why: 'forages with its barbels, which sharp gravel can wear down' },
  clownloach: { prefers: 'sand', sharp: true, why: 'roots in the bottom with sensitive barbels' },
  watchman: { needs: 'gravel', minDepth: 2 * MM_IN, why: 'builds its burrow in sand and rubble' },
};
