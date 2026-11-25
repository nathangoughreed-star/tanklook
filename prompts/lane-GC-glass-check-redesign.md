# Lane GC: Glass check redesign (free variable + upgrade card + glass prices)

Requests R85 / R148 (research/requests.md). Decisions by Nathan 2026-11-24 / 11-25 in the chat that built R148.
Start from branch `glass-toggles` (commit bc74eda1, NOT on main yet: it was blocked from pushing; this lane ships it together with the redesign).

## Where things are now (bc74eda1)
- Custom tank maker (`?ui=2`, Tank -> New custom tank) has a "Glass check" group: `src/shell/maker.tsx` (GlassGroup), `src/shell/glassSolve.tsx` (SizeMode, SfMode, WideView).
- Engine: `src/scene/glassSolver.ts` (solveGlass, now with `fixed` per-pane thicknesses), `src/scene/glassEnvelope.ts` (checkTank, maxHeight, braceFor with 'custom' level and `autoStrips`), `src/scene/glassDiagnose.ts`; view-models `src/shell/logic/tankEnvelope.ts` (SolveToggles, sizeTable, sfPanel, bestBrace), `src/shell/logic/tankGlass.ts` (glassPanel, GlassChoice.bracing).
- Two toggles shared by all modes: Glass: Same everywhere / Mixed; Bracing: Optimized / Custom. Tests: `test/gs5-toggles.test.ts`.
- Box tanks only: the solver has no pie / polygon model.

## What Nathan wants (in his words, then the decided design)
- His sheet: three variables (dimensions, glass thickness, safety factor); one fixed, the other two dependent, either one the input.
- "Size" is really several variables per shape (box L/D/H; pie angle/radius/height; polygon sides/height).
- 11-24: "when we are making the size the independent variable, the safety factor and glass thickness can be locked ... adjust the dimensions independently while staying below the allowable stress constraints. In this mode it shouldn't block the dimension change, just show the safety factor dipping below where you set the minimum, and show you the option of going to the next glass size option (and whether you would need to replace just the failing panes or the whole tank's glass based on the toggle you have on) and the approx cost to upgrade."
- 11-25 on prices: "should be both. Have a guessed price that can be overridden with user input. this is how every price should work."

### Decided design
1. Glass check gets a "Free:" switch with two modes (Safety factor mode folds into Size):
   - **Free: size** — glass and minimum SF locked. The tank's own dimension fields (Size group) are never blocked. Live per-pane SF table at the tank's OWN glass (spec.glass / spec.glassBuild per pane) and the brace in force; a pane under the minimum turns red. Keep the "Where it fails" view (FailView) here.
   - **Free: glass** — today's Glass mode (you set size + minimum SF, glass follows).
   - The Size table + "What can I build?" chart stay as an optional "See options" view under Free: size.
2. **Upgrade card** when any pane is under the minimum (warning tone):
   - Mixed: only the failing panes go up; Same everywhere: the whole tank's glass goes up.
   - Thinnest stock thickness that gets back over the minimum (may be 2+ steps; never special-order 5/16 in, same as the solver's pick list).
   - With Bracing: Optimized, also offer a brace when it fixes it for less than thicker glass; cheapest option first.
   - Each option: resulting SF and approx added cost; one click applies it (writes spec.glass / glassBuild / brace). Never auto-applied.
3. **Glass prices: estimate + override** (Nathan's rule for EVERY price):
   - Research (Sonnet subagent, sources cited in `research/glass-prices.md`): US price per sq ft by thickness for float and low-iron, cut to size at a glass shop, plus Home Depot / Lowe's for 3/32 and 1/8 in. Note edge-finish surcharge if sources give it. US units.
   - `src/scene/glassPrice.ts`: default $/sq ft table from that research; upgrade cost = area of the panes that change x (new price - old price).
   - Override: a "your price per sq ft" field per thickness in the maker (shows the estimate as placeholder), saved with the custom tank (CustomTankSpec + parseSpec in `src/scene/customTanks.ts`, tolerant of old saves).
4. Drop duplicate inputs: in Free: size the glass is the tank's glass (Glass and rim -> Thickness, or per-pane build), no second set of pickers.

## Done looks like
- Both modes work on box tanks at 1280 and 390 wide; pie / polygon show "box tanks only" as today.
- Tests: upgrade picks (mixed vs same, multi-step, brace cheaper than glass), price math, override saved/loaded, old saves still load. `npm run build` green; gs1/gs2/gs4/gs5/ct1/s3 tests green.
- Screenshot checked on screen before calling it done; requests.md R148 row updated (sha, merged).
- Commit on the branch, rebase on origin/main, check `git diff --name-status origin/main` shows only your files, then push to main (ask Nathan first if the push is blocked by the permission check, as it was for bc74eda1).
- End replies with "Build N" (commit count on origin/main).
