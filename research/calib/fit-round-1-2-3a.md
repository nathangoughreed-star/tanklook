# Expert calibration, fit of round 1+2+3a

3 experts (chatgpt, ngr, ngr-ai), 80 answers, 5 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs. Engine readings: round 1: current engine, 2026-10-23; round 2: current engine, 2026-10-23; round 3: current engine, 2026-10-23.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | 0.273 | 0.521 |
| fitted tanks | 0.291 | 0.216 |

Inter-expert disagreement n/a (one expert). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.8, floor x0.8526. Classes: big +5 %, invert -7 %, mid -3 %, tiny -1 %. Capped at x1.25: g.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| guppy | tiny | 9 | -33 % | -15 % |
| cherryshrimp | invert | 2 | -28 % | -3 % |
| oto | tiny | 10 | -28 % | -10 % |
| amano | invert | 0 | -26 % | +0 % |
| bristlenose | mid | 5 | -23 % | -2 % |
| pandacory | tiny | 24 | -23 % | -3 % |
| pygmycory | tiny | 6 | -23 % | -3 % |
| cherrybarb | mid | 0 | -22 % | +0 % |
| gourami | mid | 0 | -22 % | +0 % |
| harlequin | mid | 0 | -22 % | +0 % |
| kribensis | mid | 0 | -22 % | +0 % |
| kuhli | mid | 0 | -22 % | +0 % |
| molly | mid | 0 | -22 % | +0 % |
| peacock | mid | 0 | -22 % | +0 % |
| sterbai | mid | 0 | -22 % | +0 % |
| yellowlab | mid | 0 | -22 % | +0 % |
| bronzecory | mid | 11 | -22 % | +0 % |
| cardinal | tiny | 5 | -22 % | -2 % |
| rummynose | tiny | 11 | -21 % | -1 % |
| peapuffer | tiny | 7 | -21 % | -1 % |
| honeygourami | tiny | 3 | -21 % | -1 % |
| hillstream | tiny | 8 | -21 % | -0 % |
| whitecloud | tiny | 8 | -21 % | -0 % |
| platy | tiny | 0 | -20 % | +0 % |
| chili | tiny | 1 | -20 % | +0 % |
| dwarfpencil | tiny | 3 | -20 % | +1 % |
| cpd | tiny | 4 | -19 % | +2 % |
| hatchet | tiny | 1 | -19 % | +2 % |
| kadango | big | 1 | -16 % | +0 % |
| syno | big | 1 | -16 % | +0 % |
| sae | big | 4 | -14 % | +2 % |
| ember | tiny | 7 | -10 % | +13 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| chatgpt | AI model | -5 % |
| ngr | - | +4 % |
| ngr-ai | AI model | -1 % |

## Limit / ideal count (one-species tanks)

Median ratio, experts 1.57, engine 1.45 (7 answers). Experts higher means they find later fish cheaper than the school curve does.

## The max rule

Overall answer vs the tighter of the floor and water answers: same 10, lower 0, higher 0. If "lower" or "higher" is common, experts do not judge by the tighter dimension alone and the engine's "larger of the two" needs revisiting.


## Compatibility: gate -> experts

- high -> no: 2
- ok -> caution: 6
- ok -> no: 1
- ok -> yes: 5

## Ambiguous counts (both dimensions near the anchor)

- ngr-ai 2:f4 pandacory limit 42: water 90 %, floor 93 % (weighted 0.5)
- chatgpt 3a:f12 rummynose ideal 25: water 96 %, floor 101 % (weighted 0.5)

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
