# Space-bar audit (lane MA, 2026-10-21)

Decision 6 (research/tank-minimum-first-principles.md): the Space bar (`stockingOf` in src/scene/stocking.ts, spacePercent) stays a
per-litre heuristic for now, labelled "Estimated stocking level", and is audited here. Space = sum over animals of mass^0.45 x fitted
species factor / (litres x SPACE_PER_L): it sees the water volume (at the working fill) and the animals' mass, nothing about floor,
run or height. Filtration (the nitrogen budget) and the tank-minimum gate (`tankMinimum`, src/scene/tankMin.ts) are shown beside it
for contrast. Numbers from test/spaceaudit.test.ts (`GEN_SPACE_AUDIT=1 npx vitest run test/spaceaudit.test.ts`); default filter,
water at 90 % of the tank height, no plants. US units: gal of water, sq in of floor.

| Case | Verdict | Heuristic right? |
|---|---|---|
| A | 15 cory + 5 danio vs 5 cory + 15 danio, 40 gal breeder | partly |
| B | 20 long vs 20 high, same stock | no |
| C | Tall-narrow vs shallow-wide, equal volume (24 x 12 x 24 in vs 48 x 24 x 6 in) | no |
| D | Same floor (30 x 12 in), 12 in vs 24 in high, mixed stock | partly |
| E | More height, same floor (30 x 12 in), bottom dwellers only (10 bronze cory) | no |
| F | More fish past the viable group (bronze cory 6, 12, 24, 48 in a 20 long) | yes |

## A. 15 cory + 5 danio vs 5 cory + 15 danio, 40 gal breeder

| Tank | Stock | Water gal | Floor sq in | Space % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|
| 40 breeder | 15 bronzecory + 5 danio | 38.2 | 623 | 80 | 28 | 67 |
| 40 breeder | 5 bronzecory + 15 danio | 38.2 | 623 | 71 | 15 | 67 |

**Verdict (partly right, the right half locked).** The cory-heavy mix reads fuller, but only because a bronze cory weighs more than a danio. Space never asks whether 15 bottom dwellers fit on the 36 x 18 in floor: the same two mixes in a 40 gal tank of any shape give the same numbers. Right direction, wrong reason.

## B. 20 long vs 20 high, same stock

| Tank | Stock | Water gal | Floor sq in | Space % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|
| 20 gal long | 6 bronzecory + 8 danio | 19.1 | 383 | 104 | 32 | 108 |
| 20 gal high | 6 bronzecory + 8 danio | 18.6 | 289 | 107 | 32 | 143 |

**Verdict (wrong, documented as it.todo).** The 20 long has about 33 % more floor and 6 in more swimming run, yet Space reads it within a few points of the 20 high (only the water volume differs). For cories (floor) and danios (run) the 20 long is clearly the roomier tank; the heuristic cannot see it. The tank-minimum gate does (108 % vs 143 %): the two bars disagree about which tank is roomier.

## C. Tall-narrow vs shallow-wide, equal volume (24 x 12 x 24 in vs 48 x 24 x 6 in)

| Tank | Stock | Water gal | Floor sq in | Space % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|
| 24 x 12 x 24 in | 6 bronzecory + 8 danio | 26.9 | 288 | 74 | 29 | 144 |
| 48 x 24 x 6 in | 6 bronzecory + 8 danio | 26.9 | 1152 | 74 | 29 | 49 |

**Verdict (wrong, documented as it.todo).** Identical Space for 4x the floor and twice the run. The shallow-wide tank gives the cories four times the bottom habitat and the danios a 48 in run; the tall tank gives height neither uses much. Volume stands in for habitat here and gets it wrong; the tank-minimum gate reads the same pair 144 % vs 49 %.

## D. Same floor (30 x 12 in), 12 in vs 24 in high, mixed stock

| Tank | Stock | Water gal | Floor sq in | Space % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|
| 30 x 12 x 12 in | 6 bronzecory + 8 danio | 16.8 | 360 | 118 | 33 | 115 |
| 30 x 12 x 24 in | 6 bronzecory + 8 danio | 33.7 | 360 | 59 | 14 | 115 |

**Verdict (partly right, the right half locked).** Doubling the height halves Space. For the danios (midwater shoalers) some extra column is real room; for the cories it is none: they get the same 360 sq in of floor. Half the stock is credited with habitat it does not use. The extra water does help stability (dilution), which the Filtration bar and a volume advisory should carry, not Space.

## E. More height, same floor (30 x 12 in), bottom dwellers only (10 bronze cory)

| Tank | Stock | Water gal | Floor sq in | Space % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|
| 30 x 12 x 12 in | 10 bronzecory | 16.8 | 360 | 95 | 42 | 115 |
| 30 x 12 x 18 in | 10 bronzecory | 25.2 | 360 | 63 | 37 | 115 |
| 30 x 12 x 24 in | 10 bronzecory | 33.7 | 360 | 48 | 18 | 115 |
| 30 x 12 x 36 in | 10 bronzecory | 50.5 | 360 | 32 | 16 | 115 |

**Verdict (wrong, documented as it.todo).** Space falls as 1 / height without limit (10 cories read about a third as full at 36 in as at 12 in) although their floor never changes. The tank-minimum gate plateaus as it should (its floor-area share binds); Space does not. This is the clearest case of the heuristic rewarding volume that gives no usable habitat.

## F. More fish past the viable group (bronze cory 6, 12, 24, 48 in a 20 long)

| Tank | Stock | Water gal | Floor sq in | Space % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|
| 20 gal long | 6 bronzecory | 19.1 | 383 | 50 | 24 | 108 |
| 20 gal long | 12 bronzecory | 19.1 | 383 | 100 | 49 | 108 |
| 20 gal long | 24 bronzecory | 19.1 | 383 | 201 | 98 | 108 |
| 20 gal long | 48 bronzecory | 19.1 | 383 | 401 | 195 | 108 |

**Verdict (right, locked).** Space rises in proportion to the count while the tank minimum stays put. That is the split Decision 1 asks for: animals past the viable group raise crowding, not the enclosure minimum. Locked.

## What this means for the long-term Space model

- Space is blind to shape: equal water gives equal Space (C), so it cannot tell a 20 long from a 20 high (B) or a tray from a column.
- Height is credited to every animal: bottom dwellers read roomier in a taller tank on the same floor (D, E). The gate already holds them to floor area; Space should too.
- Count is handled right (F): more animals past the viable group raise Space, not the minimum.
- Mass is the only species input (A): bottom vs midwater habitat never enters. A habitat-based Space (bottom habitat for bottom dwellers, horizontal run for swimmers, height only where it helps) needs per-zone habitat coefficients, and Decision 6 forbids inventing per-animal footprint coefficients without evidence. Until then these limits stay documented here, not hidden.
- Extra water still matters for stability (dilution, temperature swings): that belongs to the Filtration bar and the volume advisory (Decision 2), not to Space.
