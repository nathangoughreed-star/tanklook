# E-GEN combined sheet prompt: finned + finless in one image (2026-11-22)

For the finless method (`research/multiview-to-3d.md`, runs 4-5). Keep the method block; swap the species paragraph.

## Layout: 2x2 grid for deep-bodied fish, not 5 stacked panels
The rainbowfish sheet stacked 4 panels in a 2:3 portrait. That works for long, slim fish. An angelfish is about 1.5x taller than long with fins, so 4 stacked panels would leave it about 260 px long, and a 5th label-map panel even less. So:
- **Grid, 2:3 portrait.** Top row, about 60% of the height: (1) side with fins | (2) the same side without fins, side by side, same height and scale. Bottom row: (3) top | (4) front, both without fins.
- **No label-map panel for the angelfish.** Its pectoral is small and clear, and a label map at the same size would not fit. The pectoral is drawn as a small clear card from panel 1 (or left off). The label-map panel stays the plan for fish with a large, opaque pectoral, in a stacked layout.
- Expected side length about 460 px (rainbowfish: about 1000 px). Enough for a 6 in fish at the 3000-triangle, 512 px texture level.

## Method block (grid version)

```text
Create a single orthographic reference sheet of one fish on a pure black background, for building a 3D model. Use a tall portrait canvas, 2:3 (width:height), divided into four panels in a 2x2 grid: the top row takes about 60% of the canvas height, the bottom row the rest. Leave at least 4% of the canvas width of pure black between the two columns and at least 4% of the canvas height between the rows; nothing from one panel, including fin tips, filaments and spines, may cross into another panel's space. All four panels use exactly the same scale, and the fish is exactly the same length in panels 1, 2 and 3.

(1) TOP LEFT, SIDE WITH FINS: the left flank, a true side elevation. Nose pointing right, body axis perfectly horizontal. All fins spread at their natural resting extent, not flared. The pelvic and anal fins hang clear of the belly with a visible dark gap.
(2) TOP RIGHT, SIDE WITHOUT FINS: the very same fish as panel 1, in exactly the same pose, size and height on the canvas, with every fin (dorsal, anal, tail, pelvic and pectoral) trimmed off flush at its base, as if cut with scissors. Nothing else changes. Do not fill in, round off, smooth or extend the body into the space the fins occupied. The back and belly line under each fin is the body's own edge, visible through the fin's base in panel 1; do not raise it to where the fin starts. The tail stalk ends exactly where the tail fin's rays begin. Where the pectoral fin covered the flank in panel 1, the flank's own markings continue underneath. Same scale as panel 1: the snout-to-stalk length and the body depth at the eye are identical to panel 1's.
(3) BOTTOM LEFT, TOP VIEW WITHOUT FINS: seen straight down from above, nose pointing right, the same body as panel 2 at the same scale: snout to end of tail stalk exactly as long as in panel 2. No fins. The back's colour pattern is fully visible and evenly lit.
(4) BOTTOM RIGHT, FRONT VIEW WITHOUT FINS: seen straight on from the snout, at the same scale as panel 2: its height equals panel 2's body depth at its deepest point. No fins. The eyes and mouth are at the same height relative to the body as in panel 2.

All four panels show the same individual, with identical proportions, colours and pattern, and the pattern wraps continuously around the body. Strict orthographic projection: no perspective, no tilt. Flat, even studio light with no shadows, reflections, rim light or glow. No text, labels or props. Mouth closed. The eye has a clearly separate pupil and iris. True but slightly muted colours. Photorealistic and anatomically faithful: no stylization, cartoon or film-character features, and no exaggeration of any feature. Make the fish as large as its panel allows.
```

## Species paragraph: freshwater angelfish (wild type)

```text
The fish is an adult wild-type freshwater angelfish, Pterophyllum scalare, about 6 inches long including the tail. The body is a very deep, strongly flattened disc: without fins, its depth is about equal to its length from snout to the end of the tail stalk, and seen from above its greatest width is only about 12% of that length, tapering to a thin edge at the back and belly. The snout is short and pointed, with a small upturned mouth and a slight notch in the forehead profile above the eye. The dorsal and anal fins are very tall, swept-back triangular sails with long bases running along most of the back and belly; from the dorsal tip to the anal tip the fish is about one and a half times as tall as it is long. The tail fin is broad and fan-shaped with its upper and lower edges drawn out into short filaments. The pelvic fins are two long, thin filaments hanging down and back from the throat, reaching about as far as the anal fin's tip. The pectoral fins are small, rounded and clear, just behind the gill cover. Colour: silver body with a faint olive-grey sheen on the back, crossed by four vertical black bars: one through the eye, a broad one from the front of the dorsal fin down across the body to the pelvic fins, a third from the middle of the dorsal fin to the anal fin, and a fourth across the tail stalk. The bars continue faintly into the dorsal, anal and tail fins, which are otherwise translucent grey with fine darker rays. The upper part of the iris is red.
```

Sources for the numbers: body depth about equal to standard length and fin height from common descriptions of *P. scalare* (FishBase species page, max about 6 in TL); the 12% width is an estimate, to be checked against the generated top view.
