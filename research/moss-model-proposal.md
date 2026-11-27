# Moss rework: research and modeling proposal (R182, 2026-11-26)

Nathan 2026-11-26, on a screenshot of the java moss mounds on a rock stack: "i want moss balls as a plant, but honestly
this looks nothing like java moss lol ... Preferably it would look one way if alone and another way if it was attached
to an object and growing on it where it spreads more like ivy rather than a ball".

## Why today's moss looks wrong

`moss` in `src/art/plants.ts` (form 'moss', built in `src/render/plant3d.ts` at `P.form === 'moss'`) is a solid dark
sphere with ~300 flat leaf cards stuck on it pointing outward. Real java moss has no core and no dome: it is a
tangle of thin irregular strands. The cards read as ivy leaves, the core reads as a green rock. It has no painted
leaf sheet (`tex`), so the 11-26 colour ('lum') and edge-feathering changes never reached it.

## What the real plants look like (research, not yet checked against photos)

Source: a research pass over retailer and reference pages (URLs below). The pass could read text only, so
**no photo has been looked at yet**. Per `research/species-art-method.md` the looks below stay unreviewed until
photos are put beside a render.

| Plant | Alone | Attached to wood / rock | Strand | Colour (estimates) |
|---|---|---|---|---|
| Java moss (Taxiphyllum barbieri) | shaggy, slumped tangle 2-4 in thick, strands every way, sheds wisps | fuzzy layer 0.5-1.5 in thick creeping sideways over the surface; trails off edges in strands 2-6 in | irregular random branching, 1-2 mm leaves, no fronds | core #2F5A1E, mid #5E8F2E, tips #8FBF45 |
| Christmas moss (Vesicularia montagnei) | fluffy, fronds jumbled | 0.5-1 in layer of fir-tree fronds overlapping like shingles, little trailing | triangular fronds, regular side branches | #2E5E1F / #4F8A2B / #7DB542 |
| Flame moss | upright twisting tuft | creeping mat with wavy upright shoots 1-3 in tall, no trailing | upright spiral shoots, sparse branches | #3F7A28-#5A9B30, tips #78B83F |
| Weeping moss (Vesicularia ferriei) | mound of hanging shoots | curtains hanging off edges 2-6 in | Christmas-like fronds that droop | #5FA032-#78B03E, tips #9ACD4A |
| Marimo ball (Aegagropila linnaei; an alga) | velvety fuzzy ball 1-2 in (up to 5 in), flattened / lumpy underside if never turned, paler or brown underneath | **never attaches**: a free ball, alone or in groups on the substrate | dense filaments radiating from the centre | #2F6B2A-#3F7F2F, brighter on the lit side |

Attachment (java-moss family): rhizoids grip rough wood and rock. New moss is tied on with thread or glued and
covers the thread in 3-6 weeks. A moss wall or carpet is the same plant pressed flat and trimmed to 0.5-1 in.

Note: in the hobby "moss ball" means marimo. Nathan's "one way alone, another attached, spreading like ivy" fits
java moss (and Christmas / flame / weeping), not marimo. So this proposal makes them two plants.

URLs (pages with whole-clump and close-up photos; open and check before drawing):
- Java moss: https://aquasabi.com/Taxiphyllum-barbieri-Java-moss ; https://terrariumtribe.com/?p=3493 (driftwood close-up) ; https://buceplant.com/a/amp-1/products/java-moss-on-driftwood ; https://www.flowgrow.de/db/aquaticplants/taxiphyllum-barbieri ; https://en.wikipedia.org/wiki/Taxiphyllum_barbieri
- Christmas moss: https://www.nparks.gov.sg/florafaunaweb/flora/5/8/5829 ; https://tropica.com/en/plants/plantdetails/4397/4397 ; https://buceplant.com/a/amp-1/products/christmas-moss
- Flame moss: https://www.amazonasmagazine.com/2020/07/24/plant-spotlight-taxiphyllum-sp-flame/ ; https://aquasabi.com/Taxiphyllum-sp-Flame-Moss ; https://buceplant.com/blogs/news/plant-profile-flame-moss
- Weeping moss: https://aquasabi.com/Vesicularia-ferriei-Weeping-Moss ; https://tropica.com/en/plants/plantdetails/4398/4398
- Marimo: https://en.wikipedia.org/wiki/Marimo ; https://aquasabi.com/Aegagropila-linnaei-S-2-4-cm-3x ; https://www.cantonaquatics.com/products/marimo-moss-ball-aegagropila-linnaei

## Java moss look, checked against photos (lane JM step 1, 2026-11-26)

Photos looked at (downloaded to scratchpad only, not committed): aquasabi.com product 4202 images 1-3
(https://aquasabi.com/Taxiphyllum-barbieri-Java-moss), flowgrow.de detail images 4f7a0136d4ab4, 51da5db681b34,
52361a5f8ba78, 53c587287e3c8 (https://www.flowgrow.de/db/aquaticplants/taxiphyllum-barbieri), Wikimedia Commons
File:Javamoos.jpg and File:Sphaerichthys_vaillanti_above_Java_moss.jpg. Sheet labels A1-C2 below match the sheet shown
to Nathan (A1 = Sphaerichthys photo, A2 = flowgrow 4f7a0136, A3 = aquasabi 1, B1 = aquasabi 2, B2 = flowgrow 51da5db6,
B3 = aquasabi 3, B4 = flowgrow 52361a5f, C1 = Javamoos.jpg, C2 = flowgrow 53c58728).

**What it is at tank distance:** fine, shaggy green fuzz with a ragged outline. No leaf shapes are visible at all
(a leaf is 1-2 mm). What reads is (1) a dark, nearly black-green inside seen through gaps, (2) many thin lighter
strands on top and at the edge, crossing every way, and (3) an outline that is never smooth: strands poke out of it
everywhere. Today's model fails on all three: a smooth round core, and cards that read as leaves.

**Alone (A1-A3):** no ball and no core. A low, slumped cushion or tangle, flat-topped, about 3x wider than tall
(a 3 in clump is about 1 in high). The top is a dense mat of crossing strands; the sides break up into loose strands
sticking out 0.5-1.5 in, curving, ends paler. A few loose strands lie flat on the sand around it (A1). A2 shows an old
mound: still flat-topped and soft-edged, fuzz all over, darker low down.

**Attached (B1-B4):** the moss takes the host's shape: the wood or rock silhouette inflated by a shaggy coat
0.5-1.5 in thick (B1, B2). Thicker and brighter on top and on the lit side, thin and dark underneath. Uneven: it
clumps along a branch with gaps where bark shows (B2). Off edges and from the underside, strands trail outward and
somewhat down as wispy streamers 1-4 in long (B3), which is the "ivy" spread Nathan described. Old growth (B4)
becomes a deep tangle of long, crossing, lighter strands over a dark base, no surface showing.

**Close-up (C1, C2):** each strand is under 1 mm wide, with tiny pointed overlapping leaves along both sides like a
very small feather (C2, translucent, pale lime). Strands branch irregularly every 1/8-3/8 in at about 30-45 deg and
run in no common direction (C1). Fresh tips are the palest.

**Colour (sampled from B1, A2, B2, A3, C1, green pixels only):** shadow/inside #12290A, mid #3F7015 (range
#2F6215-#5A8621), lit tips #8DC33E (fresh up to #BBE276). The light-to-dark contrast is strong and is what gives the
depth; the earlier estimates (#2F5A1E / #5E8F2E / #8FBF45) were too gray in the shadow.

**What a render must get right (the check for steps 3-4):** ragged outline with strands sticking out; dark inside,
lighter strands on top; no visible leaf shapes or round core; flat cushion alone, host-shaped coat with trailing wisps
when attached.

## Proposal

### 1. Marimo ball: a new plant (small, self-contained)
- New species `marimo`, form 'ball': a sphere 1-2 in across (size range up to 5 in), the bottom ~15 % flattened
  where it rests, slightly lumpy (low-frequency noise on the radius).
- The fuzz: 3-4 concentric alpha shells ("fur shells") with a filament-noise texture, each a little larger and
  sparser, so the outline reads soft at 1-2 ft. Cheap (a few hundred triangles per ball). No leaf cards.
- Colour: deep green, lighter on top, a touch browner on the resting side.
- Placement: substrate only; it may sit in a group (a clump of 3-5 balls of mixed size). It is never attached;
  dropped on a rock it rolls to the ground (or rests in a hollow).
- Growth: ~0.2 in per year, so it barely grows on the timeline.

### 2. Java moss: strands, and two growth modes
**Strands instead of cards.** Each strand is a thin curved ribbon (a crossed pair of narrow quads along a
polyline) with 2-4 irregular side branches, carrying a painted "moss strand" alpha texture (tiny overlapping
leaves along the edge, from a ChatGPT sheet like the R151 leaf sheets). A clump is a few hundred strands. No core
ball: where the strands are dense the inside is dark by ambient occlusion (vertex colour by depth into the clump).

**Alone (on the substrate):** a slumped tangle, wider than tall (about 3:1), strands lying every way, a few loose
wisps standing out from the edge and lying on the sand around it.

**Attached (dropped on a rock or wood):** the moss becomes a skin on that object.
- At placement, sample the host's surface around the drop point (points + normals from its mesh triangles within a
  radius, measured along the surface so it does not jump gaps).
- Strands lie along the surface (tangent to it, pressed in 0.5-1.5 in thick), oriented with a slight up-and-outward
  bias like the photos.
- Where the surface turns down past an edge (normal pointing down or sideways at a lip), strands hang free as
  trailing wisps 2-6 in long: the "ivy" look.
- Growth spreads the covered area outward from the anchor along the surface over the timeline (the radius grows),
  so a fresh tie-on is a small patch and an old one blankets the stone and drips off its edges.
- The moss moves and is deleted with its host (stored on the item as `on: <host item id>` plus the anchor point in
  the host's frame).

**Later variants on the same strand system** (parameters only, no new code): Christmas moss (flat triangular
fronds, shingled), flame moss (upright twisting shoots), weeping moss (fronds that droop, long curtains).

### 3. The java moss brush
`javamoss` in `src/render/brushmesh.ts` paints lumpy domes over the ground. Give it the same strands in the
"alone" look once step 2 exists, so painted moss and the placed plant match.

## Engineering notes and risks
- Today plants and brushes only know the ground height (`GroundAt(x, d)` in `src/render/scatter.ts`); plants on
  rocks only "hug" the stone by sinking the core ball. Surface sampling of a hardscape mesh is new. It must be
  deterministic from the item seed and the host's transform, and redone when the host moves.
- Check whether plant geometry is built in the worker (`plant3d.gpu`, worker build): if so, the host's surface
  samples must be passed to the worker, not its mesh.
- Strand count per clump capped like `MAX_LEAFLETS` so a moss-covered scape does not blow the frame budget.
- Picking and the selection box should select the moss, not the rock under it.

## Marimo: built 2026-11-26 (step 2), waiting on Nathan's look
Nathan picked "Marimo first". Reference photos (Wikimedia Commons, looked at): an aquarium ball on gravel
https://commons.wikimedia.org/wiki/File:Ga%C5%82%C4%99zatka_kulista_(Cladophora_aegagropila).jpg and three balls in a
flask https://commons.wikimedia.org/wiki/File:Aegagropila_conical_flask.jpg. Written look: a lumpy ball a little wider
than tall, flat where it rests; a dense short velvet (outline soft, no leaf shapes); olive to moss green in soft
mottled patches, yellower where lit, dark olive underneath.
Built as plant `marimo` (form 'ball', `src/render/plant3d.ts`): a 48x32 lumpy core with mottled vertex colours, and
~1,500-3,000 short hairs along its normal (the coat thickens a little with growth). Side-by-side:
`research/moss-refs/marimo-side-by-side.jpg` (render alone: `marimo-r182-render.png`). Tuning in this pass: first render
was lime and smooth (a green pea), then darker olive colours, stronger and finer mottling, longer denser hairs.
Pass 2 (Nathan 2026-11-26, "needs more depth and texture"): tufts. Two octaves of value noise raise the surface into
clumps (7 % of the radius) with creases between them; creases much darker, crests lighter; hairs longer and lighter on
crests, short and dark in creases; core 72x48. Before/after beside the photos: `research/moss-refs/marimo-pass2-before-after.jpg`.
Pass 3 (Nathan 2026-11-26, "Needs more", "fuzzy"): deeper tufts (10 % of the radius), a fine filament grain in the
colour, a longer thinner coat (up to 6,000 hairs on a big ball), and one hair in ~8 a loose stray filament 2.5-4.5x
as long: the scraggly halo of the photos. Shown in an orbit viewer artifact (https://claude.ai/artifact/Vpd2QqRdpgq8RPGhB8S5bq).
Pass 4 (Nathan 2026-11-26: "lol still quite bad ... maybe the chatgpt sheet for a skin on a lumpy ball model with you
adding fuzz"): the hairs are gone. ChatGPT sheet `C:\Users\nreed\fish-sheets\plants\marimo-d1.webp` (prompt in
research/plant-sheets/prompts/leaf-sheet.md); `scripts/marimo-skin.py` bakes `public/art/plants/marimo.webp` (the velvet
tile made seamless and projected triplanar into the sphere's uv: no seam, no pole pinch; four fringe cards cut along the
sheet's outline, alpha from its white) and `src/data/plantart/marimo.json`. The marimo has its own texture
(`PLANT3D.marimo.ownTex`, `ownAtlas` in render/plantAtlas.ts, a material keyed by it in render/items.ts). Ball: lumpy
core wearing the skin, vertex colours shade only; ~22-28 fringe cards per 1000 mm2 stand along the normal, foot sunk in
the skin, darker than the skin. Side-by-side: `research/moss-refs/marimo-pass4-side-by-side.jpg`. Known gap: the
USDZ (iPhone AR) export bakes colours from the shared leaf atlas, so the marimo's texture is not in it yet.
**Parked 2026-11-26** (Nathan on pass 4: "honestly still looks pretty bad. lets try to work on the java moss for now").
The marimo stays in the library as pass 4 but is not approved. Lessons for the moss work: hand-made hairs and coats read as
a pea, a pincushion or a fuzzy toy at every density we tried; the ChatGPT texture was the first pass that read as moss at all.
Not done: groups of 3-5 as one item, rolling off rocks onto the substrate (today it can be raised onto hardscape
like any plant).

## Steps (each with its gate)
1. Photos: open the URLs above (or harvest with Claude in Chrome), pick 2+ per look (alone, attached, close-up),
   save to `research/moss-refs/`, record URLs. Gate: Nathan agrees they show the look.
2. Marimo: build, render beside its photos. Gate: Nathan approves the side-by-side.
3. Strand sheet: ChatGPT moss-strand sheet (prompt beside `research/plant-sheets/prompts/leaf-sheet.md`).
4. Java moss "alone" with strands, beside its photos. Gate: Nathan.
5. Attached mode: host surface sampling, skin + trailing, growth spread. Gate: Nathan, on a rock and on driftwood.
6. Variants (Christmas, flame, weeping) and the brush.
