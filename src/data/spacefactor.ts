// Space factors, FITTED TO AQADVISOR (lane SE2, 2026-10-23), not a biological claim: for each species the stocking level
// AqAdvisor gave a tank of only that species (55 gal, filter on Choose) over our mass^0.45 space for the same tank. The engine multiplies
// the species' space load by it. Species not listed fall back to the class factor (median of the class below). Rebuild: node scripts/space-factors.mjs.
export const SPACE_FACTOR_CLASS: Record<string, [number, string]> = {
  tiny: [1.58, 'fish under 2 g'], mid: [0.83, 'fish 2 to 30 g'], big: [1.36, 'fish over 30 g'],
  invert: [0.48, 'shrimp and snails'], amphibian: [0.56, 'aquatic frogs'],
};
export const SPACE_FACTOR: Record<string, [number, string]> = {
  neon: [1.18, 'tiny body; one-species tank: AqAdvisor 37% vs ours 32% with 20'],
  cardinal: [1.09, 'tiny body; one-species tank: AqAdvisor 48% vs ours 44% with 20'],
  ember: [1.66, 'tiny body; one-species tank: AqAdvisor 27% vs ours 16% with 20'],
  rummynose: [1.47, 'tiny body; one-species tank: AqAdvisor 48% vs ours 33% with 20'],
  harlequin: [0.44, 'mid body; one-species tank: AqAdvisor 39% vs ours 89% with 20'],
  chili: [2.13, 'tiny body; one-species tank: AqAdvisor 37% vs ours 17% with 20'],
  danio: [1.09, 'tiny body; one-species tank: AqAdvisor 51% vs ours 47% with 20'],
  cherrybarb: [0.65, 'mid body; one-species tank: AqAdvisor 54% vs ours 83% with 20'],
  tigerbarb: [0.78, 'mid body; one-species tank: AqAdvisor 66% vs ours 84% with 20'],
  guppy: [1.58, 'tiny body; one-species tank: AqAdvisor 69% vs ours 44% with 20'],
  platy: [1.83, 'tiny body; one-species tank: AqAdvisor 69% vs ours 38% with 20'],
  molly: [0.64, 'mid body; one-species tank: AqAdvisor 81% vs ours 127% with 20'],
  swordtail: [0.63, 'mid body; one-species tank: AqAdvisor 93% vs ours 147% with 13'],
  betta: [0.94, 'mid body; one-species tank: AqAdvisor 59% vs ours 63% with 20'],
  dwarfgourami: [0.83, 'mid body; one-species tank: AqAdvisor 84% vs ours 101% with 20'],
  honeygourami: [1.40, 'mid body; one-species tank: AqAdvisor 84% vs ours 60% with 20'],
  gourami: [0.80, 'mid body; one-species tank: AqAdvisor 82% vs ours 102% with 11'],
  gbr: [0.94, 'mid body; one-species tank: AqAdvisor 69% vs ours 73% with 20'],
  bolivianram: [0.72, 'mid body; one-species tank: AqAdvisor 92% vs ours 127% with 18'],
  kribensis: [0.57, 'mid body; one-species tank: AqAdvisor 88% vs ours 155% with 17'],
  angel: [1.05, 'big body; one-species tank: AqAdvisor 105% vs ours 100% with 6'],
  discus: [0.82, 'big body; one-species tank: AqAdvisor 81% vs ours 98% with 6'],
  oscar: [1.45, 'big body; one-species tank: AqAdvisor 129% vs ours 89% with 2'],
  goldfish: [1.76, 'big body; one-species tank: AqAdvisor 180% vs ours 102% with 8'],
  bronzecory: [0.63, 'mid body; one-species tank: AqAdvisor 63% vs ours 101% with 20'],
  pandacory: [1.07, 'tiny body; one-species tank: AqAdvisor 43% vs ours 40% with 20'],
  bristlenose: [1.04, 'mid body; one-species tank: AqAdvisor 105% vs ours 101% with 11'],
  oto: [3.34, 'tiny body; one-species tank: AqAdvisor 60% vs ours 18% with 20'],
  kuhli: [0.61, 'mid body; one-species tank: AqAdvisor 57% vs ours 93% with 20'],
  clownloach: [1.80, 'big body; one-species tank: AqAdvisor 237% vs ours 131% with 7'],
  sae: [1.03, 'big body; one-species tank: AqAdvisor 101% vs ours 98% with 10'],
  peapuffer: [2.78, 'tiny body; one-species tank: AqAdvisor 93% vs ours 34% with 20'],
  cpd: [1.79, 'tiny body; one-species tank: AqAdvisor 27% vs ours 15% with 20'],
  hatchet: [0.93, 'tiny body; one-species tank: AqAdvisor 48% vs ours 52% with 20'],
  cherryshrimp: [0.54, 'invert body; one-species tank: AqAdvisor 13% vs ours 24% with 20'],
  amano: [0.48, 'invert body; one-species tank: AqAdvisor 17% vs ours 35% with 20'],
  nerite: [0.30, 'invert body; one-species tank: AqAdvisor 23% vs ours 77% with 20'],
  mystery: [0.29, 'invert body; one-species tank: AqAdvisor 29% vs ours 99% with 13'],
  ramshorn: [0.39, 'invert body; one-species tank: AqAdvisor 16% vs ours 41% with 20'],
  trumpet: [0.61, 'invert body; one-species tank: AqAdvisor 20% vs ours 33% with 20'],
  adf: [0.56, 'amphibian body; one-species tank: AqAdvisor 38% vs ours 68% with 20'],
  pygmycory: [1.43, 'tiny body; one-species tank: AqAdvisor 34% vs ours 24% with 20'],
  yellowlab: [1.12, 'mid body; one-species tank: AqAdvisor 115% vs ours 102% with 15'],
  boesemani: [0.82, 'mid body; one-species tank: AqAdvisor 106% vs ours 129% with 16'],
  cockatoo: [0.99, 'mid body; one-species tank: AqAdvisor 96% vs ours 97% with 16'],
  peacock: [0.96, 'mid body; one-species tank: AqAdvisor 85% vs ours 89% with 10'],
  demasoni: [1.89, 'tiny body; one-species tank: AqAdvisor 99% vs ours 52% with 20'],
  kadango: [0.81, 'big body; one-species tank: AqAdvisor 79% vs ours 98% with 8'],
  whitecloud: [1.08, 'tiny body; one-species tank: AqAdvisor 39% vs ours 36% with 20'],
  comet: [1.67, 'big body; one-species tank: AqAdvisor 177% vs ours 106% with 6'],
  labeo: [1.32, 'mid body; one-species tank: AqAdvisor 133% vs ours 101% with 18'],
  auratus: [0.92, 'mid body; one-species tank: AqAdvisor 93% vs ours 101% with 13'],
  afra: [1.02, 'mid body; one-species tank: AqAdvisor 104% vs ours 102% with 15'],
  livingstonii: [1.36, 'big body; one-species tank: AqAdvisor 154% vs ours 113% with 6'],
};

/** Share of the floor-model footprint a species really spreads over (scene/stocking.ts floorUseCm2): 1 for every bottom dweller
 *  not listed. Judgment constants (est), not fits: no source gives a per-fish floor figure for a species that piles up. */
export const FLOOR_FACTOR: Record<string, [number, string]> = {
  oto: [0.5, 'grazes glass, plant leaves, wood and rock more than open substrate: two expert answer sets (round 2 ngr-ai, round 3 chatgpt-high, both AI models) asked for less floor weight than a substrate fish of its size; Nathan: take the advice, 2026-10-23. Half of the all-zone share, so a quarter of a bottom dweller'],
  kuhli: [0.6, 'eel-shaped and gregarious: kuhlis pile into one shared cave or root tangle instead of spreading over the floor (Seriously Fish; Aquarium Co-Op keeps 3-6 in a 20 gal and more in bigger tanks). At 1.0, 17 kuhlis read 95 % of a 36 x 18 in floor; the floor stays linear in count (audit F), 2026-10-22'],
  whitecloud: [0, 'upper and middle water (Seriously Fish), never on the floor (2026-10-22). Floor only: its zone stays all, which also sets its height curve and water reading'],
  cpd: [0, 'swims above the floor (zone audit 2026-10-22, Nathan: floor only); its zone all still sets its height curve'],
  pygmycory: [0, 'swims above the floor (zone audit 2026-10-22, Nathan: floor only); its zone all still sets its height curve'],
  peapuffer: [0, 'swims above the floor (zone audit 2026-10-22, Nathan: floor only); its zone all still sets its height curve'],
  comet: [0, 'swims above the floor (zone audit 2026-10-22, Nathan: floor only); its zone all still sets its height curve'],
  yellowtang: [0, 'swims above the floor (zone audit 2026-10-22, Nathan: floor only); its zone all still sets its height curve'],
  bluetang: [0, 'swims above the floor (zone audit 2026-10-22, Nathan: floor only); its zone all still sets its height curve'],
  demasoni: [0.5, 'rock dweller over every level, not a floor sitter: counts like an all-zone fish on the floor (zone audit 2026-10-22, Nathan: floor only); its zone bottom still sets its height curve'],
  labeo: [0.5, 'rock dweller over every level, not a floor sitter: counts like an all-zone fish on the floor (zone audit 2026-10-22, Nathan: floor only); its zone bottom still sets its height curve'],
  auratus: [0.5, 'rock dweller over every level, not a floor sitter: counts like an all-zone fish on the floor (zone audit 2026-10-22, Nathan: floor only); its zone bottom still sets its height curve'],
  afra: [0.5, 'rock dweller over every level, not a floor sitter: counts like an all-zone fish on the floor (zone audit 2026-10-22, Nathan: floor only); its zone bottom still sets its height curve'],
  coralbeauty: [0.5, 'rock dweller over every level, not a floor sitter: counts like an all-zone fish on the floor (zone audit 2026-10-22, Nathan: floor only); its zone bottom still sets its height curve'],
  royalgramma: [0.5, 'rock dweller over every level, not a floor sitter: counts like an all-zone fish on the floor (zone audit 2026-10-22, Nathan: floor only); its zone bottom still sets its height curve'],
};
/** Room that GROWS with the group, per species (Nathan 2026-10-26, otocinclus): past `ref` animals of the species, each one's water and floor
 *  load is multiplied by (n / ref)^exp, so a big group needs more than the shared school curve gives it. For grazers that strip the
 *  surfaces a group shares; aggression and bioload are not the reason. Hand-set targets, not a fit. */
export const GROUP_GROW: Record<string, [number, number, string]> = {
  oto: [12, 0.095, 'Nathan 2026-10-26: 12 in the 15 gal stays at 75 %; 25 should be comfortable (ideal) in a 30 gal breeder and 50 in a 55 gal, smaller tanks progressively less defensible; otos depend on grazing surfaces and food a big group exhausts (Aquarium Co-Op)'],
};
// Hand-set multipliers on top of the AqAdvisor fit (Nathan's targets, not a fit): the species' space load is multiplied by both.
// Like FLOOR_FACTOR, re-add this block after a rebuild (scripts/space-factors.mjs writes only the tables above).
export const SPACE_NUDGE: Record<string, [number, string]> = {
  oto: [0.63, 'expert rounds 2-3 (ngr-ai, chatgpt, chatgpt-high; all AI models), Nathan 2026-10-23: take the advice. Four answers put the engine 1.3-1.9x too heavy on otos in the water (45 alone in a 55 gal is Ideal; 12 with 11 pandas in a 29 gal is Ideal; 20 with 4 hillstreams in a 30 gal is Ideal; 19 with 11 pandas is Caution); median 0.67, then set by Nathan to his target: 12 otos in the 15 gal (24.5 x 12.5 x 12.75 in) read 75 %, with the grazing caution (data/grazers.ts) carrying the food side'],
  discus: [1.435, 'Nathan 2026-10-22: 6 discus in a 55 gal (48 x 13 x 20 in) should read 85 % (was 59 % of the space): 85.2 % now, in the caution band (75-100)'],
};
