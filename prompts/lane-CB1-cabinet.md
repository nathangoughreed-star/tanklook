# Lane CB1: stand click fixes + gear inside the cabinet (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "CB1: Stand Clicks + Cabinet Gear". Ship part 1 first, as its own commit and report; then part 2.

## Nathan's words (2026-11-12)
"When I click the stand, it opens the menu but to the hardscape section, which is wrong. Also, it opens the door, which is fine, but I want to only open the door if you click inside a box around the handles. Also, can we put equipment like pumps and canister filters and CO2 systems inside the cabinet, to be seen when opened? Have lines enter the cabinet through the back."

His screenshot (28 gallon rimless on a dark cabinet stand, Hardscape open after clicking the stand): `C:\Users\nreed\AppData\Local\Temp\claude\6901f973c3fe917d\fca6f561-64e9-4c30-9c78-3696990f72b0\images\6.png`

## Code to start from
- Click-to-menu: commit `6612938c`, in `src/interact/clickMenu.ts` and `src/interact/pointer.ts`, with the targets tagged in `src/render/build.ts`.
- Stand doors: grep `door` in `src/interact/pointer.ts`, `src/render/build.ts` and `src/render/items.ts`.
- Stand / furniture options: lane ST1 (`git log --grep ST1`).

## Part 1: click fixes (small; ship first)
1. Clicking the stand opens the menu at the stand's own options (the Tank section's stand / furniture row, per ST1), not Hardscape. Check what else maps wrong: hood, lid, light, backdrop, room floor and wall. Fix each, and list them in your report.
2. The door opens only when the click lands inside a box around its handle(s); size the box generously, about 1.5 in around each handle. A click elsewhere on the stand opens the stand's options and leaves the doors alone. Show a pointer cursor over the handle box.
3. Tests for the click-target mapping and the handle hit box.

## Part 2: gear inside the cabinet
1. Gear that really lives in the stand is drawn inside the cabinet, seen when a door is open:
   - canister filters;
   - sump / return pumps if modelled;
   - the CO2 cylinder + regulator;
   - inline heaters / UV if modelled;
   - dosing pumps if modelled.
   Use the real per-part colours of the catalogue products (house rule: real gear in true colours). Geometry may be simple.
2. Hoses and cables run from the gear out through the back of the cabinet (cut-outs in the back panel) up behind the tank to where they enter the tank (canister in/out, CO2 diffuser line). They stay hidden behind the tank from the front view.
3. Placement: sensible, non-overlapping, fits the cabinet's inside size. If a piece doesn't fit, it sits beside the stand on the floor, flagged in the Checks strip, not hidden.
4. Open-stand or no-cabinet setups: same gear on the floor or shelf, visible. Tables / own furniture (ST1 / EQ1): on the floor beside them.
5. Render only from the existing equipment plan; no scene data change unless unavoidable.
6. Screenshots, sent to Nathan in your own chat before you report:
   - doors closed;
   - one door open;
   - both doors open;
   - the back view with the hoses;
   - a no-cabinet case.

## Part 3: glass lid clips (after part 2; its own commit and report)
Nathan: "Could we also include these clips when the user has a glass lid installed? Make the lid itself a little undersized compared to the open top and add the clips so the lid lays on them rather than the tank sides themselves."

His reference photo (not on disk) shows a rimless tank corner from above with clear acrylic lid-support clips:
- a corner clip: an L-shape hooked over the top edge of both panes, with a small inner ledge just below the rim that the lid rests on;
- straight clips: smaller pieces part-way along each long side, hooked over the single pane, with the same ledge;
- all clear, slightly frosted acrylic, about 1 to 1.5 in per leg.

Do:
1. When a glass lid is on a rimless / open-top tank, draw:
   - 4 corner clips;
   - 1-2 straight clips per long side, depending on its length;
   - all in the existing clear glass / acrylic material.
2. Make the lid glass undersized, about 1/4 in short of the inside of the top on every side.
3. Seat the lid on the clips' ledges, a few mm below the rim, not on the pane tops.
4. Framed / rimmed tanks and hoods stay as they are, unless they also use loose glass lids; say what you found.
5. Screenshots to Nathan in your chat:
   - a corner close-up;
   - the full tank;
   - lid hidden, for comparison.

## Collisions
- HM2 is editing the view toolbar (`index.html`, the toolbar part of `ui/panels.ts`).
- DQ11 is editing the list rows in `ui/panels.ts`.
- VF-C2 is editing ground and contact code (`render/contact.ts`, `grains.ts`, `scatter.ts`).
Stay out of all three.

## Done (each part)
1. Run `npm run build` and the full vitest.
2. Add your HANDOFF section "CB1: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE per part to the coordinator with the sha and the result. Stop your preview servers.
5. Never end a turn with anything running in the background.
