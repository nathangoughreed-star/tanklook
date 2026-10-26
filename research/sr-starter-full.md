# SR step 4: starter density at Full (2026-10-26)

Engine reading (stocking percent) of every non-land style x generic catalogue tank x seeds 1-3 at the Full stop (scripts/moved-numbers.mjs, --now 2026-10-26).

| | n | min | p10 | p25 | median | p75 | p90 | max |
|---|---|---|---|---|---|---|---|---|
| before | 1595 | 7.5 | 20.8 | 34.9 | 51.6 | 64.6 | 77.8 | 190.4 |
| after | 1598 | 7.4 | 24.2 | 40.6 | 67.5 | 73.1 | 74.5 | 190.4 |

Median per tank (gallons / catalogue id), before -> after:

- g2_5: 74 -> 69
- g3c: 62 -> 66
- g5: 75 -> 66
- g5_5: 84 -> 64
- g6c: 47 -> 42
- g8c: 76 -> 44
- g10: 70 -> 68
- g15: 63 -> 68
- g20h: 65 -> 72
- g20l: 61 -> 73
- g29: 61 -> 72
- g30b: 52 -> 72
- g37: 62 -> 72
- g40b: 52 -> 73
- g50b: 53 -> 73
- g55: 55 -> 73
- g60b: 49 -> 73
- g65: 57 -> 73
- g75: 52 -> 73
- g90: 53 -> 74
- g120: 50 -> 68
- g125: 46 -> 63
- g135: 47 -> 62
- g150: 47 -> 61
- g180: 38 -> 46
- g210: 35 -> 40
- g240: 32 -> 35
- g300: 32 -> 34
- c6: 39 -> 46
- c8: 26 -> 27

Unchanged: tankFor x 1/3/6/12/25/50 (516 rows), step-ups, builds, sumps, the 11 example scenes (0 rows moved). Moved: 1178 of 1620 starter rows (full list: node scripts/moved-numbers.mjs --diff).
Still over 100 % (unchanged, paludarium land animals): 5 rows.
