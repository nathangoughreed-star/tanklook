# Lane DS2: pirate-tank first slice (Coordinator 24, 2026-11-13; request R21)

Common rules: `prompts/lane-common-c20.md` (report to Coordinator 24; build + only your own tests; push your branch after every commit; real-app shots under `research/screens/DS2/`).

## Source
- Design: `research/design/ds1-styles-audit.md` (§4 change set, §5 phase P1, Decisions).
- Direction: `research/design/styles-direction-2026-11-13.md`.

## Nathan's decisions (2026-11-13)
Approved: DS1 decisions 1, 2, 3, 4, 7, 8, 9 and 10.
1. New item kind `ornament`, not `cave` variants: no automatic shelter credit.
2. Families are presets and cards, not a data field; no Hybrid card.
3. The first slice is the pirate tank only, on the existing `themed-scene` archetype.
4. Five dimensions, mostly derived.
7. Procedural three.js ornaments; no GLB loader.
8. GloFish / fluorescent waits for phase 4.
9. Silk vs plastic chosen from the fish, as today.
10. **Visual proof first.**

Changed:
- **Decision 5:** ornaments are ONE category, "Decor", with its own Like / Dislike, separate from Hardscape (rocks / wood). NO per-ornament buttons in lists. Individual ornaments get only the existing selected-item Keep / Like / Dislike.
- **Decision 6: REJECTED.** No opening-vs-fish-size / entrapment check, and do not change cave shelter credit; existing caves score exactly as today.

## Job, in two stops
**Stop 1, visual proof:** build the procedural ship and a treasure chest as `ornament` variants. Place them in a real tank (natural gravel, a few live plants). Save ONE screenshot sheet: front view, close view, and a 3/4 view of each piece, under `research/screens/DS2/stop1-sheet.png`.
- Art bar: crisp, true colours, same realism as the rest of the tank, NOT cartoony or painted (painted art was rejected twice).
- Commit, push the branch, then **report to Coordinator 24 and WAIT**. Nathan approves the look before Stop 2.

**Stop 2, after Nathan's yes:** finish P1 from DS1 §4/§5.
- the `themed-scene` recipe (coming-soon → partial);
- the `Tweak` field, the gravel row, price rows (`demand-items.json`, real products where one exists);
- the Decor category for Like / Dislike;
- tests: B (pirate scene contents), H (artificial plants give no nitrate credit), I (every ornament priced), plus a regression snapshot that the six existing looks are unchanged.

Naturalistic scenes must not change. Respect the aquarium-only scope (`src/scope.ts`). Add a dated HANDOFF.md section "DS2".
