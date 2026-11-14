# Lane CM2: click a thing in the view opens it in the new shell (Coordinator 24, 2026-11-14; request R40)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/CM2/`).

## Nathan (2026-11-14)
"it looks like the 'click an item and it opens it up in the menu' isnt working now in the new UI, can you fix?" He is dogfooding `?ui=2` on live.

## Cause (coordinator's read, confirm it)
`src/main.ts:50` wires the viewer's click to `openMenuFor` in `src/interact/clickMenu.ts`. That function looks for the OLD UI's DOM: `#app.collapsed`, `#sideOpen`, `details.sec[data-sec=...]`, `#techMenu .trow`. Under `?ui=2` none of these exist, so it returns early. `clickTarget` (what was hit: animal, piece, plant, gear row, light, stand, lid) is UI-neutral and fine.

## Job
1. Under `?ui=2`, a click (no drag) on a thing opens the matching shell section at that thing's options, matching the old behavior target for target:
   - an animal: Animals, that row / selection drawer;
   - a hardscape piece or plant: Scape, that item's editing bar;
   - gear: Equipment, that category's row;
   - the light: Equipment > Lighting;
   - the stand, lid or doors: the Tank section's rows.
   Use the shell's own open event (`src/shell/open.ts`, `OPEN_EVENT` / `askOpen`, from lane SC) rather than DOM poking. Add the targets it lacks.
2. Keep the old UI's path unchanged (`?ui=1`, the default): branch on which UI is mounted in one place.
3. Phone (390 px): opening a section must not cover the thing tapped more than the shell already does. Use the sheet's half height if the shell has one.
4. Selection: the shell's existing selection (drawer, editing bar) should show the clicked item selected, not just open the section.

## Proof
`?ui=2` shots at desktop and 390 px: click a fish, a rock, a plant, the heater / filter, the light, and the stand, each showing the section opened at it. One old-UI shot to show it is unchanged. Tests for the target-to-section mapping. Add a dated HANDOFF.md section "CM2".
