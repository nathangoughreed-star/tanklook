# 3D models from several 2D views: what the field already does

Written 2026-11-22, as a companion to `fish-sheet-methodology-audit.md`.
**Question:** is "turn a few views of one object into a 3D model" a solved problem we could adopt, instead of continuing our hand-measured sheet-to-loft trial and error?

**Short answer:** yes for most objects, with one catch. Since 2024 the standard pipeline is concept image → **image-to-3D generative model** → textured GLB, in seconds to minutes. Nobody measures silhouettes by hand any more. The catch is thin parts: these models make fins thick and blobby. Fins are where our method is strongest.

## 1. The three families of methods

| Family | Input it needs | Examples | Fit for us |
|---|---|---|---|
| **Classical reconstruction** (photogrammetry, multi-view stereo, NeRF, Gaussian splats) | 30-200 *real, consistent* photos with known or recoverable camera poses | COLMAP, Meshroom, RealityScan, 3DGS | **No.** We have no 50-angle photo sets of fish, and generated sheets are not exactly consistent, which breaks the geometry solve. |
| **Shape from silhouette / visual hull + loft** | 2-3 orthographic outlines (side, top, front) | What we built: `fish-build.py`, elliptical sections, photo wrapped on the loft | Works, but every known weakness is ours: views disagree, cross-sections are not ellipses, and landmarks are read by hand (9-60 calls per fish). |
| **Generative image-to-3D** (2024+) | 1 image, or 2-4 views (front / side / back / top) | **Hunyuan3D 2mv / 3.0 multiview** (Tencent), **TRELLIS.2** (Microsoft, MIT licence, single image), TripoSR / SF3D / SPAR3D, and hosted **Tripo**, **Meshy** (multi-image), Rodin | **This is the "secret method".** The model has learned what 3D objects look like, so it fills in what the views leave out and tolerates views that slightly disagree. That is exactly the failure that cost us most rounds. |

**Why the generative family fixes our biggest problem.** Our method treats each view as hard geometry, so a 21-60% top-vs-front disagreement becomes a wrong model. Multiview generators such as Hunyuan3D-2mv use the views as *conditioning*: a front image anchors the shape and side and back images steer it. A slightly inconsistent sheet then still yields one plausible body. The field solved the "views don't agree" problem in two ways. Multi-view diffusion (Zero123++, MVDream, Era3D, Wonder3D) generates views that are consistent by construction. Large reconstruction models (LRM, InstantMesh) learn to reconcile imperfect views.

## 2. The options, concretely

| Option | Multi-view input? | Cost | Notes |
|---|---|---|---|
| Hunyuan3D-2mv (open weights) | Yes: front / left / back (some workflows add right) | Free locally (needs a ~12-16 GB GPU); Replicate pay-per-run; Hugging Face demo space | Shape only; texture through Hunyuan3D-Paint. Licence excludes the EU, UK and South Korea, so read it before any commercial use. |
| Hunyuan3D 3.0 multiview (hosted) | Yes | Per generation | Tencent's current high-res production model. |
| TRELLIS.2 (open, MIT) | Single image only | Free locally; demo space | Often rated the best open single-image quality. Fast (1-3 min). |
| Tripo (H3.1 multi-view) | Yes | ~$0.30-0.50 per textured model | API returns GLB. |
| Meshy (multi-image to 3D, meshy-7.1) | Yes, up to 4 images | ~$0.50-0.60 per textured model | GLB / FBX / USDZ. meshy-7 retires 2026-12-31. |

At ~$0.50 a model, 150 species cost about **$75**. That is less than the token cost of one bad species round under the current method.

## 3. Known weaknesses (where our work still counts)

1. **Thin fins.** Generators make thin membranes thick or fuse them with the body. Likely fix: a hybrid. Take the **body** from the generator and keep our **fin cards** with the photo cutout (the part of our method Nathan liked).
2. **Texture fidelity.** Generated textures are plausible, not species-exact. We can re-project our photo cutout onto the generated mesh; `projart.ts` already does this for the loft.
3. **Poly count and topology.** Output meshes run 50k-500k triangles. Decimate to a phone budget, e.g. with `gltf-transform simplify` or meshoptimizer.
4. **Scale and proportions.** Normalise to standard length from our species data. Check thickness against FishBase mass, the same check finding 3 asks for.
5. **Style.** Output must still match "not cartoony, not photographic". Judge that on screen, as with every fish so far.

## 4. Proposed experiment (cheap, decides the direction)

E-GEN, run on the **oscar** (best existing sheet, so it is a fair baseline):
1. Crop the oscar sheet's side, front and top panels. Feed them to the Hunyuan3D-2mv demo (free) and to Meshy multi-image (about $0.60). Also feed the side panel alone to TRELLIS.2.
2. Load each GLB in the tank next to build B and take a side-by-side screenshot.
3. Score body shape against the side panel (silhouette IoU, the same audit), fin quality by eye, and calls spent.
4. If a generator wins on the body, try the hybrid: generated body + our fin cards + projected photo.

**Decision rule:** if the generated body is at least as good as build B for under ~10 calls, switch the pipeline to generate, then fix fins, then project texture. Keep the loft only for fish the generators fail on (sharks, eels, flat bottom-dwellers, to be tested).

## Sources
- [Hunyuan3D-2mv model card](https://huggingface.co/tencent/Hunyuan3D-2mv), [Replicate](https://replicate.com/tencent/hunyuan3d-2mv), [ComfyUI workflow](https://comfy.org/hub/workflows/hy-3d-2-0-mv-0cd2d1919edc/), paper arXiv 2501.12202
- [TRELLIS.2 vs Hunyuan3D](https://www.3daistudio.com/blog/trellis-2-vs-hunyuan-3d-differences-explained) and [Pixal3D vs TRELLIS.2 vs Hunyuan3D](https://www.3daistudio.com/blog/pixal3d-vs-trellis-2-vs-hunyuan-3d-comparison) (vendor blogs, not neutral)
- [Meshy API pricing](https://docs.meshy.ai/en/api/pricing), [Meshy changelog](https://docs.meshy.ai/api/changelog), [Meshy multi-image on fal](https://fal.ai/models/meshy/v7.1/multi-image-to-3d), [Tripo on fal](https://fal.ai/models/tripo3d/tripo/v2.5/image-to-3d)
- [Scenario: comparing generative 3D models](https://help.scenario.com/en/articles/comparing-generative-3d-models/)

## 5. Results

### E-GEN run 1: oscar, Hunyuan3D-2mv, free demo space (2026-11-22)
**Input:** the variant B oscar sheet. Its side panel went in as `front` and its head-on panel as `left`. Backgrounds were cut out at 8/255. The **top panel was not given**, because the model has no top-view slot. Settings: 30 steps, octree 256, seed 1234. **Cost:** free, about 10 tool calls in all.

**Output:** an untextured mesh, 90k vertices, `C:\Users\nreed\fish-sheets\oscar-gen\hy2mv_0.glb`. Picture: `research/fish-sheets/hy2mv-oscar-compare.png`.

| View | Silhouette IoU vs sheet (same length scale) | Notes |
|---|---|---|
| Side | **0.93** | A thin, even rim all round: the model is about 2% larger, an alignment or scale effect rather than a shape error. Caudal, dorsal, anal and pelvic fins are all present and shaped like the sheet's. |
| Top (**not an input**) | **0.87**, body alone matches closely | The body width and taper match the sheet's top panel almost exactly, although the model never saw it. The IoU loss is the spread pectorals (the sheet folds them in the top view) and a slightly fuller tail stalk. |
| Front | 0.75 | Body outline good. The loss is mostly vertical alignment and the spread pectorals sitting slightly higher than on the sheet. |

**Findings:**
1. **Shape is solved by this model.** It gave in one call what the loft took about 50 calls to reach: a body consistent across all three views, rooted paired fins, eyes, lips and gill cover.
2. **Fins are thin, not blobby.** Median fins are knife-edge in the top view and pectorals are flat plates, so the feared weakness did not show on the oscar.
3. **There is no texture yet.** The demo's textured endpoint (`/generation_all`) failed server-side with a `.ply` load error. Our own photo projection (`projart.ts`, side panel plus top panel) is the natural texture step, and it keeps the sheet's exact markings.
4. **The free quota is tiny.** Anonymous ZeroGPU allows about 2 minutes a day, shared across spaces. TRELLIS.2 was refused for quota (120 s requested, 45 s left). A free Hugging Face account token raises the quota, and Pro ($9/month) raises it a lot. Nathan has to create and set that token himself (`HF_TOKEN` env var).

**Not done yet:** the side-by-side against build B **in the tank**. It needs the GLB loaded by the fish loader with the photo projected on, so it is the next step, not part of this run.

### E-GEN run 2: the generated oscar in the tank beside build B (2026-11-22)
**Setup:** the sheet's colours were baked onto the Hunyuan3D-2mv mesh as vertex colours. Side panel on the flanks, top panel on upward faces, front panel on the head, blended by surface direction; sRGB converted to linear at load. The mesh is drawn by a dogfood flag, `?photoart&glbfish`, on branch `claude/glbfish-e5` (6c11dab7). That branch is built on E5 because build B's oscar photo files only exist uncommitted in the E5 worktree. They were copied in for the run but not committed. Every second oscar uses the mesh. Picture: `research/fish-sheets/hy2mv-vs-buildB-tank.png`.

**What it shows (Claude's read; Nathan judges):**
- **Side:** the generated fish has the deeper oscar body, a real head (lips, gill cover, eye socket) and a pectoral that is a shaped fin rather than a card. Build B is slimmer and flatter in the face. Markings are similar in both, since both come from the same sheet.
- **From above:** both bodies have a believable width. The generated pectorals stick out sideways, and are **coloured orange** because the side projection paints the body colour behind them onto them. That is a bake bug (a fin needs its own colour, not the flank behind it). Its back is slightly streaky where the top panel's projection meets the side's.
- **Not tested yet:** the generated mesh **does not swim** (it holds still: no swim weights), has no outline pass, and at 90k vertices / 5.9 MB it is far over a phone budget. Each of these is solvable: decimate to about 5-10k triangles, add swim weights along x, and bake to a texture instead of vertex colours.

### Next step if Nathan rates it viable: a sheet prompt made for this method
Nathan, 2026-11-22: once the method is viable, the prompt for the reference image should be refined to suit it. What this method wants, compared with the current loft-oriented sheet:
1. **Views around one vertical axis:** side (left flank), head-on, tail-on, and optionally the right flank. These map to the generator's `front` / `left` / `right` / `back` slots. The top view goes unused by Hunyuan3D-2mv, though it is still useful for baking colour onto the back.
2. **Same scale and centre in every panel**, the fish filling the frame, on plain black (as now).
3. **Flat, even, shadowless lighting**, so the baked colours carry no painted-in highlights that would fight the tank's lights.
4. **Paired fins in one natural pose in every panel**, and in the side view **not covering the flank**. Otherwise the bake paints them with body colour (the bug above).
5. Keep what already works: one rigid object seen by several cameras, and numeric proportions.

### E-GEN run 3: triangle budgets and frame cost (2026-11-22)
**Bake** (`scripts/fish-glb-bake.py` on branch `claude/glbfish-e5`, f2a24f9d):
1. Drop the generator's zero-area triangles: 281k → 181k real, one watertight piece.
2. Decimate.
3. Unwrap UVs (xatlas).
4. Project the sheet into a texture. Spread fins take the head-on panel's colour; a fin must also lie flat to count, which stopped run 2's eye-on-the-flank and orange-pectoral bugs.

No hand landmarks were needed. Picture: `research/fish-sheets/hy2mv-lod-ladder.png`.

| Version | Triangles | Texture | File |
|---|---|---|---|
| 20000 | 20,000 | 1024 px | 1.8 MB |
| 8000 | 8,000 | 1024 px | 1.7 MB |
| 3000 | 3,000 | 512 px | 0.5 MB |
| 1200 | 1,200 | 256 px | 0.15 MB |
| build B (loft) | ~10,300 per fish, in ~9 draws | photo layers | |

**Look, with the fish about 300 px long on screen:** 20000 and 8000 can't be told apart. 3000 is nearly the same. 1200 shows faint facets on the fin edges and a softer texture. At schooling-fish sizes (under ~80 px on screen) 1200 should be indistinguishable.

**Frame cost.** Laptop RTX 500, 2170x1315 canvas, 72x24x24 in tank, all oscars. Median ms per synced draw, 40 draws:

| Oscars | build B | 20000 | 8000 | 3000 | 1200 |
|---|---|---|---|---|---|
| 1 | 2.8 / 4.8 | 7.2 | 7.1 | 4.4 | 4.8 |
| 40 | 7.6 / 9.9 | 8.1 | 6.9 | 6.5 | 6.1 |
| 100 | 11.7 / 17.8 | 11.4 | 9.4 | 8.1 | 7.5 |
| draw calls at 100 | 953 | 253 | 253 | 253 | 253 |

(Build B was run first and again last. The two figures show the run-to-run noise on this shared machine, which is large; see the perf A/B memory.)

**Reading:**
- On this GPU the cost follows **draw calls more than triangles**. 100 build-B oscars are about 1.0 M triangles in 953 draws. 100 generated 20000s are 2.0 M triangles in 253 draws, and cost the same or less.
- The generated fish is one mesh and one material, about 1 draw. A whole school of one species could also be one instanced draw, which the loft's 9 parts per fish can't easily do.
- **Caveats:** the generated fish don't swim yet (no swim shader cost) and have no outline pass, so they are a little cheaper than a finished version would be. Phone GPUs are more triangle-bound than this laptop. Repeat the runs on a phone before fixing budgets.

### Detail by size (Nathan, 2026-11-22: big fish detailed, schooling fish light)
A tank usually has either a few large fish or many small ones. Proposal:
1. **Bake a ladder per species once:** 8000 / 3000 / 1200 / ~400 triangles, with textures to match.
2. **Default level by adult length.** Over 8 in: 8000. 3-8 in: 3000. Under 3 in (tetras, rasboras): 1200, which looks the same at their on-screen size.
3. **Step down by on-screen size each frame,** using three.js `LOD` by distance, so a big fish far back uses a lighter mesh.
4. **Cap the whole tank** at a fish triangle budget (e.g. ~300k on phones). If it is exceeded, every fish drops one level, smallest first.
5. **Draw a school as one instanced draw per species.** Many small fish then cost about as much as one.

### E-GEN run 4: finless method on a new species, Boeseman's rainbowfish (2026-11-22)
**Why:** on the oscar, the fins came out of the generator as thin slabs of the body, which gave ragged tips. The side projection also painted the sheet's pectoral onto the flank. Nathan's idea: give the generator a finless body and add the fins separately.

**Editing the oscar sheet to remove the fins failed.** ChatGPT redrew the outline as an egg: the tail stalk filled in and the fin bases were absorbed into the body.

**One generation with both versions worked much better.** Prompt: four panels.
1. Side with fins.
2. The same side "trimmed flush with scissors at each fin base".
3. Top without fins.
4. Front without fins.

The prompt is in this chat (2026-11-22) and in `prompts/coordinator-egen.md` to follow.

**Sheet audit:**
- Finless side vs finned side: the head-region depths match to the pixel (86/86, 137/135, 228/229 px), with the same x position and scale. 98% of the finless body lies inside the finned silhouette.
- **But** under the dorsal and anal fins, the finless body is deeper than the real body: the generator turned the fin bases into body. The tail stalk also runs about 80 px (8% of length) into where the tail fin starts.
- The top panel came out 6% short and the front panel 36% over scale. Rescaled to match the side, the front gives width/length 0.133, exactly the 13% the prompt asked for.

**Build** (`scripts/fish-glb-assemble.py`, branch `claude/glbfish-e5`):
- Hunyuan3D-2mv took the finless side as `front` and the rescaled front as `left`, in one free run. Body depth came out within 4% of the sheet.
- Fins:
  - dorsal, tail and anal: finned panel minus finless panel, drawn as one flat card at the midline;
  - pelvics: the same difference, as two hinged cut-outs;
  - pectoral: it lies over the flank, so the difference can't find it, and it was **traced by hand** for this test.
- Body texture is from the finless panels only.

Picture: `research/fish-sheets/rainbow-finless-build.png`.

**Result (Claude's read):**
- The flank is clean, with no fin outlines painted on it.
- The tail and pelvics are crisp.
- **The dorsal and anal fins show only as thin strips,** because the too-deep finless body hides their bases.
- It is far more realistic than the current app art next to it.

**Next fixes**, to try in the coordinator:
1. **Prompt:** "the back and belly line under each fin is the body's own edge, visible through the fin's base; do not raise it to the fin's base"; "the tail stalk ends where the tail fin's rays begin".
2. **Or, in code:** clip the body mesh to panel 1's body line. This needs a body-vs-fin split of panel 1 (the label-map panel from B-4view v2 gives it, including the pectoral root dot).
3. **Pectoral:** take its region from a label-map panel instead of hand tracing.
