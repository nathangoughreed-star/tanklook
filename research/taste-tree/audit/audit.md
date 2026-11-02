# Capability audit (lane VD2, 2026-11-02, main at build 1569)

Method: every archetype with a mapped look rendered by `recipeBase` at open / balanced / full (`scripts/vd2-audit.js`, 1400x900 headless Chrome, camera az 0 / el 8 / zoom 1.1; 20 gal long unless the archetype's own minimum or look needs more). Compared with `fingerprint` and `contrast.sibling`. Animal lists are identical across the three levels for all 40 archetypes with a look (checked in the render script's `facts()`: `animalsSame` true for every one). Coming-soon archetypes (no look) were not rendered.

## Counts (85 archetypes)
| | supported | partial | coming-soon |
|---|---|---|---|
| before (rule: look = partial) | 0 | 40 | 45 |
| after | 9 | 31 | 45 |

## Contact sheets (this folder, one per family with a buildable archetype)
Rendered: `vd2_fw-gardens`, `vd2_fw-sculpted`, `vd2_fw-wild`, `vd2_fw-minimal`, `vd2_fw-showcase`, `vd2_sw-coral`, `vd2_sw-fish`, `vd2_bk-shore`, `vd2_bk-rocky`, `vd2_bk-fish`, `vd2_bk-planted`, `vd2_te-creature` (.png).
Sampled afterwards (one archetype per family, Balanced only, under the Machine load rules; sheet `vd2_samples_balanced.png` plus one `vd2_<archetype>_balanced.png` each): silk-plant-natural, reef-arches, blue-glow-reef, dart-frog-rainforest, rocky-desert-canyon, rainforest-waterfall, riverbank-shore, cypress-swamp. No status changed: all stay `partial`.
- silk-plant-natural: artificial stems in neon red / green on black gravel read as silk plants but no natural driftwood look; fine as partial.
- reef-arches: a rock mound, no visible arch (the `v` composition does not make one); needs reef rock layouts. blue-glow-reef: same mound, no actinic light, so it looks like any reef.
- dart-frog-rainforest: purple back, big-leaf plants, no leaf litter; the frog is not visible at this framing.
- rocky-desert-canyon: the sample framing shows an empty teal back with one rock (the audit crop is tuned for aquariums), so the look could not be judged; re-frame before upgrading.
- rainforest-waterfall, riverbank-shore, cypress-swamp: the three paludarium samples look the same from the front (plants on soil, no visible water, shore or waterfall), so these siblings are not yet distinguishable; they stay partial on `waterfall / flowing water`, `shoreline slope`, `water tint`.
Families without a sheet or sample have no buildable archetype (sw-habitat, bk-mangrove, te-woodland, te-climb, te-botanical, pa-stream, pa-fantasy, pa-creature) or were sampled once above.
Re-run: dev server, then `import('/scripts/vd2-audit.js').family(id)` (whole family) or `.sample(id)` (one archetype, Balanced) in headless Chrome.
The sheets of bk-*, sw-fish and te-creature were rendered but not inspected in this pass; their archetypes also keep `partial` (brackish ones all wait on `brackish water type`).

## Support set (fields changed in `src/scene/archetypes.ts`: `support`, one `deps`)
Supported (9), reason from the render:
- dutch-garden: terraced stem streets, red/green groups, no hardscape, three levels stay streets.
- iwagumi-stone-garden: few angular stones, carpet grows open to full, never a jungle.
- planted-community, overgrown-jungle: distinct from each other and from dutch (wood, mixed stems, jungle canopy).
- driftwood-nature, underwater-forest: wood + stone + carpet; forest trees read as a forest.
- blackwater-creek: leaf litter, tinted water, roots grow from one branch to a tangle.
- african-cichlid-rockscape: stacked rock piles, sand, blue back; trio reads as one pile growing.
- goldfish-palace: big goldfish, open water, smooth stones, sand-coloured gravel.
Partial (kept or newly given a dep):
- mossy-wood-ferns: wood and grass but no moss or epiphyte ferns (dep `moss carpet` added).
- stone-wood-sculpture: draws a wall of stones, no wood, busy rather than clean; wants plain background / bare look.
- silk-plant-natural: not rendered; artificial mode works but no decor.
- big-fish-showcase: bare floor and one rock is right, but no animal fits the 75 gal so none is drawn (oscar / flowerhorn need a bigger tank); plain background missing.
- betta-retreat: wood and plants, no leaf litter or floating cover.
- rocky-river-stream: rounded stones read well, no cobbles / flow.
- all reef archetypes (lps, soft, sps, mixed, clownfish-anemone, reef-*): rock-heavy, corals small and sparse even at Full (coral geometry); reef-skyline and mixed-reef drew identical numbers (same look + composition), so the two are not yet distinguishable.
- brackish (mudskipper, rocky-coast, puffer, planted, fiddler): freshwater looks standing in, wait on brackish scenery.
- terrarium and paludarium partials: rule value, unaudited by picture except te-creature sheet.

## Ranked feature packs (archetypes unlocked = coming-soon made buildable)
No `wish` events exist yet (taste.ts), so interest is research-based only. "Decor first" does NOT win on coverage: it unlocks 3 for the highest effort.
| Rank | Pack (deps) | Unlocks | Also upgrades | Effort |
|---|---|---|---|---|
| 1 (DONE, lane BC1 2026-11-02: see "Pack 1 landed") | Bare & clean (plain background, bare bottom, white / black sand, single feature rock) | white-sand-stone, discus-showcase, axolotl-den (3) | big-fish-showcase, reef-rock-art, reef-skyline, stone-wood-sculpture | low: existing options, new presets |
| 2 | Marine fish-first (live rock without coral, coral skeleton decor) | marine-fish-rock, predator-display, octopus-den, classic-skeleton-decor (4) | | low-medium: reuse reef rock, drop coral |
| 3 | Forest floor (leaf litter, moss carpet, cork bark, mushrooms / woodland decor) | mossy-woodland, fairy-forest, closed-jar-garden, bioactive-planted (4) | mossy-wood-ferns, dart-frog-rainforest, betta-retreat | medium |
| 4 | Brackish scenery (mangrove prop roots, mud, shoreline slope, oyster shell, water tint) | mangrove-estuary, estuary-root-tangle, brackish-tidepool, mangrove-paludarium, crab-shore (5) | 5 brackish partials, cypress-swamp | high, large fidelity gain |
| 5 | Marine sand & plants (deep sand bed, seagrass / macroalgae, cold marine) | seagrass-lagoon, sand-bed-burrowers, seahorse-garden, cold-kelp-coast (4) | | medium-high |
| 6 | Artificial decor (ornaments, coloured gravel, glow, printed background, colour LED) | fluorescent-glow, castle-coloured-gravel, themed-scene (3) | silk-plant-natural, blue-glow-reef | high (new assets), strong popular appeal |
| 7 | Water & wall (waterfall / flowing water, background wall panel) | boulder-creek, cliff-gorge, cliff-wall-climber (3) | rainforest-waterfall, cascade-wall | high |
| 8 | Coral geometry (denser, larger coral) | none | 8 reef partials to supported, big fidelity gain | medium |

## Rock size (Nathan's screenshot, Full on a 20 gal long)
Checked on main at build 1569 after VD6's size-mix commit: the largest Full rock in driftwood-nature is about 4 in wide in the 20 gal long (it was 2-3x that). Already fixed, no tank-size cap added; Full still has one boulder that is the biggest piece, so a hard per-tank cap remains an option if Nathan wants it.

## Pack 1 landed (lane BC1, 2026-11-02): Bare & clean
Existing options only, as presets in `scene/recipes.ts` `TWEAKS` (`ground`, `flat`, `rocks`, `wood`, `caves`, `plantsOnly`) plus a solid backdrop colour per archetype in `ARCH_BG` (complementary rule kept). Each level lists its own rock sizes (shares of the biggest stone), so Open / Balanced / Full still progress (cover steps, size spread tests pass).
- white-sand-stone: coming-soon -> supported (stones look cut to one feature rock plus pebbles, flat white sand, solid slate back, no plants).
- discus-showcase: coming-soon -> supported (jungle look cut to a root or two and the big swords, flat fine sand, 4 discus; 75 gal).
- axolotl-den: coming-soon -> supported (flat fine sand, 1 / 2 / 3 stone arches as caves, a low stone or two, 1 axolotl; 20 gal).
- stone-wood-sculpture: partial -> supported (nature look: wood plus stone, no plants, flat sand; 1 / 1 + 2 stones / 2 + 4 stones). Was a wall of stones.
- reef-rock-art: partial -> supported (3 / 5 / 7 stones on flat white aragonite, corals only on those stones).
- reef-skyline: stays partial. Bare glass bottom now and 2 / 3 / 6 rocks, but the rocks are low boulders, not towers (needs reef rock layouts, pack 3).
- big-fish-showcase: stays partial. Solid dark backdrop, tan sand, 0 / 1 / 2 rocks, but no animal is drawn: the engine only fits one oscar from 180 gal (75 gal rating in the card is too low for the fit check). Either raise `minGallons` to 180 or lower the oscar fit; Nathan's call.
Counts now (of 85): supported 14, partial 29, coming-soon 42 (was 9 / 31 / 45).
