# Lane AL1: albino forms as an option (R56)

Nathan 2026-11-15 (relayed by BP1): "for animals that often come available in albino forms, add that as an option."

## Do
1. **Data:** a per-species flag for species commonly sold as albino. Research which ones, from the trade, not guesses: e.g. bristlenose pleco, bronze and peppered cory, oscar, Buenos Aires tetra?, tiger barb ("albino" / "gold"), axolotl (leucistic and albino), clawed frog, angelfish?, rainbow shark, red-tail shark, rams?, convict? Cite one source per species in the data file, as other species fields do. Only true albino or amelanistic forms count. Leave line-bred colour morphs (gold, platinum, GloFish) out unless the trade sells them as "albino".
2. **Option:** on a fish already in the tank (stock row or selection), a "Albino" toggle per species group, the same place as the % of adult size control (AT1 R42). Also a small "Albino available" note in the species (i) detail. Saved with the file, undoable. Old files load as normal colour.
3. **Look:** a recolour of the same model, not a new model. Melanin goes, so the body is pale pink-cream to yellow-white, with red/pink eyes. Keep the species' pattern only where it is not melanin (an albino bristlenose is cream-yellow with pale fins and no dark spots; an albino cory is pink-white). Crisp and in true colours like the rest; nothing cartoony. Same tint in the tank, the gallery still (bake `<look>-albino.webp` if the card shows it) and exports.
4. **Effects:** none on stocking math (same species), except things that genuinely differ (none known; don't invent).

## Checks
- `npm run build`.
- Species and fish render tests, plus a new test that the flag round-trips through save/load and only flagged species offer the toggle.
- Shots of each albino species next to its normal form (side view, 1280 px), plus one in-tank shot and the stock row with the toggle. Save in `research/screens/AL1/` and look at them yourself.
- Commit on your branch and send the coordinator (C24) the sha. Do not push to main.

## Part 2 (Nathan 2026-11-15) - R67
The albino oscar came out too washed out (`research/screens/AL1/oscar-albino-vs-normal.png`: cream with faint orange). Nathan: "look up pictures and make the model look like that until it does." Real albino oscars (the "albino tiger" and "albino red" oscars in the trade) are bright white to cream with large, strong red-orange marbled patches over the flanks and back, red eyes, and pale fins. Find several reference photos (describe them in your report and link them; don't copy them into the repo), then iterate the albino recolour for the oscar: keep the orange / red pigment strong while melanin goes. Compare side by side with the references after each pass, and stop only when it matches. Check the other four albinos against photos the same way while you're at it. Commit on a fresh branch from origin/main and send me the sha with the final side-by-side shots.

## Part 3 (Nathan 2026-11-15) - R78
1. **Albino search:** typing "albino" plus a name ("albino cory", "albino pleco", "albino oscar", or just "albino") in the animal search shows the base species with an "Albino" badge on its card. Adding from that card adds the fish with the albino form already on. This covers the Animals picker and the "start from an animal" door. Synonyms: "albino cory" -> bronze cory (and peppered cory, item 2); "albino pleco" / "albino bristlenose" -> bristlenose.
2. **Peppered cory** (*Corydoras paleatus*): new species with sourced data like the other cories (about 2.5-3 in, groups of 6+, cooler water about 64-75 °F, bottom, peaceful), a 3D model matched to photos (olive-grey with dark peppered blotches, a pale belly), a baked card still, body volume regenerated, and the albino flag with a source (albino paleatus is sold).
3. Check: build; species, search and albino tests, plus a new test that "albino cory" finds bronze and peppered with albino on add; shots of the search and the peppered cory normal vs albino. Commit on a fresh branch from origin/main and send me the sha. Report it if calibration tables move; I re-bless them.
