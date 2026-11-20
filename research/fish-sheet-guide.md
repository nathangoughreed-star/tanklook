# Reference-sheet guide: what to ask the image model for (any fish)

Status 2026-11-19: written from one fish (orchid dottyback, 3 photos / sheets tried). Items marked **[tested]** were seen to matter; **[expected]** are reasoning, not yet tested on a second species. Change them after the next species.

## 1. What each panel is for

| Panel | Gives the pipeline | Required |
|---|---|---|
| Side (one flank) | outline, fin extents, the colour texture wrapped on the body, eye and fin positions | yes |
| Top (dorsal) | body width at every station = thickness profile (`scripts/fish-topview.py`, then `fish-thickfit.py`) | yes |
| Front (head-on) | cross-section shape, head width, eye pair; today only used for a by-eye check | yes |
| Label map (side view, flat colours) | fin vs body regions without colour tricks | strongly wanted **[expected]** |
| Bottom | belly colour, pelvic positions | optional |
| Back / rear | nothing the others don't give | skip |
| Other flank | only if the pattern differs left to right | skip |

## 2. Layout of the one sheet (so the views agree)

1. **One image, black background**, panels stacked: side on top, top view directly under it, front view below or beside. **[tested]**
2. **Side and top share the same x axis**: snout tip and tail tip at the same left/right pixel in both, so width at a station is read from the same column. **[tested; the pipeline relies on it]**
3. **Same scale** in all panels; the front view's height equals the side view's maximum body depth.
4. **Strictly orthographic**: no perspective, no foreshortening, camera level with the fish.
5. **Fish level**: body axis horizontal in side and top views (a few degrees is handled; more is not).
6. Panels must not touch or overlap (separate by clear black rows/columns). **[tested: a fin tip touching the next panel merged them]**
7. Square-ish canvas is fine; resolution at least 1200 px across the fish's length.

## 3. What each panel must show

**Side view**
- Mouth closed, eye visible with pupil and iris distinct from any stripe around it **[tested: eye detection mixed stripe and iris]**.
- Every fin fully spread and visible: dorsal, anal, caudal, the pelvic fin hanging clear of the belly with dark space between belly and fin **[tested]**, pectoral lying against the flank in its natural position.
- Flat, even light; no cast shadow, no reflection, no glow or rim light bleeding into the background.
- No water, no props, no text, no scale bar inside the panel.

**Top view**
- Pectoral fins **folded flat against the body** (not fanned out): fanned pectorals hide the body width where the body is widest **[tested]**.
- Dorsal fin folded down the midline; tail straight.
- Both eyes visible, symmetric.

**Front view**
- Dead centre, head-on, mouth closed, pectorals relaxed (a slight outward fan is fine, it is measured separately).
- The body should fill the frame at its widest point behind the head.

**Label map (second panel, same pose and framing as the side view)**
- Flat unshaded colours on black, no texture, no outline lines: body = one colour, each fin its own colour (dorsal, anal, caudal, pectoral, pelvic), eye = one colour, mouth line = one colour. Suggested: body mid-grey, dorsal red, anal green, caudal blue, pectoral yellow, pelvic cyan, eye white.
- Ask for it as an **edit of the finished side view** (same geometry), not a fresh drawing, so edges coincide. Check by overlaying; drop it if edges drift more than ~1 % of the length.
- Purpose: region masks by colour, instead of guessing fins from brightness or hue **[expected]**. The clean art is never marked up, so nothing needs erasing.

## 4. Consistency rules (the sheet must agree with itself)

- Side depth vs front height: within 5 %. Top width vs front width: within 5 %. (Orchid sheet: about 10 % by eye.) The pipeline can flag a sheet that fails, then regenerate.
- Same individual in all panels: same pattern, same fin shapes, same colours.
- A generated image is a plausible fish, not a measurement. For each species compare the side view's depth-to-length ratio and the top view's width-to-depth ratio with one real photo or the FishBase figure before trusting it.

## 5. Body types: what to add or watch

| Body type | Add / watch |
|---|---|
| Deep, laterally compressed (angelfish, tang, discus) | front view matters more (very thin); long dorsal/anal tips often leave the frame, leave room |
| Elongate (eel, pipefish, needlefish, loach) | the sheet gets very wide: allow a wider canvas, otherwise the side view is too small; top view widths are small and noisy |
| Flatfish, rays | different geometry (belly-down); this pipeline does not fit them, needs its own design |
| Long or trailing fins (betta, angel, gourami, lyretail) | draw the fins relaxed, not flared; tell the model the intended natural length; the top view will not show them |
| Translucent fins | clear dark gap between fin and body, or a stronger hue/brightness difference **[tested: the cause of most tuning]** |
| Barbels, spines, filaments | show clearly in side and front views; the plan format cannot yet model them |
| Pattern differs male/female | one sheet per sex |

## 6. Prompt template (adapt per species)

> Create a single reference sheet of an adult male **[species, common and scientific name]** on a pure black background, three panels: (1) a pure side view, nose pointing right, fish perfectly level; (2) directly below it, a pure top-down view of the same fish, nose at the same horizontal position as in (1), pectoral fins folded flat against the body; (3) below that, a head-on front view of the same fish, same scale.
> Orthographic, no perspective, flat even studio light, no shadows, no reflections, no glow, no text. All fins fully visible, mouth closed, eye clearly visible. The pelvic and anal fins hang clear of the belly with a visible dark gap. Same individual, same colours and pattern in every panel. Anatomically accurate **[add: body depth ≈ x % of length, thickness ≈ y % of depth, from the reference]**. Leave clear black space between the panels.

Second request, after you approve the sheet: "Edit panel (1) only: recolour it as a flat segmentation map, same geometry and framing: body mid-grey, dorsal fin red, anal fin green, tail fin blue, pectoral fin yellow, pelvic fin cyan, eye white; no texture, no shading, no outlines."

## 7. Acceptance checklist before sending a sheet to the pipeline

- [ ] Side and top panels share the same left and right ends (snout, tail tip).
- [ ] Panels do not touch; black gaps all round.
- [ ] Pectorals folded in the top view; pelvics clear of the belly in the side view.
- [ ] Depth/width numbers within 5 % between panels, and plausible against FishBase or a real photo.
- [ ] No rim glow or soft halo (it reads as fin).
- [ ] Flat colours on the label map, edges match the clean side view.
- [ ] Licence of the image tool noted for each sheet.

## 8. What the pipeline does with the sheet (for reference)

`fish-outline.py` (side: outline, fins) → `fish-topview.py` (widths) → `fish-thickfit.py` (thickness parameters) → `fish-cutout-card.py` (the card image) → data JSON + `src/art/photoart.ts`-style override. Per photo today it still needs two or three tuned settings (`--blue`, `--bright`, `--topend`); a label map is meant to remove them.
