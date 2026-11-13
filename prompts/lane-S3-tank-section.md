# Lane S3: Tank section, tank picker, custom tank maker (with glass solver) in the new shell (Coordinator 24, 2026-11-13; UI2 §7 step 3)

Rules: `prompts/ui-build-common.md` (shell lane). Follow S1's template: pure view-models in `src/shell/logic/*.ts` with node tests; components only draw them (HANDOFF "S1").

## Job (behind ?ui=2 only)
- **Tank section** (UI2 §2a row "Section Tank", shots 01, 06, 06b, 07): Tank model card (commercial: shape / size / glass / rim read-only + "Make a custom tank from this..."; custom: Edit), Sits on (Floor / Stand / My own furniture, style, height), Lid and top, Background, Room. Groups fold to a one-line summary.
- **Docked tank picker**: two groups, **Custom tanks** (saved library from P9 `src/scene/customTanks.ts`, + New custom tank) and **Commercial tanks** (catalogue), BOTH collapsed by default; size chips, "Fits my space", finished price, In use, lock per row, Owned pill.
- **Custom tank maker** as its own workspace (shot 07): an EMPTY tank on a plain floor, dimension labels, gal / filled lb / footprint chips; name, shape, size, glass, rim; price estimate with its "how" and a "Use my own price" override; "I own this tank"; Cancel / Save to my tanks / Save and use in this setup / optional Preview in my setup. The setup is untouched until Save.
- **Glass panel in the maker** (R30, GS1 `src/scene/glassSolver.ts`, doc `research/design/gs1-glass-solver.md`): safety factor (default 3.8), "one thickness" vs "per pane", brace options (none / perimeter / perimeter + cross) with the optimizer's table, per-pane thickness, SF achieved, silicone joint check, and the disclaimer ("an estimate, not an engineering approval"). Rimless vs rimmed changes the top-edge condition.
- Engine calls only through P1 `src/scene/tankEdit.ts`, P9 `customTanks.ts` and GS1 `glassSolver.ts`; if something is missing, add it to those modules with tests (tell Coordinator 24 which).
- Your files: `src/shell/**` (Tank section, picker, maker), `src/shell/logic/tank*.ts`, new tests. Do not edit `panels.ts`.
- Proof: shots at 1600x900 next to UI2 shots 01 / 06 / 07, the maker's glass panel for a rimless 48x24x24 in and a rimmed 75 gal, and phone 390x844 of the Tank sheet. Old site (no ?ui=2) unchanged.
