# Expert calibration, fit of round 1+2+3a+3

4 experts (chatgpt, chatgpt-high, ngr, ngr-ai), 182 answers, 10 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs. Engine readings: round 1: current engine, 2026-10-29; round 2: current engine, 2026-10-29; round 3a: current engine, 2026-10-29; round 3: current engine, 2026-10-29.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | 0.219 | 0.217 |
| fitted tanks | 0.356 | 0.322 |

Inter-expert disagreement n/a (no tank answered by two experts yet). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.941, floor x1.0079. Classes: big +6 %, invert -11 %, mid +16 %, tiny -10 %. Capped at x1.25: d:guppy.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| guppy | tiny | 15 | -33 % | -20 % |
| chili | tiny | 7 | -23 % | -9 % |
| pygmycory | tiny | 18 | -21 % | -7 % |
| dwarfpencil | tiny | 7 | -21 % | -6 % |
| cardinal | tiny | 5 | -20 % | -5 % |
| cherryshrimp | invert | 2 | -20 % | -5 % |
| oto | tiny | 16 | -20 % | -5 % |
| honeygourami | tiny | 3 | -18 % | -3 % |
| peapuffer | tiny | 13 | -18 % | -3 % |
| rummynose | tiny | 11 | -17 % | -2 % |
| amano | invert | 0 | -16 % | +0 % |
| hillstream | tiny | 8 | -16 % | +0 % |
| pandacory | tiny | 55 | -15 % | +0 % |
| kuhli | mid | 4 | +18 % | +8 % |
| platy | tiny | 4 | -14 % | +2 % |
| hatchet | tiny | 7 | -14 % | +2 % |
| molly | mid | 8 | +13 % | +4 % |
| ember | tiny | 11 | -11 % | +6 % |
| bronzecory | mid | 27 | +12 % | +2 % |
| bristlenose | mid | 12 | +11 % | +2 % |
| gourami | mid | 0 | +9 % | +0 % |
| harlequin | mid | 0 | +9 % | +0 % |
| peacock | mid | 0 | +9 % | +0 % |
| yellowlab | mid | 0 | +9 % | +0 % |
| sterbai | mid | 1 | +9 % | -0 % |
| kribensis | mid | 1 | +9 % | -0 % |
| dwarfgourami | mid | 6 | +8 % | -1 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| chatgpt | AI model | -13 % |
| chatgpt-high | AI model | +2 % |
| ngr | - | +10 % |
| ngr-ai | AI model | +2 % |

## Limit / ideal count (one-species tanks)

Median ratio, experts 1.50, engine 1.35 (17 answers). Experts higher means they find later fish cheaper than the school curve does.

## The max rule

Overall answer vs the tighter of the floor and water answers: same 26, lower 0, higher 0. If "lower" or "higher" is common, experts do not judge by the tighter dimension alone and the engine's "larger of the two" needs revisiting.


## Compatibility: gate -> experts

- concern -> no: 2
- concern -> yes: 1
- high -> no: 3
- ok -> caution: 9
- ok -> no: 2
- ok -> yes: 9

## Ambiguous counts (both dimensions near the anchor)

- ngr-ai 2:f4 pandacory ideal 28: water 72 %, floor 62 % (weighted 0.5)
- chatgpt-high 3:f9 pandacory ideal 9: water 82 %, floor 69 % (weighted 0.5)
- chatgpt-high 3:f9 pandacory limit 16: water 93 %, floor 106 % (weighted 0.5)
- chatgpt-high 3:f9 oto ideal 12: water 67 %, floor 71 % (weighted 0.5)

## Left out

- ngr-ai 2:f10 focal.ideal: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ngr-ai 2:f10 mate.ideal: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ngr-ai 2:f10 water: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ngr-ai 2:f10 overall: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ngr-ai 2:f9 guppy limit 40: outside the table (1..36)
- ngr-ai 2:f6 mate.ideal: set aside on review (25 white clouds is preferred with the pandas held, "it does not make the whole tank green")
- ngr-ai 2:f15 mate.ideal: set aside on review (70 CPDs is "a preferred conditional count", not where the tank reads Ideal)
- ngr-ai 2:f14 water: set aside on review (the bands come from kadango breeding territory beside the cories (compatibility); the note says the floor, counting the cories only, is Ideal)
- ngr-ai 2:f14 overall: set aside on review (the bands come from kadango breeding territory beside the cories (compatibility); the note says the floor, counting the cories only, is Ideal)
- chatgpt 3a:f1: kept on review, "what limits" read as room (the note says the counts are room-only thresholds and the no is the pea puffer's compatibility (would remove the puffer): a compatibility answer, kept as room (S214 review))
- chatgpt-high 3:f16 focal.ideal: set aside on review (the note says territory, not density, sets the krib capacity (pairs defend bottom territories): a fighting-limit answer, kept out of room. Engine question for Nathan: the krib territory rule let 10 kribs through crowdWarnings in a 75 gal (S214 review))
- chatgpt-high 3:f16 focal.limit: set aside on review (the note says territory, not density, sets the krib capacity (pairs defend bottom territories): a fighting-limit answer, kept out of room. Engine question for Nathan: the krib territory rule let 10 kribs through crowdWarnings in a 75 gal (S214 review))
- chatgpt-high 3:f16 floor: set aside on review (the note says territory, not density, sets the krib capacity (pairs defend bottom territories): a fighting-limit answer, kept out of room. Engine question for Nathan: the krib territory rule let 10 kribs through crowdWarnings in a 75 gal (S214 review))
- chatgpt-high 3:f16 overall: set aside on review (the note says territory, not density, sets the krib capacity (pairs defend bottom territories): a fighting-limit answer, kept out of room. Engine question for Nathan: the krib territory rule let 10 kribs through crowdWarnings in a 75 gal (S214 review))
