// Resting, hovering and digging habits of the fish (lane FB1, R105, 2026-11-16), read by render/build.ts and handed to the swim sim
// (swimSim.ts) as plain numbers on each SwimmerSpec. The sim never looks at species ids: a species is in one of these tables or it
// is not, and a species in neither swims as before. Judgement from the care sheets and field notes (research/substrate-depth-2026-11-12.md
// for the burrowers); no number here is a measured share, they set how OFTEN and how HARD, not what is true.
import type { Grain } from './types';

/** Hovering: the body nearly still, the pectorals fanning, small drifts, then on again (labyrinth fish, dwarf cichlids, hatchets, pea puffers). */
export interface HoverSpec {
  /** 0..1: how much of its time it spends hovering (scales the swim / hover timers; 0.5 = about a third of the time). */
  w: number;
  /** 0..1: how wide the pectorals fan (1 = a hatchet's or a puffer's busy sculling). */
  pec: number;
  /** 0..1: how much of its tail beat it keeps while it hovers (0 = a still tail, 1 = the usual beat). */
  caudal: number;
}
export const HOVER: Record<string, HoverSpec> = {
  // sessile animals (anemones, clams; kind 'sessile'): never hover or swim, so the hover timers stay at rest
  bta: { w: 0, pec: 0, caudal: 0 },
  // labyrinth fish: feel their way with the pectoral feelers, hang still between slow trips
  betta: { w: 0.7, pec: 1, caudal: 0.15 }, gourami: { w: 0.6, pec: 0.9, caudal: 0.2 }, dwarfgourami: { w: 0.6, pec: 0.9, caudal: 0.2 },
  honeygourami: { w: 0.6, pec: 0.9, caudal: 0.2 }, sparklinggourami: { w: 0.5, pec: 0.8, caudal: 0.25 }, croakinggourami: { w: 0.5, pec: 0.8, caudal: 0.25 },
  // cichlids: angelfish and discus hang in the water; dwarf cichlids hold a cave or a patch of floor and fan
  angel: { w: 0.5, pec: 0.8, caudal: 0.3 }, discus: { w: 0.45, pec: 0.7, caudal: 0.3 }, kribensis: { w: 0.5, pec: 0.9, caudal: 0.25 },
  cockatoo: { w: 0.55, pec: 0.9, caudal: 0.25 }, bolivianram: { w: 0.55, pec: 0.9, caudal: 0.25 }, gbr: { w: 0.5, pec: 0.9, caudal: 0.25 },
  oscar: { w: 0.35, pec: 0.7, caudal: 0.3 }, yellowlab: { w: 0.3, pec: 0.7, caudal: 0.35 }, peacock: { w: 0.3, pec: 0.7, caudal: 0.35 },
  demasoni: { w: 0.25, pec: 0.7, caudal: 0.35 }, auratus: { w: 0.3, pec: 0.7, caudal: 0.35 }, afra: { w: 0.3, pec: 0.7, caudal: 0.35 },
  // surface hatchetfish hang under the surface with the big pectorals fluttering; pea puffers scull on the pectorals
  hatchet: { w: 0.45, pec: 1, caudal: 0.2 }, peapuffer: { w: 0.5, pec: 1, caudal: 0.2 },
  // schooling fish stop now and then too, much less
  neon: { w: 0.15, pec: 0.6, caudal: 0.4 }, cardinal: { w: 0.15, pec: 0.6, caudal: 0.4 }, harlequin: { w: 0.15, pec: 0.6, caudal: 0.4 },
  rummynose: { w: 0.15, pec: 0.6, caudal: 0.4 }, guppy: { w: 0.15, pec: 0.6, caudal: 0.4 }, endler: { w: 0.15, pec: 0.6, caudal: 0.4 }, glasscatfish: { w: 0.15, pec: 0.5, caudal: 0.4 }, yoyoloach: { w: 0.3, pec: 0.5, caudal: 0.3 }, clownpleco: { w: 0.3, pec: 0.5, caudal: 0.3 }, rainbowshark: { w: 0.3, pec: 0.5, caudal: 0.3 }, redtailshark: { w: 0.3, pec: 0.5, caudal: 0.3 }, saltpepper: { w: 0.35, pec: 0.5, caudal: 0.3 }, firemouth: { w: 0.5, pec: 0.9, caudal: 0.25 }, neonrainbow: { w: 0.15, pec: 0.6, caudal: 0.4 }, falsejulii: { w: 0.35, pec: 0.5, caudal: 0.3 }, peacockgudgeon: { w: 0.4, pec: 0.8, caudal: 0.3 }, clownkilli: { w: 0.15, pec: 0.6, caudal: 0.4 }, electricblueacara: { w: 0.5, pec: 0.9, caudal: 0.25 }, convict: { w: 0.5, pec: 0.9, caudal: 0.25 }, glowlight: { w: 0.15, pec: 0.6, caudal: 0.4 }, pleco: { w: 0.3, pec: 0.5, caudal: 0.3 }, threespot: { w: 0.6, pec: 0.9, caudal: 0.2 }, platy: { w: 0.15, pec: 0.6, caudal: 0.4 },
  // bottom dwellers rest on the pectorals and fan
  pandacory: { w: 0.35, pec: 0.5, caudal: 0.3 }, bronzecory: { w: 0.35, pec: 0.5, caudal: 0.3 }, sterbai: { w: 0.35, pec: 0.5, caudal: 0.3 },
  pepperedcory: { w: 0.35, pec: 0.5, caudal: 0.3 }, pygmycory: { w: 0.3, pec: 0.5, caudal: 0.3 }, clownloach: { w: 0.3, pec: 0.5, caudal: 0.3 },
  syno: { w: 0.3, pec: 0.5, caudal: 0.3 },
  // FB3: marine fish hover between their actions (clownfish and mandarins on the pectorals, firefish and banggai hanging in the water)
  royalgramma: { w: 0.35, pec: 0.6, caudal: 0.3 }, firefish: { w: 0.55, pec: 0.5, caudal: 0.2 }, banggai: { w: 0.6, pec: 0.9, caudal: 0.2 },
  koletang: { w: 0.1, pec: 0.5, caudal: 0.5 },
  foxface: { w: 0.15, pec: 0.6, caudal: 0.4 },
  bichir: { w: 0.4, pec: 0.8, caudal: 0.15 }, // R150: props itself on its pectorals and fans them while still
  clownknife: { w: 0.5, pec: 0.4, caudal: 0.1 }, // R150: hangs in the water and creeps on its long anal fin
  bambooshark: { w: 0.5, pec: 0.3, caudal: 0.2 }, // R150: rests on the floor most of the day
  bicolorblenny: { w: 0.3, pec: 0.7, caudal: 0.35 }, // SO3 (R204)
  elephantnose: { w: 0.2, pec: 0.7, caudal: 0.35 }, // SO3 (R204)
  boxfish: { w: 0.3, pec: 0.9, caudal: 0.2 }, // SO3 (R204)
  bluedamsel: { w: 0.3, pec: 0.7, caudal: 0.35 }, // SO3 (R204)
  dwarfchainloach: { w: 0.2, pec: 0.7, caudal: 0.35 }, // SO3 (R204)
  bleedingheart: { w: 0.2, pec: 0.6, caudal: 0.35 }, // SO3 (R204)
  blackneon: { w: 0.15, pec: 0.6, caudal: 0.4 }, // SO3 (R204)
  agassizii: { w: 0.55, pec: 0.9, caudal: 0.25 }, // SO3 (R204)
  silverdollar: { w: 0.15, pec: 0.6, caudal: 0.4 }, // SO1 (R202)
  serpae: { w: 0.15, pec: 0.6, caudal: 0.4 }, // SO1 (R202)
  scarletbadis: { w: 0.35, pec: 0.8, caudal: 0.3 }, // SO1 (R202)
  bumblebeegoby: { w: 0.35, pec: 0.5, caudal: 0.3 }, // SO1 (R202)
  greenspotpuffer: { w: 0.5, pec: 1, caudal: 0.2 }, // SO1 (R202)
  paradisefish: { w: 0.3, pec: 0.7, caudal: 0.3 }, // SO1 (R202)
  jackdempsey: { w: 0.5, pec: 0.9, caudal: 0.25 }, // SO1 (R202)
  frontosa: { w: 0.5, pec: 0.9, caudal: 0.25 }, // SO1 (R202)
  denison: { w: 0.15, pec: 0.6, caudal: 0.4 }, // SO1 (R202)
  congotetra: { w: 0.15, pec: 0.6, caudal: 0.4 }, // SO1 (R202)
  flameangel: { w: 0.35, pec: 0.7, caudal: 0.3 },
  lawnmowerblenny: { w: 0.4, pec: 1, caudal: 0.2 },
  orchiddottyback: { w: 0.3, pec: 0.7, caudal: 0.3 },
  pajamacardinal: { w: 0.2, pec: 0.6, caudal: 0.3 },
  yellowtailblue: { w: 0.3, pec: 0.7, caudal: 0.35 },
  tailspotblenny: { w: 0.5, pec: 1, caudal: 0.2 },
  ocellaris: { w: 0.45, pec: 0.9, caudal: 0.25 }, mandarin: { w: 0.5, pec: 1, caudal: 0.2 }, coralbeauty: { w: 0.35, pec: 0.7, caudal: 0.3 },
  chromis: { w: 0.2, pec: 0.6, caudal: 0.4 }, yellowtang: { w: 0.1, pec: 0.5, caudal: 0.5 }, bluetang: { w: 0.1, pec: 0.5, caudal: 0.5 }, sixline: { w: 0.1, pec: 0.5, caudal: 0.5 },
};

/** Digging in loose bottom: a burrower noses in and half buries itself, a sifter dips its snout in and out. Also hiding under rock, wood and plants. */
export interface DigSpec {
  /** Dig / hide events per minute at daytime in the best bed (more when the tank is dark). */
  rate: number;
  /** How far it sinks (1 = the body centre ends on the sand line, half buried; a sifter keeps this small). */
  depth: number;
  /** Nose-down angle at the deepest (degrees). */
  pitch: number;
  /** Seconds spent in the sand at the deepest, [min, max]. */
  hold: [number, number];
  /** Share of events that are hides under a rock, a root or plants (when the tank has one) instead of a dig. */
  hide: number;
  /** Seconds it stays hidden, [min, max]. */
  hideT: [number, number];
  /** How well each bed suits it: [mud, sand, gravel, pebble], 0..1 (0 = never digs there; it may still hide). */
  grain: [number, number, number, number];
}
export const DIG: Record<string, DigSpec> = {
  // Pangio: burrows into soft sand head first until half buried, wriggles out; hides a lot under rock, wood and leaves; keeps to gravel's gaps and cover
  kuhli: { rate: 1.4, depth: 1, pitch: 38, hold: [6, 40], hide: 0.4, hideT: [30, 120], grain: [1, 1, 0.08, 0] },
  // snout-sifting: a short dip of the head, barbels in the sand, the body hardly sinks
  bronzecory: { rate: 3, depth: 0.15, pitch: 28, hold: [1.5, 4], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.55, 0.15] },
  pepperedcory: { rate: 3, depth: 0.15, pitch: 28, hold: [1.5, 4], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.55, 0.15] },
  saltpepper: { rate: 3, depth: 0.15, pitch: 28, hold: [1.5, 4], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.55, 0.15] },
  falsejulii: { rate: 3, depth: 0.15, pitch: 28, hold: [1.5, 4], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.55, 0.15] },
  pandacory: { rate: 3, depth: 0.15, pitch: 28, hold: [1.5, 4], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.55, 0.15] },
  sterbai: { rate: 3, depth: 0.15, pitch: 28, hold: [1.5, 4], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.55, 0.15] },
  pygmycory: { rate: 2.5, depth: 0.1, pitch: 25, hold: [1, 3], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.5, 0.1] },
  // clown loaches root in the bottom and tuck under cover
  clownloach: { rate: 0.6, depth: 0.2, pitch: 25, hold: [2, 6], hide: 0.35, hideT: [20, 90], grain: [1, 1, 0.4, 0.1] },
  yoyoloach: { rate: 0.6, depth: 0.2, pitch: 25, hold: [2, 6], hide: 0.35, hideT: [20, 90], grain: [1, 1, 0.4, 0.1] },
};

const GRAIN_IX: Record<Grain, number> = { mud: 0, sand: 1, gravel: 2, pebble: 3 };
/** How well this bed suits a digger, 0 when there is no bed. */
export const digGrainK = (d: DigSpec, grain: Grain | undefined) => (grain ? d.grain[GRAIN_IX[grain]] : 0);

/**
 * Swim style (R106, Nathan 2026-11-16): small darting fish swim in pulses: a short tail-beat burst, then a glide in which the speed
 * decays and the tail is nearly still, then the next pulse, each with a small new heading. The mean speed stays the species' cruise
 * speed; the peak is worked out from it. A species not listed swims steadily (cruisers: gouramis, angels, discus, big barbs and
 * cichlids, rummynose and other station-holders, and every bottom dweller).
 * rate = pulses per second, tau = how fast the glide slows (s; the speed falls to 1/e in this time), turn = most heading change per pulse (+- degrees).
 */
export interface StyleSpec { rate: number; tau: number; turn: number; /** FB2: time shares [pulse-glide, slow cruise in a line, hover and scull] */ mix: [number, number, number] }
const QUICK: StyleSpec = { rate: 1.7, tau: 0.32, turn: 20, mix: [0.6, 0.15, 0.25] };   // danios, small rasboras, tetras: quick, short pulses
const SLOWER: StyleSpec = { rate: 1.1, tau: 0.45, turn: 14, mix: [0.45, 0.3, 0.25] };   // livebearers, pencilfish, barbs, pea puffer: longer glides
export const STYLE: Record<string, StyleSpec> = {
  danio: { rate: 2.0, tau: 0.3, turn: 22, mix: [0.65, 0.15, 0.2] }, cpd: QUICK, whitecloud: QUICK, neon: QUICK, cardinal: QUICK, greenneon: QUICK, ember: QUICK,
  merah: QUICK, exclamation: QUICK, dwarfrasbora: QUICK, chili: QUICK, harlequin: SLOWER,
  dwarfpencil: { rate: 0.9, tau: 0.5, turn: 12, mix: [0.4, 0.3, 0.3] }, guppy: SLOWER, endler: SLOWER, glasscatfish: SLOWER, neonrainbow: QUICK, clownkilli: SLOWER, glowlight: QUICK, serpae: QUICK, denison: QUICK, congotetra: QUICK, cherrybarb: SLOWER, peapuffer: { rate: 1.0, tau: 0.4, turn: 25, mix: [0.4, 0.2, 0.4] },
};

/**
 * Resting on the bottom (FB2, Nathan 2026-11-17: "corys are too active"): the share of its time a bottom dweller sits nearly still
 * (only breathing: gill covers and mouth, and tiny fin shifts) between short foraging trips along the floor. A shoal rests and
 * roams together. A bottom dweller not listed keeps the old mix (about 70 % rest).
 */
export const BENTHIC: Record<string, number> = {
  bronzecory: 0.85, pepperedcory: 0.85, saltpepper: 0.85, falsejulii: 0.85, pandacory: 0.85, sterbai: 0.85, pygmycory: 0.8, // corys: mostly still, the shoal goes foraging now and then
  watchman: 0.88, // FB3: sits on its sand patch, hops now and then
  bambooshark: 0.9, // R150: sedentary, nocturnal
  bichir: 0.85, // R150: nocturnal, rests on the floor most of the day
  elephantnose: 0.6, // SO3 (R204): Aquarium Source calls it an active bottom-dweller that sometimes investigates higher in the tank, and it probes the floor for food (Fishkeeper); no page states the zone as a number, so this is an estimate
  dwarfchainloach: 0.8, // SO3 (R204): a bottom-living loach (Seriously Fish: cover of rocks and wood on sand; the pages do not state the zone, so this is an estimate)
  bumblebeegoby: 0.85, // SO1 (R202): a goby that sits on the floor or a hide and hops between spots
  kuhli: 0.8, clownloach: 0.75, yoyoloach: 0.75, syno: 0.75, sae: 0.72, rainbowshark: 0.75, redtailshark: 0.75,
};

/**
 * Resting angle on the bottom (2026-11-24, Nathan: "it should lay flat against the bottom"): degrees, negative = nose down; a quarter of it is
 * kept while it moves along the floor. A bottom dweller not listed rests at -20 (a cory propped on its pectorals, head down). A listed fish also takes
 * its body radius from its drawing (render/build.ts), so a slim body rests on the bed instead of 0.12 body lengths up (the bichir floated 1.6 in).
 */
export const REST_PITCH: Record<string, number> = {
  kuhli: 0, // eel-shaped: lies along the bed or half buried in it (DIG), never propped on its fins; floated about 0.5 in up and tilted before (2026-11-24)
  bichir: 0, // lies flat on the floor, body resting on the substrate (Seriously Fish, FishBase: "lies quiet or glides about with snake-like movements")
};
/**
 * Home, range, posture and small repeated actions (FB3, R118, 2026-11-18; design in research/design/fish-habits.md). Fish listed here are
 * tied to a place: the sim picks a home spot in the tank (a rock face, a cave mouth, a bolt-hole, a burrow mouth, a host, a patch) and keeps the
 * fish within `leash` body lengths of it, doing the listed actions at the listed rates. A species not listed swims as before. Judgement from
 * care sheets and field notes (FishBase, LiveAquaria / Reef Central profiles, Seriously Fish); the numbers set how often and how far.
 */
export type HabitHome = 'crevice' | 'bolt' | 'burrow' | 'host' | 'open';
export type HabitPost = 'mid' | 'perch' | 'hoverLow' | 'hug';
export interface HabitSpec {
  /** Where it lives: a rock face / cave / overhang, a bolt-hole at a rock foot, a sand burrow, a host (anemone, coral, else a patch), or free water. */
  home: HabitHome;
  /** mid = free water; perch = sits on the bottom on its fins; hoverLow = hangs just above the bottom or home; hug = follows rock faces, belly toward them. */
  post: HabitPost;
  /** How far from home it goes, in body lengths (large = the whole tank). */
  leash: number;
  /** How close it holds to a rock face, in body radii of clearance (1.2 = snug). */
  gap: number;
  /** 0..1: how far the belly turns toward the nearest rock (1 = any roll, upside down under a ledge). */
  orient: number;
  /** Hover height above the home spot, body lengths (a firefish hangs over its bolt-hole). */
  hoverH: number;
  /** 0..1: activity; scales cruise speed. */
  act: number;
  /** Actions per minute: dart into the home and peek out, peck at a surface, patrol a short stretch, flick (still, dorsal / body), hop a short way then stop. */
  dart: number; peck: number; patrol: number; flick: number; hop: number;
  /** Seconds it stays tucked in the home after a dart, [min, max]. */
  hold: [number, number];
}
const H = (home: HabitHome, post: HabitPost, leash: number, gap: number, orient: number, hoverH: number, act: number, dart: number, peck: number, patrol: number, flick: number, hop: number, hold: [number, number] = [3, 20]): HabitSpec =>
  ({ home, post, leash, gap, orient, hoverH, act, dart, peck, patrol, flick, hop, hold });
// rock-dwelling mbuna: a hole each, the rock pile is the pasture; graze it all day, dart in and out
const MBUNA = H('crevice', 'hug', 10, 1.3, 0.5, 0, 0.8, 2, 12, 1.2, 0, 0.5);
export const HABIT: Record<string, HabitSpec> = {
  //                       home       post        leash gap  ori  hov  act   dart peck patr flick hop
  royalgramma: H('crevice', 'hug',      4.5,   1.3, 0.85, 0,   0.5,  2.5, 1.5, 0.4, 0,   0.5, [3, 25]),  // holds a cave or overhang, belly to the rock (upside down under ledges), darts out and back
  koletang: H('crevice', 'hug',      35,  2,   0.3,  0,   0.85, 0,   8,   1.5, 0,   0.5),
  foxface: H('crevice', 'mid',      30,  2,   0,    1.2, 0.7,  0.3, 6,   1.5, 0,   0,   [3, 12]),
  bichir: H('crevice', 'perch',    8,   1.3, 0,    0,   0.5,  0.5, 2,   0.8, 0,   0.3, [10, 60]), // R150: sits on its fins near a cave, prowls the floor
  bambooshark: H('crevice', 'perch',  6,   1.3, 0,    0,   0.4,  0.3, 1,   0.6, 0,   0.2, [20, 90]), // R150: sits by its shaded hide, prowls at night
  flameangel: H('crevice', 'hug',      10,  1.5, 0.7,  0,   0.55, 1.2, 8,   0.4, 0,   0),
  lawnmowerblenny: H('crevice', 'perch',    15,  1.2, 0.2,  0,   0.45, 0.6, 12,  0.8, 1,   3,   [3, 15]),
  orchiddottyback: H('crevice', 'hoverLow', 8,   1.3, 0,    1,   0.6,  1.2, 2,   1,   1,   0,   [3, 12]),
  pajamacardinal: H('host',    'mid',      8,   1.5, 0,    2,   0.3,  0.4, 0,   0.3, 0,   0.5, [4, 15]),
  yellowtailblue: H('host',    'hoverLow', 6,   1.4, 0,    1.5, 0.55, 1,   2,   1.2, 1,   0.5, [3, 12]),
  bluedamsel:    H('host',    'hoverLow', 6,   1.4, 0,    1.5, 0.55, 1,   2,   1.2, 1,   0.5, [3, 12]),  // SO3 (R204): copied from the yellowtail blue damsel, the same reef-damsel habit
  tailspotblenny: H('crevice', 'perch',    5,   1.2, 0.2,  0,   0.2,  1.5, 3,   0.3, 2,   2,   [4, 25]),
  firefish:    H('bolt',    'hoverLow', 4,   1.2, 0,    3,   0.35, 0.5, 0,   0,   7,   2,   [4, 12]),  // hangs over its bolt-hole, flicks the dorsal, dives in when startled
  watchman:    H('burrow',  'perch',    2.5, 1.2, 0,    0,   0.15, 0.25, 0,  0,   1.5, 2,   [8, 40]),  // on the sand at its burrow mouth, still, short hops, no cruising
  ocellaris:   H('host',    'hoverLow', 2.5,  1.2, 0.2,  0,   0.4,  0.2, 2.5, 0.5, 4,   1.5, [3, 10]),  // a small patch (host or a spot), wiggles in place
  yellowtang:  H('crevice', 'hug',      40,  2.2, 0.3,  0,   0.85, 0,   8,   1.5, 0,   0.5),         // grazes the rockwork all day
  bluetang:    H('crevice', 'mid',      35,  2,   0,    1.5, 0.8,  0.5, 3,   0.5, 0,   0,   [3, 12]),
  banggai:     H('host',    'hoverLow', 5,   1.5, 0,    1.5, 0.25, 0.1, 0,   0,   0,   0.6),         // hangs upright in slow drifts near a host or a rock arm
  sixline:     H('crevice', 'hug',      30,  1.6, 0.5,  0,   0.9,  0.8, 10,  2,   0,   0),           // darts between rock faces, pecking
  chromis:     H('host',    'mid',      10,  2,   0,    2.5, 0.65, 0.3, 0,   0.5, 0,   1,   [3, 10]), // hovers above its rock arm, drops into it when startled
  coralbeauty: H('crevice', 'hug',      10,  1.5, 0.7,  0,   0.55, 1.2, 8,   0.4, 0,   0),
  mandarin:    H('crevice', 'hoverLow', 10,  1.5, 0,    0.6, 0.4,  0.2, 8,   0,   0,   3),           // just over the rubble, short hops, pecking, no cruising
  yellowlab: MBUNA, demasoni: MBUNA, auratus: MBUNA, labeo: MBUNA, afra: MBUNA,
  kribensis:   H('crevice', 'hoverLow', 6,   1.5, 0,    0.8, 0.45, 1.5, 1,   1,   1,   0,   [4, 25]),  // a pair's cave, patrols a patch of floor
  cockatoo:    H('crevice', 'hoverLow', 6,   1.5, 0,    0.8, 0.4,  1,   1,   1,   1,   0,   [4, 25]),
  gbr:         H('host',    'hoverLow', 5,   1.4, 0,    0.8, 0.4,  0.3, 4,   1,   0,   2),           // a flat stone or a patch of sand, pecks at it
  bolivianram: H('host',    'hoverLow', 5,   1.4, 0,    0.8, 0.4,  0.3, 4,   1,   0,   2),
  rainbowshark: H('crevice', 'perch',   10,  1.4, 0,    0,   0.5,  1,   3,   2,   0,   1,   [8, 40]),  // a cave or log is its territory
  redtailshark: H('crevice', 'perch',   10,  1.4, 0,    0,   0.5,  1,   3,   2,   0,   1,   [8, 40]),
  firemouth: H('crevice', 'hoverLow', 7,   1.5, 0,    0.8, 0.4,  0.8, 1,   1,   1,   0,   [4, 25]),
  peacockgudgeon: H('host', 'hoverLow', 6, 1.4, 0, 0.8, 0.45, 0.3, 3, 1, 0, 1),
  electricblueacara: H('crevice', 'hoverLow', 8,   1.5, 0,    0.8, 0.4,  0.8, 1,   1,   1,   0,   [4, 25]),
  convict: H('crevice', 'hoverLow', 6,   1.5, 0,    0.8, 0.5,  1.5, 1,   1.5, 1,   0,   [4, 25]),
};

/**
 * Air gulping (R145, 2026-11-24; sources and figures per species in research/air-gulping.md): fish that breathe air make a trip to the
 * surface now and then, take a gulp and go back to where they were. Labyrinth fish (bettas, gouramis) breathe air all the time; corys,
 * plecos, otos, loaches, the clown knife and the bichir are facultative air-breathers that go up more in warm or still water.
 * perHour = trips per hour in a planted tank at about 77 °F (normal oxygen); night = rate multiplier in a dark tank (absent = 1);
 * dart = a quick near-vertical dash up and back (default: bottom fish dart, water fish rise slowly from mid-water).
 * Kept rare on purpose: a trip is a few seconds, so even a betta at 12 an hour spends under 2 % of its time on them.
 * ESTIMATES: every rate below is an estimate (no published trips-per-hour figure) except the corydoras, which take the low end of FishBase's
 * C. aeneus "1 to 45 times per hour"; each row's range and basis is in research/air-gulping.md. Nathan accepted estimates here (2026-11-27)
 * because the rate only paces an animation: it feeds no verdict, cost or advice, and the app must never show it as a fact.
 */
export interface GulpSpec { perHour: number; night?: number; dart?: boolean }
const CORY: GulpSpec = { perHour: 4, night: 1.3 };
export const GULP: Record<string, GulpSpec> = {
  // labyrinth fish: obligate air-breathers, a slow rise from mid-water, a gulp, a slow sink back
  betta: { perHour: 12 }, dwarfgourami: { perHour: 10 }, honeygourami: { perHour: 10 }, sparklinggourami: { perHour: 15 }, croakinggourami: { perHour: 15 },
  gourami: { perHour: 10 }, threespot: { perHour: 12 },
  // corydoras: intestinal air-breathing, a dash straight up from the floor and back down
  bronzecory: CORY, pepperedcory: CORY, pandacory: CORY, pygmycory: CORY, sterbai: CORY, saltpepper: CORY, falsejulii: CORY,
  // armoured suckermouths: air held in the stomach / an esophageal pouch, mostly when the water is short of oxygen.
  // NOT SEEN YET: they cling (render/cling.ts) and the herps below crawl (render/crawl.ts), so the swim sim never runs them; these rows wait for a trip there
  pleco: { perHour: 1, night: 1.5 }, bristlenose: { perHour: 1, night: 1.5 }, oto: { perHour: 2 },
  // others
  kuhli: { perHour: 1.5, night: 1.5 }, clownknife: { perHour: 8, dart: false }, bichir: { perHour: 4, night: 1.5 },
  adf: { perHour: 4 }, axolotl: { perHour: 3 }, firenewt: { perHour: 2 },
};
/** The GULP entry for this tank, or undefined: `dark` = no tank light (the night rate applies). */
export const gulpFor = (id: string, bottom: boolean, dark: boolean): { perHour: number; dart: boolean } | undefined => {
  const g = GULP[id]; if (!g || !(g.perHour > 0)) return undefined;
  return { perHour: g.perHour * (dark ? g.night ?? 1 : 1), dart: g.dart ?? bottom };
};
