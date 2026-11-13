// DQ1 (2026-11-11, spec section 4.2): DESIGN-DERIVED DESCRIPTORS. What a finished design IS, read from its own scene data (items, variants, substrate, backdrop, tank floor), never from the
// archetype's name or id. Used by the live scorer (scorePolicy.ts) and by the A/B feature keys (pairFacts.ts `subjectOf`).
// Each axis is -1 .. +1 (+ = natural / lush / vivid / ordered). The heuristics are deliberately modest; what they CANNOT see is listed in LIMITS (shown in `?debug`).
//   natural   artificial plants and unnatural ground colour pull toward -1 (stylized); live planting, natural stone / wood / sand sit at +1.
//   lush      plant mass per square foot of floor (carpets, clumps and floaters count more than one stem), not the number of pieces.
//   colourful the share of the planting / coral that is a colour accent (red or pink leaves, most corals), plus bold ground colour.
//   ordered   how regular the layout is: even spacing, aligned pieces and few kinds read ordered; scattered, tilted, many-kinds layouts read organic.
// Also reported (information, not a card axis): rock vs wood among the hardscape, and the planting mode (live / artificial / mixed / none).
import { isCarpet, isClump, isFloat } from '../art/plants';
import { layerOf, LIBRARY } from './items';
import type { Item, TankSetup } from './types';

export interface DesignAxes {
  natural: number; lush: number; colourful: number; ordered: number;
  /** -1 = all wood, +1 = all stone; 0 when there is neither */
  rockWood: number;
  plantMode: 'live' | 'artificial' | 'mixed' | 'none';
  /** the raw figures behind the axes, for the debug breakdown */
  raw: { massPerSqFt: number; accentShare: number; artificialShare: number; regularity: number; pieces: number };
}
export const LIMITS = [
  'Colour is judged from the plant / coral kind and the ground colour, not from rendered pixels: lighting and the fish are not read.',
  'Order is judged from piece positions, angles and the number of kinds; a tidy-looking arrangement with varied kinds can still read organic.',
  'Plant mass counts a piece by its form (carpet, clump, floater, single), not by how large it has grown.',
];

/** Plant kinds whose leaves are a colour accent (red, pink, maroon, bronze) in a green scape. */
const ACCENT_PLANTS = new Set(['stemred', 'rotala', 'ludwigia', 'ozelot', 'lotus', 'fittonia', 'bromeliad', 'begonia']);
/** Corals that are not a bright colour accent: algae and the leather's brown. */
const DULL_CORALS = new Set(['macroalgae', 'leather']);
/** Ground that is not a natural colour. */
const BOLD_GROUND = new Set(['clown', 'blue', 'onyx']);
const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
const plantWeight = (i: Item): number => i.kind === 'coral' ? 2 : isCarpet(i.variant) ? 3 : isFloat(i.variant) ? 1.5 : isClump(i.variant) ? 2 : 1;

export function designAxes(S: TankSetup): DesignAxes {
  const plantIt = S.items.filter(i => layerOf(i) === 'plant'), hardIt = S.items.filter(i => layerOf(i) !== 'plant');
  const art = plantIt.filter(i => i.kind === 'artificial').length, live = plantIt.length - art;
  const plantMode: DesignAxes['plantMode'] = !plantIt.length ? 'none' : !art ? 'live' : !live ? 'artificial' : 'mixed';
  const floorSqFt = Math.max(0.5, S.tank.L * S.tank.D / (304.8 * 304.8));
  // lush: plant mass per sq ft. Calibrated on every buildable look (research/screens/DQ1/axes-by-look.txt): reefs 1-5, planted tanks 9-65
  const mass = plantIt.reduce((t, i) => t + plantWeight(i), 0), massPerSqFt = mass / floorSqFt;
  const lush = plantIt.length ? clamp(Math.log2(Math.max(massPerSqFt, 0.01) / 6) / 2) : -1;   // log scale: 6 per sq ft = 0, about 1.5 = sparse (-1), 24 = overgrown (+1)
  // colour: accent share of the planting, plus bold ground
  // (lane DS3: a dyed artificial plant is a colour accent, and an ornament is a bold coloured piece of the scene)
  const orn = hardIt.filter(i => i.kind === 'ornament').length;
  const accent = plantIt.filter(i => i.kind === 'coral' ? !DULL_CORALS.has(i.variant) : i.kind === 'artificial' ? !!LIBRARY[i.variant]?.fake?.tint : i.kind === 'plant' && ACCENT_PLANTS.has(i.variant)).length + orn;
  const accentShare = plantIt.length ? Math.min(1, accent / (plantIt.length + orn)) : 0, boldGround = S.substrate.show && BOLD_GROUND.has(S.substrate.type) ? 0.3 : 0;
  const colourful = clamp((accentShare + boldGround - 0.3) / 0.4);
  // natural: artificial share of the planting plus unnatural ground
  const artificialShare = plantIt.length ? art / plantIt.length : 0, natural = clamp(1 - 2 * Math.min(1, artificialShare * 0.85 + boldGround * 0.5 + Math.min(0.25, 0.12 * orn)));
  // ordered: regular spacing among the pieces (low spread of nearest-neighbour distances), aligned pieces (low turning), few kinds
  const regularity = regularityOf(S.items);
  const kinds = new Set(S.items.map(i => i.variant)).size, kindsOrder = clamp(1 - (kinds - 3) / 6, 0, 1);
  const turned = S.items.length ? S.items.reduce((t, i) => t + Math.min(1, (Math.abs(i.pitch ?? 0) + Math.abs(i.tilt ?? 0)) / 60), 0) / S.items.length : 0;
  const ordered = S.items.length < 3 ? 0 : clamp(((regularity + kindsOrder + (1 - turned)) / 3 - 0.5) * 3);
  const stone = hardIt.filter(i => i.kind === 'stone').length, wood = hardIt.filter(i => i.kind === 'wood').length;
  const rockWood = stone + wood ? (stone - wood) / (stone + wood) : 0;
  return { natural, lush, colourful, ordered, rockWood, plantMode, raw: { massPerSqFt, accentShare, artificialShare, regularity, pieces: S.items.length } };
}
/** 0 (scattered) .. 1 (evenly spaced): one minus the coefficient of variation of each piece's nearest-neighbour distance. */
function regularityOf(items: readonly Item[]): number {
  if (items.length < 4) return 0.5;
  const d = items.map((a, i) => Math.min(...items.map((b, j) => i === j ? Infinity : Math.hypot(a.x - b.x, a.depth - b.depth))));
  const m = d.reduce((t, x) => t + x, 0) / d.length; if (!m) return 0.5;
  const sd = Math.sqrt(d.reduce((t, x) => t + (x - m) ** 2, 0) / d.length);
  return clamp(1 - sd / m, 0, 1);
}
/** The aspect-vocabulary classes of the axes (explore/aspects.ts keys `colors:`, `plants:`), so the learner and the cards see the same thing. */
export const plantClassOf = (a: DesignAxes): 'none' | 'some' | 'lush' => a.plantMode === 'none' ? 'none' : a.lush > 0.2 ? 'lush' : a.lush < -0.6 ? 'none' : 'some';
export const isVivid = (a: DesignAxes): boolean => a.colourful > 0.3;
