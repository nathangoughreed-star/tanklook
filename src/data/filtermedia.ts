// Media volume (litres of biological media: foam, ceramic, BioMax, floss; carbon not counted) of real filters, for the nitrogen model
// (scene/nitrogen.ts, lane SE2 research 2026-10-20). src: 'manual' = manufacturer manual or spec page (opened), 'retail' = retailer
// figure, 'derived' = worked out from cartridge weights or dimensions (about +-50 %). Products missing here are sized by kind
// (MEDIA_L_PER_GPH).
export const FILTER_MEDIA_L: Record<string, [number, 'manual' | 'retail' | 'derived', string]> = {
  'fluval-107': [1.2, 'manual', 'Fluval 107 media basket'], 'fluval-207': [1.8, 'manual', 'Fluval 207 media basket'],
  'fluval-307': [3.1, 'manual', 'Fluval 307 media basket'], 'fluval-407': [4.2, 'manual', 'Fluval 407 media basket'],
  'fluval-fx4': [3.9, 'manual', 'FX4 baskets'], 'fluval-fx6': [5.9, 'manual', 'FX6 baskets'],
  'eheim-2215': [4, 'manual', 'Eheim 2215 filter volume'], 'eheim-2217': [6, 'manual', 'Eheim 2217 filter volume'], 'eheim-2213': [3, 'retail', 'Eheim 2213 retailer figure'],
  'seachem-tidal-35': [0.7, 'manual', 'Tidal 35 media'], 'seachem-tidal-55': [1.2, 'manual', 'Tidal 55 media'],
  'seachem-tidal-75': [1.9, 'manual', 'Tidal 75 media'], 'seachem-tidal-110': [3.2, 'manual', 'Tidal 110 media'],
  'aquaclear-20': [0.5, 'derived', 'BioMax weight 60 g at 0.5-0.8 g/mL, foam scaled'], 'aquaclear-30': [0.6, 'derived', 'BioMax weight 65 g, foam scaled'],
  'aquaclear-50': [1.0, 'derived', 'BioMax 125 g plus foam 0.4-1.0 L'], 'aquaclear-70': [1.5, 'derived', 'BioMax 195 g plus foam 0.6-1.0 L, 1.1-1.9 L'],
  'aquaclear-110': [2.6, 'derived', 'BioMax 390 g plus foam, scaled'],
};
/** Media litres per rated gph when a product has no row above: hang-on-back (AquaClear 70 about 0.005), canister (Fluval 0.007-0.01), internal. */
export const MEDIA_L_PER_GPH = { hob: 0.005, canister: 0.009, internal: 0.006, sponge: 0 } as const;
/** Sponge filters: litres of foam per gallon the unit is rated for (Hydro-Sponge, Co-Op: about 0.03). Derived. */
export const SPONGE_L_PER_GAL = 0.03;
