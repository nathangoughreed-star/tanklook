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

# Addendum 2026-10-28: Nathan's decisions and the geometry calibration

Decisions applied (from the coordinator, quoting Nathan): reference aspect 2:1; beta classes stay experimental (0.7 for fast schoolers included);
k = 1.5 adult body lengths, provisional; clearance failures amber only, no axolotl exception (review before it ever becomes a hard gate); sourced gate and
the bottom-dweller height treatment untouched; merge with the bonus disabled and clearance unconnected.
NEW CODE (still `LENGTH_BONUS.on = false`): `lengthFactor(sp, wl, widthMm)` gives a geometry whose front-to-back width is under `TURN_K` (1.5) x adult length
NO positive credit: the raw B_L is replaced by 1 BEFORE the reference normalisation, F_L = 1 / B_L(ref). Consequence to know: such a tank is not merely denied
the bonus, it also loses the reference credit, so it reads stricter than a 2:1 reference tank (zebra danio in a 72 x 2 in slot: 111 % off, 134 % on).
Exempt bodies (snakes, kuhli, long-tailed lizards) are never refused. Test: `test/lengthbonus.test.ts` ("length bonus x turning clearance").

## Geometry calibration (the 37 lists stay a regression test only)
Method: `test/lengthcalib.scratch.test.ts` (`GEN_LB=1 LB_OUT=file npx vitest run ...`). Density = the space reading (water or floor, whichever binds; filtration
excluded, it does not depend on shape), bonus off vs on with ref 2:1, betas .2 / .4 / .7 and the clearance rule above. "Sourced gate" = today's red-line percent
from `tankMin.ts` (over 111 % fails); "turn %" = 1.5 x adult length / the tank's front-to-back width (over 100 = narrow; amber only). Stocks: 8 bronze corydoras
(bottom dweller, beta 0), 1 betta (beta .2), 12 neon tetra (mid, .4), 12 zebra danio (fast schooler, .7). Water 90 % full.

#### Equal floor area 1296 sq in, 16 in tall, 90 % full

bottom dweller

| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 36 x 36.0 x 16 | 1.00 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 11 |  |
| 2:1 | 51 x 25.5 x 16 | 0.50 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 15 |  |
| 4:1 | 72 x 18.0 x 16 | 0.25 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 21 |  |
| 8:1 | 102 x 12.7 x 16 | 0.12 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 30 |  |
| round | 41 x 40.6 x 16 | 1.00 | 8 Bronze corydoras | 24 | 24 | 0 % | 30 | 9 |  |

betta

| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 36 x 36.0 x 16 | 1.00 | 1 Betta | 2 | 2 | 6 % | 44 | 11 |  |
| 2:1 | 51 x 25.5 x 16 | 0.50 | 1 Betta | 2 | 2 | 0 % | 31 | 15 |  |
| 4:1 | 72 x 18.0 x 16 | 0.25 | 1 Betta | 2 | 2 | -4 % | 22 | 21 |  |
| 8:1 | 102 x 12.7 x 16 | 0.12 | 1 Betta | 2 | 2 | -6 % | 15 | 30 |  |
| round | 41 x 40.6 x 16 | 1.00 | 1 Betta | 2 | 2 | 6 % | 39 | 9 |  |

tetra

| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 36 x 36.0 x 16 | 1.00 | 12 Neon tetra | 14 | 15 | 12 % | 55 | 6 |  |
| 2:1 | 51 x 25.5 x 16 | 0.50 | 12 Neon tetra | 14 | 14 | 0 % | 39 | 9 |  |
| 4:1 | 72 x 18.0 x 16 | 0.25 | 12 Neon tetra | 14 | 13 | -7 % | 28 | 12 |  |
| 8:1 | 102 x 12.7 x 16 | 0.12 | 12 Neon tetra | 14 | 12 | -11 % | 19 | 18 |  |
| round | 41 x 40.6 x 16 | 1.00 | 12 Neon tetra | 14 | 15 | 12 % | 49 | 6 |  |

zebra danio

| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 36 x 36.0 x 16 | 1.00 | 12 Zebra danio | 21 | 25 | 21 % | 55 | 8 |  |
| 2:1 | 51 x 25.5 x 16 | 0.50 | 12 Zebra danio | 21 | 21 | 0 % | 39 | 12 |  |
| 4:1 | 72 x 18.0 x 16 | 0.25 | 12 Zebra danio | 21 | 18 | -11 % | 28 | 16 |  |
| 8:1 | 102 x 12.7 x 16 | 0.12 | 12 Zebra danio | 21 | 17 | -17 % | 19 | 23 |  |
| round | 41 x 40.6 x 16 | 1.00 | 12 Zebra danio | 21 | 25 | 21 % | 49 | 7 |  |

#### Equal floor area 576 sq in, 12 in tall, 90 % full

bottom dweller

| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 24 x 24.0 x 12 | 1.00 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 16 |  |
| 2:1 | 34 x 17.0 x 12 | 0.50 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 23 |  |
| 4:1 | 48 x 12.0 x 12 | 0.25 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 32 |  |
| 8:1 | 68 x 8.5 x 12 | 0.13 | 8 Bronze corydoras | 53 | 53 | 0 % | 67 | 45 |  |

betta

| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 24 x 24.0 x 12 | 1.00 | 1 Betta | 6 | 6 | 6 % | 65 | 16 |  |
| 2:1 | 34 x 17.0 x 12 | 0.50 | 1 Betta | 6 | 6 | 0 % | 46 | 23 |  |
| 4:1 | 48 x 12.0 x 12 | 0.25 | 1 Betta | 6 | 6 | -4 % | 33 | 32 |  |
| 8:1 | 68 x 8.5 x 12 | 0.13 | 1 Betta | 6 | 6 | -6 % | 23 | 45 |  |

tetra

| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 24 x 24.0 x 12 | 1.00 | 12 Neon tetra | 36 | 41 | 12 % | 83 | 9 |  |
| 2:1 | 34 x 17.0 x 12 | 0.50 | 12 Neon tetra | 36 | 36 | 0 % | 58 | 13 |  |
| 4:1 | 48 x 12.0 x 12 | 0.25 | 12 Neon tetra | 36 | 34 | -7 % | 41 | 19 |  |
| 8:1 | 68 x 8.5 x 12 | 0.13 | 12 Neon tetra | 36 | 32 | -11 % | 29 | 26 |  |

zebra danio

| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1:1 | 24 x 24.0 x 12 | 1.00 | 12 Zebra danio | 53 | 64 | 21 % | 83 | 12 |  |
| 2:1 | 34 x 17.0 x 12 | 0.50 | 12 Zebra danio | 53 | 53 | 0 % | 58 | 17 |  |
| 4:1 | 48 x 12.0 x 12 | 0.25 | 12 Zebra danio | 53 | 47 | -11 % | 41 | 25 |  |
| 8:1 | 68 x 8.5 x 12 | 0.13 | 12 Zebra danio | 53 | 44 | -17 % | 29 | 35 |  |

#### Edge cases (tank sizes as sold; 90 % full)

| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |
|---|---|---|---|---|---|---|---|---|---|
| 72 x 2 slot | 72 x 2.0 x 12 | 0.03 | 3 Bronze corydoras | 80 | 80 | 0 % | 267 | 191 | AMBER: too narrow to turn; sourced gate red |
| 72 x 2 slot | 72 x 2.0 x 12 | 0.03 | 1 Betta | 24 | 25 | 6 % | 22 | 191 | AMBER: too narrow to turn |
| 72 x 2 slot | 72 x 2.0 x 12 | 0.03 | 6 Neon tetra | 77 | 86 | 12 % | 28 | 112 | AMBER: too narrow to turn |
| 72 x 2 slot | 72 x 2.0 x 12 | 0.03 | 6 Zebra danio | 111 | 134 | 21 % | 28 | 147 | AMBER: too narrow to turn |
| 72 x 3 slot | 72 x 3.0 x 12 | 0.04 | 3 Bronze corydoras | 53 | 53 | 0 % | 178 | 128 | AMBER: too narrow to turn; sourced gate red |
| 72 x 3 slot | 72 x 3.0 x 12 | 0.04 | 1 Betta | 16 | 17 | 6 % | 22 | 128 | AMBER: too narrow to turn |
| 72 x 3 slot | 72 x 3.0 x 12 | 0.04 | 6 Neon tetra | 51 | 45 | -11 % | 28 | 75 |  |
| 72 x 3 slot | 72 x 3.0 x 12 | 0.04 | 6 Zebra danio | 74 | 61 | -17 % | 28 | 99 |  |
| 18 in cube | 18 x 18.0 x 18 | 1.00 | 4 Bronze corydoras | 47 | 47 | 0 % | 119 | 21 ; sourced gate red |
| 18 in cube | 18 x 18.0 x 18 | 1.00 | 1 Betta | 8 | 9 | 6 % | 87 | 21 |  |
| 18 in cube | 18 x 18.0 x 18 | 1.00 | 8 Neon tetra | 36 | 41 | 12 % | 110 | 12 |  |
| 18 in cube | 18 x 18.0 x 18 | 1.00 | 8 Zebra danio | 56 | 67 | 21 % | 110 | 16 |  |
| 20 long | 30 x 12.0 x 12 | 0.40 | 1 Axolotl | 36 | 36 | 0 % | >999 | 148 | AMBER: too narrow to turn; sourced gate red |
| 20 long | 30 x 12.0 x 12 | 0.40 | 2 Axolotl | 71 | 71 | 0 % | >999 | 148 | AMBER: too narrow to turn; sourced gate red |
| 30 x 12 x 18 (29 gal) | 30 x 12.0 x 18 | 0.40 | 1 Axolotl | 36 | 36 | 0 % | 59 | 148 | AMBER: too narrow to turn |
| 30 x 12 x 18 (29 gal) | 30 x 12.0 x 18 | 0.40 | 2 Axolotl | 71 | 71 | 0 % | 59 | 148 | AMBER: too narrow to turn |
| 40 breeder | 36 x 18.0 x 16 | 0.50 | 2 Axolotl | 40 | 40 | 0 % | 49 | 98 |  |
| 55 gal | 48 x 13.0 x 21 | 0.27 | 2 Axolotl | 41 | 41 | 0 % | 37 | 136 | AMBER: too narrow to turn |
| 55 gal | 48 x 13.0 x 21 | 0.27 | 1 Oscar | 47 | 50 | 6 % | 182 | 136 | AMBER: too narrow to turn; sourced gate red |
| 75 gal | 48 x 18.0 x 21 | 0.37 | 1 Oscar | 34 | 33 | -2 % | 131 | 98 ; sourced gate red |
| 75 gal | 48 x 18.0 x 21 | 0.37 | 2 Oscar | 68 | 67 | -2 % | 131 | 98 ; sourced gate red |
| 90 gal | 48 x 18.0 x 24 | 0.37 | 2 Oscar | 60 | 59 | -2 % | 131 | 98 ; sourced gate red |
| 125 gal | 72 x 18.0 x 21 | 0.25 | 2 Oscar | 45 | 44 | -4 % | 131 | 98 ; sourced gate red |
| 55 gal | 48 x 13.0 x 21 | 0.27 | 1 Livingstone's cichlid | 25 | 26 | 6 % | 100 | 114 | AMBER: too narrow to turn |
| 75 gal | 48 x 18.0 x 21 | 0.37 | 3 Livingstone's cichlid | 53 | 52 | -2 % | 100 | 82 |  |
| 125 gal | 72 x 18.0 x 21 | 0.25 | 5 Livingstone's cichlid | 59 | 57 | -4 % | 67 | 82 |  |
| 75 gal | 48 x 18.0 x 21 | 0.37 | 8 Peacock cichlid | 48 | 46 | -3 % | 98 | 39 |  |
| 75 gal | 48 x 18.0 x 21 | 0.37 | 2 Comet goldfish | 41 | 40 | -2 % | 74 | 82 |  |

## What the tables say
1. **Equal area, 1:1 to 8:1.** Zebra danio: +21 % (square, circle) / 0 (2:1) / -11 % (4:1) / -17 % (8:1). Neon: +12 / 0 / -7 / -11 %. Betta: +6 / 0 / -4 / -6 %
   (a 2 % reading, so invisible in practice). Bottom dweller: exactly 0 in every shape: the floor and the capped height already decide it. The circle equals the square.
   Same pattern at 576 and 1296 sq in. The 8:1 tank (102 x 12.7 in or 68 x 8.5 in) never trips clearance for these four (worst 45 % of the limit), so the credit is real there.
2. **The sourced gate already moves with shape, and faster than density.** Gate % for a danio is 55 / 39 / 28 / 19 from square to 8:1 at 1296 sq in
   (the red length line), so shape counts for swimmers today through the gate; the bonus adds the density side, which is why the two never contradict
   in the equal-area tables: the gate reads LOWER (better) exactly where the bonus does. No contradiction with a sourced minimum occurs in any equal-area case.
3. **72 x 2 and 72 x 3 slots.** At 2 in wide clearance fails for everything but nothing small is red in the sourced gate (neon, danio, betta all read 22-28 %): the
   hole this lane found. With rule (5) the slot is stricter than the reference (danio 134 %, neon 86 %), not a bargain. At **3 in wide neon (75 %) and danio (99 %) PASS clearance at k 1.5**
   and take the full credit (danio 74 % off, 61 % on). So k = 1.5 closes the 2 in slot but not a 3 in one for fish up to 2 in; a 3 in x 72 in tank
   for 6 danio reads fine in both gates. If that matters, the fix is a minimum absolute width (about 4 in) or k = 2, not a bigger beta. (The bottom dweller reads 267 % /
   178 % on the sourced gate in those slots, red: consistent.)
4. **18 in cube.** No shape credit or penalty beyond the square's +12 % to +21 % for neon and danio (they read 41 % / 67 %); clearance passes (12-21 %). The sourced gate is 110 %
   for 8 neon or danio (just inside the 111 % slack) and 119 % red for the cory: the cube's tight reading comes from the gate (its 18 in run), not density, so the bonus never
   rescues it.
5. **Axolotl.** 20 long (30 x 12 x 12 in): density 36 % (one) and 71 % (two), unchanged by the bonus (bottom dweller); sourced gate red (>999 %: the sourced axolotl line, which this lane does not touch, fails a 20 long); turn 148 % amber. 30 x 12 x 18 (29 gal): gate passes (59 %), turn 148 % amber. 55 gal 48 x 13: gate 37 %, turn 136 % amber.
   40 breeder (36 x 18): 98 %, no flag. **This is the one real conflict with a sourced minimum**: the 29 gal and the 55 gal pass the sourced axolotl
   lines (59 % and 37 %) while turn clearance calls them amber. Per Nathan there is no exception; it stays a warning and the density number is unaffected.
6. **Large cichlids.** Oscar: 1 in a 55 gal reads 47 % off / 50 % on; sourced gate 182 % red (it needs 18 in front to back), turn 136 % amber. 75, 90 and 125 gal: gate 131 % red
   (a sourced width or length line; not changed here), the bonus moves density only -2 % to -4 % (oscar is class low), clearance 98 % passes at 75 gal (18 in = 1.5 x 11.8 in). So for oscars
   the clearance rule is WEAKER than the sourced minimum (it passes 18 in wide; the source wants more): the gate must stay the binding line, the heuristic only adds
   where no source exists, as the take-the-max rule says. Livingstone's cichlid: 55 gal gate 100 %, turn 114 % amber; 75 gal and 125 gal pass. Peacocks (8 in 75 gal) and 2 comets: no flag.
7. **Where the bonus lowers a reading in a tank the sourced gate fails:** only the oscar in the 75 / 90 / 125 gal (-2 % to -4 %) and the cory (0 %) in thin slots. Never a rescue: all of
   these stay red on the gate, and the density difference is under 5 points.

## Open for Nathan
- A minimum absolute width (about 4 in) or k = 2 for small schoolers, since k = 1.5 passes a 3 in wide slot for neon and danio.
- Axolotl, 29 and 55 gal: amber on clearance, green on every sourced line; stays amber under his decision, but the warning text should say it is a heuristic.
- Merge as is: bonus off, clearance unconnected, nothing visible changes.
