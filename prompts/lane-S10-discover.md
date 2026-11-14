# Lane S10: Discover, Get started checklist, animal-first door in the new shell (Coordinator 24, 2026-11-14; UI2 §7 step 10; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Follow the S1 / S3 / S4 template (HANDOFF "S1", "S3", "S4", "S2"). Read UI2 §1 (the jobs: Explore, Best fit), §1a, §2a rows "Start" and "Section Discover", inventory rows 34, 35, 52 and 163-166, and decision 4.

## Job (behind ?ui=2 only)
- **Discover section, with modes** (Nathan asked for modes, not one Discover button). Build them on the existing engine: `src/scene/breadth.ts` (lane D3: Explore / Remix / Refine) and the existing Discover / D2 gap fill. Never write to the working design until Apply (HANDOFF "PS1").
  - **Explore:** wide ideas, different from what I have.
  - **Remix:** shuffle within my style; it takes over the old Quick Setup Shuffle and densities.
  - **Refine:** small changes to what I have.
  - **Fill only the gaps:** finish my setup, empty sections only (D2).
  - **Whole tank:** complete setups as a gallery; it merges the dormant "Explore Complete Setups".
  - **This or that:** the A/B taste screen, kept (Nathan 11-13: "definitely should stay"). For now it feeds nothing automatically (decision 15: manual).
  - Each mode previews in the viewer, with Apply / Keep. Locks are honored: item Keep / lock, and later P8's gear lock.
- **"Ideas for ..."** button in each section header, which opens Discover scoped to that section (inventory row 34). Add the button through one shared header component, not by editing each section file. If that needs a section file touched, list it.
- **Get started checklist:** 5 ticks, shown on a new tank, dismissable for good (§1a). It replaces the Guided flow (decision 4).
- **Start door "From an animal I want"** and Animals > "Plan around this animal": reuse `stockPlanLogic` as it is.
- **Your files:** new `src/shell/discover.tsx`, `checklist.tsx`, `src/shell/logic/{discover,checklist}.ts` and new tests. Also the shared section-header component, the Start door entry in S2's start screen (that entry only), and registration lines in `App.tsx` / `shell.css`. Lanes S7 and S9 run at the same time. Do not edit `panels.ts` or the engine's Discover logic beyond small pure helpers with tests.
- **Proof:**
  - 1600x900 shots of each mode with a preview, and "Ideas for Plants" scoped;
  - This or that;
  - the checklist on a new tank;
  - the animal-first door;
  - phone shots at 390x844;
  - Apply then Undo restores the design exactly.
  - The old site is unchanged.
