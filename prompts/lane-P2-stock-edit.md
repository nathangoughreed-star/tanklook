# Lane P2: stocking edits and animal picker fit out of panels.ts (Coordinator 24, 2026-11-13; UI2 §7 P2; request R27)

Rules: `prompts/ui-build-common.md` (P lane: no visible change). Unblocks shell step 4 (Animals).

## Job
- **Move** (about lines 771-1106 at build 1973; re-find them, since P1 and P7 have shifted lines) from `src/ui/panels.ts`:
  - stocking edits `setCount` and `dropSpecies`;
  - picker fit `fitsFor`, `animalGate` and `refineFits`;
  - `removeMisfits` and the stocking `readout`.
- **Destination:**
  - `src/scene/stockEdit.ts` for the scene edits (no DOM);
  - `src/ui/logic/animalPicker.ts` for the fit / gate / readout view logic (no DOM).
- **Old shell:** `panels.ts` keeps its DOM and calls the modules. The old shell behaves exactly as before.
- **Tests:** a node test for each moved function, in `test/p2-stock.test.ts`:
  - count up / down / to zero;
  - dropping a species;
  - fit vs gate reasons;
  - "Fits this tank" filtering;
  - removing misfits after a tank change;
  - the readout text.
- **Experience:** lane P10 will later replace the experience inputs with one `experienceOf(area)`. Keep the gate's experience input a single parameter so P10 can swap it.
- **Your files:**
  - new `src/scene/stockEdit.ts`, `src/ui/logic/animalPicker.ts` and `test/p2-stock.test.ts`;
  - `src/ui/panels.ts`: only the moved block and its call sites.
- **Other lanes:** S2 and S8 work in `src/shell/` at the same time; do not touch it.
- **Proof:**
  - the existing stocking / animal tests pass;
  - before / after shots of the Animals panel (a stocked example, "Fits this tank" on, one greyed animal with its reason) look identical.
