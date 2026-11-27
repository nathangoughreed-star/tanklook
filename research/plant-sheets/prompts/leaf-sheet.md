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

## Species paragraphs (batch 2: the next ten leaf families, 2026-11-25)

Same layout as the pilot: uppers on top, undersides below in the same order, mirrored left-right. Save as `<type>-d1.png` (`python scripts/plant-sheet-queue.py sword anubias ...` does the copying).

### sword: Echinodorus 'Bleherae', Amazon sword (plant type `sword`)
```
Species: Echinodorus 'Bleherae' (Amazon sword), submersed. Canvas 3:2 landscape, a grid of 3 columns x 2 rows. Top row: three leaves seen from their upper side, a fresh mid to deep green, one a touch yellower. Bottom row: the undersides of the same three leaves in the same order, the outline mirrored left-right, paler yellow-green with prominent raised veins. Leaves are long and lance-shaped, about six times as long as wide, widest just above the middle, tapering to a pointed tip, with a long narrow channelled stalk (about a quarter to a third of the leaf length) and a gently wavy margin; clearly visible parallel veins run from base to tip with fine cross-veins between them.
```

### anubias: Anubias barteri var. nana (plant type `anubias`)
```
Species: Anubias barteri var. nana, submersed. Canvas 3:2 landscape, a grid of 3 columns x 2 rows. Top row: three leaves seen from their upper side, a very dark glossy green, thick and leathery, one slightly lighter. Bottom row: the undersides of the same three leaves in the same order, the outline mirrored left-right, a paler matte green with a raised midrib. Leaves are broad and oval to slightly arrow-shaped, about twice as long as wide, with a rounded blunt tip, a smooth margin and a stout straight stalk (about a quarter of the leaf length); a strong pale midrib and a few arching side veins; waxy surface.
```

### stem: generic green stem plant, Hygrophila / Bacopa type (plant type `stem`)
```
Species: a common green aquarium stem plant (Hygrophila polysperma 'Rosanervig' / Bacopa caroliniana type), submersed. Canvas 3:2 landscape, a grid of 4 columns x 2 rows. Top row: four leaves seen from their upper side, a fresh light to mid green, each slightly different in size. Bottom row: the undersides of the same four leaves in the same order, the outline mirrored left-right, paler green. Leaves are narrow-oval to lance-shaped, about three times as long as wide, tapering to a point, with no stalk (the base sits directly on the stem); a pale midrib and faint side veins; smooth margin.
```

### stemred: Alternanthera reineckii, red stem plant (plant type `stemred`)
```
Species: Alternanthera reineckii (red-leaved stem plant), submersed. Canvas 3:2 landscape, a grid of 4 columns x 2 rows. Top row: four leaves seen from their upper side, olive-bronze to wine-red, each a slightly different shade from olive-green to deep red-brown. Bottom row: the undersides of the same four leaves in the same order, the outline mirrored left-right, a deep wine red to purple-red. Leaves are narrow-oval to lance-shaped, about three times as long as wide, tapering to a point at both ends, no stalk; a slightly paler midrib; smooth margin.
```

### rotala: Rotala rotundifolia (plant type `rotala`)
```
Species: Rotala rotundifolia, submersed. Canvas 3:2 landscape, a grid of 4 columns x 2 rows. Top row: four leaves seen from their upper side, narrow and linear-lance, about five times as long as wide, light green with a pink-orange flush toward the tip, each a little different. Bottom row: the undersides of the same four leaves in the same order, the outline mirrored left-right, paler green-pink. No stalk (the base sits on the stem); a single fine midrib; smooth margin; slightly translucent.
```

### ludwigia: Ludwigia repens 'Rubin' (plant type `ludwigia`)
```
Species: Ludwigia repens 'Rubin', submersed. Canvas 3:2 landscape, a grid of 4 columns x 2 rows. Top row: four leaves seen from their upper side, broad oval, about one and a half times as long as wide, with a very short stalk, olive-brown to deep red, each a different shade, with a paler midrib and faint side veins. Bottom row: the undersides of the same four leaves in the same order, the outline mirrored left-right, a bright wine red to crimson. Smooth margin, a softly pointed tip.
```

### balansae: Cryptocoryne balansae (plant type `balansae`)
```
Species: Cryptocoryne balansae, submersed. Canvas 3:2 landscape, a grid of 3 columns x 2 rows. Top row: three leaves seen from their upper side, long and narrow like a ribbon, about eleven times as long as wide, mid-green with a slightly bronze tint, the surface crinkled and puckered between the veins, the margin strongly wavy all along its length; a very short stalk at the base. Bottom row: the undersides of the same three leaves in the same order, the outline mirrored left-right, paler green with a visible midrib and fine parallel veins. Each leaf fills its cell from bottom to top.
```

### buce: Bucephalandra 'Kedagang' (plant type `buce`)
```
Species: Bucephalandra 'Kedagang', submersed. Canvas 3:2 landscape, a grid of 3 columns x 2 rows. Top row: three leaves seen from their upper side, dark green to blue-green with a faint blue-grey iridescent sheen and a hint of wine at the base, lance-shaped to narrow-oval, about three and a half times as long as wide, with a short stalk (about a sixth of the length), a slightly undulate margin and a fine paler midrib. Bottom row: the undersides of the same three leaves in the same order, the outline mirrored left-right, paler grey-green with a wine-red tint. Stiff and slightly leathery.
```

### fern: Microsorum pteropus, Java fern (plant type `fern`)
```
Species: Microsorum pteropus (common Java fern, the broad-leaf wild form, not 'Windelov' or 'Narrow'), submersed. Canvas 3:2 landscape, a grid of 3 columns x 2 rows. Top row: three leaves seen from their upper side, broadly lance-shaped, about four times as long as wide (widest a little below the middle, tapering evenly to a long pointed tip and more quickly to a wedge-shaped base), on a short stalk about a tenth of the leaf length. Leathery and slightly glossy, with a strong raised paler midrib and fine netted side veins running out toward the edge at an angle. A smooth margin with a few gentle, shallow waves (not toothed, not crinkled). Colours differ from leaf to leaf: one fresh mid green (a young leaf), one deeper green, one dark olive-green with a few small brown spots near the tip (an old leaf). Bottom row: the undersides of the same three leaves in the same order, the outline mirrored left-right, paler and duller green with the midrib standing out (no spore dots). Each leaf fills its cell from bottom to top.
```
(2026-11-27, lane plants-2: the first sheet asked for "about ten times as long as wide" and drew the narrow 'Windelov' look; Nathan's tank and the common form are about 4:1. Cut it with a wider cell: `plant-leaves.py` `fern` cell (40, 448) -> about (112, 448).)

### ozelot: Echinodorus 'Ozelot', spotted sword (plant type `ozelot`)
```
Species: Echinodorus 'Ozelot' (spotted Amazon sword), submersed. Canvas 3:2 landscape, a grid of 3 columns x 2 rows. Top row: three leaves seen from their upper side, a mid green to olive with scattered irregular dark red-brown blotches and streaks (leopard-like markings), lance- to oval-shaped, about four and a half times as long as wide, with a long stalk (about a quarter of the length), a ruffled wavy margin and strong parallel veins. Bottom row: the undersides of the same three leaves in the same order, the outline mirrored left-right, a paler yellow-green to pinkish with the blotches showing through faintly.
```

## Marimo skin sheet (R182, 2026-11-26)

Nathan 2026-11-26, after three procedural passes ("lol still quite bad"): "maybe the chatgpt sheet for a skin on a lumpy
ball model with you adding fuzz". Not a leaf sheet: one prompt on its own (no shared block). Save as
`C:\Users\nreed\fish-sheets\plants\marimo-d1.png`. Use: the left half is a seamless tile wrapped over the lumpy ball
(triplanar, so no seam or pole pinch); the right half gives the fringe: its loose filaments against white become
alpha cards round the outline, and the tile's light/dark drives a few short fur shells for the velvet.

```
Create a texture reference sheet for a marimo moss ball (Aegagropila linnaei) for texturing a 3D model. Canvas 2:1 landscape, split into two square halves.
LEFT HALF: a seamless, tileable square texture of the marimo's surface, seen straight down from above as if the ball's skin were flattened: a dense velvet of fine, short, slightly curly green filaments, matted into small irregular tufts with darker creases between them, the tufts about one eighth of the square across. It must tile perfectly: the left edge continues into the right edge and the top into the bottom with no visible seam, and no tuft or spot repeats in a noticeable pattern. Fill the whole square edge to edge, no border, no vignette.
RIGHT HALF: on a pure white (#FFFFFF) background, the upper edge of the same ball seen from the side at a large scale: the velvet surface fills the bottom 60% of the square with a gently curved top outline, and above that outline the loose filaments stick out into the white, short and dense near the surface, a few longer stray wisps reaching further, all of them fine and clearly separated against the white.
Colour: a deep natural olive to moss green, with a few slightly yellower tips and darker olive in the creases; not lime, not neon, not blue-green. Flat, even, diffuse light: no cast shadows, no specular glare, no rim light, no glow, no water droplets, no bubbles. Photorealistic and faithful to a healthy aquarium marimo, not stylized, not a cartoon, no outlines. No text, labels, rulers or props.
```

## Java moss sheet (R182 lane JM step 2, 2026-11-26)

The look it serves: `research/moss-model-proposal.md`, "Java moss look, checked against photos". Lesson from the marimo:
hand-made hairs read as fake, and only a ChatGPT texture read as moss. So every visible part of the moss (the mat
surface, the ragged edge and the loose strands) comes from this sheet. One prompt on its own (no shared block). Save as
`C:\Users\nreed\fish-sheets\plants\javamoss-d1.png`.

What the bake script will cut from each panel:
- **Top left, mat tile:** a seamless top-down tile of the dense tangle, dark inside with lighter strands on top. It is
  the skin of the "alone" cushion and of the coat over wood or rock. Its light/dark also sets how thick the coat looks.
- **Top right, clump edge on white:** the side of a cushion with strands sticking out into the white. It is cut into
  alpha cards standing round the outline, so the silhouette is ragged and never smooth (the main thing today's model
  gets wrong).
- **Bottom, single strands on white:** separate branching strands, short to long, some drooping. They become alpha
  cards for the loose wisps on the sand (alone) and for the streamers trailing off edges (attached, the ivy spread).
  The white background gives a clean alpha.

```
Create a texture reference sheet of java moss (Taxiphyllum barbieri), the aquarium moss, for texturing a 3D model. Square canvas, divided into three panels: the top half is split into two square panels side by side, and the bottom half is one wide panel. Leave a thin white gap between panels.
TOP LEFT: a seamless, tileable square texture of a dense mat of java moss seen straight down from above. A thick, random tangle of very fine, thin, irregularly branching moss strands crossing each other in every direction, with no common direction and no pattern. The deep inside of the mat is very dark green, almost black-green, showing through gaps between the strands; the strands on top are lighter green, and the freshest tips are pale lime green. No individual leaves visible at this scale, just fine fuzzy threads. It must tile perfectly: the left edge continues into the right edge and the top into the bottom with no visible seam, and no clump repeats in a noticeable pattern. Fill the whole square edge to edge, no border, no vignette.
TOP RIGHT: on a pure white (#FFFFFF) background, a low cushion of the same java moss seen from the side, close up: the dense dark moss fills the bottom 55% of the square with a soft, slightly uneven flat top, and from its top and sides many thin strands stick out into the white, curving, branching, ends paler, some short and many reaching about a fifth of the square above the cushion. Every strand sharp and clearly separated against the white.
BOTTOM: on a pure white (#FFFFFF) background, eight separate single java moss strands laid out side by side, upright, not touching each other, each with plenty of white space around it: from short (one third of the panel height) to long (the full panel height). Each strand is a very thin stem with tiny pointed overlapping leaves along both sides, like a very small feather, and two to five irregular side branches at about 30 to 45 degrees. The two longest strands droop and curve to one side like a trailing streamer. Fine and crisp, every strand clearly separated against the white.
Colour: natural healthy aquarium java moss: medium moss green (about #3F7015), shadows deep black-green (about #12290A), fresh tips pale lime (about #8DC33E). Not neon, not blue-green, not olive-brown. Flat, even, diffuse light: no cast shadows, no specular glare, no rim light, no glow, no water droplets, no bubbles. Photorealistic and faithful to the real plant, not stylized, not a cartoon, no outlines. No text, labels, rulers or props.
```
