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

1. Accurate species anatomy and proportions.
2. Exact silhouette consistency between matching views.
3. Correct geometry and attachment of {parts}.
4. Consistent anatomical landmarks and coloration.
5. Surface detail and illustration quality.

If any requirements conflict, prioritize geometry over visual appearance.
CANVAS AND LAYOUT

* Portrait canvas, 2:3 width-to-height ratio.
* Pure black (#000000) background.
* Five horizontal rows separated by at least 3% of the canvas height of empty black space.
{layout}* All views use exactly the same physical scale.
* No perspective distortion, labels, rulers, borders, shadows, or additional objects.
* Keep every part within its assigned view area.
* Center the views consistently.

MASTER GEOMETRY — MOST IMPORTANT
First establish one anatomically accurate three-dimensional specimen. All five rows must be derived from it.

{geometry}
MASTER COLORATION
Natural colouring, slightly subdued, not neon-saturated.

{color}

Color boundaries must wrap continuously over the three-dimensional form, remaining consistent in all projections.
{rows}"""

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

if __name__ == '__main__':
    os.makedirs('research/invert-sheets/prompts', exist_ok=True)
    for k, v in SHEETS.items():
        text = HEAD.format(**v)
        open(f'research/invert-sheets/prompts/{k}-t1.md', 'w', encoding='utf-8').write(f'<!-- invert sheet test 1, {v["common"]}, 2026-11-28; scripts/invert-sheet-prompts.py -->\n' + text)
        d = f'C:/Users/nreed/fish-sheets/{k}-inv1-gen'; os.makedirs(d, exist_ok=True)
        open(d + '/prompt.txt', 'w', encoding='utf-8').write(text)
        print(k, len(text), d)
