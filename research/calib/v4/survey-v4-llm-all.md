# Stocking and compatibility survey v4 (build c7cb52e6) — module A: Freshwater community

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
- 6 Bronze corydoras: adult 65 mm (2.6 in); lives bottom
- 1 Bristlenose pleco: adult 125 mm (4.9 in); lives bottom and glass
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from neon, bronzecory, bristlenose]
- ideal and limit: whole numbers of neon tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A05
Tank: 20 gal high, 24 x 12 x 16 in (61 x 30 x 41 cm, L x D x H); 20 gal / 76 L; floor 288 sq in (2.00 sq ft).
Setting: Fresh water; water 24 °C (75 °F).
Animals:
- 10 Neon tetras: adult 38 mm (1.5 in); lives water column  <- the counted species
- 6 Bronze corydoras: adult 65 mm (2.6 in); lives bottom
- 1 Bristlenose pleco: adult 125 mm (4.9 in); lives bottom and glass
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- ideal and limit: whole numbers of neon tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
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
- 12 Bronze corydoras: adult 65 mm (2.6 in); lives bottom
- 6 Otocinclus: adult 33 mm (1.3 in); lives glass, leaves, bottom
- 1 Bristlenose pleco: adult 125 mm (4.9 in); lives bottom and glass
- 2 Pearl gouramis (1 male, 1 female): adult 120 mm (4.7 in) male, 110 mm (4.3 in) female; lives near the surface
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from neon, cardinal, rummynose, bronzecory, oto, bristlenose, gourami]
- ideal and limit: whole numbers of neon tetras (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

### A11
Tank: 75 gal, 48 x 18 x 21 in (122 x 46 x 53 cm, L x D x H); 79 gal / 297 L; floor 864 sq in (6.00 sq ft).
Setting: Fresh water; water 26 °C (79 °F).
Animals:
- 8 Boeseman's rainbowfish (3 males, 5 females): adult 108 mm (4.3 in) male, 80 mm (3.1 in) female; lives water column  <- the counted species
- 12 Cherry barbs (4 males, 8 females): adult 55 mm (2.2 in) male, 50 mm (2.0 in) female; lives water column
- 10 Kuhli loaches: adult 100 mm (3.9 in); lives bottom
- 4 Siamese algae eaters: adult 150 mm (5.9 in); lives bottom and surfaces
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from boesemani, cherrybarb, kuhli, sae]
- ideal and limit: whole numbers of boeseman's rainbowfish (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
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
- 8 Bronze corydoras: adult 65 mm (2.6 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from platy, molly, swordtail, bronzecory]
- ideal and limit: whole numbers of platies (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
- confidence: low | medium | high; note: free text (optional)

## Answer template (fill in, keep the shape)

```json
{
 "survey": "v4",
 "build": "c7cb52e6",
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
   "confidence": "",
   "note": ""
  },
  "A05": {
   "verdict": "",
   "ideal": null,
   "limit": null,
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
   "confidence": "",
   "note": ""
  },
  "A11": {
   "verdict": "",
   "change": "",
   "ideal": null,
   "limit": null,
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
   "confidence": "",
   "note": ""
  }
 }
}
```


---

# Stocking and compatibility survey v4 (build c7cb52e6) — module B: Freshwater specialist

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
- 8 Sterba's corydoras: adult 65 mm (2.6 in); lives bottom
Answer:
- verdict: one of ideal | caution | problems | unworkable | skip
- change: one of nothing | fewer | bigger | drop | ratio | notroom | other; with fewer or drop also changeSp: [species ids from discus, cardinal, sterbai]
- together: yes | caution | no; if not yes, reasons: [any of eat | nip | aggression | temperature | chemistry | habitat | food | disease | breeding | other]; problem: [species ids]
- ideal and limit: whole numbers of discus (the others held as shown; 0 allowed) — or countStatus: cant-say | no-valid-count
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
 "build": "c7cb52e6",
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


---

# Stocking and compatibility survey v4 (build c7cb52e6) — module C: Saltwater

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
 "build": "c7cb52e6",
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


---

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
