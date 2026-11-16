// How the sucker-mouth algae grazers cling (R92), per species id: stuck belly-down to a surface, mostly still, a slow rasping creep,
// and now and then a quick dart to another surface. Speeds in body lengths per second; a species not listed here is not a clinger.
// (Siamese algae eaters rest and swim and are not suckers; corys graze the ground and keep doing it: they are not here.)
export interface ClingPace { creepBL: number; dartBL: number; dartEveryS: number; still: number }
export const CLING: Record<string, ClingPace> = {
  oto: { creepBL: 0.2, dartBL: 7, dartEveryS: 45, still: 0.7 },
  bristlenose: { creepBL: 0.12, dartBL: 3, dartEveryS: 140, still: 0.85 },
  hillstream: { creepBL: 0.3, dartBL: 5, dartEveryS: 80, still: 0.6 },
};
export const clingPace = (speciesId: string): ClingPace | undefined => CLING[speciesId];
