// Water chemistry and group sizes for the care gates (lane CG, 2026-10-19). Hand-curated: pH / GH ranges follow FishBase
// (CC BY-NC 4.0, fishbase.se, the "pH range" / "dH range" of each species' summary) where it lists them, otherwise common
// aquarium practice; nothing is copied from a care site. Advice only, as care.ts. Checked against FishBase 2026-10-19: kept
// wider than FishBase where farmed stock lives in harder water (neon GH, cardinal / ram upper pH, Bolivian ram from 6.0).
type R = [number, number];
/** Preferred pH, and general hardness in dGH where sources agree (absent = no hardness check). Freshwater only.
 *  phOk / ghOk: the documented acceptable range, where it is wider than the preferred one (Nathan 2026-10-26). Absent = the preferred
 *  range is also the acceptable one: nothing is padded automatically (a blanket +-0.5 pH widening turned 360 of 388 failing pairs
 *  amber, neon tetras with Malawi cichlids among them; research/chem-audit.md). */
export const CHEM: Record<string, { ph: R; gh?: R; phOk?: R; ghOk?: R }> = {
  // Acceptable ranges for farmed soft-water fish (Nathan 2026-10-26: shell-building snails were red with them only at the pH 7.0 edge), one
  // source each. Neon: Seriously Fish "pH 4.0-7.5, 1-12 dGH". Ember: Aquarium Co-Op "adaptable enough to handle pH of 5.5-7.5" (no GH
  // figure; low end stays 5.0). Rummy-nose: Aquarium Co-Op "they can do well in pH levels of 5.5-7.5" (no GH figure). Harlequin: Seriously
  // Fish "pH 5.0-7.5, 1-12 dGH". Marbled hatchetfish: FishBase "pH range: 5.0 - 8.0"
  // (its "dH range: 5 - 19" not taken: with it the hatchetfish went amber with four Lake Malawi species; GH stays 1-10). Left alone, no source wider than
  // pH 7.0: chili rasbora (Seriously Fish 4.0-7.0, FishBase 6.5-7.0), discus (Seriously Fish 5.0-7.0), German blue ram (Seriously Fish 4.0-7.0).
  neon: { ph: [5.0, 7.0], gh: [1, 10], phOk: [4.0, 7.5], ghOk: [1, 12] }, cardinal: { ph: [3.5, 7.5], gh: [1, 8] }, ember: { ph: [5.0, 7.0], gh: [1, 10], phOk: [5.0, 7.5] },
  // dwarf pencilfish: FishBase pH 5.8-7.5, dH to 15; low end widened to 5.0 inside Seriously Fish's 4.0-7.0 (wild water 4-6), GH from 1 (SF 1-10)
  dwarfpencil: { ph: [5.0, 7.5], gh: [1, 15] }, sterbai: { ph: [6.0, 8.0], gh: [2, 25] },
  rummynose: { ph: [5.5, 7.0], gh: [1, 10], phOk: [5.5, 7.5] }, harlequin: { ph: [5.0, 7.0], gh: [1, 12], phOk: [5.0, 7.5] }, chili: { ph: [5.0, 7.0], gh: [1, 8] },
  danio: { ph: [6.0, 8.0] }, whitecloud: { ph: [6, 8.3] }, cpd: { ph: [6.5, 7.5] }, hatchet: { ph: [5, 7], gh: [1, 10], phOk: [5, 8] },
  cherrybarb: { ph: [6, 8] }, tigerbarb: { ph: [6, 8] }, boesemani: { ph: [7.0, 8.0], gh: [9, 19] },
  guppy: { ph: [7, 8.3], gh: [8, 25] }, platy: { ph: [7.0, 8.2], gh: [9, 25] }, molly: { ph: [7.5, 8.5], gh: [10, 25] },
  swordtail: { ph: [7, 8], gh: [9, 25] }, betta: { ph: [6.0, 7.5] }, dwarfgourami: { ph: [6.0, 7.5] }, honeygourami: { ph: [6.0, 7.5] },
  gourami: { ph: [5.5, 8] }, gbr: { ph: [4, 7], gh: [1, 8] }, bolivianram: { ph: [6.0, 7.5] }, kribensis: { ph: [6.0, 7.5] },
  cockatoo: { ph: [5, 6], gh: [2, 15] },
  // Lake Malawi / Tanganyika: hard, alkaline water
  yellowlab: { ph: [7.6, 8.6], gh: [10, 20] }, peacock: { ph: [7.5, 9], gh: [10, 20] }, demasoni: { ph: [7.6, 8.6], gh: [10, 20] },
  kadango: { ph: [7.6, 8.6], gh: [10, 20] }, syno: { ph: [7.5, 8.5], gh: [10, 25] }, labeo: { ph: [7.6, 8.6], gh: [10, 20] },
  auratus: { ph: [7.6, 8.6], gh: [10, 20] }, livingstonii: { ph: [7.6, 8.6], gh: [10, 20] }, afra: { ph: [7.6, 8.6], gh: [10, 20] },
  angel: { ph: [6.0, 7.5] }, discus: { ph: [5.0, 7.0], gh: [1, 8] }, oscar: { ph: [6.0, 8.0] }, goldfish: { ph: [6, 8] }, comet: { ph: [6, 8] },
  bronzecory: { ph: [6.0, 8.0] }, pandacory: { ph: [6.0, 7.5] }, pygmycory: { ph: [6.4, 7.4] }, bristlenose: { ph: [6.0, 8.0] },
  // kuhli: wild water is pH 5.5-6.5, very soft (FishBase); farmed stock is kept to pH 7.5, GH 10 (common aquarium practice), so that is its
  // acceptable range, the preferred one stays soft and acidic (Nathan 2026-10-26)
  oto: { ph: [6.0, 7.5] }, kuhli: { ph: [5.5, 7.0], gh: [1, 6], phOk: [5.5, 7.5], ghOk: [1, 10] }, clownloach: { ph: [5, 7.5] }, sae: { ph: [6.5, 8] },
  hillstream: { ph: [6, 7.5] }, peapuffer: { ph: [7.0, 8.0] },
  // invertebrates: snails need some hardness for their shells
  cherryshrimp: { ph: [6.5, 8.0], gh: [4, 14] }, amano: { ph: [6.0, 8.0], gh: [3, 15] }, nerite: { ph: [7.0, 8.5], gh: [6, 18] },
  // mystery snail: Aquarium Co-Op's care guide, "pH of at least 7.2, and GH above 150 ppm (or 8 degrees)", is the preferred floor; the
  // older 6.5 / 6 floor is kept as acceptable (Nathan 2026-10-26). Nerite: its Aquarium Co-Op guide says pH above 7.0 and plenty of minerals,
  // no GH figure, which its 7.0-8.5 already covers.
  mystery: { ph: [7.2, 8.0], gh: [8, 18], phOk: [6.5, 8.0], ghOk: [6, 18] }, ramshorn: { ph: [7, 8], gh: [6, 18] }, trumpet: { ph: [6.5, 8.0] },
  adf: { ph: [6.5, 7.8] }, axolotl: { ph: [7.0, 7.6] }, firenewt: { ph: [6.5, 7.5] }, firetoad: { ph: [6.5, 7.5] },
};
/** Every marine species shares one band (natural seawater); no hardness check. */
export const MARINE_PH: R = [8.0, 8.4];

/** The smallest group a shoaling or schooling species is kept in (fewer = stressed, shy or nippy). Advice only. */
export const GROUP: Record<string, number> = {
  neon: 8, cardinal: 8, ember: 8, rummynose: 10, harlequin: 8, chili: 8, danio: 8, whitecloud: 6, cpd: 6, hatchet: 6,
  cherrybarb: 6, tigerbarb: 8, boesemani: 6, bronzecory: 4, sterbai: 6, dwarfpencil: 8, pandacory: 6, pygmycory: 6, oto: 6, kuhli: 5,
  clownloach: 5, cherryshrimp: 10, amano: 6, chromis: 6,
};
