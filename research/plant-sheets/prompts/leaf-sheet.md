# Leaf sheets: ChatGPT prompts for plant leaf textures (R151 pilot, 2026-11-25)

The fish method, simplified for plants. A leaf is nearly flat, so one top-down view of each leaf is the whole texture.
There are no 3 views and no label map. The 3D plant keeps its procedural shape, growth and sway (render/plant3d.ts);
only the colour inside each leaf comes from the sheet, and the leaf outline comes from the sheet's alpha.

**Easiest way:** `python scripts/plant-sheet-queue.py` (from the shared folder). It copies each prompt to the clipboard,
opens a new ChatGPT chat, and files the download where lane PT reads it. Your part per plant: Ctrl+V, Enter, click download.

**Generator:** ChatGPT. No photos, one generation per sheet. Save each result as
`C:\Users\nreed\fish-sheets\plants\<type>-d1.png`, next to the fish sheets. Keep the full-size PNG, not the webp preview.

**Why a white background:** the fish sheets use black, but dark bronze crypt leaves would cut out badly on black. A green
screen is out because the leaves are green. Pale undersides still separate fine from pure white.

**Style:** the same level as the build-B fish (memory: not cartoony, not photographic). It looks real, but evenly lit
like a field-guide plate, with no shadows and no glare. The shader adds the tank's own light.

## Shared block (paste first, then one species paragraph)

```
Create a single botanical reference sheet of individual aquarium-plant leaves on a pure white (#FFFFFF) background, for texturing a 3D model. Each leaf lies perfectly flat and is seen straight down from above (strict orthographic, no perspective, no tilt, no curl toward the viewer). Every leaf stands upright: its base (and stalk, if any) at the bottom, its tip at the top, its midrib exactly vertical and centred in its own cell. Leaves are laid out in an even grid, the same size from cell to cell, each as large as its cell allows, with at least 4% of the canvas width of pure white between any two leaves; nothing touches or overlaps, and nothing touches the canvas edge. Flat, even, diffuse light: no cast shadows, no drop shadow under the leaf, no specular glare, no rim light, no glow, no water droplets. Show the real surface detail: the midrib, side veins, fine texture and colour variation from base to tip and edge to middle, exactly as on a healthy submersed aquarium specimen. True but slightly muted colours. Photorealistic and botanically faithful, not stylized, not a cartoon, no outlines. No text, labels, rulers, props, roots or soil.
```

## Species paragraphs (pilot)

### crypt: Cryptocoryne wendtii, brown/bronze form (plant type `crypt`)
```
Species: Cryptocoryne wendtii 'Brown', submersed form. Canvas 3:2 landscape, a grid of 3 columns x 2 rows. Top row: three leaves seen from their upper side: one olive-green with bronze edges, one mid bronze-brown, one darker chocolate-brown with an olive centre. Bottom row: the undersides of the same three leaves, in the same order and the same outline mirrored left-right, pinkish to reddish-brown with a paler midrib. Leaves are lance-shaped, about four times as long as wide, with a short stalk (about a quarter of the leaf length) and a softly wavy (undulate) margin along the whole blade; the upper side has a faintly hammered, slightly blistered surface between the side veins and a fine paler midrib.
```

### grass: Vallisneria spiralis, straight vallisneria (plant type `grass`)
```
Species: Vallisneria spiralis (straight vallisneria), submersed. Canvas 2:3 portrait. Four separate straight vertical strips of one ribbon-like leaf, side by side, each strip filling about 90% of the canvas height and about one tenth of its width: (1) the leaf base, rising from a pale, nearly white crown; (2) a middle section whose two edges are straight and parallel and whose top and bottom edges are cut straight across, so it can be repeated seamlessly end to end; (3) the leaf tip, narrowing to a blunt rounded end with tiny saw-tooth serrations along the last part of both edges; (4) a second middle section, cut straight across the same way, in a slightly yellower green. The leaf is a translucent fresh mid-green, with fine parallel veins running its length (the centre ones a little stronger), faint cross-veins between them, and a few scattered tiny reddish-brown streaks.
```

### carpet: Micranthemum tweediei, 'Monte Carlo' (plant type `carpet`)
```
Species: Micranthemum tweediei 'Monte Carlo', submersed. Canvas 1:1 square, a grid of 3 x 3 single leaves. Top two rows: six leaves seen from their upper side, small, nearly round to broadly oval, a little wider near the tip, with a very short stalk at the bottom; a fresh mid-green, darker toward the base and a touch yellower at the rim, one faint midrib and almost no visible side veins, a slight soft sheen-free waxy surface; vary the size and roundness a little from leaf to leaf. Bottom row: three undersides, paler and greyer green with the midrib a little raised. Not lime, not neon: a natural healthy green.
```

## What the cutter does with a sheet (lane PT)
1. It finds each leaf against white (threshold plus a 1 px feather), crops it to its bounding box, and keeps the
   alpha as the leaf outline.
2. It straightens the midrib to vertical, then stretches each leaf to fill a fixed atlas cell: width to the leaf's
   widest point, height base to tip. The 3D leaf maps u across (-1..1) and s along (0..1), so a stretched leaf lines
   up with the grid.
3. It writes `public/art/plants/leaves.png` (atlas) and `src/data/plantart/leaves.json` (type -> cells: upper[],
   under[], for grass base/mid/tip).
4. It neutralises the hue, giving texture luminance x the vertex colour, or keeps the colour (a texture-colour
   flag per type). Decide this in the pilot by looking at both.
