# Lane HB1: put the view cluster and the check bar into the header (Coordinator 24, 2026-11-14; request R44)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; build + ONLY your own tests; push your branch after every commit; real-app shots under `research/screens/HB1/`). Nathan dogfoods `?ui=2` on live.

## Nathan (2026-11-14), picture `research/screens/HB1/nathan-before.png`
"I feel like this bar on top is kind of obnoxious and empty yet blocking the screen. Maybe we can put the two bars currently on the viewport up there instead?"

His shot (1920 wide): the header (`Header` in `src/shell/App.tsx` ~71, `.apphead`) holds TankLook · tank name · saved dot on the left and undo / redo / Save / ⋯ on the right, with an empty middle. Two pills float over the 3D view:
- top centre: `ViewCluster` (`src/shell/view.tsx`: View ▾, Compare, Another moment);
- bottom centre: `CheckBar` (App.tsx ~173: Habitat / no animals, $224 · $7/mo · 29 min/wk, 75 °F / no data, Notes 0).

## Job
1. **Desktop and tablet (>= 768 px):** move both into the header row so nothing floats over the view.
   - Left: brand + name.
   - Middle: the check bar's items (Habitat, cost, water, Notes) as compact header chips.
   - Right: View ▾ / Compare / Another moment, then undo / redo / Save / ⋯.
   - Same functions, same popovers: a check's panel opens downward from the header, View's menu drops down.
   - Keep the header height the same or lower. If the width is tight (768-1100 px), drop labels to icons with titles in a set order, and never wrap to two rows.
2. **Phone (< 768 px):** the header can't hold it all. Propose the phone arrangement, keeping S11's phone check strip if it is the best fit, and show it in shots. Don't make phone worse than S11 left it.
3. Compare mode (split view) and the maker still work. Anything that positioned itself relative to the floating pills (the Ideas button, Scape bars, the editing bar, toasts) is re-checked so it doesn't overlap.
4. The view gets the reclaimed space: the canvas fills from under the header to the bottom edge.

## Proof
Before / after at 1920x1080, 1280x720, 1024 (tablet landscape), 768 and 390, using Nathan's 20g Long scene (`research/visual/vf0/scenes/nathan-20g-long-2026-11-13.json`). Show:
- a check panel open;
- the View menu open;
- Compare on.

Add a dated HANDOFF.md section "HB1".

## Coordination
Lanes CM2 (click-to-open, `src/shell/open.ts` / selection) and AT1 (Animals / Tank sections) are working in the shell now. Keep to App.tsx `Header` / `CheckBar`, `view.tsx` and shell CSS, and rebase on origin/main before your final commit.

## Part 2 (Nathan 2026-11-15, picture research/screens/HB1/nathan-viewmenu-room-light.png) - R62
"shouldnt the rooms ambient light slider be in this menu?" Yes. The old UI had a little sun slider on the main view (lane UI4; `src/scene/roomlight.ts`: `roomOf`, `ROOM_MAX`, `roomAuto`; the old UI wires it in `src/ui/tankDockLogic.ts`). The new UI has no room light control at all.
Do: in the View menu (`src/shell/view.tsx`), add a "Room light" slider between CAMERA and SHOW, with a sun icon. It runs 0..ROOM_MAX, and the readout is Dark / Dim / Bright or a %. The first move drops `roomAuto`, exactly as the old slider does (one undo step, coalesced while dragging). Add an "Auto" link that brings `roomAuto` back, with the hint "Auto: bright until the tank has a light". Same on the phone View menu.
Checks: build; the roomlight and view-menu tests, plus a new test that the slider writes `light.room`, clears `roomAuto`, and Auto restores it. Shots at 1280 and 390 of the menu and of the view at dim and bright. Commit on a fresh branch from origin/main and send me the sha.
