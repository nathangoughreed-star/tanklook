# Lane P4: gear choice application and one units module (Coordinator 24, 2026-11-14; UI2 §7 P4; request R27)

Rules: `prompts/ui-build-common.md` (P lane: no visible change). Unblocks shell step 6 (Equipment), together with P8.

## Job
- **Gear choices:** move the code in `src/ui/techMenu.ts` that applies a gear choice to the scene (pick a product, generic type or preset, the swaps and side effects such as lid / light / heater fit, and the conversions it does) into `src/scene/techEdit.ts` (no DOM). `techMenu.ts` keeps its DOM and calls the module.
- **Units:** create one `src/ui/logic/units.ts` (or `src/units.ts` if the engine needs it too; say which) for every `toF` / `fromUnits` / `fmtHeight`-style conversion and format, US and metric.
  - Grep for the scattered copies (`src/data/*`, `src/demand/*`, `src/art/*`, `src/ui/*`, ...) and repoint them to it, with identical output.
  - Do NOT edit `src/ui/panels.ts`: lane P3 owns it right now. List its unit call sites in your HANDOFF section so they can be repointed later.
- **Tests:** a node test for each gear-choice operation (`test/p4-tech.test.ts`), plus a units table test covering every function both ways and the format strings.
- **Your files:** new `src/scene/techEdit.ts` and the units module; `src/ui/techMenu.ts` (moved code and its call sites); the files whose local unit helpers you repoint (one-line imports); new tests.
- **Other lanes:** S4 (`src/shell/`) and P3 (`panels.ts`) run at the same time.
- **Proof:**
  - the existing gear / tech / demand tests pass with locked numbers unchanged;
  - before / after shots of the Equipment menu (heater, filter, light; US and metric) are identical.
