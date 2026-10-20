# E3: does LU_PER_L = 0.3 hold? (2026-10-20, read-only check)

Context: `filtrationPercent` is no longer LU_PER_L-based (HANDOFF "SE2 NITROGEN MODEL PUSHED": src/scene/nitrogen.ts replaced it).
LU_PER_L now only feeds `capacityOf` (capacity, perL, a display field) and `litresPerAnimal` = max(waste litres = animalLoad/LU_PER_L,
space litres) that sizes the starters (starter.ts litresFor). So the number matters for starters only, and only where waste litres
exceed space litres.

## 1. Nitrogen budget (all numbers from the repo; no web fetch needed)
Tank 76 L, 25 C (warm = 1, tempFactor = 1).
- Standard HOB for 20 gal: AquaClear 30 (rated to 30 gal; AC20 is 5-20 gal). Media 0.6 L, src 'derived' (+-50 %):
  src/data/filtermedia.ts, research/filtration/research-hob-media-derived.md (BioMax 65 g + foam). AC20: 0.5 L.
- Rate: MEDIA_RATE.hob = 0.15 g TAN/L media/day (nitrogen.ts; low confidence; the ceramic 0.06 is the only measured one,
  research-nitrification.md). Flow gate: 150 gph x 3.785 x 24/1000 x 0.6 = 8.2 m3/d vs 2 x 0.09 = 0.18 needed, so gate = 1.
- Surface floor: 76 L x 0.0004 = 0.030 g/d (nitrogen.ts SURFACE_RATE).
- Capacity: 0.6 x 0.15 = 0.090 + 0.030 = 0.120 g TAN/d (AC20: 0.105). Safe level, HEADROOM 0.7: 0.084 g/d.
- Waste per fish (nitrogen.ts tanOf, normal feed 1 %/day): 0.00035 W^0.75 + 0.0002 W g/d.
  Load units (stocking.ts animalLoad, normal class 1.0): W^0.75.
  TAN per load unit = 0.00035 + 0.0002 W^0.25:
  W = 1 g: 0.00055 | W = 5 g: 0.00065 | W = 50 g: 0.00088 | W = 100 g: 0.00098.
- Example, 5 g fish: TAN 0.00117 + 0.0010 = 0.00217 g/d each, 3.34 LU each. Safe capacity 0.084 / 0.00217 = 39 fish = 193 g fish = 129 LU.
  Implied LU_PER_L = 129 / 76 = 1.7 (at 100 % of capacity, no headroom: 0.12/0.00217 = 55 fish, 185 LU, 2.4).
- Spread over fish size (safe level / full): 1 g 2.0 / 2.9; 5 g 1.7 / 2.4; 50 g 1.3 / 1.9; 100 g 1.1 / 1.6.
  Messy class (MET_CLASS 1.5, goldfish, oscar): LU is 1.5x larger per gram but TAN in nitrogen.ts has no class factor for fish, so
  implied value is 1.5x higher still (1.7 to 4.4); this is an inconsistency between the two models, not evidence.
- Pessimistic media (rate 0.06 instead of 0.15, the measured ceramic figure): capacity 0.036 + 0.030 = 0.066, safe 0.046:
  5 g fish 0.046 / 0.00217 = 21 fish, 71 LU, LU_PER_L = 0.93. Optimistic (0.4 foam): about 4.
- Implied by nitrogen route: about 1.7 (range 0.9 to 2.9 over media rate and fish size). Computable fully; no missing number.
  Weakest inputs: media litres (+-50 %), rate (0.06 to 0.4), TAN per feed (0.02 constant).
- Sanity: 0.3 x 76 = 23 LU = about 7 five-gram fish. The nitrogen route says the filter handles 39 of them. Space (SPACE_PER_L)
  binds first, which matches AqAdvisor behaviour for small fish in a 20 gal.

## 2. AqAdvisor probes (HANDOFF "SE2 step 2"; research/aq-compare.md has only the stocking, not the filtration, column)
Ours/AqAdvisor load ratios at AquaClear 70, measured BEFORE the nitrogen model (old waste / LU_PER_L filtration):
neon20 0.47, goldfish8 0.86, rummynose+cory+gourami 0.73, oscar2 3.6, cpd20 0.25.
Ours/AqAdvisor < 1 means our load % was lower, so to match we would LOWER capacity: LU_PER_L_new = 0.3 x ratio.
- Median ratio 0.73 -> LU_PER_L 0.22. Geometric mean 0.77 -> 0.23. Range 0.25 to 3.6 -> 0.075 to 1.08.
- Four of five need a smaller number, one (oscar, messy 1.5 class, mass^0.75) needs 3.6x larger: a spread, not a bias,
  as the HANDOFF concluded; a single constant cannot fit it. AqAdvisor's filtration tracks its own space level, not mass^0.75.
- Note these ratios used the old model; they no longer test the live filtrationPercent at all.

## Result
| reference | implied LU_PER_L | 0.3 vs it |
|---|---|---|
| nitrogen budget (AC30, 76 L, 25 C, 5 g fish, safe level) | 1.7 (0.9 to 2.9) | 0.3 is 5.7x too low (1.7/0.3); 3x low even at the pessimistic media rate |
| AqAdvisor probes (median of 5) | 0.22 (0.075 to 1.08) | 0.3 is 1.4x too high |

The two references disagree by 8x, so they do not triangulate. The nitrogen figure is the physical capacity (what the filter can
process); AqAdvisor's is a stocking convention (inch-per-gallon-like) and its filtration tracks space. 0.3 sits between them
(geometric mean of 1.7 and 0.22 = 0.61; 0.3 is below it). The unit is now only a starter-sizing divisor where waste litres exceed space
litres, and there the conservative low value keeps starters under-filtered by waste (space governs almost everywhere).

Recommendation: keep 0.3 and record the check (status: fitted, bracketed by nitrogen 1.7 above and AqAdvisor 0.22 below; no
outside source supports it exactly, and the circularity in provenance.ts line 144 stays). Raising it to the nitrogen figure would
let waste stop limiting starters and could change goldfish/oscar counts; the live filtration verdict already uses the nitrogen model, so
a change here buys nothing for the displayed percent.
