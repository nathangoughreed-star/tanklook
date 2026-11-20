# B-num: B-noref + portrait canvas + numeric proportions (E2, 2026-11-20)

Generator: ChatGPT. No photos attached. A new chat for every draw, 2 draws per species. Save the sheets as `C:\Users\nreed\fish-sheets\e2\<species>-d1.png` and `-d2.png`.

**Differences from `B-noref`** (the E1 baseline):
1. The layout sentence asks for a tall 2:3 canvas and a minimum black gap. In E1, 5 of 6 clownfish and pleco sheets came back landscape with touching panels.
2. Each species paragraph gains a `Proportions:` sentence with real numbers. E1 drew the oscar and clownfish about 30% too thick; the real values and their sources are in `research/fish-sheet-methodology-audit.md` section 5.

**Confound:** both changes are made together. The layout line should only affect how the panels are laid out, and the numbers should only affect thickness, so the audit can tell their effects apart.

**Scoring:**
- the top-view width/depth against the real ratio, with a target within 10%;
- side vs top length;
- tail edge-on;
- panels separated.

The front view is information only.

## Method block (changes from B in the first paragraph only)

```text
Create a single orthographic reference sheet of one fish on a pure black background, for building a 3D model. Use a tall portrait canvas, 2:3 (width:height). Three panels stacked vertically, with at least 5% of the canvas height of pure black between panels; nothing from one panel, including fin tips and spines, may cross into another panel's space.
```

The rest of B follows unchanged, from "(1) SIDE: ..." to "... as large as the canvas allows."

## Proportions sentences (inserted after the "Draw it from your knowledge..." sentence)

- oscar: `Proportions (standard length = snout tip to the base of the tail fin): greatest body depth 46% of standard length; greatest body width, seen from above, 21% of standard length, which is 0.46 of the depth. The body is strongly flattened side to side.`
- clownfish: `Proportions (standard length = snout tip to the base of the tail fin): greatest body depth 45% of standard length; greatest body width, seen from above, 22% of standard length, which is 0.49 of the depth. The body is clearly flattened side to side.`
- pleco: `Proportions (standard length = snout tip to the base of the tail fin): greatest body depth 20% of standard length; greatest body width, seen from above across the head and pectoral girdle, 30% of standard length, which is 1.5 times the depth. The body is flattened top to bottom.`
