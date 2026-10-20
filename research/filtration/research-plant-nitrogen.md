# Plant nitrogen uptake: numbers for the stocking calculator

Searched 2026-10-20 (web search snippets; not all primary papers were read in full). No published source gives g N per plant for aquarium species. The formula below is a mass balance (N uptake = growth x tissue N) with published rates used as ceilings. Confidence is stated per row.

## Table

| # | Quantity | Value | Source | Confidence |
|---|---|---|---|---|
| 1 | Water hyacinth N uptake, microcosm (NH4, NO3, urea) | 0.53-2.16 g N/m2/d, highest on NH4 | Nitrogen and phosphorus removal studies on E. crassipes (found via search; see Cambridge Environ. Conserv. tropical-pond study https://cambridge.org/core/journals/environmental-conservation/article/abs/nitrogen-and-phosphorus-removalcapacity-of-four-chosen-aquatic-macrophytes-in-tropical-freshwater-ponds/BE0D10001CCC388B4CBBBF90E6A8724D) | Medium; wastewater N-rich, so a ceiling for a tank |
| 2 | Water hyacinth tissue N at which productivity levels off | ~16 mg N/g DW (1.6 %) | same search result set | Low-medium |
| 3 | Pistia stratiotes N uptake | ~1.16 g/m2/d best daily mean (aquaculture summary); NH4 uptake > NO3 uptake at any concentration | https://www.globalseafood.org/advocate/denitrification-in-recirculating-aquaculture-systems-comparison-of-aquatic-plants/ ; Nelson et al. 1980, https://www.uog.edu/_resources/files/ml/technical_reports/56Nelson_et_al_1980_UOGMLTechReport10.pdf | Medium |
| 4 | Lemna (duckweed) N uptake | 3.36 g N/m2/d in vitro on swine lagoon liquid; 2.11 g/m2/d best field; 0.38-0.55 g/m2/d in leachate studies | Landesman / Lemna minor 8627 work; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6711526/ ; Iqbal & Baig 2017 | Medium; large range driven by N supply |
| 5 | Duckweed NH4 vs NO3 absorption | NH4 absorbed 3-11x faster than NO3 (stated in a leachate-study intro) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6711526/ | Low-medium (secondary claim) |
| 6 | Duckweed doubling time | ~2-2.4 d (RGR ~0.29 /d) at optimum light, N and warmth | Sci. Reports 2025 biogas-slurry duckweed study (DOAJ https://doaj.org/article/2ee4b8afbb3246a8930258d61fc2c4a6) | Medium (ideal conditions) |
| 7 | Nutrient removal ranking of floating plants | Water hyacinth > Pistia > Lemna > Salvinia (tropical ponds); Pistia removed 63 % total N in a swine-wastewater comparison with Limnobium and Lemna | Cambridge study above; J. Freshwater Ecology 2021 (https://doaj.org/article/12a7050363094ec88d9a3a019affbbf2) | Medium |
| 8 | Limnobium laevigatum RGR | up to ~0.12 /d under rich nutrients | https://biblat.unam.mx/hevila/Ecologiaaplicada/2020/vol19/no1/1.pdf | Low-medium |
| 9 | Submerged plants: light matters more than CO2 | Light had a larger effect than CO2 on RGR in Elodea, Egeria, Hydrilla, Ceratophyllum; low light lowers RGR | Eller et al. 2015, Freshwater Biology (via https://pure.ecnu.edu.cn/en/publications/invasive-submerged-freshwater-macrophytes-are-more-plastic-in-the/) | Medium; no multiplier given, so the one below is my estimate |
| 10 | Elodea: higher N supply raises RGR; E. nuttallii removes more N than E. canadensis | qualitative | Szabo et al. 2020, Front. Plant Sci. https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2019.01747/full | Medium |
| 11 | NH4 as preferred N source for many aquatic plants; toxic at mM levels; submerged shoots detoxify it | qualitative | Frontiers Plant Sci. 2022 https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2022.865578/pdf ; Walstad ch. 7 (quoted in UKAPS posts, e.g. https://www.ukaps.org/forum/goto/post?id=692350) | Medium for the preference; low for "33 species, all but 4" (forum claim, original not found) |
| 12 | Tissue N of aquatic plants | ~2-3 % of DW submerged, 4-6 % duckweed, ~1.6-3 % hyacinth | Not fetched. General literature value from memory, and #2 above | Low; verify before shipping |
| 13 | Fresh-to-dry weight ratio | ~5-10 % DW for submerged and floating plants | From memory | Low |
| 14 | Fish TAN from feed | ~2.5-3.5 % of feed mass as N is excreted as TAN (40 % protein feed, ~6.4 % N, roughly half excreted) | From memory; aquaculture standard | Medium; the calculator probably already has this |
| 15 | Walstad / low-tech tanks | Walstad argues dense plants plus soil replace much of the biofilter; no measured g N removal given | Walstad, Ecology of the Planted Aquarium (not accessed) | Low; no quantitative evidence found |

Not found: measured per-species N uptake for Anubias, Java fern, Cryptocoryne, mosses, Limnobium or Salvinia in aquarium conditions. Treat their coefficients below as extrapolated.

## Proposed model (mass balance)

N uptake (g N/d) = biomass_DW(g) x RGR(/d) x tissue_N(fraction), capped by what the tank actually supplies.

Precomputed coefficients so the code only needs plant count or cover and a class:

| Class | Examples | Basis | k (g N/d at reference light/CO2) |
|---|---|---|---|
| slow | Anubias, Java fern, Cryptocoryne, mosses | per 100 g fresh weight (RGR ~0.007/d, N 2.5 %) | 0.0014 |
| medium | Vallisneria, Sagittaria, Echinodorus, Ludwigia | per 100 g FW (RGR ~0.03/d, N 2.5 %) | 0.006 |
| fast | Hornwort, Egeria, Hygrophila, Rotala, Limnophila, Elodea | per 100 g FW (RGR ~0.06-0.1/d, N 3 %) | 0.012 |
| floating | Duckweed, Salvinia, Limnobium, Pistia, frogbit | per m2 of surface cover, kept thinned to the crop that is harvested | 0.3 (range 0.1 floor to 0.7) |

Reference floating figure: a 100 % mat of ~40 g DW/m2 x RGR 0.15 x 4.5 % N = 0.27 g N/m2/d. Published wastewater maxima (items 1, 3, 4) are 2-8x higher but need very N-rich water, so 0.3 is the aquarium ceiling.

Formula to code:

```
plantN_g_per_d = sum over groups of  k[class] * amount * L * C * A * (1 - dieoff)
  amount = (fresh weight g / 100) for submerged classes; (cover m2) for floating
  L (light)   = clamp(PAR_hours_factor, 0.3, 1.0)   # 1.0 = ~8 h of good light, 0.6 dim/6 h, 0.3 very low (est. from item 9)
  C (CO2/nutrient) = 1.0 baseline low-tech; 1.5 for injected CO2 + dosed ferts on medium/fast; 1.0 for floating (surface air CO2)
  A (ammonium access) = 1.0   # submerged and floating plants take NH4 directly; no extra factor needed
  dieoff = 0.2 default, 0.4 for fast plants when not trimmed   # N returned to the water
  cap: plantN <= 0.5 * available TAN + NO3 production   # plants cannot take more than the tank offers
```

Average-fresh-weight conversion if you only have plant counts: stem bunch ~15 g FW, rosette plant ~30 g, rhizome piece ~25 g.

Worked check: 200 g fast stems (2 x 0.012 = 0.024 g N/d), good light, CO2: x1.5 x 0.8 = 0.029 g N/d. A fish load of 10 g feed/d gives about 0.3 g TAN-N/d, so that planting offsets about 10 %. Covering 0.3 m2 with floaters gives 0.3 x 0.3 x 0.8 = 0.07 g N/d (about 25 %).

## Caveats to surface in the UI

- Die-off, shedding and unharvested trimmings return the N. Net removal needs trimming or exporting biomass; in an untrimmed tank count only ~50-80 % of uptake as removal.
- Slow plants (Anubias, ferns, mosses) contribute almost nothing; the table says so with k = 0.0014.
- Uptake is limited by light first (item 9), then N, then CO2 and trace nutrients; new tanks with young plants take up well below mature rates.
- Plants prefer NH4 and nitrify nothing; they compete with the filter for TAN and shrink nitrate, not nitrite. Do not let plants substitute for the cycle in a new tank.
- High NH4 (mM range, far above tank conditions) is toxic to plants; not a calculator issue.
- Coefficients are extrapolated from RGR x tissue N, not measured on aquarium plants. Rows 12-15 are from memory and need a source check.
