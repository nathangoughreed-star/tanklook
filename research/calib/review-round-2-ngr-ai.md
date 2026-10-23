# Calibration review, round 2: ngr-ai (an AI model)

Engine readings: the current engine (research/calib/tables, 2026-10-23). Answers 2026-10-23. Ideal = 75 %, limit = 100 %. Counts are read on the dimension their species fills (floor for bottom dwellers, water for swimmers, the larger for fish that use both). "fix" is what the engine's reading would need to be multiplied by to match the answers: below 0 % the engine reads the tank too full, above it too empty.

## Tank by tank

| tank | gal | animals | engine water / floor | answer floor / water / overall | ideal count -> engine | limit count -> engine | tankmate ideal -> engine | fix |
|---|---|---|---|---|---|---|---|---|
| f10 | 40 | 11 Marbled hatchetfish* + 8 Honey gourami + 8 Chili rasbora° | 75 % / 0 % | - / amber / amber | 12 -> 77 % | 20 -> 89 % | 20 -> 89 % | -3 % |
| f8 | 40 | 66 Ember tetra* | 65 % / 0 % | - / green / green | 70 -> 68 % | 110 -> 94 % | - | +9 % |
| f9 | 29 | 18 Guppy* | 111 % / 0 % | - / green / green | 25 -> 140 % | 40 -> 0 % | - | -47 % |
| p2b (pair of p2a) | 40 | 15 Bronze corydoras* | 62 % / 100 % | green / - / green | 18 -> 120 % | 28 -> 187 % | - | -42 % |
| a1 (anchor) | 125 | 87 Harlequin rasbora* + 28 Rummy-nose tetra° | 66 % / 0 % | - / amber / amber | 70 -> 59 % | 110 -> 75 % | 12 -> 58 % | +30 % |
| f6 | 40 | 28 Panda corydoras* + 25 White cloud mountain minnow° | 73 % / 83 % | amber / green / amber | 20 -> 59 % | 32 -> 95 % | 25 -> 83 % | +7 % |
| f4 | 75 | 59 Panda corydoras* + 49 Rummy-nose tetra° | 102 % / 131 % | red / green / red | 28 -> 62 % | 42 -> 93 % | no valid count | +14 % |
| f7 | 40 | 52 Neon tetra* | 75 % / 0 % | - / amber / amber | 40 -> 62 % | 65 -> 88 % | - | +17 % |
| f15 | 75 | 4 Siamese algae eater* + 109 Celestial pearl danio° | 77 % / 29 % | amber / amber / amber | can't say | 4 -> 29 % | 70 -> 67 % | +96 % |
| f13 | 30 | 4 Reticulated hillstream loach* + 38 Otocinclus° | 169 % / 90 % | amber / green / amber | can't say | 4 -> 90 % | 20 -> 115 % | -15 % |
| f14 | 125 | 37 Bronze corydoras* + 23 Kadango (red-fin) cichlid° | 114 % / 110 % | amber / amber / amber | can't say | can't say | can't say | - |
| f16 | 75 | 5 Kribensis* + 16 Yellow lab cichlid° | 74 % / 75 % | - / - / - | - | - | - | - |
| f5 | 125 | 59 Kuhli loach* + 11 Sterba's corydoras° | 92 % / 131 % | - / - / - | - | - | - | - |
| f12 | 40 | 37 Harlequin rasbora* + 9 Pea puffer° | 83 % / 0 % | - / - / - | - | - | - | - |
| p1a (pair) | 20 | 23 Neon tetra* | 94 % / 0 % | - / - / - | - | - | - | - |
| f2 | 90 | 27 Bronze corydoras* | 63 % / 120 % | - / - / - | - | - | - | - |
| p1b (pair of p1a) | 20 | 23 Neon tetra* | 88 % / 0 % | - / - / - | - | - | - | - |
| f3 | 30 | 9 Bronze corydoras* | 55 % / 80 % | - / - / - | - | - | - | - |
| f1 | 55 | 34 Panda corydoras* | 63 % / 104 % | - / - / - | - | - | - | - |
| p2a (pair) | 40 | 15 Bronze corydoras* | 55 % / 89 % | - / - / - | - | - | - | - |
| r1 (repeat of f13) | 30 | 4 Reticulated hillstream loach* + 38 Otocinclus° | 169 % / 90 % | - / - / - | - | - | - | - |
| f11 | 90 | 115 Dwarf pencilfish* + 9 Pearl gourami° | 124 % / 0 % | - / - / - | - | - | - | - |

\* = the species the main count questions asked about; ° = the tankmate count.

## Overall

10 tanks with counts. Median fix +8 %; the engine reads 3 of them more than 10 % too full, 4 more than 10 % too empty.
Floor bands: 3 of 6 agree; the engine is a band fuller on 2, emptier on 1.
Water bands: 5 of 10 agree; the engine is a band fuller on 4, emptier on 1.
Overall bands: 6 of 11 agree; the engine is a band fuller on 4, emptier on 1.
Limit / ideal count, one-species tanks (4): yours median 1.59, the engine's 1.47 (a higher ratio from you means later fish crowd the tank less than the engine's school curve says; noisy, read it over rounds).

## Patterns

Median fix per group (tanks with counts, repeats and left-out tanks excluded). Flagged: 3 or more tanks and a median more than 15 % off.

| pattern | group | tanks | median fix | range | |
|---|---|---|---|---|---|
| focal body class | big | 1 | +96 % | +96 % to +96 % |  |
| focal body class | mid | 2 | -6 % | -42 % to +30 % |  |
| focal body class | tiny | 7 | +7 % | -47 % to +17 % |  |
| focal zone | bottom | 5 | +7 % | -42 % to +96 % |  |
| focal zone | middle | 3 | +17 % | +9 % to +30 % | **flag** |
| focal zone | top | 2 | -25 % | -47 % to -3 % |  |
| tight dimension (engine) | both | 2 | +10 % | +7 % to +14 % |  |
| tight dimension (engine) | floor | 1 | -42 % | -42 % to -42 % |  |
| tight dimension (engine) | water | 7 | +9 % | -47 % to +96 % |  |
| one species or a mix | mix | 6 | +10 % | -15 % to +96 % |  |
| one species or a mix | one species | 4 | -17 % | -47 % to +17 % | **flag** |
| tank size | 29-40 gal | 7 | -3 % | -47 % to +17 % |  |
| tank size | 55 gal and up | 3 | +30 % | +14 % to +96 % | **flag** |
| focal count as shown | 10 or fewer | 2 | +41 % | -15 % to +96 % |  |
| focal count as shown | 11-30 | 4 | -23 % | -47 % to +7 % | **flag** |
| focal count as shown | over 30 | 4 | +15 % | +9 % to +30 % | **flag** |

## The max rule

The engine's overall is the larger of floor and water. Your overall matched your tighter dimension on 5 of 5 tanks.

## What limits the room first

0 tank(s) "not room" (left out of the room numbers). Of the rest, your limiting species matches the engine's biggest contributor on the binding dimension on 11 of 11.

## Big enough per species

Every tank passed the app's recommended minimum for each species. You called none too small.

## Pairs (same stock, another footprint)

- p2a 36x18x16 vs p2b 48x12x16 (15 Bronze corydoras): your ideal - vs 18, limit - vs 28; the engine's reading as shown 89 % vs 100 %
- p1a 24x12x16 vs p1b 30x12x12 (23 Neon tetra): your ideal - vs -, limit - vs -; the engine's reading as shown 94 % vs 88 %

## About the answers

Confidence: low 4, medium 7, high 0. In a bare tank: the same 0, a little lower 7, a lot lower 4 (survey 2.1; survey 2.0 asked about dense planting: the same 0, a little higher 0, a lot higher 1).

## Compatibility: gate vs you

0 of 7 agree.

- f10 (Marbled hatchetfish + Honey gourami + Chili rasbora): gate ok, you caution (see the note)
- a1 (Harlequin rasbora + Rummy-nose tetra): gate concern (temperature: narrow shared range), you yes (see the note)
- f6 (Panda corydoras + White cloud mountain minnow): gate concern (temperature: narrow shared range), you yes (see the note)
- f4 (Panda corydoras + Rummy-nose tetra): gate concern (temperature: narrow shared range), you yes (see the note)
- f15 (Siamese algae eater + Celestial pearl danio): gate ok, you caution (see the note)
- f13 (Reticulated hillstream loach + Otocinclus): gate ok, you caution (see the note)
- f14 (Bronze corydoras + Kadango (red-fin) cichlid): gate concern (temperature: narrow shared range), you no (see the note)

## Notes (the expert's own words)

**f10**: Eight honey gouramis are the main constraint. Suitable cover helps them separate, but their territorial behavior still matters, especially with multiple males. Hatchetfish concentrate near the surface, creating overlap with the gouramis’ preferred territory. www.aquariumcoop.com The 12 hatchetfish / 20 chilis are my preferred counts with those eight gouramis fixed. They don’t imply that the entire combination becomes green. The 20-hatchetfish maximum is a tentative calibration estimate; the unknown gourami sex ratio makes that boundary particularly uncertain. Replace the old note with: Assumes suitable cover and sight breaks. Eight honey gouramis drive the caution rating through territorial demand and overlap with surface-dwelling hatchetfish. Gourami sex ratio materially affects suitability. Suggested counts are conditional estimates; changing hatchetfish or chili numbers alone does not remove the gourami constraint.

**f8**: 66 embers is a comfortably full stocking here. A single school of small, peaceful fish uses this footprint efficiently, without another species competing for territory. Embers’ peaceful, gregarious behavior supports that assessment. www.seriouslyfish.com Compared with the earlier 29-gallon, this tank provides 80% more horizontal area—648 versus 360 square inches. That supports a substantial increase from my earlier 40-fish ideal, especially with suitable furnishing now explicit. 70 ideal / 110 maximum are approximate calibration judgments. Confidence is higher in the current green rating than in the precise maximum. Note: Single-species shoal; current count is near my comfortable target. Preserve connected swimming areas among the planting. Cover improves security, but reducing numbers alone would not fully compensate for a bare habitat.

**f9**: 18 guppies at the stated 3 cm adult size is comfortably green in this 30-inch tank. My 25 ideal / 40 maximum are approximate room-based calibration estimates, assuming the population stays at the specified count. Size matters here: 3 cm represents a small adult guppy, particularly a male. Females are generally larger, so these counts should not automatically transfer to a mixed group of larger adults. petco.com Note: Assessed at the listed 3 cm adult size. Sex ratio and reproduction require separate consideration; a breeding population can grow beyond the assessed stocking. For mixed sexes, provide roughly two to three females per male to reduce concentrated harassment.

**p2b**: 15 adult bronze cories is a comfortable stocking for this four-foot, species-only tank. Their peaceful social behavior allows shared foraging space rather than requiring separate territories. Tropical Fish Hobbyist Magazine The 576-square-inch footprint drives my assessment. The 12-inch width is adequate, but gives less room for the group to spread out than an 18-inch-wide breeder. Their occasional swimming above the bottom doesn’t remove that floor-space constraint. 18 ideal / 28 maximum are judgment-based calibration estimates, with greater confidence in the current green rating than the exact maximum. Note: Assumes substantial accessible foraging substrate, with shelter arranged to preserve connected floor space. Fine sand supports their natural foraging behavior.

**a1**: 115 adult, 5 cm fish makes this a busy but workable six-foot tank. I’d place it moderately into amber. Both groups use overlapping swimming space, and the 87 harlequins account for most of the demand. The two ideal answers are separate alternatives: approximately 70 + 28, or 87 + 12. Of those, I’d favor reducing the harlequins and retaining the larger rummy-nose school. Rummy-noses benefit from substantial groups and are compatible with similarly sized, peaceful rasboras. Aquarium Co-Op Note: Compatible species; combined swimming-space demand drives the caution rating. Counts are approximate calibration judgments, with the maximum less certain than the current classification.

**f6**: 28 pandas make the bottom busy; the 25 white clouds are a comfortable swimming population. My judgment is amber overall, primarily from the panda density. The counts are approximate calibration estimates. Keeping 25 white clouds is my preferred answer with the pandas fixed—it does not make the whole tank green. Reducing the pandas is the useful adjustment. One engine input needs scrutiny: “White clouds: floor, half the time” overstates their role as bottom dwellers. They primarily occupy the upper and middle water, although they also visit and feed lower down. I would give them much less floor demand than an equivalent-sized cory, and I have not treated them as 12.5 additional bottom-dwelling fish here.

**f4**: The 59 pandas drive the red rating. This tank has only 33% more floor area than the preceding 40 breeder, but 111% more pandas. The extra height does little to relieve their primary space constraint. My 28 ideal / 42 maximum are approximate calibration judgments consistent with that preceding case. The 49 rummy-noses are a substantial but reasonable school for the swimming space; reducing them cannot resolve the panda crowding. Note: Species compatibility is acceptable; the current bottom population is not. “No count works” for rummy-noses means the fixed 59 pandas already exceed my floor-space limit, even with zero tetras.

**f7**: 52 adult neons puts this moderately into amber: workable under the stated assumptions, but beyond my comfortably stocked target. Compared with the 66 embers in this same footprint, these 3.8 cm neons are substantially larger than the listed 2 cm embers. I’d therefore set a lower comfortable count despite both being peaceful shoaling fish. thesprucepets.com Note: Single-species stocking with no compatibility constraint. 40 ideal / 65 maximum are approximate space-based judgments; the upper boundary is less certain than the amber classification.

**f15**: The algae eaters need both grazing surfaces and swimming space. Their group dynamics also complicate an “ideal” count: Seriously Fish recommends six or more and a roughly 60 × 18-inch footprint for a group. I regard this 48-inch tank as marginal rather than automatically impossible, but wouldn’t add more to this particular stock. The four-fish ceiling is my calibration judgment, not an established limit. Seriously Fish CPDs are timid, benefit from substantial plant cover, and can be disadvantaged by larger, more competitive tankmates. That drives the compatibility caution and the stronger reduction for a bare tank. 70 is a preferred conditional count, not a claim that it resolves the algae eaters’ social requirements. Aquarium Co-Op Note for the engine: Don’t translate 109 CPDs into 54.5 bottom dwellers. Using lower planted water is different from requiring substrate territory. Also, the water-column question omits Siamese algae eaters even though their tag correctly says “floor + water.” Their swimming demand should count.

**f13**: Four hillstreams plus about 20 otos would be my comfortable target under the stated assumptions. With 38 otos fixed, I wouldn’t add more hillstreams; changing only their count doesn’t give me a clear ideal stocking. The floor rating is an imperfect proxy here. Otos use glass, leaves, wood, and rocks, so their usable space depends heavily on the furnished surface area. Counting them as 19 equivalent bottom dwellers misses that distinction. Separately from room, sustaining 42 grazers requires deliberate feeding. Adequate filtration and furnishing don’t establish adequate food production; Aquarium Co-Op specifically identifies exhausting available algae as a limitation on oto numbers. That concern belongs in the husbandry note rather than being used to inflate the room rating.

**f14**: The missing sex ratio materially changes this one. A predominantly female group and a group containing many mature males have very different space requirements. Kadangos shoal, but males establish breeding territories on rocks or substrate. Furnishing helps divide those territories; it doesn’t eliminate their space requirements. Seriously Fish I wouldn’t recommend combining that breeding activity with 37 cories continually traversing the bottom. That is a compatibility judgment—not a claim that 37 cories alone overcrowd a six-foot tank. I’m withholding conditional counts because they would imply a defensible mixed stocking target that I don’t have here. Note for the engine: “Water, near the surface” misrepresents Kadango space use. They need open swimming water and access to bottom breeding territories. If the floor question counted only the cories, I’d mark it Ideal or under; the actual mixed tank warrants Caution.

## Findings

(hand-written: the patterns above, the broad changes they suggest, and what the next batch should test)
