# Minutes a week: proposal (MW, 2026-10-20; for Nathan's yes before any code changes)

## What is wrong now (measured on origin/main 4d3fa2e, default profile)
| stocking | tank | cheapest / least work / balanced | where the minutes go |
|---|---|---|---|
| betta | 5 gal | 26 / **26** / 27 | water change 13.9, testing 5.7, yearly 4.7, filter 1.2, betta 0.1 |
| 10 neon + 6 cory | 20 L | 32 / **32** / 32 | water change 16.7, testing 5.7, yearly 4.7, filter 1.9, plants 0.6 |
| 28 fish | 75 gal | 48 / 45 / 47 | water change 24.8, filter 8.4, testing 5.7, yearly 4.7 |
| 2 ocellaris | 20 H | 70 / 69 / 70 | water change 26.5, salt work 17.7, testing 10.2, skimmer 4.0, filter 4.7 |

Four of the six task rows are flat numbers (testing 5, yearly 4, plant trimming 0.15 min a plant, animals 0.05-2 min each).
Only the water change moves with the tank, and it moves with the stocking, not with anything a build or scape chooses.
Every minute figure is already labelled `assumption` in provenance.ts (`{time,risk}.**`, `gear.*.minutes`): no page states them.

## Proposed model (one expected number per row; the rows below replace the flat ones)
| task | now | proposed | what the choice changes | source status |
|---|---|---|---|---|
| **Water changes** | fixed 12 min + 0.5 min per gal changed; fraction = fixed 20-25 % x stocking | fraction comes from the nitrogen budget we already own (scene/nitrogen.ts): the % of the tank that must be changed to hold nitrate at NITRATE_TARGET_N after the live plants' uptake (floored at 10 %). Minutes = fixed + per-gal x gal by method: bucket 0.5, siphon hose to the tap 0.2 (new tech row "Water-change method", priced) | **scape**: live plants cut the fraction, artificial / none do not. **build**: the hose saves the most on 40 gal and up | fraction = derived from cited nitrogen research (research/filtration/); fixed and per-gal minutes = assumption, rule added |
| **Filter cleaning** | tech `byKind` sponge 0.5 / internal 0.8 / HOB 1 / canister 1.5 x (gal/20)^0.3; non-tech path flat 2 | keep, then multiply by a bioload factor (stocking share, 0.6-1.4, same clamp as the water change). Show canister as "rarer but 40 min a job": same weekly mean, so no lever on its own | **filter choice** (already works; the bioload factor makes it differ per stocking) | assumption (a time per job and a job interval, both stated) |
| **Plant trimming** | 0.15 min x growth x size/150 per plant (a 40-plant tank = about 3 min) | per plant by class: floater 0.3 (skim), stem 0.6, rosette / epiphyte 0.1, carpet 1 per 10 plants, x the existing growRate (CO2 / ferts / light speed it up). Artificial: 0 (but see glass) | **scape** (stems / carpet vs rosettes vs artificial), **tech preset** (CO2 grows faster = more trimming) | assumption |
| **Glass and algae** | none | new row: 2 min base + algae scaled by light power (W per gal, from the chosen light) x photoperiod; live plants lower it (they use the nutrients), artificial plants add a wipe | **light choice**, **scape** | assumption |
| **Feeding** | animal row 0.05-2 min each (nothing for the feeding trips) | per-day feeding trip 0.5 min x 7 (a flat 3.5 min a tank) + 0.1 min per animal group for frozen / live food; an auto feeder (new tech row, priced) removes the trips and keeps 0.5 for refilling | **build** (feeder) | assumption; feeder price = cited listing |
| **Testing** | 5 min (fresh) / 10 (salt) | 5 -> scaled by risk of the build: a bigger filter than needed or live plants in a mature tank test every 2 weeks (3 min); salt and tanks under 10 gal stay 5 / 10 | **stocking load**, **tank size** | assumption |
| Yearly jobs, salt work, misting | flat | unchanged | none | already labelled |

## What each build / scape / filter then changes
- **Cheapest**: bucket, hand feeding, cheapest filter: all the base minutes. **Least work**: hose + auto feeder + the filter with the fewest minutes (ATO for salt). Expected gap on the four examples above: about 5 (5 gal) to 15 (75 gal) minutes a week, against 0-3 today.
- **Scapes** (P6b): live stems / carpet pay trimming but pay less water change; artificial pays glass wipe and more water change; "mixed" in between. Expected gap across the 4 offered styles on a 20-gallon planted tank: about 6-10 minutes.
- **Stocking screen** time figure (stockPlan): moves because water change and bioload now follow each stocking.

## Where every number comes from (rule: nothing invented unlabelled)
1. The water-change fraction is DERIVED from scene/nitrogen.ts (already sourced, research/filtration/).
2. Every minute figure stays an `assumption` with a rule in `src/data/provenance.ts` that states the task, the interval and the time per job. I opened no page that states them; manuals give only how often. I will NOT write "cited" for these.
3. The two new tech rows (water-change hose, auto feeder) need a priced Amazon listing each (the existing `gear:` rows pattern) so the build's extra dollars are real.

## Decisions for Nathan
1. OK to add two tech rows (hose, auto feeder) so "least work" has fresh-water levers? (Alternative: no new gear; then least work stays the filter only, and fresh-water builds will still tie.)
2. OK that all minute numbers are labelled assumptions (no research agents, cost $0), or spend about 3 Sonnet agents (~100 k tokens, to be quoted again) to look for any published time per task (water-change time by method, filter clean intervals)? My recommendation: no agents; the pages state frequency, not minutes.
3. Glass-wipe and feeding rows are new lines on the plan sheet and the demand panel: fine?

## After a yes (no code written yet)
Implement in src/demand/engine.ts + data/demand-defaults.json (one expected number, no ranges), tech.json (two rows), scene/builds.ts (least work picks the new rows, tie rule kept), provenance rules; update tests/builds + plan-sheet tests (the "same gear" tie test may no longer apply on fresh water), full suite + tsc; push from worktree `mw`; HANDOFF entry; message Coordinator 5.

## Result (2026-10-21, built after Nathan's yes: hose + feeder rows under "Quality of life", agents sent, glass / feeding rows OK)
- **Research (3 Sonnet agents, 209 k tokens against the ~100 k quoted; quote check: all quotes found, 4 label-only not counted):** the pages state INTERVALS, never minutes.
  Cited: water change 10-20 % a week fresh (American Aquarium), 10 % weekly salt (Bulk Reef Supply video; ours was 15), glass wiped weekly, stems trimmed weekly (high-tech), sponge cleaned every 2 weeks, canister every ~4 weeks, carpets every 2-3 weeks, once or twice a day feeding, established tanks tested every 2-4 weeks (ours was weekly: now 3 min a week), the Eheim drum lasts up to 6 weeks (ours: refill every 2). Prices: Python 25 ft kit $64.99, Eheim feeder $21.99-28.13. Every minutes-per-job figure stays an assumption (provenance rule); the one value now cited is the 10 % water-change floor.
- **Built:** water changes = nitrogen budget `waterChangePct`, floored 10 %, capped 50 % (`waterChangeFraction` in scene/stocking.ts; tech.ts reads it through a registered hook, because stocking.ts imports tech.ts); hose (8 min fixed + 0.2 per gal) vs bucket (12 + 0.5); `feeding` row (3.5 min a week by hand, 0.3 with a feeder); `glass` row (1 min + 2 per half W/gal up to 1.5 W/gal, live plants cut 30 %, +0.2 per artificial plant, cap 4); plant trimming 0.4 min a plant x bunch factor (n^-0.35 per kind), floaters x0.5, painted live patches 0.5 each; testing 3 min (every ~2 weeks); filter clean factors sponge 1 / internal 1 / HOB 1.2 / canister 2 (intervals cited, minutes assumed).
- **Tech rows (data, `QOL_ROWS` in tech.ts):** `wcmethod` (hose, gear:wc-hose) and `feeder` (auto, gear:auto-feeder), under a "Quality of life" heading in the Tech menu; their own line shows 0 min/wk (the saving sits in the water-change and feeding rows; the "If picked" delta shows it). The least-work build adds the rows that cut minutes (auto top-off on salt only); gear lines read "Quality of life: ...".
- **Effect (default profile, NOW 2026-10-20):** betta 5 gal 31 / **27** / 35 min (cheapest / least work / balanced; $228 / $417 / $305), 20 gal community 40 / **30** / 40 ($422 / $527 / $432), 75 gal 62 / **40** / 60 ($874 / $1241 / $903), reef 20 H 73 / **62** / 73 ($570 / $1325 / $570). Before: 26/26/27, 32/32/32, 48/45/47, 70/69/70. Scape styles on the 20 gal community: 43-53 min.
- **Re-blessed tests:** the 11-example locks in test/tech.test.ts, test/gearFilters.test.ts and the old Monte Carlo means in test/demand.test.ts (upkeep and minutes only; setup unchanged); test/artificialplants (artificial plants add a glass wipe, no trimming); test/tankfit (balanced minutes no longer ordered against cheapest: a cheap multi-unit filter costs more minutes).
- **One-line hook in another lane's file:** `scene/starter.ts` `litresFor` is a function now (an alias of `litresPerAnimal` hit a load-order error once the demand engine imported stocking.ts first; stocking.ts and starter.ts import each other).
- **Open for Nathan / later:** `minutes per job` all assumptions (no page states them); filter cleaning does not scale with bioload (proposed, not built); hose and feeder are offered on every wet tank, even a 5 gal; the 'Time a week' line is expected, not a range.
