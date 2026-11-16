// Per-species swim pace (R88): a multiplier on cruise speed for the free-roam sim. 1 = a tetra / danio. Slow hoverers
// (labyrinth fish: gouramis feel their way with the pectoral feelers) cruise well below that, glide and pause.
// Add a species id here and every fish of it inherits the pace.
export const SLOW_PACE: Record<string, number> = {
  gourami: 0.4, dwarfgourami: 0.4, honeygourami: 0.4,
  sparklinggourami: 0.35, croakinggourami: 0.4, // Trichopsis (FS1 R89): "sluggish environments" (Seriously Fish)
};
export const swimPace = (speciesId: string): number => SLOW_PACE[speciesId] ?? 1;
export const SWIM_PACE = SLOW_PACE; // FS1 test name
