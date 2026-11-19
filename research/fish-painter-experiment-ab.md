# Fish painter experiments A and B: flame angelfish (2026-11-19)

Branch `claude/dreamy-hopper-0acb3a`, tip `e5191178`. Design memo: `research/fish-painter-design.md` (section 8 set the scope and budget).
Nathan's verdict on the result: geometry "night and day better vs the RX2"; fin colours "really good".

## Result in one paragraph
The flame angelfish (`flameangel`) now has no code plan: it is built only from `src/data/fishart/flameangel.json` (+ `flameangel.grid.json`) by `planFromJson`
(`src/art/fishartjson.ts`). Body outline, five fin outlines, fin attachments, eye and the dark bars/patch were annotated by eye on one Commons photo.
Against the same annotation the silhouette overlap (IoU, body+fins together) is 0.99 for the new model and 0.75 for RX2's; contour error mean/95th percentile
is 0.5% / 1.4% of standard length versus 4.9% / 12.0%. CAVEAT: the new model is built from that annotation, so 0.99 only shows the loader and smoothing lose nothing;
whether the annotation matches the fish was judged by eye on the outline overlay (green over photo), which is the real test.

## The process (repeat this for the next species)
1. **Photo.** Wikimedia Commons API search (`generator=search`, `iiprop=extmetadata`) lists files with licence and author; download with `curl -sL` from
   `Special:FilePath/<name>?width=1400` into the scratchpad. Contact sheet of candidates (PIL), pick the truest lateral shot (CC BY or better).
   Used p1 = "Centropyge loricula, 2010.jpg", Andreas Maerz, CC BY 2.0; p2 = Brian Gratwicke, CC BY 2.0 (fetched, not annotated). Photos never enter the repo.
2. **Annotate by eye.** A copy of the photo with a 50 px grid and labelled axes; read off landmarks and outline points in photo pixels (about +-10 px, +-0.6% of length).
   Hidden parts (back and belly under the fins) are estimated and flagged in the JSON. Frame: `xTail`, `xSnout`, `yAxis` turn pixels into card units (u 0..1 tail tip to snout, v down).
3. **JSON** (`src/data/fishart/<art>.json`): `refs` (URL, author, licence), `frame`, `anatomy` (body polygon, fin outlines with `base`, roots, `thickness` flagged unmeasured),
   `look` (shade, tints, marks, `barPaths` in photo px, eye iris, gape, scale).
4. **Loader** `planFromJson`: every field required, a missing one throws with the JSON path. Only documented default: 3D `thick`. Body uses the existing `Plan.outline`;
   the new `Plan.fins` replaces the generated fin outlines (and paired-fin roots); `geometry()` samples outline plans at 48 stations instead of 16. `fish3d.ts` untouched.
5. **Overlay.** Dev server (`dev-alt`), console `await (await import('/scripts/overlay.js')).run()` posts transparent 1024 px cards of the JSON model and of RX2's old plan
   (kept in `overlay.js` as the baseline) to `/__shot`; `python scripts/overlay.py <photo> <outdir>` aligns each to the photo (similarity from snout tip and peduncle centre),
   writes `OVL-compare.png` (photo | new | RX2) and `OVL-outline.png` (annotation green, model magenta) and prints IoU / contour error / per-fin coverage. No scipy needed.
6. **3D check.** `review.html`, filter "flame angel": side, 3/4, front and top views fine. Do not press Record there (136 models show "changed", unrelated).
7. **Experiment B.** New `path` mark: ribbon through `[u, t, w]` points, `t` = share of local body depth (back 0 .. belly 1), so it follows the body (`bodyPt`, `pathMark` in
   `fishgen.ts`); body marks only. Bars annotated as px polylines with widths in `look.barPaths`, converted by the loader.
8. **Fin colour grid** (Nathan's idea, after seeing B). `python scripts/fingrid.py <photo> flameangel.json flameangel.grid.json` stores the mean photo colour of every 30x12 px
   cell inside each median fin (dorsal, anal, caudal; 200-300 cells each, colours only). Painted under the fin marks, slightly oversize and blurred. This replaced the single blue tint
   and the vertical dark bars: blue-purple now sits only in the rear stripes, which run horizontally.
9. **Housekeeping.** `GEN_BODYVOLUME=1 npx vitest run test/bodymass.test.ts` regenerated `bodyvolume.json` (flameangel 104.4 to 77.6 cm3). Tests run: the six files that import
   `fishgen` (all pass after the regen); no full suite.

## Commits
`55f55ea5` experiment A (JSON, loader, overlay scripts) · `5322899e` bodyvolume regen · `52401def` experiment B (path mark, bar paths) · `e5191178` fin colour grid.

## Token cost (rough)
Not metered per step. This session: about 95 turns, context ending near 206 K tokens (21% of the window), about 45 tool calls plus a dozen small images. Estimate roughly
1-2 M weighted tokens for A + B + the grid (raw cache re-reads about 10 M, weighted down heavily), under the 3-5 M budget for A alone. Account at the end: weekly all-models 82%, 5-hour 4%.
Biggest single costs: reading the memo and `fishgen.ts` once (~40 K), the gridded photo and four overlay pictures (a few K each), the review page render wait.

## Known weaknesses / not done
- Annotation is by eye, one photo, one individual of unknown sex; the second photo was only used to cross-check by eye.
- 3D thickness unmeasured (RX2's 0.34 kept); front and top views are plausible, not validated.
- Fin grid: stripes softer than the photo (12 px rows plus blur); the tail is muddy because the real tail is translucent and the background leaked into the sample.
- Bars end in round caps inside the body instead of fading into the back and belly; the small spots on the back and the red head are not drawn.
- Pectoral and pelvic fins still flat colour; no scoring framework, no hard gates (as agreed).

## Recommendation
Go for Experiment C (kole tang, pajama cardinal, with the tailspot blenny as the regression baseline) using this process; budget per species should be well under the A+B total because loader, overlay and grid tooling now exist.
Add: a flag in the loader for translucent fins (skip grid cells near the background), and an annotation tool page later if by-eye annotation proves the bottleneck.

## Experiment C addendum (2026-11-19): pajama cardinalfish and kole tang
Branch `claude/fishpainter-c` (cut from origin/main build 2401). Same process; new general marks only (all body-relative, no per-species code): `scatter`
(irregular spots with minimum spacing, size trend, optional ring), `lines` (fine parallel lines at constant depth share, sway, taper, rim fade), `grad` (multi-stop
colour along the body). Loader now handles optional dorsal2, pectoral and pelvic, a `look.extra` block of raw Plan fields, and a per-species fin colour grid
(cell = 1.9% x 0.75% of total length). Both TS plans removed; `JSON_PLANS` holds flameangel, pajamacardinal, koletang.
- **Pajama cardinal** (iNaturalist-free: Commons "Pajama cardinal fish Sphaeramia nematoptera (cropped).jpg", CC BY 2.0): photo mirrored and levelled 11.8 deg (fish pitched nose-down); IoU 0.98 vs 0.68 for the old plan, contour mean/p95 0.16/0.53 vs 4.8/13.7 % of SL. Band = body-relative path; spots = scatter.
- **Kole tang** (iNaturalist observation 248985408, robin_dive_diva, CC BY; Commons photos were unreachable, HTTP 429 for 20+ minutes, and the two Commons photos in hand were too dark to annotate): IoU 0.985 vs 0.72, contour 0.31/0.89 vs 5.3/10.7. Fine flank lines = `lines`; yellow eye ring via iris colours.
- **Regression baseline**: the tailspot blenny's 1024 px card pixel hash (scripts/card.js) is identical before and after (8365491). It was not migrated.
- `bodyvolume.json` regenerated (koletang 106.8 to about 139 cm3, pajamacardinal 10.6 to 10.0 cm3). 3D side, 3/4, front and top views checked on the review page for both: no visible regression.
- Weaknesses: single photo each, sex not distinguishable (no sexual dimorphism recorded for either, one look); thickness unmeasured; the pajama band is a flat dark ribbon, not the scale net of the photo; kole lines are statistical, not traced; kole peduncle and rear belly are guesses (dark photo); pectoral of the pajama is hidden in the photo and not drawn; pelvic fins are flat colour.
- Commons rate limit note: batch downloads from commons.wikimedia.org (API and Special:FilePath) trigger HTTP 429 quickly; fetch one file at a time with a pause, or use iNaturalist (`api.inaturalist.org/v1/observations`, filter `photo_license=cc-by,cc-by-sa,cc0`, original-size URL by replacing `square` with `original`).
