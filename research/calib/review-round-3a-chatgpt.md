# Calibration review, round 3: chatgpt (an AI model)

Engine readings: the current engine (research/calib/tables, 2026-10-29). Answers 2026-10-23. Ideal = 75 %, limit = 100 %. Counts are read on the dimension their species fills (floor for bottom dwellers, water for swimmers, the larger for fish that use both). "fix" is what the engine's reading would need to be multiplied by to match the answers: below 0 % the engine reads the tank too full, above it too empty.

## Tank by tank

| tank | gal | animals | engine water / floor | answer floor / water / overall | ideal count -> engine | limit count -> engine | tankmate ideal -> engine | fix |
|---|---|---|---|---|---|---|---|---|
| p2b (pair of p2a) | 30 | 19 Panda corydoras* ⚠ | 42 % / 84 % | amber / green / amber | 16 -> 71 % | 24 -> 106 % | - | 0 % |
| f12 | 40 | 17 Bronze corydoras* + 10 Rummy-nose tetra° ⚠ | 57 % / 101 % | green / green / green | 20 -> 118 % | 30 -> 178 % | 25 -> 78 % | -30 % |
| f14 | 55 | 4 Bristlenose pleco* + 45 Otocinclus° ⚠ | 94 % / 70 % | amber / green / amber | 0 (on review) | 4 -> 70 % | 30 -> 76 % | +19 % |
| f1 | 10 | 4 Guppy* + 1 Pea puffer + 6 Pygmy corydoras° | 107 % / 0 % | green / green / green | 4 -> 107 % | 8 -> 161 % | 10 -> 122 % | -36 % |
| f8 | 20 | 11 Panda corydoras* | 34 % / 59 % | green / green / green | 13 -> 69 % | 20 -> 106 % | - | +1 % |
| f11 | 29 | 13 Panda corydoras* | 38 % / 69 % | - / - / - | - | - | - | - |
| f3 | 10 | 8 Dwarf pencilfish* | 82 % / 0 % | - / - / - | - | - | - | - |
| f7 | 20 | 10 Panda corydoras* + 5 Pea puffer° | 68 % / 53 % | - / - / - | - | - | - | - |
| f16 | 75 | 29 Bronze corydoras* + 14 Harlequin rasbora° ⚠ | 58 % / 129 % | - / - / - | - | - | - | - |
| f5 | 20 | 13 Neon tetra* + 24 Amano shrimp° | 86 % / 25 % | - / - / - | - | - | - | - |
| f9 | 29 | 3 Bristlenose pleco* + 38 Otocinclus° ⚠ | 150 % / 95 % | - / - / - | - | - | - | - |
| f4 | 15 | 6 Cherry barb* | 49 % / 0 % | - / - / - | - | - | - | - |
| p1b (pair of p1a) | 20 | 32 Dwarf pencilfish* ⚠ | 131 % / 0 % | - / - / - | - | - | - | - |
| f10 | 29 | 6 Panda corydoras* + 49 Celestial pearl danio° ⚠ | 72 % / 32 % | - / - / - | - | - | - | - |
| f6 | 20 | 3 Platy* + 10 Cherry shrimp + 6 White cloud mountain minnow° | 56 % / 7 % | - / - / - | - | - | - | - |
| f15 | 55 | 26 Panda corydoras* ⚠ | 36 % / 80 % | - / - / - | - | - | - | - |
| f2 | 10 | 30 Ember tetra* ⚠ | 139 % / 0 % | - / - / - | - | - | - | - |
| p2a (pair) | 29 | 19 Panda corydoras* ⚠ | 50 % / 101 % | - / - / - | - | - | - | - |
| r1 (repeat of f5) | 20 | 13 Neon tetra* + 24 Amano shrimp° | 86 % / 25 % | - / - / - | - | - | - | - |
| f13 | 40 | 13 Bronze corydoras* + 14 Reticulated hillstream loach° | 66 % / 128 % | - / - / - | - | - | - | - |
| a1 (anchor) | 125 | 87 Harlequin rasbora* + 28 Rummy-nose tetra° ⚠ | 66 % / 0 % | - / - / - | - | - | - | - |
| p1a (pair) | 20 | 32 Dwarf pencilfish* ⚠ | 140 % / 0 % | - / - / - | - | - | - | - |

⚠ = an implausible stocking count (see "Implausible-count tanks").

\* = the species the main count questions asked about; ° = the tankmate count.

## Overall

5 tanks with counts. Median fix 0 %; the engine reads 2 of them more than 10 % too full, 1 more than 10 % too empty.
Floor bands: 3 of 5 agree; the engine is a band fuller on 1, emptier on 1.
Water bands: 3 of 5 agree; the engine is a band fuller on 2, emptier on 0.
Overall bands: 3 of 5 agree; the engine is a band fuller on 2, emptier on 0.
Limit / ideal count, one-species tanks (2): yours median 1.52, the engine's 1.31 (a higher ratio from you means later fish crowd the tank less than the engine's school curve says; noisy, read it over rounds).

## Patterns

Median fix per group (tanks with counts, repeats and left-out tanks excluded). Flagged: 3 or more tanks and a median more than 15 % off.

| pattern | group | tanks | median fix | range | |
|---|---|---|---|---|---|
| focal body class | mid | 2 | -5 % | -30 % to +19 % |  |
| focal body class | tiny | 3 | 0 % | -36 % to +1 % |  |
| focal zone | bottom | 4 | +0 % | -30 % to +19 % |  |
| focal zone | top | 1 | -36 % | -36 % to -36 % |  |
| tight dimension (engine) | floor | 3 | 0 % | -30 % to +1 % |  |
| tight dimension (engine) | water | 2 | -8 % | -36 % to +19 % |  |
| one species or a mix | mix | 3 | -30 % | -36 % to +19 % | **flag** |
| one species or a mix | one species | 2 | +0 % | 0 % to +1 % |  |
| tank size | 10-20 gal | 2 | -17 % | -36 % to +1 % |  |
| tank size | 29-40 gal | 2 | -15 % | -30 % to 0 % |  |
| tank size | 55 gal and up | 1 | +19 % | +19 % to +19 % |  |
| focal count as shown | 10 or fewer | 2 | -8 % | -36 % to +19 % |  |
| focal count as shown | 11-30 | 3 | 0 % | -30 % to +1 % |  |

## The max rule

The engine's overall is the larger of floor and water. Your overall matched your tighter dimension on 5 of 5 tanks.

## What limits the room first

1 tank(s) "not room" (left out of the room numbers). Of the rest, your limiting species matches the engine's biggest contributor on the binding dimension on 3 of 4.
- f14: you Bristlenose pleco, engine Otocinclus

## Big enough per species

Every tank passed the app's recommended minimum for each species. You called none too small.

## Pairs (same stock, another footprint)

- p2a 30x12x18 vs p2b 36x12x16 (19 Panda corydoras): your ideal - vs 16, limit - vs 24; the engine's reading as shown 101 % vs 84 %
- p1a 24x12x16 vs p1b 30x12x12 (32 Dwarf pencilfish): your ideal - vs -, limit - vs -; the engine's reading as shown 140 % vs 131 %

## About the answers

Confidence: low 1, medium 4, high 0. In a bare tank: the same 0, a little lower 3, a lot lower 2 (survey 2.1; survey 2.0 asked about dense planting: the same 0, a little higher 0, a lot higher 0).

## Implausible-count tanks

Counts nobody keeps (30 or more of one species, 40 for shrimp and snails, 15 or more corydoras, or 50 or more animals). They stay in the fit at full weight (Nathan 2026-10-26) but read their answers with that in mind: 12 of 22 tanks, 3 with counts. Median fix 0 % on them, -17 % on the others.

- p2b: 19 Panda corydoras; fix 0 % (has a note)
- f12: 17 Bronze corydoras; fix -30 % (has a note)
- f14: 45 Otocinclus; fix +19 % (has a note)
- f16: 29 Bronze corydoras
- f9: 38 Otocinclus
- p1b: 32 Dwarf pencilfish
- f10: 49 Celestial pearl danio
- f15: 26 Panda corydoras
- f2: 30 Ember tetra
- p2a: 19 Panda corydoras
- a1: 87 Harlequin rasbora
- p1a: 32 Dwarf pencilfish

## Compatibility: gate vs you

2 of 3 agree.

- f14 (Bristlenose pleco + Otocinclus): gate ok, you caution (see the note)

## Notes (the expert's own words)

**p2b**: For this 36 × 12-inch footprint, I’d treat 17–24 pandas as Caution, so the current 19 sit toward its lower end. These are my calibration thresholds under the stated assumptions. Optional note: Floor space for shared foraging is the constraint. Occasional midwater swimming and trips to the surface don’t make the unused upper water a substitute for bottom area. Preserve substantial connected substrate alongside the cover.

**f12**: Optional note: The broad 36 × 18-inch bottom provides useful shared foraging space for 17 bronze cories, while ten rummy-noses leave considerable swimming room. The groups primarily use different areas, so their space demands overlap less than those of two midwater schools. These thresholds assume substantial open substrate and an unobstructed swimming route along the tank’s length.

**f14**: The zero follows from preserving the sex ratio: the available counts are 0, 4, 8… I’d consider 45 otos alone spatially within Ideal under these assumptions, but adding the first four bristlenoses moves the combination into Caution. Therefore, “No count works as described” would be the wrong selection. The one-male, three-female arrangement helps; multiple bristlenoses are more workable with a female-heavy mix and separate caves. Aquarium Co-Op Optional note: Judge usable surfaces and access to separate resting areas, rather than treating all these fish as open-water swimmers. Food supply needs separate attention at this density; it is not the basis of my room rating.

**f1**: Those are room-only thresholds, using the listed adult sizes and preserving the guppies’ 1M:3F ratio. They do not endorse the combination. Optional note: A pea puffer can nip and harass the guppies and pygmy cories despite adequate physical room. Cover can reduce encounters but doesn’t reliably resolve that incompatibility. Reducing guppy numbers therefore isn’t a dependable fix; I would remove the puffer from this community.

**f8**: Optional note: Bottom foraging space sets the limit. These estimates are consistent with my 16 / 24 thresholds for the 36 × 12-inch tank: this tank has about 17% less floor area, with proportionately lower counts.

## Findings

(hand-written: the patterns above, the broad changes they suggest, and what the next batch should test)
