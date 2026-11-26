# Brief 4: one coherent plan for load size, time-to-first-tank and frame time

Evidence gathered 2026-11-25 from origin/main `fcca8621` (checkout C:\Users\nreed\Glass-Box-fable). Written for a cold read. US units.

## The question (restated at the end)
"The October performance lanes all landed, but first-load JS has since grown about 3.4x (349 KB to about 1,175 KB gzip) and boot now waits on 6.1 MB of live fish art that grows with every approved fish. Given the evidence, what is one coherent plan (ordered steps, target numbers, guardrails that stop the next regression, what to cut or defer) that gets the biggest user-visible win in time-to-first-tank and frame time, on desktop and phone?"

## What TankLook is
A 3D aquarium / vivarium planner at https://tanklook.com (Vite 8 + TypeScript + three.js 0.170 + Preact), for every experience level. Static site (GitHub Pages, CNAME), service worker `public/sw.js` (cache name `tanklook-v1`, precaches only `./` and the manifest, caches the rest as fetched), installable PWA, Android TWA wrapper (`android/twa-manifest.json`, host tanklook.com; it ships no assets, it loads the site). Work is done by many parallel Claude "lanes" briefed by `prompts/lane-*.md`.

## Headline findings (read these first)
1. **Every perf lane the question names is already DONE and on main, dated 2026-10-15 to 10-19** (EF1 shader link, EF2 edit speed, EF3 download size, PL progressive load, SF single file, GR4 GPU plant reveal, SG stone grain, P1 performance ladder, FM fish-part merge 10-16, VF-A shader effects 11-11/12). Source: `HANDOFF-archive.md` sections "Lane EF1" (line 1876), "Edit speed" (1922), "Lane PL" (1798), "Lane SG" (1774), "Lane P1: performance ladder" (1012), "First download" (1977), "Lane SF" (1950), "Efficiency review" (2034), GR4 (2246). I could not verify from the repo which perf lanes are open today; the coordinator chat knows. Whatever is running now is probably NEW work that regresses or ignores these: see findings 2-3.
2. **The first-load JS has grown about 3.4x since EF3 measured it, and nothing has measured it since.** EF3 (2026-10-15): first-load code (index.html + main + three + preview3d + css) 349 KiB gzip, main 69 KiB gzip. Today's production build (`C:\Users\nreed\Glass-Box-testfix\dist`, built from exactly `fcca8621`, 2026-11-25 20:39): `index.html` modulepreloads **50 files, 4,025 KB raw / 1,175 KB gzip** (gzip -9 of each file). Largest in that set (raw / gzip KB): `tech` 671 / 141, `three.module` 542 / 136, `roomlight` 437 / 95, `pinned` 325 / 92, `herps` 325 / 96, `build` 295 / 106, `main` 252 / 88, `uiChoice` 220 / 82, `lighting` 158 / 60, `main.css` 121 / 24. Not in the preload set but loaded later: `photofish` 344 / 88, `boot` (the Preact shell) 548 / 173, `plantWorker` 668 / 181, `scenes` 186 / 29. All 93 JS files: 5.88 MB raw / 1.71 MB gzip. Caveat: the preload set was measured by parsing index.html hrefs, not by a browser trace; whether all 50 block first paint is NOT measured.
3. **`src/main.ts` top-level-awaits the live build-B fish art before it boots the UI.** Lines ~20-37: if `src/data/fishLive.json` has entries (45 today), it `await import('./art/photofish')` (344 KB raw) and `await loadPhotoFish(...)`, which fetches and decodes (canvas draw) 4-6 WebP images per fish: **221 files, 6.14 MB (median fish 129 KB, max 288 KB)** for the 45 live looks, all before `bootShell()` runs. Each Nathan approval of a build-B fish (rule R146, "go live one at a time") adds about 0.13 MB and makes this worse; the plan is every species (see Brief 5; about 79 build-B looks are built). This is the most obvious load-path blocker I found and no named perf lane covers it. Whether a visitor sees a blank page for it is NOT measured (no cold-load run since fishLive existed).
4. **Frame time and cold shader link were fixed in October; the latest measured numbers are 2026-10-15 to 11-12 on a loaded Intel Arc / RTX 500 box.** See the table below.
5. **Fish art on disk is 22.3 MB** (13.1 MB in 411 WebP files; 9.2 MB in 7 GLBs under `public/art/fish/lod/`, from the E-GEN generated-mesh experiment, behind `?glbfish`, not in the default app). Only the live fish's images load by default.

## Sizes (today)
`dist/` total 49 MB. Breakdown: `public/art` 23.6 MB (fish 22.3 incl. LOD GLBs; plants leaf atlas `leaves.webp` 0.41; quick tiles 0.32; bg 0.31; start 0.25); `public/model-sheets` 13 MB in dist (review-sheet JPEGs for `review.html`; EF3 found the app never requests them, they cost deploy upload only; I did not re-verify); `public/gallery` about 1.9 MB (gear 0.97, plants 0.60, substrate 0.28); `assets/` JS + CSS about 7 MB.

Top single files in public + src (MB): boesemani-gen.glb 1.93; oscar-hy2mv-20000.glb 1.84 (listing sorted by raw size: next oscar-8000.glb 1.80, bluetang-gen.glb 1.64, bluetang2-gen.glb 1.32); src/data/tanks.json 0.54; oscar-3000.glb 0.53; public/art/plants/leaves.webp 0.41; src/art/fishgen.ts 0.20; src/ui/panels.ts 0.20; src/style.css 0.15; oscar-1200.glb 0.15; src/render/build.ts 0.15; angelb-op.webp 0.14; src/data/gear/filters.json 0.14. Then JSON: tankmin 0.08, lights 0.08, demand-items 0.07, heaters 0.07, species.json 0.04. src/data total 4 MB (fish anatomy JSON 0.8 MB in 87 files, eagerly globbed by photofish.ts, so inside that 344 KB chunk). Total TS source 6.3 MB. Public WebP: 1,133 files, 17.4 MB, 16 KB average (fish ones larger).

## How assets load
- Entry `src/main.ts`: (a) the top-level await of live fish art above; (b) service worker registered on window `load`; (c) `chooseUi()`: default is the Preact shell, `import('./shell/boot')` (own lazy chunk, 548 KB raw / 173 gz), else the old UI (`?ui=1`).
- Code splitting: Vite default chunking; `vite.config.ts` has two inputs (`index.html`, `review.html`), which is what made three.js a shared chunk and broke the single file at d67ac73 (fixed by SF). No `manualChunks`. The six example scenes are a lazy chunk (`scenes`, 186 KB raw) since EF3, loaded after the start menu's thumbnails decode.
- Shader link: three links programs lazily on first draw; Windows / D3D11 HLSL compile is CPU-bound. EF1 + SG + PL fixed the long poles: `render/viewer.ts` `startLinks` starts every link in parallel, `revealTick` polls `isReady()` (KHR_parallel_shader_compile) and reveals parts (room + stand, glass + water, substrate, hardscape, plants, animals) at most 160 ms apart with a 260 ms cross-fade; warm loads (all ready within 150 ms) show at once. Stone grain is two baked 3D tables (`render/gritTex.ts`, 2 MB + 128 KB GPU, made on first use).
- Workers: `plantWorker` (668 KB raw / 181 gz) builds full-growth plant extras off-thread (GR4 background prebuild). Caustics: one 256 px Worley net made on first use.
- Single-file build (`scripts/build-single.mjs`, `npm run build:single`): `vite build --mode single` with `codeSplitting: false` + `assetsInlineLimit: 1e8`, then inlines script / CSS / worker (as a data: URL) into `dist-single/tanklook.html`; fails the build if a local reference remains. For zero-install coworker / file:// use. Last recorded size about 1.36 MB (2026-10-15 estimate, `HANDOFF-archive.md` near line 2076); today's size NOT measured (it would now fold in the 5.9 MB of JS that is currently split).
- Quality governor (`render/perf.ts`, `viewer.ts drawGoverned`): P1 built a motion-time pixel-ratio governor and levels 0-3 (full / plain film + 75 % / 50 % / 35 % resting resolution). **R24 (2026-11-13) switched automatic stepping OFF** (`AUTO_QUALITY = false`) because Nathan wanted quality and moving caustics always on. The manual slider remains.

## Measured numbers, with dates
All: hardware GPU, headless Edge, D3D11, machine loaded by other chats unless noted; read ratios, not absolutes.

| Date | Source file | What | Result |
|---|---|---|---|
| 2026-10-15 | `research/efficiency/E1-perf-baseline.md`, `E1-baseline.json` | Cold first frame, fresh profile, Intel Arc, before any fix | betta 12.8 s, iwagumi 23.5, paludarium 22.5, reef 24.6, terrarium 23.5, planted 3.4; 92-98 % in `getProgramInfoLog`; one hardscape program 10-22 s |
| 2026-10-15 | same | Steady GPU ms per frame, 1050x850, DPR 1 / DPR 2 | betta 1.2 / 3.3; iwagumi 9.3 / 16.4; paludarium 6.5 / 9.0; planted 7.9 / 17.1; reef 10.7 / 16.4; terrarium 4.4 / 9.8; split 11.3 / 16.3; overgrown planted 10.8 / 15.1 (phone 18.3); planted + rock wall 12.4 / 17.8. CPU 2.6-12 ms. Draw calls 164-1146 |
| 2026-10-15 | same | Edits | median 9-24 ms; water colour 120-170 ms; light power 33-41 ms. EF2 fixed: 19-54 ms and 20-33 ms |
| 2026-10-15 | `research/efficiency/EF1-cold-ab.json` | Cold first frame before -> after EF1 (3 runs) | betta 31-42 s -> 6-18 s; iwagumi 45-103 s -> 6.6-22 s (harness was under heavy load, absolutes inflated); HANDOFF summary "35-87 s -> 10-13 s" |
| 2026-10-15 | `PL-cold-ab.json`, `PL-warm-ab.json` | PL: first visible part / whole tank, cold median of 3, s | betta 12.6 -> 3.2 / 13.8; iwagumi 15.1 -> 4.3 / 13.6; paludarium 14.6 -> 3.4 / 15.2; planted 14.0 -> 3.9 / 12.2; reef 18.2 -> 4.3 / 20.2; terrarium 16.7 -> 3.2 / 15.7; split 17.5 -> 7.2 / 18.3. Whole-tank time unchanged (+-2 s noise) |
| 2026-10-16 | `SG-cold-ab.json`, HANDOFF "Lane SG" | SG baked grain, cold first picture, median of 3 | reef 13.2 -> 7.7 s, paludarium 18.3 -> 6.1, iwagumi 11.6 -> 5.6, terrarium 9.8 -> 5.1; hardscape link 5.5-11.2 -> 1.7-3.1 s; GPU per frame river wall 25.2 -> 20.2 ms, reef 19.5 -> 16.7 |
| 2026-10-15 | HANDOFF "First download" (EF3) | First-load code gzip; DOMContentLoaded on slow 4G (1.6 Mbps) | 455 -> 349 KiB; 2.77 -> 2.21 s; 4G 0.68 -> 0.56 s |
| 2026-10-19 | HANDOFF "Lane P1" | Real orbit at stress pixel ratio 5 | 28-33 fps full ratio, 47-60 fps at 75 %; pixel ratio 2 -> 1 saves 6-14 ms GPU; frost film -> plain saves 6.9 ms on iwagumi |
| 2026-11-12 | `research/visual/vf0/README.md` | Cold first frame / settled, production build, median of 3 (after SG, with VF effects) | planted4 3.8 / 6.7 s, nano 3.2 / 3.4, reef 3.8 / 6.2; 33-38 programs. GPU median planted4 14.0 ms, nano 9.1, reef 7.2 |
| 2026-11-12 | HANDOFF VF-C2 | Embed fx cost | GPU +0.01 to +0.42 ms (p95 up to 2.35); rebuild 137 -> 155 ms planted |

**Not measured:** any cold load or first-frame time after 2026-11-12; any time-to-first-tank including the awaited fish art; mobile / Android / low-end device numbers (P1: "unmeasured on a genuinely slow machine"); today's dist-single size; gzip as actually served by GitHub Pages (I used gzip -9); transfer vs decode cost of the 221 fish WebPs.

## Lane-by-lane status (briefs: untracked copies in `C:\Users\nreed\Glass Box\prompts\`; summaries in HANDOFF-archive.md)
| Lane | Goal | Files it owned | Landed |
|---|---|---|---|
| E1 / E2 (research) | baseline + code audit (`E1-perf-baseline.md`, `E2-code-audit.md`, `E2-splitmap.md`) | none (read-only) | 2026-10-15 |
| EF1 shader link | one `gStone` call (10.5 -> 2.9 s link), no frost-pass programs for culled meshes, links started in parallel before first draw | `render/items.ts` (GRIT, solidMaterial), `render/viewer.ts` first-picture path | 4905d4e2, 10-15 |
| EF2 edit speed | water colour + light power edits fast: no rebuild / relink off opacity 0 (208-444 -> 19-54 ms), light model warmed in idle | `render/lighting.ts`, `build.ts`, store | 7f3e6bcb, 10-15 |
| EF3 download size | examples lazy chunk + file thumbnails; model sheets left (never in first load) | `src/examples/index.ts`, examples hooks in `panels.ts`, `index.html` | 10-15 (main 176 -> 69 KiB gz) |
| PL progressive load | tank builds part by part as shaders link | `viewer.ts` startLinks / revealTick, `build.ts` PART tagging, `index.html` hint | 1514e34e, 10-15; Nathan approved the look |
| SG stone grain | baked 3D tables for grit hashes | `render/items.ts`, new `render/gritTex.ts` | 634a7b70, 10-16 |
| SF single file | fix `build-single.mjs` / vite single pass | `vite.config.ts`, `scripts/build-single.mjs` | 10-15 |
| GR4 GPU reveal | plant growth in the vertex shader + worker prebuild (1-5 ms per plant to about no geometry work) | `render/plant3d.ts`, plant branch of `items.ts`, growth hook in `lighting.ts` | 10-15 |
| FM fish merge | merge same-material fish parts: draw calls -10 to -24 %, CPU -0.3 to -0.4 ms | `render/fish3d.ts`, `build.ts` | 10-16 |
| P1 perf ladder | Performance slider, motion governor | `render/perf.ts`, `viewer.ts` | 10-19; auto-step disabled by R24, 11-13 |
| VF-A / VF0-VF7 | visual fidelity (tone map, caustics, water shimmer); brief: "ideally without slowing down the computer greatly" | `render/lighting.ts`, `fx.ts`, `build.ts` | 11-11..12; perf checked per stage (`scripts/vf-shots.mjs`, `vfc-ab.mjs`, `vfc2-ab.mjs`) |
| E-GEN glb LOD (experimental) | generated fish meshes with LOD ladder (oscar 20000 / 8000 / 3000 / 1200 triangles) | `scripts/fish-glb-bake.py`, `public/art/fish/lod/` | behind `?glbfish`, not default; 9.2 MB on disk |
| PT plant textures (open, R147 / R151) | painted leaf atlas for plants | `src/art/plantTex.ts`, `public/art/plants/leaves.webp` (0.41 MB) | in progress 11-25; adds download and shader work |

## Where lanes overlap (same files)
- `render/items.ts`: EF1 (grit), GR4 (plant branch), SG (grit) all touched it; finished in sequence. Future shader work (plant textures PT, any "cheaper plant shader") lands here and in `render/lighting.ts` patches.
- `render/viewer.ts`: EF1 (first picture), PL (reveal), P1 (governor), FM / GR4 draw paths. The reveal state machine and the governor both gate on build / reveal frames, so any new "defer X until idle" must go through `revealTick` or it will race PL.
- `render/lighting.ts` + `render/build.ts`: EF2, GR4 hook, AL fog hook, VF-A (tone map, caustics, `aqPatch`). Every VF effect adds uniforms / shader code to the same hot program that EF1 and SG worked to keep linkable in about 2-3 s.
- `vite.config.ts` + `scripts/build-single.mjs`: SF owned both; EF3 had to ask before touching. Any chunking change (the obvious fix for finding 2) must keep the SF guard passing and the review.html entry working.
- `src/main.ts` boot sequence: the fish-art await (finding 3) sits ahead of PL's reveal, so PL's "first part in 3-4 s" does not include it.
- Test baselines: fingerprints (`npm run sheets -- --record`) pin pictures; SG deliberately changed the stone look and did not re-record. The "same picture" pixel-diff rule was applied by EF1 / EF2 / PL / FM (0-4 edge pixels allowed once, Nathan approved).

## Constraints a plan must respect
- **Perf A/B on this shared machine must alternate A/B per frame** (memory rule `perf-ab-alternate-frames`): sequential timings lie because about 30 Claude windows and dev servers load the box. Harnesses: `scripts/perf-baseline.mjs` (all examples, `--ab`, `--orbit`, `--shaders`, `--governor`), `scripts/cold-ab.mjs` (cold, fresh profile, `--warm N`, `--done <expr>`), `scripts/a4-perf.mjs`, `scripts/fa2-perf.mjs`, `scripts/vfc2-ab.mjs`. Cold link times are CPU-bound HLSL compile, so other Windows machines should show the same shape, but only an Intel Arc Pro and an RTX 500 Ada have been measured.
- **Same-picture rule:** perf changes must not change the picture unless Nathan approves it with pictures (memory: fish art must not look cartoony; EF1's responsive-wait attempt moved about 950 crack-edge pixels and was not accepted).
- **Quality stays on by default** (R24): do not plan on auto quality step-down as the frame-time fix.
- **Mobile / Android / AR:** Android = TWA over the live site (no separate bundle). AR on Android is WebXR `immersive-ar` (`src/render/ar.ts`, tested on a Galaxy S24+, "it works flawlessly", 2026-10-14): a full-res camera-composited frame each tick, target 60 fps on a mid-size tank (`lane-Q-ar-view.md`). iPhone AR is USDZ / Quick Look via three's USDZExporter loaded lazily (`lane-T-ar-iphone.md`, `render/arUsdz.ts`); fish must still look like the crisp tank render. Phones render at DPR capped at 2; E1 measured phone GPU about equal to desktop at those sizes (planted 8.5 ms) except overgrown planted (18.3 ms). No phone cold-load number exists after Oct 15 (E1: phone first frame warm 0.8-2.4 s).
- **Product:** every experience level, a casual visitor on a modest laptop or phone; a cold first visit matters most and is least measured.
- Working rules: Sonnet lanes, no full local vitest, ship via `scripts/ship.sh`.

## Candidate directions (mine, unranked; accept or reject)
1. Stop blocking boot on fish art: render the tank immediately and let live fish swap in as their images arrive (`goLive` already swaps per species); load photofish + WebPs after first frame or on idle; prioritize fish actually in the tank.
2. Re-measure first-load JS and cold time-to-first-tank on today's build (one `cold-ab.mjs` run against `Glass-Box-testfix/dist`) before choosing anything else; split the 50-chunk preload set (`tech` 141 gz, `roomlight` 95, `herps` 96, `pinned` 92, `uiChoice` 82 look like panels and data a first view may not need).
3. Fish art: a smaller variant (for example half-resolution maps) or fewer files per fish; decide the fate of the 9.2 MB LOD GLBs and the 13 MB `model-sheets` in `dist/` (keep out of the deploy).
4. Freeze a "cold link budget" (hardscape program <= about 3 s, first visible part <= about 4 s) as a checked number before PT / VF add more shader code.
5. Keep the governor's manual path only; do not rely on auto step-down.

## The question again
"The October performance lanes all landed, but first-load JS has since grown about 3.4x (349 KB to about 1,175 KB gzip) and boot now waits on 6.1 MB of live fish art that grows with every approved fish. Given the evidence, what is one coherent plan (ordered steps, target numbers, guardrails that stop the next regression, what to cut or defer) that gets the biggest user-visible win in time-to-first-tank and frame time, on desktop and phone?"

## What a good answer looks like
Under about 600 words. (1) One-paragraph diagnosis: which of load size / time-to-first-tank / frame time actually hurts a cold visitor today, using the evidence (say plainly if the "several lanes" premise is stale). (2) A numbered plan of at most 6 steps in order, each with: what changes, files touched, which lane or chat owns it, expected gain with a number, risk to the picture. (3) A short "cut" list and a "defer" list, a reason each. (4) Target numbers (cold first visible tank in s, first-load JS KB gzip, fish-art MB before first frame, frame ms at DPR 1 and 2 on the reference tanks) and how each is verified (name the harness; alternating-frame A/B for anything timed on this box). (5) A conflict map: which steps may run in parallel and which must serialize, by file. (6) Which unmeasured items to measure first, before committing.

## Files Fable can open (15 or fewer)
1. `research/efficiency/E1-perf-baseline.md` (baseline table, ranked fixes)
2. `HANDOFF-archive.md` lines 1012-1050 (P1), 1774-1830 (SG, PL), 1876-1935 (EF1, EF2), 1950-2000 (SF, EF3), 2034-2090 (efficiency review)
3. `research/visual/vf0/README.md` (latest cold numbers, 2026-11-12)
4. `research/efficiency/PL-cold-ab.json`, `SG-cold-ab.json`, `EF1-cold-ab.json`
5. `src/main.ts` (boot sequence, fish-art await)
6. `src/art/photofish.ts` (`loadPhotoFish`), `src/data/fishLive.json`
7. `vite.config.ts`, `scripts/build-single.mjs`, `public/sw.js`
8. `research/requests.md` rows R24, R146, R147
9. `C:\Users\nreed\Glass Box\prompts\lane-EF1-shader-link.md`, `lane-PL-progressive-load.md`, `lane-EF3-download-size.md` (untracked briefs)
10. `C:\Users\nreed\Glass-Box-testfix\dist\` (today's production build for size checks)
