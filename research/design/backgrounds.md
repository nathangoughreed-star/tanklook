# BG2 / R126: what real tank backgrounds look like, and a more serious set for the app

Nathan 11-18: the four picture scenes (coral reef, river bed, planted jungle, rock wall) "look way too cartoony".
Today they are painted with canvas strokes in `src/art/bgscenes.ts` (flat saturated colour, vector corals, round blob stones).
Look sheet: `research/screens/BG2/bg2-looksheet.png` (today on top, 3 candidates below); full-size mocks in the same folder.

## Evidence quality (read this first)
Web search returned mostly retailer blogs and listings, thin on actual forum threads. Findings below are a consistent
pattern across sources, not a poll. Prices are retail listings seen 2026-11-18 (US unless noted), rounded; Fluval and
PetSmart/Petco pages did not come up, so those are not quoted.

## Popular types, ranked by how much hobbyists actually use them
1. **Solid black (vinyl cling, paint, Plasti Dip, black paper)**: the default for planted and most reef tanks.
   Hides cables and gear, maximises contrast, adds depth. Static-cling black PVC $6 to $11 per roll (Walmart listings);
   DIY paint or Plasti Dip about $10 to $20 (typical, unverified). App today: `black`. Keep.
2. **Solid / gradient blue (and frosted or white)**: blue is the classic reef and fish-only look; frosted white is the
   modern "hide the wall" choice for planted tanks and shrimp tanks. Blue cling $6 to $11. App today: `blue`, `lightblue`,
   `gradient`, `abyss`, `frosted`. Keep (see trims below).
3. **Printed photo posters (double-sided roll or sheet)**: the big-box staple (reef/planted/rock). Penn-Plax 24x48 in
   about $29 and 12x20 in about $13 (Tractor Supply); Seaview Aquascape 18x36 reversible (Chewy; price not captured);
   Aqua Culture two-sided 55 gal (Walmart); 12 in-tall bulk roll a few dollars per foot. Opinion is split: fine for fish-only
   and themed or kids' tanks; planted and aquascape folk avoid them because a busy print fights real hardscape, and a small
   print on a big tank looks weak. This is the category Nathan flagged.
4. **3D foam or resin rock and root backgrounds**: the "serious" upgrade, popular for cichlid rock walls and show tanks.
   Cheap foam panels $15 to $20 (LULULION PU foam $19.83, Walmart stone panel $14.99); premium custom pieces, Back to
   Nature style, run to hundreds (XXL Amazonas about 849 euro at Olibetta). Hard to fit after the tank is scaped.
   App today: relief backdrops already exist (`rock`, `river`, `reef`, `cork`, `moss`, `jungle` in `src/render/backdrop.ts`).
5. **Living or natural walls (plant mat, moss wall, cork)**: the most natural, high-maintenance. Covered by the existing
   `moss` and `cork` relief backdrops.

## What makes a background look real (and what makes ours look painted)
- **Photographic detail, low saturation**: real prints are muted, with dark neutral shadows. Ours are saturated
  (magenta/orange coral, bright cyan water) and flat-filled.
- **Depth of field**: planted and reef prints are shot soft, so fish stay the subject. We blur everything equally
  (2.5 px) but the shapes underneath are flat vector, so it reads as a blurred cartoon rather than a defocused photo.
- **Natural texture statistics**: stone and rock need multi-scale noise, ridges, directional lighting and ledges, not
  overlapping ellipses.
- **Dark edges and base**: nearly every good print fades dark at the bottom and sides (substrate and glass shadow).
- **Single light direction**, a faint blue-green water cast, and film grain.
- **Scale**: one big image across the whole tank, not a repeating motif.

## Proposed new picture set (6 options total with the solid ones kept)
Replace the four painted scenes; keep the solids that people really use.

| # | Option | Replaces | Type | Notes |
|---|---|---|---|---|
| 1 | Black | keep | solid | most popular |
| 2 | Frosted white | keep | solid | planted / shrimp favourite |
| 3 | Deep reef blue (to black) | keep `blue` + `abyss`; drop `gradient` | solid fade | classic reef |
| 4 | **Stone wall** (dark slate / stacked rock) | `rockscene` | picture | cichlid / Rift Lake / hardscape look; candidate 1 |
| 5 | **Planted stream** (soft green foliage, dark floor) | `plantscene` + `riverscene` (merge) | picture | candidate 2 |
| 6 | **Blue water + hazy reef** (muted, dark base) | `reefscene` | picture | candidate 3 |

Drop outright: `riverscene` (round-stone bed reads cartoonish and overlaps the 3D `river` backdrop), `lightblue`,
`sand`, `green`, `grey`, `white` can stay as plain colours since they cost nothing; only the pictures are in scope.
Recipe references (`mixed-reef`, `lps-coral-garden` use `reefscene`) map to option 6; `plantscene` users map to 5.

## How to make the pictures (no commercial artwork copied)
- **Option A, procedural, photo-statistics (recommended for 4 and 5)**: multi-octave ridged noise, quantised ledges
  and normal-lit shading for the stone wall; layered, depth-blurred leafy stems with bokeh and a dark floor for the planted
  scene; grain and vignette on both. Zero licensing, tiny, deterministic, tiles at any aspect. The mocks on the look sheet
  are a first quick pass of this; production version would be baked from a Node/WebGL script into a ~1024x512 JPEG so it
  loads faster than drawing at runtime.
- **Option B, real photographs (best for reef, where procedural will not read as photo)**: use only public domain / CC0,
  recording source, author, licence and URL in `public/credits` (or equivalent) per image. Candidate sources:
  Poly Haven (all CC0, rock/cliff textures and HDRIs, confirmed in its licence FAQ), ambientCG (CC0 per third-party
  summaries; verify per asset), NOAA Photo Library underwater images (US government, generally public domain; check each
  record), Wikimedia Commons images explicitly marked Public Domain or CC0 (not CC-BY-SA). I did not select specific files
  yet; next step if Nathan wants real photos. Never crop a poster from a retailer.
- Blur and darken the photo at bake time (depth of field, 55 % brightness at the edges), then it behaves like the other tiles.

## What the candidate mocks show (look sheet)
Procedural textures composited on a flat mock tank at 1280x800 (not the live three.js render, which cannot run in this
checkout without installing the dependencies):
- `bg2-cand-rockwall.png`: dark ledged slate, reads as stone at tank scale. Strongest of the three.
- `bg2-cand-plantedblur.png`: soft green foliage in depth, dark floor. Reads as defocused plants; leaf bokeh is a bit regular.
- `bg2-cand-bluewater.png`: muted blue water, rays, hazy reef silhouettes. Least photographic; real reef photograph (option B) would beat it.
Script: `scripts/bg2-lookmock.py`.

## Decision for Nathan
1. Procedural for stone + planted, real CC0/NOAA photo for the reef? Or procedural for all three?
2. Merge river bed into planted stream and drop it (recommended), or keep a separate river option?
3. Fine to drop `gradient` (keep `blue` and `abyss`)?

---
## Phase 2 (built 2026-11-18, Nathan's answers via C27)
Decisions: reef from a real public-domain photo; river bed kept (more is better); blue gradient kept; planted AND river both
read as photographs. The mock procedural textures above were ideas only and were NOT used (planted looked cartoony).
All four picture scenes are now real photographs, baked by `scripts/bg2-bake.py` into `public/art/bg/*.jpg` (about 70 to 105 kB each):
blurred for depth of field, desaturated, tinted, dark base and edges, light grain. Ids unchanged (`reefscene` `riverscene` `plantscene` `rockscene`),
so saved tanks keep working. Loader: `src/art/bgscenes.ts` + `sceneTexture` in `src/render/textures.ts` (dark fill until the photo loads, no flash).
The painted code is gone.

### Credits (source, author, licence)
| Scene | File | Source | Author | Licence |
|---|---|---|---|---|
| Coral reef | `reef.jpg` | Wikimedia Commons, "Colorful underwater landscape of a coral reef.jpg" (originally public-domain-image.com) | Jim E. Maragos, U.S. Fish and Wildlife Service | Public domain (US government work) |
| Planted | `plant.jpg` | Wikimedia Commons, "Nature Aquarium Aquascape.jpg" (underwater planted belt only; a small fish painted out) | Dileepkumardr | CC0 |
| River bed | `river.jpg` | Poly Haven, "Ganges River Pebbles" (polyhaven.com/a/ganges_river_pebbles) | Amal Kumar | CC0 |
| Rock wall | `rock.jpg` | Poly Haven, "Rock Wall 08" (polyhaven.com/a/rock_wall_08) | Amal Kumar | CC0 |
Poly Haven licence FAQ: all assets CC0. Note: the Commons aquascape photo may be digitally generated; it is CC0 either way.

### Live check
Real renderer (dev server, headless Chrome, 1280x800), every scene before and after: `research/screens/BG2/before-after.png`
(left before, right after, rows reef / river / planted / rock); full shots in `research/screens/BG2/live/<scene>-before|after.png`.
Known limits: the reef photo still shows two small clownfish (blurred); the 2.5:1 tiles crop the middle on other tank shapes.
