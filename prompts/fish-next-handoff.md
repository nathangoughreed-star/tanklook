# Fish models: handoff to the next chat (2026-11-23, third edition)

**Your job:** build **new species** with the scripted build-B pipeline, and fix pipeline problems only when the fix helps every
species (and then put the fix in a script, not just a note: method row 44). Nathan picks the species and generates each sheet in
ChatGPT.

## First task: build the batch of three
The prompts are written and Nathan generates the sheets. Each sheet goes to its work folder as `sheet.webp`. If Nathan pastes an
image instead, save it there yourself (the pasted image's path is in the message). Then, per fish:

| fish | work folder | build command (from the worktree) | watch for |
|---|---|---|---|
| Royal gramma | `C:/Users/nreed/fish-sheets/gramma-gen` | `python -I scripts/fish-new.py C:/Users/nreed/fish-sheets/gramma-gen royalgrammab "Royal gramma" "Gramma loreto" 80` | violet/yellow split at a slant, long pelvics (may be clipped or merge with the anal) |
| Dwarf gourami | `C:/Users/nreed/fish-sheets/gourami-gen` | `python -I scripts/fish-new.py C:/Users/nreed/fish-sheets/gourami-gen dwarfgouramib "Dwarf gourami" "Trichogaster lalius" 80` | thread pelvics (a thin fin: the 300 px fin minimum in `fish-fin-cut.py` may drop it), dorsal/anal touching the caudal (row 49 split) |
| Peppered cory | `C:/Users/nreed/fish-sheets/cory-gen` | `python -I scripts/fish-new.py C:/Users/nreed/fish-sheets/cory-gen pepperedcoryb "Peppered corydoras" "Corydoras paleatus" 70` | first bottom-dweller: flat belly and a flat-bottomed front view (the build may round the belly), adipose = `dorsal2` (row 46), barbels as thin fins or lost |

- Each folder already holds `species.txt`, `prompt.txt` and `fishshapes.json` (the fish's own FishShapes numbers, n 3). Prompts:
  `research/fish-sheets/prompts/{gramma,gourami,cory}-5row.md`.
- Before building, look at the sheet. If row 2 kept the fins, or a fin role is missing, add `--body-from-map` (rows 36, 42).
- After each build: take pictures (pipeline step 5), compare with the sheet's row 1 and send them. Measure colour (row 48): a
  mid-body saturation ratio well above 1 means set `sat` = 1 / ratio in the spec, then rebuild (`fish-new.py` keeps it).
- Log each sheet in the method doc's "Prompts used" table, add a checklist row for each correction, add the fish to the table
  below, and commit.
- The species.json ids already exist for the old builds (`royalgramma`, `dwarfgourami`, `pepperedcory`): the new ids end in `b`.

## Start here (read these, nothing else first)
1. This file.
2. `research/fish-model-sheet-method.md`: section 4 checklist **rows 42-49** (the latest lessons; rows 33-41 for the session
   before), and the "Prompts used" table in section 2. Grep the rest when needed.
3. `research/fish-sheets/prompts/B-5row-template.md` only when writing a new prompt.

## Where the work is
- **Branch `claude/glbfish-e5`, worktree `.claude/worktrees/glbfish-e5`**, 60 commits ahead of origin/main. **Nothing is on main.**
  Work in the worktree. Merge only with Nathan's yes (it needs a loader keyed by species art, not the `?photoart` dogfood flag).
  This file exists only on that branch.
- Leave alone, not yours: uncommitted `public/art/fish/oscar*.webp`, `src/data/fishart/oscar.anatomy.json` and the e5 lines in
  `src/data/species.json` (E5 chat). Commit species.json rows hunk-only (see "Committing" below).
- Sheets and work folders stay out of the repo: `C:/Users/nreed/fish-sheets/<slug>-gen/`. FishShapes CSV cache:
  `C:/Users/nreed/fish-sheets/_cache/`.
- Dev server: `glbfish` in the shared `.claude/launch.json` (lands on 5201 when 5197 is busy). Stop it when done.
  Quirk: the first navigate after a server start drops `?photoart` (lands on `/`). Navigate to `/?photoart` again and check
  `location.search` before shooting, or build-B fish throw "reading 'outline'".

## Waiting on Nathan (ask only if relevant)
- Ram (`gbrb`): render saturation is 1.27x the sheet. Set `sat` 0.78 like the tailspot? He has not decided.
- Cardinal (`cardinalc`): the row 49 range rule would stretch its sheet only to 27.2 % SL deep (range 27.2-31.8), not the
  29.4 it has now. Not rebuilt.

## Fish built this session (all build B, `?photoart`)
| id | sheet | notes |
|---|---|---|
| `yellowtangb` | `yellowtang-gen` | width 16.6% SL from FishShapes (`thickx` 0.76) |
| `discusc` | `discus-map-gen` | row 2 kept the same-colour fins: body from row 5 (`fish-fin-cut.py --body-from-map`) |
| `cardinalb` | `cardinal-gen/sheet.webp` | first non-disc fish; sheet depth 25% SL (real 29.4) |
| `cardinalc` | `cardinal-v2s-gen` | v2 sheet stretched to FishShapes depth (`fish-sheet-stretch.py`, k 1.162), pectoral spread 0.35. **Preferred cardinal** |
| `bluetangd` | (earlier chat) | rebuilt only for the new eyes |
| `tailspotb` | `tailspot-gen` | tailspot blenny, E. bicolor proportions as proxy (`proxy_for` in fishshapes.json: drawn depth / width kept inside its range, row 49), `sat` 0.78 |
| `gbrb` | `ram-gen` | German blue ram, `--body-from-map`, `thickx` 0.56; mass 1.2-1.36x FishShapes |
| `royalgrammab` | `gramma-gen` | mass 1.16-1.35x, sat 1.05 (none set) |
| `dwarfgouramib` | `gourami-gen` | mass 1.07-1.20x, sat 1.14 (none set); thread pelvic short from the side |
| `pepperedcoryb` | `cory-gen` (stretched k 1.173) | `--body-from-map` (row 50), `sat` 0.73, plan `pepperedcory` (row 52), `plan_extra` barbels + `--snout-open 15` (row 53); mass 1.08-1.50x (one specimen looks wrong) |
| `royalgrammac` | `gramma2-gen` | second gramma sheet (eyespot marked white in row 5: row 51); mass 1.09-1.27x |
| `oscarb` | `oscar5-gen` (stretched k 1.093) | tiger oscar, `--body-from-map`, `sat` 0.75 (row 54: orange still slightly redder, body greyer); snout outline matches the sheet (the blunt look is painted lip detail); mass 0.97-1.34x. Not `oscar-gen` (an older experiment's folder) |
| `bichirb` | `bichir-gen` | Senegal bichir, not in FishShapes (FishBase ratios + estimates in `fishshapes.json`); finlet mode (row 55), `--body-from-map`, `--snout-open 9`, `sat` 0.67; mass 1.8x the length-weight estimate (sheet drew it at the deep end) |

## The pipeline now (per species; scripted 2026-11-23, method row 44)
1. **Numbers:** `python -I scripts/fishshapes.py "<Genus species>"` prints every FishShapes v1 specimen (depth, head, peduncle, width
   % SL, SL, weight), the medians and the prompt values. The CSV is cached in `C:/Users/nreed/fish-sheets/_cache/` (downloaded once).
   Drop a juvenile by hand if the medians look off. Not in FishShapes: FishBase / Seriously Fish morphometrics, written into
   `<work>/fishshapes.json` by hand (same keys).
2. **Prompt:** fill the template's species block, save it as `<work>/species.txt`, then
   `python -I scripts/fish-prompt-fill.py <work>/species.txt <work>/prompt.txt`. It **warns on size words** (row 37 / template rule):
   rewrite each one as a number or a shape unless it is a position ("eye high on the head"). Save the prompt as
   `research/fish-sheets/prompts/<slug>-5row.md`.
3. **Sheet** from Nathan -> `<work>/sheet.webp`.
4. **Build, one command:** `python -I scripts/fish-new.py <work> <id> "<Common>" "<Genus species>" <tl_mm> [--body-from-map]`.
   It runs fishshapes (if `<work>/fishshapes.json` is missing), the audit, the depth stretch when the drawn depth is outside the
   specimens' range, to its nearest end (row 49; into `<work>-s<k>`), the fin cut, the spec (eye colours, `dense`, pectoral spread kept to 0.2-0.35), copies the spec to
   `research/fish-specs/<id>.json` with `width_pct_sl` and the specimens, and builds: `thickx` from the measured width in the same
   pass, then the mass against every specimen (flags outside 0.8-1.45x). Rebuilding keeps an existing spec's hand-set keys
   (`sat`, `alo`, `aw`, pectoral spread, ...).
   - `--body-from-map` stays a judgment call (rows 36, 42): use it when a fin role is missing, the finless row is well above the
     real depth, or the dorsal / anal tips overhang the stalk with black gaps under them (cichlids, gouramis, bettas). An automatic
     test on the row 2 / row 5 depth ratio did not separate the cases (row 43). The stalk clamp in `fish-build.py` (row 43) covers
     the overhang either way.
5. **Pictures:** dev server `glbfish`, page `?photoart`, wait ~4 s, then in the page
   `const m = await import('/scripts/fish-shots.js'); await m.shootFish('<id>', <tl_mm>)` (six views + tail-base close-up, saved
   to `shots/` by the server's `/__shot` endpoint: no receiver needed). Then
   `python -I scripts/fish-contact.py <id> --sheet <work>/sheet.webp` -> `shots/<id>-views.jpg`. Before / after:
   `shootFish(id, tl, {tag: 'before', views: ['tail']})`, rebuild, `{tag: 'after'}`, then `fish-contact.py <id> --compare before after`.
   Close the tank panel first if it is open. Stop the server when done.
   Card alpha is solid inside the fish silhouette (row 45): black fins, pupils and dark marks no longer need `alo` / `aw` by hand.
6. **Judgment, still by hand:** pectoral spread per species (row 32), colour saturation (`sat`, row 22: the ram's fins render
   redder than the sheet), whether the picture matches the sheet. Log the sheet in the method doc's "Prompts used" table.


## Decisions on record (2026-11-23)
- Thickness = FishShapes measured max width, not FishBase mass (FishBase's yellow tang a/b ran ~1.6x light; row 35).
- Width numbers out of the prompt: sheets overshot them by a third anyway (row 37). Depth stays as the one number.
- ChatGPT draws cardinals ~25% SL deep in every layout (2 five-row + 3 side-only); the layout is not the cause. Fix depth at build (row 39).
- ChatGPT's own critique: right about the cross-section wording and front-view scale (tetra front views 1.36-1.48x the side depth),
  wrong that the segmentation rows misalign (IoU 0.97-0.98, stray < 1%). The build uses the front view only as a face texture.
- Eyes: colours, size (1.35x the row-5 disc) and pupil come from the sheet; measured eyes face straight out (rows 40-41).

## Open (pick up only if Nathan asks, or if it blocks a species)
- Cardinal iris reads flat grey (sheet: bright silver with a gold inner rim): the eye texture is a two-tone ring.
- Yellow tang: a 2 px sliver of the sheet's painted eye outline shows behind the 3D eye.
- Leftover weight: disc fish run 1.1-1.4x the real mass at the right max width (width profile too flat / section too boxy).
- Pelvics splay sideways from above on the discus.
- Head-on, build-B fish show a dark slit at the mouth (row 23's gape).
- The rear taper makes the last 20 % SL 1-1.6 points narrower than the sheet's top view (tailspot); small, not fixed.
- Saturation can't be set at build time (it needs a render): measure it from the pictures per fish (row 48).
- FishShapes head depth vs the audit's "depth at the eye": not the same measurement; don't compare them directly.

## Committing
- Worktree: commit on the branch, your own files only. species.json: add only your row to the index
  (`git show HEAD:src/data/species.json` -> insert the row -> `git hash-object -w` -> `git update-index --cacheinfo`), so the E5 lines stay out.
- `npx tsc --noEmit -p .` after any TS change. There are no tests for photofish/fish3d; verify on screen.
- Every correction Nathan makes becomes a checklist row in the method doc, in the same commit.

## Rules
- CLAUDE.md applies: Sonnet subagents; pictures with every question about a model; US units; end replies with "Build N".
- Look rule: not cartoony, not photographic. Nathan judges on screen; say merged vs live separately.
- Nathan often pastes ChatGPT's opinion of a sheet: weigh it against measurements before acting.
