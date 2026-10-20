# Measured TAN excretion and O2 consumption for ornamental and proxy freshwater species

Prepared 2026-10-20. No repo edits. TAN is expressed as mg of ammonia-N per kg of fish (wet) per day unless stated.

## Conventions
- Conversion: 1 umol N / g / h = 14.007 mg N / kg / h = **336.2 mg N / kg / d**. 1 mmol O2 = 31.998 mg O2. Where a paper says "TAN" in mg without saying N or NH3, I treated it as mg N and flagged that.
- "Opened" levels:
  - **FT** = full text read. Via Europe PMC XML through a summarising fetch, or a PDF converted with pdftotext.
  - **Abs** = abstract page only.
  - **Snip** = search-result text only.
- Model to compare against: 900 x W^-0.25 mg TAN/kg/d, W in g. That is 506 at 10 g, 338 at 50 g, 285 at 100 g and 190 at 500 g.

## Headline results
1. **The prior note misread the Nile tilapia datum.** Y = 955.69 - 147.12 ln(W) is mg/kg/d with W in g. The 956-1362 figures are the 1 g intercept, not the rate of a typical fish. At real weights the Korean tilapia fits give these rates, with rations of 6%, 3% and 1.5% of body weight per day for the three sizes:

   | Weight | Rate, 30.5% protein diet | Rate, 35.5% protein diet | Model 900 W^-0.25 |
   |---|---|---|---|
   | 4.8 g | 725 | 1033 | 608 |
   | 42.7 g | 403 | 575 | 352 |
   | 176.8 g | 194 | 277 | 247 |

   So the model sits within about 0.7-1.3x of this dataset at the 30.5% protein level. The data stop at 177 g, so the 500 g comparison is extrapolation.
2. **No ornamental-species TAN rate was found for fed fish.** Fed rates exist only for food-fish proxies: Nile tilapia, red tilapia, perch, tench and tambaqui. Ornamental fasted rates exist for the cardinal tetra, a goldfish, and loricariid and callichthyid-type catfishes (Sturisoma, Anadoras, Pterygoplichthys), all in Wood/Val-lab work. For zebrafish, guppy, betta, Corydoras, discus, angelfish, oscar and Apistogramma there are O2 data or nothing, but no TAN. Neocaridina has neither in anything I could open.
3. **Waste follows ration almost linearly.** Tench TAN-N per g of feed is 0.023-0.026 g/g at 0.2% and 0.8% ration. Nile tilapia is about 0.012-0.017 g/g. Both are well under the 0.029-0.03 g/g in the Timmons basis (see section 4).
4. **The fasted/endogenous rate at 25 C scales as about W^0.75.** Pooling 8 fasted points gives approximately 330-370 x W^-0.25 mg N/kg/d, which is about 0.37-0.41 x the model's 900 x W^-0.25.

## 1. Measured TAN excretion data

All values are net ammonia-N unless noted. "Conv" shows the conversion to mg N/kg/d.

| # | Species | Mass | Temp | State and ration | Reported | Conv to mg N/kg/d | Source | Opened |
|---|---|---|---|---|---|---|---|---|
| 1 | Goldfish, *Carassius auratus* | 4.6 +/- 1.3 g | 25 C | Fed 1% tank mass/d for 2 weeks, fasted 48 h before the flux. Fasting 5 d gave the same rate. | Jamm 1.17 +/- 0.12 umol/g/h (sign negative = excretion). Urea-N 0.2-0.4 umol N/g/h in the figures, not extracted | 1.17 x 336.2 = **393** | Smith et al. 2012 CBPA, doi 10.1016/j.cbpa.2012.02.019, https://www.zoology.ubc.ca/~woodcm/Woodblog/wp-content/uploads/2016/08/Smith-et-al.-2012.CBPA_.pdf | FT (pdftotext) |
| 2 | Cardinal tetra, *Paracheirodon axelrodi* | about 0.3-0.5 g | 30-35 C | Fasted 3-10 d, wild Rio Negro fish, pH 4.5 water | JAmm about -1,500 to -1,700 nmol/g/h from day 3 (moenkhausia -1741 +/- 148 at day 3 and -1659 +/- 87 at day 7). Day 0 was about -10,000 (capture stress). Urea-N -200 to -400 nmol/g/h | 1.5-1.7 umol N/g/h = **504-571** (at 30-35 C) | Wood et al. 2014 J Comp Physiol B 184:877, doi 10.1007/s00360-014-0847-7, https://www.zoology.ubc.ca/~woodcm/Woodblog/wp-content/uploads/2016/08/Wood-et-al.2014.JCPB_.pdf | FT (pdftotext). The cardinal tetra figure is read from text for moenkhausia and "about -1,500" for cardinal. Fig. 1 not read. |
| 3 | Hemigrammus (*H. rhodostomus*) | 0.3-0.5 g | 30-35 C | Fasted 3-7 d | -2,375 +/- 288 (day 3), -2,473 +/- 241 (day 7) nmol/g/h | 2.4 umol N/g/h = **~800** (at 30-35 C) | same paper | FT |
| 4 | *Sturisoma* sp. (loricariid), Rio Negro | 18 +/- 3 g | 31.9 C | Fasted | NH3-N 442 +/- 48 and urea-N 124 +/- 17 umol/kg/h. Means across all PO2 levels, not strictly normoxic. | ammonia **149**, plus urea 42 | Pelster, Wood and Val 2026 J Fish Biol, doi 10.1111/jfb.70022, PMC13122577 | FT (Europe PMC XML) |
| 5 | *Anadoras weddellii* (doradid catfish) | 50 +/- 9 g | 32.5 C | Fasted | NH3-N 899 +/- 122, urea-N 188 +/- 34 umol/kg/h | **302**, plus urea 63 | same | FT |
| 6 | *Tympanopleura atronasus* (auchenipterid) | 17 g | 32.5 C | Fasted | NH3-N 460 +/- 79, urea-N 128 +/- 18 | **155**, plus urea 43 | same | FT |
| 7 | Sternopygid knifefish | 105 g | 32.5 C | Fasted | NH3-N 674 +/- 121, urea-N 201 +/- 50 | **227**, plus urea 68 | same | FT |
| 8 | *Pterygoplichthys gibbiceps* (pleco) | 0.28 kg | 31.9 C | Fasted | Total N 0.50 +/- 0.06 mmol/kg/h, 77% ammonia, so 0.385 mmol NH3-N/kg/h | 5.39 mg/kg/h = **129** | Pelster, Wood and Val 2026, doi 10.1111/jfb.70012, PMC13122576 | FT |
| 9 | *Pterygoplichthys pardalis* (pleco) | 0.30 kg | 31.9 C | Fasted | Total N 0.38 +/- 0.03 mmol/kg/h, 77% ammonia, so 0.293 | 4.10 mg/kg/h = **98** | same | FT |
| 10 | Tambaqui, *Colossoma macropomum* (Neotropical characin, pacu relative; food fish) | large, 100-150 g | 28 C | Fasted 48-72 h | Total ammonia-N 324 +/- 12 umol/kg/h, urea-N 58 +/- 5 | 4.54 mg/kg/h = **109** | Wood, Netto et al. 2017 J Comp Physiol B, doi 10.1007/s00360-016-1027-8, https://www.zoology.ubc.ca/~woodcm/Woodblog/wp-content/uploads/2017/10/Wood-Netto-et-al.2017.JCPB_.pdf | FT |
| 11 | Tambaqui, small | 10-25 g | 28 C | Fasted 2-8 d after daily satiation feeding (45% protein) | stable about 600 umol N/kg/h (read from the text; Fig. 9 not read) | 8.4 mg/kg/h = **202** | same | FT |
| 12 | Tambaqui, small | 10-25 g | 28 C | Day 1 after a feeding series (26-30 h after the last meal) | about 1100 umol N/kg/h | 15.4 mg/kg/h = **370** | same | FT |
| 13 | Nile tilapia | 4.8 / 42.7 / 176.8 g | not in abstract | Fed 6 / 3 / 1.5 %BW/d; 30.5% and 35.5% protein diets | Y = 955.69 - 147.12 ln W (30.5% protein, r2 0.95) and Y = 1362.41 - 209.79 ln W (35.5%, r2 0.99), mg/kg/d. TAN = 28.5-37.1% (low) and 37.4-38.5% (high) of ingested N. Post-meal peak at 4-8 h, back to baseline within 24 h. | 725/403/194 and 1033/575/277 (computed) | https://sciwatch.kiost.ac.kr/handle/2020.kiost/5073 | Abs |
| 14 | Red tilapia (*Oreochromis* sp.), RAS | 20, 30, 40, 60, 80, 120, 180, 200 g | not stated in snippet | Fed. Laboratory rations fall from about 3.6% to 2.1%/d over 100-800 g in a related report. | 34.06, 32.56, 27.06, 17.46, 12.54, 12.48, 7.87, 5.83 mg/kg/h. 39.4% of feed N excreted as ammonia-N | x24: **817, 781, 649, 419, 301, 300, 189, 140** | search-result text, originating from an aquaculture paper I did not identify | Snip |
| 15 | Eurasian perch | about 18-82 g (my reading of "18-82 g") | 23 C | Fed, RAS | AE 22.0 down to 5.6 mg TAN/kg/h as fish grew; OC 336 down to 185 mg O2/kg/h. Mean 5.5-6.4 mg/kg/h in a related paper | **528 down to 134** | https://www.infish.com.pl/wydawnictwo/Archives/Fasc/work_pdf/Vol13Fasc2/ (w10; direct fetch returned HTTP 404, so snippet only) | Snip |
| 16 | Tench, juvenile | 15-19 g | 23 C | Fed at 0.2% and 0.8% of biomass per day | 0.2%: 1.95 mg TAN/kg/h, 127 mg O2/kg/h. 0.8%: 8.80 mg TAN/kg/h, 187.35 mg O2/kg/h. | **46.8** at 0.2% and **211** at 0.8% | Springer, Aquaculture International, doi 10.1007/s10499-005-9019-9 (the page redirects to a login handshake; read from search-result text) | Snip |
| 17 | Common carp, 18-70 g, 40 L aquaria | 18-70 g | 17 C | Fed ad libitum 3x daily | 0.69 down to 0.26 ug/g/h | 17-6.2 mg/kg/d, **not usable**: the fish are stocked in aquaria with a biofilter and the rates are net | Torres-Mesa et al. 2015 Orinoquia 19:19, https://www.redalyc.org/pdf/896/89640816002.pdf | FT. Rejected as too low and probably biofilter-confounded. |
| 18 | Betta splendens, males 1.1-2.4 g | 1.1-2.4 g | 25 C | Fasted 2 d | Baseline ammonia and urea shown only in figures. Urea under 23% of total N. | not extractable | Kajimura et al. 2023 BMC Zool, PMC10621081 | FT, no numbers in the text |
| 19 | Red sea bream (marine) | juvenile | 10-25 C | Fasted 72 h / fed | Fasted 88.8-143.3 mg/kg/d (125 at 20 C). Fed 344-684. | fed/fasted about 3-5 | https://koreascience.or.kr/article/JAKO201010250392820.pdf | Snip |
| 20 | Rock bream (marine) | juvenile | 15-25 C | Fasted vs post-prandial hourly | Fasted 7.7, 10.2, 11.9 vs post-prandial peak 34.0, 47.8, 60.2 mg/kg/h | peak/fasted ratio about 4.4-5 at an hourly peak | Korean KCI study (sciwatch.kiost.ac.kr/handle/2020.kiost/39313) | Snip |

Not found, for any ammonia/TAN rate: guppy, neon tetra (only cardinal tetra and relatives), Corydoras, discus, angelfish, oscar (only graphs; Wood et al. 2007 Am J Physiol 292:R2048 and Robertson et al. 2015 PBZ 88:357 have figures that I could not read numerically), Apistogramma, cherry/Amano shrimp (the NTU Neocaridina paper, Huang and Chen 2004, http://ntur.lib.ntu.edu.tw/bitstream/246246/161932/1/36.pdf, would have it; the PDF failed a certificate check and I did not bypass it), and zebrafish (Vergauwen et al. 2013 J Comp Physiol B 183:109 and the Frontiers in Zoology 2014 cold paper both measured adult ammonia excretion, but both text bodies were behind paywall or redirect walls).

## 2. Oxygen consumption (cross-check)

| Species | Mass | Temp | State | Value | mg O2/kg/h | Source | Opened |
|---|---|---|---|---|---|---|---|
| Zebrafish adults, 5-month | 0.326 +/- 0.103 g | 28 C | standard metabolic rate (24 h min distribution, anaesthetised controls) | RS (juveniles+adults) = 0.276 M^0.969 mg O2/h (M in g). RA = 0.809 M^0.969 for active. The abstract gives 0.273 M^0.965 for all stages, the mass-specific unit in the abstract is a typo for mg O2/h. | RS about **286**. Active about 840. | Lucas et al. 2014 J Fish Biol, https://archimer.ifremer.fr/doc/00180/29113/88195.pdf | FT (pdftotext) |
| Guppy | 74 mg mean | 25 C | fasted 24 h, SMR over 20 h | log10 SMR (mg O2/h) = -0.95 + 0.61 log10(BM g). Exponent 0.61. | 74 mg: about **310**. 0.2 g: 210. 0.5 g: 147. Extrapolation beyond 74 mg is weak. | Auer et al. 2018 Nat Commun, PMC5750215 | FT (Europe PMC XML). The text did not state the mass unit, and g is the only reading that gives a plausible rate. |
| Apistogramma trifasciata | 0.564 +/- 0.040 g | 28 C | fasted 24 h, control trial initial MR | 0.436 +/- 0.024 mg O2/h | about **773** (initial rate, so an upper bound) | Ojelade et al. 2024 Conserv Physiol, PMC10823353 | FT |
| Goldfish | 17-25 g | about 21 C at baseline (the test ramps from 21 to 30 C) | fasted 24-48 h; fed 3% BW raised MO2 by 35%, peaking at 3 h | routine mesor 90.5, lowest 77, pre-warming baseline 112 +/- 5 mg O2/kg/h. Q10 = 3.06 between 21 and 30 C | at 25 C by Q10 about **150-185** | Metabolic Rate of Goldfish, Biology 2024, doi 10.3390/biology13100804, PMC11504095 | FT (first 100k characters) |
| Nile tilapia | 4, 40, 120, 400 g | 20, 25, 30 C | not stated in the abstract | 25 C: 435.2, 345.9, 151.5, 115.9. 20 C: 318.8, 214.9, 84.1, 69.4. 30 C: 611.1, 538.4, 320.8, 236.0 | as listed. Fitted exponent at 25 C is 0.70 (r2 0.87). | Kim & Jo 1999 J Aquaculture 12:247, https://koreascience.kr/article/JAKO199911920164768.do | Abs |
| Corydoras aeneus | 1.651 g | 25 and 30 C | fasted 24 h | SMR in mg O2/h, values only in Fig. 1 | not extractable | Pineda et al. 2020 J Exp Biol, PMC7673363 | FT, no numbers |
| Sturisoma 18 g | 18 g | 31.9 C | fasted | about 3 mmol/kg/h | **96** | Pelster et al. 2026 | FT |
| Anadoras 50 g | 50 g | 32.5 C | fasted | 5.70 +/- 0.60 mmol/kg/h | **182** | same | FT |
| Pterygoplichthys gibbiceps | 0.28 kg | 31.9 C | fasted | about 3 mmol/kg/h, all from water | **96** | PMC13122576 | FT |
| Hypostomus plecostomus | 14-80 g | 25 C | fasted | no values extracted. The abstract gives oxyregulation and Pcrit of 55 and 33 mmHg for 14-30 g and 31-80 g. | not found | doi 10.1007/BF01875572 | Snip |
| Angelfish, discus, betta adults, oscar (resting MO2) | n/a | n/a | n/a | Umezawa et al. 1986 (angelfish) exists but no abstract found. Discus: nothing. Betta: larval 4-4.8 umol O2/g/h only. Oscar: only a statement that the juvenile resting MO2 is low. | not found | n/a | n/a |

### TAN to O2 ratios (both in mass, N over O2)
- Fasted tropical fish (Wood/Val-lab data) run about **0.04-0.07**:
  - Sturisoma 6.19 / 96 = 0.064.
  - P. gibbiceps 5.39 / 96 = 0.056.
  - Anadoras 12.59 / 182 = 0.069.
  - Tambaqui NQ 0.16-0.23 mol N per mol O2, which is 0.07-0.10 by mass, including urea.
- Fed fish in the aquaculture studies run lower, about **0.015-0.065**:
  - Perch 22/336 = 0.065 for small fish and 5.6/185 = 0.030 for large fish.
  - Tench 8.80/187 = 0.047 at 0.8% ration, and 1.95/127 = 0.015 at 0.2%.
  - Nile tilapia (42.7 g, fitted rate / O2 of 346) = 0.049 (low protein) and 0.069 (high protein).
- **The rule "TAN is 0.1-0.14 x O2 consumption" is not supported by these data.** In every dataset above it overstates TAN by 1.5-3x, unless the "TAN" figure is expressed as NH3 or NH4 rather than N (multiply by 1.21 or 1.29) or the O2 figure is a minimum. I recommend not using it to predict ornamental TAN from O2.

## 3. Fits and proposals

### 3a. Mass exponent, fed fish
The fed datasets are confounded because ration in %BW falls with size.
- Nile tilapia (6 -> 1.5 %BW over 4.8 -> 177 g): TAN per kg falls with exponent -0.357, so whole-fish exponent **0.64** (r2 0.97). Ration per kg falls with exponent -0.384 over the same span, so TAN/ration is flat at about 0.012-0.017 g/g.
- Red tilapia 20-200 g: whole-fish exponent **0.24** (r2 0.95), too steep, with ration also falling.
- Perch (if 18-82 g): whole-fish exponent about 0.10, again with ration varying.
- O2 exponents measured at fixed conditions: tilapia 0.70, guppy 0.61 (narrow range), zebrafish 0.97 (0.1-0.5 g, narrow), review mean 0.79 across 69 species.

At constant %BW feeding the exponent for fed TAN should be about 1.0. At the ration-decline typical of husbandry (Korean tilapia) it is about 0.65. **W^0.75 sits between the two and is a defensible default.** The coefficient depends on the ration used. My fitted fed-tilapia curve at 25 C, with 30.5-35.5% protein flake and rations from 6% (small) to 1.5% (large), is:

| W | Fed TAN-N, mg/kg/d | Model 900 W^-0.25 |
|---|---|---|
| 10 g | 590-840 | 506 |
| 50 g | 330-470 | 338 |
| 100 g | 260-370 | 285 |
| 500 g | 150-210 (extrapolated) | 190 |

At high rations (3-6% BW) the model is within about +/-30% of tilapia, at the low end. For aquarium rations of 0.2-1% BW, use the ration formula below instead.

### 3b. Feeding level
- Tench at 23 C: 0.2% and 0.8% rations give 46.8 and 211 mg/kg/d, i.e. a slope of 273 mg/kg/d per %BW ration and an intercept of about 0 (the line reaches zero at 0.03% BW). **That is 0.023-0.026 g TAN-N per g feed, in line with the Timmons basis of 0.029.**
- Nile tilapia: 0.012-0.017 g TAN-N per g feed at 30.5-35.5% protein, about 25-30% of ingested N.
- Bagchi's goldfish F5 (from the prior note): 107 mg N/kg/d at 0.19% BW/d of feed, which lies between the tench 0.2% value (47) and the tambaqui fasted values.
- **Proposed form: TAN-N (mg/kg/d) = E(W) + k x feed (mg feed per kg fish per d)**, with k = 0.013-0.026 (0.02 central, scaled by dietary protein / 32%) and E(W) the fasted rate below. For 1% BW/d of 38% protein flake (10,000 mg/kg/d) this gives E + about 200-260. For a 0.2% ration it gives E + 40-50.

### 3c. Fasted vs fed multiplier
- Fasted rate at 25 C. Pooling the eight fasted points above (cardinal tetra, goldfish, 2 tambaqui sizes, Sturisoma, Anadoras, 2 Pterygoplichthys), with Q10 of 1.5-2.0 to bring them to 25 C, fits **E = 330-370 x W^-0.25 mg N/kg/d (whole-fish exponent 0.74-0.75, r2 0.72-0.76)**:

  | W | E, mg/kg/d |
  |---|---|
  | 10 g | 180-210 |
  | 50 g | 120-140 |
  | 100 g | 100-117 |
  | 500 g | 66-78 |

  The scatter is wide: roughly +/-40% around the fit. The goldfish point (393 at 4.6 g) was measured in flux chambers after handling and may be inflated. The cardinal tetra rates sit at 30-35 C in wild-caught fish in black water, possibly with residual handling stress.
- Fed multiplier:
  - Tambaqui small fish: day 1 post-feeding about 1.8x the long-fasted rate (370 vs 202).
  - Tilapia fed at 1.5-6% BW over fasted E: the fits above at 50 g (330-470) vs E of 120-140 give **about 2.4-3.9x**.
  - Tench 0.8% vs 0.2% ration: 4.5x.
  - Red sea bream (marine): fed 344-684 vs fasted 89-143, about **3-5x**.
  - Goldfish MO2 +35% when fed at 3% BW: a lower bound for the TAN increase.
- **Proposal: fasting is about 0.25-0.4 of the fed rate at typical 1-3% BW feeding, or about 0.5 of a day-1 post-meal rate. In aquarium terms: TAN-N = E + 0.02 x feed.**
- Timing: the post-meal peak is at 4-8 h in tilapia and 2-4 h in rock bream, and returns to baseline within 24 h. A daily-average model is fine for a day-long mass balance but not for short-term peak TAN.
- Compare with the model: the model's 338 mg/kg/d at 50 g is 2.5x E and corresponds to about 0.8-1.1% BW/d of a 32% protein feed by the formula above. A tank fed 0.2-0.3% (Bagchi) would be around 150-200 mg/kg/d at 50 g.

### 3d. Temperature
- Tilapia O2 rises 1.61x from 20 to 25 C and 1.53x from 25 to 30 C (Q10 about 2.6 and 2.3).
- Tambaqui ammonia-N Q10 about 1.5 between 28 and 33 C (and 3.8 above 33 C). O2 Q10 about 1.9.
- Goldfish O2 Q10 = 3.06 between 21 and 30 C.
- Use Q10 1.5-2 for TAN, and note that the fasted-fish scaling in 3c used the same range.

### 3e. Species classes
Evidence is thin. What the numbers show:
- **Small schoolers (tetras, hemigrammus, zebrafish at 0.3-0.5 g)** have the highest mass-specific rates, 320-800 mg/kg/d fasted at 30-35 C (cardinal and hemigrammus tetra) or an implied 400-700 from zebrafish O2 at 0.3 g. That agrees with the W^-0.25 trend extended down to 0.3 g (fit gives about 330-370 x 0.3^-0.25 = 450-510 at 25 C). **No separate schooler multiplier is needed**; size explains it.
- **Bottom feeders and air-breathing loricariids (Sturisoma, Pterygoplichthys)** have fasted rates at the low end: 74-112 mg/kg/d at 25 C-equivalent, versus 97-179 for the tambaqui and the Anadoras at 223. They are 0.6-0.9x the pooled fit, but the sample is 4 points from one lab and fish were all caught wild and fasted for days.
- **Sedentary vs active:** no data separate them. The tambaqui showed ammonia-N excretion constant with swimming speed (only urea rose), so swimming activity does not move TAN much.
- **Cichlids** (oscar, Apistogramma, tilapia as proxy): Apistogramma initial MO2 of 773 mg/kg/h at 0.56 g is similar to what the zebrafish scaling would give for a 0.5 g fish at 28 C (about 280 standard, 830 active). No cichlid TAN measured apart from tilapia.
- **Shrimp:** no usable values. Penaeus vannamei (a marine penaeid) is reported at about 383 mg O2/kg/h, 0.15 g NH4-N/kg/d starved and 0.41 fed (snippet only, not applicable to Neocaridina without a freshwater dwarf-shrimp measurement).

## 4. Implications for the 900 W^-0.25 model
- At rations of 1.5-6% BW the model sits at 0.7-1.3x the fed Nile tilapia fit and is not contradicted.
- At typical aquarium rations (0.2-0.5% BW), the measured rate is about E + 0.02 x feed, which is well below the model. Examples at 50 g: 0.2% BW -> E 130 + 40 = 170; 0.5% -> 130 + 100 = 230; 1% -> 130 + 200 = 330.
- The 0.03 g TAN/g feed basis is high for tilapia (0.012-0.017) but matches the tench (0.023-0.026). There is no support for increasing it.
- **The earlier note's conclusion that the model is "0.2-0.3x tilapia" was wrong.** It compared 1 g intercepts to 50-1000 g fish.

## 5. Caveats
- Fed data for ornamental species do not exist in what I could reach. Everything for fed fish is food-fish aquaculture (tilapia, perch, tench, tambaqui).
- The tench, perch and red tilapia figures come from search-result text and are not verified against the papers. The perch weight range 18-82 g is my reading.
- Wood/Val-lab fasted rates are in flux chambers at 28-35 C on wild-caught Amazonian fish, in a few cases with acute handling stress.
- Mass-exponent fits use 3-8 points and mix labs, temperatures and diets. The r2 values are descriptive, not tests.
- I assumed "TAN" or "ammonia-N" means mass of N. If the papers meant NH3 or NH4+ mass, the conversion to N lowers the rates by 18-22%. I could not verify this for the Korean tilapia, red tilapia, tench and perch.
- The Korean tilapia abstract gives no temperature. Tilapia O2 values at 25 C are from a different Korean paper (Kim & Jo 1999) that does not say whether fish were fed.
