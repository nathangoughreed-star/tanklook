# B-4view: B-layout with a label-map panel 2, one prompt, one image (2026-11-20)

Generator: ChatGPT, no photos, one generation. Panels, top to bottom:
1. side;
2. **label map**: an exact copy of panel 1's fish as flat colours (body grey, dorsal red, anal green, tail blue, pectoral yellow, pelvic cyan, adipose magenta, barbels orange, eye white, mouth line black);
3. top;
4. front.

The full prompt text is the B-layout method block with these panel changes; the verbatim neon tetra prompt is in the coordinator chat of 2026-11-20.

## First test: neon tetra (`C:\Users\nreed\fish-sheets\shapes\neontetra-4view-d1.webp`)

**The realistic panels are not hurt.** Audit (on a copy with panel 2 blacked out): **PASS**, with no failures and no warnings.
- Side panel 1003 px long.
- Side vs top length 0.0%.
- Ends within 2 px.
- Tail edge-on 0.11.
- Top max width / length 0.146.

The single-sheet neon (`B-layout`) came out the same apart from a fanned tail.

**Label map against the side panel**
- Best alignment shift: dx 1, dy -3 px.
- Silhouette IoU 0.937. The faint translucent fins lower it.
- Mean boundary offset 2.1 px (0.21% of length), about as good as the angelfish edit.
- **Placed correctly:** dorsal, adipose, anal, pelvic, tail, eye. The tail base and fin bases sit on the drawn ones (overlay: scratchpad `neon4-blend.png`).
- **Wrong: the pectoral.** It is painted as a body patch above and in front of the drawn pectoral. Its root is about 4% of length off, high and forward. A pectoral lies over the body, so a flat map can't show where it attaches.

**Verdict.** Promising. One generation gives the realistic sheet plus fin regions for every fin except the pectoral. Next steps:
- check the fin bases against clicks or the E5 segmenter;
- try a deep fish (angelfish) for size;
- consider a dot for the pectoral root, or a separate small panel.

## v2: pectoral fix. Dwarf gourami (`C:\Users\nreed\fish-sheets\shapes\dwarfgourami-4view-d1.webp`)

**Change from v1:** panel 2 gains this sentence: "The pectoral fin is painted exactly where and as it appears in panel 1, even where it overlaps the body, and the point where it joins the body is marked with a small solid black dot."

**Results**
- **Label map against side:** best shift dy -4 px. Silhouette IoU 0.967; mean boundary offset 2.0 px (0.23% of length).
- **Pectoral FIXED:** the yellow sits on the drawn translucent pectoral, and the black root dot is at its base behind the gill.
- The dorsal, anal and tail bases and the eye all sit on the drawn ones.
- The thread-like pelvic feelers survive as thin cyan lines a few px low.
- **Audit (panel 2 blacked out):** length 0.5%, ends within 6 px, tail edge-on 0.10. It fails only on size: the side panel is 853 px long against the >=900 rule, the cost of four panels.

**Verdict:** v2 is the candidate production prompt. One generation gives a measurable sheet plus every fin region and the pectoral root. Next steps:
- relax the size rule for 4-panel sheets (about 800 px);
- score the fin bases against clicks or the E5 segmenter;
- teach the build to read landmarks from panel 2.

## v2 full prompt (method block; add the species paragraph)

```text
Create a single orthographic reference sheet of one fish on a pure black background, for building a 3D model. Use a tall portrait canvas, 2:3 (width:height). Four panels stacked vertically, with at least 4% of the canvas height of pure black between panels; nothing from one panel, including fin tips and spines, may cross into another panel's space. All four panels use exactly the same scale.

(1) SIDE: the left flank, a true side elevation. Nose pointing right, body axis perfectly horizontal. All fins spread at their natural resting extent, not flared. The pelvic and anal fins hang clear of the belly with a visible dark gap.
(2) LABEL MAP: directly below panel 1, an exact copy of panel 1's fish: the same outline, pose, size and position left to right, pixel for pixel. Recoloured as a flat segmentation map: body mid-grey; dorsal fin red; anal fin green; tail fin blue; pectoral fin yellow; pelvic fin cyan; adipose fin magenta (if present); barbels orange (if present); eye white; mouth line black. Each fin's colour stops exactly where the fin joins the body. The pectoral fin is painted exactly where and as it appears in panel 1, even where it overlaps the body, and the point where it joins the body is marked with a small solid black dot. No texture, no shading, no outlines, no gradients.
(3) TOP: below panel 2, seen straight down from above. The snout and tail tip line up horizontally with panels 1 and 2, and the fish is exactly the same length. In this view the dorsal fin, anal fin and tail fin are seen edge-on: each is only a thin line along the midline, never spread flat. Pectoral fins folded flat against the body. The back's colour pattern is fully visible and evenly lit.
(4) FRONT: below panel 3, seen straight on from the snout at the same scale as panel 1. The eyes and mouth are at the same height as in panel 1. The tail is hidden behind the body; the dorsal and anal fins are seen edge-on as thin lines.

Panels 1, 3 and 4 show the same individual, with identical proportions, colours and pattern, and the pattern wraps continuously around the body. Strict orthographic projection: no perspective, no tilt. Flat, even studio light with no shadows, reflections, rim light or glow. No text, labels or props. Mouth closed. The eye has a clearly separate pupil and iris. True but slightly muted colours. Photorealistic and anatomically faithful: no stylization, cartoon or film-character features, and no exaggeration of any feature. Make the fish as large as the canvas allows.
```
