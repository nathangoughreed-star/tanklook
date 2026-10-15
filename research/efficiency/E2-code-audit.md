# E2 code audit (lane E2, 2026-10-15)

**Audited commit: `a93a81f`** (origin/main at the start: "Efficiency review phase 1 ..."). Static read only: no src/ edits.
Method: `scripts/unused-exports.mjs` (new; rolldown's oxc parser, because TypeScript 7 is the native compiler and has
no JS API), a sourcemap build for the bundle, and three Sonnet subagents (hot paths, duplicates, split map). I
re-checked every row below against the code. The appendices hold the agents' full tables:
[E2-hotpath.md](E2-hotpath.md), [E2-dups.md](E2-dups.md), [E2-splitmap.md](E2-splitmap.md).

Ground rule from the code: **the app does not animate.** `render/viewer.ts:234` draws only when `dirty` is set. So
"per draw" below means every pointermove while orbiting, dragging or zooming, plus each edit. It does not mean 60 times
a second when idle. The only onBeforeRender hook is J2's frost cull (`viewer.ts:438`), and every onBeforeCompile runs once per
material. I give no ms figures. Lane E1 times the hot-path rows (the suspects went to E1 on 2026-10-15 for `--ab`).

## Ranked table

Needs-quiet = touches panels.ts / build.ts / viewer.ts or a running lane's file (GR4: plant branch of render/items.ts,
render/plant3d.ts, growStep in panels.ts; AL: render/algae.ts, the fog hook in lighting.ts, the Condition hook in panels.ts; W: panels.ts view map).

| # | Item | file:line | Evidence | Est. gain | Risk to approved look | Size | Needs quiet |
|---|---|---|---|---|---|---|---|
| 1 | **Single-file build is broken** | `scripts/build-single.mjs:12-17`, `vite.config.ts:12` | Since `d67ac73` (2026-10-14 09:28, review.html as a 2nd entry) Vite splits three.js and the shared render code into chunks. The inliner inlines only `main-*.js`, which still has `from"./three.module-_L6HqVjY.js"` and `from"./preview3d-DllL_xyC.js"`. dist-single/tanklook.html is 472 kB and cannot load three from disk. Fix: build:single runs its own vite build with `input: index.html` only and dynamic imports inlined (or the inliner follows chunk imports). The working file will be about **1.36 MB**, not 750 kB. | The zero-install coworker file works again | none (no src change) | S | no |
| 2 | **Carpet cache key misses the ground** (correctness) | `render/items.ts:476` (key), `:480-486` (`at`), `:490`/`:498` (lookups); `scene/terrain.ts:188-191` | The carpet key holds x/depth/yaw/lift + tank shape, but `at` reads `groundHeight` / `groundInsideBy`, which depend on terrain, substrate depth/slope and the swamp layout. After a terrain or substrate edit the module-level `plants` map hands back the old ground shape (floating or buried patches). incrementalCheck can't see it because the full rebuild uses the same cache. | Correct carpets after terrain edits | changes pixels only where the cache is stale today | S | yes (GR4 owns the plant branch) |
| 3 | Light-model key stringified every draw | `scene/lightout.ts:446-448` (`unitKey`), reached from `render/lighting.ts:147-175` (`setLightUniforms`, called at `viewer.ts:387`) | `JSON.stringify([S.tank, l, S.lid, S.water, S.substrate, ..., S.terrain])` about 3x per viewport per draw (lightOutCached, then lightEnvCached plus its own key). With terrain the height grid goes into the string. | E1 to time; largest on terrain tanks (paludarium) and split | 0 px (memoise on the snapshot objects) | S | no (lightout.ts / lighting.ts free; AL has a hook in lighting.ts) |
| 4 | Scale person re-placed every draw | `render/viewer.ts:384` -> `placePerson :469`, `personBlocks :488` | 12-step bisect + doubling loop. Each step allocates `new Box3().setFromObject(person)`, a 16-point Array.from/map/clone and a convex hull: about 15-25 calls per view per draw, even when only the camera moved. Cache on (camera, viewport, T, person) or place it only on build/resize/camera change. | E1 to time | 0 px if keyed on everything it reads | S | yes (viewer.ts) |
| 5 | Material rank by full traverse every draw | `render/viewer.ts:391` | `this.rank.clear(); vp.scene!.traverse(... [].concat(m) ...)` per viewport per draw, only to order the opaque sort (J's `setOpaqueSort`). The scene changes only on build/patch, so compute it there. | E1 to time; scales with mesh count (planted 573 calls, iwagumi 174 items) | 0 px if the same rank results (incrementalCheck proves it) | S | yes (viewer.ts) |
| 6 | DOM / style reads every draw | `render/viewer.ts:336`, `:386`, `:401-413`; `render/viewmap.ts:12` | `getComputedStyle(host)` for `--stage-gap` (style recalc), `new THREE.Color` per viewport, getElementById x3 + querySelector + clientWidth after style writes, and a full 2D redraw of the viewpoint map on every draw. | E1 to time (layout thrash on orbit) | 0 px | S | yes (viewer.ts) |
| 7 | Panel guard + autosave stringify on every store emit, orbit included | `ui/panels.ts:1206-1210`, `:1627-1643` | The sync guard does `JSON.stringify` of the setup (terrain included), camera and selected item and joins the fish/item lists per emit; the autosave stringifies the whole scene after a camera-only orbit too. J2 cut sync to ~0.5 ms; this is what is left of it. | E1 to time; skip for camera-only emits | 0 px | S | yes (panels.ts) |
| 8 | Per-patch keys stringify every part | `render/build.ts:1048`, `:1127`; `render/viewer.ts:273` + `build.ts:937` | `JSON.stringify(it)` / `JSON.stringify(f)` for every item and fish on each patch. `viewKey` stringifies an already-stringified envKey. Any rock edit adds `hardKey` to every hardscape-resting fish key, so those fish rebuild too (by design, but it's the cost). | E1 to time (per edit, iwagumi 174 items) | 0 px | S | yes (build.ts, viewer.ts) |
| 9 | Fish are 10-20 meshes each | `render/build.ts:1099-1102`, `render/fish3d.ts` (body, outline, eyes, fins, tails, barbels) + contact shadow | 40 fish come to about 400-800 draw calls (E1 smoke: planted 573 calls). Geometry and materials are already shared. Instancing would break the opaque-sort pixel identity (`viewer.ts:226`). The candidate is merging one fish's same-material parts into one geometry. | Draw-call bound frames; E1 to say whether calls are the limit (planted GPU 10 ms) | **high** (sort order, outlines, a2c fins); needs before/after pictures | L | yes |
| 10 | Lid-capped plant drag misses the cache on every move | `render/items.ts:469-470`, `:476`, `:490` | Lane J's open item 3 (`Math.round(h)`) is **already fixed** (`6165d6a`: the key uses the exact h). Flip side: `h = min(size, T.H - y - 15)` changes continuously while a lid-capped plant is dragged up/down, so each move builds a new plantGeometry. Quantise h in key **and** builder (e.g. 1 mm). | E1 to time a plant lift/drag in a full tank | ≤1 mm height change, needs incrementalCheck | S | yes (GR4) |
| 11 | Example tanks ride in the main chunk | `src/examples/index.ts:6-17` | 6 scenes as pretty-printed CRLF `?raw` JSON = 125 kB raw (minified: 77 kB; gzip 20 kB -> 19 kB), plus 6 thumbnails inlined as base64 = 114 kB raw / 80 kB gzip. That is about 240 kB of main's 426 kB. A `import()` when Open… is first shown takes ~100 kB gzip off the live site's first load. The single-file build keeps working once #1 inlines dynamic imports. Minifying the JSON alone saves 48 kB raw, ~1 kB gzip: only worth it for the single file. | ~100 kB gzip off first load (of ~440 kB JS gzip) | none | S | no (examples/index.ts free; panels.ts call site is 1 line) |
| 12 | Per-draw light uniforms not camera-dependent | `render/lighting.ts:147-175`, `render/lightShells.ts:127` | Emitter arrays rebuilt, 25-step `lightSum` array-literal loop, `wattsOf` called 4+ times per draw; placeShells stringifies terrain + tank key each draw while shells are on. Cache by the same key as #3. | E1 to time (do with #3) | 0 px | S | no |
| 13 | Drag hit tests allocate per move | `render/viewer.ts:519-541`; `interact/pointer.ts:41-76`; `render/items.ts:539`, `:559` | Spreads + 2 filters + getBoundingClientRect per hit test; surfaceHit / supportLift / coralSeat make a Raycaster, Box3 and a proxy Mesh per solid per pointermove. | Small; GC churn on long drags | 0 px | S | partly (viewer.ts) |
| 14 | Unreachable 2D card fallbacks (rejected approach) | plants: `art/plants.ts:24-205` (card painters + `drawPlantCard :187`), `render/textures.ts:75`, card branch `render/items.ts:518`; fish: `render/fish3d.ts:16-20` | Every one of the 20 PlantType has a PLANT3D entry and `plant3d.on` is never set false (`render/plant3d.ts:28`), so plant cards are only reachable from the console. `fish3d.species` (71 arts) covers all 58 species arts, so has3D's set test and the flat-card fish path are dead too (the card itself still carries the median fins: not dead). | ~6-8 kB raw of the plants chunk; less code to keep in step | none in the app; loses the console A/B toggle | S | yes (GR4: plants) - ask Nathan whether to keep the toggles |
| 15 | Duplicated helpers (exact merges) | smoothstep `render/fish3d.ts:28`, `herp3d.ts:30`, `shrimp3d.ts:29` (+ same maths `scene/lightout.ts:249`, `render/backdrop.ts:41`); clamp `scene/physics.ts:8`, `scene/shape.ts:11` (dodges an import cycle), `scene/growtime.ts:25`, `render/backdrop.ts:40` (+ ~35 inline min/max); geometry/material caches `herp3d.ts:18-28` ≡ `shrimp3d.ts:18-28`; fin-texture canvas boilerplate `fish3d.ts:222`, `:257`, `textures.ts:39`; `spE` `fish3d.ts:23` ≡ `herp3d.ts:31`; IN = 25.4 `scene/physics.ts:6` and `data/aqadvisor.ts:20` (+ literals `lightout.ts:186,188,224`, `panels.ts:1662`) | One home (`scene/math.ts`, a shared cache helper). No speed gain; this is drift risk. | none | none (identical bodies) | S | no for scene/*, yes for render/* animal files only if a lane holds them (none now) |
| 16 | Duplicated helpers that are **not** exact | hex shade/mix: `art/paint.ts:38`, `art/herps.ts:27` (no upper clamp), `art/placeholder.ts:101,212,218,231`, `art/fishgen.ts:290`, `render/herp3d.ts:202`; form shading `render/herp3d.ts:97`, `snail3d.ts:19`, `shrimp3d.ts:35` (0.3/0.05 vs 0.28/0.04), `plant3d.ts:187`; taper tubes `fish3d.ts:179`, `herp3d.ts:226`, `coral3d.ts:93`; polyline offset `render/build.ts:457` (`proud`, no mitre) vs `render/backdrop.ts:188` (`mitre`); 2nd PRNG `render/snail3d.ts:152` | Merging any of these changes rendered output (snail speckle, shrimp tone, polygon-tank corners). Leave them, or merge only with before/after sheets. | none | **would change the look** | M | - |
| 17 | Shape cache keys hand-written 5 times | `render/items.ts:359`, `:476`; `render/lighting.ts:593`; `scene/lightout.ts:54`; `scene/shape.ts:137`; `render/backdrop.ts:164` | They differ (some leave out `bowlTop`, `pieDeg`, `bowlFloor`), but each covers what its own builder reads: footprint/fitSpots read the floor outline (no bowlTop), a pie's L is derived from pieDeg + D (`scene/shape.ts:93`), and there's no backdrop in a bowl (`backdrop.ts:263`). **No live collision**; a `shapeKey(T)` in scene/shape.ts removes the drift risk. | none | 0 px | S | no |
| 18 | Dead / test-only exports | dead: `scene/items.ts:247` nextItemId, `scene/validate.ts:55` SURFACES, `scene/validate.ts:332` nextFishId; test-only: `render/camera.ts:35` neededTan, `render/lighting.ts:551` irrReadback (GPU readback for tests: keep), `scene/lightout.ts:243` luxPer, `scene/starter.ts:30` bioload | From `node scripts/unused-exports.mjs`. 80 more exports are used only in their own file (the `export` keyword is unneeded; harmless). 63 are exported for tests and used locally: fine. | trivial | none | S | no |
| 19 | three.js share | `dist/assets/three.module-*.js` | 524 kB raw / 132 kB gzip of the full 692 / 172 kB `three.module.min.js`: already tree-shaken. Nothing easy to drop. AR (`render/ar.ts:227`), meshoptimizer (`arUsdz.ts:225`), fflate and USDZExporter (`arUsdz.ts:511,524,547`) are already lazy. | - | - | - | - |

**Top five to act on:** #1 (the single file is broken; a scripts-only fix), #2 (carpet stale geometry; after GR4),
#3 + #12 (light key per draw; free files), #4-#6 (viewer per-draw waste; at the quiet point), #11 (examples lazy chunk).

## Dead code and dev-only files (listed, not flagged)
- Never reached from index.html / review.html: only `src/render/incrementalCheck.ts` (dev, loaded from the console; intentional).
- Dev-only paths inside the app, intentional: `main.ts:40` (`__gb` in DEV only), `ui/panels.ts:45` (`?debug` readout row `:1617`),
  `render/ar.ts:192` (`?ar=ios`, lane T's flag), `render/viewer.ts:258` (`viewer.incremental = false` A/B switch), the
  `plant3d` / `fish3d` toggle objects (`render/plant3d.ts:28`, `render/fish3d.ts:16`), `review.html` + `src/review/main.ts`.
- Test fixture `test/fixtures/plant3d_before_growth.ts` is a frozen copy of the old plant3d on purpose.

## Bundle (vite build at a93a81f; `node` sourcemap breakdown, raw minified bytes)
| Chunk | Raw | Gzip | Loaded | Main contents |
|---|---|---|---|---|
| three.module | 524 kB | 132 kB | start | three.js |
| main | 426 kB | 177 kB | start | examples 240 kB (JSON 125 + base64 thumbs 114), panels.ts 68, viewer 16, validate 11, ar 10, pointer 8, diff 7 |
| preview3d (really the shared render + art chunk) | 353 kB | 131 kB | start | fishgen 45, build 31, scene/items 25, plant3d 24, herps 18, plants 16, fish3d 15, snails 14, items 14, herp3d 14, placeholder 11, lighting 11, lightout 10 |
| meshopt_simplifier, arUsdz, fflate, USDZExporter | 80 kB | 30 kB | iPhone AR only | - |
| review | 15 kB | 6 kB | review.html | - |
First load on the live site is about 1.30 MB raw / 440 kB gzip of JS. Data JSON in the bundle besides the examples:
species.json 10 kB, aqadvisor.json 6 kB, model-versions.json 6 kB (small). The art tables (fishgen PLANS 45 kB, herps
18 kB, snails 14 kB, plants 16 kB) are all live: every species is drawn from them.

## Split plan for the two hotspots (one pure-move commit each, at a quiet point)

**Gate for every commit:** `tsc`, `npm test`, incrementalCheck.runAll 0 px differ, `npm run sheets -- --record`
fingerprints identical (hardware GPU, `--use-angle=d3d11`). Reviewers use `git diff -M --color-moved=dimmed-zebra
--color-moved-ws=allow-indentation-change`: only import lines and the new export keywords may show as added. The
module names are flat (`render/buildStand.ts`, not `render/build/stand.ts`), because a `build/` folder next to
`build.ts` makes `./build` ambiguous.

### render/build.ts (1212 lines) first: no module-level `let`, all top-level functions, so true pure moves
`build.ts` stays as the core and re-exports what moved, so its 7 importers (viewer.ts, preview3d.ts, diff.ts, panels.ts,
tests) don't change.
1. **B1 `render/buildGeom.ts`**: shared helpers basic / lines / at / Tris / wallGeometry / prismGeometry / flatGeometry /
   glassLine / silhouetteMaterial (32-153), shadedBox / ink + inkMats / shadedPrism / shadedSolid (350-398), cardGeometry /
   outline / boxOutline (883-908). Touches build.ts only (+ re-export of cardGeometry for preview3d.ts).
2. **B2 `render/buildStand.ts`**: STAND_FINISHES, addStand, doors, table and frame stands, addBowlFrame (343-542), hood / lid /
   canopy + HOOD_H (543-671). 20 + part of 27 commits this week: the biggest magnet after animals.
3. **B3 `render/buildGlass.ts`**: addBowl, addTank, addWater (171-342), surfaceLook (943; patchLook imports it back).
4. **B4 `render/buildGround.ts`**: floor / wall (712-757), flare + addSubstrate (758-833), blendUniforms / blendGrains
   (834-856; patchLook imports blendUniforms), addTerrainDots (965-1006).
5. **B5 `render/buildAnimals.ts`**: contactShadow + shadowTex / shadowGeo (857-882), HIDDEN / UP / MAX_TILT / PANE_GAP,
   onGlass, snailMeshes (1144-1205). The `animal` closure inside addContents (1090-1120) stays: lifting it out needs
   new parameters (solids, hardKey, rests), so it isn't a pure move. Do that later as its own reviewed change, if ever.
6. **B6 `render/buildPerson.ts`**: personSpot / personPlacement / straightOnEye (672-711).
What's left in build.ts (~350 lines): imports, BACKGROUNDS, Part / BuiltTank, envKey / lookKey / patchLook, buildTank /
patchTank / addContents, disposeScene, re-exports. Collides with: nobody owns build.ts today. Check AL (water fog) and
GR4 for pending build.ts hunks before starting, and merge them first.

### ui/panels.ts (1664 lines) second: one closure, so only P1 is a literal pure move
`attachPanels(store, viewer)` spans 55-1643, and its sections share closure state: status/statusTimer (~14 sections),
`sync()` (1204-1512, 312 lines, touched by almost every lane), setVal/setOut (90+ uses), busy/open, editItem/itemDel/...,
the light and camera keys, the aq* maps, openSec / showSide / narrow (full list in E2-splitmap.md). Pattern: each
section becomes `mountX(ctx)`, which wires its handlers and returns its slice of `sync()`. The section bodies move
verbatim; only free-variable reads change to `ctx.x` (or a destructure at the top of mountX). This is behaviour-
preserving, not byte-pure. Each step also needs a **UI state dump** (P0), because no test imports panels.ts.
- **P0 (dev script, no src change):** for each example + split, dump every input's value / checked / disabled and each
  label's textContent to JSON; it must be identical before/after every P-commit (run it via E1's harness page).
- **P1 `ui/panelUtil.ts`** (pure move): `$`, esc, scapeSec / growthWord, padlock, slug, download, fmtHeight, ARROWS (28-53, 1646-1664).
- **P2 `ui/panelCtx.ts`**: the ctx type + status / setVal / setOut / busy / open / whileOpening factory; attachPanels builds ctx.
- **P3 `ui/panelFile.ts`**: file new / undo, library dialog, examples, start menu, save / share (74-265, ~190 lines; 22 commits).
- **P4 `ui/panelAq.ts`**: AqAdvisor block + syncAq (1139-1200; 19 commits). It shares the aq* maps with labels, which go in ctx.
- **P5 `ui/panelTank.ts`**: tank, background pictures (picKey / syncPics), room (266-449) + their sync slices. This is the
  top magnet: 36 commits.
- **P6 `ui/panelLight.ts`**: lighting (779-837) + its sync slice (K2 / AL hooks).
- **P7 `ui/panelAnimals.ts`**: animals / species + selected fish (450-670, 171 + 50 lines; renderResults is called from water and autosave via ctx).
- **P8 `ui/panelScape.ts`**: scape density, item library, growth, item edit, type-in (906-1123; GR4's growStep, SD's layout picker).
What's left in panels.ts (~450 lines): attachPanels as the orchestrator, substrate / terrain / water (small), panel shell + split,
labels / tabs, readout, the `sync()` dispatcher calling each slice in today's order, and the store subscription.
Collides with: GR4 (growStep), AL (Condition section), W (view map `narrow`), V (cZoom slider), SD (layout picker),
K2 (Lighting rows). Start only when none of them has open panels.ts hunks. Each P-commit is one rebase for anyone
holding panels.ts, so run P1-P8 back to back in one sitting and announce the new file per section in HANDOFF.
