# Stocking and compatibility survey v4 (build cba9d609) — module C: Saltwater

You are answering as an expert keeper. Each tank below is described in words. Assume: adults at the lengths shown, no breeding counted, sexes as listed (a male : female ratio is kept roughly, rounded as you would stock them). Filtration, water changes, heating, lighting and furnishing (plants, cover, hides, sight breaks, rockwork) are whatever these animals need: never the limit. Judge these animals, at these counts, in this tank.

The scale: Ideal = the stocking an experienced keeper aims for (reads 75 % in the app). At most = the count past which long-term problems become likely (reads 100 %). "caution" lies between the two. A count of 0 is valid (even one would cross the line). If you do not know the animals, answer verdict "skip" and nothing else for that tank: a guessed number is worse than no number.

Answer with ONE JSON object per module, exactly in the shape of the template at the end: keys are the tank ids, values hold only the fields that tank asks for, using only the listed values. Put reasoning in "note", not outside the JSON. Do not add tanks or fields. Species ids are the short codes in the animal lists (e.g. neon, bronzecory).

Field meanings:
- verdict: ideal (comfortable long term with ordinary care) | caution (workable but past ideal) | problems (long-term trouble likely even with good care) | unworkable (not as described) | skip.
- change: the first thing you would change: nothing | fewer (of changeSp) | bigger (tank) | drop (changeSp) | ratio (group size or sex ratio) | notroom (the limit is food, maturity or habitat, not room) | other (say in note).
- together / reasons / problem: would you keep these together long term; why not, from: eat (would eat or injure), nip (fin nipping or harassment), aggression (aggression or territory), temperature, chemistry (pH, hardness, salinity), habitat (humidity or habitat), food (food or diet), disease (disease or toxins), breeding (breeding or sex mix), other.
- ideal / limit: the counted species only, with the other animals held as shown. countStatus replaces both numbers: cant-say, or no-valid-count (no count works as described). Six tanks also ask mateIdeal / mateLimit (mateStatus) for a second counted species, a bottom dweller.
- bigEnough / smallest: whether the tank is big enough for one adult of that species at all, and the smallest of the offered sizes you would use for it as stocked here ("larger" if none).
- max.<species>: the most of that species you would keep in this tank, whatever else is in it. maxMales.<species>: the most males.
- confidence: low | medium | high.

## Tanks

### C01
Tank: 10 gal, 20 x 10 x 12 in (51 x 25 x 30 cm, L x D x H); 10 gal / 39 L; floor 200 sq in (1.39 sq ft).
Setting: Salt water; water 25 °C (77 °F); live rock, no corals.
Animals:
- 2 Ocellaris clownfish (a bonded pair): adult 100 mm (3.9 in); lives lower water, a host spot
- 2 Blue-leg hermit crabs: adult 25 mm (1.0 in); lives bottom and rock
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from ocellaris, hermit]
- bigEnough: yes | no (for an adult ocellaris clownfish); smallest: one of "10 gal (20 x 10 x 12 in)" | "15 gal (24 x 12 x 12 in)" | "20 gal (24 x 12 x 16 in)" | "29 gal (30 x 12 x 18 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### C02
Tank: 20 gal all-in-one cube, 18 x 18 x 16 in (46 x 46 x 41 cm, L x D x H); 22 gal / 85 L; floor 324 sq in (2.25 sq ft).
Setting: Salt water; water 25 °C (77 °F); soft corals, live rock.
Animals:
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
- 1 Royal gramma: adult 80 mm (3.1 in); lives rockwork, a cave
- 1 Firefish goby: adult 90 mm (3.5 in); lives water column near a bolt-hole
- 2 Skunk cleaner shrimp: adult 60 mm (2.4 in); lives rockwork
- 5 Blue-leg hermit crabs: adult 25 mm (1.0 in); lives bottom and rock
- 3 Mexican turbo snails: adult 70 mm (2.8 in); lives glass and rock
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from ocellaris, royalgramma, firefish, cleanershrimp, hermit, turbo]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- bigEnough: yes | no (for an adult royal gramma); smallest: one of "20 gal cube (18 x 18 x 16 in)" | "29 gal (30 x 12 x 18 in)" | "40 gal breeder (36 x 18 x 16 in)" | "55 gal (48 x 13 x 21 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### C03
Tank: 29 gal all-in-one cube, 18 x 18 x 20 in (46 x 46 x 51 cm, L x D x H); 28 gal / 106 L; floor 324 sq in (2.25 sq ft).
Setting: Salt water; water 25 °C (77 °F); LPS corals, live rock.
Animals:
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
- 1 Yellow watchman goby: adult 120 mm (4.7 in); lives bottom, a burrow
- 1 Six-line wrasse: adult 100 mm (3.9 in); lives rockwork
- 1 Skunk cleaner shrimp: adult 60 mm (2.4 in); lives rockwork
- 10 Blue-leg hermit crabs: adult 25 mm (1.0 in); lives bottom and rock  <- the counted species
- 5 Mexican turbo snails: adult 70 mm (2.8 in); lives glass and rock
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from ocellaris, watchman, sixline, cleanershrimp, hermit, turbo]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of blue-leg hermit crabs (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### C04
Tank: 40 gal breeder, 36 x 18 x 16 in (91 x 46 x 41 cm, L x D x H); 45 gal / 170 L; floor 648 sq in (4.50 sq ft).
Setting: Salt water; water 25 °C (77 °F); LPS and soft corals.
Animals:
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
- 1 Royal gramma: adult 80 mm (3.1 in); lives rockwork, a cave
- 6 Blue-green chromis: adult 100 mm (3.9 in); lives upper water  <- the counted species
- 1 Coral beauty angelfish: adult 115 mm (4.5 in); lives rockwork
- 1 Yellow watchman goby: adult 120 mm (4.7 in); lives bottom, a burrow
- 1 Skunk cleaner shrimp: adult 60 mm (2.4 in); lives rockwork
- 10 Blue-leg hermit crabs: adult 25 mm (1.0 in); lives bottom and rock
- 5 Mexican turbo snails: adult 70 mm (2.8 in); lives glass and rock
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from ocellaris, royalgramma, chromis, coralbeauty, watchman, cleanershrimp, hermit, turbo]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of blue-green chromis (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### C05
Tank: 55 gal, 48 x 13 x 21 in (122 x 33 x 53 cm, L x D x H); 57 gal / 215 L; floor 624 sq in (4.33 sq ft).
Setting: Salt water; water 25 °C (77 °F); LPS and soft corals.
Animals:
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
- 1 Royal gramma: adult 80 mm (3.1 in); lives rockwork, a cave
- 6 Blue-green chromis: adult 100 mm (3.9 in); lives upper water  <- the counted species
- 1 Coral beauty angelfish: adult 115 mm (4.5 in); lives rockwork
- 1 Yellow watchman goby: adult 120 mm (4.7 in); lives bottom, a burrow
- 1 Skunk cleaner shrimp: adult 60 mm (2.4 in); lives rockwork
- 10 Blue-leg hermit crabs: adult 25 mm (1.0 in); lives bottom and rock
- 5 Mexican turbo snails: adult 70 mm (2.8 in); lives glass and rock
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- ideal and limit: whole numbers of blue-green chromis (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### C06
Tank: 55 gal, 48 x 13 x 21 in (122 x 33 x 53 cm, L x D x H); 57 gal / 215 L; floor 624 sq in (4.33 sq ft).
Setting: Salt water; water 25 °C (77 °F); fish only with live rock.
Animals:
- 1 Yellow tang: adult 200 mm (7.9 in); lives everywhere, open water
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
- 6 Blue-green chromis: adult 100 mm (3.9 in); lives upper water
- 1 Firefish goby: adult 90 mm (3.5 in); lives water column near a bolt-hole
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from yellowtang, ocellaris, chromis, firefish]
- bigEnough: yes | no (for an adult yellow tang); smallest: one of "55 gal (48 x 13 x 21 in)" | "75 gal (48 x 18 x 21 in)" | "90 gal (48 x 18 x 24 in)" | "125 gal (72 x 18 x 21 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### C07
Tank: 75 gal, 48 x 18 x 21 in (122 x 46 x 53 cm, L x D x H); 79 gal / 297 L; floor 864 sq in (6.00 sq ft).
Setting: Salt water; water 25 °C (77 °F); live rock, soft corals.
Animals:
- 1 Yellow tang: adult 200 mm (7.9 in); lives everywhere, open water
- 1 Blue tang (juvenile now, judge for the adult): adult 310 mm (12.2 in); lives everywhere, open water
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
- 1 Royal gramma: adult 80 mm (3.1 in); lives rockwork, a cave
- 5 Blue-green chromis: adult 100 mm (3.9 in); lives upper water
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from yellowtang, bluetang, ocellaris, royalgramma, chromis]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- bigEnough: yes | no (for an adult blue tang); smallest: one of "75 gal (48 x 18 x 21 in)" | "125 gal (72 x 18 x 21 in)" | "180 gal (72 x 24 x 24 in)" | "240 gal (96 x 24 x 24 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### C08
Tank: 125 gal, 72 x 18 x 21 in (183 x 46 x 53 cm, L x D x H); 118 gal / 446 L; floor 1296 sq in (9.00 sq ft).
Setting: Salt water; water 25 °C (77 °F); mixed reef, two years old, refugium.
Animals:
- 1 Yellow tang: adult 200 mm (7.9 in); lives everywhere, open water
- 1 Blue tang: adult 310 mm (12.2 in); lives everywhere, open water
- 1 Coral beauty angelfish: adult 115 mm (4.5 in); lives rockwork
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
- 9 Blue-green chromis: adult 100 mm (3.9 in); lives upper water  <- the counted species
- 1 Mandarin dragonet: adult 70 mm (2.8 in) male, 50 mm (2.0 in) female; lives rockwork, picking pods
- 1 Yellow watchman goby: adult 120 mm (4.7 in); lives bottom, a burrow
- 2 Skunk cleaner shrimp: adult 60 mm (2.4 in); lives rockwork
- 20 Blue-leg hermit crabs: adult 25 mm (1.0 in); lives bottom and rock
- 10 Mexican turbo snails: adult 70 mm (2.8 in); lives glass and rock
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from yellowtang, bluetang, coralbeauty, ocellaris, chromis, mandarin, watchman, cleanershrimp, hermit, turbo]
- ideal and limit: whole numbers of blue-green chromis (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### C09
Tank: 20 gal all-in-one cube, 18 x 18 x 16 in (46 x 46 x 41 cm, L x D x H); 22 gal / 85 L; floor 324 sq in (2.25 sq ft).
Setting: Salt water; water 25 °C (77 °F); three months old, no refugium.
Animals:
- 1 Mandarin dragonet: adult 70 mm (2.8 in) male, 50 mm (2.0 in) female; lives rockwork, picking pods
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from mandarin, ocellaris]
- confidence: low | medium | high; note: free text (optional)

### C10
Tank: 29 gal, 30 x 12 x 18 in (76 x 30 x 46 cm, L x D x H); 28 gal / 106 L; floor 360 sq in (2.50 sq ft).
Setting: Salt water; water 25 °C (77 °F); live rock.
Animals:
- 5 Banggai cardinalfish (unsexed juveniles): adult 80 mm (3.1 in); lives water column
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from banggai, ocellaris]
- max.banggai: one of 0 | 1 | 2 | 3 | 5 | 7+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### C11
Tank: 40 gal breeder, 36 x 18 x 16 in (91 x 46 x 41 cm, L x D x H); 45 gal / 170 L; floor 648 sq in (4.50 sq ft).
Setting: Salt water; water 25 °C (77 °F); live rock.
Animals:
- 2 Royal grammas (bought separately): adult 80 mm (3.1 in); lives rockwork, a cave
- 2 Firefish gobies (bought separately): adult 90 mm (3.5 in); lives water column near a bolt-hole
- 2 Ocellaris clownfish (a pair): adult 100 mm (3.9 in); lives lower water, a host spot
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from royalgramma, firefish, ocellaris]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- max.royalgramma: one of 0 | 1 | 2 | 3 (most you would keep here whatever else is in the tank)
- max.firefish: one of 0 | 1 | 2 | 3 | 4+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### C12
Tank: 20 gal high, 24 x 12 x 16 in (61 x 30 x 41 cm, L x D x H); 20 gal / 76 L; floor 288 sq in (2.00 sq ft).
Setting: Salt water; water 25 °C (77 °F); live rock.
Animals:
- 3 Ocellaris clownfish (bought as juveniles): adult 100 mm (3.9 in); lives lower water, a host spot
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from ocellaris]
- max.ocellaris: one of 0 | 1 | 2 | 3 | 4+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

## Answer template (fill in, keep the shape)

```json
{
 "survey": "v4",
 "build": "cba9d609",
 "module": "C",
 "expert": "<name>",
 "expertKind": "ai",
 "answers": {
  "C01": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "C02": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "C03": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "C04": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "C05": {
   "verdict": "",
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "C06": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "C07": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "C08": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "C09": {
   "verdict": "",
   "change": "",
   "confidence": "",
   "note": ""
  },
  "C10": {
   "verdict": "",
   "change": "",
   "max": {
    "banggai": ""
   },
   "confidence": "",
   "note": ""
  },
  "C11": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "max": {
    "royalgramma": "",
    "firefish": ""
   },
   "confidence": "",
   "note": ""
  },
  "C12": {
   "verdict": "",
   "change": "",
   "max": {
    "ocellaris": ""
   },
   "confidence": "",
   "note": ""
  }
 }
}
```
