<!-- invert sheet test m1, astrea snail, 2026-11-28; scripts/invert-sheet-prompts.py -->
Create a scientifically accurate orthographic reference sheet of a single adult astrea snail (Lithopoma tectum) for 3D model reconstruction.

PRIMARY OBJECTIVE

This is a technical reconstruction reference, not a collection of separate illustrations.

Every view must represent the exact same rigid three-dimensional specimen, with identical proportions, attachment positions, anatomical landmarks, and coloration.

Priority order:

1. Accurate species anatomy and proportions.
2. Exact silhouette consistency between matching views.
3. Correct geometry and attachment of the shell, foot, head and tentacles.
4. Consistent anatomical landmarks and coloration.
5. Surface detail and illustration quality.

If any requirements conflict, prioritize geometry over visual appearance.
CANVAS AND LAYOUT

* Portrait canvas, 2:3 width-to-height ratio.
* Pure black (#000000) background.
* Five horizontal rows separated by at least 3% of the canvas height of empty black space.
* Rows 3 and 4 contain two views side by side, separated by black space.
* All views use exactly the same physical scale.
* No perspective distortion, labels, rulers, borders, shadows, or additional objects.
* Side, front, top and bottom views are true orthographic elevations with the camera level with the axis: no three-quarter angle, no tilt, no dorsal surface showing in a side view.
* Scale lock: the body length in every top or bottom view equals the body length in the side view, and the width in every front view equals the width in the top view. Never enlarge or shrink a view to fill its row.
* Keep every part within its assigned view area.
* Center the views consistently.

MASTER GEOMETRY — MOST IMPORTANT
First establish one anatomically accurate three-dimensional specimen. All five rows must be derived from it.

* Adult shell height 1 inch; shell height approximately equal to its width.
* Pyramid-shaped conical shell of about 6 whorls; each whorl carries oblique axial folds that make a wavy, star-like edge when seen from the apex.
* Base almost flat with fine spiral threads; round aperture closed by a thick, white, oval calcareous operculum carried on the back of the foot.
* The animal: a broad foot, a short snout, two tentacles.
MASTER COLORATION
Natural colouring, slightly subdued, not neon-saturated.

Shell: greenish-grey to olive-tan, the folds a little paler; base cream. Operculum white. Foot and head olive-grey with fine darker mottling.
* Show the colours as in a well-lit aquarium photograph of a healthy adult: do not darken, desaturate, or tint them toward brown or grey. A darker or duller rendering is wrong.
* Surfaces as on the live animal: glossy where it is glossy, smooth where it is smooth. Do not add hair, granules, or bumps the species does not have.

Color boundaries must wrap continuously over the three-dimensional form, remaining consistent in all projections.
ROW 1 — SIDE VIEW, CRAWLING (MASTER)
True orthographic side elevation from the animal's left, head pointing right, the sole flat on an invisible horizontal line, shell carried as when crawling, operculum visible on the back of the foot behind the shell. This view establishes the master silhouette.
ROW 2 — SIDE SEGMENTATION MAP
An exact pixel-aligned duplicate of row 1 recolored flat: shell grey (#808080), aperture lip and visible shell interior white (#FFFFFF), foot yellow (#FFFF00), head, snout and tentacles blue (#0000FF), operculum cyan (#00FFFF), eyes red (#FF0000). No texture, outlines or shading.
ROW 3 — SHELL ALONE: APERTURE VIEW AND BACK VIEW
Two views side by side, separated by black space, the empty shell with the animal removed, apex up, shell axis vertical. Left: aperture facing the viewer. Right: the same shell turned 180 degrees about its vertical axis. Same scale and height as each other and as the shell in row 1.
ROW 4 — SHELL ALONE: APEX AND BASE
Two views side by side, separated by black space. Left: straight down on the apex. Right: straight up at the base and aperture. Same diameter as each other.
ROW 5 — SOLE VIEW
The crawling snail of row 1 seen from directly below, as through aquarium glass: the sole of the foot, head and tentacles, the shell's rim around it. Head pointing right.
FINAL GEOMETRIC VALIDATION
Before rendering, verify:

* The same shell (size, whorl count, coil direction and pattern) in every row.
* The shell is right-handed (dextral): with the apex up and the aperture facing the viewer, the aperture is on the right.
* Identical physical scale across all views; the shell diameter in row 4 equals the shell width in row 3.
* The segmentation map is a recoloring of row 1, not a new drawing.
