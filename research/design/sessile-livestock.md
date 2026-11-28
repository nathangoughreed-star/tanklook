# Sessile livestock mode (design note, 2026-11-28, for Nathan's OK)

Ask (Nathan, 2026-11-28): anemones "should probably be treated as animals, but some plumbing might have to change since they are sessile." Same mode later carries rock flower anemone and maxima / derasa clams. Backlog: `research/species-backlog-2026-11-28.md` 3a.

## What exists today (read from the code)
- An animal is a `Fish` row (`TankSetup.fish`, `src/scene/types.ts`) pointing at a `species.json` row. A thing you place is an `Item` (`TankSetup.items`). The bubble-tip anemone is an Item: `kind:'coral', variant:'anemone'` (`items.ts:130`), drawn by `coral3d.ts` `anemone()`.
- Everything that treats the anemone specially reads that Item: clownfish hosting (`scatter.ts anemones()` + `HOSTED = {ocellaris}`, `swimHome.ts` host home), light need (`lightneeds.ts` `anemone: C('lps','regular',[100,300])`), the coral gate (`animalfit.ts hasCorals`, `plan.ts` both exclude it), coral companions (`plantfit.ts`), the `clownnano` recipe (`items.ts:1132` grows one on the highest rock), archetypes `clownfish-anemone` and `cold-kelp-coast`.
- Snails are the closest precedent for "an animal that sits": `Species.kind:'snail'`, `surfaces`, own body builder (`render/snail3d.ts`), crawl pace + sim (`crawlPace.ts`, `crawlSim.ts`), stocking by footprint (`stocking.ts snailFloorCm2`, class `shell`). I'd copy that shape rather than invent a new one.

## Design
1. **Data.** `Species.kind?: 'sessile'` (beside `'snail'`), with `cat:'sw-invert'`, `salt:true`, `habitat:'water'`, `surfaces:['floor','hardscape']` (never glass), `zone:'bottom'`, new optional `host?: { for: string[] }` (the species ids it hosts: bta -> ocellaris, later maroon, porcelain crab). `tl` = disc width (mm), as the item's size is today.
2. **Placement.** It stays a `Fish` row with `surface`, so Add / Shuffle / drag / undo / uid / save all work unchanged. Pose is fixed: no yaw / pitch / bend wandering; it rests on the ground or the top of the rock under it. Shuffle puts it on a rock top (the same spot rule `clownnano` uses), never free water.
3. **Movement.** Not a swimmer: excluded from the swim sim. A slow creep through the existing `crawlSim` with a tiny pace entry in `crawlPace.ts` (an anemone moves roughly an inch a day, so visually near-still; a "may wander" note stays on the card). Clams: pace 0.
4. **Drawing.** New `src/art/sessile.ts` (meta: aspect, rest) and `render/sessile3d.ts`; the bubble-tip builder is lifted out of `coral3d.ts anemone()` and shared, so the picture is identical to today's. Rock flower / clams get their own builders later.
5. **Needs.** Light: species-keyed entry reusing the existing `C(...)` tier numbers (bubble-tip 100-300 PAR, as now; rock flower 50-150 lower; clams 150+). Flow: a `flowNeed` field read by `flow.ts` (moderate, indirect for anemones; clams moderate). Both shown on the animal card and in the tank checks like corals', never blocking.
6. **Stocking and bioload.** Counts as an animal: floor footprint like a snail (disc area, `floorUseCm2`), no swimming room (`spaceOf` 0), waste via a new `MET_CLASS.sessile` (low: anemones feed on fish waste and food; clams are filter feeders, near-zero). Mass from a keeper-reference row in `bodymass.json` (disc width -> grams), cited like the snail rows. Counted in total animals and the coral-gate rule stays as is (it is not a coral).
7. **Hosting.** `scatter.ts anemones()` and `swimHome.ts` read sessile Fish with `host` instead of the coral item; `HOSTED` becomes data (`species.host`). An anemone in the tank also feeds the existing "clownfish like an anemone" copy. Porcelain crab: same link, species added with its own backlog row.
8. **Animal checks.** Anemones sting and eat small fish and shrimp that touch them and can wander into powerheads: a short advisory in `animalfit.ts` (shrimp and tiny fish, intake guards), and the tank-age gate (not before ~6 months) as a warning, not a block. Matches the "warning, more info" decision for welfare-flagged species.

## Migration (saved tanks, `clownnano`)
- **No scene version bump** (needs your say per HANDOFF). A load-time step (next to the existing legacy upgrades) converts any `Item{kind:'coral',variant:'anemone'}` to a `Fish` row: same x / depth, `y` = ground + lift, size -> `tl`, seed -> look seed, `surface:'hardscape'` if it sits on a rock, then removes the Item. Item ids and uids are kept (the Fish takes the Item's uid), so undo / selection survive. The render path for the old variant stays until the migration has shipped, so a tank reloaded mid-deploy still draws.
- `clownnano` recipe and `archetypes` fingerprints emit the animal instead of the item. `examples/ss2-clownnano.json` is migrated on load like any save (checked by a test that loads it and finds one bta Fish, zero anemone Items).
- Light check, coral gate, plantfit companion list: read the species, with a regression test that a tank's output is unchanged for the same anemone.

## Open points for Nathan
1. OK to migrate on load with **no version bump**? (Recommended.) Otherwise a v-bump with the same step.
2. Species name: "Bubble-tip anemone" (*Entacmaea quadricolor*) as the one row now; rock flower (*Epicystis crucifer*) and the two clams in the same mode afterwards.
3. Should an anemone with no clownfish be allowed in a tank under 20 gal? I'd warn (they need a stable, established tank), not block.

## Build order after OK
(a) species row + sessile art/3D + placement/Shuffle; (b) stocking/bioload + light/flow needs; (c) hosting; (d) migration + clownnano + tests (`test/sessile.test.ts`, existing clownnano / lightneeds / stocking tests); then `npm run build` and `scripts/ship.sh`.
