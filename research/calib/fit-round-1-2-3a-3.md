# Expert calibration, fit of round 1+2+3a+3

4 experts (chatgpt, chatgpt-high, ngr, ngr-ai), 182 answers, 10 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs. Engine readings: round 1: current engine, 2026-10-23; round 2: current engine, 2026-10-23; round 3: current engine, 2026-10-23; round 3: current engine, 2026-10-23.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | 0.232 | 0.375 |
| fitted tanks | 0.280 | 0.209 |

Inter-expert disagreement n/a (no tank answered by two experts yet). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.8367, floor x0.8737. Classes: big +4 %, invert -8 %, mid +11 %, tiny -10 %. Capped at x1.25: d:neon.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| guppy | tiny | 15 | -36 % | -15 % |
| oto | tiny | 16 | -35 % | -14 % |
| pandacory | tiny | 55 | -30 % | -8 % |
| pygmycory | tiny | 18 | -28 % | -4 % |
| chili | tiny | 7 | -28 % | -4 % |
| peapuffer | tiny | 13 | -26 % | -2 % |
| dwarfpencil | tiny | 7 | -26 % | -2 % |
| whitecloud | tiny | 21 | -26 % | -2 % |
| rummynose | tiny | 11 | -26 % | -1 % |
| cherryshrimp | invert | 2 | -26 % | -4 % |
| honeygourami | tiny | 3 | -25 % | -1 % |
| cardinal | tiny | 5 | -25 % | -1 % |
| hillstream | tiny | 8 | -25 % | +0 % |
| platy | tiny | 4 | -24 % | +1 % |
| hatchet | tiny | 7 | -23 % | +2 % |
| amano | invert | 0 | -23 % | +0 % |
| cpd | tiny | 14 | -17 % | +11 % |
| ember | tiny | 11 | -13 % | +16 % |
| kadango | big | 1 | -13 % | +0 % |
| syno | big | 1 | -13 % | +0 % |
| bristlenose | mid | 12 | -12 % | -5 % |
| sae | big | 4 | -11 % | +2 % |
| bronzecory | mid | 27 | -11 % | -3 % |
| cherrybarb | mid | 4 | -9 % | -2 % |
| kribensis | mid | 1 | -9 % | -2 % |
| sterbai | mid | 1 | -8 % | -1 % |
| dwarfgourami | mid | 6 | -8 % | -1 % |
| gourami | mid | 0 | -7 % | +0 % |
| harlequin | mid | 0 | -7 % | +0 % |
| peacock | mid | 0 | -7 % | +0 % |
| yellowlab | mid | 0 | -7 % | +0 % |
| neon | tiny | 10 | -6 % | +25 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| chatgpt | AI model | -6 % |
| chatgpt-high | AI model | +4 % |
| ngr | - | +3 % |
| ngr-ai | AI model | -2 % |

## Limit / ideal count (one-species tanks)

Median ratio, experts 1.50, engine 1.35 (17 answers). Experts higher means they find later fish cheaper than the school curve does.

## The max rule

Overall answer vs the tighter of the floor and water answers: same 26, lower 0, higher 0. If "lower" or "higher" is common, experts do not judge by the tighter dimension alone and the engine's "larger of the two" needs revisiting.


## Compatibility: gate -> experts

- high -> no: 3
- high -> yes: 1
- ok -> caution: 9
- ok -> no: 4
- ok -> yes: 9

## Ambiguous counts (both dimensions near the anchor)

- ngr-ai 2:f4 pandacory limit 42: water 90 %, floor 93 % (weighted 0.5)
- chatgpt 3a:f12 rummynose ideal 25: water 96 %, floor 101 % (weighted 0.5)
- chatgpt-high 3:f9 pandacory limit 16: water 140 %, floor 126 % (weighted 0.5)
- chatgpt-high 3:f14 hatchet ideal 14: water 80 %, floor 92 % (weighted 0.5)

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
