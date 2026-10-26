# Expert calibration, fit of round 1+2+3a+3+v4

5 experts (chatgpt, chatgpt high 2, chatgpt-high, ngr, ngr-ai), 236 answers, 10 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs. Engine readings: round 1: current engine, 2026-10-26; round 2: current engine, 2026-10-26; round 3a: current engine, 2026-10-26; round 3: current engine, 2026-10-26; round v4: current engine, 2026-10-26.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | 0.234 | 0.400 |
| fitted tanks | 0.338 | 0.290 |

Inter-expert disagreement n/a (no tank answered by two experts yet). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.8794, floor x1.0358. Classes: big +20 %, invert -13 %, mid -5 %, salt +3 %, tiny -6 %.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| guppy | tiny | 18 | -30 % | -16 % |
| cherryshrimp | invert | 11 | -28 % | -6 % |
| chili | tiny | 13 | -24 % | -9 % |
| bronzecory | mid | 45 | -24 % | -8 % |
| goldfish | big | 3 | +31 % | +24 % |
| cardinal | tiny | 14 | -23 % | -8 % |
| nerite | invert | 10 | -23 % | +0 % |
| amano | invert | 3 | -23 % | +0 % |
| pandacory | tiny | 58 | -23 % | -7 % |
| pygmycory | tiny | 21 | -23 % | -7 % |
| boesemani | mid | 4 | -22 % | -7 % |
| dwarfpencil | tiny | 7 | -22 % | -6 % |
| oto | tiny | 21 | -21 % | -5 % |
| peapuffer | tiny | 13 | -19 % | -3 % |
| bristlenose | mid | 26 | -19 % | -3 % |
| sterbai | mid | 5 | -19 % | -3 % |
| rummynose | tiny | 16 | -19 % | -2 % |
| honeygourami | mid | 6 | -18 % | -1 % |
| swordtail | mid | 4 | -18 % | -1 % |
| gourami | mid | 5 | -18 % | -1 % |
| peacock | mid | 2 | -18 % | -1 % |
| hillstream | tiny | 8 | -17 % | -1 % |
| kribensis | mid | 1 | -17 % | -1 % |
| dwarfgourami | mid | 9 | -17 % | -0 % |
| cherrybarb | mid | 8 | -16 % | +1 % |
| betta | mid | 4 | -16 % | +1 % |
| yellowlab | mid | 3 | -16 % | +1 % |
| platy | tiny | 8 | -16 % | +1 % |
| danio | tiny | 2 | -16 % | +2 % |
| kuhli | mid | 11 | -16 % | +1 % |
| hatchet | tiny | 7 | -15 % | +2 % |
| demasoni | tiny | 1 | -15 % | +2 % |
| harlequin | mid | 3 | -14 % | +4 % |
| ember | tiny | 14 | -11 % | +7 % |
| bluetang | salt | 0 | -9 % | +0 % |
| mandarin | salt | 0 | -9 % | +0 % |
| turbo | salt | 1 | -9 % | +0 % |
| yellowtang | salt | 0 | -9 % | +0 % |
| cleanershrimp | salt | 1 | -9 % | +0 % |
| royalgramma | salt | 1 | -9 % | +0 % |
| watchman | salt | 1 | -9 % | +0 % |
| coralbeauty | salt | 1 | -9 % | +0 % |
| ocellaris | salt | 1 | -9 % | +0 % |
| hermit | salt | 1 | -9 % | +0 % |
| chromis | salt | 1 | -8 % | +1 % |
| clownloach | big | 0 | +6 % | +0 % |
| kadango | big | 1 | +6 % | +0 % |
| oscar | big | 0 | +6 % | +0 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| chatgpt | AI model | -15 % |
| chatgpt high 2 | AI model | +8 % |
| chatgpt-high | AI model | +2 % |
| ngr | - | +8 % |
| ngr-ai | AI model | -1 % |

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

- ngr-ai 2:f4 pandacory limit 42: water 90 %, floor 93 % (weighted 0.5)
- chatgpt 3a:f12 rummynose ideal 25: water 96 %, floor 101 % (weighted 0.5)
- chatgpt-high 3:f15 bronzecory ideal 14: water 75 %, floor 86 % (weighted 0.5)
- chatgpt-high 3:f15 cpd ideal 55: water 86 %, floor 98 % (weighted 0.5)
- chatgpt-high 3:f9 pandacory limit 16: water 107 %, floor 106 % (weighted 0.5)
- chatgpt-high 3:f9 oto ideal 12: water 78 %, floor 71 % (weighted 0.5)
- chatgpt-high 3:f14 hatchet ideal 14: water 80 %, floor 92 % (weighted 0.5)
- chatgpt high 2 v4:A04 bronzecory limit 8: water 112 %, floor 102 % (weighted 0.5)
- chatgpt high 2 v4:A05 neon ideal 10: water 119 %, floor 101 % (weighted 0.5)
- chatgpt high 2 v4:A05 bronzecory ideal 6: water 119 %, floor 101 % (weighted 0.5)
- chatgpt high 2 v4:A05 bronzecory limit 7: water 126 %, floor 114 % (weighted 0.5)

## Left out

- chatgpt high 2 v4: 22 count tanks read; 38 answers on tanks outside the count fit (no counts asked, or no space.* / golden.* tag); 0 count tanks skipped by the expert
- chatgpt high 2 v4: 59 notes read (Claude Opus 5.5 (S227), read in full against each tank, the answers and the app reading); 9 answer(s) changed by them: A15 reasons restated ["aggression"] -> ["breeding","eat"] ("a breeding male can become territorial and harass females"); A15 problem restated ["honeygourami"] -> ["honeygourami","cherryshrimp"] ("juvenile shrimp are vulnerable to predation"); B05 ideal restated 0 -> null ("The ideal count of zero is deliberate. It means no socially appropriate group achieves my preferred comfort standard in this aquarium"); C05 countStatus restated "no-valid-count" -> null ("Zero is intentional rather than selecting No count works as described"); C05 ideal restated null -> 0 ("Without chromis, the remaining four fish are a defensible, though somewhat borderline, 55-gallon community"); C05 limit restated null -> 0 ("The zero thresholds are husbandry judgments"); D10 change restated null -> "drop" ("Removing the minnows would be my first change"); D10 changeSp restated null -> ["whitecloud"] ("Removing the minnows would be my first change"); D12 max.adf aside ("The maximum of zero frogs applies specifically to this aquarium with the betta remaining")
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
- chatgpt high 2 v4:A04 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
- chatgpt high 2 v4:A11 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 v4:A12 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 v4:A13 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 v4:A16 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 v4:B02 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 v4:B05 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 v4:B06 overall: set aside on review (v4 change "other": another reason (see the note), not a room band)
- chatgpt high 2 v4:B07 overall: set aside on review (v4 change "ratio": a group-size or sex-mix answer, not a room band)
- chatgpt high 2 v4:B08 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 v4:C04 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 v4:C05 chromis ideal 0: outside the table (1..16)
- chatgpt high 2 v4:C05 chromis limit 0: outside the table (1..16)
- chatgpt high 2 v4:C08 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
