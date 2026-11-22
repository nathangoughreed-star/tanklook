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
