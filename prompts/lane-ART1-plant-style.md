# Lane ART1: plant colour and light: the scenery's biggest area looks like it belongs with the fish

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-art1 -b art1-plant-style origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's art-direction answer (`research/fable/1-art-direction-answer.md`, sections 2 and 3 row 2) and strategy tier 1 item 10. It EXTENDS lane PT (R147 / R151, `research/fable/ref/lane-PT-plant-textures.md`); it does not repeat it. PT already landed: atlas batch 2 (85f41835, ten leaf families), denser leaf meshes, soft cut-out edges, darker leaf bases, wet sheen, leaf character (766d29b1 to 55ccf7c0). First run `git log origin/main --oneline -- src/render/plant3d.ts src/render/items.ts src/data/plantart public/art/plants` and read what PT did since 11-25.
Usage: a measure step, then one work unit. Report the token cost and wait for a yes before anything beyond it.
Nathan decided (2026-11-26) that new plant families and the R147 colour work do NOT pause. PT may still be running: ask the coordinator. If it is, you and PT never edit `plant3d.ts` or `plantMaterial` at the same time: you own the colour and exposure constants in `plantMaterial`'s `post` (`src/render/items.ts`); PT owns leaf shape and atlas content, and rebases onto you.

## Goal
Plants stop looking like plastic next to the approved fish. Fable measured, on pictures that may predate atlas batch 2: green plant pixels median saturation S 0.71 and luminance L 0.57; red stems S 0.80; carpet S 0.83; grass L 0.68; against approved fish S 0.39, L 0.25. Targets (starting gates, tune after the first re-shoot): rendered green median S at most 0.60 and L at most 0.45; at most about 15 percent of a plant's pixels above S 0.8, and only on plants whose real colour is a signal colour (red stems, red tips); at least 15 percent darker near the substrate than in the top third of the plant.

## Before you build: could the diagnosis be wrong?
Fable could not tell whether its pictures included atlas batch 2. Build current origin/main, re-shoot the reference tanks with `scripts/vf-shots.mjs` (planted 4 ft, the planted example, a carpet tank, a grass tank), and measure S and L per class with a pixel-mask script (add it to `vf-shots.mjs`; mask by a flat-colour debug pass or by plant material). If green median S is already at or under 0.60 and L at or under 0.45, and no plant exceeds the 15 percent rule, the plant gap is closed: report that with the numbers and pictures, and stop. Otherwise find which cause it is: (a) vertex `cols` still multiplied into the painted leaf colour, so lime shows although the atlas is olive; (b) plant cards take full light with no top-to-bottom term.

## Unit 1: colour and light
1. If (a): for textured types use vertex colour for form shading, per-plant tint and jitter only (PT brief step 4). Show Nathan "texture as painted" and "texture luminance x today's cols" only if the numbers cannot pick one. If (b): add one plant exposure constant and a top-to-bottom light term in `plantMaterial`'s `post`.
2. Untextured families (those not in the atlas): the same exposure constant, then list which still fail, so Nathan can decide whether PT paints them.
3. Re-shoot, re-measure; keep the measuring script and its pass / fail print in `scripts/vf-shots.mjs`.

## Done when (on a named live build, with screenshots)
- Before / after pictures of the planted example, a carpet tank, a grass tank and a stem-plant tank, side by side with the S / L table, in the report; the numbers meet the targets, or the report names the limiting constant.
- Other plant behavior unchanged: growth slider, sway, surface lie-over, leaf algae overlay (`leafAlgaeShader`).
- Frame time A/B by alternating frames on the planted 4 ft tank: no more than 0.5 ms change. Cold link (`scripts/cold-ab.mjs`): first part no more than 0.2 s later. One material per glass outline stays; no per-species materials.
- Needs Nathan: only to approve the four before / after pictures at the end, in one message. The work runs without him.

## Must not touch
Leaf shape, growth, sway and bending code in `plant3d.ts` (PT's; read only); the swim files (BR); the verdict files (HV); the fish build scripts and fish art; `coral3d.ts` and rock code (lane ART2); `lighting.ts` aqPatch.

## Rules
- US units (gallons, inches, deg F, US $); US spelling in UI text.
- `npm run build` (includes tsc and the size budget) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Perf claims: alternate A/B per frame (sequential timings lie on this machine).
- Verify on screen or a saved screenshot before saying done; say merged vs live separately.
- Any question for Nathan about a screen comes with a cropped, labelled picture, in the same message.
- Subagents run on Sonnet (Haiku for a grep). Before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote it to the coordinator.
- Add a dated ART1 section to HANDOFF.md and set your row in `research/requests.md` (R169); note on R151 that ART1 holds the colour close-out.
