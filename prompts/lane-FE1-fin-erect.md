# Lane FE1: fins held erect vs folded, varied per fish (R57)

Nathan 2026-11-15 (relayed by BP1): fins held erect vs folded should be a variable, ideally continuous 0..1, that changes when animals are shuffled to a new position. Real bristlenose fold the dorsal flat at rest and raise it when startled or displaying; the same goes for tangs, bettas, angels and cichlids.

## Do
1. **Per-fish value:** `fin` 0 (folded flat) .. 1 (fully erect). Prefer one combined value scaling all median fins, plus a pectoral spread if cheap. Store it on each fish instance with the pose/position data. Old files without it get the species default.
2. **Per species:** default and range in the fish plan data (`src/art/fishgen.ts`). E.g. bristlenose 0.1..0.9 (mostly folded), betta male 0.7..1, angelfish 0.6..1, tangs 0.2..1, most tetras narrow around 0.8. Don't invent a range for every species: a sensible family default plus overrides for the ones named.
3. **Reroll:** "shuffle fish" (`shuffleFish`, `src/scene/scatter.ts`) rerolls it with the position. It's seeded, so the same seed gives the same pose; exports and picking match the view.
4. **Render:** `src/render/fish3d.ts` folds each fin about its base line (rotate the dorsal down along the back, collapse the fan of rays). Don't just squash it, and no clipping into the body. The card stills stay at the species default.

## Checks
- `npm run build`.
- fish3d and scatter tests, plus a new test that shuffle changes `fin` within range deterministically and that save/load round-trips it.
- Shots of bristlenose, betta, angelfish and a tang at fin 0, 0.5 and 1 (side view), plus one in-tank shot before and after a shuffle. Save in `research/screens/FE1/` and look at them yourself.
- Commit on your branch and send the coordinator (C24) the sha. Do not push to main.
