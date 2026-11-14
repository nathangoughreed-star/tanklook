# Lane P3: item / plant edits and the plant gate out of panels.ts (Coordinator 24, 2026-11-14; UI2 §7 P3; request R27)

Rules: `prompts/ui-build-common.md` (P lane: no visible change). Unblocks shell step 7 (Scape + Plants).

## Job
- **Move** (about lines 1620-1950 at build 1973; re-find them, since P1 / P2 / P7 shifted lines) from `src/ui/panels.ts`:
  - item and plant edits (add, move, remove, resize, brush / group edits);
  - the plant gate (fit reasons, built on `scene/plantfit.ts` `whyNot`).
- **Destination:**
  - `src/scene/itemEdit.ts` for the scene edits (no DOM);
  - `src/ui/logic/plantGate.ts` for the plant fit / gate view logic (no DOM).
- **Old shell:** `panels.ts` keeps its DOM and calls the modules. The old shell behaves exactly as before.
- **Experience:** keep the gate's experience input (if any) a single parameter, so P10 can swap in `experienceOf(area)`.
- **Tests:** a node test for each moved function, in `test/p3-items.test.ts`.
- **Your files:**
  - new `src/scene/itemEdit.ts`, `src/ui/logic/plantGate.ts` and `test/p3-items.test.ts`;
  - `src/ui/panels.ts`: only the moved block and its call sites.
- **Other lanes:** S4 works in `src/shell/` and P4 in `src/ui/techMenu.ts` + `units.ts` at the same time; don't touch their files.
- **Proof:**
  - the existing item / plant / scape tests pass;
  - before / after shots of the Plants and Scape panels (a planted example, one greyed plant with its reason, the brush bar) are identical.
