# Method: a fish 3D model from a 3-view reference sheet ("photoart")

Living document. Every chat that builds or fixes a fish model with this method reads it first, follows the steps, and runs the
checklist in section 4 **before** showing Nathan anything. When Nathan corrects a model, or a better way to do a step turns up,
the chat adds it here in the same commit (section 6 says how). The goal is that no correction has to be made twice.

Origin: chat "Pixel-measured outline test: orchid dottyback" (2026-11-19, worktree `inspiring-mendeleev-e8f95e`). Nathan on the
result: "that model looks pretty great", "Side view very strong". It is the first fish he was happy with.
This method sits under `research/species-art-method.md` (reference first) and `research/species-onboarding.md`.

**This is the only fish-model document.** The earlier fish painter (hand-annotated JSON plans, still drawing four fish in the app) is
summarised in section 7; its two memos and the separate sheet guide were folded in here and deleted (2026-11-20).

## 0. The pipeline at a glance (who does what)

| Stage | Who | What | Section |
|---|---|---|---|
| 1. Reference photos | agent (or Nathan) | Find 1-3 real photos of the species: a true side view and, if one exists, a top-down view (the only real check on thickness). They go to the image model as reference only; they never ship and never enter the repo. | 2 |
| 2. Sheet | Nathan, in ChatGPT | Photos + the prompt template → one 3-view sheet (side, top, front) on black. | 2 |
| 3. Sheet audit | agent | Measure the sheet before building: panel lengths, gaps, width ÷ depth across panels and against the real photo. Then check by eye for the projection errors in the sheet checklist. A failed sheet is regenerated; fixing it in 3D costs more. | 2 |
| 4. Build | agent | **Measure, don't model**: scripts read the outline, fins, eye and thickness from the sheet; the numbers drive the app's lofted body; the side panel is the texture, the top and front panels are projected on as layers. | 3 |
| 5. Self-check | agent | Fin check (G2) and every row of the section 4 checklist, on side, 3/4, front and top renders beside the sheet, **before** Nathan sees it. | 3, 4 |
| 6. Review | Nathan | Corrections become new section 4 rows in the same commit as the fix (the ratchet). | 6 |

## 1. How the orchid dottyback was actually made

Nathan's summary was close. Here is what happened, in order, with the corrections to it.

1. **Measuring a real photo.** The chat started with a real side-view photo Nathan supplied, on a black background. Python measured the body
   outline from the pixels instead of guessing coordinates by eye. The body was right, but the fish still looked bad. The renderer's
   parametric fins came out as flat sheets and the tail as a disc, and no measurement can turn those into a fan tail or a spiny dorsal.
2. **Using the photo as the texture.** The chat cut the fish out of the photo and wrapped the cutout on the 3D body, lofted from the measured
   outline. This is what made it look right. A cutout on the old, unmeasured body misaligned, so it needs both the measured shape and the
   cutout. Neither works alone.
3. **The sheet.** Nathan then had an image model (ChatGPT) make a **3-view sheet**: side, top and front of the same fish, on black. From that:
   - the side view gives the outline, fins, tail and the colour texture;
   - the top view gives the body's width along its length, which fixed the "flat ribbon" front view;
   - the front view was only checked by eye, not measured. It still isn't used for the face texture (section 5).
4. **Fix rounds with Nathan**, which became the checklist in section 4:
   - the doubled eye;
   - extra fin leaves;
   - pectoral fins not attached to the body;
   - a bulge near the anal fin;
   - square corners at the rear in the top view;
   - a weak front view.

Steps 1 and 2 used real photos. The model that shipped (flag `?photoart`) uses only the generated sheet, so its art has no
third-party copyright. Nathan says the image model was given a reference photo plus the species name. **The prompt itself was not
recorded** (lost). From now on every sheet's prompt goes in `research/fish-sheets/prompts/` and its audit numbers in `research/fish-sheets/log.csv`.

One correction to "Claude generates the model": no Claude model draws the 3D shape freehand. The agent **measures** the sheet with
deterministic scripts (section 3). Those numbers drive the app's existing lofted body, and the sheet's side view becomes its texture.
That is why it came out right.

## 2. Step A: the reference sheet (Nathan, in an image model)

Give the image model one to three **real photos** of the species (and the sex or variety wanted) and the species name, and ask for this
sheet. The rules come from what made measuring hard on the dottyback, flame angel and clownfish.

**Prompt principle (clownfish, 2026-11-20): describe the method exhaustively, the species selectively.**
- The method part (panels, projection, alignment, lighting, fin poses, spacing) is the same for every species and does the real work: the
  sheet's failures were projection errors, which only method text fixes.
- Species anatomy in prose is ignored or exaggerated. The clownfish prompt asked for thickness about half the depth and got 0.77; it asked for
  "the spiny front" of the dorsal and got sawtooth spines. Give numbers only through the attached photos, and name only the features that must
  be right (the diagnostic marks).
- Never name a film or cartoon character ("Nemo"-pattern pulled the face toward animation: pouty, down-turned mouth). Ask for photorealistic,
  no stylization, no exaggeration.
- Whether some species prose (variant B) beats none (A) or full anatomy (C) is not settled: section 5.

| Panel | What the pipeline takes from it | Needed |
|---|---|---|
| Side (one flank) | outline, fin extents, the colour texture wrapped on the body, eye and fin positions | yes |
| Top (dorsal) | body width at every station (thickness) and, now, the back's texture | yes |
| Front (head-on) | cross-section, head width, eye pair, and now the face's texture | yes |
| Bottom | belly colour, pelvic positions | optional |
| Back / rear, other flank | nothing the others don't give (other flank only if the pattern differs left to right) | skip |

- **Layout:** side view on top, facing right. Top view directly under it, with snout and tail tip lined up in x and the same length.
  Front view below, at the same scale, so its height equals the side view's body depth.
- **Separation and size:** panels must not touch or overlap (a fin tip touching the next panel merged them); at least ~900 px across the fish's length (the dottyback built well at 896 px SL; ChatGPT's portrait canvas, three panels stacked, caps a fish near 1000 px, so 1200 px cannot be met); no text, scale bar, water or props inside a panel; a few degrees of tilt is handled, more is not.
- **Projection:** strict orthographic: no perspective, no tilt, fish level, mouth closed.
- **Lighting:** flat, no shadows or reflections, plain black background.
- **Same fish:** the same individual, pattern and proportions in every panel.
- **Top view:** pectoral fins folded flat against the body. If they stick out, the width can't be read over about 22-44% of the length. **Caveat (bottom dweller test):** a fin folded in the top view and spread in the side and front views means the three panels are not one pose, and the generated head came out 250 px wide from above and 340 px from the front. For fish with large pectorals use the same fin pose in every view, or generate body and fins on separate sheets (experiment pending).
  The dorsal, anal and tail fins are vertical, so from above they are thin edge-on lines on the midline. Image models draw them spread flat
  (clownfish: a full tail fan and a sawtooth dorsal lying on the back); the top panel is painted onto the body, so those fins would be painted on the back.
- **Front view:** the tail is hidden behind the body; the dorsal and anal fins are edge-on lines.
- **Side view:**
  - every fin fully spread and visible;
  - the pelvic and anal fins hanging clearly away from the belly, so they aren't measured as body;
  - the fins visibly more translucent or a different hue than the body, so the body/fin split needs no per-photo tuning;
  - the eye's pupil and iris clearly separate from any eye stripe.
- **Orientation and scale (ask for it, then verify):** nose pointing right in every panel, and the top panel exactly as long as the side panel.
  Image models still flip the fish or stretch the top view (row 13). If a sheet comes back that way, mirror it or rescale the top panel
  uniformly before measuring; do not ask the model again unless the error is above ~6%.
- **Front panel registered to the side view:** the eyes and the mouth must sit at the same height in the front panel as in the side panel.
  The front and top panels are now painted onto the 3D body (rows 20-21), so a front face whose mouth sits lower than the side view's lands
  on the chin (flame angel).
- **Top panel shows the back pattern:** the dorsal ridge, bars and spots must be visible and evenly lit, because the top panel is also a
  texture now.
- **Colour:** the app's lighting boosts fish saturation about 1.35x (row 22, `--sat 0.72`). Ask for true but slightly muted colours,
  especially orange and red; do not add extra saturation in the prompt.
- **Body/fin hue:** a fish whose body and fins share a hue (orange, red) has no blue share to split them (row 15). An image-model label map does not fix it (tested on the oscar, below); the split stays an open problem (section 5).
- **Optional extras that remove most tuning:**
  - ~~Label map~~ **dropped 2026-11-20** (oscar, two tries, same request: "Edit panel (1) only, keeping its geometry and framing
    pixel-identical. Recolour it as a flat segmentation map: body mid-grey; dorsal fin red; anal fin green; tail fin blue; pectoral fin yellow;
    pelvic fin cyan; eye white; mouth line black. No texture, no shading, no outlines, no markings, and nothing else changed. Leave panels (2) and
    (3) untouched."). Try 1 used generative editing and redrew the whole sheet (canvas 1086 × 1448 → 1218 × 1292, other panels re-rendered, a
    slimmer fish: edge drift 2-5% of length against a 1% rule). Try 2, after Nathan said try 1 failed, ChatGPT switched to code: it thresholded
    the original pixels at 8/255 for the silhouette (outline right to 0.1%) and filled hand-approximated polygons for the regions (straight-cut
    fin bases, a trapezoid pectoral, the eye ~2% SL too far back, a belly strip labelled pelvic). So an image model cannot supply body/fin labels,
    and the silhouette it gave is only a low-threshold mask our own scripts can make (section 5).
  - a fourth panel with the side view as a solid white silhouette on black: not needed, a low-threshold mask of the side panel gives the same (section 5);
  - a scale bar along the length.

**Prompt template (variant B, 2026-11-20).** The method block is fixed; change only the `Species:` paragraph. Attach the photos.
```text
Create a single orthographic reference sheet of one fish on a pure black background, for building a 3D model. Three panels stacked vertically, with clear black space between them so that no fin touches another panel.

(1) SIDE: the left flank, a true side elevation. Nose pointing right, body axis perfectly horizontal. All fins spread at their natural resting extent, not flared. The pelvic and anal fins hang clear of the belly with a visible dark gap.
(2) TOP: directly below panel 1, seen straight down from above. The snout and tail tip line up horizontally with panel 1, and the fish is exactly the same length. In this view the dorsal fin, anal fin and tail fin are seen edge-on: each is only a thin line along the midline, never spread flat. Pectoral fins folded flat against the body. The back's colour pattern is fully visible and evenly lit.
(3) FRONT: below panel 2, seen straight on from the snout at the same scale as panel 1. The eyes and mouth are at the same height as in panel 1. The tail is hidden behind the body; the dorsal and anal fins are seen edge-on as thin lines.

All three panels show the same individual, with identical proportions, colours and pattern, and the pattern wraps continuously around the body. Strict orthographic projection: no perspective, no tilt. Flat, even studio light with no shadows, reflections, rim light or glow. No text, labels or props. Mouth closed. The eye has a clearly separate pupil and iris. True but slightly muted colours. Photorealistic and anatomically faithful: no stylization, cartoon or film-character features, and no exaggeration of any feature. Make the fish as large as the canvas allows.

Species: adult [scientific name] ([common name]), [sex if the sexes differ], [colour form, e.g. "standard wild-type colouring, not a designer morph"]. Match the attached photos for body proportions, body thickness and fin shapes; where the photos and your own knowledge disagree, follow the photos. Features that must be right: [only the diagnostic marks and anything image models get wrong for this fish].
```

**Prompts used, per species** (record every sheet's prompt here, with what it got right and wrong):
| Species | Variant | Result |
|---|---|---|
| Orchid dottyback | not recorded | built and approved; prompt lost |
| Flame angel | not recorded | built; top view 6% long, front and top ratios disagreed (rows 13, 19) |
| Ocellaris clownfish (sheet 1, `clownfish-sheet1-variantC.webp`) | C: full anatomy (old template + body %, fin shapes, band placement, "Nemo"-pattern) | Audit: side 966 / top 967 px (0.1%, no rescale), ends within 5 px, gaps 56 / 31 px; width ÷ depth 0.733 / 0.732 at 0.15 / 0.20 SL (asked ~0.5); front body 235 × 312 px = 0.755 (+3.1% vs the stations: PASS); tail edge-on 0.60 (FAIL, fanned). By eye: dorsal lying flat in the top view; exaggerated dorsal spines; cartoonish pouty mouth. Black fin edges help the body/fin split. Head band seen as a ring round the face in the front view is correct (the band wraps behind the eyes). |
| Ocellaris clownfish (sheet A) | A: method block + species name only | pending |
| Ocellaris clownfish (sheet B) | B: the template above | pending |
| Tiger oscar (sheet 1, `oscar-sheet1-variantB.webp`) | B on a second species | **Method held.** Audit all PASS: side 1071 / top 1065 px (0.6%), ends within 4 px, gaps 26 / 28 px; width ÷ depth 0.617 / 0.600 at 0.15 / 0.20 SL; front 243 × 396 px = 0.613 (+0.8%); tail edge-on 0.09 (variant B fixed the top-view fins). **Label map:** two tries, both unusable for regions (try 1 redrawn; try 2 ChatGPT's code: 8/255 silhouette + guessed polygons); request dropped (section 2). |
| Yellow tang (`yellowtang-gen/sheet.webp`, 2026-11-23) | `B-5row-template.md`, first species after the blue tang (no photos) | Fin cut clean: finless side sits inside row 1 (267 px stray of 75k), 4 fin components + label-map pectoral, no hand fixes. Asked depth 53% / width 13% SL; got depth 64% SL, top width 22% SL (width/depth 0.34, asked 0.25); front 80 x 291 px = 0.27 vs top 94 px; row 5 pectoral drawn larger than row 1's. Mass 2.40x FishBase (a 0.0195 b 2.98) -> `thickx` 0.42 (`scripts/fish-mass.py`), a far bigger cut than the blue tang's 0.78. Built as `yellowtangb`. |
| Discus (`discus-gen/sheet.webp`, 2026-11-23) | `B-5row-template.md` with FishShapes numbers (depth 90%, width 17% SL), wild-type colouring | Row 2 kept the scaled, same-hue dorsal and anal (finless depth 97% SL, anal never cut: the spec script cannot run). Row 5 is a faithful copy of row 1 (bbox scale 0.972, IoU 0.975) whose grey body is 83% SL deep: built from it (`fish-fin-cut.py --body-from-map`, fins named by row-5 colour) as `discusc`. Width drawn 22.8% SL vs 17% asked (+34%; yellow tang +30%): the width number does not steer the sheet. `thickx` 0.74 to FishShapes 16.9%; mass 1.06-1.30x the 4 specimens. Pelvics splay sideways seen from above. |


**Sheet audit (agent, before any building).** Run `python -I scripts/fish-sheet-audit.py SHEET --out debug.png [--stations 0.15,0.20] [--real R] [--mirror]`
(numpy + PIL). It prints one PASS / FAIL / INFO line per check and exits 1 on any FAIL. Then look at the debug picture and do the by-eye items.
- Panels: horizontal bands of non-black rows (max(R,G,B) > 40), dark holes inside the fish filled (black band edges and pupils would split the
  columns otherwise). Gaps ≥ 10 px; side ≥ ~900 px long; side and top lengths within 1% (rescale up to 6%, regenerate beyond); snout and tail ends within 2%.
- Thickness: top-panel width ÷ side-panel depth at `--stations` (fraction of length from the snout). Pick stations **clear of the fins**: on the
  clownfish the dorsal spines start at ~0.22 SL, so 0.25 read 0.64 (spines counted as depth); 0.15 and 0.20 are clean. The red/green lines on the
  debug picture show where it measured. `--real R` compares the median with a real value (accept within 10%).
- Front panel: fins only ever stick *out* of the body, so each outline (left, right, top, bottom) is fitted with its inner envelope (fit, drop
  points outside it, refit). That trims solid pectorals (clownfish), fanned translucent pectorals that hole filling welds onto the body (oscar),
  a dorsal spike and edge-on pelvic/anal fins (magenta = trimmed, cyan = kept, on the debug picture). PASS if front width ÷ height is within 5% of
  the station ratio (clownfish +3.1%, oscar +0.8%). Front width vs the top panel's widest is printed as INFO only: it tests scale registration
  between panels, which image models don't keep (both sheets ~8% off). A first version bridged pectorals at outward jumps and took height from
  rows ≥ 40% of the widest; it read the oscar as 472 × 236 (false FAIL +110%) and cut off its pointed top.
- Edge-on tail: top-view width ÷ side-view tail height over 93-99% SL; below 0.25 is a thin line, ~1 is a fanned tail.
- By eye: the projection items in the checklist below (flat-lying dorsal in the top view, no cartoon face, no exaggerated features, pattern
  continuous across panels, eyes and mouth at the same height in the side and front panels).

**Accept the sheet only if** side depth ÷ top width ≈ front height ÷ front width (within ~5%; the dottyback sheet was ~10%), and the
side view matches the real photo's depth-to-length (or FishBase's). A generated fish is plausible, not measured, so check it against a
real photo. Check the image tool's licence terms for use in the app.

**Compare the three panels' ratios before measuring anything.** Work out top width ÷ side depth and front width ÷ front height. When the
sheet's top view and front view disagree (flame angel: top-view ratio 2.8:1 against 1.8:1 in the front panel), either regenerate or plan
for the thickness scaling in row 19.

**Sheet checklist (tick every line before sending a sheet on):**
- [ ] Side and top panels have the same left and right ends (snout, tail tip); the nose points right.
- [ ] Panels do not touch each other; black gaps all round.
- [ ] Pectorals folded in the top view; pelvic and anal fins clear of the belly in the side view.
- [ ] Dorsal, anal and tail fins edge-on (thin midline lines) in the top view; tail hidden in the front view.
- [ ] Photorealistic face and fins: no cartoon expression, no exaggerated spines or fin shapes compared with the real photo.
- [ ] Pattern (bands, bars, spots) continuous between panels.
- [ ] Prompt and result recorded in the "Prompts used" table.
- [ ] Eyes and mouth at the same height in the side and front panels.
- [ ] Back pattern visible and evenly lit in the top panel.
- [ ] No rim glow or soft halo (it reads as fin).
- [ ] Depth, width and height agree within about 5% across panels, and against a real photo or FishBase.
- [ ] The image tool's licence terms recorded for this sheet.

### Body types: what to add or watch *([expected] = reasoned, not yet tested on a second species)*
| Body type | Add / watch |
|---|---|
| Deep, laterally compressed (angelfish, tang, discus) | The front view matters more (the fish is very thin). Long dorsal and anal tips often leave the frame, so leave room. Median fins merge into the body in measurement (section 5). Pitch: use `--level` (row 14). |
| Elongate (eel, pipefish, needlefish, loach) | The sheet gets very wide; allow a wider canvas or the side view comes out too small. Top-view widths are small and noisy. [expected] |
| Flatfish, rays | Belly-down geometry. This pipeline does not fit them and needs its own design. |
| Long or trailing fins (betta, angelfish, gourami, lyretail) | Ask for the fins relaxed, not flared, at natural length; the top view will not show them. [expected] |
| Translucent fins | A dark gap between fin and body, or a stronger hue/brightness difference. Cause of most tuning on the dottyback. |
| Barbels, spines, filaments | Show them clearly in the side and front views. The plan format cannot model them yet. [expected] |
| Pattern differs male / female | One sheet per sex. |
| Stout fusiform, same hue body and fins (clownfish) | No blue share: expect `--fullbody` (row 15); the body/fin split needs the colour knobs (section 5). Black fin edges help the split. Generated sheets come out too thick; check against a real top photo. Large rounded pectorals: the G2 fin check is the real test. Not yet built. |

Keep the sheet and all photos **out of the repo** (scratchpad or the side-session notes folder). Only the finished card (WebP) ships.

## 3. Steps B-G: from sheet to model (agent)

The scripts (`scripts/fish-*.py`), the one-shot chain `scripts/fish-build.py research/fish-specs/<id>.json`, the loader `src/art/photofish.ts`
and the species specs are on main (merged as the E0 baseline, 2026-11-20). Use `fish-build.py` for a new fish; the table below is what it runs.
Run every script with `python -I` (numpy + PIL; untrusted images).

| Step | What | Command (dottyback values) |
|---|---|---|
| B0. Landmarks | **One method (E5, 2026-11-20): Nathan clicks them in `tools/fish-landmarks.html`** (about 1 minute per fish, 12 prompts: tail base, dorsal base line, anal base line, eye, pectoral root + outline, pelvic root + outline). The dorsal and anal lines must run all the way to the tail base (the fins overhang the stalk; if they stop early the rear outline reads the fin lobes as body). He picks the sheet, clicks, and the tool downloads the spec JSON `fish-build.py` takes. The agent only sets `id`, `sheet` (path of the audited, panel-split copy for touching panels), `species`, then runs `fish-build.py`. Do **not** read landmarks off a grid image (3-4 calls per fish for the same quality, rough fin outlines, no Nathan-minutes saved worth having) and do not use `scripts/fish-autolandmarks.py` for production (it misses eyes and fin bases). | `python -I scripts/fish-build.py research/fish-specs/<id>.json` after the click JSON is in place |
| B. Crop | Cut the side panel out of the sheet and pad it square on black. Record the crop box, because the top view is read in the same columns. | PIL crop, e.g. side `(125,10,1325,390)` pasted into 1200×1200 black → `side3_full.png`, downscaled to 600 px → `side3.png` |
| C. Side | Outline (21 stations along SL, the snout-to-tail-base length), fins, eye, peduncle → anatomy JSON. Look at the `--debug` mask once. | `scripts/fish-outline.py side3.png src/data/fishart/<id>.anatomy.json --blue 0.55 --bright 160 --topend 0.97 --open 9 --debug dbg.png` |
| D. Top | Half-width at the same stations, read from the top panel's rows. | `scripts/fish-topview.py sheet.png <id>.anatomy.json out.json y0 y1 --x0 125 [--thr 0.6] [--debug]` |
| E. Thickness | **Measured width first (Nathan, 2026-11-23, yellow tang; row 35):** if FishShapes v1 (Price et al. 2022, NMNH specimens, calipers; CSV https://zenodo.org/records/6642650) has the species, set `thickx` so the max width equals its mean `Max_fish_width` / `Standard_length`, and check mass against its `Total_weight` rows with `scripts/fish-mass.py`. FishBase mass is the fallback only: its a, b are usually Bayesian estimates. **One rule (E6, 2026-11-20):** keep the top panel's width profile from step D, rescale it so its maximum equals the real max body width in % SL, and loft it as `measured_width` (`?mw=1`; the factor goes in `thickx`). No published width for the species: scale the same profile so the lofted body mass is 1.0 x FishBase (`a x TL^b`) and say so in the fish's JSON `render` block. `thickfit` is not used for the final thickness any more (it only supplies the fallback `thick`/`pedT`). Compare the rules with `scripts/fish-sheet-e6.py SHEET:SPECIES`. | width table: `research/fish-sheet-methodology-audit.md` section 5, E6 |
| F. Card | Side cutout → texture card. Erase fins that the 3D replaces (the pelvic). | `scripts/fish-cutout-card.py side3_full.png <id>.anatomy.json out.png [--erase ...]` |
| G. 3D check | Side, 3/4, front and top renders, next to the sheet. | `scripts/fish3d-cutout-test.html` + `.ts` (harness: `fins`, eye and thickness options) |
| H. Wire | Plan overrides plus card behind the flag. | `src/art/photoart.ts`, one line in `src/main.ts`, `public/art/fish/<id>.webp` (dottyback: 82 KB) |

**Fin check (required, step G2; added 2026-11-20 after the flame angel skipped it).** The 3D body has no real pectoral or pelvic fins unless you add them: the card paints the pectoral flat on the flank, and the plan's own leaves are dropped for photo cards. Tail, dorsal and anal fins are flat sheets in the side plane, so they are edge-on from the front and top. Before showing Nathan, do this and say in the report which of the three results each fin got:
1. **The roots and outlines come from Nathan's clicks (step B0)**; if a fish was built without them, measure the roots in the gridded side crop (`side_full` px): pectoral root (x,y), pelvic root (x,y) and pelvic length. Also note whether the sheet's top view shows the pectoral (folded) and the front view shows it fanned.
2. **Render with `?paired=photo`** and pass the numbers: `&sx=<snout x>&esl=<SL px>&eaxis=<axis y>&pecx&pecy&pelx&pely&pell` (+ `&pectint=#rrggbb&peltint=#rrggbb` from the sheet's fin colour; `&pecs` scales the pectoral, `&pecspread` fans it).
3. **Erase from the card** only a fin the 3D one replaces (the pelvic), never to hide a symptom.
4. **Pass/fail, every fin:** attached to the body in the 3/4 and front renders; right colour and size against the sheet; no loose card fragment. A fin that fails is listed as an open problem in the fish's JSON `render` block, not silently dropped.

**Reference values, orchid dottyback** (what shipped behind `?photoart`; a starting point, not a rule). Sheet px: snout x 1275, axis y 207, SL 896.
- Cheeks `wide` 0.3; eye `bulge` 0.6; 3D eye seated at (1190,177), radius 14 px, iris `#c8902a` / `#0a0206`.
- Pectoral: root (1010,233), scale 1.2, spread 1.0, tint `#b848c8`. Pelvic: root (1005,295), 120 px long, tint `#c050e0`.
- Pelvic erased from the card with `--erase 755,697,895,790` (side_full px). Thickness fit with `--pedt-max 0.3` (thick 0.76, pedT 0.3, rms 1.05% SL).
- Photo 2 (a different image of the same species) needed `--blue 0.58 --bright 140 --topend 0.95`; the sheet needed `--blue 0.55 --bright 160 --topend 0.97`:
  the same species needs different knobs per image (the body/fin split is still open: section 5).

**Tuning knobs** (each one is a sign the sheet could be better; see section 2):
- `--blue`: the colour split between body and fins.
- `--bright`: fin darkness used for the belly edge. Sweep 120-205 and pick the value with no lump.
- `--topend`: how far back the colour-based back edge runs.
- `--open`: a morphological opening (shrink then regrow the mask) that strips thin fin spines from the outline.

**Cost target per new fish:** 6-10 tool calls, 2-3 image views. The dottyback took ~60 calls as research, and that number shouldn't recur.

## 4. Checklist: Nathan's corrections, check every one before showing him

Each line was a mistake that reached Nathan once. Look for it in the step G renders and fix it before he sees the fish.

| # | Symptom | Cause | Fix built in | Check |
|---|---|---|---|---|
| 1 | Body shape "consistently wrong" | Outline coordinates guessed by eye | Measure from pixels (step C). Never hand-type outline numbers. | Overlay of the measured outline on the sheet |
| 2 | Fins flat sheets, tail a disc | The parametric plan has no fan tail and no spiny fin | Photo cutout as texture (step F). Don't tune plan fins to imitate it. | Side render beside the sheet |
| 3 | Cutout misaligned on the body | Cutout on the unmeasured plan | Always pair the cutout with the measured outline | Snout and peduncle line up |
| 4 | Front view thin, a ribbon | Thickness guessed | Top-view widths + thickfit (D, E) | Front render: body height ÷ width ≈ the sheet's front panel |
| 5 | Two eyes | 3D eye drawn over the photo's eye | Seat the 3D eye on the photo eye (keeps the 3/4 bulge) or hide it | 3/4 render: one eye |
| 6 | Extra purple fin "leaves" | The plan's own pectoral and pelvic still drawn | Drop the plan leaves for photo cards | No fin that the sheet doesn't have |
| 7 | Pectoral fins not attached (**mandatory: step G2**) | 3D fins placed from old plan numbers | Root the 3D pectoral and pelvic at the sheet's measured positions; erase the pelvic from the card | 3/4 and top: fins touch the body |
| 8 | Bulge near the anal fin, then flat fin | Anal fin base measured as belly and lofted into the body | Cap the rear belly to a straight line to the peduncle (15% → ~10% SL at 85% SL) | Side/3/4: belly runs smoothly into the fin |
| 9 | Belly lumps | Pelvic fin roots in the belly line | Cap lumps at the 5-station median + 1 | Bottom edge smooth |
| 10 | Sharp corners at the rear, top view | `pedT` fit too wide at the peduncle (5% vs 2.8% measured) | `--pedt-max 0.3`; 0.15-0.2 if still blunt | Top render tapers into the tail |
| 11 | Stray loop under the belly | Anal fin extent mismeasured (57-78% SL vs ~60-92%) | Check fin start and end against the picture | Debug mask: fin bases match |
| 12 | Front face looks wrong | Side texture stretched over the snout | **Open**: see section 5 | Front render vs the front panel |
| 13 | Sheet faces left, or the top view is longer than the side view | Image models don't keep one orientation or scale across panels | Mirror the sheet so the nose points right; rescale the top panel uniformly so its snout and tail tip match the side's (flame angel: 6% longer) | Snout and tail tip of both panels line up |
| 14 | Fish pitched nose-down about 8° | Axis was snout to peduncle, and a deep-bodied fish's mouth sits low | `fish-outline.py --level`: axis = horizontal through the peduncle centre; the mouth lands below it | Side render: the fish swims level |
| 15 | Top-view widths are empty or NaN | `fish-topview.py` finds the body by blue share, and orange fish have none | `--fullbody` | Debug picture: green width lines sit on the body edge |
| 16 | Eye not found | Auto-detect looks for blue iris pixels | Place by hand from a gridded head crop: `?eye=place&sx&ex&ey&er&esl&eaxis` (side_full px) | One eye, on the photo's eye |
| 17 | Thin flat sliver at the forehead | 5% stations undercut a rounded head; the card sticks out of the loft | `fish-cutout-card.py --clip-head 25` removes card pixels outside the outline for stations 0-25% | Zoom on the head: no sliver |
| 18 | Pelvic fin floats under the belly | The card keeps it as a flat sheet that doesn't touch the body | `--erase x0,y0,x1,y1` (side_full px) over the pelvic; add a rooted 3D pelvic later | Nothing hangs free below the belly |
| 19 | Front view a thin pill, not the sheet's egg | The sheet's top view and front view disagree (flame angel: 2.8:1 vs 1.8:1) | Compare ratios; scale thickness (`?thickx`, 1.3) and widen the cheeks (`?wide` 0.4, `?bulge` 0.7). Record the values in the species JSON `render` block | Front render beside the sheet's front panel: same width-to-height and cheek shape |
| 20 | Front and top views show smeared side pixels (flat face, no top bars) | The body is painted from the side card only | Projection layers (`src/art/projart.ts`, `fish3d.ts projGeometry`): a transparent copy of the body textured from the sheet's top and front panels, faded in by surface normal. Build the cards with `fish-projcards.py`, load with harness `?proj=` | Front and top renders beside the sheet panels: lips, eye patches, dorsal ridge and bars show |
| 21 | Face features land on the chin or throat in the front view | The sheet's front panel stretches the face against its own side view (mouth lower under the eyes) | Register to the side view: front layer `k` for width, `ky` for height (flame angel 600 / 820), `fy0` = card y of the panel's centre row | Lips sit at the 3D mouth, eyes at the 3D eyes |
| 22 | Orange renders red | The app's lighting boosts fish saturation about 1.35x | `--sat 0.72` on the side, top and front cards | Render beside the sheet: the same orange |
| 23 | Dark slit above the mouth | The plan's own mouth gape mesh, on top of a photo mouth | Harness `?nogape=1` (drops `gape`, `gapeDrop`, `gillLine`) | No slit |
| 24 | Hump on the back, bulging belly (oscar: top edge 28% SL, real ~22%) | Dark dorsal and anal fins are the same hue and brightness as the body; no colour knob separates them (`--warm --blue 0.07` found internal edges on dark bars) | Hand-place the fin bases from a gridded side crop (`fish-outline.py --landmarks f.json`, `dorsalBase` / `analBase` polylines in side_full px); the body edge across each base follows the polyline. Pectoral, pelvic, eye roots go to the harness | Side and 3/4: smooth back, no hump; build A vs B was the test |
| 25 | Dark fins look pale blue and lacy in the tank | Card alpha ramp (max channel 12..52) makes fin pixels of ~45 half transparent | `fish-cutout-card.py --alo 4 --aw 14` for dark-fin fish | Fins as dark as the sheet's |
| 26 | 3D pectoral and pelvic pale grey, pelvic a thin stick, pectoral points down-back | The paired fins were painted from plan outlines; `pectint` barely affects them | **Photo fins:** `PHOTO_FINS` (`src/render/textures.ts`) cuts each paired fin from the sheet's own unerased side card inside a hand-placed polygon: harness `?fincard=<card>&pecpoly=x,y;..&pelpoly=..` (side_full px, first point = root). Oscar: dark, right shape and direction, attached | 3/4 and front renders: fins attached, sheet colour and shape |
| 27 | Axis or peduncle wrong, SL short (flame angel: blue fins merged into the mask, narrowest column found in the fins) | The peduncle search runs on the full mask | `--landmarks` key `"ped":[x,y]` (half-scale px) sets the peduncle centre, hence the level axis and SL | Debug mask: axis through the peduncle; SL = snout x minus ped x |
| 28 | Black ray gaps in a blue or striped fin render as grey speckle | Card alpha keys on brightness, black gaps between rays go transparent | `fish-cutout-card.py --alo 2 --aw 6` for fish whose fins have true black | Fin colour solid in the 3D render |
| 29 | Front layer vertically off | `fy0` was unit-less guesswork | `fy0` = (eye height above the axis, in TL units) minus (eye's offset above the front crop's centre row, in TL units); `fk` = TL in sheet px. Oscar 0.015 / 1070, flame angel -0.038 / 847; both landed first try | Lips and eyes line up |
| 30 | Sheet FAILs "tail edge-on" (clownfish d3 0.29, pleco d1 0.34 under the old audit) | The old reading compared top width with side height over the last 8% of the length; tapered or forked tails make that denominator tiny. Those tails are edge-on. Nothing behind the peduncle reaches the loft, the thickness or the top projection layer | Audit reads the tail from the peduncle (0.15 PASS, above = WARN naming the rescue); `fish-projcards.py` cuts the top card at the peduncle (`--no-tail-cut` to undo); the audit's max width ignores the tail. Synthetic fan: `scripts/fish-sheet-tailtest.py` (reads 0.85) | Audit `tail edge-on` PASS or WARN, never FAIL; top render: tail a thin line, no fan |
| 31 | Landmark tool: pick sheets, page returns to the empty main screen (Nathan, 2026-11-20) | An unescaped apostrophe ("fin's") in a prompt string was a JS syntax error: the whole script died, only the browser's file name showed | Fixed; tool now also names the id from the file (`angelfish-d1.webp` -> `angelfish`, saved as `angelfish-b.json`) and fills the `shapes` sheet path. Run `node --check` on the script block after editing | Pick a sheet: the prompt reads "1/9 Tail base" and the sheet shows |
| 32 | Pectoral a tiny tab, "fins look undersized" (blue tang B, ChatGPT review 2026-11-23) | The sheet's pectoral was full size, but spread 0.2 rad (times the fin-posture range) laid the card along a compressed flank and the body swallowed it | Pectoral `spread`: judge per species, try 0.2 / 0.35 / 0.5 with the body width fixed so only the fin changes (blue tang: 0.2 buried it, 0.5 read as paddles head-on, 0.35 kept 2026-11-23). Not a universal default | Head-on render: both pectorals clear of the body |
| 33 | Body inflated head-on (blue tang A) | Built at the sheet's own width (`measured_width` as drawn); step E's rescale was skipped. Tang sheets came out 1.28-1.38x FishBase mass | Always apply step E. No published width: `thickx` = FishBase mass / model mass (tang B 0.78, FishBase 6017 a 0.02291 b 2.96, a family-shape estimate) | Mass 1.0x FishBase; head-on width/depth |
| 34 | Pectoral "a thick, opaque yellow oval" head-on (blue tang, ChatGPT review 2026-11-23) | Fin cards are flat, but the photo fin was fully opaque to its outline, so the stand-out line drew a full-strength dark rim | Shared, all species: fin membrane alpha (`MEMBRANE` in `src/render/textures.ts`, same numbers in `fish-glb-assemble.py`): x0.9 inside to x0.4 at the outline over 15% of the fin; the rim fades with it (Nathan's 2026-10-13 rule: see-through fins get a fainter line) | Head-on render: fin edges see-through, no dark rim. Picture `research/fish-sheets/fin-membrane-check.png` |
| 35 | Thickness from FishBase mass "a bit too coarse" (Nathan, 2026-11-23, yellow tang at `thickx` 0.42 = 9.1% SL wide) | FishBase's Z. flavescens a 0.0195 b 2.98 is a Bayesian estimate; real fish (FishShapes, n 4, SL 4.9-5.5 in) weigh 79-103 g, about 1.6x the estimate, so scaling to it halved the width | Width from FishShapes measured max width (yellow tang 16.6% SL, n 5, `thickx` 0.76). Mass then runs 1.14-1.37x the real specimens: the sheet's depth (64% vs 61% SL) and its full width profile and section shape, not the maximum. Blue tang control: FishShapes 15.2% SL (n 3) vs bluetangd 13.0% | Head-on width / depth near the FishShapes ratio (yellow tang 0.275); `fish-mass.py` within ~1.3x of FishShapes weights |
| 36 | Discus: no anal fin found, finless body 97% SL deep (2026-11-23) | Scaled dorsal/anal fins in the body's own colours: ChatGPT's row 2 keeps them as body | `fish-fin-cut.py <work> --body-from-map`: body = row 5 grey (holes filled) fitted to row 1 by bounding box, fins named by the nearest row-5 colour. Use when row 2 depth is well above the measured depth or a fin role is missing | fins.json has dorsal, anal, caudal, pelvic; body depth within ~10% of FishShapes |

## 5. Open problems (not solved yet; whoever solves one moves it into sections 3-4)

- **Front face texture.** SOLVED 2026-11-20 by projection layers (rows 20-21); the text below is the original problem note. (Flame angel: shape fixed by row 19; what remains is the flat red face, no lips or eye patches, and no fanned pectorals.) Design for the fix: a vertex-alpha duplicate of the body's front rings (stations past ~90% SL, offset 0.0005 along the normal), UV = (z, y) into the sheet's front head crop, alpha = smoothstep on normal.x. Needs the crop carried with the card, so a larger card canvas or a second texture. Not built. The front shows stretched side-texture streaks, not the sheet's face (eye patches, mouth). Proposed fix:
  project the front panel onto the snout. That is a shader change in `lighting.ts` / `fish3d.ts`, not attempted yet.
- **3D pectoral and pelvic fins** look paler and thinner than the sheet's. Make them more opaque and fan-shaped.
- **Body/fin split: hand-placed fin bases TESTED 2026-11-20 (oscar, rows 24-26): they beat the automatic pipeline** (smooth back and belly, 3D fins rooted; automatic build had a back hump and a floating pelvic). Cost: ~12 coordinate reads from one gridded crop. A segmentation model is only needed if hand placement is unwanted. Colour-only split fails when fins and body share hue (R-B `--warm` found only some edges).
- **Body/fin split needs per-sheet knobs** (`--bright`, `--topend`). Possible fixes:
  - fin-ray texture detection;
  - one click per fin base.
- **Front panel isn't measured**, only checked by eye. Partly solved 2026-11-20: `fish-sheet-audit.py` measures its body width ÷ height (fins trimmed); the front's eye and mouth height against the side panel are still by eye.
- **Busy backgrounds** (real reef photos): `rembg` (U²-Net, 176 MB model, offline, pip) gave IoU 0.84 on a synthetic busy background.
  The measuring script still needs hardening for that. Not needed while sheets are on black.
- **Deep fish (angelfish) median fins.** The dorsal and anal fins are broad and merge into the body, so the script measured only their rear tips (85-103% SL). The card still draws them, so they look right from the side. Measure real base and height before relying on them in motion.
- **Colour drift.** The flame angel renders more saturated red than the sheet's orange. Cause not checked (lighting or the card tint).
- **Not yet verified:** a tank of ~20 photo-card species against the current art (alternate A/B frames), and phone texture memory (~4 MB a species).
- **Prompt variants A / B / C** (clownfish): A = method block + species name only; B = the template in section 2; C = full anatomy (sheet 1).
  Expected: B beats C on common species, A ≈ B, and photos matter more for obscure species. Score each sheet with the sheet audit (length match,
  thickness against a real top photo, edge-on fins, exaggeration), not by how good it looks. Then make the winner the template.
- **Generated sheets run thick.** Clownfish sheet 1: ~0.77 width ÷ depth behind the head, self-consistent across top and front panels. Real value not checked yet.
- **Body/fin split, after the label map was dropped** (2026-11-20; section 2): an image model cannot label regions. Candidates: the colour knobs,
  one click per fin base, or a point-prompted segmentation model; benchmark any of them against the current colour extraction before investing.
- **Outline mask at a low threshold (~8/255) catches dark fins** (the oscar's dark fins fall under 40, which is what ChatGPT's "label map" silhouette
  did right). Check the outline script's threshold (`fish-outline.py`; builds use `--thr 8`); the audit keeps 40 for panel bands.

## 6. How to improve this method (the ratchet)

- **Nathan corrects a model:** add a row to section 4 (symptom in his words, cause, fix, check) in the same commit as the fix.
- **A step gets a better way:** replace the step in section 3. Add a dated line below saying what changed, why, and the evidence (species and
  before/after picture path). Delete the old way. Don't keep two ways.
- **A sheet rule would have avoided the fix:** add it to section 2 as well.
- **Open problem solved:** move it from section 5 into section 3 or 4.

### Change log
- 2026-11-23 (blue tang B, after ChatGPT's blind review): rows 32-33. Pelvic traced as the whole fin, not just its tip (the fin cut misses the part over the belly line); little visible change. Tried `--alo 2 --aw 6` (row 28) against the "jagged fin margins" note: it gave a fuzzy dark fringe and loose specks on this sheet, reverted; the fin-edge look is still open. Picture: `research/fish-sheets/bluetang-B-fixes-before-after.png`.
- 2026-11-20 (E5b, segmenter test): a pretrained fish-anatomy model (BGNN trait segmentation) finds the eye within 0.2-0.5% SL and the dorsal, anal and tail fins on the oscar, clownfish and pleco with no clicks, but not the pelvic fin of the oscar or reliably the pectoral fins. Click tool stays; next step is pre-filling it from the segmenter so Nathan only fixes the paired fins. Details and the setup traps (sigmoid channels, mirror, gamma): audit doc section 5, E5b.
- 2026-11-20 (E5, hardened build on 3 fish): oscar, clownfish and pleco built from Nathan's raw clicks, no hand edits, all render with attached fins, a tapered rear and a registered face. The front-eye detector needed two passes (strict: black pupils under 60, 40+ px; relaxed: dark eyes under 75, 100+ px) because the clownfish and pleco have large dark eyes that the strict pass missed, and a looser single pass picked up body spots on the oscar. Detected `fy0`: oscar -0.015, clownfish 0.022, pleco 0.016 (the old default would have been 0.029 / 0.047 / 0.029 for the clownfish and pleco). The E7 species (angelfish, neon tetra, betta, cory, pea puffer) were not rebuilt: their specs carry hand values and a rebuild would overwrite shipped files.
- 2026-11-20 (E5, build chain hardened): `fish-build.py` now does by itself what the oscar needed by hand: (1) runs the dorsal and anal base lines to the tail base (adds two points from the line's tail end, whichever order they were clicked in) and keeps the last station's depth at the stalk's; (2) `anchor_top` is on by default (`false` turns it off); (3) rear taper `[92, 0.5]` is on by default for `measured_width` fish (`taper: false` turns it off); (4) `fy0` is detected from the front panel's eyes (the topmost symmetric pair of dark round blobs) and printed, with a fallback to the old default and a message when not found; a spec `fy0` still wins. Proof: the oscar built from Nathan's raw clicks (`research/fish-specs/e5/oscar-auto.json`, no hand edits) renders correctly, rear and face included. Not yet re-run on the clownfish, pleco or the E7 species.
- 2026-11-20 (E5, oscar snout): `fish-topview.py --anchor` (spec `anchor_top: true`) lays the stations on the top panel's own snout tip and tail tip and reads the full width near the tips; before, the panel was read at the side view's snout x, which put every width ~0.5% SL off and the snout half-width at half its real value. With it the stored widths equal the sheet's top silhouette at every snout station (0.5% SL: 1.70 vs 1.66), yet the 3D top view is still 20-30% narrower than the sheet at 2-6% of the length (48 vs 68 px at 4%). CORRECTION (same day): that 20-30% gap was a measuring artefact of a 520 px render. At 1800 px the model's top-view width matches the sheet at 2-14% of the length. What really differs is the tip shape: the sheet's snout is blunt and rounded (lip pad, eyes standing out beyond the head outline), the model's tapers to a small point. `e5-compare.ts` takes `?w=&h=` for hi-res renders; never judge widths from the 520 px default.
- 2026-11-20 (E5, oscar tail, second pass): compared with the sheet's top panel, the first taper (`[78, 0.12]`, tail base at the narrowest point) still ended the body 13% of the length too early. Put the tail base where the body meets the tail fin (Nathan's click, x=169), run the dorsal and anal lines to it, and use a late gentle taper `[88, 0.35]`: the rear then matches the top panel. Remaining difference: the snout is a pointed wedge in the top view, the sheet's head is blunt and round with eyes standing out (try `wide`, `bulge`).
- 2026-11-20 (E5, oscar tail): the measured rear half-width ended at 4% SL in a blunt cut against the zero-thickness tail sheet. `fish-build.py` spec key `taper: [start %SL, end factor]` eases the rear half-widths down (smoothstep); oscar `[78, 0.12]` gives a smooth taper in the top view. Use it for any fish whose tail is a flat sheet (all so far).
- 2026-11-20 (E5, oscar live): `fish-build.py` defaults the front layer `y0` to the eye's height above the axis and ignores where the eyes sit in the front panel, so the face projection rides too high (mouth near the forehead). Set `fy0` in the spec by checklist row 29: eye height above the axis (TL units) minus the front eyes' offset above the front crop's centre row (TL units). Oscar from the clicks: fk 998, fy0 -0.029; front render then has eyes above the mouth. TODO: make fish-build detect the front eyes itself.
- 2026-11-20 (E5, landmark input): step B0 added; the hand grid-reading step is replaced by Nathan's clicks in `tools/fish-landmarks.html`. On 3 audited sheets the grid reading was within 0.2-3.5% SL of his clicks for eye, fin roots and base lines, but 6-8% SL off on the tail base, and its fin outlines were rough triangles (overlap with his traces 0.2-0.6). Automatic detection (`scripts/fish-autolandmarks.py`) found the eye on 1 of 3 sheets and 3 of 6 fin bases. Clicks cost 58-73 s per fish. Result and tables: audit doc section 5, E5.
- 2026-11-20 (tail rescue): audit `tail edge-on` now anchored at the peduncle (v3); old FAILs on clownfish d3 / pleco d1-d3 were a metric artifact (tails are edge-on); `fish-projcards.py` cuts the top card at the peduncle; audit max width excludes the tail; harness `?photofish=1`; row 30 added.
- 2026-11-20 (E6, thickness rule): step E replaced. Thickness = the top-panel width profile rescaled to the real max width % SL (fallback: mass-matched to 1.0 x FishBase), replacing the `thickfit` step. On 11 sheets, mass / FishBase: `thickfit` 0.93-1.12 (oscar), 1.34-1.81 (clownfish, one draw over the 1.6 gate), 0.72-0.81 (pleco); `measured_width` as drawn 0.68-1.75; the rescale 0.82-0.98 (oscar), 0.90-1.02 (pleco). Audit script v2: front-vs-top is information only, touching panels are split at the narrowest row, a like-for-like "top max width / length" line and `--real` (real max width / total length) replace the station-ratio comparison, tail edge-on is PASS <= 0.15 / WARN <= 0.25 / FAIL above. Details: audit doc section 5, E6.
- 2026-11-20 (build chain): `scripts/fish-build.py research/fish-specs/<id>.json` runs steps B-H from one spec (landmarks, eye, fin polygons) and writes the anatomy JSON with a `render.photo` block, the WebPs and the species.json entry; `src/art/photofish.ts` loads every such JSON (`?photoart`), replacing the per-species photoknife.ts. `scripts/fish-sheet-audit.py` is now a real script (panels, lengths, width checks; PASS/FAIL). `fish-thickfit.py` thickness range raised to 3.2 (flat fish). Specs: clownknife, bambooshark.
- 2026-11-20 (fin pose): `pec.sweep` (plan) / harness `?pecsweep` and `?pecflat`; `?pecspread` is the swing of the fin about the vertical (spreads a wide pectoral outward, pleco 1.2 rad). Pectoral/pelvic fin orientation is a general capability, not per species.
- 2026-11-20 (smoothing test, flame angel): `--landmarks` base polylines can be a cubic spline clamped to the fish mask (`--smooth`, off by default: Nathan judged the straight-segment build better). Result: almost no visible change; the sharp rear angles are not the straight segments. Two causes found: (1) base points placed on a chord cut diagonally into the body, the real body/fin boundary at the rear is near-vertical (x 345 vs the fin lobe 250-345); moving the points onto it gave a better shape but thin dark slivers where fin and body meet; (2) the loft has only 21 stations (5% SL), so a near-vertical rear edge is drawn as a 5%-SL diagonal. Open: denser stations near the rear (or a rear-edge fix in `bodyGeometry`), and the body/fin boundary points belong ON the true boundary, not inside the body.
- 2026-11-20 (flame angel as the generalization test, strict sheet): the oscar's shared fixes (landmark fin bases, photo fins, projection layers) built a good flame angel with no new rendering code, only `--landmarks ped` (row 27). 28 hand points (build X) and 14 points (build Y: 3-point bases, triangle fins, one eye point) look the same in 3D; 14 is enough. Hand time: ~17 tool calls end to end, one gridded crop. Rows 27-29. Body/fin automatic: `--warm` plus the landmarks worked for blue fins on an orange body.
- 2026-11-20 (oscar, later): photo-textured paired fins (`PHOTO_FINS`, harness `?fincard/pecpoly/pelpoly`) fix row 26; top and front projection layers built for the oscar (`fish-projcards.py --top 640,878 --front 285,896,800,1440`, `?fk=1070&fy0=0.015`), lips, eye patches and top pattern show.
- 2026-11-20 (oscar, first full run + landmark test): build A (automatic) vs B (hand-placed fin bases/roots) on the oscar sheet; B wins. New: `fish-outline.py --warm` and `--landmarks`, `fish-cutout-card.py --alo/--aw`, harness `?aspect=`; rows 24-26 (row 26 solved by photo fins). ~50 tool calls (target 6-10), mostly new-script work.
- 2026-11-19: Method written from the orchid dottyback chat (sha `47ae7a24`, branch `claude/inspiring-mendeleev-e8f95e`).
- 2026-11-20: Flame angel run (sha on `claude/flameangel-photoart`): rows 13-18 added; scripts gain `--level`, `--fullbody`, `--clip-head`, and the harness takes `?sp=`. Run the dev server on its own (`npx vite --port 5174`), not alongside other chats' servers; on a loaded machine its first page load stalled for 10+ minutes.
- 2026-11-20: Front shape rule (row 19) added; front face texture design recorded in section 5.
- 2026-11-20 (later): projection layers for the top and front views (rows 20-23), `fish-projcards.py`, `--sat`. The strict sheet (top view directly under the side view, pectorals folded, front view below) needed no mirroring or rescaling beyond 1.2%. Still behind the test harness only: not yet wired into `?photoart`.
- 2026-11-20 (fin check): step G2 made a required step; the harness `?paired=photo` takes the roots as parameters instead of the dottyback's typed-in numbers. The flame angel (`f86cb8bd`) predates this and has NO rooted pectoral or pelvic fins yet.
- 2026-11-20 (merged with the sheet guide from the dottyback chat): section 2 gains orientation/scale, front-to-side registration, top-panel pattern, colour,
  body/fin hue, the label-map panel, the ratio comparison, a sheet checklist and a body-type table; section 3 gains the dottyback reference values.
- 2026-11-20 (merge): the dottyback chat's separate sheet guide (`research/fish-sheet-guide.md`, branch `claude/inspiring-mendeleev-e8f95e`) is folded into this doc (panel table, layout rules, prompt template and label-map request, sheet checklist, body-type table, dottyback reference values). Drop that guide; this is the single source.
- 2026-11-20 (clownfish sheet 1, one doc): section 0 pipeline table; section 2 gains the prompt principle (method exhaustive, species selective;
  no character names), the variant B template, the per-species prompt table, the sheet audit, edge-on fin rules for the top and front views, four checklist
  lines and the clownfish body type; size rule 1200 → ~900 px (the canvas can't do 1200; the dottyback built at 896). Section 5 gains the A/B/C test, the audit
  script, thick sheets and the label-map test. Section 7 summarises the fish painter; `research/fish-painter-design.md` and `research/fish-painter-experiment-ab.md`
  are deleted (git history keeps them) so this is the only fish-model doc.
- 2026-11-20 (sheet audit script): `scripts/fish-sheet-audit.py` replaces the inline snippet (section 2): panels, gaps, length and end match, width ÷ depth at
  stations, front panel with pectorals bridged, front width vs top's widest, edge-on tail, optional `--real`. Clownfish sheet 1: 0.73 at 0.15-0.20 SL
  (the earlier ~0.77 was read nearer the dorsal start), front 0.77, two FAILs (front vs top width −6.5%, tail fanned 0.60).
- 2026-11-20 (oscar, from the fish-model fork chat): the audit's front panel read the oscar as 472 × 236 px (false FAIL); front measurement rewritten as an
  inner-envelope fit on all four outlines, and the thickness PASS is now front ratio vs station ratio (front width vs top's widest is INFO: registration).
  Label map's first test failed (redrawn, not recoloured); recorded in sections 0, 2 and 5. Oscar added to the prompts table: variant B held on a second species.
- 2026-11-20 (oscar label map test 2): outline right (0.1% edge drift, other panels untouched), fin boundaries and eye invented. Verdict recorded in
  sections 0, 2 and 5: label map = outer silhouette only; body/fin split stays with the colour knobs or a click per fin base.
- 2026-11-20 (label map dropped): both oscar tries used the same request; try 1 was generative (redrawn), try 2 was ChatGPT's own code (8/255 threshold
  silhouette + hand-drawn polygons). Image models can't supply body/fin labels, so the label-map request is removed from section 0, the panel table,
  section 2 and the sheet checklist. Section 5: the body/fin split stays open; a low-threshold (~8/255) outline mask is noted for dark fins.
- 2026-11-20 (E0 baseline): trusting-borg (code, specs, build chain) and charming-tesla (audit script, label map dropped) merged into one doc; duplicate pipeline/panel tables removed; audit script = tesla's (front vs top width INFO only); flame angel has one projection set; `research/fish-sheets/log.csv` and `prompts/` added (see section 2).

## 7. The earlier method still live in the app: the fish painter (JSON plans)

Four fish are drawn on origin/main by the painter, not by this method: `flameangel`, `pajamacardinal`, `koletang`, `foxface` (`JSON_PLANS`; files in
`src/data/fishart/<art>.json` + `<art>.grid.json`, loaded by `planFromJson` in `src/art/fishartjson.ts`). Experiment D also did the orchid dottyback, lawnmower
blenny and yellowtail blue damsel on branch `claude/fishpainter-d`; only the foxface is merged.
Every other fish is still a hand-written `PLANS` entry in `src/art/fishgen.ts`. A fish built by this method replaces its painter or code plan when it ships.

How the painter worked (2026-11-19, experiments A-D): one Commons/iNaturalist photo per fish, annotated **by eye** on a 50 px grid (body polygon, fin outlines,
roots, eye, bar paths), written to the JSON; the loader drew it with body-relative marks (`path`, `lines`, `scatter`, `grad`) and a fin colour grid sampled
from the photo. Overlay scripts (`scripts/overlay.js` + `overlay.py`) scored silhouette IoU 0.98-0.99 and contour error ~0.2-0.3% SL against the annotation.

Why this method replaced it: the annotation was by eye on one photo, so the 0.99 only proved the loader lost nothing (row 1: never hand-type outlines);
thickness was unmeasured (two fish came out ~1.65x FishBase mass); fins were flat sheets and marks statistical, not the real pattern (row 2).

Still useful from it:
- **Regression baseline:** the tailspot blenny's 1024 px card pixel hash (`scripts/card.js`) was 8365491 through every painter step; re-check it after loader changes.
- **Mass check:** model mass (volume x 1.02 g/cm3) against FishBase length-weight `a x TL^b`; flag above 1.6x or below 0.6x. After changing a fish's
  shape, regenerate volumes with `GEN_BODYVOLUME=1 npx vitest run test/bodymass.test.ts`.
