# Expert calibration, fit of round 1+2

2 experts (ngr, ngr-ai), 53 answers, 5 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs. Engine readings: round 1: current engine, 2026-10-23; round 2: current engine, 2026-10-23.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | 0.299 | 0.498 |
| fitted tanks | 0.274 | 0.230 |

Inter-expert disagreement n/a (one expert). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.8272, floor x0.8548. Classes: big +4 %, invert -8 %, mid +0 %, tiny -1 %.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| guppy | tiny | 3 | -30 % | -14 % |
| cherryshrimp | invert | 2 | -27 % | -4 % |
| oto | tiny | 5 | -24 % | -8 % |
| amano | invert | 0 | -24 % | +0 % |
| pandacory | tiny | 14 | -21 % | -4 % |
| cardinal | tiny | 5 | -21 % | -3 % |
| rummynose | tiny | 5 | -20 % | -2 % |
| honeygourami | tiny | 3 | -19 % | -2 % |
| hillstream | tiny | 8 | -19 % | -1 % |
| whitecloud | tiny | 8 | -18 % | -0 % |
| peapuffer | tiny | 1 | -18 % | +0 % |
| platy | tiny | 0 | -18 % | +0 % |
| pygmycory | tiny | 0 | -18 % | +0 % |
| chili | tiny | 1 | -18 % | +0 % |
| dwarfpencil | tiny | 3 | -18 % | +1 % |
| bristlenose | mid | 0 | -17 % | +0 % |
| bronzecory | mid | 5 | -17 % | +0 % |
| cherrybarb | mid | 0 | -17 % | +0 % |
| gourami | mid | 0 | -17 % | +0 % |
| harlequin | mid | 0 | -17 % | +0 % |
| kribensis | mid | 0 | -17 % | +0 % |
| kuhli | mid | 0 | -17 % | +0 % |
| molly | mid | 0 | -17 % | +0 % |
| peacock | mid | 0 | -17 % | +0 % |
| sterbai | mid | 0 | -17 % | +0 % |
| yellowlab | mid | 0 | -17 % | +0 % |
| cpd | tiny | 4 | -17 % | +2 % |
| hatchet | tiny | 1 | -16 % | +2 % |
| kadango | big | 1 | -14 % | +0 % |
| syno | big | 1 | -14 % | +0 % |
| sae | big | 4 | -12 % | +2 % |
| ember | tiny | 7 | -9 % | +11 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| ngr | - | +1 % |
| ngr-ai | AI model | -4 % |

## Limit / ideal count (one-species tanks)

Median ratio, experts 1.60, engine 1.49 (5 answers). Experts higher means they find later fish cheaper than the school curve does.

## The max rule

Overall answer vs the tighter of the floor and water answers: same 5, lower 0, higher 0. If "lower" or "higher" is common, experts do not judge by the tighter dimension alone and the engine's "larger of the two" needs revisiting.


## Compatibility: gate -> experts

- high -> no: 1
- ok -> caution: 5
- ok -> no: 1
- ok -> yes: 4

## Ambiguous counts (both dimensions near the anchor)

- ngr-ai 2:f4 pandacory limit 42: water 90 %, floor 93 % (weighted 0.5)

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
