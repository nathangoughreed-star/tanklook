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
