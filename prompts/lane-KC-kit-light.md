Read HANDOFF.md "Start here" first, then research/plan-guided-start-kits.md (decisions, "L0 audit and schema", "Amendments").
You are lane KC (kit light wiring). Worktree, branch and port: the coordinator assigns them (../Glass-Box-kitlight, branch kitlight).
Run on Sonnet.

Work unit: make a kit's light drive the EXISTING light model, and say honestly how sure the number is. The audit found the estimator
already exists: LightSettings (type, tech, count, watts, optional par override) in src/scene/types.ts, PAR computed in
src/scene/lightout.ts from watts x ppe x eta with a per-tech uncertainty (LED +-30 %, rest +-50 %), tiers and plant needs in
src/scene/lightneeds.ts, checks in lightcheck.ts / plantfit.ts. Do NOT write a second estimator.

1. src/scene/kitlight.ts:
   - `applyKitLight(setup, kit)`: write kit.light into setup.light (type, tech, count, watts, par if published) and set setup.lid from
     kit.lid, then call fitFixture() so ranges are respected. Pure function plus a thin store hook; no UI.
   - `lightConfidence(kit.light)`: returns { level: 'published' | 'estimated' | 'rough', plusMinus: number } from kit.light.spec and the
     tech's `unc`. published = the maker's PAR (scale to match, as LightSettings.par does); estimated = type + wattage on the listing;
     rough = tier default used. Used by the UI to show "estimated, about +-30 %".
   - `kitCapability(setup)`: from the computed PAR at the substrate, say in plain words which of the three wizard levels
     (low / medium / high, FIT_PAR in plantfit.ts) the kit supports, which plants in the library fit it (use plantfit.fits), and what CO2
     / ferts care tier the plant list implies. Example output: "Low light (about 25 PAR): anubias, java fern, crypts; no carpets, no red stems."
   - `upgradePath(kit, goalLevel)`: for a goal light level above what the kit supports, return the steps needed as a list of gear
     categories (light swap, plus CO2 / ferts / lid change) with a verdict: 'works as is' | 'swap the light' | 'effectively a new build'.
     Prices come later from the equipment catalog (lane KK); here return categories and reasons only, with a stub price hook.
2. User override: the existing `par` field. Add a small helper `overridePar(setup, par | null)` and make sure clearing it restores the estimate.
3. test/kitlight.test.ts using 4 hand-written stub kits (a low-end LED strip on a 10 gal, a T5 on a 29, a planted LED on a 20 long, a reef
   LED on a bowfront): assert applyKitLight round-trips, confidence labels, capability sentences are sensible, upgradePath verdicts
   match common sense. Use real kits from src/data/kits.ts once lane KB lands (the coordinator tells you).
4. Browser check: apply a stub kit through a dev-only hook, open the Light map, confirm the PAR and the verdicts on placed plants move
   as expected. No permanent UI in this lane (the wizard is lane KD); expose functions only.

Files you own: src/scene/kitlight.ts, test/kitlight.test.ts. Read-only: lightout.ts, lightneeds.ts, plantfit.ts, types.ts (ask the
coordinator before touching them; a missing LightTech or a need for a new field is a question for Nathan, no scene version bump).

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check, git push origin HEAD:main, then
git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Stage by path, never commit -a. Add your own dated section under
"Lane sections (current)" in HANDOFF.md.

Coordinator protocol: message the coordinator COORD_ID (send_message) when work lands on main and when you are done: commit hash,
what's open, which files are free. preview_stop when finished. Questions for Nathan stay in your own chat (a picture for anything about
what a tank looks like). If the chat gets long, hand off to a fresh chat at a work-unit boundary after writing your state into your
HANDOFF section.
