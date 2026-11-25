# Lane PT: plant leaf textures from ChatGPT sheets, pilot (R151, 2026-11-25)

Nathan (2026-11-25): "with how good our fish models are now, it makes the plants look kind of crappy by comparison."
Approved plan: keep the procedural plants (shape, growth, sway, bending, saved looks) and give their leaves a painted
texture cut from a ChatGPT leaf sheet. Pilot on three plant types: `crypt`, `grass` (vallisneria) and `carpet`.
Every other type must look exactly as it does today.

## Start here
- Prompts, sheet format and the cutter's job: `research/plant-sheets/prompts/leaf-sheet.md`. Nathan generates the
  sheets and saves them as `C:\Users\nreed\fish-sheets\plants\<type>-d1.png`. Until they exist, build the plumbing
  against a test atlas you draw yourself (a striped leaf, so a flipped or rotated UV shows at once).
- Leaf builder: `leaf()` in `src/render/plant3d.ts`. Each vertex has `u` (-1..1 across; the midrib columns -0.07,
  0, 0.07) and `s` (0..1 along the blade). Stalk rows sit before the blade (`NP`); `Sheets.grid` writes the upper
  side and then the reversed underside.
- Material: `plantMaterial()` in `src/render/items.ts`. It is a MeshBasicMaterial with vertex colours, one per glass
  outline, shared by all species, patched by `glassClip`, `growShader` and the water lighting (`post`). The leaf algae
  shader (`leafAlgaeShader`, render/algae.ts) also hooks plant material. Keep it working.

## Build
1. **UVs on every plant vertex.** For a leaf with an atlas cell: (u, s) maps into that cell, with the underside taking
   its under cell. Grass maps base / repeated mid / tip along `s` by leaf length in mm (about 1 mid repeat per
   100 mm). Everything else (tubes, stalk rows, other species, pads, floats, vines, moss) gets the uv of a white texel,
   so it multiplies to exactly today's colour. `tube()` and the other `deleteAttribute('uv')` sites (lines ~216, 716,
   1506, 1512, 1569) must write that white uv instead, or `mergeGeometries` will fail.
2. **Pack / worker / bend / carpet / reveal:** uv is shared like colour and index. Skip it in the `bent` and `ground`
   packs and take it from the base in `unpackGeometry`. Check `carpetOnGround`, `bendPlant`, `revealPlant`,
   `gpuParts`, `cpuGeometry` (USDZ export: export uv + texture, or bake the texture into vertex colour there) and
   every cache key that includes plant geometry.
3. **Material:** one shared atlas texture (`public/art/plants/leaves.png`, sRGB, mipmaps, anisotropy 4) as `map`,
   with `alphaTest` about 0.5 so the cut-out outline replaces the grid's. Leave the outline's pixels in the atlas cell
   a little inside the leaf grid's width, so no hard grid edge shows. Still ONE material per glass outline: no
   per-species materials.
4. **Vertex colour for textured types:** form shading (`shade`), per-plant `tint` and the GR/VF jitter only, on white
   instead of `cols`. Then the texture carries the colour, and plant-to-plant variety survives. Test both: texture colour
   as painted, and texture luminance x today's `cols`. Show Nathan both and let him pick.
5. **Cutter:** `scripts/plant-leaves.py` (deterministic, numpy + PIL). Sheet -> leaves cut against white -> midrib
   upright -> stretched into atlas cells -> `leaves.png` + `src/data/plantart/leaves.json`. Same rule as the fish:
   fix a leaf through its sheet and a rebuild, never by hand-editing the atlas.
6. **Light through the leaf (optional, after 1-5 look right):** a backlight term in the plant `post`. Leaf colour x
   light from behind (the side facing away from the camera, toward the tank light), so leaves glow a little when the
   light is behind them. Do it as a separate commit with its own before / after.

## Checks
- Every other plant type pixel-identical before / after (vf-shots reference tanks, `scripts/vf-shots.mjs`).
- Growth slider, sway, lying over at the surface, emersed twins and a carpet on uneven ground all still work on the
  three pilot types.
- Download size: report the atlas size in KB (it should stay under ~400 KB for the pilot).
- Frame time: A/B by alternating frames (memory perf-ab-alternate-frames), planted 4 ft reference tank.
- Before / after shots of Nathan's screenshot scene (crypt, vallisneria, carpet up close), side by side, for him.

## Watch for
- Plans VF2 (plant variety, `prompts/plan-VF-visual-fidelity.md`) and lane LA (leaf algae) touch the same leaf
  colours and material. Check `git log -- src/render/plant3d.ts src/render/items.ts` before starting, and rebase
  onto them.
- The carpet leaflets are 5-7.5 mm, so their texture shows only up close. If it shimmers at a distance, give the
  carpet cells a stronger mip bias or fade it to vertex colour by distance.

## Done
- Pilot types textured on main, the rest unchanged, and the shots sent to Nathan.
- In this brief's Report section: the sheet issues found and the prompt changes made in `leaf-sheet.md`, so the
  remaining ~10 leaf families can be batched.
- Commit on your branch and send the sha to the coordinator.

## Report
Steps 1-5 built (2026-11-25, branch `claude/loving-germain-585d79`). **Sheets not received yet**: `fish-sheets/plants/` does not exist, so
everything below was checked against a STRIPED TEST ATLAS (`python scripts/plant-leaves.py --synth`; the manifest lists `"test": [...]`). Rerun
`python scripts/plant-leaves.py` (no flag) once the three `<type>-d1.png` sheets are there: it uses a real sheet where one exists, a test sheet for the rest.

**What was built**
- `src/art/plantTex.ts` (manifest and uv maths, worker-safe), `src/render/plantAtlas.ts` (one shared atlas texture: white until loaded, headless-safe for tests, `atlasPixels()` for USDZ).
- `Leaf3D.tex` (`crypt`, `grass`, `carpet` in `art/plants.ts`). Every plant vertex has uv: the white texel by default (`whiteUV()` in tubes and the moss core, `WHITE_UV` in `Sheets.grid`), so mergeGeometries works and other types multiply by exactly 1.
- uv travels with colour through pack / worker / bend / carpetOnGround / clumpOnGround / revealPlant / grownView / uploadPlant (skipped in the `bent` and `ground` packs, taken from the base in `unpackGeometry`).
- `plantMaterial()`: shared atlas `map` + `alphaTest 0.5`, still ONE material per glass outline. `plant3d.tex = 'paint' | 'lum' | 'off'` (also in the geometry cache key). `paint`: vertex colour white x the brightness draw, so form shading, tint and jitter stay. `lum`: species colour / the texture's mean colour, so the texture's light and dark sits over today's colours. `off`: exactly the old look.
- Stalk rows of a textured leaf sample the cell's centre column below `v0` (crypt 0.22), so no triangle interpolates across the atlas. Grass: one atlas column per number of middle tiles (1..4), each base | n x seamless middle | tip, so v is one continuous ramp along the blade.
- A leaf's cell uses no random draw: the index of its colour pair in `f.cols` (crypt's 4 colours -> 3 cells), else a hash of the buffer offset. Saved plants keep their layout.
- USDZ (`arUsdz.ts`): plants bake the atlas texel into the vertex colours (every plant, textured or not, exports as before); the cut-out outline is not exported (the grid outline shows).
- Cutter `scripts/plant-leaves.py` (numpy, scipy.ndimage, PIL; deterministic). `--webp` writes `leaves.webp` instead of the png.
- Review tools: `scripts/pt-shots.mjs` + `pt-shots.js` (scenes `pilot`, `top`, `bent`, `others`, `ref`; modes paint / lum / off; a still pose), `scripts/pt-ab.mjs` (for `perf-baseline.mjs --ab`).

**Found, not changed: the upper colour shows from BELOW.** In `Sheets.grid` the first side's triangles have their front face turned DOWN
(`d x side` = -up), so from above every plant shows the second side, the paler `under` mix; `cs` only shows from underneath. Measured on anubias
(up-facing front faces average paler than down-facing) and seen in the top-view shots. Flipping it for all plants would change every look, so
textured types alone swap the two sides' uv and colours (upper texture on the side that faces up). A decision for VF2: flip the winding for everyone, or leave it.

**Checks**
- Other types pixel-identical: 12 types (stem, stemred, sword, anubias, fern, rotala, ludwigia, moss, balansae, sagittaria, buce, salvinia) in a 4 ft tank, `pt-shots.mjs others`, baseline worktree at d276ba9c vs this branch: the two PNGs are byte-identical. (`scripts/vf-shots.mjs` does not exist in the repo; this is its stand-in.)
- Tests: `growth.test.ts` now sets `plant3d.tex = 'off'` (its pre-growth fixture compares vertex colours); it and gpureveal, carpetground, growtime, overgrown, outgrows, plantfit, artificialplants, algae, anchors, arUsdz, emerge, glasshug, leafperch, vinewood all pass; tsc clean.
- Lying over at the surface (water level 0.5): crypt and grass textured correctly (`shots/pt_bent_*.png`). Growth tags and sway untouched (the shader never reads uv). Carpet on uneven ground: carpetground test passes (uv shared); not shot.
- Atlas size: the TEST atlas is 1024x856, 142 KB png / 41 KB webp (flat stripes, so it says little). Painted pixels in the pilot: crypt 6 cells x 96x448 = 258k, carpet 12 x 56x72 = 48k, grass 4 columns = 84k, about 390k px. Painted sheets will probably land at 500-900 KB png, 120-250 KB webp: use `--webp` to stay under ~400 KB, or shrink the crypt cell (`TYPES['crypt']['cell']`).
- Frame time (alternate frames, GPU timer queries, `perf-baseline.mjs --ab scripts/pt-ab.mjs --pairs 60`, ref tank 4 ft with the pilot types, 1050x850, Intel Arc iGPU): atlas map + alphaTest 2.08 ms GPU, without 1.45 ms: +0.62 ms GPU, +0.25 ms CPU (827k triangles, 71 calls). The cost is the shared material, so every plant in the tank pays it, textured or not.

**Open**
- With real sheets: choose `paint` vs `lum` by looking at both (`pt_pilot_{paint,lum,off}.png` regenerate with `node scripts/pt-shots.mjs "shots=pilot:paint:x;pilot:lum:y;pilot:off:z"`), check carpet shimmer at distance, measure the real atlas KB.
- Grass uses only strip (2) as the middle tile; strip (4), the yellower one, is cut but unused.
- Step 6 (backlight) not started.

**Sheet issues / prompt changes for the batch**
None from real sheets yet. What the cutter needs from them (already in `leaf-sheet.md`): leaves on pure white with 4 % gaps, midrib vertical, stalk about the lowest quarter (the cutter's `v0`), undersides in the same order as the uppers; grass as four straight strips with the middle cut straight across (the cutter cross-fades the seam). The cutter stops with a message if the leaf count differs from the layout (touching leaves, or a pale leaf lost against white).
