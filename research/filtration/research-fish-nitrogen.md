# Fish TAN excretion: numbers for the stocking calculator

Caveat: from 4 web searches (summaries, primary texts not opened). Timmons & Ebeling book itself NOT verified; figures come via secondary pages. Confidence column reflects that.

| # | Quantity | Value | Source | Conf. |
|---|---|---|---|---|
| 1 | TAN per g feed (rule) | 0.03 g TAN / g feed (about 3 % of feed; range 3-5 % for 30-55 % protein feeds) | https://www.globalseafood.org/advocate/flow-rate-estimation-for-ras/ ; Timmons & Ebeling, Recirculating Aquaculture (via https://learn.farmhub.ag/resources/aquaponics-production-manual/5-feed/5-1-formulated/) | Med-high |
| 1b | Protein version | TAN = feed x protein x 0.16 N x 0.80 assimilated... i.e. factor 0.16 x 0.80 x 0.80 x 0.90 = ~0.092 g TAN per g protein; at 32 % protein = 0.03, at 40 % = 0.037 | farmhub page above (attributes to Timmons & Ebeling 2013). Note the farmhub chain treats 0.80 of N as excreted and 0.90 of that as TAN. The "0.4-0.5 excreted" in the brief is consistent with Global Seafood: 50 % of N not retained, x 1.2 g TAN per g N | Med |
| 2 | Feeding rate vs size, trout (5 C, commercial feed) | 3.3 % BW/day at 0-18 g vs 0.5 % at 180 g+ (higher with temperature) | FAO feeding tables https://www.fao.org/3/S4314E/s4314e0s.htm | High (trout, cold) |
| 2b | Tilapia (warm) | 9-7 % BW/day <10 g; 5-3 % >100 g; Marek: 10-5 % at 5-10 g down to 1.2-1.0 % at 500-600 g | same FAO page | Med-high |
| 2c | Coho | 3.2 % (<0.76 g, 4.4 C) up to 10.5 % (15.5 C); 0.4 % at >41 g, 4.4 C | same FAO page (Piper et al. 1982) | High |
| 3 | Fasting TAN, marine fish | 4.4 / 7.1 mg TAN/kg/h at 14 / 18 C (Seriolella); 9.3-11.9 mg/kg/h at 9-13 C (Pacific cod, ~36 g); 8.1-9.2 at 15-25 C (rockfish); red seabream 89-143 mg/kg/day endogenous | https://koreascience.or.kr/article/JAKO201009654403260.pub?lang=en ; https://repositorio.unillanos.edu.co/items/aa0ef0d9-648a-45e9-80b8-88caa498d384/full ; agris.fao.org records from search | Med (marine, not tropical freshwater) |
| 3b | Common carp, ~18 g | 0.26-0.69 ug TAN/g/h = 6-17 mg/kg/day (fed, 40 L tanks, density-dependent) | https://www.redalyc.org/pdf/896/89640816002.pdf | Low-med (rate looks low vs feed-based) |
| 3c | Goldfish, small tropical/cichlid per-kg rates | NOT FOUND in searches | - | - |
| 4 | Temperature | Excretion rises with temp, roughly 1.5-2x per +10 C (cod +28 % over 9->13 C; rockfish +14 % over 15->25 C, flattening above 20 C); feeding rate rises steeply (coho 3.2 -> 10.5 % over 4->15 C) | sources in rows 2, 3 | Med |
| 5 | Allometry | Mass-specific rate falls with size; whole-fish rate scales ~W^0.75 (kelp-forest fishes, n=460, metabolic-theory exponent 3/4) | https://datadryad.org/dataset/doi:10.5061/dryad.0p2ngf29v ; Ikeda et al. 2011 (29 small reef species) | Med |
| 6 | Hobby feeding | flake 1-2x/day, typically 1-3 % BW/day dry weight for adults, "what is eaten in 2-3 min" | not sourced in this pass (general practice, hobby cross-check not fetched) | Low |

## Proposed formula (codable)

    feed_g_per_day = 0.04 * W^0.75          (W = fish mass in g; as % BW/day this is 4*W^-0.25: 4 % at 1 g, 2.7 % at 5 g, 1.3 % at 100 g)
    TAN_g_per_day  = 0.03 * feed_g_per_day
                   = 0.0012 * W^0.75        (g TAN per fish per day)

Exponent 0.75, constant 0.0012 g TAN/day at 1 g, 25 C, fed ~ commercial rate.

Checks: 5 g fish -> 0.0040 g/day (0.8 g/kg/day); 36 g -> 0.0176 g/day = 490 mg/kg/day, about 2x the cod fasting rate (~250 mg/kg/day at 10 mg/kg/h), which matches fed vs fasted ratios. 0.0012*W^0.75 gives ~2.7 % BW/day feed at 5 g, a bit above typical hobby flake (1-2 %), so aquarium-realistic = scale constant by ~0.5-0.75 (0.0006-0.0009).

Options: temperature factor 1.07^(T-25) (about 2x per 10 C); protein factor protein%/32 when feed is known; exponent range 0.7-0.85 acceptable; constant uncertainty about +/-2x.
