# Lane AB4: Habitat Question and Intro (Discovery v2, Coordinator 21, 2026-11-09)

Start with `prompts/lane-AB-common.md`. Spec sections for you: 2, and spec 12 items 1-4.

## Build
Rework the New Setup step of the SL1 start screen. The code is in `src/ui/startMode.ts`, `src/ui/startScreenLogic.ts`, `#startDlg` in `index.html`, and the start block of `src/ui/panels.ts`. Keep these SL1 behaviours: the three choices (plan decision 1), the screen on every visit, and the restored-tank "Continue your last tank".

1. **New Setup asks ONE question, with pictures:** Freshwater aquarium, Saltwater aquarium, Terrarium, Paludarium, I don't know yet.
   - Reuse the kind art (`.mode-pic[data-art]`, `SETUP_KINDS`) where it fits.
   - Check whether paludarium is a supported kind. If it isn't, map it to the nearest supported world, don't invent one, and say so in the report.
2. **Picking one starts an empty project of that kind** through `newEmptyTank` / `startProject`, so the replace warning still applies.
   - Store the choice as a SOFT `HabitatDirection` (`src/scene/discoveryTypes.ts`) in the brief or the project extras. It is NOT a lock.
   - Add an explicit "Lock habitat" in the Tank menu only if it's small. Otherwise list it as a follow-up.
   - "I don't know yet" makes a default empty project with direction `'unsure'`.
3. **Intro popup on EVERY new project.** New Setup and toolbar New show it. Open Existing, a starter, a deal and Continue your last tank never do. Build it in a NEW `src/ui/introPopup.ts`, with the spec 2.2 copy verbatim:
   - Title: "Let's build your habitat."
   - "If you already have equipment or ideas in mind, add them using the tabs on the left. **Lock anything you're sure about.**"
   - "When you're ready, hit **Discover** to explore setups built around your choices. If you're starting from scratch, you can jump straight into Discover!"
   - One button, "Start Building". Esc also dismisses it. No "don't show again".
   - After it closes, the left menus and the Discover button should be easy to spot.
4. **Retire the DX5 shortcut step** (Just exploring / I have some ideas / I have an existing setup) and its kinds sub-step.
   - Keep "Deals and bundles…" as the small link.
   - Re-grep for the callers: `exploring`, `ideas` and `existing` in `attachStartMode`.
5. **Tests and checks:**
   - `test/ab4.test.ts`: the popup shows on New Setup and toolbar New, but not on Open Existing, a starter or Continue. The direction is stored and is not a lock.
   - Browser-check every route.
   - Screenshots at desktop and 375 px of the question, the popup, and the editor after Start Building.
