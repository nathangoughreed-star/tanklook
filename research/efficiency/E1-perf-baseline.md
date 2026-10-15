# E1 performance baseline (lane E1, 2026-10-15)

Measured commit **`1773676`** (build 474 = `a93a81f` + the harness; no src/ change since `a93a81f`). Graphics: Intel Arc Pro
(ANGLE, Direct3D 11) in headless Edge, `--use-angle=d3d11`, WebGL timer queries on. All A/B numbers alternate frames
(30 pairs, median of the paired difference); all other GPU numbers are the median of 40 timer-query frames.

**Machine load during the runs:** other chats' dev servers on 5283 (GR4, plants3d) and 5613 (AL, algae), about 30 Claude
windows, 33 Chrome and 7 Edge processes; CPU 24-36 % busy before / after each run. Every number below was taken under
that load (the harness marks it `underLoad`); read ratios rather than absolutes, as lanes J / J2 did.

**Re-run:** `node scripts/perf-baseline.mjs` (all examples + split, desktop + phone, breakdown of the worst 3, production
build; about 15 min). The views measured here: add `--sizes desktop,desktop2x,phone --views
betta-bowl,iwagumi,paludarium,planted,reef,terrarium,split,research/efficiency/E1-variants/planted-overgrown.json,research/efficiency/E1-variants/planted-rockwall.json`.
Compile A/B of the slow shader: `--shaders`. Live A/B of a shader edit: `--ab research/efficiency/E1-ab-grit.mjs` (see its header).
Raw data: `E1-baseline.json` (full run), `E1-cold-load.json`, `E1-shader-ab.json`, `E1-breakdown-examples.json`,
`E1-grit-ab.json`, `E1-water-colour-profile.json`.

## Headline

1. **A first visit on Windows waits 11-46 s for the first picture**, and almost all of it is one shader. With a fresh
   browser profile, the production build's first frame took betta 12.8 s, iwagumi 23.5 s, paludarium 22.5 s, reef
   24.6 s, terrarium 23.5 s (planted 3.4 s); warm, the same loads take 0.6-3.4 s. The main thread sits in
   `getProgramInfoLog` (three's first use of a linked program) for 92-98 % of that time (paludarium once escaped the
   timers, 0.4 of 22.5 s; another run caught 16.1 of 16.7 s), and **one program is 10-22 s
   of it: the hardscape material** (`solidMaterial`, render/items.ts: glass clip + the `GRIT` / `gritK` stone, wood and
   coral grain). Every other program links in 0.1-0.7 s. Iwagumi compiles two hardscape programs (10.1 + 9.3 s).
   Any tank with a rock, a piece of wood, a coral or a 3D wall pays it. D3D11 is what Chrome / Edge use on Windows, and
   the cost is in the HLSL compiler (CPU), so this is not specific to this GPU.
2. **A same-picture refactor cuts that shader's compile from 10.5 s to 2.9 s** (-73 %, three interleaved rounds:
   11.1 / 11.0 / 10.2 s against 3.0 / 2.8 / 2.9 s). `gritK` calls `gStone` in five branches (stone kinds 1-5), so the
   compiler inlines `gStone`, and its 27-cell crack search, five times. Choosing the kind's roughness and crack values
   first and calling `gStone` once draws the same thing. Without the grit at all the program links in 0.18 s; without
   the crack search 5.5 s; a non-constant loop bound on the crack search alone changes nothing (10.0-15.2 s).
3. **Steady drawing is not the problem at the default size.** Every example draws in 1.2-11 ms of GPU and 2.6-12 ms of
   CPU at 1050x850 (a 700x850 canvas beside the panel), so frames are dominated by the panel and the browser, not by us.
   At DPR 2 (high-DPI laptops) GPU roughly doubles to 9.8-17.8 ms, close to a 60 Hz frame on planted, reef and the wall.
4. **Edits are fast** (median 9-24 ms per incremental edit at 1050x850, phone the same), except **water colour, 120-170
   ms**, which links new shader programs on iwagumi / the wall (40-74 ms in `getProgramInfoLog`, half of it inside the
   frost transmission pass) and runs the panel sync (6.5 ms) and `tankWeight` (3.3 ms).

## Baseline table

Desktop = 1050x850 at DPR 1 (canvas 700x850, J2's size); 2x = 1050x850 at DPR 2 (canvas buffer 1400x1700); phone =
375x812 at DPR 3, the app caps it at 2 (buffer 750x812). GPU / CPU = steady `viewer.draw()` (no build). Calls = WebGL
draw calls per frame (incl. the frost transmission pass). Memory = geometries / textures / programs (three's
renderer.info). Heap = JS heap after a forced GC. Rebuild = `viewer.rebuild()` + draw until the pixels are there, warm
caches (its GPU share in brackets: buffer and texture uploads). Edit = median over the 19 incrementalCheck edits + a
tall-plant drag, store + panel + build + draw until the pixels are there.

| View | GPU desk | GPU 2x | GPU phone | CPU desk | Calls | Tris | Geo / tex / prog | Heap MB | Rebuild ms (GPU) | Edit median ms | Slowest edit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| betta-bowl | 1.2 | 3.3 | 1.2 | 3.5 | 230 | 57 k | 51 / 10 / 21 | 12.8 | 103 (59) | 10 | - |
| iwagumi | 9.3 | 16.4 | 9.5 | 11.9 | 695 | 862 k | 320 / 19 / 47 | 15.5 | 263 (161) | 24 | water colour 170 |
| paludarium | 6.5 | 9.0 | 5.1 | 5.6 | 552 | 757 k | 223 / 17 / 25 | 14.4 | 217 (88) | 18 | water colour 122 |
| planted | 7.9 | 17.1 | 8.5 | 5.1 | 573 | 914 k | 224 / 38 / 28 | 14.3 | 144 (87) | 19 | water colour 132 |
| reef | 10.7 | 16.4 | 9.5 | 4.6 | 330 | 324 k | 174 / 34 / 27 | 13.6 | 151 (94) | 19 | - |
| terrarium | 4.4 | 9.8 | 4.7 | 2.7 | 164 | 259 k | 88 / 7 / 19 | 12.6 | 116 (85) | 12 | - |
| split (planted x2) | 11.3 | 16.3 | 12.4 | 9.7 | 1146 | 1828 k | 325 / 38 / 28 | 15.9 | 187 (105) | 19 | water colour 73 |
| planted, overgrown (growth 1) | 10.8 | 15.1 | 18.3 | 5.4 | 573 | 2232 k | 224 / 38 / 28 | 14.7 | 164 (90) | 21 | - |
| planted + 3D rock wall | 12.4 | 17.8 | 13.3 | 5.6 | 574 | 972 k | 225 / 38 / 28 | 14.5 | 152 (92) | 24 | - |

Production build (`npm run build`, served from dist/ over http): code 1459 KB (490 KB gzip), of which three.js 512 KB
(129 KB gzip), main 416 KB, preview3d 210 KB, fish3d 135 KB; dist/ is 6.3 MB in all because it ships 4.8 MB of
review-sheet JPEGs (`public/model-sheets/`). The single file (`dist-single/tanklook.html`, 472 KB) is **broken**: it
still imports the three chunk it did not inline (since `d67ac73`; lane SF is fixing the inliner), so its load was not
measured. First frame on dist/, warm: desktop 0.6-3.4 s, phone 0.8-2.4 s; cold (fresh profile): see headline 1.

The dev server's first load of each example took 20-31 s for the same reason (cold shaders); later loads 1.2-2.6 s.

## Where the time goes

**GPU, per shader bucket** (hide the bucket on alternate frames; ms saved, desktop size):

| View | Biggest buckets |
|---|---|
| reef | hardscape (solid) **8.4** of ~10.7, room walls 0.9, fish 0.4 |
| planted | lit plants (plantClip) **6.8**, fish fin cards 1.3, transparent fish parts 0.5 |
| planted, overgrown | lit plants **7.4**, fin cards 1.6 |
| planted + rock wall | plants 5.0-6.2, the wall (solid, 3 meshes) **4.1-4.4**, fin cards 1.3-1.5 |
| iwagumi | plants 3.4, **frost film + its transmission pass 2.4**, fin cards 1.4, fish 0.8, stones 0.3 |
| split | plants 4.9, fin cards 2.0, fish 0.9 |

- The hardscape grit is per-pixel noise maths (gStone: two 3-octave fBm, the 27-cell crack search, several noise
  lookups). Two same-picture edits, A/B'd live on reef and the wall: one `gStone` call -0.01 / -0.03 ms (the
  branches are real at run time, so it is a compile-only win); the crack search run only under its mask +1.8 / +0.04 ms
  (no gain; dropped).
- The lit plant shader is the biggest bucket wherever there are plants: 3.4-7.4 ms at the default size, about twice
  that at DPR 2. Overgrown planted has 2.2 M triangles (2.4x the starter set) for +0.6 ms of plant GPU at DPR 1, but
  its whole frame is +10 ms at phone size (18.3 against 8.5 ms).

**CPU, per steady draw** (V8 sampling profile, 60 draws): `draw()` is 5.0-9.6 ms, of which three's
`WebGLRenderer.render` is 3.7-7.5 ms and mostly per-object work (`setProgram` 1.8-3.6 ms: uniform uploads,
program lookups). The app's own per-draw code is small: the material-rank traverse (viewer.ts draw) 0.1-0.4 ms,
`getObjectByName('person')` 0.15-0.48 ms (a full scene search, twice in split), `drawViewMap` 0.13-0.31 ms, a panel
listener 0.37 ms in split; `unitKey`, `placePerson`, `placeShells` and `setSize` (E2 suspects 1, 2, 6, 7) never reach
the top 30 (under ~0.1 ms each). GC 0.03-0.1 ms per draw. Iwagumi alone spends ~1 ms per draw in three's
`getParameters` / `getProgram`: the frost transmission pass re-resolves programs every frame.

The fish fin cards (`fishCard`: 125-348 meshes, one material each) cost 2.3-4.2 ms of CPU per draw in planted / split
and 1.3-2 ms of GPU: 3D fish are 10-20 meshes each, so 40 fish are 400-800 draw calls.

**Edits:** `light power` spends 33-41 ms in the store listeners on planted / iwagumi (9.6 ms on paludarium; not
profiled). `water colour` (incrementalCheck: colour + opacity x1.5): on iwagumi 138 ms in draw, of which 84 ms is
three's first use of new programs (two of them in the transmission pass); on reef 18 ms of CPU, of which the panel
`sync` 6.5 ms and `tankWeight` (scene/weight.ts, `inside()` per grid point) 3.3 ms. A tall-plant drag (E2 suspect 12)
costs the same as any plant move (8-22 ms): the lid cap did not bite in the examples.

**J2 / K2 open items:** (1) frost transmission pass: still there, now 2.4 ms GPU on iwagumi (J2: 5-8 ms) plus ~1 ms
CPU per draw. (2) `lightOut` ~100 ms per wattage: K2's cache removed it, but a light power edit still spends 33-41 ms
in store listeners (unprofiled). (3) "Steady draw 18-22 ms GPU on big tanks": 7.9-10.7 ms at DPR 1 now, 16-17 ms at DPR
2 (J2 most likely measured at a higher DPR in the app's browser pane); the lit plant shader is still the biggest share.
J's item (3), the plant cache key, was fixed by lane J.

## Ranked candidate fixes

Order: what a visitor feels first. "Quiet" = needs the other lanes quiet (touches a file another lane owns, or
panels.ts / build.ts / viewer.ts). GR4 owns the plant branch of render/items.ts and the growth hook in
render/lighting.ts; AL owns its fog hook in lighting.ts.

| # | Fix | Targets (measured) | Estimated gain | Risk to the look | Size | Files | Quiet? |
|---|---|---|---|---|---|---|---|
| 1 | `gritK`: the five stone kinds share one `gStone` call (pick rough / cracks first) | hardscape program link 10-22 s on a first visit (iwagumi x2) | -7.6 s per hardscape program (10.5 -> 2.9 s); first visit with rock ~-8 to -15 s | none by construction; fingerprints + incrementalCheck must be identical | ~8 lines | render/items.ts (GRIT) | yes: same file as GR4's plant branch (different function; coordinate or wait for GR4) |
| 2 | Find out why iwagumi links **two** hardscape programs (likely a clip-plane count difference between glass outlines) and share one | the second 9.3 s link | -2.9 s after #1 (-9 s before) | none | small once found | render/items.ts `glassClip` / `solidMaterial` | as #1 |
| 3 | Don't block the first picture on the slow links: three's `compileAsync` (KHR_parallel_shader_compile) before the first draw, or draw hardscape without grit until its program is ready | the 2.9 s left after #1, plus 0.1-0.7 s per other program | first picture ~1-3 s on a cold visit | (b) a moment without grain on first load | M | render/viewer.ts, render/items.ts | yes (viewer.ts) |
| 4 | Water colour edit: stop it linking new programs (find which key changes with opacity / colour; likely the transmission pass or a define) | 120-170 ms per water colour step (iwagumi 84 ms in new programs) | -60 to -100 ms per step | none | S-M (needs one profile to name the key) | render/build.ts `patchLook` or render/lighting.ts | yes |
| 5 | Fewer draw calls for 3D fish: merge each fish's fin cards (and body parts sharing a material) into one mesh | fin cards 2.3-4.2 ms CPU + 1.3-2 ms GPU per draw (planted / split); 573-1146 calls | -2 to -4 ms CPU per draw on fish-heavy tanks | pixel identity of the opaque sort (lane J's `setOpaqueSort`) must hold | L | render/fish3d.ts, render/build.ts | yes (build.ts) |
| 6 | Frost: keep three's transmission pass from re-resolving programs each frame (cache its program per material), or the own low-res frost shader J2 / K2 offered | iwagumi ~1 ms CPU + 2.4 ms GPU | -1 to -3 ms | own shader: film blur changes (needs Nathan's pictures) | M / L | render/viewer.ts `frostCull`, render/lighting.ts | yes |
| 7 | Store listeners on a light power / water edit: profile the 33-41 ms (light power) and the panel `sync` + `tankWeight` per edit; cache `tankWeight` per tank shape | 10-41 ms per light / water edit | -10 to -35 ms per step | none | S | ui/panels.ts, scene/weight.ts | panels.ts: yes |
| 8 | Small per-draw app costs E2 listed: rank materials once per build instead of each draw; keep the person mesh as a field instead of `getObjectByName`; skip `drawViewMap` when its inputs are unchanged | 0.4-1.2 ms CPU per draw together (measured) | -0.4 to -1 ms per draw | none | S | render/viewer.ts | yes |
| 9 | High-DPI cost: cap the pixel ratio at 1.5 while orbiting / dragging (full ratio when still) | DPR 2 GPU 15-18 ms on planted / reef / wall | ~-40 % GPU during interaction | softer picture while moving (approve with pictures) | S | render/viewer.ts | yes |
| 10 | Lit plant shader / plant level of detail for overgrown tanks | plants 3.4-7.4 ms GPU, overgrown 2.2 M tris (phone +10 ms) | -2 to -5 ms GPU on planted tanks | visible; after GR4 lands (its reveal changes the plant path) | M-L | render/plant3d.ts, render/lighting.ts | yes (GR4's files) |
| 11 | Hardscape grit GPU on reef (8.4 ms): bake the grain per vertex / into a texture, or a cheaper stone function | reef 8.4 ms, wall 4.1-4.4 ms | -4 to -6 ms on reef | visible; same-picture tries gave nothing (above) | M | render/items.ts | as #1 |
| 12 | Bundle: keep `public/model-sheets/` (4.8 MB review JPEGs) out of the production build; fix the single-file inliner (lane SF) | dist/ 6.3 MB -> ~1.5 MB; single file broken | download size; no frame-time change | none | S | vite config / scripts | no (E2 / SF territory) |

Tried and dropped: a non-constant crack loop bound (compile unchanged); the crack search only under its mask (no GPU
gain, +1.8 ms on reef); the one-`gStone` refactor as a steady-draw win (compile only).

## Open

- Cold shader links measured on this machine's Intel Arc; the HLSL compile is CPU work, so other Windows machines
  should be similar but slower or faster with the CPU. Mac / Android (Metal / GLES) were not measured.
- Run 2 saw cold links again at the second size within the same browser profile (21-49 s), which suggests Chrome's GPU
  program cache evicts the big program. Not reproduced in a later run; #1 makes it matter less either way.
- Re-run after GR4 (GPU reveal + prebuild) and AL (algae) land: both change render paths (plants, fog).
- The light power store time (33-41 ms) is not profiled yet.
