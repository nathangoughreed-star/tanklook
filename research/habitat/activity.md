# HB activity / zone research (2026-10-21)

Caveat: the search tool returned mostly weak or mirrored pages. Primary BMEL 1998 text, Swiss TSchV Anhang 2 Tab. 8, and AqAdvisor internals were NOT retrieved. Findings below are tagged STATED (source says it) or INFERENCE.

## 1. Activity vs space
- BMELF Gutachten 1998/99 "Mindestanforderungen an die Haltung von Zierfischen (Süßwasser)", 16 pp. Exists (FishBase ref https://fishbase.se/references/FBRefSummary.php?ID=51539; Bundestierärztekammer calls it outdated, revision in progress, https://www.lobbyregister.bundestag.de/media/89/86/560208/Stellungnahme-Gutachten-SG2506300007.pdf). Its length-factor / activity rules were NOT retrieved. GAP. Primary PDF on bmel.de is the next step.
- Austria 2. Tierhaltungsverordnung Anlage 5 (fish), original 2004 text https://www.ris.bka.gv.at/Dokumente/Bundesnormen/NOR40061210/NOR40061210.pdf (PDF text not machine-readable here; figures via search summary, STATED): tank size classes by edge length, minimum for adult animals, juveniles need adult size:
  60x30x30 cm (24x12x12 in, 14 gal); 80x35x40 (31x14x16 in, 30 gal); 100x40x50 (39x16x20 in, 53 gal); 120x40x50 (47x16x20 in, 63 gal); 150x50x50 (59x20x20 in, 99 gal). Under 54 L (14 gal) prohibited permanently.
  Large fish (>40 cm / 16 in; rays, bichirs, big catfish): 4 m2 (43 sq ft) floor for two, +1 m2 (10.8 sq ft) per extra animal. This is a floor-AREA rule for big benthic-ish fish (STATED).
  Cold-water (koi, goldfish): tank length >= 10x and depth >= 3x largest fish total length (STATED). Length-by-body-length rule, no activity term.
- Bavarian LfL leaflet (display aquaria, native fish) https://lfl.bayern.de/mam/cms07/publikationen/daten/merkblaetter/heimische-fische-schauaquarien_lfl-merkblatt.pdf : example "floor area 5 x 1 m, largest fish must be under 1 m" (STATED): floor-area/length-based.
- Hobby statements (weak, low-quality mirror sites, no figures): "a school of active danios needs a longer tank than slower Corydoras of similar bioload"; "highly active, territorial or social fish need a larger tank at similar body length". Direction supports activity effect; no multiplier.
- Seriously Fish Ancistrus cf. cirrhosus https://www.seriouslyfish.com/species/ancistrus-cf-cirrhosus/ : min 24x12 in (14 gal) for single or pair, territorial vs conspecifics (STATED). Shows how SF gives footprint, not activity multiplier.
- Swimming-speed ethology (BL/s, critical speed): search returned only aquaculture density papers, no usable ornamental scaling. GAP.
- AqAdvisor: sources found describe species entries with swimming zone, adult size, temperament, bioload (generic secondary pages, weak). No evidence AqAdvisor uses an activity multiplier. Own FAQ not reachable (404).

## 2. Territory / home range
- Variabilichromis moorii pair territory <1 to ~4 m2, mean ~2 m2 (11 to 43 sq ft, mean 22), shrinks with depth: https://cichlidae.com/reference.php?id=3943 (STATED, wild, Lake Tanganyika).
- Tanganyikan nesting territories "about 1-2 m diameter" (3-6.5 ft), defended vs brood predators: https://repository.kulib.kyoto-u.ac.jp/dspace/bitstream/2433/68119/1/ASM_15_69.pdf (STATED).
- Pseudotropheus tropheops: territory size depends on male size; number of caves predicted courtship better than area: https://cichlidae.com/reference.php?id=1887 (STATED; shows structure, not area, drives it).
- Convict cichlid territory mapping: https://pmc.ncbi.nlm.nih.gov/articles/PMC4013695 (method, figure not extracted).
- Bristlenose: only hobby statements (one male per cave group unless tank >150 cm / 59 in); no measured territory area. GAP. Gobies / loaches: nothing found.
- No body-length-normalized territory source found. GAP.

## 3. Calibration anchors for bottom vs water split
a. Austrian Anlage 5 (above): edge-length table (fits a floor-area-vs-length curve by body size) + big-fish floor-area rule (4 m2 + 1 m2 each; fits a per-animal floor-area slope for large benthic fish). Stated, regulatory.
b. Cold-water rule 10L x 3D x body length: anchors length and depth as multiples of body length (pelagic-ish goldfish). Stated.
c. Aquaculture: turbot (benthic) is stocked per m2 of floor: cage trial 30-120 fish/m2, best to 90 (https://trjfas.org/pdf.php?id=325); RAS 4-14 kg/m2 (0.8-2.9 lb/sq ft) ~ 40-140 kg/m3 in one tank study (same study gives both units, so implies ~1 m water depth, 10 kg/m2 per 100 kg/m3); industry ceiling 60 kg/m2 (12 lb/sq ft) for 1.5 kg fish, max 100 (https://www.seafish.org/responsible-sourcing/aquaculture-farming-seafood/species-farmed-in-aquaculture/aquaculture-profiles/turbot/sources-quantities-and-cultivation-methods/). Salmon pelagic: welfare threshold ~26.5 kg/m3 (1.65 lb/cu ft). Gives only a RATIO benthic-by-area vs pelagic-by-volume, with production not hobby welfare numbers. Inference-only use.
d. Hobby rule: "count bottom fish against floor, others against volume" appears in secondary calculator pages (weak, no figure). Swiss/German tables with separate bottom-fish area minima: not found.
e. Seriously Fish / species-profile footprints: a large dataset of min footprint per species, to fit floor-area per fish vs body length separately for benthic vs midwater (feasible by scraping, not done).

## 4. Invertebrates
No formal guideline found counting shrimp/snails for space. Hobby forums (AquariumCoop) call snails light bioload; one unsourced rule 5 gal per mystery snail. Generic calculator pages say invertebrates add bioload. Treat as bioload, not floor/swim space (INFERENCE).

## Conclusions
(a) Activity changes space: UNCLEAR-leaning-YES. Direction supported by hobby statements and by regulators giving longer tanks / floor area to big or active fish, but no quantified activity multiplier found; Austrian rules scale by size only.
(b) Candidate multipliers: none sourced. (est) active open-water schoolers 1.25-1.5x tank-length demand vs sedentary at same size; sedentary ambush/bottom-resting 0.5-0.75x volume but keep a floor-area minimum. Mark as estimates.
(c) Ranked calibration: 1) Seriously Fish min-footprint dataset split by zone (best coverage, citable); 2) Austrian Anlage 5 tank-size table + 4 m2 / +1 m2 large-fish rule (regulatory anchor); 3) BMEL 1998 Gutachten primary text (fetch from bmel.de, could contain activity terms); 4) turbot kg/m2 vs kg/m3 as sanity ratio; 5) cichlid territory areas (1-4 m2) for territorial bottom fish ceiling.
