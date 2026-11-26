# Lane FG1: fish build gate: printed checks become a gate, and the sheets get a backup

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-fg1 -b fg1-fish-gate origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's fish-pipeline answer (`research/fable/5-fish-pipeline-answer.md`, section 2 changes 1 to 5 and "What is recorded about effort") and strategy tier 2 item 22 and tier 1 item 14 (backup). Read first: that answer, `research/fish-sheets/PIPELINE.md`, `research/fish-model-sheet-method.md` (rows 36 to 65 and the change log), `HANDOFF-batch-b7.md` and `-b8.md`, then `scripts/fish-batch.py`, `fish-new.py`, `fish-build.py` (checks and exits only).
Nathan decided (2026-11-26): fish batches do NOT pause. Fable wanted a pause until the gate and lazy art existed; lazy art has landed (FD unit 1), and this gate is built beside running batches. So nothing here may stop or slow a batch that is in progress: the gate starts in REPORT mode (flags printed and written to `build.json`, nothing blocked) and switches to BLOCK mode only on a yes from the coordinator after the backtest below.
Usage: three work units. Report the token cost after unit 1 and wait for a yes before unit 2.

## Goal
Checks that today only print become checks that decide, so a mis-built fish never reaches Nathan's review. Evidence (81 builds, b5 to b8): 25 printed a mass `CHECK` (outside 0.8 to 1.45 of the expected mass) and went on; 41 printed `PHOTO CHECK NEEDED` (fin class); 50 needed a second depth pass; `fish-batch.py` records `ok` from the exit code alone. Three b7 fish went live with mass out of range. Target: a gate result (pass / flag list) in every `build.json`, and zero fish with a mass, fin-class or tail-root flag reaching review in block mode.

## Before you build: could the diagnosis be wrong?
Fable counted from `build.json` and `build.log` files in `C:/Users/nreed/fish-sheets/*-b5..b8-gen/`. Recount with a script: how many of the 81 would a candidate gate flag, and how many of the flagged fish did Nathan later correct or reject (git log on that fish's spec and anatomy files; `research/fish-sheets/log.csv`; the b6 / b7 / b8 handoffs)? If the gate would flag more than about 30 percent of builds, or flags fish Nathan approved without change more often than fish he corrected, the thresholds are wrong: tune them before anything else and report the numbers.

## Unit 0 (first hour, do not wait for anything): back up the sheets
`C:/Users/nreed/fish-sheets` holds the 81 stored sheets, the only source data of the pipeline, outside the repo. Make a dated zip and copy it to a second location. Ask the coordinator which location Nathan wants (an external drive, OneDrive, or a private repo); until he answers, keep the zip in a second folder on the same machine and say so plainly. Never publish the sheets. Add a one-line weekly backup command to `research/fish-sheets/PIPELINE.md`.

## Unit 1: the gate, in report mode
1. New `scripts/fish-gate.py`, called by `fish-batch.py` after the build step. It reads the existing numbers and adds the checks that exist only as prose: `tlOverSl` under 1.15 on forked tails; mid-body vs head width (method row 65); pale tail-root band present; eye radius; pectoral spread; `visual_check` and `fin_opacity_source` present; mass within 0.8 to 1.45 (the existing check); fin class confirmed (see unit 3).
2. Write `gate: {pass, flags: [...]}` into `build.json`. `ok` in `fish-batch.py` becomes `ok and gate.pass` only in block mode.
3. Print one table per batch: species, flags. A flagged fish is listed under "needs a fix" at the end of the run; the rest of the batch proceeds as before.
4. A test (`test/fishGate.test.*` or a script under `scripts/`) that runs the gate on five stored builds: two known-good, three that Nathan later corrected.

## Unit 2: fin map as the body source, as a test only
Fable's change 2: rebuild the 81 stored sheets both ways (today's body source and `--body-from-map`) in a scratch folder, compare gate results and mass. No new sheets, no Nathan time, no change to any live fish and no write to `src/data/fishart` or `public/art/fish`. Caveat from the method doc: the fin map built the guppy in strips, and a switch by depth ratio was tried and dropped (row 43). Report which species improve, which get worse, and whether a default switch is justified. The switch itself is a decision for the coordinator, not this lane.

## Unit 3: proxy depth from the photo, fin class from a family table
- Proxy depth (change 3): 35 of 81 fish use another species' numbers. `fish-new.py` step 2 already fetches a true side photo and `fish-side-depth.py` exists: wire it so a proxy species gets its depth measured from that photo, written as a flag when photo and proxy disagree by more than 15 percent. Check against the three fish Nathan flagged (tailspot, harlequin, clown pleco).
- Fin class (change 5): seed `research/fish-sheets/fin-class-by-family.json` from the 26 photo-checked fish plus the four calibration fish (method row 61 item 14); the default for a species in a listed family comes from the table, and any other fish gets `PHOTO CHECK NEEDED` as now. Today's default is `solid`, but the photo check of 26 fish found only 3 solid. A human confirms exceptions.

## Done when
- Unit 0: backup exists and its location is reported.
- The recount and backtest table (81 builds: flagged, corrected later, approved unchanged) is in the report with the chosen thresholds.
- One fresh batch run (any 3 stored sheets, scratch output) shows the gate table and `gate` in `build.json`, in report mode.
- Tests pass; `npm run build` passes. Live fish are unchanged: diff `public/art/fish` and `src/data/fishart` against origin/main shows no change.
- Needs Nathan: no, except the choice of backup location (one line) and, later, whether to switch to block mode (coordinator asks).

## Must not touch
`src/art/photofish.ts` and `src/art/liveFish.ts` (the loader; FD); `src/data/fishLive.json` and any live fish file; the swim files (BR); the verdict files (HV). Coordinate with any lane running a fish batch (b8 follow-ups, `prompts/lane-X*`, `lane-FM*`, `lane-S2*`): they own `fish-batch.py` runs and the per-batch work folders; you own `fish-gate.py`. Edits to `fish-batch.py` and `fish-build.py` are small, additive and rebased onto their latest.

## Rules
- US units (gallons, inches, deg F, US $); US spelling.
- `npm run build` (includes tsc and the size budget) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Fix a fish through its spec and a rebuild, never by hand-editing generated files (house rule).
- Verify on screen or a saved screenshot where a picture is involved; say merged vs live separately.
- Any question for Nathan about a fish comes with cropped, labelled pictures, in the same message.
- Subagents run on Sonnet (Haiku for a grep). Before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote it to the coordinator.
- Add a dated FG1 section to HANDOFF.md, record each correction in `research/fish-model-sheet-method.md` and set your row in `research/requests.md` (R173).
