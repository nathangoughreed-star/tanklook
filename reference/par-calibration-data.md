# PAR calibration data (web research, 2026-10-14)

Confidence key: A = number read directly from the page text by me; B = read via a summarising fetch tool or search summary, page not independently confirmed; C = vendor/blog estimate, method unstated. Many forum sites (UKAPS, Reef2Reef, reefs.com via tool, Fluval) blocked fetches (403 or bot check), so those are search-snippet only (B/C).

## 1. PAR-at-depth datasets

### D1. JBL LED SOLAR NATUR, white LED panel (A) - best dataset found
- Tech: white LED, 3 colour temps. Watts: 68 W (stated). Length: not stated. Mount: 4-5 cm above water surface. Tank: JBL koi aquarium, depth 1 m, L x W not stated.
- Meter: waterproof-cased PAR meter, model not stated; values include ~16% correction for the case. Measured below centre of LED only (no edge data). In water for depth rows.
- Source: https://www.jbl.de/en/blog/detail/500/par-measurements-in-the-aquarium-the-strength-of-the-jbl-led-solar

| Depth (cm) | 2700 K | 4000 K | 6700 K |
|---|---|---|---|
| in air, at surface | 817.8 | 865.4 | 864.2 |
| 0 (just under surface) | 788.8 | 788.8 | 827.1 |
| 10 | 345.7 | 336.4 | 386.3 |
| 20 | 225.0 | 229.7 | 266.8 |
| 30 | 157.8 | 167.0 | 191.4 |
| 40 | 131.1 | 121.8 | 149.6 |
| 50 | 114.8 | 103.2 | 125.3 |
| 60 | 100.9 | 99.8 | 104.4 |
| 70 | 89.3 | 87.0 | 96.3 |

Derived: air-to-just-under-surface ratio 0.96 / 0.91 / 0.96 (so ~4-9% surface loss at 4-5 cm gap, wet side measured). Fraction of under-surface value remaining: 10 cm 0.44; 20 cm 0.29; 40 cm 0.17; 60 cm 0.13. Per-watt at 10 cm: ~5 PAR/W. Note a 1 m deep koi tank has no wall reflections to speak of, so this is near the "open water, no reflective walls" case; a real glass tank returns more light at depth.

### D2. Fluval Plant 3.0 (manufacturer chart), planted RGB LED (B; method not stated by Fluval)
- Values reported via search summary of Fluval US/CA product pages (fluvalaquatics.com/us/shop/product/plant-3-0; page itself returned 403 to me). Measurement conditions (mount height, tank, meter, intensity) NOT stated; assume max output, depths from water surface.

| Model (rated watts, fixture fits) | 8 cm | 15 cm | 30 cm |
|---|---|---|---|
| 22 W (15-24 in) | 442 PAR / 24000 lux | 227 / 11000 | 80 / 4330 |
| 32 W (24-34 in) | 453 / 28300 | 252 / 15260 | 107 / 6330 |
| 46 W (36-46 in) | 470 / 29400 | 267 / 15970 | 112 / 7020 |

- Extra depths for 46 W, claimed from Hagen via UKAPS post (C): 18 in (46 cm) 66; 24 in (61 cm) 40. https://ukaps.org/forum/threads/fluval-plant-3-0-for-high-tech.61339
- Singapore review (C): 46 W, 40 cm depth, 80-100 centre, 45-55 corner. https://gensou.sg/?p=41232
- Derived (my arithmetic): PAR/W at 30 cm = 3.6 / 3.3 / 2.4 for 22/32/46 W. Lux-to-PAR ratio at 30 cm: 80/4330 = 0.0185 (identical to Apogee sunlight factor - suggests the lux column is computed from PAR, not independently measured).
- Fixture lengths: model names imply 24/34/46 in class; actual lengths not confirmed.

### D3. Portland Aquarium round-up of white / planted LED bars (C; mostly in-air, no method)
Source: https://portlandaquarium.net/planted-aquarium-led-light/ (A for transcription). Page states "Most PAR values are measured in air"; no meter, no mount height; position not stated. Depth column = distance from light.

| Fixture | Watts | Length | PAR | Note |
|---|---|---|---|---|
| Finnex FugeRay Planted+ clip | 5 | 10 in | 35 @ 12 in | |
| SEAOURA 24/7 clip-on | 20 | 11.8 in | 80 @ 12 in | |
| Nicrew SkyLED Plus | 30 | 30-36 in | 95 @ 12 in | "in air" |
| SEAOURA full-spectrum | 26 | 34.5 in | 134 @ 12 in | |
| Finnex Planted+ 24/7 HLC | 19 | 24 in (page conflicts: PAR tied to 48 in) | 86 @ 14 in | "in air" |
| Finnex Stingray 3 | 35.6 | 48 in | 90 @ 12 in | |
| Finnex Planted+ 24/7 Series 3 | 58 | 48 in | 125 @ 14 in | |
| Current Satellite Plus Pro | 65 | 48-60 in | 155 @ 12 in | |
| Current Satellite Freshwater LED Plus | 25 | 48 in | 35+ @ 12 in | |

Derived PAR/W at 12-14 in (in air): Stingray 3 2.5; Planted+ S3 2.2; Nicrew 3.2 (30 W); Satellite Pro 2.4; Satellite FW Plus 1.4. Mid-range ~2-3 PAR/W at ~30-35 cm in air for bar LEDs. (Contradicts pulserevops.com, which lists Nicrew 30-35 PAR at 12 in and Stingray 2 20-25 PAR at 12 in - that site looked unreliable, B/C, ignore.)

### D4. Gensou (Singapore) planted RGB comparison (C; no wattage, meter or tank)
Source: https://gensou.sg/?p=40754 (read via fetch tool, B). Mount height 30 cm.

| Fixture | Surface PAR | PAR at 30 cm depth |
|---|---|---|
| ADA Solar RGB | ~250 | ~80-100 |
| Chihiros WRGB II 60 | 200 | 70 |
| Twinstar 600B | 180 | 60 |
| Week Aqua Z | 220 | 75 |

Ratio 30 cm depth / surface = 0.33-0.40. Same site, Chihiros WRGB II (search summary, C): 60 cm tank, 36 cm water depth, 130-150 PAR at substrate at full output, ~70 at 40% dim. https://gensou.sg/chihiros-wrgb-ii-led-review/ (could not open page; unverified). Twinstar 600C 95-110 at 45 cm substrate: https://gensou.sg/?p=41255 (C).

### D5. AI Hydra 32 HD, reef LED (A) - DaniReef lab, in air
- Tech: reef white+blue+violet multi-channel LED. Watts: 90.5 W measured at the wall. Footprint: ceiling-light, not stated. Meter: Apogee MQ-510. In AIR (the lab says readings in air must be divided by 1.32 for underwater-calibrated meter; their reported values are stated as already corrected - ambiguous). Centre readings. Sensor distances 17 / 37 / 57 cm (nominal 20/40/60 cm).
- Source: https://reefs.com/2020/07/29/ai-hydra-32-led-ceiling-light-performances-and-par-analyzed-in-the-danireef-lab (fetched with curl; text read)
- Centre PAR: 17 cm 1908; 37 cm 462 (page text at the 37 cm section and at the 57 cm section both say "1908 to 462 to 197", so 37 cm = 462, 57 cm = 197).
- Their summary says "21.08 PAR per watt" at 17 cm centre. Over a 70x70 cm plane, integrated "energy" figure 560/563/463 (units unclear) - mean PAR over the 70x70 plane not reliably readable.
- Derived: 462/1908 = 0.24 at 2.2x distance (inverse-square would give 0.21), 197/1908 = 0.10 at 3.4x (inverse-square 0.09) -> ceiling-light behaves like a point source.
- Same page, other fixtures, centre at 17 cm: Philips CoralCare 190 W (+749 euro) 2088 (Apogee); Cetus 2 60.7 W 746; Orphek Atlantik V4 226 W 1515 (page's own summary table). These are in-air, close-range, centre-only.

### D6. Kessil A160WE Tuna Sun, reef LED (B/C - single Reef2Reef post via search snippet)
- ~1400 PAR at 4 in (10 cm) below lens at 100% intensity, 50% colour; club PAR meter; top third of tank ~250 PAR with cover off, bottom of 16 in tank ~125 PAR under the light. Watts not given in snippet (Portland page lists 40 W). Thread: https://www.reef2reef.com/threads/kessil-360w-or-we-par.437986/ (403, not opened). Uncertain.

### D7. T5 HO, Barr Report "Massaged PAR data for T5HO" (B; chart is an image, text only)
Source: https://barrreport.com/threads/massaged-par-data-for-t5ho-lights.5865/ and /page-3. Planted-tank readers quoting VaughnH's data. Reflector type not stated beyond "typical reflectors that those fixtures use". Meter unnamed (Apogee mentioned elsewhere). Measured in water/at substrate is not explicit.

| Setup | Height | PAR | Note |
|---|---|---|---|
| 2 x 54 W T5HO | 30 in above substrate | ~60 total (~30 per bulb) | tank 14 in front-to-back |
| 1 bulb (54 W) | at top of 24 in tank (substrate 24 in away) | ~40 per bulb | |
| 1 bulb | ~35 in from substrate (10-11 in above tank top) | ~20 per bulb | |
| 2 x 55 W T5HO in a line | 20 in from substrate | ~45 at substrate | GE 9325K, ~18-month-old bulbs; 45 gal 36x18x12 poster |
| T12 2x30 W Verilux, basic reflector | 6 in above surface, 45 gal 36x18x12 | ~45 just under surface; 25-30 mid-water; 15-20 at substrate | different poster, T12 (T8-class) |

Derived: 2 x 54 W (108 W) giving 60 at 30 in is 0.55 PAR/W at the substrate; 2 x 55 W at 20 in 45 -> 0.41 PAR/W. Much lower per watt than LED because of tube geometry and reflector spread. Note the 30 in / 20 in are air gaps + water depth together.

### D8. T5 HO 4 x 54 W, UKAPS (C)
UKAPS post https://www.ukaps.org/forum/goto/post?id=346173 (bot-blocked; via search snippet): Aquart 4x54W T5HO, Vossloh ballasts, single shared reflector, Dennerle Trocal tubes (2x6000K, 2x3000K). Dry, in air. ~40 PAR at about 105 cm from lamps (4 lamps); 2 lamps reach ~40 at ~80 cm. Corners/front/back 5-10 PAR lower than centre. Table was hard to read; treat as uncertain.
Also a UKAPS-quoted generic claim (C): standard T5HO without good reflector 82 PAR at 10 in, 11 PAR at 26 in.

### D9. Practical Fishkeeping LED vs T5/MH test (A, but data paywalled)
https://www.practicalfishkeeping.co.uk/fishkeeping-news/review-suggests-halides-have-had-their-day/ : 10 LED units (Coraled 114 W, Reef Beam UK 120 W, TMC AquaRay etc.) plus T5 and metal halide, >2000 readings, four depths, tanks up to 90 cm. Numbers are in the March 2010 magazine only; not obtainable here.

## 2. Photon efficacy (PPE, umol/J)

| Source type | PPE | Source / confidence |
|---|---|---|
| Horticultural LED fixtures (10 tested) | best two 1.66-1.70; MSU range quoted 1.13-2.59 for later high-output fixtures | Nelson & Bugbee 2014, PLoS ONE, https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0099010 (A for 1.66-1.70); MSU range via search snippet (B) |
| Horticultural LED, theoretical max | 4.6-5.1 | MSU snippet (B) |
| Fluorescent fixtures (2 tested, T5-class), best | 0.95 | Nelson & Bugbee 2014 (A) |
| T5 HO lamp | ~1.23 | Carnivero grow-light table https://www.carnivero.com/pages/grow-light-metrics (B, conditions not stated, weak source) |
| T8 lamp | ~0.84 (60 W T8 giving 48 umol/s = 0.80, my division) | Carnivero (B); MSU Lamp PPF sheet https://www.canr.msu.edu/floriculture/uploads/files/Lamp%20PPF.pdf (B, PDF blocked) |
| Ceramic metal halide, best fixture | 1.46 | Nelson & Bugbee 2014 (A); Carnivero says 1.0-1.5 (B) |
| Mogul HPS (reference) | 1.02 (400 W magnetic 0.9-0.94; 1000 W DE 1.7) | Nelson & Bugbee (A); MSU (B) |
| White aquarium LED bar | NOT FOUND published. Back-calculation only: JBL 68 W gives ~790 PAR under surface; no flux. | gap |
| Blue reef LED | NOT FOUND published | gap |
| CFL | NOT FOUND | gap |
| Halogen / incandescent | NOT FOUND | gap |

Note: Nelson & Bugbee give fixture-level (lamp+ballast+luminaire) efficacy; lamp-only figures are higher. Common textbook values for incandescent (~0.2-0.4) and halogen are from my memory, not sourced: do not use without a citation.

## 3. Lux to PPFD (Apogee, Thimijan & Heins 1982 HortScience 18:818-822) - read directly (A)
Source: https://www.apogeeinstruments.com/conversion-ppfd-to-lux/ (curl fetch; page cites Thimijan & Heins 1982)

| Light source | Lux -> PPFD | PPFD -> lux |
|---|---|---|
| Sunlight (also used by vendors for "full-spectrum LED") | 0.0185 | 54 |
| Cool white fluorescent | 0.0135 | 74 |
| Mogul-base HPS | 0.0122 | 82 |
| Dual-ended HPS (ePapillion 1000 W) | 0.0130 | 77 |
| Metal halide | 0.0141 | 71 |
| Ceramic MH CMH942 (4200 K) | 0.0154 | 65 |
| Ceramic MH CMH930 (3100 K) | 0.0170 | 59 |

Not given by Apogee: LED (white), halogen, incandescent, blue reef LED. Apogee's Light Unit Converter app mentions T5 fluorescent but factors not found. UC Davis (foot-candle basis): sunlight 5.01, metal halide 6.60, cool-white fluorescent 6.87, HPS 7.62 PPFD per ... (as quoted in search snippet, unverified; https://ucnfa.ucdavis.edu/news/lighting-illuminated).
JBL page gives paired lux/PAR but its "lux" column is in units that look like kilolux or mis-scaled (31.2 for 818 PAR), so not usable for a factor.
Fluval lux column at 30 cm gives 80/4330 = 0.0185 (equals sunlight factor).

## 4. Other cross-checks
- Meter dive factor 1.32 (Apogee MQ-510: in-air readings must be divided by 1.32 for an underwater-calibrated sensor) - DaniReef page (A). Other sources say ~1.33 / 25% too-high reading; JBL used a 16% case correction.
- Tom Barr light classes (VaughnH thread, B): low 25-40, medium 40-60, high-medium 60-80, high 80-120 umol at substrate.

## 5. Gaps
- No usable T5HO per-reflector (individual reflector) table with watts, height, and depth; only Barr Report image chart. No bare T5 dataset; only T12 (Verilux 2x30 W) as a T8-class proxy.
- No metal halide or CFL aquarium dataset (Practical Fishkeeping data paywalled).
- No manufacturer data for Chihiros/Twinstar/ONF with watts and tank dims (only vendor blogs).
- No published PPE for aquarium LED, CFL, halogen, incandescent.

## 6. Lane K2 additions: metal halide, CFL / power compact, halogen (web research, 2026-10-14)
Blocked (HTTP 403 / bot check): reefs.com (all Joshi / Marks / Riddle articles), canr.msu.edu ("Lamp PPF" sheet,
lighting-metrics.pdf), journals.ashs.org (Thimijan & Heins 1983). So no Joshi PAR-vs-distance tables and no MSU sheet;
their numbers below are search snippets only (B). Fits and residuals: test/lightout.test.ts, "metal halide pendants".

### D10. Nelson & Bugbee 2014, PLOS ONE, whole-fixture PPE (A)
- https://extension.usu.edu/apec/files/publications/publication/pub__8264567.pdf (USU preprint). 400-700 nm photons,
  whole fixture (ballast, reflector, optics included).
- Ceramic MH 315 W 3100 K 1.46; 4200 K 1.38; 2 x 315 W Boulderlamp CMH 1.25; fluorescent 400 W induction 0.95;
  T8 60 W fixture 0.84 (48 µmol/s at 58 W); mogul HPS 1.02; best HPS / LED 1.66-1.70 µmol/J.
- These are horticultural 3-4K lamps; aquarium 10-20K MH bulbs are bluer and much less efficient (D12).

### D11. Lux to PPFD for MH and incandescent (A: AGi32; B: others)
- AGi32 (https://docs.agi32.com/AGi32/Content/adding_calculation_points/PPFD_Concepts.htm), lux per µmol/m²/s:
  CIE A incandescent 2856 K 49.3; D65 54.6; MH 3144 K 69.4, 4002 K 66.7, 4039 K 61.3; HPS 85.
- Mars Hydro (B): cool-white fluorescent 74, MH 71, ceramic MH 4200 K 65, 3100 K 59. U Arkansas citing Thimijan &
  Heins (B): fluorescent 72-77, MH 72. No halogen-specific factor: incandescent 49 used.

### D12a. Joshi bare-lamp series, reefs.com (A; read in the app's browser 2026-10-14, the plain fetch was blocked)
- Setup (150 W DE article, Nov 2002, "Test Setup"): bare lamp on a black-painted bracket, no reflector, LI-COR
  spectroradiometer 18 in (457 mm) below the lamp's central axis; wall power measured per lamp / ballast.
- PPFD per wall watt at 18 in (my arithmetic over the tables):
  - 10K (250 W DE: Ushio 103 @ 307 W, AB 128 @ 304, Giesemann 108 @ 309, HIT 111 @ 308, XDE 136 @ 314, Sun Aq 142 @ 345,
    EVC 180 @ 365; 150 W DE ~64-78 @ 164-212 W): 0.34-0.49 per W.
  - 13-14K (Sun Aq 14K 77.5 @ 333, Aqua Connect 14K 102 @ 313, Arcadia 14K 88 @ 318, Giesemann 13K 113 @ 336; 400 W Ushio
    14K on IceCap 151 @ 428): 0.23-0.35 per W.
  - 20K (XDE 55 @ 269, Coralvue 58 @ 314, Sun Aq 80 @ 333, Giesemann 52.5 @ 305, Helios 78 @ 338, AB 57.7 @ 308): 0.17-0.24 per W.
  - So per watt a 20K bulb gives about half the PAR of a 10K. Glass UV shield: about -18%.
- Sources: https://reefs.com/magazine/spectral-analysis-of-150w-double-ended-metal-halide-lamps-and-ballasts/ ,
  .../spectral-analysis-of-250w-double-ended-10000k-metal-halide-lamps-and-ballasts/ ,
  .../product-review-more-spectral-analysis-of-250-watt-double-ended-metal-halide-lamps-and-ballasts/ ,
  .../400-watt-mogul-metal-halide-lamps-ushio-14000k-icecap-400w-series-elios-10000k/ (and the 250 W mogul parts I / II,
  175 W part I, "recent lamps and ballast combinations").

### D12b. Joshi, "Analyzing Reflectors: Lumenbrite III, Lumenmax Elite, Lumenmax, Lumenarc III" (A)
- https://reefs.com/magazine/product-review-analyzing-reflectors-lumenbrite-iii-lumenmax-elite-lumenmax-and-lumenarc-iii/
- Ushio 14000 K 400 W mogul on an IceCap 400 W electronic ballast (bare: 151 at 18 in), in air, 13 x 13 grid at 3 in
  over 3 x 3 ft, 24 in and 30 in from the lamp. Sums of PPFD over the 3x3 / 2x2 / 1x1 ft squares and the maximum:
| Reflector | at | 3x3 | 2x2 | 1x1 | max |
|---|---|---|---|---|---|
| Lumenarc III (19.5 in square) | 24 in | 28147 | 18544 | 7299 | 349 |
| | 30 in | 22645 | 13660 | 4890 | 222 |
| Lumenbrite III (20 in octagon) | 24 in | 35700 | 28214 | 13473 | 669 |
| | 30 in | 31586 | 22171 | 9361 | 444 |
| Lumenmax Elite (15 in) | 24 in | 33229 | 26138 | 13571 | 711 |
| | 30 in | 29080 | 21735 | 10219 | 519 |
| Lumenmax large (22 in) | 24 in | 32886 | 21954 | 8391 | 383 |
| | 30 in | 27630 | 17202 | 6159 | 270 |
- Fit of the model's cos^m spot (all 8 numbers per reflector, one output and one beam angle each): Lumenarc 95°,
  0.68 µmol/s per wall W; Lumenbrite 55°, 0.56; Lumenmax Elite 50°, 0.50; Lumenmax large 100°, 0.86; every number
  within ±10%. So the model's beam shape holds for real pendants, and ppe x eta for a 14K lamp in a pendant ~0.5-0.86.
- Model (Nathan 2026-10-14: split by bulb colour; test against the lab data, forum sets logged only): 'mh' 10-14K
  ppe 0.83 x eta 0.77, 'mh-20k' ppe 0.47 x 0.77. Reflector grids with one eta: -30..+33% (tested at ±35%, the reflectors
  themselves spread ±27%). In water, Lumenarc-like 95° beam: Melev (D13, Radium 20K) -8 / -14 / -33%; the forum sets D14 / D15 read 2-3x LOWER than the model (old bulbs, meters that
  under-read blue MH light, positions unstated: likely, not shown).

- MSU "Lamp PPF" sheet (Runkle, GPN May 2021; PDF supplied by Nathan): fixture PPF only for T8 60 W (48 µmol/s, from
  Nelson & Bugbee 2014), HPS 400 / 600 / 1000 W and horticultural LEDs. No CFL, halogen or MH rows: nothing new for K2. Riddle power compact data and
  Thimijan & Heins: not found / not reached.

### D12. Joshi / Marks bare 250 W MH lamps, in air, sensor 18 in (457 mm) from the lamp (B, search snippets; superseded by D12a)
| Lamp | Ballast | unshielded | shielded |
|---|---|---|---|
| 250 W DE Sun Aquatics 20000 K | M80 HQI | 80.3 | 64.1 |
| same | IceCap electronic | 63.8 | 50.8 |
| 250 W DE Sun Aquatics 14000 K | M80 | 77.5 | 61.8 |
| 250 W mogul PFO 13000 K | M80 / IceCap / M58 | 75.7 / 43.9 / 45.3 | |
- Derived (my arithmetic): ~75 µmol at 0.457 m broadside from a double-ended lamp (intensity ~ sin θ, so on-axis =
  flux / π² r²) gives 0.6 µmol/J; isotropic gives 0.76. Model uses ppe 0.75 for aquarium 14-20K lamps on their ballast.

### D13. Melev's Reef 2008, MH pendants in water (A numbers; tank and spacing NOT stated, assumed)
- https://melevsreef.com/node/243. Radium 20000 K, 250 W, IceCap and magnetic ballasts, bulbs 9 in above the water,
  battery PAR meter (unnamed), probe in water. Three bulbs; tank ~280 gal (diary name only).
| Depth | PAR (range over bulbs) |
|---|---|
| 1 in | 646-749 |
| 6 in | 344-463 |
| 12 in | 283-349 |
- Fit assumes 72 x 24 in, 30 in of water, bulbs 24 in apart, 120° reflectors: model -20 / -24 / -39%.

### D14. ReefCentral "Par readings", 250 W 14K Phoenix, 12 in above a 48 x 24 x 24 in tank (C)
- https://forums.reefcentral.com/threads/par-readings.1724773. Club meter (~15% calibration error suspected).
- Near the bulb in air ~1200; at the surface 300s; just under 200s; "a few inches" 150 or lower; bottom (24 in) 70-80.
- Fit (2 in 250, 3 in 150, 24 in 75): +11 / +66 / +17%. The 3 in row is a bound at an unstated depth: logged, not tested.

### D15. 400 W 20K MH, 16 in above the water, tank middle (B/C, forum snippet; tank assumed 48 x 24 x 24 in)
- ~200 at 1 in, 135 at 10 in, 110 at 20 in. Fit: +46 / +7 / -27%.
- Also seen, not used (C, distance vs depth unclear, wattage per search summary 400 W): Marine Colorado "Very cheap
  halides" bulbs at 6 / 12 in: Radium 610 / 430, Plusrite 14K 778 / 560, Plusrite 20K 477 / 350, Ushio 20K 530 / 382.

### D16. Halogen / incandescent (my computation; no data)
- 3000 K blackbody photon split blue / green / red 0.10 / 0.30 / 0.60 (2800 K 0.09 / 0.29 / 0.62; 3200 K 0.12 / 0.32 /
  0.57); gives 47 lux per µmol vs AGi32 incandescent 49.
- PPE: no measurement found. Blackbody estimate 0.3-0.4 µmol/J for a bare filament; one Philips MR11 page 0.1 (B).
  Model: ppe 0.3, eta 0.6, both ESTIMATES. No PAR-at-distance table for halogen spots found.

### D17. CFL / power compact: no PAR tables found
- PPE proxy: Nelson & Bugbee T8 fixture 0.84 (D10). Typical CFL efficacy 50-70 lm/W over the fluorescent factor
  74 gives 0.7-0.95 µmol/J (my arithmetic, efficacy range not from a dataset). Model: ppe 0.8; eta 0.5 is an ESTIMATE.
