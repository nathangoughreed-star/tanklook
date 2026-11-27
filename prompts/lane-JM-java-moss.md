# Lane JM: java moss rework (R182, 2026-11-26)

Start here. Read only this file, then the sections of `research/moss-model-proposal.md` it names.

## Nathan's ask
On a screenshot of today's java moss mounds on a rock stack: "this looks nothing like java moss lol ... Preferably it
would look one way if alone and another way if it was attached to an object and growing on it where it spreads more
like ivy rather than a ball". After the marimo was parked: "lets try to work on the java moss for now".

## What is there now
- `moss` in `src/art/plants.ts` (form 'moss'), built in `src/render/plant3d.ts` (`P.form === 'moss'`): a solid dark ball
  with ~300 flat leaf cards on it. Reads as ivy leaves on a green rock. No painted texture (`tex`).
- The paint brush `javamoss` in `src/render/brushmesh.ts`: lumpy domes over the ground.
- Plants and brushes only follow the ground height (`GroundAt(x, d)`, `src/render/scatter.ts`). A plant raised onto a
  rock only "hugs" it by sinking its core ball. Nothing samples a hardscape surface yet.

## What java moss looks like
Table and photo URLs: `research/moss-model-proposal.md`, "What the real plants look like". Short version: no core, a
tangle of thin irregularly branching strands (leaves 1-2 mm). Alone: a slumped shaggy tangle about 3x wider than tall
(2-4 in thick), with loose wisps lying around it. Attached to wood or rock: a fuzzy layer 0.5-1.5 in thick creeping over
the surface, trailing strands 2-6 in long off the edges. Colour: core #2F5A1E, mid #5E8F2E, tips #8FBF45. **Look at the
photos yourself first** (the research pass could not see them) and write the look down, per
`research/species-art-method.md`.

## Lessons from the marimo (same chat, 4 passes, parked)
- Hand-made hairs or coats (thin leaf cards, fur, noise relief) read as a pea, a pincushion or a fuzzy toy at every density.
- A ChatGPT texture sheet was the first thing that read as real moss. Start from one: a prompt like the marimo's
  (`research/plant-sheets/prompts/leaf-sheet.md`, "Marimo skin sheet"), e.g. java moss strands and a clump edge on pure
  white, cut into alpha cards / a skin by a script like `scripts/marimo-skin.py`.
- A plant can have its own texture: `PLANT3D.<type>.ownTex` + `ownAtlas` (render/plantAtlas.ts); no shared-atlas rebuild.
- Cards seen edge-on show as bright dashes; keep card colours darker than the skin.

## Plan (each step has a gate: Nathan sees it before the next)
1. Photos + written look (alone, attached, close-up). Gate: Nathan agrees.
2. ChatGPT sheet prompt -> Nathan generates -> bake script. 
3. "Alone" clump from the sheet. Gate: side-by-side with the photos AND the 3D viewer (below).
4. "Attached" mode: sample the host rock/wood mesh surface around the drop point, lay the moss over it, trail off edges,
   spread with growth, move with the host. Check whether plant geometry is built in a worker (`plant3d.gpu`). Gate: on a
   rock and on driftwood.
5. The `javamoss` brush gets the same look.

## Showing Nathan
He asked to see models in a 3D viewer he can spin. The marimo one: https://claude.ai/artifact/Vpd2QqRdpgq8RPGhB8S5bq
(make a new artifact for java moss the same way). Recipe: dev server (`.claude/launch.json` "dev-alt", port 5183), in the
page import `/src/render/plant3d.ts`, `/src/art/plants.ts`, `/src/render/plantAtlas.ts`, `/node_modules/.vite/deps/three.js`
and `/node_modules/three/examples/jsm/exporters/GLTFExporter.js`; build `revealPlant(plantGeometry(type, seed, h),
growthOf(type, h))`, copy position/color/uv/index into a MeshStandardMaterial mesh (vertexColors, map, alphaTest 0.5,
DoubleSide), export GLB, POST it to `/__shot?name=...` (saved as shots/<name>.png: it is the GLB). Embed as base64 in an
HTML page with three@0.149.0 (jsdelivr) OrbitControls + GLTFLoader. Tank renders: `scripts/pt-shots.js` `load(spec)`
(the camera aims at the tank centre: use a tiny tank, e.g. 200 x 120 x 140 mm, to frame small plants).

Commit with `scripts/ship.sh` as you go (CLAUDE.md). End replies with "Build N".

## Status (2026-11-26, end of the first JM chat)
- Step 1 (look from photos): done, `research/moss-model-proposal.md` "Java moss look, checked against photos". Approved.
- Step 2 (sheet + bake): done. Sheet `C:\Users\nreed\fish-sheets\plants\javamoss-d1.webp`; `scripts/javamoss-skin.py` ->
  `public/art/plants/javamoss.webp` + `src/data/plantart/javamoss.json` (mat at 4 densities, 8 edge cards, 8 strands).
- Step 3 (alone): done and approved after pass 2. `plant3d.ts` form 'tangle': a dark core inside 9 shells of the mat,
  each sparser (Nathan: "linearly increasing density, no step"), edge cards, loose strands. Viewer:
  https://claude.ai/artifact/Pyiqr713egmwWeJqmwXT4m (rebuild with `scripts/jm-render.js` `glb()`).
- Step 4 (attached), first pass shipped, gate NOT passed yet: `render/items.ts` `mossHost` rays down onto the stone /
  wood meshes into a height grid in the moss's own frame (`clump.host`); `plant3d.ts` 'tangle' + host drapes the
  same shells over it, spreads with growth by distance, stops where the piece falls away and hangs strands there.
  Reads well along branches; on a rock it is a patch on top with strands down the sides: a top-down height field
  cannot coat steep sides. Next: coat the sides too (sample the host surface with normals, e.g. rays inward from
  several directions or the host mesh's own triangles within reach, and lay the shells along the normal), thicker
  older growth (B1/B4). Renders: `scripts/jm-render.js` `tank()` (a tiny tank, one piece, moss tied on via `perch`).
  The dev server page reloads whenever another chat edits a file: retry a render in a quiet moment.
- Step 4 pass 2 (2026-11-26, second JM chat), shipped; gate PASSED (Nathan OK, 2026-11-27): `mossHost` now hands over the host's own
  triangles within reach (a face counts by its nearest point), with outward normals and height over the ground;
  'tangle' + host splits them to the tile's cell size, measures distance from the tie-on spot along the surface
  (Dijkstra; down a steep side costs half, so it creeps down faces and round under limbs like ivy), lifts each shell
  along the normal (full thickness over the inner 60 %, easing to nothing at the rim; denser shells stop shorter, so
  only the sparse ones reach the edge), cuts each triangle on its shell's rim and on the tile lines (triplanar, axis
  from the shell's own slope), thin underneath and near the ground. Young coat Ht = h x 0.42 (10-32 mm); grown on past
  g0, 3 more sparse shells appear late (older growth deeper, B1/B4). Strands hang from the rim on sides and from
  undersides. Review sheet (photos B1/B2/B4 + seiryu and branch, tied on / grown on) sent to Nathan; renders
  `shots/jm2-*.png`. Photos only in the chat's scratchpad (aquasabi 4202 image 2, flowgrow 51da5db681b34, 52361a5f8ba78).
- Step 5 (the `javamoss` brush): not started.
