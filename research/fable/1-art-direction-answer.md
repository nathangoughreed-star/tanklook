# Answer 1: one stylization spec for every TankLook asset class

Fable, 2026-11-25. Answers `1-art-direction-brief.md`. I looked at all 16 pictures in `1-art/`, pictures 04 and 15 in `2-first-visit/`, the leaf atlas (`public/art/plants/leaves.webp`), and the cited plan, lane brief, prompt, request rows and material code. Numbers marked "measured" come from a pixel count I ran on the brief's pictures (HSV saturation S and value V, 0 to 1; luminance L); everything else is judgment by eye.

## 1. Lane now, or after behavior?

**Behavior keeps the main lane. Stylization gets one small lane now, limited to three fixes, not a whole-scene pass.**

- Behavior is what rivals are judged on, and the fish are only 30 to 80 px long at default framing, so their motion is most of what a fish contributes to the picture. It deserves the larger effort.
- But the first impression is a still. The example tank a visitor opens, a shared image and a search-result thumbnail are all judged in two seconds, before any behavior can be seen. Share links are gap 2 in the competitor research, and every share is a still of exactly these renders.
- The three fixes below are colour tables and a build queue. They touch no swim code, so they cannot collide with the behavior lane, and each is checked by re-shooting pictures 02, 03, 06 and 11.
- A whole-scene pass (gear finishes, room, rock form, thumbnails) is not worth a lane yet. Do it after behavior, in the order of section 4.

**The one asset class that most hurts the first impression: plants**, specifically the stem plants, grass and carpet in the freshwater tanks (02, 06, 07, 09).

- They cover more of the tank than anything else, and they are about twice as saturated and twice as bright as the approved fish. Measured: approved fish texture median S 0.39, L 0.25; green plant pixels in 06 median S 0.71, L 0.57; red stems S 0.80 with half the pixels above S 0.8; carpet in 08 S 0.83; grass in 09 L 0.68.
- The result reads as plastic aquarium plants around field-guide fish. The neons in 06 look grey beside them, which is the reverse of a real tank.
- Reef rock (03, 11) is the worst single object, and the old outlined fish are the farthest in kind, but plants cost the most pixels in the most common tank.

One thing the brief could not settle matters here. The leaf atlas itself is already at the spec: its leaves are muted olive, bronze and maroon. The live renders show lime and orange. So either the captures predate batch 2 of the atlas (commit 85f41835), or the painted colour is being overridden on the way to the screen (vertex `cols` multiplied back in, or the plant cards taking full light with no facing term). The first step of the plant fix is to find out which.

## 2. The spec

Anchor: the right column of picture 00. What makes that style, stated so it can be checked on any asset:

**S1. Colour.** Hue is the real thing's hue. The body of an asset is muted; strong colour is a small accent that the real animal, plant or product actually has.
- Asset texture (before scene light): median S between 0.25 and 0.55.
- At most about 15% of an asset's pixels above S 0.8, and only where the real thing has a signal colour (neon stripe, betta fins, red plant tips, a zoanthid). Measured on the approved fish: 12% overall, 0% on the angel and cory, 31% on the betta.
- Greens: hue olive to leaf green, never lime. Median S at most 0.60 as rendered.
- No two asset classes share a saturated hue by accident. The orange of the old rasboras, the red stems and the leaf litter in 02 and 04 are nearly the same orange.

**S2. Value range.** Inside the glass nothing is pure black and nothing is paper white.
- Asset texture median L between 0.20 and 0.45 (approved fish: 0.14 to 0.46 by species, 0.25 overall).
- Rendered pixels inside the tank stay between L 0.04 and 0.85. The white sand in 03 and 11 sits at 0.94 and up; the black gravel in 08 has a median of 0.13, which is fine.
- The brightest things in a tank are the water line and the animals' accents, not the scenery.
- The room is the quiet frame: S at most 0.12, L 0.70 to 0.85, and the same room for every example. Today 02 and 04 are cream and 03 is a lavender gradient.

**S3. Edges.** Shape comes from the silhouette and soft form shading. Nothing has a drawn outline.
- No outline strokes on any asset. The old fish (02, 04, 09, 10, 11) and the terrarium leaves fail this.
- Silhouette edges are anti-aliased over about 1 px. No visible stair-steps at default framing (stems in 07, grass in 09).
- No straight-sided flat polygons visible as such. A leaf under about 6 px wide should merge into a mass instead of showing as a diamond. Reef rock facets in 11 fail this.

**S4. Texture detail.** Every asset carries three sizes of detail, and the smallest is quiet.
- Silhouette: features over 1 in.
- Mid form: features from 1/4 in to 1 in (veins, strata, scale rows, panel seams).
- Fine grain: features from 1/32 in to 1/8 in, with contrast at most about 10% of local luminance.
- An asset missing a level reads as a toy (plants and gear have only a silhouette); an asset with loud fine grain reads as noise (the dragon stone speckle in 08, the white root scribbles in the substrate cross-section in 08).

**S5. Scale of detail per inch.** One density for the whole world, set by the fish.
- A neon about 1.5 in long carries roughly 30 scale columns, about 20 features per inch. Nothing in the tank should be finer than that or coarser than about 2 features per inch on a surface larger than 2 in.
- At default framing a 3 ft tank is about 30 CSS px per inch, so anything finer than about 1/16 in is invisible. Do not spend texture bytes there.
- Texel density within a factor of 2 across classes at the same distance. Catalogue thumbnails follow the same rule: drawn from the scene's own asset, not from a photo (the gravel swatches in 15 are glossy photo marbles).

**S6. Sheen.** Field-guide lighting: matte, with at most a broad soft lift.
- No pinpoint specular highlights anywhere.
- A broad sheen may lift luminance by up to about 15% on surfaces that are really glossy or wet: fish flanks, waxy leaves (anubias), clear tubes, glazed gear.
- Iridescence is reserved for animals.
- Hard highlights are allowed only on the water line and the front pane reflection, which exist today and are right.

**S7. Lighting response.** The texture is evenly lit; the scene adds one soft key from above. Every asset must show that it is in the tank's light.
- No baked shadows or glare in any texture.
- Every asset is visibly brighter toward the lamp and darker toward the bed: at least 15% darker at the substrate than in the top third, and undersides and hollows at least 30% darker than tops. No asset is uniformly lit top to bottom. Plants in 02 and corals in 03 are.
- Everything that rests on the bed has a contact shadow.
- Water tint and depth shift apply to every in-tank class by the same formula. 04 shows this working: it is the most unified picture in the set.

Check method: add the S and L count I used to `scripts/vf-shots.mjs`, per class mask, and print pass or fail against S1 and S2. S3 to S7 stay a side-by-side look against picture 00.

## 3. Ranking by distance from the spec (farthest first) and one fix each

| # | Class | Why, and where to see it | The one fix |
|---|---|---|---|
| 1 | **Fish, unapproved (old cards)** | Dark outline and flat fills, the look rejected twice as cartoony. Fails S3 and S4. Rasboras in 02 and 09, the school in 04, the cichlid in 10, clownfish and gramma in 11. They are more visible than the approved neons. | Reorder the build-B queue (`research/fish-sheets/PIPELINE.md`) so every species used in a shipped example tank goes first. Until then, use only approved species in the examples. |
| 2 | **Plants** | Fails S1, S2, S4 and S7. Lime and orange at twice the fish's saturation and brightness; flat diamond leaves with no veins visible; lit evenly from top to bottom (02, 06, 07, 09). | Make the rendered leaf colour the atlas colour as painted. Re-shoot 06 on a build that has batch 2; if green median S is still over 0.60 or L over 0.45, remove the `cols` multiply for textured types and add one plant exposure constant in `plantMaterial`'s `post` (`src/render/items.ts`). Then sheet the untextured families. |
| 3 | **Reef rock and coral** | Fails S1, S2, S3 and S7. Coralline is a pastel lavender (measured median V 0.80, about #9a79ca) that looks sprayed on; facets show; corals are white or pastel with no shading (03, 11, 12). The VF7 darkening in `coral3d.ts` line 81 is not visible in these captures. | In `src/render/coral3d.ts`, confirm the VF7 palette is what ships, then hold coralline to V at most 0.50 as rendered and break its edge with the grit mask instead of a smooth blend. Corals take the same top-to-bottom light term as rock. |
| 4 | **Substrate** | Mixed. Black gravel in 08 and natural gravel in 14 are close to the spec. White sand in 03 and 11 clips to white with no grain (fails S2 and S4). The root lines in the 08 cross-section read as a glitch. | Lower the white and aragonite sand albedo in `SUBSTRATES` (`src/art/placeholder.ts`) so rendered L stays under 0.85, and ship the existing `sand` detail flag (`FX_DEFAULT` in `src/render/fx.ts` has it off). |
| 5 | **Gear** | Fails S4 and S6: silhouette only. The hang-on-back filter in 14 is a matte black slab; lights and skimmer in 12 are flat shapes. Colours are true, which is the house rule and is right. | Add a `finish` (matte, satin, clear) to `PartColour` in `src/data/gearCatalog.ts`, and in `src/render/gear/common.ts` give `WET` and `ROOM` a lighter bevel line on edges plus the broad S6 sheen for satin parts. |
| 6 | **Room, stand, backdrop** | Fails S2 by inconsistency: cream in 02 and 04, lavender in 03; the scale person is a flat slate-blue cut-out (first-visit 04); the side pane in 03 and 12 is a loud baby-blue panel. | One neutral room for all examples in `src/render/backdrop.ts` and the example definitions (S at most 0.12), with a soft floor shadow under the stand. |
| 7 | **Hardscape: stone and wood** | Near the spec. Soft edges, contact shadows, grit. Misses the mid level of S4: the dragon stone in 08 is a ball with speckle, the stones in 09 have no planes. Wood in 10 is good but a little orange (S 0.73). | Add one mid-frequency layer (1/4 in to 1 in strata and pits) to `GRIT` in `src/render/gritTex.ts` and cut the fine speckle contrast by about half. |
| 8 | **Glass and water** | At the spec. The green edge, water line band and pane reflection in 13 are the only hard highlights and they belong. | Leave alone. |
| 9 | **Fish, approved (build B)** | This is the spec. In 06 and 14 they hold up at 40 px. | Leave alone. Do not restyle them to match the scenery; bring the scenery to them. |

The small lane now is rows 1, 2 and 3. Rows 4 to 7 follow the behavior work, in that order. Row 4's sand change is two constants and could ride along with the lane if it stays that small.

## 4. What to leave alone, and tradeoffs

- **Keep the unlit pipeline.** Every fix above is a colour table, a texture or a few lines in an existing shader patch. Do not move to physically based materials: `aqPatch` is in every program and each line lengthens the cold shader link, and real specular would break S6.
- **Keep procedural plant geometry, growth and sway.** R151's approach is right; the problem is colour and light, not shape.
- **Keep real gear colours.** The fix adds finish and edge, not new colour.
- **Download size.** The atlas is 417 KB for 13 families. Per S5, carpet and other leaves under 1/4 in gain nothing from texture at default framing; give them small cells.
- **The terrarium (05) is evidence the spec is reachable.** Its greens measure S 0.63 and L 0.39, close to the spec with the same generator. It still fails S3 on leaf outlines, but it is hidden scope and can wait.

## 5. Uncertainty

- The fish numbers are from the sheet texture before scene light; the plant and rock numbers are from rendered pixels after light and ACES. They are not strictly comparable. The by-eye comparison inside one frame (06) agrees with them, so I trust the direction and the rough factor of two, not the decimals.
- Software GL may not show the multisampling a real GPU gives, so the stair-step part of S3 may be milder for visitors than in 07 and 09.
- I could not tell whether the live captures include atlas batch 2. If they do not, the plant gap is smaller than it looks and the plant fix is mostly already shipped; the re-shoot in row 2 settles it.
- One frame, default flags, example tanks only. I did not see every stone, wood or coral type, or any plant family beyond those in the examples.
- The spec's ranges are fitted to five approved fish. Treat them as starting gates to tune after the first re-shoot, not as fixed limits.

## Summary

1. Behavior keeps the main lane; start one small stylization lane now for three fixes only: plants, reef rock, and old-model fish in the example tanks. The rest follows behavior.
2. Plants hurt the first impression most: they are about twice as saturated and bright as the approved fish, although the leaf atlas itself is already right.
3. The spec is the approved fish, written as rules: muted body with accent-only colour, no outlines, three sizes of detail with quiet grain, matte with a soft sheen, one light from above that every asset visibly answers.
