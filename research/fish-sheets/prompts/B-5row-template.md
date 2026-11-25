# Build B 5-row sheet prompt: template (2026-11-23; width numbers removed the same day)

Made from `bluetang3-chatgpt.md`, the prompt behind `bluetangd`. Nathan liked that fish, and the prompt won a blind A/B.
The prompt has two parts:
- **The method block (part 1)** is that prompt word for word. The only changes are the `{{SLOTS}}`, which replace the
  places where the tang's text named the species, its marks or its numbers. Do not reword it, and do not add or drop rules.
- **The species block (part 2)** fills the slots, one copy per species. Write it in the tang's style:
  - short declarative bullets;
  - numbers as "approximately N% of standard length";
  - shapes said positively, plus the one wrong shape the model tends to draw ("not a perfect ellipse").

## How to make a species prompt
1. Copy part 2 and fill every slot, as for the blue tang worked example at the bottom. Sources:
   - depth % SL: FishShapes v1 (`Max_body_depth` / `Standard_length`, museum specimens; https://zenodo.org/records/6642650), else FishBase / Seriously Fish morphometrics;
   - `SL_IN`: the adult standard length in inches, rounded.
2. Save the filled block as `C:\Users\nreed\fish-sheets\<slug>-gen\species.txt`. Then run
   `python -I scripts/fish-prompt-fill.py <that file> <out.txt>`. It stops if a slot is missing.
   - `--example` fills the tang block below. Before the width lines were removed it reproduced `bluetang3-chatgpt.md` byte for byte (checked 2026-11-23); now it differs from that prompt only by its width lines (three removed, the front-view sentence shortened).
3. Save the filled prompt as `research/fish-sheets/prompts/<slug>-5row.md`, with a one-line header: species, date, values used.
4. Nathan pastes it into a **new** ChatGPT chat, with no photos unless he chooses to add some (the tang prompt had none), and saves
   the sheet as `C:\Users\nreed\fish-sheets\<slug>-gen\sheet.webp`.
5. Log the sheet and what it got right or wrong in `research/fish-model-sheet-method.md`, section 2, "Prompts used".

## Rules for the species block
- **No size adjectives (cardinal tetra, 2026-11-23).** "Large eye", "only slightly compressed", "small fin" are read as instructions to
  exaggerate or distort: the cardinal came out too round (front width/height 0.69 vs real 0.53) after "only slightly compressed, rounded".
  Give a measured number (`EXTRA_RATIOS`) or name the shape without a size word.
- **Geometry first: depth is the one number.** The side outline is the body as drawn, so the depth must be right in the sheet.
- **No width numbers (Nathan, 2026-11-23).** The sheets ignored them: the yellow tang was drawn 22% SL wide when asked 13% (+30%), the discus
  22.8% when asked 17% (+34%), the blue tang 1.28-1.38x heavy. The build keeps only the top view's width *shape* and rescales its maximum to
  the measured width (FishShapes), so a width number in the prompt can only add a constraint the model fights. The qualitative words
  (`CROSS_SECTION_WORDS`, "do not inflate") stay.
- **Name only the marks that must be right:** the diagnostic pattern and anything image models get wrong for this fish.
  Describe a pattern by its shape and where it starts and ends, and say how the parts connect (the tang: "curved and connected,
  not two straight parallel stripes").
- **Never name a film or cartoon character.** For example, no "Nemo" or "Dory": it pulls the face toward animation.
- **Every fin gets one bullet in `FIN_BULLETS`, in the order dorsal, anal, caudal, pectoral, pelvic:**
  - where it starts and ends along the body;
  - its shape;
  - its colours and margins;
  - opaque or not.
- **Extra fins.** A species with an adipose fin (tetras, catfish) or a split dorsal adds it as its own bullet. In `ROW5_EXTRA`, map
  it to the dorsal's red:
  - `fish-fin-cut.py` names fins by position (anything above the back is a dorsal);
  - panel 5 is read only for the pectoral, so a new colour buys nothing.
- **Fins the species lacks.** Delete that line in rows 4 right and 5, and say "no pelvic fins" in `FIN_BULLETS`. Do not leave a colour
  for a fin that is not there.
- **Pectoral pose:** "naturally folded close against the flank" stays the default. It keeps the top view readable (method doc
  section 2). Change it only for fish whose pectorals are never folded (plecos, gobies resting on them); note the change in the log.
- **Body-plan warnings (`SHAPE_DONT`, `TOP_DONT`):** say what the wrong shape is for *this* body plan. The tang's "not a torpedo"
  would fight a tetra, which is one (cardinal tetra, 2026-11-23).
- **Scales:** say whether they are minute (velvety skin), small, or large and visible. Large scales drawn on a minute-scaled fish
  read as a different species.

---

## Part 1: method block (fixed)

```text
Create a scientifically accurate orthographic reference sheet of a single adult {{COMMON}} ({{SCI}}) for 3D model reconstruction. Title the image "{{COMMON}} ({{SCI}}) reference sheet".

PRIMARY OBJECTIVE

This is a technical reconstruction reference, not a collection of separate fish illustrations.

Every view must represent the exact same rigid three-dimensional specimen, with identical body proportions, fin attachment positions, anatomical landmarks, and coloration.

Priority order:

1. Accurate species anatomy and body proportions.
2. Exact silhouette consistency between matching views.
3. Correct fin geometry and attachment boundaries.
4. Consistent anatomical landmarks and coloration.
5. Surface detail and illustration quality.

If any requirements conflict, prioritize geometry over visual appearance.
CANVAS AND LAYOUT

* Portrait canvas, 2:3 width-to-height ratio.
* Pure black (#000000) background.
* Five horizontal rows separated by at least 3% of the canvas height of empty black space.
* Row 4 contains two front views side by side, separated by black space.
* All views use exactly the same physical scale.
* No perspective distortion, labels, rulers, borders, shadows, or additional objects.
* Keep all fins and body parts within their assigned view areas.
* Center the views consistently. Side and top views must share the same horizontal snout and caudal-peduncle coordinates.

MASTER GEOMETRY — MOST IMPORTANT
First establish one anatomically accurate, finless three-dimensional body. All five rows must be derived from this same body.

Species proportions:

* Adult {{COMMON}}, standard length {{SL_IN}} inches.
* Maximum body depth = approximately {{DEPTH_PCT}}% of standard length.
{{EXTRA_RATIOS}}{{BODY_BULLETS}}
* Natural asymmetry of the head and body profile; do not substitute a perfect ellipse or pointed leaf shape.

Important: The front and top views must reflect this {{CROSS_SECTION_WORDS}} anatomy. {{SHAPE_DONT}}
MASTER COLORATION
{{COLORATION}}

Color boundaries must wrap continuously over the three-dimensional body, remaining consistent in all projections.
FIN GEOMETRY
Attach the fins to the established master body without modifying its shape.

{{FIN_BULLETS}}

Use natural fin-ray structure and smooth, anatomically accurate edges. Fins are opaque and not translucent.

Record each fin's precise attachment boundary to the master body. These attachment boundaries must remain unchanged in every panel.
ROW 1 — MASTER SIDE VIEW, WITH FINS
Left-flank orthographic side elevation.

Head pointing right, body axis perfectly horizontal.

Show the complete specimen with all fins in a neutral resting position.

Do not enlarge, spread, rotate, or reposition any fin or other structure to make it easier to see. Where a fin naturally overlaps the body, keep that overlap. The pectoral fin lies against the flank at its natural attachment position. Only the near-side pelvic fin is visible.

This view establishes the master side silhouette for the entire sheet.
ROW 2 — IDENTICAL SIDE BODY, FINS REMOVED
Directly below row 1, show the exact same fish at the exact same scale and horizontal position.

Use the identical underlying body silhouette from row 1, but remove every fin precisely along its attachment boundary.

This is a subtraction operation, not a new drawing of a finless fish.

* Do not alter the forehead, snout, back, belly, or caudal peduncle.
* Do not expand the body to replace the removed dorsal or anal fins.
* Do not round or taper the caudal peduncle into a point.
* End the peduncle at the original caudal-fin attachment with a short vertical edge.
* Preserve the eyes, mouth, gill covers, {{MARKS_SHORT}}.
* Continue the natural body coloration beneath the removed pectoral fin.

The body surface in row 2 must correspond exactly to the body surface in row 1.
ROW 3 — TOP VIEW, FINS REMOVED
A true orthographic dorsal projection of the same master finless body.

Head pointing right, snout and peduncle aligned horizontally with row 2.

Show a {{TOP_VIEW_SHAPE}}.

{{TOP_DONT}}

Eyes may be slightly visible along the sides of the head.

Show the actual dorsal coloration and {{TOP_PATTERN}}.

No fins or fin remnants.
ROW 4 LEFT — FRONT VIEW, FINS REMOVED
A true orthographic anterior projection of the same master finless body, viewed directly toward the closed mouth.

At the same physical scale as all other views.

The body must appear {{FRONT_VIEW_SHAPE}}.

Preserve the correct forehead, head, eye, and mouth positions. The silhouette must represent the projected three-dimensional body, not a pointed oval or symmetrical leaf.

The fish is upright and bilaterally symmetrical in this view, with a neutral, natural expression.

No fins or fin remnants.
ROW 4 RIGHT — FRONT FIN SEGMENTATION MAP
The same projected body silhouette as row 4 left, unchanged, with the pectoral and pelvic fins added at their attachment points.

Replace the anatomical illustration with flat colors:

* Body: solid mid-grey (#808080).
* Left and right pectoral fins: solid yellow (#FFFF00).
* Left and right pelvic fins: solid cyan (#00FFFF).

The pectoral and pelvic fins extend from their anatomically correct attachment positions at the same resting angles established in row 1.

No other fins. No texture, gradients, highlights, or outlines.
ROW 5 — SIDE FIN SEGMENTATION MAP
An exact geometric duplicate of the complete fish in row 1, including every fin.

This is a recoloring operation, not a newly drawn fish.

Preserve the complete outer silhouette, body outline, fin shapes, and fin attachment positions from row 1.

Apply these flat colors:

* Body: mid-grey (#808080).
* Dorsal fin: red (#FF0000).
* Anal fin: green (#00FF00).
* Caudal fin: blue (#0000FF).
* Pectoral fin: yellow (#FFFF00).
* Pelvic fin: cyan (#00FFFF).
{{ROW5_EXTRA}}* Eye: white (#FFFFFF).
* Background: black (#000000).

Every fin-color boundary must coincide exactly with the corresponding anatomical attachment boundary.

Preserve the pectoral fin's actual overlapping shape from row 1. Mark its attachment point with a small solid black dot.

No texture, shading, gradients, or decorative outlines.
ILLUSTRATION STYLE
Restrained zoological reference illustration. Geometry takes priority over surface detail.

Accurate biological forms, clean silhouettes, clearly defined anatomical boundaries, and natural slightly subdued coloration. Minimal surface texture: no individually rendered scales and no photographic detail.

{{SCALES}}

Use subtle diffuse anatomical shading, without strong highlights, reflections, rim lighting, cast shadows, or photographic noise.

No exaggerated eyes, smiling mouth, cartoon proportions, expressive features, painterly effects, or decorative elements.
FINAL CONSISTENCY REQUIREMENTS
Before finalizing the sheet, check these relationships:

1. Rows 1, 2, and 5 have identical underlying body silhouettes.
2. Rows 1 and 5 have identical complete fish silhouettes, including every fin.
3. Rows 2 and 3 have identical snout-to-peduncle lengths and horizontally aligned endpoints.
4. The front-view body width agrees with the top-view maximum body width.
5. Every fin is attached at the same anatomical location in the illustrated view and its corresponding segmentation map.
6. The characteristic {{PATTERN_SHORT}} remains consistent across all realistic projections.
7. All views are at the same physical scale.

Do not sacrifice cross-view geometric consistency to improve the visual appearance of any individual panel.
```

## Part 2: species block (copy and fill one per species)

```text
COMMON              = 
SCI                 = 
SL_IN               =      (adult standard length, inches)
DEPTH_PCT           =      (max body depth, % SL)
EXTRA_RATIOS        =      (optional, measured only: FishShapes head depth and minimum peduncle depth as "* Head depth = approximately N% of standard length." lines, all on ONE line, joined by a literal backslash-n and ending with one; empty if none)
BODY_BULLETS        =      (4-8 "* " lines: overall shape and compression, snout/forehead, back and belly line,
                            where the greatest depth sits, the peduncle (and any spines or keels on it), eye position, mouth)
CROSS_SECTION_WORDS =      ("thin, disc-like" / "moderately compressed" / "nearly round, slightly flattened below")
COLORATION          =      (paragraphs: base body colour and the belly; each diagnostic mark by shape, start, end and how
                            the marks connect; eye colour; anything image models get wrong)
FIN_BULLETS         =      ("* Dorsal: ..." then Anal, Caudal, Pectoral, Pelvic, then any adipose / second dorsal)
MARKS_SHORT         =      (what row 2 must keep, e.g. "black markings, and yellow peduncle pattern"): BODY markings only, never a fin, tail, sword, filament or fin edge (row 2 has no fins; "the spotted delta tail" here made ChatGPT keep the guppy's tail, 2026-11-24)
TOP_VIEW_SHAPE      =      (one phrase, e.g. "narrow, laterally compressed body, widest slightly behind the eyes and tapering smoothly toward the caudal peduncle")
TOP_PATTERN         =      (e.g. "the black pattern wrapping over the back"; "the back's colour" if the back is plain)
FRONT_VIEW_SHAPE    =      (e.g. "tall and extremely narrow")
ROW5_EXTRA          =      (empty, or e.g. "* Adipose fin: red (#FF0000), like the dorsal.\n")
SCALES              =      (e.g. "The species has minute scales; skin should look smooth and velvety rather than displaying large individual scales.")
PATTERN_SHORT       =      (e.g. "black and blue coloration")
SHAPE_DONT          =      (the wrong body the model tends to draw, e.g. "Do not inflate the body into a cylindrical or torpedo shape.")
TOP_DONT            =      (the wrong top view, e.g. "Do not make the body spindle-shaped or excessively thick.")
```

## Worked example: blue tang (`bluetang3-chatgpt.md` minus its width lines)

```text
COMMON              = Pacific blue tang
SCI                 = Paracanthurus hepatus
SL_IN               = 6
DEPTH_PCT           = 48
EXTRA_RATIOS        = (empty)
BODY_BULLETS        =
* Deep oval body, extremely compressed laterally.
* Short, blunt snout with a steep, rounded forehead.
* Gently arched back and smoothly convex belly.
* Greatest body depth slightly forward of the midpoint.
* Short, narrow caudal peduncle, with a small folded caudal spine on either side.
* Small, naturally positioned eye high on the head, behind the snout.
* Very small closed terminal mouth with thin blue lips.
CROSS_SECTION_WORDS = thin, disc-like
COLORATION          =
Natural royal-blue body, slightly lighter below, with a blue belly.

The characteristic black palette marking must have its correct anatomical shape: a broad upper black band beginning around the eye and extending toward the caudal peduncle, and a curved lower black band sweeping below the pectoral region and rejoining the upper band toward the rear.

Together they surround a large royal-blue oval region on the upper-mid flank. The black pattern is curved and connected, not two straight parallel stripes.

A bright yellow triangular region covers the caudal peduncle and projects forward into the rear body.

Eye dark, mostly within the black marking.
FIN_BULLETS         =
* Dorsal: One continuous low fin from above the rear of the eye almost to the peduncle. Blue with a thin black margin.
* Anal: One continuous fin along the posterior belly, mirroring the rear dorsal region. Blue with a thin black margin.
* Caudal: Yellow, truncate to slightly concave trailing edge, black upper and lower margins.
* Pectoral: Small, emerging behind the gill cover, naturally folded close against the flank. Blue base and yellow outer membrane.
* Pelvic: Small, blue, below the pectoral region.
MARKS_SHORT         = black markings, and yellow peduncle pattern
TOP_VIEW_SHAPE      = narrow, laterally compressed body, widest slightly behind the eyes and tapering smoothly toward the caudal peduncle
TOP_PATTERN         = the black pattern wrapping over the back
FRONT_VIEW_SHAPE    = tall and extremely narrow
ROW5_EXTRA          = (empty)
SCALES              = The species has minute scales; skin should look smooth and velvety rather than displaying large individual scales.
PATTERN_SHORT       = black and blue coloration
SHAPE_DONT          = Do not inflate the body into a cylindrical or torpedo shape.
TOP_DONT            = Do not make the body spindle-shaped or excessively thick.
```
