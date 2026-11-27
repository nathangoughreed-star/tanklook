# Handoff: build-B batch b9 (the last 6 species on an old model), written 2026-11-26

## Start here
- Steps live in `research/fish-sheets/PIPELINE.md`; this file holds only the b9 list, the odd-shape risks and the queue command.
- **State:** 6 prompts written and committed (`research/fish-sheets/prompts/<id>-b9-5row.md`; each ends with an HTML comment listing the reference photos).
  Work folders `C:/Users/nreed/fish-sheets/<id>-b9-gen/` hold `species.txt`, `fishshapes.json`, `prompt.txt` (outside the repo; regenerate with PIPELINE steps 3-4). **No sheet exists yet.**
- **The six** come from the coordinator's brief of 2026-11-26 (labeo redo, clownknife, bambooshark, goldfish fancy twin tail, kuhli, hillstream): the last species with no prompt. Nathan has not yet seen this list as a list. A fish is not skipped without asking him.
- **Rule: no colour-variant work until every species has its main body (Nathan).** So never `--all`: it would pick up the 19 unsheeted `*-f1-gen` colour-form folders.
- **Next (Nathan):** after any running queue finishes (one queue only; PIPELINE step 0), from the shared folder:
```
python scripts/sheet-queue.py C:/Users/nreed/fish-sheets/labeo-b9-gen C:/Users/nreed/fish-sheets/clownknife-b9-gen C:/Users/nreed/fish-sheets/bambooshark-b9-gen C:/Users/nreed/fish-sheets/goldfish-b9-gen C:/Users/nreed/fish-sheets/kuhli-b9-gen C:/Users/nreed/fish-sheets/hillstream-b9-gen
```
- Then build in the background: `python -I scripts/fish-batch.py --batch b9 --idle 45` and end the turn. Model ids `<id>b`, folders `<id>-b9-gen`. All six ids are in `src/data/species.json`.
- Order is easiest first. The first three (labeo, clownknife, bambooshark) are ordinary enough for the standard recipe; the last three (goldfish, kuhli, hillstream) are the ones that may need a recipe change, so they can also be run as a second command if Nathan wants to look at the first three first.

## The six
| id | species | TL mm | FishShapes (depth % SL) | watch |
|---|---|---|---|---|
| labeo | Labeotropheus trewavasae | 120 | own, n 2 (28) | redo of b6; **blue** dorsal, steel/cobalt body, nose pad over an inferior mouth |
| clownknife | Chitala ornata | 600 | own, **n 1** (27.8); head 8 / ped 3.3 not usable | humped back, anal fin joined to a tiny caudal, 7 ringed spots, no pelvics |
| bambooshark | Chiloscyllium punctatum | 900 | **not in FishShapes, no relative**: depth 9 % of total length is an ESTIMATE | two dorsals, no caudal peduncle, adult plain tan-brown |
| goldfish | Carassius auratus (fantail) | 203 | not in FishShapes; proxy C. carassius (43.6), depth hand-set 50 | twin tail, double anal |
| kuhli | Pangio kuhlii | 100 | proxy P. oblonga (14.3), depth hand-set 11 | eel body, 13 bars, no body/tail split |
| hillstream | Sewellia lineolata | 60 | **not in FishShapes, no relative**: depth 12 / body width 22 ESTIMATES | flat, ventral fin-sucker disc |

SL_IN used: labeo 4, clownknife 21 (TL x 0.88, estimate), bambooshark 35 (= total length, the tail is the body), goldfish 5 (TL 8 in, the tail is long), kuhli 3.7, hillstream 2.
Every `fishshapes.json` that is a proxy or an estimate says so in its `note`; the weights in them are NOT measured fish (stated in each note), so the mass check is only a sanity range for goldfish, kuhli, hillstream, bambooshark.

## Colours (from photos seen 2026-11-26, Commons, viewed in the browser pane, not downloaded; URLs are in each prompt's last comment)
- **labeo:** the real male (three Commons photos) is steel-to-cobalt blue with darker blue bars and a BLUE dorsal (one photo shows a yellow-green top edge), yellow egg spots on the anal, a fleshy nose pad hanging over an inferior mouth. **The rejected b6 sheet drew an orange-red dorsal and a lilac-blue body**, neither in any photo; that and the nose being only a mild bulge are my reading of why it was rejected. **The rejection reason itself is not recorded** in the repo (the b6 commit says only "that sheet is not to be used for a model"); ask Nathan if the b9 sheet fails again.
- **clownknife:** grey-brown back, silver flank, pale belly, row of black spots with pale rings on the rear half (seven drawn; photos show 6-9).
- **bambooshark:** adult plain tan-to-chestnut brown, faint saddle bars, flat head; juveniles are boldly banded, so the adult look was chosen (Nathan can ask for a juvenile).
- **goldfish:** fantail, plain red-orange (photos also show calico and red-white fantails; not drawn, no colour forms yet).
- **kuhli:** about 13 broad dark-brown bars on salmon-pink to cream, pale pink head and belly (counted on the Bleeker plate).
- **hillstream:** dark brown-black body with a golden-cream net pattern, banded fin rays, pale grey-cream underside and disc.

## Where the 5-row template or `fish-new.py` may not cope, and the proposed changes
What I checked in the code: `fish-new.py` KEEP list keeps a pre-existing spec's `no_tail`, `dorsals`, `plan`, `plan_extra`, `outline`, `fin_gap`, `fy0`, `erase`, `pec_window`, `stalk` etc., so recipe keys can be **pre-seeded in `research/fish-specs/<id>b.json` before the build** (the cory recipe in PIPELINE step 7 is exactly such a spec key set). `pec.flat`, `thickx`, `noTail` exist in `fish-build.py` / `photofish.ts`. What I did **not** do: run any of this on these shapes (no sheets exist), so everything below is a prediction until the first build.

1. **goldfish, twin caudal (also paired anal) — the one that needs a decision.**
   - The sheet shows the tail only in rows 1 and 5 (side). In a side view the two lobes overlap into one drooping fan, and rows 3-4 have the fins removed, so **no panel shows the lobes' splay**. `fish-fin-cut` / `fish-spec-from-fins` make ONE caudal card in the side plane. Result without a change: a single wide veil-like tail, edge-on (invisible) from behind and above, no second anal fin.
   - **Proposal A (no code, first pass):** build as is; the model reads as a ryukin/veiltail-style fish from the side. Cheap, honest, flagged in the review.
   - **Proposal B (renderer, needs your yes):** spec `twin_tail: {splay_deg: ~22}` (and `twin_anal`) that mirrors the caudal / anal cards about the body's centre plane in `photofish.ts` / `fish3d.ts`, taking the splay from the rear-view photo `FantailGoldishRearView.jpg` (about +-25 deg, eyeballed). Small but it is a renderer change touching every fish's code path (must be a no-op without the key). I would only start it once the sheet shows a clean overlapped tail.
   - The depth 50 % is a hand-set estimate over the C. carassius proxy (43.6); fish-new stretches only outside the range 44-58, so compare the built body with a real photo at review (the usual "proxy too shallow" break, PIPELINE step 6).
2. **kuhli, no clear body/tail split, eel proportions.**
   - No caudal peduncle (the body tapers into a rounded fan), so the fin cut's `ped` may land in the fan; the row-2 rule "end the peduncle with a short vertical edge" fights it. Pre-seed nothing for `ped`; after the build set `landmarks.ped` by hand at the tail root (PIPELINE step 7, cherry barb precedent).
   - Body about 11 % SL deep: on a 1024x1536 sheet the body strip is ~80 px tall; rows 3 and 4 will be tiny. Expect "fewer than 5 panels" in the audit; have `panel_gap.json` `{"min_gap": 3}` ready (clown loach precedent) and check `fs.panel_bands`.
   - Recipe to pre-seed in `kuhlib.json` (loach precedent, rows 52-53): `plan: "pepperedcory"`, `outline: "--level --thr 8 --open 9 --snout-open 15"`, `plan_extra: {"barbels": 0.045, "barbelR": 0.006}` (three barbel pairs). Bichir precedent for a round-section thin body (finlets not needed here).
   - Risk: ChatGPT may draw a curved or coiled eel; the prompt says straight three times. If the body is bent, redo, do not straighten by hand.
3. **hillstream, flat ventral sucker — the other hard one.**
   - The template says the pectoral "lies against the flank, do not spread any fin". For a hillstream loach the pectoral and pelvic fins are horizontal; from the side they are an edge-on sliver. The species block asks for that and overrides the default (as PIPELINE allows for fish that rest on their fins), but **the fixed method block still says the opposite, so ChatGPT may fold the fins up**; check row 1 and the row-4 front map first (the front map is where the disc width shows, about 55 % SL across). Fallback if it folds them: redo with a hand edit to that one sentence in `prompt.txt` (the method block is otherwise never reworded) and log it.
   - `fish-new` reads the pectoral polygon from row 5 and its angle from the front map (build log of every fish: "pectoral spread 0.40 from the front map -> kept to 0.2-0.35"). For a disc held flat that clamps wrongly and the polygon is a sliver. **Proposal:** pre-seed `pectoral.flat: true` (exists, used for clingers) and hand-write the pectoral / pelvic planform polygon from the front map's extent plus the underside photo (`Sewellia lineolata - Pracht-Flossensauger.jpg`); the 3D disc then comes from `pec.flat` with a spread near 90 degrees (`spread` is clamped today, so this is a code check, not a key).
   - Flat body: `fish-thickfit.py` range was raised to 3.2 for flat fish and `width_pct_sl` 22 is the body only (fins removed); expect thickx well above 1. The front-view mouth is on the underside, invisible from the front, so the row-4 "closed mouth" wording was replaced by "no mouth visible".
   - If the disc cannot be modelled, the fallback is the body alone (no fins) with the sucker disc as a flat underside card; Nathan's call after seeing the sheet.
   - **2026-11-27, done (method row 69):** Nathan picked A, planform fins, over the disc-card fallback. `scripts/fish-disc.py` writes `pectoral.plan` / `pelvic.plan` (pectoral 11-54 % SL, half-span 26.7; pelvic 48-71, 22.7) and `fish3d.ts` lofts them flat under the body. Rebuilt at body width 22 % SL (spec estimate). A 30 % build (the sheet draws 29) was shown beside it: mass 1.78x the estimated weights against 1.34x at 22. Nathan chose the flatter 30 % body (2026-11-27); rebuilt at 30. Not live.
4. **bambooshark, heterocercal tail, no peduncle, two dorsals.**
   - The shark's tail IS the body; the caudal is a low ribbon with no lower lobe, so the row-2 "end the peduncle at the caudal attachment" rule has nothing to attach to. The old hand-built spec used `no_tail: true`, `dorsals: 2`, `dense: true`, `measured_width: true`, `thickx: 1.0`. **Pre-seed those keys in `bamboosharkb.json`** (all in the KEEP list; `dorsals: 2` is also set automatically when two red pieces exist, firefish precedent). `SL_IN` 35 is the total length, depth 9 % an estimate: compare the built body with the Commons top-view photos.
   - Row 5 maps the second dorsal to the first's red (peacock gudgeon precedent).
5. **clownknife, anal fin joined to the tail.**
   - Fin cut names fins by position: the anal and the fan are one continuous piece, so the caudal may come out empty or merged into the anal (`KeyError: 'caudal'` family; PIPELINE step 6 says redo or `--body-from-map`). The old hand spec (`knife-A.webp`) is the working precedent. FishShapes head 8 / ped 3.3 are bogus (n 1), so the prompt carries no head or peduncle ratios; mass check has one specimen only.
   - Pelvic lines were removed from rows 4-5 by hand (the fish has none in the model). No pelvic = `pelvic: None` as in the old spec.
   - Tiny dorsal on the hump and the humped back: the audit's width/depth numbers use the hump as the greatest depth.

**Decision for Nathan:** none of the six is skipped. If you would rather hold hillstream and goldfish until the renderer questions (1 and 3) are answered, drop their folders from the command; the other four are ready.

## State table (fill in as each lands)
| id | sheet | built | verdict | sha | live |
|---|---|---|---|---|---|
| labeo | no | no | | | no |
| clownknife | no | no | | | no |
| bambooshark | no | no | | | no |
| goldfish | no | no | | | no |
| kuhli | no | no | | | no |
| hillstream | yes | yes (disc: planform fins, row 69) | width 30 chosen; full approval pending | see git log | no |
