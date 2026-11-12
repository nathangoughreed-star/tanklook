# Lane FX1: fix and finish what the audit found (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`, especially the visual proof rule: every fix comes with saved before/after screenshots under `research/screens/FX1/`. Your chat is titled "FX1: Audit Fixes". Nathan said "Start the fix lane".

## Read first
- `research/audit-2026-11-12.md` and its screenshots, `research/screens/AU1/`. The AU1 scripts (`scripts/au1-*.mjs`, `au1-lib.mjs`) already drive the real UI; reuse them.

## Fix
1. **A. The Discover pill covers the "Water ..." chip** at bottom right, on desktop and phone, in every state (AU1 shots 13, 21, 33). Make them not collide: move the pill or stack them. Keep the pill easy to find, and check the Map toggle and viewpoint map at bottom left too.
2. **B. The Checks strip draws over other things:**
   - the bottom of the left panel (24: the preference text cut off);
   - the Discover Compare cards (23);
   - the stand's door handles (16-Reef).
   Fix it so nothing important is covered at desktop 1280-1920 px wide and at phone width, with the panel open, collapsed or dragged wide (LP1). If the strip must overlay the view, keep it clear of the handle box (CB1 `doorBox.ts`) and the Discover card.
3. **Raw labels in Graphics settings:** "embed", "mix" and "sand" need plain-words labels in `FX_LABELS` (`src/render/fxPrefs.ts`), e.g. "Rocks and wood sunk into the substrate", "Mixed grain sizes", "Sand detail texture". Add a test that every `FX_DEFAULT` key has a label, so a future switch can't ship unlabeled.

## Finish verifying (screenshots, no code unless broken)
Go through the PARTIAL and NOT CHECKED rows:
- **#3:** the embed fix on a tank like Nathan's bug tanks: driftwood against the right pane, and a white-sand iwagumi. Use `research/vf0/scenes/glass-edge.json` and `iwagumi.json`.
- **#11:** the Sandbox Checks-strip wording.
- **#12:** resuming a saved session no longer lands in A/B.
- **#30 / #31:** cabinet gear with the CO2 cylinder, a sump, and no cabinet; the hoses through the back panel (view from behind).
- **#9:** the conflict card: a kept 20 gal tank plus a kept Oscar.
- **#27:** the plant-depth and anaerobic warnings in the Checks strip, plus a kuhli on gravel and a cory on crushed coral.
- **#7:** Compare. Note that the cards are text only; don't add pictures.
- Leave #17 ("Habitat check"): the name waits for Nathan.

Anything broken: fix it if it's small and certain, otherwise list it as BROKEN with a picture.

## Done
1. Update `research/audit-2026-11-12.md` with an "FX1" column: fixed / verified / still broken, plus the screenshot path for each.
2. Run `npm run build` and the full vitest in the foreground with a 600 s timeout, re-running failing files alone.
3. Add your HANDOFF section "FX1: ...".
4. Commit on your branch and rebase on origin/main.
5. Report ONCE to the coordinator with the sha, the counts, and every still-broken line. Stop Chrome / vite.
6. Never end a turn with anything running in the background.
