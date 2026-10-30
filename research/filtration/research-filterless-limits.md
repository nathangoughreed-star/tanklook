# Filterless tanks: passive biofilm capacity, peaks, load limits

Searched 2026-10-30 (about 12 searches, 4 fetches). "Opened" = I read the primary text myself. "Snippet" = search-result excerpt only. Plant uptake not redone (see research-plant-validation.md, research-plant-nitrogen.md). Honest headline: **no measured per-area nitrification rate for an unfiltered aquarium, no logged filterless tank with fish count + ammonia series, and no measured max fish load were found.** What exists is aquaculture biofilter rates, hobbyist opinion, and one aquarium N-budget paper that could not be opened.

## 1. Passive biofilm nitrification rate and surface area

| Claim | Value | Units | Source URL | Opened? | Confidence |
|---|---|---|---|---|---|
| Sand/bead biofilters, areal TAN conversion, flowing TAN-fed, 3 media incl. control | 0.39-0.40 | g TAN/m2/d | https://sciwatch.kiost.ac.kr/handle/2020.kiost/28282 (sand, polystyrene bead, Kaldnes) | Snippet | Medium for aquaculture; overstates passive tank (forced flow, loaded TAN) |
| Gravel bucket biofilter, areal TAN removal, 27-34 C, 0.24-1 mg/L TAN | 0.06-0.24 (mean 0.18) | g TAN/m2/d | https://www.ukdr.uplb.edu.ph/etd-undergrad/167 (undergrad thesis) | Snippet | Low-medium; thesis, warm, TAN 0.24-1 mg/L, recirculated |
| Trickling filter areal N-TAN removal | 0.24-0.27 | g N/m2/d | https://www.redalyc.org/pdf/1750/175024151025.pdf (via search; paper not confirmed) | Snippet | Low-medium |
| Nitrification in aquarium biofilters = share of total N conversion, 3 freshwater aquaria (with filters) | >= 81-86 | % | https://pmc.ncbi.nlm.nih.gov/articles/PMC4257543 | No (reCAPTCHA wall) | Medium; tanks were filtered, so it says nothing about the filterless share |
| Sediment holds far fewer ammonia-oxidiser genes than suspended biofilm in an MBBR-equipped aquarium (amoA/hao predicted sequences 5 and 1 vs 220 and 221) | ~40-200x fewer | gene count ratio | https://doaj.org/article/46ef505642834907acfae7afc29ba5a3 (Frontiers Microbiol 2024, 10.3389/fmicb.2024.1373119) | Snippet | Medium for "sediment is a minor nitrifier site when a filter/media exists"; volumetric 45 g/m3/d suspended-biofilm rate not convertible to area |
| Bare glass surface per litre vs filter media | glass "a few hundredths m2/L"; sponge 200-400 m2/L; K1 ~800 m2/L (claim as stated) | m2/L | https://gensou.sg/?p=43195 | Snippet | Low (commercial blog, internally odd units); direction right: glass is negligible area |
| Bacteria location opinion: filter ~50 %, fine gravel/coarse sand ~25 %, active layer top 1/8-1/4 in | 50 / 25 | % | https://forums.loaches.com/viewtopic.php?p=183622 | Snippet | Low (forum opinion, no measurement) |
| Planted tanks: bacterial population "almost nothing" vs unplanted; "80:20" plants:bacteria guess | n/a | ratio | forum thread surfaced via search (no stable URL kept) | Snippet | Very low (speculation) |
| Soil seeds nitrifiers, "protecting fish within days" | days | time | https://dianawalstad.com/wp-content/uploads/2021/11/potted-pl-revisions-1.pdf (via search snippet) | Snippet (earlier file read it in research-plant-validation.md) | Medium (Walstad's own claim) |
| Nitrifier biofilm needs surface; nitrifiers are obligate biofilm dwellers, not water column | qualitative | n/a | https://gensou.sg/?p=43195 | Snippet | Low-medium |

Wetted surface area of 10/20/40/75 gal tanks: **not found in any source.** My own geometry (standard tank footprints, glass below waterline + substrate top face only, no decor), arithmetic not sourced: 10 gal (20x10x12 in) ~0.30 m2 glass + 0.13 m2 substrate = ~0.43; 20 gal long (30x12x12) ~0.55 + 0.23 = ~0.78; 40 gal breeder (36x18x16) ~0.80 + 0.42 = ~1.2; 75 gal (48x18x21) ~1.17 + 0.56 = ~1.7 m2. Rock/decor/plant leaf surface adds an unknown amount. Treat as ~0.04 m2/L (10 gal) falling to ~0.006 m2/L... i.e. roughly 0.02 m2 per litre across sizes (my arithmetic, low confidence).

Cross-check of the model's number (my arithmetic): 0.0004 g TAN/L/d x 76 L (20 gal) = 0.030 g/d over ~0.78 m2 = ~0.04 g TAN/m2/d. That is 5-10x BELOW aquaculture media rates (0.2-0.4) but those are flowing, TAN-fed, warm, mature biofilm, so a passive-tank rate of about 0.04 is not obviously too high or too low. No source supports or refutes it directly. The leniency is therefore mostly on the demand side (see section 3) and on the 40 % plant credit, not on the biofilm rate itself.

## 2. Peaks in filterless or Walstad tanks

| Claim | Value | Units | Source URL | Opened? | Confidence |
|---|---|---|---|---|---|
| Walstad's own potted-plant tanks (10, with fish): NH3 and NO2 stay 0, nitrate 0-2 ppm | 0 / 0 / 0-2 | ppm | https://dianawalstad.com/wp-content/uploads/2021/11/potted-pl-revisions-1.pdf | Yes (earlier file) | Medium; no fish count/feed given; these are fish-breeding tanks, mostly light load |
| Walstad: nitrifying bacteria are the "emergency backup" if plants cannot keep up; filtration "totally unnecessary" in her tanks | qualitative | n/a | https://dianawalstad.com/wp-content/uploads/2017/05/biolfiltration2017a.pdf (read in full via text extraction) | Yes | Medium (author's own claim) |
| Hobbyist filterless tank, long-running: ammonia 0.25-0.6, nitrite 0, nitrate 35-50 ppm, water changes control it | NH3 0.25-0.6 | ppm | https://www.ratemyfishtank.com/phpBB3/post36337.html ("Filterless Ecosystem") | Snippet | Low (one hobbyist, no fish count surfaced) |
| Soil planted tank, sparse plants, all zero at 5 weeks | 0/0/0 | ppm | forum thread via search (ukaps.org post 595036 area) | Snippet | Very low (possible missed spikes) |
| Typical planted new-tank sequence: little ammonia, then nitrite spike, nitrate spike for ~3 weeks | ~3 | weeks | forum via search | Snippet | Very low |
| Ammonia still detectable past week 6 means plants cannot keep up | 6 | weeks | https://gensou.sg/walstad-10-gallon-no-filter-setup/ | Snippet | Low (commercial blog, no data) |
| Tom Barr: ammonia is the algae trigger; healthy plants take it first; Walstad later favoured some filtration/circulation | qualitative | n/a | https://ukaps.org/forum/threads/discussion-are-we-obsessed-with-circulation-and-flow.11056/page-3 | Snippet | Low-medium (expert opinion, no numbers) |
| Peaks after feeding / after a fish dies / soil setup, with measured ppm, duration and stocking | | | | | **Not found** |

## 3. Maximum load and ammonia partition

| Claim | Value | Units | Source URL | Opened? | Confidence |
|---|---|---|---|---|---|
| Filterless/Walstad guide stocking | ~1 inch fish per 2-3 gallons | in/gal | https://www.buildyouraquarium.com/walstad-method/ and https://gensou.sg/?p=19958 (blogs; ratio attributed only via search summary) | Snippet | Low (blog, not Walstad's text) |
| Fish should stay small (<= 3 in) and bioload modest | qualitative | n/a | https://www.tankflare.com/blogs/the-walstad-method-natural-planted-tanks | Snippet | Low |
| Limiting factor often oxygen, not ammonia; load depends on plant growth, surface area, aeration | qualitative | n/a | https://gensou.sg/walstad-10-gallon-no-filter-setup/ | Snippet | Low |
| Plant cover at start | 70-80 % of substrate | % | https://www.buildyouraquarium.com/walstad-method/ | Snippet | Low-medium |
| Floaters no more than half surface | <= 50 | % | Walstad potted-plant PDF (above) | Yes | Medium |
| Plants take ammonium preferentially; Elodea removed 75 % of NH4 in 16 h | see plant files | | Walstad 2017 PDF | Yes | Medium |
| Share of ammonia handled by plants vs soil/surface bacteria vs filter, as measured numbers | | | | | **Not found** (only aquarium biofilter >= 81-86 % in filtered tanks, PMC4257543, unopened) |
| g fish per litre, g feed per litre per day limits for filterless tanks | | | | | **Not found** |

Feed-to-TAN conversion for scale (standard aquaculture rule, not searched this session, my arithmetic): ~0.03-0.06 g TAN per g of 35-45 % protein feed. 20 fish x 1 g fed ~2 % body weight/day = 0.4 g feed = ~0.012-0.024 g TAN/d, versus model capacity ~0.030 g/d x 70 % headroom = ~0.021 g/d of usable biofilm. So at "ideal" stocking the model's ratio is more like 60-100 % before plants, not 30-50 %, if the 40 % plant credit is what drops it to 30-50 %; check which assumption the model uses for feed rate and TAN yield.

## What this means for the model

- **No source measures a filterless-tank nitrification rate.** Everything below is a bound, not a measurement.
- **Biofilm capacity (low confidence):** keep 0.0004 g TAN/L/d only as an upper estimate; there is no evidence it is too strict. The equivalent areal rate (~0.04 g TAN/m2/d) is 5-10x under flowing-media rates, which is plausible for static water. Safer defensible range: 0.0002-0.0004 g TAN/L/d, default 0.0003. Prefer per-m2 if wetted area is computed: 0.03-0.05 g TAN/m2/d, ignoring glass above the waterline.
- **Glass is negligible; substrate and hardscape dominate** (medium-low confidence; consistent across the Frontiers 2024 sediment data and blogs). Do not credit "decor" without a surface estimate.
- **Plant credit (medium-low):** 40 % ceiling is a ceiling only for dense, lit, fast-growing plants. For a Walstad tank at 70-80 % planted, treat as 40 %; for sparse or slow-plant tanks use 10-20 %.
- **Feeding-peak multiplier (low, no measured data):** feeding delivers the day's TAN in a few hours, peaking ~2-4x the daily mean excretion. Ammonia excretion peaks 2-4 h after feeding in the aquaculture literature (recalled, not searched here). Use x3 for a peak check versus instantaneous capacity, and flag red/yellow when the peak exceeds capacity even if the daily total is below it.
- **Dead-fish event (not found):** no measured numbers; model as a one-off pulse, a 1 g fish = ~0.1-0.15 g N if decomposed (my arithmetic: ~3 % N wet weight), far above a day of capacity, so a death in a filterless tank should always read as a spike risk.
- **Max load (low):** nearest cited rule is ~1 in per 2-3 gal for filterless planted tanks (blogs). The current "1 in/gal reads green" is therefore 2-3x the only cited filterless guideline. Suggest: green up to ~1 in per 2.5 gal, yellow to 1 in per 1.5 gal, red beyond, for a filterless tank with >= 70 % plant cover; scale one step stricter without that planting.
- **Cap the green region** for filterless at roughly 50 % of capacity (not 70 % headroom), because uncertainty in the biofilm rate is >= 2x either way.

## Not found

- Measured passive nitrification rate (g TAN/m2/d) of glass, gravel, sand, soil or decor in an unfiltered aquarium at TAN < 0.5 mg/L.
- Published wetted areas for 10/20/40/75 gal tanks (computed by me above).
- Measured share of nitrifier activity in substrate vs glass in a filterless tank.
- Logged filterless/Walstad tank with ammonia, nitrite, nitrate time series plus fish count and size.
- Measured ammonia/nitrite peak after feeding, after fish death, or in fresh soil setups with stocking level.
- Walstad's own stocking numbers (the book was not accessible; her PDFs on the site contain none that I could find).
- Any measured max g fish/L or g feed/L/d for filterless tanks.
- Measured plants vs soil vs surface-bacteria vs filter partition in an aquarium. Open leads: PMC4257543 (aquarium N-budget paper; needs a human to open), Walstad's book chapters on filtration, Tom Barr Report forum threads.
- Walstad PDFs shrimprcs2023.pdf and potted-pl-revisions-1.pdf: shrimp PDF was fetched but unreadable by the extractor; not mined for stocking numbers.
