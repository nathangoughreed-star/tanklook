# Answer 5: the build-B fish pipeline

Fable, 2026-11-25. Opened: the brief, `PIPELINE.md`, `HANDOFF-batch-b8.md`, `bluetang-blind-AB-key.md`, `bluetang-B-fixes-before-after.png`, `hy2mv-vs-buildB-tank.png`, and the behavior section of brief 7. Not opened: the method log, history, audit, scripts, `log.csv`, the other four PNGs. All minute and percentage effects below are guesses; nothing is measured yet.

## 1. Verdict: no, not at the current pace

Finish b8 (prompts written, 10 built), then stop batch modeling. Three reasons:

- **Per-fish detail barely shows at tank distance.** In the last row of the blue tang before/after image, the fish is about 190 px wide and the only visible difference is the pectoral fin.
- **Behavior is the category's top complaint and costs nothing per species.** It is renderer-wide, while every model costs a sheet, a build and a review.
- **Rivals' 900+ species are data rows, not models.** Roster breadth is limited by trustworthy husbandry data, not by art.

| Tier | Which species | What they get | Count | Nathan's effort per fish |
|---|---|---|---|---|
| A, hero | Fish over about 3 in, centerpieces, anything in templates or share images | Full build B, reviewed one by one | About 100 (45 live + built + b8), then by demand only | Today's (unmeasured) |
| B, family skin | Small schoolers, congeners of a tier A fish | An approved relative's body and fin rig rescaled to FishShapes, with a new side skin only | Next 100 or so | One sheet paste; approve by contact sheet |
| C, data only | The long tail | A body-shape-class silhouette, tinted and marked as placeholder art; full stocking and compatibility data | To about 300 fish in total | None |

Target about 300 fish, which matches Behind Glass. Don't chase 917. The lane time freed goes to behavior (brief 7).

## 2. Six pipeline changes, ranked

1. **Automatic gate after the build (between steps 8 and 12).** A failing fish is never shown to Nathan. Checks: depth vs range, mid-body bulge vs head width, pale tail-root band, eye count and size, pectoral spread, floating fins, dark holes on the front face. Removes the depth, tail-root, eye and face classes. Guess: halves fix rounds. Cost: one lane-day.
2. **Sheet acceptance gate before any build (step 5).** Checks: panel count, orientation, row 2 still holding a fin (row 2 silhouette vs row 1 minus the row 5 map), species vs the reference photo. A fail re-queues the sheet automatically. Removes the row 2, panel and wrong-species classes at the cheapest point. Cost: half a day.
3. **One contact sheet per batch (step 12).** Each fish shows model, sheet, real photo, and the in-tank view at normal distance. Nathan marks exceptions only. For tier B, defects invisible at normal distance are logged, not fixed. This is the biggest cut in his minutes.
4. **Golden-fish regression run.** Any template or builder change rebuilds five stored sheets and diffs the gate results; any prompt change gets three trial sheets first. Removes prompt-change regressions (the "Title the image" refusal) and fixes that break other fish.
5. **Trait table by family with species exceptions (steps 9-10).** Covers fin opacity, body clarity, pectoral spread, `pec.flat` and dorsal count. A human confirms exceptions only.
6. **`fish-batch.py` writes the log itself (step 15).** Timestamps, gate failures, rebuilds and verdict rounds per fish.

For mis-filed sheets, try asking for a small printed id in the sheet's corner and reading it back. It is untested, and it is a prompt change, so run it through change 4 first.

**The image model's fault (only a check or a redo helps):**
- Drawn depth and mid-body bulge.
- Fins kept in row 2.
- Panel layout and orientation.
- The pale tail-root band.
- Front-face distortion.
- Hue.

**Ours:**
- Mis-filing.
- Proxy depth clamps.
- Fin attachment, opacity and motion.
- Eyes and registration.
- Infrastructure.
- Verdicts given on broken renders.
- Lessons left as prose.

## 3. A fundamentally better approach

**Swapping to generative GLB: no.** In the oscar comparison the Hunyuan mesh has the better head and thickness. But it reads more photographic (the R144 objection), costs 20-35 times the bytes, has rigid baked fins that lose the renderer-wide fin beat and translucency, and can't be generated on the local machine.

**Inside build B: yes.** Stop asking the image model for geometry on tier B fish. Take the body from a family template plus FishShapes, and ask the image model only for a side skin. That removes the depth, row 2, panel, top-view and front-view classes for those fish.

**Cheap experiment:** b8 has three Boraras (merah, chili, exclamation). Build merah fully, re-skin it for chili, and also build chili fully. Show Nathan a blind A/B at normal tank distance. If he reliably picks and prefers the full build, tier B is wrong and per-fish sheets stay.

## 4. First thing to measure

On the 10 built, not-live b8 fish: Nathan's review rounds and minutes per fish, and the first-pass approval rate. That is the baseline every change above is judged against.

## 5. Leave alone

The single renderer path (`photofish.ts`, no per-species code), the spec-and-rebuild rule, and the 45 live fish; don't rebuild them unless Nathan flags one.

## Summary

1. Finish b8, then stop batch modeling: cap hero models near 100, grow the roster to about 300 with family-skin and data-only tiers, and move lane time to behavior.
2. Put two automatic gates (sheet, build) and a per-batch contact sheet in front of Nathan, and have `fish-batch.py` log rounds and minutes, starting with b8.
3. No to GLB; yes to template geometry plus skin for small fish, if the Boraras blind A/B at tank distance shows Nathan can't tell.
