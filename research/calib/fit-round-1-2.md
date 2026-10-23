# Expert calibration, fit of round 1+2

2 experts (ngr, ngr-ai), 54 answers, 5 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | 0.113 | 0.049 |
| fitted tanks | 0.274 | 0.220 |

Inter-expert disagreement n/a (one expert). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.8646, floor x0.8482. Classes: big +4 %, invert -8 %, mid +0 %, tiny +1 %.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| guppy | tiny | 4 | -27 % | -16 % |
| cherryshrimp | invert | 2 | -24 % | -4 % |
| amano | invert | 0 | -21 % | +0 % |
| cardinal | tiny | 5 | -17 % | -4 % |
| rummynose | tiny | 5 | -15 % | -3 % |
| honeygourami | tiny | 3 | -15 % | -3 % |
| pandacory | tiny | 14 | -15 % | -3 % |
| bristlenose | mid | 0 | -14 % | +0 % |
| bronzecory | mid | 5 | -14 % | +0 % |
| cherrybarb | mid | 0 | -14 % | +0 % |
| gourami | mid | 0 | -14 % | +0 % |
| harlequin | mid | 0 | -14 % | +0 % |
| kribensis | mid | 0 | -14 % | +0 % |
| kuhli | mid | 0 | -14 % | +0 % |
| molly | mid | 0 | -14 % | +0 % |
| peacock | mid | 0 | -14 % | +0 % |
| sterbai | mid | 0 | -14 % | +0 % |
| yellowlab | mid | 0 | -14 % | +0 % |
| whitecloud | tiny | 8 | -13 % | -0 % |
| peapuffer | tiny | 1 | -13 % | +0 % |
| platy | tiny | 0 | -13 % | +0 % |
| pygmycory | tiny | 0 | -13 % | +0 % |
| dwarfpencil | tiny | 3 | -12 % | +0 % |
| hatchet | tiny | 1 | -12 % | +0 % |
| chili | tiny | 1 | -12 % | +0 % |
| oto | tiny | 5 | -12 % | +1 % |
| hillstream | tiny | 8 | -11 % | +1 % |
| cpd | tiny | 4 | -11 % | +2 % |
| kadango | big | 1 | -10 % | +0 % |
| syno | big | 1 | -10 % | +0 % |
| sae | big | 4 | -9 % | +2 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| ngr | - | +0 % |
| ngr-ai | AI model | -3 % |

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

- ngr-ai 2:f4 pandacory limit 42: water 86 %, floor 93 % (weighted 0.5)
- ngr-ai 2:f13 hillstream limit 4: water 93 %, floor 90 % (weighted 0.5)

## Left out

- ngr-ai 2:f10 focal.ideal: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ngr-ai 2:f10 mate.ideal: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ngr-ai 2:f10 water: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ngr-ai 2:f10 overall: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ngr-ai 2:f6 mate.ideal: set aside on review (25 white clouds is preferred with the pandas held, "it does not make the whole tank green")
- ngr-ai 2:f15 mate.ideal: set aside on review (70 CPDs is "a preferred conditional count", not where the tank reads Ideal)
- ngr-ai 2:f14 water: set aside on review (the bands come from kadango breeding territory beside the cories (compatibility); the note says the floor, counting the cories only, is Ideal)
- ngr-ai 2:f14 overall: set aside on review (the bands come from kadango breeding territory beside the cories (compatibility); the note says the floor, counting the cories only, is Ideal)
