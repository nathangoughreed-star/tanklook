Synthetic check: truth water x0.9, floor x1.1, tiny +15 %, bronzecory +20 %; 5 synthetic experts (bias -8..+7 %, noise 0.12).

Effective species multiplier error (answer-weighted mean |log|): 0.038, vs 0.059 with no fit.

# Expert calibration, fit of round 2

5 experts (synth-A, synth-B, synth-C, synth-D, synth-E), 570 answers, 25 on held-out anchors. Noise 0.110 (log) from 10 repeat pairs.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | 0.149 | 0.128 |
| fitted tanks | 0.150 | 0.127 |

Inter-expert disagreement 0.107. Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.9579, floor x1.093. Classes: big -8 %, mid -0 %, tiny +8 %.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| harlequin | mid | 30 | -22 % | -19 % |
| dwarfpencil | tiny | 25 | -16 % | -18 % |
| kadango | big | 30 | -14 % | -3 % |
| peapuffer | tiny | 30 | +16 % | +12 % |
| gourami | mid | 25 | +14 % | +20 % |
| sae | big | 30 | -12 % | -1 % |
| yellowlab | mid | 30 | -10 % | -5 % |
| hillstream | tiny | 60 | +10 % | +7 % |
| kuhli | mid | 30 | -8 % | -3 % |
| bronzecory | mid | 130 | +8 % | +13 % |
| guppy | tiny | 20 | +8 % | +5 % |
| sterbai | mid | 30 | -6 % | -2 % |
| rummynose | tiny | 30 | +7 % | +3 % |

## Experts

| expert | bias |
|---|---|
| synth-A | -7 % |
| synth-B | -2 % |
| synth-C | -0 % |
| synth-D | +5 % |
| synth-E | +5 % |

## Limit / ideal count (one-species tanks)

Median ratio, experts 1.38, engine 1.47 (50 answers). Experts higher means they find later fish cheaper than the school curve does.

## The max rule

Overall answer vs the tighter of the floor and water answers: same 70, lower 0, higher 0. If "lower" or "higher" is common, experts do not judge by the tighter dimension alone and the engine's "larger of the two" needs revisiting.


## Compatibility: gate -> experts

- high -> no: 10
- ok -> yes: 50

## Ambiguous counts (both dimensions near the anchor)

- synth-A f4 pandacory ideal 30: water 78 %, floor 67 % (weighted 0.5)
- synth-A f4 pandacory limit 40: water 85 %, floor 89 % (weighted 0.5)
- synth-A f15 sae limit 6: water 97 %, floor 103 % (weighted 0.5)
- synth-A f15 cpd ideal 87: water 72 %, floor 77 % (weighted 0.5)
- synth-A f13 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
- synth-A f13 hillstream limit 3: water 88 %, floor 84 % (weighted 0.5)
- synth-A f13 oto ideal 37: water 92 %, floor 88 % (weighted 0.5)
- synth-A f14 bronzecory limit 29: water 95 %, floor 86 % (weighted 0.5)
- synth-A f16 kribensis ideal 7: water 95 %, floor 87 % (weighted 0.5)
- synth-A f16 kribensis limit 8: water 100 %, floor 94 % (weighted 0.5)
- synth-A f16 yellowlab ideal 12: water 75 %, floor 64 % (weighted 0.5)
- synth-A r1 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
- synth-A r1 hillstream limit 8: water 115 %, floor 112 % (weighted 0.5)
- synth-A r1 oto ideal 35: water 89 %, floor 84 % (weighted 0.5)
- synth-B f4 pandacory limit 42: water 86 %, floor 93 % (weighted 0.5)
- synth-B f15 sae limit 5: water 87 %, floor 96 % (weighted 0.5)
- synth-B f15 cpd ideal 73: water 68 %, floor 69 % (weighted 0.5)
- synth-B f13 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
- synth-B f13 oto ideal 30: water 83 %, floor 75 % (weighted 0.5)
- synth-B f14 bronzecory limit 30: water 96 %, floor 89 % (weighted 0.5)
- synth-B f16 kribensis ideal 5: water 85 %, floor 75 % (weighted 0.5)
- synth-B f16 kribensis limit 8: water 100 %, floor 94 % (weighted 0.5)
- synth-B f16 yellowlab ideal 14: water 80 %, floor 70 % (weighted 0.5)
- synth-B f5 kuhli ideal 23: water 61 %, floor 70 % (weighted 0.5)
- synth-B r1 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
- synth-B r1 hillstream limit 7: water 110 %, floor 106 % (weighted 0.5)
- synth-B r1 oto ideal 22: water 71 %, floor 61 % (weighted 0.5)
- synth-C f4 pandacory limit 39: water 84 %, floor 87 % (weighted 0.5)
- synth-C f15 cpd ideal 106: water 76 %, floor 87 % (weighted 0.5)
- synth-C f13 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
- synth-C f13 hillstream limit 8: water 115 %, floor 112 % (weighted 0.5)
- synth-C f14 bronzecory limit 35: water 100 %, floor 104 % (weighted 0.5)
- synth-C f16 kribensis ideal 3: water 75 %, floor 63 % (weighted 0.5)
- synth-C f16 kribensis limit 6: water 90 %, floor 81 % (weighted 0.5)
- synth-C f16 yellowlab ideal 14: water 80 %, floor 70 % (weighted 0.5)
- synth-C r1 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
- synth-C r1 hillstream limit 4: water 93 %, floor 90 % (weighted 0.5)
- synth-D f4 pandacory ideal 30: water 78 %, floor 67 % (weighted 0.5)
- synth-D f4 pandacory limit 41: water 85 %, floor 91 % (weighted 0.5)
- synth-D f15 cpd ideal 77: water 69 %, floor 71 % (weighted 0.5)
- synth-D f13 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
- synth-D f13 hillstream limit 4: water 93 %, floor 90 % (weighted 0.5)
- synth-D f14 bronzecory limit 30: water 96 %, floor 89 % (weighted 0.5)
- synth-D f16 kribensis limit 7: water 95 %, floor 87 % (weighted 0.5)
- synth-D f16 yellowlab ideal 12: water 75 %, floor 64 % (weighted 0.5)
- synth-D r1 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
- synth-D r1 oto ideal 23: water 73 %, floor 63 % (weighted 0.5)
- synth-E f4 pandacory ideal 30: water 78 %, floor 67 % (weighted 0.5)
- synth-E f4 pandacory limit 43: water 87 %, floor 95 % (weighted 0.5)
- synth-E f13 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
- synth-E f13 hillstream limit 3: water 88 %, floor 84 % (weighted 0.5)
- synth-E f14 bronzecory limit 30: water 96 %, floor 89 % (weighted 0.5)
- synth-E f16 kribensis ideal 7: water 95 %, floor 87 % (weighted 0.5)
- synth-E f5 kuhli ideal 23: water 61 %, floor 70 % (weighted 0.5)
- synth-E r1 hillstream ideal 1: water 77 %, floor 73 % (weighted 0.5)
