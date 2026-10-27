# Expert calibration, fit of round 1+2+3a+3+v4

2 experts (ai, ngr), 102 answers, 0 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs. Engine readings: round 1: current engine, 2026-10-26; round 2: current engine, 2026-10-26; round 3a: current engine, 2026-10-26; round 3: current engine, 2026-10-26; round v4: current engine, 2026-10-26.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | n/a | n/a |
| fitted tanks | 0.394 | 0.275 |

Inter-expert disagreement n/a (no tank answered by two experts yet). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.8494, floor x1.25. Classes: big +23 %, invert -6 %, mid -10 %, salt +4 %, tiny -11 %. Capped at x1.25: f, d:goldfish.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| guppy | tiny | 18 | -38 % | -18 % |
| pygmycory | tiny | 21 | -31 % | -9 % |
| chili | tiny | 13 | -29 % | -6 % |
| cardinal | tiny | 11 | -29 % | -6 % |
| dwarfpencil | tiny | 4 | -28 % | -5 % |
| peapuffer | tiny | 12 | -28 % | -4 % |
| boesemani | mid | 4 | -28 % | -5 % |
| bronzecory | mid | 18 | -27 % | -5 % |
| kuhli | mid | 7 | -26 % | -3 % |
| sterbai | mid | 4 | -25 % | -2 % |
| rummynose | tiny | 5 | -25 % | -0 % |
| oto | tiny | 5 | -25 % | -0 % |
| cpd | tiny | 0 | -25 % | +0 % |
| hillstream | tiny | 0 | -25 % | +0 % |
| platy | tiny | 4 | -24 % | +0 % |
| peacock | mid | 2 | -24 % | -1 % |
| bristlenose | mid | 21 | -24 % | -1 % |
| gourami | mid | 5 | -24 % | -0 % |
| kribensis | mid | 0 | -24 % | +0 % |
| dwarfgourami | mid | 9 | -24 % | +0 % |
| hatchet | tiny | 1 | -24 % | +2 % |
| goldfish | big | 3 | +31 % | +25 % |
| molly | mid | 4 | -23 % | +1 % |
| swordtail | mid | 4 | -23 % | +1 % |
| honeygourami | mid | 6 | -23 % | +1 % |
| demasoni | tiny | 1 | -22 % | +3 % |
| betta | mid | 4 | -22 % | +2 % |
| cherrybarb | mid | 8 | -22 % | +2 % |
| yellowlab | mid | 3 | -22 % | +2 % |
| cherryshrimp | invert | 11 | -22 % | -3 % |
| pandacory | tiny | 3 | -22 % | +4 % |
| danio | tiny | 2 | -21 % | +4 % |
| harlequin | mid | 3 | -20 % | +5 % |
| nerite | invert | 10 | -20 % | +0 % |
| amano | invert | 3 | -20 % | +0 % |
| whitecloud | tiny | 18 | -18 % | +9 % |
| ember | tiny | 6 | -16 % | +11 % |
| neon | tiny | 23 | -14 % | +14 % |
| bluetang | salt | 0 | -12 % | +0 % |
| mandarin | salt | 0 | -12 % | +0 % |
| turbo | salt | 1 | -12 % | +0 % |
| yellowtang | salt | 0 | -12 % | +0 % |
| cleanershrimp | salt | 1 | -12 % | +0 % |
| royalgramma | salt | 1 | -12 % | +0 % |
| watchman | salt | 1 | -12 % | +0 % |
| coralbeauty | salt | 1 | -12 % | +0 % |
| ocellaris | salt | 1 | -12 % | +0 % |
| hermit | salt | 1 | -12 % | +0 % |
| chromis | salt | 1 | -11 % | +1 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| ai | AI model | +10 % |
| ngr | - | -7 % |

## Limit / ideal count (one-species tanks)

Median ratio, experts 1.40, engine 1.44 (5 answers). Experts higher means they find later fish cheaper than the school curve does.

## The max rule

Overall answer vs the tighter of the floor and water answers: same 6, lower 0, higher 0. If "lower" or "higher" is common, experts do not judge by the tighter dimension alone and the engine's "larger of the two" needs revisiting.


## Compatibility: gate -> experts

- concern -> caution: 4
- concern -> yes: 1
- high -> no: 4
- ok -> caution: 8
- ok -> yes: 1

## Ambiguous counts (both dimensions near the anchor)

- ai v4:A04 bronzecory limit 8: water 112 %, floor 102 % (weighted 0.5)
- ai v4:A05 neon ideal 10: water 119 %, floor 101 % (weighted 0.5)
- ai v4:A05 bronzecory ideal 6: water 119 %, floor 101 % (weighted 0.5)
- ai v4:A05 bronzecory limit 7: water 126 %, floor 114 % (weighted 0.5)

## Left out

- chatgpt high 2 v4: 22 count tanks read; 38 answers on tanks outside the count fit (no counts asked, or no space.* / golden.* tag); 0 count tanks skipped by the expert
- chatgpt high 2 v4: 59 notes read (Claude Opus 5.5 (S227), read in full against each tank, the answers and the app reading); 9 answer(s) changed by them: A15 reasons restated ["aggression"] -> ["breeding","eat"] ("a breeding male can become territorial and harass females"); A15 problem restated ["honeygourami"] -> ["honeygourami","cherryshrimp"] ("juvenile shrimp are vulnerable to predation"); B05 ideal restated 0 -> null ("The ideal count of zero is deliberate. It means no socially appropriate group achieves my preferred comfort standard in this aquarium"); C05 countStatus restated "no-valid-count" -> null ("Zero is intentional rather than selecting No count works as described"); C05 ideal restated null -> 0 ("Without chromis, the remaining four fish are a defensible, though somewhat borderline, 55-gallon community"); C05 limit restated null -> 0 ("The zero thresholds are husbandry judgments"); D10 change restated null -> "drop" ("Removing the minnows would be my first change"); D10 changeSp restated null -> ["whitecloud"] ("Removing the minnows would be my first change"); D12 max.adf aside ("The maximum of zero frogs applies specifically to this aquarium with the betta remaining")
- ai 2:f10 focal.ideal: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ai 2:f10 mate.ideal: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ai 2:f10 water: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ai 2:f10 overall: set aside on review (the ideal counts are preferred counts with 8 gouramis held, "they do not imply the combination becomes green"; the caution comes from gourami territory, not room)
- ai 2:f9 guppy limit 40: outside the table (1..36)
- ai 3a:f1: kept on review, "what limits" read as room (the note says the counts are room-only thresholds and the no is the pea puffer's compatibility (would remove the puffer): a compatibility answer, kept as room (S214 review))
- ai v4:A04 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
- ai v4:A11 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- ai v4:A12 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- ai v4:A13 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- ai v4:A16 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- ai v4:B02 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- ai v4:B05 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- ai v4:B06 overall: set aside on review (v4 change "other": another reason (see the note), not a room band)
- ai v4:B07 overall: set aside on review (v4 change "ratio": a group-size or sex-mix answer, not a room band)
- ai v4:B08 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- ai v4:C04 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- ai v4:C05 chromis ideal 0: outside the table (1..16)
- ai v4:C05 chromis limit 0: outside the table (1..16)
- ai v4:C08 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
