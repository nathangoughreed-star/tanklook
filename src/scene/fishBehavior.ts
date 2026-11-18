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
  rummynose: { w: 0.15, pec: 0.6, caudal: 0.4 }, guppy: { w: 0.15, pec: 0.6, caudal: 0.4 }, platy: { w: 0.15, pec: 0.6, caudal: 0.4 },
  // bottom dwellers rest on the pectorals and fan
  pandacory: { w: 0.35, pec: 0.5, caudal: 0.3 }, bronzecory: { w: 0.35, pec: 0.5, caudal: 0.3 }, sterbai: { w: 0.35, pec: 0.5, caudal: 0.3 },
  pepperedcory: { w: 0.35, pec: 0.5, caudal: 0.3 }, pygmycory: { w: 0.3, pec: 0.5, caudal: 0.3 }, clownloach: { w: 0.3, pec: 0.5, caudal: 0.3 },
  syno: { w: 0.3, pec: 0.5, caudal: 0.3 },
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
  pandacory: { rate: 3, depth: 0.15, pitch: 28, hold: [1.5, 4], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.55, 0.15] },
  sterbai: { rate: 3, depth: 0.15, pitch: 28, hold: [1.5, 4], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.55, 0.15] },
  pygmycory: { rate: 2.5, depth: 0.1, pitch: 25, hold: [1, 3], hide: 0.05, hideT: [10, 30], grain: [1, 1, 0.5, 0.1] },
  // clown loaches root in the bottom and tuck under cover
  clownloach: { rate: 0.6, depth: 0.2, pitch: 25, hold: [2, 6], hide: 0.35, hideT: [20, 90], grain: [1, 1, 0.4, 0.1] },
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
  dwarfpencil: { rate: 0.9, tau: 0.5, turn: 12, mix: [0.4, 0.3, 0.3] }, guppy: SLOWER, cherrybarb: SLOWER, peapuffer: { rate: 1.0, tau: 0.4, turn: 25, mix: [0.4, 0.2, 0.4] },
};

/**
 * Resting on the bottom (FB2, Nathan 2026-11-17: "corys are too active"): the share of its time a bottom dweller sits nearly still
 * (only breathing: gill covers and mouth, and tiny fin shifts) between short foraging trips along the floor. A shoal rests and
 * roams together. A bottom dweller not listed keeps the old mix (about 70 % rest).
 */
export const BENTHIC: Record<string, number> = {
  bronzecory: 0.85, pepperedcory: 0.85, pandacory: 0.85, sterbai: 0.85, pygmycory: 0.8, // corys: mostly still, the shoal goes foraging now and then
  kuhli: 0.8, clownloach: 0.75, syno: 0.75, sae: 0.72, rainbowshark: 0.75, redtailshark: 0.75,
};
