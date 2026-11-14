# Lane S4: Animals section, Water look, Selection drawer in the new shell (Coordinator 24, 2026-11-14; UI2 §7 step 4; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Follow the S1 / S3 / S2 / S8 template: pure view-models in `src/shell/logic/*.ts` with node tests; components only draw them (HANDOFF "S1", "S3", "S2", "S8").

## Job (behind ?ui=2 only)
- **Animals** (UI2 §2a row "Section Animals", inventory rows 28-29, shots 01 / 02 / 03):
  - search and filters, with "Fits this tank" on by default;
  - the stocking list with counts (+ / - / remove);
  - greyed animals with a one-line reason ("tight with 2");
  - "remove misfits" after a tank change.
- **Water look** (under Animals): level and tint. The water numbers live in the Water drawer.
- **Selection drawer**: the selected-animal box from the old UI moves here (inventory row 28). Click an animal in the view or the list to open it.
- **Engine calls** go only through P2 `src/scene/stockEdit.ts` and `src/ui/logic/animalPicker.ts` (HANDOFF "P2"). If something is missing, add it there with tests and name it in your report.
- **Experience** is an input to the gate. Pass the current value through one parameter; lane P10 replaces it later. Do not build the experience switch (that is step 5).
- **Your files:** new `src/shell/animals.tsx` and `src/shell/logic/animals.ts` (+ water / selection logic), and new tests. In `App.tsx` / `sections.ts` / `drawers.tsx` / `shell.css`, touch only the lines that register your section and the Selection drawer. Do not edit `panels.ts`.
- **Proof:**
  - 1600x900 shots next to UI2 shots 01 / 02 / 03: an empty tank, a stocked example, a greyed animal with its reason, the Selection drawer open;
  - phone shots at 390x844;
  - a stocking made in `?ui=2`, saved, then opened in the old UI shows the same counts;
  - the old site (no `?ui=2`) unchanged.
