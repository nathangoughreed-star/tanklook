# Species length audit (2026-10-23)

Question: does `species.json` `tl` ("typical adult total length, mm") hold maximum or wrong lengths, or mix standard (SL) and total (TL) length? Trigger: chili rasbora 35 mm vs about 20-23 mm in the literature.
**Status 2026-10-23: applied** (Nathan: update the adult lengths and any other out-of-date info); see Applied at the end. The sections before it are the audit as it stood before the change.

## Method
- 51 freshwater fish rows (`cat` fw-fish). For each, FishBase max length (value and SL/TL type) and Seriously Fish max SL were read from the live pages (3 Sonnet agents; quotes kept in their JSON); the existing `research/sourcing/*.json` batches were cross-checked. Seriously Fish gives SL only and no page states a species SL:TL ratio, so SL is converted at the genus default 1.2. "Typical TL" = adults as kept in aquaria (not record fish): the researcher's estimate, with a reason. It is a judgment, shown beside the sources. Gaps: no Seriously Fish page for comet, oto, sae, goldfish, Ancistrus sp. (FishBase only).
- Off = ours differs from typical TL by more than 25 %.
- Engine runs: `test/length-audit.scratch.test.ts` (gated by LEN_AUDIT, not part of the suite): one species alone in a 55 gal (48 x 13 x 20 in) at its AqAdvisor-fit count (`research/fit.tsv`); reading = space %, filtration % in brackets.

## Findings
1. **Three rows are off by more than 25 %:** chili (+52 %), clown loach (+30 %), swordtail (+27 %; its female, 160 vs about 120, +33 %).
2. **Chili's 35 mm is FishBase's own TL maximum**, which Seriously Fish (20 mm SL) and FishBase's common length (18 mm SL) contradict. Lane CB's combined table (2026-10-21, one-site rule) moved it 18 -> 35.
3. **The AqAdvisor-fitted space factors are stale for 21 freshwater rows.** Lane CB applied new lengths on 2026-10-21 (neon, harlequin, chili, cherrybarb, guppy, molly, swordtail, dwarfgourami, honeygourami, bolivianram, kribensis, goldfish, pandacory, oto, clownloach, peapuffer, boesemani, peacock, kadango, comet, livingstonii) without refitting; `fit.tsv` still holds the fit-time length. Worst: chili's factor 3.36 was fitted at 18 mm (0.1 g) and is applied at 35 mm (0.39 g), so 20 chili in a 55 gal now read **103 %** where AqAdvisor says 37 %. Molly (60 -> 85 mm, 2.9x mass) and clown loach (200 -> 300, 3.3x) are similar.
4. **SL vs TL mix** (the value equals a stated SL, so TL is about 15-20 % higher): ember 20, hatchet 35, afra 100, bristlenose 125, sterbai 65. All inside 25 %; optional.
5. Goldfish 203 and oscar 300 are near-maximum values for fish that average smaller; both are within 25 % of the researcher's typical and left.

## Table (all 51 rows, sorted by distance from typical TL)

| id | scientific name | ours tl | FishBase max | SF max SL | typical TL | ours vs typical | note |
|---|---|---|---|---|---|---|---|
| chili | Boraras brigittae | 35 | 35 TL | 20 | 23 | +52% **OFF** | SF 20 SL x1.2=24; FB common 18 SL=22. Our 35 is FB max TL only; OFF by ~-35% |
| clownloach | Chromobotia macracanthus | 300 | 305 TL | 400 | 230 | +30% **OFF** | FB 305 TL vs SF 400 SL (wild); home-aquarium adults mostly 20-25 cm; 300 is upper bound. |
| swordtail | Xiphophorus hellerii | 140 (f 160) | 140 TL | 140 | 110 | +27% **OFF** | FB 140 TL male/160 female is max; SF 140 SL conflicts; typical aquarium adults ~90-100 SL  |
| guppy | Poecilia reticulata | 30 (f 54) | 50 SL | 60 | 38 | -21% | Wild-type male ~25-30 SL; with caudal ~35-40 TL; female ~40-45 SL, ~50-55 TL. |
| gbr | Mikrogeophagus ramirezi | 60 (f 50) | 42 SL | 40 | 50 | +20% | male 40 SL x1.2 = 48, typical ~50; female ~42 |
| dwarfgourami | Trichogaster lalius | 95 (f 65) | 95 TL | 88 | 80 | +19% | FB 95 TL is max; adults seen 65-85; female ~65 |
| bolivianram | Mikrogeophagus altispinosus | 89 | 56 SL | 80 | 75 | +19% | FB 56 SL vs SF 80 SL conflict; aquarium adults ~60-65 SL, ~75 TL. |
| kadango | Copadichromis borleyi | 140 (f 120) | 140 TL | 200 | 170 | -18% | FB 140 TL vs SF 200 SL (~240 TL) conflict; aquarium adults ~12-14 cm SL, ~15-17 cm TL. |
| dwarfpencil | Nannostomus marginatus | 35 | 35 TL | 25 | 30 | +17% | Typical adults ~25 SL x1.2 = 30 TL; FB 35 is a max |
| honeygourami | Trichogaster chuna | 50 (f 50) | 137 TL | 55 | 60 | -17% | FB 137 TL conflicts >25% with SF 55 SL (~66 TL); FB figure looks wrong, trust SF; typical  |
| peapuffer | Carinotetraodon travancoricus | 35 (f 30) | 35 TL | 25 | 30 | +17% | FB biology: 'Reaches less than 2.5 cm TL'; SF 25 SL (~30 TL); typical ~25-30 TL. |
| hillstream | Sewellia lineolata | 60 | 57 SL | 65 | 70 | -14% | SF 65 SL, typical ~55 SL x1.25 = 70 |
| cardinal | Paracheirodon axelrodi | 45 | 30 SL | 35 | 40 | +13% | SF 35 SL x1.2 = 42; adults seen ~40 |
| bronzecory | Corydoras aeneus | 65 | 75 SL | 75 | 75 | -13% | typical ~63 SL x1.2 = 75; ours 65 ~13% low |
| ember | Hyphessobrycon amandae | 20 | 20 SL | 20 | 23 | -13% | Both sites give 20 mm SL; x1.2 = ~24 mm TL; typical fish slightly under max. |
| hatchet | Carnegiella strigata | 35 | 35 SL | 35 | 40 | -12% | 35 SL x1.2 = 42; typical 40 |
| harlequin | Trigonostigma heteromorpha | 50 | 50 TL | 45 | 45 | +11% | FB 50 TL; SF 45 SL would be ~54 TL but that is a captive max; typical aquarium adult ~40 S |
| kribensis | Pelvicachromis pulcher | 110 (f 75) | 110 TL | 100 | 100 | +10% | Males ~9-10 TL typical in tanks, females ~7; 110 is max |
| cherrybarb | Rohanella (Puntius) titteya | 55 (f 50) | 50 TL | 50 | 50 | +10% | SF 50 SL (~60 TL) is max; FB 50 TL; typical aquarium adults ~42 SL, ~50 TL. |
| neon | Paracheirodon innesi | 38 | 25 SL | 30 | 35 | +9% | SF 30 SL x1.2=36; FB 25 SL=30; typical adults 30-35 TL |
| livingstonii | Nimbochromis livingstonii | 250 | 250 TL | 250 | 230 | +9% | FB 250 TL/200 F; SF 250 SL (~300 TL) is wild max; aquarium adults ~19 SL, ~23 TL. |
| bristlenose | Ancistrus sp. | 125 | 91 SL | n/f | 115 | +9% | Common bristlenose (A. cf. cirrhosus/ temminckii) ~9-10 cm SL max, typical ~9 SL, loricari |
| tigerbarb | Puntigrus tetrazona | 70 | 70 TL | 60 | 65 | +8% | Aquarium adults ~5.5 SL = 65 TL; 70 is max |
| pandacory | Corydoras panda | 46 | 38 SL | 50 | 50 | -8% | FB 38 SL (~46 TL), SF 50 SL max; typical adults ~40 SL, ~48-50 TL. |
| pygmycory | Corydoras pygmaeus | 25 | 21 SL | 30 | 27 | -7% | FB 21 SL=25 TL; SF 30 SL=36 TL; typical ~22-25 SL x1.2 |
| sae | Crossocheilus oblongus | 150 | 160 SL | n/f | 140 | +7% | FB 160 SL is wild max; aquarium SAE ~12-14 TL commonly sold/kept |
| demasoni | Pseudotropheus demasoni | 70 | 63 SL | 75 | 75 | -7% | SF 75 SL x1.2=90 is max; captive adults ~65 SL = 75-80 TL |
| sterbai | Corydoras sterbai | 65 | 68 SL | 65 | 70 | -7% | typical ~58 SL x1.2 = 70 |
| angel | Pterophyllum scalare | 150 | 105 TL | 150 | 140 | +7% | FB biology line also says 15 cm TL; SF 150 SL; typical captive adult body ~12 SL, ~14 TL e |
| oto | Otocinclus vittatus | 33 | 33 TL | n/f | 35 | -6% | FB 33 TL is max; ~30-35 TL typical |
| platy | Xiphophorus maculatus | 40 (f 60) | 40 TL (female 60 TL) | 50 | 38 | +5% | FB male 40 TL, female 60 TL; common 24 TL |
| afra | Cynotilapia afra | 100 | 101 SL | 100 | 105 | -5% | Typical ~8.5-9 SL x1.2 ~105 TL; our 100 close |
| whitecloud | Tanichthys albonubes | 40 | 40 TL | 40 | 38 | +5% | FB 40 TL, SF 40 SL (~48 TL); typical aquarium adults ~30-32 SL, ~38 TL. |
| gourami | Trichopodus leerii | 120 (f 110) | 120 TL | 120 | 115 | +4% | Both pages say 120 (SL vs TL); typical aquarium adults ~11-12 TL |
| labeo | Labeotropheus trewavasae | 120 | 117 TL | 113 | 125 | -4% | SF 113 SL max; typical ~100 SL x1.2=120-125 TL |
| rummynose | Hemigrammus rhodostomus | 50 | 50 TL | 50 | 48 | +4% | FB 50 TL but SF 50 SL (=60 TL) is a record; typical ~48 |
| auratus | Melanochromis auratus | 110 (f 100) | 110 TL | 110 | 115 | -4% | FB 110 TL, SF 110 SL (=130 TL); typical ~115 |
| discus | Symphysodon aequifasciatus | 150 | 137 SL | 140 | 155 | -3% | Adults 13-14 SL, TL ~15-16 |
| peacock | Aulonocara stuartgranti | 118 (f 100) | 118 TL | 130 | 120 | -2% | Captive males ~12 TL; females smaller |
| boesemani | Melanotaenia boesemani | 108 (f 80) | 90 SL | 110 | 110 | -2% | male typical ~95 SL x1.2 = 115; females ~80 TL |
| goldfish | Carassius auratus | 203 | 480 TL | n/f | 200 | +2% | Common goldfish in aquaria/ponds ~15-25 cm; fancy types shorter body; 200 reasonable. |
| cpd | Danio margaritatus | 25 (f 25) | 21 SL | 21 | 25 | 0% | 21 SL x1.2=25; females same SL |
| betta | Betta splendens | 65 (f 55) | 65 TL | 70 | 65 | 0% | FB 65 TL matches typical; SF 70 SL x1.2=84 is upper wild bound; trade fish ~55-65 |
| comet | Carassius auratus | 250 | 480 TL | n/f | 250 | 0% | 480 is record; aquarium/pond comets ~200-300 TL |
| danio | Danio rerio | 50 | 38 SL | 50 | 50 | 0% | SF 50 SL max, FB 38 SL; typical 40-42 SL x1.2 = 50 |
| molly | Poecilia sphenops | 85 (f 96) | 75 SL | 80 | 85 | 0% | SF 80 SL; typical adults 70 SL x1.2 = 85 (female bigger ~95) |
| cockatoo | Apistogramma cacatuoides | 85 (f 50) | 50 SL | 75 | 85 | 0% | male 70 SL x1.2 = 85; female 50 SL x1.2 = 60 (ours 50 low) |
| syno | Synodontis njassae | 190 | 192 TL | 190 | 190 | 0% | FB 192 TL; SF 190 SL is larger; aquarium ~15-19 cm |
| oscar | Astronotus ocellatus | 300 | 457 TL | 350 | 300 | 0% | FB common 24 TL, max 46; home aquarium adults ~28-33 |
| kuhli | Pangio kuhlii | 100 | 120 TL | 100 | 100 | 0% | eel-like, SL~TL; FB 120 TL max, typical 8-10 cm |
| yellowlab | Labidochromis caeruleus | 100 (f 90) | 81 SL | 100 | 100 | 0% | FB 81 SL (~97 TL), SF 100 SL is max; typical aquarium adults ~80 SL -> ~95-100 TL. |

## Proposed lengths and what the reading does

| id | tl now -> proposed | grams now -> new | now | new, factor untouched | new, factor compensated (factor) | AqAdvisor |
|---|---|---|---|---|---|---|
| chili **(>25 %)** | 35 -> 23 | 0.39 -> 0.11 | 103.4% (1.1) | 58.4% (0.4) | 103.4% (0.4); 3.36 -> 5.94 | 37% (n=20) |
| clownloach **(>25 %)** | 300 -> 230 | 255.27 -> 115.95 | 420.9% (262.1) | 304.9% (116.6) | 434.9% (116.6); 2.32 -> 3.31 | 237% (n=7) |
| swordtail **(>25 %)** | 140 -> 110 | 32.15 -> 15.37 | 173.8% (55.6) | 130.9% (17.5) | 182.5% (17.5); 0.89 -> 1.24 | 93% (n=13) |
| guppy | 30 -> 38 | 0.41 -> 0.85 | 62.8% (1.1) | 87.8% (2.1) | 62.8% (2.1); 2.01 -> 1.44 | 69% (n=20) |
| kadango | 140 -> 170 | 38.62 -> 69.01 | 66.2% (36.2) | 82.3% (75.8) | 63.3% (75.8); 0.84 -> 0.65 | 79% (n=8) |
| honeygourami | 50 -> 60 | 1.68 -> 2.87 | 71% (3.7) | 110.3% (5.9) | 69.4% (5.9); 1.84 -> 1.16 | 84% (n=20) |
| peapuffer | 35 -> 30 | 0.97 -> 0.62 | 69.9% (2.4) | 57.2% (1.6) | 69.9% (1.6); 2.78 -> 3.39 | 93% (n=20) |
| gbr | 60 -> 50 | 3.6 -> 2.05 | 97.8% (7.2) | 81.1% (4.5) | 87.9% (4.5); 0.93 -> 1.2 | 69% (n=20) |
| dwarfgourami | 95 -> 80 | 12.11 -> 7.25 | 78.3% (30.1) | 64.8% (13.1) | 81.7% (13.1); 0.83 -> 1.05 | 84% (n=20) |
| ember | 20 -> 23 | 0.1 -> 0.16 | 24.4% (0.4) | 29.6% (0.5) | 24.4% (0.5); 1.82 -> 1.5 | 27% (n=20) |
| hatchet | 35 -> 40 | 0.82 -> 1.24 | 54.5% (2) | 65.7% (2.9) | 54.5% (2.9); 1.27 -> 1.05 | 48% (n=20) |

Reading the table:
- **Factor untouched** is the biggest swing and is wrong for any row whose factor was fitted to the old length. Chili alone falls 103 % -> 58 %, clown loach 421 % -> 305 %, swordtail 174 % -> 131 %. Filtration falls much more, because waste follows mass (swordtail 56 -> 18 %, clown loach 262 -> 117 %).
- **Compensated** holds the space reading where it is (within a few points; floor and height terms use the length separately), so it only stops a length change moving the reading. For chili it keeps the 103 % that is already wrong. Filtration is not compensated: it follows the true mass.
- **A refit is the real fix for the 21 stale rows.** Rough factor that would put us on AqAdvisor at the new length (compensated factor x AqAdvisor / our space): chili about 2.1, clown loach about 1.8, swordtail about 0.6. Exact values need `node scripts/space-factors.mjs` on a regenerated `fit.tsv`. Many unchanged rows (harlequin, cherrybarb, molly, bolivian ram, kribensis, bronzecory) also read 1.4-2.0x AqAdvisor in this setup, so the fit has drifted since later lanes (HC height, tank-wide school discount), not only on length.
- Female lengths (`female.tl`: swordtail 160, guppy 54, platy 60) are not in this run; the factor is fitted on the species row.
- Other effects of a length change: the drawn card width (`tl` is the width), the `hsCm` height need, the depth rule ("water shallower than adult length"), and the `research/sourcing` citations (a changed value drops its "cited" status until re-sourced; provenance.ts needs an entry per changed constant).

## Recommendation (for Nathan)
- **Change now:** chili 35 -> 23 (FishBase common 18 SL, Seriously Fish 20 SL, x1.15-1.2), with its factor refitted in the same change. Swordtail 140/160 -> 110/120 and clown loach 300 -> 230 are the other two over 25 %. Clown loach 300 was explicitly adopted by Nathan on 2026-10-20 (FishBase 305 TL max), so that one is his call, not an error.
- **Optional (15-25 % off, mostly SL-vs-TL or max-vs-typical):** guppy male 38, kadango 170 / 140, honeygourami 60, peapuffer 30, gbr 50, dwarfgourami 80, ember 23, hatchet 40.
- **Whatever is chosen, refit the factors of all 21 stale rows** (fit.tsv regenerated at current lengths). That is a larger, separate piece and changes readings for many species; proposed as its own lane.

## Applied (branch length-audit, not pushed)

- **Lengths (species.json):** chili 35 -> 23, clown loach 300 -> 230, swordtail 140/160 -> 110/120, guppy 30 -> 38, kadango 140/120 -> 170/140 (its note now says 17 / 14 cm), honey gourami 50/50 -> 60/60, pea puffer 35/30 -> 30/27, ram 60/50 -> 50/42, dwarf gourami 95 -> 80, ember 20 -> 23, hatchet 35 -> 40. The female lengths of ram, pea puffer and honey gourami moved so a female is not left longer than the male the wrong way round; those three are my call from the same sources.
- **Space factors refitted** (research/length-refit.scratch.test.ts.txt, then `node scripts/space-factors.mjs`) for every freshwater fish whose length differs from its fit.tsv length: 22 rows, so the fit-count tank in a 55 gal reads what AqAdvisor said (water %, the part the factor controls). Class medians moved: tiny 1.47 -> 1.58, mid 0.93 -> 0.83, big 1.45 -> 1.36 (only species without their own factor use them). Refits:

```
neon 35->38 mm, 0.50->0.69 g, factor 1.19 -> 1.18, space 37.0% (AqAdvisor 37%)
ember 20->23 mm, 0.10->0.16 g, factor 1.82 -> 1.66, space 27.0% (AqAdvisor 27%)
harlequin 45->50 mm, 1.80->2.53 g, factor 0.71 -> 0.44, space 39.0% (AqAdvisor 39%)
chili 18->23 mm, 0.10->0.11 g, factor 3.36 -> 2.13, space 37.0% (AqAdvisor 37%)
cherrybarb 50->55 mm, 1.60->2.17 g, factor 1.05 -> 0.65, space 54.0% (AqAdvisor 54%)
guppy 35->38 mm, 0.70->0.85 g, factor 2.01 -> 1.58, space 69.0% (AqAdvisor 69%)
molly 60->85 mm, 4.10->12.02 g, factor 1.04 -> 0.64, space 81.0% (AqAdvisor 81%)
swordtail 120->110 mm, 20.10->15.37 g, factor 0.89 -> 0.63, space 93.0% (AqAdvisor 93%)
honeygourami 45->60 mm, 1.20->2.87 g, factor 1.84 -> 1.40, space 84.0% (AqAdvisor 84%)
gbr 60->50 mm, 3.60->2.05 g, factor 0.93 -> 0.94, space 69.0% (AqAdvisor 69%)
bolivianram 80->89 mm, 8.70->12.13 g, factor 0.93 -> 0.72, space 92.0% (AqAdvisor 92%)
kribensis 90->110 mm, 10.30->18.78 g, factor 0.87 -> 0.57, space 88.0% (AqAdvisor 88%)
goldfish 160->203 mm, 49.80->101.83 g, factor 1.87 -> 1.76, space 180.0% (AqAdvisor 180%)
pandacory 50->46 mm, 1.20->0.89 g, factor 0.97 -> 1.07, space 43.0% (AqAdvisor 43%)
oto 40->33 mm, 0.80->0.46 g, factor 1.57 -> 3.34, space 60.0% (AqAdvisor 60%)
clownloach 200->230 mm, 76.60->115.95 g, factor 2.32 -> 1.80, space 237.0% (AqAdvisor 237%)
hatchet 35->40 mm, 0.80->1.24 g, factor 1.27 -> 0.93, space 48.0% (AqAdvisor 48%)
boesemani 100->108 mm, 12.30->15.55 g, factor 1.03 -> 0.82, space 106.0% (AqAdvisor 106%)
peacock 130->118 mm, 30.90->23.16 g, factor 0.87 -> 0.96, space 85.0% (AqAdvisor 85%)
kadango 150->170 mm, 47.50->69.01 g, factor 0.84 -> 0.81, space 79.0% (AqAdvisor 79%)
comet 200->250 mm, 103.50->204.02 g, factor 1.76 -> 1.67, space 177.0% (AqAdvisor 177%)
livingstonii 200->250 mm, 112.20->218.63 g, factor 1.48 -> 1.36, space 154.0% (AqAdvisor 154%)
```

- Floor-bound species (bronze cory, kribensis, ram, bolivian ram) read their floor %, which the factor does not touch; their water % now matches AqAdvisor.
- **Sourcing:** research/sourcing/LA.json (+ .verify.json): 16 fields (11 tl, 5 female.tl) cited as derived from FishBase / Seriously Fish quotes; the unsourced ratchet baseline and research/source-coverage.md regenerated.
- **Re-blessed:** test/fixtures/anchor-baseline.json (embers are smaller), the planted / iwagumi / paludarium / blackwater upkeep and the blackwater setup cost in tech.test and gearFilters.test (food follows mass; the blackwater tank is sized by its fish), the scale-anchor test (chili 23), src/data/bodyvolume.json (3D body volume at the new lengths).
- **Not done:** `scripts/body-mass.mjs` was not rerun: it overwrites lane SN's hand edits (notes, some `a` values), so the `model` cross-check in bodymass.json is a few % stale. Neon, bronze cory and other rows whose length did not change keep their factors, although the whole fit has drifted from AqAdvisor since lane HC (median reading 1.1x, range 0.6-1.9x): a full refit is its own lane.
- Full suite: 116 files passed, 1 skipped; tsc clean.
