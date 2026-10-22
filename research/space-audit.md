# Space-bar audit (lane MA, 2026-10-21; habitat model lane HB, same day)

Decision 6 (research/tank-minimum-first-principles.md) audited the Space bar (`stockingOf` in src/scene/stocking.ts, spacePercent).
Since lane HB (research/habitat-model.md) Space is the larger of two limits: WATER = sum of mass^0.45 x fitted species factor /
(litres x SPACE_PER_L), the AqAdvisor-fitted per-litre number; FLOOR = the floor the bottom dwellers use (15 sq in per inch of
mass-equivalent length, "all"-zone fish half) over the tank floor. Filtration and the tank-minimum gate (`tankMinimum`) are shown beside it
for contrast. Numbers from test/spaceaudit.test.ts (`GEN_SPACE_AUDIT=1 npx vitest run test/spaceaudit.test.ts`); default filter,
water at 90 % of the tank height, no plants. US units: gal of water, sq in of floor.

| Case | Verdict | Space right? |
|---|---|---|
| A | 15 cory + 5 danio vs 5 cory + 15 danio, 40 gal breeder | yes |
| B | 20 long vs 20 high, same stock | yes |
| C | Tall-narrow vs shallow-wide, equal volume (24 x 12 x 24 in vs 48 x 24 x 6 in) | yes |
| D | Same floor (30 x 12 in), 12 in vs 24 in high, mixed stock | yes |
| E | More height, same floor (30 x 12 in), bottom dwellers only (10 bronze cory) | yes |
| F | More fish past the viable group (bronze cory 6, 12, 24, 48 in a 20 long) | yes |

## A. 15 cory + 5 danio vs 5 cory + 15 danio, 40 gal breeder

| Tank | Stock | Water gal | Floor sq in | Space % | water limit % | floor limit % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|---|---|
| 40 breeder | 15 bronzecory + 5 danio | 38.2 | 623 | 92 | 67 | 92 | 28 | 62 |
| 40 breeder | 5 bronzecory + 15 danio | 38.2 | 623 | 64 | 64 | 31 | 15 | 62 |

**Verdict (right, locked).** The cory-heavy mix is judged against the 36 x 18 in floor: its 15 cories use most of it, and the floor limit binds above the water limit. The danio-heavy mix stays a water question. (Lane MA: right direction for the wrong reason, mass only.)

## B. 20 long vs 20 high, same stock

| Tank | Stock | Water gal | Floor sq in | Space % | water limit % | floor limit % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|---|---|
| 20 gal long | 6 bronzecory + 8 danio | 19.1 | 383 | 92 | 92 | 60 | 32 | 100 |
| 20 gal high | 6 bronzecory + 8 danio | 18.6 | 289 | 106 | 106 | 80 | 32 | 133 |

**Verdict (right, locked).** The 20 long reads roomier, and the cories use a smaller share of its 30 x 12 in floor than of the 24 x 12 in floor of the 20 high. With this stock the water limit binds in both, so the gap is small. The run itself is held by the tank minimum (sourced red-line length), which reads the pair 100 % vs 133 %; no sourced run coefficient exists for Space (research/habitat-model.md).

## C. Tall-narrow vs shallow-wide, equal volume (24 x 12 x 24 in vs 48 x 24 x 6 in)

| Tank | Stock | Water gal | Floor sq in | Space % | water limit % | floor limit % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|---|---|
| 24 x 12 x 24 in | 6 bronzecory + 8 danio | 26.9 | 288 | 91 | 91 | 80 | 29 | 133 |
| 48 x 24 x 6 in | 6 bronzecory + 8 danio | 26.9 | 1152 | 51 | 51 | 20 | 29 | 41 |

**Verdict (right, locked).** With equal water the tall-narrow tank now reads fuller: its 288 sq in of floor binds for the six cories, the 1152 sq in tray leaves them a fifth of it. (Lane MA: identical Space for 4x the floor.) The tank-minimum gate reads the pair 133 % vs 41 %.

## D. Same floor (30 x 12 in), 12 in vs 24 in high, mixed stock

| Tank | Stock | Water gal | Floor sq in | Space % | water limit % | floor limit % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|---|---|
| 30 x 12 x 12 in | 6 bronzecory + 8 danio | 16.8 | 360 | 101 | 101 | 64 | 33 | 107 |
| 30 x 12 x 24 in | 6 bronzecory + 8 danio | 33.7 | 360 | 73 | 73 | 64 | 14 | 107 |

**Verdict (right, locked).** Doubling the height halves the water limit (real room for the midwater danios) but not the cories' share of the same 360 sq in of floor: on the 24 in tank the floor limit binds and Space stops there. The extra water still helps stability, which the Filtration bar carries.

## E. More height, same floor (30 x 12 in), bottom dwellers only (10 bronze cory)

| Tank | Stock | Water gal | Floor sq in | Space % | water limit % | floor limit % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|---|---|
| 30 x 12 x 12 in | 10 bronzecory | 16.8 | 360 | 107 | 87 | 107 | 42 | 107 |
| 30 x 12 x 18 in | 10 bronzecory | 25.2 | 360 | 107 | 67 | 107 | 37 | 107 |
| 30 x 12 x 24 in | 10 bronzecory | 33.7 | 360 | 107 | 57 | 107 | 18 | 107 |
| 30 x 12 x 36 in | 10 bronzecory | 50.5 | 360 | 107 | 48 | 107 | 16 | 107 |

**Verdict (right, locked).** Space is the same at every height: the 10 cories use the same floor and the floor limit binds (about 107 %; Scotcat's six to eight inches of fish per square foot gives 5-7 cories on 2.5 sq ft). Lane MA: Space fell as 1 / height without limit. The tank-minimum gate plateaus too.

## F. More fish past the viable group (bronze cory 6, 12, 24, 48 in a 20 long)

| Tank | Stock | Water gal | Floor sq in | Space % | water limit % | floor limit % | Filtration % | Tank minimum % |
|---|---|---|---|---|---|---|---|---|
| 20 gal long | 6 bronzecory | 19.1 | 383 | 60 | 47 | 60 | 24 | 100 |
| 20 gal long | 12 bronzecory | 19.1 | 383 | 120 | 89 | 120 | 49 | 100 |
| 20 gal long | 24 bronzecory | 19.1 | 383 | 240 | 147 | 240 | 98 | 100 |
| 20 gal long | 48 bronzecory | 19.1 | 383 | 481 | 242 | 481 | 195 | 100 |

**Verdict (right, locked).** Space rises in proportion to the count while the tank minimum stays put. That is the split Decision 1 asks for: animals past the viable group raise crowding, not the enclosure minimum. Locked.

## What changed (lane HB)

- Space sees the floor: bottom dwellers are held to floor area (A, C), so a taller tank on the same floor gives them no more room (D, E), and the floor share tells a 20 long from a 20 high (B).
- The water limit is the AqAdvisor-fitted number, unchanged (median ours / AqAdvisor 1.03 on the 24 mixes, before and after).
- Count is still handled right (F): more animals raise Space, not the minimum.
- Not modelled (nothing sourced, research/habitat-model.md): a run-length term in Space (the tank minimum holds the sourced length), an activity multiplier, height limits for swimmers.
- Extra water still matters for stability (dilution, temperature swings): that belongs to the Filtration bar and the volume advisory (Decision 2), not to Space.
