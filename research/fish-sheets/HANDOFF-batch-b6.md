# Handoff: build-B batch b6 (the next 20 fish), written 2026-11-24

## Start here
- Work in the worktree `C:\Users\nreed\Glass Box\.claude\worktrees\glbfish-e5` (branch `claude/glbfish-e5`). Every script below lives
  there; none of it is on main yet. Commit on this branch; never push or merge without Nathan's yes.
- Batch b5 (20 fish) is done and committed: 574d5084 (19 fish), 2581992b (guppy). Use it as the worked example: work folders
  `C:/Users/nreed/fish-sheets/<base>-b5-gen/`, prompts `research/fish-sheets/prompts/<base>b-b5-5row.md`.
- Method record: `research/fish-model-sheet-method.md` (rows 44-61). Grep it by row; never read it whole.
- Another chat may have uncommitted edits in this worktree (oscar files, `src/data/species.json` lines `e5clownfishb`, `e5plecob`).
  Never commit those. Commit `species.json` with only your own lines (recipe under "Commit" below).

## The pipeline, per batch (what b5 did)
1. **Prompts (you):** for each species make `C:/Users/nreed/fish-sheets/<base>-b6-gen/`:
   - `fishshapes.json` from `python -I scripts/fishshapes.py "<Genus species>" --out <dir>/fishshapes.json`; for a proxy species
     see the table below (hand-written, with `proxy_for` and `note`, like `tailspot-gen/fishshapes.json`; method row 49);
   - `species.txt`: the template fields (copy `neon-b5-gen/species.txt` for the layout; field rules at the bottom of
     `research/fish-sheets/prompts/B-5row-template.md`). DEPTH_PCT and EXTRA_RATIOS come from fishshapes.json.
     No size adjectives (give numbers or shapes). **MARKS_SHORT = body markings only, never a fin**: the generator now stops if it
     names one (b5 guppy: "the spotted delta tail" there made ChatGPT keep the tail in row 2);
   - `prompt.txt` from `python -I scripts/fish-prompt-fill.py <dir>/species.txt <dir>/prompt.txt`; copy it to
     `research/fish-sheets/prompts/<base>b-b6-5row.md`. Commit the 20 prompts.
2. **Sheets (Nathan):** one queue, from the shared folder:
   `python ".claude/worktrees/glbfish-e5/scripts/sheet-queue.py" --all`
   (or start it for him in a Terminal tab with run_in_terminal). It copies each prompt, opens a new ChatGPT chat, and files the next
   image download as that fish (`sheet.webp`, `sheet.json` with the download name). Per fish he does: clear the box (ChatGPT restores
   unsent drafts: Ctrl+A, Delete), Ctrl+V, Enter, download.
3. **Builds (you, background):** `python -I scripts/fish-batch.py --batch b6 --idle 45` with run_in_background, then END the turn.
   It builds each sheet as it lands (fish-new.py: audit, depth stretch to the FishShapes median, fin cut, spec, build, mass check,
   auto-saturation), takes headless side + top shots, and at the end writes `shots/b6-grid.jpg` (sheet row 1 vs built side) and a
   summary. You are notified once, when it exits.
4. **Review:** read the grid, fix what's wrong (list below), send Nathan the grid. Commit.

## The 20 for b6
Species ids are the app's own (`src/data/species.json`); the model id is `<id>b`, the folder `<id>-b6-gen`.

| id | species | TL mm | FishShapes | watch |
|---|---|---|---|---|
| bolivianram | Mikrogeophagus altispinosus | 89 | own, n 3 | |
| dwarfrasbora | Boraras maculatus | 30 | own, n 3 | forked tail: check the tail base |
| hatchet | Carnegiella strigata | 40 | own, n 3 | very deep keel; pectoral wings |
| saltpepper | Corydoras habrosus | 42 | own, n 3 | cory recipe |
| falsejulii | Corydoras trilineatus | 66 | own, n 3 | cory recipe |
| pygmycory | Corydoras pygmaeus | 25 | own, n 3 | cory recipe |
| sterbai | Corydoras sterbai | 65 | own, n 1 | cory recipe; n 1, judge the depth |
| croakinggourami | Trichopsis vittata | 80 | own, n 3 | pelvic feelers |
| sparklinggourami | Trichopsis pumila | 48 | own, n 2 | pelvic feelers |
| sae | Crossocheilus oblongus | 150 | own, n 3 | forked tail |
| redtailshark | Epalzeorhynchos bicolor | 150 | own, n 1 | forked tail; n 1 |
| auratus | Melanochromis auratus | 110 | own, n 3 | |
| labeo | Labeotropheus trewavasae | 120 | own, n 2 | blunt overhanging snout |
| peacockgudgeon | Tateurndina ocellicauda | 90 | own, n 3 | |
| ember | Hyphessobrycon amandae | 23 | proxy: H. eques or H. anisitsi | forked tail |
| rummynose | Hemigrammus rhodostomus | 50 | proxy: H. rodwayi (H. erythrozonus = glowlight, built) | forked tail |
| cpd | Danio margaritatus | 25 | proxy: D. albolineatus or D. rerio | |
| pandacory | Corydoras panda | 46 | proxy: C. aeneus (bronze cory, built) | cory recipe |
| molly | Poecilia sphenops | 85 | proxy: P. butleri | livebearer: row 2 must drop the tail (guppy lesson) |
| boesemani | Melanotaenia boesemani | 108 | proxy: M. affinis or M. australis | deep-bodied; neon rainbow dorsal spike issue |

Pick each proxy by the closest body shape (FishBase depth / photos), say why in `note`, and keep the drawn depth inside the
proxy's range (fish-new does this when `proxy_for` is set). Still without any FishShapes genus match, for a later batch:
harlequin rasbora, tiger barb, clown loach, Banggai cardinal. Marine fish with their own numbers, for a marine batch: coral beauty,
firefish, foxface, kole tang, lawnmower blenny, mandarin, pajama cardinal, yellow watchman goby.

## Known fixes (all from b5)
- **Cory recipe** (rows 52-53): spec `plan: "pepperedcory"`, `outline: "--level --thr 8 --open 9 --snout-open 15"`,
  `plan_extra: {"barbels": 0.045, "barbelR": 0.006}`, then `python -I scripts/fish-build.py research/fish-specs/<id>.json` and
  `python -I scripts/fish-autosat.py <id> --apply --passes 3`.
- **Tail base in the fork** (cherry barb): if a forked-tail fish builds with TL/SL under ~1.15 (anatomy `tlOverSl`) or its 3D body
  swallows the front of the tail fin, the fin cut put `landmarks.ped` in the fork. Mark it on `<id>-build/side_full.png` and set
  `landmarks.ped` to [x, y] at the real tail base, then fish-build + autosat.
- **Row 2 kept a fin** (guppy): fish-fin-cut finds no caudal (`KeyError: 'caudal'` in fish-spec-from-fins). `--body-from-map` builds
  but makes a body in strips. The real fix is a new sheet:
  `python ".claude/worktrees/glbfish-e5/scripts/sheet-queue.py" C:/Users/nreed/fish-sheets/<id>-b6-gen --redo`, then
  `python -I scripts/fish-batch.py --batch b6 --only <id> --rebuild <id>` in the background.
- **Colour hue shift** (platy rendered red, sheet orange): autosat sets one global factor; it can't fix hue (row 54). Set `sat` by hand
  (drop `sat_auto`) and rebuild.
- **Thin fins** (angel filament, gourami feelers): the paired-fin feather now follows the fin's own width (commit 6a7bd3aa). Gourami
  feelers still went missing in b5: open item.
- A failed shot (`Inspected target navigated or closed`) is flaky: rerun `node scripts/fish-autoshot.mjs <id>:<tl> --views side,top --tag b6`.

## Never again (b5 incidents)
- **One sheet queue only.** Six copies once ran together, swapped the clipboard and filed the black skirt and cory as the betta.
  sheet-queue now refuses a second copy (lock file). To stop a stuck one in PowerShell:
  `Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -like '*sheet-queue*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`
- **Before saying a sheet did or didn't arrive, read `sheet.json` (download name) and the browser's history**, not just Downloads.
  The queue moves the file out of Downloads at once.
- Headless shots take free ports from the OS now. Two runs once drew the same random port, and the betta was measured as the angel.
- Don't use the Browser pane while the builder runs: the dev server hung. Headless shots are the check.

## Open from b5 (not this batch's job unless Nathan asks)
platy too red; gourami feelers missing; neon rainbow dorsal spike; danio barbels; angel dark patch at the dorsal base (left over from
erasing the painted pectoral on the card). Fin transparency is on branch `claude/fin-transparency` (697b9f2e, ready, not merged).
Merging `claude/glbfish-e5` to main waits on Nathan.

## Commit
Commit specs, art (`public/art/fish/<id>{,-fin,-front,-top}.webp`), anatomy (`src/data/fishart/<id>.anatomy.json`) by path. For
`species.json`, take HEAD's version, insert only your lines before `  {"id": "oscar",`, `git hash-object -w` it and
`git update-index --cacheinfo 100644,<hash>,src/data/species.json`, then `git commit` (no pathspec). Strip `\r` from any file list
you feed to `xargs git add`.
