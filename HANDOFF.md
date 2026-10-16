# TankLook (vivarium visualizer): handoff

Living file. Project state and dated decisions go here; update in place.

## Lane FM: fish parts merged per material (2026-10-16; branch `fish-merge`, no preview server; Nathan approved shipping the few changed edge pixels, phase 2 skipped; pushed to main)
E1 fix #5. A 3D fish was 11 meshes (card, body, 2 eyes, 2 gape lines, 4 paired fins, outline hull; +4 barbels on corys).
- **What changed:** `fishBody` (render/fish3d.ts) ends with `mergeShared`: a fish's parts that share a material (the two
  eyes, the two gape lines, each paired-fin pair, the barbels, a doubled tail / anal, same-colour limbs) are one mesh, the
  part transforms baked into the vertices (normals by mat3 of the transform, as the lit shader takes them), placed where
  the first part was (material first-appearance rank in the opaque sort unchanged). A typical fish is now 7 meshes. Merged
  geometries are cached by part geometry + transform (`userData.keep`). The merged box is the union of the parts' turned
  boxes, so `Box3.setFromObject` framing (review sheets, species preview tile) is unchanged (without it the corys' sheets
  moved: 2,400-2,600 px). Switch: `fish3d.merge` (off = one mesh per part, for A/B). render/build.ts untouched.
- **Measured** (alternating frames, same scene, twins swapped; `research/efficiency/FM-ab.mjs`, census `FM-probe.mjs`;
  under load from 4 dev servers): draw calls planted 595 -> 451, iwagumi 747 -> 648, paludarium 567 -> 509; CPU per draw
  planted -0.3 ms, split -0.4 ms (120 pairs), iwagumi / paludarium within noise; GPU unchanged (+-0.1 ms). About 2-3 us
  per draw call: E1's -2 to -4 ms estimate (from hiding whole buckets) was far too high. Phase 2 (one draw per material
  class: card + fins, body + eyes + gape, via two-texture shaders in lighting.ts) would save maybe another 0.3-0.4 ms and
  needs new programs: **skipped (Nathan 2026-10-16).**
- **Picture:** NOT byte-identical: baked transforms round differently on the GPU, so 0-4 single edge pixels per view move
  (planted 3, iwagumi water 0.3: 4, reef 1, others 0; pictures `research/efficiency/FM-pictures/`), and 30 of 79 review
  sheets (software GL) differ in at most 13 px. Nathan approved shipping that. `npm run sheets -- --record` bumps nothing:
  the review page fingerprints a build with `fish3d.merge` off (src/review/main.ts), since merged vertices would change
  every fish's hash with no look change. incrementalCheck: no new differences; **4 terrarium stone edits (move / turn /
  resize / select item, 32-152 px) differ from a full rebuild on main already** (same with merge off; reported to the
  coordinator).
- **AR Quick Look note:** USDZ export transforms normals with the normal matrix; merged barbel normals (non-uniform part
  scale) are mat3-carried, so their exported shading may differ very slightly. The app view is the reference.

## Lane T4: aquatic roster (2026-10-16; branch `aqua-roster`, port 5673; batches 1-2 approved by Nathan and pushed; corals running)
Roadmap section 6: species that add new silhouettes, scales or habitats, in batches of about five, each on a review sheet.
- **Batch 1 (Nathan approved, v1 at build 567)**: pygmy corydoras (`pygmycory`, 25 mm, slim mini cory, black stripe),
  reticulated hillstream loach (`hillstream`, *Sewellia lineolata*, 60 mm, flat disc body, eyes on top, paired fins held
  flat, cling any), yellow lab (`yellowlab` / `~f`, 100 / 90 mm, first mbuna: black-banded white-edged dorsal, male black
  pelvics), Boeseman's rainbowfish (`boesemani` / `~f`, 100 / 80 mm, blue front, orange rear, two dorsals), cockatoo dwarf
  cichlid (`cockatoo` / `~f`, 85 / 50 mm, the male's notched crest dorsal and spotted lyre tail; yellow female).
- **Batch 2 (Nathan approved, v1 at build 568)**: white cloud mountain minnow (`whitecloud`, 40 mm, cool-water schooler),
  comet goldfish (`comet`, 200 mm, long body, single deeply forked tail, big scales), blue tang (`bluetang`, 250 mm, the
  black palette, yellow tail), mandarin dragonet (`mandarin` / `~f`, 60 / 50 mm, bottom, scaleless, domed red-ringed eyes,
  fan pectorals, tall first dorsal on the male; wavy orange lines on blue-green). All on AqAdvisor (marine page for the two).
- AqAdvisor: all on it (ids via `scripts/aqadvisor-ids.py`, now with a T4 block); hillstream is a stand-in (AqAdvisor lists
  only *Gastromyzon ctenocephalus*, same family, size and habit). Tests: stand-in list + "cory" search updated.
- **New generic options (own commit `5fbf6ce`, off by default, every recorded fingerprint unchanged)**: `pec.flat` /
  `pelvic.flat` (fins held out flat all the time, the on-glass SPLAY; 2 lines in `render/fish3d.ts` finMeshes, lane FM
  told) and `pec.w` (broad pectoral fan in `fishgen.pairedFins`).
- Sheets for review are made from the review page's canvases (scratch helper: 2 lights x 4 views per look, POSTed to
  `/__model-sheets` as `t4-*.jpg` and moved out of `public/`), so nothing is recorded before Nathan's yes.

## Lane SG: stone grain from baked tables, first visit about halved (2026-10-16; branch `stone-grain`, port 5653; Nathan approved the pictures; pushed to main)
- **What:** the hardscape grit (render/items.ts `GRIT` / `gritK`) hashed every random number in the shader: 8 hashes per
  noise lookup, 81 for gStone's 27-cell crack search, all inlined by the D3D compiler. Now they come from two baked 3D
  tables (new render/gritTex.ts, made on first use, shared by every hardscape material): a 128^3 R8 table of lattice
  values (gN = ONE trilinear fetch at the cell + smoothstepped fraction, which blends exactly like the 8-corner hashed
  noise did; repeats every 128 lattice units) and a 32^3 RGBA8 table of crack-cell jitter (texelFetch per cell). gH is
  now a table read (whole-number ids; the wood knot offsets became integer vectors). Same grain, pits, cracks and knots,
  laid out from other random numbers. 2 MB + 128 kB of GPU memory.
- **Measured** (hardware GPU, D3D11, machine loaded by other lanes; old and new alternated, so ratios hold):
  hardscape program link 5.5-11.2 -> 1.7-3.1 s (grit's own share ~5 -> ~1.1 s; what is left: crack loop ~0.5 s, wood
  knots ~0.4 s). Cold first picture (`scripts/cold-ab.mjs`, prod builds, median of 3): reef 13.2 -> 7.7 s, paludarium
  18.3 -> 6.1, iwagumi 11.6 -> 5.6, terrarium 9.8 -> 5.1; close-ups and the five back walls 5.2-8.5 -> 2.5-3.5 s.
  GPU per frame (alternate frames, old vs new in one page): river wall 25.2 -> 20.2 ms, rock wall 18.9 -> 15.2, reef
  19.5 -> 16.7, reef wall 6.1 -> 5.2, iwagumi 16.6 -> 15.6; cork / moss / wood / terrarium under 0.4 ms change (their
  grit was cheap). Baseline per kind before the change: stone grain about half the link, cracks ~1.3 s, wood ~1.5 s;
  GPU: stones 2-7 ms on rock / river walls and reef, the crack search most of it.
- **Files:** `research/efficiency/SG-*` (raw JSON; A/B modules: SG-kinds-compile / SG-kinds-gpu = per kind,
  SG-old-new / SG-old-new-ab = old vs new on the new code; scenes in SG-variants/: close-stones, close-driftwood,
  close-cave, close-liverock, wall-rock/river/reef/cork/moss, pieces). `scripts/perf-baseline.mjs` gained
  `--shaders --variants file.mjs` (and no longer crashes on --shaders alone). Pictures: shots/sg/*.jpg (not in git).
- **Not done / open:** a 2x2x2 crack search would cut the last ~0.5 s of link but makes the cracks more regular (not
  tried). Fingerprints (`npm run sheets -- --record`) were not re-recorded: the hardscape look changed on purpose.
  341 tests pass; phone (375 px) checked.

## Lane PL: progressive first load, the tank builds part by part (2026-10-15; branch `progressive-load`, port 5633; Nathan approved the look; pushed to main)
- **What:** the first load and an opened file / example / undo restore (a store `'load'`) no longer block the page on shader
  links. viewer.ts `startLinks` starts every link as before, then `revealTick` asks each part's programs `isReady()`
  (KHR_parallel_shader_compile; every variant in three's `properties.get(material).programs`, so the frost pass's
  linear ones too) and shows the parts in order: room + stand, glass + water, substrate, hardscape, plants, animals
  (build.ts `PART`, `userData.part` on each top-level child; the 3D back wall uses the hardscape material, so it comes
  with the hardscape; corals with the animals). One part per 160 ms at most, each a 260 ms cross-fade (a 2D canvas
  `.revealFade` over #c holding the last frame); a part whose programs are not all linked is hidden for that draw
  (`visible` false around `r.render`), so it never shows half-linked and nothing waits. "Building the tank…"
  (index.html #buildHint) while it runs. **Warm:** all ready within 150 ms = the whole tank at once, no fade, no note.
  Ordinary edits are unchanged (still a blocking draw after startLinks). performance marks `tank part N`,
  `tank complete` / `tank at once` for timing.
- **Measured** (`scripts/cold-ab.mjs`, now with `--done <expr>` and `--warm N`; raw `research/efficiency/PL-cold-ab.json`,
  `PL-warm-ab.json`; fresh profile, D3D11, machine loaded by other lanes). Cold, median of 3, before (whole tank) ->
  after first part / whole tank, s: betta 12.6 -> 3.2 / 13.8, iwagumi 15.1 -> 4.3 / 13.6, paludarium 14.6 -> 3.4 / 15.2,
  planted 14.0 -> 3.9 / 12.2, reef 18.2 -> 4.3 / 20.2, terrarium 16.7 -> 3.2 / 15.7, split (planted + iwagumi)
  17.5 -> 7.2 / 18.3. Whole-tank time is unchanged within the noise (+-2 s; it includes ~0.8 s of fades). The wait
  between substrate and hardscape is still the hardscape program (9-15 s here). Warm reload medians (8 each), before ->
  after: planted 1.45 -> 1.28, reef 1.92 -> 1.64, paludarium 0.91 -> 1.10, split 3.35 -> 1.90 s; all "at once".
- **Same picture:** screenshots after the reveal, before vs after, all 6 examples + split: 0 px differ in the tank (the split's
  only difference is the "Stocking: AqAdvisor" label, network timing). EF1's ~950 crack-edge px on paludarium did not
  come back in 4 cold paludarium runs here; its cause was not found (whatever it was, this path does not show it).
- **Open:** the hardscape link (E1 #11 baked grain / lane SG) is now the only thing between "substrate shown" and the
  finished tank on a first visit.

## Lane SS: scape styles, Composition picker, Quick aquascape setup (2026-10-15; branch `scape-styles`, port 5663; DONE: Nathan approved the styles and the menu; pushed to main)
- **Four new starter styles** (scene/items.ts `starterItems` branches + `STYLES` rows + `LAYOUTS` labels; `LayoutId` and
  `LAYOUT_IDS` grew): **Nature aquarium** (stones stepping down in front of wood rising over them, moss / fern / buce on
  wood and stone, crypts at the feet, mixed stems behind, an open carpet midground); **Dutch** (no hardscape up to Medium,
  no carpet; diagonal streets of one stem species each, red / green alternating, four terraces rising to the back, a rare
  Ozelot specimen; lotus left out, its pads rode the surface); **Jungle** (big wood + spider-wood roots, vals and crypt
  balansae to the surface, crypts / sagittaria over the floor, floater patches drifting over the groups; the "dim look"
  is only the floaters' shade, lighting is not this lane's); **Forest** (manzanita stands as trunks, moss high in the
  twigs, fine carpet, a sand path 70 % of the time from its own stream). Manzanita is still chunky, not "thin".
- **Composition** (`LayoutSettings.comp?: CompId`, absent = 'any'; `COMPS`, `COMP_IDS`): `starterStyle(seed, comp)` fixes
  the foci (mound, one side, U, V / two islands, scattered; jittered by the seed); 'any' = the old roll, so every old
  tank and seed draws exactly as before (tested). `heightAt(foci, x)` shapes plant heights for an explicit composition
  in the older sets too (scatter `prof`), and always in the new ones; Jungle also gathers clumps there (`crowd`). Not
  followed: the round-tank planted mound, a swamp's land. No scene version bump (optional field).
- Tests: `test/scapestyles.test.ts` (every style x composition in bounds, deterministic, density stops as SD, character
  per style, composition weight, Any = old, Shuffle keeps comp, file round-trip). `test/items.test.ts`: Dutch's
  "weight moves" check is by plant height (it covers the floor evenly). Pictures: worktree `shots/ss*_sheet_*.png`.
- **Quick aquascape setup** (Nathan, same day: style, Shuffle and density in one menu; Hardscape / Plants menus are for
  hand tweaks; then "the substrate ... type, mixing, and terrain can all be randomized and tailored to the style"): a new
  section `data-sec="quick"` before Substrate holds Style (`#layout`), one Shuffle, Composition and the Hardscape /
  Plants density sliders; the Plants Shuffle and both sliders left their menus (the Animals slider and Shuffle stay in
  Animals). Shuffle = new seed for rock, wood and plants (plantSeed dropped, animalSeed pinned), same style, composition
  and stops; `shuffleHard` is no longer called from the UI (kept, tested).
- **Styled ground** (`scene/scapeground.ts`, `LayoutSettings.ground?: true`): `styleGround(s)` picks the style's
  substrate (preset or custom blend: aquasoil, sand patches, leaf litter...; marine sand in salt water), a slope rising
  to the back per style, and hills under `styleFoci` (the composition's groups, the designed ones at seed 1) as a custom
  terrain grid; a swamp keeps its land (terrain off, corners only). Own stream (seed x layer 4). Style change, Shuffle and
  Composition restyle it; density sliders do not. `groundEdited` / `handEdits(s, what, ground)` add "substrate" to the
  warning when the ground was changed by hand (a never-styled ground counts as edited only if it is not the default).
- Pictures: worktree `shots/ss_quick_desktop.jpg`, `shots/ss_quick_375.jpg`. Nathan approved the menu 2026-10-16.

## Lane LA: algae on plant leaves + bowl glass film (2026-10-15; branch `leaf-algae`, port 5673; Nathan approved the pictures; pushed to main)

- Lane AL's two open items, both on the one Condition slider, display only, all uniforms (dragging never rebuilds).
- **Leaves** (`render/algae.ts` LEAF_GLSL / `leafAlgaeShader`, called from plant3d `growShader`, so it rides the plant
  material's existing post hook; items.ts untouched): uniform `AU.uAlgL`. Per vertex it reuses GR4's GPU tags: leaf age =
  mesh growth `aGrowth` - `aGrow.x`, "out along the leaf" = distance from `aAnc` (the leaf's base). Per plant one
  instanced vec2 `aAlg` on the grownView (slowness from the species' grow.speed: slow 1, medium 0.5, fast 0, stored as
  `GrowData.alg` so the worker prebuild carries it; height at full growth from the bounding sphere). Noise keyed to the
  full-growth local position, so spots stay put while a plant grows and move with it.
  - diatoms (brown dust) on old / low leaves first, every plant (fast ones less); green spot dots and hair algae (strands
    stretched up the plant) on slow growers, lit upper side most; BBA tufts on the outer ends of old slow-grower leaves at
    Neglected; salt: red cyano instead of the greens. Fast stems stay cleanest; nothing above the water line.
  - No true leaf-margin signal without a new geometry tag: BBA uses "far from the leaf base" (22..55 mm) instead.
  - CPU reveal (`plant3d.gpu = false`) has no `aAlg`: those plants read as fast growers (review switch only).
- **Bowl film**: `bowlFilm` = a sphere zone 0.6 mm inside the glass, floor to water line, same shader as the panes (shared
  `FILM_FRAG`; seam at the front, where the looked-through glass is faintest; no pane edges). The "looked through"
  test is now a soft smoothstep (the sphere has no hard pane boundary). Surface scum still skips bowls (it measures to
  the glass by the floor's outline).
- Pristine: SHA-256 of the canvas identical to main (planted + betta bowl, same 1280x720 viewport, A/B by stashing).
  Tests: test/algae.test.ts (species slowness on the view, uAlgL, patch only after lighting, bowl film on the sphere).
- Pictures: worktree `shots/LA_1..4_*.jpg` (gitignored); helper `shots/la.js`.

## Lane EF1: shader link time, first visit 35-87 s -> 10-13 s (2026-10-15; branch `shader-link`, port 5633; DONE, pushed to main)
- **Measured** with new `scripts/cold-ab.mjs`: every load a FRESH browser profile (no GPU program cache, a first-time
  visitor), production builds before / after served side by side, alternating per example, order swapped each round,
  hardware GPU (headless Edge, D3D11). Navigation -> first draw into the canvas + next frame. Raw:
  `research/efficiency/EF1-cold-ab.json`. Machine loaded (other lanes; CPU high), so absolutes run long; ratios hold.
  Cold first picture, median of 3 (ms): betta 35068 -> 10060, iwagumi 69791 -> 10526, paludarium 43778 -> 12524,
  planted 41520 -> 11211, reef 42721 -> 11623, terrarium 34771 -> 9995; all five stone kinds (iwagumi re-stoned)
  86564 -> 10944; iwagumi seen from behind (solids in the frost pass) 71852 -> 13421.
- **1. One `gStone` call** (render/items.ts gritK): stones 1-5 pick rough / cracks first, then call it once (the D3D
  compiler inlined each call site and its 27-cell crack search 5x). Alone: paludarium cold 31.4 -> 17.5 s, pixel-identical.
- **2. No transmission-pass program for culled meshes** (viewer.ts constructor, a `renderBufferDirect` wrapper): a mesh
  frostCull blanks (drawRange -1) still made three pick, and on a first visit link, a second program per material for
  the frost pass (linear output: the 2-character difference that was iwagumi's second 9-25 s hardscape program, plus ~1 s
  per other material). Skipping the call draws the same.
- **3. All links started at once** (viewer.ts `startLinks`, after every FULL build, before the draw): three's
  `compile()` per viewport, plus the frost pass's linear variants for the meshes it really draws and a two-sided
  film's BackSide; with KHR_parallel_shader_compile the driver links them on its own threads, so the draw waits about
  as long as the slowest one instead of the sum. three's compile() takes the clipping-plane count from the last mesh
  drawn, so the materials go in groups by plane count, each after `primeClip(n)` (a RawShaderMaterial with n planes
  "drawn" with count -1 into a 1x1 target). Warm full rebuilds are no slower (interleaved planted: 190-234 vs 227-276 ms).
- **Same picture:** screenshots of all 6 examples + stones5 + iwagumi-behind, before vs after: 0 px differ in the tank
  (only the build-number text and the viewpoint-map box, which also differs between two "before" runs: CSS timing).
  Model sheets `npm run sheets -- --record` (hardware GPU): no model changed. 322 tests pass. Phone (375 px) checked.
- **Tried, not taken:** keep the page running and draw only once every program reports ready (isReady polling): same
  speed, page responsive meanwhile, but ~950 crack-edge pixels on paludarium's stones differed by 1-20 levels for a
  reason not found (not the shader: compiling the same way and drawing at once is identical). So the first draw still
  blocks the page for those ~10 s; a responsive wait is open (find what the later draw changes first).
- **Open:** the hardscape program is still the slowest link (3-14 s cold here, in parallel with the rest); a cheaper
  stone function or a baked grain (E1 #11) would cut it further. Re-run cold-ab after GR4.

## Lane CC: unreachable 2D card fallbacks deleted (2026-10-15; E2 audit item 14, Nathan: "we can delete those"; pushed to main)
- **Why:** every PlantType has a PLANT3D entry and every species / female art drew in 3D, so the flat-card branches only
  ran from the console (`plant3d.on = false`, `fish3d.on = false`). Checked first: a temporary test confirmed has3D was
  true for every species and female art.
- **Removed:** the plant card painters + drawPlantCard (art/plants.ts, -184 lines; GREENS kept for the 3D leaves), plantGeo
  and the card branch in render/items.ts (plantPlan has no `solid` any more), plantTexture / snailTexture
  (render/textures.ts), `plant3d.on` + has3DPlant (render/plant3d.ts), `fish3d.on` + the `fish3d.species` set + has3D
  (render/fish3d.ts), the flat whole-fish and flat snail paths (floor and glass) in render/build.ts and
  render/preview3d.ts, and `on` / cardViews in scripts/shot-helpers.js. **Kept:** the painted fish card texture (the 3D
  fish's median fins), drawSnailCard / drawFishCard (the panel's 2D preview art, ui/panels.ts), PLANT_ASPECT (sizes).
  The fish material cache key is now `fish:<look>:<fade>`.
- **Proof:** tsc; 37 files / 322 tests pass; `npm run sheets -- --record` bumped no model (fingerprints identical);
  incrementalCheck.runAll 133 edits, 121 incremental, 0 px differ; old vs new exportPNG of all six examples (plain,
  repeated, a fish selected) + a split view at 1050x850, pixel ratio 1: **19 of 19 byte-identical**. First-load shared
  chunk -9.3 kB raw / -3.4 kB gzip; no other chunk changed.

## Edit speed: water colour and light power (2026-10-15; lane EF2, branch `edit-speed`, port 5643; pushed to main)
- **Water colour / opacity** (E1: 120-170 ms): the slow step was opacity leaving 0 (every example but reef starts at 0):
  envKey held `tinted: opacity > 0`, so the whole tank rebuilt and three relinked its programs (82-243 ms in
  `getProgramInfoLog`, about two thirds of it in the frost transmission pass). Now `addWater` builds the water volume
  at opacity 0 too and `patchLook` shows / hides it (`userData.waterVol` 'on' / 'off'); envKey no longer sees opacity.
  At opacity 0 the volume still draws in the tank's first frame (uWater.w = 0, so alpha is exactly 0: first and second
  frame byte-identical, checked) so its program links with the build; `onAfterRender` then hides it.
- **Light power** (E1: 33-41 ms "in store listeners"): it was the panel `sync` calling `lightOutCached`, which ran the
  light model (~35-70 ms, `bandsAt` / `addSrc` over 576 points) on the first Power step, because with watts unset
  nothing had run it. Two changes: (1) `unitKey` (scene/lightout.ts) holds only what the model reads: water on / level /
  opacity (not colour or salt), substrate show / fl / fr / bl / br + albedo (not custom colour2 / share / mix / grain),
  so a water colour or substrate colour step under a powered light no longer re-runs it; (2) with power unset,
  `setLightUniforms` warms the model's 1 W cache (`warmSoon`, render/lighting.ts) 400 ms after the last draw, in an
  idle callback (an orbit or drag keeps pushing it back). The app asks for a frame every frame, so idle periods are
  at most ~16 ms: the 35-70 ms block cannot fit one, hence the debounce. Water opacity is a real model input, so an
  opacity step with power set still re-runs it (correct: the readout changes).
- **Numbers** (scripts/perf-baseline.mjs `--profile-edits 'water colour,light power' --idle-ms 1500`, one profiled
  edit + its draw + readback, ms, interleaved before / after / before / after, Intel Arc D3D11, under load):
  water colour iwagumi 357 / 444 -> 27 / 54, planted 208 / 208 -> 28 / 32, paludarium 295 / 274 -> 24 / 19, reef
  35 / 32 -> 30 / 43 (no change: starts at 0.22); light power iwagumi 95 / 101 -> 23 / 33, planted 101 / 101 -> 20 / 25,
  paludarium 44 / 35 -> 21 / 20, reef 44 / 40 -> 29 / 30. Shader link time on these edits now 0; the model not in the profile.
- **Same picture:** incrementalCheck 133 edits, 0 differ; canvas byte diff before / after on all six examples + split,
  as loaded and at water opacity 0.3: identical (betta 1 px / terrarium 15 px came from one base run's own jitter; base
  re-runs match the after shots byte for byte). New tests: incremental (volume patched in / out), lightout (cache key).
- **Not done:** E2's unitKey note (JSON.stringify per draw, <0.1 ms) left as is: the store mutates objects in place, so
  memoising on object identity would be wrong. The frost transmission pass re-resolving programs per frame (E1 #6) is
  untouched (not an edit cost). Harness additions: `--profile-edits`, `--idle-ms`, `--no-buckets`, `--shots dir`,
  `--incremental`, `--checks-only`; edits keep the first round apart (`firstTotal`, a step off a default).
## Lane SF: single-file build fixed (2026-10-15; branch `single-fix`; DONE, pushed to main)
- **Was broken since d67ac73:** the second Vite entry (review.html) split three.js and the render code into shared
  chunks; build-single.mjs only inlined the main entry, so dist-single/tanklook.html imported `./three.module-*.js` and
  `./preview3d-*.js` and failed from disk (CORS, origin null). The lazy AR chunks (arUsdz, USDZExporter, fflate) and
  GR4's plantWorker chunk were never inlined either.
- **Fix (chosen: its own Vite pass, simpler and robust to any future chunking):** `vite build --mode single`
  (vite.config.ts) builds only index.html into `dist-single/.build/` with `codeSplitting: false`, so every static and
  dynamic import is one script (incl. EF3's lazy `scenes` chunk and the AR exporters), and `assetsInlineLimit: 1e8` makes the
  six example thumbnails data: URLs; build-single.mjs inlines it and deletes `.build/`. `npm run build:single` still runs
  the normal `npm run build` first (dist/ with review.html unchanged; E1's perf harness measures dist/ after it).
  Following and inlining chunks in the inliner was rejected: ES module chunks import each other by relative URL, which
  needs an import map / rewriting per chunk.
- **Worker:** `new URL("plantWorker-*.js", import.meta.url)` becomes a base64 `data:` URL of the worker code (it is
  self-contained; the script fails the build if it ever imports a chunk). A Blob URL does NOT work from file:// in
  Edge/Chrome ("Refused to cross-origin redirects of the top-level worker script"); data: does. Verified from disk:
  growth slider -> 1133 worker replies, no errors (warm drags in the single file).
- Also dropped from the single file: the manifest and apple-touch-icon links (files that do not travel with it; the
  manifest logged a CORS error from disk).
- **Guard:** build-single.mjs fails (exit 1) if the output still references any local src/href, `from "./x.js"`,
  `import("./x.js")`, `new URL("x.js", import.meta.url)` or any `assets/...` string (a thumbnail URL). Checked against the old broken dist: it lists the three
  chunk imports and fails.
- Size: 1.96 MB (was 480 kB broken, without three.js); the single file now carries the AR exporters and the worker.
- Verified (headless Edge over CDP, from disk): start menu with all six thumbnails loaded, Planted community opens in 3D with fish /
  plants, AR button hidden, no console errors (only the known ANGLE X4000 shader warnings); 1400 px and 375 px.
  dist/ over http: app + /review.html (71 models) fine. Re-verified after merging EF3 (76ed8a6). tsc clean; vitest 321/321
  (an earlier full run had 2 load-timing flakes, reef layout and swamp terrain, that pass alone).

## First download: examples on demand (2026-10-15; lane EF3, branch `download-size`, port 5653; pushed to main)
- **The six example scenes are a lazy chunk** (`src/examples/scenes.ts`, ~131 kB / 21 kB gzip): `exampleScenes()` in
  `src/examples/index.ts` imports it once (shared promise, retried after a failure). `renderExamples` in panels.ts starts
  it once the start menu's / Open…'s pictures have decoded (started together they shared a slow line and the menu's
  pictures came 0.2 s later), so it has arrived before a click; `openExample` awaits it (offline: a status
  line, nothing else changes). `EXAMPLES` keeps id / name / hint / thumb only.
- **Thumbnails are plain image files** (`?url`, assets/*.jpg, 11-20 kB each) instead of base64 in main (they were ~113 kB
  of it and do not gzip). The cards render at once with their text; the pictures load in parallel.
- **Sizes (KiB, vite build, before = `19da7f4`):** main 422 -> 183 raw, **176 -> 69 gzip**; first-load code (index.html
  + main + three + preview3d + css) **455 -> 349 gzip (-107)**; dist/ 6.55 -> 6.52 MB (the six JPEGs now ship once as
  files).
- **Timed first visit** (A/B interleaved per run, fresh browser context each, dist/ served gzip; medians; script
  `abload.mjs` in the lane's scratchpad, not kept): DOMContentLoaded slow 4G (1.6 Mbps, 150 ms) **2.77 -> 2.21 s**, 4G
  (9 Mbps, 40 ms) 0.68 -> 0.56 s; start menu with all six pictures 2.89 -> 2.85 s / 0.79 -> 0.74 s; click -> tank drawn
  unchanged (1.9 s slow 4G; the build and shader link dominate). A first visit that shows the start menu still fetches
  about the same bytes in all (the pictures + scenes, 456 -> 456 KiB); **a returning visit (tank restored) or a share
  link skips them: about 107 KiB gzip less**, and the app starts sooner on every visit.
- **Model sheets: left as they are.** They are already on demand: nothing in the app or its service worker requests
  `model-sheets/`; only review.html's link and its no-WebGL message point there, and that gallery's 71 images are
  `loading="lazy"`. They cost dist/ size only (4.73 of 6.52 MB), i.e. deploy upload time, not any visitor's download.
  Taking them out of dist/ would need a second host for the no-WebGL reviewers; not worth it. vite.config.ts untouched.
- **For lane SF (single file):** the single-file pass must now also inline the dynamic `scenes` chunk
  (`inlineDynamicImports`) and the six thumbnail JPEGs (e.g. `assetsInlineLimit` large for that pass), or the start menu
  shows no pictures from disk. Tests: `test/examples.test.ts` checks every thumb is a .jpg URL and SCENES matches EXAMPLES;
  algae / share / examples tests read `SCENES` directly.

## Plants against the glass, roots at the glass (2026-10-15; main)
- **Plants plant right up to the glass** (Nathan: "I should be able to put it right up against it"): `clampItem` keeps an
  upright plant's base inside (`plantBaseR` in scene/items.ts: a clump's own spread / 2, else the species' share of its
  width, at least 4 mm) instead of half its whole leaf spread; leaves past a pane are clipped by the existing glass clip.
  Bowls keep the old full-width rule (their glass closes in above; test/items.test.ts asserts it).
- **Roots show in the substrate face at the glass** (render/roots.ts, one mesh per tank, a part in addContents keyed by
  `rootsKey`; not picked): ribbons in the plane of each straight pane 0.2 mm outside the skirt. Per kind a `HABIT`
  (reach, depth, roots per 10 mm, thickness, side roots, runners, young / aged colour); scaled by growth (more, longer,
  thicker, browner), closeness to the pane, own stems / crowns and neighbours (crowding pushes roots out and thickens the
  bed); depth capped by the ground there, a shallow bed turns them along the bottom glass. Not on floaters, moss, plants
  up on hardscape (lift > 2), or bowls (curved glass, not yet).

## Drag-in, plant list, clumps on slopes (2026-10-15; branch `drag-place`, port 5613; pushed to main)
- **Drag from the panel into the tank** (Nathan: keep click-to-add too): library chips (hardscape, plants, corals) and
  species rows / the Add button. Past 6 px a press becomes a drag with a label at the pointer (`dragOut` in panels.ts;
  mouse and pen only, a finger scrolls the panel). A piece appears under the pointer once it is over a tank's floor and
  follows it (ground or the solid piece under it, `placeAt` in interact/pointer.ts); let go outside the tank = taken back
  out; one undo step. A species drops its start count (or one more if listed) gathered round the drop point, kept off the
  front / back quarter of the depth (front-on, the ground under the pointer is right at the glass).
- **Plant list** under Plants (`#plantList`): a row per species ("Vallisneria cluster x4") that opens to numbered rows
  ("Vallisneria cluster 1", growth word, x to remove); one piece of a species shows its row alone. A piece's row opens to
  the item box (it moves under the row); selecting in the tank opens it. Numbers are by order of id per variant, so
  they renumber when one is removed (no stored names).
- **Clumps follow the ground** (`clumpOnGround`, plant3d.ts; hooked after the lie-over bend in render/items.ts itemMesh):
  each leaf moves with the ground under its top piece's base, fading to 0 at the lie-over height F (the sheet on the water
  stays put). Only for solid, non-carpet, non-floater plants sitting on the ground (lift <= 2). Cached under the bent key
  + a hash of the per-piece offsets; level ground returns null (build unchanged, fingerprints unaffected). Main thread
  only (the worker prebuild still builds the level plant).
- pointer.ts surfaceHit: the ground march starts 0.01 mm inside the tank box (a ray entering exactly on the front face
  read as outside and missed the floor in near-front views).

## Efficiency review (2026-10-15; Nathan: the features are in and look right, so review for efficiency; lanes E1 + E2 OPEN, measure / audit only)
- **Why:** about 470 commits in a week from about 20 lanes; nobody has measured the whole app since lanes J / J2 / K2
  (2026-10-14), and plant growth, the 3D walls, algae, scape density and the light mount have landed since.
  src/ui/panels.ts (1630 lines, 109 changes) and src/render/build.ts (1212 lines, 72 changes) are the merge-conflict hotspots.
- **Phase 1, now (no app code changes, safe beside the running lanes AL and GR4):**
  - **E1 perf baseline:** `../Glass-Box-perf2` / `perf-baseline`, launch config `perf2` 5623. Owns new
    `scripts/perf-baseline.mjs` and `research/efficiency/E1-*`. A re-runnable harness (hardware GPU, alternating-frame
    A/B, every example + split, 1050x850 and phone size, production build for load / size), then a breakdown and a ranked
    fix list. Prompt: prompts/lane-E1-perf-baseline.md.
    **DONE 2026-10-15** (measured `1773676` = `a93a81f` + harness; Intel Arc, D3D11; under load from GR4 / AL dev servers,
    CPU 24-36 %): `research/efficiency/E1-perf-baseline.md` (table, breakdown, ranked fixes) + raw JSON beside it.
    Re-run: `node scripts/perf-baseline.mjs` (~15 min; `--sizes desktop,desktop2x,phone`, `--views` takes a scene path,
    `--shaders` = compile A/B of the hardscape shader, `--ab <module>` = live alternating-frame A/B, see E1-ab-grit.mjs).
    Findings: (1) **a first visit on Windows waits 11-46 s for the first picture** (prod build, fresh browser profile;
    warm 0.6-3.4 s): 92-98 % is shader linking, and one program is 10-22 s of it, the hardscape material
    (`solidMaterial` + `GRIT` / `gritK` in render/items.ts; iwagumi links it twice). (2) **Same-picture fix found:**
    `gritK` inlines `gStone` five times (stone kinds 1-5); one call with the kind's rough / cracks picked first links in
    2.9 s instead of 10.5 s (-73 %, interleaved x3); no steady-draw change (A/B'd live). (3) Steady draw is fine at the
    default size: GPU 1.2-12.4 ms, CPU 2.6-12 ms per draw (1050x850, canvas 700x850); DPR 2 roughly doubles GPU (to
    9.8-17.8 ms). Biggest GPU buckets: hardscape grit on reef 8.4 of ~10.7 ms, lit plants 3.4-7.4 ms, frost on iwagumi
    2.4 ms (J2: 5-8), fish fin cards 1.3-2 ms GPU + 2.3-4.2 ms CPU (one material per card, 125-348 meshes). (4) Edits
    9-24 ms median; water colour 120-170 ms (links new programs on iwagumi / wall, 84 ms); light power 33-41 ms in store
    listeners (unprofiled). (5) E2's per-draw suspects are small: rank traverse 0.1-0.4 ms, getObjectByName('person')
    0.15-0.48, drawViewMap 0.13-0.31; unitKey / placePerson / placeShells / setSize under ~0.1 ms each; tall-plant drag
    = any plant move. (6) dist/ ships 4.8 MB of review JPEGs (`public/model-sheets/`); code 490 KB gzip.
    Top ranked: #1 the one-gStone refactor (items.ts, GR4's file: coordinate), #2 why iwagumi links two hardscape
    programs, #3 non-blocking first link (compileAsync, viewer.ts: quiet), #4 water colour relinks, #5 merge fish parts
    per fish. Re-run after GR4 and AL land.
  - **EF1 shader link DONE 2026-10-15** (see its section): cold first visit 35-87 -> 10-13 s per example (E1 #1, #2 and
    #3: one gStone call, no frost-pass programs for culled meshes, all links started in parallel); same picture.
  - **EF2 edit speed DONE 2026-10-15** (see its section): water colour off opacity 0 208-444 -> 19-54 ms (no rebuild, no
    relink), first light power step 35-101 -> 20-33 ms (model warmed in idle time, narrower cache key); same picture.
  - **FM fish merge DONE 2026-10-16** (see its section; E1 #5): same-material fish parts merged, draw calls -10 to -24 %,
    CPU -0.3 to -0.4 ms per draw on planted / split, GPU unchanged; 0-4 edge pixels per view moved (Nathan approved).
  - **EF3 download size DONE 2026-10-15** (see its section): examples are a lazy chunk + image-file thumbnails; main
    176 -> 69 KiB gzip, first-load code 455 -> 349 KiB gzip. Model sheets were never in the first load (left as is).
  - **E2 code audit:** `../Glass-Box-audit` / `code-audit`, no dev server. Owns `research/efficiency/E2-*` and optional
    `scripts/unused-exports.mjs`. Dead code, duplicates, hot-path suspects (file:line, for E1 to time), bundle
    makeup, and a pure-move split plan for panels.ts / build.ts. Prompt: prompts/lane-E2-code-audit.md.
    **DONE 2026-10-15** (audited `a93a81f`): `research/efficiency/E2-code-audit.md` (ranked table + split plan;
    appendices E2-hotpath / E2-dups / E2-splitmap), `scripts/unused-exports.mjs` (oxc via rolldown; TS 7 has no JS API).
    Findings: (1) **dist-single/tanklook.html is broken** since `d67ac73` (review.html entry splits three + render
    into chunks; build-single.mjs inlines only main); a fixed file will be ~1.36 MB, not 750 kB. scripts-only fix.
    (2) Carpet cache key in render/items.ts:476 misses terrain / substrate / swamp, so carpets keep a stale ground shape
    after a terrain edit (bug; after GR4). Lane J's open item 3 (`Math.round(h)`) is already fixed (`6165d6a`).
    (3) Per-draw waste (the app draws only when dirty, so per orbit / drag move): lightout.ts:446 unitKey
    JSON.stringify ~3x per viewport, viewer.ts:384 placePerson bisect, viewer.ts:391 full-traverse material rank,
    viewer.ts:336/386/401 style reads + viewmap redraw; sent to E1 to time. (4) The examples are 240 of main's 426 kB
    (lazy chunk = ~100 kB gzip off first load). (5) Dead code is small: plant / flat-fish card fallbacks are
    unreachable (every species is 3D; **Nathan 2026-10-15: delete them**; DONE by lane CC (see its section): plant card painters + drawPlantCard + plantTexture + the card branch in items.ts, the plant3d.on / fish3d.on toggles and the flat whole-fish card path; the fish card texture that carries the 3D fins stays), 3 dead + 4 test-only exports. Split plan: build.ts first (B1-B6, true pure moves
    into flat render/build*.ts files, build.ts re-exports), then panels.ts (P0 UI-state dump, P1 utils, P2 ctx, P3-P8
    mountX(ctx) per section; behaviour-preserving, not byte-pure), only when GR4 / AL / W have no panels.ts hunks.
- **Phase 2, later:** the coordinator merges E1 + E2 into one ranked list; Nathan picks. Fixes that touch another active
  lane's files, or panels.ts / build.ts / viewer.ts, wait for a quiet point (no other lane running), and the splits land
  first after it. A fix confined to a file nobody owns can go in earlier.
- **Gate for every phase 2 change:** all fingerprints identical (`npm run sheets -- --record` on the hardware GPU,
  `--use-angle=d3d11`), incrementalCheck 0 px differ, tests pass. Any visible change goes to Nathan with before / after
  pictures, as J2's frost change did. Re-run E1's harness after each change and after GR4 lands.

## Lane SD: scape density sliders (2026-10-15; branch `scape-density`, port 5603; DONE, pushed to main)
- **Per-layer random streams:** `starterItems(S, keepHard?)` in scene/items.ts draws each layer from its own stream
  (seed x layer: hardscape 1, plants 2, style picks 11 / 12; animals 3 in scene/starter.ts). A plant-stop change leaves
  every rock identical (tested); a plants-only redraw keeps the hardscape where it stands now and plants round it.
- **Density from settings, not the seed:** `LayoutSettings.dens = { hard, plant, animal }`, stops 0..4. `STYLES` (items.ts)
  gives each layout its [Sparse, Packed] range per layer (Medium = 1 = the set as designed; `stopDens`), iwagumi its stone
  count per stop (3, 3, 5, 5, 7: odd, 7 at most), and an animal species pool. Seed 1 at Medium = the designed set
  (`classic`); seed 1 at other stops keeps the designed materials and groups (`designed`). `starterStyle` still draws the
  old density roll, so every seed keeps its composition. Old files: `legacyDens(seed)` = stops nearest the old roll, animals None.
  New styles add a STYLES row + a branch with `layer('hard', ...)` / `layer('plant', ...)`; a composition picker plugs into `foci`.
- **Animals (scene/starter.ts):** local bioload rule `litresFor` (about 3 L per neon, 30 L per angel, x1.5 marine, x0.3
  inverts) against the water volume; stops fill 0 / 35 / 60 / 80 / 90 % of it; the lead school always goes in if it fits
  under the cap; pool filtered by fresh / salt, length (L >= 5-6 x TL) and land. None = the user's own animals untouched.
- **UI:** three stepped sliders under "Start from" (Hardscape, Plants / Corals in a reef, Animals); dragging only names the
  stop, release redraws that layer once (`regenerate`), one undo step. Hardscape redraws rocks + plants (animals stay).
  Shuffle and a new layout keep the stops. Bowl / round planted: ring 0.76 of the radius, front carpet patches spread out.
- **Hand edits (Nathan 2026-10-15: "redraw completely but with a very obvious warning popup that it will get rid of your
  current scape"):** every redraw (slider, Shuffle, new layout) is complete; when it would drop hand edits a modal
  `#scapeWarn` asks first ("Keep my scape" / red "Replace it"; Esc = keep, the control goes back). `handEdits(s, what)`
  (scene/starter.ts) regenerates the layer from the current settings and compares poses (coral lift ignored; animals by
  species count); untouched sets redraw with no popup (browser-checked on all six layouts). The dialog resolves from its
  buttons, not its `close` event, which the background preview pane held back.
- Pictures: worktree `shots/sd_sheet.png` (iwagumi / planted / reef at Sparse / Medium / Packed).

## Lane X2: fish leftovers from X and F2 (2026-10-15; branch `fish-x2`, port 5583; Nathan approved all four steps; pushed to main)
- **Generic, off by default, own commits; every other fingerprint unchanged:** `MedianFin.taper` (dc00232; the soft top falls
  in a straight line from the peak to this share of h at the base end) and `Plan.analSplit` (29ae68f; a doubled anal fin:
  fish3d `splitAnal` draws two copies splayed apart by this many degrees below the belly, the card leaves its own anal out,
  `finRooted` drops the anal's rim; fishgen `drawAnal` / `analBox`).
- **Models (v3, build 434):** noseCap 0.03 on neon (`tetra`), cardinal, chili, cpd (cpd~f inherits); dorsal `rake` 0.12 +
  `taper` 0.4 on neon, cardinal, ember, rummynose; goldfish `analSplit` 45 with a larger anal (u0 0.37, h 0.13).
- **Platy / molly males (build 435; Nathan chose the guppy convention):** `platy` / `molly` are the males with `gono`
  (40 / 60 mm); today's looks became `platy~f` / `molly~f` = `her(male, { gono: undefined })` (55 / 80 mm), in species.json
  `female` and fish3d's species list. Bodies identical; Nathan: fine. (Real females are rounder; not done.)
- **Headless Record (d64bf79):** `npm run sheets -- --record` does the review page's Record button without a dev-server slot
  (all 5 were taken). It must run on the hardware GPU (`--use-angle=d3d11`): under SwiftShader EVERY fingerprint differs.
  Checked: it changed exactly my looks. Build stamped = commit count + 1 at start, like the button.
- Not browser-checked in the app (no dev-server slot): the platy / molly Sex switch and stocking rows; tests cover the data.
- Before/after composites: worktree `shots/x2/cmp-*.jpg` (gitignored).

## Plant growth (2026-10-15; design agreed in chat; lane GR1 DONE: branch `plants3d`, port 5283, pushed to main; GR3 DONE (`plant-time`, 5593); GR2 DONE (pushed); GR4 DONE (GPU reveal + worker prebuild, pushed))
Nathan: each plant item gets a growth slider from just planted to fully mature / overgrown; what overgrown looks like
depends on the species (lying along the surface in sheets, growing out of the tank, spreading). Each item (which may
hold many stems / crowns) has its own growth. Later: a global timeline that grows the whole tank at each species' rate.
- **Decisions (Nathan 2026-10-15):**
  - **Height goes away for plants.** Growth drives the plant; the water depth and the growth stage decide whether
    (and how far) it lies over at the surface. Vallisneria at full growth is not "tall", it lies along the water.
    Extrapolate to every species. Width / patch size for carpets and floaters also comes from growth.
  - **No calendar units** on the timeline (growth depends on light, CO2, ferts). Unitless Time, species speed
    slow / medium / fast, plus a tank setting (Low-tech / Ferts / CO2 + ferts) that scales speed.
- **Model:** `Item.growth` 0..1 (0 planted, ~0.5 established, 1 overgrown). Absent = back-solved from the saved
  `size`, so old files and starter sets look unchanged, no version bump. Species data: speed, overflow
  (`trail` along the surface / `emerge` above it / `spread` sideways / `none` just denser), mature length.
- **Mechanism:** build the plant once at full growth, tag each leaf / segment with the growth it appears at, and let
  a uniform reveal it, so scrubbing never rebuilds or reshuffles. Bending at the water line rebuilds once on release.
- **Lanes:** GR1 growth value + reveal + lying over at the surface (trail), Height removed. GR2 emersed growth (stems
  and swords above water, needs room above the line), floaters spreading, frogbit / water lettuce, lily form (tiger
  lotus). GR3 timeline + tank setting (optional: light map slows shaded plants). Duckweed waits for instancing.
- **GR1 landed (2026-10-15, Nathan: "ship it"):**
  - Data: `Item.growth` (0..1, optional; clampItem rounds to 0.001, drops it on non-plants; validate keeps a finite number).
    Absent = `growthOf(type, size)` (art/plants.ts), and the plant draws EXACTLY as before: `test/growth.test.ts` compares
    every species triangle for triangle with the pre-growth generator kept in `test/fixtures/plant3d_before_growth.ts`.
    `size` stays as the plant's own scale (hidden for plants); `grownSize()` = its size at a growth; itemDims follows it
    (width capped at 1.4x the saved size so a grown plant can still sit near the glass).
  - `PLANT3D[type].grow`: `speed` (GR3), `overflow` ('trail' grass / balansae / rotala; 'emerge' sword / ozelot / stem /
    stemred / ludwigia; 'spread' carpet / floaters / sagittaria; 'none' fern / anubias / buce / crypt / moss; stored only,
    GR1 trails everything that reaches the surface), `len` (mm at growth 0 and 1, even ratio per step), `more` (count
    multiplier 0 -> 1), `shoots` (stem side shoots).
  - render/plant3d.ts: `plantGeometry(type, seed, h, clump, g0, more, size)` builds once at full growth; every vertex has a
    growth tag (a, w, anchor, piece, place). The plant's own part (same random draws as before) thins and shrinks below g0;
    extras past g0 come from their own stream (`rng(seed * 6007 + 29)`): more / longer leaves (width grows with the square
    root of the length; straps keep their width), new crowns on runners (clumps widen), more stems and side shoots
    (a new stem reaches full length within 0.25 growth), a wider carpet / floater patch, denser moss. Extras are only
    built once the item HAS a growth (`more` = it.growth != null), so starter sets and old files cost what they did.
    `revealPlant(g, growth)` = positions only (hidden triangles dropped from the index), every drag step;
    `bendPlant(g, F)` = lying over, once per (water level, place): F = water surface over the base - 3 mm.
  - Lying over (Nathan 2026-10-15, two rounds): no sharp bend; a leaf / stem climbs no steeper than an arc of radius
    R = half the water depth (50..250 mm) allows, so it sweeps over and lies along the surface. Each plant has a SPINE
    heading (its current's direction); every leaf / stem that reaches the surface leans toward its own heading drawn from
    a bell curve round the spine (sd `SPREAD` 0.5 rad), from 40 % of the depth up, and turns round to it through the arc.
    Leaves riding a lying stem are pressed flat against the surface; side shoots move with their stem first (`links`).
    A plant with no growth keeps the old allowance (only lies over when it would poke out more than 14 mm).
  - UI: plant edit box shows Growth (0..100 %, "just planted / growing in / established / grown / overgrown") instead of
    Height (index.html `iGrowthRow`, ui/panels.ts `growthWord`); plant library hints no longer say "Size = height".
  - Cost: drag on the 139-plant dense starter, median 16.3 ms per growth step vs 15.6 ms per yaw step (alternate frames).
    First move of a plant builds its full growth once (65..170 ms). Full growth tris: stem 39 k, rotala 93 k, red root
    patch 216 k (600 mm), grass 9 k.
  - Sheets (worktree `shots/`, not in git): `135_grow_{A..F}_*.png` (every species at 0 / .25 / .5 / .75 / 1),
    `138_spine_{C,D,F}_*.png` (the approved sweep + spine). Helpers `shots/grow.js` (growRow / mixRow), `grow_sheets.py`.
  - Open / not done: lying leaves are cut at the glass (they do not turn along it); colour shading is from the upright
    plant (a lying leaf is not relit); no emerse growth.
- **GR2 landed (2026-10-15, Nathan: "the leaf plants look perfect" ... "thats good enough, lets ship"):**
  - Emerge (sword, ozelot, stem, stemred, ludwigia), only for a plant WITH a growth (`more`): every leaf gets an emersed
    twin (`PLANT3D[t].emersed`: Leaf3D overrides + `k` length, `stiff` mm, `land` mm), own random stream and own sheets
    (the plant's own part, its scale and piece numbers unchanged). Per-vertex form tag `em` (1 submersed, 2 emersed twin,
    3 lily pad); twins hidden in the unbent build. `bendPlant(src, F, { ceil, water })`: with `ceil - F >= MIN_ROOM` (50 mm)
    stems and twins climb past the water to the ceiling (render/items.ts: glass lid T.H - 4; hood / open = T.H + lamp
    height - 20); a sword's submersed leaves still lie over at F. Above the water every piece droops as a cantilever:
    bend per mm = 3 lever^2 / Lc^3, lever = free length beyond (capped 0.8 Lc: what lies on the water is carried),
    Lc = stiff x stalk thickness^(2/3) x per-piece draw x steeper-is-stiffer; never more erect than it grew under water
    (Nathan); what sags down lands on a curve of radius `land` (sword 70, stems 35, ludwigia 22), creeps on the surface,
    last stretch turns up. Stiff: sword 230, ozelot 210, stem / stemred 140, ludwigia 150 (thin stems floppy: Nathan,
    sources say ludwigia grows "half-emersed along the surface").
  - Form choice per vertex: `cut` = growth from which the emersed twin shows (revealPlant). Stem leaf: emersed iff its
    base on the bent stem is above F. Sword leaf: 75 % (`EMERSED_SHARE`) of the leaves that reach out switch once grown
    long enough to reach past F (a young sword stays submersed); the rest lie on the surface.
  - Emerging stem clumps grow thinner and wider (60 % of the extra stems, out to ~3x the width by growth 1).
  - No water haze above the water (plant material `post` hook: haze fades out from water + 6 to + 14 mm).
  - Spread: sagittaria new crowns on runners (thin tubes on the ground from the nearest crown), lawn out to ~4.5x its
    half-width by growth 1, leaves lengthen sqrt as much; `more` 6 -> 10. Floaters: first rosette shows from growth 0.
  - New species (library + cards + data): Amazon frogbit (`frogbit`), water lettuce (`lettuce`), both form `float`;
    tiger lotus (`lotus`, rosette of red blotched leaves + `pads`: stalks stretched / shortened in bendPlant so pads lie
    on the water, only with water, from growth 0.35, up to ~7).
  - Reveal: with form tags, `idx` / `live` skip what never shows (a stem leaf's wrong form), bounds over live vertices.
    Cost (alternate frames, 61-plant dense starter 1200 x 450 x 500, half water, CPU + gl.finish): growth step stem
    10.4 ms with twins vs 9.6 without, sword 9.5 vs 8.2; revealPlant alone 1.6 vs 1.2 ms; bend once per water level
    26 vs 13.5 ms. `plant3d.emerse = false` = no twins (review switch, keyed).
  - Tests: test/emerge.test.ts (climb / no room / no growth / young sword / sagittaria / lotus); growth.test.ts fixture
    compare limited to the pre-GR2 species. incrementalCheck.runAll: 133 edits, 0 differ.
  - Sheets (worktree `shots/`): `142_{species}.png` (growth 0 / .5 / 1, full + half tank, front + 3/4), `144_close_new.png`
    (frogbit / lettuce / lotus / sagittaria), `151_droop.png` (approved leaf plants), `157_stems_spread.png` (approved
    stems). Helpers `shots/gr2.js` (row / views / close), `gr2_sheets.py`, `gr2_close.py`; cap.js frames on drawn in-tank
    triangles.
  - Open: lying stems run on under the light / along the water and are cut at the glass (as GR1); sagittaria lawn still
    reads as loose tufts; lotus pads read orange under the light; duckweed waits for instancing.
- **GR3 landed (2026-10-15, Nathan: "keep Time as a saved setting ... ship GR3"):**
  - Data: `TankSetup.grow: { feed: 'low' | 'ferts' | 'co2', time: 0..1 }` (types.ts `GrowSettings`; validate: older files
    low-tech, Time 0; no version bump). `Item.planted` (plants only, -5..1): the growth the plant had at Time 0, written
    when Time moves; below 0 = put in after Time 0 (shows as just planted before then).
  - scene/growtime.ts: `GROW_RATE[feed][speed]` growth per unit Time (low 1 / 1.5 / 2, ferts 1.25 / 2 / 3, co2 1.5 / 3 / 5
    for slow / medium / fast: a slow plant in a low-tech tank takes all of Time from 0 to 1; feeding helps fast growers
    most). `setGrowTime(s, t, feed, only?)` writes every plant's growth = clamp(planted + t x rate); back at Time 0 every
    plant is exactly as planted (a starter plant with no growth of its own goes back to none). `setPlantGrowth` = a
    plant's own Growth slider at any Time (moves its planted growth). Tests: test/growtime.test.ts.
  - UI (Plants panel): Feeding select + Time slider + a hint line ("N of M plants overgrown" / "Growing: N plants to go").
    One drag = one undo step (Time is left out of the generic range seal; it seals once the last plant has grown).
  - Cost: render/build.ts `envKey` leaves `grow` out (it made every Time step a full tank rebuild: 111 -> 79 ms per step,
    alternate frames, 32 plants). The rest is each plant's revealPlant (1..5 ms; carpet 60 k tris 5 ms), so ui/panels.ts
    catches a dense tank up over frames: one first build per frame, as many others as keep frames near 40 ms,
    longest-waiting first. First growth per plant measured 200..350 ms on the busy machine (GR1: 65..170), so the first
    Time move on a dense tank takes seconds to catch up; later moves catch up within ~0.7 s of release.
  - **Time = a preview, two modes (2026-10-15, Nathan: "one relative ... where zero is now, the other absolute where
    zero is every plant freshly planted ... ask if you want to keep these changes"):** `GrowSettings.mode` 'rel' | 'abs'
    (Plants panel "Grow from: Now / Planting"; older files 'rel'). A drag opens a preview: `beginGrow` (rel: Time 0 = the
    tank as it is; abs: every plant's planted = 0, a baby), then the usual setGrowTime steps; once the plants have grown
    the panel shows "Keep these changes? Keep / Undo". Keep = `endGrow` + `store.squash(mark)` (the whole preview is one
    undo step; rel Time goes back to 0, abs keeps Time as the tank's age); Undo = `store.rollback(mark)` (no history
    trace). Any other edit during the preview keeps it as it stands; an undo / load drops it. A plant's own Growth slider
    no longer keeps a planted growth. Feeding change: regrows an open preview, else just the setting.
    Note for testing: the browser pane hidden = no rAF, so growStep stalls; shim rAF with setTimeout.
  - Sheets (worktree `shots/`, not in git): `142_time_sheet.png` (Planted community at Time 0 / 15 / 40 %),
    `143_controls.png`, `144_controls_375.png`, `146_proxy_sheet.png` (stretch-preview mock, rejected).
  - Not done: shaded plants growing slower from the light map (optional, not asked yet).
- **GR4 landed (2026-10-15, Nathan: "Go with the GPU reveal plus background prebuild"):**
  - GPU reveal (render/plant3d.ts): revealPlant's math in the vertex shader (`GROW_VERT`, patched into the plant
    material after the lighting patch, so vAqP / haze / light see the grown position). Per vertex `aAnc` (anchor) and
    `aGrow` (a, w, form em, cut; cut +-inf as +-1e6), built once per built / bent / grounded plant (`gpuParts`, kept in
    userData.gpu). Each mesh draws `grownView(src, g)`: a light geometry sharing src's buffers plus its own growth as a
    one-value instanced attribute `aGrowth`, so every plant keeps ONE material per outline (a material per growth value
    cost three.js 2..8 ms of setup each, tried and dropped). A growth or Time step makes a new view per changed plant
    (no buffers built or uploaded). Its boundingBox is lazy: revealPlant's box, worked out only when asked (selection
    box, pick core); sphere = src's. `plantRaycast` picks against what shows; `cpuGeometry(mesh)` gives the USDZ export
    (render/arUsdz.ts, 2 lines) the CPU reveal; the PNG export renders through WebGL, so it runs the shader. A view's
    dispose frees only its own vertex array state; `dropPlant` disposes a cached plant with its GPU tags.
  - Same triangles as the CPU path: hidden vertices wait at their anchors, and a triangle with every corner hidden has
    at most two distinct anchors, so it draws nothing. test/gpureveal.test.ts mirrors the shader on the CPU
    (`shaderReveal`, float32) for every species x built / lying over / climbing out / on the ground x 13 growths: kept
    triangles land where revealPlant puts them (1e-3 mm), dropped ones have no area (a mutation check fails it). In the
    browser, GPU vs CPU path on the dense tank: 1..5 of 259 k pixels differ (triangle edges). Side effect: a fully shown
    plant with form tags no longer draws its hidden emersed twins (revealPlant handed back src with them in it).
  - Prebuild (render/items.ts): `plantPlan()` = the plant branch's keys and arguments (itemMesh and the prebuild share
    it). `prebuildPlants(tanks)` has a module worker (render/plantWorker.ts, `runJob`) build each plant's full growth
    (`more`) and bend it at the water, one plant at a time, arrays moved back (`packGeometry` / `unpackGeometry`,
    transfer list). A carpet comes back as anchors first: its ground spots are looked up on the main thread in <= 4 ms
    slices, the worker sets it on the ground. Each landed plant then goes to the GPU one buffer per slice (`uploadPlant`:
    positions, triangles, colours, normals, tags into a 1 x 1 target). Runs after a tank loads and while the Plants
    panel is open (ui/panels.ts `warmSoon`, 300 ms after the last change). No worker (tests; dist-single opened from
    disk) = nothing built ahead. Caches: plants 600, bent 360. `plant3d.gpu = false` = GR3's CPU reveal (A/B switch).
  - growStep (ui/panels.ts, GR3's stagger gone): each step predicts every changing plant's place at its new growth
    (clampItem: a grown clump near the glass is pushed in, onto other ground, so its bend or ground changes); one not
    built there yet waits for the worker (sent to the front of its queue) while the rest move. At most one plant a frame
    builds on the main thread: without a worker, or one that has waited 20 frames.
  - Numbers (61-plant dense starter `shots/gr4.js` dense(): planted, seed 47, 1200 x 450 x 500, half water; CPU +
    gl.finish; alternate steps GPU / CPU):
    - Time step, fresh growth values every step: GPU 4.7 / 7.9 ms vs CPU 64.6 / 97.9 ms (two passes).
    - One plant's Growth step (whole tank edit + draw): stem 3.7 vs 5.6, carpet 3.9 vs 8.9, grass 4.0 vs 4.8, fern 3.5 vs
      4.4, anubias 3.3 vs 3.5; a yaw step on the same plant 1.9..3.2 (carpet 15): the reveal's own share is now ~0.
    - First drag (Time slider 0 -> 30 % in 30 input events, as the UI does it): after the prebuild worst frame 10.6 ms,
      median 0.5, plants that moved catch up 0.6 s after release; CPU path, nothing built: worst frames 164 / 86 / 68 ms,
      1.4 s catch-up. A cold plant's first growth on the main thread: median 32, p90 308, max 460 ms.
    - Prebuild of the 61 plants: 13..30 s in the worker on the busy machine; main thread per message 0.2..0.3 ms
      (worst 5), upload slices median 0.4 ms; frame gaps meanwhile no worse than with nothing running (the machine's own
      noise: 10..37 ms gaps either way).
    - The GPU draws full-growth triangles at any growth (dense tank at Time 12 %: 1.4 M drawn, 0.67 M showing); draw
      time stayed 5..7 ms.
  - Lane E2 fixes folded in (coordinator 2026-10-15): #2 a carpet's ground cache key now carries the ground
    (`groundKey`: custom terrain grid and heights, else substrate corners + swamp seed; plus T.H), so a terrain or
    substrate edit re-grounds it (test/carpetground.test.ts; fails with the old key). #10 a lid-capped plant's height is
    capped to whole mm, so dragging it up or down reuses its build until the room changes by a mm (<= 1 mm change).
  - Open: the single plant Growth slider still builds a moved plant (pushed in from the glass) on the main thread (only
    the Time drag waits for the worker); prebuilt full growths roughly double plant geometry memory once built.

## 3D back wall (2026-10-15; main checkout; Nathan chose "3D panel inside" over a flat printed sheet; pushed to main)
Nathan: textured backgrounds, e.g. a plant mat for terrariums, a live rock / coral wall for saltwater, river rocks for fresh.
- **Data:** `TankSetup.backdrop: { kind: none|rock|river|reef|cork|moss, depth (mm, 20..100, default 50), seed }` (types.ts
  `BackdropSettings`; older files: none). Not tied to the water type: any style in any tank.
- **Render (`src/render/backdrop.ts`):** a relief panel INSIDE the tank on the back glass (`backgroundRuns(T, ['back'], 145, 0)`,
  so a round tank gets its back arc; bowl: none). One height field per style (jittered-grid pieces via `scatter` + rotated
  value noise), pushed in 1.5 mm .. `depth` along the run's inward normal; top and end caps close it to the glass. Shaded like
  the stones: colour darkened in hollows, the stones' light baked in, `solidMaterial(T)` (now exported) + grit kinds
  rock 2, river 1, reef 3, cork 10, moss 12. Geometry cached (6) and `keep`; added in `buildTank` after the substrate.
- **Bounds:** `backdropDepth(b, T)` / `frontOfWall` (physics.ts). `clampFish(f, A, back)` keeps fish `back + 10` mm off the
  back glass (chord at x); every caller passes the wall depth. Plants (`clampItem`, via `Ground.backdrop`) stay
  `0.7 * depth + half` in front; rocks and wood may sink into the wall, like into the glass. Changing the wall re-fits fish + items.
- **UI:** Tank > Background: "3D wall" select + Shuffle (new seed), Wall depth slider (hidden for none / bowls). Split diff entry.
- Not done: water volume / weight ignore the wall's displacement; light map / dark spots ignore it; no side walls; plant-mat
  style is moss cushions only (no leaves). Tests `test/backdrop.test.ts` (file round trip, bounds per style, bowl / round, fish /
  plant clamps). 275/275. Pictures `shots/backdrop_*` (gitignored).

## Aquascape menu split into Hardscape and Plants (2026-10-14; Nathan asked; pushed to main)
- **Hardscape** (`data-sec="hardscape"`): Start from + Shuffle, stones / wood / caves, its own count and Remove all.
  **Plants** (`data-sec="plants"`, titled "Plants & Corals" in saltwater): plants and corals, own count and Remove all
  (each Remove all clears only its menu's kinds). `scapeSec(kind)` in `ui/panels.ts` maps kind → menu.
- The piece editor (`#itemEdit`: item box + hint) is one DOM node, moved into whichever of the two opens; selecting a
  piece opens its menu. Pointer: a piece can be picked only while ITS menu is open (`canPick('items', kind)`).

## Lane Z: corals sit on the rock (2026-10-14; branch `coral-seat`, port 5563; Nathan approved; pushed to main)
- **Measured first**: the Reef example has NO floating corals. All 8 raised corals rest within 1 mm of the rock straight
  under them. Three (12 and 13, blue acropora; 29, mushroom) sit on a ledge tucked under a higher rock, with branches into it.
  Re-seating them (to the top of the pile, or with the new rule) looked worse (clumped, riding into other corals).
  Nathan: **leave `reef.json` / `reef.jpg` as saved** (no re-shoot).
- **`coralSeat`** (`render/items.ts`, shared by `seatCorals` and the drag): looking from the planned height, a base in the
  water drops to the rock top below; a base INSIDE a rock rises to that rock's own top (down-ray with both-sided copies,
  counting into / out of rock by the face normal). The middle of the foot picks the rock; the 4 probes around it raise it
  on a slope (up to 2r above the middle), and a face higher than that is a wall, skipped. Base `SEAT_SINK` = 3 mm in; no rock
  = the ground (lift 0). Rock only: corals never seat on coral. Fixes generated corals buried up to 47 mm in steeply tipped
  rock (the old look-down from base + 40 mm started inside the rock). Shuffled reef layouts change a little where that happened.
- **Drag** (`interact/pointer.ts`): a coral never slides level (`float` off). Each move seats it at the point the pointer is
  on (`p.y + 1`), so a ledge under a higher rock stays a ledge, and off the rock it goes to the sand. One undo step per
  drag (coalesce `item-drag`, sealed on release). The Move buttons / Lift slider (`ui/panels.ts`) are unchanged: they can still
  place a coral floating; a later drag seats it.
  Nathan 2026-10-14: that is BY DESIGN. The Move buttons / Lift slider are a manual override of the seating; don't "fix" them.
- Tests `test/coralseat.test.ts`: tipped rock (4 pitch / roll mixes, including the 40° roll that buried it), drop on rock /
  on sand, ledge under a higher rock, one undo step. Browser: drag on rock (lift 81, 1 mm in), on sand (0), 2 undos step
  back; 375 px no horizontal scroll, 0 console errors. Pictures in the worktree `shots/Z_sheet_*.jpg` (gitignored).

## Lane F2: harder fish, new shapes (2026-10-14; branch `fish-hard`, port 5573; Nathan approved all four; pushed to main)
Four species' PLANS entries in `src/art/fishgen.ts`, plus new GENERIC options, each off by default on its own commit (no other
look changed; every fingerprint checked on /review.html before each Record).
- **goldfish -> fantail (v2, build 377):** `tail.split` (8feffb9): a double caudal, two copies of the tail joined along the
  top, lower parts flaring out (degrees) and the lobes swinging out to the rear (fish3d `splitTail`; fishgen `drawTail` /
  `tailBox`; the 3D card leaves its own tail out). Goldfish: `split` 45 on 'notch' lobes, thick 0.68, pec x2, pelvic len
  0.15 w 1.4. Not done: the fantail's doubled anal fin.
- **kuhli (v2, build 384):** `noseCap` (84f85b4, profile(): the snout ends in a rounded half-ellipse this long instead of
  the sharp corner; lane X's neon / cardinal / chili / cpd note could use it) and `barbelR` (3D barbel radius, default
  0.004). Kuhli: noseCap 0.04, snout 0.95, peak 0.78, pedT 0.35, barbelR 0.0013, barbels 0.016.
- **harlequin (v2, build 386):** poly marks take 'c' sharp-corner points (e49d389; they were always smoothed into a bean).
  Harlequin: angular 0.7, peak 0.58, ped 0.03, depth 0.33; the patch a triangle from under the dorsal to the peduncle.
- **oscar (v3, build 390):** head geometry was tried and dropped (Nathan: cheeks / jaw / lips read as a detached bulb or
  "still looks like ass" next to his red tiger oscar photo, `shots/laneF2/ref-oscar.webp`). Shipped: lane S's v2 body
  unchanged, the colours from that photo (olive-grey head and upper front, near-black rear via a dark blob, ~120 small
  orange spots, orange throat and gill cover), noseCap 0.02. With noseCap the 3D mouth line starts on the snout midline
  so the two sides meet (generic, fish3d gapeMeshes). The renderer lifts very dark colours, so contrast comes from the
  lighter head, not a blacker body.
- Head geometry for cory / panda, loach / SAE heads, marine cheeks: not built (the cheek / jaw attempt is not in the code).
- Before/after composites: worktree `shots/laneF2/cmp-*.jpg` (gitignored); `cmp.py <ids>` after `npm run sheets`.

## Lane X: anatomy audit P2, freshwater mid-water fish (2026-10-14; branch `fish-fins`, port 5503; Nathan approved both sheets; pushed to main)
PLANS entries only in `src/art/fishgen.ts`; no new generic parameters; v2 at build 372 (13 looks).
- **Characins** (neon = art `tetra`, cardinal, ember, rummynose): `MedianFin` dorsal mid-back, short base with a
  swept rear point (`tip` point, `trail`, low `drop`); anal on a long low base; slimmer rear body and a narrow
  peduncle (`peak` ~0.64-0.66, `ped` ~0.03); blunter head (`snout` 0.45-0.6); small mouth line (`gape` ~0.022).
  Neon / cardinal tails: lyre `cut` 0.5 (softer fork). Ember: `depth` 0.26 -> 0.24.
- **chili:** shorter, softer head (`snout` 0.6), smoother peduncle, small pointed dorsal / anal.
- **danio:** dorsal moved back over the anal, upturned oblique mouth (`mouth` -0.025, `gape` + `gapeDrop` 0.012),
  fine barbels (`barbels` 0.018). **cpd (+ ~f):** `snout` 0.75, moderate fork (lyre `cut` 0.38).
- **cherrybarb:** male slimmer (`depth` 0.26; female keeps 0.31), taller pointed dorsal. **tigerbarb:** big
  triangular dorsal (h 0.17), pelvics `w` 1.5, pectorals x1.3. **platy:** larger dorsal, round caudal fan, upturned
  mouth. **molly:** long ray-supported dorsal (`MedianFin`), larger round caudal, upturned jaw.
- **Still open (needs generic work, not done):** the nose tip is always a sharp corner (`geometry()` bodyPts
  `[1, mouth, 'c']`), so neon / cardinal / chili / cpd snouts stay slightly pointed; chili's front-view eye-region
  texture unchanged; characin dorsal/anal can't taper front-high-to-rear-low (MedianFin keeps a level top); platy /
  molly have no male gonopodium look (one look each; add `gono` if Nathan wants males).
- Before/after composites: worktree `shots/laneX/b*-*.jpg` (gitignored).
## Lane Y: anatomy audit P2, bottom dwellers + marine fish (2026-10-14; branch `fish-p2b`, port 5533; Nathan approved both batches; pushed to main)
PLANS entries only in `src/art/fishgen.ts`, all with lane S's parameters; no new generic parameter, no paint.ts / fish3d.ts edits.
- **Batch 1 (v2 at build 359, `cb6d2e7`):** bronzecory / pandacory: triangular dorsal on one stout spine (MedianFin, `spines`
  0.12, `nSp` 1), broad low pectorals `pec` {s 1.9, v 0.85}, pelvics w 1.3. oto: one-spine triangular dorsal, `pec` 1.7 low,
  tail notch -> fork. clownloach: bigger dorsal / anal / paired fins, blunter sloping head (snout 0.38, mouth 0.05), `gape`.
  sae: taller pointed dorsal, small anal, blunter snout with a low mouth line.
- **Batch 2 (v2 at build 365):** ocellaris (long dorsal from the nape, spiny front, rounded soft rear; anal behind the vent;
  `pec` 1.6), royalgramma (dorsal nape to peduncle with a raised soft rear, longer anal, oblique jaw `gape` 0.045, dorsal
  spot moved onto the fin), sixline (continuous low dorsal, blunter forehead snout 0.55, small mouth), chromis (dorsal from
  over the gill cover, low spine notches 0.1 so it is not a saw blade; fork -> lyre `cut` 0.75 for curved lobes).
- Mouth lines: `gapeDrop` 0.002-0.003 on all the marine fish; 0.008-0.01 still read as a frown head-on.
- Not done (beyond "cheap"): cory scute rows and the panda mask, the loach / SAE head geometry, the marine fish's
  gill-cover / cheek sculpting (would need head geometry the shared loft does not have).
- Before/after composites: worktree `shots/laneY/cmp-*.jpg` (gitignored); `shots/laneY/cmp.py <ids>` rebuilds them after
  `npm run sheets`.

## Lane V: zoom out further (2026-10-14; branch `zoom-out`, port 5523; Nathan approved option (b) and the pictures; pushed to main)
Nathan: "can we also allow farther zooming out?" Zoom now goes 0.25-12 (was 0.5-12).
- Measured first: the betta bowl's view is narrow (eye 3 m back; 29° tall even at 0.25), but the Reef 72 at 0.25 with a
  wider lens got 72° (desktop), 87° (phone) or 111° (split), with edges stretched up to 2.8×. The room also ran out
  (the space above the 2.7 m wall, the wall's ends, the edge of the 8 m floor).
- Decision (Nathan picked (b) over (a), "just widen the lens"): below 0.5 the lens holds at 0.5's field of view and the eye
  steps back by 0.5 / zoom (0.25 = 2× the Eye distance). The step-back factor is the same for every tank, so locked split
  views stay like-for-like. At 0.5 and above nothing changes (zoom stays a pure field-of-view change at the fixed eye).
  `scene/orbit.ts` `LENS_ZOOM_MIN`, `lensZoom`, `eyeDist`; `placeCamera` and the orbit wall limit (`eyeClear`) use
  `eyeDist`, while the lens is still sized from the Eye distance (`frameStraightOn`). So zooming out near a side wall
  stops at the wall, like orbiting does.
- Wheel / pinch keep the point under the pointer: the zoomAt anchor rescales by eye-to-pivot distance (old / new).
  Before that fix it drifted 46 px by 0.25; now it is ≤ 2 px over 9 ticks, exact on the way back.
- Room (`render/build.ts`, free file): the wall is 40 m wide (`ROOM_SPAN`), the floor 40 m (the mesh is scaled because
  `render/ar.ts` finds it by its 8000 geometry width), and there is a one-sided ceiling at 2.7 m, in the wall group so AR
  hides it too. Readouts: the eye-map caption and the depth-ratio formula use `eyeDist` (`render/viewmap.ts`, `viewer.ts`).
- Files: no scene version bump; old zooms load unchanged and older readers clamp to 0.5. `test/zoomout.test.ts` covers
  the limit, the load / clamp round trip, eyeDist / lensZoom, and the fov hold with no size jump at 0.5.
- Pictures: `shots/v1-v3` (the options) and `v4-v6` (desktop / split / phone before-after), in the lane worktree only (gitignored).

## Lane S2: anatomy audit P1, fish batch 4 (2026-10-14; branch `fish-fins-b4`, port 5513; Nathan approved the sheets; pushed to main)
Split from lane S. Only the PLANS / her() entries of these species in `src/art/fishgen.ts`; generic parameters came from lane S
(`tail.sword`, `eye.bulge` in f3706dc; `gapeDrop` in 332e863). All 9 looks v2 at build 351; no other fingerprint changed.
- **hatchet:** pectorals x2.3 rooted high (`pec` {s 2.3, v 0.3}), wing-like from front/top; long low anal along the keel
  (MedianFin at 0.52 len 0.3), small dorsal far back.
- **swordtail (male):** `tail.sword` 0.3 with pedU 0.45 (long tapering sword, black lower edge), slimmer body (depth 0.16),
  gonopodium, upturned mouth (gape 0.03). **swordtail~f:** no sword, own dorsal and eye, depth 0.24.
  Size kept at 120 mm TL (Nathan): the sword is inside the TL, so the body now shows ~66 mm instead of ~84 mm.
- **guppy:** gonopodium, upturned mouth. **guppy~f:** coin tail -> notch fan; keeps her anal fin (`gono: undefined`).
- **betta(~f):** anal fin from just behind the pelvics to the peduncle (MedianFin), pointed paired pelvics (ext, w 0.6) instead
  of threads, upturned jaw (gape 0.04); lane D's drape and the male/female fin lengths kept.
- **peapuffer(~f):** `scale: 0` (skin, fine speckle added LAST so the seeded spot pattern stays), `eye.bulge` 0.65,
  a short straight beak mouth (gape 0.009, gapeDrop 0.002).
- Mouth lines (gape) on swordtail/guppy/betta use gapeDrop 0.008: the default 0.02 reads as a frown head-on.
- Before/after composites: worktree `shots/laneS2/cmp-*.jpg` (gitignored). Quick sheet loop without a dev server:
  `npm run sheets`, copy your looks out, `git checkout -- public/model-sheets` (every JPEG re-encodes differently).

## Lane T: AR view on iPhone, AR Quick Look (2026-10-14; branch `ar-view`, port 5483; pushed to main, HIDDEN behind `?ar=ios`)
- Built: `src/render/arUsdz.ts` + `test/arUsdz.test.ts`; `attachAR` in `src/render/ar.ts` now picks WebXR (Android, lane Q,
  unchanged) or AR Quick Look (`a.relList.supports('ar')`, iPhone/iPad Safari). Desktop and non-AR Android see no button.
- Gate: `IOS_FLAG` in ar.ts: the iPhone button shows only with `?ar=ios` in the URL until someone tests on a real iPhone
  (Nathan had none at hand 2026-10-14). After a good test: set `IOS_FLAG = false`.
- Tap: "Preparing AR…", then a .usdz Blob opens through `<a rel="ar" href=blob#allowsContentScaling=0><img></a>` (auto-click;
  a small panel keeps the Size check line and an "Open in AR" link in case the auto-open is blocked after the async export).
  `allowsContentScaling=0` should lock true size; unverified on a blob URL, check on the phone.
- Export = a COPY of the current viewport's build (viewer untouched): drops person / room floor / wall / terrain dots
  (`roomObjects`, shared with prepScene), outline hulls, lines, the animals' decal shadows, the snails' invisible hit cards.
  Every mesh -> MeshStandardMaterial: glass opacity >= 0.1, water volume -> light tint (0.12), frost -> white sheet 0.8,
  glow -> emissive, soft fin cards (alpha-to-coverage) -> alpha blend. Double-sided parts get a reversed copy.
- Vertex colours (Quick Look ignores them): parts without a map are baked into one small atlas, one 8 px tile per part
  holding the plane through its colours (top 2 principal axes; bilinear = exact; worst residual 0.014 on Planted community).
  Parts with a map keep the colours' mean as a tint (fish form shading; Quick Look lights the model itself).
- Size: meshoptimizer (new dependency, lazy chunk `meshoptimizer/simplifier`) at 0.5 mm, after welding triangle soups;
  plant leaves barely simplify (open strips; Permissive mode made sticks), so over budget plants keep a share of their
  pieces, carpets first (>= 1000 pieces, down to 20 %), then stem plants. Budget 250k triangles (Nathan chose ~25 MB over
  15 MB from a side-by-side picture). Numbers rounded (0.1 mm, normals 0.01) and the zip repacked 64-byte aligned (three's
  own alignment code is off); textures max 512 px; canvas toBlob made synchronous during export (Chromium's idle-time
  toBlob cost ~1 s per texture).
- Measured on desktop (quiet machine): Planted community (40 breeder, 40 fish) 810k -> 254k tris, 25.7 MB, 2.3-2.4 s
  (carpets 20 %, stem leaves 94 %); Iwagumi 26 MB 2.8-3.3 s; Reef 24.6 MB 3.2 s; Paludarium 17 MB 2.8 s; Terrarium 11.7 MB
  1.3 s; Betta 2.6 MB 0.9 s. File checked: stored, every file 64-byte aligned, model.usda first, loads in three's
  USDZLoader, bbox 0.94 m wide, stand foot at y = 0.
- Dev: `(await import('/src/render/arUsdz.ts')).exportUSDZ(__gb.viewer.current)` -> { blob, stats } on the dev page.
- OPEN (needs an iPhone): checklist: button shows with ?ar=ios, Quick Look opens (auto or via the panel link), tank stands
  on the floor at the right height, size right against a tape measure, glass / water / fish look right, the stand shows,
  pinch-zoom locked or not. Then flip IOS_FLAG. Lane Q leftover fixed: selection boxes (lines drawn over everything) are hidden in WebXR AR and never exported. Known: plant colours may read duller under Quick Look's lighting than in
  the viewer (its own IBL); fish fins are translucent cards, faint from far.

## Lane W: Android app (2026-10-14; OPENED same day, Nathan: "start work on the android app"; prompt `prompts/lane-W-android-app.md`)
- **Route: Trusted Web Activity (TWA)** around https://tanklook.com/ (Bubblewrap or PWABuilder). Real Chrome, so WebXR
  AR keeps working and pushes to main update the app with no store release. **Not Capacitor**: Android WebView has no
  WebXR (AR would need a native ARCore plugin); revisit only if offline use beats AR. Estimate: 1-2 days of code; the
  calendar time is Play's 14-day / 12-tester closed test that new personal accounts must run before production.
- **Missing today:** no web manifest, no service worker, no `/.well-known/assetlinks.json`.
- **Landscape gap (found 2026-10-14, not fixed):** the layout only switches on width (`style.css` `max-width: 760px`).
  Sideways, phones wider than 760 px get the desktop layout (menu left, 350 px, ~40 % of the width): roughly right.
  Phones 760 px or narrower in landscape stay stacked at ~180 px per half: unusable. Fix: a short-landscape rule that
  always puts the panel on the left at ~260-280 px. The view map's phone default reads the width once at load.
- **Step 1 DONE (2026-10-14, Nathan approved the pictures):** `style.css` `(orientation: landscape) and (max-height: 500px)`
  rule after the narrow one: panel left at 280 px (row / nudge / flabel columns narrowed to fit), view fills the rest,
  toast over the panel, sticky Add row, map 140x105. View-map default (`panels.ts` `narrow`) counts a sideways phone as a
  phone but is still read once at load (rotating never flips the viewer's map). Fixed on the way: the sticky `#addRow`
  floated 40 px (the panel's bottom padding) above the bottom on portrait phones too, with list rows showing under it;
  now `bottom: -40px`. Pictures: `shots/landscape/W1-W4` (worktree only); taken by a CDP script (touch emulated).
- **Step 2 DONE (2026-10-14): installable PWA.** `public/manifest.webmanifest` (standalone, orientation any, colours
  #15181e = dark --bg), `public/icons/` (any 192/512, maskable 192/512, apple-touch 180; placeholder art = the favicon's
  tank + fish, drawn by PIL; replace before the store listing if wanted), link + theme-color tags in `index.html`, and
  `public/sw.js` registered from `main.ts` (PROD only, one line). SW: the app page network-first (pushes show on the
  next open), `assets/` cache-first capped at 120, other same-origin network-first, other origins (aqadvisor proxy)
  untouched. Lazy chunks are cached only once loaded, so offline covers what the visitor has already opened. Checked
  on `android-prod` (vite preview, 5544): SW active and controlling, the app opens with the server stopped,
  `Page.getInstallabilityErrors` = none. Not yet checked: the install prompt on a real phone (needs the live https site).
- **Step 3 in progress (2026-10-14): TWA project in `android/`** (Bubblewrap 1.x, `twa-manifest.json` written by hand,
  then `bubblewrap update`): package `com.tanklook.app`, host tanklook.com, orientation default (follows the phone),
  target/compile SDK 36, min 21, version 1.0.0 (code 1). Toolchain on this PC (not in the repo): Bubblewrap CLI (npm -g),
  Temurin JDK 17.0.11 and Android cmdline-tools 6609375 in `%USERPROFILE%\.bubblewrap` (config.json points there).
  Upload key: `C:\Users\nreed\keys\tanklook-upload.jks`, alias `upload`; Nathan makes it and keeps the passwords,
  never in the repo (`android/.gitignore` blocks *.jks / *.aab / build output). Nathan runs `bubblewrap build` himself
  (it asks for the passwords and for the Android SDK licences). Then: its `assetlinks.json` goes to
  `public/.well-known/assetlinks.json`; after Play App Signing is on, ADD Play's app-signing SHA-256 too (from Play
  Console > App integrity), or the store build shows the browser bar.
- **Step 3 built (2026-10-14):** `android/app-release-signed.apk` + `app-release-bundle.aab` (git-ignored), signed with
  the upload key, SHA-256 `EB:FB:F5:12:...:FA:DC:2E` (full value in `public/.well-known/assetlinks.json`, served at
  tanklook.com/.well-known/assetlinks.json). minSdk raised to 24 (androidbrowserhelper 2.7.4 needs it). Gotchas for the
  next build: (1) Bubblewrap installed a 32-bit JDK on Windows (Gradle's 1.5 GB heap fails); config.json now points at
  64-bit Temurin 17 in `%USERPROFILE%\.bubblewrap\jdk\x64`. (2) PowerShell blocks `bubblewrap.ps1`: run `bubblewrap.cmd`.
  (3) The app's terminals set `NoDefaultCurrentDirectoryInExePath=1`, so `gradlew.bat` is "not recognized": clear it
  first. Build line: `cd C:/Users/nreed/Glass-Box-android/android; $env:NoDefaultCurrentDirectoryInExePath = $null;
  bubblewrap.cmd build`. To ship an update to the shell only: bump appVersionCode / appVersionName in twa-manifest.json.
- **Step 3 DONE (2026-10-14):** Nathan installed the APK on his S24+: "it works". Google's asset-links check = linked.
  Next: step 4, Play listing material; Nathan opens the developer account (14-day / 12-tester closed test).
- **Order:** landscape layout, PWA manifest + SW, TWA shell + asset links, Play listing material (Nathan does the account
  and submissions), low-end phone performance check.


## Background pictures (2026-10-14; main checkout, pushed to main)
Nathan: custom backgrounds from an uploaded image, with stretch / fill / fit, different backgrounds on different sides, one
picture able to span touching sides.
- **Data:** `render.bgImages: { img, fit: fill|fit|stretch|tile, sides, scale }[]` (types.ts `BgImage`; older files: []).
  Up to 4 per tank; each side under one picture; a picture's sides must touch (`sidesTouch`, ring front-right-back-left,
  so left+right or back+front alone are refused; left+back+right is fine). `scale` = tile height, % of tank height.
- **Storage (`src/scene/images.ts`):** scenes hold only a picture id (FNV hash of the data URL), so undo snapshots,
  autosave and share links stay small. Pictures live in memory + `localStorage tanklook.img.<id>`, downscaled to 2048 px
  long edge (JPEG 0.86, PNG only when it has transparency). Download embeds the used pictures in a top-level `images`
  map; `parseScene` adopts them. Share links go without pictures (status says so); a missing picture shows "missing" in
  its row and its sides fall back to the plain background. Pictures are never garbage-collected from localStorage (open).
- **Render (build.ts `BgSheet`):** pictures cover their sides whatever `bg` is (also with None); the plain background keeps
  its own sides minus those. Each picture's run is turned clockwise seen from above (`clockwise`), so it reads correctly
  from inside the tank across a corner (seen from outside a side pane it is mirrored, like a print viewed through glass).
  Fit modes are composed on a canvas the run's shape (`pictureTexture`, textures.ts; fit pads with the plain background
  colour, black for none / gradient / frosted). Pictures sit 0.3 mm (minus 0.05 per picture) outside the glass, the plain
  sheet 0.5, so overlapping round-tank arcs never z-fight. Bowl uses the same sheets on its sphere.
- **UI:** Tank > Background > Pictures: Add picture…, then per picture side toggles, Fit select, Size (tile), remove.
- Tests `test/bgimages.test.ts` (touching rule, file round trip, untrusted lists). 236/236.

## Lane P: final polish, FINAL.md items 1-6 (2026-10-14; branch `final-fixes`, port 5473; Nathan approved via the coordinator; pushed to main)
- **1 Status line** (`style.css .status`): `#status` is now a toast fixed to the panel's bottom (desktop: 14 px in, 322 wide;
  phone: full width 64 px up, above the sticky Add row), so "at most 500 animals" / "already in the stocking list" show
  wherever the panel is scrolled. Same element, same `status()` in panels.ts; a bad message gets a 4 px red left edge.
- **2 Split tab vs Redo** (panels.ts `onDrawn`): the tab's clearance from the view tools is measured for every view
  (`offsetLeft + offsetWidth + 8 - vp.x`), not only the one at x = 0, so on a 375 phone the B tab drops below Redo too.
- **3 Touch targets** (`style.css`, `(pointer: coarse)` only): checkbox labels in #side 40 px tall (the label is the
  target), sliders 40, colour inputs 44x40, section summaries 40, other summaries and #aqLink padded. Phone sweep with
  every section open: 0 controls under 38 px (was ~41). Desktop unchanged.
- **4 Custom terrain tick** (panels.ts terOn): `viewer.terrainEdit.on` is set before the edit, then `sync()`, so the
  button reads "Done editing" and the eye map steps aside at once.
- **5 Water lower-then-raise** (`scene/water.ts setWaterLevel`): fits the fish itself and remembers, per fish id, where
  a lower level pushed it from (share of the water height, x, depth). Raising again starts from there, while the fish
  is still exactly where the push left it (a drag in between wins). Test in `test/scene.test.ts`; the old
  "proportional" test now compares against scale + keepInWater.
- **6 Start from after salt -> fresh** (panels.ts setSalt): going fresh with the reef starter sets `layout.id = 'none'`
  ("Bare tank"); the pieces stay.
- Before/after pairs: `shots/final/P1..P4_*_pair.png` (main checkout, gitignored).

## Lane S: anatomy audit P1, fish fins (2026-10-14; branch `fish-fins`, port 5503; DONE: batches 1-3 approved and pushed; batch 4 is lane S2's)
Owns `src/art/fishgen.ts`, `src/art/paint.ts`, `src/render/fish3d.ts`. Hook elsewhere: `src/art/placeholder.ts` asks
`fishgen.finRooted(p, top, u)` where fins are rooted (the 3D card's body cut-out keeps the rim there), 3 lines.
- **Cause of the "rear paddles":** the old `FinSpec` outline put a flat top at a fixed height above the fin's MIDPOINT;
  over a domed back the body hid everything but the rear lobe.
- **New `MedianFin`** (a plan's `dorsal` / `anal` is either the old `FinSpec` or this; `isMedian` = has `at`): base from
  `at` (front, u) running `len` back; every height measured from the body contour under it. `spines` (front share),
  `nSp`, `spineH` [front, rear] (first spine drawn at 0.6), `notch`; soft part to `h`, peak `rake` of the way back;
  `tip` round | point, `trail` (rear tip behind the base end), `drop`, `fringe` (ragged free ray tips). Rays drawn base
  to tip (`paint.fin` `segs`), spines thicker. Also new: `dorsal2` (second dorsal), `gono` (gonopodium replaces the
  anal), `pelvic.ext` / `pelvic.w`, `pec` {s, v, u}, `tail.cut` (lyre fork depth). Unconverted fish are unchanged
  (fingerprints identical).
- **Batch 1 (Nathan approved, v2 at build 330):** gbr / gbr~f, bolivianram (shallow lyre `cut` 0.42), dwarfgourami(~f),
  honeygourami(~f), gourami(~f) (male fringed anal, long trailing dorsal); gourami mouths upturned (`mouth` -0.045).
- **Batch 2 (Nathan approved, v2 at build 334):** kribensis(~f) (male longer, pointed dorsal/anal), angel (long bases,
  spines stepping up the leading edge, high trailing tips), discus (fins round the disc), oscar (long spiny dorsal,
  pectorals x1.6, mouth line), bristlenose (one-spine dorsal sail, pectorals x2.1 low, pelvics w 1.4, flatter head).
  New generic: `Plan.gape` = a 3D mouth line (fish3d `gapeMeshes`; the body texture has no mouth), off by default.
  Open: the oscar's jaw/cheek bulk would need head geometry the shared loft does not have (not built).
- **Batch 3 (Nathan approved, v2 at build 348):** firefish (raked first-dorsal pennant via `lead`/`drop`, long low
  `dorsal2`, matching anal), banggai (spiny first dorsal, swept `dorsal2` and anal, big pelvics), watchman (two dorsals,
  eyes raised `up` 0.55, `gape`, pectorals x1.6), yellowtang (`rostrum`: projecting snout; eye set back `u` 0.8; long
  dorsal/anal), coralbeauty (long spiny dorsal/anal, `gape`). New generic, all off by default: `Plan.rostrum` {len, h}
  in `profile()`, `MedianFin.lead`. Fix: `rake` 1 divided by zero (now capped at 0.999).
- **For lane S2 (on main, no model changes):** `tail.sword` (`f3706dc`; long tapering sword from u = sword to the tip),
  `eye.bulge` (`f3706dc`; rounder 3D eye domes, set in less deep), `Plan.gapeDrop` (`332e863`; mouth line curve,
  default 0.02).
- **Pruned (lane M's leftovers):** `shrimpMarksCanvas`, `Plan.glass` and fish3d's glass branch (`see`, the marks
  overlay, the outline skip). Shrimp build in `shrimp3d.ts` with their own glass; every look still matches its record.
- **P2 fish rows the new parameters make cheap** (`reference/model-anatomy-audit-v1.md` P2; for a later lane, PLANS only):
  - Cheap, fins only (`MedianFin` at / len / h / spines / trail, `pec`, `pelvic` ext / w): ember (low dorsal, short anal
    base), rummynose (small dorsal), danio (dorsal rearward: `at`; upturned mouth: `mouth`, `gape` + `gapeDrop`), cherry
    barb (dorsal height; slimmer male = `depth`), tiger barb (bigger triangular dorsal, paired fins `pelvic.w`), platy and
    molly (ray-supported dorsal sail, rounder caudal; male `gono` if a male look is wanted), oto (triangular dorsal with
    one spine like the bristlenose; caudal fork via lyre `cut`), clown loach (fin area, `pec.s`), SAE (dorsal; mouth
    `gape`), bronze / panda cory (broad low pectorals `pec` {s, v}; triangular dorsal on one spine; scutes already
    `plates`), and the marine four, which take the cichlid recipe of batches 1-2: ocellaris (long continuous spiny/soft
    dorsal, `pec.s`, `gape`), royal gramma (long dorsal base, oblique jaw `gape`), sixline (continuous dorsal), chromis
    (dorsal origin forward, `gape`; fork curvature via lyre `cut`).
  - Partly cheap (fins yes, the rest is profile tuning with existing fields): neon, cardinal (outline / peduncle), chili
    (shorter snout), cpd (short snout, moderate fork via lyre `cut`).
  - Not cheap: goldfish (paired double caudal seen from above needs a 3D tail structure, not a card), kuhli (fine
    cylindrical barbels / blunt loach head: barbel and head geometry), harlequin (body rhomboid is `angular`, the patch is
    a marking; no new parameter helps).
- Open: the oscar's jaw / cheek bulk would need head geometry the shared loft has not got (not built; ask Nathan before
  a new head template).
- Batch 4 (hatchet, swordtail, guppy, betta, pea puffer) is lane S2's (`../Glass-Box-fish-fins-b4`): PLANS entries only;
  new generic parameters come from lane S.
- Before/after composites: worktree `shots/laneS/b*-*.jpg` (gitignored).

## Lane R: anatomy audit P2, axolotl + zebra nerite (2026-10-14; branch `p2-small`, port 5493; Nathan approved both sheets; pushed to main)
Owns `src/art/herps.ts`, `src/render/herp3d.ts`, `src/art/snails.ts`, `src/render/snail3d.ts`. Models v3 at build 317; no
other model's fingerprint changed (other snails, hermit crab, frogs, newt identical).
- **Axolotl:** gills = three rami a side (bases stacked down the neck, tips spread out as a crown), each feathered by ~52
  fine curved filaments (seeded lengths, longest mid-stalk, swept to the tip and drooping) instead of comb teeth
  (`gillGeometry`). Trunk: broad flat head, neck pinch, fuller wider trunk, belly sagging to the vent, 12 faint costal
  grooves (`line` marks). Fin: one membrane (`axoFin` in herps.ts, shared by the 2D card) from the shoulders, low along
  the back, deepening over the tail, round a pointed tip past the muscle (body tip now u 0.03) and forward to the vent;
  `finGeometry` takes a spline edge and runs past the body's tip.
- **Zebra nerite:** level aperture (`open` [0.05,-1,0]) with a thin lip (0.03), so the shell sits low over the foot;
  foot 0.13 high (`footH`) and as wide as the shell (`footW` 0.76, Nathan: "their bodies are the same width as the
  shells"), head radius fixed (`head` 0.085), tentacles 0.085. New Shell3D fields, nerite only: `ph` 48 (smoother rim),
  `seam: false` (the painted suture ran along the body whorl as a false crease), `fillCut` (rows where the aperture plane
  misses the whorl take their cut from their neighbours instead of clamping to +-0.6, and the paint follows the coil
  angle). Zebra stripes are one full sine round the whorl, drawn past the texture edges (the slanted stroke ends had
  notched the stripes along the wrap line).
- Mystery, turbo and trumpet also clamp their aperture cut, but their real crossings are smooth (0.6..1.95 rad past T),
  so the clamp gives a flat plateau, not the nerite's alternating jumps (ramshorn and hermit never clamp). `fillCut`
  tried on all three 2026-10-14: mystery no visible change, turbo a hairline, trumpet a cleaner rim with its paint
  sliding along the coil. **Nathan: don't ship it for any of the three; closed.** Compare sheets headless to headless
  only (`npm run sheets` output differs from the recorded browser sheets for every look). 2D side cards unchanged
  except the axolotl's fin outline.

## Lane N: shareable scene links (2026-10-14; branch `share-url`; review item R12; pushed to main)

- **What**: File toolbar button **Copy share link** (`index.html`, handler in `ui/panels.ts`). The link is the page
  address + `#tank=<base64url of the deflated scene JSON>`: the same scene as Save / Download (after validate), packed by
  the browser's `CompressionStream('deflate')`, no dependency, no server, the hash never reaches a server. The single-file
  build (`file://`) links to `https://tanklook.com/` instead of its own path.
- **Opening**: `src/main.ts` checks `location.hash` at start (and on `hashchange`, a link pasted into an open tab), drops
  the hash from the address bar (so a reload keeps the visitor's edits) and calls `ui.openShared`: `readShare` ->
  `parseScene` -> `store.replace` (one undo step back), `setLibId(null)` (a new unsaved tank, not added to Saved), the
  start menu is not shown. A broken link gets a clean status error ("damaged (cut short or mistyped)" etc.) and the
  tank on screen stays.
- **Copy**: `navigator.clipboard.write` with a `ClipboardItem` whose text is a promise (started inside the click, so
  Safari allows it while the link is compressed), then `writeText`, then `execCommand('copy')`, then a `prompt()` with
  the link. Status gives the length; over 2,000 characters (`LONG_LINK`) it warns that some apps (Discord, texts) cut
  it and suggests tinyurl.com or Download.
- **Link lengths** (the six examples): betta 1,284, terrarium 1,661, reef 3,631, paludarium 5,428, planted 6,171, iwagumi
  11,080 characters. Measured alternatives: rounding numbers to 0.01 cuts ~30 % (iwagumi 7.4k), not enough to matter.
  **Nathan 2026-10-14**: ship as is; long links go through a public shortener by hand. Built-in short links would mean
  storing the tank on our Cloudflare worker (KV), a separate lane if it is ever wanted; a third-party shortener API
  can't be called from the static page (account token would be public, CORS).
- Files: new `src/scene/share.ts` (`shareHash`, `shareUrl`, `readShare`, `isShareHash`; 5 MB inflate cap) +
  `test/share.test.ts` (round trip: every example + default, identical JSON and the same link again; 12 malformed links
  each a SceneError). Hooks: `src/main.ts` (start), `ui/panels.ts` (button handler, `copyText`, `openShared`, returned
  from attachPanels), one toolbar button in `index.html` (it wraps to its own row under New / Open / Save / Download).
- Not checked: the clipboard itself (the app's browser pane denies it; the prompt fallback ran) and the single-file build
  run from disk (the pane shows file:// as a static snapshot); the bundle holds the share code.

## Lane O: anatomy audit P1, non-fish animals (2026-10-14; branch `herps-p1`, port 5463; Nathan approved all five sheets; pushed to main)
Owns `src/art/herps.ts`, `src/render/herp3d.ts` (lane L's snail files not touched). Models v3 at build 297.
- **Hermit crab:** the shell slides sideways (herp3d: by the mean of `shellMesh`'s `userData.lip` z) so its off-axis
  aperture is on the crab's midline, and forward (`HERMIT_SHELL.at` 0.33 -> 0.43, size 0.56 / tall 0.5) so it sits just
  behind the legs; the body outline runs back into the shell. Claws: `Limb3D.claw` = palm (flattened ellipsoid) + fixed
  and hinged fingers meeting at the tips (`clawGeometry`). Legs: `Limb3D.seg` = 4 joints, each segment swelling between
  narrow joints, the joints ringed in the given colour (orange-gold). The 2D card draws the palm as a fat last joint.
- **Frogs:** `Limb3D.blunt` = jointed toes (knuckle, round tip) on all three frogs; toe discs (`pads`) on the dart frog
  (0.012) and tree frog (0.017). `FrogSpec.torso` / `wid` / `rump` let a species own its outline: tree frog = neck waist
  behind a broad head; toad = short broad body, the hip forward (`rump` 0.1). Toad: `Limb3D.web` (webbing out to 0.9 of
  the hind toes, both faces, `webGeometry`) and `Herp3D.warts` (raised bumps displaced out of the body loft, which goes
  to 200 x 120 for it; lit crowns / shaded feet baked into the vertex colours since the body is unlit).
- **Newt:** `SalSpec.swimTail` = own side outline (rounded snout, a tail holding the trunk's depth to a short point),
  broader trunk and rounded head in `wid`, blunt toes. The axolotl is unchanged.
- Before/after sheets: `shots/herps-p1/` (lane worktree only, not committed). Open: nothing left from the audit's P1
  rows for these five.

## Lane Q: AR view, WebXR (2026-10-14; branch `ar-view`, port 5483; DONE, phone-tested; Nathan's idea: the tank at real size in his room)
- Built: `src/render/ar.ts` + `test/ar.test.ts`. An "◱ AR" button in the view toolbar, shown only when
  `navigator.xr.isSessionSupported('immersive-ar')` is true (desktop and iOS never see it). Session: `immersive-ar`,
  `hit-test` required, `dom-overlay` optional (Close, hint line, Size check L × D × H + stand, fps readout top-left).
- True size without rescaling the scene: the shaders (lighting, water tint) work in world mm, so the scene stays in mm
  and the XR camera hangs from a rig (`rigMatrix`) mapping room metres to tank mm (three's WebXRManager premultiplies
  the camera parent's matrixWorld). Near / far are in m (view space is the room's).
- Placement: reticle on level hits only (normal within 20° of up), tap places (front turned toward the phone), tap again
  moves, one-finger drag turns (half a turn per screen width). No pinch-scale.
- Scene prep (`prepScene` / `restore`, callable from `window.__gb.ar` on the dev server): hides the room floor, wall, scale
  person, terrain dots; frosted film becomes a plain translucent sheet (no transmission pass in XR); a blurred dark quad
  under the base as the contact shadow; water tint x0.6 (`AR_WATER`). Stand and fixture stay. Desktop check: restore is
  pixel-identical to before, twice; button hidden on desktop; mock support shows it; fits at 375 px.
- The app's animals have no swim animation (render-on-demand, static poses). AR adds an idle sway only (3 mm bob, ±4° yaw)
  for the swimming animals, restored on exit. Real swimming would be its own lane.
- viewer.ts hook: the loop is now `renderer.setAnimationLoop`; `viewer.xrFrame` set = the AR session draws each XR frame
  and render-on-demand pauses.
- A / B swap (Nathan 2026-10-14, after the phone test): in split view a "Show tank B" button at the top of the AR overlay
  swaps to the other tank on the same floor spot, turned the same way; the Size check line names the tank. Desktop: swap
  A -> B -> A restores pixel-identical. Nathan checked it on the S24+ ("it works now", after a cached page); the button then
  moved to the lower right, above the Size check line, under the thumb (52 px tall).
- DONE: Nathan tested on the S24+ (2026-10-14): "it works flawlessly". Minor leftover: the selection outline shows in AR
  if a fish was selected. If a big tank ever drops under 60 fps, lower `renderer.xr.setFramebufferScaleFactor` before the session.
- NEXT AR step (iPhone phase, not built): USDZExporter on a simplified copy of the tank (plain materials, no custom
  shaders), served as a .usdz link with `rel="ar"` for AR Quick Look.

## Final check before showing (2026-10-14; main `fe28ad3`; no src/ edits)
- `shots/final/FINAL.md` (main checkout only, gitignored): audit 53 = **46 fixed, 7 partly, 0 not fixed, 0 regressed**; 0 console
  errors; no horizontal scroll at 375 px. Edits take 2 frames (33 ms) on the real GPU on every example; moving a Reef live rock
  59-66 ms (patches 4 parts).
- Open items, most severe first: (1) S2 `#status` sits at the top of the scrolling panel, so messages (500 cap #36, repeat Add)
  are never seen from Animals; (2) S2 #7 phone split B tab still overlaps Redo by 11 px; (3) S3 #33 sliders / checkboxes / colour
  inputs / summaries under 40 px on touch; (4) S3 #43 Custom terrain tick leaves "Edit points" and the eye map stale until the next
  sync; (5) S3 fish heights do not come back after lowering then raising the level (scene/water.ts); (6) S3 Start from keeps
  "reef" after switching back to fresh. #1-4 + 6 are UI (lane G's old files), #5 scene.
- Method: three Sonnet agents with the CDP driver (fresh profile per run), plus GPU timing (`--use-angle=d3d11` instead of
  SwiftShader: headless Chrome then reports the Intel Arc).

## Lane I: reef polish + example refresh (2026-10-14; branch `reef-polish`; Nathan approved rock C and reef option B; pushed to main)

- **Reef starter set**: new `LayoutId` `'reef'` (`scene/types.ts`, `LAYOUT_IDS` in `scene/validate.ts`, no version bump),
  "Reef" in Aquascape > Start from. `starterItems`: live rock islands (two in the designed set, a channel between; Shuffle
  = the usual `starterStyle` foci / density / scale, plus a coral mix: mixed, SPS, soft, plates), one or more rocks stacked
  on each island until the main one stands about half the water deep (Nathan, option B; a smaller island 85 %), branching
  and plate corals up on the rock, mushrooms and leathers low and on the sand, rubble pieces. A long tank gets wider islands
  of more rocks, not bigger rocks. Corals are shrunk to the headroom under the water line.
- **Salt only**: ONE-LINE HOOK in lane G's `src/ui/panels.ts` render(): the existing `#lib [data-salt]` toggle now also
  takes `#layout option[value="reef"]`. A tank switched back to fresh keeps its items.
- **Live rock** (`render/coral3d.ts` `rockGeo`): angular and porous instead of rounded lumps. Per lump 5-8 planes shave it
  flat (broken faces with sharp edges), 26-40 round pits (5 big) pushed in and darkened, plus the old channels; icosphere
  detail 4, not indexed, normals by `toCreasedNormals` at 55° (`ROCK_CREASE`): Nathan saw A (every triangle flat: "too
  geometric, triangles too large"), B (35°) and C (55°) and chose C. The mushroom coral's small rock uses the same code
  (its parts now merge non-indexed).
- **Examples** (`src/examples/*`), Nathan 2026-10-14 "spruce up the starter tanks with stands, use more shapes": every one
  on a stand; planted (rect 40 breeder, black cabinet), iwagumi (rimless rect, white cabinet), betta (bowl on its round
  table, unchanged), paludarium (24 in cylinder x 24 in, rimless, round cabinet, swamp starter seed 5 re-laid with half the
  plants, 3 spot lights `fit`), terrarium (90° corner pie, 18 in radius, oak corner cabinet), reef (**72 gal bowfront
  48 x 18 x 22 in, 12 in ends, rimmed**: 73.4 gal gross in the app; sources: Sea Clear / Tsunami 72 bow 48x18x20, owner
  report 48x18x22 with 12 in ends; the first try, 48x18x24 with 14 in ends, is an 80 gal size). The reef now uses the
  Reef starter set (seed 1) and lane E's animals. Hints in `index.ts` updated. Thumbnails re-shot after merging main
  (lane A sway / per-plant variation / glass clip, lane K lights, G2 #29 tank-only framing) at 400 x 343; every example's
  camera zoom is 0.8, so the tank fills the picture and its stand still shows (at 1 the stand runs off the bottom).
- **Audit #42** (plant leaves through the glass): lane A's `82090a8` on main fixes it (3D plants glass-clipped, bowls too);
  my own version was dropped. Measured for the record: 3D leaves reach 1.9x the card half-width (sword, fern), 1.4x anubias,
  3.3x vallisneria, so clamping the anchor on the real reach would have emptied the glass edges.
- Tests: `reef.test.ts` (Reef set: deterministic, rock + corals, salt-only pieces, corals on the rock and under the top,
  new seed = new set), `examples.test.ts` (each example's shape, a stand, every piece / non-glass animal inside the glass).
- Scratch helpers (worktree `shots/`, not in git): `restage.js` (the example reshape steps), `rethumb.js`, `caprock.js`,
  `cap42.js`; pictures `i1`-`i10`.
- Watch items: the betta bowl's carpet sits low and barely shows from the front (lane A's carpet height); paludarium frogs
  are small in its thumbnail.

## Lanes L + M: anatomy audit P0 fixes (2026-10-14; opened, run in parallel)
From `reference/model-anatomy-audit-v1.md` (see "Model review sheet" below). Nathan picked P0 first, two parallel
chats; fin layout (most of P1) and frogs/newt are later lanes.
- **Lane L: snail shells** (`../Glass-Box-snails`, branch `snail-shells`, launch config `snails`, port 5423). Owns
  `src/art/snails.ts`, `src/render/snail3d.ts` (carved out of J2's `src/render/*`). Goal: one shell builder that makes
  a closed, continuous coil with a real aperture the body comes out of (no open sector, no shell floating over a slab
  foot), then per-kind shape: mystery (globose, raised spire), ramshorn (flat closed tubular coil), turbo (rounded
  body whorl), trumpet (one continuous high cone, convex whorls), nerite (low spire, smaller foot, head at the
  aperture). The hermit crab's shell comes from `shellMesh` here, so it gets the fix; its body (herps.ts / herp3d.ts) is
  NOT lane L's.
  **DONE 2026-10-14 (Nathan approved the before/after sheets "new shells look good"; build 288, pushed to main).**
  `rawShell` in snail3d.ts: the whorls now touch (each kind's `ap` widened until they do; `sutures()` finds where they
  meet, at the same angle on every turn, and the texture draws a dark seam there). The aperture is cut on a plane turned
  `incl` degrees toward the shell base (new Shell3D field, default 0), its last 5 % flares into a lip (`lip`, default
  0.12), and a dark recessed cavity closes it. A snail's shell sits with its lower lip in the foot's back, and a skin
  "plug" fills the aperture down into the foot (child of the shell mesh, so `sagShell` turns it too). New: a head over
  the front of the foot carrying the tentacles; `footEnd` / `footW` per kind (nerite: shorter foot); tentacles get
  vertex colours (they rendered black before). Per kind: mystery globose with a raised spire, turbo a higher spire,
  ramshorn an upright flat coil opening at the bottom-front (axis [0,0,-1] = the handedness that puts it there), trumpet
  `ap` [0.45, 1.5] for one continuous cone, nerite `ap` 0.95 (at 0.8 its whorls did not touch). Hermit: same
  `HERMIT_SHELL`, gets the closed coil, lip and cavity; its abdomen still sits outside the aperture (`at` in herps.ts:
  hermit-body lane). Open: the 2D side cards (art/snails.ts `drawSide`) are unchanged, their own drawings. Gotcha: the
  dev server reads the build number when it starts, so restart it after merging main, before pressing Record.
- **Lane M: shrimp body** (`../Glass-Box-shrimp`, branch `shrimp-body`, launch config `shrimp`, port 5433). Owns a new
  `src/render/shrimp3d.ts` (and a new art file if it needs one) plus the shrimp parts of `src/art/fishgen.ts`; in
  `src/render/fish3d.ts` only the few lines that hand shrimp to the new builder (ask the coordinator before more: J2
  owns render/*). Goal: cephalothorax + articulated, bent abdomen (stepped segments in the geometry, not drawn lines),
  stalked eyes, rostrum, 5 pairs of jointed walking legs separate from smaller swimmerets, and a flat horizontal
  telson + uropod tail fan (no vertical fish tail). Then per species: cherry (Neocaridina), amano (glass body + its
  markings), cleaner (Lysmata, long white antennae, abdominal bend). Hermit body is a later lane.
  **DONE 2026-10-14 (Nathan approved the before/after sheets; v2 at build 284, pushed to main).** `src/render/shrimp3d.ts`
  builds the whole animal; `src/art/shrimps.ts` holds the per-species data (rostrum, hump, depth, leg spread, antenna
  length, glass) and paint. Skin uv = (along the spine, dorsal midline .. keel), so the cleaner's back stripe holds from
  above. fish3d.ts: `fishBody` hands shrimp to `shrimpBody` (2 lines). fishgen: `drawShrimp` paints nothing on the 3D
  card (no vertical tail anywhere in 3D); the 2D card is unchanged; the shrimp `Plan` now only marks has3D. Amano's
  marks are an overlay on the same body geometry (as before). The shrimp ignore `bend`/`cling` (no sideways bend, no
  glass pose). Open: the hermit body (later lane); `shrimpMarksCanvas` and fish3d's `p.glass` branch are now unused by
  shrimp (left for J2 to prune).
- Both: the audit's "keep" list and constraints bind. Look at the result on `/review.html` on the lane's own dev
  server; when done press Record there (writes `src/data/model-versions.json` + the changed `public/model-sheets/`),
  after merging main in, then check the stamped build = `git rev-list --count HEAD` + 1 before the last commit.
  `npm run sheets` rewrites all sheets headlessly if needed. Tests + typecheck green, push to main, report to the
  coordinator, preview_stop the dev server. Questions to Nathan come with pictures (sheet crops).

## Lane J2: performance leftovers (2026-10-14; branch `perf`, port 5373; pushed to main)
- **Frosted background (render/viewer.ts `frostCull`):** the frosted film is three's transmission material, and three
  draws every opaque mesh a second time (4x MSAA, half float, viewport size) into the picture the film blurs. On the
  iwagumi example (the only example with Frosted white) that pass was half the frame. Meshes inside the tank are now
  left out of it unless the eye is outside one of the film's faces (from behind, or a film all round), via a per-frame
  onBeforeRender hook that sets drawRange.count = -1 in off-screen passes only. Visible change, approved by Nathan
  (2026-10-14, "frost change is fine"): plants and fish no longer cast a faint blurred shadow on the film
  (`shots/j2_frost_before_after.png`, `j2_frost_zoom.png` in the perf worktree). Iwagumi GPU **43 -> 26 ms** at
  1050x850 (timer queries, alternating frames); the film's pass itself still costs ~5-8 ms (see Open).
- **Light output fields (render/build.ts envKey):** watts, tech, par, mapUnit only feed uniforms, so they no longer force a
  full rebuild (iwagumi Power step 243 -> 158 ms; build 'same'). The ~100 ms left is `lightOut` in scene/lightout.ts
  re-running for each new wattage (lane K2's file). test/incremental.test.ts pins it; incrementalCheck has a "light power" edit.
- **Panel sync() (ui/panels.ts):** the store listener refreshes only the groups whose inputs changed (setup minus fish /
  items / camera; species list; item kinds; camera; the selected item minus its position). Direct `sync()` calls from
  the panel's own handlers stay full (they put back refused typed values). Per drag step **6-7 -> ~0.5 ms** (fish 0.9,
  item 0.6, orbit 0.3, against 0.4 / 0.4 / 0 with the panel detached).
- **Tried and dropped: plant depth pre-pass** (a depth-only copy of each plant, polygon offset 1/1, drawn first): 0 px
  differ, but measured with alternating frames it made planted **slower** (22 -> 33 ms GPU); the first sequential runs
  that looked like a 3-8 ms gain were load noise from other lanes. Lesson: on this shared machine, only A/B timings
  measured with alternating frames count.
- **Proof:** incrementalCheck.runAll 133 edits (121 incremental), 0 differ (one run had a single 1 px flicker on
  paludarium / stone turn that did not repeat in two re-runs; no new code runs on paludarium); after merging main,
  iwagumi + planted + split 57 edits, 0 differ.
- **Open:** (1) the film's own transmission pass (~5-8 ms on iwagumi) can only go if the frost is drawn by our own shader
  at lower resolution, which means changing the frost hook in render/lighting.ts (K2's file). (2) `lightOut` ~100 ms
  per new wattage (K2). (3) Steady draw on non-frost big tanks is ~18-22 ms GPU at 1050x850, mostly the lit plant shader
  (~7 ms on iwagumi); no change from J2's side found that helps.
- Files touched: render/viewer.ts (frostCull + helpers), render/build.ts (envKey), render/incrementalCheck.ts (one
  edit), ui/panels.ts (sync guard + listener), test/incremental.test.ts.

## Lane K2: light output follow-ups (2026-10-14; branch `light-output`, port 5383)
- Owns scene/lightout.ts, test/lightout.test.ts, ui/lightHover.ts, reference/par-calibration-data.md, render/lighting.ts
  (carved out from J2), the Lighting rows in index.html / ui/panels.ts.
- Task 1 (pushed): tap-to-read on phones in `ui/lightHover.ts`. A touch tap (down/up within 8 px, one finger) on the
  substrate with the Light map on and the power set shows the hover readout, centred 56 px above the finger and
  clamped to the screen (below the finger if there is no room above). It stays until the next tap, a drag, a second
  finger, or a change to any tank's light; tapping off the substrate hides it. Listens on the viewer host next to
  interact/pointer.ts (unchanged). Test note: the app's browser pane suspends requestAnimationFrame while it is not
  being painted, so synthetic taps only show the tip once a screenshot forces a frame.
- Task 2: lamp calibration. The plain web fetch was blocked on reefs.com, but the app's browser pane got through: Joshi's
  lab tests (grade A) are in reference/par-calibration-data.md D12a / D12b. Nathan: split metal halide by bulb colour
  (new tech 'mh-20k', one word added to LightTech in scene/types.ts); test against the lab data, with the forum sets
  logged only. mh 10-14K ppe 0.83, 20K 0.47, eta 0.77 from four pendant reflectors (cos^m beam fits each within ±10%
  at 50-100°). CFL eta and all halogen values: still ESTIMATES (no PAR data anywhere; the MSU Lamp PPF sheet has no
  rows for them). Forum MH readings run 2-3x below the lab-based model.
- Task 3: soft beam in the normal render (Nathan approved from before/after pictures). aqLight, lightSum, the relative
  Light map and the beam overlay use cos^m (beamExp; uniform uBeamM replaces uConeIn/uConeOut); a spot's gain is
  (m + 1) / (m52 + 1) (`beamGain`). uNorm still normalises to the standard fixture: planted view -2.5% (spots) /
  +1.4% (LED); bare sand under spots -10% (light now falls past the old cone edge). CONES / spotCone / beam() removed
  from scene/lightout.ts; test/scene.test.ts "raised fixture" passes beamExp instead of CONES.spot.
- J2 leftover (a), done: lightOutCached / lightEnvCached hold one run at 1 W (no PAR override), keyed without the
  fields the model ignores (Exposure, kelvin, room, map unit), and scale by the watts; setLightUniforms uses the
  cached env. A Power step: model 20-35 ms -> 0 ms, the whole edit ~9 ms. Not done (offered, not asked for): (b) frost
  transmission pass -> own low-res shader (5-8 ms), (c) the lit plant shader on big tanks (18-22 ms GPU).

## Lane J: edit performance, audit #52-53 (2026-10-14; branch `perf`, port 5373; pushed to main)
- **What changed:** an edit no longer rebuilds the whole scene. `render/build.ts`: each fish and item is a *part* keyed
  by its own data + selection (+ the solid pieces' data for an animal on the hardscape); `patchTank` keeps the parts whose
  key is unchanged and rebuilds the rest. `envKey` = everything else the meshes depend on (minus camera, kelvin /
  brightness / room light, fish stand out, and the colours `patchLook` sets in place: water colour + opacity while it
  stays above 0, wall colour, custom substrate colours / share / mix). `render/viewer.ts` `build()`: per view; an
  unchanged envKey patches, any other change is today's full rebuild (the fallback; `viewer.incremental = false` forces
  it, `viewer.lastBuild` says what the last build did). An edit in B no longer rebuilds A. Undo / redo of a move patch
  too (the diff is by data, not by event).
- **Draw order (needed for pixel identity):** three.js sorts opaque objects by material id, i.e. by when each material
  was created, so a patched scene drew some ties in another order than a full rebuild (2-144 px off, only on the first
  edit after a tank's first build, depending on cache history). The viewer now ranks materials by first appearance in
  the scene instead (`setOpaqueSort`, same grouping, no measurable cost), and a patched scene keeps a full build's child
  order (`contentAt`). Side effect: full rebuilds are now also history-independent.
- **Proof:** `src/render/incrementalCheck.ts` (dev only, not imported by the app; run from the console, see its header):
  18 edits (fish move / turn / resize / raise / select / delete / duplicate, stone move / turn / resize, plant move,
  item select, undo, redo, water colour, wall colour, substrate colours, fish stand out) on all six examples + a split
  view, comparing the incremental frame with a full rebuild pixel by pixel: 126 edits, 114 incremental, **0 pixels
  differ**, on a fresh page and again warm, and again after merging lanes K and A's latest (a full rebuild's own redraw
  differed by a few pixels on 2 edits there; the check accepts either full-rebuild frame). `test/incremental.test.ts` pins which fields envKey / lookKey see.
- **Timings** (planted, 40 fish / 56 items; interleaved A/B in one session, median; this machine was 2-3x slower than at
  the baseline because of other lanes, so read the ratios): fish move 167-175 -> 43-59 ms, item move 157-241 -> 32-50,
  select 139-175 -> 33-38, water colour 183 -> 49-61, fish stand out 188-209 -> 47-49; iwagumi (174 items) fish / item
  move 224-290 -> 63-68; split, edit in B 234-334 -> 44-52. Baseline at quiet load: ~65 ms per edit, steady draw 15-18
  ms. What is left per edit is the steady draw itself (15-50 ms, the floor) plus ~5-7 ms of the panel's `sync()`
  (ui/panels.ts store listener, not lane J's file).
- **Still full rebuilds:** water level, tank size / shape, stand, lid, lights' layout / height, substrate type / depth /
  grain, terrain, background, beams, Split itself, opening a file; and the first draw after one stays ~35 ms above a
  steady draw (new materials + buffers).
- **Open (not done):** (1) the panel `sync()` on every drag step (~5-7 ms, ui/panels.ts); (2) the steady draw on big
  tanks (iwagumi 45-50 ms: 174 items); (3) items.ts `plants` cache key rounds the height (`Math.round(h)`) but builds with
  the exact one, so plants of the same type and seed within 0.5 mm share whichever height came first (lane I's file).
- Files touched: render/build.ts, render/viewer.ts (build() and the opaque sort only; framing untouched), new
  render/incrementalCheck.ts, test/incremental.test.ts. lighting.ts, items.ts, coral3d.ts, camera.ts and store.ts unchanged.

## Lane A2: plant library (2026-10-14; branch `plants3d`, port 5283; crypt + 9 species + Spread / Stems pushed to main)

Grows the 3D plant library on the lane A generator: new species are data (`PLANT3D` in `art/plants.ts`) plus a
`LIBRARY` entry in `scene/items.ts`, a `PlantType` / `PLANT_ASPECT` entry and a card drawing (`drawPlantCard`; the
card stays the fallback and the picking size). `scene/validate.ts` accepts any `LIBRARY` variant, so no version bump.
- Crypt (`crypt`, "Cryptocoryne", C. wendtii; default 110 mm, 30..300): rosette, 12-18 stalked lance leaves with
  rippled edges, olive-green to bronze on top, reddish-brown underneath, 1-3 crowns per clump, sway 0.15. Nathan
  (2026-10-14) tried stiffer, blunter tips (less arch / wave / twist) and preferred the original: keep these values.
  Sheets: `shots/107_row_crypt_sheet.png` (card vs 3D, 10 seeds), `110_crypt_tips_sheet.png` (the rejected stiffening),
  `108_library_sheet.png` (one of each species).
- Cache key fix (lane J, 2026-10-14): the plant geometry key in `render/items.ts` rounded the height but built with the
  exact one (two near-equal plants shared the first one's mesh); the carpet key rounded x / depth the same way. Both
  now key on the exact values. `incrementalCheck.runAll`: 126 edits, 0 differ; crypt move / resize / turn / add /
  undo and a 0.4 mm carpet nudge: 0 px.
- `shots/cap.js` (scratch): imports the app's own plant3d module (after a hot reload it is `plant3d.ts?t=...`), nudges
  every item's x by 1e-4 mm so an on/off toggle really rebuilds, and `wide: true` frames a row. `shots/sheet.py`
  stacks labelled pictures.
- Four more (Nathan 2026-10-14: "they all look great"), data + cards only: Bucephalandra (`buce`, 70 mm, rhizome,
  dark leaves with blue-grey / wine casts), Rotala (`rotala`, 240 mm, fine stems, pink tops), Ludwigia (`ludwigia`,
  220 mm, broad oval leaves, red top), Crypt balansae (`balansae`, 320 mm, tall puckered straps). Sheets
  `shots/111_{rotala,ludwigia}_sheet.png`, `112_{buce,balansae}_sheet.png`. The stem / anubias / carpet card
  functions take an optional palette; the old cards draw exactly as before.
- Monte Carlo: dropped (Nathan 2026-10-14: the existing carpet looks better; `shots/113_mc_sheet.png`). `isCarpet`,
  `isFloat`, `isPatch` (art/plants.ts) replace the old `variant === 'carpet'` tests (scene/items.ts, render/items.ts,
  two lines in ui/panels.ts: add-item spacing, the Width / Height label).
- Five more, shipped (Nathan 2026-10-14: "ship all five"):
  - Dwarf sagittaria (`sagittaria`, 70 mm): rosette data, 6-10 crowns of grassy leaves.
  - Echinodorus 'Ozelot' (`ozelot`, 200 mm): sword data plus `Leaf3D.spots` (soft maroon blobs in the vertex colour;
    only leaves that set it draw extra random numbers, so no approved plant changed).
  - Java moss (`moss`, 45 mm tall, ~2x as wide): new form `moss`, a ragged dome over a dark core, fronds along its
    normal; lift it onto wood / rock like anubias (a stand-alone clump, not a coat over the hardscape surface).
    About 48 k triangles for a 60 mm clump (count scales with footprint, capped at 3000 fronds).
  - Red root floaters (`redroot`) and salvinia (`salvinia`), 220 mm patches: new form `float`, rosettes lying on the
    water (y = waterY(level)), thin wandering roots below; hidden in a dry tank; size = patch width (`isPatch`).
    ~52 k / ~26 k triangles per 220 mm patch.
  Sheets: `shots/114_{sagittaria,ozelot}_sheet.png`, `116_moss_sheet.png`, `119_float_sheet.png`.
- Not in any starter set (Nathan: hold off).
- Spread + Stems (Nathan 2026-10-14: "one plant can mean 5 stems over a 12-inch circle or 10 stems in 4 inches";
  built and pushed): `Item.spread` (mm across the circle the stems / crowns start in) and `Item.stems` (count, 1..40,
  `MAX_STEMS` in scene/items.ts), both optional: absent = the species' own look from the seed, so old files and the
  starter sets are unchanged and there is no version bump. Only for `isClump` plants (form `stem`, or a rosette with
  `crowns`: stem, stemred, rotala, ludwigia, grass, sagittaria, crypt, balansae); `clampItem` drops them on anything
  else. A rosette clump keeps its leaves per crown; with its own spread the crowns fill the circle (sunflower spiral)
  and the plant is not pulled in to its card width. Edit box: two rows under Height (index.html + ui/panels.ts), hidden
  for other plants; until moved they show the seed's values with "auto" (`clumpAuto` in render/plant3d.ts). Both
  reach the plant mesh key in render/items.ts (lane J keys items on their JSON, so the patch path sees them too).
  Test `test/clump.test.ts`; incrementalCheck with spread / stems / height edits on stem, red stem, vallisneria: 0 px.
  Sheet `shots/121_clump_sheet.png` (auto vs 12" / 5 vs 4" / 10, front and above).

## Lane K: light output (2026-10-14; branch `light-output`, port 5383; DONE, all 4 steps pushed)
- Owns `render/lighting.ts` (carved out of lane J's render/*), new `scene/lightout.ts` + `test/lightout.test.ts`, the
  light fields in scene/types.ts / defaults.ts / validate.ts, the Lighting rows in index.html / ui/panels.ts,
  ui/diff.ts, ui/parGuide.ts. Lane J: the fixture geometry (emitters, beam, fitSpots, lampHeight, CONES, LAMP_Y,
  AQ_MAX) moved from render/lighting.ts into scene/lightout.ts; lighting.ts re-exports it, no other file changed.
- Step 1 (the model, `scene/lightout.ts`): photons = W x PPE x eta, beam normalised to unit flux (points: sr; tubes:
  2D round the axis x an exact finite-length factor), glass lid 0.9, surface 0.97, paraxial refraction (depth / 1.33),
  side-glass mirror images (rect tanks, weight 0.7, only where the image ray meets the glass under water), three bands
  (blue / green / red) with pure-water absorption 0.012 / 0.07 / 0.35 per m plus half the water tint (`waterK`).
  `lightOut` gives surface / mean / min / max PAR, lux at the substrate and mid-water; `readout` the panel line;
  `renderBright` = clamp(sqrt(luxMid / 8000), 0.2, 2.5) x Exposure. New optional LightSettings: watts, tech, par,
  mapUnit (validated, kept only when present).
- Calibration (tests print the residuals): AI Hydra 32 HD in air +9 / -5 / -7%; JBL Solar Natur in water +22% just
  under the surface, +2 to -20% from 10 to 70 cm, with the glass walls assumed 1.6 x 0.8 m (no walls: -37% at 70 cm);
  T5 HO (Barr) -3 / -10% at eta 0.75 once the glass is modelled (the first hand check's 0.4-0.5 left the glass out).
- Findings for Nathan: under white / planted light lux falls a little SLOWER than PAR with depth (red goes first and
  barely counts in lux); only under blue reef light does lux fall faster. LREF is 8,000 lux, not ~2,000 (typical
  setups give 6,000-12,000 mid-water). Readout range = the tech's uncertainty (LED ±30%, others ±50%) or min-max.
- Nathan 2026-10-14: yes to T5 eta 0.75, the JBL tank assumption, the lux-vs-PAR finding and LREF 8,000 ("as accurate
  as feasible").
- Step 2: Lighting rows Power (W, 0 = not set), Light type (techs for the fixture type), PAR (measured), the readout
  line; Brightness is relabelled Exposure (x0.5-2) while the power is set. The render follows it: `setLightUniforms`
  takes the setup (ONE-LINE HOOK in lane J's render/viewer.ts: `..., S.render.beams, S)`) and uses
  `lightOutCached` -> `renderBright`. ui/diff.ts: A/B lines for power, light type, measured PAR, Exposure.
- Step 3: `aqIrr` with the power set calls `aqIrrAbs`, a line-by-line port of `bandsAt` (uniforms uLoA / uLoWall /
  uLoK / uLoSplit / uLoOut, set in `setLoUniforms`); the ramp is log2(level / uMapDiv), MAP_DIV rel 1/16, PAR 2.5
  (yellow = 40, medium), lux 125. "Map shows" PAR / Lux select (light.mapUnit), legends in real units with the
  planted bands under the PAR ramp. GPU check: `irrReadback(renderer, pts, normals)` (dev, from the console via
  `await import('/src/render/lighting.ts')` and `window.__gb`) agreed with bandsAt to 0.003% at 54 lit points.
  Readout "surface" is now the brightest point just under the surface (was: above the brightest substrate point,
  which could sit by the glass where the direct beam misses the surface: read 0).
- Review (Nathan 2026-10-14: "surely the corners wouldn't get basically no light"): two fixes. (1) Beam = cos^m off
  straight down with m set so the printed beam angle is where it falls to HALF (`beamExp`; LED bar and tube cross-section
  m = 1, half at 60°), replacing the hard smoothstep cut-off in the model and the map (the ordinary render keeps its own
  cone). (2) Bounced light (`bounce`): floor light x substrate reflectance (SUB_ALBEDO; custom from its colour) spread
  over the inside surfaces, kept in by the surface (0.45) and glass (0.43), integrating-cavity style; added under water
  (everywhere when dry). 36x16x18 in, 3 spots 60°, 45 W: corner 16% -> 41% of centre, minimum 3 -> 84 µmol; bounce is
  ~7% of the mean on gravel, ~22% on white sand. LED bar and T5 corners were already 63-73% (Fluval publishes ~55%).
  Refit: T5 eta 0.65 (Barr +12 / -1%), bare T5 0.4, T8 0.45; Hydra -9..+6%, JBL -26..+14%. Shader port re-checked
  (GPU vs JS <= 0.0001%).
- Step 4: `ui/lightHover.ts` (new; two lines in main.ts attach it). With the Light map on and the power set, the
  pointer is ray-marched onto the ground (items are hidden by the map, so the ground is enough) and `bandsAt` is
  evaluated there with the ground's normal (via `lightEnvCached`, override scale included): "190 µmol PAR · 12,800 lux
  · 12.7″ deep" ("above the water" on paludarium land, "dry" in a dry tank). Mouse / pen only (touch has no hover),
  hidden while dragging, on wheel and off the substrate; one evaluation per frame; re-read on a store change.
- Open ideas (not built): a lid-condition choice (clean / condensation / dirty, ~0.9 / 0.8 / 0.65, estimates, not
  data); a tap-to-read on phones; CFL / metal halide / halogen datasets; the ordinary render still uses the old
  smoothstep cone (only the map and the numbers use cos^m).

## Model review sheet + model versions (2026-10-14, Nathan: "keep it where it can be updated with version number every time a model is updated")
- `review.html` (live at tanklook.com/review.html; second Vite page, `src/review/`): every species look (females too)
  from Side, 3/4, Front, Top, each in the preview tile's flat light and in the default tank's LED bar + water. Filter,
  "Needs work" tick + note per model (this browser only), "Copy flagged list" puts them on the clipboard as text.
- Versions: `src/data/model-versions.json` holds, per look, a fingerprint (geometry on a 1/500 grid, 24 px texture
  thumbnails at 3 bits, material colours, art/tl/aspect), `v`, and the build it shipped in. A model whose fingerprint
  no longer matches shows "changed since" (orange); "Changed only" filters to them.
- **Rule for any chat that changes a model** (art/, fish3d, snail3d, herp3d, species.json sizes): open
  `/review.html` on your dev server, wait for it to render, press "Record N changed models", commit
  `src/data/model-versions.json` and `public/model-sheets/` with the change. The button only exists on the dev server (plugin
  `scripts/model-versions-plugin.mjs`); it stamps build = current commit count + 1, i.e. the commit you are about to make.
- All 68 looks recorded as v1 at build 217 (stamped 216; another chat committed first, so check the number after pushing). Fingerprints held across reloads and at phone size in the app's browser.
- **Anatomy audit v1** (2026-10-14, ChatGPT from the model sheets; `reference/model-anatomy-audit-v1.md`): 6 P0
  (rebuild: cherry/amano/cleaner shrimp = fish tail + leg spikes; mystery/ramshorn/turbo snail = open shell sector,
  shell floats over a slab foot), 26 species P1 (fin layout: median fins drawn as short rear paddles, two-dorsal species
  merged into one, livebearer gonopodia, frog/newt limbs), 25 P2 (proportions). Spot-checked turbo + cherryshrimp
  sheets: findings hold. Its "keep" list (gourami feelers, angel streamers, barbels, axolotl 3 gill pairs, puffer
  fins) and constraints are binding for the fix lanes. Not started; Nathan to pick lane order.
- **Pre-rendered sheets for reviewers without WebGL** (2026-10-14: ChatGPT's cloud browser has WebGL disabled and saw
  nothing): `public/model-sheets/` = one labelled JPEG per look (title, sci name, id, size, version; 4 views x 2 lights,
  1710 x 556) + a static `index.html` gallery, live at tanklook.com/model-sheets/. review.html links to it and, with
  no WebGL, says so and points there. Record writes the changed models' sheets + the gallery too, so commit
  `public/model-sheets/` with the versions. `npm run sheets` rewrites every sheet headlessly (Vite + headless
  Edge/Chrome with SwiftShader, ~80 s; `scripts/export-sheets.mjs`), no dev-server slot needed. JPEG 0.9: 4.7 MB the set
  (PNG was 18 MB).

## Light output: watts -> PAR / lux (2026-10-14; draft only, no src/ edits)
- Design draft `reference/light-output-draft.md`: watts + light tech -> photons -> existing beam model in real units,
  plus refraction, side-glass reflection, water absorption in three colour bands. Light map gets a PAR / Lux switch
  (separate calculations, same ramp) and a hover tooltip with both values at that spot.
- Decided (Nathan): Brightness becomes an Exposure knob when watts is set; calibration against published PAR charts
  approved. Runs as its own lane after G and G2 finish (touches scene/, render/lighting.ts, ui/panels.ts).
- Decided (Nathan 2026-10-15): every light renders 1.8x brighter at a given lux (`EXPOSE` in renderBright); Exposure runs x1/4 to x16 on a stops slider (-2..+4) and the lux term caps at 5, so a user can wash the tank out ("looking at the sun"). LIMITS.bright 0.2-16; manual Brightness stays 0.2-2.5.
- Decided (Nathan 2026-10-15): no Power gate. Power not set (absent or 0) = the fixture's typical power for the tank (`wattsOf` falls back to powerRange's default; readout "36 W · typical", it follows the tank size until set); a fixture or screw-in lamp change goes back to typical; the slider starts at 1 W and typing 'typical' or 0 resets it. Manual Brightness is left for the flat light only.
- Calibration first pass done: data `reference/par-calibration-data.md`, results in the draft (LED ~±30%, fluorescent
  ~±50%; T5 fixture efficiency lower than guessed).
- PAR guide shipped: Lighting menu button "PAR guide" opens `src/ui/parGuide.ts` (own dialog + styles): what PAR is,
  planted tiers with what grows / struggles / CO2 / fertiliser, reef tiers with corals and dosing; opens on the reef tab
  for a salt tank. Hooks in lane G's files: one line in index.html (the button), two in main.ts.

## Lane G: audit fixes, UI share (2026-10-14; branch `audit-fixes`; batches 1 + 2 pushed to main, DONE)
- Split with lane G2 (coordinator): G owns `src/ui/*`, `index.html`, `src/style.css`; G2 owns interact/scene/render.
  G's share is 38 findings: #2, 4, 5, 7-13, 16, 17, 22-28, 30-41, 43-46, 48, the label part of 49, 50. G2's 15: #1, 3,
  6, 14, 15, 18-21, 29, 47, the export crop of 49, 51-53. Lane I: #42. One line in `src/main.ts` (start menu call).
- **Start menu (Nathan 2026-10-14: "upon start, a menu in the middle of the screen: start fresh or from an example")**:
  `#startDlg`: Start fresh, the six example cards, a gesture line. Nathan 2026-10-14 (later): shown ONLY when no tank
  was restored from this browser; a returning visitor gets "Welcome back" instead (Continue button removed). How to use no longer opens itself on the first visit.
- Batch 1 (S1 + S2, browser-checked; before/after sheets in `shots/fixes/`, gitignored): #2 the tank label wraps and
  `#view` clips; #5 each shape keeps its own L/D for the visit (Rect → Pie → Rect back to 24″); #7 a split tab with no
  room beside Undo/Redo drops below them; #8 Add row sticky on phones; #9 why Add is off, as a line under it; #10/#11
  group names carry fresh/salt, an empty group offers "Switch the tank to Saltwater/Freshwater"; #12 wrong-water rows
  marked in the stocking list with Remove there; #13 leaving Swamp restores the level it lowered (unless moved since);
  #16 lift row is "Raise"; #17 light map on a bare bottom says so, links to Substrate; #22 help says tick Edit; #23 A/B
  badge on split tabs; #24 the diff chip reads "⇄ A" (copy from A).
- Nathan's calls: #29 Stand ON by default (G2 builds it); #38 only "no stocking check for salt yet".
- Batch 2 (S3, browser-checked; sheets `shots/fixes/s3_sheet_*.png`): #25 Glass type / Finish labelled rows; #26
  "Glass outlines"; #27 "Capacity … (inside the glass, to the top)" and "gal to the water line"; #28 out-of-range sizes
  say what they were set to, inputs carry min/max; #30 cm inputs to 0.1; #31 tab title = tank name · TankLook; #32 eye
  map starts hidden on a phone (until the viewer chooses); #33 40 px touch targets under `(pointer: coarse)`; #34
  "‹ Hide"; #35 Add says "Add 6" / "Add 2", new `pair` flag in species data (ocellaris, banggai); #36 a status at the
  500 cap; #37 "Turn Water on to choose"; #38 "No stocking check for saltwater tanks yet."; #39 "Adult ±10 %"; #40
  bare bottom hides the depth sliders; #41 singular counts; #43 the map steps aside while terrain points are edited;
  #44 light map unticked with no fixture; #45 "Room light (ambient)", "Height above tank"; #46 Lighting has Look from
  above / Straight on; #48 JSON rounded to 0.01, Copy button, units note; #49 plain fish-edge labels, PNG pixel sizes
  on hover; #50 the split hint says two tanks is the most.
- Fixed in batch 2: a batch-1 comment had swallowed the line that disables the light-map box with no fixture.
- #49's PNG crop and A/B labels landed in G2's batch 2 (`f7b2cc3`); the start menu hint now says "wheel or pinch".

## Lane G2: core audit fixes (2026-10-14; branch `core-fixes`, port 5363; owns src/interact, src/scene, src/render minus lane I's files)
Plan approved by Nathan (batches in severity order). Pictures: `shots/g2/` in the main checkout (before = `shots/audit/`).
- **Batch 1 (pushed `16ecc27`):**
  - #1 water level: `nearestWater` (terrain.ts) fell back to "the deepest spot", which on a flat floor was the first
    grid corner (x = 12 mm), so every fish taller than the water piled at the left glass. Now: no spot deep enough =
    the nearest spot with 3/4 of the deepest water, or stay put if here already has that; only the height drops.
    Lowering then raising the level brings fish back (setWaterLevel scales heights). At 10 % on the default sloped
    gravel the back is above the water, so fish go forward but keep their x. Test in scene.test.ts.
  - #3 aquascape drag straight on: within `EDGE_ON_EL` (20°) of level a piece slides on an upright plane facing the eye
    (`wallPlane`, pointer.ts): x follows the pointer, depth kept, it rests on what is under it. Tilted views unchanged.
    Test pointer.test.ts; browser: 128 mm right at el 0 with depth 159 kept, grabbable again at el 2.
  - #29 the Stand is ON for new tanks (defaults.ts, Nathan's call). Files without a `stand.show` still load with it off
    (validate.ts no longer falls back to the default there).
  - #47 viewer map caption: "20° below" for negative elevations (viewmap.ts).
- **Batch 2 (pushed `f7b2cc3`):**
  - #6 touch: two fingers pinch to zoom and pan together toward the point between them (pointer.ts; `zoomAt` takes the
    midpoint's old position, viewer.ts). A second finger during a fish / piece / terrain drag is ignored; only the
    first finger's lift ends a drag; a pinch undoes the first finger's orbit. Checked with synthetic touch events.
  - #18 the water itself is tinted: `waterVolumeMaterial` (lighting.ts) on the far faces of the water volume (prism, or
    a lathe for a bowl; build.ts addWater), same slab path + `waterK` as the object tint. Fragment depth pinned to the
    far plane, so it draws only where nothing is behind (no double tint on fish, background or wall).
  - #21 re-lock copies the camera of the view moved last (`Store.lastCam`), replacing Nathan's 2026-10-08 "snaps to the
    original tank" (approved in the G2 plan). Camera moves stay out of undo (the view is not part of history).
  - #49 PNG: cropped to the tanks' boxes (tank + stand + table, 6 % margin; `exportCrop`), A / B badges on split views.
    Pixel sizes on the buttons stay with lane G.
- **Batch 3 (pushed):**
  - #14 terrain from a bare bottom: `sampleTerrain` samples as if the substrate were shown (custom terrain always shows
    one), so the grid starts at the corner depths; the ground is never drawn closer than 0.6 mm to the bottom glass.
  - #15 swamp: the store keeps a swamp layout's substrate shown (`swampGround`, store.ts), so the panel says gravel, not
    "Bare bottom"; steep ground cells (n.y < 0.6) take their grain from the side they face (no streaks on pool walls).
  - #19 raised lights: framing still never counts the fixture (Nathan 2026-10-09); instead a "▲ Light 11.8″ above the
    tank" note at the top of a view whose fixture is out of frame (`markLights`, a DOM div the viewer owns).
  - #20 from above: fixture parts and the above-rim beams carry `userData.overhead` (their height) and hide while the
    eye is above it, so no dark slab and no yellow flood over the page.
  - #51 colour temp / brightness / room light no longer rebuild the scene (`buildKey` in viewer.ts leaves them out; the
    fixture glow is recoloured in place): 4-9 ms instead of ~150-570 ms on the planted example. `rebuild()` still forces.
  - #52-53 measured, NOT fixed: on real hardware (Intel Arc) an edit is ~4 ms in the store, then ~55-70 ms rebuilding
    and ~60 ms in the first draw (new materials / buffers; a steady draw is ~8 ms): ~130-230 ms per edit or drag step
    with 40 fish + 56 items. Keeping cached item geometry alive did not help. The fix is updating meshes in place
    instead of rebuilding (fish moves first): a work unit of its own.
- **#29 framing (Nathan 2026-10-14: frame just the tank):** the lens is sized to the tank (and a hood) only, and the
  window is centred on the tank; the stand / table run off the bottom. Zooming out below 1 eases the centre toward tank +
  stand (by zoom 0.7). viewer.ts. Pictures `shots/g2/29_frame_tank_before.jpg` / `_after.jpg`.
- Dev server: `preview_start core-fixes` hit the five-servers-per-folder limit, so Vite runs from the shell on 5363.

## Lane D: first-visit audit + review pack (2026-10-14; no src/ edits)
- `shots/audit/AUDIT.md`: 53 ranked findings with cropped, marked shots (headless Chrome, fresh profile = true first
  visit, desktop + 375 px phone + 768 px tablet, on main `c67aeb7`: before lanes A / E / H merged). Both re-checked S1s
  reproduced. Fix lane G owns the fixes.
- `shots/review/REVIEW.md`: one picture page per item awaiting Nathan (R1-R12), listed under "Still open" at the bottom.
- "Still open" and "Known gaps" at the bottom rewritten to the current state.
- Tooling (scratchpad, not in the repo): a ~80-line CDP driver over Node's built-in WebSocket + system Chrome; each run
  gets its own profile, so parallel agents do not share localStorage. Worth adding to scripts/ if audits recur.

## African dwarf frog (2026-10-14; Nathan: "can we add an african dwarf frog model?"; branch `adf-frog`, port 5553)
- Species `adf` (Hymenochirus boettgeri, 35 mm, water, bottom, shoal; note warns off the 12 cm African clawed frog).
  Art: a `FROGS.adf` entry on the shared frog painter / `frog3D`: own flat torso with a long pointed snout
  (`ADF_TORSO`, `ADF_WID`), small lidless eyes on the sides of the head, olive-grey granular skin (fine warts), small dark
  spots, webbing on all four feet. New `FrogSpec` fields `web` (all feet) and `eye` (own eye position); the other three
  frogs' fingerprints did not change. Added to `fish3d.species` (3D on).
- AqAdvisor has no entry: stand-in Panda Cory (3.5 cm vs 5 cm, bottom, warm, groups), `standIn` in aqadvisor.json.
- Model v1 at build 360, sheet `public/model-sheets/adf.jpg`.
- **v2 at build 374 (Nathan: "a resting pose with the hind legs splayed out sideways, like a real ADF on the bottom"):**
  `adfLimbs()` overrides frog3D's folded legs for `HERP3D.adf` only: thighs out sideways from the hips, knees bent
  forward, the long webbed feet trailing back and out (past the tail end, u < 0); arms out to the sides, webbed hands
  spread forward. The 2D card keeps the folded side view (in 3D it is only the invisible picking target).
- **Floating "zen" pose (Nathan: "lets add the floating zen pose at the surface"):** new `Surface` value `'top'` =
  floating at the water surface (its height is the water line's; stored y ignored). Species `cling: "top"` -> surfaces
  `['floor', 'top']` (adf only). Shuffle / Add float `FLOAT_FROG` = 1/3 of them (scatter.ts; none in a dry tank), nose
  up 4-12°, the rest rest on the bottom. Pose `HERP3D_FLOAT.adf` (herps.ts): the resting body with all four legs spread
  limp and drooping; its `top` line (the back) sits 0.5 mm under the water line (build.ts), no contact shadow.
  `herpBody(art, w, surface)` now takes the surface (glass / top poses). `restsOnFloor` is false on 'top'. Test in
  scatter.test.ts (share, height, save round-trip, dry tank). Not fingerprinted (like the tree frog's glass pose):
  review sheet unchanged; picture made with a temporary swap. Not done: dragging can't move a frog between the floor
  and the surface (only Shuffle / Add choose), and in a tank filled to the rim the rim hides floaters from eye height.
- Gotcha: `npm run sheets` renders in headless software WebGL, whose fingerprints differ from a GPU's for every model,
  so the sheets script cannot record versions (tried: it bumped all 68). Record from a dev server's review page only.

## Tree frogs climb the glass (2026-10-14; Nathan: "like otos and snails cling to the glass")
- White's tree frog has `cling: any` (glass, hardscape, floor). Shuffle / Add use the oto path (`spawnSnail`) with a new
  `on.above` = the water line, so a frog on the glass or hardscape is always out of the water; glass weight `GLASS_FROG`
  0.6 (otos 0.35); on the glass it sits head up (yaw 90 ± 40) and unbent. Floor picks still go to land.
- `glassBand` (water.ts) is the height range on the glass: land climbers from the water line (or ground) to the top of
  the pane, everything else ground to water line. Used by `onGlass` (build.ts) and `fitFish`; `maxFishY` leaves a
  frog's height alone when the water level changes. Rendering needed nothing new: `onGlass` already lays any
  card + 3D body belly to the pane. Test in scatter.test.ts. Checked in the tree frog terrarium example.
- Dart frogs, toads, newts unchanged (no `cling`).
- **On the 3D wall (2026-10-15; Nathan: "animals should cling to the 3d backgrounds surface"):** where the backdrop
  covers the pane, `onGlass` (build.ts) lays the animal on the relief instead of the glass behind it: `onWall` casts 5
  rays toward the glass (middle, ± half a body along head and side) at the cached `backdropGeometry`, fits a plane,
  lifts it over the highest hit, tilts no more than ~70° off the glass. No wall there -> glass as before. Glass parts'
  reuse key includes the backdrop + bgSides + rim (`wallKey`). Applies to every `onGlass` animal (tree frogs, plecos,
  otos); snails on glass too (`snailMeshes`: sole on the fitted plane, foot toward the wall, yaw in that plane).
- **Glass pose (Nathan's two photos, same day):** `HERP3D_GLASS.treefrog` (`frogOnGlass3D`, herps.ts): belly levelled
  flat onto the pane, arms folded under the chin, hind legs folded tight along the flanks, toe pads turned in under
  the belly; cream starts lower round the section. `herpBody(art, w, glass)`; build.ts passes `f.surface === 'glass'`.
  Picture `shots/92_treefrog_glass_sheet.png`. Awaiting Nathan's look.
- **Bug found on the way: every 3D amphibian body was inside out** (bodyGeometry wound inward, so you saw the far
  side's inside: cream flank seen from above, the far eye showing through; the old "far eye shows as a lid bump"
  watch item). Winding flipped in `bodyGeometry`; the vertex shading now darkens the real underside. Affects all
  frogs, newts, axolotl and the hermit crab's body.

## Lane A: 3D plants (2026-10-14; Nathan approved the style test "looks good, roll out"; pushed to main)

Roadmap step 5. All seven plant types are real 3D; the crossed cards stay as the fallback (`plant3d.on = false`,
or a type with no `PLANT3D` entry). No scene version bump: plants were already items (variant / seed / size).
- `render/plant3d.ts`: ONE generator. A leaf = a curved sheet along a centreline (`rise` from vertical, `arch` toward
  the ground by the tip, `twist` about the midrib, `fold` cupped / ridged, `wave` edge ripple, `pet` stalk strip in the
  stalk colour, optional pale `rib` line), built twice: upper side and paler `under` side, each FrontSide. Forms:
  `rosette` (crown, golden-angle spiral; `crowns` = several plants in a clump), `rhizome` (creeping root tube),
  `stem` (stems with crossed leaf pairs, leaves shrink to the top; `top` = tip colours, the red stem), `carpet`
  (leaflets over a ragged disc, lower to the edge). Vertex colours with form shading baked in (up-facing lighter,
  base and middle darker); one shared MeshBasicMaterial, lit by aqPatch as a card (so the same saturation lift).
  Size: the plant is scaled to its exact height (`size`); leaves reaching wider than the card are pulled in by up to
  a quarter so it fits where the card did. Swords now draw at their real height (the card's picture never filled it).
- Data: `PLANT3D` in `art/plants.ts` (fern, sword, carpet, anubias, grass = vallisneria, stem, stemred).
- Cost: dense planted 24" starter set 418 k triangles (stem plant ~9 k, carpet patch ~18 k). A carpet is generated
  once per (seed, size) (`plantGeometry`), then `carpetOnGround` moves each leaflet onto the ground under it on every
  drag step (only positions are new; colours / normals / index shared). Leaflets capped at 3000 per patch (bigger
  leaflets past that).
- Hook (my lane): plant branch of `itemMesh` in `render/items.ts`. `scene/items.ts` not touched.
- Sheets (worktree `shots/`, not in git): `9{1,2}_{fern,sword,carpet}_sheet.png` (style test), `94_*` (rollout),
  `96_planted_sheet.png` (dense planted, card / 3D). Capture helper `shots/cap.js` (card vs 3D at the same framing).
- Sway (Nathan 2026-10-14: plants looked stiff, "leaves and stems are bendy and ebb and flow in the current"): per
  species `sway` (0 stiff .. 1 limp: vallisneria 1, stems .65, fern / sword .3, carpet .1, anubias .08). One current
  direction per plant (mostly along the tank, +-35°), every leaf leans into it by its own share (longer leaves more)
  plus a sideways S-wobble growing to the tip; stems bend along their height the same way. Own random stream
  (`rng(seed * 104729 + 71)`), so the approved leaf layouts did not change. `plant3d.sway = false` = rigid. Sheet
  `shots/98_planted_sheet.png` (before / after).
  Per-plant amount (Nathan 2026-10-14: "the red stems all bend about the same; straight up should be just as likely"):
  each plant's sway = species sway x 1.3 x uniform(0, 1) (`rng(seed * 15485863 + 5)`), so straight and strongly bent
  plants are equally likely, every species. Rows `shots/102_row_{stemred,stem,grass}_lab.png` (10 plants, same seeds
  as `101_*`).
- Per-plant build (Nathan 2026-10-14: "does every sword look like every other?"): the leaf layout was already per
  item seed (count, lengths, angles, colour picks); now the plant-wide traits vary too, drawn per seed from a
  triangular spread round the species' value (own stream `rng(seed * 7907 + 3)`): leaf width +-18 %, length +-12 %,
  rise +-20 %, droop +-30 %, stalk / rhizome thickness +-25 %, leaf pairs per stem +-15 %, brightness +-6 % and a
  warm / cool cast (+-8 %). Sheet `shots/100_variety_sheet.png` (5 swords, 5 vallisneria, same size, different seeds).
- Watch items: vallisneria clumps spread wider than their card; the sword is taller than its old card; the carpet sits
  lower than the card from the front. Crypts: not built yet (next).

## Lane H: AqAdvisor for salt tanks (2026-10-14; Nathan: leave it off; pushed to main)

- **AqAdvisor's saltwater calculator gives no stocking %.** `AqAdvisorMarine.php` (79 fish, no invertebrates) takes the
  same form as the freshwater page, lists the selection ("Total selected: N fishes.") and stops: no "stocking level"
  anywhere. Checked 2026-10-14 three ways (Update with a custom 36x18x16, the "40g breeder" preset, Add > like a user)
  and in a real browser. It did work once: Reef2Reef, Feb 2015, "Calculator says my stocking level is 172%"; the form
  is unchanged since (Wayback 2015-01-11), so it is broken on their side, not a missing field. Nathan 2026-10-14:
  leave stocking off for salt tanks.
- **Mapping kept for when it works again**: `scripts/aqadvisor-ids.py` resolves `MARINE` + `MARINE_STAND_INS` on the
  marine page; `aqadvisor.json` now holds all 12 marine species flagged `salt` (55 entries). Stand-ins (no marine
  inverts on AqAdvisor): cleaner shrimp = Neon Goby (5 cm cleaner), turbo snail = Tail Spot Blenny (small rock grazer),
  hermit crab = Yellow Clown Goby (3.5 cm perching goby). Bangaii Cardinal is AqAdvisor's spelling for the banggai.
- `aqQuery` never sends a `salt` id: salt tanks still return null, and a marine animal left in a fresh tank (a misfit)
  is "Not counted". Worker unchanged, not redeployed.
- Readout wording only (`panels.ts`, lane E's file: two strings): "not available for saltwater (AqAdvisor gives none)";
  the sidebar note says the saltwater calculator gives no stocking level.
- Tests: the expected map includes the marine species again (every non-land species mapped, `salt` exactly on the
  marine ones, 6 stand-ins); new test: a clownfish in a fresh tank is not counted. tsc clean, 182/182.
- To turn it on if AqAdvisor fixes the page: pass a `salt` flag through `AqQuery` -> proxy `sw=1` -> `AqAdvisorMarine.php`
  (no filter fields), include it in the worker's cache key, redeploy the worker.

## Lane AL: condition / algae view (2026-10-15; branch `algae`; Nathan approved v2; pushed to main)

- One manual **Condition** slider in the Water section: Pristine (0) .. A few weeks .. Overdue .. Neglected (1). Saved as
  `condition: { level }` on the tank (validate clamps 0-1; old files load pristine; share links carry it).
- Display only, all uniforms (`render/algae.ts` AU, set in `setWaterUniforms`): dragging never rebuilds; envKey ignores it.
  At 0 every branch is skipped / discarded, so a pristine tank renders as before (tested).
- Glass: one film mesh just inside the panes (not on a bowl yet): blotches growing in from pane edges, corners and the
  waterline, spot algae dots (coralline in salt); the pane looked through grows less and fainter. Surface: scum band along
  the glass only (an even film veiled the whole tank seen from above).
- Hardscape (items.ts solidMaterial, backdrop too): brown diatoms first, then green fuzz on lit tops (weighted by the light
  on the face), BBA on edges; salt: red cyano + bubble algae. Keyed to the piece's seeded local position (vGrit), so it
  moves with the rock. Corals stay clean (aNoAlg attribute). Substrate: diatom patches, mulm along the glass, green/cyano
  in light.
- Decisions (Nathan 2026-10-15): NO water haze (his water never went hazy; even 6 % lifted a black background into a veil);
  one slider, no per-effect sliders or algae types; the growth timeline does NOT drive it for now.
- Open: algae on plant leaves; bowl glass film. (Both done by lane LA, 2026-10-15.)

## Lane E: live rock + corals (2026-10-14; branch `corals`; Nathan approved the style test, live rock salt only; pushed to main)

- **Library** (`scene/items.ts`): `liverock` (kind `stone`, size = length) and new kind `coral` ("Corals" row): `acropora`
  Branching, `montipora` Plate, `mushroom` Mushroom corals (disc cluster on its own small live rock), `leather` Leather
  (toadstool). Coral size = width (item panel says "Width"). `Variant.salt` marks all five; the Aquascape buttons carry
  `data-salt` and `render()` hides them unless the tank is saltwater with water on. `ItemKind` + `'coral'` (one line in
  `types.ts`). No scene version bump: older files have none; an older app skips them as unknown variants.
- **Shapes** (`render/coral3d.ts`, `reefShape`): procedural from (variant, seed, size), base on y = 0, cached / light-baked
  / glass-clipped by `render/items.ts` like the stones (dispatch in `solidShape`; `waves`, `paint`, `clean`, `grit` now
  exported). Live rock = 3-5 overlapping knobbly lumps with holes, fitted to `stoneDims`, cream under pink / purple
  coralline patches. Acropora = 6-9 recursive tapered tube trunks, tips paler (5 colour morphs). Plate = spiral whorl of
  thin cupped discs tipped up at the rim (4 morphs). Mushroom = 6-10 ribbed discs with a pale mouth, set on the rock's top
  (5 morphs). Leather = lathe stalk + folded cap (3 morphs). Grit kinds 11 (hard coral cups) and 12 (soft polyp fuzz).
- **Reef example** finished (lane F's steps): `src/examples/reef.json` + `reef.jpg` re-saved, renamed "Reef": 24x18x18 in,
  5 live rocks, 7 corals (all four kinds), 2 ocellaris, royal gramma, firefish, watchman goby, cleaner shrimp, 2 turbo
  snails, 3 hermit crabs (no yellow tang: too big for 24 in).
- Tests: `test/reef.test.ts` (library flags, save / load, shapes deterministic, on y = 0, about their size), examples test
  checks the reef's rock, corals and marine-only animals. 186/186. Browser: buttons hidden in fresh, shown in salt, Add
  works, no console errors. Style-test pictures: worktree `shots/e1_{front,above,seeds,reef}.png`, `e2_reef_full.png`.
- **Open / later**: live rock still a little rounded from straight on and its holes barely show; corals are not in any
  starter set (a "Reef" Aquascape start set would need a `LayoutId`, i.e. a types/validate change); the other five
  examples' thumbnails predate lane A's 3D plants (the scenes turn 3D by themselves, the pictures do not).

## Lane C: marine species (2026-10-13; Nathan approved the sheets, hermit "fine for now"; pushed to main)

12 species, all `salt: true` (cat `sw-fish` / `sw-invert`), approved list (Nathan, same day, hermit crab as shell + limbs).
TL = typical adult in an aquarium (as the freshwater list), checked against the cited max:
| id | species | TL mm | source (max) |
|---|---|---|---|
| ocellaris | *Amphiprion ocellaris* | 80 | FishBase 11 cm TL |
| royalgramma | *Gramma loreto* | 75 | FishBase 8 cm TL |
| yellowtang | *Zebrasoma flavescens* | 180 | FishBase 20 cm TL |
| firefish | *Nemateleotris magnifica* | 75 | FishBase 9 cm TL |
| banggai | *Pterapogon kauderni* | 70 | FishBase 8.6 cm TL |
| sixline | *Pseudocheilinus hexataenia* | 75 | FishBase 10 cm TL |
| chromis | *Chromis viridis* | 75 | FishBase 10 cm TL |
| coralbeauty | *Centropyge bispinosa* | 90 | FishBase 11.5 cm TL |
| watchman | *Cryptocentrus cinctus* | 90 | FishBase 10 cm SL (so about 12 cm TL) |
| cleanershrimp | *Lysmata amboinensis* | 55 | about 6 cm body, antennae excluded (CMFRI eprint 14967, reefguide.org; SeaLifeBase blank) |
| turbo | *Turbo fluctuosus* | 50 | shell 2.5-8.6 cm (WoRMS via Wikipedia; SeaLifeBase blank) |
| hermit | *Clibanarius tricolor* | 30 | about 2.5 cm incl. shell (retailers; no published size found) |
FishBase pages: `https://www.fishbase.se/summary/<Genus-species>.html`.

Built (data first, generators reused):
- 9 fish = `PLANS` entries in `art/fishgen.ts` (marine block above the bottom dwellers), thick per the recipe; watchman
  = goby bottom fish (`back` .6, `belly` .5, `wide` .3, `eye.up` .35). Added to `fish3d.species`.
- Cleaner shrimp = a `SHRIMP` spec. New optional spec fields: `back` (broad band over the upper flank), `stripeW`
  (back stripe width), `ant` (antenna colour, length factor).
- Turbo = a fifth snail kind in `art/snails.ts` (`SHELL3D.turbo`, card drawn by the mystery snail's branch).
- Hermit crab = a herp-family entry in `art/herps.ts` (`HERMITS`, `drawHermit`, `HERP3D.hermit`): small lofted body,
  2 walking legs + claw per side, eye stalks and antennae as `Limb3D` tubes, one joint table for card and 3D. Species
  `zone: bottom`, `cling: hardscape`.
Generic additions (no species code; all optional, existing species unchanged):
- `fishgen.Limb.c` + fish3d `limbMeshes` per-limb colour (white antennae).
- `Herp3D.shell` (a carried shell from the snail generator: snail3d `shellMesh`, now also used by `snailBody`),
  `Herp3D.eye.at` (eye on a stalk tip), `Limb3D.c` (own limb colour).
- `Shell3D.open` (which way the aperture faces; default unchanged) and `Shell3D.tilt` (lean the spire back).
Tests: `aqadvisor.test.ts` now leaves the marine species out of the AqAdvisor map (the app asks AqAdvisor for freshwater
  tanks only; AqAdvisor HAS a saltwater calculator, Nathan same day: mapping the marine species to it is a follow-up unit); `scene.test.ts` snail
count 4 -> 5. tsc clean, 173/173. Checked in the browser: a salt tank lists 9 marine fish + 3 marine inverts, no
freshwater species.
Sheets (worktree `shots/`): `91_marine_{A,B,C}.png` (card / 3D, four views, same framing). My review: the 9 fish pass;
watch items: watchman head-on is a pointed snout (the 75° foreshortening, lesson 38); sixline stripes ring head-on;
cleaner shrimp legs comb head-on (as the other shrimp); turbo aperture lip reads as a visor at 50° (as the mystery);
hermit shell is a tilted turbo-like coil, its side view shows the aperture lip as a wedge, card shell is rounder.

## Lane F: example tanks (2026-10-13; branch `examples`, shipped to main)

- **Open… lists six Examples** above "Saved in this browser": Planted community (40 breeder), Iwagumi (rimless 24 in),
  Betta bowl (30 cm bowl on a round oak table), Paludarium (swamp set, water 42 %, toads + dart frogs on land, chilis +
  shrimp in the pool), Tree frog terrarium (18x18x24 dry, custom soil), Reef (placeholder: salt, aragonite, reef-blue,
  lava rock, no animals). Nathan approved the six from draft pictures.
- **Opens like a file**: `parseScene` + `store.replace`, so one undo step back to the previous tank; `setLibId(null)`, so
  Save makes the user's own copy and never touches the example. Status: "Opened the example ...".
- **Files**: `src/examples/<id>.json` (ordinary downloaded scenes) + `<id>.jpg` (400 px thumbnail), listed in
  `src/examples/index.ts` and imported with `?raw` / `?inline`, so they are in the JS bundle and the single-file build
  (checked: `dist-single/tanklook.html` holds all six, no fetch). About 110 kB JSON + 100 kB pictures.
- **Re-saving after lanes A / C / E land** (the point of keeping them as plain scene files): open the example, adjust,
  *Download*, replace `src/examples/<id>.json`; for a new picture, *Save* it and copy the thumbnail, or in the dev
  server `__gb.viewer.thumbnail(400)` and save the JPEG as `<id>.jpg`. Plants turn 3D by themselves once lane A merges
  (items store only variant/seed/size). The reef wants marine fish (lane C) and corals / live rock (lane E); rename it
  from "Reef (placeholder)" then, and update its `name` + `hint` in `index.ts` (the test checks the file name matches).
- `test/examples.test.ts`: six examples, each parses with no warnings, every species exists, reef is salt, terrarium dry.
- Touched outside my files: two CSS rules in `src/style.css` (`.libsub`, `#exList`). The examples were built in the dev
  server from the app's own `defaultSetup` / `starterItems` / `shuffleFish`, then hand-tuned (paludarium land plants
  thinned near the frogs, terrarium frogs moved to the front, betta bowl water 85 %).

## Lane B: fresh or salt tank (2026-10-13; branch `salt-tank`, shipped to main)

- **Water section: Type = Freshwater | Saltwater** (`water.salt`, the seam's flag; off when Water is off). One undo step.
  Switching swaps clear water for the other type's clear (fresh `#7fb8a8`, marine `#8ec9ec`, both opacity 0); any other
  colour is the user's and stays.
- **Animals list filtered by water** (`fitsWater` in `ui/panels.ts`): a saltwater tank (salt and water on) lists species
  with `salt: true`, a fresh or dry tank lists the rest. Group chip counts follow; an empty search says how many matches
  the other water has ("switch the tank in Water").
- **Animals that no longer fit are offered for removal, not removed**: a row under Type names them ("Not saltwater
  animals: 6 Neon tetra") with **Remove N**; one undo step, Ctrl+Z restores. The row stays while any misfit is in the
  tank (also after undo or a loaded file).
- **Marine water presets**, shown only on a salt tank (Blackwater / Green hidden): Reef blue `#2f86d0` 22 %, Deep blue
  `#1f5fb0` 40 %; Clear follows the type. 12 % was invisible in a 12-inch-deep tank. With no background behind the tank
  the tint stays subtle, because the water model tints only what is inside the water.
- **Substrates** `aragonite` (fine bright cream sand) and `coral` (crushed coral: coarse flat chalky chips). Coral began
  as pebble gravel, but the pebble shading (rim darkening, contact shadows, layer darkening) made it mid-grey, so it is
  now a coarse "sand". Both listed for any tank, labelled "(marine)". `SubstrateType` + validate list extended, no
  version bump.
- **AqAdvisor off for salt**: `aqQuery` returns null for a salt tank. The view label reads "Stocking: not available for
  saltwater (AqAdvisor is freshwater only)", with a matching sidebar note. Compare lists Freshwater / Saltwater as a
  difference.
- **One-line hook in lane C's `data/species.ts`**: `resolve()` dropped unknown JSON fields, so `"salt": true` never
  reached the species. Added `if ((r as { salt?: unknown }).salt === true) sp.salt = true;` before the female block.
  Lane C: keep it (or fold it into `RawSpecies`) when merging.
- Tested with a temporary local `"salt": true` on the angelfish (not committed): filter, counts, misfit row, Remove +
  undo, presets, both substrates in the browser; `test/salt.test.ts` covers AqAdvisor off and the reload round-trip.
- Not done / for later: `Species.cat` and `salt` are independent (a salt species in `fw-fish` still lists under
  "Freshwater fish"), so lane C should set both. Live rock and corals wait for lane E.

## Parallel lanes (2026-10-13, Nathan: fill the gaps before showing other people)

**Current lanes (2026-10-14 16:25, coordinator "Lanes coordinator 2", `local_d0390f66`).** Everything else below is DONE.
| Lane | Worktree / branch | Port | Owns | State |
|---|---|---|---|---|
| P final polish | `../Glass-Box-final-fixes` / `final-fixes` | 5473 | `src/style.css`, `index.html`, `src/ui/panels.ts`, `src/scene/water.ts` | DONE (`7e5897a`); files free |
| R P2 axolotl + nerite | `../Glass-Box-p2-small` / `p2-small` | 5493 | `art/herps.ts`, `render/herp3d.ts`, `art/snails.ts`, `render/snail3d.ts` | DONE (`45f872a`); files free. Open: fillCut for mystery / turbo / trumpet (would change approved look) |
| S P1 fish fins | `../Glass-Box-fish-fins` / `fish-fins` | 5503 | (released) | DONE (`f71987c`, `624f8b1`); P2 notes in lane S's section; files free |
| X P2 fish, freshwater | `../Glass-Box-fish-fins` / `fish-fins` | 5503 | (released) | DONE (see Lane X section, build 372); files free |
| Y P2 fish, bottom + marine | `../Glass-Box-fish-p2b` / `fish-p2b` | 5533 | PLANS / her() entries ONLY of bronzecory, pandacory, oto, clownloach, sae, ocellaris, royalgramma, sixline, chromis | DONE (batches 1-2 pushed, build 365); worktree removable |
| R2 snail aperture kink | `../Glass-Box-p2-small` / `p2-small` (started by lane R) | 5493 | `art/snails.ts`, `render/snail3d.ts` (mystery / turbo / trumpet fillCut) | CLOSED: tried, Nathan declined (`52fb6cb`); snail files free |
| S2 fish batch 4 | (worktree removed) | - | - | DONE (`1399de7`, build 351); swordtail kept at 120 mm (Nathan) |
| V zoom out further | `../Glass-Box-zoom-out` / `zoom-out` | 5523 | `scene/validate.ts` LIMITS.zoom, `render/camera.ts`, the zoom / framing parts of `render/viewer.ts`, the cZoom slider in `index.html` / `ui/panels.ts`, `interact/pointer.ts` wheel / pinch | DONE (see Lane V section); files free. Also touched (free files): `render/build.ts` room size + ceiling, `render/viewmap.ts` caption, `scene/orbit.ts` |
| T iPhone AR | `../Glass-Box-ar` / `ar-view` (lane Q's, Q is done) | 5483 | new `render/arUsdz.ts` + test, `render/ar.ts` | DONE for now (`3085106`); iPhone button hidden behind `?ar=ios` until an iPhone test, then IOS_FLAG = false; files free |
| ADF African dwarf frog | `../Glass-Box-adf` / `adf-frog` | 5553 | `FROGS.adf` + new FrogSpec fields in `art/herps.ts` / `render/herp3d.ts`, the `adf` entries in `data/species.json`, `data/aqadvisor.json`, one line in `fish3d.species` | running (session `local_37002c35`), v1 sheet awaiting Nathan |
| Z coral seating | `../Glass-Box-coral-seat` / `coral-seat` | 5563 | coral seating in `render/items.ts` (seatCorals) / `scene/items.ts` (seatHook), the coral drop in `src/interact/*`, `src/examples/reef.json` + `reef.jpg` | DONE, pushed (see its section) |
| F2 harder fish | (worktree removed) | - | - | DONE (`8febeec`): fantail, kuhli, harlequin, oscar v3. Open: head geometry rejected by Nathan (cory / loach / SAE / marine heads have no generic); fantail doubled anal fin; lane X's leftovers not applied (noseCap on neon / cardinal / chili / cpd, characin dorsal taper, platy / molly gonopodium) |
| X2 fish leftovers | (worktree removed) | - | `art/fishgen.ts`, `render/fish3d.ts`, `art/paint.ts` (noseCap on neon / cardinal / chili / cpd, characin dorsal taper, platy / molly gonopodium, fantail doubled anal fin) | DONE 2026-10-15, pushed (see its section); fish files free; Sex switch browser-checked PASS (build 436) |
| GR1 plant growth | `../Glass-Box-plants3d` / `plants3d` | 5283 | see the "Plant growth" section (growth value, Height removed, lying over at the surface) | DONE (`050e2d9`, `4a4e3a8`, build 440) |
| SF single-file build fix | `../Glass-Box-single-fix` / `single-fix` | - (opens dist-single/tanklook.html directly) | `vite.config.ts`, `scripts/build-single.mjs` | DONE, pushed (see "Lane SF" at the top): own Vite pass + data: URL worker + guard in build-single.mjs |
| EF1 shader link time | `../Glass-Box-shader-link` / `shader-link` | 5633 | `render/items.ts` solidMaterial / GRIT / gritK, the first-picture / compile path in `render/viewer.ts` | ready to open (prompt `prompts/lane-EF1-shader-link.md`) |
| EF2 edit speed | `../Glass-Box-edit-speed` / `edit-speed` | 5643 | `render/lighting.ts`, the water / frost rebuild in `render/build.ts`, store listeners in `scene/store.ts`, `scene/lightout.ts` | DONE 2026-10-15 (files free) |
| EF3 download size | `../Glass-Box-download-size` / `download-size` | 5653 | `src/examples/index.ts` + the examples hooks in `ui/panels.ts` (start menu / Open dialog), model-sheet packaging after SF (SF owns `vite.config.ts`) | DONE 2026-10-15 (files free) |
| E1 perf baseline | `../Glass-Box-perf2` / `perf-baseline` | 5623 | new `scripts/perf-baseline.mjs`, `research/efficiency/E1-*` (no src edits) | OPEN 2026-10-15 |
| E2 code audit | `../Glass-Box-audit` / `code-audit` | - | `research/efficiency/E2-*`, `scripts/unused-exports.mjs` (no src edits) | OPEN 2026-10-15 |
| GR2 emersed growth + floaters | `../Glass-Box-plants3d` / `plants3d` | 5283 | `art/plants.ts`, `render/plant3d.ts` (bendPlant 'emerge' / 'spread'), plant branch of `render/items.ts`, plant entries of `scene/items.ts`, new floater / lily species data | DONE (`2b67f4c`, build 456). Open: lying stems cut at the glass, sagittaria lawn loose tufts, lotus pads orange under light, duckweed waits for instancing |
| GR4 GPU reveal + idle prebuild | `../Glass-Box-plants3d` / `plants3d` | 5283 | (free) | DONE (`d2f95c2`, `9aa4a13`): Time step 4.7-7.9 ms (was 65-98), first drag 10.6 ms (was 164). Open: single-plant Growth slider still builds on the main thread near the glass; prebuilt growth ~2x plant memory; carpet cache-key bug (E2) sent to it |
| GR3 growth timeline + tank setting | (worktree removed) | - | see the "Plant growth" section (Feeding + Time, `scene/growtime.ts`) | DONE (`c9d615a`, `5931cb2`, build 452). GPU reveal + idle prebuild (Nathan's call) handed to GR2 |
| SD scape density sliders | `../Glass-Box-scape-density` / `scape-density` | 5603 | `scene/items.ts` starterStyle / starterItems, LayoutSettings in `scene/types.ts`, layoutShuffle + layout picker in `ui/panels.ts` / `index.html`, new tests | foundation LIVE (`f3a1859`, build 468); waiting on Nathan: hand edits pinned vs replace the layer (replace ships now) |
| AL dirty / algae view | `../Glass-Box-algae` / `algae` | 5613 | (released) | DONE 2026-10-15, pushed (see the Lane AL section); files free. Open: algae on plant leaves (after GR4) |
| PL progressive first load | (worktree removed) | - | the first-picture / startLinks path in `render/viewer.ts`, part grouping in `render/build.ts` (buildTank order only), a small load hint in `index.html` / `style.css` | DONE (`1514e34`, `db60516`): first part shows in 3-4 s instead of a blank 13-18 s; hardscape link (9-15 s cold) is the remaining gap (SG) |
| SG stone grain | (worktree removed) | - | `render/items.ts` solidMaterial / GRIT / gritK (cheaper or baked stone grain) | DONE (`634a7b7`): hardscape link 5.5-11.2 s -> 1.7-3.1 s, cold first picture 5-8 s |
| SS scape styles | (worktree removed) | - | `scene/items.ts` starter section, `scene/starter.ts`, the layout picker in `ui/panels.ts` / `index.html` | DONE (`e3513a5`): Nature / Dutch / Jungle / Forest, Composition, Quick aquascape setup. Optional, needs Nathan's go: biotopes + marine sub-styles |
| LA leaf algae + bowl film | (worktree removed) | - | `render/algae.ts`, the plant material hook in `render/plant3d.ts`, bowl glass film | DONE (`e87bc19`). Open: no surface scum on bowls; BBA on leaf ends, not true margins |
| T1 dry ground (roadmap R1) | `../Glass-Box-dry-ground` / `dry-ground` | 5633 | substrate types in `scene/types.ts` / `validate.ts` / `defaults.ts` (substrate only), the ground build in `render/build.ts`, substrate tiles in `art/placeholder.ts` / `render/textures.ts`, new `render/scatter.ts` (leaf litter), the Substrate section of `ui/panels.ts` / `index.html` | running (session `local_6ae6a2e0`) |
| T2 terrestrial plants (roadmap R1) | `../Glass-Box-terra-plants` / `terra-plants` | 5653 | `art/plants.ts`, `render/plant3d.ts`, plant branch of `render/items.ts`, plant entries of `scene/items.ts` LIBRARY | running (session `local_7d35229e`) |
| T3 dry hardscape + anchors (roadmap R1/R2) | `../Glass-Box-dry-hardscape` / `dry-hardscape` | 5663 | non-plant branches of `render/items.ts` (not the GRIT shader core), stone / wood / cave / hide entries of `scene/items.ts` LIBRARY, new `scene/anchors.ts` + its hook in the cling / rest code; anchor hook in `render/build.ts` addContents rest / cling helpers (`top`, `restOn`, start of `animal()`, `onGlass`, `onWall`, glass branch of `snailMeshes`); perch pose in `art/herps.ts` / `render/herp3d.ts` | running (session `local_adf731d2`) |
| T4 aquatic roster | `../Glass-Box-aqua-roster` / `aqua-roster` | 5673 | `data/species.json`, `data/aqadvisor.json`, NEW species' PLANS / her() entries in `art/fishgen.ts`, `render/coral3d.ts` + coral entries of `scene/items.ts` LIBRARY | batches 1-2 pushed (9 fish); corals running (session `local_c8325e61`) |
| FM fish mesh merge | `../Glass-Box-fish-merge` / `fish-merge` | 5683 (headless checks preferred) | fish mesh assembly in `render/fish3d.ts`, the animal-mesh part of `render/build.ts` | DONE 2026-10-16 (see its section), files free |
| Queued (Nathan 2026-10-16, roadmap re-rank) | - | - | after T3: crested gecko + lizard body plan; after T1-T4: starter styles batch 2 (biotopes, marine sub-styles, terrestrial starters); multi-select / duplicate + scatter brush; PNG import; LAST: build.ts / panels.ts splits | queued |
| W Android app | `../Glass-Box-android` / `android` | 5543 (`android`, `--host` for phone tests) | landscape @media in `style.css`, view-map `narrow` in `ui/panels.ts`, new manifest / icons / SW in `public/`, their tags in `index.html`, new `android/` | Steps 1-3 DONE (layout, PWA, TWA APK works on S24+); PAUSED 2026-10-14 by Nathan before step 4 (Play material) and 5 (low-end check); files free, preview servers stopped |
Free (no lane): `render/build.ts`, `render/items.ts`, `scene/items.ts`, `render/viewer.ts`, `main.ts`, `render/lighting.ts`,
`render/coral3d.ts`, `render/shrimp3d.ts` / `art/shrimps.ts`, `scene/share.ts`, herps / herp3d / snails / snail3d. A one-line hook in a free file is fine; name it
in your section. Where to read: anatomy audit `reference/model-anatomy-audit-v1.md`; model versions "Model review sheet"
below; lane D's R1-R12 verdicts under "Review pack R1-R12"; the final check `shots/final/FINAL.md` (main checkout only).
Gotcha: the dev server reads the build number at start-up; restart it after merging main and before pressing Record.


Four chats at once, each owning its files. Seam already on main (`cb7783c`): optional `salt?: boolean` on `Species`
(absent = freshwater) and on `WaterSettings` (validated, default fresh, no version bump).
| Lane | Folder / branch | Launch config | Owns |
|---|---|---|---|
| A 3D plants | `../Glass-Box-plants3d` / `plants3d` | `plants3d` 5283 | `art/plants.ts`, new `render/plant3d.ts`, plant branch of `render/items.ts`, plant entries of `scene/items.ts` |
| B Salt tank | `../Glass-Box-salt-tank` / `salt-tank` | `salt-tank` 5293 | `src/ui/*` (salt toggle, species filter), water + substrate presets, `scene/defaults.ts`, `scene/water.ts`, AqAdvisor off for salt |
| C Marine fish | `../Glass-Box-marine-fish` / `marine-fish` | `marine-fish` 5303 | `data/species.json` + `species.ts` data, `art/fishgen.ts` PLANS, `art/paint.ts`; `render/fish3d.ts` generic fixes only |
| D Audit + review | main checkout, no `src/` edits | `dev` 5173 | `shots/audit/`, the "Still open" / "Known gaps" sections below |
Rules: touch another lane's file only for a one-line hook, and say so in your section. No scene version bump without
asking Nathan. Shipping: in the worktree `git fetch` + `git merge origin/main`, tsc + tests + browser check, then
`git push origin HEAD:main` and `git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main`. HANDOFF.md
conflicts on merge: keep both sections. Each lane adds its own dated section at the top of this file.
Lane B DONE (`ff590db`). Lane F DONE (see its section). Lane F added 2026-10-13: example tanks, `../Glass-Box-examples` / `examples`, launch config
`examples` 5313; owns the Open dialog's examples list in `src/ui/panels.ts` + `index.html`, and new example files.
Lane G (fixes from shots/audit/AUDIT.md) waits for lane D's report; it takes over `src/ui/*` after F lands.
Lane H DONE (salt stocking stays off, see its section). Lane C DONE (`2c38519`). Lane F DONE (`829929a`). Lane H added 2026-10-13: AqAdvisor saltwater, `../Glass-Box-aq-salt` /
`aq-salt`, launch config `aq-salt` 5333 (aq mode; needs `aq-proxy` 8787); owns `data/aqadvisor.*`, `worker/*`, and the
salt switch-off in the AqAdvisor code. Lane E also re-saves the examples and fills the reef example when it lands.
Lane A DONE (`29515de`). Lane G opened 2026-10-14 ahead of the audit: `../Glass-Box-audit-fixes` / `audit-fixes`, launch
config `audit-fixes` 5343; waits for lane D's message that shots/audit/AUDIT.md is written. Owns `src/ui/*`, `index.html`,
`src/style.css` (lanes E and H keep their small panels.ts hooks); a finding in another lane's files goes to that lane.
Lane H DONE (`6c91148`). Lane E DONE (`e8ccd65`). Lane I DONE (see its section). Lane I opened 2026-10-14: E's leftovers + example refresh,
`../Glass-Box-reef-polish` / `reef-polish`, launch config `reef-polish` 5353; owns `scene/items.ts` (lane A may add one
crypts LIBRARY line), the non-plant branches of `render/items.ts`, `render/coral3d.ts`, `src/examples/*`, LayoutId in
`scene/types.ts` / `scene/validate.ts`. Lane G owns `src/ui/*`.
Audit written 2026-10-14: `shots/audit/AUDIT.md` in the MAIN checkout only (shots/ is gitignored), 53 findings. Split
into two fix lanes: G (`src/ui/*`, `index.html`, `src/style.css`) and G2, core fixes, `../Glass-Box-core-fixes` /
`core-fixes`, launch config `core-fixes` 5363 (`src/interact/*`, `src/scene/*`, `src/render/*` except lane I's files).
A finding that spans both goes to the lane holding the root cause, with at most a one-line hook in the other's files.
Audit ownership (lane G's split, 2026-10-14): G2 = #1, 3, 6, 14, 15, 18-21, 29, 47, the PNG crop/margins/A-B labels
part of #49, 51-53; I = #42; G = the other 38. Nathan's calls: #29 the Stand is ON by default for new tanks (G2, scene/defaults.ts);
#38 salt tanks show only "no stocking check for salt yet" (G).
Lane G DONE (`59025b3`). Lane G2 DONE (`4667d9f`; #52-53 measured, not fixed). Lane J opened 2026-10-14: edit
performance (#52-53, in-place mesh updates instead of a full rebuild per edit), `../Glass-Box-perf` / `perf`, launch
config `perf` 5373; owns `src/render/*` and `src/scene/store.ts` except lane I's `render/coral3d.ts` and G2's possible
#29 framing in `render/camera.ts` / `render/viewer.ts`.
Lane K opened 2026-10-14: light output (watts -> PAR / lux, light map units + hover), `../Glass-Box-light-output` /
`light-output`, launch config `light-output` 5383. Owns `render/lighting.ts` (carved out of lane J's `src/render/*`; J
keeps the rest), new `scene/lightout.ts` + test, the light fields in `scene/types.ts` / `defaults.ts` / `validate.ts`,
the Lighting rows in `index.html` / `ui/panels.ts`, `ui/parGuide.ts`. Spec: `reference/light-output-draft.md`.
Lane K DONE (`472c769`). Lane J DONE (`720558c`; in-place edits, ~65 ms per edit at the quiet baseline). Lane A2 (plant
library) open in `../Glass-Box-plants3d`. Lane J2 offered 2026-10-14: J's leftovers (panels.ts sync() 5-7 ms per drag
step; steady draw 45-50 ms on big tanks; lane K's light fields in build.ts envKey), reusing `../Glass-Box-perf` /
`perf`, port 5373; owns `src/render/*` except the plant branch of `render/items.ts` (A2) and `render/coral3d.ts` (I),
plus the store listener in `src/ui/panels.ts`.
Lane K2 offered 2026-10-14 (light follow-ups: tap-to-read, CFL / MH / halogen calibration, soft beam in the normal
render), in `../Glass-Box-light-output` / `light-output`, port 5383. `render/lighting.ts` is CARVED OUT to K2 (not J2);
J2 asks the coordinator before touching it. K2 also owns scene/lightout.ts, ui/lightHover.ts, the Lighting rows.
Lanes G2, J2, K2, A2 DONE (2026-10-14). Lane D reopened for the review fixes (Nathan: "go ahead with the models, take
the recommendation for the rest"): `../Glass-Box-models-fix` / `models-fix`, launch config `models-fix` 5443. Owns the
fish / amphibian art and 3D files (art/fishgen.ts, art/paint.ts, art/herps.ts, render/fish3d.ts, render/herp3d.ts,
art/placeholder.ts) EXCEPT lane M's shrimp parts and hand-off lines, and the hardscape generators in render/items.ts
(non-plant branches) and scene/items.ts stone / wood / cave entries, after lane I lands.
Lane I DONE (`534b664`). Lane N DONE (see its section). Lane N opened 2026-10-14 (review item R12, Nathan via lane D's recommendation): shareable scene
URLs, `../Glass-Box-share-url` / `share-url`, launch config `share-url` 5453; owns new `src/scene/share.ts` + test, the
share hook in `src/main.ts`, and a Share control in `src/ui/panels.ts` / `index.html` (small hooks only).
Lane M DONE (`03f2312`). Lane D pushed R1 + R8 (`250f4d7`, `c7000c5`). Lane O opened 2026-10-14 (anatomy audit P1, the
non-fish animals): hermit crab body, fire-bellied newt, frog P1 leftovers (feet, toe discs, webbing, warts),
`../Glass-Box-herps` / `herps-p1`, launch config `herps` 5463; owns `src/art/herps.ts`, `src/render/herp3d.ts`. The
hermit shell comes from lane L's `shellMesh` (art/snails.ts / render/snail3d.ts): O does not edit those, it places
the body in the aperture from herps.ts. Fish P1 (fin layout) waits until lane D ships R2 + R3.
Lane L DONE (`9cb81f6`). Final check DONE (`dea1d5d`, shots/final/FINAL.md: 46 fixed, 7 partly, 0 regressed). Lane P
opened 2026-10-14 for FINAL.md items 1-6 (status line off-screen, phone split tab vs Redo, touch target sizes, Custom
terrain button / eye map, water re-raise height, Start from stuck on reef): `../Glass-Box-final-fixes` / `final-fixes`,
launch config `final-fixes` 5473; owns `src/style.css`, `index.html`, `src/ui/panels.ts` (except lane N's Share
control and hook) and `src/scene/water.ts`.
Lane Q opened 2026-10-14 (Nathan's idea): AR view, WebXR immersive-ar on his Galaxy S24+, tank at true size.
`../Glass-Box-ar` / `ar-view`, launch config `ar-view` 5483; owns new `src/render/ar.ts` + test, minimal hooks in
`render/viewer.ts`, one AR button in `index.html` / `src/ui` (lane P owns those: small edits only). iPhone is a later phase.
Lane O DONE (`e4be598`; hermit, frogs, toad, newt at v3). `art/herps.ts`, `render/herp3d.ts` free. Lane N DONE (`0d0b85a`; share links, its panels.ts / index.html /
main.ts hooks are free).
Lane R opened 2026-10-14 (anatomy audit P2, the non-fish rows): axolotl (softer filament gills, trunk, continuous
dorsal / tail fin) and zebra nerite (shell edge and aperture, smaller foot, distinct head), `../Glass-Box-p2-small` /
`p2-small`, launch config `p2-small` 5493; owns `art/herps.ts`, `render/herp3d.ts`, `art/snails.ts`, `render/snail3d.ts`.
Lane S set up 2026-10-14 (anatomy audit P1 fish, 20 species / 29 models: fin structure, then species):
`../Glass-Box-fish-fins` / `fish-fins`, launch config `fish-fins` 5503; owns `art/fishgen.ts`, `art/paint.ts`,
`render/fish3d.ts`. Lane D DONE (`6176008`, `66d2dba`, `49f3f33`), so lane S can start. Lane Q DONE (`1398b14`;
Nathan on the S24+: "works flawlessly"); iPhone phase not started. Lane Q reopened for an A / B
swap in the AR overlay (`d9e6a8b`), phone-checked. Lane T opened 2026-10-14: iPhone AR (AR Quick Look,
USDZ export), in lane Q's worktree `../Glass-Box-ar` / `ar-view`, launch config `ar-view` 5483; owns new `render/arUsdz.ts` + test, and
`render/ar.ts` (lane Q DONE, `ea46f6b`; A / B swap phone-checked).
**Coordinator protocol (Nathan 2026-10-13):** the coordinator chat is session `local_d0390f66-339c-4fa1-ab38-43e9c2a35958`
("Lanes coordinator 2", took over 2026-10-14 from `local_e1923781`). Every lane messages it (send_message to that id) when its work is pushed to main, when it is done,
and at any milestone that unblocks another lane (A: plants pushed; D: shots/audit/AUDIT.md written). The message says
what landed (commit), what is still open, and which files are now free. The coordinator then sends Nathan the prompts
for any chats that can start now. If a prompt is still waiting when another lane opens, it sends all waiting prompts again
in one new message. Every new lane prompt includes this protocol. When a lane is done it stops its own preview servers (preview_stop): the app allows only five
per folder, and finished lanes holding them blocked lane G on 2026-10-14. Questions for Nathan stay in the lane's own chat.
Lane E DONE (see its section). Lane E (corals + live rock as items) OPENED 2026-10-13 early, per lane A: A's change in `render/items.ts` is a ~4-line
hook in the plant branch of itemMesh and A does not touch `scene/items.ts`. E: `../Glass-Box-corals` / `corals`, launch
config `corals` 5323; owns `scene/items.ts`, the non-plant branches of `render/items.ts`, new `render/coral3d.ts`.

## Pan stays put (2026-10-13)

Nathan: snapping back after every pan was limiting; asked about SolidWorks-style free pan + orbit. Decided against
moving the eye/pivot (breaks the fixed eye distance and like-for-like tank comparison, and orbit then swings the tank
out of view). Instead the middle-drag pan (still a lens shift, viewer.ts `pans`, one per view; locked views pan
together) no longer eases back on release: orbit and zoom keep it, a second drag continues from it. Three resets,
all easing back (220 ms): double middle-click, Home (F is taken by flip), and a "Re-centre" button in the view tools
that shows only while panned. Not reset by opening a tank or changing layout.
- Same day (Nathan: "always zooming toward the point the mouse is at"): wheel zoom pans so the point under the
  pointer stays under it (viewer `zoomAt` records the tan-space point before the zoom; the next draw solves the pan;
  measured within 0.3 px over 7 ticks in and out). So zooming off-centre shows Re-centre too. The panel zoom slider
  still zooms about the framing. Double-click straight-on now also re-centres.

## Fish stand out (2026-10-13)

Nathan: fish washed out against sand, backgrounds and plants; asked for an option, or hard-coded if truer to life.
It is not physical (real fish separate from the ground mostly by cast shadows and sheen), so it is an option, not a
fix: Display & export > **Fish stand out** slider (`render.pop`, 0-1, default 0.15 (Nathan, same day; was 0.5, then 0.25); an app preference kept equal across
tanks like `edge`; older files 0.15; 0 = the old look). Shader only (lighting.ts `aqPatch`, uniform `uPop`, set with
the water uniforms): 3D fish bodies get up to +20 % brightness and saturation 1.35 -> 1.7, a darker outline where the
body turns edge-on (up to 55 %), and up to 60 % less water haze; fish cards (`userData.fishCard`, set in build.ts) get
the lift and the haze cut. Shot `shots/pop_compare.png` (off / 50 / 100).
- Same day (Nathan: "also increase the lineweight of the outline"): a real dark outline, width = 2.5 px x pop on
  screen. Solid body: its back faces pushed out along the normals (fish3d `OUTLINE` / `outlineMat`, a ShaderMaterial
  child of the body; uniforms set per viewport by the viewer, `uVpH` = viewport height; none on see-through bodies).
  Cards (fins, flat fish): a ring just outside the painted alpha in AQ_MAP (8 taps at the line width), as faint as a
  see-through fin.
- Same day (Nathan, a betta: fins had no line): paired fins (fish3d `finMeshes`) are flagged `fishCard` too; the ring
  is drawn where the alpha drops off (neighbour alpha minus own > 0.1-0.35), not only past zero alpha, so soft feathered
  fin edges get it; at least 1 px wide. Shot `shots/betta_compare.png`.
- Same day (Nathan: every outer edge the same treatment, see-through fins fainter): body and fin lines share one width,
  max(2.5 px x pop, 1 px); an opaque fin's line is as dark as the body's, a see-through fin's at half strength.
- Same day (Nathan, a round table: "everything looks a bit mushy"): the furniture is inked, ALWAYS ON (Nathan: a fixed
  visual style, not tied to the fish slider; it briefly followed the slider, reverted the same day). Every
  `shadedBox` / `shadedSolid` (stand, table, frame, doors, handles, skirting) gets build.ts `ink()`: 1 px lines on
  creases (EdgesGeometry 30 deg) plus a 1 px silhouette hull (fish3d `hullMaterial`, now shared with the fish body), in
  the piece's colour x 0.35; faces polygon-offset back so the lines win.
  Shot `shots/ink_compare.png`.

## Custom substrate: grain, colour, blends (2026-10-13)

Nathan: pick a grain size (mud, sand, gravel, pebbles) and then any colour; optionally blend two grains with their own
colours, a share ("30 % pebbles") and a Mixing slider (none = separate patches, full = mixed grain by grain, between =
clumps). Substrate type "Custom grain and colour" (`substrate.type: 'custom'`, `substrate.custom` = SubstrateBlend,
validated with defaults, no version bump). Presets unchanged.
- Art (art/placeholder.ts `drawBlendTile`, `GRAIN_LOOK`): grain sizes in mm, so a grain keeps its real size; shades
  generated round the picked colour (HSL jitter, some greyer stones). Tiles 'a' (grain 1), 'b' (grain 2), 'm' (mixed:
  the finer grain as the bed, the coarser covering its share; same grain twice = each stone one colour or the other).
  A fine bed under a coarse tile is drawn at its own repeat and laid as a pattern (grain-by-grain sand on a pebble tile
  took 11 s; now ~0.3 s). Tiles 1024 px, own LRU cache of 18 (render/textures.ts `blendTexture`).
- Placement (render/build.ts `blendGrains`): a seamless 256² noise mask over the floor; thresholds from the mask's own
  sorted values (`maskQuantile`) so the shares are exact: pure patches take (1 - mix) of each share, mixed ground the
  rest; patch size shrinks as the mix rises (mask repeat 900 mm at 0 to 250 mm at 1). Done in the lit shader via a new
  `userData.post` hook in lighting.ts `aqPatch` (runs after AQ_MAP, swaps its `texture2D(map, ...)` for `aqBlend`).

## Optimized spot pattern (2026-10-13)

Nathan: on a 90° pie corner tank he wanted one puck toward the corner and one near each end of the arc; asked for an
"optimized" pattern for odd shapes given N lights. Spot Pattern "Optimized for the tank shape" (`pattern: 'fit'`):
`fitSpots(T, n)` in render/lighting.ts places `count` bulbs as a centroidal Voronoi layout of the footprint (Lloyd on a
48x48 sample grid, 5 deterministic farthest-point starts, lowest mean squared floor-to-nearest-bulb distance kept;
cached). Rows and Spacing hidden in this mode; Count goes to 12 here (6 otherwise; capped back when leaving it).
90° pie, r 600, N=3: one on the bisector 200 mm in from the corner, two ~180 mm out from the centre line near the arc
ends (cell centres, so inset from the glass rather than in the corners). Rect N=2 = quarter points. Shot
`shots/pie_fit3_top.jpg`. Tests test/lightfit.test.ts.

## Hardscape surface grit (2026-10-13)

Nathan: driftwood, caves and rocks looked too clean; wanted randomly generated knots, crevices and cracks.
- Per-pixel, in the hardscape shader (render/items.ts `GRIT`, run by `solidMaterial`): every solid geometry carries
  `aGrit` = (noise coordinates in mm, kind). Stone / arch: fine grain, blotches, pits and pocks (by roughness: river
  least, lava most), crack networks (cellular edges, masked so only some stretches show; seiryu most). Slate adds
  fissures along its layers. Wood: coordinates along the limb / around / radius, so grain streaks and splits run along
  the limb; knots (dark core, rings, grain bent round them) at random spots. Terracotta tube: clay grain, blotches,
  pale grit, pinholes. Coconut: fibres. Detail finer than a pixel fades out. Pattern shifted per seed.
- Geometry: wood limbs get 0-2 broken-off side-branch stubs with a dark ringed end (own rng, so limb shapes are unchanged).
- Fixed on the way: the lighting pass (`aqPatch`) replaced the hardscape material's own patch, so the bowl clip and the
  darker cut face were not applied under lighting; it now runs `userData.pre` first (program key gets 'h').
- Cost measured: about 2.6 ms more per frame for 11 pieces at 930x860 (frames are drawn on change only).

## Pie slice tank shape (2026-10-13)

Nathan asked for a "pie slice" aquarium (half round or 90° corner tank): set radius, height and degrees.
`shape: 'pie'`, `pieDeg` 45-180 (default 90; capped at 180 so the outline stays convex, which insideBy / clampIn rely on).
D = radius, L derived = chord 2r sin(θ/2) (normTank); apex at the back centre, arc toward the viewer, two flat panes
back to the apex (one back pane at 180°). UI: "Pie slice (corner / half round)" in Shape, Length hidden, Depth reads
Radius, Angle slider (type-in). Flat-ends rules apply (no hood, back wall only). Shots `shots/pie_{90,120,180}.png`.
- Same day (Nathan): wall placement **Corner** (`wall.side = 'corner'`, any shape): two walls at right angles, each 45°
  to the back, meeting behind the tank; `cornerWalls()` in scene/table.ts pushes each in to the gap off the outer glass
  (or table), so a 90° pie sits flush with its corner in the room corner. Orbit limit, person placement and the view map
  know both walls; not a peninsula (no back doors); background on the panes facing back.
- **Distance to wall** slider (`wall.gap`, mm, 0-1000, absent = the old 50; `wallGap()`), for every placement (behind,
  ends, corner). At least 1 mm in effect, so the background film (0.5 mm outside the glass) stays in front of the wall;
  the skirting board thins to fit a small gap. Shots `shots/corner_{gap50,gap0_top,gap300}.png`.
- Same day (Nathan): a pie slice's custom terrain is polar like a round tank's: `TerrainSettings.arc` (degrees) with
  `radial`; ring k = an arc of radius k/rows round the apex, pane to pane, `pieSegs(k, arc)` segments (ring 0 = the apex
  dot). Rings from the Grid slider at the same spacing as a rectangle ((cols-1) x D/L). `sameGrid()` resamples when the
  shape or angle changes. In a non-pie Tank B the slice is stretched to L x D. Shot `shots/pie_terrain_grid.png`.
  Fix after deploy (Nathan saw the old rectangular grid): a grid of the wrong kind is now resampled on load (validate;
  that part landed inside `bdcb3a8`, another chat's commit, shared checkout) and after every scene edit (store), so
  scenes saved before the change and terrain copied between tanks of different shapes are converted too.

## Light beam overlay (2026-10-13)

Nathan asked for a Lighting-tab toggle showing the light cones from height and beam angle, and an analog for the other
fixtures. `render.beams` (default off; older files off), checkbox "Show light beams" in Lighting (disabled for flat).
`addBeams` in render/lighting.ts: a faint solid per beam from the fixture to the tank floor at the HALF-STRENGTH angle =
middle of the shader's cone ramp (acos of the mean of the two cosines), so it matches the light model: spot = cone at
about half the printed beam angle; tube (line source) = a wedge along the tube with rounded ends (~81° half-angle in the
model); LED bar = one such wedge per row of emitters (outline of a row of identical cones, ~61°). Above the rim drawn
whole (light missing the tank shows), inside clipped at the glass (footprint planes; a bowl discards outside its sphere);
the substrate hides the rest, leaving the footprint. Note: a raised tube's model beam is very wide, so its overlay is a
big sheet above the rim; that is the model, not the overlay (tube cone [0.45, -0.15] may be worth narrowing later).
- Same day, made a working view for placing lights (Nathan: "turned on, lighting tweaked, then turned off, so it doesn't
  have to be subtle"). Checkbox now "Light map". The tank holds **only its substrate** (no plants, hardscape, fish:
  `bare` in buildTank). Beams bold yellow above the rim (0.3), faint inside (0.1), drawn once as a union (stencil); no
  outline lines (Nathan asked them gone). The substrate shows a **physical light map** (`aqIrr` in the light shader):
  per emitter, beam profile at that angle x cos of incidence x inverse square distance (tube: inverse distance),
  summed; 1 = one standard 52° bulb 300 mm straight above a level surface (x beam gain x Brightness; an LED bar's
  emitters share four bulbs' output). False colour on a log scale, a step per doubling (1/16 navy ... 1 yellow ... 8
  white), faint contour per doubling, grain kept faintly; replaces lit colour and water haze. Legend under the checkbox
  (`lMapKey`). So a sloped or mounded substrate gives brighter, smaller, non-circular footprints where it rises toward
  a light. Shots `shots/lightmap_{angle,narrow_angle,narrow_top}.png`.
Open question (asked 2026-10-13): the bright patch on the room wall is the spill model (nearest point of the tank box,
extended UP TO THE FIXTURE), not a reflection; it should probably follow the actual beams instead.

## Aquascape Shuffle rolls a style (2026-10-13)

Nathan: with hardscape now easy to size and place, Shuffle should give much more diverse outcomes, dense vs sparse.
- `starterStyle(seed)` in scene/items.ts. **Seed 1 = the starter set as designed** (the default scene and "Start from"
  until the first Shuffle); any other seed rolls: density (sparse 0.3-0.6 / medium 0.8-1.2 / packed 1.5-2.4, a third
  each), scale 0.65-1.45, composition (centre, one side, two groups with a valley, thirds, 3-4 scattered groups),
  materials, and `wild` (pitch / roll of solid pieces).
- Per set: stones = one cluster per group in river / seiryu / dragon / lava / slate (slate stacks into ledges), some
  with plants at the foot; iwagumi = main stone + 0-9 satellites per group, any lean, carpet full / front only / patchy;
  driftwood = one piece per group (branch, spider, manzanita, mopani), epiphytes tied on its limbs, optional back row
  and carpet; planted = palette, back-row density, open-water gap placed by the composition, optional rock / wood
  accent; swamp = spacing and stone type. Sparse styles leave the carpet patchy.
- Tests: shuffles of each set must differ in piece count (>2.5x), materials and where the weight sits.
- Later the same day (Nathan: short plants in a neat front row, tall at the back "looks like a farm"): plants no longer
  go in rows. `scatter(weights, clumps, {d0, d1, gap, half})` drops clumps (stems 2-5, grass 2-4, sword 1-2, fern /
  anubias 1-2) at best-of-3 random spots; depth only sets the odds: each kind has a soft heat zone (anubias 0.2,
  fern 0.4, sword 0.5, stems / grass 0.8 of D, plus a 20 % floor so strays happen), the back fills more than the front,
  reachable height rises front to back, clumps keep off hardscape and mostly out of the open-water gap. Used by
  planted (rect; also the default seed 1), the driftwood background and iwagumi's back grass. Carpet = jittered grid
  with a ragged back edge. Planted keeps at least 0.6 density. Disc planted (spiral mound) and swamp unchanged.

## Male / female fish (2026-10-13; DEPLOYED `23633f2`)

Nathan asked for a male/female selector with matching shape, colouring and size, starting with the most dimorphic species.
- Batch 1 (done): betta, guppy, swordtail, dwarf gourami, honey gourami, cherry barb, kribensis, GBR, pearl gourami.
  species.json `female: {art, tl}`; the species itself is the male. Female plans = `her(male, overrides)` in fishgen.ts
  (data only, same generator + loft; keys `<art>_f`, also listed in `fish3d.species`). Adult lengths (male / female, mm):
  betta 65/55, guppy 35/50, swordtail 120 incl. sword/115, dwarf gourami 80/65, honey 45 (was 50)/50, cherry barb 50/50,
  kribensis 90/75, GBR 60/50, pearl 120/110.
- Code: `Fish.sex = 'f'` (absent = male); `speciesOf(f)` = the look a fish is drawn and sized with; `fishTL` is sex-aware;
  textures key on `Species.look` (`<id>` / `<id>~f`). Stocking list: a row per sex for dimorphic species (both shown
  while either has fish); Add starts a group 1 male : 2 females, a lone fish male. Selected fish: Sex switch (custom size
  keeps its share of adult). Preview tile: Male / Female toggle. "(male)" dropped from guppy / betta / swordtail names.
- Review sheets `shots/90_sexes_{A,B}.png` (`scripts/sex-sheet.py`; shot helper takes `sex`). Pass by my review; after
  the sheets the honey gourami female's stripe was softened and the swordtail female went 100 -> 115 mm (not re-shot).
- Pea puffer added 2026-10-13 (Nathan): `peapuffer` / `peapuffer_f`, 30 mm both, shoal; male = dark belly keel stripe +
  wrinkle lines behind the eye, female rounder and plainer. No pelvic fins, dorsal + anal small and far back, eye r .05
  up .3. AqAdvisor "Dwarf Puffer" 200909300063. Sheet `shots/91_peapuffer.png`.
- 2026-10-13 (Nathan): Add takes the sex highlighted on the preview tile's Male / Female toggle (button reads "Add males" /
  "Add females"; the whole start count is that sex); stocking rows show only the sexes present, named "Betta (male)" /
  "Betta (female)". Replaces the earlier 1 male : 2 females start and the always-both rows.
- Added 2026-10-13: celestial pearl danio `cpd` / `cpd_f` (25 mm, shoal; male blue with an orange belly and red fins
  barred black, female green-grey and plain) and marbled hatchetfish `hatchet` (35 mm, school, top; `back: 0.2` gives
  the straight back over a deep keel; marbled slanting bands = `poly` marks). AqAdvisor ids resolved. Sheet `shots/92_cpd_hatchet.png`.
- Batch 2 candidates (moderate dimorphism): platy and molly (female bigger, gravid spot; male platy ~45 / female ~60),
  Bolivian ram, bristlenose (male bristles: card only, not 3D yet), cherry shrimp (female more coloured, saddle).
  Male kribensis could get a pointed tail with ocelli and longer dorsal/anal (left as before).
- Note: other chats' commits 728dad9 / acdfd9c swept this change's renderer + panel edits in and pushed them before the
  data landed (main briefly did not build); 23633f2 completed it.

## Hardscape placement: yaw / pitch / roll, resize, free move, cut off by the glass (2026-10-12)

Nathan asked for yaw, pitch, roll and resizing of hardscape, free placement anywhere in the tank (pieces may pass through
each other), and pieces that go through the glass instead of stopping short, drawn cut off at the inner glass surface.
- `Item.pitch` (new, -90..90; older files 0); `tilt` is now roll, -180..180 (was -45..45). Euler (pitch, yaw, roll) 'YXZ'.
  A turned solid is raised so its lowest point sits where the unturned base did (`userData.rise` in `bakedShape`).
- Item panel: Size, Yaw, Pitch, Roll, Height (may go negative = sunk into the substrate, down to `LIFT_SINK` 0.5 H) and a
  Move pad (Left/Right, Up/Down, Forward/Back; 5 mm a click, hold repeats, Shift 1 mm). Keys: arrows = x / depth,
  Page Up/Down = height, + / - = size x1.1. A sideways step keeps the piece's height in the tank.
- Dragging a piece placed off any surface slides it level at its height; one on the ground / another piece slides over surfaces as before.
- Hardscape anchors clamp only to the glass itself (plants unchanged). `solidMaterial(T)` in render/items.ts: one clipping
  plane per footprint edge + the floor (all outlines convex), a bowl clips to its sphere in the shader; both sides drawn,
  back faces darkened so a cut piece reads solid. `renderer.localClippingEnabled` in viewer.ts.

## Bowl tank shape (2026-10-12; DEPLOYED: pushed to origin/main `84595e5`, merged with main's background sides / arc)

The local main in this shared folder was NOT fast-forwarded (other chats' uncommitted edits block it); `git pull --rebase` brings it in.
The bowl background uses `backgroundRuns` like a round tank (the arc slider shows for bowls).

Nathan asked for a globular tank: a sphere cut flat at the floor and at the opening, with the bowl, floor and opening
sizes adjustable. Built in a worktree because main holds other chats' WIP in the same files. Dev server: launch config `bowl` (port 5253).
- `shape: 'bowl'`, `bowlFloor` / `bowlTop` = diameters (mm), each 0.2..0.95 x L (default 0.6). D = L; H is DERIVED
  (sqrt(R²-rb²) + sqrt(R²-rt²)), so the Height input is locked. UI: "Floor ⌀" / "Opening ⌀" sliders, Diameter label.
  The user said "radius"; diameters chosen to match the existing Diameter field (easy to flip).
- Design: the footprint is the FLOOR DISC, so the substrate, items, terrain, stand and table work unchanged; everything that
  depends on height asks `bowlRadius(T, y)`: `clampFish` (fish within the sphere's circle at their height), `nearestGlass(T, x, d, y)`
  (glass snails on the sphere), `volumeBetween` (sphere slice: volume, weight, AqAdvisor),
  water surface + meniscus, substrate spread radially to meet the flaring glass. `bulge(T)` = equator past floor
  (halfWidth for the person, view map outline). Renderer `addBowl`: concentric shell t thick (28 bands + equator row,
  72 segments, back / front halves), background on the inside of the sphere facing the room wall, round bottom pane,
  outline at floor / opening / equator, glass lid = disc over the opening. No rim, hood or peninsula for a bowl.
- AqAdvisor (Nathan 2026-10-12): a bowl's area = halfway between the equator circle and the circle at the substrate
  line (mean ground height round the floor edge); box d = area / L, h = volume / area (volume kept).
- tsc, vite build clean; tests 138/138 (5 new). Checked in the browser straight on and from above.
  2026-10-12 later: glass snails, clinging fish and the snail drag plane tilt with the sphere (`glassFrame`: point on
  the glass at a height + 3D outward normal; deployed `f148646`). Not done: items near the floor edge sit on the
  unspread ground height; lighting spill uses the bounding-box ellipse (as round).
- 2026-10-12, aquascape spread in bowls: plants and hardscape had been clamped to the floor disc (footprint), so a
  layout piled into one ring at the middle. Now `clampItem(it, T, g)` takes the ground and, for a bowl, clamps to the
  sphere's circle at the ground height (`clampGround` / `groundInsideBy` in terrain.ts; a plant stays inside over its
  whole height). `starterItems` maps the L x D box onto the disc of ground (elliptical grid mapping) for round tanks
  and bowls instead of clamping, and in a bowl shortens rim plants to fit under the sphere (to half height at most).
  Carpet cards near the glass use the same ground-level edge. Terrain sculpting grid still spans only the floor disc.
  Then (Nathan: "now plants aren't generating in the center"): Planted on a disc (round tank or bowl) is its own
  arrangement, as the rows along the back glass became an arc round the rim with a bare middle: a sunflower-spiral
  mound of stems just behind the centre, swords / ferns / grass round it, anubias front sides, carpet front.

## NEXT (Nathan 2026-10-09, closing session 11): 3D sequence

Verdicts: alpha fix approved; pilot passed (geometry generation, NOT yet the final visual-quality test); generic 3D
architecture validated for rollout; head-on marking distortion is now a systematic problem: fix it before the full
rollout; the remaining 34 species are on hold until the merge and the mapping fix. QC list adds: the guppy's broad
tail becomes an edge-on sheet at extreme angles (acceptable for now).
Order, one work unit per chat:
1. DONE 2026-10-09 (session 12): `fix-canvas-alpha` merged into main (`1cd57d6`, local, not pushed). The other
   chats' uncommitted edits on main (middle-drag pan: `pointer.ts`, `viewer.ts`, `style.css`; round-tank spill:
   `lighting.ts`) were stashed for the merge and restored, still uncommitted. No textual overlap; tsc clean, tests 110/110.
2. DONE 2026-10-09 (session 12): the other chats' work committed first (`0ca1ac2` round-tank spill, `92cb931`
   middle-drag pan), then `audit-3d` merged (`5476b2e`): auto-merged, no conflicts (its alpha fix is the same
   change already on main, present once). tsc clean, tests 110/110. Visual spot check on the dev server, straight-on
   view of tiger barb, harlequin, clown loach, GBR, danio, dwarf gourami: all six draw in 3D, flank colours read like
   the cards, no white pectoral blades, no see-through. Main is local only, NOT pushed. Branches `fix-canvas-alpha`,
   `audit-3d` and their worktrees still exist (safe to delete).
3. BUILT 2026-10-09 (session 14; uncommitted, awaiting Nathan's verdict): head-on marking wrapping, generic. Where
   the body turns away from the side, the paint fades to a copy smeared LENGTHWISE (`bledTexture`, two box passes of
   `SMEAR` 0.08 W, then the old round blur) instead of only the round blur, and the fade starts earlier (`SIDE`
   |n.z| 0.45..0.9, was 0.3..0.75; shader uniform `uSide`). Bar contrast on the turned-away copy (row through the bars,
   luminance min..max): clown loach 84..165 -> 125..150, tiger barb 109..180 -> 150..157. Switch `fish3d.wrap` (off
   = before). Flank views unchanged. Tests 132/132.
   Shot helper updated: one tank, no hardscape, `crop: 'fit'` frames the fish by its projected box; `wrapViews`.
4. Verify it on discus, tiger barb, clown loach, harlequin (same four views): sheets `shots/61_<species>_sheet.png`
   (top row before, bottom after). Awaiting Nathan.
5. Roll 3D out to the remaining fish, flat cards kept as fallbacks until each passes review.
   STARTED 2026-10-09 (session 14; uncommitted). Lessons from sessions 9-11 collected in `shots/3d_lessons.md`
   (36 rules, rejected list, per-species recipe). Batch 1 = the 14 fish with body plans, data only (recipe: `thick`;
   bottom fish the cory / loach fields): ember .42, chili .42, rummynose .42, cherrybarb .4, platy .5, molly .5,
   swordtail .45, betta .45, honeygourami .32, bolivianram .36, kribensis .45 + belly .2, oscar .48, pandacory = bronze
   cory fields, sae .55 + belly .3. Sheets `shots/63_rollout_{A..D}.png` (card / 3D, same framing). All pass by my
   review; awaiting Nathan. A thinner `thick` was tried on eight and reverted: the round head-on look is the 15° of
   foreshortened length at 75°, not thickness (`shots/63_thick_tune.png`).
   Left (`shots/64_remaining.png`): neon + pearl gourami (hand-drawn, no Plan); shrimp; 4 snails; 5 amphibians.
   Nathan 2026-10-09: yes, neon + pearl gourami next, then the non-fish generators (shrimp, snails, amphibians).
   Batch 2 DONE (uncommitted): `PLANS.tetra` (neon) and `PLANS.gourami` (pearl) replace `drawTetra` / `drawGourami`
   (same as the angel: GEN_ART overrides FISH_ART; species `aspect` overrides removed, planMeta computes it). Built
   from the hand-drawn coordinates; zigzag lateral line = a `poly` mark from the new `zigzag()` helper (data, no new
   Mark kind). Sheets `shots/65_handdrawn_vs_plan.png`, `shots/65_rollout_E.png`: both pass by my review.
   `drawTetra` / `drawGourami` are now unused (kept until Nathan approves).
   Shrimp DONE (uncommitted): three generic Plan fields, reusable by any drawn body: `outline` (closed side polygon
   replaces the parametric profile: `outlineProfile`), `pectoral: false`, `limbs` (tapered tubes on both flanks from
   a surface point along a quadratic curve: `limbMeshes` in fish3d). `SHRIMP_PLANS` built from `SHRIMP_OUTLINE`
   (shared with the card drawing); `bodyPlan(art)` = PLANS ?? SHRIMP_PLANS, used by has3D / fishBody / the card cut.
   `drawShrimp` skips legs + antennae when `style.paired` is off and the eye when `features` is off. Shrimp: thick .6,
   eye u .835 r .022, 5 walking legs + 4 swimmerets + 2 antennae per side. Sheet `shots/66_shrimp.png`: pass by my
   review; watch item: legs fan like a comb head-on.
   Snails DONE on the floor (uncommitted): `render/snail3d.ts`, ONE shell generator for all four (logarithmic spiral:
   aperture ellipse swept round the coil axis, `grow` per turn, `drop` = spire slide). Data `SHELL3D` in
   `art/snails.ts` (turns, grow, drop, ap, axis, size, tall, at, foot, tent, mark). Placement is generic: the shell is
   turned so the aperture opens down onto the foot, then spun so the spire points nearest `axis`; scaled to fit the
   card's shell length AND height (`size`, `tall`). Paint follows the coil (uv = along the coil, around the whorl):
   `axial` zebra (nerite), `spiral` bands (mystery), `growth` lines (ramshorn), `spots` (trumpet). Foot = flat-soled
   half ellipsoid, tentacles = `taperTube` (shared with the shrimp legs, exported from fish3d). The card stays as the
   invisible picking target (`HIDDEN` material in build.ts), 3D body is its child; floor snails now get a contact
   shadow. Glass snails still use the two flat cards. Rules learned: whorls touch only if `ap[1]` >=
   drop*(1-1/grow)/(1+1/grow) (the trumpet was a corkscrew at 0.55); a nerite is a fast-growing coil with its axis
   sideways, not a short cone. Sheet `shots/70_snails.png`: all four pass by my review; watch item: the mystery's
   spire sits low at the back (card: on top) and its aperture lip shows as a pale notch at 50°.
   Amphibians DONE 2026-10-13 (committed, not pushed; awaiting Nathan's verdict): `render/herp3d.ts`, ONE limbed-body
   generator for all five, data `HERP3D` in `art/herps.ts` (frogs share `frog3D`, newt + axolotl share `sal3D`).
   Body lofted from the card's own side outline (`FROG_TORSO` / `salSide`, now shared with the card painter) with a
   half-width table `wid`; paint laid out ROUND the body (u along, a = 0 back midline .. 1 belly midline, mirrored), so
   marks are data (`band` / `spots` / `line`) and stay put from above. Legs = Catmull-Rom tubes through jointed points
   (`Limb3D`), toes to tips on the ground, round pads (tree frog); limb spots box-mapped on the CPU (the lighting
   patch replaces onBeforeCompile, so no shader tricks on fish materials). Eyes = domes on the surface looking out
   sideways (pupil round / horizontal slit / all dark). Axolotl: tail-fin membranes on the midline + gill stalks with
   filament fringes. The card is the invisible picking target (`HIDDEN`), as the snails. Sheets
   `shots/81_frogs_v2.png`, `shots/81_sals_v2.png` (v1 = `80_*`: eyes looked at the sky, toad red too high).
   Watch items: frog thighs read as tubes (card: a big oval); the far eye shows as a lid bump at 50°.
   Sheet script used: a 30-line PIL card/3D grid (scratchpad, not in the repo).
   NOTE: `src/render/items.ts` is modified by another chat (not this work).
   Shot helper: `cardViews` (card at the 3D shot's framing), warm-up render instead of a timer (hidden tabs throttle
   timers), several tabs on one dev server run species in parallel.

## Hardscape system: roadmap steps 3 + 4 built (2026-10-09, session 13; committed and pushed, checked in the browser)

Nathan chose hardscape ahead of 3D fish steps 3-5 (those stay pending, order unchanged). Scene **v9**.
- **Items** (`types.ts` `Item`): `{id, kind: stone|wood|cave|plant, variant, seed, x, depth, lift, yaw, tilt, size}`.
  `lift` = base above the ground under (x, depth) (0 = on the substrate); `size` = length (stone, wood, cave),
  height (plant, manzanita), width (carpet patch). Shapes come from (variant, seed, size); files hold no meshes.
- **Library** (`scene/items.ts` `LIBRARY`, 19 variants): stones river / seiryu / dragon / lava / slate; wood branch /
  spider / manzanita / mopani; caves stone arch / clay tube / coconut; plants = the 7 existing card types (fern,
  anubias, sword, grass, stem, stemred, carpet patch). Pure skeletons (`stoneDims`, `woodLimbs`, `itemDims`) shared
  by renderer and starter code. Meshes: `render/items.ts`, one mesh per item, light baked per turn (cached by
  variant|seed|size|yaw|tilt), plants still crossed cards (3D plants = step 5).
- **Layouts became starter sets**: the Aquascape select ("Start from") replaces all items with that set's pieces
  (undoable), Shuffle = same set, new seed. `layout.id` is kept as the set started from; 'swamp' still shapes land.
  The old driftwood layout is now one `branch` piece with ferns / anubias tied on (raised by `lift`).
  `render/layouts.ts` deleted; `LAYOUTS` moved to `scene/items.ts`.
- **Migration**: a pre-v9 file (no `items`) gets `starterItems()` of its layout, so it looks much as before.
- **Editing**: library buttons add a piece at an open spot (all ticked tanks, shared id + seed). Click selects
  (`store.selItem`, exclusive with the fish `selId`; blue bounding box). Drag: the grabbed point stays under the
  pointer and the base slides over the ground and other pieces (`surfaceHit` + `supportLift` in `pointer.ts`), so
  pieces stack; pieces resting on the dragged one ride along. Shift + wheel or R turns 15°. Panel: size, turn, lean,
  raised, New shape (reseed), Drop, Duplicate (Ctrl+D), Delete (Del), Remove all. Picking: nearest fish or solid
  piece; plants only when nothing else is under the pointer. Tank resize keeps pieces at the same relative spot
  (`rescaleTank`), sizes physical. Split diff: "Aquascape A/B" by variant counts, "Arrangement" by relative spots.
- Tests 127/127 (`test/items.test.ts` new; `split.test.ts` resizes with `rescaleTank` now). Browser-checked
  (other chat's server on 5173; this chat could not start its own, 5-server cap): all 12 solid variants render,
  stacking and riders work, driftwood starter OK, no console errors. The shared browser scene was restored after.
- **Open / for Nathan's look**: visual quality of each generator (dragon stone pits read weakly at small sizes;
  wood end caps look light); no collision between pieces (they can overlap); fish ignore rocks (a bottom dweller can
  sit inside a stone); tank weight ignores rocks.

## Muse UX feedback fixes (2026-10-09; uncommitted, checked on the dev server)

- Fish readout: calibration rows (px, measured ratio, d/(d+z), angle off side-on) only with `?debug` in the URL;
  normal users see name, size, depth and "Looks, vs. at the front glass: N % as big".
- Area labels: the canvas header says "288 in² floor" (interior); the Tank panel says "footprint 24.4″ × 12.2″
  outside the glass (298 sq in)". Muse read the two unlabelled numbers as a maths error.
- "New" asks for confirmation when either tank has animals.
- Species rows: name + tag and size on line one, the Latin name on its own line, no wrap, ellipsis.
- First visit (`tanklook.seen` not in localStorage) opens "How to use".
- Still open from that feedback: tick Enforce HTTPS (Pages settings, Nathan; http:// still serves 200 with no
  redirect); shareable scene URLs; a real mobile check.

## HTTPS live (2026-10-09)

The Pages certificate had never been issued (the site served GitHub's `*.github.io` cert, so browsers showed a privacy
error). Provisioning ran from Settings -> Pages once the custom domain was (re)checked; tanklook.com now
serves a Let's Encrypt cert for `tanklook.com` + `www.tanklook.com`. Remaining: tick Enforce HTTPS once GitHub enables it.

## Stocking list replaces per-fish chips (2026-10-09, Nathan; uncommitted, checked on the dev server)

Nathan: no need to pick and place single fish; manage stocking by species and let the shuffle rules place them.
The Fish section's chip per animal is gone; `#list` is one row per species (order of arrival): name, −, a count
box, +. Add puts the picked species on the list (6 for a `group` species, else 1; already listed = a hint to use +).
− from 1 or typing 0 takes the species off; re-adding goes through Add. "Add school ×" removed. Each count change
(`setCount` in `panels.ts`, coalesced into one undo step per burst) adds or removes that species' last animals
and re-places **only that species** with `shuffleFish(s, r, only)` (new param: everyone else stays put and is kept
clear of). Shuffle still moves everyone. Canvas click / drag / the selected-fish controls are unchanged.
Test: `scatter.test.ts` "moves only that species" (134/134).
Possible next (Nathan's "gates and heatmaps"): per-species placement maps (e.g. near plants / caves, shade), today
it is only `level` bands, `zone` bottom and school / shoal shapes.

## Shuffle button (2026-10-09, Nathan; uncommitted, not yet checked in the browser)

"Shuffle" in the Fish section (next to Delete all) moves every animal to a fresh spot and pose, "a new slice in time";
one undo step, the same seed in every ticked split view. Ids, species, sizes kept. Rules (`src/scene/scatter.ts`
`shuffleFish`, which now also owns `randomPose` / `placeOnLand`): bottom dwellers on the ground, land / amphibious
animals via `placeOnLand`, snails via `spawnSnail` (floor or glass); swimmers in a band of the free water by the new
species field `level` ('top' 0.65-0.98, mid 0.2-0.8, 'low' 0.02-0.4); 3+ of a species with `group` 'school' form a
tight aligned school (heading ±12°), 'shoal' a loose group 2.2× wider (70 % follow the heading); big groups sometimes
split in two; everyone else is spread apart (best of 8 candidates). Data: school = neon, cardinal, ember, rummynose,
harlequin, chili, danio, tiger barb; shoal = cherry barb, livebearers, angel, discus, goldfish, corys, oto, kuhli,
clown loach, both shrimps; top = betta, the gouramis, guppy; low = cherry barb, GBR, Bolivian ram, kribensis.
Tests `test/scatter.test.ts` (117/117 total).

## Species preview tile (2026-10-09, Nathan; committed, ships in the next deploy)

Clicking a species in the Fish picker opens a tile under the list with its painted card (`drawFishCard`, or the
snail's side card), name, adult size, tag and note; clicking another swaps it, × closes it until the next click.
Canvases are cached per species (640 px wide). `panels.ts` `showPreview`,
markup `#spPreview` in index.html, `.spCard` / `.spHide` in style.css. Tests 114/114.
2026-10-09 (Nathan: "make the title cards 3D, orbit them before placing"; uncommitted, checked on the dev server):
the tile now shows the tank's own model (card + `fishBody`, or `snailBody`; flat card for species without 3D) on a
second small WebGLRenderer, `render/preview3d.ts` `SpeciesPreview`. Drag to turn (pitch clamped ±77°), double-click
resets to the 3/4 start view. Rendered on demand only; uses the flat-light key and no water tint (the shared `LU`
uniforms are swapped for its draw and restored). Framing fits 85 % of the bounding sphere, so it never rezooms while
turning. Tile 170 px tall in 3D. No WebGL: falls back to the 2D card. Tests 134/134.

## Deployed 2026-10-09: build 63 (`e721433`), everything on main incl. the 3D pilot, Edit boxes, cabinet doors

**Version number:** the sidebar header shows "build N" (N = commit count on main, from `scripts/build-info.mjs` via
Vite `define`; CI checks out full history for it); hover shows date + commit. It rises by itself with every push.

## Split view: per-view "Edit" boxes (2026-10-09, Nathan; committed `80379ef`, deployed in build 63)

Replaces "click a view to choose which tank the panel edits". Each split view's tab has an **Edit** checkbox; the
panel's changes go to every ticked tank (one undo step). After a split only B is ticked (as before); at least one box
stays ticked (the last one is disabled). Store: `editOn` (UI state, not saved), `targets`, `isEditing(i)`,
`setEditing(i, on)`, `edit()` loops over targets, `editTank(i)` for direct drags, `cam(fn, i?)`, `nextId()` (one id
free in every tank, so an added fish shares its id and the selection covers both). `scene.active` = the ticked tank
the panel SHOWS; pressing in a ticked view shows it. An unticked view only orbits / zooms / pans (no fish or terrain
drags). Dragging a fish or terrain dot changes only that view's tank. Tank size / shape writes are per-tank (only the
changed dimension is copied); adds use one seeded RNG so both tanks get the same placement. A ticked view's tab
(card) gets the blue border; the viewport itself is not framed (Nathan 2026-10-09). **Panel rule (Nathan 2026-10-09, later):** split, the panel is open exactly while a box
is ticked: unticking the last box closes the panel, ticking one opens it, closing the panel unticks all, the
"› Edit" button re-ticks the tank last shown. `targets` may be empty when split (a single tank is always [0]);
`store.clearEditing()`; panels.ts `keepRule` enforces it after split / undo / load and at startup. Tests 114/114 (split.test updated + 4 new). Checked on dev-5 (port 5243, new in
launch.json): boxes, frames, message, lid / length edits to B only, both, A only; fish add to both.

## Status (2026-10-09, session 11c: alpha fix on `fix-canvas-alpha`; 8-species pilot on `audit-3d`; neither merged)

Nathan 2026-10-09: four fixes accepted; fix the canvas compositing first, kept separate; then an 8-species pilot
(danio, male guppy, dwarf gourami, German blue ram = `gbr`, harlequin, oto, clown loach, goldfish), four views vs
the card, acceptance: side silhouette not worse, 3/4 plausible, head-on recognisable, no egregious wrapping, no
lighting / transparency defects, no species code; record the configuration effort. Do NOT merge `audit-3d` into a
dirty main: reconcile `viewer.ts` / `lighting.ts` with the other chat's changes after it finishes, rerun tests, and
re-check the lighting visually. No more polish on tiger barb / angel / bristlenose. QC list: angel pelvic filaments
splay near head-on, angel dark upper-edge line, bars ringing heads near head-on. Backlog: sucker mouth + bristles as
reusable anatomical features.
- **Alpha fix** (worktree `../Glass-Box-alphafix`, branch `fix-canvas-alpha` = `3d4eb5c` + `49b713d`, launch config
  `alphafix` port 5233): `viewer.ts` only. Verified by reading the drawing buffer after a frame and decoding the
  exported PNG (`shots/_verify.js`): before 10,920 / 10,920 / 88,038 translucent pixels (blue water / frosted white /
  iwagumi stones: plant edges too), after 0 / 0 / 0 in both. Picture `shots/57_alpha_sheet.png` (each export over
  white and over the page colour: before they differ, after identical). Tests 110/110. Ready to merge into main
  once the other chat's `viewer.ts` edit is in (same function; small conflict expected).
- **Pilot** (`audit-3d` `aa68521`): all 8 passed on the FIRST data-only pass: one line each (`thick`; oto also
  `belly 0.8, wide 0.4, noseW 0.5, eye.up 0.3`; clown loach `belly 0.4`), no tuning round, no new code. Sheets
  `shots/58_pilot_A.png` (harlequin, danio, guppy, gourami), `58_pilot_B.png` (GBR, goldfish, oto, clown loach),
  `58_guppy_sheet.png`. Watch items: head-on wrapping of the GBR eye bar, clown loach bars, danio stripes and the
  harlequin patch (same QC item as above); goldfish reads ball-like at 50° (the card is a fancy goldfish, not the
  common one Nathan named). Effort: configuration is minutes per species; the real cost is the four-view review.

## Status (2026-10-09, session 11b: four generic 3D fixes built on branch `audit-3d`, NOT merged)

**Nathan's decisions (2026-10-09, on the audit):** general 3D approach approved. Verdicts: tiger barb pass, kuhli pass
(most important: a radically different length/depth ratio with no special generator), bristlenose conditional
(geometry works; head, eyes, mouth, bristles not pleco enough yet), angelfish needs revision (round body lost the
identity). Do the four generic fixes before any rollout; add the straight-sided outline NOW and redo the angel (target
= the hand-drawn silhouette; angular but with some convexity, narrow peduncle, data-driven, not an angel exception).
Do NOT merge `audit-3d` or mass-convert yet. After the fixes: a production PILOT of 6-8 species spanning body plans,
then the full rollout; flat cards stay as the fallback until each 3D model passes its visual review.
Pre-release checklist item: bars ringing the head at extreme angles (tiger barb, angel). Later: reusable anatomical
features (ventral sucker mouth, snout bristles) for the bristlenose, not a reason to drop the generic geometry.

Built (worktree `../Glass-Box-audit3d` on branch `audit-3d`, commit `1e34b03`; launch config `audit3d`, port 5223;
pictures in that worktree's `shots/`: `55_tigerbarb_lighting.png`, `56_angel_sheet.png`, `56_bristlenose_sheet.png`,
`56_angel_card.png`). Tests 110/110, tsc clean.
1. **Lighting** (`lighting.ts`): fish facing is measured against the flank facing the viewer (`aqFishFacing`, slope
   0.5 both ways), so a side view equals the card under the reference flat light; the old fish "roll-off" boosted
   darks up to 1.7x (that, not the key, washed out the pleco) and is now a shoulder above 0.6; fish saturation = card
   (1.35). Tiger barb flank luminance: card 143, 3D before 161, now 142.
2. **Pectorals**: the "white blades" were a RENDERER bug: the canvas has alpha, and alpha-to-coverage fins wrote
   alpha < 1, so the page (on screen) or the PNG viewer's background (white) showed through every translucent fin,
   cards included. Fix in `viewer.ts`: alpha writes off while the scene draws. Also pectoral tint 35% toward the
   flank colour, softer spine. Candidate to cherry-pick to main on its own (affects live cards' fins too).
3. **Outline**: `Plan.angular` 0..1 (straight lines from peduncle and nose, smooth-min apex), fin shape `swept`
   (straight-edged sails), `pelvic.angle` (thread steepness). Angel: `angular 0.8, peak 0.375`, swept dorsal/anal,
   filament at 68°. Card now close to the hand-drawn one (`56_angel_card.png`).
4. **Eyes**: `Plan.eye.up` 0..1 turns the 3D eye along the section from the flank toward the top of the head
   (`EYE_TOP` 0.5 rad); bristlenose 0.7.
Next: Nathan reviews the three sheets; then the pilot (6-8 species).

## Status (2026-10-09, session 11: species audit (d) done; awaiting Nathan's call on the open points)

Dev server `dev-4` (port 5213) added: other chats held 5173/5183/5193. Card sheets: `scripts/card-sheet.js`
(`sheet(name, ids)`, before = pre-3D art modules copied from `de92c7f` into `shots/_art_before/`, after = `src/art`).
Stress-test sheets: rows card / 3D, same four views. Pictures: `shots/50_cards_{a,b,armour}.png`,
`shots/52_{tigerbarb,bristlenose}_sheet.png`, `shots/54_{angel,kuhli}_sheet.png`, `shots/54_angel_kuhli_card.png`.
Gotcha: the browser pane is 0×0 while hidden, so `exportPNG` fails; `resize_window` 1280×800 first. Bottom fish
leave the frame at high zoom: use zoom 2-2.6, `mult: 4`, small `crop`.
- **1. Card regressions from the paint pass (21 species checked, incl. hand-drawn neon / gourami / angel, shrimp,
  frog):** eyes, patterns, silhouettes and fins all intact. Changes are the intended ones (scale net, tone mottling,
  mouth line). One real regression, fixed ON MAIN: armoured catfish (panda cory, bristlenose, oto) got a fish-scale
  net; now `plates: true`. Minor, not changed: danio stripes slightly muted by the tone multiply; black molly shows the
  scale net strongly.
- **2. 3D stress tests: the loft generalises; the gaps are plan vocabulary + two generic rendering issues.** Species-
  specific CODE needed: none for any of the four (no `if species`). Per species (branch `audit-3d`, not on main):
  - tiger barb (ordinary): `thick: 0.38` only. Convincing.
  - kuhli: `thick: 0.85` + one generic fix ON MAIN: pectoral length capped at 0.75 × body depth (changes only kuhli;
    it had tetra-sized "wings"). Convincing as a striped tube.
  - bristlenose: `thick 1.3, belly 1, wide 0.6, noseW 0.8` (fields from the cory). Shape reads as a flat-bellied
    pleco. Open: eyes sit on the flanks (plecos: on top of the head; needs a generic eye-elevation field); bristles
    and sucker mouth are not 3D (would be species features = new code); paler than its card (see lighting below).
  - angelfish: hand-drawn, so it needed a full Plan (data; replaces the hand-drawn card with generated art) + one new
    generic fin shape `swept`. Loft handles the tall compressed body well. But the generated card is WORSE than the
    hand-drawn one: body is a disc, not the angel's diamond (`profile` can only make convex curves; needs a generic
    straight-flank option), fins still rounder than the hand sails.
  - Generic issues seen on all: (a) the flat-light key in fish mode (`lighting.ts`, `1 + 0.6 n·L`) brightens the
    3D flank ~1.2× and an up-facing back ~1.55× vs the card, so dark, broad-backed fish wash out (bristlenose);
    (b) 3D pectorals read as bright white blades (tiger barb, angel). (c) Bars still ring the head near head-on
    (soft, known).
- **Recommendation:** expand 3D to all species (step 2), after a short generic list: eye elevation, straight-flank
  profile option, key-light normalised to the flank, pectoral brightness. Keep angel hand-drawn (no 3D) until the
  profile option exists.

## Status (2026-10-09, session 10: 3D fish (a) markings + (b) cory shape built, committed, NOT pushed; awaiting Nathan's review)

Deployed first: the other chat's spot-light / size-label commit `305e490` only (pushed `305e490:main`; live on http and
github.io; HTTPS tanklook.com did not connect from here). The 3D fish commits stay local until Nathan approves.
Pictures (same four views, LEFT before = session 9, RIGHT after): `shots/48_discus_sheet.png`, `shots/49_cory_sheet.png`;
cardinal unchanged `shots/48_cardinal_*`. Toggle `__gb.fish3d.fade` (off = session-9 look, for pictures).
- **(a) Discus "eye-bar ring": root cause was the CARD, not the body texture.** The card's painted body rim (outline +
  bar) stuck out past the solid and read as a dark hoop at the head seen at an angle. Fix (all 3D species): the card of
  a 3D fish is cut out (`drawFishCard(..., hollow)`), past the outline where no median fin is rooted, 0.012 inside it
  at the dorsal / anal / adipose / tail roots. Needed `ctx.save/restore` round the art (an art leaves a clip set).
- Also general: on the 3D body, paint fades to a blurred copy (`PLAIN_BLUR` 0.03 W) where the surface turns away from
  the side (`aSide` = |n.z| attribute) and, mildly, where it is seen edge-on (shader, `uPlain`, program key 'p'). Colour
  fields stay (cardinal red holds), narrow bars and bands go soft. A faint far-flank arc remains near head-on (real).
- **(b) Cory**: new optional Plan fields, generic for the audit's stress tests (pleco, kuhli): `belly` (boxier lower
  half), `wide` (section widest low +), `pedT` (thickness at peduncle), `step` (head narrower than trunk from the gill
  cover), `noseW` (thickness kept to the snout: shovel). Cory: 0.9 / 0.5 / 0.28 / 0.18 / 0.4. Surface lookup is now
  numeric (`ringPt`, `thetaAt`, `normalAt`), so eyes and fins follow any section shape. 3D barbels: two tapering pairs
  per side (`barbelMeshes`, from `Plan.barbels`); the card / body texture no longer paints barbels for 3D fish.
  Not done (time-box): cory-specific dorsal (spine), stronger head step, side-profile changes.
- **Review pictures tooling**: dev-only `/__shot` endpoint (`scripts/shots-plugin.mjs`, in vite.config) saves PNGs to
  `shots/`; `scripts/shot-helpers.js` (`views(prefix, species, {zoom, crop, dist, mult})`) shoots the four views
  before/after, crop centred on the fish. Third dev server `dev-3` (port 5193) in launch.json.
- **Next (agreed):** Nathan reviews the two sheets; then (d) the audit: 1. card regressions from the global paint
  changes; 2. (more important) kuhli loach, bristlenose pleco, angelfish in 3D with as little species code as possible.

## AqAdvisor stocking level (2026-10-09, separate chat; LIVE with the proxy)

**State (2026-10-09):** proxy deployed on Nathan's personal Cloudflare (nathangoughreed@gmail.com, workers.dev subdomain
`tanklook`): https://tanklook-aq.tanklook.workers.dev, URL in `.env.production`. Redeploy: `npx wrangler deploy` in
`worker/` (wrangler login done on this PC). Nathan 2026-10-09: the % shows in the size label above the tank
("24 × 12 × 12″, 15 gallons, 288 in² | Stocking 72% (AqAdvisor)", red over 100 %, click = AqAdvisor's full report) and
updates by itself 1 s after the stocking or size settles (no Check button); single-tank view only (split tabs show
differences). Fish panel keeps a readout + "Not counted" note. Panel sections start collapsed on every load.
Same push shipped the approved 3D fish (`f77f791`, `66c69af`). Nathan's fish review (2026-10-09): discus pass, cory
pass for this iteration (still smooth / egg-shaped head-on, weak head-trunk step, generic dorsal; stop there);
**next work unit = the species audit** (kuhli, bristlenose, angelfish + one ordinary species, same multi-angle sheets).
- **Outage #3 (2026-10-09, two tanks refreshed close together) and gates.** Measured right after: AqAdvisor answers a
  stocking calc in 0.23-0.33 s whatever the species count (2, 6, 15 species), and 6 requests in ~4 min (two ~30 s
  apart) did nothing to it. So two requests are NOT heavy load; most likely the site (shared Apache/PHP host) is flaky
  on its own or its host throttles bursts from Cloudflare IPs (first probe after the outage hung 6 s at connect, the next
  was fine). Not proven; the worker now logs every upstream call (Workers Logs, `[observability]`) so the next outage
  has evidence. Gates: worker breaker (any failure -> KV `breaker:down`, no upstream calls for 10 min, cached answers
  still served, page shows "AqAdvisor is resting"); responses carry `cached: true`; the page sends one request at a
  time and waits 30 s after any uncached answer (`fetchStocking` queue; the label shows "Stocking: queued, ~N s" counting down). Proxy limit stays 2 a minute, plus a cap of
  200 fresh requests a UTC day (KV counter `day:<date>`). Deployed 2026-10-09 (version 70dcde85).
- **Outage #4 (2026-10-09 ~19:22 UTC):** site down for everyone (no answer from Nathan's PC either) after only 6
  proxy calls all day; points away from our traffic. **Uptime log** (Nathan: find out what brings it down, without load
  testing): worker cron HEADs aqadvisor.com every 5 min (`checkHealth`), and every upstream stocking call is logged;
  both in KV per day (`health:<date>`, `calls:<date>`, 30 days), served at `/log?days=N`. Summary:
  `node scripts/aq-health.mjs [days]` prints uptime %, each outage with its length and our calls in the hour before.
  Read it after a day or two before changing the gates.
- **Species policy (Nathan 2026-10-09), applies to every future species addition:**
  1. Choose which fish to add next from AqAdvisor's published most-popular list (location not found yet: not linked
     from the calculator, its articles or the report page; ask Nathan for the URL).
  2. Prefer species that are on AqAdvisor; add each new one's AqAdvisor name to `NAMES` in `scripts/aqadvisor-ids.py`
     and rerun it (only new / changed names are requested).
  3. Species not on AqAdvisor: count them as a similar fish in size and type (`STAND_INS` in the same script, flagged
     `standIn`; the Fish panel says "counted as a similar fish"). Now: axolotl = Dojo Loach, fire-bellied newt = Zebra
     Loach, fire-bellied toad = White Cloud Mountain Minnow. Land-only animals (dart frog, White's tree frog) stay
     uncounted.
- AqAdvisor has no API but its form is a stateless GET: `AlreadySelected=<id>:<n>::,...` + tank in inches +
  `FormSubmit=Update` returns "Your aquarium stocking level is N%". Filter choice doesn't change the %. http only, no
  CORS -> needs a proxy. No robots.txt (404).
- `src/data/aqadvisor.json`: 37 TankLook species -> AqAdvisor ids (all aquatic species; the 5 herps aren't in
  AqAdvisor and show as "Not counted"). Rebuilt by `scripts/aqadvisor-ids.py`. Choices: rummy-nose = H. bleheri,
  betta = male, goldfish = fancy, cherry shrimp = Red Cherry (N. heteropoda), nerite = zebra.
- `src/data/aqadvisor.ts`: request per tank (non-rect tanks: depth = floor area / length, so bottom area and volume match the real tank; Nathan: stocking goes by bottom area),
  link URL, `fetchStocking`. Proxy URL from `VITE_AQ_PROXY` (unset = link only, the current production state).
- `worker/aqadvisor-proxy.js`: Cloudflare Worker, only accepts well-formed `/stocking` requests, CORS for tanklook.com
  + localhost, 7-day cache. `worker/dev.mjs` runs it locally (launch configs `aq-proxy` + `dev-aq`, port 5203, with
  `.env.aq.local`). Deploy steps: `worker/README.md` (needs Nathan's own Cloudflare account; Claude can't create it).
- UI: Fish section, "Stocking  [Check]  AqAdvisor ↗"; result "72% (per AqAdvisor)", red with ", overstocked" over
  100 %. Verified in the browser: default tank 72 %, same as aqadvisor.com for the same link. Tests 110/110, tsc clean.

## Status (2026-10-09, session 9: 3D fish style test built, NOT committed; awaiting Nathan's verdict)

Roadmap step 1. Started late in the weekly window by Nathan's choice. `npm test` 104/104, `tsc` clean, checked in the browser
(dev server `dev-alt`, port 5183). Pictures: `shots/46_{discus,cardinal,bronzecory}_sheet.png` (before/after; straight on,
50° right, 25° above, 75° near head-on).
- **`src/render/fish3d.ts`** (new): a solid body lofted from `profile(plan)` (now exported from fishgen) between `pedU` and
  the nose: 40 stations (denser at the nose) × 28-point superellipse rings (exponent 2.4), with a capped peduncle.
  Thickness = `Plan.thick` (new optional field: max thickness / max depth; cardinal 0.42, discus 0.2, bronze cory 0.72)
  × depth, fuller toward the head. UVs = side projection of the existing card texture onto both flanks. Inset 0.006 W
  inside the painted outline, plus a colour-bled copy of the texture (opaque material), so the nose never shows the black
  of empty texels (seen on the first pass). Vertex colours darken the underside slightly. Geometry cached per
  species + bend (0.05 steps), `userData.keep`; material cached per texture.
- **Wiring** (build.ts): the body is a child of the existing card mesh, so the card stays as the fins (its painted body
  sits inside the solid) and picking, selection outline, rest offset and TL are unchanged. Only species in
  `fish3d.species` (the three above) with `thick` set; `fish3d.on` toggles (dev handle `__gb.fish3d`).
- Seen in the pictures: side view identical (as intended); the difference shows from 50° on and is clear near head-on
  (card goes edge-on, body keeps its volume). Artefacts: side projection stretches paint over the back and belly (cory's
  gill line becomes a crease over the top; discus bars wrap onto the front face); the far eye shows past the snout at
  50° on the thin discus; paired fins (pectoral, pelvic) are still painted on the flank, not 3D.
- Not done: bend shape check, a2c vs cutout check, performance with a school.

**Nathan's verdict (2026-10-09): "too cartoony... doesn't match how good and crisp the rest of the model displays."**
The 3D shape is not the problem; the procedural PAINTING is (flat saturated fills, blurred bands, no sheen / scales,
fins as tints). Picture `shots/47_cartoon_cues.png`. Decision pending: how to get realistic texture (see options in the
session 9 chat: photo textures on the 3D body vs a procedural realism pass vs bought models); this reopens the
art provenance policy.
Nathan 2026-10-09: NOT buying models; Meshy (AI image-to-3D) "seemed cool". **Proposed next work unit (fresh chat after the
weekly reset):** a head-to-head on cardinal, discus, bronze cory, same four views as `46_*_sheet`: (a) Meshy GLBs that
Nathan generates himself (Claude cannot make accounts; check Meshy's output licence per plan and that the reference
images are his or CC), loaded with GLTFLoader, scaled to adult TL, compressed by script (gltf-transform, no Blender),
water lighting via `aqPatch`; vs (b) CC-licensed photos (e.g. Wikimedia Commons, credited) projected onto the
session-9 loft. Ask Nathan before each download. Watch: fused or opaque fins in AI meshes; single-file size (about
10-20 MB for 42 Meshy fish vs 0.57 MB now; the website could load them on demand).

**Nathan 2026-10-09: "let's see how well we can refine the models without Meshy."** Realism pass done in session 9
(same three fish, sheets `shots/46_*_sheet.png` regenerated; uncommitted, tests 104/104):
- **Bug found:** the first 3D sheets were wrong. The loft's triangles were wound inward, so FrontSide culled the near
  flank and the pictures mostly showed the flat card. Fixed (`idx` order in `bodyGeometry`). Nathan's "too cartoony"
  verdict was on those broken pictures.
- Shader fish mode (`userData.fish` -> `uFish`, program key 'f'): facing = 1 + 0.6 n·L, Blinn highlight (x0.16), faint
  edge sheen, saturation 1.28, a soft roll-off instead of the hard max clamp (which erased form shading). In flat light
  (the default!) fish get a fixed key from above-front; without it the 3D body had no shading at all.
- Painting (affects every species' card too): eye with a shaded socket, faint rim, dim catchlight; tone multiply over
  markings (darker back / belly + mottling); scale net (`scales`, `Plan.scale`, default 0.024 W, discus 0.014);
  corydoras plates (`Plan.plates`); wavy bands (`band.wave`, discus); mouth line; fins at alpha 0.36 with a2c (cutout
  keeps 0.62; `fishTexture(id, edge)`).
- 3D body uses `fishBodyTexture` (painted with `style.features = false`: no eye / gill / mouth, which smeared over the
  curved head) with the nose tip blurred; real eyes = flattened domes along the surface normal, set in (`eyeSpot`).
- Nathan's review (2026-10-09): "materially closer... first real proof 3D fish can work". Discus best, cardinal good,
  bronze cory weakest (smooth blimp; needs ventral flattening, head structure, barbels, plated feel). Agreed order:
  (1) real fins, (2) contact shadow, (3) stretched markings, (4) species geometry (cory first).
- **(1) + (2) done:** pectoral + pelvic fins are their own membranes on both flanks (`pairedFins` / `drawPairedFin` in
  fishgen, `pairedFinTexture`, `finMeshes` in fish3d: rooted on the surface, pelvic swung 0.6 rad about the body axis,
  pectoral 0.75 rad about a vertical base + 0.25 down), with a dark leading spine; the 3D species' card and body texture
  leave them out (`style.paired`). Pectoral length 0.17 of the body (was 0.12; card too). Contact shadow for EVERY fish
  (build.ts `contactShadow`: soft ellipse on the ground, 0.5 x exp(-lift / 0.8 TL), widens with height). Cory plates
  kept off the back and belly (they ringed the body).
- Nathan's review of fins + shadow (2026-10-09): "credible low-complexity 3D aquarium assets"; remaining issues are
  species-specific polish, not viability. Cory improved most but is still weakest: head-on view too smooth / generic;
  wants a flatter belly, a less symmetric torpedo, a shovel-like head with a clearer head-to-trunk step, a more
  distinct peduncle, a cory-specific dorsal, and visible barbels. Cardinal: broadly convincing (slightly capsule-like
  head-on); don't spend more there yet. Discus: strongest; its eye-bar wrap is the most distracting texture issue.
  **Agreed order:** (a) stretched markings, (b) cory shape + barbels, (c) subtle cues (fin posture, tetra head), then
  (d) a quick audit of a representative subset of the other 34 species, to check the pipeline generalises
  (detail density, fin treatment, art that converts badly to 3D). Not a polish pass.
- **Nathan 2026-10-09 (session 10), plan refined:** validate the general method, don't build three beautiful exceptions.
  - (a) + (b) stay but are TIME-BOXED: fix the discus eye-bar wrap and reshape the cory, no further polish on either.
    Review = the same four views as `46_*_sheet` (straight on, 50° right, 25° above, 75° near head-on), before/after,
    so only those two changes show.
  - (c) subtle cues: deferred until after the audit.
  - (d) audit answers TWO separate questions:
    1. Regressions from the global paint changes on the other species' CARDS: eyes, patterns, scale texture, fin
       visibility, recognisable silhouettes.
    2. **(more important)** Does the 3D loft handle structurally different body plans? Stress tests: **kuhli loach**
       (eel-like), **bristlenose pleco** (flat-bellied, depressed, sucker mouth), **angelfish** (tall, laterally
       compressed, long fins; hand-drawn, may need a plan). Count the species-specific code each needs: convincing
       with little of it = the approach scales; lots of it = rethink parts of the architecture before step 2.
  - The audit's outcome decides: expand the 3D pipeline to all species, or rework the architecture.
- **Next: (3)** stretched markings: side projection smears where the surface turns away from the side (discus eye bar
  rings the head). Then (4) cory geometry. Not checked yet: the global paint changes on the other 34 species' cards.
- **Committed 2026-10-09 (session 10):** the other chat's spot-light pattern / spacing / beam angle and size label as
  `305e490` (split.test updated to the new label), session 9's 3D fish as `f77f791`. Not deployed. Tests 104/104.

**(superseded)** Nathan judges the direction. If yes: fixes for the artefacts above (eye and gill per flank instead of projected,
real pectoral fins), then roadmap step 2 (all 42 species, a `thick` per plan; hand-drawn neon / gourami / angel need plans
or their own loft).

## Status (2026-10-09, session 8: tank shapes phases 1 + 2 deployed `9286b85`)

Built on top of the uncommitted phase 1. `npm test` 104/104 (new `test/table.test.ts`), `tsc` and `vite build` clean,
checked in the browser (dev server `dev` on 5173), shots `shots/28_table_*`.
- **Stand style 'table'** with `stand.table { shape: 'rect' | 'round', L, D, x, z }` (mm; x, z = the tank's offset from
  the table centre, x right, z toward the back). Always present, kept while another style is chosen; older files get
  the default 36″ × 18″ top. No version bump (like `light.rows`).
- **`scene/table.ts`** (new): `fitTable` (run in `store.update` and on load) grows the top to hold the tank's rim
  outline (never shrinks), round keeps D = L, clamps the offset so the outline stays on the top; `tableRange` = slider
  limits; `roomBox` / `wallPlane` = tank glass ∪ table top, used by the wall (build), the orbit limit (`orbit.ts`), the
  person (wall check, and half-width taken from the table's edge too) and the view map.
- Renderer: top (32 mm) + apron set 50 mm in + four square legs (round: at the diagonals), finish colour. Camera
  framing includes the table's corners. View map draws the top under the tank.
- UI (Room): Table option; Rectangular / Round; length + depth (or diameter); tank left/right and front/back sliders;
  Centre / At the back / At the front buttons. Split diff lists table size and tank placement.
- **Deviation from the brief**: tank placement is sliders + buttons only, no drag-to-move mode (the brief allowed
  either). Add drag later if the sliders feel clumsy.
- Not checked: split view with two tables; PNG export with a table.

**NEXT:** roadmap step 1, the 3D fish style test (see "Roadmap (2026-10-09)" below). Tank shapes phase 3 (exact
lighting water path for shaped tanks, layouts tuned per shape) is still open; "layouts tuned per shape" folds into
roadmap step 3, where layouts become starter sets.

## Roadmap (2026-10-09, agreed with Nathan)

Nathan's goals: better-looking fish and plants; custom placement from a large library of hardscape (rock, caves,
wood) and plant species; more animals, including saltwater. **Static render only, still no animation.**

**Decision: fully 3D fish, built from the existing parametric body plan (`src/art/fishgen.ts`), not sourced models.**
- Performance is not a concern: about 2-4 k triangles per fish, so even a 200-fish tank stays under 1 M triangles. Build
  each species' geometry once, cache it and share it (InstancedMesh or a shared BufferGeometry); never regenerate it
  per rebuild (the scene rebuilds on every drag step). The `aqPatch` lighting (`onBeforeCompile` in
  `render/lighting.ts`) applies to any material, so 3D fish get the water lighting unchanged.
- Method: loft a body from the side profile with a width per station (add width to `Plan`); project the painted side
  texture onto both flanks; fins stay thin membranes (a2c, one alpha per fin). Nose-to-tail stays exactly adult TL.
  A static pose (curved body, tilt) becomes possible.
- Rejected: downloaded or bought glTF models (blocked by the art provenance policy, inconsistent style, the single file
  grows from about 0.57 MB to several MB, sourcing every species forever); AI-generated 3D (unclear rights, uneven
  quality).

**Reversal (Nathan 2026-10-09): custom hardscape and plant placement is now wanted** (replaces the 2026-10-08 call
"layouts are presets only").
- Scene items: each rock, wood, cave or plant carries `{kind, variant, seed, position, rotation, scale}`; pick and drag
  like fish, plus rotate and scale. Existing layouts become starter sets that place editable items. This needs a scene
  version bump plus a migration.
- Library = procedural generators with a seed, so variety costs no file size and needs no licence. Stones: seiryu,
  dragon stone, lava, river, slate. Wood: spider, manzanita, mopani, branch. Caves: stone arches, tubes, coconut.
- Plants become real 3D (leaf cards arranged along stems, per species: java fern, anubias, crypts, swords, vallisneria,
  stem plants, carpets), replacing the crossed cards.

**Saltwater last**, since it reuses both systems: a fresh or salt setting on each tank (filters the species list),
marine fish via the 3D generator, live rock and corals (branching, plate, mushroom, soft) as library items,
aragonite sand and clearer blue water presets.

**Order (one work unit per session):**
1. 3D fish style test: three fish, before/after pictures at the default 1200 mm, Nathan judges the direction.
2. Roll 3D out to all 42 species.
3. Placeable scene items + pick/drag/rotate/scale; layouts become starter sets.
4. Hardscape library.
5. 3D plant species.
6. Saltwater.

## Status (2026-10-08, session 7: tank shapes phase 1 built, NOT committed)

Spot-light grid committed as `fda7d88`. Then phase 1 of tank shapes (brief below), uncommitted, `npm test` 98/98,
`tsc` and `vite build` clean, checked in the browser (dev server `dev-alt` on 5183, since another chat held 5173):
- **Scene v8**: `Tank.shape?` 'rect' | 'bow' | 'round' | 'poly', `sides?` (3/5/6), `bowMin?`. A rectangle is stored
  as plain `{L, H, D}` (no shape key), so v7 files and rect tanks are unchanged. `normTank` enforces: round D = L,
  poly D = L x polyRatio(n), bow bowMin between max(20, D - L/2) (arc at most a half circle) and D.
- **`scene/shape.ts`** (new): footprint (walls = flat panes or one curved shell; ring; edges with outward normals),
  inside / insideBy / clampIn, nearestGlass + glassAt (point, smooth normal, arc length), offsetWalls / offsetRing
  (mitred, so rect outer glass is exactly (L+2t) x (D+2t)), clipToFootprint, chord, halfWidth, facingRuns.
  Polygons have a flat face toward the viewer (triangle: point to the back). Front-most point is at depth 0 on the
  centre line for every shape, so the camera / `dist` / orbit needed no change (answer 2).
- **Snails (answer 4)**: `Surface` is now 'floor' | 'glass'; a glass snail's (x, depth) IS its point on the glass
  (deviation from the brief's "wall index + arc length": same information, and no extra fields). v7 'front' etc.
  migrate to 'glass' with the coordinate snapped onto that pane. Rendered at nearestGlass, foot toward the local
  normal; dragging slides over the glass (the drag plane turns with it, so snails round curves and corners).
  spawnSnail weights floor area vs perimeter x wetted height.
- Renderer: panes from the outline (custom prisms, wound outward; EdgesGeometry at 20° so a curved shell shows no facet
  seams), bottom pane, rim rings, background on the glass facing the room wall (wraps round the back of round /
  angled tanks), wall + floor grid, water surface + meniscus, substrate grid clipped to the outline + skirt, terrain
  dots outside the outline hidden, cabinet = extruded outline with doors on the front-facing run (curved on a bow),
  frame stand = legs round the outline, hood warped to the bow, glass lid = one plate for non-rect, person half-width
  from the outline, view map draws the outline. Layout items clamped into the outline (non-rect only, so rect
  layouts are unchanged). Volume = area x H; weight masks the grid and uses outer-minus-inner ring for the glass
  (identical to the old rect formula, tested).
- UI: Shape select, Sides 3/5/6, bowfront End depth slider, labels Diameter / Width / Centre depth, Depth input locked
  for round / poly. Hood and peninsula end buttons disabled for round / poly; switching to those shapes turns a hood
  into a glass top and a peninsula into a back wall.
- Not done (by plan): lighting shader still uses the bounding box for the water path and spill (phase 3); table stand
  + tank placement (phase 2). Not checked: split view with two different shapes, PNG export of a shaped tank.

**NEXT:** Nathan reviews the shapes (`shots/27_*`), then commit + deploy; then phase 2 (table stand).

## Status (2026-10-08, session 6: split-view polish deployed `eee6334`; spot-light grid committed `fda7d88`)

Shipped in `eee6334`: panel collapse button outside the panel; locked views share one image window (equal tanks line
up); person framing from the card's real edges; stocking diff ignores the resize rescale; × on each difference makes
that tank match the other (`DiffItem[2]` = match fn); tab "× Close" hides the tab (☰ chip restores), "Delete" removes
the tank; one viewpoint map per view with its own hide/show; orbit cannot pass through the room wall
(`scene/orbit.ts`, 150 mm clearance, also enforced after edits and on lock); peninsula cabinets get back doors;
renamed "Vivarium Visualizer". After that (not yet committed): spot lights form a count × rows grid
(`light.rows` 1-4, default 1, no version bump). `npm test` 88/88.

**NEXT WORK UNIT: tank shapes + table stands** (Nathan 2026-10-08), ahead of land + semi-aquatic species below.

## Tank shapes + table stands (requested 2026-10-08; phase 1 built 2026-10-08 session 7, phases 2-3 not built)

Request: circular, regular triangle, pentagon, hexagon, bowfront ("model it as a rectangle but just have min and max
widths and have the tool do a smooth curve between them"); stand geometry for each; and a stand that is a table
(rectangular or circular) with the tank movable along its top.

Survey of rectangular assumptions done 2026-10-08 (Explore subagent): about 40 sites. Biggest risks: the glass pane
generator (build.ts addTank 35-78, five BoxGeometry panes), the substrate mesh (addSubstrate 279-315, quad grid +
4 side strips), snail `Surface` enum ('front'|'back'|'left'|'right', physics spawnSnail, build snailMeshes 398-424),
and the lighting shader's axis-aligned water box (lighting.ts uWater/uTankMin/Max, aqWaterPath).

Proposed design (for Nathan to confirm at the start of the work unit):
- **Scene v8** `tank.shape`: 'rect' | 'bow' | 'round' | 'poly' (+ `sides` 3/5/6, + `bowMin` = end depth for 'bow').
  Keep L/H/D as the BOUNDING BOX (bow: D = centre depth; round: L = D = diameter; poly: width across, D derived), so
  the heightfield (u = x/L, v = depth/D), camera, walls, orbit, diff and fish storage keep working.
- One new helper, `footprint(T)`: outline polygon (round ~64 segments, bow front ~32) plus inside / clamp-to-inset /
  area / perimeter. Everything else calls it: clampFish, nearestWater/Land/randomLand, fitFish, spawn, pointer drag,
  volume, tankWeight (mask the grid), water plane + meniscus, substrate (clip the grid to the outline, skirt along it),
  glass (extrude the outline ring; flat panes per edge, curved = one shell), rim, glass lid, view map (polygon),
  person half-width, stand footprint.
- Bowfront curve: back flat; front goes from `bowMin` at the ends to D at the centre along a smooth curve (circular
  arc through three points is the real-world shape; confirm).
- "Eye distance from the front glass" for non-rect shapes = from the front-most point of the outline.
- Hood: rect and bow only; other shapes get open top or glass lid. Peninsula end walls: rect and bow only (or: wall
  sits against the bounding box; confirm).
- Snails on glass: phase 1 only on flat panes of rect/bow/poly (Surface becomes pane index + position); round: floor
  only until curved-glass snails are built.
- Lighting shader: phase 1 keeps the bounding-box water path (small error outside the outline, where there is no
  water to see through); exact prism/cylinder path later if it shows.
- **Stands**: cabinet = footprint extruded (doors on the front-facing flat faces); frame stand = legs at the outline's
  vertices. **Table**: new stand style with its own top (rect L×D or round diameter, thickness, legs) larger than the
  tank; `stand.table { shape, L, D, x, z }` = the tank's offset on the top, clamped so the footprint stays on it.
  Move the tank by dragging it in a "move tank" mode, or with two sliders. Walls and person go relative to the
  table edge when a table is used (confirm).
- **Nathan's answers (2026-10-08), these override the proposals above:**
  1. Bowfront front = a true circular arc through (0, bowMin), (L/2, D), (L, bowMin). Yes.
  2. Eye distance: "whatever is most analogous to how it's done now". Now: `dist` = eye to the centre of the front
     glass, straight on. So for every shape, `dist` = eye to the front-most point of the outline on the tank's
     centre line (round: the front of the circle; bow: the bow's apex; poly: the front vertex or the front face's
     midpoint, whichever is nearer the eye). Orbit stays about the bounding-box centre.
  3. Hood and peninsula end walls: rect and bow only, for now.
  4. Snails on curved glass: build it NOW, not later ("we will have to revisit... easier now"). So the Surface
     model becomes general in this work unit: a glass wall index + position along the outline (arc length) + height,
     for flat panes AND the curved shell (round and bow front), with the snail oriented to the local glass normal.
  5. With a table stand, the wall and the scale person sit relative to the table's edge. Yes.
- Phases: (1) footprint + shapes + glass + water + substrate + fish + snails on any glass (answer 4) +
  volume/weight + view map + cabinet; (2) table + tank placement (answer 5); (3) exact lighting path, layouts tuned
  per shape.

## Status (2026-10-08, session 5: split tanks deployed)

Open next: Nathan's review of the amphibian art + sizes (`shots/26_amphibian_cards`), then climbing.

## Status (2026-10-08, end of session 2)

**Live at tanklook.com** (GitHub Pages, push to `main` = test + deploy in ~1-2 min; last deploy `80a860d`).
Repo: github.com/nathangoughreed-star/tanklook (public; commits use the GitHub no-reply email via repo-local git
config, never the work address). `gh` is not installed. HTTPS: check the Pages certificate, then tick Enforce HTTPS.
**Domain: tanklook.com** (bought by Nathan 2026-10-08 at Namecheap, 1 year; personal learning project).
Phase 1 PoC kept at `reference/aquarium-poc.html`. Vite + TypeScript, see README.md. `npm test` 45/45, build clean.

Shipped by end of session 2: restyled fish art, 37 species (generated body plans), bottom dwellers, snails on
floor/glass, aquascape presets, custom fish sizes, fixed orbit lens, scale person (stays put), viewpoint map,
peninsula wall, room lighting with tank spill, default eye distance 3 m. Details in the sections below.

Verification method for looks: dev page + `window.__gb = {store, viewer}`; `viewer.exportPNG(n)` POSTed to a
throwaway local python sink (port 4199) writing `shots/` (gitignored); pictures sent to Nathan with SendUserFile.
Note: another chat's dev server may already hold port 5173 (same folder, HMR works): open http://localhost:5173.

## Water level + colour + swamp + frame stand: built and deployed (session 3, 2026-10-08)

- **Scene v5** `water { level, color, opacity }`. Deviation from the proposal below: `level` is a **fraction of full**
  (0.1-1; 1 = `WATERLINE_GAP` below the top), not mm, so Tank B and a resized tank keep the same fill (fish map by
  fraction too). `waterY(T, level)` in physics.ts. v4 files load full / clear.
- **Tint** (lighting.ts `aqWaterPath`): every lit material blends toward the lit water colour by
  `1 - exp(-k * path)`, path = length of the eye-to-point sightline inside the water box (slab test), so it works for
  fish, plants, substrate, the background and the room seen through the tank; nothing above the water is tinted.
  `opacity` = share of the colour after 300 mm (`waterK`): physical, so a deeper tank looks more tinted.
- Surface: a faint transparent plane at the level + a meniscus line round the glass (edge-on straight on).
- **Fish in the water**: `scene/water.ts`. `keepInWater` runs after every 'scene' store update and on load (swimmers:
  centre <= surface - half card height; glass snails below the line; bottom dwellers / floor snails untouched).
  The level slider uses `setWaterLevel`, which scales swimmers' heights with the water so schools keep their shape.
  Render also clamps per tank (Tank B). New fish / schools spawn relative to the water; snail spawn takes the line.
- UI: Water section (Level, Tint, colour picker, quick picks Clear / Blackwater #6b3d14 60 % / Green #5d8a2e 50 %;
  picking a colour on clear water sets tint 30 %). Tests 52/52.
- Pictures: `shots/12_water_full_clear` .. `17_blackwater_low_orbit`.
- **Swamp (Nathan 2026-10-08: no preference between layout and terrain setting -> built as the recommended layout
  preset; snails may sit on land too).** `scene/terrain.ts`: `groundHeight(S, T, x, d)` = substrate, or swamp land
  where higher; it replaced `substrateHeight(S.substrate, ...)` everywhere in the renderer. Land ~62 % of H (gentle
  waves, a bit lower at the front), 1-2 elliptical pools with smooth banks; pool 1 always opens onto the front glass.
  Fractions of L/D/H, so Tank B matches. Land is fixed (physical): raising the water floods it. Choosing the layout
  drops the water to 42 % if it is higher. Substrate mesh 72x72 for swamp; front/end faces follow the ground; emerged
  ground tinted soil/moss by vertex colour. Plants: grass, fern, anubias, sword, mud stones on land; stems and grass
  growing out of the pools. Substrate "Show" off still draws swamp land.
- `fitFish` (water.ts) now also keeps swimmers above the ground, and moves any fish over land (or bottom dweller on
  emerged ground) to the nearest spot with enough water for its card (`nearestWater`, 41x41 grid); a fish taller than
  the deepest pool goes to the deepest spot (it then pokes into the bank; seen with an angel in a 16" swamp).
- Pictures: `shots/18_swamp_straight`, `19_swamp_orbit`, `20_swamp_top`.
- **Open metal frame stand (Nathan 2026-10-08)**: `stand.style: cabinet | frame` (scene v5, default cabinet). Frame =
  38 mm square tube legs, top and bottom rails, levelling feet, extra legs every ~90 cm on long tanks; the finish
  colour applies. Picture `shots/21_frame_stand`.
- Tests 55/55. Deployed 2026-10-08 (session 3, `8fddff8`). HTTPS on tanklook.com still serves the github.io
  certificate (curl: wrong principal); http works. Nathan to check Settings -> Pages and tick Enforce HTTPS.

## Custom terrain (Nathan's idea, 2026-10-08; built and deployed session 3, `2e9ce54`)

- **Scene v6** `terrain { on, cols, rows, h[] }`: a grid of ground heights (mm, Tank A, physical like the substrate)
  spread evenly over the floor, corners included. When on it replaces the corner slopes and the swamp land
  (`groundHeight`), so fish, plants, snails and the water rules all follow it. Broken grids load as off.
- Interpolation: bicubic **Catmull-Rom** (passes exactly through every point, smooth across them), clamped to
  0..0.95 H (overshoot near a sharp dip can otherwise go below the floor).
- UI (Substrate): Custom terrain checkbox (first turn-on samples the current floor, so a swamp or slope becomes the
  starting shape; a grid kept from before is reused), Grid slider = points along the length 3-25 (rows follow D/L
  for square cells; changing it RESAMPLES the current surface), Edit points / Done editing, Flatten (all points to
  the average). Corner sliders and slope buttons disabled while on.
- Editing (UI state `viewer.terrainEdit`, not scene data): dots on every grid point in Tank A, drawn over everything,
  faint grid lines on the ground. Drag a dot up/down: height follows the pointer at the dot's on-screen scale
  (works from any angle); one undo step per drag. Verified with real pointer events: 120 px -> +188 mm, undo exact.
- Known: sampling a swamp onto a coarse grid turns round pools into V-notches (raise the Grid first); the layout
  rebuilds on every drag step (fine so far).
- Pictures: `shots/22_terrain_dots`, `23_terrain_pulled`, `24_terrain_result`. Tests 60/60.

## Dry tank / terrarium (Nathan 2026-10-08: "TankLook, not AquariumLook"; built and deployed session 3, `2e9ce54`)

- `water.on` (scene v6, default true; older files load with water). Off: no tint, no surface, water controls disabled,
  fish (everything not a snail) **hidden but kept in the data** and not clamped; Add / Add school disabled for fish
  with a hint; status line says how many are hidden. Snails stay (read as land snails) and may use the whole glass.
- Verified in the dev page: 7 fish hidden, back on water -> 7 shown. Picture `shots/25_dry_terrarium`. Tests 61/61.

## Approximate tank weight (Nathan 2026-10-08; built and deployed session 3, `2e9ce54`)

- `scene/weight.ts` `tankWeight(S)`: water = water depth over the ground integrated on a 60x60 floor grid (so level,
  slopes, terrain and swamp land count; dry = 0); substrate = ground volume x 1.6 kg/L bulk + 0.35 kg/L pore water
  where submerged; glass = the renderer's pane sizes at the actual thickness (`glassThickness`) x 2.5 kg/L, + 4 mm
  lid panels with a glass lid. Not included: stand, rocks, wood, plants, rim trim, equipment.
- Readout under the tank volume: "≈ N lb filled: water, substrate, glass" (kg in cm mode).
- Sanity: standard 55 gal (48x21x13) with 2" gravel = 587 lb (water 406, substrate 88, glass 92 at auto 8 mm);
  the commonly quoted "~625 lb" assumes nominal water and no substrate. A 36x16x18 swamp is mostly land: ~350 lb of
  substrate, little water. Tests 64/64.

## NEXT WORK UNIT: land + semi-aquatic species (Nathan 2026-10-08: "mixed land and water animals in the same tank")

Decided (Nathan 2026-10-08, session 4): sizes are **total length** (nose to tail tip, like the fish); first batch =
**frogs, newts, axolotl** only (dart frog, White's tree frog, fire-bellied toad, fire-bellied newt, axolotl: one
quadruped painter); **climbing is in this unit** (tree frog on glass and branches from the start). Lizards, turtle,
snakes, crabs and inverts come later.

Progress (session 4, 2026-10-08):
- Site title "TankLook: Vivarium Visualizer" (Nathan, 2026-10-08; was "Arium"), tagline "Vivarium visualizer · true-to-scale · beta".
- Single "Add" now randomizes spot, heading, pitch, roll and bend like a school member (`randomPose`, panels.ts).
- **Step 1 done (not pushed):** species `habitat` (resolved; snails 'both', default 'water'). `restsOnGround` (water.ts)
  decides rest vs swim: bottom / land always rest; 'both' rests where the water at its spot is shallower than its
  card height, or in a dry tank. `fitFish`: land animals go to `nearestLand` (terrain.ts; left in place if the tank
  has no land), 'both' swimmers clamp between ground and surface. Dry tank hides only 'water' species. Add / Add
  school blocked with a reason (`blocked`) for fish in a dry tank and land animals with no land; land spawns use
  `randomLand`, amphibians land half the time. Drag slides resting animals along the ground; list tags land /
  amphibious. Five species in species.json (sizes provisional, Nathan to review with pictures): dart frog 45, White's
  tree frog 100, fire-bellied toad 45, fire-bellied newt 90, axolotl 230 (water, bottom). Art keys exist but have no
  painter yet. Tests 68/68.
- **Step 2 first pass (not pushed):** `art/herps.ts` paints sitting frogs (`drawFrog`, one design frame scaled by
  aspect) and newts / axolotl (`drawSal`: tail to u = 0, splayed legs, axolotl tail fin + external gills), limbs as
  tapered tubes, far legs darker. `herpMeta` gives aspect + rest (= ground line). Picture `shots/26_amphibian_cards`.
  Awaiting Nathan's review of looks and sizes.
- **Bare bottom (Nathan 2026-10-08):** the hidden Substrate "Show" checkbox became a "Bare bottom (no substrate)"
  choice at the top of the substrate list (still `substrate.show = false`; the last type is kept). Depth sliders
  disabled while bare. The tan backing plane under the substrate is no longer drawn on a bare bottom, so the stand
  top or the room shows through the bottom pane (picture `shots/27_bare_bottom`).
- **Substrate back face (Nathan 2026-10-08):** the substrate mesh had front and end faces only, so from behind (clear back
  glass in a peninsula) you saw into it and onto the tan backing. Back face added. Picture `shots/28_terrain_from_back`.
- **Peninsula end is the user's choice again (Nathan 2026-10-08, reversing session 3):** `wall.side` = back | left |
  right; Room buttons Behind / Left end / Right end. Session-3 files with 'peninsula' load as 'right'. Background plane,
  grid lines, person placement, wall and view map all follow the chosen end. Picture `shots/29_peninsula_left`. Tests 69/69.
- **Background on any sides; round-tank arc (Nathan 2026-10-12):** the background no longer follows the
  room wall. `render.bgSides` (any of back / left / right / front, buttons under Background) and `render.bgArc`
  (round tanks only, 20..360°, default 145 = the old wrap) via `backgroundRuns` (shape.ts): panes facing any chosen
  side (an angled pane between two chosen sides counted once); on a round tank an arc centred on each chosen side,
  overlaps merged, 360 = the whole shell. Older files load with the side the wall gave them (no version bump). A Room
  end button still carries a background that sat only on the old wall side along with it. Grid lines follow the
  background. Tests 138/138.
- **Orbit framing (Nathan 2026-10-08: "tank and person should be centred"):** the lens SIZE still comes from the
  straight-on view (unchanged decision), but the image window is re-centred at every orbit angle on tank + stand +
  person (`frameBox` at the current camera). Zoom no longer pulls toward a point between tank and person: `windowCentre`
  (camera.ts) keeps the bounds centre but moves just enough to keep the tank itself whole while it fits, so zooming crops
  the room first. Picture `shots/35_framing_sheet` (straight-on 1.5x, 54 deg right, 50 deg left + 20 up, 54 deg at 1x).
- **View map shows the real framing (Nathan 2026-10-08):** the map drew the cone symmetric about the eye-to-tank-centre
  line, ignoring the lens shift, so it claimed "centred" when the picture was not. It now unprojects the image's left /
  right edges and centre from the actual camera (shift included). Nathan's split-view screenshot (42x17x15, 57 deg
  right) was the OLD frozen-shift framing; with the re-centring above, single and split views both centre tank +
  person (picture `shots/44_map_matches_view`).
- Dev-server gotcha: the shared Vite server sometimes keeps serving a stale module after an edit; `touch` the file.
- **Light height (Nathan 2026-10-08):** `light.height` (mm above the tank top, 20-900, default 50 = the old fixed
  `LAMP_Y`; older files load 50). Lighting is normalised with the fixture at 50 mm, so raising it dims the tank
  (falloff) and evens it out (wider footprint); the room spill source extends up to the fixture and grows up to 1.8x
  at 450 mm+. Above 110 mm the fixture hangs on thin cables to the ceiling (room height 2700 mm). Hood: fixed inside
  the hood, slider disabled. Lighting slider "Height". Picture `shots/38_light_height_compare` (50 vs 450 mm). Tests 71/71.
- **Collapsible panel (Nathan 2026-10-08):** every panel section is a `details.sec`, closed by default; open sections and
  the hidden-panel state are per-viewer prefs (`localStorage['tanklook.ui']`). Selecting an animal opens Fish. The
  panel hides with the ‹ button (top right of the panel); "› Edit" (top right of the view) brings it back.
- Next: revise art per Nathan, then sizes review, then climbing.

## Split tanks: built and deployed (session 5, 2026-10-08)

As built (the design notes below still hold, with these specifics):
- **Scene v7** `{ name, units, tanks: TankSetup[1..2], active, camLock }`; `TankSetup` = everything one tank has (`tank`
  dims, camera, render, light, substrate, layout, terrain, water, lid, stand, wall, person, fish). Fish live in their own
  tank's mm (no more Tank A space / `mapToTank` at render). `render.edge` stays inside each setup but is an app
  preference: the Edge control and load keep it equal in every tank. v6 files: one tank, or (compare on) a second copy
  at Tank B's size with fish mapped by fraction; v6 `tankB` is dropped when compare was off.
- Every scene helper (water, terrain, weight, build, layouts, viewmap) takes a `TankSetup`; `rescaleTankA` -> `rescaleTank`.
- Store: `store.tank` (active setup), `edit(fn)` (active tank), `cam(fn)` (mirrors to both while locked), `setActive`,
  `splitTank` (copy, new one active), `closeTank(i)`, `setCamLock` (re-lock copies tanks[0]'s camera). Undo keeps each
  tank's current camera and the lock; split/close are undoable. Selection stays when switching tanks if the same fish
  id exists there (true right after a split).
- UI: Compare section = "Split tank" button (Tank B size box removed; the Tank section sizes the active tank). Panel shows
  "Editing Tank A/B". Pressing (or wheeling) in a view activates it first; the active view gets an accent frame.
  Padlock button on the divider (SVG, shackle swings open when unlocked; the tab refresh key includes `camLock`, which
  it first forgot, so the icon lagged a toggle). Locked = one shared FOV; unlocked = each view frames itself.
- **Viewport tabs (Nathan 2026-10-08):** `ui/diff.ts` `tankDiff(a, b, units)` lists only differing SETTINGS (a size
  change alone does not list auto glass or a full tank's depth); numbers for dimension-like values, "X A" / "X B" for
  details (Stocking, Water tint, Wall colour, Terrain, Arrangement, Substrate slope). Nothing different = no labels,
  only Save/Delete. Items wrap. **Folded (Nathan 2026-10-09):** the differences + Save/Delete row shows only while the
  tab is hovered (or a button in it has keyboard focus); folded, a faint "N diffs ▾" hint sits in the top row. The
  "× Close" (hide tab) button and its ☰ restore chip were removed the same day as redundant. Tabs sit in each view's TOP-RIGHT corner and
  the panel's "› Edit" button is TOP-LEFT (Nathan 2026-10-08); Tank A's tab keeps 80 px clear of Edit when the panel is hidden.
  Each difference is its own quiet box (faint fill + hairline border). Single tank: the size label carries a
  "⧉ Split to compare" button (same action as Compare -> Split tank).
- **Deselect (Nathan 2026-10-08):** a plain click on empty space (under 4 px of movement) clears the selection; Esc did
  already. A drag still orbits and keeps it. Single tank: the plain size label as before.
- The readout's "Same fish in Tank B" row is gone (the tanks are independent now).
- **Saving (Nathan 2026-10-08):** autosave (localStorage `tanklook.scene`) and Save… hold the WHOLE scene (both tanks;
  the file reopens split). Each split tab also has **Save** (left of Delete): that tank alone as an ordinary single-tank
  file named "<scene> - Tank A/B".
- Verified in a dev page (own port 5175, so Nathan's 5173 scene was not touched): tabs, frame, lock, independent orbit,
  re-lock snap, close either tank, undo. Tests 81/81 (new `test/split.test.ts`).

### Original design notes (split tanks)

Nathan: "the comparison is strongest when you can compare literally any variable. Let the user split their current tank
and then edit them separately by selecting either viewport, which changes which is being edited on the left." And:
"have a tab at the top of each viewport that the user can choose to exit that tank from."
Today Tank B is only a size (`tankB`); it mirrors Tank A's contents at the same relative positions.
Design so far:
- **Split** copies the current tank into a second, independent tank. Clicking a viewport makes it the active one (clear
  highlight); the whole left panel edits the active tank. Fish drags act on the tank they are in.
- **Each viewport gets a tab at the top** (its name / size, e.g. "A · 36x16x18") with an x to close that tank; closing one
  leaves the other as the single tank. (Answers the "which tank stays" question.)
- **Fully independent tanks (Nathan 2026-10-08):** "two totally independent tanks; let the user change whatever they want
  between them." Every setting is per tank: size, hardware, stand, room (wall, person, room light), contents AND the
  camera. Only app preferences stay global (units, quality / edge mode).
- **Camera lock toggle (Nathan 2026-10-08):** orbit + zoom are linked between the two views today ("cool") but must be
  switchable: an on/off lock button overlaid on the divider between the two views (padlock style; default locked).
  Locked: dragging / zooming either view moves both (same az, el, dist, zoom). Unlocked: each view has its own camera.
  Keep the one-FOV rule while locked so sizes stay directly comparable; when unlocked each view frames itself.
  Re-locking after the views were moved apart snaps the second tank's camera (orbit angle, eye distance, zoom) to the
  ORIGINAL tank's (the one that existed before the split, `tanks[0]`), not to whichever view is active (Nathan 2026-10-08).
- **Difference labels (Nathan 2026-10-08):** the label at the top of each viewport (today "Tank A: 42 × 17 × 15" (L×H×D)")
  lists the variables that differ between the two tanks. Numbers are shown for dimension-like values (size, stand
  height, eye distance, water level, light height...); finer details get a name per side only: "Stocking A" vs
  "Stocking B", "Gravel: black sand" vs "Gravel: white sand", "Water tint A" vs "Water tint B". Built from a
  `tankDiff(a, b)` over two setups (one entry per differing setting, label for each side). Assumed until Nathan says
  otherwise: size is always shown (it names the tank), the rest only when it differs; the label sits in the viewport
  tab with the close x; a long list wraps. Today Tank B can only differ in size, so this lands with split tanks.
- Data: scene v7 `tanks: [TankSetup, TankSetup?]` + `active` + `camLock`, each setup holding its own camera; migrate v6 (tankA + global contents; tankB + compare ->
  a second setup copied from A at tankB's size, fish mapped by fraction as today). Everything that reads `S.tankA` /
  global contents (panels, physics helpers, water.ts, terrain.ts, weight.ts, build.ts, pointer.ts, validate.ts, tests)
  takes a tank setup instead. Undo stays one stack over the whole scene.
- Open: does the old "same setup, different size" mirror mode survive (e.g. a "linked" toggle)? Recommended: no; split
  is a copy, and editing one leaves the other alone.
- Lesson (session 4): editing index.html makes Vite do a full page reload, which drops the undo stack. Before
  test edits in Nathan's dev scene, copy `localStorage['tanklook.scene']` to a file (not a page variable) and
  restore it from there afterwards.

Original proposal:
- species.json `habitat: 'water' | 'land' | 'both'` (default water; snails 'both'). Land animals rest on ground
  above the water line (any ground when dry), like bottom dwellers (rest offset, drag slides along the ground);
  'both' (frogs, newts, turtles, crabs) may be on land or in the water. Add the rule to `fitFish` / `nearestWater`
  (a `nearestLand` twin) and the spawners.
- Starter list (~15, sizes need Nathan's review like the fish): leopard gecko, crested gecko, bearded dragon, corn
  snake, dart frog, White's tree frog, fire-bellied toad, axolotl (water), fire-bellied newt, musk turtle, red-claw
  crab, fiddler crab, isopods, millipede, praying mantis, tarantula. Length convention to decide (snout-vent vs total).
- Art: fishgen body plans do not fit. New painters: quadruped side view (lizard / frog / newt / turtle), snake
  (side view lying in curves, or a ground decal), arthropod. Same style rules as the fish (no outlines, soft shading).
- Later: climbing (geckos / tree frogs on glass and branches, like glass snails), terrarium hardscape (cork bark
  background, mesh lid, heat lamp / UVB fixture), and the site tagline "aquarium visualizer" -> "tank visualizer".

## Next work unit: water level + water colour (requested by Nathan 2026-10-08)

Nathan: "Water level, as well as water color. Be able to create swampy tanks with land rising above the water level
creating pocket(s) of water. This restricts where fish spawn to the actual water. Default water level 'full' with a
slider to bring it down. Colour: default = clear water, plus an opacity slider and a continuous colour picker."

Proposed design (confirm the open points with Nathan, with pictures, before building):
- **Scene v5** `water: { level: number (mm above the tank floor; default = full), color: '#rrggbb', opacity: 0..1 }`.
  "Full" = interior height minus a small gap (reuse `WATERLINE_GAP` = 25 mm, which snails already use). Slider in
  the user's units; migration: older files get full / clear.
- **Render:**
  - water surface: a horizontal plane at the level, seen from above or when orbiting;
  - tint below the level: a colour mix in the lighting shader for in-tank materials (`vAqP.y < level`), stronger
    with distance through water (front glass to the point), scaled by opacity;
  - the glass above the line stays clear; a faint meniscus line on the panes;
  - default "clear" = barely visible blue-green at opacity ~0.
- **Fish:** spawn and drag clamp to the water: fish y + half card height <= level. Where land rises above the water,
  add / add school / drag must pick spots with water above the substrate (sample x/depth where
  `substrateHeight < level - fish height`). Bottom dwellers only on submerged substrate. Snails: glass spawning
  bounded by the water line (pass the level into `spawnSnail` instead of `WATERLINE_GAP`); decide whether snails
  may sit on emerged land (real snails do).
- **Swamp terrain (the big open point):** the substrate today is 4 corner depths, bilinear, capped at 60 % of H; it
  cannot make pockets. Options:
  (a) a new **layout preset "Swamp / paludarium"**: a noise heightfield with land masses above the water and 1-2
      water pockets, seeded + Shuffle like the other layouts (fits "no custom hardscape design yet");
  (b) a **substrate heightfield** setting ("terrain: flat slope | islands | bank"), independent of layouts.
  Recommendation: (a), and make the substrate mesh and `substrateHeight()` read a heightfield so fish placement and
  bottom dwellers follow it. Emerged land needs its own look (moss, soil, emersed plants) vs submerged gravel.
- Open: does the light fixture move down with the level (no, it sits on the tank); colour presets (tannin/blackwater,
  green) as quick picks next to the picker?
- Tests to add: v4->v5 migration, fish clamping to the level, spawn never on land / above the line, heightfield
  `substrateHeight` matches the mesh.

## Fish art style (done 2026-10-08)

Problem (Nathan): fish read as cartoons next to the tank render. Goal: not photoreal, but matching the tank's style
(no outlines, textures, soft shading, muted natural colour).

Cartoon cues in `src/art/placeholder.ts`: thick black outlines (wider than a neon's stripe at adult size), flat
fills with hard colour blocks, big white-ringed eyes, solid opaque fins.

**Step 1 (do this): restyle the three procedural fish in code** as a style test:
- no black outline, or a thin edge one shade darker than the local body colour;
- countershading: darker back to lighter belly, soft gradients that round the body;
- soft-edged internal colour bands (keep the SILHOUETTE crisp: cards use alpha-test cutout);
- small realistic eyes (dark pupil, metallic/coloured iris, no white ring);
- fins as faint tinted membranes with fine rays (consider alpha-to-coverage for partial fin alpha);
- keep nose/tail tips exact: card width == adult TL is the size calibration.
Deliver before/after pictures of each fish in the tank at the default 1200 mm distance (per working rules: pictures
with any question about the look), then ask Nathan to judge the direction.

**Step 1 status (2026-10-08): direction approved by Nathan; polish pass done.** `src/art/placeholder.ts` rewritten:
body on its own layer (countershading gradient, markings painted source-atop so the silhouette never changes, soft
inner rim + thin edge at 20 % dark), fins as separate membranes (alpha 0.62 so they survive the 0.5 alpha test,
rays fan from a root), small eyes (iris gradient, forward pupil, tiny catchlight). Nose/tail 'c' tips unchanged at
u = 1 / u = 0. Angel dorsal/anal and gourami dorsal/anal are now separate fin shapes, not part of the body outline.
Pictures: `shots/` (gitignored): 1_tank, 2_angelfish, 3_pearl_gourami, 4_neon_tetra, 5_fin_modes. In cutout mode
fins render opaque (any alpha >= 0.5 is solid), so fin tints were darkened to read as translucent; alpha-to-coverage
shows real see-through fins.
- **Default edge mode is now alpha-to-coverage (Nathan, 2026-10-08)**: fins see-through. Files that stored `cutout`
  keep it; a missing/invalid edge falls back to the default. UI lists the a2c option first.
- **Rule learned: no smooth alpha gradients in fin art.** a2c has only a few coverage levels (MSAA samples), so an
  alpha fade shows as hard stripes. Keep each fin at one alpha; vary colour, not alpha.
- Angel body is now a sloped diamond (forehead runs straight up to the dorsal origin) reaching into the fin bases,
  so body + fins read as one shape. Pictures 6_tank_v2, 7_angelfish_v2 in `shots/`.
Capture method: dev page + `window.__gb`, `viewer.exportPNG(4)` POSTed to a throwaway local sink (python, port 4199).

**Step 2 (later, needs a decision): image-based fish** if more realism is wanted or the species list grows to 25-30.
Side-view cutout PNGs, scaled so nose-to-tail == TL; `species.json` already has an `art` field, extend it to accept
an image path. Blocked on the art provenance policy: own photos / Creative Commons (attribution) / commissioned
illustrator / AI-generated (murkier reuse rights).
Alternative considered: one parametric shaded "body plan" generator (scales better than hand-coding each species,
no licensing, but stays illustrated).

## Species, layouts, snails, custom sizes (2026-10-08; pushed for dogfooding, sizes table still to review)

- **37 species** (`src/data/species.json` v2): 33 fish/shrimp + 4 snails, typical adult TL in aquaria (snails: crawling
  length). Scale anchors tested (neon 35, chili 18, angel 150, oscar 300). Clown loach 200 mm with a note (to 30 cm).
  The size table needs Nathan's eye: these are the tool's main promise.
- **Art: parametric body-plan painter** (`src/art/fishgen.ts`), the "alternative considered" in Step 2 below: profile
  (depth, peak, back share, snout, mouth), tail type (fork/notch/round/veil/lyre/double/sword), dorsal/anal shapes, pelvic,
  adipose, barbels, markings (band/bars/spots/blob/poly) on body and fins. Card aspect and resting offset are computed
  from the plan (`planMeta`), so species.json needs no aspect for generated art. Shrimp have a custom painter. Neon,
  pearl gourami, angel keep their hand-drawn art. Shared helpers moved to `src/art/paint.ts`.
- **Bottom dwellers** (`zone: 'bottom'`): corys, bristlenose, oto, kuhli, clown loach, SAE, both shrimp. Always rest on
  the substrate (centre = surface + rest x TL; stored y ignored); drag slides along the floor; Y slider disabled.
- **Snails** (`kind: 'snail'`, Fish.surface floor|front|back|left|right): spawn area-weighted over the substrate and the
  inside of the four panes below the water line (`spawnSnail`, tested: every point equally likely, so each surface in
  proportion to its area; Nathan said "equally likely on any surface", flagged as an interpretation). Floor: upright
  side-view card. Glass: two one-sided cards back to back, foot toward the glass (seen through that pane), shell toward
  the tank; yaw = heading in the pane; drag stays in the pane.
- **Layouts replace the sample plant (scene v4)**: `layout {id, seed}`: none / stones / driftwood / planted / iwagumi,
  with Shuffle (new seed). Generated from tank size, physical sizes (bigger tank = more pieces, not bigger ones).
  Stones = displaced icosphere (smooth, or faceted for iwagumi), driftwood = tapered tube limbs, both with baked
  vertex shading; plants = crossed cards (`src/art/plants.ts`: stem, red stem, grass, sword, java fern, anubias,
  carpet). Built groups cached by (layout, seed, tank, substrate, edge) and cloned per rebuild. v3 files: shown
  plant -> 'planted', hidden -> 'none'. Default scene: planted.
- Drag step cost measured in the (hidden, emulated) preview pane: 51 ms with no layout, +0-20 ms with a layout.
  The baseline was already there; worth profiling in a real browser before schools get big.
- **Custom sizes (Nathan, 2026-10-08)**: `Fish.tl` optional mm override (juveniles or big individuals), absent =
  adult; validated to 15-130 % of adult and dropped when equal to adult. "New fish size" slider (default Adult)
  applies to Add / Add school / snails; selected fish has a Size slider + Adult / Half / Quarter. Same art scaled
  (juvenile proportions such as bigger eyes are not modelled). Verified: 40 % angel measures exactly 0.4x on screen.
- Pictures: `shots/8_species_scale`, `9_layouts`, `10_orbit_driftwood`, `11_snails`.
- Weak spots: discus fins read as separate flaps; cherry shrimp is crude; stem plants still a bit regular.

## Decisions made (2026-10-08)

- **Rendering: Three.js, fish as flat textured cards ("planes") in a simple 3D box tank.** Not a 2D canvas with
  hand-rolled projection, and not Konva. Reason: perspective, occlusion, camera moves, picking and export come free;
  the custom-2D route re-implements a mini 3D engine.
- **Perspective rule:** the eye is a fixed physical distance from the front glass (default 3000 mm since 2026-10-08, was 1200; range 400-5000), the same for every
  tank; zoom only changes field of view (crop), never perspective. Comparison view uses one FOV for both tanks so pixel
  sizes are directly comparable. Verified: measured on-screen ratio = d / (d + z) exactly, straight-on.
- **Units:** all scene data in mm. Coordinates: x along length 0..L, y up 0..H, depth z = mm behind the front glass
  (three.js z = -depth). Tank L/H/D are **interior** dimensions; glass is added outside.
- **Scene data is the source of truth**, serialisable JSON with a `version` field; the renderer rebuilds from it.
- **Card edges:** alpha-test cutouts (hard silhouettes). Art rule: clean outlines, transparent background, no soft glows
  or baked shadows. Alpha-to-coverage is the smoother option.
- **Camera:** free orbit by dragging empty space (pivot = tank centre, radius chosen so straight-on eye distance is exact).
  Proposed release limits still ±30° left/right, 0-25° from above (sliders flag beyond). Not yet decided whether to enforce.
- **Orbit keeps the lens (Nathan, 2026-10-08):** FOV and lens shift come from the straight-on framing
  (`frameStraightOn`) and stay fixed while orbiting; only the angle changes. Before, each angle was re-framed, and the
  stand/person near the eye widened the lens so the tank shrank as if the viewer stepped back. Zoom (0.5-4x) is the
  only lens control.
- **Scale person stays put + viewpoint map (Nathan, 2026-10-08):** the person has one fixed spot in the room
  (`personSpot`), chosen from the straight-on view: beside the tank on the chosen side, as far from that eye as the
  tank centre; the open side if the chosen one is behind the wall. A first version followed the orbit to keep the
  scale constant, but it jumped sides when the wall got in the way; at the 3 m default the scale swing is ~1.3x. Viewpoint map: top-down inset (tank, wall, person, eye, view cone,
  distance/angles), DOM overlay so never in PNG exports, toggle in Display (browser storage, not scene data).
- **Wall: back | peninsula (Nathan, 2026-10-08).** Left/right end merged into one 'peninsula' (right end against
  the wall; old left/right saves load as peninsula). In a peninsula the background panel and grid move to the wall
  end and the long back glass is clear.
- **Default viewing distance 3 m (Nathan, 2026-10-08)**, max raised to 5 m. Fish look smaller until zoomed; less perspective distortion; the room reads as Nathan wanted.
- **Room light lights the room (Nathan, 2026-10-08):** wall, floor, stand, hood and person are room surfaces
  (`userData.room`): brightness = `roomLevel(room)` (0 at 0, full from 0.3, eased; default 0.15 = 0.75) + light
  spilling from the tank (nearest point of the tank box, falloff over `spillReach`, facing term, fixture colour x
  brightness; fades as the room brightens). The void beyond the room dims too. At 0 the tank is the only light.
- **Fish drag plane follows the view:** front-ish = parallel to glass; >45° from above = floor plan (sets depth);
  side-on = side plane.
- **Substrate:** four corner depths, bilinear surface, physical thickness (not scaled between tanks), mm-sized grain;
  anti-tiling = two rotated texture samples blended by value noise + soft brightness patches.
- **Glass:** auto thickness by interior height (<=13" 5 mm, <=17" 6, <=21" 8, <=25" 10, <=30" 12, else 15); standard
  (green edge) or low-iron. Rimmed / rimless.
- **Lighting:** custom shader injection into MeshBasicMaterial (not three.js lights; those leave edge-on cards black).
  Emitters above water: spot (cone), tube (line segment), LED array (grid). Normalised so every fixture type has the
  same mean brightness at mid-height; colour temperature via Kelvin to RGB at unit luminance; room-light ambient.
  Cards take the light level at their position (no facing term). Saturation lift 1.35 on cards, hue-preserving clamp.
- **Hosting goal (Nathan, 2026-10-08):** a publicly hosted website.
- **Phase 2 stack (Nathan, 2026-10-08):** Vite + plain TypeScript (no React); GitHub Pages via GitHub Actions;
  **public** repo. Only procedural placeholder art is committed until the art provenance policy is settled.

## Still open (rewritten 2026-10-14, lane D)

Review pack R1-R12 (`shots/review/REVIEW.md`) decided 2026-10-14 (Nathan: "go ahead with the models, take the
recommendation for the rest"); all done by lane D in `models-fix`:
- R1 frogs: thighs = tucked teardrops with smooth normals, eyes set deeper with a lid mound (`250f4d7`; 5 herps v2,
  build 287). The far eye still shows over the head at 50°: accepted as anatomy (frog eyes bulge above the skull).
- R2 / R3 fish (`6176008`, versions `66d2dba` build 309): honey gourami soft breast, discus bands cleaner head-on,
  betta median fins drape (`Plan.drape`, `drapedCard`, one-line hook in build.ts; the card is not fingerprinted, so
  the betta's version did not bump), harlequin `Plan.sharp`; generic: outline thins on fish small on screen (1 px
  floor), fish texture anisotropy 16. Accepted as is: ember / chili head-on (a 40 px fish blown up 7x by the sheet,
  not a model fault), harlequin patch (foreshortened, roughly true).
- R4 `drawTetra` / `drawGourami` deleted (`352f441`). R7 sexes, R10 sizes: pass.
- R8 hardscape (`250f4d7`): coconut doorway a clean ragged rim with shell thickness; chunkier driftwood trunks and limb
  roots; worn tapered limb tips. Example thumbnails re-shot (betta bowl, terrarium, paludarium).
- R9 wall spill: NOT built (lane D's call). The broad wash stands in fairly for real room spill (mostly bounce off the
  water and substrate); with the light hung high the beams mostly miss a wall 50 mm behind the tank; and it would mean
  editing K2's lighting.ts. Revisit only if the wash looks wrong beside the light map.
- R12 shareable scene URLs: recommended as its own small lane (deflate the ~9 KB scene with CompressionStream,
  base64url in the `#` = ~3-4 KB; Share button, decode on load, "opened a shared tank" note with Undo; ui + scene
  files). The most useful thing for showing the tool to people.
  DONE by lane N (`0d0b85a`), see its section.
- R5 shrimp, R6 snails: rebuilt by lanes M and L. R11: http already 301-redirects to https.
- Leftover (not done, cheap): `shrimpMarksCanvas` (fishgen) and fish3d's `p.glass` branch may be dead now that shrimp
  have their own builder; check `Plan.glass` users before pruning.
First-visit audit: `shots/audit/AUDIT.md`, 53 findings (4 S1, 20 S2, 29 S3) with shots; fix lane G works from it.
The S1s: water level piles every fish at x = 12 mm; phone label overflow widens the page; aquascape drag erratic in the
straight-on view; first visit is an empty box (no pointer to Examples / Animals).
Not decided, low priority: camera limits (orbit already clamps elevation -20..85; "release" never defined); fish ignore
rocks (a bottom dweller can sit inside a stone); tank weight ignores hardscape.

Settled since this list was first written (2026-10-08), kept here so nobody reopens them: plain TypeScript, no React
(Phase 2 stack); lighting shipped (spot / tube / LED, light map, beams); art is procedural generators only (Nathan
rejected bought / AI models, repo is public), so the provenance question is moot; hardscape steps 3-4 shipped, step 5
(3D plants) shipped as lane A, corals + live rock as lane E.

## Phase 2 build decisions (2026-10-08)

- Scene format v2: `glass` is `'auto' | number` (v1 stored a string); `edge` is `cutout | a2c` (the PoC's "soft"
  demo mode was dropped and migrates to cutout); added `name`. Unknown species are skipped on load with a warning.
- One `Store` owns scene + selection + history; every mutation goes through `store.update()`. UI re-syncs all
  controls from the scene on every change (one `sync()`), so undo, file open and pointer drags refresh identically.
- Readout is computed right after the synchronous draw (fixes the PoC's one-frame lag).
- Lighting in compare view: checked, works (uniforms are set per viewport before each render).
- Removed PoC test aids: depth ladder, "what to test" list. Kept the perspective readout (it is the proof).
- Autosave key `tanklook.scene` in localStorage, debounced 400 ms and flushed on `pagehide`.
- Save… downloads `<name>.json` (application/json), not `.tank`: browsers flagged `.tank` as an untrusted file type (Nathan 2026-10-12). Open… still accepts old `.tank` files.
- **Saved tanks in the browser (Nathan 2026-10-12):** toolbar is New / Open… / Save / Download. Save puts the scene, with a
  320 px JPEG preview, into `src/scene/library.ts` (index `tanklook.library` = names + pictures; each scene under
  `tanklook.lib.<id>`; `tanklook.libCurrent` = the entry this scene came from). Same name as that entry: updated silently;
  same name as another: confirm before replacing; new name: new entry. Open… is a dialog of cards plus "Open a downloaded
  file…". Storage-full saves roll back and say to Download. ~9 KB scene + ~15 KB picture, so ~5 MB holds a few hundred.
  Browser-only (Safari clears after 7 days unvisited), so Download stays the real backup; the per-view tab button is now
  Download too. The autosave slot is separate and unchanged (readout now says "Autosaved").
- **Room + lid (Nathan, 2026-10-08), scene v3** (v2 files load with these off/open):
  - `stand {show, height 12-48 in (default 30), finish black|white|oak}`: same footprint as the outer glass, from the
    floor up to the tank underside (`tankUnderside()` / `floorY()` in physics.ts).
  - `wall {show, side back|left|right, color}`: room wall 50 mm off the glass; left/right = peninsula. One-sided, so
    it vanishes when orbiting behind it. A plain floor is drawn whenever stand or wall is on.
  - `lid open|glass|hood`: glass = two 4 mm panels + hinge strip (on the rim lip, or on the panes if rimless);
    hood = low-profile moulded lid (38 mm back, 22 mm rounded front, feeding hatch) after Nathan's reference photo;
    with a hood the light fixture is not drawn (it is inside) but its light still applies.
  - `person {show, height 0.9-2.1 m (default 1.75), side left|right}`: neutral flat silhouette for scale, standing on
    the floor 250 mm beside the tank at mid-depth; turns to face the viewer (billboard about the vertical axis).
    Placeholder art, same pipeline as the fish cards.
- **Framing:** bounds now include the stand; the image window is shifted (lens shift via `setViewOffset`) so the
  bounds are centred. Eye point unchanged, so perspective and the d/(d+z) rule hold (tested). The shift fades as
  zoom rises (`offset / zoom`), so zooming closes on the tank, not the cabinet.
- **Glass edges:** every pane gets an outline (light on dark backgrounds, dark on light); low-iron edge tint made
  stronger. Thin glass edge faces are sub-pixel, outlines are always at least 1 px.
- Checked, not a bug: from steep angles the black top rim hides a strip of the interior behind the front glass
  (pixel readback confirmed the sightline passes through the rim).
- **Single-file build (Nathan, 2026-10-08):** `npm run build:single` -> `dist-single/tanklook.html` (~560 kB), made by
  `scripts/build-single.mjs`, which inlines dist/'s script and CSS (no plugin). Opens from disk with no install;
  verified self-contained (served alone: one request, no errors). Gitignored; attach or share the file.
- Dev server exposes `window.__gb = {store, viewer}` for debugging (dev only, not in the production build).
- Bundle is ~520 kB (137 kB gzip), almost all three.js. Fine for now.

## Phase 2 plan (approved 2026-10-08, built as above)

1. Repo + hosting skeleton first: Vite + TypeScript, GitHub repo, auto-deploy (GitHub Pages or Vercel/Netlify).
   Deploy a "hello tank" on day one so hosting risk is retired early.
2. Port the PoC into modules: `scene/` (types + JSON versioning + validation), `render/` (tank, substrate, glass,
   lighting shader, cards), `interact/` (pick, drag, orbit), `ui/` (panels), `data/species.json`.
3. Then the Phase 2 feature list from the original spec: species search, add/drag/duplicate/delete, save/load
   (localStorage + JSON file), PNG export, undo/redo.
Each module is a separable unit, so subagents can build in parallel once the types in `scene/` exist.

## Known gaps (rewritten 2026-10-14, lane D)

- Every one of the 57 species (12 salt) draws in 3D from a generator (fish PLANS incl. shrimp, `HERP3D`, snail shells;
  11 with a female look); flat cards remain only as the fallback / picking target. Watch items are R1-R6 above.
- Mobile: usable but rough (audit S1 #2, S2 #6-8): no pinch zoom, page overflow from the tank label, half-screen panel.
- No stocking guidance for salt tanks (AqAdvisor's marine calculator is broken on their side; Nathan: leave it off).
- Moving / turning / resizing one fish or item, selection and the colour sliders patch the scene in place (lane J);
  geometry changes (water level, tank size, stand, substrate, terrain, Split, opening a file) still rebuild fully.
- Examples (Open…) are plain scene files: re-save them when art changes (see Lane F).
- Many "uncommitted" / "not pushed" notes in the dated sections below 2026-10-12 are stale: all that work is on main.
