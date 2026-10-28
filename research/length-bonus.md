# Length bonus in density + turning clearance (lane LB, 2026-10-28, prototype, OFF)

Nathan's ask: tank shape counts for swimmers in the density model (`stocking.ts`); the sourced minimum gate (`tankMin.ts`, MX1-MX9) stays as is.
Code: `LENGTH_BONUS` / `lengthFactor` / `lengthBetaOf` in `src/scene/stocking.ts` (`on: false`; nothing in production output changes),
`src/scene/turnclear.ts` (heuristic, wired nowhere). Tests: `test/lengthbonus.test.ts`; numbers regenerate with
`GEN_LB=1 LB_OUT=file npx vitest run test/lengthbonus.scratch.test.ts`.

## Model as built
- B_L = 1 + beta x (1 - sqrt(W/L)), W/L from the footprint bounding box (`floorOf`), floored at 1:8 (`minWL` 0.125). Square, circle, hexagon: W/L = 1, no bonus.
- F_L = B_L / B_L(ref). A swimmer's load is DIVIDED by F_L (`heightMul` multiplies load, so more room = divide): a longer tank than the reference reads lower, a squarer one higher.
- beta by class (judgment parameters, not fitted): bottom zone and land 0; HS_LOW_IDS (danio, whitecloud, cpd, harlequin, chili, barbs, SAE; fast
  horizontal schoolers) high 0.7; gouramis, tall-bodied fish (aspect >= 0.9, so oscar and discus too) and betta low 0.2; everything else mid 0.4;
  "all"-zone fish half of their class (ALL_CURVE, same half-and-half as the height curve). No gamma exponent.
- Bottom dwellers: height already capped at `BOTTOM_REF_CM` (35 cm), their floor is counted separately; beta 0, so no change at all (shape test below confirms 24 / 24 % in every shape).
- Reference elongation = median W/L of the 37 lists' tanks = **0.5 (2:1)**. 27 of the 37 are exactly 0.5 (the list's gallon snapped to a standard
  tank: 20 x 10, 24 x 12, 36 x 18, 48 x 24...), 3 at 0.4, 1 at 0.33, 6 at 0.27 (48 x 13 and 72 x 18). So the median result cannot move, and the lists carry almost no shape variety.

## Step 1: the 37 expert lists (at the published max; sdlog of percent, lower = the experts agree more)
| variant | median % | sdlog max | sdlog min | over 100 % | pass to fail | fail to pass | lists moved > 2 % | biggest drop |
|---|---|---|---|---|---|---|---|---|
| off (today) | 69.7 | 0.4428 | 0.4539 | 12 | - | - | - | - |
| provisional beta .2 / .4 / .7, ref 0.5 | 68.9 | 0.4448 | 0.4567 | 12 | 0 | 0 | 6 | -10 % |
| half beta | 68.9 | 0.444 | 0.455 | 12 | 0 | 0 | 4 | -6 % |
| double beta | 68.9 | 0.447 | 0.459 | 11 | 0 | 1 | 9 | -16 % |
| ref = square (1.0) | 61.7 | 0.448 | 0.461 | 9 | 0 | 3 | 31 | -25 % |

Reading: **neutral to a hair worse** (0.4428 to 0.4448, noise level). Nothing flips pass/fail at the provisional beta; no false-green appears and none is
removed. Only 6 lists move at all (the 48 x 13 and 72 x 18 tanks, each reads 1-10 % lower; the Gensou 55 gal rummynose-angel list goes 103 % to 100 %).
Squarer-than-reference tanks get stricter: in the lists none are squarer than 2:1 (max W/L is 0.5), so no list gets stricter. Choosing ref = 1.0 (square)
instead would make the bonus a pure gift to every list (median 69.7 to 61.7, 3 lists flip to pass): not recommended, it loosens the whole engine.
Per the brief: the spread does not get worse in any way that matters, but it does not improve, so **shipping it is Nathan's judgment call**, not
something the lists support or oppose. The case for it rests on the physics (run for a swimming school), not on the experts.

## Step 3: shape sensitivity (1296 sq in of floor, 21 in tall, filled; reference 2:1 reads unchanged)
| class (stock) | 1:1 square | 2:1 | 4:1 | 8:1 | circle |
|---|---|---|---|---|---|
| high: 24 danio (off 30 %) | 37 | 30 | 27 | 25 | 37 |
| mid: 24 neon (off 19 %) | 21 | 19 | 18 | 17 | 21 |
| low: 1 betta (off 2 %) | 2 | 2 | 2 | 2 | 2 |
| none: 8 bronze cory (off 24 %) | 24 | 24 | 24 | 24 | 24 |
Swing from square to 8:1: danio -32 %, neon -19 %, betta ~0, cory 0. The circle equals the square, as designed. The size of the effect for the high class
(+23 % for a square, -17 % for 8:1) is the number to look at when judging beta 0.7.

## Step 2: turning clearance for all species (heuristic)
Rule: shortest floor side >= k x adult length (`Species.tl`); exempt: ball python, kuhli, geckos and anoles (coiling or mostly-tail bodies; same list as
the 2026-10-21 sweep, research/clearance-sweep.md). Existing sourced widths kept (take the max: `turnWidthMm`). Swept over every catalogue tank x
species pair the gate passes today (aquariums for water species, terrariums for land species), failing = needs more than 111 % (the same 10 % slack the red lines get):
| k | pairs passing the gate today | would fail clearance | which |
|---|---|---|---|
| 1 | 2272 | **0** | |
| 1.5 | 2272 | **9** | axolotl x6 (20 gal high, 29, 37, 55, 36 bowfront, 45 gal Marineland: 12-15 in wide vs 13.7 in wanted), comet goldfish x2 (55 gal, 45 gal Marineland), Livingstone's cichlid in the 55 gal |
| 2 | 2272 | **48** | axolotl 19, comet 10, goldfish 5, Livingstone's 5, Malawi synodontis 5, blue tang 3, yellow tang 1 (the 75 gal, 18 in wide, fails any fish over 9 in) |
Without the slack (any shortfall at all): 20 of 2130 pairs at k 1.5, 65 at k 2. The 9 failures at k 1.5 are all big fish in 12-13 in wide tanks; axolotl is
the one to doubt (axolotl keepers do use a 20 long, 12 in wide; its 9.1 in card length is measured to the tail tip), so for it k 1.5 is the most the data tolerates.
**Recommended k = 1.5**: k = 1 blocks nothing (0 flips, and see the adversary), k = 2 fails 48 pairs including the 75 gal for any 9 in+ fish and is not backed by a source.
All of these should be yellow ("narrow for its size"), not red, until Nathan decides.

### Thin-tank adversary: 72 x 2 x 12 in, water 90 %
| stock | gate % (today) | density off | density on (bonus, floored 1:8) | clearance k 1 | k 1.5 | k 2 |
|---|---|---|---|---|---|---|
| 6 danio | 28 | 111 | 92 | 98 | **147** | **196** |
| 6 neon | 28 | 77 | 68 | 75 | **112** | **149** |
| 4 guppy | 22 | 89 | 79 | 75 | **112** | **149** |
| 1 betta | 22 | 24 | 22 | **127** | **191** | **255** |
| 3 bronze cory | 267 | 80 | 80 | **127** | **191** | **255** |
Today's gate passes every swimmer in that 2 in slot (28 % / 22 %): that is the hole. At k = 1 the danio, neon and guppy still pass (98 / 75 / 75 %), so
**the adversary is blocked only from k = 1.5 up**, and then only barely for neon and guppy (112 %, just over the 111 % slack). The 1:8 floor on W/L limits
the bonus to 21 % for a danio (uncapped, a 72 x 2 would earn 31 %). Blocked by step 2 with k >= 1.5, so the precondition to enabling the bonus is met only at that k.

## Decisions for Nathan
1. Turn the bonus on at all? The lists are neutral (sdlog +0.002); the case is physical, and the shape swing is large for fast schoolers (danio +23 % / -17 %).
2. beta .2 / .4 / .7 (judgment), and whether oscars and discus (tall-bodied, aspect >= 0.9) belong in "low".
3. k: 1.5 recommended (9 pairs flip, axolotl x6 the doubtful ones) or 2 (48 pairs). Must be at least 1.5 before the bonus is enabled.
4. Clearance yellow vs red, and the exempt list (tail-length for geckos and anoles could be replaced by a body length without tail).
5. Not done (out of scope): group-dependent min lines, hardscape corridors, any `tankMin.ts` change; starters (`litresPerAnimal`) do not use the bonus yet; bowfronts and bowls use the bounding box (a bowl's W/L is 1).

Test status: the full suite has 30 failures in 6 files (anchorbase, demand, gearFilters, lightfollowups, sources, tech); the identical 30 fail on the base commit
without my changes (checked by stashing), so none come from this lane.

---

# Addendum 2026-10-28: Nathan's decisions and the geometry calibration (elongation measure REVISED below: the sqrt(W/L) figures in the first half of this file are superseded)

Decisions applied (from the coordinator, quoting Nathan): reference aspect 2:1; beta classes stay experimental (0.7 for fast schoolers included);
k = 1.5 adult body lengths, provisional; clearance failures amber only, no axolotl exception (review before it ever becomes a hard gate); sourced gate and
the bottom-dweller height treatment untouched; merge with the bonus disabled and clearance unconnected.
NEW CODE (still `LENGTH_BONUS.on = false`): `lengthFactor(sp, wl, widthMm)` gives a geometry whose front-to-back width is under `TURN_K` (1.5) x adult length
NO positive credit: the raw B_L is replaced by 1 BEFORE the reference normalisation, F_L = 1 / B_L(ref). Consequence to know: such a tank is not merely denied
the bonus, it also loses the reference credit, so it reads stricter than a 2:1 reference tank (zebra danio in a 72 x 2 in slot: 111 % off, 134 % on).
Exempt bodies (snakes, kuhli, long-tailed lizards) are never refused. Test: `test/lengthbonus.test.ts` ("length bonus x turning clearance").

## Elongation measure revised: the circle is the baseline (Nathan, same day; supersedes sqrt(W/L))
Square and circle must not read alike: a circle holds the most area per unit of longest straight run. Now (`elongationOf`, `epsRect`, `LENGTH_BONUS` in `stocking.ts`,
still `on: false`):
- L_run = the longest straight run in the footprint = the farthest pair of points of `footprint(T).ring` (a rectangle's diagonal, a circle's diameter, any polygon); A = the footprint area.
- eps = max(0, 1 - sqrt((A / L_run^2) / (pi/4))); B_L = 1 + beta x min(eps, maxEps).
- eps: circle 0.00, hexagon 0.09, square 0.20, 2:1 0.29, 4:1 0.45, 8:1 0.60 (the expected values; the tests pin them), a 72 x 3 in slot 0.77, a 72 x 2 in slot 0.81.
- Reference = the 2:1 rectangle, computed with the same measure (`refEps` 0.286), so density at the reference shape is unchanged (test). Beta classes, exempt bodies and the
  turning rule are as before; the rule's width is still the shortest floor side (`floorOf` widthMm), under 1.5 x adult length means B_L = 1 before normalisation.
- The 1:8 floor becomes a cap on eps: `maxEps` = eps of an 8:1 rectangle (0.604). Past it a slot earns nothing more (a 72 x 3 in slot would otherwise earn eps 0.77: danio B_L 1.54 instead of 1.42).
- Tests (`test/lengthbonus.test.ts`): circle has the lowest B_L of all shapes; hexagon sits between circle and square; the reference tank is unchanged; a round tank reads
  stricter than 2:1 for swimmers (danio 20 % higher) and unchanged for bottom dwellers; the cap holds.
Consequence: with the circle as baseline, a square or round tank now reads STRICTER than today (the reference is 2:1, which sits above them), exactly as intended: round danio +20 %,
square +5 %, hexagon +13 %; every elongated tank reads easier.

## Geometry calibration (new measure; the 37 lists stay a regression test only)
Method: `test/lengthcalib.scratch.test.ts` (`GEN_LB=1 LB_OUT=file npx vitest run ...`). Density = the space reading (water or floor, whichever binds; filtration
excluded, it does not depend on shape), bonus off vs on with the 2:1 reference, betas .2 / .4 / .7 and the clearance rule. "Sourced gate" = today's red-line percent
from `tankMin.ts` (over 111 % fails); "turn %" = 1.5 x adult length / the tank's shortest floor side (over 100 = narrow; amber only). Stocks: 8 bronze corydoras
(bottom dweller, beta 0), 1 betta (beta .2), 12 neon tetra (mid, .4), 12 zebra danio (fast schooler, .7). Water 90 % full. The hexagon is a regular six-sided tank
sized to the same floor area.

#### Equal floor area 1296 sq in, 16 in tall, 90 % full

bottom dweller

| tank | L x W x H in | eps | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 36 x 36.0 x 16 | 0.20 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 11 |  |
| 2:1 | 51 x 25.5 x 16 | 0.29 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 15 |  |
| 4:1 | 72 x 18.0 x 16 | 0.45 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 21 |  |
| 8:1 | 102 x 12.7 x 16 | 0.60 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 30 |  |
| round | 41 x 40.6 x 16 | 0.00 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 9 |  |
| hexagon | 45 x 38.7 x 16 | 0.09 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 10 |  |

betta

| tank | L x W x H in | eps | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 36 x 36.0 x 16 | 0.20 | 1 Betta | 2 | 2 | 2 % | 44 | 11 |  |
| 2:1 | 51 x 25.5 x 16 | 0.29 | 1 Betta | 2 | 2 | 0 % | 31 | 15 |  |
| 4:1 | 72 x 18.0 x 16 | 0.45 | 1 Betta | 2 | 2 | -3 % | 22 | 21 |  |
| 8:1 | 102 x 12.7 x 16 | 0.60 | 1 Betta | 2 | 2 | -6 % | 15 | 30 |  |
| round | 41 x 40.6 x 16 | 0.00 | 1 Betta | 2 | 2 | 6 % | 39 | 9 |  |
| hexagon | 45 x 38.7 x 16 | 0.09 | 1 Betta | 2 | 2 | 4 % | 35 | 10 |  |

tetra

| tank | L x W x H in | eps | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 36 x 36.0 x 16 | 0.20 | 12 Neon tetra | 14 | 14 | 3 % | 55 | 6 |  |
| 2:1 | 51 x 25.5 x 16 | 0.29 | 12 Neon tetra | 14 | 14 | 0 % | 39 | 9 |  |
| 4:1 | 72 x 18.0 x 16 | 0.45 | 12 Neon tetra | 14 | 13 | -6 % | 28 | 12 |  |
| 8:1 | 102 x 12.7 x 16 | 0.60 | 12 Neon tetra | 14 | 12 | -10 % | 19 | 18 |  |
| round | 41 x 40.6 x 16 | 0.00 | 12 Neon tetra | 14 | 15 | 11 % | 49 | 6 |  |
| hexagon | 45 x 38.7 x 16 | 0.09 | 12 Neon tetra | 14 | 15 | 8 % | 44 | 6 |  |

zebra danio

| tank | L x W x H in | eps | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 36 x 36.0 x 16 | 0.20 | 12 Zebra danio | 21 | 22 | 5 % | 55 | 8 |  |
| 2:1 | 51 x 25.5 x 16 | 0.29 | 12 Zebra danio | 21 | 21 | 0 % | 39 | 12 |  |
| 4:1 | 72 x 18.0 x 16 | 0.45 | 12 Zebra danio | 21 | 19 | -9 % | 28 | 16 |  |
| 8:1 | 102 x 12.7 x 16 | 0.60 | 12 Zebra danio | 21 | 17 | -16 % | 19 | 23 |  |
| round | 41 x 40.6 x 16 | 0.00 | 12 Zebra danio | 21 | 25 | 20 % | 49 | 7 |  |
| hexagon | 45 x 38.7 x 16 | 0.09 | 12 Zebra danio | 21 | 23 | 13 % | 44 | 8 |  |

#### Equal floor area 576 sq in, 12 in tall, 90 % full

bottom dweller

| tank | L x W x H in | eps | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 24 x 24.0 x 12 | 0.20 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 16 |  |
| 2:1 | 34 x 17.0 x 12 | 0.29 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 23 |  |
| 4:1 | 48 x 12.0 x 12 | 0.45 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 32 |  |
| 8:1 | 68 x 8.5 x 12 | 0.60 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 45 |  |
| round | 27 x 27.1 x 12 | 0.00 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 14 |  |
| hexagon | 30 x 25.8 x 12 | 0.09 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 15 |  |

betta

| tank | L x W x H in | eps | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 24 x 24.0 x 12 | 0.20 | 1 Betta | 6 | 6 | 2 % | 65 | 16 |  |
| 2:1 | 34 x 17.0 x 12 | 0.29 | 1 Betta | 6 | 6 | 0 % | 46 | 23 |  |
| 4:1 | 48 x 12.0 x 12 | 0.45 | 1 Betta | 6 | 6 | -3 % | 33 | 32 |  |
| 8:1 | 68 x 8.5 x 12 | 0.60 | 1 Betta | 6 | 6 | -6 % | 23 | 45 |  |
| round | 27 x 27.1 x 12 | 0.00 | 1 Betta | 6 | 6 | 6 % | 58 | 14 |  |
| hexagon | 30 x 25.8 x 12 | 0.09 | 1 Betta | 6 | 6 | 4 % | 53 | 15 |  |

tetra

| tank | L x W x H in | eps | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 24 x 24.0 x 12 | 0.20 | 12 Neon tetra | 36 | 38 | 3 % | 83 | 9 |  |
| 2:1 | 34 x 17.0 x 12 | 0.29 | 12 Neon tetra | 36 | 36 | 0 % | 58 | 13 |  |
| 4:1 | 48 x 12.0 x 12 | 0.45 | 12 Neon tetra | 36 | 34 | -6 % | 41 | 19 |  |
| 8:1 | 68 x 8.5 x 12 | 0.60 | 12 Neon tetra | 36 | 33 | -10 % | 29 | 26 |  |
| round | 27 x 27.1 x 12 | 0.00 | 12 Neon tetra | 37 | 41 | 11 % | 73 | 8 |  |
| hexagon | 30 x 25.8 x 12 | 0.09 | 12 Neon tetra | 36 | 39 | 8 % | 67 | 9 |  |

zebra danio

| tank | L x W x H in | eps | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 24 x 24.0 x 12 | 0.20 | 12 Zebra danio | 53 | 55 | 5 % | 83 | 12 |  |
| 2:1 | 34 x 17.0 x 12 | 0.29 | 12 Zebra danio | 53 | 53 | 0 % | 58 | 17 |  |
| 4:1 | 48 x 12.0 x 12 | 0.45 | 12 Zebra danio | 53 | 48 | -9 % | 41 | 25 |  |
| 8:1 | 68 x 8.5 x 12 | 0.60 | 12 Zebra danio | 53 | 44 | -16 % | 29 | 35 |  |
| round | 27 x 27.1 x 12 | 0.00 | 12 Zebra danio | 53 | 63 | 20 % | 73 | 11 |  |
| hexagon | 30 x 25.8 x 12 | 0.09 | 12 Zebra danio | 53 | 60 | 13 % | 67 | 11 |  |

#### Edge cases (tank sizes as sold; 90 % full)

| tank | L x W x H in | eps | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 72 x 2 slot | 72 x 2.0 x 12 | 0.81 | 3 Bronze corydoras | 80 | 80 | 0 % | 267 | 191 | AMBER: too narrow to turn; sourced sourced gate red |
| 72 x 2 slot | 72 x 2.0 x 12 | 0.81 | 1 Betta | 24 | 25 | 6 % | 22 | 191 | AMBER: too narrow to turn |
| 72 x 2 slot | 72 x 2.0 x 12 | 0.81 | 6 Neon tetra | 77 | 86 | 11 % | 28 | 112 | AMBER: too narrow to turn |
| 72 x 2 slot | 72 x 2.0 x 12 | 0.81 | 6 Zebra danio | 111 | 133 | 20 % | 28 | 147 | AMBER: too narrow to turn |
| 72 x 3 slot | 72 x 3.0 x 12 | 0.77 | 3 Bronze corydoras | 53 | 53 | 0 % | 178 | 128 | AMBER: too narrow to turn; sourced sourced gate red |
| 72 x 3 slot | 72 x 3.0 x 12 | 0.77 | 1 Betta | 16 | 17 | 6 % | 22 | 128 | AMBER: too narrow to turn |
| 72 x 3 slot | 72 x 3.0 x 12 | 0.77 | 6 Neon tetra | 51 | 46 | -10 % | 28 | 75 |  |
| 72 x 3 slot | 72 x 3.0 x 12 | 0.77 | 6 Zebra danio | 74 | 62 | -16 % | 28 | 99 |  |
| 18 in cube | 18 x 18.0 x 18 | 0.20 | 4 Bronze corydoras | 47 | 47 | 0 % | 119 | 21 | sourced sourced gate red |
| 18 in cube | 18 x 18.0 x 18 | 0.20 | 1 Betta | 8 | 9 | 2 % | 87 | 21 |  |
| 18 in cube | 18 x 18.0 x 18 | 0.20 | 8 Neon tetra | 36 | 38 | 3 % | 110 | 12 |  |
| 18 in cube | 18 x 18.0 x 18 | 0.20 | 8 Zebra danio | 56 | 59 | 5 % | 110 | 16 |  |
| 20 long | 30 x 12.0 x 12 | 0.34 | 1 Axolotl | 36 | 36 | 0 % | >999 | 148 | AMBER: too narrow to turn; sourced sourced gate red |
| 20 long | 30 x 12.0 x 12 | 0.34 | 2 Axolotl | 71 | 71 | 0 % | >999 | 148 | AMBER: too narrow to turn; sourced sourced gate red |
| 30 x 12 x 18 (29 gal) | 30 x 12.0 x 18 | 0.34 | 1 Axolotl | 36 | 36 | 0 % | 59 | 148 | AMBER: too narrow to turn |
| 30 x 12 x 18 (29 gal) | 30 x 12.0 x 18 | 0.34 | 2 Axolotl | 71 | 71 | 0 % | 59 | 148 | AMBER: too narrow to turn |
| 40 breeder | 36 x 18.0 x 16 | 0.29 | 2 Axolotl | 40 | 40 | 0 % | 49 | 98 |  |
| 55 gal | 48 x 13.0 x 21 | 0.43 | 2 Axolotl | 41 | 41 | 0 % | 37 | 136 | AMBER: too narrow to turn |
| 55 gal | 48 x 13.0 x 21 | 0.43 | 1 Oscar | 47 | 50 | 6 % | 182 | 136 | AMBER: too narrow to turn; sourced sourced gate red |
| 75 gal | 48 x 18.0 x 21 | 0.35 | 1 Oscar | 34 | 34 | -1 % | 131 | 98 | sourced sourced gate red |
| 75 gal | 48 x 18.0 x 21 | 0.35 | 2 Oscar | 68 | 67 | -1 % | 131 | 98 | sourced sourced gate red |
| 90 gal | 48 x 18.0 x 24 | 0.35 | 2 Oscar | 60 | 60 | -1 % | 131 | 98 | sourced sourced gate red |
| 125 gal | 72 x 18.0 x 21 | 0.45 | 2 Oscar | 45 | 44 | -3 % | 131 | 98 | sourced sourced gate red |
| 55 gal | 48 x 13.0 x 21 | 0.43 | 1 Livingstone's cichlid | 25 | 26 | 6 % | 100 | 114 | AMBER: too narrow to turn |
| 75 gal | 48 x 18.0 x 21 | 0.35 | 3 Livingstone's cichlid | 53 | 53 | -1 % | 100 | 82 |  |
| 125 gal | 72 x 18.0 x 21 | 0.45 | 5 Livingstone's cichlid | 59 | 57 | -3 % | 67 | 82 |  |
| 75 gal | 48 x 18.0 x 21 | 0.35 | 8 Peacock cichlid | 48 | 47 | -2 % | 98 | 39 |  |
| 75 gal | 48 x 18.0 x 21 | 0.35 | 2 Comet goldfish | 41 | 40 | -1 % | 74 | 82 |  |

## What the tables say
1. **Equal area, density change against today (= against 2:1).** Zebra danio: round +20 % / hexagon +13 % / square +5 % / 2:1 0 / 4:1 -9 % / 8:1 -16 %. Neon: +11 / +8 / +3 / 0 / -6 / -11 %
   (about the same at 576 sq in). Betta: +6 / +4 / +2 / 0 / -3 / -6 % (a 2 % reading, invisible). Bottom dweller: exactly 0 in every shape, round and hexagon included.
   The order circle > hexagon > square > 2:1 > 4:1 > 8:1 holds for every swimmer class. Clearance never trips in the equal-area tanks (worst 45 % of the limit at 8:1, 576 sq in).
2. **No contradiction with a sourced minimum in any equal-area case.** The sourced gate (danio 55 / 39 / 28 / 19 % square to 8:1) already falls with elongation, in the same direction.
   One ordering difference to know: round and hexagon read better than the square on the gate (danio 49 % and 44 % against 55 %) but worse on density (25 % and 23 % against 22 %), because the
   gate and density use different measures; by design each line is held on its own.
3. **72 x 2 and 72 x 3 slots.** At 2 in wide clearance fails for everything but nothing small is red on the sourced gate (neon, danio, betta read 22-28 %): the hole this lane found.
   With the turning rule the slot is stricter than the reference (danio 133 %, neon 86 %, betta 25 %), not a bargain. At **3 in wide, neon (75 %) and danio (99 %) PASS clearance at k 1.5**
   and take the capped credit (danio 74 % off, 62 % on; neon 51 / 46 %). A 3 in x 72 in tank for 6 danio still reads fine in both gates; a minimum absolute width (about 4 in) or k = 2 would close it.
4. **18 in cube.** Square-tank strictness: neon +3 % (38 %), danio +5 % (59 %), cory 0. Clearance passes (12-21 %). The sourced gate is 110 % for 8 neon or danio (just inside the 111 % slack) and 119 % red
   for the cory: the cube's tight reading comes from the gate (its 18 in run), not density, and the bonus never rescues it.
5. **Axolotl** (a bottom dweller here, no density change). 20 long (30 x 12 x 12 in): density 36 % (one) and 71 % (two); sourced gate red (>999 %, the sourced axolotl line this lane does not touch);
   turn 148 % amber. 30 x 12 x 18 (29 gal): gate 59 % passes, turn 148 % amber. 55 gal 48 x 13: gate 37 %, turn 136 % amber. 40 breeder 36 x 18: 98 %, no flag. **The one real conflict with a
   sourced minimum:** the 29 gal and the 55 gal pass the sourced axolotl lines while turn clearance calls them amber. No exception per Nathan; a warning only.
6. **Large cichlids.** Oscar: 1 in a 55 gal 47 % off / 50 % on, sourced gate 182 % red, turn 136 % amber. 75, 90 and 125 gal: gate 131 % red, density -1 % to -3 %, clearance 98 % passes at 75 gal.
   For oscars the sourced minimum is stricter than clearance, so it stays the binding line (take-the-max). Livingstone's cichlid: 55 gal gate 100 %, turn 114 % amber; 75 and 125 gal pass.
   8 peacocks (75 gal) and 2 comet goldfish: no flag.
7. **Where the bonus lowers a reading in a tank the sourced gate fails:** only the oscar in the 75 / 90 / 125 gal (-1 % to -3 %). Never a rescue: all stay red on the gate.

## 37-list regression (new measure; `test/expert.test.ts` numbers unchanged, bonus off)
Median at the published max 69.7 % off, 68.9 % on; sdlog 0.4428 off vs 0.444 on (neutral, as before). 12 lists over 100 % either way: nothing flips pass/fail.
Seven lists move, all down, because they are in elongated 48 x 13 / 36 x 12 / 30 x 12 tanks: damselfish 55 gal 132 to 125 %, Gensou 55 gal small-tetra 70 to 66 %,
tiger barbs 42 to 39 %, mixed community 74 to 72 %, rummynose-angel 103 to 101 %, 30 gal community 56 to 54 %, fancy goldfish 29 gal 156 to 155 %. None of the 37 is squarer than 2:1,
so none gets stricter. Variants: half beta 0.444, double beta 0.446 (one list flips fail to pass), ref = square 0.445 (two flip to pass, median 66.8 %: not recommended).

## Open for Nathan
- A minimum absolute width (about 4 in) or k = 2 for small schoolers, since k = 1.5 passes a 3 in wide slot for neon and danio.
- Axolotl, 29 and 55 gal: amber on clearance, green on every sourced line; the warning text should say it is a heuristic.
- Merge as is: bonus off, clearance unconnected, nothing visible changes.
