# Lane ART3: sand, gear finish and stone detail: the rest of the scenery, after behavior

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-art3 -b art3-scenery-finish origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's art-direction answer (`research/fable/1-art-direction-answer.md`, section 3 rows 4, 5 and 7; section 4 "leave alone") and strategy tier 2 item 27. Start AFTER lane BR's unit 2 has merged (Fable's order: behavior first) and after ART1 and ART2, unless the coordinator says otherwise. The room, stand and backdrop (row 6) belong to lane EX, not here.
Usage: three small units. Report after each; wait for a yes before the next.
Keep the unlit pipeline (answer 1 section 4): no physically based materials, no real specular, no new shader programs. Keep real gear colours (house rule): add finish and edge, never new colour.

## Goal
Sand, gear and stone reach the one-style spec. Numbers: rendered pixels inside the tank between L 0.04 and 0.85 (white and aragonite sand sit at 0.94 and up today); gear gets a visible lighter edge line and, on satin parts, a broad soft lift of at most about 15 percent luminance; stone gets a mid-frequency layer (features of 1/4 to 1 in) and fine speckle contrast cut by about half.

## Before you build: could the diagnosis be wrong?
Re-shoot pictures 03, 08, 11, 12 and 14 of `research/fable/1-art/` on current origin/main (`scripts/vf-shots.mjs`) and measure sand L and look at gear and stone. VF3 (substrate grain) and VF9 (contact blobs) landed in October; some of this may already pass. Report what passes and do only what fails.

## Unit 1: sand (two constants)
Lower the white and aragonite sand albedo in `SUBSTRATES` (`src/art/placeholder.ts`) so rendered L stays under 0.85; turn on the existing `sand` detail flag (`FX_DEFAULT` in `src/render/fx.ts` has it off) if it passes the frame-time check.
## Unit 2: gear finish
Add `finish` (matte, satin, clear) to `PartColour` in `src/data/gearCatalog.ts`; in `src/render/gear/common.ts` give `WET` and `ROOM` a lighter edge line and, for satin, the broad lift. Set finish on the ten most common products first (HOB filter, canister, heater, two lights, skimmer, pump, stand, lid, cabinet). This replaces most of R98 (gear photo models), which stays deferred.
## Unit 3: stone mid-detail
Add one mid-frequency layer (strata, pits, 1/4 to 1 in) to `GRIT` in `src/render/gritTex.ts`; cut fine speckle contrast by about half. Wood in the iwagumi and driftwood tanks is a little orange (S 0.73): pull to 0.55 or below only if it also fails the plant rule.

## Done when (on a named live build, with screenshots)
- Per unit: before / after pictures at default framing plus one close crop, with the measured numbers.
- Frame time A/B by alternating frames on a gear-heavy tank (planted 4 ft with filter, heater, light): no more than 0.5 ms change.
- Gear colours unchanged (spot check five products against the catalogue).
- Needs Nathan: approve the pictures per unit; no sheets.

## Must not touch
Plant and coral code (ART1, ART2); the swim files; the verdict files; `backdrop.ts` and the example definitions (lane EX); `lighting.ts` aqPatch; the gear catalogue's real colours and sizes.

## Rules
- US units (gallons, inches, deg F, US $); US spelling in UI text.
- `npm run build` (includes tsc and the size budget) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Perf claims: alternate A/B per frame (sequential timings lie on this machine).
- Verify on screen or a saved screenshot before saying done; say merged vs live separately.
- Any question for Nathan about a screen comes with a cropped, labelled picture, in the same message.
- Subagents run on Sonnet (Haiku for a grep). Before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote it to the coordinator.
- Add a dated ART3 section to HANDOFF.md and set your row in `research/requests.md` (R171).
