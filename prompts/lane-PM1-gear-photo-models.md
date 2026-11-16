# Lane PM1: gear drawn from product photos, PILOT (R98, Nathan 2026-11-16)

Nathan saw the R96 stand models (each stand matched to its product photos) and wants the same for the rest of the gear library: "ideally yes ... even if so it may still be wanted". About 290 products (filters 88, heaters 49, lights 47, pumps 46, UV 13, skimmers 12, CO2 10, hoods 7, chillers 8, ATO 6). This lane is the PILOT: do a small batch, and MEASURE what it costs so the coordinator can quote the full job to Nathan before any more lanes start.

## Pilot scope
- All 7 hoods (`src/data/gear/hoods.json`, drawn via `src/data/hoods.ts` / `src/render/build.ts`).
- The NICREW lights in `src/data/gear/lights.json` (9 entries).
- Work by LOOK, not by item: products of one line that differ only in length share one model with a size parameter (e.g. a hood in 20 / 24 / 30 in). Record which ids share a look.

## Do (same bar as R96 stands, see Part 2 of `prompts/lane-SP1-stand-products.md`)
1. 2-4 product photos per look (maker / retailer listing) to `research/screens/PM1/ref/<id>-*.jpg`, URLs in `research/screens/PM1/ref/sources.md`. Record per look: color (sampled hex, neutral light), sheen (matte / satin / gloss), material (plastic, aluminum, glass), shape facts (profile, lid hinge / flip panel, LED bar placement, legs / mounting arms, cable exit, visible LEDs). Real gear in its true per-part colors; geometry may be simple but the silhouette must read as that product.
2. Model per look with the sampled colors and roughness / clearcoat for the sheen. Reuse the R96 approach (`src/render/standModel.ts`, look data in the gear json) where it fits; don't fork a second material system.
3. Tiles: baked stills (same angle and light as other gear tiles), not silhouettes.
4. Proof: `research/screens/PM1/compare/<id>.jpg`, product photo left and our model right at the same angle, for every look; plus one in-tank shot at 1280 with a hood and one with a NICREW light on the planted example. Iterate any that don't match before reporting; list any look you couldn't get photos for.
5. Tests: the look data loads, every pilot product resolves to a look, saved files without the new fields still load.

## Measure (the point of the pilot)
At start and at report, record: wall-clock time, your own context tokens (`get_usage`, self), and the account's 5-hour and weekly % (same call). Report: looks done, minutes per look, tokens per look, and an estimate for the remaining visible gear (lights, filters, heaters) and for the sump gear (pumps, skimmers, UV, chillers, ATO, CO2), with how many distinct looks you expect in each (count lines, not items, from the json).

## Flow
Fresh branch from origin/main. Commit on your branch, run the FULL `npx vitest run` (not a subset; restore `research/screens/R88/speeds.txt` if the run rewrites it), then send the sha + the compare file list + the measurements to the coordinator (C25, `local_` id in your start message). Don't push. Keep tool output to summaries; no images in context once a look matches.
