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
  smallest catalogue rectangle holding at least that volume (src/data/tanks.json; "long" over "high" except tall-bodied fish), with volume, url,
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

## Known doubts (settled; details in research/sourcing/decisions.md, "Tank-minimum geometry")
- Swordtail: SF 120 x 30 cm "or equivalent" vs FishBase 80 cm (no conditions), 33 % apart: keep both as separate measures (MX4).
- Kuhli: SF 60 x 30 cm and Guidarium 60 cm agree (24 x 12 in); 80 cm = Recommended. Water depth: no source (MX5).
- Cleaner shrimp, royal gramma: no footprint on any opened page; gallons only, derived (MX6).
- Angelfish: tank height 50 cm (19.5 in) recommended (SF) = Recommended mark; discus depth stays estimated advisory (MX7).

## Decided (Nathan 2026-10-21, decisions.md MX1-MX9): two lines per species
- **Red = minimum** (below it the bar is red, the tank fails); **green = Recommended** (at or above it, green); between them
  yellow, allowed. Red = the lowest well-supported figure: with two or more geometry pages the lowest stated minimum; with one page
  or none, the sourced gallon figure turned into the smallest catalogue tank holding it (DERIVED, est) also competes. Green = the
  strictest credible geometry above red. Never averaged. Hand-set cases (swordtail length + area, crested gecko / harlequin, fire-
  bellied toad and chaco heights / footprints, ball python) are in the script's OVERRIDE table with their reasons.
- Aquatic invertebrates: clearance only, no lines. Regal jumper: no credible footprint page, no line.

## For lane MM
- Load `research/sourcing/tank-minimum/summary.json` -> `species.<id>.lines`: `red` {L, W, areaMm2?, mark, site, url, states,
  quote}, `green` (same), `heightRed` / `heightGreen` {H}, `depth` (notes: angel recommendedTankHeightMm, discus
  advisoryTankHeightMm, ADF maxWaterDepthMm, kuhli "not assessed"), `why`. A red with mark `derived (est)` fails with derived
  wording; `sourced (est)` = page states no conditions. `measures` keeps every measure's pick, for the "why?" links.
- Volume: `measures.volume` = the advisory figure (Decision 2), never a gate.

## Per species (US units; generated, `node scripts/tank-min-sources.mjs` -> research/sourcing/tank-minimum/table.md)
Columns: RED minimum and GREEN Recommended lines with their source; (est) = the page states no conditions; DERIVED (est) = from
the gallon figure via the catalogue tank. Volume column marks: 1src = single source; Rec x = a stricter credible figure.

| species | RED minimum in (L x W) | GREEN Recommended in | height red / green in | depth note | volume gal (advisory) | ours: length in / gal |
|---|---|---|---|---|---|---|
| neon | 20 x 10 DERIVED (est) Fishkeeping World | 23.5 x 12 (est) Seriously Fish | - / - |  | 10 (est) 1src | 17.5 / 10.6 |
| swordtail | 31.5 + 558 sq in (est) FishBase + Seriously Fish | - | - / - |  | 15 1src | 31.5 / 29.1 |
| betta | 15.5 x 7.5 DERIVED (est) Fishkeeping World | 17.5 x 12 Seriously Fish | - / - |  | 5 1src | 12 / 5.3 |
| angel | 39.5 x 15.5 (est) Seriously Fish | - | - / 19.5 Seriously Fish | Rec tank height 19.5 | n/s | 39.5 / 52.8 |
| discus | 48 x 18 DERIVED (est) Fishkeeping World | - | - / 17.5 Seriously Fish | advisory 18 tall | 60 1src | 47 / 66.1 |
| oscar | 59 x 23.5 Seriously Fish | - | - / - |  |  | 47 / 142.7 |
| bronzecory | 30 x 13 DERIVED (est) Aquariadise | - | - / - |  | 20 1src | 23.5 / 21.1 |
| kuhli | 23.5 x 12 Seriously Fish | 31.5 (est) Aquariadise | - / - | not assessed | 20 | 23.5 / 21.1 |
| royalgramma | 35.5 x 17.5 DERIVED (est) LiveAquaria | - | - / - |  | 30 | 35.5 / 30.4 |
| cleanershrimp | clearance only | - | - / - |  | 20; Rec 40 | 23.5 / 19.8 |
| cardinal | 23.5 x 12 Seriously Fish | - | - / - |  | 20 1src | 23.5 / 15.9 |
| ember | 17.5 x 12 Seriously Fish | - | - / - |  | 10 1src | 17.5 / 7.9 |
| rummynose | 30 x 13 DERIVED (est) Fishkeeping World | 35.5 Seriously Fish | - / - |  | 20 1src | 29.5 / 15.9 |
| harlequin | 23.5 x 12 Seriously Fish | - | - / - |  |  | 23.5 / 10.6 |
| chili | 13 x 13 DERIVED (est) Fishkeeping World | 17.5 x 12 Seriously Fish | - / - |  | 8 1src | 15.5 / 5.3 |
| danio | 20 x 10 DERIVED (est) Fishkeeping World | 35.5 x 12 Seriously Fish | - / - |  | 10 1src | 23.5 / 10.6 |
| whitecloud | 20 x 10 DERIVED (est) Fishkeeping World | 23.5 x 12 Seriously Fish | - / - |  | 10 1src | 23.5 / 10.6 |
| cpd | 17.5 x 12 Seriously Fish | - | - / - |  | 10 1src | 17.5 / 10.6 |
| hatchet | 30 x 13 DERIVED (est) LiveAquaria | - | - / - |  | 20 1src | 23.5 / 15.9 |
| cherrybarb | 20 x 10 DERIVED (est) Aquarium Co-Op | 23.5 x 12 Seriously Fish | - / - |  | 10; Rec 25 | 23.5 / 15.9 |
| tigerbarb | 30 x 13 DERIVED (est) Fishkeeping World | - | - / - |  | 20 1src; Rec 29 | 29.5 / 21.1 |
| boesemani | 47 x 12 Seriously Fish | - | - / - |  | 28.5 1src; Rec 50 | 35.5 / 29.1 |
| guppy | 15.5 x 7.5 DERIVED (est) Fishkeeping World | 17.5 x 12 (est) Seriously Fish | - / - |  | 5 | 17.5 / 10.6 |
| platy | 20 x 10 DERIVED (est) Fishkeeping World | 23.5 x 12 (est) Seriously Fish | - / - |  | 10 | 23.5 / 15.9 |
| molly | 20 x 10 DERIVED (est) Fishkeeping World | 35.5 x 12 (est) Seriously Fish | - / - |  | 10; Rec 20 | 29.5 / 21.1 |
| dwarfgourami | 20 x 10 DERIVED (est) Aquarium Co-Op | - | - / - |  | 10; Rec 14.8 | 23.5 / 15.9 |
| honeygourami | 15.5 x 7.5 DERIVED (est) Aquarium Co-Op | 23.5 x 12 Seriously Fish | - / - |  | 5 1src | 17.5 / 10.6 |
| gourami | 35.5 x 12 (est) Seriously Fish | - | - / - |  | 30 1src | 35.5 / 29.1 |
| gbr | 23.5 x 12 Seriously Fish | - | - / - |  | 20; Rec 29 | 23.5 / 15.9 |
| bolivianram | 35.5 x 17.5 Seriously Fish | 47 Seriously Fish | - / - |  | 30 1src | 23.5 / 29.1 |
| kribensis | 23.5 x 15 Seriously Fish | - | - / - |  | 18.8 1src | 23.5 / 21.1 |
| cockatoo | 23.5 x 12 Seriously Fish | - | - / - |  | 14.3; Rec 30 | 35.5 / 15.9 |
| yellowlab | 35.5 x 17.5 Seriously Fish | 48 Seriously Fish | - / - |  | 39.6 1src | 35.5 / 39.6 |
| peacock | 47 x 17.5 Seriously Fish | - | - / - |  | 55 (est) | 47 / 52.8 |
| demasoni | 47 x 17.5 Seriously Fish | - | - / - |  | 52.8 1src | 47 / 52.8 |
| kadango | 47 Guidarium | 59 x 17.5 Seriously Fish | - / - |  | 74 1src | 59 / 66.1 |
| syno | 30 x 12 DERIVED (est) Seriously Fish | 47 x 12 (est) Seriously Fish | - / - |  | 28.5 (est) 1src | 47 / 52.8 |
| labeo | 47 (est) Guidarium | - | - / - |  | 52.8 (est) 1src | 47 / 66.1 |
| auratus | 47 x 17.5 Seriously Fish | - | - / - |  | 52.8 (est) | 48 / 66.1 |
| livingstonii | 48 Seriously Fish | 59 (est) Guidarium | - / - |  | 124.2 (est) 1src | 59 / 105.7 |
| afra | 47 (est) Guidarium | - | - / - |  | 52.8 (est) 1src | 47 / 66.1 |
| goldfish | 30 x 13 DERIVED (est) Fishkeeping World | - | - / - |  | 20 1src | 35.5 / 19.8 |
| comet | 35.5 x 17.5 DERIVED (est) Fishkeeping World | - | - / 18 Fishkeeping World |  | 30; Rec 75 | 59 / 79.3 |
| pandacory | 24 x 12 DERIVED (est) Seriously Fish | - | - / - |  | 10.8 rec 1src | 23.5 / 10.8 |
| pygmycory | 20 x 10 DERIVED (est) Fishkeeping World | - | - / - |  | 10 1src | 17.5 / 7.9 |
| bristlenose | 23.5 x 12 Seriously Fish | - | - / - |  | 14.3 1src | 23.5 / 21.1 |
| oto | 17.5 Guidarium | - | - / - |  | 10 | 17.5 / 10.6 |
| clownloach | 59 Guidarium | 71 x 23.5 Seriously Fish | - / - |  | 132.1; Rec 171.2 | 47 / 105.7 |
| sae | 30 x 13 DERIVED (est) Fishkeeping World | 35.5 Guidarium | - / - |  | 20; Rec 50 | 35.5 / 29.1 |
| hillstream | 29.5 x 12 Seriously Fish | 35.5 Guidarium | - / - |  | 18 | 29.5 / 15.9 |
| peapuffer | 12 x 8 Seriously Fish | - | - / - |  | 3.3; Rec 5 | 12 / 5.3 |
| cherryshrimp | clearance only | - | - / - |  | 5 | 15.5 / 5.3 |
| amano | clearance only | - | - / - |  | 10 1src | 17.5 / 10.6 |
| nerite | clearance only | - | - / - |  | 2 (est); Rec 10 | 12 / 5.3 |
| mystery | clearance only | - | - / - |  | 5 1src | - / 5 |
| ramshorn | clearance only | - | - / - |  | 5 (est) 1src | 15.5 / 5.3 |
| trumpet | clearance only | - | - / - |  | 5; Rec 10 | 12 / 5.3 |
| ocellaris | 24 x 12 DERIVED (est) Bulk Reef Supply | - | - / - |  | 15; Rec 30 | 23.5 / 19.8 |
| yellowtang | 48 x 18 DERIVED (est) Saltwater Aquarium Blog | 72 (est) Saltwater Aquarium Blog | - / - |  | 90 (est) | 47 / 120.2 |
| bluetang | 71 x 23 DERIVED (est) LiveAquaria | - | - / - |  | 180 (est) | 59 / 150.6 |
| firefish | 30 x 13 DERIVED (est) LiveAquaria | - | - / - |  | 20 (est) | 23.5 / 19.8 |
| banggai | 20 x 10 DERIVED (est) Saltwater Aquarium Blog | - | - / - |  | 10; Rec 30 | 23.5 / 30.4 |
| sixline | 35.5 x 17.5 DERIVED (est) Aquariadise | - | - / - |  | 30; Rec 60 | 35.5 / 55 |
| chromis | 35.5 x 17.5 DERIVED (est) LiveAquaria | - | - / - |  | 30 (est); Rec 60 | 35.5 / 30.4 |
| coralbeauty | 48 x 18 DERIVED (est) LiveAquaria | - | - / - |  | 70 (est) | 35.5 / 70 |
| watchman | 30 x 13 DERIVED (est) Bulk Reef Supply | - | - / - |  | 20 (est); Rec 30 | 35.5 / 19.8 |
| mandarin | 35.5 x 17.5 DERIVED (est) Bulk Reef Supply | - | - / - |  | 30 (est) | 39.5 / 70 |
| turbo | clearance only | - | - / - |  | 10 (est) 1src | 23.5 / 10.6 |
| hermit | clearance only | - | - / - |  | 10 (est) | 23.5 / 10.6 |
| dartfrog | none | 18 x 18 Josh's Frogs | - / 18 Josh's Frogs |  | 10 1src | 18 / 10.6 |
| treefrog | 18 x 18 The Bio Dude | - | 24 The Bio Dude / - |  | 15 (est) 1src | 18 / 20.1 |
| firetoad | none | 24 x 12 The Vet Desk | 12 The Vet Desk / 18 Josh's Frogs |  | 10 1src | 23.5 / 15.1 |
| firenewt | 24 x 12 DERIVED (est) PetMD | - | - / - |  | 15; Rec 20 | 23.5 / 19.8 |
| adf | 15.5 x 7.5 DERIVED (est) Modest Fish | - | - / - | max water 24 (advisory) | 5; Rec 10 | 17.5 / 10.6 |
| axolotl | 17.5 Axolotl.org | 35.5 x 17.5 (est) Reptile Centre | - / 10 Axolotl.org |  | 10 1src; Rec 18.5 | 31.5 / 29.1 |
| crestedharlequin | 18 x 18 Reptiles Magazine | - | 24 ReptiFiles / 36 Reptiles Magazine |  | n/s | 18 / 33.6 |
| crestedgecko | 18 x 18 Reptiles Magazine | - | 24 ReptiFiles / 36 Reptiles Magazine |  | n/s | 18 / 33.6 |
| greenanole | 24 x 24 ReptiFiles | - | 24 ReptiFiles / - |  | 10 (est) 1src | 23.5 / 19.8 |
| greenanolebrown | 24 x 24 ReptiFiles | - | 24 ReptiFiles / - |  |  | 23.5 / 19.8 |
| brownanole | 20 x 10 DERIVED (est) TheVetDesk | - | - / - |  | 10 1src | 23.5 / 10.6 |
| leopardgecko | 36 x 18 ReptiFiles | - | 18 ReptiFiles / - |  | n/s | 36 / 39.6 |
| regaljumper | none | - | - / 8 The Tarantula Collective |  |  | 10 / 0.5 |
| ballpython | 48 x 24 ReptiFiles | - | 24 ReptiFiles / - |  | 40 1src | 48 / 118.9 |
| chacogoldenknee | 20 x 10 Dubia Roaches | 28 x 28 DERIVED (est) Josh's Frogs | 18 Dubia Roaches / - |  | 15 1src | 17.5 / 15.1 |
