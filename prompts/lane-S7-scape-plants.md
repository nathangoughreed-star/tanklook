# Lane S7: Scape and Plants sections in the new shell (Coordinator 24, 2026-11-14; UI2 §7 step 7; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Follow the S1 / S3 / S4 template: pure view-models in `src/shell/logic/*.ts` with node tests; components only draw them (HANDOFF "S1", "S3", "S4").

## Base
origin/main. If lane P3 (`src/scene/itemEdit.ts`, `src/ui/logic/plantGate.ts`) is not on main yet, merge `origin/claude/p3-item-plant-edit-039a06` into your branch first; it lands before you.

## Job (behind ?ui=2 only)
- **Scape** (UI2 §2a row "Section Scape"):
  - Substrate: type, blend, brush.
  - Terrain: slopes and corners. It starts closed (§1a: advanced groups start closed).
  - Hardscape and Decor library, with search.
  - Placed pieces: select, move, remove, "Keep" lock.
  - The brush / group bars.
- **Plants** (row "Section Plants"):
  - the library, greyed by light, with a one-line reason from P3's plant gate;
  - placed plants;
  - growth over time.
- **Experience** is one input to the gate. Pass it through; lane P10 replaces it.
- **Engine calls** go only through P3 `itemEdit.ts` / `plantGate.ts` and the existing scene modules. If something is missing, add it there with tests and name it in your report.
- **Your files:** new `src/shell/scape.tsx`, `src/shell/plants.tsx`, `src/shell/logic/{scape,plants}.ts` and new tests. In `App.tsx` / `sections.ts` / `drawers.tsx` / `shell.css`, touch only your registration lines; lanes S9 and S10 register sections at the same time. Do not edit `panels.ts`.
- **Proof:**
  - 1600x900 shots next to UI2 shot 01, covering:
    - substrate brush in use;
    - terrain open;
    - hardscape library;
    - a planted example;
    - a greyed plant with its reason;
    - growth.
  - Phone shots at 390x844.
  - A round trip: a scape and plants made in `?ui=2`, saved, then opened in the old UI look the same.
  - The old site (no `?ui=2`) is unchanged.
