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
(lane writes here)
