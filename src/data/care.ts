// Animal care data for gating (lane AD, 2026-10-16): who can keep what, in which tank, with whom. Advice only: the Animals list
// grays what does not suit and says why, nothing is blocked. ESTIMATES from common aquarium / vivarium practice (not a source
// of record): minL is the smallest tank (litres) for the usual first group or one adult, temp is the comfortable water range.
import { SPECIES, type Category } from './species';
import { WATER } from './climatedata';
import { CHEM, GROUP, MARINE_PH } from './waterchem';
import { GROUPS, type GroupCare } from './groups';

/** 1 beginner, 2 intermediate, 3 expert. */
export type Expertise = 1 | 2 | 3;
export const EXPERTISE_NAME: Record<Expertise, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Expert' };
export interface AnimalCare extends GroupCare {
  care: Expertise;
  /** smallest tank or enclosure volume, litres */
  minL: number;
  /** 0 peaceful, 1 territorial or pushy (harasses slow, long-finned or shy tankmates), 2 aggressive (bullies most things) */
  temper: 0 | 1 | 2;
  /** comfortable water temperature, deg C (aquatic species; absent = no water-temperature check) */
  temp?: [number, number];
  /** tolerable water temperature (survives, not for the long haul); absent = estimated as the comfortable band +-2 deg */
  tol?: [number, number];
  /** the tolerable band rests on thin sources or judgement (low confidence) */
  tolEst?: true;
  /** eats animals up to this length (mm), optionally only of these groups */
  prey?: { mm: number; cats?: Category[] };
  /** one of its kind per tank (a bonded pair is fine); `fam` extends that to look-alike rivals (tangs) */
  solo?: true;
  fam?: string;
  /** long, flowing fins: a target for nippers and territorial fish */
  slow?: true;
  /** nips fins */
  nip?: true;
  /** comfortable pH and general hardness (dGH; absent = no hardness check), aquatic species (lane CG, data/waterchem.ts) */
  ph?: [number, number];
  gh?: [number, number];
  /** smallest group it is kept in (shoalers, schoolers, shrimp colonies) */
  group?: number;
  /** marine: 1 may nip corals (add with caution), 2 eats corals (not reef-safe). Invertebrate eaters are `prey` with `cats`. */
  coral?: 1 | 2;
}
const A = (care: Expertise, minL: number, temper: 0 | 1 | 2, temp?: [number, number], x: Partial<AnimalCare> = {}): AnimalCare => ({ care, minL, temper, ...(temp ? { temp } : {}), ...x });
export const CARE: Record<string, AnimalCare> = {
  neon: A(1, 40, 0, [22, 25], { tol: [20, 27] }), cardinal: A(1, 60, 0, [24, 28]), ember: A(1, 30, 0, [23, 28]), rummynose: A(1, 60, 0, [24, 28]),
  harlequin: A(1, 40, 0, [22, 27]), chili: A(2, 20, 0, [22, 28]), danio: A(1, 40, 0, [18, 25], { nip: true }), whitecloud: A(1, 40, 0, [16, 22]),
  cpd: A(1, 40, 0, [22, 26]), hatchet: A(1, 60, 0, [23, 27]), cherrybarb: A(1, 60, 0, [22, 27]), tigerbarb: A(1, 80, 1, [20, 26], { nip: true }),
  boesemani: A(2, 110, 0, [24, 27]), guppy: A(1, 40, 0, [22, 28], { slow: true }), platy: A(1, 60, 0, [18, 26]), molly: A(1, 80, 0, [22, 28]),
  swordtail: A(1, 110, 1, [18, 26]), betta: A(1, 20, 1, [24, 28], { solo: true, slow: true }), dwarfgourami: A(1, 60, 1, [24, 28], { solo: true }),
  honeygourami: A(1, 40, 0, [22, 28]), gourami: A(1, 110, 0, [24, 28]), gbr: A(2, 60, 0, [26, 30]), bolivianram: A(2, 110, 0, [22, 26]),
  kribensis: A(1, 80, 1, [22, 26]), cockatoo: A(2, 60, 1, [22, 26]), yellowlab: A(1, 150, 1, [24, 28]),
  peacock: A(2, 200, 1, [24, 28]), demasoni: A(2, 200, 2, [24, 28]), kadango: A(2, 250, 1, [24, 28]), syno: A(2, 200, 1, [24, 28]),
  labeo: A(2, 250, 2, [24, 28]), auratus: A(2, 250, 2, [24, 28]), livingstonii: A(2, 400, 2, [24, 28], { prey: { mm: 80 } }), afra: A(2, 250, 2, [24, 28]),
  angel: A(1, 200, 1, [24, 28], { prey: { mm: 30 }, slow: true }), discus: A(3, 250, 0, [28, 30], { slow: true, tol: [26, 31] }),
  oscar: A(2, 540, 2, [22, 28], { prey: { mm: 100 } }), goldfish: A(1, 75, 0, [16, 23]), comet: A(1, 300, 0, [16, 22], { tol: [10, 26] }),
  bronzecory: A(1, 80, 0, [22, 26]), pandacory: A(1, 41, 0, [20, 24]), pygmycory: A(1, 30, 0, [22, 26]), bristlenose: A(1, 80, 0, [22, 27]),
  oto: A(2, 40, 0, [22, 26]), kuhli: A(1, 80, 0, [24, 28]), clownloach: A(2, 400, 0, [24, 28], { prey: { mm: 30, cats: ['fw-invert'] } }),
  sae: A(1, 110, 0, [22, 26]), hillstream: A(2, 60, 0, [18, 24]), peapuffer: A(2, 20, 2, [24, 28], { prey: { mm: 45, cats: ['fw-invert'] }, nip: true }),
  cherryshrimp: A(1, 20, 0, [18, 26]), amano: A(1, 40, 0, [18, 26]), nerite: A(1, 20, 0, [22, 28]), mystery: A(1, 40, 0, [20, 26]),
  ramshorn: A(1, 20, 0, [18, 28]), trumpet: A(1, 20, 0, [18, 28]),
  ocellaris: A(1, 75, 1, [24, 27]), royalgramma: A(1, 115, 0, [24, 27], { solo: true }), yellowtang: A(2, 455, 1, [24, 27], { solo: true, fam: 'tang' }),
  bluetang: A(2, 570, 1, [24, 27], { solo: true, fam: 'tang' }), firefish: A(1, 75, 0, [24, 27]), banggai: A(1, 115, 0, [24, 27]),
  sixline: A(1, 208, 1, [24, 27], { solo: true, prey: { mm: 30, cats: ['sw-invert'] } }), chromis: A(1, 115, 0, [24, 27]),
  coralbeauty: A(1, 265, 1, [24, 27], { solo: true, coral: 1 }), watchman: A(1, 75, 0, [24, 27]), mandarin: A(3, 265, 0, [24, 27]),
  cleanershrimp: A(1, 75, 0, [24, 27]), turbo: A(1, 40, 0, [24, 27]), hermit: A(1, 40, 0, [24, 27], { prey: { mm: 50, cats: ['sw-invert'] } }),
  dartfrog: A(1, 40, 0), treefrog: A(1, 76, 0, undefined, { prey: { mm: 50, cats: ['amphibian', 'land-invert'] } }), firetoad: A(1, 57, 0), firenewt: A(1, 75, 0),
  adf: A(2, 40, 0, [22, 27]), axolotl: A(2, 110, 0, [16, 20], { prey: { mm: 80 }, tol: [10, 22] }),
  crestedgecko: A(1, 127, 0, undefined, { solo: true, prey: { mm: 40, cats: ['land-invert'] } }), crestedharlequin: A(1, 127, 0, undefined, { solo: true, prey: { mm: 40, cats: ['land-invert'] } }),
  greenanole: A(1, 75, 1, undefined, { prey: { mm: 25, cats: ['land-invert'] } }), greenanolebrown: A(1, 75, 1, undefined, { prey: { mm: 25, cats: ['land-invert'] } }),
  brownanole: A(1, 40, 1, undefined, { prey: { mm: 25, cats: ['land-invert'] } }),
  leopardgecko: A(1, 150, 0, undefined, { solo: true, prey: { mm: 60, cats: ['land-invert'] } }), regaljumper: A(1, 2, 0, undefined, { solo: true, prey: { mm: 15 } }),
  ballpython: A(2, 450, 0, undefined, { solo: true, prey: { mm: 600 } }), chacogoldenknee: A(1, 57, 0, undefined, { solo: true, prey: { mm: 60 } }),
};
// Researched temperature bands (research/climate, 2026-10-19) replace the first-guess ranges above.
for (const [id, w] of Object.entries(WATER)) { const c = CARE[id]; if (c) { c.temp = w.ok; c.tol = w.tol; if (w.est) c.tolEst = true; } }
// Water chemistry and group sizes (lane CG, 2026-10-19): one marine pH band for every salt species, no hardness check.
for (const [id, w] of Object.entries(CHEM)) { const c = CARE[id]; if (c) { c.ph = w.ph; if (w.gh) c.gh = w.gh; } }
for (const [id, n] of Object.entries(GROUP)) { const c = CARE[id]; if (c) c.group = n; }
for (const sp of SPECIES) if (sp.salt && CARE[sp.id]) CARE[sp.id].ph = MARINE_PH;
// Group bands, caps, sex ratios and habitat limits (lane P1, 2026-10-20; data/groups.ts, sources in research/groups-sources.md).
for (const [id, g] of Object.entries(GROUPS)) { const c = CARE[id]; if (c) Object.assign(c, g); }
