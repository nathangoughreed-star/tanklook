# Expert calibration, fit of round v4

1 experts (synth-shift), 65 answers, 0 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs. Engine readings: round v4: current engine, 2026-10-26.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | n/a | n/a |
| fitted tanks | 0.267 | 0.044 |

Inter-expert disagreement n/a (no tank answered by two experts yet). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.8, floor x0.8. Classes: big -5 %, invert -1 %, mid -1 %, salt +1 %, tiny -0 %. Capped at x1.25: g, f.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| syno | big | 3 | -25 % | -2 % |
| goldfish | big | 3 | -25 % | -1 % |
| clownloach | big | 0 | -24 % | +0 % |
| oscar | big | 0 | -24 % | +0 % |
| sae | big | 4 | -24 % | +0 % |
| discus | big | 7 | -24 % | +1 % |
| kuhli | mid | 7 | -22 % | -1 % |
| chili | tiny | 5 | -22 % | -2 % |
| honeygourami | mid | 3 | -21 % | -1 % |
| peacock | mid | 3 | -21 % | -1 % |
| yellowlab | mid | 5 | -21 % | -1 % |
| cherryshrimp | invert | 8 | -21 % | -0 % |
| betta | mid | 5 | -21 % | -0 % |
| ember | tiny | 3 | -21 % | -1 % |
| amano | invert | 2 | -21 % | -0 % |
| nerite | invert | 9 | -21 % | +0 % |
| harlequin | mid | 2 | -21 % | -0 % |
| gourami | mid | 3 | -21 % | -0 % |
| dwarfgourami | mid | 2 | -21 % | -0 % |
| cherrybarb | mid | 4 | -20 % | +0 % |
| boesemani | mid | 4 | -20 % | +0 % |
| pygmycory | tiny | 3 | -20 % | -0 % |
| pandacory | tiny | 2 | -20 % | -0 % |
| molly | mid | 5 | -20 % | +0 % |
| demasoni | tiny | 2 | -20 % | -0 % |
| oto | tiny | 3 | -20 % | -0 % |
| rummynose | tiny | 3 | -20 % | -0 % |
| swordtail | mid | 5 | -20 % | +0 % |
| whitecloud | tiny | 6 | -20 % | +0 % |
| sterbai | mid | 4 | -20 % | +1 % |
| platy | tiny | 5 | -20 % | +0 % |
| cardinal | tiny | 7 | -20 % | +0 % |
| bristlenose | mid | 13 | -20 % | +1 % |
| neon | tiny | 18 | -20 % | +1 % |
| bluetang | salt | 2 | -19 % | -0 % |
| yellowtang | salt | 2 | -19 % | -0 % |
| cleanershrimp | salt | 7 | -19 % | -0 % |
| danio | tiny | 3 | -19 % | +1 % |
| mandarin | salt | 2 | -19 % | -0 % |
| turbo | salt | 7 | -19 % | +0 % |
| royalgramma | salt | 5 | -19 % | +0 % |
| guppy | tiny | 3 | -19 % | +1 % |
| hermit | salt | 7 | -19 % | +0 % |
| coralbeauty | salt | 7 | -19 % | +0 % |
| watchman | salt | 7 | -19 % | +0 % |
| ocellaris | salt | 7 | -19 % | +0 % |
| chromis | salt | 7 | -19 % | +0 % |
| bronzecory | mid | 18 | -19 % | +2 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| synth-shift | AI model | +0 % |

## Limit / ideal count (one-species tanks)

Median ratio, experts 1.50, engine 1.44 (2 answers). Experts higher means they find later fish cheaper than the school curve does.

## Compatibility: gate -> experts

- high -> caution: 2
- ok -> caution: 1
- ok -> yes: 7

## Ambiguous counts (both dimensions near the anchor)

- synth-shift A04 bronzecory ideal 8: water 112 %, floor 102 % (weighted 0.5)
- synth-shift A04 bronzecory limit 11: water 126 %, floor 134 % (weighted 0.5)
- synth-shift A05 neon ideal 4: water 99 %, floor 101 % (weighted 0.5)
- synth-shift A05 bronzecory ideal 6: water 119 %, floor 101 % (weighted 0.5)
- synth-shift A05 bronzecory limit 8: water 134 %, floor 127 % (weighted 0.5)
- synth-shift A10 bronzecory limit 18: water 135 %, floor 128 % (weighted 0.5)
- synth-shift A16 bronzecory limit 22: water 132 %, floor 130 % (weighted 0.5)
- synth-shift B06 sterbai limit 30: water 149 %, floor 131 % (weighted 0.5)

## Left out

- synth-shift v4: 22 count tanks read; 38 answers on tanks outside the count fit (no counts asked, or no space.* / golden.* tag); 0 count tanks skipped by the expert
- synth-shift A02 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
- synth-shift A06 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
- synth-shift A10 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
- synth-shift A10 neon ideal 0: outside the table (1..91)
- synth-shift A11 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
- synth-shift B02 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- synth-shift B06 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
- synth-shift B07 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- synth-shift B16 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
- synth-shift C04 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- synth-shift C08 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
