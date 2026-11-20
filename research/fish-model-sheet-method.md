# Method: a fish 3D model from a 3-view reference sheet ("photoart")

Living document. Every chat that builds or fixes a fish model with this method reads it first, follows the steps, and runs the
checklist in section 4 **before** showing Nathan anything. When Nathan corrects a model, or a better way to do a step turns up,
the chat adds it here in the same commit (section 6 says how). The goal is that no correction has to be made twice.

Origin: chat "Pixel-measured outline test: orchid dottyback" (2026-11-19, worktree `inspiring-mendeleev-e8f95e`). Nathan on the
result: "that model looks pretty great", "Side view very strong". It is the first fish he was happy with.
This method sits under `research/species-art-method.md` (reference first) and `research/species-onboarding.md`.

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

Give the image model one or two **real photos** of the species (and the sex or variety wanted) and the species name, and ask for this
sheet. The rules come from what made measuring hard on the dottyback:

- **Layout:** side view on top, facing right. Top view directly under it, with snout and tail tip lined up in x and the same length.
  Front view below, at the same scale, so its height equals the side view's body depth.
- **Projection:** strict orthographic: no perspective, no tilt, fish level, mouth closed.
- **Lighting:** flat, no shadows or reflections, plain black background.
- **Same fish:** the same individual, pattern and proportions in every panel.
- **Top view:** pectoral fins folded flat against the body. If they stick out, the width can't be read over about 22-44% of the length.
- **Side view:**
  - every fin fully spread and visible;
  - the pelvic and anal fins hanging clearly away from the belly, so they aren't measured as body;
  - the fins visibly more translucent or a different hue than the body, so the body/fin split needs no per-photo tuning;
  - the eye's pupil and iris clearly separate from any eye stripe.
- **Optional extras that remove most tuning:**
  - a fourth panel with the side view as a solid white silhouette on black;
  - a scale bar along the length.

Prompt used for the orchid dottyback: *(not recorded yet; Nathan to paste.)*

Draft prompt (refine and record whichever version works):
> Scientific reference sheet of a single [species, sex/variety], based on the attached photo(s). Three orthographic views on a pure black
> background, flat even lighting, no shadows: (1) left-to-right side view facing right, all fins fully spread, pelvic and anal fins clearly
> separated from the belly; (2) top (dorsal) view directly below it, the same length and aligned so snout and tail tip line up vertically,
> pectoral fins folded flat against the body; (3) front (head-on) view below, at the same scale. The same individual in every view, true
> colours and pattern, photorealistic, not stylised, no text, no labels.

**Accept the sheet only if** side depth ÷ top width ≈ front height ÷ front width (within ~5%; the dottyback sheet was ~10%), and the
side view matches the real photo's depth-to-length (or FishBase's). A generated fish is plausible, not measured, so check it against a
real photo. Check the image tool's licence terms for use in the app.

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
| 7 | Pectoral fins not attached | 3D fins placed from old plan numbers | Root the 3D pectoral and pelvic at the sheet's measured positions; erase the pelvic from the card | 3/4 and top: fins touch the body |
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
