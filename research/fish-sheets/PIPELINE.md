# Build-B fish: the whole process, species pick to live (PIPELINE.md)

One runbook, start to finish. Entry point for every fish chat. Written 2026-11-25 from the b5/b6/b7 handoffs and the method log.
- **Method log (the why, every row cited below):** `research/fish-model-sheet-method.md`.
- **Batch handoffs** (`HANDOFF-batch-bN.md`) hold only the fish list and batch-specific notes. The steps are here.
- Commands run from the repo root (a worktree cut from origin/main if the shared folder is stale; check with
  `git rev-list --left-right --count HEAD...origin/main` first and make sure `src/data/fishLive.json` exists).
- A step that is **pending** is marked so; do not invent a substitute, record the fish as "step pending" in the batch handoff.

## 0. Rules that apply to every step
- "The model" means build B. Fix a model through its spec and a rebuild, never by hand-editing generated files
  (`public/art/fish/*`, `src/data/fishart/*.anatomy.json`).
- **One sheet queue only** (b5: six copies swapped the clipboard and filed the black skirt and cory as the betta). The queue has a lock.
  Stop a stuck one: `Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -like '*sheet-queue*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
- Before saying a sheet did or did not arrive, read `<folder>/sheet.json` (download name) and the browser history, not just Downloads.
- Don't use the Browser pane while a build runs (the dev server hung); headless shots are the check.
- Run builds in the background and end the turn; no polling.
- Every fish drawn from real photos with a written look (CLAUDE.md memory: fish art from reference photos). Not cartoony, not photographic.
- Every number in chat in US units where it is a user-facing size.

## 1. Pick the species
- Nathan approves the list (b7: "Approve all 20", 2026-11-25). Popular roster fish with no sheet, prompt or `fishLive.json` entry.
- Check: id exists in `src/data/species.json`; not already in `src/data/fishLive.json`, `research/fish-sheets/prompts/`, `research/fish-specs/`.
- Gate: id, TL (mm), whether FishShapes has the species ("own") or a proxy relative.
- Why / rows: method doc stage table; b7 handoff "The 20".

## 2. Reference photos
- 1-3 real photos: a true side view; a top view if one exists. Wikimedia Commons first. Written look (colour, pattern, fin shape) goes
  into the species block. Keep the file names: steps 9 and 10 reuse the same photos.
- Gate: you can say in words what colours, bars and fins the real fish has.

## 3. FishShapes numbers (depth, width, head, peduncle)
- Own species: `python -I scripts/fishshapes.py "<Genus species>" --out C:/Users/nreed/fish-sheets/<id>-<batch>-gen/fishshapes.json`.
- Proxy (closest relative): hand-write the JSON with `proxy_for` and `note` (see `tailspot-gen/fishshapes.json`; method row 49).
  Where the proxy is known to be too shallow (harlequin, clown/yoyo loach, peacock, comet), compare with a real photo at review.
- Not in FishShapes and no proxy: depth from FishBase ratios (bichir precedent, method row for bichir).
- Gate: DEPTH_PCT and EXTRA_RATIOS come from this file.
- Known break: `fishshapes.py` crashes on Chromis viridis (missing values): use the proxy.

## 4. Fill the prompt
- `species.txt` in `<id>-<batch>-gen/` (copy `neon-b5-gen/species.txt` layout; field rules at the bottom of
  `research/fish-sheets/prompts/B-5row-template.md`). Then
  `python -I scripts/fish-prompt-fill.py <dir>/species.txt <dir>/prompt.txt` and copy it to `research/fish-sheets/prompts/<id>b-<batch>-5row.md`.
- Rules: no size adjectives (numbers or shapes). **MARKS_SHORT = body markings only, never a fin** (b5 guppy: "spotted delta tail" kept
  the tail in row 2; the filler stops on it). No fin named in the row 2 keep list.
- **Review fixes from Nathan's b6 review, in every prompt's `BODY_BULLETS`:**
  1. Blunt, gently rounded snout, never a pointed cone or beak.
  2. From the front the closed mouth is a fine lip line on a solid head; nostrils are faint marks, never dark holes.
  3. Dorsal wording: a one-piece fin with a notch says "One continuous fin ... a spiny front part, a notch, then a soft rear part";
     separate dorsals say so; an adipose fin is mapped to the dorsal's red in row 5 (*reading of "split dorsal", unconfirmed with Nathan*).
- Special: no pelvic fins (peapuffer): remove the pelvic lines from rows 4-5 by hand.
- Gate: the filler runs without error; warnings about "long" / "thin" are only warnings. Commit the prompts.

## 5. Sheets (Nathan)
- `python scripts/sheet-queue.py --all` from the shared folder, one copy only. Per fish he clears the box, pastes, Enter, downloads.
  Files `sheet.webp` + `sheet.json`. Redo one: `python scripts/sheet-queue.py <folder> --redo`.
- **Guard against a mis-filed sheet (b7, 2026-11-25):** the queue files the FIRST new image in Downloads, whichever ChatGPT chat made it.
  At 12:02 a "Gourami Anatomy Reference Sheet.png" (made 12:02:31, another chat's download) was filed as the harlequin; the real harlequin arrived
  at 12:07 and went to the next folder (kribensis): an off-by-one cascade, found only at review. Rules: (1) nothing else downloads from ChatGPT or into Downloads
  while a queue runs (R147 colour-form sheets included: one queue, one download stream); (2) `sheet-queue.py` now compares the download's title with the folder's
  id / common name / genus / species words and, on no match, warns and asks `[y/N]` (it leaves the file in Downloads on N; a harmless false alarm for
  titles like "Orthographic Damselfish ..."); (3) at review the first check is `sheet.json` "download" against the fish, and the sheet beside the model.
  Fix after the fact: move the sheet (and `sheet.json`, `sheet-download.*`) to the right folder, delete the wrong fish's build files, rebuild with `--rebuild`.
- Gate: sheet.webp exists in `<id>-<batch>-gen/` and its download title matches the fish. Do not run the queue yourself unless Nathan asks.

## 6. Audit + build (`fish-new.py`, driven by `fish-batch.py`)
- Background: `python -I scripts/fish-batch.py --batch <bN> --idle 45 [--only id1,id2] [--rebuild id]`, then end the turn.
  It runs per sheet: `fish-new.py` (FishShapes, audit via `fish-sheet-audit5.py`, depth stretch judged on the built body, fin cut,
  spec, build with mass check, autosat), headless side+top shots (`fish-autoshot.mjs`), `build.json`, and `shots/<bN>-grid.jpg`.
- Gate: `build.json` ok, audit PASS (panel lengths, gaps, width/depth vs FishShapes), mass within range (step 8).
- Failure map (b5 "Known fixes"):
  - **Row 2 kept a fin** (`KeyError: 'caudal'` in fish-spec-from-fins; livebearers): the real fix is a new sheet (`--redo`).
    `--body-from-map` builds but makes a body in strips. Endler (b7): redo the sheet if row 2 keeps a tail.
  - **Failed shot** (`Inspected target navigated or closed`): flaky, rerun `node scripts/fish-autoshot.mjs <id>:<tl> --views side,top --tag <bN>`.
  - Headless shots take OS free ports (two runs once measured the betta as the angel).
- Rows: 44 (fish-new), 56 (depth), 58 (colour), 61 (batch).

## 7. Registration checks (panel, eye, mouth, tail, snout)
Read the side/3-4/front/top renders beside the sheet. Fix through the spec, then
`python -I scripts/fish-build.py research/fish-specs/<id>.json` and `python -I scripts/fish-autosat.py <id> --apply --passes 3`.
- **Tail base in the fork** (cherry barb): forked-tail fish with `tlOverSl` under ~1.15, or a body swallowing the tail's front: the fin
  cut put `landmarks.ped` in the fork. Mark the real tail base on `<id>-build/side_full.png`, set `landmarks.ped` to [x, y]. Forked tails: tigerbarb,
  harlequin, balashark, comet, chromis, clownloach.
- **Cory recipe** (bristlenose; loaches if the snout reads wedge-shaped; rows 52-53): spec `plan: "pepperedcory"`,
  `outline: "--level --thr 8 --open 9 --snout-open 15"`, `plan_extra: {"barbels": 0.045, "barbelR": 0.006}`.
- **Front layer vs eye/mouth** (three-spot, row of 2026-11-25): where the front panel draws the mouth far below the eyes versus the side
  view, set the front layer on the mouth (spec `fy0`), not on the eyes. Check eye-to-mouth delta side vs front (log.csv `eye_mouth_delta`).
- **No nose hole from the front**; **no split-dorsal misread** (step 4 fixes): look at the front render.
- **Clear body** (glass catfish): the mask threshold (`--thr 8`) may lose the body.
- Gate: eyes/mouth/tail base land where the sheet shows; one eye, no stray fin leaves, no floating pelvic (method rows 5, 6, 18, 21, 29).

## 8. Mass and proportion check
- `fish-new` prints model g vs every FishBase/specimen value; `scripts/fish-mass.py <anatomy.json> <tl_mm> <a> <b>` recomputes. thickx is set so the mass matches.
- Proxy fish: compare built depth with a real photo (fish-new stretches the drawn depth to the median; a shallow proxy gives a thin fish).
- Colour: autosat fixes saturation, not hue. If the render's hue is off (platy red vs sheet orange), set `sat` by hand (drop `sat_auto`) and rebuild (row 54, 58).
- Gate: ratio about 1.0; depth within the real photo's range.

## 9. Fin opacity class (every fish)
- `python -I scripts/fish-fin-class.py <id> --urls` lists Commons searches; look at 2-4 real photos with a background behind the fish.
  Then `python -I scripts/fish-fin-class.py <id> <clear|translucent|pigmented|solid> [--fin pectoral=clear ...] --source "<date; photos; what showed>" [--maps]`.
- Writes `fin_opacity` + `fin_opacity_source` in the spec; `--maps` rebuilds opacity maps (the fish must be built). Unchecked fish default to solid
  (`fish-new` flags them). Solid class keeps pectorals solid (bichir ghost pectoral, 9cbe4cf3).
- Gate: `fin_opacity_source` present. b7 expectations: Endler and killifish fins translucent; glass catfish fins clear.
- Row 61 (11).

## 10. Body translucency  — **PENDING: chat "Translucent fish bodies with gradients" (branch `claude/translucent-bodies`, tip af7c30cd, parked)**
Built, not on main: Nathan parked it until models are clear enough to judge; merging is his call. Until merged a `body_clear` spec field does nothing.
When it lands:
- `python -I scripts/fish-body-class.py <id> --urls` (same photos as step 9), then
  `... <id> --zone <zone>=<clear|translucent|faint|solid> [--zone ...] [--inner spine,sac,bladder] --source "<date; photos; what showed>"`
  or `... <id> --solid --source "..."` when checked and nothing is see-through. Writes spec `body_clear` + `body_clear_source`; `fish-build.py` copies it
  to `render.photo.bodyClear`.
- Zones (anatomical, no coordinates): head, back, trunk, belly, lowerrear, stalk. Clarity: clear 0.75, translucent 0.5, faint 0.25, solid 0. The body eases back
  to solid ahead of the fin roots; red/silver skin is pigment, not see-through. Judge from most photos (side light flatters).
- Photo check decides per zone: background plainly through = clear, tinted = translucent, a hint = faint, no = solid; then which organs show.
- Glass catfish suggestion (unchecked): trunk, belly, lowerrear clear; head translucent; inner spine, sac, bladder.
- Gate: `body_clear_source` present (or "solid" recorded); a translucency shot in step 12.
- Until it lands: build b7 without it and list the fish as "body translucency pending" in the batch handoff.

## 11. Fin beat / flap check  — **method merged (884d1a31, chat "the fishes pectoral fins need some"); no new spec fields**
Motion is renderer-wide (`FLEX_VERT`, `SWIM_VERT` in fish3d.ts / swim.ts). Per fish you only check the inputs it reads:
- Pectoral: `render.photo.pec.poly`, `pec.root` (drawn at the measured size, no enlargement), `pec.spread` (rest angle; hover adds +0.3 rad,
  swimming -0.08 rad), `pec.flat` for clingers (bristlenose, loaches that rest on fins): no beat.
- Dorsal/anal: `aFinH` comes from the plan's depth profile. If the profile sits too low the back ripples; too high and the fin bases stay stiff.
- Caudal beats while swimming; dorsal/anal ripple only when hovering; pectorals tuck when swimming, flare and scull when hovering.
- Check: a swim GIF per fish (swimming and hovering). A fin that looks stiff despite a right spread/profile is a renderer question: send the GIF to the
  fin chat, don't patch `photofish.ts` per fish. Nathan's tuning "beat too much and too quickly" is already applied (about 1.2 Hz, 0.20 rad).
- Gate: pec spread within 0.2-0.35 unless the fish rests on its fins; profile hugging the body; no ripple on the back.

## 12. Review pictures for Nathan (one message, grouped)
Per fish: side-by-side (model vs sheet or real photo), the swim/fin-beat GIF (step 11), and the body-translucency shot (step 10, once it exists; glass catfish
first). Send with SendUserFile, ask approve / fix per fish. Images of a question always come with the question.
- Gate: Nathan's verdict per fish: approve, fix (list), or hold (reason).
- Corrections become new method-doc rows in the same commit as the fix (the ratchet).

## 13. Commit the built models (not live)
- Specs, art (`public/art/fish/<id>{,-fin,-front,-top}.webp`), anatomy (`src/data/fishart/<id>.anatomy.json`) by path. In the shared folder: `scripts/ship.sh -m "..." <files>`;
  in a worktree: commit on the branch and send the sha to the coordinator.
- `species.json`: take HEAD's version, insert only your lines before `  {"id": "oscar",`, `git hash-object -w`, `git update-index --cacheinfo 100644,<hash>,src/data/species.json`,
  then `git commit` (no pathspec). Strip `\r` from any file list fed to `xargs git add`.
- After any squash/rebase: `git diff --name-status` vs origin/main; any D outside your files = stale base.

## 14. Go live (after approval only)
- Add `<id>: {look: "<id>b" (or c), approved: "<date>"}` to `src/data/fishLive.json`. Check `species.ts` `goLive`; albino and female forms keep old art.
- `npm run build` (includes tsc), then the fish tests (`test/fishLive.test.ts`, plus the ones for what you touched). No full local vitest.
- Ship (step 13). "Merged" and "live" are different: say which.

## 15. Log
- `python -I scripts/fish-sheet-log.py <sheet> --species <id> --date <date> --generator ChatGPT --prompt B --photos "..." --verdict <good|fixable|bad|not built> --notes "..."`
  appends a row to `research/fish-sheets/log.csv` (audit numbers only from the script).
- Update the batch handoff state table (fish, built, verdict, sha, live) and `research/requests.md` (R146). New corrections: method doc rows.

## Open items from b5 (not a batch's job unless Nathan asks)
platy too red; gourami feelers missing; neon rainbow dorsal spike; danio barbels; angel dark patch at the dorsal base.
