# Lane GS1: glass thickness solver and eurobrace optimizer (Coordinator 24, 2026-11-13; request R30)

Rules: `prompts/ui-build-common.md` (a P-style lane: engine only, no UI; the custom tank maker UI is shell step 3) and `prompts/lane-common-c20.md`.

## Nathan's ask (2026-11-13)
"it would be great if the custom tank builder had a glass solver that could tell you how thick the panels needed to be (if using the same thickness everywhere, or if you could have different thicknesses where the smaller panels could be thinner glass), and how that would be affected by things like a eurobrace. In fact it would be awesome if if could optimize the eurobrace geometry given a certain tank geometry and safety factor."

Nathan works with structural engineering; he will check the method, so show it plainly.

## Today
`src/scene/physics.ts:11 glassThickness()` picks a typical commercial thickness from interior height only. No brace model exists. The custom tank data layer is lane P9 (`src/scene/customTanks.ts`).

## Job: a pure module `src/scene/glassSolver.ts` (no DOM, no three.js) with node tests
1. **Panel check.** For each pane of a rectangular tank (front / back, two ends, bottom), water to a given depth: the hydrostatic (triangular) load on a rectangular plate, edges supported per the build (silicone joints treated as simply supported on bottom and vertical edges; top edge FREE without a brace, SUPPORTED (fully or partially) with a eurobrace / perimeter brace / center brace). Use published plate coefficients (Roark / Timoshenko tables for a plate under hydrostatic pressure for the edge cases you need), interpolated by aspect ratio. Output per pane: max bending stress, max deflection, achieved safety factor.
2. **Thickness solve.** Given a safety factor (default 3.8, the usual hobby value; user-settable) and the glass design strength (annealed float; state the modulus of rupture you use and its source; low-iron the same), return the minimum thickness per pane, rounded UP to stock thicknesses (metric 4, 5, 6, 8, 10, 12, 15, 19, 25 mm and the US 1/4, 5/16, 3/8, 1/2, 5/8, 3/4, 1 in). Two modes: **one thickness for all panes** and **per pane** (ends and bottom may come out thinner). Also a deflection check (state the limit and its source); the larger of the two governs.
3. **Bottom pane:** uniform load on a fully supported bottom (stand flat) needs little; state the rule you use (most builders match the walls or use a minimum) and why.
4. **Eurobrace optimizer.** Given tank L / D / H, water depth and safety factor: find the brace geometry (perimeter brace width, optional center cross-brace) that minimizes total glass cost or thickness, within practical limits (brace width ~2-4 in, brace glass thickness, leaves an opening for gear and hands). Report the options as a short table: no brace / perimeter brace / perimeter + cross brace, each with per-pane thickness, glass weight, a cost index, and SF achieved. Explain how the brace changes the top-edge condition and why it allows thinner glass.
5. **Validate.** Compare against (a) at least two published glass calculators or tables (e.g. the widely used hobby calculators based on SF 3.8, GARF-style tables) for 6+ sizes (10, 20 long, 40 breeder, 55, 75, 125, 180 gal and a tall 36 in deep build), and (b) the real thickness of commercial tanks of those sizes. Put the comparison table in your doc; explain any gap over 1 stock step.
6. **Hook-up, minimal:** a function the custom tank maker will call (`solveGlass(spec, opts)`), and the custom tank spec (P9) can carry per-pane thickness + brace. Do NOT change `glassThickness()` behavior for existing tanks; just note how it could use the solver later.

## Deliverables
- `src/scene/glassSolver.ts`, `test/gs1-glass.test.ts` (known cases, monotonic checks, rounding, brace effect).
- `research/design/gs1-glass-solver.md`: the method in plain words with the formulas, coefficients and their sources, the assumptions (simple supports, annealed glass, static load, no seismic / impact), the validation table, and a one-paragraph disclaimer to show in the app ("an estimate, not an engineering approval").
- A dated HANDOFF.md section "GS1". Report once to Coordinator 24 with the sha, the doc path and the validation table summary.
