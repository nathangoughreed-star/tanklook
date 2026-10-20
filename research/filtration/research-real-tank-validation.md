# Real-tank validation of the filtration model (waste 0.0009 W^0.75 g TAN/d; media 0.06-0.4 g TAN/L/d)

"Opened" = I fetched the page itself (through a summarising fetch tool, not a raw PDF read). "Snippet" = search-result text only. Nothing here was read as a raw PDF.

## Model values to compare against
- Per-kg waste implied by the model: 900 x W^-0.25 mg TAN/kg/d. That is 602 at 5 g, 338 at 50 g, 285 at 100 g, 190 at 500 g and 160 at 1000 g.
- The 0.03 g TAN per g feed basis matches Timmons & Ebeling: TAN = feed x protein fraction x 0.092. At 32% protein that is 0.029 g/g.

## 1. Filter capacity and cycling benchmarks
| Datum | Value | Source | Opened | Confidence |
|---|---|---|---|---|
| Lab volumetric TAN removal, 7 L columns, 24 L/min, three media at 25 g/m3/d load | sand 168.6, PS microbeads 157.4, Kaldnes 142.5 g/m3/d. That is 0.14-0.17 g/L/d | Harwanto et al. 2012, https://sciwatch.kiost.ac.kr/handle/2020.kiost/3404 | abstract page only | high for the numbers, medium for transfer to aquaria |
| Same study at 50 g/m3/d load | 288-323 g/m3/d (0.29-0.32 g/L/d); rate still rising with load, so these are not ceilings | same | abstract page only | high |
| Same study at 5 g/m3/d load | 32-39 g/m3/d | same | abstract page only | high |
| Commercial cobia RAS biofilter, field | 60.9 +/- 99.8 g/m3/d (range 0.45-424), i.e. mean 0.06 g/L/d | https://www.globalseafood.org/advocate/microbead-media-offers-low-cost-efficiency-in-ras-biofilters/ | snippet | medium |
| Styrofoam bead filter, organic load | glucose cut TAN conversion from 540 to 284 g/m3/d | web-search snippet; the underlying paper was not identified | snippet | low-medium |
| Real stocked aquaria biofilter loading (Bagchi 2014) | 0.3-0.73 and 3.2-3.7 mg N/L media/d (F4); 1.6-4.8 (F5). That is 0.0003-0.005 g/L/d, with TAN always <0.5 mg/L and nitrite <0.15 mg/L | https://pmc.ncbi.nlm.nih.gov/articles/PMC4257543/ (Table 2) | yes | high |
| Hobbyist cycled test | "1 ppm fully converted in 24 h" or "2-4 ppm in 24 h" | theshrimpfarm.com, thinkfish, aquariumcoop forums (search results) | snippet | low (anecdote) |
| Dr Tim's, Fritz, Seachem capacity in g/day | not found; no manufacturer states one | n/a | n/a | n/a |
| Hobbyist media claims (ceramic 2-3x sponge, "40% faster", "15-20% from sponge") | unsourced | fishiverse, aquariumcraftlog and similar | snippet | reject |

I checked how Bagchi computed loading. It is mg N per litre of biofilter media per day, not per tank litre. F4 minimum-to-maximum check: 200 mg feed x 5/7 x (0.48/6.25) = 11 mg N/d, and 11/15 L = 0.73. This reproduces the table. F5: 200 x 5/7 x 0.42/6.25 / 5 L = 1.92, which also matches.

Cycling-test arithmetic: a "2 ppm cleared in 24 h" test in a 100 L tank is 0.2 g TAN/d. If the filter holds 2 L of media, that is 0.1 g/L/d. A "1 ppm in 24 h" test is 0.05 g/L/d. Both are lower bounds on capacity, because the test does not push the filter to saturation.

## 2. Nitrate accumulation vs stock
| Datum | Value | Source | Opened | Confidence |
|---|---|---|---|---|
| Bagchi F4-F6: nitrate rise per week | about 2 mg NO3-N/L/week with 25% weekly water change. Tap water was 3.0 mg NO3-N/L. Nitrate ranged 9-89 mg N/L | PMC4257543 | yes | medium (cumulative, offset by changes) |
| Bagchi fraction of fed N appearing as nitrate | 81-86% (the text and Figure S2 legend map tanks to values differently) | PMC4257543 | yes | medium |
| Reef-forum nitrate per fish type | clownfish 0.5-1, tangs 2-4 mg/L/d, no method stated | specifydev.uog.edu (search result) | snippet | reject (unsourced) |
| Hobbyist rule "nitrate rise / 3.4 = ammonia made" | anecdote | forum snippet | snippet | reject |
| Direct "mg/L/d per kg fish" for ornamental tanks | not found | n/a | n/a | n/a |

Bagchi F4 check (200 L tank, 239 g of fish, 1000 mg feed per feeding day at 48% protein): 1000 x 5/7 = 714 mg/d. Fed N is 714 x 0.48/6.25 = 54.8 mg N/d. At 85% nitrified that is 47 mg N/d, or 326 mg/week, or 1.6 mg/L/week in 200 L. The paper reports about 2. This is consistent, but it only restates a feed-N mass balance. It is not independent fish data.

## 3. Measured TAN excretion
| Datum | Value | Source | Opened | Confidence |
|---|---|---|---|---|
| Active koi | 33 mg/kg/h, about 800 mg/kg/d. No citation given | https://www.mankysanke.co.uk/html/ammonia.html | yes | low (hobbyist, unsourced) |
| Nile tilapia, fed | about 956-1362 mg TAN/kg/d, falling with body weight | https://sciwatch.kiost.ac.kr/handle/2020.kiost/5073 | snippet | medium |
| Red sea bream, fasting | 89-169 mg/kg/d (also 88.8-143.3 across 10-25 C) | https://koreascience.or.kr/article/JAKO201010250392820.pdf | snippet | medium |
| Red sea bream, fed | 344-684 mg/kg/d | same | snippet | medium |
| Juvenile perch RAS | 5.5-6.4 mg/kg/h, about 130-155 mg/kg/d (my x24) | infish.com.pl, Fasc 10(1) w03 | snippet | medium |
| Silverside RAS | 4.6-10.8 mg/kg/h, about 110-260 mg/kg/d. Instantaneous values ran 0-79 mg/kg/h | https://doi.org/10.3390/ani16142114 | snippet (PMC blocked by CAPTCHA) | medium |
| Goldfish and carp | only qualitative: feeding and swimming raise T-amm. No numbers retrieved | https://hero.epa.gov/reference/1510919 | snippet | n/a |
| Guppy, betta, tetra, cichlid, Corydoras, pleco | no measured TAN excretion rates found | n/a | n/a | n/a |
| Aquarium feeding rates | Bagchi goldfish F5: 357 mg/d average feed for 190 g of fish, i.e. 0.19% BW/d. F4: 714 mg/d for 239 g, i.e. 0.30% BW/d | PMC4257543 | yes | medium |

The ornamental-species gap is real. Only aquaculture species and a hobbyist koi figure turned up. Wood 1993 and Randall & Wright 1987 (https://ecowin.org/pdf/documents/Randall_wright_1987_ammonia_fish.pdf) are the review routes, and I did not open them.

## 4. Verdict
**Waste constant.** The data span about 110 to 1360 mg TAN/kg/d for fed fish; the unsourced koi figure of 800 sits near the top. The model gives 160-340 mg/kg/d for 50 g-1 kg fish.
- Against aquaculture fish the model sits at the low end: 0.2-0.3x tilapia, and 0.4-1x of red sea bream, silverside and perch (assuming those fish are 50-300 g, which I have not checked).
- It is about 0.2-0.3x the koi figure, which is unsourced.
- The 0.03 g TAN/g feed basis looks low for aquarium flakes. Flakes in Bagchi were 42-48% protein, and Timmons' formula with 0.092 gives 0.039-0.044 g/g.
- The measured nitrate budget points higher still. 81-86% of fed N appeared as nitrate, and 0.85 x 0.45/6.25 = 0.061 g N/g feed, about 2x the model basis. Uneaten food and mineralised solids probably inflate that.
- Bagchi F5 (4 goldfish, 190 g, light feeding) works out to 20 mg N/d, about 107 mg/kg/d. The model predicts 4 x 0.0009 x 47.5^0.75 = 65 mg/d (about 343 mg/kg/d), roughly 3x higher. To match the model, those fish would need 1.1% BW/d of feed.
- Net: the W^0.75 coefficient is not contradicted when feeding is about 1% BW/d. It overestimates for lightly fed tanks and underestimates for heavily fed or high-protein-feed tanks. I would call it supported within a factor of about 2-3, and it needs a feeding-rate input to be defensible. No ornamental-species excretion data exist here to pin it down.

**Media rate.**
- Lab data give 0.03-0.32 g TAN/L/d, rising with load. The 0.06-0.4 range is within what was measured.
- The field mean of 0.06 g/L/d (cobia RAS) matches the ceramic value of 0.06.
- The foam figure of 0.4 g/L/d is not tested directly. The closest measurements are 0.29-0.32 g/L/d for high-surface-area sand and beads. Foam has a lower specific surface area, so 0.4 is plausibly optimistic and I would treat it as unverified.
- Real aquaria, as in Bagchi, load media at only 0.0003-0.005 g/L/d. TAN stayed below 0.5 mg/L, so those tanks neither confirm nor bound the capacity constants. They show that a modest media volume is not the limiting factor at normal stocking.
- Hobbyist cycling thresholds are lower bounds, not capacity measurements.

**Bottom line.** The media rate constants are supported as order-of-magnitude values (the ceramic one best). Neither constant is contradicted. The waste coefficient needs a feeding-rate parameter, and the 0.03 g TAN/g feed basis may be 30-100% low for typical flake diets.

**Not found.** Per-species ornamental TAN rates, direct nitrate mg/L/d per kg fish in stocked tanks, and any manufacturer capacity figure.
