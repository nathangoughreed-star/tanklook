# Lane S1: habitat helpers + the new shell skeleton behind ?ui=2 (Coordinator 24, 2026-11-13; UI2 §7 P6 + step 1)

Rules: `prompts/ui-build-common.md` (P lane first, then shell lane).

## Job
1. **P6:** move the habitat helpers (`bar`, `topBy`, `tileState`, ... ) out of `src/ui/fullnessTile.ts` into `src/ui/logic/habitat.ts` with node tests; `fullnessTile.ts` calls them; no visible change.
2. **Shell step 1:** add Preact (and its Vite / TS JSX setup) and build the skeleton under `src/shell/`, loaded ONLY with `?ui=2` as its own lazy chunk:
   - header (project name, Undo / Redo / Save wired to the existing Store history and save, `...` menu placeholder);
   - the rail (9 sections + Settings, icons) and a panel host that shows one section at a time (sections are empty placeholders with their title for now);
   - the existing three.js viewer, unchanged, in the view area;
   - the viewer cluster top middle (View / Another moment / Compare as placeholders unless trivially wireable);
   - the check bar (Habitat, Cost, Water, Notes) reading real values, and the right drawer that pushes the view aside, with the four drawers READ-ONLY (Habitat from P6 helpers, Cost and Water from the existing engine).
   - `tokens.css` from `research/design/ui2/` as the design tokens; light and dark not required yet (dark like the mockups).
3. Without `?ui=2` nothing changes. Phone width: lay out per §6 (rail becomes the bottom tab bar) or at least not broken; say which.

- Your files: `src/ui/fullnessTile.ts` (moved block only), `src/ui/logic/habitat.ts`, `src/shell/**`, `src/main.ts` (only the `?ui=2` switch), `package.json` / `vite.config.*` / `tsconfig.*` (Preact), new tests.
- Proof: shots of `?ui=2` at 1600x900 (empty section open, a drawer open) and 390x844, side by side with UI2 mockup 01; `?ui=2` off = live site unchanged; bundle size before / after for the main chunk.
