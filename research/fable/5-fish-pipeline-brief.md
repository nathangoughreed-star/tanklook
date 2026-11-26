# Brief 5: the build-B fish pipeline, failures, and whether there is a better way

Evidence gathered 2026-11-25 from origin/main `fcca8621` (checkout C:\Users\nreed\Glass-Box-fable). Written for a cold read. US units.

## The question (restated at the end)
"The fish 'build-B' pipeline turns a 5-row ChatGPT reference sheet into a measured 3D model. Given its history of failures and fixes, which changes to the pipeline (method, prompts, checks, automation, review steps) would remove most repeat failures and cut the per-fish human effort, and is there a fundamentally better approach?"

## Context
TankLook (https://tanklook.com) is Nathan's personal 3D aquarium planner (three.js). Nathan reviews fish in the tank and approves them one at a time. Claude chats ("lanes") do the building. House rule: "the model" means build B; fix a model through its spec and a rebuild, never by hand-editing generated files (`public/art/fish/*`, `src/data/fishart/*.anatomy.json`).

## Counts (2026-11-25)
- `src/data/species.json`: 205 rows. About 163 are fish (144 freshwater rows with no `cat` field + 19 `sw-fish`); the rest are inverts, amphibians, reptiles. Exact fish count not computed.
- Build-B looks built (`src/data/fishart/*.anatomy.json`): 79 files. Approved and live (`src/data/fishLive.json`): **45** (12 approved 2026-11-24, 33 on 2026-11-25). Prompts written: b5 20, b6 20, b7 20, b8 21 (81 sheets planned in four batches).
- b5 (11-24): 19-20 built; b6 (11-24); b7 (11-25): all 20 built and live; b8 (11-25): "the 21 remaining old-model fish"; 10 built "not live" at commit 06d18c8f (merah, exclamation, chili, clownpleco, pleco, demasoni, kadango, livingstonii, afra, syno), the other 11 not confirmed from the repo. Held: royal gramma (needs violet front half), discus and swordtail (wait for R147 colour types).
- **Not recorded anywhere:** per-batch attempted / passed / rework-round counts, or human minutes per fish. `research/fish-sheets/log.csv` (32 rows, mostly 2026-11-19..20 experiments) has `claude_calls` and `nathan_rounds` columns but `nathan_rounds` is "unknown" on nearly every row and no b5-b8 fish are logged there; its audit column splits PASS 15 / FAIL 11 / WARN 3 on the early sheets. Early cost anchors: oscar first run about 50 tool calls (target 6-10), flame angel about 17, dottyback about 60 (method change log). The b5-b8 automation (`fish-batch.py`) removed most per-fish tool calls but the number is not measured.

## How the pipeline works end to end
Source of truth: `research/fish-sheets/PIPELINE.md` (15 steps, each with a gate), written 2026-11-25. The method log (the why, 60+ numbered corrections) is `research/fish-model-sheet-method.md`.
1. **Pick species** (Nathan approves the list, e.g. "Approve all 21"). 2. **1-3 real reference photos** (Wikimedia Commons), written look. 3. **FishShapes numbers** (`scripts/fishshapes.py`: depth, width, head, peduncle %SL; a proxy relative when the species is missing, hand-written JSON). 4. **Fill the prompt** (`scripts/fish-prompt-fill.py` from `research/fish-sheets/prompts/B-5row-template.md`: no size adjectives, body marks only, fixes from Nathan's reviews baked into `BODY_BULLETS`). The template ends "Restrained zoological reference illustration. Geometry takes priority over surface detail."
5. **Sheet (Nathan, in ChatGPT on his own plan; no API)**: `scripts/sheet-queue.py` copies each prompt, opens a new ChatGPT chat, files the next download as the fish's `sheet.webp`; per fish Nathan clears the box, pastes, Enter, downloads. A build chat then views every sheet and records `visual_check` in `sheet.json`; nothing goes to Nathan without it.
   The 5-row sheet: row 1 finned side view, row 2 finless body, row 3 top view, row 4 front view, row 5 a colour map of fins (red dorsal, green anal etc.). It replaced the older 3-view sheet (dottyback / flame angel / oscar, Nov 19-20).
6. **Audit + build** (`scripts/fish-batch.py` driving `fish-new.py`, `fish-sheet-audit5.py`, `fish-fin-cut.py`, `fish-spec-from-fins.py`, `fish-build.py`, `fish-autosat.py`, headless shots `fish-autoshot.mjs`): measures the outline from pixels, cuts fins, rescales thickness to the real max width (FishShapes or FishBase mass), writes a spec in `research/fish-specs/<id>.json`, the WebPs (`public/art/fish/<id>{,-fin,-front,-top}.webp`), and the anatomy JSON with a `render.photo` block. `fish-batch.py --group 4 --idle 90` builds each sheet as it lands, in groups of four.
7-11. Registration checks (eye, mouth, tail base, snout), mass / proportion, fin opacity class from reference photos (`fish-fin-class.py`; four classes), body translucency (`fish-body-class.py`; PENDING, parked branch `claude/translucent-bodies`; partially landed 2026-11-25 as See-through bodies on build-B fish only, per commits 53cd8d46..af7c30cd; the doc still marks it pending), fin beat check (renderer-wide, `FLEX_VERT` / `SWIM_VERT`).
12. Review pictures to Nathan (side by side with the sheet, swim GIF, translucency shot). 13. Commit built models, not live. 14. Go live after approval: add `<id>: {look: "<id>b", approved: date}` to `fishLive.json`; `species.ts goLive` swaps the art; build + fish tests. 15. Log (`fish-sheet-log.py`, batch handoff table, `research/requests.md` R146).
Render side: `src/art/photofish.ts` reads `render.photo` and the images; there is no per-species code. Fin motion and see-through are renderer-wide. All fish images load before the app boots (see Brief 4 finding 3).
Cost note: the OpenAI image API was rejected (billed separately from Nathan's plan); the queue drives his ChatGPT UI instead.

## History in one table (`research/fish-model-history.md`, section 1)
Eras: 1 procedural 2D painted cards (Oct 8, "too cartoony"); 2 lofted 3D body with painted texture (Oct 9-16); 3 ChatGPT-written realism passes, about 40 models adopted (Oct 22-28); 4 redrawn by eye from photos (Nov 18, only the blenny good); 5 "fish painter" JSON from one photo (Nov 19, "night and day better", thickness and fins wrong); 6 3-view sheet -> measured loft -> sheet as texture (build B, Nov 19-20; dottyback "pretty great", later too photographic, R144); 7 generative image-to-3D (Hunyuan3D-2mv, Nov 22; oscar "really good, better than build B", but 10-20 MB per 42 fish and not in the default app; on branch `claude/glbfish-e5` and `public/art/fish/lod/` GLBs, behind `?glbfish`); 8 finless-body method (Nov 22-23). Build B (era 6 plus 5-row sheet) is what ships.
Style: Nathan rejected painted fish twice as too cartoony, then photo-wrapped models as too photographic / out of place beside the scene (R144, 2026-11-20: "The point was never to be photo-realistic"). The target is between, not defined by an example; the 5-row template's "restrained zoological reference illustration" plus ChatGPT-revised prompts (blue tang, 2026-11-23) is the current best guess. Pectoral fins were fixed 2026-11-25 (commit f85ed5cc, "very stiff, no animation, not large / prominent enough, add thickness so they aren't a 2D sheet"); eye size, head thickness, top view, tail-root pale band, see-through bodies were all Nathan notes on 2026-11-25.

## Failure classes (class | example fish | cause | fix | recurred?)
Row numbers refer to `research/fish-model-sheet-method.md` section 4 and the change log; "never again" = `HANDOFF-batch-b6.md` line 81 and `PIPELINE.md`.
| Class | Example | Cause | Fix | Recurred? |
|---|---|---|---|---|
| Mis-filed sheet / wrong species | b5 six queues swapped clipboards (black skirt, cory filed as betta); b7 a gourami sheet filed as harlequin, rasbora as kribensis (off-by-one cascade found only at review) | queue files the first new image in Downloads from any ChatGPT chat | lock file; title-vs-folder check; `visual_check` per sheet; one download stream | Yes (b5 then b7) |
| Wrong depth / body thickness | German blue ram, bichir, tailspot blenny, harlequin, pleco ("the body issue again"), zebra danio ("hog-nosed") (rows 33, 35, 39, 49, 56, 60, 64, 65) | ChatGPT draws depth 25 % off (cardinal 25 vs real 29), mid-body bulge, barbels read as snout width; proxy fish depth clamped to the wrong range | FishShapes numbers in prompt; body-only sheet stretch; stretch only outside specimen range, then to range middle (56), proxy keeps drawn depth if inside [0.75 low, 1.3 high] (64), soft width cap (65) | Yes, at least 6 times, each fixed species by species then generalized |
| Fins: attachment, size, opacity, stiffness | oscar pale / lacy fins; blue tang "tiny tab" pectoral (0.2 rad spread); "complete lack of transparency in fins"; bichir ghost pectoral; every 2026-11-25 fin note (rows 6, 7, 18, 25-28, 32, 34, 45, 61) | flat fin cards, brightness-keyed alpha, drawn pelvic floats, spread angle, no motion | photo fins (`PHOTO_FINS`), membrane alpha, `--solid 5`, fin opacity class from photos, spread per species, fin beat | Yes, 2026-11-20, 11-23, 11-24, 11-25 (pectoral beat / thickness, pelvics "uncupped" in b8 report) |
| Tail root / peduncle / belly lumps | cherry barb tail base in the fork; black wedges (ram); pale band at tail-fin join on every b7 fish and the live danio; cardinal hump near the tail (rows 8-11, 42, 43, 46, 50) | fin-base lines, mask threshold, ChatGPT draws pale scales across the root | `landmarks.ped`, base lines to the stalk, clamp stations from 85 % SL, `fishroot.py` filter | Yes |
| Row 2 keeps a fin / finless body wrong | guppy (tail kept), discus (no anal found), cory ("spinal issues"), endler risk (rows 36, 50) | image model copies fins into the "finless" row | prompt rule (MARKS_SHORT body only); `--body-from-map`; redo the sheet | Yes; remains "redo the sheet" |
| Colour / saturation / hue | platy red vs orange, tiger oscar, ram (rows 22, 48, 54, 58) | lighting boosts saturation about 1.35x; one global factor cannot fix hue | `fish-autosat.py`; hand `sat` for hue | Yes; platy / royal gramma pink still open |
| Eyes | two eyes; eye too small, all pupil; amber iris on everything; oversized eye (2026-11-25) (rows 5, 40, 41; commit 5fdc07d4) | hard-coded iris; eye_full too big | `fish-eye-colour.py`, iris-only 3D eye | Yes (4 times) |
| Face / snout / mouth | pointed snout, black nose holes from the front, mouth on the chin, caved forehead (rows 21, 29, 47; b6 review rules) | front panel is not a measurement; sheet stretches face | prompt rules (blunt snout, closed mouth lip line), `fy0` registration | Yes; baked into prompts after b6 review |
| Orientation, panel layout, panel gaps | sheet faces left; clown loach rows 4-5 6 px apart so only 4 panels found (row 13, b7) | image model inconsistency | mirror / rescale; `panel_gap.json`; audit stops with clear message | Yes |
| Infrastructure / process | dev server hung with Browser pane open; headless shots on same random port measured the betta as the angel; 11-hour stall; stranded branches; "Title the image" prompt line made ChatGPT refuse (b8, reverted) | machine load, shared state, prompt edit untested | locks, OS free ports, background builds, PIPELINE rule | Yes (prompt-change regressions especially) |
| Verified-on-broken-render | inward-wound triangles (Oct 9), tail-first outline (Nov 20): two verdicts given on broken renders | loader bug blamed on art | verify on screen first | Twice |
| Lessons not scripted | Nathan 2026-11-23: "Have the lessons all been written into code that can be?" (row 44): six steps still by hand, ram build missed two of the rules | handoff prose rather than code | `fishshapes.py`, prompt-fill warnings, `fish-new.py` defaults | Partly; fin class and body class are steps with a human photo check |

## What Nathan reviews, and what he has rejected
Per fish: side-by-side model vs sheet, in-tank crops, swim GIF; he approves, asks fixes, or holds. Direct quotes in the record: "too cartoony" (era 1); "The point was never to be photo-realistic" (R144); "a quick manual check by you before making a model confirming it looks like the species it's supposed to be" (PIPELINE step 5, 2026-11-25); "I mean... yea. This model got pretty messed up" (bichir, row 59); "chatgpt drew the head the right thickness and made the middle of the body bulge out too much" (danio, 2026-11-25); royal gramma "front half too pink, should be purple" (R146 row). Approval rate: 45 live of 79 built; b7 went live 12 + 2 + 6 within one day after fixes. He also rated the human-effort-heavy step as making sheets by hand (row 59), which the queue partly removed.
The renderer/ART constraint Nathan keeps restating (memory `fish-art-not-cartoony`, `fish-art-reference-photos`): art must be as crisp as the scene, not cartoony, not photographic; every model is drawn from real photos with a written look and a side-by-side check.

## Alternatives already tried (so you do not re-propose them)
- Generative image-to-3D (Hunyuan3D-2mv, E-GEN, GLB + LOD ladder `scripts/fish-glb-bake.py`): good shape on the oscar, large files (boesemani 1.9 MB, oscar 20000-triangle 1.8 MB; 42 Meshy fish estimated 10-20 MB vs 0.57 MB) and a finless-body variant for blue tang and rainbowfish; not in default app, a local 4 GB GPU cannot run the generator, HF quota hit; blind A/B of two blue tangs exists (`bluetang-blind-AB.png`, key in `bluetang-blind-AB-key.md`).
- Label maps (ask ChatGPT to segment regions): dropped, an image model redraws rather than labels. Automatic landmarks and a BGNN segmenter: eye within 0.2-0.5 % SL but weak on paired fins; click tool kept (`tools/fish-landmarks.html`); a pre-fill hybrid never built. Gemini sheets: worse than ChatGPT. Fish painter JSON (era 5): superseded.
- Open problems (method doc section 5 and PIPELINE "Open items"): fin-edge look (jagged margins), deep-fish median fins (angelfish), body/fin split when fins share the body hue, pectoral over the flank on some fish, platy colour, gourami feelers, danio barbels, neon rainbow dorsal spike, angel dark patch at the dorsal base, phone texture memory about 4 MB a species (and the fish-art load issue in Brief 4), sheet style target undefined.

## Images (existing PNGs; I viewed only the first)
1. `research/fish-sheets/bluetang-B-fixes-before-after.png` (viewed): a good result and a typical fix. Blue tang B, six rows BEFORE vs AFTER the 2026-11-23 fixes (width scaled to FishBase, pectoral spread 0.2 -> 0.5 rad, pelvic traced whole): crisp model reads as a restrained illustration; BEFORE shows the tiny-tab pectorals that read as no fin head-on.
2. `research/fish-sheets/bluetang-blind-AB.png` (not viewed): anonymous A/B of two build-B blue tangs (6 matched in-tank views), key in `bluetang-blind-AB-key.md`; shows prompt-variant comparison.
3. `research/fish-sheets/bluetang-buildB-prompt-compare-tank.png` (not viewed): my 5-row prompt vs ChatGPT-revised prompt, in tank.
4. `research/fish-sheets/rainbow-bodyline-fix.png` (not viewed): finless-body line fix on the rainbowfish; typical body/fin boundary failure.
5. `research/fish-sheets/fin-membrane-check.png` (not viewed): fin transparency check (row 34 / 61 class).
6. `research/fish-sheets/hy2mv-vs-buildB-tank.png` (not viewed): the generative alternative against build B in the tank.

## Candidate directions (mine; accept or reject)
1. Make each repeat class a failing automatic check before Nathan sees a fish (a gate script that runs after `fish-batch.py`): depth vs FishShapes range, pale band at the tail root, fin-attach, eye size vs iris, one eye, face-from-front hole, panel count, sheet title vs species. Today most of these are checklist prose.
2. Record batch stats automatically (attempted / passed / rework rounds / minutes) so improvement can be measured; log.csv is unused after b4.
3. Reduce the sheet's job: ChatGPT mis-draws depth, row 2, panel layout; generate fewer things per sheet or pre-validate the sheet (`fish-sheet-audit5.py` as a gate Nathan sees before the build).
4. Replace per-fish photo class decisions (fin opacity, body clarity, pectoral spread) with a species-level lookup table seeded by FishBase / Commons data so a human only confirms exceptions.
5. Review step: one contact sheet per batch (model, sheet, real photo, in-tank at normal distance) with automatic flags; Nathan approves or marks exceptions.
6. Ask whether a different representation (the generative GLB route, or a 2.5D card set) removes whole classes (fins, thickness, top view) at acceptable file size, given the style target.

## The question again
"The fish 'build-B' pipeline turns a 5-row ChatGPT reference sheet into a measured 3D model. Given its history of failures and fixes, which changes to the pipeline (method, prompts, checks, automation, review steps) would remove most repeat failures and cut the per-fish human effort, and is there a fundamentally better approach?"

## What a good answer looks like
Under about 600 words. (1) A ranked list of at most 6 changes, each: which failure classes in the table it removes, expected effect on Nathan's minutes per fish (say what is guessed vs measured), cost to build, and where it plugs into PIPELINE.md (step number). (2) Which repeat classes are structurally the image model's fault (so only a check or a redo helps) and which are ours. (3) A clear yes / no on a fundamentally better approach, with the reasoning and what evidence would change your mind (name one cheap experiment). (4) The first thing to measure, since per-batch and per-fish effort is not recorded. (5) One sentence on what to leave alone.

## Files Fable can open (15 or fewer)
1. `research/fish-sheets/PIPELINE.md`
2. `research/fish-model-sheet-method.md` (grep rows; section 4 checklist, section 5 open problems, section 6 change log)
3. `research/fish-model-history.md` (sections 1, 4-6)
4. `research/fish-sheet-methodology-audit.md` (experiments E0-E7)
5. `research/fish-sheets/HANDOFF-batch-b6.md` ("Never again" line 81), `HANDOFF-batch-b7.md`, `HANDOFF-batch-b8.md`
6. `research/fish-sheets/prompts/B-5row-template.md`
7. `research/fish-sheets/log.csv`
8. `scripts/fish-batch.py`, `scripts/fish-new.py`, `scripts/fish-build.py`
9. `src/art/photofish.ts`, `src/data/fishLive.json`
10. `research/requests.md` rows R144, R146
11. `research/fish-sheets/bluetang-B-fixes-before-after.png` and the other PNGs listed above
