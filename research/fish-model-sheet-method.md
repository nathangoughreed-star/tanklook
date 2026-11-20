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
| 4. Label map | Nathan, same ChatGPT chat | Second request: the side panel as a flat colour map of body and fins. | 2 |
| 5. Build | agent | **Measure, don't model**: scripts read the outline, fins, eye and thickness from the sheet; the numbers drive the app's lofted body; the side panel is the texture, the top and front panels are projected on as layers. | 3 |
| 6. Self-check | agent | Fin check (G2) and every row of the section 4 checklist, on side, 3/4, front and top renders beside the sheet, **before** Nathan sees it. | 3, 4 |
| 7. Review | Nathan | Corrections become new section 4 rows in the same commit as the fix (the ratchet). | 6 |

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
recorded; paste it into section 2 the next time you make a sheet.**

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
| Label map (side view, flat colours) | fin vs body regions without colour tricks | strongly wanted (untested) |
| Bottom | belly colour, pelvic positions | optional |
| Back / rear, other flank | nothing the others don't give (other flank only if the pattern differs left to right) | skip |

| Panel | What the pipeline takes from it | Needed |
|---|---|---|
| Side (one flank) | outline, fin extents, the colour texture wrapped on the body, eye and fin positions | yes |
| Top (dorsal) | body width at every station (thickness) and, now, the back's texture | yes |
| Front (head-on) | cross-section, head width, eye pair, and now the face's texture | yes |
| Label map (side view, flat colours) | fin vs body regions without colour tricks | strongly wanted (untested) |
| Bottom | belly colour, pelvic positions | optional |
| Back / rear, other flank | nothing the others don't give (other flank only if the pattern differs left to right) | skip |

- **Layout:** side view on top, facing right. Top view directly under it, with snout and tail tip lined up in x and the same length.
  Front view below, at the same scale, so its height equals the side view's body depth.
- **Separation and size:** panels must not touch or overlap (a fin tip touching the next panel merged them); at least ~900 px across the fish's length (the dottyback built well at 896 px SL; ChatGPT's portrait canvas, three panels stacked, caps a fish near 1000 px, so 1200 px cannot be met); no text, scale bar, water or props inside a panel; a few degrees of tilt is handled, more is not.
- **Projection:** strict orthographic: no perspective, no tilt, fish level, mouth closed.
- **Lighting:** flat, no shadows or reflections, plain black background.
- **Same fish:** the same individual, pattern and proportions in every panel.
- **Top view:** pectoral fins folded flat against the body. If they stick out, the width can't be read over about 22-44% of the length.
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
- **Body/fin hue:** a fish whose body and fins share a hue (orange, red) has no blue share to split them (row 15). The label map below is the fix.
- **Optional extras that remove most tuning:**
  - **Label map (second request, strongly wanted):** after you approve the sheet, ask the model to *edit panel 1 only* into a flat
    segmentation map, same geometry and framing: body mid-grey, dorsal fin red, anal green, tail blue, pectoral yellow, pelvic cyan,
    eye white, mouth line black or one more colour; no texture, shading or outlines. Overlay it on the clean side view; if edges drift more than
    about 1% of the length, discard it. Body and fin regions then come from colour masks, so `--blue`, `--bright` and `--topend` stop mattering.
    The clean art is never marked up, so nothing has to be erased afterwards. Untested so far (as of 2026-11-20).
  - a fourth panel with the side view as a solid white silhouette on black (a cheaper form of the same idea);
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
| Ocellaris clownfish (sheet 1) | C: full anatomy (old template + body %, fin shapes, band placement, "Nemo"-pattern) | Side and top 965 / 966 px long (0.1%, no rescale); gaps fine; black fin edges help the body/fin split. Wrong: top view shows the tail fanned and the dorsal lying flat; thickness ~0.77 of depth behind the head (asked ~0.5; front panel agrees at ~0.8, so check a real top photo); exaggerated dorsal spines; cartoonish pouty mouth. Head band seen as a ring round the face in the front view is correct (the band wraps behind the eyes). |
| Ocellaris clownfish (sheet 2) | B: the template above | pending |

Second request, after you approve the sheet (label map): "Edit panel (1) only: recolour it as a flat segmentation map, same geometry and framing: body mid-grey,
dorsal fin red, anal fin green, tail fin blue, pectoral fin yellow, pelvic fin cyan, eye white; no texture, no shading, no outlines."

**Sheet audit (agent, before any building).** Measure, then look:
- Panels: split the sheet into horizontal bands of non-black rows (threshold max(R,G,B) > 40); report each panel's x extent. Side and top lengths
  within ~1% (rescale up to ~6%, regenerate beyond).
- Thickness: at several stations clear of fins (e.g. just behind the head), top-panel width ÷ side-panel depth; compare with the front panel's
  width ÷ height and with a real top photo. The clownfish check was a 20-line inline script (`python -I`, numpy + PIL); a saved script is in section 5.
- By eye: the projection items in the checklist below (edge-on fins, no cartoon face, no exaggerated features, pattern continuous across panels).

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
- [ ] Label map made, and its edges match the clean side view (or noted as skipped).
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
| Stout fusiform, same hue body and fins (clownfish) | No blue share: expect `--fullbody` (row 15) and rely on the label map. Black fin edges help the split. Generated sheets come out too thick; check against a real top photo. Large rounded pectorals: the G2 fin check is the real test. Not yet built. |

Keep the sheet and all photos **out of the repo** (scratchpad or the side-session notes folder). Only the finished card (WebP) ships.

## 3. Steps B-G: from sheet to model (agent)

The scripts are on branch `claude/inspiring-mendeleev-e8f95e`. As of 2026-11-19 the last sha is `47ae7a24`, approved by Nathan
but **not yet on origin/main**. Check `git log origin/main -- scripts/fish-outline.py` first. If it's empty, work from that branch.
Run every script with `python -I` (numpy + PIL; untrusted images).

| Step | What | Command (dottyback values) |
|---|---|---|
| B. Crop | Cut the side panel out of the sheet and pad it square on black. Record the crop box, because the top view is read in the same columns. | PIL crop, e.g. side `(125,10,1325,390)` pasted into 1200×1200 black → `side3_full.png`, downscaled to 600 px → `side3.png` |
| C. Side | Outline (21 stations along SL, the snout-to-tail-base length), fins, eye, peduncle → anatomy JSON. Look at the `--debug` mask once. | `scripts/fish-outline.py side3.png src/data/fishart/<id>.anatomy.json --blue 0.55 --bright 160 --topend 0.97 --open 9 --debug dbg.png` |
| D. Top | Half-width at the same stations, read from the top panel's rows. | `scripts/fish-topview.py sheet.png <id>.anatomy.json out.json y0 y1 --x0 125 [--thr 0.6] [--debug]` |
| E. Thickness | Least-squares fit of the app's `thick` / `pedT` to the widths. | `scripts/fish-thickfit.py <id>.anatomy.json --pedt-max 0.3` |
| F. Card | Side cutout → texture card. Erase fins that the 3D replaces (the pelvic). | `scripts/fish-cutout-card.py side3_full.png <id>.anatomy.json out.png [--erase ...]` |
| G. 3D check | Side, 3/4, front and top renders, next to the sheet. | `scripts/fish3d-cutout-test.html` + `.ts` (harness: `fins`, eye and thickness options) |
| H. Wire | Plan overrides plus card behind the flag. | `src/art/photoart.ts`, one line in `src/main.ts`, `public/art/fish/<id>.webp` (dottyback: 82 KB) |

**Fin check (required, step G2; added 2026-11-20 after the flame angel skipped it).** The 3D body has no real pectoral or pelvic fins unless you add them: the card paints the pectoral flat on the flank, and the plan's own leaves are dropped for photo cards. Tail, dorsal and anal fins are flat sheets in the side plane, so they are edge-on from the front and top. Before showing Nathan, do this and say in the report which of the three results each fin got:
1. **Measure the roots** in the gridded side crop (`side_full` px): pectoral root (x,y), pelvic root (x,y) and pelvic length. Also note whether the sheet's top view shows the pectoral (folded) and the front view shows it fanned.
2. **Render with `?paired=photo`** and pass the numbers: `&sx=<snout x>&esl=<SL px>&eaxis=<axis y>&pecx&pecy&pelx&pely&pell` (+ `&pectint=#rrggbb&peltint=#rrggbb` from the sheet's fin colour; `&pecs` scales the pectoral, `&pecspread` fans it).
3. **Erase from the card** only a fin the 3D one replaces (the pelvic), never to hide a symptom.
4. **Pass/fail, every fin:** attached to the body in the 3/4 and front renders; right colour and size against the sheet; no loose card fragment. A fin that fails is listed as an open problem in the fish's JSON `render` block, not silently dropped.

**Reference values, orchid dottyback** (what shipped behind `?photoart`; a starting point, not a rule). Sheet px: snout x 1275, axis y 207, SL 896.
- Cheeks `wide` 0.3; eye `bulge` 0.6; 3D eye seated at (1190,177), radius 14 px, iris `#c8902a` / `#0a0206`.
- Pectoral: root (1010,233), scale 1.2, spread 1.0, tint `#b848c8`. Pelvic: root (1005,295), 120 px long, tint `#c050e0`.
- Pelvic erased from the card with `--erase 755,697,895,790` (side_full px). Thickness fit with `--pedt-max 0.3` (thick 0.76, pedT 0.3, rms 1.05% SL).
- Photo 2 (a different image of the same species) needed `--blue 0.58 --bright 140 --topend 0.95`; the sheet needed `--blue 0.55 --bright 160 --topend 0.97`:
  the same species needs different knobs per image, which is why the label map is wanted.

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

## 5. Open problems (not solved yet; whoever solves one moves it into sections 3-4)

- **Front face texture.** SOLVED 2026-11-20 by projection layers (rows 20-21); the text below is the original problem note. (Flame angel: shape fixed by row 19; what remains is the flat red face, no lips or eye patches, and no fanned pectorals.) Design for the fix: a vertex-alpha duplicate of the body's front rings (stations past ~90% SL, offset 0.0005 along the normal), UV = (z, y) into the sheet's front head crop, alpha = smoothstep on normal.x. Needs the crop carried with the card, so a larger card canvas or a second texture. Not built. The front shows stretched side-texture streaks, not the sheet's face (eye patches, mouth). Proposed fix:
  project the front panel onto the snout. That is a shader change in `lighting.ts` / `fish3d.ts`, not attempted yet.
- **3D pectoral and pelvic fins** look paler and thinner than the sheet's. Make them more opaque and fan-shaped.
- **Body/fin split needs per-sheet knobs** (`--bright`, `--topend`). Possible fixes:
  - the silhouette panel from section 2;
  - fin-ray texture detection;
  - one click per fin base.
- **Front panel isn't measured**, only checked by eye.
- **Busy backgrounds** (real reef photos): `rembg` (U²-Net, 176 MB model, offline, pip) gave IoU 0.84 on a synthetic busy background.
  The measuring script still needs hardening for that. Not needed while sheets are on black.
- **Deep fish (angelfish) median fins.** The dorsal and anal fins are broad and merge into the body, so the script measured only their rear tips (85-103% SL). The card still draws them, so they look right from the side. Measure real base and height before relying on them in motion.
- **Colour drift.** The flame angel renders more saturated red than the sheet's orange. Cause not checked (lighting or the card tint).
- **Not yet verified:** a tank of ~20 photo-card species against the current art (alternate A/B frames), and phone texture memory (~4 MB a species).
- **Prompt variants A / B / C** (clownfish): A = method block + species name only; B = the template in section 2; C = full anatomy (sheet 1).
  Expected: B beats C on common species, A ≈ B, and photos matter more for obscure species. Score each sheet with the sheet audit (length match,
  thickness against a real top photo, edge-on fins, exaggeration), not by how good it looks. Then make the winner the template.
- **Sheet audit script.** The audit in section 2 is still an inline snippet; save it as `scripts/fish-sheet-audit.py` (panels, lengths, width ÷ depth
  at stations, PASS/FAIL lines) the next time a sheet is audited.
- **Generated sheets run thick.** Clownfish sheet 1: ~0.77 width ÷ depth behind the head, self-consistent across top and front panels. Real value not checked yet.
- **Label map** still untested; the clownfish (one hue for body and fins) is its test case.

## 6. How to improve this method (the ratchet)

- **Nathan corrects a model:** add a row to section 4 (symptom in his words, cause, fix, check) in the same commit as the fix.
- **A step gets a better way:** replace the step in section 3. Add a dated line below saying what changed, why, and the evidence (species and
  before/after picture path). Delete the old way. Don't keep two ways.
- **A sheet rule would have avoided the fix:** add it to section 2 as well.
- **Open problem solved:** move it from section 5 into section 3 or 4.

### Change log
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
