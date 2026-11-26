# Answer 5: the build-B fish pipeline

Fable, 2026-11-25 (second version; replaces the first, which rested on too little evidence).

## Evidence read

- **Docs, in full:** the brief, `PIPELINE.md`, `fish-model-sheet-method.md` (rows 1-65, sections 5-7, change log), `fish-model-history.md`, `fish-sheet-methodology-audit.md` (E0-E7, E5b), `HANDOFF-batch-b6.md`, `-b7.md`, `-b8.md`, `bluetang-blind-AB-key.md`.
- **Scripts:** `fish-new.py` and `fish-batch.py` in full; `fish-build.py` for its checks and exits only.
- **All six images** the brief lists.
- **Recorded data I pulled:**
  - `research/fish-sheets/log.csv`: 32 rows, `nathan_rounds` "unknown" on all 32.
  - The 81 `build.json`, `build.log`, `sheet.json` and `fishshapes.json` files in `C:/Users/nreed/fish-sheets/*-b5..b8-gen/`.
  - `git log` on five fish's spec and anatomy files, and on `fishLive.json`.
  - File sizes of the 45 live looks in `public/art/fish/`.
- **Not read:** `photofish.ts`, the b5-b8 prompts, `requests.md`, the competitor files (I used the brief's summary), brief 4.

## What is recorded about effort

| Measure | Value | Source |
|---|---|---|
| Machine build time per fish, b5-b8 | Median 1.5-2.4 min per batch; range 0.6-20.8 | 81 `build.json` |
| Builds that failed outright | 1 of 81 | `build.json` |
| Sheets redone | 1 of 81 (b5 guppy) | `sheet-prev-*` files |
| Builds needing a second depth pass | 50 of 81 | `build.log` |
| Builds that printed a mass `CHECK` (outside 0.8-1.45x) | 25 of 81 | `build.log` |
| Builds that printed `PHOTO CHECK NEEDED` (fin class) | 41 of 81 | `build.log` |
| Fish on borrowed (proxy) proportions | 35 of 81; b7 18 of 20 | `fishshapes.json` |
| b8 state in the work folders | All 21 built, 17 with `visual_check`, 4 title mismatches | `build.json`, `sheet.json` |
| Commits touching a fish's spec or anatomy | Ram 11, bichir 7, danio 6 (includes pipeline-wide rebuilds); harlequin 3; clown pleco 1 | `git log` |
| Time from first approval to 45 live | About 20 hours (11-24 19:58 to 11-25 16:20) | `fishLive.json` log |
| Shipped art per live fish | Median 179 KB, max 378 KB; 8.65 MB for 45 | file sizes |
| Nathan's minutes per fish, review rounds per fish, first-pass approval rate | **Not recorded** | |

The only Nathan timings on record are from the retired click tool (36-129 s per fish, E7) and the dottyback (about 4 hours, 11 rounds).

## 1. Is per-fish build-B modeling the right investment?

**Yes as the standard art for every fish the loft can draw; no as the main investment from here.**

- **The marginal fish is now cheap.** A build takes about 2 machine minutes and fails 1 time in 81. b7 went from sheets to 20 of 20 live in one day. The failure history in the brief is mostly the cost of building the pipeline, and it is largely paid.
- **What is not cheap is unmeasured.** Nathan's review time and the quality debt are the real costs. Three b7 fish went live with mass out of range, 41 builds have no fin-class check, and six went live with no fin-beat or tail-root check (b7 handoff).
- **Behavior pays across the whole roster at once.** It is the category's top complaint. Per the brief, fin motion and see-through are already renderer-wide, so behavior work lands on all fish with no per-species art.
- **Roster growth has a precondition.** All fish art loads before the app boots (brief 5, render side). At 179 KB a fish, 300 fish is roughly 55 MB. Lazy loading has to land before the roster grows much.

| Tier | Which species | What they get | Count | Review |
|---|---|---|---|---|
| 1, close review | Fish about 4 in and up, centerpieces, marine showpieces (oscar, angel, discus, tangs, cichlids) | Build B, fin-class photo check, see-through check, Nathan one by one at close range | About 40-50 | As today |
| 2, batch | Small schooling and nano fish, congeners | Build B, automatic gate, approved by batch contact sheet at tank distance | Everything else that fits the loft; about 110 today | Exceptions only |
| 3, old model kept | Shapes the loft cannot draw: kuhli, hillstream, fancy goldfish, eels, sharks | Existing procedural model; no new method now | About 5-10 | None |

**Targets:**
- Finish b8 (built; needs review).
- Then no new batch until the gate (change 1) and lazy loading exist.
- Grow toward about 250-300 fish as husbandry data allows. That figure is my judgment: it matches Behind Glass's 280+, and the 917-932 lists are data rows, not models.
- New species enter at tier 2. I withdraw the placeholder-silhouette and family-re-skin tiers from my first answer: at 2 minutes a build they save little, and a re-skin still needs a sheet from Nathan.

## 2. Pipeline changes, ranked

1. **Make the printed checks a gate, and add the missing ones.**
   - Evidence: `fish-batch.py` records `ok` from the exit code alone. The mass check and the fin-map check only print. 25 of 81 builds printed a mass warning and went on.
   - Add checks that exist only as prose: `tlOverSl` under 1.15 on forked tails, mid-body vs head width (row 65), pale tail-root band, eye radius, pectoral spread, `visual_check` and `fin_opacity_source` present.
   - A failing fish is not shown to Nathan.
   - Removes repeats in: depth, tail root, eyes, lessons-not-scripted, mis-filed sheets reaching review.
   - Plugs in after step 8. Effect on his minutes: not measurable yet.
2. **Test row 5 (the fin map) as the body source for every fish.**
   - Evidence: rows 36, 42, 43, 50, 57, 59 and 61 all trace to row 2 drawing fin as body. Row 61 already concludes the fin map is the authority, yet `--body-from-map` is still a judgment flag.
   - Caveat: it built the guppy "in strips", and a switch by depth ratio was tried and dropped (row 43).
   - So run it as a test: rebuild the 81 stored sheets both ways and compare gate results. No new sheets, no Nathan time.
   - Targets the row-2 and tail-root classes. Step 6.
3. **Measure depth from the reference photo for proxy species.**
   - Evidence: 35 of 81 fish use another species' numbers. The proxy rule was rewritten three times (rows 49, 56, 64) after Nathan flagged the tailspot, harlequin and clown pleco.
   - Step 2 already fetches a true side photo; `fish-side-depth.py` exists.
   - Removes the proxy half of the depth class. Step 3.
4. **Rebuild everything from stored sheets after any builder or renderer change, and diff.**
   - Evidence: fixes were applied by hand-run sweeps, and 25 live fish still carry the tail-root band "until rebuilt".
   - Prompt changes get three trial sheets first (the "Title the image" refusal).
   - The sheets live only in `C:/Users/nreed/fish-sheets`, outside the repo. Back them up; they are the pipeline's source data.
5. **Fin class from a family table, not a per-fish default.**
   - Evidence: the default is `solid`, but the photo check of 26 fish found only 3 solid (row 61, item 14).
   - Seed the table from those 26 plus the four calibration fish; a human confirms exceptions. Step 9.
6. **Review by tier, and log it.**
   - Tier 2 gets one contact sheet per batch: sheet, real photo, model at tank distance, gate flags.
   - `fish-batch.py` already writes minutes and a grid. Add Nathan's verdict and round count per fish to `build.json`. Steps 12 and 15.

**The image model's fault (repeatable bias; only a check or correction helps):**
- Depth (cardinal about 25 % SL in 5 of 5 draws against 29 real, row 39).
- Width ignores numbers (E2, row 37).
- Mid-body bulge (row 65).
- Row 2 keeping fins.
- The front view is not a measurement (E1).
- Panel spacing and the pale tail root.

**Ours:**
- Mis-filing (the queue takes the first new download).
- Proxy clamps.
- Fin alpha, opacity defaults and fixed renderer allowances (rows 25, 28, 45, 57, 59).
- Hard-coded eyes (rows 40, 41).
- Colour: our lighting boosts saturation about 1.35x (rows 22, 48, 54).
- Two verdicts on broken renders.
- Checks that warn instead of block.

## 3. Is there a fundamentally better approach?

**No.**

- **Generative GLB.** In the oscar comparison the Hunyuan mesh has the better head and volume, and Nathan called it better than build B on 11-22. Against it:
  - It reads more photographic (R144).
  - His own faults with it were messy fin tips and fin outlines on the flank.
  - 42 fish were estimated at 10-20 MB.
  - The generator needs a paid quota or a bigger GPU.
  - Build B has since gained fin opacity, fin beat, see-through bodies and the head-width fix; the GLB route has none of these.
- **One point for GLB:** 100 build-B oscars cost 953 draw calls against 253 (history, run 3). That matters more once schools get bigger.
- **Cheap experiment that would change my mind.** The oscar GLB already exists on `claude/glbfish-e5`, and run 3 found 3k triangles looks the same at 300 px. Put it beside today's `oscarb` in a blind A/B at tank distance and record its file size. If Nathan still picks it and it fits in about 400 KB (today's largest live fish is 378 KB), GLB earns the tier 1 large fish only.

## 4. First thing to measure

Nathan's review rounds and minutes per fish, and the first-pass approval rate, on the 21 built b8 fish. Nothing else in this answer can be judged without that baseline.

## 5. Leave alone

The single renderer path with no per-species code, the spec-and-rebuild rule, one sheet per species (E1: body measurements repeat within 2-3 %), and the current depth rule (own numbers to the median, proxies keep the drawn depth).

## Summary

1. Keep build B as the standard art, since a fish now costs about 2 machine minutes, but finish b8 and pause new batches: move lane time to behavior, and land lazy art loading before growing toward 250-300 fish.
2. Turn the printed checks into a blocking gate, test the fin map as the body source on the 81 stored sheets, measure proxy depth from photos, and review small fish by contact sheet.
3. No to a new method; the first measurement is Nathan's rounds and minutes on b8, and the one experiment is the existing oscar GLB against today's `oscarb` at tank distance.
