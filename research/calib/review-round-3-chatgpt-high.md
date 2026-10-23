# Calibration review, round 3: chatgpt-high (an AI model)

Engine readings: the current engine (research/calib/tables, 2026-10-23). Answers 2026-10-23. Ideal = 75 %, limit = 100 %. Counts are read on the dimension their species fills (floor for bottom dwellers, water for swimmers, the larger for fish that use both). "fix" is what the engine's reading would need to be multiplied by to match the answers: below 0 % the engine reads the tank too full, above it too empty.

## Tank by tank

| tank | gal | animals | engine water / floor | answer floor / water / overall | ideal count -> engine | limit count -> engine | tankmate ideal -> engine | fix |
|---|---|---|---|---|---|---|---|---|
| p1b (pair of p1a) | 40 | 37 Black molly* | 146 % / 0 % | - / red / red | 12 -> 65 % | 19 -> 90 % | - | +13 % |
| f7 | 20 | 16 Panda corydoras* | 63 % / 85 % | amber / green / amber | 12 -> 64 % | 18 -> 96 % | - | +11 % |
| f8 | 20 | 24 Panda corydoras* | 85 % / 128 % | red / green / red | 12 -> 64 % | 18 -> 96 % | - | +11 % |
| f4 | 15 | 7 Cherry barb* | 58 % / 0 % | - / green / green | 10 -> 82 % | 14 -> 105 % | - | -7 % |
| f5 | 20 | 12 Chili rasbora* + 1 Dwarf gourami + 6 Pygmy corydoras° | 77 % / 0 % | green / green / green | 24 -> 112 % | 36 -> 143 % | 14 -> 91 % | -27 % |
| f11 | 29 | 3 Bristlenose pleco* + 29 White cloud mountain minnow° | 113 % / 50 % | red / amber / red | no valid count | no valid count | no valid count | - |
| f10 | 29 | 24 Panda corydoras* | 85 % / 128 % | red / green / red | 12 -> 64 % | 18 -> 96 % | - | +11 % |
| f6 | 20 | 9 Neon tetra* + 7 White cloud mountain minnow° | 65 % / 0 % | green / green / green | 13 -> 79 % | 18 -> 94 % | 10 -> 72 % | +2 % |
| f1 | 10 | 4 Guppy* + 1 Pea puffer + 6 Pygmy corydoras° | 107 % / 0 % | green / green / green | 4 -> 107 % | 6 -> 134 % | 7 -> 111 % | -29 % |
| a1 (anchor) | 125 | 87 Harlequin rasbora* + 28 Rummy-nose tetra° | 66 % / 0 % | - / amber / amber | 75 -> 61 % | 125 -> 80 % | 18 -> 61 % | +23 % |
| f15 | 55 | 16 Bronze corydoras* + 42 Celestial pearl danio° | 80 % / 98 % | amber / green / amber | 14 -> 86 % | 22 -> 135 % | 55 -> 98 % | -21 % |
| f16 | 75 | 10 Kribensis* + 11 Sterba's corydoras° | 72 % / 109 % | red / green / red | 2 -> 60 % | 4 -> 72 % | no valid count | +31 % |
| f3 | 10 | 8 Dwarf pencilfish* | 82 % / 0 % | - / green / green | 10 -> 102 % | 13 -> 123 % | - | -23 % |
| f12 | 40 | 22 Bronze corydoras* + 30 Platy° | 130 % / 130 % | amber / red / red | no valid count | 14 -> 83 % | no valid count | +21 % |
| f9 | 29 | 11 Panda corydoras* + 19 Otocinclus° | 128 % / 99 % | amber / green / amber | 9 -> 88 % | 16 -> 126 % | 12 -> 103 % | -21 % |
| f14 | 55 | 15 Bronze corydoras* + 6 Marbled hatchetfish° | 67 % / 92 % | green / green / green | 18 -> 111 % | 26 -> 160 % | 14 -> 80 % | -26 % |
| f13 | 40 | 6 Kuhli loach* + 85 Celestial pearl danio° | 75 % / 20 % | amber / red / red | no valid count | no valid count | 50 -> 58 % | +29 % |
| p1a (pair) | 40 | 37 Black molly* | 130 % / 0 % | - / red / red | 12 -> 58 % | 19 -> 80 % | - | +27 % |
| f2 | 10 | 26 Ember tetra* | 125 % / 0 % | - / red / red | 16 -> 88 % | 24 -> 118 % | - | -15 % |
| r1 (repeat of f11) | 29 | 3 Bristlenose pleco* + 29 White cloud mountain minnow° | 113 % / 50 % | red / amber / red | no valid count | 1 -> 17 % | no valid count | +499 % |
| p2b (pair of p2a) | 30 | 22 Panda corydoras* | 66 % / 98 % | amber / green / amber | 15 -> 67 % | 22 -> 98 % | - | +7 % |
| p2a (pair) | 29 | 22 Panda corydoras* | 79 % / 117 % | red / green / red | 12 -> 64 % | 18 -> 96 % | - | +11 % |

\* = the species the main count questions asked about; ° = the tankmate count.

## Overall

20 tanks with counts. Median fix +9 %; the engine reads 7 of them more than 10 % too full, 10 more than 10 % too empty.
Floor bands: 11 of 15 agree; the engine is a band fuller on 2, emptier on 2.
Water bands: 10 of 21 agree; the engine is a band fuller on 9, emptier on 2.
Overall bands: 14 of 21 agree; the engine is a band fuller on 5, emptier on 2.
Limit / ideal count, one-species tanks (10): yours median 1.50, the engine's 1.31 (a higher ratio from you means later fish crowd the tank less than the engine's school curve says; noisy, read it over rounds).

## Patterns

Median fix per group (tanks with counts, repeats and left-out tanks excluded). Flagged: 3 or more tanks and a median more than 15 % off.

| pattern | group | tanks | median fix | range | |
|---|---|---|---|---|---|
| focal body class | mid | 9 | +21 % | -26 % to +31 % | **flag** |
| focal body class | tiny | 11 | +2 % | -29 % to +11 % |  |
| focal zone | bottom | 11 | +11 % | -26 % to +31 % |  |
| focal zone | middle | 8 | -2 % | -27 % to +27 % |  |
| focal zone | top | 1 | -29 % | -29 % to -29 % |  |
| tight dimension (engine) | both | 3 | -21 % | -21 % to +21 % | **flag** |
| tight dimension (engine) | floor | 7 | +11 % | -26 % to +31 % |  |
| tight dimension (engine) | water | 10 | -2 % | -29 % to +29 % |  |
| one species or a mix | mix | 10 | -10 % | -29 % to +31 % |  |
| one species or a mix | one species | 10 | +11 % | -23 % to +27 % |  |
| tank size | 10-20 gal | 8 | -11 % | -29 % to +11 % |  |
| tank size | 29-40 gal | 8 | +12 % | -21 % to +29 % |  |
| tank size | 55 gal and up | 4 | +1 % | -26 % to +31 % |  |
| focal count as shown | 10 or fewer | 6 | -2 % | -29 % to +31 % |  |
| focal count as shown | 11-30 | 11 | +7 % | -27 % to +21 % |  |
| focal count as shown | over 30 | 3 | +23 % | +13 % to +27 % | **flag** |

## The max rule

The engine's overall is the larger of floor and water. Your overall matched your tighter dimension on 15 of 15 tanks.

## What limits the room first

0 tank(s) "not room" (left out of the room numbers). Of the rest, your limiting species matches the engine's biggest contributor on the binding dimension on 16 of 21.
- f5: you Dwarf gourami, engine Chili rasbora
- f6: you White cloud mountain minnow, engine Neon tetra
- f16: you Kribensis, engine Sterba's corydoras
- f12: you Platy, engine Bronze corydoras
- f9: you Panda corydoras, engine Otocinclus

## Big enough per species

Every tank passed the app's recommended minimum for each species. You called these too small (each is a tank-minimum disagreement): p1b Black molly in 48 x 12 x 16 in.

## Pairs (same stock, another footprint)

- p1a 36x18x16 vs p1b 48x12x16 (37 Black molly): your ideal 12 vs 12, limit 19 vs 19; the engine's reading as shown 130 % vs 146 %
- p2a 30x12x18 vs p2b 36x12x16 (22 Panda corydoras): your ideal 12 vs 15, limit 18 vs 22; the engine's reading as shown 117 % vs 98 %

## About the answers

Confidence: low 0, medium 21, high 0. In a bare tank: the same 0, a little lower 8, a lot lower 13 (survey 2.1; survey 2.0 asked about dense planting: the same 0, a little higher 0, a lot higher 0).

## Repeats (your own consistency)

- r1 = f11: fix +499 % vs -; counts null/1 vs null/null

## Compatibility: gate vs you

7 of 12 agree.

- a1 (Harlequin rasbora + Rummy-nose tetra): gate concern (temperature: narrow shared range), you yes (see the note)
- f16 (Kribensis + Sterba's corydoras): gate ok, you no (see the note)
- f9 (Panda corydoras + Otocinclus): gate ok, you caution (see the note)
- f14 (Bronze corydoras + Marbled hatchetfish): gate concern (temperature: narrow shared range), you yes (see the note)
- f13 (Kuhli loach + Celestial pearl danio): gate high (Celestial pearl danio with Kuhli loach: water chemistry: pH 6.5-7.5 against its 5.5-6.5; temperature: narrow shared range), you yes (see the note)

## Notes (the expert's own words)

**p1b**: The 48-inch length provides good swimming space, but 37 adult 8.5 cm mollies would create severe crowding. Approximately 10–12 would make a comfortable species-only display, with 13–19 increasingly crowded and 20+ entering problematic territory. The 1:3 male-to-female ratio is favorable, but plants and sight breaks remain important for limiting harassment. Strong filtration cannot compensate for insufficient swimming space.  Copy note

**f7**: A 30 × 12-inch footprint comfortably accommodates a group of panda corydoras. Around 8–12 adults represents a desirable stocking level, while 16 is crowded but workable with adequate open sand, cover, and maintenance. Above approximately 18, competition for bottom foraging space and localized crowding become increasingly concerning. The limiting factor is usable floor area rather than water volume or filtration. These thresholds are approximate husbandry judgments, not hard biological limits.  Copy note

**f8**: 24 adult panda corydoras substantially exceed the comfortable stocking density for a 30 × 12-inch footprint. Although their schooling behavior is beneficial, usable substrate area and foraging space become limiting. The tank is suitable for the species, but not this quantity. Approximately 8–12 is ideal, 13–18 increasingly crowded, and 19+ problematic. Strong filtration does not eliminate spatial crowding. Calibration note: These thresholds remain consistent with the preceding 16-panda scenario. At 24 fish, the tank has crossed decisively into Problems rather than merely approaching the boundary.

**f4**: Seven adult cherry barbs (2M, 5F) make a healthy, comfortable stocking for this 24 × 12-inch planted aquarium. The sex ratio is favorable. Approximately 8–10 would be an ideal species-only group; 11–14 becomes progressively crowded, and 15+ raises significant concerns about swimming room and territorial interactions. Cherry barbs particularly benefit from dense vegetation and visual barriers. In a completely bare tank, reducing the number alone would not adequately address their habitat needs.  Copy note

**f5**: The current stocking is comfortably within the tank's spatial capacity. Both schooling species could support substantially larger groups. The primary uncertainty is the dwarf gourami: individual temperament varies, and its territorial behavior may intimidate the very small chili rasboras or interfere with feeding. With dense planting, visual barriers, and a peaceful gourami, this could be a successful long-term community. The numerical limits reflect swimming and foraging space rather than a guarantee of compatibility.  Aquarium Co-Op +2 Calibration distinction: I would rate the room green, while independently flagging compatibility as requiring caution. I would not penalize the stocking percentage simply because one gourami might be aggressive. 

**f11**: Three adult bristlenose plecos are too many for a 30 × 12-inch footprint, even with one male and two females. Territorial behavior and access to suitable foraging areas are the primary spatial concerns. The 29 minnows also produce a crowded swimming column, though their number alone is less concerning than the pleco group. With three plecos already exceeding the bottom-space limit, reducing the minnows cannot restore an acceptable overall stocking level. Separately, white clouds prefer cooler water than bristlenose plecos, making this a poor long-term temperature pairing.  Aquarium Co-Op Forum +2 Calibration note: I would consider approximately 1 bristlenose and 15–20 white clouds a more reasonable spatial combination in this aquarium, although the temperature compatibility concern remains.

**f10**: Although this aquarium holds 29 gallons, its 30 × 12-inch footprint is identical to the previous 20-gallon-long scenario. The additional six inches of height increases water volume but provides relatively little additional usable space for bottom-oriented panda corydoras. Approximately 8–12 adults would be comfortable, 13–18 increasingly crowded, and 19+ problematic. At 24 adults, floor-space competition and concentrated foraging activity are the primary concerns. Calibration note: The ideal and problems thresholds remain unchanged from the 20-gallon-long scenario. This is intentional: increasing tank height should not substantially increase the stocking capacity for predominantly bottom-dwelling fish.

**f6**: The current stocking is spatially comfortable. Both schooling species have adequate room, although the 24-inch length limits further expansion, especially for the more active white clouds. The primary compatibility concern is temperature: neon tetras prefer approximately 70–77°F, while white clouds prefer 57–72°F. A stable 70–72°F offers a narrow overlap, but this is not an ideal pairing across their broader preferred conditions. Dense planting and open swimming areas are beneficial.  Seriously Fish +1 Calibration note: This tank is green for spatial stocking, with some capacity remaining. The compatibility caution should remain separate from the stocking percentage.

**f1**: Spatially, this is near the upper end of comfortable stocking for a 20-inch, 10-gallon aquarium. The pygmy corydoras are small and use both bottom and midwater space, while guppies predominantly occupy the upper water column. However, the pea puffer makes this combination unsuitable for long-term keeping. Pea puffers are territorial and prone to fin-nipping, particularly toward guppies. They are generally recommended for species-only aquariums. The six pygmy corydoras also represent a relatively small school; eight or more would be preferable if space permits.  Aquarium Co-Op +1 Calibration distinction: The stocking is approximately at the green/yellow boundary spatially, but the compatibility verdict is firmly No. The pea puffer's aggression should not be represented as excess stocking load.

**a1**: The six-foot tank provides excellent swimming length for both species, and their peaceful temperaments make them compatible long-term. However, 115 adult fish averaging 5 cm creates a densely occupied midwater column. I would classify this as Caution rather than Problems: workable with the specified filtration, maintenance, and habitat, but beyond my preferred comfortable stocking target. The 87 harlequins contribute most of the spatial demand, while the more active, tightly schooling rummy-nose tetras require substantial unobstructed swimming space. Both species benefit from planted margins and open swimming lanes.  Aquarium Compass +2 Calibration note: This is a relatively mild Caution, not an impending stocking failure. The numerical thresholds are approximate judgments, with substantial uncertainty at these large school sizes.

**f15**: The 48-inch length provides substantial swimming room for the celestial pearl danios, and the 2:1 female-to-male ratio helps distribute male territorial interactions. Forty-two CPDs are reasonable with extensive planting. Sixteen adult bronze corydoras create considerable bottom activity within the relatively narrow 13-inch footprint, placing floor occupancy slightly beyond my preferred comfortable level. The combination is generally compatible, with overlapping temperature requirements around 72–77°F. Additional corydoras would be more concerning than additional CPDs.  AquariumHQ +1 Calibration note: This is a mild Caution, primarily from the bronze corydoras. The taller 55-gallon format provides useful water-column capacity but comparatively limited bottom area. The proposed thresholds are approximate, with greater uncertainty for the CPD maximum.

**f16**: Ten adult kribensis are excessive for the 48 × 18-inch footprint because of territorial behavior, particularly if multiple male-female pairs form. Even without offspring, spawning pairs can defend substantial bottom territories. Eleven Sterba's corydoras are reasonable for this footprint in isolation, but their constant bottom foraging would bring them into conflict with territorial kribensis. One kribensis pair would be comfortable spatially, while two pairs could be workable with carefully separated territories but pose greater risks. The ten kribensis already exceed the floor-space limit regardless of the corydoras count.  My Aquarium Fish +2 Calibration note: This is an important case where territorial footprint, not physical fish density, determines capacity. A 75-gallon aquarium can comfortably accommodate considerably more than 21 fish of comparable size if their spatial and social requirements differ.

**f3**: Eight adult dwarf pencilfish make a comfortable species-only group in a densely planted 10-gallon aquarium. Approximately 8–10 represents the preferred stocking range, 11–13 becomes increasingly crowded, and 14+ raises concerns about available swimming space and male territorial interactions. The 20-inch tank length is adequate but near the lower recommended limit. Dense planting, floating cover, and broken sightlines are particularly important for this species.  Seriously Fish +2 Calibration note: Eight fish is an appropriate green-level stocking, with limited room for expansion. The stocking limit is influenced more by horizontal space and opportunities to avoid other fish than by waste production.

**f12**: The 36 × 18-inch footprint provides substantial bottom area, but 22 adult bronze corydoras approach its comfortable floor-space limit. Thirty adult platys create a densely occupied water column, particularly when combined with the corydoras' swimming activity. Neither species is inherently incompatible with the other, and the platy sex ratio is favorable. However, 52 fish of these sizes exceed my preferred spatial stocking for a 40-gallon breeder. Reducing the corydoras to approximately 10–14 while retaining the platys would bring the aquarium into a more manageable, though still crowded, range. Calibration note: This is a borderline Problems assessment rather than an extreme overstocking case. The corydoras alone would be near the upper Caution boundary, and 30 platys alone would also be crowded but potentially workable. Their combined spatial demands push the aquarium into Problems.

**f9**: The 30 × 12-inch footprint is becoming crowded, but otocinclus and panda corydoras occupy partially different surfaces. Otocinclus frequently graze on plants, glass, and hardscape rather than competing directly for open substrate. Eleven pandas are near the preferred floor-space limit, while 19 otocinclus push the overall stocking into Caution. The species are peaceful and compatible. The more significant long-term concern is sustaining adequate biofilm and supplemental food for 19 otocinclus, rather than aggression or waste production.  Aquarium Co-Op +1 Calibration note: This is a moderate Caution. Otocinclus should receive less floor-space weighting than similarly sized, exclusively substrate-oriented fish. Their grazing surface requirements also deserve separate treatment from swimming-space capacity.

**f14**: This is a comfortable, well-balanced stocking arrangement. Fifteen bronze corydoras occupy a substantial but reasonable portion of the 48 × 13-inch footprint, while six marbled hatchetfish primarily use the surface and contribute little competition for bottom space. Both species are peaceful and compatible, with overlapping temperature requirements. The corydoras are closer to their preferred spatial limit, while the hatchetfish group could be expanded considerably. Floating cover, open surface swimming areas, and a tightly sealed lid are important for the hatchetfish.  Seriously Fish +1 Calibration note: Unlike the previous 55-gallon example with 42 celestial pearl danios, this combination has almost complete separation between surface and bottom occupancy. I would therefore keep the overall assessment green, even with 15 adult bronze corydoras.

**f13**: The 36 × 18-inch footprint offers ample space for six kuhli loaches, but 85 adult celestial pearl danios create excessive occupancy of the lower and middle water column. CPDs are not conventional tight-schooling fish; males establish small display territories, and the 28 males would compete for space despite the favorable 2:1 female ratio. Around 40–50 CPDs alongside six kuhlis would represent a more comfortable stocking target. At 85, the danios alone exceed my preferred spatial limits, so removing the kuhlis would not restore an acceptable overall stocking level. The species themselves are compatible. Calibration note: The key consideration is that CPDs spend considerable time in the lower water column, rather than spreading evenly throughout the aquarium's 16-inch height. Their territorial spacing matters more than their small body size might suggest.

**p1a**: Thirty-seven adult black mollies substantially exceed the comfortable capacity of this 40-gallon breeder. Approximately 10–12 would make an ideal species-only display, 13–19 increasingly crowded, and 20+ problematic. The 9M:28F ratio is favorable, but male competition and persistent courtship remain concerns. The 18-inch depth provides useful maneuvering room, although the 36-inch length offers less straight-line swimming distance than a 40-gallon long. Strong filtration does not eliminate physical crowding.  Aquarium Co-Op Calibration note: I retained the 12/19 thresholds from the earlier 48 × 12 × 16-inch molly scenario. The breeder gains 12.5% in footprint but loses 25% in swimming length, making similar stocking limits reasonable.

**f2**: Twenty-six adult ember tetras create a very dense school for a 20-inch-long aquarium. Their tiny size, peaceful temperament, and low territoriality allow substantially higher stocking densities than larger tetras. Approximately 12–16 would make a comfortable species-only display, while 17–24 would be increasingly crowded. At 26, the available swimming space becomes restrictive, even with excellent filtration. Dense plants and shaded cover are particularly important, although sufficient open swimming space should remain. Calibration note: This is a relatively mild Problems assessment. Ember tetras tolerate group density exceptionally well, so the transition from Caution to Problems is less sharply defined than for territorial or larger-bodied species.

**r1**: Three adult bristlenose plecos exceed the comfortable territorial capacity of a 30 × 12-inch footprint, particularly with a male present. The 29 white clouds also create a crowded swimming column, although their spatial demands are less severe than the plecos'. Reducing the minnows cannot resolve the excessive bottom occupancy. Separately, white clouds prefer cooler temperatures than bristlenose plecos, creating a long-term husbandry compromise. Calibration note: This is identical to Aquarium 6, so I've preserved the same thresholds and classifications.

**p2b**: Twenty-two adult panda corydoras represent a heavily stocked but potentially workable group in a 36 × 12-inch aquarium. The additional swimming length and 20% greater floor area compared with a 30 × 12-inch tank provide meaningful extra capacity. Approximately 12–15 pandas would represent comfortable stocking, while 16–22 increasingly crowd the bottom. Above 22, restricted foraging space and concentrated activity become significant concerns. Good substrate, shelter, and unobstructed feeding areas remain important. Calibration note: This scales reasonably from the previous 30 × 12-inch panda corydoras assessments (12 Ideal, 18 before Problems). The 20% increase in floor area supports increasing those thresholds to approximately 15 and 22, respectively. At 22 fish, this is near the upper Caution boundary.

**p2a**: Twenty-two adult panda corydoras exceed the preferred stocking capacity of a 30 × 12-inch footprint. Approximately 8–12 provide a comfortable group, 13–18 represent increasingly crowded conditions, and 19+ enter Problems territory. Although the tank holds 29 gallons, its additional height provides limited benefit to bottom-oriented fish. The main concern is concentrated activity and competition for usable substrate, rather than filtration capacity. Calibration note: This is intentionally different from the preceding 36 × 12-inch tank containing 22 pandas, which received Caution. The 20% reduction in floor area pushes the same group into Problems. The thresholds remain consistent with our earlier 30 × 12-inch assessments.

## Findings

(hand-written: the patterns above, the broad changes they suggest, and what the next batch should test)
