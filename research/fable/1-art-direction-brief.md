# Brief 1: one stylization spec for every TankLook asset class

Read cold. This brief is self-contained. Pictures are in `research/fable/1-art/` (paths relative to this file). All were captured on 2026-11-25 from the LIVE site https://tanklook.com in headless Chrome (software GL, 1440x900 viewport at 2x pixel density, camera = the app's own default framing after closing the side panel), so they show what a visitor sees. Crops are native 2x pixels, not upscaled. Units are US.

## The question (restated at the end too)

"Looking at these renders, write ONE stylization spec (rules for color, value range, edge crispness, texture detail, sheen, scale of detail per inch, lighting response) that every asset class in TankLook must meet so fish, plants, hardscape, substrate, gear and glass read as one world. Then rank the asset classes by how far each is from the spec and say the single most effective fix for each."

Only the judgment is wanted. Everything below is evidence. Where I describe a picture it is an observation of what is visible, not a verdict.

## Project and vision (short)

TankLook (soon "Yourarium") is Nathan's personal side project: a 3D aquarium / vivarium planner (Vite + TypeScript + three.js, one scene, orbit camera). Users are anyone interested in aquariums, from a first-time hobbyist to someone with 20 tanks. Purpose: plan, evaluate, be inspired, learn; "provide the info and experience and customizability that would be hard to replicate in an AI chatbot". Money matters. Care guides are out of scope. No users yet. The 3D picture is the product's main differentiator, so its believability and consistency matter.

Live scope is aquariums only (freshwater, saltwater/reef, riparium). Terrarium / paludarium / herp features exist in code but are hidden behind `?scope=all` (src/scope.ts); picture 05 was captured that way and is NOT visible to a normal visitor.

## Art-direction history (what Nathan has said)

- 2026-10-08/09: procedural painted fish cards rejected twice as "too cartoony".
- 2026-11-20, request R144: "Fish art style: refine toward a stylized look between photo and cartoon. Nathan (relayed): 'The point was never to be photo-realistic'; the photo-wrapped 3-view models look out of place next to the substrate, equipment and plants. Constraint kept: not cartoony (painted fish rejected twice)."
- 2026-11-24: Nathan preferred the "restrained zoological reference illustration" 5-row sheet style over the "photorealistic, no stylization" prompt. Picture 00 is the comparison he used (left: Nov 20 photoreal; right: Nov 24 reference-illustration; the right column is the approved style for fish).
- 2026-11-25, request R151 (plants): "with how good our fish models are now, it makes the plants look kind of crappy by comparison." Approved plan: keep the procedural plant geometry, growth and sway, and paint the leaves with textures cut from ChatGPT leaf sheets. Same level as the build-B fish ("looks real, but evenly lit like a field-guide plate, with no shadows and no glare. The shader adds the tank's own light."; research/plant-sheets/prompts/leaf-sheet.md).
- Stated target: every asset as crisp as the scene, at one shared level of stylization. House memory notes: "fish art: not cartoony, not photographic; match the scene's stylization level"; "real gear in true colours (catalogue products drawn in their real per-part colours; geometry may be simple)".

## How each asset class is drawn today (source files you can open)

Repo for reading: `C:\Users\nreed\Glass-Box-fable` (detached at origin/main fcca8621).

**Fish, approved ("build B")** - `src/art/photofish.ts`, `src/data/fishLive.json` (45 species approved so far, loaded for every visitor), `src/data/fishart/<look>.anatomy.json`, images in `public/art/fish/`. Method: a 5-row ChatGPT "zoological reference illustration" sheet is measured (outline, thickness, eye, paired fins cut from the sheet) and lofted into a 3D body; the sheet is the skin texture; fins are alpha cards with a fin-opacity map. Pipeline docs: `research/fish-model-sheet-method.md`, `research/fish-model-history.md` (eras 1-8). Look: soft, evenly lit, fine scale/fin detail, thin edge, moderate saturation. The fish are tiny on screen at default framing (a neon is a few dozen pixels long in picture 02).

**Fish, not yet approved (still the old model)** - `src/art/fishgen.ts` (`PLANS`), `src/art/placeholder.ts` (`drawFishCard`, `drawLook`): procedural painted cards. Visible in the "From the animals I want" dialog (a separate UI) where e.g. Bala shark, Black skirt tetra and Boeseman's rainbowfish are drawn in the old flat-painted look (UI screenshot in `research/fable/2-first-visit/15-...png`). Roughly half the 91 aquarium species are still on it.

**Plants** - `src/render/plant3d.ts` (one generator for all species: each leaf a curved double-sided sheet with rise/arch/twist/cup/ripple; per-vertex colour edge-to-midrib, tip tint, paler underside, baked form shading), `src/art/plants.ts` (`PLANT3D` table), `src/render/plantAtlas.ts` + `src/art/plantTex.ts` + `src/data/plantart/leaves.json` + `public/art/plants/leaves.webp` (417 KB atlas; lane PT / R151, landed 2026-11-25). 13 plant families have painted leaf textures (crypt, carpet, grass, sword, anubias, stem, stemred, rotala, ludwigia, balansae, buce, fern, ozelot); every other type samples a white texel and keeps vertex colours only (hornwort, anacharis, lotus, floaters, moss, emersed/house plants, etc.). Material is a shared unlit `MeshBasicMaterial` (`plantMaterial()` in `src/render/items.ts`) patched with the water lighting. I could not tell from the live pixels alone which build of the atlas the live site is serving; judge from the pictures (the red stems in 02/07 look like flat per-vertex colour, the sword and vallisneria look textured).

**Hardscape (stone, wood, caves, decor)** - `src/render/items.ts` (procedural meshes cached by variant/seed/size; per-vertex colour with a baked top-front-left light and darker hollows; a per-pixel "grit" shader, `GRIT` + `GRIT_KIND`, adds fine grain/cracks, tables baked in `src/render/gritTex.ts`), `src/render/stonecap.ts` (cut faces where glass slices a rock), `src/render/contact.ts` (soft contact shadows, rocks sunk into the bed). 9 stone types, wood, caves, decor. Reef live rock and corals: `src/render/coral3d.ts` (procedural: live rock, branching, plate, mushroom, leather; pastel unlit colours plus grit).

**Substrate** - `src/art/placeholder.ts` (`drawSubstrate`, `SUBSTRATES`; painted tile with a fine-detail layer for sand) + `src/render/textures.ts`; coarse grounds also get real 3D stones/chips through `src/render/grains.ts` (scatter tool; the painted tile underneath is darkened to read as gaps; a row of grains pressed against each pane so the cross-section through the glass shows stones in profile). Mixed sizes and per-grain colour variation (`FX.mix`, `FX.ground`).

**Gear (filters, heaters, lights, skimmers, pumps)** - `src/render/gear3d.ts` and `src/render/gear/{common,filter,heater,pump,co2,reef,generic}.ts`: built procedurally to the real product class's size (gph / watts -> body size), mounted on the back wall, merged into four meshes (lit in-tank parts, lit room parts, clear parts, glowing indicators). Colours come per part from `src/data/gearCatalog.ts` (`PartColour`). Look: mostly flat dark boxes and tubes with a small number of glowing indicators.

**Glass, water surface, light** - `src/render/viewer.ts` (renderer, glass panes, waterline), `src/render/lighting.ts` (`aqPatch`: a "cheap top-down light model injected into unlit MeshBasicMaterials", fixtures as emitters above the water, depth-based colour shift, AgX/ACES tonemap switch), `src/render/waterTint.ts` (water as a multiplicative colour filter, not fog), `src/render/caustics.ts` (moving caustic net on up-facing surfaces), `src/render/fx.ts` (the flag list: caustics, depth, contact, ground, tonemap, variety, embed, mix, sand, waterline). Glass is a thin green-tinted edge with a bright waterline band and a front-pane reflection; no thickness refraction.

**Rooms, stands, backgrounds** - `src/render/backdrop.ts` (3D relief walls: foam rock, cork), `src/art/bgscenes.ts` / `bgpaint.ts` (photo and painted background scenes), `src/render/woodGrain.ts` (procedural wood-grain on stands), `src/render/standModel.ts`. The room is a flat beige wall and floor with a grey person silhouette for scale.

## Pictures

Full-tank renders (default framing; panels closed):
- `1-art/02-full-planted-community.png` - Example "Planted community": 45 gal, black gravel, stems (red and green), carpet, two river-type stones, neons, harlequin-like rasboras, a honey gourami, corys, otos, hood light and a filter inlet.
- `1-art/03-full-reef.png` - Example "Reef": 72 gal bowfront, live rock islands in grey with purple coralline patches, pastel corals, clownfish pair, royal gramma, white sand, heater, skimmer, pendant lights.
- `1-art/04-full-amazon-blackwater.png` - Example "Amazon blackwater": amber water tint, tangled wood, leaf litter, small schooling fish, floating roots.
- `1-art/05-full-terrarium-hidden-scope.png` - (hidden scope, `?scope=all`) "Crested gecko rainforest": bromeliads, ferns, vines, cork/wood, leaf litter, a gecko on the side glass.

Same-scale detail crops (each is 1000 px or 900 px wide at native 2x; the tanks differ in size, so inches per pixel differ by tank):
- `1-art/06-crop-neons-with-stem-plants.png` - neon tetras (approved build B) swimming in front of red and green stem plants (community tank).
- `1-art/07-crop-stem-plants-background.png` - the background stem plants against the black background and right glass edge.
- `1-art/08-crop-carpet-rock-gravel-corys.png` - carpet patch, two rocks, black gravel, corydoras and the substrate cross-section at the front pane.
- `1-art/09-crop-iwagumi-grass-stone-rasboras.png` - Iwagumi example: grass-type foreground plants, grey stones, white sand, orange rasboras (old model).
- `1-art/10-crop-wood-leaflitter-amazon.png` - wood branches, leaf litter and brown sand with a cichlid (old model) in the blackwater tank.
- `1-art/11-crop-reef-rock-coral-sand-fish.png` - live rock with purple patches, mushroom and plate corals, white sand, a clownfish, royal gramma.
- `1-art/12-crop-reef-gear-heater-light-glass.png` - pendant lights, heater/thermometer tubes, skimmer body, branching coral, bowfront glass and its edge colour.
- `1-art/13-crop-glass-rim-hood-surface.png` - glass corner, rim, hood, waterline band and front-pane reflection, one fish through the side pane.
- `1-art/14-crop-hang-on-back-filter-close-view.png` - a hang-on-back filter with neons, sword and vallisneria at a closer camera (1x pixels, a user-driven zoom).
- `1-art/15-ui-library-tiles-stones-substrate-plants.png` - the catalogue tiles users pick from: stone tiles (rendered 3D thumbnails on a pale grey card), substrate swatches (photo-like gravel textures), plant thumbnails (small pale cut-outs).
- `1-art/00-approved-fish-style-reference.jpg` - Nathan's comparison image; right column is the approved fish style (side textures of angelfish, betta, bronze cory, neon, oscar).

## Observations from the renders (facts, not verdicts)

1. Fish vs. rest at a glance: in 06 the approved neon has fine scale and iridescence detail; the stem plants beside it are made of small flat leaf shapes with strong saturated colour (the red stem in particular is a uniform orange-red with little leaf-level variation); the gravel is high-contrast black grains with specular-free flat shading.
2. Value range: 02 has a near-black background and black gravel against a cream room wall, so the tank is high-contrast; 03 has a deep navy back wall and white sand; 04 is a warm amber monochrome. The room background colour differs per example.
3. Edge crispness: stems and grass leaf edges are sharp, aliased edges (see 07, 09); rocks have soft shaded edges with a faint dark contact shadow; glass edges are thin, saturated green lines; gear edges are hard.
4. Texture detail: the rocks in 08/09/11 have grit and a few cracks but little macro form variation; substrate in 08 is the most detailed element (individual grains with colour variation) and is finer than the fish scales relative to size; reef rock in 11 has a pronounced purple patch overlay and visible polygon faceting; corals in 11/12 are smooth pastel unlit forms.
5. Sheen: no visible specular on rocks, wood, gravel or plants (all unlit materials with baked light); the only highlights are the waterline band, the front-pane reflection and the glowing indicators on gear.
6. Lighting response: plants and hardscape take a baked top-front-left light plus the water formula (depth tint, caustics where enabled); fish take the same light level without facing (cards). In 03/12 the reef pieces are lit evenly with no visible light cone from the pendants.
7. Gear: the hang-on-back filter in 14 is a large matte-black box; in 02 the heater/filter tubes are clear tubes; in 12 the skimmer and heaters are thin pale cylinders; none show product-specific surface detail.
8. Style mixing inside one tank: in 09 and 10 the fish are the old procedural models next to scenery; in 02 and 06 approved build-B fish sit beside it. In 15 the catalogue thumbnails for substrates are photo-like while plant thumbnails are small and flat.
9. The empty-tank room (UI screenshots in brief 2, e.g. `2-first-visit/04-...png`) draws the room as flat beige planes with a flat grey person silhouette.
10. Scene scale: at default framing the tanks fill the viewer but individual fish are only roughly 30 to 80 px long, so most of what a user sees is plants, hardscape and substrate rather than fish.

## Existing requests and briefs worth reading

- `research/requests.md` rows R144 (fish style) and R151 (plant leaf textures; the file calls it R151, the lane brief calls it R147).
- Lane brief for plants: `research/fable/ref/lane-PT-plant-textures.md` (copy of an untracked shared-folder brief; summary: UVs on every plant vertex, one shared atlas, vertex colour only carries shading/tint, "Show Nathan both: texture colour as painted, and texture luminance x today's colours"; checks: every other plant type pixel-identical, atlas under ~400 KB).
- Plant sheet prompts: `research/plant-sheets/prompts/leaf-sheet.md`.
- Visual-fidelity plan (lighting/ground/plants): `research/fable/ref/plan-VF-visual-fidelity.md` (copy of an untracked shared-folder plan; flags in `src/render/fx.ts` header).
- Fish method: `research/fish-model-sheet-method.md`; history: `research/fish-model-history.md`.

## Limits of this evidence

- Software GL render (SwiftShader), default FX settings, "Full" quality presumably; a real GPU may show slightly different anti-aliasing. Water caustics and plant sway are animated; stills catch one frame.
- Hardscape closeups are limited to what the example tanks contain; I did not render every stone/wood type (the stone catalogue tiles are in picture 15).
- The live atlas version for plant textures was not confirmed; see the plants paragraph.

## The question again

"Looking at these renders, write ONE stylization spec (rules for color, value range, edge crispness, texture detail, sheen, scale of detail per inch, lighting response) that every asset class in TankLook must meet so fish, plants, hardscape, substrate, gear and glass read as one world. Then rank the asset classes by how far each is from the spec and say the single most effective fix for each."

## What a good answer looks like

- One spec, written as concrete, checkable rules with numbers or ranges where possible (for example a value/saturation window, a detail-scale rule in features per inch, an edge-softness rule, whether any specular is allowed and how much), anchored to the approved fish style in picture 00, since that is the one asset class Nathan has explicitly approved.
- A ranking of fish (approved and unapproved), plants, hardscape/rock, reef rock and coral, substrate, gear, glass/water, room/backdrop, by distance from that spec, with the reason visible in a specific picture number.
- For each class exactly one fix, stated as an action with the file or pipeline it touches (for example "re-cut X through the sheet pipeline", "change the grit shader's Y", "add a per-part material"), cheap to verify by re-rendering the same pictures.
- Clear about what to leave alone (assets already at the spec) and what is tradeoff-driven (performance, download size, the single-file build constraint, the "not photographic, not cartoony" band).
- Honest about uncertainty from this evidence set (software GL, one frame, example tanks only).
