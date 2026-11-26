# Lane ART2: reef rock and coral: held to the same style as the fish, before any reef outreach

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-art2 -b art2-reef-style origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's art-direction answer (`research/fable/1-art-direction-answer.md`, section 2 rules S1, S2, S3, S7 and section 3 row 3) and strategy tier 2 item 21: marine is advantage 3, so do this before any reef-forum post. Read first those sections, then `src/render/coral3d.ts` (the VF7 palette near line 81), `src/render/gritTex.ts`, and pictures 03, 11 and 12 in `research/fable/1-art/`.
Usage: a measure step, then two small units. Report the token cost after the measure step; wait for a yes before unit 2.

## Goal
Live rock and coral stop looking sprayed on. Fable measured coralline at median value V 0.80 (about #9a79ca, pastel lavender), visible facets on rock, and corals white or pastel with no shading. Targets (starting gates): coralline V at most 0.50 as rendered; rock and coral lit by the same top-to-bottom term as everything else (at least 15 percent darker at the bed than in the top third; undersides and hollows at least 30 percent darker than tops); no straight-sided flat facets visible at default framing; median saturation of rock and coral between 0.25 and 0.55, with strong colour only on corals that really have it (zoanthid, acropora tips).

## Before you build: could the diagnosis be wrong?
The VF7 darkening in `coral3d.ts` should already have landed; Fable could not see it in captures that may predate it. Re-shoot the reef example and the clownfish nano with `scripts/vf-shots.mjs` on current origin/main and measure coralline V, median S and the bed-to-top darkness ratio. If all three targets already pass, report with numbers and stop.

## Unit 1: rock and coralline
In `src/render/coral3d.ts` confirm the VF7 palette is what ships; hold coralline to V at most 0.50 as rendered; break its edge with the grit mask (`gritTex.ts`) instead of a smooth blend; apply the shared top-to-bottom light term. Soften facet edges the way stone does: no new geometry.
## Unit 2: coral shading
Corals take the same light term; add form shading (darker base, lighter tip) from existing vertex data, no new textures. Check the coral picker thumbnails still match the in-tank look.

## Done when (on a named live build, with screenshots)
- Before / after pictures of the reef example, the clownfish nano, and a close crop of a coral head and a rock face, with the V / S / darkness table; targets met, or the limiting constant named.
- Frame time A/B by alternating frames on the reef example: no more than 0.5 ms change. No new shader program; `scripts/cold-ab.mjs` first part unchanged within noise.
- Needs Nathan: approve four pictures at the end (marine colour is his taste call). The work runs without him.

## Must not touch
`items.ts` `plantMaterial` and the plant code (ART1, PT); the swim files (BR); the verdict files (HV); `lighting.ts` aqPatch (any change there lengthens every cold link: if you need it, stop and ask the coordinator); fish art.

## Rules
- US units (gallons, inches, deg F, US $); US spelling in UI text.
- `npm run build` (includes tsc and the size budget) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Perf claims: alternate A/B per frame (sequential timings lie on this machine).
- Verify on screen or a saved screenshot before saying done; say merged vs live separately.
- Any question for Nathan about a screen comes with a cropped, labelled picture, in the same message.
- Subagents run on Sonnet (Haiku for a grep). Before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote it to the coordinator.
- Add a dated ART2 section to HANDOFF.md and set your row in `research/requests.md` (R170).
