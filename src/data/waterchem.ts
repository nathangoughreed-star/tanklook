// Water chemistry and group sizes for the care gates (lane CG, 2026-10-19). Hand-curated: pH / GH ranges follow FishBase
// (CC BY-NC 4.0, fishbase.se, the "pH range" / "dH range" of each species' summary) where it lists them, otherwise common
// aquarium practice; nothing is copied from a care site. Advice only, as care.ts.
type R = [number, number];
/** Comfortable pH, and general hardness in dGH where sources agree (absent = no hardness check). Freshwater only. */
export const CHEM: Record<string, { ph: R; gh?: R }> = {
  neon: { ph: [5.0, 7.0], gh: [1, 10] }, cardinal: { ph: [4.6, 6.8], gh: [1, 8] }, ember: { ph: [5.5, 7.0], gh: [1, 10] },
  rummynose: { ph: [5.5, 7.0], gh: [1, 10] }, harlequin: { ph: [6.0, 7.5], gh: [1, 12] }, chili: { ph: [5.0, 7.0], gh: [1, 8] },
  danio: { ph: [6.0, 8.0] }, whitecloud: { ph: [6.0, 8.0] }, cpd: { ph: [6.5, 7.5] }, hatchet: { ph: [5.5, 7.0], gh: [1, 10] },
  cherrybarb: { ph: [6.0, 7.5] }, tigerbarb: { ph: [6.0, 7.5] }, boesemani: { ph: [7.0, 8.0], gh: [9, 19] },
  guppy: { ph: [7.0, 8.0], gh: [8, 25] }, platy: { ph: [7.0, 8.2], gh: [9, 25] }, molly: { ph: [7.5, 8.5], gh: [10, 25] },
  swordtail: { ph: [7.0, 8.3], gh: [9, 25] }, betta: { ph: [6.0, 7.5] }, dwarfgourami: { ph: [6.0, 7.5] }, honeygourami: { ph: [6.0, 7.5] },
  gourami: { ph: [6.0, 8.0] }, gbr: { ph: [5.0, 7.0], gh: [1, 8] }, bolivianram: { ph: [6.0, 7.5] }, kribensis: { ph: [6.0, 7.5] },
  cockatoo: { ph: [5.5, 7.0], gh: [1, 10] },
  // Lake Malawi / Tanganyika: hard, alkaline water
  yellowlab: { ph: [7.6, 8.6], gh: [10, 20] }, peacock: { ph: [7.6, 8.6], gh: [10, 20] }, demasoni: { ph: [7.6, 8.6], gh: [10, 20] },
  kadango: { ph: [7.6, 8.6], gh: [10, 20] }, syno: { ph: [7.5, 9.0], gh: [10, 20] }, labeo: { ph: [7.6, 8.6], gh: [10, 20] },
  auratus: { ph: [7.6, 8.6], gh: [10, 20] }, livingstonii: { ph: [7.6, 8.6], gh: [10, 20] }, afra: { ph: [7.6, 8.6], gh: [10, 20] },
  angel: { ph: [6.0, 7.5] }, discus: { ph: [5.0, 7.0], gh: [1, 8] }, oscar: { ph: [6.0, 8.0] }, goldfish: { ph: [6.5, 8.0] }, comet: { ph: [6.5, 8.0] },
  bronzecory: { ph: [6.0, 8.0] }, pandacory: { ph: [6.0, 7.5] }, pygmycory: { ph: [6.0, 7.5] }, bristlenose: { ph: [6.0, 8.0] },
  oto: { ph: [6.0, 7.5] }, kuhli: { ph: [5.5, 7.0], gh: [1, 10] }, clownloach: { ph: [6.0, 7.5] }, sae: { ph: [6.5, 7.5] },
  hillstream: { ph: [6.5, 7.5] }, peapuffer: { ph: [7.0, 8.0] },
  // invertebrates: snails need some hardness for their shells
  cherryshrimp: { ph: [6.5, 8.0], gh: [4, 14] }, amano: { ph: [6.0, 8.0], gh: [3, 15] }, nerite: { ph: [6.5, 8.5], gh: [6, 18] },
  mystery: { ph: [6.5, 8.0], gh: [6, 18] }, ramshorn: { ph: [6.5, 8.0], gh: [6, 18] }, trumpet: { ph: [6.5, 8.5] },
  adf: { ph: [6.5, 7.8] }, axolotl: { ph: [7.0, 8.0] }, firenewt: { ph: [6.5, 7.5] }, firetoad: { ph: [6.5, 7.5] },
};
/** Every marine species shares one band (natural seawater); no hardness check. */
export const MARINE_PH: R = [8.0, 8.4];

/** The smallest group a shoaling or schooling species is kept in (fewer = stressed, shy or nippy). Advice only. */
export const GROUP: Record<string, number> = {
  neon: 6, cardinal: 6, ember: 8, rummynose: 8, harlequin: 8, chili: 8, danio: 6, whitecloud: 6, cpd: 6, hatchet: 6,
  cherrybarb: 6, tigerbarb: 6, boesemani: 6, bronzecory: 6, pandacory: 6, pygmycory: 8, oto: 6, kuhli: 6,
  clownloach: 5, cherryshrimp: 10, amano: 5, chromis: 5,
};
