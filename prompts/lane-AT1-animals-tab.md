# Lane AT1: Animals tab fixes in the new shell (Coordinator 24, 2026-11-14; requests R41-R43)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/AT1/`). Shell files: `src/shell/animals.tsx`, `src/shell/logic/animals.ts`, the Tank section (`src/shell/tank*.tsx` / `logic/tank*.ts`), engine `src/ui/logic/animalPicker.ts` (`fitsThisTank`, `createFitter`). Nathan dogfoods `?ui=2` on live.

## Nathan (2026-11-14, sent to lane CT1)
1. **R41:** "Water look" belongs in the Tank tab, not the Animals tab. Move the group (level, tint) from `animals.tsx` (~line 91) into the Tank section. Its edits and summary stay the same. Animals keeps only animal things.
2. **R42:** Animal size should not be a setting when adding new animals. New animals come in at the default size. To change size, click an existing fish (selection drawer) and adjust its percent of adult size there. Remove the size control from the add/picker flow, and make sure the selection drawer has a clear "% of adult size" control (US-unit length shown beside it).
3. **R43:** With "Fits this tank" ON, on an EMPTY tank, species like Black molly, Cardinal tetra, Cherry barb and Chili rasbora disappear. With it OFF they show "Add anyway". The cause: group-size / sex-ratio rules fail when judging a single starting animal.
   - The filter must judge whether the species can live in this tank at its proper group: tank size, water parameters, temperament with current stock.
   - It must NOT judge whether one lone fish meets its schooling minimum.
   - Adding a schooling species should add its minimum group (or offer it), so the result is not instantly a warning.
   - Check what the old UI does and match it if it is right.
   - Proof: empty 20 gal long (Nathan's scene `research/visual/vf0/scenes/nathan-20g-long-2026-11-13.json` with stock removed), Fits ON, showing those four species listed.

## Proof
`?ui=2` shots at desktop and 390 px:
- Water look in Tank;
- Animals without it;
- the picker without a size control;
- the selection drawer's size control;
- the empty-tank Fits ON list.

Tests:
- the fits rule on an empty tank, covering the four species;
- schooling species are still held back where the tank is truly too small (e.g. a 5 gal tank for cardinals).

Add a dated HANDOFF.md section "AT1".
