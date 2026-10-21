# Tank-minimum sources: geometry per species (lane MX, 2026-10-21)

Work unit 2 of 3 under research/tank-minimum-first-principles.md (Decisions 1, 3, 4, 5 binding). Research only: nothing in
src/ changed. Lane MM migrates the data and logic.

## What was done
- Brief: research/sourcing/brief-tank-minimum.md. Input: research/sourcing/tank-minimum/input.json (84 CARE species, our
  values, the urls batches A1-A9 had already opened). Nine Sonnet agents (M1 pilot, then M2-M9) opened pages and recorded each
  measure separately: footprint (L x W), length, width, minimum water depth, tank height, volume (+ body height for tall fish),
  each with url, verbatim quote (under 15 words), group / life stage / conditions, min / max / recommended, credibility.
- Quotes re-fetched with `node scripts/verify-quotes.mjs` (<batch>.verify.json): 296 sources; 278 found verbatim (exact or
  compact), 5 near, 9 pages not fetchable here (gensou.sg 403, a FishBase mirror timeout), 2 label-only and 2 misses. The merge
  never picks a miss or label-only quote.
- `node scripts/tank-min-sources.mjs` merges the batches into research/sourcing/tank-minimum/summary.json (one row per species per
  measure: value in mm or gal, url, quote, conditions, mark, `single` source, `recommended` candidate, flags) and table.md (below).
  Pick rule (Decision 1 / 5): among credible "minimum" sources of one measure, the LOWEST; a credible figure more than 25 % stricter
  becomes the Recommended candidate. Breeding, spawning, fry and juvenile figures are excluded. Never averaged.
  DERIVED (est): when no page states a footprint or length, the sourced gallon figure becomes the inner L x W of the catalogue
  rectangle of the nearest rated volume (src/data/tanks.json; "long" over "high" except tall-bodied fish), with volume, url,
  reference tank and logic kept in the row.
- Cost: 0.78 M Sonnet tokens (M1 95 k measured; M2-M9 687 k vs a quote of 0.70 M, ceiling 0.85 M).

## Coverage (84 of 84)
- **Sourced footprint:** 55 species (only oscar and fire-bellied toad have two agreeing pages; the rest are single-source,
  mostly Seriously Fish). **Length only:** 7 (rummynose, comet, oto, SAE, yellow tang, blue tang, coral beauty).
- **Derived (est) footprint from gallons:** 22 (royal gramma, cleaner shrimp, dwarf gourami, goldfish, the 6 snails and shrimp,
  ocellaris, firefish, banggai, sixline, chromis, watchman, mandarin, turbo, hermit, fire-bellied newt, African dwarf frog, brown
  anole). No species was left without any geometry; for invertebrates Decision 3 says clearance only, so MM should ignore theirs.
- **Width alone:** stated by no page. **Required water depth:** stated by no page for any species. **Tank height:** 16 species
  (mostly land animals, plus angelfish 50 cm recommended, discus low-credibility, comet). **Maximum water depth:** African dwarf frog
  24 in (advisory).
- **Volume:** 76 species have a sourced gallon figure (advisory only from Decision 2); 31 differ from ours by more than 25 %.

## Known doubts, settled or proposed (details in research/sourcing/decisions.md, "Proposed: tank-minimum geometry")
- Swordtail: SF 120 x 30 cm "or equivalent" vs FishBase 80 cm (no conditions), 33 % apart: keep both as separate measures (MX4).
- Kuhli: SF 60 x 30 cm and Guidarium 60 cm agree (24 x 12 in); 80 cm = Recommended. Water depth: no source (MX5).
- Cleaner shrimp, royal gramma: no footprint on any opened page; gallons only, derived (MX6).
- Angelfish: tank height 50 cm (19.5 in) recommended (SF) = Recommended mark; discus depth stays estimated advisory (MX7).

## For lane MM
- Required geometry = summary.json rows marked `sourced` / `sourced (est)` with kind `min`; kind `rec` and `recommended` = the
  Recommended mark; `derived (est)` fails with derived wording; `advisory` (body height, maximum depth) never fails.
- Depth field: no required depths to load; Recommended tank height for angelfish; advisory for discus and ADF (max).
- Wait for Nathan on MX1-MX9 before loading numbers that flip a pass / fail.

## Per species (US units; generated, `node scripts/tank-min-sources.mjs` -> research/sourcing/tank-minimum/table.md)
Marks: (est) = page states no conditions; 1src = single source; rec = the page says recommended; Rec x = stricter credible figure;
n/s = looked for, not stated; blank = not looked for / no page.

| species | footprint in (L x W) | length in | water depth in | tank height in | volume gal (advisory) | ours: length in / gal |
|---|---|---|---|---|---|---|
| neon | 23.5 x 12 rec (est) 1src |  | n/s |  | 10 (est) 1src | 17.5 / 10.6 |
| swordtail | 47 x 12 (est) 1src | 31.5 (est) 1src | n/s |  | 15 1src | 31.5 / 29.1 |
| betta | 17.5 x 12 1src |  | n/s |  | 5 1src | 12 / 5.3 |
| angel | 39.5 x 15.5 (est) 1src |  | n/s | 19.5 rec 1src | n/s | 39.5 / 52.8 |
| discus | 47 x 17.5 rec 1src |  | n/s | 17.5 rec (est) 1src | 60 1src | 47 / 66.1 |
| oscar | 59 x 23.5 |  | n/s |  |  | 47 / 142.7 |
| bronzecory | 31.5 x 12 rec 1src |  | n/s |  | 20 1src | 23.5 / 21.1 |
| kuhli | 23.5 x 12 1src | 23.5 1src; Rec 31.5 | n/s |  | 20 | 23.5 / 21.1 |
| royalgramma | 35.5 x 17.5 DERIVED (est, 30 gal breeder) |  | n/s |  | 30 | 35.5 / 30.4 |
| cleanershrimp | 30 x 13 DERIVED (est, 20 gal long) |  | n/s |  | 20; Rec 40 | 23.5 / 19.8 |
| cardinal | 23.5 x 12 1src |  | n/s |  | 20 1src | 23.5 / 15.9 |
| ember | 17.5 x 12 1src |  | n/s |  | 10 1src | 17.5 / 7.9 |
| rummynose | none found | 35.5 1src | n/s |  | 20 1src | 29.5 / 15.9 |
| harlequin | 23.5 x 12 1src | 24 1src | n/s |  |  | 23.5 / 10.6 |
| chili | 17.5 x 12 1src |  | n/s |  | 8 1src | 15.5 / 5.3 |
| danio | 35.5 x 12 1src |  | n/s |  | 10 1src | 23.5 / 10.6 |
| whitecloud | 23.5 x 12 1src |  | n/s |  | 10 1src | 23.5 / 10.6 |
| cpd | 17.5 x 12 1src |  | n/s |  | 10 1src | 17.5 / 10.6 |
| hatchet | 29.5 x 12 rec 1src |  | n/s |  | 20 1src | 23.5 / 15.9 |
| cherrybarb | 23.5 x 12 1src | 23.5 1src | n/s |  | 10; Rec 25 | 23.5 / 15.9 |
| tigerbarb | 31.5 x 12 1src | 31.5 1src | n/s |  | 20 1src; Rec 29 | 29.5 / 21.1 |
| boesemani | 47 x 12 1src | 48 | n/s | n/s | 28.5 1src; Rec 50 | 35.5 / 29.1 |
| guppy | 17.5 x 12 (est) 1src | 17.5 (est) 1src | n/s |  | 5 | 17.5 / 10.6 |
| platy | 23.5 x 12 (est) 1src | 23.5 (est) 1src | n/s |  | 10 | 23.5 / 15.9 |
| molly | 35.5 x 12 (est) 1src | 35.5 (est) 1src | n/s | n/s | 10; Rec 20 | 29.5 / 21.1 |
| dwarfgourami | 20 x 10 DERIVED (est, 10 gal) | n/s | n/s |  | 10; Rec 14.8 | 23.5 / 15.9 |
| honeygourami | 23.5 x 12 1src | 23.5 1src | 6 rec (est) 1src |  | 5 1src | 17.5 / 10.6 |
| gourami | 35.5 x 12 (est) 1src | 35.5 (est) 1src | n/s |  | 30 1src | 35.5 / 29.1 |
| gbr | 23.5 x 12 1src |  | n/s |  | 20; Rec 29 | 23.5 / 15.9 |
| bolivianram | 35.5 x 17.5 1src | 47 rec 1src | n/s |  | 30 1src | 23.5 / 29.1 |
| kribensis | 23.5 x 15 1src |  | n/s |  | 18.8 1src | 23.5 / 21.1 |
| cockatoo | 23.5 x 12 1src | n/s | n/s |  | 14.3; Rec 30 | 35.5 / 15.9 |
| yellowlab | 35.5 x 17.5 1src | 35.5 1src; Rec 48 | n/s |  | 39.6 1src | 35.5 / 39.6 |
| peacock | 47 x 17.5 1src | 47 1src | n/s |  | 55 (est) | 47 / 52.8 |
| demasoni | 47 x 17.5 1src | 47 1src | n/s |  | 52.8 1src | 47 / 52.8 |
| kadango | 59 x 17.5 1src | 47 1src | n/s |  | 74 1src | 59 / 66.1 |
| syno | 47 x 12 (est) 1src |  | n/s |  | 28.5 (est) 1src | 47 / 52.8 |
| labeo | 35.5 x 17.5 rec 1src | 47 (est) 1src | n/s |  | 52.8 (est) 1src | 47 / 66.1 |
| auratus | 47 x 17.5 1src | 47 (est) 1src | n/s |  | 52.8 (est) | 48 / 66.1 |
| livingstonii | 47 x 17.5 rec 1src | 48 | n/s |  | 124.2 (est) 1src | 59 / 105.7 |
| afra | 39.5 x 12 rec 1src | 47 (est) | n/s |  | 52.8 (est) 1src | 47 / 66.1 |
| goldfish | 30 x 13 DERIVED (est, 20 gal long) | n/s | n/s |  | 20 1src | 35.5 / 19.8 |
| comet | none found | 36 1src | n/s | 18 rec 1src | 30; Rec 75 | 59 / 79.3 |
| pandacory | 17.5 x 12 rec 1src | n/s | n/s |  | 10.8 rec 1src | 23.5 / 10.8 |
| pygmycory | 17.5 x 12 rec 1src | n/s | n/s |  | 10 1src | 17.5 / 7.9 |
| bristlenose | 23.5 x 12 1src | n/s | n/s |  | 14.3 1src | 23.5 / 21.1 |
| oto | none found | 17.5 1src | n/s |  | 10 | 17.5 / 10.6 |
| clownloach | 71 x 23.5 1src | 59 1src | n/s | n/s | 132.1; Rec 171.2 | 47 / 105.7 |
| sae | none found | 35.5 1src | n/s |  | 20; Rec 50 | 35.5 / 29.1 |
| hillstream | 29.5 x 12 1src | 35.5 1src | n/s |  | 18 | 29.5 / 15.9 |
| peapuffer | 12 x 8 1src |  | n/s |  | 3.3; Rec 5 | 12 / 5.3 |
| cherryshrimp | 15.5 x 7.5 DERIVED (est, 5 gal) |  | n/s |  | 5 | 15.5 / 5.3 |
| amano | 20 x 10 DERIVED (est, 10 gal) |  | n/s |  | 10 1src | 17.5 / 10.6 |
| nerite | 12 x 6 DERIVED (est, 2.5 gal) |  | n/s |  | 2 (est); Rec 10 | 12 / 5.3 |
| mystery | 15.5 x 7.5 DERIVED (est, 5 gal) |  | n/s |  | 5 1src | - / 5 |
| ramshorn | 15.5 x 7.5 DERIVED (est, 5 gal) |  | n/s |  | 5 (est) 1src | 15.5 / 5.3 |
| trumpet | 15.5 x 7.5 DERIVED (est, 5 gal) |  | n/s |  | 5; Rec 10 | 12 / 5.3 |
| ocellaris | 24 x 12 DERIVED (est, 15 gal) |  | n/s |  | 15; Rec 30 | 23.5 / 19.8 |
| yellowtang | none found | 72 rec (est) 1src | n/s |  | 90 (est) | 47 / 120.2 |
| bluetang | none found | 72 (est) 1src | n/s |  | 180 (est) | 59 / 150.6 |
| firefish | 30 x 13 DERIVED (est, 20 gal long) |  | n/s |  | 20 (est) | 23.5 / 19.8 |
| banggai | 20 x 10 DERIVED (est, 10 gal) |  | n/s |  | 10; Rec 30 | 23.5 / 30.4 |
| sixline | 35.5 x 17.5 DERIVED (est, 30 gal breeder) |  | n/s |  | 30; Rec 60 | 35.5 / 55 |
| chromis | 35.5 x 17.5 DERIVED (est, 30 gal breeder) |  | n/s |  | 30 (est); Rec 60 | 35.5 / 30.4 |
| coralbeauty | none found | 47 (est) 1src | n/s |  | 70 (est) | 35.5 / 70 |
| watchman | 30 x 13 DERIVED (est, 20 gal long) |  | n/s |  | 20 (est); Rec 30 | 35.5 / 19.8 |
| mandarin | 35.5 x 17.5 DERIVED (est, 30 gal breeder) |  | n/s |  | 30 (est) | 39.5 / 70 |
| turbo | 20 x 10 DERIVED (est, 10 gal) |  |  |  | 10 (est) 1src | 23.5 / 10.6 |
| hermit | 20 x 10 DERIVED (est, 10 gal) |  |  |  | 10 (est) | 23.5 / 10.6 |
| dartfrog | 18 x 18 rec 1src |  | n/s | 18 rec (est) 1src | 10 1src | 18 / 10.6 |
| treefrog | 18 x 18 1src |  | n/s | 24 1src | 15 (est) 1src | 18 / 20.1 |
| firetoad | 24 x 12 rec |  | 2 rec 1src | 12 rec; Rec 18 | 10 1src | 23.5 / 15.1 |
| firenewt | 24 x 12 DERIVED (est, 15 gal) |  | n/s |  | 15; Rec 20 | 23.5 / 19.8 |
| adf | 15.5 x 7.5 DERIVED (est, 5 gal) |  | 24 max 1src |  | 5; Rec 10 | 17.5 / 10.6 |
| axolotl | 19.5 x 10 1src; Rec 35.5 x 17.5 | 17.5 1src | n/s | 10 rec 1src | 10 1src; Rec 18.5 | 31.5 / 29.1 |
| crestedharlequin | 18 x 18 1src |  | n/s | 36 1src | n/s | 18 / 33.6 |
| crestedgecko | 18 x 18 1src |  | n/s | 36 1src | n/s | 18 / 33.6 |
| greenanole | 24 x 24 1src |  | n/s | 24 1src | 10 (est) 1src | 23.5 / 19.8 |
| greenanolebrown | 24 x 24 1src |  | n/s | 24 1src |  | 23.5 / 19.8 |
| brownanole | 20 x 10 DERIVED (est, 10 gal) |  | n/s | 18 (est) 1src | 10 1src | 23.5 / 10.6 |
| leopardgecko | 36 x 18 1src |  | n/s | 18 1src | n/s | 36 / 39.6 |
| regaljumper | 4 x 4 (est) 1src |  | n/s | 8 rec 1src |  | 10 / 0.5 |
| ballpython | 48 x 24 rec 1src | n/s | n/s | 24 1src | 40 1src | 48 / 118.9 |
| chacogoldenknee | 20 x 10 1src |  | n/s | 18 1src | 15 1src | 17.5 / 15.1 |
