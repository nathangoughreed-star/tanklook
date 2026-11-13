# Lane UI2: new UI design, screen map and mockups (Coordinator 24, 2026-11-13; request R27 step 2)

Common rules: `prompts/lane-common-c20.md` (report once to Coordinator 24; push your branch after every commit). **Design only: no app code changes.**

## Why
Nathan (2026-11-13): the engine, models and analysis are good, "But god the UI is terrible... its just been frankensteined for so long." Agreed plan: keep the engine (`src/scene`, `src/demand`, `src/render`, `src/data`, `src/explore`, the `*Logic.ts` files), design a new UI on paper, build a new shell BESIDE the old one behind a switch (`?ui=2`), move features over one at a time, then flip and delete the old UI. You are the paper step. Nathan approves your design before any shell code.

## Input (read in this order)
1. `research/design/ui1-inventory.md` (lane UI1): every surface, coupling, duplicates, user jobs, DOM-tied tests, rebuild sizes. Its 47 shots are in `research/screens/UI1/`; look at the ones you need, not all. If the doc is not on origin/main yet, `git fetch origin claude/ui1-ui-inventory` and read it there.
2. Nathan's standing rules: crisp realistic render, never cartoony; real gear in true colours; US units; aquarium-only scope for now (`src/scope.ts`), but keep the design habitat-general.
3. Recent requests that show what he wants (`research/requests.md` R15, R26 and the HM3 notes): shared controls in one cluster, per-tank Notes, Undo / Redo / Save always at the top of the menu, Discover in the menu not the viewer, Constraints and Preferences as separate sections.
Do NOT read `HANDOFF.md` whole; grep it.

## Deliverable: `research/design/ui2-screen-map.md` plus mockups
1. **Who and what for.** The user (Nathan's own words where you can find them) and the 3-5 jobs the app exists for, each in one line. Everything on screen must serve one of them.
2. **Screen map.** Every screen / panel of the new UI, what job it serves, how you get there, and where each of today's surfaces (UI1 §1) goes: KEEP (moved where), MERGE (into what), HIDE (behind a door), CUT (with reason). A table covering every UI1 row.
3. **One home per setting.** For each setting UI1 §4 found edited in several places (budget, upkeep, time, space, experience, room temperature, owned gear, ...): its single home, and where it is only shown read-only.
4. **The built-but-doorless features** (UI1 §1d: Guided setup steps, Visual Discovery, Explore, A/B, coach, animal-first stocking, Quick Setup): for each, recommend carry / merge / drop, as a decision for Nathan.
5. **Component set.** The small set of building blocks the new shell uses (panel, section, card, button kinds, pill, tile, dialog, toast, slider row, ...), with sizes, spacing and colours as CSS tokens. Replace UI1's count of distinct styles with one each.
6. **Layout on desktop and phone.** Viewer vs panels, split view, how panels collapse.
7. **Migration order.** Which features move to the new shell first (so it is usable early), the order after that, and what in the engine must be pulled out of `panels.ts` / `techMenu.ts` / `fullnessTile.ts` / `demandPanel.ts` / `ownedGear.ts` first. Each step: S / M / L. How the DOM-tied tests are handled.
8. **Freeze list.** Which UI requests to the old shell should pause once this is approved.
9. **Decisions for Nathan:** a short numbered list, each yes / no or a pick, with your one-line recommendation.

**Mockups:** static HTML pages (no app code, no build step) under `research/design/ui2/`: the main editor (desktop), the same at phone width, the split view, and one menu section open. Use the real tank render: take a screenshot from UI1's catalogue or your own and place it as the viewer image; draw the panels in HTML / CSS with the component tokens. Screenshot each mockup to `research/screens/UI2/NN-name.png` (1600x900, plus 390x844 for phone). Nathan judges from the PNGs.

## Limits
- Subagents on Sonnet only, at most 2, and only for reading / screenshotting. Keep your own reading to what you need.
- Plain words, tables, no padding. Nathan reads §1, §2's summary, the mockup PNGs and §9.
- Push the branch, report once to Coordinator 24 with the sha, the doc path and the PNG paths.
