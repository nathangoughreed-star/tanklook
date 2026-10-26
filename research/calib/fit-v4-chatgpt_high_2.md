# Expert calibration, fit of round v4

1 experts (chatgpt high 2), 54 answers, 0 on held-out anchors. Noise 0.200 (log) from 0 repeat pairs. Engine readings: round v4: current engine, 2026-10-26.

## Error (rms of log reading at the experts' counts)

| | before | after |
|---|---|---|
| held-out anchors | n/a | n/a |
| fitted tanks | 0.289 | 0.205 |

Inter-expert disagreement n/a (no tank answered by two experts yet). Stop rule not met.

## Multipliers on today's factors

Water (SPACE_PER_L) x0.9321, floor x1.1695. Classes: big +24 %, invert -12 %, mid -17 %, salt +4 %, tiny +5 %.

| species | class | answers | total move | own move |
|---|---|---|---|---|
| goldfish | big | 3 | +43 % | +24 % |
| bronzecory | mid | 18 | -26 % | -5 % |
| boesemani | mid | 4 | -26 % | -4 % |
| kuhli | mid | 7 | -25 % | -2 % |
| bristlenose | mid | 14 | -25 % | -2 % |
| sterbai | mid | 4 | -24 % | -2 % |
| cherrybarb | mid | 4 | -24 % | -2 % |
| gourami | mid | 5 | -23 % | -1 % |
| peacock | mid | 2 | -23 % | -0 % |
| honeygourami | mid | 3 | -23 % | +0 % |
| dwarfgourami | mid | 3 | -23 % | +0 % |
| cherryshrimp | invert | 9 | -22 % | -5 % |
| betta | mid | 4 | -22 % | +1 % |
| molly | mid | 4 | -22 % | +1 % |
| yellowlab | mid | 3 | -22 % | +1 % |
| swordtail | mid | 4 | -22 % | +2 % |
| harlequin | mid | 3 | -21 % | +3 % |
| nerite | invert | 10 | -18 % | +0 % |
| amano | invert | 3 | -18 % | +0 % |
| clownloach | big | 0 | +15 % | +0 % |
| oscar | big | 0 | +15 % | +0 % |
| syno | big | 2 | +14 % | -1 % |
| discus | big | 5 | +11 % | -4 % |
| chili | tiny | 6 | -9 % | -7 % |
| sae | big | 4 | +8 % | -6 % |
| guppy | tiny | 3 | -6 % | -4 % |

## Experts

| expert | answering as | bias |
|---|---|---|
| chatgpt high 2 | AI model | +0 % |

## Limit / ideal count (one-species tanks)

Median ratio, experts 1.25, engine 1.44 (1 answers). Experts higher means they find later fish cheaper than the school curve does.

## Compatibility: gate -> experts

- concern -> caution: 1
- concern -> yes: 1
- ok -> caution: 7
- ok -> yes: 1

## Ambiguous counts (both dimensions near the anchor)

- chatgpt high 2 A04 bronzecory limit 8: water 112 %, floor 102 % (weighted 0.5)
- chatgpt high 2 A05 neon ideal 10: water 119 %, floor 101 % (weighted 0.5)
- chatgpt high 2 A05 bronzecory ideal 6: water 119 %, floor 101 % (weighted 0.5)
- chatgpt high 2 A05 bronzecory limit 7: water 126 %, floor 114 % (weighted 0.5)

## Left out

- chatgpt high 2 v4: 22 count tanks read; 38 answers on tanks outside the count fit (no counts asked, or no space.* / golden.* tag); 0 count tanks skipped by the expert
- chatgpt high 2 v4: 59 notes read (Claude Opus 5.5 (S227), read in full against each tank, the answers and the app reading); 9 answer(s) changed by them: A15 reasons restated ["aggression"] -> ["breeding","eat"] ("a breeding male can become territorial and harass females"); A15 problem restated ["honeygourami"] -> ["honeygourami","cherryshrimp"] ("juvenile shrimp are vulnerable to predation"); B05 ideal restated 0 -> null ("The ideal count of zero is deliberate. It means no socially appropriate group achieves my preferred comfort standard in this aquarium"); C05 countStatus restated "no-valid-count" -> null ("Zero is intentional rather than selecting No count works as described"); C05 ideal restated null -> 0 ("Without chromis, the remaining four fish are a defensible, though somewhat borderline, 55-gallon community"); C05 limit restated null -> 0 ("The zero thresholds are husbandry judgments"); D10 change restated null -> "drop" ("Removing the minnows would be my first change"); D10 changeSp restated null -> ["whitecloud"] ("Removing the minnows would be my first change"); D12 max.adf aside ("The maximum of zero frogs applies specifically to this aquarium with the betta remaining")
- chatgpt high 2 A04 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
- chatgpt high 2 A11 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 A12 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 A13 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 A16 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 B02 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 B05 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 B06 overall: set aside on review (v4 change "other": another reason (see the note), not a room band)
- chatgpt high 2 B07 overall: set aside on review (v4 change "ratio": a group-size or sex-mix answer, not a room band)
- chatgpt high 2 B08 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 C04 overall: set aside on review (v4 change "bigger": a tank-minimum answer, not a room band)
- chatgpt high 2 C05 chromis ideal 0: outside the table (1..16)
- chatgpt high 2 C05 chromis limit 0: outside the table (1..16)
- chatgpt high 2 C08 overall: set aside on review (v4 change "drop": a compatibility answer, not a room band)
