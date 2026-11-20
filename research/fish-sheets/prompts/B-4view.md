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
