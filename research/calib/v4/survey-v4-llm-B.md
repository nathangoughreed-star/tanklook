# Stocking and compatibility survey v4 (build cba9d609) — module B: Freshwater specialist

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

### B01
Tank: 55 gal, 48 x 13 x 21 in (122 x 33 x 53 cm, L x D x H); 57 gal / 215 L; floor 624 sq in (4.33 sq ft).
Setting: Fresh water; water 25 °C (77 °F).
Animals:
- 1 Oscar: adult 300 mm (11.8 in); lives everywhere
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from oscar]
- bigEnough: yes | no (for an adult oscar); smallest: one of "55 gal (48 x 13 x 21 in)" | "75 gal (48 x 18 x 21 in)" | "125 gal (72 x 18 x 21 in)" | "180 gal (72 x 24 x 24 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### B02
Tank: 125 gal, 72 x 18 x 21 in (183 x 46 x 53 cm, L x D x H); 118 gal / 446 L; floor 1296 sq in (9.00 sq ft).
Setting: Fresh water; water 26 °C (79 °F).
Animals:
- 1 Oscar: adult 300 mm (11.8 in); lives everywhere
- 5 Clown loaches (adults, about 23 cm): adult 230 mm (9.1 in); lives bottom  <- the counted species
- 1 Bristlenose pleco: adult 125 mm (4.9 in); lives bottom and glass
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from oscar, clownloach, bristlenose]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of clown loaches (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### B03
Tank: 10 gal, 20 x 10 x 12 in (51 x 25 x 30 cm, L x D x H); 10 gal / 39 L; floor 200 sq in (1.39 sq ft).
Setting: Fresh water; water 21 °C (70 °F); unheated.
Animals:
- 1 Fancy goldfish: adult 203 mm (8.0 in); lives everywhere
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from goldfish]
- bigEnough: yes | no (for an adult fancy goldfish); smallest: one of "10 gal (20 x 10 x 12 in)" | "20 gal high (24 x 12 x 16 in)" | "29 gal (30 x 12 x 18 in)" | "40 gal breeder (36 x 18 x 16 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### B04
Tank: 40 gal breeder, 36 x 18 x 16 in (91 x 46 x 41 cm, L x D x H); 45 gal / 170 L; floor 648 sq in (4.50 sq ft).
Setting: Fresh water; water 21 °C (70 °F); unheated.
Animals:
- 3 Fancy goldfish: adult 203 mm (8.0 in); lives everywhere  <- the counted species
- 6 White cloud mountain minnows: adult 40 mm (1.6 in); lives water column
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from goldfish, whitecloud]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- ideal and limit: whole numbers of fancy goldfish (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### B05
Tank: 55 gal, 48 x 13 x 21 in (122 x 33 x 53 cm, L x D x H); 57 gal / 215 L; floor 624 sq in (4.33 sq ft).
Setting: Fresh water; water 29 °C (84 °F).
Animals:
- 6 Discus (adults): adult 150 mm (5.9 in); lives water column (tall-bodied)  <- the counted species
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from discus]
- ideal and limit: whole numbers of discus (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### B06
Tank: 75 gal, 48 x 18 x 21 in (122 x 46 x 53 cm, L x D x H); 79 gal / 297 L; floor 864 sq in (6.00 sq ft).
Setting: Fresh water; water 29 °C (84 °F).
Animals:
- 6 Discus (adults): adult 150 mm (5.9 in); lives water column (tall-bodied)  <- the counted species
- 15 Cardinal tetras: adult 45 mm (1.8 in); lives water column
- 8 Sterba's corydoras: adult 65 mm (2.6 in); lives bottom  <- also counted (mateIdeal / mateLimit)
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from discus, cardinal, sterbai]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of discus (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- mateIdeal and mateLimit: the same for sterba's corydoras, with the others as shown — or mateStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### B07
Tank: 55 gal, 48 x 13 x 21 in (122 x 33 x 53 cm, L x D x H); 57 gal / 215 L; floor 624 sq in (4.33 sq ft).
Setting: Fresh water; water 26 °C (79 °F); hard alkaline water, heavy rockwork.
Animals:
- 8 Yellow lab cichlids (2 males, 6 females): adult 100 mm (3.9 in) male, 90 mm (3.5 in) female; lives water column, rockwork  <- the counted species
- 8 Demasoni cichlids (2 males, 6 females): adult 70 mm (2.8 in); lives rockwork
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from yellowlab, demasoni]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- ideal and limit: whole numbers of yellow lab cichlids (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- max.demasoni: one of 0 | 4 | 6 | 8 | 12 | 16+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### B08
Tank: 75 gal, 48 x 18 x 21 in (122 x 46 x 53 cm, L x D x H); 79 gal / 297 L; floor 864 sq in (6.00 sq ft).
Setting: Fresh water; water 26 °C (79 °F); hard alkaline water.
Animals:
- 5 Peacock cichlids (1 male, 4 females): adult 118 mm (4.6 in) male, 100 mm (3.9 in) female; lives water column  <- the counted species
- 6 Yellow lab cichlids (1 male, 5 females): adult 100 mm (3.9 in) male, 90 mm (3.5 in) female; lives water column, rockwork
- 3 Malawi synodontis: adult 190 mm (7.5 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from peacock, yellowlab, syno]
- ideal and limit: whole numbers of peacock cichlids (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### B09
Tank: 29 gal, 30 x 12 x 18 in (76 x 30 x 46 cm, L x D x H); 28 gal / 106 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 25 °C (77 °F).
Animals:
- 8 Neon tetras: adult 38 mm (1.5 in); lives water column
- 2 Yellow lab cichlids (1 male, 1 female): adult 100 mm (3.9 in) male, 90 mm (3.5 in) female; lives water column, rockwork
- 6 Bronze corydoras: adult 65 mm (2.6 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from neon, yellowlab, bronzecory]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- confidence: low | medium | high; note: free text (optional)

### B10
Tank: 20 gal long, 30 x 12 x 12 in (76 x 30 x 30 cm, L x D x H); 19 gal / 71 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 24 °C (75 °F); caves provided.
Animals:
- 2 Kribensis (1 male, 1 female) (a pair): adult 110 mm (4.3 in) male, 75 mm (3.0 in) female; lives lower water
- 8 Neon tetras: adult 38 mm (1.5 in); lives water column
- 6 Panda corydoras: adult 46 mm (1.8 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from kribensis, neon, pandacory]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- max.kribensis: one of 1 | 2 | 3 | 4 | 6+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### B11
Tank: 20 gal high, 24 x 12 x 16 in (61 x 30 x 41 cm, L x D x H); 20 gal / 76 L; floor 288 sq in (2.00 sq ft).
Setting: Fresh water; water 28 °C (82 °F).
Animals:
- 2 German blue rams (1 male, 1 female) (a pair): adult 50 mm (2.0 in) male, 42 mm (1.7 in) female; lives lower water
- 10 Ember tetras: adult 23 mm (0.9 in); lives water column
- 10 Cherry shrimp: adult 30 mm (1.2 in); lives bottom and plants
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from gbr, ember, cherryshrimp]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- confidence: low | medium | high; note: free text (optional)

### B12
Tank: 29 gal, 30 x 12 x 18 in (76 x 30 x 46 cm, L x D x H); 28 gal / 106 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 25 °C (77 °F); planted.
Animals:
- 2 Dwarf gouramis (all males) (both males): adult 80 mm (3.1 in) male, 65 mm (2.6 in) female; lives near the surface
- 10 Harlequin rasboras: adult 50 mm (2.0 in); lives water column
- 6 Panda corydoras: adult 46 mm (1.8 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from dwarfgourami, harlequin, pandacory]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- maxMales.dwarfgourami: one of 0 | 1 | 2 | 3
- confidence: low | medium | high; note: free text (optional)

### B13
Tank: 10 gal, 20 x 10 x 12 in (51 x 25 x 30 cm, L x D x H); 10 gal / 39 L; floor 200 sq in (1.39 sq ft).
Setting: Fresh water; water 26 °C (79 °F); planted; densely planted.
Animals:
- 3 Pea puffers (1 male, 2 females): adult 30 mm (1.2 in) male, 27 mm (1.1 in) female; lives everywhere, among plants
- 6 Otocinclus: adult 33 mm (1.3 in); lives glass, leaves, bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from peapuffer, oto]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- max.peapuffer: one of 0 | 1 | 2 | 3 | 4 | 5+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### B14
Tank: 40 gal breeder, 36 x 18 x 16 in (91 x 46 x 41 cm, L x D x H); 45 gal / 170 L; floor 648 sq in (4.50 sq ft).
Setting: Fresh water; water 25 °C (77 °F).
Animals:
- 4 Bolivian rams (2 males, 2 females): adult 89 mm (3.5 in); lives lower water
- 12 Rummy-nose tetras: adult 50 mm (2.0 in); lives water column
- 8 Sterba's corydoras: adult 65 mm (2.6 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from bolivianram, rummynose, sterbai]
- max.bolivianram: one of 1 | 2 | 3 | 4 | 6 | 8+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### B15
Tank: 20 gal long, 30 x 12 x 12 in (76 x 30 x 30 cm, L x D x H); 19 gal / 71 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 24 °C (75 °F); new tank: cycled six weeks ago, no visible algae yet.
Animals:
- 1 Bristlenose pleco: adult 125 mm (4.9 in); lives bottom and glass
- 8 Otocinclus: adult 33 mm (1.3 in); lives glass, leaves, bottom  <- the counted species
- 6 Amano shrimp: adult 51 mm (2.0 in); lives bottom and plants
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from bristlenose, oto, amano]
- ideal and limit: whole numbers of otocinclus (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### B16
Tank: 10 gal, 20 x 10 x 12 in (51 x 25 x 30 cm, L x D x H); 10 gal / 39 L; floor 200 sq in (1.39 sq ft).
Setting: Fresh water; water 23 °C (73 °F); planted.
Animals:
- 30 Cherry shrimp: adult 30 mm (1.2 in); lives bottom and plants  <- the counted species
- 3 Nerite snails: adult 32 mm (1.3 in); lives glass and surfaces
- 8 Chili rasboras: adult 23 mm (0.9 in); lives water column
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from cherryshrimp, nerite, chili]
- ideal and limit: whole numbers of cherry shrimp (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

## Answer template (fill in, keep the shape)

```json
{
 "survey": "v4",
 "build": "cba9d609",
 "module": "B",
 "expert": "<name>",
 "expertKind": "ai",
 "answers": {
  "B01": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "B02": {
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
  "B03": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "B04": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "B05": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "B06": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "ideal": null,
   "limit": null,
   "mateIdeal": null,
   "mateLimit": null,
   "confidence": "",
   "note": ""
  },
  "B07": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "ideal": null,
   "limit": null,
   "max": {
    "demasoni": ""
   },
   "confidence": "",
   "note": ""
  },
  "B08": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "B09": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "confidence": "",
   "note": ""
  },
  "B10": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "max": {
    "kribensis": ""
   },
   "confidence": "",
   "note": ""
  },
  "B11": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "confidence": "",
   "note": ""
  },
  "B12": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "maxMales": {
    "dwarfgourami": ""
   },
   "confidence": "",
   "note": ""
  },
  "B13": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "max": {
    "peapuffer": ""
   },
   "confidence": "",
   "note": ""
  },
  "B14": {
   "verdict": "",
   "change": "",
   "max": {
    "bolivianram": ""
   },
   "confidence": "",
   "note": ""
  },
  "B15": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "B16": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  }
 }
}
```
