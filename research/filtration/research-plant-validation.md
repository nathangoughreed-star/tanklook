# Plant N uptake: validation of the earlier estimates

Searched 2026-10-20. "Opened" = I read the primary text (PDF or full page) myself. "Snippet" = only a search-result excerpt, not opened. Where a page was blocked I say so.

## 1. Aquaponics design ratios

| Datum | Value | Units | Source | Opened primary | Confidence |
|---|---|---|---|---|---|
| Feed ratio, leafy greens | 40-50 | g feed / m2 plant area / d (32 % protein feed) | https://learn.farmhub.ag/resources/small-scale-aquaponic-food-production/8-management-and-troubleshooting/component-calculations-and-ratios/ | Yes (extension guide, not a paper) | Medium |
| Feed ratio, UVI raft system | 60-100 (optimum 2-3 oz/yd2/d) | g feed / m2 / d | https://www.uvi.edu/research/agricultural-experiment-station/aquaculture-home/aquaponic-systems/ | Yes (Rakocy's page) | High |
| Best-biomass feed ratio, Bibb lettuce trial (15-90 tested) | 60 gave top biomass; 30-45 more profitable | g feed / m2 / d | https://was.org/Meeting/Program/PaperDetail/160489 (Kentucky State) | Snippet (abstract) | Medium |
| 20/40/60 g/m2/d tilapia-lettuce trial, month 3 | nitrate 13.2 / 20.5 / 27.4 mg/L; ammonia 0.53 / 0.82 / 1.10 mg/L | mg/L | https://www.frontiersin.org/journals/sustainable-food-systems/articles/10.3389/fsufs.2025.1681782/full | Yes, first 100k chars (no N budget found in that part) | Medium |
| N removal by romaine lettuce rafts (UVI) | NH3-N 0.56, NO2-N 0.62, total N 0.83 | g N / m2 plant area / d | Rakocy design tables, quoted via search; links https://archive.uvi.edu/files/documents/Research_and_Public_Service/WRRI/UVIAquaponicSystem.pdf and https://cales.arizona.edu/azaqua/ista/ISTA9/PDF's/RakocyAquaponicSystem.pdf | No. UVI PDF returned 401, Arizona PDF 404/HTML. Snippet only | Medium (two search hits agree on same table) |

Sanity check on the 0.83: 60 g feed x 32 % protein / 6.25 = ~3.1 g N fed per m2 per day. So lettuce removes ~27 % of feed N (arithmetic mine; the fraction is not stated in a source I read). Fully lit, fertilised lettuce on 100 % of the area is the ceiling for a tank: ~0.8 g N/m2/d.

## 2. Measured removal by aquarium-type plants

| Datum | Value | Units | Source | Opened | Confidence |
|---|---|---|---|---|---|
| Egeria densa N absorption from water, this study, nitrate | 0.36 | mg N / g DW / d | Feijoo et al. 2002, Limnetica, Table 7 https://www.waterboards.ca.gov/waterrights/water_issues/programs/bay_delta/docs/cmnt081712/sldmwa/feijooetal2002.pdf | Yes (full PDF text) | High for the measurement; lab, 6 mg DIN/L |
| Egeria densa, ammonium | 1.09-1.18 | mg N / g DW / d | same | Yes | High (3x nitrate rate) |
| Egeria densa, literature (Reddy 1987, 21 mg N/L) | 0.31-0.74 | mg N / g DW / d | same, Table 7 | Yes (secondhand via Feijoo) | Medium |
| Egeria: sediment N uptake | negligible | n/a | same | Yes | High |
| Elodea nuttallii, 0.5 g DW in 1 L, 2 mg/L NH4-N + 2 mg/L NO3-N | 75 % of NH4 gone in 16 h, nitrate untouched until NH4 exhausted | = ~2.3 mg N / g DW / d (my arithmetic, short pulse, upper bound) | Walstad 2017 handout, redrawing Ozimek https://dianawalstad.com/wp-content/uploads/2017/05/biolfiltration2017a.pdf | Yes (PDF text) | Medium; short-term, rich in NH4 |
| Pistia stratiotes, time to take up all N | NH4 3.9-4.3 h at every concentration 0.025-6.4 mg/L; NO3 18 h at 0.025 up to 44 h at 6.4 mg/L | hours | same Walstad handout, Table 2 (Nelson 1980) | Yes | Medium |
| Pistia on a RAS biofilter, 30 d, thinly planted | 1.16 | g N / m2 / d (plant biomass N, not nitrate directly) | https://www.globalseafood.org/advocate/denitrification-in-recirculating-aquaculture-systems-comparison-of-aquatic-plants/ | Yes | Medium-high; nutrient-rich fish water, 28-32 C |
| Water hyacinth, same trial | 0.43 | g N / m2 / d | same | Yes | Medium-high |
| Lemna, area basis | ~0.55 (cited 547 +/- 136 mg N/m2/d) | g N / m2 / d | cited in review via search, https://pmc.ncbi.nlm.nih.gov/articles/PMC6711526/ | No (PMC blocked by reCAPTCHA) | Low-medium |
| Duckweed NH4 vs NO3 | NH4 3-11x faster | ratio | same | No | Low-medium |
| Elodea canadensis / E. nuttallii tissue N | difference 6.0 mg N/g between species at top light; absolute % not given | mg/g | https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2019.01747/full | Yes (first 100k chars) | Medium; N removal and RGR rise with N supply and light, no per-gram uptake given |
| Walstad potted-plant tanks (10 tanks, fish, thinned floaters, soil in pots) | NH3 and NO2 0; nitrate 0-2 ppm indoors vs 10-40 ppm typical, no accumulation. Added 10 ppm nitrate: no decrease in 2 weeks, so low nitrate = little nitrate generated, not nitrate uptake | ppm | https://dianawalstad.com/wp-content/uploads/2021/11/potted-pl-revisions-1.pdf | Yes (PDF text) | Medium; hobbyist observation, no feed or plant mass given, no N budget |
| Walstad: floaters kept to no more than half the surface | <=50 % cover | fraction | same | Yes | Medium |
| Pothos roots, Anubias, Java fern, Cryptocoryne, Amazon sword, Vallisneria, Limnobium, Salvinia | no per-species uptake measurement found | n/a | searched twice | n/a | None. Pothos: only a nitrate-phytoremediation study with efficiency %, not opened |

## 3. Relative growth rates (per day)

| Datum | Value | Source | Opened | Confidence |
|---|---|---|---|---|
| Hydrilla verticillata | 0.06 /d at 3 meq/L alkalinity | Kahara and Vermaat 2002 via search | Snippet | Low-medium |
| Egeria, Hydrilla, Elodea, Ceratophyllum | light matters more than CO2; no numbers read | Eller et al. 2015 https://pure.ecnu.edu.cn/en/publications/invasive-submerged-freshwater-macrophytes-are-more-plastic-in-the/ | Abstract snippet; PDF 403 | Medium qualitative |
| Elodea canadensis vs nuttallii | canadensis +0.025 /d at 180 umol; nuttallii +0.012 /d at low light; RGR rises with N up to 2.5 mg N/L | Szabo 2020 (Frontiers link above) | Yes | Medium |
| Lemna minor | 0.23 /d (dry wt basis, mixed N) | MDPI Plants 2021 https://www.mdpi.com/2223-7747/10/8/1741/htm | Snippet | Medium |
| Salvinia natans | 0.28 /d (NH4-containing N), 0.17 /d (NO3 only) | via search (Salvinia N-source paper) | Snippet | Medium |
| Pistia, hyacinth, S. molesta at low nutrients | 0.016, 0.016, 0.029 /d | Hydrobiologia study via search | Snippet | Medium for low-nutrient case |
| Limnobium laevigatum | up to ~0.12 /d rich nutrients; ammonium-heavy mix (1:3 NO3:NH4) gave chlorosis | https://biblat.unam.mx/hevila/Ecologiaaplicada/2020/vol19/no1/1.pdf ; polibotanica.mx 2020 | Snippet | Low-medium |
| Vallisneria, Anubias, Java fern, Cryptocoryne, Echinodorus | none found under aquarium light/CO2 | n/a | n/a | None |

## 4. Fraction of plant N returned by die-off

No measured figure found. Searches for N release from decomposing Elodea/Ceratophyllum litter returned only phosphorus data or citation records (Best et al. 1990 Hydrobiologia 194; a 2022 six-species microcosm study). Qualitatively, leaching dominates in the first days. The earlier 0.2 / 0.4 die-off factors remain unsupported assumptions. Treat as "unknown, 20-50 % returned within weeks if not removed".

## Verdict on the earlier estimates

Submerged coefficients (per 100 g fresh weight, assuming ~7 g DW, unverified; this DW fraction is from memory):
- Measured Egeria uptake 0.3-1.2 mg N/g DW/d converts to 0.002-0.008 g N/d per 100 g FW. Elodea nuttallii at its short-pulse peak (2.3 mg/g DW/d) converts to 0.016.
- So "fast = 0.012" sits at the top of the measured range, not the middle. It holds only as a ceiling with plenty of ammonium. Use **fast = 0.006** (range 0.002-0.012); the ammonium-fed Egeria figure (1.1 mg/g DW/d) gives ~0.008, the nitrate-only figure (0.36) gives ~0.0025. If you key on ammonium availability, use ~0.008 when TAN is present and ~0.003 on nitrate alone.
- "medium = 0.006" and "slow = 0.0014" have no measured support at all (no Vallisneria, Anubias, Java fern, Cryptocoryne or Echinodorus uptake data exist in what I could find). Keep them, labelled "extrapolated, low confidence", at roughly half and a fifth of the fast value: **medium 0.003, slow 0.0008-0.0014**. Walstad lists Echinodorus ranunculoides (a nitrate-preferring species) as an exception: weight its coefficient to nitrate, not TAN.

Floating:
- Measured area rates are higher than 0.3: duckweed ~0.4-0.55, hyacinth 0.43, Pistia 1.16 g N/m2/d, all on N-rich water or sparse planting. Lettuce rafts at UVI 0.83 g N/m2/d at 100 % lit cover with fish-rich water.
- A fish-tank floater mat is N-limited and Walstad keeps cover <=50 %, so **0.3 g N/m2 of cover/d holds as a conservative default** for duckweed/Salvinia/Limnobium. Use **0.5 for Pistia/frogbit-type with big root masses when TAN is available**, and cap total plant uptake by supply as before. Do not exceed 1.2 for any floater.

Other:
- Light over CO2: supported qualitatively (Eller 2015, Szabo 2020); keep the C factor modest (1.0-1.3, not 1.5).
- Plants prefer NH4 and shut off nitrate uptake until NH4 is gone: well supported (Walstad handout citing primary papers; Egeria 3x). Net effect for the model: plants compete with the filter for TAN and remove little nitrate while TAN is present; model plant uptake as TAN-first.
- Aquaponics anchor: 60 g feed/m2/d balanced by ~0.8 g N/m2/d of lettuce at full light. A tank stocking tool can check plausibility against that: plant-area N removal cannot exceed ~0.8 g/m2/d even in ideal conditions.
- Die-off: leave the 0.2 / 0.4 as flagged assumptions; no data.
- Walstad's evidence is observational (nitrate 0-2 ppm in 10 potted tanks); it supports "fast floaters + stems can drive nitrate near zero in lightly stocked tanks" but gives no g N figures.

Not found despite searching: per-species uptake for Anubias, Java fern, Cryptocoryne, Amazon sword, Vallisneria, Limnobium, Salvinia, pothos; any measured litter N return; the book's own experiment tables (Walstad's book was not accessible).
