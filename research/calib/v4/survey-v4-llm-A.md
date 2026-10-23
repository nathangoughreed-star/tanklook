# Stocking and compatibility survey v4 (build cba9d609) — module A: Freshwater community

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

### A01
Tank: 5 gal, 16 x 8 x 10 in (41 x 20 x 25 cm, L x D x H); 5.5 gal / 21 L; floor 128 sq in (0.89 sq ft).
Setting: Fresh water; water 26 °C (79 °F).
Animals:
- 1 Betta (male): adult 65 mm (2.6 in); lives near the surface
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from betta]
- bigEnough: yes | no (for an adult betta); smallest: one of "2.5 gal (12 x 6 x 8 in)" | "5 gal (16 x 8 x 10 in)" | "10 gal (20 x 10 x 12 in)" | "20 gal long (30 x 12 x 12 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### A02
Tank: 10 gal, 20 x 10 x 12 in (51 x 25 x 30 cm, L x D x H); 10 gal / 39 L; floor 200 sq in (1.39 sq ft).
Setting: Fresh water; water 25 °C (77 °F).
Animals:
- 1 Betta (male): adult 65 mm (2.6 in); lives near the surface
- 6 Neon tetras: adult 38 mm (1.5 in); lives water column  <- the counted species
- 2 Nerite snails: adult 32 mm (1.3 in); lives glass and surfaces
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from betta, neon, nerite]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of neon tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A03
Tank: 10 gal, 20 x 10 x 12 in (51 x 25 x 30 cm, L x D x H); 10 gal / 39 L; floor 200 sq in (1.39 sq ft).
Setting: Fresh water; water 25 °C (77 °F); planted.
Animals:
- 8 Guppies (2 males, 6 females): adult 38 mm (1.5 in) male, 54 mm (2.1 in) female; lives near the surface  <- the counted species
- 6 Cherry shrimp: adult 30 mm (1.2 in); lives bottom and plants
- 1 Nerite snail: adult 32 mm (1.3 in); lives glass and surfaces
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from guppy, cherryshrimp, nerite]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of guppies (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A04
Tank: 20 gal long, 30 x 12 x 12 in (76 x 30 x 30 cm, L x D x H); 19 gal / 71 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 24 °C (75 °F).
Animals:
- 10 Neon tetras: adult 38 mm (1.5 in); lives water column  <- the counted species
- 6 Bronze corydoras: adult 65 mm (2.6 in); lives bottom  <- also counted (mateIdeal / mateLimit)
- 1 Bristlenose pleco: adult 125 mm (4.9 in); lives bottom and glass
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from neon, bronzecory, bristlenose]
- ideal and limit: whole numbers of neon tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- mateIdeal and mateLimit: the same for bronze corydoras, with the others as shown — or mateStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A05
Tank: 20 gal high, 24 x 12 x 16 in (61 x 30 x 41 cm, L x D x H); 20 gal / 76 L; floor 288 sq in (2.00 sq ft).
Setting: Fresh water; water 24 °C (75 °F).
Animals:
- 10 Neon tetras: adult 38 mm (1.5 in); lives water column  <- the counted species
- 6 Bronze corydoras: adult 65 mm (2.6 in); lives bottom  <- also counted (mateIdeal / mateLimit)
- 1 Bristlenose pleco: adult 125 mm (4.9 in); lives bottom and glass
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- ideal and limit: whole numbers of neon tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- mateIdeal and mateLimit: the same for bronze corydoras, with the others as shown — or mateStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A06
Tank: 29 gal, 30 x 12 x 18 in (76 x 30 x 46 cm, L x D x H); 28 gal / 106 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 25 °C (77 °F); planted.
Animals:
- 12 Harlequin rasboras: adult 50 mm (2.0 in); lives water column  <- the counted species
- 8 Panda corydoras: adult 46 mm (1.8 in); lives bottom
- 1 Dwarf gourami (male): adult 80 mm (3.1 in) male, 65 mm (2.6 in) female; lives near the surface
- 3 Amano shrimp: adult 51 mm (2.0 in); lives bottom and plants
- 2 Nerite snails: adult 32 mm (1.3 in); lives glass and surfaces
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from harlequin, pandacory, dwarfgourami, amano, nerite]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of harlequin rasboras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A07
Tank: 29 gal, 30 x 12 x 18 in (76 x 30 x 46 cm, L x D x H); 28 gal / 106 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 25 °C (77 °F).
Animals:
- 8 Tiger barbs: adult 70 mm (2.8 in); lives water column
- 1 Betta (male): adult 65 mm (2.6 in); lives near the surface
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from tigerbarb, betta]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]
- confidence: low | medium | high; note: free text (optional)

### A08
Tank: 40 gal breeder, 36 x 18 x 16 in (91 x 46 x 41 cm, L x D x H); 45 gal / 170 L; floor 648 sq in (4.50 sq ft).
Setting: Fresh water; water 26 °C (79 °F).
Animals:
- 2 Angelfish (a bonded pair): adult 150 mm (5.9 in); lives water column (tall-bodied)
- 15 Rummy-nose tetras: adult 50 mm (2.0 in); lives water column  <- the counted species
- 10 Sterba's corydoras: adult 65 mm (2.6 in); lives bottom
- 2 Bristlenose plecos (1 male, 1 female): adult 125 mm (4.9 in); lives bottom and glass
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from angel, rummynose, sterbai, bristlenose]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of rummy-nose tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- bigEnough: yes | no (for an adult angelfish); smallest: one of "29 gal (30 x 12 x 18 in)" | "40 gal breeder (36 x 18 x 16 in)" | "55 gal (48 x 13 x 21 in)" | "75 gal (48 x 18 x 21 in)" | "larger"
- confidence: low | medium | high; note: free text (optional)

### A09
Tank: 55 gal, 48 x 13 x 21 in (122 x 33 x 53 cm, L x D x H); 57 gal / 215 L; floor 624 sq in (4.33 sq ft).
Setting: Fresh water; water 26 °C (79 °F).
Animals:
- 2 Angelfish (a bonded pair): adult 150 mm (5.9 in); lives water column (tall-bodied)
- 12 Neon tetras: adult 38 mm (1.5 in); lives water column
- 8 Bronze corydoras: adult 65 mm (2.6 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from angel, neon, bronzecory]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- confidence: low | medium | high; note: free text (optional)

### A10
Tank: 55 gal, 48 x 13 x 21 in (122 x 33 x 53 cm, L x D x H); 57 gal / 215 L; floor 624 sq in (4.33 sq ft).
Setting: Fresh water; water 25 °C (77 °F).
Animals:
- 20 Neon tetras: adult 38 mm (1.5 in); lives water column  <- the counted species
- 10 Cardinal tetras: adult 45 mm (1.8 in); lives water column
- 8 Rummy-nose tetras: adult 50 mm (2.0 in); lives water column
- 12 Bronze corydoras: adult 65 mm (2.6 in); lives bottom  <- also counted (mateIdeal / mateLimit)
- 6 Otocinclus: adult 33 mm (1.3 in); lives glass, leaves, bottom
- 1 Bristlenose pleco: adult 125 mm (4.9 in); lives bottom and glass
- 2 Pearl gouramis (1 male, 1 female): adult 120 mm (4.7 in) male, 110 mm (4.3 in) female; lives near the surface
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from neon, cardinal, rummynose, bronzecory, oto, bristlenose, gourami]
- ideal and limit: whole numbers of neon tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- mateIdeal and mateLimit: the same for bronze corydoras, with the others as shown — or mateStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A11
Tank: 75 gal, 48 x 18 x 21 in (122 x 46 x 53 cm, L x D x H); 79 gal / 297 L; floor 864 sq in (6.00 sq ft).
Setting: Fresh water; water 26 °C (79 °F).
Animals:
- 8 Boeseman's rainbowfish (3 males, 5 females): adult 108 mm (4.3 in) male, 80 mm (3.1 in) female; lives water column  <- the counted species
- 12 Cherry barbs (4 males, 8 females): adult 55 mm (2.2 in) male, 50 mm (2.0 in) female; lives water column
- 10 Kuhli loaches: adult 100 mm (3.9 in); lives bottom  <- also counted (mateIdeal / mateLimit)
- 4 Siamese algae eaters: adult 150 mm (5.9 in); lives bottom and surfaces
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from boesemani, cherrybarb, kuhli, sae]
- ideal and limit: whole numbers of boeseman's rainbowfish (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- mateIdeal and mateLimit: the same for kuhli loaches, with the others as shown — or mateStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A12
Tank: 20 gal long, 30 x 12 x 12 in (76 x 30 x 30 cm, L x D x H); 19 gal / 71 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 20 °C (68 °F); unheated room-temperature tank.
Animals:
- 12 Zebra danios: adult 50 mm (2.0 in); lives water column  <- the counted species
- 8 White cloud mountain minnows: adult 40 mm (1.6 in); lives water column
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from danio, whitecloud]
- ideal and limit: whole numbers of zebra danios (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A13
Tank: 10 gal, 20 x 10 x 12 in (51 x 25 x 30 cm, L x D x H); 10 gal / 39 L; floor 200 sq in (1.39 sq ft).
Setting: Fresh water; water 24 °C (75 °F).
Animals:
- 20 Neon tetras: adult 38 mm (1.5 in); lives water column  <- the counted species
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from neon]
- ideal and limit: whole numbers of neon tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A14
Tank: 29 gal, 30 x 12 x 18 in (76 x 30 x 46 cm, L x D x H); 28 gal / 106 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 26 °C (79 °F); planted.
Animals:
- 1 Betta (male): adult 65 mm (2.6 in); lives near the surface
- 10 Ember tetras: adult 23 mm (0.9 in); lives water column  <- the counted species
- 8 Pygmy corydoras: adult 25 mm (1.0 in); lives bottom and low water
- 6 Kuhli loaches: adult 100 mm (3.9 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from betta, ember, pygmycory, kuhli]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of ember tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A15
Tank: 20 gal long, 30 x 12 x 12 in (76 x 30 x 30 cm, L x D x H); 19 gal / 71 L; floor 360 sq in (2.50 sq ft).
Setting: Fresh water; water 25 °C (77 °F); planted.
Animals:
- 3 Honey gouramis (1 male, 2 females): adult 60 mm (2.4 in); lives near the surface
- 12 Chili rasboras: adult 23 mm (0.9 in); lives water column  <- the counted species
- 15 Cherry shrimp: adult 30 mm (1.2 in); lives bottom and plants
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from honeygourami, chili, cherryshrimp]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of chili rasboras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A16
Tank: 40 gal breeder, 36 x 18 x 16 in (91 x 46 x 41 cm, L x D x H); 45 gal / 170 L; floor 648 sq in (4.50 sq ft).
Setting: Fresh water; water 25 °C (77 °F).
Animals:
- 6 Platies (2 males, 4 females): adult 40 mm (1.6 in) male, 60 mm (2.4 in) female; lives water column  <- the counted species
- 6 Black mollies (2 males, 4 females): adult 85 mm (3.3 in) male, 96 mm (3.8 in) female; lives water column
- 5 Swordtails (1 male, 4 females): adult 110 mm (4.3 in) male, 120 mm (4.7 in) female; lives water column
- 8 Bronze corydoras: adult 65 mm (2.6 in); lives bottom  <- also counted (mateIdeal / mateLimit)
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from platy, molly, swordtail, bronzecory]
- ideal and limit: whole numbers of platies (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- mateIdeal and mateLimit: the same for bronze corydoras, with the others as shown — or mateStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

## Answer template (fill in, keep the shape)

```json
{
 "survey": "v4",
 "build": "cba9d609",
 "module": "A",
 "expert": "<name>",
 "expertKind": "ai",
 "answers": {
  "A01": {
   "verdict": "",
   "change": "",
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "A02": {
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
  "A03": {
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
  "A04": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "mateIdeal": null,
   "mateLimit": null,
   "confidence": "",
   "note": ""
  },
  "A05": {
   "verdict": "",
   "ideal": null,
   "limit": null,
   "mateIdeal": null,
   "mateLimit": null,
   "confidence": "",
   "note": ""
  },
  "A06": {
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
  "A07": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "confidence": "",
   "note": ""
  },
  "A08": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "ideal": null,
   "limit": null,
   "bigEnough": "",
   "smallest": "",
   "confidence": "",
   "note": ""
  },
  "A09": {
   "verdict": "",
   "change": "",
   "together": "",
   "reasons": [],
   "problem": [],
   "confidence": "",
   "note": ""
  },
  "A10": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "mateIdeal": null,
   "mateLimit": null,
   "confidence": "",
   "note": ""
  },
  "A11": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "mateIdeal": null,
   "mateLimit": null,
   "confidence": "",
   "note": ""
  },
  "A12": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "A13": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "confidence": "",
   "note": ""
  },
  "A14": {
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
  "A15": {
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
  "A16": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
   "mateIdeal": null,
   "mateLimit": null,
   "confidence": "",
   "note": ""
  }
 }
}
```
