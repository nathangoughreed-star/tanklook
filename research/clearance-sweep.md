# Turning-clearance sweep (lane MA, 2026-10-21)

Decision 3 (research/tank-minimum-first-principles.md): every species gets a turning-clearance DIAGNOSTIC, shortest floor side >=
adult length (`Species.tl`), not a gate until this sweep and the extreme shapes show it is defensible. "Smallest passing tank" = the
smallest catalogue tank by volume (aquariums for water / both species, terrariums for land species) whose gate percent today is within
`MIN_SLACK_PCT` (111 %). Shortest side = `floorOf` widthMm (the bounding box's shorter side; for a bowl its full diameter, not its
narrower floor). Numbers from test/minimum.test.ts (`GEN_CLEARANCE=1 npx vitest run test/minimum.test.ts`). Inches throughout.

## Summary

- 84 species; 0 would fail clearance in the smallest tank the gate passes today; 0 of those are flagged as likely false positives (elongated or snake bodies that bend or coil to turn).
- Unflagged failures (would need a look before clearance becomes a gate): none.
- 36 x 20 in tray, 2 in of water: 0 species pass the gate today but fail clearance.
- 48 x 12 x 12 in long: 0 species pass the gate today but fail clearance.
- 18 in cube: 0 species pass the gate today but fail clearance.
- 12 in bowl: 0 species pass the gate today but fail clearance.
- Verdict: see "Reading" at the end.

## All species, worst clearance first

| Species | Adult length in | Smallest passing tank | Shortest side in | Side / length | Flag | 36 x 20 in tray, 2 in of water: gate % / clear | 48 x 12 x 12 in long: gate % / clear | 18 in cube: gate % / clear | 12 in bowl: gate % / clear |
|---|---|---|---|---|---|---|---|---|---|
| Ball python (ballpython) | 47.2 | none passes | - | - | snake: coils, likely false positive | 1430 / **no** | 331 / **no** | 431 / **no** | 3631 / **no** |
| Clown loach (clownloach) | 11.8 | 125 gal | 17.4 | 1.47 |  | 424 / yes | 215 / yes | 383 / yes | 3227 / **no** |
| Oscar (oscar) | 11.8 | 72 gal bowfront | 17.5 | 1.48 |  | 1144 / yes | 265 / yes | 314 / yes | 2129 / **no** |
| Brown anole (brownanole) | 7.1 | Reptizoo Glass Terrarium 20 gal | 11.6 | 1.64 | long tail (card aspect < 0.2): bends to turn, likely false positive | 254 / yes | 59 / yes | 131 / yes | 473 / yes |
| Livingstone's cichlid (livingstonii) | 9.8 | 125 gal | 17.4 | 1.76 |  | 848 / yes | 196 / yes | 328 / yes | 1577 / **no** |
| Comet goldfish (comet) | 9.8 | 125 gal | 17.4 | 1.76 |  | 636 / yes | 147 / yes | 328 / yes | 1183 / **no** |
| Blue tang (bluetang) | 9.8 | 125 gal | 17.4 | 1.76 |  | 1208 / yes | 280 / yes | 331 / yes | 2247 / **no** |
| Axolotl (axolotl) | 9.1 | 30 gal breeder | 17.5 | 1.93 |  | 117 / yes | 93 / yes | 165 / yes | 1392 / yes |
| Leopard gecko (leopardgecko) | 8.7 | Wide terrestrial | 18.0 | 2.08 | long tail (card aspect < 0.2): bends to turn, likely false positive | 477 / yes | 117 / yes | 209 / yes | 1760 / yes |
| Discus (discus) | 5.9 | 55 gal | 12.8 | 2.17 |  | 530 / yes | 123 / yes | 263 / yes | 993 / yes |
| Crested gecko (flame) (crestedgecko) | 7.9 | Exo Terra Glass Terrarium Medium/Tall 24x18x24 (PT2612) | 17.6 | 2.23 | long tail (card aspect < 0.2): bends to turn, likely false positive | 646 / yes | 149 / yes | 177 / yes | 1202 / yes |
| Crested gecko (harlequin) (crestedharlequin) | 7.9 | Exo Terra Glass Terrarium Medium/Tall 24x18x24 (PT2612) | 17.6 | 2.23 | long tail (card aspect < 0.2): bends to turn, likely false positive | 646 / yes | 149 / yes | 177 / yes | 1202 / yes |
| Chinese fire-bellied newt (firenewt) | 3.5 | 5.5 gal | 8.1 | 2.28 |  | 70 / yes | 37 / yes | 98 / yes | 187 / yes |
| Betta (betta) | 2.6 | 2.5 gal | 5.9 | 2.32 |  | 34 / yes | 25 / yes | 66 / yes | 161 / yes |
| Malawi synodontis (syno) | 7.5 | 60 gal breeder | 18.0 | 2.41 |  | 212 / yes | 144 / yes | 255 / yes | 2152 / yes |
| Yellow tang (yellowtang) | 7.1 | 72 gal bowfront | 17.5 | 2.47 |  | 964 / yes | 223 / yes | 264 / yes | 1794 / yes |
| Peacock cichlid (peacock) | 5.1 | 55 gal | 12.8 | 2.50 |  | 424 / yes | 98 / yes | 263 / yes | 861 / yes |
| Bristlenose pleco (bristlenose) | 4.9 | 20 gal long | 12.8 | 2.59 |  | 85 / yes | 72 / yes | 128 / yes | 1076 / yes |
| Fancy goldfish (goldfish) | 6.3 | 30 gal breeder | 17.5 | 2.78 |  | 159 / yes | 74 / yes | 197 / yes | 403 / yes |
| Kadango (red-fin) cichlid (kadango) | 5.9 | 125 gal | 17.4 | 2.94 |  | 424 / yes | 123 / yes | 328 / yes | 1490 / yes |
| Angelfish (angel) | 5.9 | 30 gal breeder | 17.5 | 2.97 |  | 424 / yes | 98 / yes | 219 / yes | 861 / yes |
| Siamese algae eater (sae) | 5.9 | 30 gal breeder | 17.5 | 2.97 |  | 117 / yes | 93 / yes | 165 / yes | 1392 / yes |
| Ocellaris clownfish (ocellaris) | 3.9 | 15 gal | 12.1 | 3.08 |  | 159 / yes | 49 / yes | 131 / yes | 403 / yes |
| Kuhli loach (kuhli) | 3.9 | 20 gal long | 12.8 | 3.24 | eel-shaped: bends to turn, likely false positive | 85 / yes | 72 / yes | 128 / yes | 1076 / yes |
| Green anole (greenanole) | 7.1 | Deep terrarium | 24.0 | 3.39 | long tail (card aspect < 0.2): bends to turn, likely false positive | 381 / yes | 88 / yes | 131 / yes | 710 / yes |
| Green anole (brown phase) (greenanolebrown) | 7.1 | Deep terrarium | 24.0 | 3.39 | long tail (card aspect < 0.2): bends to turn, likely false positive | 381 / yes | 88 / yes | 131 / yes | 710 / yes |
| Mystery snail (mystery) | 2.2 | 5 gal | 7.7 | 3.55 |  | 81 / yes | 19 / yes | 22 / yes | 150 / yes |
| African dwarf frog (adf) | 2.2 | 5 gal | 7.7 | 3.55 |  | 19 / yes | 16 / yes | 29 / yes | 242 / yes |
| Kribensis (kribensis) | 3.5 | 20 gal long | 12.8 | 3.60 |  | 85 / yes | 72 / yes | 128 / yes | 1076 / yes |
| Yellow watchman goby (watchman) | 3.5 | 20 gal long | 12.8 | 3.60 |  | 79 / yes | 67 / yes | 120 / yes | 1009 / yes |
| Cockatoo dwarf cichlid (cockatoo) | 3.3 | 15 gal | 12.1 | 3.62 |  | 64 / yes | 54 / yes | 96 / yes | 807 / yes |
| Swordtail (swordtail) | 4.7 | 30 gal breeder | 17.5 | 3.71 |  | 186 / yes | 97 / yes | 175 / yes | 1452 / yes |
| Pearl gourami (gourami) | 4.7 | 30 gal breeder | 17.5 | 3.71 |  | 186 / yes | 74 / yes | 197 / yes | 835 / yes |
| Black molly (molly) | 3.3 | 20 gal long | 12.8 | 3.81 |  | 170 / yes | 62 / yes | 164 / yes | 430 / yes |
| Blue-nosed mbuna (labeo) | 4.7 | 60 gal breeder | 18.0 | 3.82 |  | 265 / yes | 166 / yes | 294 / yes | 2483 / yes |
| Dwarf gourami (dwarfgourami) | 3.1 | 15 gal | 12.1 | 3.85 |  | 102 / yes | 49 / yes | 131 / yes | 484 / yes |
| Firefish goby (firefish) | 3.0 | 15 gal | 12.1 | 4.11 |  | 159 / yes | 49 / yes | 131 / yes | 403 / yes |
| Golden mbuna (auratus) | 4.3 | 60 gal breeder | 18.0 | 4.16 |  | 265 / yes | 166 / yes | 294 / yes | 2483 / yes |
| Banggai cardinalfish (banggai) | 2.8 | 15 gal | 12.1 | 4.40 |  | 244 / yes | 56 / yes | 131 / yes | 577 / yes |
| Boeseman's rainbowfish (boesemani) | 3.9 | 30 gal breeder | 17.5 | 4.45 |  | 186 / yes | 74 / yes | 197 / yes | 835 / yes |
| Yellow lab cichlid (yellowlab) | 3.9 | 30 gal breeder | 17.5 | 4.45 |  | 318 / yes | 74 / yes | 197 / yes | 704 / yes |
| Blue-green chromis (chromis) | 3.9 | 30 gal breeder | 17.5 | 4.45 |  | 195 / yes | 74 / yes | 197 / yes | 865 / yes |
| Honey gourami (honeygourami) | 1.8 | 5.5 gal | 8.1 | 4.56 |  | 68 / yes | 37 / yes | 98 / yes | 323 / yes |
| Amano shrimp (amano) | 1.8 | 5.5 gal | 8.1 | 4.56 |  | 85 / yes | 37 / yes | 98 / yes | 215 / yes |
| White's tree frog (treefrog) | 3.9 | Cube terrarium | 18.0 | 4.57 |  | 386 / yes | 89 / yes | 106 / yes | 719 / yes |
| Dogtooth cichlid (afra) | 3.9 | 60 gal breeder | 18.0 | 4.58 |  | 265 / yes | 166 / yes | 294 / yes | 2483 / yes |
| Tiger barb (tigerbarb) | 2.8 | 20 gal long | 12.8 | 4.63 |  | 170 / yes | 62 / yes | 164 / yes | 430 / yes |
| Bronze corydoras (bronzecory) | 2.6 | 20 gal long | 12.8 | 4.98 |  | 85 / yes | 72 / yes | 128 / yes | 1076 / yes |
| White cloud mountain minnow (whitecloud) | 1.6 | 5.5 gal | 8.1 | 5.13 |  | 70 / yes | 37 / yes | 98 / yes | 187 / yes |
| Otocinclus (oto) | 1.6 | 5.5 gal | 8.1 | 5.13 |  | 85 / yes | 37 / yes | 98 / yes | 215 / yes |
| German blue ram (gbr) | 2.4 | 15 gal | 12.1 | 5.13 |  | 64 / yes | 54 / yes | 96 / yes | 807 / yes |
| Reticulated hillstream loach (hillstream) | 2.4 | 15 gal | 12.1 | 5.13 |  | 64 / yes | 54 / yes | 96 / yes | 807 / yes |
| Panda corydoras (pandacory) | 2.0 | 10 gal | 10.1 | 5.14 |  | 43 / yes | 37 / yes | 65 / yes | 551 / yes |
| Bolivian ram (bolivianram) | 3.1 | 30 gal breeder | 17.5 | 5.56 |  | 117 / yes | 93 / yes | 165 / yes | 1392 / yes |
| Neon tetra (neon) | 1.4 | 5.5 gal | 8.1 | 5.86 |  | 85 / yes | 37 / yes | 98 / yes | 215 / yes |
| Skunk cleaner shrimp (cleanershrimp) | 2.2 | 20 gal long | 12.8 | 5.89 |  | 79 / yes | 67 / yes | 120 / yes | 1009 / yes |
| Royal gramma (royalgramma) | 3.0 | 30 gal breeder | 17.5 | 5.93 |  | 122 / yes | 96 / yes | 171 / yes | 1441 / yes |
| Six-line wrasse (sixline) | 3.0 | 30 gal breeder | 17.5 | 5.93 |  | 441 / yes | 102 / yes | 197 / yes | 883 / yes |
| Zebra danio (danio) | 2.0 | 15 gal | 12.1 | 6.16 |  | 85 / yes | 49 / yes | 131 / yes | 249 / yes |
| Cherry barb (cherrybarb) | 2.0 | 15 gal | 12.1 | 6.16 |  | 127 / yes | 49 / yes | 131 / yes | 323 / yes |
| Mexican turbo snail (turbo) | 2.0 | 15 gal | 12.1 | 6.16 |  | 85 / yes | 49 / yes | 131 / yes | 249 / yes |
| Rummy-nose tetra (rummynose) | 2.0 | 20 gal long | 12.8 | 6.48 |  | 127 / yes | 62 / yes | 164 / yes | 323 / yes |
| Pea puffer (peapuffer) | 1.2 | 5 gal | 7.7 | 6.50 |  | 42 / yes | 25 / yes | 66 / yes | 124 / yes |
| Cherry shrimp (cherryshrimp) | 1.2 | 5 gal | 7.7 | 6.50 |  | 44 / yes | 33 / yes | 88 / yes | 166 / yes |
| Demasoni cichlid (demasoni) | 2.8 | 60 gal breeder | 18.0 | 6.54 |  | 212 / yes | 144 / yes | 255 / yes | 2152 / yes |
| Coral beauty angelfish (coralbeauty) | 3.5 | 120 gal | 23.3 | 6.57 |  | 281 / yes | 172 / yes | 305 / yes | 2572 / yes |
| Dyeing dart frog (dartfrog) | 1.8 | Cube-ish terrarium | 12.0 | 6.78 |  | 127 / yes | 36 / yes | 64 / yes | 538 / yes |
| Chaco golden knee tarantula (chacogoldenknee) | 1.8 | Cube-ish terrarium | 12.0 | 6.78 |  | 181 / yes | 51 / yes | 91 / yes | 766 / yes |
| Guppy (guppy) | 1.2 | 5.5 gal | 8.1 | 6.83 |  | 68 / yes | 37 / yes | 98 / yes | 323 / yes |
| Cardinal tetra (cardinal) | 1.8 | 15 gal | 12.1 | 6.84 |  | 127 / yes | 49 / yes | 131 / yes | 323 / yes |
| Harlequin rasbora (harlequin) | 1.8 | 15 gal | 12.1 | 6.84 |  | 85 / yes | 49 / yes | 131 / yes | 249 / yes |
| Fire-bellied toad (firetoad) | 1.8 | 8 gal cube | 13.2 | 7.44 |  | 35 / yes | 30 / yes | 53 / yes | 444 / yes |
| Platy (platy) | 1.6 | 15 gal | 12.1 | 7.70 |  | 127 / yes | 49 / yes | 131 / yes | 323 / yes |
| Nerite snail (zebra) (nerite) | 1.0 | 5 gal | 7.7 | 7.80 |  | 42 / yes | 25 / yes | 66 / yes | 124 / yes |
| Malaysian trumpet snail (trumpet) | 1.0 | 5 gal | 7.7 | 7.80 |  | 21 / yes | 18 / yes | 32 / yes | 269 / yes |
| Celestial pearl danio (cpd) | 1.0 | 5.5 gal | 8.1 | 8.20 |  | 85 / yes | 37 / yes | 98 / yes | 215 / yes |
| Pygmy corydoras (pygmycory) | 1.0 | 5.5 gal | 8.1 | 8.20 |  | 64 / yes | 37 / yes | 98 / yes | 187 / yes |
| Blue-leg hermit crab (hermit) | 1.2 | 10 gal | 10.1 | 8.57 |  | 42 / yes | 36 / yes | 64 / yes | 538 / yes |
| Marbled hatchetfish (hatchet) | 1.4 | 15 gal | 12.1 | 8.80 |  | 102 / yes | 49 / yes | 131 / yes | 484 / yes |
| Ramshorn snail (ramshorn) | 0.8 | 5 gal | 7.7 | 9.75 |  | 44 / yes | 33 / yes | 88 / yes | 166 / yes |
| Mandarin dragonet (mandarin) | 2.4 | 120 gal | 23.3 | 9.85 |  | 281 / yes | 172 / yes | 305 / yes | 2572 / yes |
| Ember tetra (ember) | 0.8 | 5.5 gal | 8.1 | 10.25 |  | 64 / yes | 37 / yes | 98 / yes | 187 / yes |
| Chili rasbora (chili) | 0.7 | 5 gal | 7.7 | 10.83 |  | 44 / yes | 33 / yes | 88 / yes | 166 / yes |
| Regal jumping spider (regaljumper) | 0.5 | Cube terrarium | 12.0 | 25.42 |  | 27 / yes | 21 / yes | 55 / yes | 104 / yes |

## Reading

- Clearance never binds where the gate already passes: the worst species in its smallest passing tank (clown loach, oscar) still has about 1.5x its adult length front to back. In the four extreme shapes no species passes the gate yet fails clearance. As a GATE it would add nothing today; keep it a diagnostic (Decision 3), useful only once volume stops failing species (Decision 2, lane MM) and shallow or odd shapes can start passing.
- The likely false positives are as predicted: the ball python (a coiling snake, 47 in, fails clearance everywhere) and long-tailed or eel-shaped bodies (kuhli, the geckos and anoles, whose card length is mostly tail). If clearance ever becomes a gate these need body length without tail, or an exemption.
- The bounding box overstates bowfronts and bowls: the shortest side of a bowfront here is its centre depth (the ends are 3-6 in shallower), and of a bowl its full diameter, not its narrower floor. A real clearance check should use the narrowest usable chord.
- Side finding (not clearance): the ball python passes NO catalogue terrarium, not even the usual 4 x 2 x 2 ft (48 x 24 x 24 in) enclosure, because its 450 L figure is spread over 50 cm (19.7 in) of "water" by `refDepthCm` and asks for about 1395 sq in of floor (the 4 x 2 ft has 1152). The gallon figure of a land animal is an enclosure size, not water at depth: that conversion is exactly what Decision 5 warns about (derive it from the reference enclosure, mark it derived (est)). For lane MM.
- Side finding: the kuhli passes the 36 x 20 in tray at 2 in of water (85 %), which Decision 3 says must read "not assessed"; see the it.todo in test/minimum.test.ts.
