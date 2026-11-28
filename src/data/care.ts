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
  /** eats animals up to this length (mm), optionally only of these groups. `inverts: 'shrimp'`: of the invertebrates it takes only
   *  shrimp (SHRIMP), since shrimp and snails share 'fw-invert'; without it every invertebrate in range counts, snails included
   *  (lane IP 2026-10-22). `young`: past `mm` and up to this adult length it still takes the young and small ones, an advisory
   *  (only consider large adults; the plan does not know their size, so it never says they are safe), not "would eat it". */
  prey?: { mm: number; cats?: Category[]; inverts?: 'shrimp'; young?: number };
  /** predation was researched and the answer is "harmless" (no `prey`); absent with no `prey` = never researched (S242 audit 2026-10-26) */
  preyChecked?: true;
  /** one of its kind per tank (a bonded pair is fine); `fam` extends that to look-alike rivals (tangs) */
  solo?: true;
  fam?: string;
  /** long, flowing fins: a target for nippers and territorial fish */
  slow?: true;
  /** nips fins */
  nip?: true;
  /** long pelvic feelers (gouramis): a target for fin nippers only, not for territorial fish (lane CP 2026-10-22) */
  feelers?: true;
  /** best kept in a species-only tank (pea puffer): a concern beside any other fish, blocking beside fins or feelers it nips (lane CP) */
  alone?: true;
  /** a breeding pair defends about this much floor, cm2 (kribensis, cockatoo, rams, angel: lane CP2 estimates): a concern when a pair shares a smaller-than-twice floor with
   *  other fish (lane CP 2026-10-22: breeding kribs guard roughly a 2 ft x 1 ft patch around their cave) */
  guard?: number;
  /** the cover it needs in the scene (lane CP2 2026-10-22): 'plants' = dense planting to break sight lines (pea puffer), 'cave' = a
   *  cave or arch to spawn in (cave-spawning cichlids); advice when the scene lacks it */
  cover?: 'plants' | 'cave';
  /** comfortable pH and general hardness (dGH; absent = no hardness check), aquatic species (lane CG, data/waterchem.ts) */
  ph?: [number, number];
  gh?: [number, number];
  /** the documented acceptable pH / GH where wider than the preferred (waterchem.ts phOk / ghOk); absent = the preferred range */
  phOk?: [number, number];
  ghOk?: [number, number];
  /** smallest group it is kept in (shoalers, schoolers, shrimp colonies) */
  group?: number;
  /** marine: 1 may nip corals (add with caution), 2 eats corals (not reef-safe). Invertebrate eaters are `prey` with `cats`. */
  coral?: 1 | 2;
}
/** What we know about whether a species eats its tankmates: 'predator' (a `prey` rule), 'harmless' (researched, `preyChecked`), 'unknown'
 *  (never researched: no data, not a pass). Nothing reads this to change a verdict yet; it lets a screen say "not researched". */
export const preyKnowledge = (id: string): 'predator' | 'harmless' | 'unknown' => CARE[id]?.prey ? 'predator' : CARE[id]?.preyChecked ? 'harmless' : 'unknown';
/** The shrimp in the catalogue, for prey.inverts (the catalogue has no shrimp kind; test/invertprey.test.ts keeps this list whole). */
export const SHRIMP: ReadonlySet<string> = new Set(['cherryshrimp', 'amano', 'cleanershrimp']);
const A = (care: Expertise, minL: number, temper: 0 | 1 | 2, temp?: [number, number], x: Partial<AnimalCare> = {}): AnimalCare => ({ care, minL, temper, ...(temp ? { temp } : {}), ...x });
export const CARE: Record<string, AnimalCare> = {
  neon: A(1, 54, 0, [21, 25], { tol: [20, 26] }), cardinal: A(1, 54, 0, [24, 28]), ember: A(1, 41, 0, [23, 28]), dwarfpencil: A(2, 41, 0, [24, 28]), rummynose: A(1, 76, 0, [24, 28]),
  blackskirt: A(1, 61, 1, [22, 26], { tol: [20, 28], nip: true }), harlequin: A(1, 54, 0, [22, 27]), chili: A(2, 20, 0, [22, 28]), danio: A(1, 40, 0, [18, 25], { nip: true }), whitecloud: A(1, 54, 0, [16, 22]),
  cpd: A(1, 40, 0, [22, 26]), hatchet: A(2, 68, 0, [23, 27]), cherrybarb: A(1, 54, 0, [22, 27]), tigerbarb: A(1, 72, 2, [20, 26], { nip: true }),
  boesemani: A(2, 110, 0, [24, 27]), guppy: A(1, 19, 0, [22, 28], { slow: true }), endler: A(1, 41, 0, [24, 30], { slow: true }), glasscatfish: A(2, 81, 0, [22, 26]), yoyoloach: A(1, 243, 1, [20, 27], { nip: true }), clownpleco: A(1, 76, 0, [23, 28]), saltpepper: A(1, 54, 0, [20, 26]), firemouth: A(1, 108, 1, [22, 28], { guard: 900, cover: 'cave' }), neonrainbow: A(1, 54, 0, [23, 28]), falsejulii: A(1, 41, 0, [22, 26]), peacockgudgeon: A(1, 41, 1, [22, 26]), clownkilli: A(2, 41, 0, [20, 26]), electricblueacara: A(1, 208, 1, [22, 28], { guard: 900, cover: 'cave' }), convict: A(1, 114, 2, [24, 28], { guard: 1800, cover: 'cave' }), glowlight: A(1, 68, 0, [24, 28]), pleco: A(1, 284, 1, [22, 30]), threespot: A(1, 81, 1, [24, 30], { feelers: true }), platy: A(1, 38, 0, [18, 26]), molly: A(1, 80, 0, [22, 28]),
  swordtail: A(2, 57, 1, [18, 26]), betta: A(2, 20, 1, [24, 28], { solo: true, slow: true }), dwarfgourami: A(1, 56, 1, [24, 28], { feelers: true }), // not solo since S196 / lane CW: males are limited by groups.ts `males`
  honeygourami: A(1, 19, 0, [22, 28], { feelers: true }), gourami: A(1, 81, 0, [24, 28], { feelers: true }), gbr: A(2, 76, 0, [26, 30], { prey: { mm: 30, cats: ['fw-invert'], inverts: 'shrimp', young: 60 }, guard: 900 }), bolivianram: A(2, 110, 0, [22, 26], { guard: 900 }),
  kribensis: A(1, 71, 1, [22, 26], { guard: 1800, cover: 'cave' }), cockatoo: A(2, 54, 1, [22, 26], { guard: 900, cover: 'cave' }), yellowlab: A(1, 150, 1, [24, 28]),
  peacock: A(2, 243, 0, [24, 28]), demasoni: A(2, 200, 2, [24, 28]), kadango: A(2, 280, 0, [24, 28]), syno: A(2, 108, 1, [24, 28]),
  labeo: A(2, 200, 2, [24, 28]), auratus: A(2, 205, 2, [24, 28]), livingstonii: A(2, 470, 2, [24, 28], { prey: { mm: 80 } }), afra: A(2, 200, 2, [24, 28]),
  angel: A(1, 200, 1, [24, 28], { prey: { mm: 30, inverts: 'shrimp' }, slow: true, guard: 2400 }), discus: A(3, 250, 0, [26, 30], { slow: true, tol: [26, 30] }),
  oscar: A(2, 540, 1, [22, 28], { prey: { mm: 100 } }), goldfish: A(1, 75, 0, [16, 23]), comet: A(1, 300, 0, [18, 22], { tol: [15.6, 26.7] }),
  bronzecory: A(1, 72, 0, [22, 26]), sterbai: A(1, 41, 0, [24, 28]), pandacory: A(1, 41, 0, [20, 24]), pepperedcory: A(1, 72, 0, [18, 24]), pygmycory: A(1, 38, 0, [22, 26]), bristlenose: A(1, 80, 0, [22, 27]),
  oto: A(2, 40, 0, [22, 26]), kuhli: A(1, 80, 0, [24, 28]), clownloach: A(2, 284, 0, [24, 28], { prey: { mm: 30, cats: ['fw-invert'] } }),
  balashark: A(2, 864, 0, [22, 28], { prey: { mm: 30 } }), rainbowshark: A(2, 243, 2, [22, 26], { solo: true, fam: 'rainbow shark', cover: 'cave', preyChecked: true }), sparklinggourami: A(2, 41, 0, [24, 28], { preyChecked: true, cover: 'plants' }), croakinggourami: A(2, 54, 1, [23, 28], { preyChecked: true, cover: 'plants' }), redtailshark: A(2, 200, 2, [22, 26], { solo: true, fam: 'rainbow shark', cover: 'cave', preyChecked: true }),
  sae: A(1, 93, 0, [22, 26]), hillstream: A(2, 60, 0, [18, 24]), peapuffer: A(2, 20, 2, [24, 28], { prey: { mm: 45, cats: ['fw-invert'] }, nip: true, alone: true, cover: 'plants' }),
  greenneon: A(2, 41, 0, [24, 27]), merah: A(2, 41, 0, [22, 27]), exclamation: A(2, 41, 0, [22, 27]), dwarfrasbora: A(2, 41, 0, [22, 27]),
  cpo: A(1, 38, 1, [18, 26], { prey: { mm: 40, cats: ['fw-invert'] } }), cajundwarf: A(1, 19, 1, [18, 24], { prey: { mm: 40, cats: ['fw-invert'] } }),
  rswcrayfish: A(2, 75, 2, [18, 26], { solo: true, prey: { mm: 60 } }), redclaw: A(2, 200, 2, [23, 28], { solo: true, prey: { mm: 100 } }),
  thaicrab: A(2, 19, 0, [22, 28]), asellus: A(1, 8, 0, [16, 24]),
  cherryshrimp: A(1, 20, 0, [18, 26]), amano: A(1, 40, 0, [18, 26]), nerite: A(1, 8, 0, [22, 28]), mystery: A(1, 19, 0, [20, 26]),
  ramshorn: A(1, 5, 0, [18, 28]), trumpet: A(1, 20, 0, [18, 28]),
  ocellaris: A(1, 57, 1, [24, 27]), royalgramma: A(1, 115, 0, [24, 27], { solo: true }), yellowtang: A(1, 379, 1, [24, 27], { solo: true, fam: 'tang' }),
  koletang: A(1, 307, 1, [24, 26], { solo: true, fam: 'bristletooth', preyChecked: true }), // RX2 (R139 phase 2, 2026-11-19)
  foxface: A(1, 322, 0, [24, 26], { solo: true, fam: 'rabbitfish', preyChecked: true }), // RX2 (R139 phase 2, 2026-11-19)
  flameangel: A(2, 216, 1, [22, 26], { solo: true, fam: 'dwarfangel', preyChecked: true }), // RX2 (R139 phase 2, 2026-11-19)
  lawnmowerblenny: A(2, 159, 0, [24, 26], { solo: true, fam: 'blenny', preyChecked: true }), // RX2 (R139 phase 2, 2026-11-19)
  orchiddottyback: A(1, 106, 1, [24, 26], { solo: true, fam: 'dottyback', preyChecked: true }), // RX2 (R139 phase 2, 2026-11-19)
  bichir: A(2, 445, 0, [24, 28], { prey: { mm: 110 } }), // R150 (2026-11-25): minL = the mean of 5 minimums, 117.5 gal; prey = an estimate, a third of its length
  clownknife: A(3, 757, 1, [24, 28], { prey: { mm: 450 }, solo: true }), // R150: minL = 200 gal (Furry Critter's minimum); prey = half its length (a knifefish care page)
  bambooshark: A(3, 859, 1, [22, 26], { prey: { mm: 150 }, solo: true }), // R150: minL = the mean of 3 minimums, 227 gal; prey = an estimate (crabs, shrimp, small fish)
  dwarfchainloach: A(1, 87, 1, [24, 28], { tol: [20, 30], tolEst: true, group: 6 }), // SO3 R204 (2026-11-28): minL = the mean of 3 minimums (19, 20, 30 gal) = 23 gal; temper 1 (sources range from peaceful to semi-aggressive, and sedentary or long-finned fish are at risk); no prey size found, so predation is not marked as researched
  bleedingheart: A(1, 77, 1, [23, 27], { tol: [21, 28], tolEst: true, group: 6, nip: true }), // SO3 R204 (2026-11-28): minL = the mean of 3 minimums (21, 20, 20 gal) = 20.3 gal; temper 1 and nip because two pages say a lone or under-grouped fish turns territorial and nips; no prey size found, so predation is not marked as researched
  blackneon: A(1, 62, 0, [23, 27], { tol: [20, 28], tolEst: true, group: 6 }), // SO3 R204 (2026-11-28): minL = the mean of 3 minimums (19, 20, 10 gal) = 16.3 gal; temper 0 (very peaceful, no nipping reported); no prey size found, so predation is not marked as researched
  agassizii: A(2, 68, 1, [24, 28], { tol: [22, 29], tolEst: true, guard: 900, cover: 'cave' }), // SO3 R204 (2026-11-28): minL = the mean of 3 minimums (14, 20, 20 gal) = 18 gal; temper 1 (males guard a territory, a lone female turns hyper-aggressive in a small tank); a cave per female; no prey size found, so predation is not marked as researched
  silverdollar: A(1, 276, 0, [24, 28], { tol: [22, 29], tolEst: true, group: 5, prey: { mm: 30 } }), // SO1 R202 (2026-11-28): minL = the mean of 3 minimums (69, 75, 75 gal) = 73 gal; prey = an estimate (the pages name neons, bettas and shrimp as at risk, no size)
  serpae: A(1, 75, 1, [22, 27], { tol: [20, 28], tolEst: true, group: 6, nip: true }), // SO1 R202 (2026-11-28): minL = the mean of 3 minimums (19, 20, 20 gal) = 19.7 gal; temper 1 and nip because three pages describe fin nipping, worst in small groups
  scarletbadis: A(2, 40, 0, [22, 26], { tol: [18, 27], tolEst: true, cover: 'plants' }), // SO1 R202 (2026-11-28): minL = the mean of 2 minimums (11, 10 gal) = 10.5 gal; temper 0 (peaceful to other species; males sparring is a group rule)
  bumblebeegoby: A(2, 40, 0, [22, 28], { tol: [21, 29], tolEst: true, group: 6 }), // SO1 R202 (2026-11-28): minL = the mean of 2 minimums (11, 10 gal) = 10.5 gal; no prey size or predator rule found
  greenspotpuffer: A(3, 155, 2, [23, 27], { tol: [22, 28], tolEst: true, solo: true, nip: true, prey: { mm: 60 } }), // SO1 R202 (2026-11-28): minL = the mean of 2 minimums (29, 53 gal) = 41 gal; prey = an estimate, a third of its length (no source gives a size); brackish water is an unchecked NEEDS line, the engine has no salinity model for freshwater species
  paradisefish: A(1, 75, 2, [18, 25], { tol: [12, 28], tolEst: true }), // SO1 R202 (2026-11-28): minL = the mean of 3 minimums (19, 20, 20 gal) = 19.7 gal; temper 2 (aggressive per three pages); no prey size found, so predation is not marked researched
  jackdempsey: A(2, 239, 2, [24, 27], { tol: [20, 30], tolEst: true, prey: { mm: 80 }, guard: 1200, cover: 'cave' }), // SO1 R202 (2026-11-28): minL = the mean of 6 minimums (64, 55, 50, 80, 55, 75 gal) = 63 gal; temper 2 (pugnacious, belligerent); prey = an estimate, a third of its length (the pages say anything that fits its mouth)
  frontosa: A(2, 594, 1, [23, 27], { tol: [22, 28], tolEst: true, group: 5, prey: { mm: 105 }, guard: 1200, cover: 'cave' }), // SO1 R202 (2026-11-28): minL = the mean of 4 group minimums (228, 125, 125, 150 gal) = 157 gal; prey = an estimate, a third of its length (no source gives a size)
  denison: A(2, 217, 1, [18, 25], { tol: [15, 26], tolEst: true, group: 6 }), // SO1 R202 (2026-11-28): minL = the mean of 4 minimums (64, 55, 55, 55 gal) = 57.25 gal; temper 1 because it chases slow, delicate fish (Aquarium Source, Aquariadise); no prey figure found, so predation is not marked as researched
  congotetra: A(1, 128, 0, [23, 27], { tol: [22, 28], tolEst: true, group: 6, preyChecked: true }), // SO1 R202 (2026-11-28): minL = the mean of 5 minimums (29, 30, 30, 40, 40 gal) = 33.8 gal; no source says it eats tankmates
  pajamacardinal: A(1, 98, 0, [22, 26], { preyChecked: true }), // RX2 (R139 phase 2, 2026-11-19)
  yellowtailblue: A(1, 106, 1, [22, 26], { preyChecked: true }), // RX2 (R139 phase 2, 2026-11-19)
  tailspotblenny: A(1, 45, 0, [24, 26], { solo: true, fam: 'blenny', preyChecked: true }), // RX2 (R139 phase 2, 2026-11-19)
  bluetang: A(2, 681, 1, [24, 27], { solo: true, fam: 'tang' }), firefish: A(1, 75, 0, [24, 27]), banggai: A(1, 38, 0, [24, 27]),
  sixline: A(1, 208, 1, [24, 27], { solo: true, prey: { mm: 30, cats: ['sw-invert'] } }), chromis: A(1, 115, 0, [24, 27]),
  coralbeauty: A(2, 265, 1, [24, 27], { solo: true, coral: 1 }), watchman: A(1, 75, 0, [24, 27]), mandarin: A(3, 265, 0, [24, 27]),
  cleanershrimp: A(1, 75, 0, [24, 27]), turbo: A(1, 40, 0, [24, 27]), bta: A(2, 600, 0, [24, 27]), hermit: A(1, 40, 0, [24, 27], { prey: { mm: 50, cats: ['sw-invert'] } }),
  dartfrog: A(1, 40, 1), treefrog: A(1, 76, 0, undefined, { prey: { mm: 50, cats: ['amphibian', 'land-invert'] } }), firetoad: A(1, 57, 0), firenewt: A(1, 66, 0),
  adf: A(2, 19, 0, [22, 27]), axolotl: A(2, 110, 0, [15, 18], { prey: { mm: 80 }, tol: [10, 22] }),
  crestedgecko: A(1, 127, 0, undefined, { solo: true, prey: { mm: 40, cats: ['land-invert'] } }), crestedharlequin: A(1, 127, 1, undefined, { solo: true, prey: { mm: 40, cats: ['land-invert'] } }),
  greenanole: A(1, 38, 1, undefined, { prey: { mm: 25, cats: ['land-invert'] } }), greenanolebrown: A(1, 38, 1, undefined, { prey: { mm: 25, cats: ['land-invert'] } }),
  brownanole: A(1, 40, 1, undefined, { prey: { mm: 25, cats: ['land-invert'] } }),
  leopardgecko: A(1, 76, 1, undefined, { solo: true, prey: { mm: 60, cats: ['land-invert'] } }), regaljumper: A(1, 2, 0, undefined, { solo: true, prey: { mm: 15 } }),
  ballpython: A(2, 450, 0, undefined, { solo: true, prey: { mm: 600 } }), chacogoldenknee: A(1, 57, 0, undefined, { solo: true, prey: { mm: 60 } }),
  // arthropod research 2026-10-28: minL = the enclosure's floor x height from the care sheets (litres)
  redknee: A(1, 13, 0, undefined, { solo: true, prey: { mm: 60 } }),
  chileanrose: A(1, 15, 0, undefined, { solo: true, prey: { mm: 60 } }),
  curlyhair: A(1, 20, 0, undefined, { solo: true, prey: { mm: 60 } }),
  pinktoe: A(2, 12, 0, undefined, { solo: true, prey: { mm: 50 } }),
  emperorscorpion: A(1, 35, 1, undefined, { solo: true, prey: { mm: 60 } }),
  africanmillipede: A(1, 193, 0, undefined),
  hissingroach: A(1, 41, 0, undefined),
  zebraisopod: A(1, 4, 0, undefined),
  powderblueisopod: A(1, 3, 0, undefined),
  orchidmantis: A(2, 9, 1, undefined, { solo: true, prey: { mm: 40 } }),
  indianstick: A(1, 24, 0, undefined),
  purplepincher: A(2, 41, 0, undefined),
};
// Researched temperature bands (research/climate, 2026-10-19) replace the first-guess ranges above.
for (const [id, w] of Object.entries(WATER)) { const c = CARE[id]; if (c) { c.temp = w.ok; c.tol = w.tol; if (w.est) c.tolEst = true; } }
// Water chemistry and group sizes (lane CG, 2026-10-19): one marine pH band for every salt species, no hardness check.
for (const [id, w] of Object.entries(CHEM)) { const c = CARE[id]; if (c) { c.ph = w.ph; if (w.gh) c.gh = w.gh; if (w.phOk) c.phOk = w.phOk; if (w.ghOk) c.ghOk = w.ghOk; } }
for (const [id, n] of Object.entries(GROUP)) { const c = CARE[id]; if (c) c.group = n; }
for (const sp of SPECIES) if (sp.salt && CARE[sp.id]) CARE[sp.id].ph = MARINE_PH;
// Group bands, caps, sex ratios and habitat limits (lane P1, 2026-10-20; data/groups.ts, sources in research/groups-sources.md).
for (const [id, g] of Object.entries(GROUPS)) { const c = CARE[id]; if (c) Object.assign(c, g); }
