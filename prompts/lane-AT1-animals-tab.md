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

## Part 2 (added 2026-11-14; requests R47, R48), picture `research/screens/AT1/nathan-picker-2026-11-14.png`
Nathan (live build 2071, `?ui=2`, a new tank with 6 fish in it): "wheres the + and - buttons? Also, I want a tile card for the fish species when youre choosing. and when you click on a species, give a rundown of the difficulty level, size, etc and show a larger version of their card."

4. **R47: the stock rows are missing.**
   - His shot says "YOUR ANIMALS 6", but no rows render: only the "AqAdvisor 41%" line, then Water look.
   - `animals.tsx` ~58-75 draws rows with − / count / + / × only when `sv.rows.length`, so the stocking view-model returns no rows while `sv.total` is 6.
   - Find out why. Candidates: fish added by a path that `stockView` doesn't group (sex, species id, the old-UI or New recipe), or a filter hiding them.
   - Fix it so every animal in the tank always shows a row with − / count / + / ×.
   - Add a regression test built from a scene like his: New + 6 white clouds added through the picker, plus fish from an old saved file.
5. **R48: species tile cards and a detail view.**
   - Replace the picker's one-line rows with a grid of tile cards. Each card shows:
     - the species picture (the in-app fish art, a crisp render, not cartoony; reuse whatever Discover / S4 thumbnails exist, or render one);
     - the common name;
     - the adult size in inches;
     - the min group / "Add N" button;
     - a small care-level badge.
   - The cards should be two columns in the panel, and one or two at 390 px.
   - Clicking a card (not its Add button) opens a detail view in the panel. It shows a larger card picture plus a rundown:
     - difficulty / care level (CL1 data), adult size, min tank (gal), group size, temperament, water (temp in deg F, pH, hardness), diet, swim level, lifespan, and compatibility with the current stock;
     - why it is held back, if it is held back;
     - Add N, and Back to the list.
   - Use only data the app already has (species catalogue), and leave out fields it lacks instead of inventing them.
   - Also, the empty space under one result looks broken. With the R43 fix more species will show, but a short list should still read as intended.

Extra proof:
- his scene with the rows and − / + showing;
- the card grid at desktop and 390 px;
- the detail view for a white cloud and a held-back species.

Extra tests: the stock rows for added fish, and the detail model fields.

## Part 3 (Nathan 2026-11-15, picture research/screens/AT1/nathan-tiles-2026-11-15.png)
1. **Info button, not whole-card click (R50).** Each species tile gets a standard info button (an "i" in a circle, top-left corner of the art so it doesn't clash with the "6 in" length chip on the right; aria-label "<name>: details", title "Details"). Only that button opens the larger card + rundown. Clicking anywhere else on the tile does NOT open it (drag-out to the view and the Add button keep working). Keyboard: the info button is focusable; drop the tile's role=button/tabIndex/Enter handler.
2. **Species already in the tank leave the picker (R51).** A species with any count in this tank is not shown in the species tiles (it's already in the stock rows above with − / +). The category counts (Schooling fish 24 ...) and the "N animals shown" note count only what's shown; if it's removed from the tank (count to 0) it comes back. Remove the "N in" badge on tiles (no longer reachable).
Checks: build + the shell animals tests; update any test that expects the tile click or in-tank tiles. Desktop 1280 and phone 390 shots of the Animals tab with a stocked tank, the info button, and the opened detail. Commit on your branch and send me the sha.

## Part 4 (Nathan 2026-11-15, picture research/screens/AT1/nathan-door-2026-11-15.png) - R54
"when starting from an animal (or really a stocking list), just pull up the normal animal picker with the tile cards. maybe they only know the one(s) they want by look."
Today "Or start from an animal I want" (Get started checklist; `src/shell/discover.tsx` door, `doorPlan` / `animalScene` in `src/shell/logic/discover.ts`) opens a small dialog with a text search for ONE animal.
Do:
1. The door opens the SAME tile-card picker as the Animals section (categories, cards, (i) detail, search). Reuse the component; no second picker.
2. In this mode you build a stocking LIST: Add puts the species on a pending list with − / + counts (default start counts as in Animals), shown at the top like the stock rows. Nothing is written to the design yet. "Fits this tank" is off or hidden here, since there is no tank yet.
3. A primary button "Plan a tank for these (N)" runs the existing door planner on the whole list (smallest real tank that holds the group; check `doorPlan` takes several species, and extend it if it takes only one), then builds the tank as the door does today. One undo step. Cancel leaves everything as it was.
4. Phone 390: the picker fills the drawer and the plan button stays visible.
Checks: build, the discover and door tests, plus a new test that two species with counts give one plan holding both. Shots at 1280 and 390. Commit on your branch (on top of e2428567) and send me the sha.
