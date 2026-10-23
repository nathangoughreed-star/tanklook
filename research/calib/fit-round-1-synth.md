Synthetic check: truth water x0.9, floor x1.1, tiny +15 %, ember +20 %; 5 synthetic experts (bias -8..+7 %, noise 0.12).

Effective species multiplier error (answer-weighted mean |log|): 0.045, vs 0.077 with no fit.

# Expert calibration, fit of round 1

5 experts (synth-A, synth-B, synth-C, synth-D, synth-E), 360 answers, 30 on held-out anchors. Noise 0.110 (log) from 20 repeat pairs.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | 0.138 | 0.120 |
| fitted tanks | 0.148 | 0.108 |

Inter-expert disagreement 0.109. Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.9728, floor x1.0634. Classes: big -2 %, invert -4 %, mid -1 %, tiny +7 %.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| ember | tiny | 60 | +23 % | +19 % |
| cherrybarb | mid | 15 | -14 % | -11 % |
| cherryshrimp | invert | 15 | -9 % | -3 % |
| kadango | big | 15 | -9 % | -4 % |
| neon | tiny | 15 | +8 % | +4 % |
| bristlenose | mid | 30 | +8 % | +13 % |
| molly | mid | 15 | -8 % | -4 % |
| kuhli | mid | 15 | -8 % | -4 % |
| hillstream | tiny | 15 | +8 % | +4 % |
| amano | invert | 15 | -6 % | +1 % |
| yellowlab | mid | 15 | -6 % | -2 % |
| platy | tiny | 15 | +6 % | +2 % |

## Experts

| expert | bias |
|---|---|
| synth-A | -4 % |
| synth-B | -3 % |
| synth-C | -1 % |
| synth-D | +2 % |
| synth-E | +7 % |

## Limit / ideal count

Median ratio, experts 1.67, engine 1.50 (115 answers). Experts higher means they find later fish cheaper than the school curve does.

## Compatibility: gate -> experts

- high -> no: 20
- ok -> yes: 55
