# Fish painter: reference-driven design memo (Stage 1, design only)

Written 2026-11-19 for C28. Nothing is built. Everything below is from reading `src/render/fish3d.ts`, `src/art/fishgen.ts`, `src/art/paint.ts`, `src/art/placeholder.ts`, `src/render/textures.ts`, `scripts/cm3-sheet.js`, `scripts/export-sheets.mjs` and RX2's `research/screens/RX2/batch2-vs-photos.png`.

## 0. Verdict in five lines
- The 3D fish is a real solid torso (lofted from the side profile) with flat fins. The torso is good enough; the weak points are the **side outline and fin shapes being guessed** and the **marking vocabulary being too crude**. Both are fixable inside the existing canvas pipeline. No UV unwrap, no rewrite.
- Correction to the brief: the body mesh *does* have UVs, but they are a planar side projection computed per vertex (`uv = (u, 0.5 - v/aspect)`, `fish3d.ts:74`). The painter never sees UVs; it paints one flat side view.
- Needed in the painter: a body-relative coordinate frame, four new mark kinds (`path`, `lines`, `scatter`, `grad`) plus an optional `image` overlay. About 250 lines in `fishgen.ts`; all clip to the body and fins already.
- Needed in data: one JSON file per species holding photo annotations, measured anatomy and appearance parameters. `Plan.outline` already accepts a measured silhouette, so geometry plugs in with almost no code.
- Needed in tooling: an overlay (photo and model aligned by landmarks) and four separate scores. Outline, fin and landmark scores are pure functions of the plan and run in node with no browser.

## 1. How the 3D fish is built, and what it cannot express

**What is real** (`fish3d.ts`):
- `sections()` / `bodyGeometry()`: 40 stations along the body, 28 points per ring. Each station's vertical extent (centre line `vc`, half-depth `hv`) comes straight from `profile(plan)`, i.e. the 2D side outline. Half-thickness `t` is `thick x f(depth)`, a single scalar `thick` per species times a fuller-near-the-head curve, with optional `pedT` (peduncle thickness), `headW`, `step`, `noseW`, `belly`, `wide`, `sectionExp` (cross-section boxiness).
- So the torso has a true volume: elliptical to boxy cross-sections, flat bellies, broad heads, a sideways bow (`bend`). Nose-to-tail is adult TL.
- Eyes are real domes set into the head along the surface normal. Optional: gill seam, mouth line, barbels, scutes, limbs, belly sucker plate.

**What is flat or approximate:**
- **Median fins** (dorsal, anal, tail) are painted on one flat card plane at z = 0; the card's body is cut out. They can ripple out of plane (`drape`), and a tail or anal fin can be split into two lobes (`splitTail`, `splitAnal`). They have no thickness and no ray structure in 3D.
- **Paired fins** (pectoral, pelvic) are separate flat planes, one per flank, rooted on the surface at the plan's (u, v) and swung out by a fixed angle (`SPREAD`/`SPLAY`). Their root position is a plan number, not a measured attachment.
- **Paint** is one side texture projected sideways onto **both** flanks (mirror image). Where the surface turns away from the side it is smeared/faded (`bledTexture`, `SIDE`, `wrap`).

**Anatomy the current system cannot express:**
1. Left/right differences (every pattern is mirrored).
2. Top (back) and belly colouring and marks. A sideways projection only reaches round the flanks; only clinging fish get a belly plate.
3. A real head: no jaws, lips, cheek, forehead hump distinct from the outline, snout width beyond `noseW`; the mouth is a line, the eye a dome.
4. Fin thickness, ray/spine relief, fin membrane folding or flaring; fins are flat sheets at a fixed spread.
5. A measured cross-section. `thick` is one number; the front and top views are therefore *plausible*, not validated. (A flame angel is a thin disc; a lawnmower blenny is nearly round; both come out of the same superellipse family.)
6. Body curvature in the vertical plane (the centre line is straight; `bend` is a sideways bow only).
7. Preopercle spines (angelfish), caudal peduncle keels or spines (tangs), cirri and tentacles, except through `bristles`/`barbels` special cases.

**Consequence for validation:** only the **side view** can be checked against a photo with real confidence. Front/top views need a measured thickness, which is a separate data item (section 3, `thickness`) that is often unavailable.

## 2. Can the existing painter do the needed markings with no per-species code?

### What exists and is reusable
- Marks are plain data in `Plan.marks` / `finMarks` (the `Mark` union, `fishgen.ts:39`): `band` (soft rectangle, optional wave), `bars`, `spots` (uniform random in a rectangle), `blob`, `poly` (arbitrary polygon, sharp corners flagged `'c'`), `maze` (seeded wave-field contour lines, per-pixel, with rim fade).
- **Clipping is already solved:** body marks are painted in `body()` with `source-atop`, so they cannot leave the silhouette. Fin marks are painted inside `fin()` after `ctx.clip()`. New marks inherit both for free.
- Helpers to reuse: `shape()` (smooth closed path), `soft()` (feathered rect), `blob()`, `layer()` (offscreen layer), `rng()` (seeded random), `hexA()`, `profile()` (top/bottom of the body at any u), `P(u, v)` (projection).
- `body()` already multiplies a form-shading layer over the markings, so new paint gets the same roundness and rim.

### Gaps against the five requirements
| Need | Today | Gap |
|---|---|---|
| Bezier paths with variable width (flame angel curved bars) | `bars` are straight, constant-width; `poly` can approximate but needs hand-placed points | a ribbon primitive |
| Clipped line fields (kole tang fine lines) | `maze` makes wavy contours of a random field; lines do not follow the body | lines that run along the body contour |
| Irregular spot distributions (pajama cardinal) | `spots`: uniform random in a rectangle, one radius range, no spacing rule, no ring | spacing, size trend, ringed spots |
| Gradient / layered colour masks | one vertical 3-stop body gradient; `soft` is a one-colour feathered rectangle | multi-stop gradients over u or depth, blend modes |
| Image overlays for complex patterns | none | an image mark (with a copyright rule, below) |
| Normalised fish-body coordinates | `v` is in absolute widths from the card centre line, so a mark is *not* tied to the body when depth changes | a body-relative frame |

### Minimal new vocabulary (all data, no per-species functions)
1. **Body-relative frame** (the enabling change). Every new mark takes `(u, t)`: `u` as now (0 tail .. 1 nose), `t` = fraction of the local body depth, 0 at the back contour, 1 at the belly contour, using `profile(p)(u)`. Fin marks use `(s, t)`: `s` along the fin base, `t` from base (0) to edge (1). One 15-line projection function `bodyPt(p, u, t) -> [u, v]`. Existing marks keep working unchanged.
2. **`path`**: `{k:'path', pts:[[u,t,w],...], c, a, edge?, feather?, cap?}`. Catmull-Rom through the points, width `w` (fraction of local depth) interpolated along it, offset normals on both sides produce a ribbon polygon, filled through the existing `shape()`. Flame angel bars (curved, tapering, widening toward the belly), pajama band edges, marble lines, stripes that follow the back.
3. **`lines`**: `{k:'lines', u0,u1,t0,t1, n, w, wave?, jitter?, taper?, c, a, rim?}`. `n` lines at constant `t` (so they follow the contour automatically), optional sinusoidal wave and per-line jitter, width and alpha fading toward the rims (reuse `maze`'s `rim` idea, not its per-pixel loop). Kole tang flank lines; also fine fin rays, and stripes of any parallel-line fish.
4. **`scatter`**: `{k:'scatter', n, u0,u1,t0,t1, r:[min,max], gap, grow?, ring?, c:[...], a}`. Poisson-disc style placement with a minimum spacing `gap`, radius trending along `u` (`grow`), optional contrasting `ring` (ocellus, black-edged scale dots), a colour list. Pajama cardinal body spots, lawnmower blenny head spots, fin spots. Replaces the uniform `spots` for new species; `spots` stays.
5. **`grad`**: `{k:'grad', axis:'u'|'t', stops:[[x,color,a],...], u0?..t1?, blend?}`. Multi-stop gradient over a region, with `blend` = `source-over | multiply | screen`. Covers "yellower mid-flank", "red head to orange tail", countershading beyond the single built-in gradient, and region masks via alpha stops.
6. **`image`** (optional, last): `{k:'image', src, u0,u1,t0,t1, a, blend?}` drawn into the body-relative box. Loads asynchronously, so it needs the `onPictureLoad` re-render pattern already in `textures.ts`. **Copyright rule: overlay images must be our own artwork** (hand-drawn or procedurally exported scale nets, vermiculation tiles), never cropped from a reference photo; photos stay in the scratchpad. Keep this out of Stage 2 unless a species truly needs it; the other five kinds should cover the three target species.

Layer order is array order (already so). Estimated size: ~150 lines in `paintMarks` plus the projection helper, 60 lines of types, tests as fixtures.

## 3. Geometry and appearance as separate, data-driven milestones

### Where it lives
- `src/data/fishart/<art>.json`: one file per species/look (the plan key, e.g. `flameangel`). Loaded and merged into `PLANS` by one generic converter `planFromJson()`; no per-species TypeScript. Existing TS plans stay until migrated; the converter overlays JSON over the TS plan, so migration is incremental.
- `research/fish-art-schema.md` (field meanings) and a small `schema.ts` validator (types and ranges; failing JSON fails the build).
- Reference photos stay in the scratchpad and out of git; JSON stores only the URL, licence, date, and annotation coordinates (numbers, not pixels).

### JSON layout (illustrative values, not measured)
```jsonc
{
  "art": "flameangel",
  "refs": [{ "id": "p1", "url": "https://commons.wikimedia.org/...", "page": "https://en.wikipedia.org/wiki/Flame_angelfish",
             "view": "side", "sex": "m", "px": [1600, 1080], "opened": "2026-11-19" }],
  "anatomy": {                       // MILESTONE G (geometry), validated alone
    "sl": 1.0, "tlOverSl": 1.27,     // standard length vs card width (u = 0..1 covers TL)
    "landmarks": {                   // body-relative (u,t) AND source px, per ref
      "snout": {"p1":[1488,402]}, "eye": {"p1":[1342,380], "r": 0.034}, "mouth": {...},
      "opercleRear": {...}, "pecBase": {"top":..., "bottom":...},
      "dorsalOrigin": {...}, "dorsalEnd": {...}, "analOrigin": {...}, "analEnd": {...},
      "pelvicRoot": {...}, "pedTop": {...}, "pedBottom": {...}, "caudalTipTop": {...}, "caudalTipBottom": {...}
    },
    "depthProfile": {                // % of SL, stations from the snout, 21 points
      "stations": [0, 5, 10, ..., 100],
      "top":    [0, 9, 19, ...],     // distance above the SL axis, % SL
      "bottom": [0, 8, 17, ...]      // below it
    },
    "fins": {
      "dorsal": { "baseStart": 0.22, "baseEnd": 0.80, "spines": 14, "heightProfile": [[0,0.07],[0.5,0.10],[1,0.14]], "trail": 0.10 },
      "anal":   { ... },
      "caudal": { "type": "round", "outline": [[u,v],...] },
      "pectoral": { "root": [u,t], "len": 0.17, "shape": [[...]] }, "pelvic": { ... }
    },
    "thickness": { "stations": [0.2, 0.5, 0.8], "ratio": [0.18, 0.32, 0.26], "source": "front photo | FishBase | unmeasured" }
  },
  "look": {                          // MILESTONE A (appearance), validated after G
    "shade": ["#e8420c", "#f4781a", "#e8522a"],
    "regions": [{ "id": "flank", "poly": [[u,t],...], "colour": "#f8a018", "sampled": "lab(...)" }],
    "marks": [ { "k":"path", "pts":[[0.73,0.0,0.05],[0.71,0.5,0.07],[0.69,1,0.05]], "c":"#1a0c08", "a":0.9 } ],
    "finMarks": [ ... ], "eye": { "iris": ["#2a1810","#080402"] }
  },
  "validation": { "G": { "date": null, "score": null, "by": null }, "A": { ... } }
}
```
- Everything a later annotation tool must edit is in this file: landmark clicks, depth points, fin bases, region polygons, mark parameters. The tool would be a single zero-install HTML page (house rule) that loads the local photo, lets Nathan drag landmarks, and writes this JSON.
- `thickness` is flagged `unmeasured` unless a front/top photo or a cited body-shape source exists; the 3D front/top views are then **not** claimed validated.

### How geometry reaches the renderer (reuse)
- `Plan.outline` (closed polygon, already used by the shrimp) and `outlineProfile()` mean a measured silhouette drops in as `profile(p)`; `fish3d.sections()` then lofts it unchanged. Convert `depthProfile` (% SL) to card widths with `tlOverSl` and `pedU` (where the caudal fin begins).
- Median fins: `at` and `len` come straight from `baseStart/baseEnd`; spine count from `spines`/`nSp`. Two small additions to `MedianFin`: `profile?: [s, h][]` (a measured height profile overriding the soft-rise formula) and for the tail `tail.outline?`. Paired fins already take root `(u, v)`, `s`, `w`.
- No change to `fish3d.ts` is required for Milestone G, only data.

## 4. Reference overlay and separate scores

### Overlay (the picture Nathan reviews)
Align the photo to the model frame with a similarity transform from two landmarks (snout tip and caudal peduncle centre, i.e. the SL axis), render `drawFishCard(art, aspect, 1024)` with features on and fins on, then output:
1. photo left, model right (RX2's current `batchN-vs-photos.png`, same layout);
2. 50% blend;
3. outline-only: annotated polygon in green and model silhouette in magenta over the photo, landmarks as dots (green = annotated, magenta = model).
The title carries job/species/look/build per house rules. Build as `scripts/overlay.js`, following `cm3-sheet.js` (`card()`: dev server, `OffscreenCanvas`, `/__shot` upload). The 4-angle sheets stay on `scripts/export-sheets.mjs` / `review.html` (model-versions recording unchanged).

### Four separate scores (each reported alone, no blended number)
Pass levels below are proposals for Nathan to set at the Stage 3 checkpoint.
| Score | Computed from | Metric | Runs in |
|---|---|---|---|
| **Body outline** | annotated outline polygon vs `profile(plan)` silhouette (fins excluded), aligned on the SL axis | IoU, plus max contour distance in % SL | node, no canvas |
| **Fin outline** | per fin: annotated polygon vs `geometry()` polygon, plus attachment start/end error | IoU per fin, attachment error in % SL | node, no canvas |
| **Landmarks** | eye centre and radius (`eyeSpot`), mouth, pectoral/pelvic roots (`pairedFins`), fin bases, peduncle, caudal tips vs annotated | mean and max distance in % SL | node, no canvas |
| **Colour regions** | rendered canvas colour inside each annotated region polygon vs the colour sampled from the photo at annotation time (stored in JSON), pattern coverage (e.g. dark fraction in the bar region) | mean Delta-E (Lab) per region, coverage difference | browser (needs canvas), via the overlay script's headless helper |

Honesty about what the scores prove: they measure how closely the **plan matches the annotation**. Whether the annotation matches the **photo** is checked by eye in the outline overlay (that is exactly what picture 3 is for) and, later, by Nathan's annotation tool. A fish should not be called geometry-validated until Nathan has seen picture 3.

Outline, fin and landmark scores need no browser, so they become a cheap per-species vitest file (run only that file, not the full suite) that turns each validated species into a regression guard. Tailspot blenny, the one good RX2 fish, is the Stage 4 regression baseline: annotate it, confirm the new pipeline reproduces its picture within tolerance.

## 5. Risks to name now
1. **Annotation accuracy is the weakest link.** Estimating landmark pixels from a photo by eye (model or human) is noisy, roughly 3-5% of SL. Mitigation: draw the landmarks on the photo, review picture 3, correct, cap at two correction rounds; later a click tool replaces the guessing.
2. **One photo per species** (RX2 README). The method wants two or more and a true side-on shot; flame angel and kole tang photos are three-quarter views in busy reef. A foreshortened photo gives a wrong depth profile. Stage 2 must say which photo is side-on or fetch another before annotating.
3. **Front/top views stay unvalidated** without measured thickness. Say so on the review sheet rather than implying they are checked.
4. **Image overlays and copyright:** only our own artwork; photos never committed.
5. **Scope creep:** the `image` mark, a click tool and top-view validation are explicitly deferred; the three target species need only the first five mark kinds.

## 6. Staged plan and cost estimate
Estimates are order-of-magnitude for one Sonnet lane, no fan-out, summaries only, no full vitest, background builds, no waiting turns (per CLAUDE.md pacing). The weekly budget is the binding limit, so each stage ends with a measured actual and a re-estimate for the next.

| Stage | Content | Output | Est. turns | Est. weighted tokens |
|---|---|---|---|---|
| **1 (this memo)** | Read code and design | this file | done | ~3 M (already spent) |
| **2a: Flame angel geometry** | schema + validator + `planFromJson`; annotate one photo; `depthProfile`, fin bases, landmarks; `MedianFin.profile`; overlay script (pictures 1-3); outline/fin/landmark scores (node) | **Gate G**: Nathan views picture 3 and the three geometry scores | ~90-120 | ~12-20 M |
| **2b: Flame angel appearance** | body-relative frame + `path`, `grad`, `lines`/`scatter` as needed (flame angel needs `path` + `grad`); colour regions + colour score; 4-angle sheet via export-sheets | **Gate A**: side-by-side with RX2's v1 and the photo | ~70-100 | ~9-15 M |
| **3: Checkpoint** | Compare against RX2's version: the four scores for both, visual verdict, actual cost vs estimate; Nathan decides go / reshape / stop | short report, no code | ~15-25 | ~2-4 M |
| **4: Generalise** | Kole tang (`lines`, fin edge `grad`), pajama cardinal (`scatter` with ring, `path` band edges), tailspot blenny as regression baseline; fill in schema gaps found | three validated species | ~150-200 in two lanes | ~20-30 M |

Notes on the numbers: `fishgen.ts` alone is ~45 k tokens to read, so every turn in a lane that loads it carries that cache read; the 120-turn hand-off rule in CLAUDE.md therefore splits 2a and 2b into separate sessions with a hand-off note rather than one long lane. Stage 2 total (~21-35 M) is the number Nathan should compare with RX2's per-species cost (not measured here, ask C28 for it) before approving Stage 4, which would be ~3x per species if it did not reuse Stage 2's vocabulary and loaders.

## 7. Decisions needed from Nathan before Stage 2
1. OK to put species art data in `src/data/fishart/<art>.json` and let it override the TS plan for migrated species?
2. Pass levels for the four scores (proposal: outline IoU >= 0.95, max contour error <= 4% SL; landmarks mean <= 2% SL; colour Delta-E <= 12 per region).
3. For the flame angel, a second, truly side-on reference photo is wanted before annotating (the RX2 photo is three-quarter). Allowed to fetch one under the standing photo OK (scratchpad only)?
