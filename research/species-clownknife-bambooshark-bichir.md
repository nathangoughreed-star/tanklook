# Clown knifefish, brownbanded bamboo shark, Senegal bichir: care data (2026-11-24)
Added so main's CI passes. Pages read by a fetch tool; "est" = our estimate, not a source.
- **Clown knifefish** (Chitala ornata), https://www.seriouslyfish.com/species/chitala-ornata/: Asia (Mae Klong, Chao Phraya, Mekong); tank "at least 2 m long" (78.7 in; width/gal not stated); 20-28 C; pH 6.0-8.0, 2-15 dGH; 1000 mm SL max; "difficult" (expert); relatively peaceful only with fish too big to eat; fine alone. Prey 200 mm = est (1/3 body). Care minimum 720 L = est (2 m x 60 x 60 cm); no tankmin.json row (that file is generated).
- **Brownbanded bamboo shark** (Chiloscyllium punctatum): NOT in the species list for now (row removed from species.json; art kept in src/data/fishart/bambooshark.anatomy.json). Why: FishBase gives Indo-West Pacific, max 132 cm TL, but retailer minimums disagree (100 gal thatpetplace.com, 180, 300+, 360 liveaquaria 645570, 550 reeflex), no footprint figures, no group data; and with tl 900 mm the water-depth rule (a tank is not assessed when the water is shallower than the animal is long) fails for every catalogue tank (deepest water about 540-600 mm), so the min-tank sweep in test/minimum.test.ts finds no tank. Re-add once the depth rule decision exists and a footprint is sourced.
- **Senegal bichir** (Polypterus senegalus), https://www.seriouslyfish.com/species/polypterus-senegalus/: Africa; 150 x 60 x 60 cm (~143 gal, 540 L); 24-28 C; pH 6.2-7.8, 5-20 dGH; 500 mm SL; hardy; eats tankmates that fit its mouth (200 mm est).
- Variants (neonb, oscarb ...): alternate models, excluded from SPECIES, listed in ALL_SPECIES (src/data/variants.ts).

## Status
Superseded by R150 below. Was: held, not in the catalogue (model-only row, left out of SPECIES by the 4aadb581 fix; still drawn on the review page): the onboarding checklist (test/species-onboarding.test.ts) also wants a gallery picture, model-versions record, bodymass, HOVER, space-factor, NEEDS, demand row and a tankmin footprint, which the fish lane makes. To release one: write those, make it a catalogue row, and paste its rows from below (bambooshark is not sourced well enough, see above).

## Rows ready to paste (clownknife + bichirb: care.ts / groups.ts / climatedata.ts / waterchem.ts / origin.json)
```
  // Clown knife, Senegal bichir (2026-11-24, Seriously Fish / FishBase / retailer care sheets; sources in research/species-clownknife-bambooshark-bichir.md). Prey sizes are estimates.
  clownknife: A(3, 720, 1, [22, 28], { prey: { mm: 200 } }), bichirb: A(2, 540, 0, [24, 28], { prey: { mm: 200 } }),
  clownknife: { ok: [22,28], tol: [20,30], est: true }, bichirb: { ok: [24,28], tol: [22,30], est: true },
  clownknife: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Keep one: adults are territorial with their own kind and look-alikes when space is short, and it eats any fish that fits its mouth' }, max: 1, flow: 'medium', zone: 'all', minLengthMm: 2000, appeal: ['size', 'showpiece', 'predator', 'oddball'] },
  bichirb: { bands: { ok: 1, good: 1, great: 1 }, msg: { ok: 'Fine alone; eats any tankmate that fits its mouth' }, flow: 'low', zone: 'bottom', minLengthMm: 1500, appeal: ['oddball', 'personality', 'predator', 'hands-on'] },
 "clownknife": {"c": ["asia"], "r": "Mae Klong, Chao Phraya and Mekong basins: Thailand, Laos, Cambodia, Vietnam", "s": "Seriously Fish"},
 "bichirb": {"c": ["africa"], "r": "Shallow swamps, marshes and lagoons across tropical Africa, Senegal to the Nile", "s": "Seriously Fish"},
  clownknife: { ph: [6.0, 8.0], gh: [2, 15] }, bichirb: { ph: [6.2, 7.8], gh: [5, 20] },
```

## R150 (2026-11-25): onboarded, all three
All three are catalogue species now (listed without ?photoart; fishLive.json names each as its own look so the build-B images load). Sources and figures: the provenance rules in src/data/provenance.ts and the side-session notes (onboard-3-research.md). Summary:
- **bichirb** (id kept: no alias mechanism, and the art, sheets and specs are all keyed bichirb): 13 in (mean of captive sizes); floor 166 x 60.5 cm (Seriously Fish 150 x 60 and Practical Fishkeeping 6 x 2 ft, averaged); 117.5 gal (mean of 55, 90, 120, 143, 180); lid required; prey 110 mm (est); FishBase Bayesian LW (agrees with the mean of its 4 TL rows).
- **clownknife**: 36 in (Furry Critter "routinely exceed three feet"); 2 m long (Seriously Fish) x 24 in (the standard 200-240 gal width); 200 gal (Furry Critter); lid; prey 450 mm (half its length, a knifefish care page); FishBase LW row (one 88 cm fish).
- **bambooshark**: 37 in (mean of 30, 36, 41, 41 in); floor 82 x 41 in (That Pet Place: width at least its length, length 2-3x); 227 gal (mean of 180, 200, 300; LiveAquaria 360 unread); FishBase Bayesian LW (no rows exist); temperature 72-78 F rests on an unconfirmed retailer snippet (est). No stock tank is 41 in deep, so none passes: test/minimum.test.ts lists it as BEYOND_CATALOGUE.
- Water depth: Nathan 2026-11-25 removed the rule that marked a tank "not assessed" when its water is shallower than the fish is long (src/scene/tankMin.ts measureLines).
- Sex: bichir males have a thicker anal fin, knifefish dimorphism unreported, shark males have claspers: one model each, no sex-ratio rule.
