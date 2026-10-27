# Expert calibration, fit of round 1+2+3a+3+v4

2 experts (ai, ngr), 236 answers, 10 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs. Engine readings: round 1: current engine, 2026-10-26; round 2: current engine, 2026-10-26; round 3a: current engine, 2026-10-26; round 3: current engine, 2026-10-26; round v4: current engine, 2026-10-26.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | 0.263 | 0.357 |
| fitted tanks | 0.334 | 0.293 |

Inter-expert disagreement n/a (no tank answered by two experts yet). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.9482, floor x1.057. Classes: big +23 %, invert -10 %, mid -5 %, salt +4 %, tiny -10 %. Capped at x1.25: d:goldfish.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| goldfish | big | 3 | +46 % | +25 % |
| guppy | tiny | 18 | -30 % | -18 % |
| pygmycory | tiny | 21 | -23 % | -10 % |
| oto | tiny | 21 | -21 % | -8 % |
| cardinal | tiny | 14 | -20 % | -7 % |
| chili | tiny | 13 | -20 % | -7 % |
| pandacory | tiny | 58 | -20 % | -6 % |
| cherryshrimp | invert | 11 | -19 % | -5 % |
| dwarfpencil | tiny | 7 | -18 % | -5 % |
| peapuffer | tiny | 13 | -18 % | -4 % |
| bronzecory | mid | 45 | -18 % | -9 % |
| rummynose | tiny | 16 | -17 % | -3 % |
| boesemani | mid | 4 | -15 % | -6 % |
| nerite | invert | 10 | -15 % | +0 % |
| amano | invert | 3 | -15 % | +0 % |
| hillstream | tiny | 8 | -15 % | -0 % |
| bristlenose | mid | 26 | -14 % | -5 % |
| clownloach | big | 0 | +16 % | +0 % |
| kadango | big | 1 | +16 % | +0 % |
| oscar | big | 0 | +16 % | +0 % |
| platy | tiny | 8 | -13 % | +1 % |
| hatchet | tiny | 7 | -13 % | +2 % |
| sterbai | mid | 5 | -12 % | -3 % |
| syno | big | 3 | +14 % | -2 % |
| demasoni | tiny | 1 | -12 % | +3 % |
| danio | tiny | 2 | -11 % | +4 % |
| discus | big | 5 | +12 % | -4 % |
| honeygourami | mid | 6 | -11 % | -1 % |
| gourami | mid | 5 | -10 % | -1 % |
| kribensis | mid | 1 | -10 % | -1 % |
| peacock | mid | 2 | -10 % | -1 % |
| swordtail | mid | 4 | -10 % | -1 % |
| cherrybarb | mid | 8 | -10 % | -0 % |
| dwarfgourami | mid | 9 | -10 % | -0 % |
| betta | mid | 4 | -9 % | +1 % |
| yellowlab | mid | 3 | -8 % | +2 % |
| sae | big | 8 | +8 % | -7 % |
| ember | tiny | 14 | -7 % | +8 % |
| kuhli | mid | 11 | -7 % | +3 % |
| molly | mid | 12 | +6 % | +17 % |
| harlequin | mid | 3 | -5 % | +5 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| ai | AI model | -3 % |
| ngr | - | +3 % |

## Limit / ideal count (one-species tanks)

Median ratio, experts 1.50, engine 1.40 (18 answers). Experts higher means they find later fish cheaper than the school curve does.

## The max rule

Overall answer vs the tighter of the floor and water answers: same 26, lower 0, higher 0. If "lower" or "higher" is common, experts do not judge by the tighter dimension alone and the engine's "larger of the two" needs revisiting.


## Compatibility: gate -> experts

- concern -> caution: 5
- concern -> no: 1
- concern -> yes: 9
- high -> no: 5
- ok -> caution: 12
- ok -> no: 1
- ok -> yes: 3

## Ambiguous counts (both dimensions near the anchor)

- ai 2:f4 pandacory limit 42: water 90 %, floor 93 % (weighted 0.5)
- ai 3a:f12 rummynose ideal 25: water 96 %, floor 101 % (weighted 0.5)
- ai 3:f15 bronzecory ideal 14: water 75 %, floor 86 % (weighted 0.5)
- ai 3:f15 cpd ideal 55: water 86 %, floor 98 % (weighted 0.5)
- ai 3:f9 pandacory limit 16: water 107 %, floor 106 % (weighted 0.5)
- ai 3:f9 oto ideal 12: water 78 %, floor 71 % (weighted 0.5)
- ai 3:f14 hatchet ideal 14: water 80 %, floor 92 % (weighted 0.5)
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
- ai 2:f6 mate.ideal: set aside on review (25 white clouds is preferred with the pandas held, "it does not make the whole tank green")
- ai 2:f15 mate.ideal: set aside on review (70 CPDs is "a preferred conditional count", not where the tank reads Ideal)
- ai 2:f14 water: set aside on review (the bands come from kadango breeding territory beside the cories (compatibility); the note says the floor, counting the cories only, is Ideal)
- ai 2:f14 overall: set aside on review (the bands come from kadango breeding territory beside the cories (compatibility); the note says the floor, counting the cories only, is Ideal)
- ai 3a:f1: kept on review, "what limits" read as room (the note says the counts are room-only thresholds and the no is the pea puffer's compatibility (would remove the puffer): a compatibility answer, kept as room (S214 review))
- ai 3:f16 focal.ideal: set aside on review (the note says territory, not density, sets the krib capacity (pairs defend bottom territories): a fighting-limit answer, kept out of room. Engine question for Nathan: the krib territory rule let 10 kribs through crowdWarnings in a 75 gal (S214 review))
- ai 3:f16 focal.limit: set aside on review (the note says territory, not density, sets the krib capacity (pairs defend bottom territories): a fighting-limit answer, kept out of room. Engine question for Nathan: the krib territory rule let 10 kribs through crowdWarnings in a 75 gal (S214 review))
- ai 3:f16 floor: set aside on review (the note says territory, not density, sets the krib capacity (pairs defend bottom territories): a fighting-limit answer, kept out of room. Engine question for Nathan: the krib territory rule let 10 kribs through crowdWarnings in a 75 gal (S214 review))
- ai 3:f16 overall: set aside on review (the note says territory, not density, sets the krib capacity (pairs defend bottom territories): a fighting-limit answer, kept out of room. Engine question for Nathan: the krib territory rule let 10 kribs through crowdWarnings in a 75 gal (S214 review))
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
