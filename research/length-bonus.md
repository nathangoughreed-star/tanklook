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
