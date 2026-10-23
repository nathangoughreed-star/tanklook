# Stocking and compatibility survey v4 (build c7cb52e6) — module D: Reptiles, amphibians, paludaria

You are answering as an expert keeper. Each tank below is described in words. Assume: adults at the lengths shown, no breeding counted, sexes as listed. Filtration, water changes, heating, lighting and furnishing (plants, cover, hides, sight breaks, rockwork) are whatever these animals need: never the limit. Judge these animals, at these counts, in this tank.

The scale: Ideal = the stocking an experienced keeper aims for (reads 75 % in the app). At most = the count past which long-term problems become likely (reads 100 %). "caution" lies between the two. A count of 0 is valid (even one would cross the line). If you do not know the animals, answer verdict "skip" and nothing else for that tank: a guessed number is worse than no number.

Answer with ONE JSON object per module, exactly in the shape of the template at the end: keys are the tank ids, values hold only the fields that tank asks for, using only the listed values. Put reasoning in "note", not outside the JSON. Do not add tanks or fields. Species ids are the short codes in the animal lists (e.g. neon, bronzecory).

Field meanings:
- verdict: ideal (comfortable long term with ordinary care) | caution (workable but past ideal) | problems (long-term trouble likely even with good care) | unworkable (not as described) | skip.
- change: the first thing you would change: nothing | fewer (of changeSp) | bigger (tank) | drop (changeSp) | ratio (group size or sex ratio) | notroom (the limit is food, maturity or habitat, not room) | other (say in note).
- together / reasons / problem: would you keep these together long term; why not, from: eat (would eat or injure), nip (fin nipping or harassment), aggression (aggression or territory), temperature, chemistry (pH, hardness, salinity), habitat (humidity or habitat), food (food or diet), disease (disease or toxins), breeding (breeding or sex mix), other.
- ideal / limit: the counted species only, with the other animals held as shown. countStatus replaces both numbers: cant-say, or no-valid-count (no count works as described).
- bigEnough / smallest: whether the tank is big enough for one adult of that species at all, and the smallest of the offered sizes you would use for it as stocked here ("larger" if none).
- max.<species>: the most of that species you would keep in this tank, whatever else is in it. maxMales.<species>: the most males.
- confidence: low | medium | high.

## Tanks

### D01
Tank: 10 gal, 20 x 10 x 12 in (51 x 25 x 30 cm, L x D x H); 10 gal / 39 L; floor 200 sq in (1.39 sq ft).
Setting: No water; dry, warm side 32 C.
Animals:
- 1 Leopard gecko (adult): adult 250 mm (9.8 in); lives land, ground
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from leopardgecko]
- bigEnough: yes | no (for an adult leopard gecko); smallest: one of "10 gal (20 x 10 x 12 in)" | "20 gal long (30 x 12 x 12 in)" | "40 gal breeder (36 x 18 x 16 in)" | "4 x 2 x 2 ft (48 x 24 x 24 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### D02
Tank: 40 gal breeder used as a terrarium (36 x 18 x 16 in), 36 x 18 x 16 in (91 x 46 x 41 cm, L x D x H); 45 gal / 170 L; floor 648 sq in (4.50 sq ft).
Setting: Terrarium, no standing water beyond a dish; dry, warm side 32 C.
Animals:
- 2 Leopard geckos (juveniles about 5 in, sexes unknown): adult 250 mm (9.8 in); lives land, ground
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from leopardgecko]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- max.leopardgecko: one of 1 | 2 | 3 | 4+ (if they all turn out female)
- confidence: low | medium | high; note: free text (optional)

### D03
Tank: 12 x 12 x 18 in terrarium, 12 x 12 x 18 in (30 x 30 x 46 cm, L x D x H); 11 gal / 42 L; floor 144 sq in (1.00 sq ft).
Setting: Terrarium, no standing water beyond a dish; humid, planted.
Animals:
- 1 Crested gecko (adult): adult 229 mm (9.0 in); lives land, climbs (arboreal)
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from crestedgecko]
- bigEnough: yes | no (for an adult crested gecko); smallest: one of "12 x 12 x 18 in" | "18 x 18 x 24 in" | "18 x 18 x 36 in" | "24 x 18 x 36 in" | "larger"
- confidence: low | medium | high; note: free text (optional)

### D04
Tank: 18 x 18 x 24 in terrarium, 18 x 18 x 24 in (46 x 46 x 61 cm, L x D x H); 34 gal / 127 L; floor 324 sq in (2.25 sq ft).
Setting: Terrarium, no standing water beyond a dish; humid, planted.
Animals:
- 1 Crested gecko (adult): adult 229 mm (9.0 in); lives land, climbs (arboreal)
- 1 Green anole (male) (adult): adult 200 mm (7.9 in) male, 150 mm (5.9 in) female; lives land, climbs
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from crestedgecko, greenanole]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- confidence: low | medium | high; note: free text (optional)

### D05
Tank: 18 x 18 x 24 in terrarium, 18 x 18 x 24 in (46 x 46 x 61 cm, L x D x H); 34 gal / 127 L; floor 324 sq in (2.25 sq ft).
Setting: Terrarium, no standing water beyond a dish; humid, planted.
Animals:
- 2 Crested geckos (1 male, 1 female) (adults): adult 229 mm (9.0 in); lives land, climbs (arboreal)
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from crestedgecko]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- max.crestedgecko: one of 1 | 2 | 3 | 4+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### D06
Tank: 40 gal breeder used as a terrarium (36 x 18 x 16 in), 36 x 18 x 16 in (91 x 46 x 41 cm, L x D x H); 45 gal / 170 L; floor 648 sq in (4.50 sq ft).
Setting: Terrarium, no standing water beyond a dish; warm side 32 C, hides both ends.
Animals:
- 1 Ball python (adult female, about 4.5 ft): adult 1311 mm (51.6 in); lives land, ground, drapes on branches
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from ballpython]
- bigEnough: yes | no (for an adult ball python); smallest: one of "40 gal breeder (36 x 18 x 16 in)" | "4 x 2 x 1 ft (48 x 24 x 12 in)" | "4 x 2 x 2 ft (48 x 24 x 24 in)" | "6 x 2 x 2 ft (72 x 24 x 24 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### D07
Tank: 18 x 18 x 24 in terrarium, 18 x 18 x 24 in (46 x 46 x 61 cm, L x D x H); 34 gal / 127 L; floor 324 sq in (2.25 sq ft).
Setting: Terrarium, no standing water beyond a dish; bioactive, 80 % humidity.
Animals:
- 3 Dyeing dart frogs (1 male, 2 females) (adults): adult 45 mm (1.8 in); lives land, floor and low plants
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from dartfrog]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- max.dartfrog: one of 1 | 2 | 3 | 4 | 5+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### D08
Tank: 18 x 18 x 24 in terrarium, 18 x 18 x 24 in (46 x 46 x 61 cm, L x D x H); 34 gal / 127 L; floor 324 sq in (2.25 sq ft).
Setting: Terrarium, no standing water beyond a dish; humid, planted.
Animals:
- 2 White's tree frogs (adults, same size): adult 127 mm (5.0 in); lives land, climbs
- 2 Dyeing dart frogs (adults): adult 45 mm (1.8 in); lives land, floor and low plants
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from treefrog, dartfrog]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- confidence: low | medium | high; note: free text (optional)

### D09
Tank: 18 x 18 x 24 in terrarium, 18 x 18 x 24 in (46 x 46 x 61 cm, L x D x H); 34 gal / 127 L; floor 324 sq in (2.25 sq ft).
Setting: Terrarium, no standing water beyond a dish; humid, branches.
Animals:
- 3 White's tree frogs (adults, same size): adult 127 mm (5.0 in); lives land, climbs
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from treefrog]
- bigEnough: yes | no (for an adult white's tree frog); smallest: one of "18 x 18 x 24 in" | "24 x 18 x 24 in" | "36 x 18 x 18 in" | "36 x 18 x 36 in" | "larger" (for these three)
- max.treefrog: one of 1 | 2 | 3 | 4 | 5+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### D10
Tank: 20 gal long paludarium, 30 x 12 x 12 in (76 x 30 x 30 cm, L x D x H); 19 gal / 71 L; floor 360 sq in (2.50 sq ft).
Setting: Half land, half water; water 22 °C (72 °F); half land, water 4 in deep, tight lid.
Animals:
- 4 Fire-bellied toads: adult 51 mm (2.0 in); lives land and shallow water
- 6 White cloud mountain minnows: adult 40 mm (1.6 in); lives water column
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from firetoad, whitecloud]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- max.firetoad: one of 1 | 2 | 3 | 4 | 6 | 8+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### D11
Tank: 20 gal long, 30 x 12 x 12 in (76 x 30 x 30 cm, L x D x H); 19 gal / 71 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 18 °C (64 °F); water 8 in deep, a floating land spot, unheated.
Animals:
- 4 Chinese fire-bellied newts: adult 102 mm (4.0 in); lives water with a land spot
- 10 Cherry shrimp: adult 30 mm (1.2 in); lives bottom and plants
- 2 Nerite snails: adult 32 mm (1.3 in); lives glass and surfaces
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from firenewt, cherryshrimp, nerite]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- max.firenewt: one of 1 | 2 | 3 | 4 | 6 | 8+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### D12
Tank: 5 gal, 16 x 8 x 10 in (41 x 20 x 25 cm, L x D x H); 5.5 gal / 21 L; floor 128 sq in (0.89 sq ft).
Setting: Fresh water; water 25 °C (77 °F).
Animals:
- 3 African dwarf frogs: adult 55 mm (2.2 in); lives bottom, surfaces to breathe
- 1 Betta (male): adult 65 mm (2.6 in); lives near the surface
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from adf, betta]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- max.adf: one of 0 | 1 | 2 | 3 | 4 | 6+ (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### D13
Tank: 10 gal, 20 x 10 x 12 in (51 x 25 x 30 cm, L x D x H); 10 gal / 39 L; floor 200 sq in (1.39 sq ft).
Setting: Fresh water; water 17 °C (63 °F); unheated, cool room.
Animals:
- 1 Axolotl (adult, about 25 cm): adult 300 mm (11.8 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from axolotl]
- bigEnough: yes | no (for an adult axolotl); smallest: one of "10 gal (20 x 10 x 12 in)" | "20 gal long (30 x 12 x 12 in)" | "29 gal (30 x 12 x 18 in)" | "40 gal breeder (36 x 18 x 16 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### D14
Tank: 20 gal long, 30 x 12 x 12 in (76 x 30 x 30 cm, L x D x H); 19 gal / 71 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 17 °C (63 °F); unheated, cool room.
Animals:
- 2 Axolotls (adults, same size): adult 300 mm (11.8 in); lives bottom
- 6 White cloud mountain minnows: adult 40 mm (1.6 in); lives water column
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from axolotl, whitecloud]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- max.axolotl: one of 0 | 1 | 2 | 3 (most you would keep here whatever else is in the tank)
- confidence: low | medium | high; note: free text (optional)

### D15
Tank: 18 x 18 x 24 in terrarium, 18 x 18 x 24 in (46 x 46 x 61 cm, L x D x H); 34 gal / 127 L; floor 324 sq in (2.25 sq ft).
Setting: Terrarium, no standing water beyond a dish; basking spot 33 C, UVB, misted plants.
Animals:
- 4 Green anoles (1 male, 3 females) (adults): adult 200 mm (7.9 in) male, 150 mm (5.9 in) female; lives land, climbs
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from greenanole]
- max.greenanole: one of 1 | 2 | 3 | 4 | 5+ (most you would keep here whatever else is in the tank)
- maxMales.greenanole: one of 0 | 1 | 2 | 3
- confidence: low | medium | high; note: free text (optional)

### D16
Tank: 12 x 12 x 12 in terrarium, 12 x 12 x 12 in (30 x 30 x 30 cm, L x D x H); 7.5 gal / 28 L; floor 144 sq in (1.00 sq ft).
Setting: Terrarium, no standing water beyond a dish; deep substrate, a hide, water dish.
Animals:
- 1 Chaco golden knee tarantula (adult female, 6 in leg span): adult 50 mm (2.0 in); lives land, ground, a burrow or hide
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from chacogoldenknee]
- bigEnough: yes | no (for an adult chaco golden knee tarantula); smallest: one of "8 x 8 x 8 in" | "12 x 12 x 12 in" | "18 x 18 x 12 in" | "20 gal long (30 x 12 x 12 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

## Answer template (fill in, keep the shape)

```json
{
 "survey": "v4",
 "build": "c7cb52e6",
 "module": "D",
 "expert": "<name>",
 "expertKind": "ai",
 "answers": {
  "D01": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "D02": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "max": {
    "leopardgecko": ""
   },
   "confidence": "",
   "note": ""
  },
  "D03": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "D04": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "confidence": "",
   "note": ""
  },
  "D05": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "max": {
    "crestedgecko": ""
   },
   "confidence": "",
   "note": ""
  },
  "D06": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "D07": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "max": {
    "dartfrog": ""
   },
   "confidence": "",
   "note": ""
  },
  "D08": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "confidence": "",
   "note": ""
  },
  "D09": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "max": {
    "treefrog": ""
   },
   "confidence": "",
   "note": ""
  },
  "D10": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "max": {
    "firetoad": ""
   },
   "confidence": "",
   "note": ""
  },
  "D11": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "max": {
    "firenewt": ""
   },
   "confidence": "",
   "note": ""
  },
  "D12": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "max": {
    "adf": ""
   },
   "confidence": "",
   "note": ""
  },
  "D13": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "D14": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "max": {
    "axolotl": ""
   },
   "confidence": "",
   "note": ""
  },
  "D15": {
   "verdict": "",
   "change": "",
   "max": {
    "greenanole": ""
   },
   "maxMales": {
    "greenanole": ""
   },
   "confidence": "",
   "note": ""
  },
  "D16": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  }
 }
}
```
