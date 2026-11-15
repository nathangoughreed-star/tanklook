# Lane NT1: a new tank starts fresh; wall and person on; the Get started checklist can come back (Coordinator 24, 2026-11-14; requests R45, R46)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/NT1/`). Nathan dogfoods `?ui=2` on live.

## Nathan (2026-11-14)
"I dont want a tank coming in new with a stand, a heater, and filter. just fresh. Also have the wall and person on by default when starting new. The bubbles that showed check marks as you built your tank, how do you get those to show up?"

## R45: New = fresh
1. A NEW tank (File > New in `?ui=2`, the old UI's New, and a first visit with no saved scene) has:
   - no stand (the tank sits on the floor, or on the room's default surface; pick what reads best and show it);
   - no heater, no filter, no other gear;
   - no hardscape, plants or animals;
   - the same default tank as today unless that conflicts.
   - Find where the defaults come from: `src/scene/defaults.ts` (`stand.show`, the tech / gear lists) and any "starter" recipe New uses.
2. Wall and person are ON for a new tank: `wall.show` and `person.show` (defaults.ts lines ~32-33).
3. Do NOT change existing saved files, examples / starter tanks, Discover / Suggest output, or tests that pin `defaultScene()` numbers unless they are about New. If engine tests pin the defaults, give New its own `freshScene()` rather than editing `defaultScene`, and say which you chose.
4. Pricing / checks on an empty fresh tank must not crash or nag. Missing heater and filter show as to-do items, not red errors. This matters most for the check bar and the experience gate.

## R46: the Get started checklist (S10) can come back
Today (`src/shell/checklist.tsx`, `logic/checklist.ts`):
- It shows only on an EMPTY tank (`isNewTank`: no items, no fish).
- Its × writes `tanklook.ui2.checklist = off` for good, so once dismissed it never returns.
- The tick "light / heater / filter" was already done because New added gear.

Fix:
1. With New now fresh, the checklist shows on every new tank.
2. × hides it for THIS tank only, not forever.
3. Add a way to bring it back: a "Get started checklist" item in the header ⋯ menu (or Settings), which shows it on the current tank.
4. Migrate: ignore the old permanent `off` key once (treat it as "hidden on the tank that was open").

## Proof
`?ui=2` shots at desktop and 390 px:
- New → empty tank on the floor with wall + person and the checklist showing;
- ticks filling as you add a stone, a plant, a fish and a heater;
- × then bringing it back from ⋯.

One old-UI New shot.

Tests: the fresh-scene contents, and checklist show / hide / restore.

Add a dated HANDOFF.md section "NT1".

## Coordination
HB1 is moving the header (⋯ lives there), and AT1 and CT1 are in the shell. Rebase on origin/main before your final commit, and keep your header edit to one menu item.
