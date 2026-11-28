"""Invert reference-sheet prompts, one per body plan (sheet test, Nathan 2026-11-28: "lets do a sheet test for each
unique kind of body shape just to check how well it works"). Writes research/invert-sheets/prompts/<id>-t1.md and
C:/Users/nreed/fish-sheets/<id>-inv1-gen/prompt.txt (the sheet queue's folder layout). The shared header is build B's
method block, reworded only where it named fins; each plan has its own rows. See research/invert-model-method.md.
  python -I scripts/invert-sheet-prompts.py
"""
import os

HEAD = """Create a scientifically accurate orthographic reference sheet of a single adult {common} ({sci}) for 3D model reconstruction.

PRIMARY OBJECTIVE

This is a technical reconstruction reference, not a collection of separate illustrations.

Every view must represent the exact same rigid three-dimensional specimen, with identical proportions, attachment positions, anatomical landmarks, and coloration.

Priority order:

{prio}

If any requirements conflict, prioritize geometry over visual appearance.
CANVAS AND LAYOUT

* Portrait canvas, 2:3 width-to-height ratio.
* Pure black (#000000) background.
* Five horizontal rows separated by at least 3% of the canvas height of empty black space.
{layout}* All views use exactly the same physical scale.
{proj}
{fixc}* Keep every part within its assigned view area.
* Center the views consistently.

MASTER GEOMETRY — MOST IMPORTANT
First establish one anatomically accurate three-dimensional specimen. All five rows must be derived from it.

{geometry}
{pose}MASTER COLORATION
Natural colouring, slightly subdued, not neon-saturated.

{color}
{fixk}
Color boundaries must wrap continuously over the three-dimensional form, remaining consistent in all projections.
{rows}{check}"""

PRIO = """1. Accurate species anatomy and proportions.
2. Exact silhouette consistency between matching views.
3. Correct geometry and attachment of {parts}.
4. Consistent anatomical landmarks and coloration.
5. Surface detail and illustration quality."""
# Crustaceans (from Nathan's emerald crab rewrite, 2026-11-28, R207: "it was printing wrong before"): the appendage
# count and orientation get their own priority, a stated count per side in order, a fixed symmetric pose, and a final
# checklist. Every crustacean prompt uses these; `appendages`, `pose` and `check` are per species.
PRIO_CRUST = """1. Accurate species anatomy and proportions.
2. Correct bilateral symmetry, appendage count, and anatomical orientation.
3. Exact silhouette consistency between matching views.
4. Correct geometry and attachment of {parts}.
5. Consistent anatomical landmarks and coloration.
6. Surface detail and illustration quality."""
POSE_CRUST = """MASTER POSE AND SYMMETRY
Establish a natural, approximately bilaterally symmetrical standing pose.

{pose}
* Limb joint angles remain unchanged between every projection.
* The left and right appendage arrangements mirror one another across the longitudinal body centerline.

The orientation of the body, eyes and every appendage must always agree. Never rotate the body independently of its appendages.
"""
CHECK_CRUST = """FINAL GEOMETRIC VALIDATION
Before rendering, verify:

{check}
* No independently rotated body parts.
* Identical physical scale across all views.
* Every segmentation map is a recoloring of its natural view, not a separately generated animal.
* All views represent one anatomically coherent specimen in one fixed pose.
"""

SHEETS = {
    'trochus': dict(common='banded trochus snail', sci='Trochus sp.', parts='the shell, foot, head and tentacles', layout='', geometry="""* Adult shell height 1.5 inches.
* Shell height approximately 90% of shell width; apical angle approximately 60 degrees.
* A straight-sided cone of about 8 flat-sided whorls with shallow sutures; flat base with a sharp outer edge (periphery).
* Each whorl carries 4 to 5 spiral cords made of small round beads.
* Aperture oblique and roughly four-sided, opening down onto the foot; pearly white inside.
* Foot a muscular sole as long as the shell is wide, head with two slender tentacles and eyes on short stalks at their bases.
* Not a rounded turban or globe shape; not a smooth shell.""", color="""Shell: cream to pale greenish-cream ground with broad oblique maroon-red flames running down across each whorl, broken into blotches by the beaded cords. Base: cream with thin radial red-brown streaks. Foot and head: mottled grey-olive with fine dark lines; tentacles grey.""", rows="""ROW 1 — SIDE VIEW, CRAWLING
Orthographic side elevation, head pointing right, the sole flat on a horizontal line, shell axis tilted back about 20 degrees as when crawling. Tentacles extended forward. This view establishes the master silhouette.
ROW 2 — SHELL ALONE, APERTURE VIEW
The same shell without the animal, apex up, shell axis vertical, aperture facing the viewer. Same scale.
ROW 3 — SHELL ALONE, BACK VIEW
The same shell rotated 180 degrees about its vertical axis (aperture facing away). Same scale and height as row 2.
ROW 4 — TOP AND BASE, SIDE BY SIDE
Left: the shell seen straight down on the apex. Right: the shell seen straight up at the base and aperture. Same scale.
ROW 5 — SOLE VIEW
The crawling snail seen from directly below through glass: the sole of the foot, head and tentacles, the shell's rim around it. Head pointing right."""),
    'peppermint': dict(common='peppermint shrimp', sci='Lysmata wurdemanni', parts='the legs, antennae, rostrum and tail fan', layout='* Row 4 contains two views side by side, separated by black space.\n', geometry="""* Adult body length 2 inches from the rostrum tip to the end of the tail fan.
* Carapace approximately 38% of the body length without the rostrum; six abdominal segments; tail fan of a telson and two uropods each side.
* Abdomen arched at the third segment, the tail carried a little lower than the carapace.
* Short toothed rostrum, stalked eyes, a pair of long antennae approximately 1.5 times the body length, short forked antennules.
* Five pairs of thin walking legs, the second pair long and thin; small swimmerets under the abdomen.
* A slender caridean shrimp; not a lobster or prawn, no large claws.""", color="""Body clear and glassy with a faint pink-amber cast; the internal organs show as a warm orange shadow under the carapace. Thin red lines run lengthwise along the abdomen (about four each side) and across it at every segment rim; oblique red lines on the carapace. Legs clear, ringed red; antennae red. Eyes amber with a dark centre. Tail fan clear with red lines.""", rows="""ROW 1 — MASTER SIDE VIEW
Left-side orthographic elevation, head pointing right, standing on its walking legs on a horizontal line, antennae swept back over the body. This view establishes the master silhouette.
ROW 2 — SIDE BODY, APPENDAGES REMOVED
The exact same body as row 1 at the same scale and position, with every leg, swimmeret, antenna and antennule removed at its base. Keep the rostrum, eyes and tail fan. A subtraction, not a new drawing.
ROW 3 — TOP VIEW, APPENDAGES REMOVED
A true orthographic dorsal projection of the body from row 2, head pointing right, the tail fan spread flat.
ROW 4 — FRONT VIEW AND SEGMENTATION MAP
Left: the full shrimp seen from the front. Right: the same silhouette recolored flat: body grey (#808080), walking legs yellow (#FFFF00), antennae and antennules blue (#0000FF), eyes white (#FFFFFF).
ROW 5 — SIDE SEGMENTATION MAP
An exact duplicate of row 1 recolored flat: body grey (#808080), walking legs yellow (#FFFF00), swimmerets cyan (#00FFFF), antennae and antennules blue (#0000FF), tail fan green (#00FF00), eyes white (#FFFFFF). No texture or outlines."""),
    'emeraldcrab': dict(common='emerald crab', sci='Mithraculus sculptus', parts='the claws, walking legs and eyes', layout='* Row 4 contains two views side by side, separated by black space.\n', geometry="""* Adult carapace width 1.5 inches.
* Carapace wider than long (length approximately 80% of width), rounded in front, low and gently domed, with low bumps and a short notched front between the eyes.
* Two equal claws with spoon-shaped, hollowed fingertips; four pairs of walking legs with short hairs, spread to the sides.
* Eyes on short stalks set in sockets at the front corners.
* A spider-crab relative with a compact body; not a long-legged spider crab, not a swimming crab.""", color="""Carapace and legs deep green with darker green mottling; walking legs faintly banded lighter green. Claw fingertips white with black edges at the spoon. Eyes dark. Underside paler green-cream.""", rows="""ROW 1 — TOP VIEW, MASTER
Orthographic dorsal view, front pointing right, legs in a natural resting spread, claws forward. This view establishes the master silhouette.
ROW 2 — TOP VIEW, LEGS REMOVED
The exact same carapace as row 1, every leg and both claws removed at their bases. A subtraction, not a new drawing.
ROW 3 — SIDE VIEW
Left-side orthographic elevation, front pointing right, standing on its legs on a horizontal line.
ROW 4 — FRONT VIEW AND SEGMENTATION MAP
Left: the crab seen from the front, standing. Right: the same silhouette recolored flat: body grey (#808080), claws red (#FF0000), walking legs yellow (#FFFF00), eyes white (#FFFFFF).
ROW 5 — UNDERSIDE
The crab seen from directly below, front pointing right, legs as in row 1."""),
    'scarlethermit': dict(common='scarlet reef hermit crab', sci='Paguristes cadenati', parts='the shell, claws, walking legs, antennae and eyes', layout='* Row 4 contains two views side by side, separated by black space.\n', geometry="""* Adult in a cerith-type snail shell 1.5 inches long (a tall, many-whorled spire).
* The crab comes out of the aperture: two near-equal claws, two pairs of walking legs reaching the ground, eyes on long stalks, long antennae; the soft abdomen stays inside the shell.
* The shell lies on its side and is dragged with the spire pointing back and up.""", color="""Crab: claws and legs solid scarlet red; eyestalks yellow with dark eyes; antennae orange-red. Shell: a plain worn cream-brown snail shell, slightly encrusted.""", rows="""ROW 1 — SIDE VIEW, MASTER
Left-side orthographic elevation, crab facing right, walking, shell behind it. This view establishes the master silhouette.
ROW 2 — CRAB ALONE, SIDE
The same crab at the same scale and position with the shell removed, abdomen curled as it sits in the shell.
ROW 3 — TOP VIEW
Orthographic dorsal view of the crab in its shell, facing right.
ROW 4 — FRONT VIEW AND SEGMENTATION MAP
Left: crab in shell seen from the front. Right: the same silhouette recolored flat: shell grey (#808080), claws red (#FF0000), walking legs yellow (#FFFF00), eyestalks and antennae blue (#0000FF), crab body cyan (#00FFFF).
ROW 5 — SHELL ALONE, APERTURE VIEW
The empty shell, apex up, aperture facing the viewer."""),
    'tuxedourchin': dict(common='tuxedo urchin', sci='Mespilia globulus', parts='the spines and the bare bands of the test', layout='* Row 4 contains two views side by side, separated by black space.\n', geometry="""* Adult test diameter 2 inches, height approximately 60% of the diameter: a flattened globe.
* Ten meridian zones from the mouth (bottom centre) to the top: five covered with rows of short, even spines (spine length approximately 10% of the diameter) and five bare, alternating.
* Short tube feet between the spines on the lower half.
* Not a long-spined urchin; spines short and dense.""", color="""Bare zones iridescent blue to teal with fine darker stippling. Spines dark red-brown to near black, the tips slightly paler. Mouth area dark.""", rows="""ROW 1 — SIDE VIEW, MASTER
Orthographic side elevation, resting on a horizontal line. This view establishes the master silhouette.
ROW 2 — SIDE VIEW, SPINES REMOVED
The exact same test as row 1 with every spine removed, showing the bare test with its zone pattern. A subtraction, not a new drawing.
ROW 3 — TOP VIEW
Straight down on the top centre, showing the five spined and five bare zones meeting.
ROW 4 — BOTTOM VIEW AND SEGMENTATION MAP
Left: straight up at the mouth side. Right: the row 3 view recolored flat: spined zones red (#FF0000), bare zones blue (#0000FF), top centre white (#FFFFFF).
ROW 5 — ONE SPINE ROW, CLOSE
A short strip of one spined zone at 4 times the scale, seen from the side, showing spine shape, spacing and colour."""),
    'zoanthid': dict(common='zoanthid colony (button polyp)', sci='Zoanthus sp., dragon-eye colour form', parts='the polyps, oral discs and tentacles', layout='* Rows 1 and 4 contain two views side by side, separated by black space.\n', geometry="""* Each polyp: a short cylindrical column, an oral disc 0.4 inches across at its top, and a fringe of about 26 short pointed tentacles in two alternating lengths around the rim.
* Column height approximately 60% of the disc diameter, slightly flared under the disc.
* Polyps packed so the discs nearly touch, rising from a thin shared mat on the rock.
* Not a mushroom coral, not an anemone (no long tentacles).""", color="""Oral disc in rings: a grey-lavender oval mouth, a rust-orange inner disc darkening to red-brown outward, a pale lavender ring near the rim; tentacles bright green with paler tips. Column brown-orange. Rock grey-brown.""", rows="""ROW 1 — ONE POLYP, OPEN: TOP AND SIDE
Left: one open polyp seen straight down on the oral disc, mouth centred. Right: the same polyp from the side, disc level. These views establish the master polyp.
ROW 2 — ONE POLYP, OPEN, DISC SEGMENTATION MAP
The row 1 top view recolored flat: mouth white (#FFFFFF), inner disc red (#FF0000), outer disc blue (#0000FF), pale ring yellow (#FFFF00), tentacles green (#00FF00).
ROW 3 — ONE POLYP, CLOSED
The same polyp closed (tentacles folded in, disc contracted), from the side.
ROW 4 — SMALL COLONY: TOP AND SIDE
Left: about 20 polyps on a flat patch of rock seen from above. Right: the same patch from the side.
ROW 5 — COLONY ON A ROCK
A colony covering the top and sides of a fist-sized rock, orthographic side view."""),
}

EMERALD_NATHAN = "Create a scientifically accurate orthographic reference sheet of a single adult emerald crab (Mithraculus sculptus) for 3D model reconstruction.\nPRIMARY OBJECTIVE\nThis is a technical reconstruction reference, not a collection of separate illustrations.\n\nEvery view must represent the exact same rigid three-dimensional specimen, with identical proportions, attachment positions, anatomical landmarks, limb articulation, and coloration.\n\nPriority order:\n\n1. Accurate species anatomy and proportions.\n2. Correct bilateral symmetry, appendage count, and anatomical orientation.\n3. Exact silhouette consistency between matching views.\n4. Correct geometry and attachment of the claws, walking legs, and eyes.\n5. Consistent anatomical landmarks and coloration.\n6. Surface detail and illustration quality.\n\nIf any requirements conflict, prioritize geometry over visual appearance.\nCANVAS AND LAYOUT\n\n* Portrait canvas, 2:3 width-to-height ratio.\n* Pure black (#000000) background.\n* Five horizontal rows separated by at least 3% of the canvas height of empty black space.\n* Row 4 contains two views side by side, separated by black space.\n* All views use exactly the same physical scale.\n* Strict orthographic projection without perspective distortion.\n* No labels, rulers, borders, shadows, ground lines, or additional objects.\n* Keep every body part within its assigned view area.\n* Center the views consistently.\n\nMASTER GEOMETRY — MOST IMPORTANT\nFirst establish one anatomically accurate three-dimensional specimen. All views must be derived from this specimen without changing its pose.\nCarapace\n\n* Adult carapace width: 1.5 inches.\n* Carapace length: approximately 1.2 inches.\n* Carapace width is measured perpendicular to the anterior-posterior body axis.\n* Carapace is wider than it is long.\n* Broad, rounded, compact carapace with a low, gently domed profile.\n* Characteristic sculptured surface with shallow grooves, low bumps, and irregular lateral margins.\n* Short, notched frontal margin between the eyes.\n\nAppendages\nThe crab has exactly ten primary appendages:\n\n* One pair of chelipeds (claw-bearing limbs).\n* Four pairs of walking legs.\n\nEach side of the body has exactly five appendages, attached in the following order from anterior to posterior:\n\n1. Cheliped.\n2. First walking leg.\n3. Second walking leg.\n4. Third walking leg.\n5. Fourth walking leg.\n\nAll appendages originate from anatomically appropriate sockets beneath the lateral margins of the carapace.\n\n* Two approximately equal, robust claws with blunt, hollowed, spoon-shaped fingertips characteristic of emerald crabs.\n* Four pairs of moderately short, jointed walking legs covered with fine hairs.\n* Walking legs extend laterally from the body, with the posterior legs angled slightly backward.\n* All walking-leg tips terminate in pointed dactyls, not paddles.\n* Two dark eyes on short stalks seated in sockets at the anterior corners of the carapace.\n* Small, anatomically appropriate mouthparts beneath the frontal margin.\n\nThis is a compact marine crab, not a long-legged spider crab, swimming crab, lobster, or hermit crab.\nMASTER POSE AND SYMMETRY\nEstablish a natural, approximately bilaterally symmetrical standing pose.\n\n* Both claws extend forward, slightly outward from the body.\n* All eight walking legs spread naturally to the sides.\n* The body is elevated slightly above the supporting surface.\n* Limb joint angles remain unchanged between every projection.\n* The left and right appendage arrangements mirror one another across the longitudinal body centerline.\n\nThe orientation of the carapace, eyes, claws, and walking legs must always agree. Never rotate the carapace independently of its appendages.\nMASTER COLORATION\nNatural coloration, slightly subdued, not neon-saturated.\n\n* Carapace: deep emerald green with irregular darker green mottling.\n* Walking legs: green with subtle lighter green banding and fine hairs.\n* Claws: deep green with pale ivory spoon-shaped fingertips and subtle dark edging.\n* Eyes: dark brown-black.\n* Underside: paler green-cream with visible anatomical plates and sutures.\n\nColor boundaries must wrap continuously over the three-dimensional form and remain consistent in all projections.\n\nUse detailed scientific natural-history illustration with crisp anatomical boundaries, restrained shading, and realistic surface textures.\nROW 1 — DORSAL VIEW, MASTER\nStrict orthographic view from directly above.\n\n* Anterior end pointing toward the top of the canvas.\n* Posterior end pointing toward the bottom.\n* Bilateral symmetry axis oriented vertically.\n* Both eyes positioned at the top of the carapace.\n* Both claws extend upward and slightly outward.\n* Exactly four walking legs extend from the left side.\n* Exactly four walking legs extend from the right side.\n* Walking legs fan outward and slightly backward.\n* Carapace is visibly wider horizontally than it is tall vertically.\n\nThe complete specimen should have a coherent, approximately symmetrical silhouette.\n\nThis view establishes the master geometry and pose for every subsequent view.\nROW 2 — DORSAL VIEW, APPENDAGES REMOVED\nAn exact geometric duplicate of the carapace in Row 1, with both chelipeds and all eight walking legs removed at their attachment points.\n\n* Same upward-facing orientation.\n* Identical carapace dimensions, outline, eyes, surface details, and coloration.\n* Preserve the anatomical attachment regions.\n* Do not rotate, reshape, rescale, or reinterpret the carapace.\n\nThis is a subtraction from Row 1, not a new illustration.\nROW 3 — LEFT SIDE VIEW\nStrict orthographic elevation from the specimen's left side.\n\n* Anterior end pointing right.\n* Posterior end pointing left.\n* Show the low, gently domed carapace profile.\n* Show the correct vertical relationship between the carapace, underside, eyes, claws, and walking-leg attachment points.\n* Walking legs support the body in the same standing pose established in Row 1.\n* Far-side appendages may be naturally occluded by near-side anatomy.\n* All visible walking-leg tips contact a common invisible horizontal ground plane.\n\nDo not draw the ground plane.\nROW 4 — FRONT VIEW AND SEGMENTATION MAP\nTwo views side by side.\nLeft: Natural front view\nStrict orthographic view looking directly at the anterior end of the crab.\n\n* Bilaterally symmetrical silhouette.\n* Both eyes visible.\n* Both claws visible in their established positions.\n* Walking legs extend outward on both sides.\n* Show the true body width and height.\n* Maintain the exact master pose and physical scale.\n* No three-quarter perspective or visibility of the dorsal surface beyond what is geometrically appropriate.\n\nRight: Segmentation map\nAn exact pixel-aligned duplicate of the natural front view, translated horizontally and recolored using solid flat colors:\n\n* Body and mouthparts: grey (#808080).\n* Both complete chelipeds: red (#FF0000).\n* All walking legs: yellow (#FFFF00).\n* Eyes and eye stalks: white (#FFFFFF).\n* Background: black (#000000).\n\nPreserve all silhouette boundaries, occlusion relationships, joint positions, and proportions.\n\nNo gradients, outlines, textures, or shading in the segmentation map.\n\nThe segmentation map must be a recoloring of the natural front view, not a separately generated crab.\nROW 5 — VENTRAL VIEW\nStrict orthographic view from directly below.\n\n* Anterior end pointing toward the top of the canvas.\n* Posterior end pointing toward the bottom.\n* Bilateral symmetry axis oriented vertically.\n* Both claws extend upward and slightly outward.\n* Exactly four walking legs extend from each side.\n* Preserve the master limb arrangement, accounting for the mirrored projection when viewed from below.\n* Show the ventral sternum, folded abdominal apron, mouthparts, limb bases, and anatomical plate boundaries.\n* Underside coloration is pale green-cream.\n\nThe ventral view must be geometrically consistent with the dorsal view, not a newly posed specimen.\nFINAL GEOMETRIC VALIDATION\nBefore rendering, verify:\n\n* Exactly two claws and eight walking legs.\n* Exactly five primary appendage attachment points per side.\n* Eyes and claws are located at the same anterior end.\n* Dorsal and ventral views face upward.\n* Side view faces right.\n* Carapace is wider than it is long.\n* Walking legs emerge from the lateral sides, not the anterior or posterior ends.\n* No independently rotated body parts.\n* Identical physical scale across all views.\n* Identical carapace silhouette in Rows 1 and 2.\n* Identical natural and segmentation silhouettes in Row 4.\n* All views represent one anatomically coherent specimen in one fixed pose.\n"

# The crab template (R207): Nathan's own rewrite, word for word; it made emeraldcrab-inv1-gen/sheet.webp. New crabs copy
# it and change only the species facts (name, sizes, carapace, claw shape, colours). Source:
# C:/Users/nreed/fish-sheets/emeraldcrab-inv1-gen/prompt-nathan-2026-11-28.txt (prompt.txt there is the original t1).
SHEETS['emeraldcrab'] = dict(common='emerald crab', sci='Mithraculus sculptus', note=', Nathan rewrite (R207), the crab template', raw=EMERALD_NATHAN)

# t2 crustacean prompts with the crab template's general blocks (appendage count per side in order, fixed symmetric
# pose, strict orthographic / no ground lines, final checklist). The t1 sheets of both were already made, so these are
# written for a redo and not queued.
SHEETS['peppermint_t2'] = dict(SHEETS['peppermint'], id='peppermint', ver='t2', noqueue=True, appendages="""The shrimp has exactly these paired appendages, each side mirroring the other:

* One pair of long antennae (approximately 1.5 times the body length) and one pair of short forked antennules, from the front of the head.
* Five walking legs per side under the carapace, in order from front to back: 1. a short leg with a tiny pincer; 2. a long, thin leg with a tiny pincer; 3, 4 and 5. thin walking legs ending in pointed tips.
* Five small swimmerets per side under abdominal segments 1 to 5.
* Tail fan: one central telson and two uropods per side.

No large claws.""", pose="""* Standing on walking legs 3, 4 and 5 on each side, their tips on one invisible horizontal ground plane.
* Legs 1 and 2 held forward under the head.
* Antennae swept back over the body, both on the same arc.
* Tail fan spread flat.""", check="""* Exactly five walking legs per side, the second pair the longest.
* Exactly two long antennae and two antennules.
* Eyes, rostrum and antennae at the same front end; the tail fan at the rear.
* Side views face right.
* Identical body silhouette in rows 1 and 2.""")
SHEETS['scarlethermit_t2'] = dict(SHEETS['scarlethermit'], id='scarlethermit', ver='t2', noqueue=True, appendages="""Outside the shell the crab shows exactly these appendages, each side mirroring the other:

* One cheliped (claw) per side, the two near equal in size.
* Two walking legs per side behind the claws, reaching the ground.
* The last two leg pairs are small and stay inside the shell; do not draw them.
* One eye on a long stalk per side, one long antenna and one short antennule per side.""", pose="""* Claws held forward in front of the aperture, close together.
* The four walking legs reach forward and down, their tips on one invisible horizontal ground plane.
* The shell lies on its side behind the crab, spire pointing back and up.""", check="""* Exactly two claws and four walking legs outside the shell.
* Eyes and claws at the same front end, facing out of the aperture.
* Side views face right.
* The shell is the same shell, same size and coil direction, in every row.""")


# ---------- Milestone batch m1 (the 20 milestone inverts, hybrid method approved by Nathan 2026-11-28: "Yes, hybrid") ----------
# Fixes from judging the six t1 sheets (research/invert-model-method.md, sheet test results), in every m1 prompt:
#  colours drifted darker or wrong (trochus, zoanthid, urchin) -> colours stated in words and kept at photo brightness;
#  the crab's "side" came out 3/4 -> true elevations, camera level; the urchin's top view came out 25% small and the
#  shrimp's 11% long -> the scale lock is spelled out per view; the hermit's empty shell changed -> same shell every
#  row; the trochus sheet had no map -> every sheet has a segmentation map row. Crustaceans use Nathan's crab blocks.
# Commons photo references per species: research/invert-sheets/refs-m1.md (for the colour check after the sheet).
FIX_CANVAS = """* Side, front, top and bottom views are true orthographic elevations with the camera level with the axis: no three-quarter angle, no tilt, no dorsal surface showing in a side view.
* Scale lock: the body length in every top or bottom view equals the body length in the side view, and the width in every front view equals the width in the top view. Never enlarge or shrink a view to fill its row.
"""
FIX_COLOR = """* Show the colours as in a well-lit aquarium photograph of a healthy adult: do not darken, desaturate, or tint them toward brown or grey. A darker or duller rendering is wrong.
* Surfaces as on the live animal: glossy where it is glossy, smooth where it is smooth. Do not add hair, granules, or bumps the species does not have.
"""

SNAIL_ROWS = """ROW 1 — SIDE VIEW, CRAWLING (MASTER)
True orthographic side elevation from the animal's left, head pointing right, the sole flat on an invisible horizontal line, shell carried as when crawling, {animal_pose} This view establishes the master silhouette.
ROW 2 — SIDE SEGMENTATION MAP
An exact pixel-aligned duplicate of row 1 recolored flat: shell grey (#808080), aperture lip and visible shell interior white (#FFFFFF), foot yellow (#FFFF00), head, snout and tentacles blue (#0000FF), {map_extra}eyes red (#FF0000). No texture, outlines or shading.
ROW 3 — SHELL ALONE: APERTURE VIEW AND BACK VIEW
Two views side by side, separated by black space, the empty shell with the animal removed, apex up, shell axis vertical. Left: aperture facing the viewer. Right: the same shell turned 180 degrees about its vertical axis. Same scale and height as each other and as the shell in row 1.
ROW 4 — SHELL ALONE: APEX AND BASE
Two views side by side, separated by black space. Left: straight down on the apex. Right: straight up at the base and aperture. Same diameter as each other.
ROW 5 — SOLE VIEW
The crawling snail of row 1 seen from directly below, as through aquarium glass: the sole of the foot, head and tentacles, the shell's rim around it. Head pointing right."""
SNAIL_CHECK_TXT = """FINAL GEOMETRIC VALIDATION
Before rendering, verify:

* The same shell (size, whorl count, coil direction and pattern) in every row.
* The shell is right-handed (dextral): with the apex up and the aperture facing the viewer, the aperture is on the right.
* Identical physical scale across all views; the shell diameter in row 4 equals the shell width in row 3.
* The segmentation map is a recoloring of row 1, not a new drawing.
"""


def snail(k, common, sci, geometry, color, animal_pose, map_extra=''):
    rows = SNAIL_ROWS.format(animal_pose=animal_pose, map_extra=map_extra)
    return dict(common=common, sci=sci, ver='m1', fix=True, parts='the shell, foot, head and tentacles',
                layout='* Rows 3 and 4 contain two views side by side, separated by black space.\n', geometry=geometry, color=color,
                rows=rows + '\n' + SNAIL_CHECK_TXT)


SHRIMP_ROWS = """ROW 1 — MASTER SIDE VIEW
True orthographic elevation from the left side, head pointing right, standing on its walking legs, {ant} This view establishes the master silhouette.
ROW 2 — SIDE BODY, APPENDAGES REMOVED
The exact same body as row 1 at the same scale and position, with every leg, swimmeret, antenna and antennule removed at its base. Keep the rostrum, eyes and tail fan. A subtraction, not a new drawing.
ROW 3 — TOP VIEW, APPENDAGES REMOVED
A true orthographic dorsal projection of the body from row 2, head pointing right, the tail fan spread flat. Its length from rostrum tip to tail fan equals the length in row 2 exactly.
ROW 4 — FRONT VIEW AND SEGMENTATION MAP
Left: the full {common} seen from the front. Right: the same silhouette recolored flat: body grey (#808080), {claws}walking legs yellow (#FFFF00), antennae and antennules blue (#0000FF), eyes white (#FFFFFF).
ROW 5 — SIDE SEGMENTATION MAP
An exact duplicate of row 1 recolored flat: body grey (#808080), {claws}walking legs yellow (#FFFF00), swimmerets cyan (#00FFFF), antennae and antennules blue (#0000FF), tail fan green (#00FF00), eyes white (#FFFFFF). No texture or outlines."""


def shrimp(k, common, sci, geometry, color, appendages, pose, check, ant='antennae swept back over the body.', claws=''):
    return dict(common=common, sci=sci, ver='m1', fix=True, parts='the legs, claws, antennae, rostrum and tail fan',
                layout='* Row 4 contains two views side by side, separated by black space.\n', geometry=geometry, color=color,
                appendages=appendages, pose=pose, check=check + '\n* Side views face right.\n* Identical body silhouette in rows 1 and 2; identical body length in rows 2 and 3.',
                rows=SHRIMP_ROWS.format(ant=ant, common=common, claws=claws))


CARIDEAN = """* One pair of long antennae and one pair of short forked antennules, from the front of the head.
* Five walking legs per side under the carapace, in order from front to back: {legs}
* Five small swimmerets per side under abdominal segments 1 to 5.
* Tail fan: one central telson and two uropods per side."""
CAR_POSE = """* Standing on walking legs 3, 4 and 5 on each side, their tips on one invisible horizontal ground plane.
* Legs 1 and 2 held forward under the head.
* Antennae swept back over the body, both on the same arc.
* Tail fan spread flat."""

M1 = {
    # ---- saltwater snails ----
    'nassarius': snail('nassarius', 'nassarius snail', 'Nassarius vibex', """* Adult shell height 0.5 inches; shell height approximately 1.3 times its width.
* Ovate-conical shell of about 6 convex whorls with strong rounded axial ribs crossed by fine spiral threads, giving a beaded surface.
* A thick, glossy callus pad spreading over the underside around the aperture; a short notch-like siphonal canal at the base of the aperture.
* The animal: a long, narrow, very active foot ending in two short pointed tail tips; a long tubular siphon held forward and up like a snorkel; two long slender tentacles with eyes at their bases.
* Not a cone, not a turban shell.""", """Shell: grey-brown to olive with darker brown mottling and a darker band on the body whorl; callus pad cream-white and glossy. Foot, siphon and tentacles translucent white with fine dark specks.""",
        'siphon extended forward and up, tentacles forward.', 'siphon cyan (#00FFFF), '),
    'cerith': snail('cerith', 'cerith snail', 'Cerithium litteratum', """* Adult shell height 1 inch; shell height approximately 2.2 times its width.
* Tall, slender, sharply pointed spire of about 10 whorls, each with a spiral row of rounded knobs at the shoulder and finer beaded spiral cords below.
* Oval aperture with a short, slightly upturned siphonal canal at its base.
* The animal: a short broad foot, a snout, two slender tentacles with eyes near their bases.
* Not a turret shell without knobs; not an auger.""", """Shell: cream-white with rows of dark brown to black square spots and blotches following the spiral cords. Foot and head pale grey-cream, finely mottled darker.""",
        'snout and tentacles extended forward.'),
    'astrea': snail('astrea', 'astrea snail', 'Lithopoma tectum', """* Adult shell height 1 inch; shell height approximately equal to its width.
* Pyramid-shaped conical shell of about 6 whorls; each whorl carries oblique axial folds that make a wavy, star-like edge when seen from the apex.
* Base almost flat with fine spiral threads; round aperture closed by a thick, white, oval calcareous operculum carried on the back of the foot.
* The animal: a broad foot, a short snout, two tentacles.""", """Shell: greenish-grey to olive-tan, the folds a little paler; base cream. Operculum white. Foot and head olive-grey with fine darker mottling.""",
        'operculum visible on the back of the foot behind the shell.', 'operculum cyan (#00FFFF), '),
    'fightingconch': snail('fightingconch', 'Florida fighting conch', 'Strombus alatus', """* Adult shell length 3 inches; heavy shell, length approximately 1.6 times its width.
* Short pointed spire; a large body whorl with a row of blunt knobs on the shoulder; the adult outer lip flared into a thick wing with a stromboid notch near its front end.
* Long narrow aperture.
* The animal: a narrow muscular foot carrying a sickle-shaped brown operculum (used to lever and leap), a long extensible snout, and two long eye stalks each ending in a large ringed eye.""", """Shell: orange-brown to chestnut with paler zigzag mottling; aperture glossy salmon-orange inside. Body mottled olive-grey with pale speckles. Eyes yellow-green with a dark pupil ring.""",
        'both eye stalks raised and the snout extended forward.', 'operculum cyan (#00FFFF), '),
    # ---- freshwater snails ----
    'assassinsnail': snail('assassinsnail', 'assassin snail', 'Anentome helena', """* Adult shell height 0.8 inches; shell height approximately 2 times its width.
* Tall conical spire of about 7 whorls with fine axial ribs; oval aperture with a short siphonal canal.
* The animal: a broad foot, a long siphon tube held forward, two slender tentacles.""", """Shell: bright yellow to golden-amber spiral bands alternating with dark chocolate-brown bands, about three bands per whorl. Foot and siphon grey-green, finely speckled.""",
        'siphon extended forward.', 'siphon cyan (#00FFFF), '),
    'rabbitsnail': snail('rabbitsnail', 'yellow rabbit snail', 'Tylomelania sp.', """* Adult shell height 2.5 inches; shell height approximately 3 times its width.
* Tall turreted spire of about 10 slightly convex whorls with faint axial ribs; the oldest top whorls often worn smooth.
* The animal: a large foot and a long, wrinkled, trunk-like snout; two long tentacles that droop to the sides like rabbit ears.""", """Shell: dark chocolate brown to black. Foot, snout and tentacles bright golden yellow.""",
        'snout extended forward and down, tentacles drooping to the sides.'),
    'hornednerite': snail('hornednerite', 'horned nerite snail', 'Clithon corona', """* Adult shell width 0.5 inches; a globular shell with a low spire, height approximately 0.9 times its width.
* A row of 4 to 6 long, slender, slightly curved black spines (horns) on the shoulder of the body whorl.
* D-shaped aperture closed by a calcareous operculum; smooth glossy surface.
* The animal: a broad foot, a short snout, two tentacles.""", """Shell: golden yellow to olive with dense black zigzag lines and dark spiral bands; horns black. Foot and head grey.""",
        'tentacles forward.'),
    'trapdoorsnail': snail('trapdoorsnail', 'Japanese trapdoor snail', 'Cipangopaludina japonica', """* Adult shell height 1.8 inches; shell height approximately 1.3 times its width.
* Globose-conical shell of about 6 strongly convex whorls with deep sutures; smooth with fine growth lines and faint spiral ridges.
* Large oval aperture closed by a thin, brown, horny operculum (the trapdoor) carried on the back of the foot.
* The animal: a broad foot, a short snout, two tentacles (the right one thicker in males).""", """Shell: olive-green to dark olive-brown, paler at the aperture lip. Operculum brown. Foot and head dark grey with fine pale gold specks.""",
        'operculum visible on the back of the foot behind the shell.', 'operculum cyan (#00FFFF), '),
    # ---- saltwater shrimp ----
    'fireshrimp': shrimp('fireshrimp', 'fire shrimp', 'Lysmata debelius', """* Adult body length 2 inches from the rostrum tip to the end of the tail fan.
* Carapace approximately 38% of the body length; six abdominal segments; abdomen arched at the third segment.
* Short toothed rostrum, stalked eyes, long antennae approximately 1.5 times the body length.
* A slender caridean cleaner shrimp, the same build as the peppermint shrimp; no large claws.""", """Body: solid deep scarlet red, opaque, with a few small white spots on the back of the carapace. Antennae and antennules white. Walking legs white. Eyes dark red-brown.""",
        CARIDEAN.format(legs='1. a short leg with a tiny pincer; 2. a long, thin leg with a tiny pincer; 3, 4 and 5. thin walking legs ending in pointed tips.') + '\n\nNo large claws.', CAR_POSE,
        """* Exactly five walking legs per side, the second pair the longest.\n* Exactly two long antennae and two antennules."""),
    'coralbanded': shrimp('coralbanded', 'coral-banded shrimp', 'Stenopus hispidus', """* Adult body length 2.5 inches without the claws; the third pair of legs carries long claws longer than the body.
* Body covered with small forward-pointing spines; carapace approximately 40% of the body length; six abdominal segments.
* Three pairs of very long, thin, white antennae and antennules, each about 2 times the body length.
* Not a lobster: a slender spiny body and very long thin claws.""", """Body and claws: bold alternating crosswise bands of red and white, about three red bands on the abdomen and two on each claw. Antennae white. Walking legs translucent white. Tail fan with a red band.""",
        """* Three pairs of long white antennae and antennules from the front of the head.
* Five legs per side, in order from front to back: 1 and 2. small legs with tiny pincers; 3. a very long leg ending in a large slender claw; 4 and 5. thin walking legs ending in pointed tips.
* Five small swimmerets per side under abdominal segments 1 to 5.
* Tail fan: one central telson and two uropods per side.""", """* Standing on legs 4 and 5 on each side, their tips on one invisible horizontal ground plane.
* Both big claws held forward and out to the sides, open, at the same angles.
* Antennae swept up and back, all on matching arcs.
* Tail fan spread flat.""", """* Exactly two big claws, both on leg pair 3, equal in size.\n* Exactly three pairs of long antennae.""", claws='big claws red (#FF0000), '),
    'pistolshrimp': shrimp('pistolshrimp', "Randall's pistol shrimp", 'Alpheus randalli', """* Adult body length 1.5 inches.
* Stout body; carapace extends forward over the eyes as a hood (the eyes are covered by the carapace, seen through it); short rostrum.
* First leg pair asymmetric: one greatly enlarged snapping claw (about 50% of the body length, swollen palm) and one small slender claw.
* Antennae short, about 0.8 times the body length.""", """Body and legs translucent white with bold crosswise bands of orange-red, about two bands per segment; the big claw banded the same way. Antennae orange. Eyes dark, faintly visible under the hood.""",
        """* One pair of antennae and one pair of antennules.
* Five legs per side, in order from front to back: 1. a claw: on the shrimp's RIGHT side a large snapping claw, on its LEFT side a small slender claw; 2. a thin leg with a tiny pincer; 3, 4 and 5. walking legs ending in pointed tips.
* Five small swimmerets per side under abdominal segments 1 to 5.
* Tail fan: one central telson and two uropods per side.

This is the one exception to mirror symmetry: the two first-leg claws differ in size. Every other appendage mirrors.""", """* Standing on legs 3, 4 and 5 on each side, their tips on one invisible horizontal ground plane.
* Both claws held forward in front of the head; the big claw on the right side of the body.
* Antennae forward and out.
* Tail fan spread flat.""", """* Exactly one big snapping claw, on the shrimp's right side, and one small claw on its left.\n* The big claw is on the same side of the body in every view (mirrored correctly in front and top views).""", ant='antennae forward and out.', claws='claws red (#FF0000), '),
    # ---- freshwater shrimp ----
    'crystalred': shrimp('crystalred', 'crystal red shrimp', 'Caridina logemanni (crystal red line)', """* Adult body length 1 inch.
* Small dwarf shrimp: carapace approximately 35% of the body length, short straight rostrum, stalked eyes, antennae about the body length.
* The first two leg pairs end in tiny fan-like brushes for feeding.""", """Opaque chalk white body with bold deep red bands: the head and carapace front red, one broad red band across the middle of the abdomen, the tail fan base red; tail fan tips white. Legs white with faint red rings. Antennae red-tinted.""",
        CARIDEAN.format(legs='1 and 2. short legs ending in tiny feeding brushes; 3, 4 and 5. thin walking legs ending in pointed tips.'), CAR_POSE,
        """* Exactly five walking legs per side.\n* Exactly two long antennae and two antennules."""),
    'ghostshrimp': shrimp('ghostshrimp', 'ghost shrimp', 'Palaemonetes paludosus', """* Adult body length 1.5 inches.
* Slender, completely transparent body; long toothed rostrum curving slightly up; carapace approximately 35% of the body length; abdomen arched at the third segment.
* Second leg pair longer, with small claws; long antennae approximately 1.2 times the body length.""", """Clear glassy body, the internal organs faintly visible; a few small orange dots at the tips of the first claws and on the tail fan; a faint orange-amber tint to the gut. Eyes dark.""",
        CARIDEAN.format(legs='1. a short leg with a tiny pincer; 2. a longer leg with a small claw; 3, 4 and 5. thin walking legs ending in pointed tips.'), CAR_POSE,
        """* Exactly five walking legs per side, the second pair with small claws.\n* Exactly two long antennae and two antennules."""),
    'bambooshrimp': shrimp('bambooshrimp', 'bamboo shrimp', 'Atyopsis moluccensis', """* Adult body length 3 inches.
* Heavy-bodied freshwater filter-feeding shrimp: short rostrum, stalked eyes, short antennae about 0.5 times the body length.
* The first two leg pairs end in large fan-shaped brushes of fine hairs (the filter fans), open like four small hands.
* Walking legs thick and strong.""", """Body warm tan-brown to chestnut with a narrow cream stripe along the middle of the back from the carapace to the tail. Fans pale cream. Legs tan with faint darker rings.""",
        CARIDEAN.format(legs='1 and 2. short legs each ending in a large open fan of fine hairs; 3, 4 and 5. thick walking legs ending in pointed tips.'), """* Standing on legs 3, 4 and 5 on each side, their tips on one invisible horizontal ground plane.
* All four fans held forward and open, as when filter feeding.
* Antennae forward.
* Tail fan spread flat.""", """* Exactly four fans (two per side) and three walking legs per side.\n* Exactly two antennae and two antennules.""", ant='all four fans held forward and open, antennae forward.', claws='fans red (#FF0000), '),
    'sulawesicardinal': shrimp('sulawesicardinal', 'Sulawesi cardinal shrimp', 'Caridina dennerli', """* Adult body length 0.8 inches.
* Small dwarf shrimp: carapace approximately 35% of the body length, short rostrum, stalked eyes, antennae about the body length.
* The first two leg pairs end in tiny feeding brushes.""", """Body deep cardinal red with scattered small round white spots over the carapace and abdomen. The tips of the first two leg pairs white like gloves. Walking legs red with white tips. Antennae red.""",
        CARIDEAN.format(legs='1 and 2. short legs ending in tiny white feeding brushes; 3, 4 and 5. thin walking legs ending in pointed tips.'), CAR_POSE,
        """* Exactly five walking legs per side.\n* Exactly two long antennae and two antennules."""),
}
SHEETS.update(M1)

# Tuxedo urchin redo (t1 failed: teal bands and maroon spines instead of ultramarine and golden-green, top view 25% small,
# test too flat). Colours and the scale lock now stated; queued in its own folder (tuxedourchin-inv2-gen).
SHEETS['tuxedourchin_t2'] = dict(SHEETS['tuxedourchin'], id='tuxedourchin', ver='t2', inv=2, fix=True, geometry="""* Adult test diameter 2 inches, height approximately 70% of the diameter: a nearly round globe, flattened only a little at the mouth side.
* Ten meridian zones from the mouth (bottom centre) to the top: five covered with rows of short, even spines (spine length approximately 10% of the diameter) and five bare, alternating. The bare zones are slightly wider than the spined zones at the equator.
* Short tube feet between the spines on the lower half.
* Not a long-spined urchin; spines short, dense and fine.
* The top view and the bottom view have exactly the same diameter as the side view's width.""", color="""Bare zones: deep ultramarine to violet-blue, smooth, with fine darker stippling; never teal or green. Spines: short, golden-green to olive-tan, a few with reddish bases; never maroon or near black. Mouth area dark.""")


PROJ = "* No perspective distortion, labels, rulers, borders, shadows, or additional objects."
PROJ_CRUST = "* Strict orthographic projection without perspective distortion.\n* No labels, rulers, borders, shadows, ground lines, or additional objects."


def prompt(v):
    """The prompt text for one sheet entry. `raw` = a prompt kept word for word (Nathan's own rewrite)."""
    if 'raw' in v:
        return v['raw']
    c = 'appendages' in v   # a crustacean: Nathan's crab blocks
    geo = v['geometry'] + ('\n\nAppendages\n' + v['appendages'] if c else '')
    fx = v.get('fix')
    return HEAD.format(**{**v, 'fixc': FIX_CANVAS if fx else '', 'fixk': FIX_COLOR if fx else '', 'geometry': geo, 'prio': (PRIO_CRUST if c else PRIO).format(**v), 'proj': PROJ_CRUST if c else PROJ,
                          'pose': POSE_CRUST.format(pose=v['pose']) if c else '', 'check': '\n' + CHECK_CRUST.format(check=v['check']) if c else ''})


if __name__ == '__main__':
    os.makedirs('research/invert-sheets/prompts', exist_ok=True)
    for key, v in SHEETS.items():
        k, text, ver = v.get('id', key), prompt(v), v.get('ver', 't1')
        open(f'research/invert-sheets/prompts/{k}-{ver}.md', 'w', encoding='utf-8').write(f'<!-- invert sheet test {ver}, {v["common"]}, 2026-11-28; scripts/invert-sheet-prompts.py{v.get("note", "")} -->\n' + text)
        d = f'C:/Users/nreed/fish-sheets/{k}-inv{v.get("inv", 1)}-gen'; os.makedirs(d, exist_ok=True)
        # a folder that already holds its sheet keeps the prompt that made it (sheet.json / prompt-*.txt record which)
        if v.get('noqueue'):
            print(k, ver, len(text), 'written to research only (not queued)'); continue
        if os.path.exists(d + '/sheet.webp'):
            print(k, ver, len(text), 'sheet already made: prompt.txt left as is'); continue
        open(d + '/prompt.txt', 'w', encoding='utf-8').write(text)
        print(k, ver, len(text), d)
