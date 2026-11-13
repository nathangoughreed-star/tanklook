# DS1: visual styles audit and first-slice proposal (2026-11-13)

Lane DS1, for Coordinator 24 (request R20). Research only: no app code changed. Answers §20 items 1-7 of `research/design/styles-direction-2026-11-13.md`. All file:line refs are against origin/main at `e21557cb`. Units are US.

## Short version

- **A lot already exists.** Artificial plants (silk / plastic, six variants, no nitrate credit), coloured gravel (`clown`, `blue`, `onyx` plus any custom blend), a "Bright & Playful" family (`fw-playful`) and three archetypes for it (`castle-coloured-gravel`, `themed-scene`, `fluorescent-glow`) are already in the code. The three archetypes are **coming-soon** because the generator has no ornaments and no recipe for them. The ones that do exist are fake plants on a natural layout (`silk-plant-natural`, support `partial`).
- **The real gap is one thing: there is no "ornament" kind.** The item kinds are stone, wood, cave, plant, coral, artificial plant. A ship, castle or face planter has nowhere to live. Everything else for the pirate slice is a small extension of hooks that already exist (`Tweak.ground`, `Tweak.caves`, `plantMode`, `demand-items.json` price rows).
- **Welfare is already mostly independent of looks**, which is good news. Artificial plants get zero nitrate credit (`scene/nitrogen.ts:123`). Coloured gravel already triggers the bottom-dweller substrate checks (`data/substrateTraits.ts:11-19`). The two real welfare holes are **caves get shelter credit with no size check** and **there is no entrapment / swim-through check at all**. Both matter the moment we add a ship or a castle.
- **Taxonomy verdict:** do not add a family axis to the data model. Add four independent, mostly-derived attributes plus an optional theme tag, and keep families as presets (cards) on top. Matches Coordinator 24's suggestion.
- **Smallest slice:** one new item kind (`ornament`) with 3 variants (ship, plus one more ornament, plus a bubbler stub deferred), one new archetype recipe (`themed-scene`, flipped from coming-soon to partial), one `Tweak` field, one gravel row, 2 price rows. Naturalistic scenes are untouched because every new path is gated on the new archetype or the new kind.

---

## 1. Where the six styles live, and every hardcoded naturalistic assumption

### 1a. Where the styles live (four places that must agree today)

| Layer | Where | What it is |
|---|---|---|
| The visible six cards | `scene/quickArchetypes.ts:44-49` | `QUICK_ARCHETYPES` freshwater rows: nature-river, jungle, iwagumi, dutch, blackwater, minimal. Each card names existing archetype ids (`layouts`), four axis weights (`natural / lush / colourful / ordered`, -1..+1), `told` keys, and a `needsLive` flag. UI: `ui/quickPrefs.ts`. Thumbnails: `public/art/quick/freshwater-*.webp`. |
| Archetypes (the Discover pool) | `scene/archetypes.ts` (`ARCHETYPES`, `FAMILIES` at ~L70-90) | ~13 fresh families; each archetype has `recipe: { looks, plantMode, notes }`, `fingerprint`, `density`, `deps`, `support`. `support` is derived: no `recipe.looks` means `coming-soon` (`archetypes.ts:120`). |
| Layout ids ("looks") | `scene/types.ts:242` `LayoutId` (closed union), `scene/items.ts:127` `LAYOUTS` labels, `scene/items.ts:643` `STYLES` (density + animal pool per look), `scene/items.ts:158` `STYLE_KIND` | One `LayoutId` is one drawing routine. |
| The drawing routine per look | `scene/items.ts:704` `starterItemsRaw`, one `if (id === 'stones') … else if (id === 'iwagumi') …` branch per look (L896, 929, 960, 1013, 1036, 1064, 1085 …), plus ground in `scene/scapeground.ts:20` (`SUBS`), relief at `:63`, background in `scene/recipes.ts:97-153` (`FAMILY_BG`, `ARCH_BG`, `recipeBg`) | |

Adding a new *look* (LayoutId) touches 48 `layout.id` uses across 20 files (`ui/panels.ts` 14, `scene/pairFacts.ts` 3, …). That is why the slice below avoids a new LayoutId.

The per-archetype escape hatch already exists: **`Tweak` in `scene/recipes.ts:64-72`** (`comp`, `seed`, `noPlants`, `dens`, `openTop`, `ground`, `flat`, `rocks`, `wood`, `caves`, `plantsOnly`), applied in `draw()` (`recipes.ts:336`) and `finish()` (`recipes.ts:207-240`). Siblings that share a look already use it (`reef-arches`, `betta-retreat`, `overgrown-garden`).

### 1b. Naturalistic assumptions, by place

| # | Place | Assumption | Evidence |
|---|---|---|---|
| G1 | **Item kinds** | Hardscape = rock, wood or cave. No ornament, figure, structure, bubbler, themed plant-holder. `layerOf` sends everything that is not a plant to `'hard'`. | `scene/types.ts:281` `ItemKind`; `scene/items.ts:634` `layerOf`; library rows `items.ts:24-47` (stones, woods, caves `arch / planter / tube / coconut / halflog / dish`). |
| G2 | **Caves are all natural-shaped** | The only enclosed pieces are an arch, clay tube, coconut, half-log, rim planter. No resin hide, no castle, no ship. | `items.ts:41-47`; render `render/items.ts:353` `caveShape`. |
| G3 | **Plants are drawn live-first, fakes are a post-process swap** | The generator draws a live layout, then `withPlantMode` replaces each live plant by a silk/plastic stand-in (`fakeFor`: stem to stem, rosette to sword, mat to moss) and thins to a cap (`FAKE_PER_CM2`). So an "artificial tank" is a *natural tank wearing plastic*: same positions, same layout logic, no artificial-native composition. | `scene/scapes.ts:100-130`, `scapes.ts:166` `scapeSetup`. |
| G4 | **Artificial plants have no colour** | `Fake = { mat: 'silk' \| 'plastic'; form: 'stem' \| 'rosette' \| 'mat' }`: material and shape only. A bright pink plastic plant is not representable. | `scene/items.ts:18`; render `render/items.ts:721` `fakeMaterial`. |
| G5 | **Ground** | Each look has 2-4 natural substrate options, all browns / sands / blacks; colour is `nudge()`d only a few percent. Only Dutch uses `onyx` and jungle `black`. No look ever picks `clown` / `blue`. Bright gravel is reachable only by hand or via `Tweak.ground`. | `scene/scapeground.ts:20-45`, `:73` `varyBlend`; `scene/types.ts:30` `SubstrateType`. |
| G6 | **Background** | Family defaults (`fw-playful` is plain black), plus `backdropFor`, which picks a 3D relief wall by **regex on the archetype's name text** (`/iwagumi\|stone\|rock/` → rock, `/river/`, `/jungle\|forest/`, `/moss/`, `/driftwood\|nature\|wood/` → cork). All walls are natural reliefs; no printed / scenic / themed backdrop kind. Flat 2D scenic backgrounds exist (`riverscene`, `plantscene`, `rockscene`, `reefscene`) but are all natural scenes. | `scene/recipes.ts:97-153`; `scene/pairGen.ts:309-318`; `scene/types.ts:17` `Background`, `:380` `BackdropKind`; `render/backdrop.ts:13`. |
| G7 | **Archetypes that would carry decorative looks are dead** | `castle-coloured-gravel`, `themed-scene`, `fluorescent-glow` have `recipe.looks: []` so `support = coming-soon`, so `isBuildable` is false, so they never enter the Discover pool or the cards. Their `deps` list names exactly what is missing: `ornaments`, `coloured gravel`, `printed background`, `glow fish and decor`, `blacklight / colour LED`. | `scene/archetypes.ts:258-274`, `:36-50` `DEPS`; `explore/pool.ts:~55` `isBuildable`. |
| G8 | **Style cards: six, all naturalistic** | The card list was reconciled to six naturalistic ones on purpose; the file comment records that the playful ones were left out because they are coming-soon. | `scene/quickArchetypes.ts:1-17`. |
| G9 | **"natural" axis is a proxy** | `natural = 1 - 2·min(1, artificialShare·0.85 + boldGround·0.5)`: only the share of fake plants and a bold ground (**only** the `clown / blue / onyx` presets, `designAxes.ts:30` `BOLD_GROUND`). A bright custom-blend gravel reads as fully natural. Ornaments, themes and non-natural hardscape are invisible to it. | `scene/designAxes.ts:30,49`. |
| G10 | **"colourful" axis ignores everything but plants and 3 gravel types** | Accent-colour plants (`ACCENT_PLANTS`, red/pink leaves) and bold ground. Ornament and plastic colour do not exist to count. | `designAxes.ts:27-29,45-47`. |
| G11 | **Learner vocabulary has no decorative aspect** | Features: `world / look / layout / natural / colors / plants / species / behavior / size / number / visibility / care …`. The tag labelled "Plant and decor density" only measures plants. No theme, no ornament, no ground-colour, no focal feature. | `explore/aspects.ts:25-34` `TAGS`, `:61-71` `featuresOf`. |
| G12 | **Pool path reads names, not scenes** | The older Explore-grid subject sets `vivid` from a regex over the archetype's name / tagline / fingerprint (`VIVID = /colou?r\|vivid\|neon\|…/`), takes `plantMode` from the recipe, and counts `plants` with `kind === 'plant'` only (artificial excluded, so a fake-planted look reads as `plants:none`). The newer path (`pairFacts.ts:144-146`) derives all of it from the design, which is the right one. | `explore/candidate.ts:49-54` vs `scene/pairFacts.ts:144`. Latent bug, only matters if the grid path is still reachable for new looks. |
| G13 | **Attribute panel has no ornament / theme attribute** | The ten attributes are tank, stocking, hardscape, background, substrate, plants, lighting, filtration, heating, stand. "Hardscape" = everything not a plant (so an ornament would be lumped in with rocks). | `scene/attrs.ts:15-21`, `:35-37`. |
| G14 | **Discover ordering** | `lookOrder` round-robins by `familyId`, so a new family gets airtime automatically (good), but it only sees `isBuildable` archetypes, and for a user "unsure of habitat" it leads with the first 3 freshwater looks (`fw.slice(0,3)`), which today are all naturalistic. | `scene/pairGen.ts:284-307`. |
| G15 | **Stocking presets** | Every `STYLES` row carries a species pool (`animals`) tuned to its look. A themed look needs its own pool (hardy community fish) or must reuse an existing one. | `scene/items.ts:643-668`. |
| G16 | **Finish tiers push toward artificial but as a *downgrade*** | "Cheaper tiers scale DOWN to artificial or mixed plants", framed as fallback, not as a style. Not wrong, but the language and flow treat fake plants as the cheap option rather than a choice. | `scene/finish.ts:5-8,74`. |

### 1c. What is already neutral (reuse, do not rebuild)

- **Discover generation** is look-agnostic: `explorePool` iterates archetypes (`explore/pool.ts`), `fromLook` draws them (`pairGen.ts:321`), `ingest` validates every scene through the same gates. A new archetype flows through with no change.
- **Welfare / stocking gates** operate on scene data, not on look names (details in §7).
- **DQ8 feedback** (`scene/attrs.ts:78-120`) scores by overlap of *element strings*, so a new attribute with new element strings works with zero scoring changes.
- **Pricing** is per-variant data rows (`data/demand-items.json`, `"hard:<variant>": { lo, mode, hi, unit, url }`, e.g. `hard:arch` L822, `hard:silkstem` L1566). That is already "real product link + price".
- **Rendering is procedural three.js**, no GLB loader anywhere in `src/` or `package.json`. So the §9-§14 "3D asset library" is, today, "procedural shape functions in `render/items.ts`". The EF3 download-size budget is about code size, not model files, for the slice.

---

## 2. Taxonomy verdict

**Four user-facing families are useful as entry points and as generator presets. They are wrong as a field in the data model.** Reasons, tied to the code:

1. The code *already* has a family concept (`FAMILIES`, `familyId` on archetypes, `look:<familyId>` aspect). It is used for card grouping, `lookOrder` round-robin, `FAMILY_BG` and the `look` axis of preference. It works as a preset grouping. Making families the *classifier* would duplicate what `designAxes` derives from the scene.
2. Hybrids prove the point: face-planter tank = live plants + manufactured ornament + serene theme. In an attribute model it is a point in space; in a family model it needs its own "Hybrid" bucket that is defined by what the other three are not.
3. `featuresOf` already separates `layout:`, `look:` (family), `natural:`, `colors:`, `plants:`. The learner is already attribute-shaped. We extend the attribute list; we do not introduce a second classification.
4. Nathan's own rule (§7 of his write-up) says Likes teach properties, not labels. Per-property learning needs per-property fields.

**Verdict, matching Coordinator 24's suggestions:**

- **Internal:** independent attributes (§3) plus an optional `theme` tag. Families stay as `FAMILIES` / `familyId` = presets and card groups.
- **User-facing:** the style screen gains 3-4 cards (e.g. *Colorful decorative*, *Themed centrepiece*, *Glo*, *Natural with an accent*) plus *Surprise me* (straight to Discover). **Drop "Hybrid" as a family name.** A hybrid is any preset whose attributes sit between poles; "Natural with an accent" is the honest card.
- **No new mandatory Guided step.** The cards live on the existing optional Quick Preferences screen (`ui/quickPrefs.ts`), exactly where the six are.
- Keep `fw-playful` as the family id; rename its card label later ("Bright & Playful" is fine for now; Nathan's write-up wants these not to read as childish).

---

## 3. Proposed internal representation (TypeScript, doc only)

Design rules: derive from scene data wherever possible; add a stored field only where the scene cannot answer; **unknown stays unknown** (absent field, never a default that grants function).

### 3a. Scene attributes (derived, never stored)

Extend `DesignAxes` (`scene/designAxes.ts:13`); all computed from items / substrate / backdrop like the existing four. Start with the five Coordinator 24 named:

```ts
interface DesignAxes {                  // existing: natural, lush, colourful, ordered, rockWood, plantMode, raw
  // existing fields unchanged ...
  /** NEW: share of visual mass that is visibly manufactured (ornaments + artificial plants + bright ground). 0..1. Replaces the proxy in `natural`, which stays as-is for old cards. */
  decorative: number;
  /** NEW: a read of how strong the story is: number and prominence of themed ornaments, 0 = none. */
  themeStrength: number;
  /** NEW: counts, not a score, so "one prominent ornament" is expressible. */
  ornaments: { count: number; focal: number };
  /** NEW: derived from variant tags of the planting (live / artificial / mixed / none), already exists as plantMode. Re-exposed unchanged. */
  // density = existing `lush` (plant mass) generalised to include ornaments: `density` = pieces mass / floor
  density: number;
}
```

`colourful` gains terms for ornament palette and for **any** non-natural ground colour (computed from the blend's HSL, so custom blends count: closes G9 / G10 for custom gravel).

The five preference dimensions: natural↔decorative (`decorative`), colour intensity (`colourful`), density (`density`), theme on/off (`themeStrength > 0`), live↔artificial plants (`plantMode`). Four of five are derived; only the learner needs new feature keys (§6).

### 3b. Item metadata (stored, sparse; unknown = field absent)

```ts
/** Extends Variant (scene/items.ts:15). Every field optional. Absent means UNKNOWN, never "safe" and never "none". */
interface Variant {
  kind: ItemKind;                       // gains 'ornament'
  // ... existing: label, hint, size, min, max, salt?, fake?, hardens? ...

  look?: {
    theme?: ThemeId[];                  // 'pirate' | 'ruins' | 'castle' | 'zen' | 'scifi' | ...
    material?: Material;                // visual material class, for variation and palette
    palette?: string[];                 // hex; ornament's own colours
    prominence?: 'accent' | 'supporting' | 'focal';
    role?: 'centrepiece' | 'support' | 'bubbler' | 'planter' | 'background-piece';
  };
  place?: { zone?: 'back' | 'mid' | 'front' | 'any'; burial?: [min: number, max: number]; clearanceMm?: number; neighbours?: string[] };
  function?: {
    /** Grants welfare credit ONLY when present AND checked against animal size. */
    shelter?: { openingMm: [w: number, h: number]; depthMm: number; evidence: Evidence };
    swimThrough?: { openingMm: [w: number, h: number]; evidence: Evidence };
    planting?: { pockets: number };
    airDraw?: { lph: number };         // bubble ornaments: forces an air pump line item
  };
  husbandry?: {
    material: Material;                 // set only from a verified source
    hazards?: ('sharp' | 'entrapment' | 'leach' | 'unknown-coating')[];
    evidence: Evidence;
  };
  commercial?: { productKey?: string }; // points at a data/demand-items.json row; price and URL live there
}
type Material = 'resin' | 'ceramic' | 'plastic' | 'silk' | 'stone' | 'wood' | 'glass' | 'unknown';
/** Where a claim comes from. Anything 'assumed' is shown as unverified and earns no welfare credit. */
type Evidence = 'product-spec' | 'measured-geometry' | 'user-stated' | 'assumed';
type ThemeId = 'pirate' | 'ruins' | 'castle' | 'zen' | 'scifi' | 'spooky';
```

Rules: (1) `function.*` credit requires `evidence !== 'assumed'`; (2) `measured-geometry` may grant **geometry-based** function (an opening is X mm wide) but never **material safety**; (3) `husbandry.material` is `unknown` for any import, which blocks nothing visually and grants nothing biologically. Phase 1 data is hand-authored, so `evidence` is `product-spec` for catalogue products (we know the SKU) and `assumed` where we do not.

### 3c. Scene-level stored fields (minimal)

```ts
interface TankSetup {
  // ... existing ...
  /** Optional, at most one value. Drives only the generator's ornament choice and a `theme:<id>` feature; never welfare. */
  theme?: ThemeId;
}
```

Artificial plant colour (G4) is the one stored-field change to an existing type, and it is deferred: `Fake` gains `tint?: string` in phase 2.

### 3d. Generator presets (recipe-level, extends `Tweak`)

```ts
interface Tweak {                      // scene/recipes.ts:64, existing fields kept
  // NEW
  ornaments?: { variant: string; per: Record<Density, number>; zone?: 'front'|'mid'|'back'; focal?: boolean }[];
  theme?: ThemeId;
  /** a colourful ground that bypasses the natural SUBS table; reuses existing `ground` for single-type, adds a palette pick for random shuffles */
  groundPalette?: SubstrateBlend[];
}
interface Preset {                     // internal name for what the user-facing cards map to
  id: string; label: string;
  archetypes: string[];                // existing archetype ids (as QuickArchetype.layouts today)
  axes: Partial<Record<'natural'|'lush'|'colourful'|'ordered'|'decorative'|'themeStrength', number>>;
  plantMode?: PlantMode; theme?: ThemeId;
  told: string[];
}
```

`Preset` is a rename of today's `QuickArchetype`; no structural change except extra axes.

---

## 4. The smallest change set for the pirate slice

**Goal (Test B):** a ship, natural gravel and several live plants, integrated; plus coloured gravel and two artificial plants reachable end to end (card → recipe → Discover → welfare → price). **No naturalistic scene changes**: every path below is selected only by the new archetype or the new kind.

| # | File | Change | Why it cannot touch naturalistic scenes |
|---|---|---|---|
| 1 | `src/scene/types.ts:281` | `ItemKind` adds `'ornament'`. | New value; old saves contain none. |
| 2 | `src/scene/items.ts` (LIBRARY, `layerOf`, `itemDims`) | Add 3 variants: `shipwreck` (focal), `treasurechest` (support), `anchor` or `cannon` (accent). Add optional `look / function / commercial` fields to `Variant` (§3b). `layerOf` already sends non-plants to `'hard'`, so no edit. `itemDims` gets one branch for the kind. | New ids, new kind. |
| 3 | The six places that list hard kinds explicitly: `scene/finish.ts:94,108`, `scene/setupsheet.ts:90,132`, `scene/propagate.ts:56`, `render/contact.ts:51,56`, `scene/recipes.ts:367` (weight) | Add `'ornament'` to each list (shopping list, weight, embedding, contact shadows). | Additive; lists are `kind ===` filters. |
| 4 | `src/render/items.ts` (near `caveShape` L353) | `ornamentShape(variant, seed, size)` building a procedural ship hull + masts and a chest from existing box / lathe helpers. Crisp realism, true colours, never cartoony (Nathan's standing rule; see memory `fish-art-not-cartoony`, `real-gear-true-colours`). | New function, called only for the new kind. |
| 5 | `src/data/demand-items.json` | Rows `hard:shipwreck`, `hard:treasurechest` with `lo / mode / hi`, a `unit` line and a real-product `url`. Gravel: one colour-priced row or note (§7 gap). | New keys. |
| 6 | `src/scene/recipes.ts` `Tweak` + `draw()/finish()` (~L207-240) | `Tweak.ornaments` and `Tweak.theme`; `finish()` places ornaments by calling the existing `makeItem` + `seatHook` / `settle` path used for the `caves` tweak at L234. One archetype entry in `TWEAKS`. | `TWEAKS[a.id]` is looked up per archetype id; others have no entry. |
| 7 | `src/scene/archetypes.ts:270` | `themed-scene`: set `recipe: { looks: ['driftwood'], plantMode: 'live', notes }`, `support: 'partial'`, deps that remain (`printed background`) stay listed. This alone makes it `isBuildable`. | Only that archetype changes status. |
| 8 | `src/scene/designAxes.ts` | Add `decorative`, `themeStrength`, `ornaments`; make `colourful` read custom-blend ground colour. | Existing four axes keep their exact formulas for any scene with no ornaments and natural ground (guard with a test that snapshots axes of all buildable looks, same pattern as `research/screens/DQ1/axes-by-look.txt`). |
| 9 | `src/explore/aspects.ts` `featuresOf` + `VALUE_LABEL` | New keys `theme:<id>`, `decor:ornament`, `ground:colour`. Labels like "a shipwreck", "bright gravel". | Extra keys only; absent when none. |
| 10 | `src/scene/attrs.ts` `ATTRS` / `attrValues` | Split `hardscape` into `hardscape` (rock, wood, caves) and `ornaments` so a Like on the ship is not a Like on the rock. Add `ground` colour to the existing `substrate` element list (`'sub:' + name` already). `ATTR_TAGS` gets `ornaments: ['look']`. | Old saved feedback uses `cat:'hardscape'`; keys unchanged for scenes with no ornaments. |
| 11 | `src/scene/quickArchetypes.ts` + `ui/quickPrefs.ts` | One new card *Themed centrepiece* (layouts `['themed-scene']`, axes `{ colourful: 0.3 }`, `needsLive: false`). Thumbnail via the existing QP3 tooling. | Card list is data; the screen already loops it. |
| 12 | `src/scene/territory.ts:76` + `recipes.ts:201` | Do **not** count `ornament` as shelter (already true: they filter `kind === 'cave'` / `wood`). Add a note nothing grants credit unless `function.shelter` is set and the opening fits (§7). | Reading only. |
| 13 | Tests | `test/ds1-pirate.test.ts` (below). | n/a |

**Not in the slice** (to keep it small): bubbler (needs air-pump line item), GloFish, coloured plastic plants (`Fake.tint`), printed backdrop, second theme. Coloured gravel for the slice is a `Tweak.ground` on the existing `clown` / `blue` types (hand-reachable today) so it costs one data line, not a feature.

**Honest size:** ~13 touch points, ~10 files, all additive. I would size it as one lane of moderate length, dominated by the ship's procedural shape (#4). The risk is the ship's look: Nathan has rejected painted / cartoony art twice, so the first pass should be a screenshot sheet before anything else is built on it.

---

## 5. Phased plan with acceptance tests

Acceptance letters A-G are Nathan's §18; H and I are the two Coordinator 24 added.

| Phase | Scope | Done when (automated unless marked) |
|---|---|---|
| **P1 Slice (pirate)** | §4 change set. | **B** pirate: scene from `themed-scene` contains ≥1 `ornament` (ship) + natural gravel + ≥4 live plants; `designAxes.plantMode === 'live'`, `themeStrength > 0`. **H** artificial plants give no nitrate credit: `plantUptake` of a scene of only artificial plants is 0 (existing `artificialplants.test.ts:110` covers stocking capacity; add the direct `plantUptake` assert). **I** ornaments priced: every `ornament` variant has a `hard:<variant>` row in `demand-items.json` with `url`, and `buildSheet` lists it with a non-zero price. Regression: `designAxes` of all 6 existing looks unchanged (snapshot). Screenshot sheet saved under `research/screens/DS1/` (visual: Nathan opens it). Build + `tsc` + only the touched tests. |
| **P2 Second recipe + welfare hooks** | `castle-coloured-gravel` recipe (castle, colour gravel, 2 artificial plants, bubbler as air-pump line item); `Fake.tint`; entrapment / opening-vs-size check; colour-aware gravel pricing. | **A** decorative planted: artificial greenery + natural-looking gravel + ceramic centrepiece, zero live plants substituted (`plantMode==='artificial'`, no `kind:'plant'`). **F** no forced inheritance: a colourful-ornament + sparse-layout scene is generatable (`colourful` high, `density` low, `ordered` high); vibrant ≠ cluttered. **E** welfare independence: a resin shelter and a natural rock with the same `function.shelter` opening get the same credit; neither gets credit when the opening is smaller than the animal's turn/hide size. New unit tests on `substrateCheck` with bright gravel + corydoras (existing SD1 path) assert the caution fires. |
| **P3 Guided / Discover exposure** | 3-4 cards on the Quick Preferences screen plus *Surprise me*; `theme:` / `decor:` features in the learner; mixed opening gallery. | **G** broad discovery: with no style given, the first Discover pool contains ≥3 families, including one decorative / themed (extend `dq2` stratification test; keep an eye on `fw.slice(0,3)` at `pairGen.ts:301` so naturalistic looks do not fill the opening). **D** preference inference: Like the ship, Dislike bright gravel → later pool ranks natural-ground themed designs above bright-ground ones while ≥1 themed design stays in the pool (extend `dq8.test.ts`). **C** sculptural planter: a `planter-face` ornament with `function.planting` + live plants produces the tank with no dedicated archetype (needs P4 data, see next). |
| **P4 Library growth** | By coverage gaps: ruins/temple, face planters, fluorescent (needs GloFish data + blue light), printed backdrop, second silk/plastic palette. Variation (colour, scale, weathering) with guardrails: scaling must recompute `function.*` openings. | Each addition passes the I (priced) and E (welfare by function) tests and adds a screenshot to the sheet. A "distinct scenes" metric: the pool for a fixed brief yields N visually distinct scenes (`visuallyDistinct`, `pairGen.ts:377`), reported before / after. |

Imports (Nathan's §12) are **out of this plan** by design; the `Evidence` field is the hook that keeps them safe later.

---

## 6. How Keep / Like / Dislike map onto the new attributes

Today (`scene/attrs.ts`, `scene/brief.ts:181`):

- **Keep** = a lock (`scene/locks.ts`): `tank`, `substrate`, `backdrop`, gear parts, item `uid`s, roster rows. Hard; never overridden by taste.
- **Like / Dislike** = `Feedback { level: 'design' | 'category' | 'item' | 'attr', cat, elements[] }`, soft, ranking-only, capped at ±0.8 (`FEEDBACK_CAP`), scored by overlap (`feedbackScore`, `attrs.ts:103`). A Dislike lowers only designs that contain *those elements*.

Mapping for the new attributes, with **no new feedback machinery**:

| User action | Level / `cat` | `elements` | Effect |
|---|---|---|---|
| Keep the ship | lock on the item `uid` (existing `{kind:'items'}`) | n/a | Ship preserved in every variation. |
| Like the ship | `item` | `['variant:shipwreck']` | Designs with a ship rise. |
| Like the pirate *theme* (not the ship) | `attr`, `cat:'theme'` (new) | `['theme:pirate']` | Any pirate ornament set rises; ship, chest, anchor each count. |
| Dislike bright gravel | `attr`, `cat:'substrate'` | `['sub:clown']` or `['ground:colour']` (new feature) | Bright-ground designs fall; natural-ground themed designs do not. This is the one new **element string**, not a new level. |
| Like artificial plants | `attr`, `cat:'plants'` | existing variant strings (`silkstem` …) or `['natural:artificial']` | Unchanged mechanism. |
| Like a whole design | `design` | feature keys incl. new `theme:` / `decor:` | Overlap over all keys. |

**Liked object vs liked composition** (Nathan's open question): `item` and `attr` entries = the object/property; `design` = the composition. They already coexist; the UI affordance (which button) decides. No model change.

Why this satisfies "likes teach properties": Test D works because *ground* is its own `cat` (`substrate`) and *ornaments* will be their own (`ornaments`, split from `hardscape` in §4 #10). Without that split a Dislike of "hardscape: shipwreck" would also depress rocks.

---

## 7. Welfare separation and unknown-safety handling

### 7a. Where welfare reads, today (verified)

| Check | Reads | Look-independent? |
|---|---|---|
| Nitrate / nutrient uptake | `plantUptake` counts only `it.kind === 'plant'` (`scene/nitrogen.ts:123`); artificial plants and painted artificial patches (`isLivePlantPatch`, `:117`) give nothing. Test: `test/artificialplants.test.ts:110-115`. | Yes. **H already holds**, only the direct-`plantUptake` assertion is missing. |
| Bottom-dweller substrate | `scene/substrateCheck.ts`, `data/substrateTraits.ts:11-19`: every colour type (`clown`, `blue`, `onyx`, `black`, `white`) maps to grain `gravel`; custom blends read grain only (`substrateCheck.ts:22-27`). So coloured gravel **already** triggers the same warnings as natural gravel, as required. | Yes. |
| Cover for guarding / shy species | `scene/territory.ts:70-82`: dense planting counts live **or** artificial (matches Nathan: "artificial plants can give cover"); caves are counted by `kind === 'cave'` with no size check. | Plants yes. Caves: **gap**. |
| Hardscape shelter count | `scene/recipes.ts:201` `shelterCount` = caves + wood, no size. | **Gap.** |
| Open swimming space | `scene/turnclear.ts` (turn radius vs tank width). | Yes. |
| Fin-sensitive animals | `finSensitive` picks silk vs plastic in `withPlantMode` (`scapes.ts:122`, `looks.ts:90`). | Yes. |

### 7b. Gaps that the new content would expose

1. **Shelter credit is unconditional for caves** (`territory.ts:76`, `recipes.ts:201`): a cave with a 1 in doorway counts as a hide for a 6 in cichlid. Fine for natural stock today; wrong the moment ornaments exist. Fix: shelter credit comes from `Variant.function.shelter` (opening, depth) compared with the animal's length / girth; caves get their row filled in once (they are hand-authored, so `evidence:'measured-geometry'`).
2. **No entrapment / swim-through check anywhere** (grep for entrap / swim-through / doorway finds only hint text). A castle window, a ship porthole or a skull eye socket can trap a growing fish. Fix (P2): `function.swimThrough.openingMm` vs species `girth` at **adult** size; warn when adult girth + margin exceeds the opening; unknown opening = "can't verify" note, never silence.
3. **No GloFish / protected-colour handling.** There is no GloFish species in `data/species.ts` (grep found none), no regional-ban data, no blue-light field on lights. So Test "GloFish need blue / actinic light and are banned in Canada and the EU" cannot be expressed. Defer to P4 and add as data with a source; do not add before there is a species to hang it on.
4. **Coloured gravel is priced like natural gravel.** `materialTiers.ts:85` uses one flat `$1.2/L` for every ground except pool sand and aquasoil. Cosmetic for welfare; matters for Test I ("priced"): add `coloured` to `GROUND_USD_PER_L` in P2.
5. **Material safety has no field today.** `Variant.hint` is prose. Nothing marks a resin ornament as aquarium-safe, nothing flags a painted/unknown coating. Hence `husbandry.material` + `evidence` (§3b).

### 7c. Rules (the contract)

1. **Welfare reads `function` and `husbandry`, never `look` or `theme`.** Enforce with a test that mutates only `look.*` / `theme` / `palette` on a scene and asserts every welfare verdict string is unchanged (same pattern as the "thumbs never filter" test in `attrs.ts`).
2. **No credit without evidence.** `function.shelter` / `swimThrough` / `planting` count only when `evidence !== 'assumed'`. Absent field = unknown = no credit, **and** the check surfaces "can't verify" instead of passing.
3. **Unknown hazard is not zero hazard.** `husbandry.hazards` absent → the Habitat check says "material not verified" for ornaments (a soft advisory, not a block), except in Sandbox where checks are information-only (`scene/brief.ts:150`).
4. **Geometry ≠ safety.** A `measured-geometry` opening can pass the entrapment *size* test but never sets `husbandry.material`.
5. **Variation recomputes function.** Scaling (`itemDims`, `clampItem`) must scale `openingMm` and re-run the check; partial burial recomputes whether an opening is blocked. Add as an invariant test in P4 before any procedural variation ships.
6. **Preference never gates.** `feedbackScore` stays ranking-only (already tested); Dislike never removes a design from the eligible set.

---

## Decisions for Nathan

1. **New item kind `ornament` (not `cave` variants)?** *Yes, recommended.* Using `cave` is fewer edits but gives every ornament automatic shelter credit (`territory.ts:76`), exactly the "looks like a hide so it counts" mistake you want to avoid.
2. **Families as presets, not a data field; drop "Hybrid" as a user-facing family?** *Yes, recommended.* Cards: Colorful decorative, Themed centrepiece, Glo (later), Natural with an accent, plus Surprise me.
3. **First slice = pirate tank only (Test B), on the existing `themed-scene` archetype?** *Yes, recommended.* Second recipe (castle + coloured gravel + silk plants) is Phase 2.
4. **Start with five dimensions: natural↔decorative, colour intensity, density, theme on/off, live↔artificial?** *Yes, recommended.* Four are derived from the scene, so the cost is small; everything else in your §7 list waits for evidence it matters.
5. **Split the "Hardscape" attribute so ornaments are their own Like / Dislike target?** *Yes, recommended.* Otherwise Disliking the ship also lowers rocks.
6. **Add an entrapment / opening-vs-fish-size check in Phase 2, and make shelter credit depend on opening size?** *Yes, recommended.* It also fixes the natural caves, which today count as a hide at any size. Say no if you want caves left as they are and only the new ornaments checked.
7. **Procedural three.js ornaments only for now, no GLB import pipeline?** *Yes, recommended.* The renderer has no model loader at all; keep the EF3 size budget as "bytes of shape code per asset" until imports are chosen.
8. **GloFish and fluorescent tank: defer to Phase 4?** *Yes, recommended.* No species, no ban data, no blue-light field exist yet; a Fluorescent card that only changes the gravel would be the "UI names a style the generator cannot make" problem your §17 warns about.
9. **Is a themed pirate tank allowed to use plastic *or* silk plants by default, chosen from the fish (fin-sensitive → silk), as today?** *Yes, recommended.* The mechanism exists (`finSensitive`); the slice uses live plants (Test B), the card for an artificial variant comes in Phase 2.
10. **Visual proof first?** *Yes, recommended.* Before anything past the ship is built, a one-sheet screenshot of the procedural ship + chest in tank (crisp, true colours) for you to approve, given painted art was rejected twice.

### Not found / unverified

- **EF3 (download-size budget)** is not in the repo or HANDOFF; I read it only from the brief. Treated as a code-size budget (no GLB loader exists).
- **Light colour / actinic support** was not audited beyond noting `lighting` has no spectrum field in `attrs.ts`; Phase 4 needs a proper check (`render/lighting.ts`, `scene/lightcheck.ts`).
- **`ui/` style screen** internals (`ui/quickPrefs.ts`) were located but not read line by line; the change there is a data loop over `QUICK_ARCHETYPES`.
- No app code was run; no tests were run (per the lane rules). All claims are from reading the source.
