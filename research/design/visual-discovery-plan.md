# Guided Visual Discovery: implementation plan (2026-10-30)

Spec: `visual-discovery-spec.md` (Nathan, Revision 02; this plan implements it). Research behind the taxonomy:
`research/taste-tree/` (A / B / C research files, 200+ sourced styles; `TREE.md` = draft 2 tree, now superseded
by the spec's structure but still the source for fingerprints, taglines and look mappings).

## What the spec changes vs TREE.md draft 2

- **Five steps:** environment -> water (aquarium only: freshwater / saltwater / BRACKISH, three equal cards) ->
  visual family -> archetype -> density (open / balanced / full). Aquarium reaches Make It Your Own in 5 picks,
  terrarium / paludarium in 4.
- **Families are the spec's lists** (5-6 per branch, more than the 2-4 per round discussed earlier; the spec wins).
- **Density is a guided step**, not a GV6 variation. It changes only visual amount (cover, hardscape, ornaments,
  open substrate), never animal counts or welfare elements.
- **Archetype = the endpoint.** Named variants (classic vs many-stone Iwagumi) become editor choices.
- **Three support states** (Supported / Partially supported / Coming Soon) replace the coming-soon-only rule 6.
  Coming Soon shows a labelled REFERENCE image, saves interest, offers the closest supported alternative, no price.
- **Ponds stay out** (matches Nathan 2026-10-30).

## Draft taxonomy (VD1 validates; ids are proposals)

Spec endpoint names are kept where the spec gives one (in quotes). `maps` = existing LayoutId; `-` = none today.

### Freshwater
| Family | Archetypes | maps |
|---|---|---|
| Underwater Gardens | `dutch-garden` "Dutch Garden"; `planted-community`; `overgrown-jungle`; `floating-canopy`; `mossy-wood-ferns` (low-light epiphytes) | dutch, planted, jungle / swamp, -, driftwood |
| Sculpted Nature | `iwagumi-stone-garden` "Iwagumi Stone Garden"; `driftwood-nature`; `underwater-forest` "Underwater Forest"; `mountain-diorama` (cliffs, bonsai) | iwagumi, nature, forest, - |
| Wild Habitats | `blackwater-creek` "Blackwater Creek"; `african-cichlid-rockscape` "African Cichlid Rockscape"; `shell-bed-lake` (Tanganyika); `rocky-river-stream` (hillstream); `cool-native-creek` | blackwater, malawi, -, stream / hillstream, - |
| Clean & Minimal | `white-sand-stone`; `black-modern`; `stone-wood-sculpture` (hardscape, no plants) | stones?, -, stones / driftwood |
| Bright & Playful | `fluorescent-glow` "Fluorescent Glow"; `castle-coloured-gravel`; `themed-scene` (shipwreck, pirate, ruins); `silk-plant-natural` | -, -, -, any natural look in artificial plant mode |
| Fish Showcases | `big-fish-showcase` (oscar / flowerhorn / arowana, bare, plain back); `discus-showcase`; `goldfish-palace` (sand, smooth stones, open water); `betta-retreat`; `axolotl-den` | all - |

### Saltwater
| Family | Archetypes | maps |
|---|---|---|
| Living Coral Gardens | `soft-coral-garden`; `lps-coral-garden` "LPS Coral Garden"; `sps-reef`; `mixed-reef` | softreef, reef, spsreef, reef |
| Fish-First Oceans | `marine-fish-rock` "Marine Fish & Rock"; `predator-display`; `classic-skeleton-decor` (old-school bleached coral); `clownfish-anemone` | -, -, -, clownnano |
| Natural Ocean Habitats | `seagrass-lagoon`; `sand-bed-burrowers` (jawfish, garden eels); `seahorse-garden`; `cold-kelp-coast` | all - |
| Sculpted Reef Landscapes | `reef-arches`; `reef-islands`; `reef-rock-art` (minimal Japanese style); `reef-skyline` (bare bottom) | reef + layout work |
| Glowing & Otherworldly | `jellyfish-kreisel`; `dark-polyp-cave` (NPS); `blue-glow-reef` (actinic fluorescence); `octopus-den` | -, -, reef + light, - |

### Brackish (thinnest research; VD1 researches it first)
| Family | Archetypes (draft) |
|---|---|
| Mangrove & Estuary | `mangrove-estuary` "Mangrove Estuary"; `estuary-root-tangle` (archerfish) |
| Mudflat & Shoreline | `mudskipper-mudflat` (resolves to a paludarium-style build, spec 01); `fiddler-crab-beach` |
| Rocky Coast & Tidepool | `brackish-rocky-coast` (bumblebee gobies, nerites); `brackish-tidepool` |
| Fish-First Brackish Habitats | `puffer-den`; `silver-shoal` (monos, scats); `brackish-molly-community` |
| Brackish Planting | `brackish-planted` (java fern, Crypt. ciliata, anubias, mangrove seedlings) |

### Terrarium
| Family | Archetypes (draft) | maps |
|---|---|---|
| Tropical Rainforest | `dart-frog-rainforest`; `rainforest-canopy` (tall, arboreal geckos / tree frogs) | rainforest, frogs |
| Desert & Drylands | `rocky-desert-canyon` "Rocky Desert Canyon"; `sandy-dunes`; `basking-scrubland` (bearded dragon) | arid |
| Enchanted Woodland | `mossy-woodland` "Mossy Woodland"; `fairy-forest` (mushrooms, whimsy) | - |
| Rocks, Cliffs & Canopies | `cliff-wall-climber`; `branch-canopy` (chameleon, crested gecko) | - |
| Botanical Worlds | `closed-jar-garden` (plants only); `bioactive-planted` (isopods, springtails); `succulent-garden` | - |
| Creature Showcases | `snake-hideaway`; `tarantula-burrow`; `jumping-spider-loft`; `tortoise-table` | python, burrow, jumper, - |

### Paludarium
| Family | Archetypes (draft) | maps |
|---|---|---|
| Rainforest Waterfalls | `rainforest-waterfall` "Rainforest Waterfall"; `cascade-wall` | paludarium |
| Overgrown Riverbanks | `riverbank-shore` (sand slopes into water); `flooded-forest` | paludarium?, - |
| Swamps & Mangroves | `cypress-swamp` (bog, carnivorous plants); `mangrove-paludarium` | - |
| Rocky Streams & Cliffs | `rocky-stream-cliff` | paludarium? |
| Fantasy Water Gardens | `floating-island`; `riparium-garden` (plants out the top); `wabi-kusa-world` | - |
| Waterside Creature Habitats | `turtle-shore`; `newt-shore`; `crab-shore` (red-claw crabs); `mudskipper-mudflat` (cross-link from brackish) | - |

Draft count: about 85 archetypes, 255 density images. The existing 24 looks cover roughly 25 archetypes in some
form; VD2's audit decides Supported vs Partially supported.

## Lanes

Phase 1: VD1 alone (milestone 1 unblocks phase 2). Phase 2: VD3 + VD4 in parallel (different files). Phase 3: VD2
(after VD1 milestone 2 and VD4). Prompts: `prompts/lane-VD1..VD4-*.md`. The "Phase" column below predates this order.

| Lane | Phase | Owns | Builds | Done when |
|---|---|---|---|---|
| **VD1 Archetype registry** | 1 | new `src/scene/archetypes.ts` (+ `test/archetypes.test.ts`), `research/taste-tree/` | The canonical registry (spec 07 fields): id, environment, water, familyId, public name + tagline, visual fingerprint + one sibling contrast, baseline scene recipe, density trio (archetype-specific labels allowed: Minimal / Classic / Layered), rendering dependencies, look mapping (or "unknown"), animal / environment constraints, support status (`unaudited` until VD2), closest supported alternative. Families and environment / water cards with their taglines. Fills the brackish, terrarium and paludarium gaps with research first (Sonnet subagents, 3 at most). | Every family has at least 2 archetypes, no dead ends (spec 06), every archetype passes the "valid ending" test in spec 02, and the registry test checks fields, unique ids and links |
| **VD2 Capability audit** | 2 | `research/taste-tree/audit/`, the `support` / `deps` / `looks` fields of `archetypes.ts` only | Renders each archetype from its mapped look at open / balanced / full; compares it with its fingerprint and siblings; sets Supported / Partial / Coming Soon with the missing assets; ranks feature packs by archetypes unlocked (spec 09; "decor first" is a hypothesis to test) | A contact sheet per family, a status for every archetype, a ranked pack list |
| **VD3 Discovery flow** | 2 | new `src/ui/discovery/` (screens, back-stack), `vision` fields in `src/scene/brief.ts`, a `wish` event in `src/demand/taste.ts`, a hook in `src/ui/guided/flow.ts`, a `.vd-*` block in `style.css` | The five screens; back keeps compatible downstream picks; a known roster or tank prunes branches and auto-skips single-choice steps (spec 05); Coming Soon flow (reference label, save interest, closest alternative, no price); `vision.*` persisted with the project (spec 06 contract) and survives refresh; hands off to Make It Your Own with the recipe | Spec 06 and 09 acceptance tests as vitest cases; 5 picks for aquarium, 4 for the others |
| **VD4 Density recipes** | 2 | `src/scene/items.ts` (`starterStyle`, `LayerDens` per archetype), a new `src/scene/recipes.ts` | Turns each Supported / Partial archetype's recipe + density into a scene: cover, hardscape, ornaments and open substrate change; camera, footprint, light, background and focal animals stay fixed | A test that the three densities of every archetype give the same animal list and pass the same welfare checks; one density trio screenshot per family |

Later: feature-pack lanes in VD2's ranked order; the reference-image library (question 1).

Rules for every VD lane: as in HANDOFF.md (own worktree from origin/main, report once to the coordinator,
no push, `npm run build` + full vitest in the background before reporting, screenshots saved as files).
No engine numbers move: discovery picks a look and a recipe; prices and checks stay with the existing engine.

## Open questions for Nathan (before writing the lane prompts)

1. ~~Reference images~~: answered 2026-10-30 (Nathan): "not super concerned about the art right now, make simple
   placeholders and I will replace them ... I am trying to get the proper tree built and functional now." So:
   every tile uses a simple placeholder built at runtime (no image files): a flat card in the family's colour with
   the name, tagline and a "Reference" or "Coming soon" badge. A real image at `public/art/discovery/<id>.webp`
   replaces the placeholder automatically when it exists (Nathan drops art in later). Supported / Partial tiles
   may show the in-app render instead, if it is cheap; placeholders are fine for the first version.
2. **Where discovery sits in Guided** (not answered; went with the proposal 2026-10-30, change if Nathan says so):
   discovery is the "A look I want" entry AND the look step after stocking (there the roster answers environment
   and water, so the person starts at family). GV5's priced cards and GV6's variations become the first screen of
   Make It Your Own.

## Speed-ups (Nathan wants the tree functional now)

- VD2 (audit) moves AFTER the flow works. Until then support status is set by rule: an archetype with a mapped
  look = `partial`, none = `coming-soon`. VD2 later upgrades / downgrades by looking at renders.
- VD1 lands in two steps: **milestone 1** = the contract below, all environments / waters / families, and one
  archetype per family (enough for VD3 and VD4 to build against); **milestone 2** = the full list. VD3 and VD4
  start at milestone 1.

## Registry contract (`src/scene/archetypes.ts`; VD1 creates it, VD3 / VD4 read it)

```ts
export type Env = 'aquarium' | 'terrarium' | 'paludarium';
export type Water = 'freshwater' | 'saltwater' | 'brackish';
export type Density = 'open' | 'balanced' | 'full';
export type Support = 'supported' | 'partial' | 'coming-soon';
export interface Card { id: string; name: string; tagline: string }          // environment / water cards
export interface Family extends Card { env: Env; water: Water | null; colour: string }
export interface Archetype extends Card {
  env: Env; water: Water | null; familyId: string;
  alsoIn?: string[];                         // other family ids it is shown under (cross-links)
  resolvesTo?: Env;                          // e.g. mudskipper mudflat -> 'paludarium' (spec 01)
  fingerprint: string[];                     // 2-4 cues that make it recognizable
  contrast: { sibling: string; how: string }; // one explicit contrast with the closest sibling
  recipe: { looks: LayoutId[]; plantMode?: PlantMode; notes: string }; // looks = existing LayoutIds, [] = none
  density: Record<Density, { label: string; note: string }>;           // per-archetype labels allowed
  deps: string[];                            // missing rendering features, e.g. 'leaf litter', 'ornaments'
  support: Support;                          // rule until VD2: looks.length ? 'partial' : 'coming-soon'
  alternative?: string;                      // closest supported archetype id (required when coming-soon)
  tags: { chem?: ('soft' | 'hard' | 'marine' | 'brackish')[]; temp?: 'tropical' | 'cold' | 'any'; minGallons?: number };
}
export const ENVIRONMENTS: Card[]; export const WATERS: Card[]; export const FAMILIES: Family[];
export const ARCHETYPES: Archetype[];
export function familiesOf(env: Env, water: Water | null): Family[];
export function archetypesOf(familyId: string): Archetype[];   // includes alsoIn cross-links
```

Brief (VD3, spec 06): `brief.vision = { environment, waterType, familyId, archetypeId, density,
secondaryLikes: string[], renderRecipe }`, saved with the project; parses old saves unchanged (no SCENE bump).
