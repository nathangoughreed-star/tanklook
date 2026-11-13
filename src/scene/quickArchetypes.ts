// QP1 (2026-11-10): the QUICK-PREFERENCE ARCHETYPE CATALOGUE. One list per habitat of the visual directions the optional Quick Preferences screen shows as image cards
// (Interested / Avoid / Unselected). It is NOT a second taxonomy: every card names the EXISTING Explore layouts (scene/archetypes.ts ids) and families it stands for, and only
// layouts that `isBuildable` (a recipe look + not coming-soon) are listed, so every card has generatable candidates (a test walks this). A card is a visual DIRECTION, never a
// species / equipment spec and never a lock. Consumers: src/scene/quickPrefs.ts (model), QP2 (cards UI), QP3 (thumbnails: `image` is the file QP3 renders).
//
// Spec list reconciliation (research/design/quick-prefs-archetypes-handoff-2026-11-10.md section 3):
//   Freshwater  kept: Nature / River, Jungle, Iwagumi, Dutch, Blackwater.  RENAMED: "Modern / Stylized" -> "Clean & minimal" (the fw-playful stylized layouts, castle / fluorescent glow / themed
//               scene, are all coming-soon; the only generatable "clean" look is the fw-minimal stone-and-sand family). Silk-plant-natural has no card: it is what No live plants yields.
//   Saltwater   no spec list: six real reef directions (mixed, SPS, soft coral, rock sculpture, blue glow, clownfish nano).
//   Terrarium   only 4 cards: woodland / botanical / climb layouts are coming-soon, so none is shown (spec asks 4-6; 4 is the real count).
//   Paludarium  only 3 cards (4 buildable layouts exist: waterfall x2, riverbank, swamp); a 4th would be a card with nothing behind it.
//   Unsure      a small mixed sample (UNSURE_SAMPLE), not the union of the habitats.
import { kindInScope } from '../scope';
import type { HabitatDirection } from './discoveryTypes';

export type ArchHabitat = Exclude<HabitatDirection, 'unsure'>;
/** The aesthetic axes a card pulls on, -1 .. +1 (same axes as quickPrefs `AxisWeights`; ranking only). */
export interface ArchAxes { natural?: number; lush?: number; colourful?: number; ordered?: number }
export interface QuickArchetype {
  /** unique inside its habitat */
  id: string;
  /** GLOBAL key = image basename = what is stored in the preference model: `<habitat>-<id>` */
  key: string;
  habitat: ArchHabitat;
  label: string;
  blurb: string;
  /** Explore layout ids (scene/archetypes.ts ARCHETYPES) this direction stands for; every one is buildable */
  layouts: readonly string[];
  /** visual family ids (scene/archetypes.ts FAMILIES) it is the essence of (empty when it only picks some layouts of a family) */
  families: readonly string[];
  /** "You told us" keys (explore/aspects.ts closed vocabulary) written +1 for Interested, -1 for Avoid */
  told: readonly string[];
  axes: ArchAxes;
  /** The look IS live planting (Dutch, Jungle, rainforest...): No live plants removes it; it is never faked with artificial plants. */
  needsLive: boolean;
  /** planned thumbnail, public/art/quick/<habitat>-<id>.webp (QP3) */
  image: string;
}
const mk = (habitat: ArchHabitat, id: string, label: string, blurb: string, layouts: string[], told: string[], axes: ArchAxes, needsLive = false, families: string[] = []): QuickArchetype =>
  ({ id, key: `${habitat}-${id}`, habitat, label, blurb, layouts, families, told, axes, needsLive, image: `public/art/quick/${habitat}-${id}.webp` });

export const QUICK_ARCHETYPES: readonly QuickArchetype[] = [
  // freshwater
  mk('freshwater', 'nature-river', 'Nature / River', 'Stones and wood, an organic layout and open water to swim in.', ['driftwood-nature', 'rocky-river-stream'], ['layout:driftwood-nature', 'layout:rocky-river-stream'], { natural: 1 }),
  mk('freshwater', 'jungle', 'Jungle / Lush planted', 'Dense, layered, overgrown greenery.', ['overgrown-jungle', 'overgrown-garden'], ['layout:overgrown-jungle', 'plants:lush'], { lush: 1, natural: 1 }, true),
  mk('freshwater', 'iwagumi', 'Iwagumi / Stone-focused', 'A few strong stones, a low lawn and lots of open space.', ['iwagumi-stone-garden'], ['layout:iwagumi-stone-garden'], { natural: 1, lush: -1, ordered: 1 }),
  mk('freshwater', 'dutch', 'Dutch / Planted garden', 'Deliberate groups of many plants, colours and textures.', ['dutch-garden', 'planted-community'], ['layout:dutch-garden', 'colors:vivid'], { colourful: 1, lush: 1, ordered: 1 }, true),
  mk('freshwater', 'blackwater', 'Blackwater / Rooted', 'Tea-dark water, roots and leaf litter, a hushed mood.', ['blackwater-creek'], ['layout:blackwater-creek'], { natural: 1, colourful: -1 }),
  mk('freshwater', 'minimal', 'Clean & minimal', 'Stone or wood on plain sand. Simple, calm, nothing extra.', ['stone-wood-sculpture', 'white-sand-stone'], ['look:fw-minimal'], { lush: -1, colourful: -1, ordered: 1 }, false, ['fw-minimal']),
  // saltwater
  mk('saltwater', 'mixed-reef', 'Classic mixed reef', 'A bit of every coral on live rock, the postcard reef.', ['mixed-reef', 'lps-coral-garden'], ['layout:mixed-reef', 'layout:lps-coral-garden'], { colourful: 1, lush: 1 }),
  mk('saltwater', 'sps-reef', 'Colourful SPS reef', 'Branching, bright stony corals. The showpiece reef.', ['sps-reef'], ['layout:sps-reef'], { colourful: 1 }),
  mk('saltwater', 'soft-coral', 'Soft coral garden', 'Swaying, forgiving corals in gentle colours.', ['soft-coral-garden'], ['layout:soft-coral-garden'], { natural: 1, lush: 1 }),
  mk('saltwater', 'rock-sculpture', 'Rock sculpture', 'Rock as architecture: arches, towers and open sand.', ['reef-rock-art', 'reef-skyline', 'reef-arches', 'reef-islands'], ['look:sw-sculpted'], { lush: -1, ordered: 1 }, false, ['sw-sculpted']),
  mk('saltwater', 'blue-glow', 'Blue glow reef', 'Corals that fluoresce under blue light.', ['blue-glow-reef'], ['layout:blue-glow-reef'], { colourful: 1, natural: -1 }),
  mk('saltwater', 'clownfish-nano', 'Clownfish nano', 'A small, friendly reef built around a clownfish pair.', ['clownfish-anemone'], ['layout:clownfish-anemone'], { colourful: 1, lush: -1 }),
  // terrarium
  mk('terrarium', 'frog-jungle', 'Jewel frog jungle', 'A damp, dense floor of moss, leaves and bromeliads.', ['dart-frog-rainforest'], ['layout:dart-frog-rainforest', 'plants:lush'], { lush: 1, natural: 1 }, true),
  mk('terrarium', 'vine-canopy', 'Vine canopy', 'A tall green climb of vines and branches.', ['rainforest-canopy'], ['layout:rainforest-canopy'], { lush: 1, natural: 1 }, true),
  mk('terrarium', 'desert-canyon', 'Desert & rock', 'Warm stone, sand and sparse plants under a heat lamp.', ['rocky-desert-canyon', 'basking-scrubland'], ['look:te-desert'], { lush: -1, natural: 1 }, false, ['te-desert']),
  mk('terrarium', 'creature-hide', 'Animal hideaway', 'Built around one animal: hides, burrows and perches.', ['snake-hideaway', 'tarantula-burrow', 'jumping-spider-loft'], ['look:te-creature'], { lush: -1, ordered: 1 }, false, ['te-creature']),
  // paludarium
  mk('paludarium', 'waterfall', 'Rainforest waterfall', 'Falling water and dripping green behind glass.', ['rainforest-waterfall', 'cascade-wall'], ['look:pa-waterfall'], { lush: 1, natural: 1 }, true, ['pa-waterfall']),
  mk('paludarium', 'riverbank', 'Sandy riverbank', 'Where a sandy bank meets the water.', ['riverbank-shore'], ['layout:riverbank-shore'], { natural: 1 }, true),
  mk('paludarium', 'swamp', 'Cypress swamp', 'Still water and twisted roots, moody by design.', ['cypress-swamp'], ['layout:cypress-swamp'], { natural: 1, colourful: -1 }, true),
];

/** The cards shown for a habitat. 'unsure' gets a SMALL mixed sample (never the union of every habitat). */
export const UNSURE_SAMPLE: readonly string[] = ['freshwater-nature-river', 'freshwater-jungle', 'saltwater-mixed-reef', 'terrarium-frog-jungle'];
export const archetypeByKey = (key: string): QuickArchetype | undefined => QUICK_ARCHETYPES.find(a => a.key === key);
export const archetypesFor = (d: HabitatDirection): QuickArchetype[] => (d === 'unsure' ? UNSURE_SAMPLE.map(k => archetypeByKey(k)!) : QUICK_ARCHETYPES.filter(a => a.habitat === d)).filter(a => kindInScope(a.habitat === 'paludarium' ? 'vivarium' : a.habitat));   // AQ1: no terrarium / paludarium cards in aquarium scope
/** Explore layouts whose look IS live planting: not generated while "No live plants" is on (they are never faked with artificial plants). */
export const LIVE_ONLY_LAYOUTS: ReadonlySet<string> = new Set([...QUICK_ARCHETYPES.filter(a => a.needsLive).flatMap(a => a.layouts), 'underwater-forest', 'mossy-wood-ferns']);
