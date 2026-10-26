# Water-chemistry audit: preferred + acceptable ranges

Generated 2026-10-26 (branch s225). 61 freshwater species with a pH record, 1830 pairs, graded by the real engine
(whysAnimal both ways, compatibility reasons only; size and expertise ignored), so a pair already red for predation, aggression or
temperature stays red whatever its water.

Model (Nathan 2026-10-26): preferred ranges share enough = green; only the documented acceptable ranges do = amber; not even those = red.
No range is widened automatically: a species without an acceptable range is held to its preferred one. Only the kuhli has one so far.

| Kuhli record | pH | GH | Totals |
|---|---|---|---|
| Original (before d7b6c89) | 5.5-6.5 | 1-6 | green 501, amber 410, red 919 |
| Live main (d7b6c89) | 5.5-7.5 | 1-10 | green 509, amber 413, red 908 |
| This model | preferred 5.5-7, acceptable 5.5-7.5 | preferred 1-6, acceptable 1-10 | green 505, amber 417, red 908 |

## 1. Every pair whose grade changes (original -> live main -> this model)

| Pair | Original | Live main | This model | This model's reasons |
|---|---|---|---|---|
| Celestial pearl danio + Kuhli loach | red | amber | **amber** | temperature: shared range 23–25 °C, a narrow margin (2 °C or less), not an incompatibility; temperature: shared range 23–25 °C, a narrow margin (2 °C or less), not an incompatibility |
| Guppy + Kuhli loach | red | green | **amber** | water chemistry: prefers pH 7.0-8.3, it 5.5-7.0; both accept 7.0-7.5, a compromise (Kuhli loach); water hardness: prefers GH 8-25, it 1-6; both accept 8-10, a compromise (Kuhli loach); water chemistry: prefers pH 5.5-7.0, it 7.0-8.3; both accept 7.0-7.5, a compromise (Guppy); water hardness: prefers GH 1-6, it 8-25; both accept 8-10, a compromise (Guppy) |
| Pygmy corydoras + Kuhli loach | red | green | **green** |  |
| Kuhli loach + Siamese algae eater | red | green | **green** |  |
| Kuhli loach + Cherry shrimp | red | amber | **amber** | temperature: shared range 23–25 °C, a narrow margin (2 °C or less), not an incompatibility; temperature: shared range 23–25 °C, a narrow margin (2 °C or less), not an incompatibility |
| Kuhli loach + Nerite snail (zebra) | red | green | **amber** | water chemistry: prefers pH 5.5-7.0, it 7.0-8.5; both accept 7.0-7.5, a compromise (Nerite snail (zebra)); water hardness: prefers GH 1-6, it 6-18; both accept 6-10, a compromise (Nerite snail (zebra)); water chemistry: prefers pH 7.0-8.5, it 5.5-7.0; both accept 7.0-7.5, a compromise (Kuhli loach); water hardness: prefers GH 6-18, it 1-6; both accept 6-10, a compromise (Kuhli loach) |
| Kuhli loach + Mystery snail | red | green | **amber** | water hardness: prefers GH 1-6, it 6-18; both accept 6-10, a compromise (Mystery snail); water hardness: prefers GH 6-18, it 1-6; both accept 6-10, a compromise (Kuhli loach) |
| Kuhli loach + Ramshorn snail | red | green | **amber** | water chemistry: prefers pH 5.5-7.0, it 7.0-8.0; both accept 7.0-7.5, a compromise (Ramshorn snail); water hardness: prefers GH 1-6, it 6-18; both accept 6-10, a compromise (Ramshorn snail); water chemistry: prefers pH 7.0-8.0, it 5.5-7.0; both accept 7.0-7.5, a compromise (Kuhli loach); water hardness: prefers GH 6-18, it 1-6; both accept 6-10, a compromise (Kuhli loach) |
| Kuhli loach + Malaysian trumpet snail | red | green | **green** |  |
| Kuhli loach + African dwarf frog | red | green | **green** |  |
| Kuhli loach + Fire-bellied toad | red | amber | **amber** | temperature: shared range 23–24 °C, a narrow margin (2 °C or less), not an incompatibility; temperature: shared range 23–24 °C, a narrow margin (2 °C or less), not an incompatibility |

## 2. Snail pairs still green under this model

Shared preferred pH and GH for each green pair with a snail. "Gap" = the shared preferred range cannot meet the snail need Nathan quoted
(Aquarium Co-Op: mystery pH 7.2 or higher, GH 8 or higher; nerite pH above 7). Ramshorn and trumpet snails have no such figure yet.

| Snail | With | Shared pH | Shared GH | Gap |
|---|---|---|---|---|
| Malaysian trumpet snail | African dwarf frog | 6.5-7.8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Amano shrimp | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Betta | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Black molly | 7.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Bolivian ram | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Bristlenose pleco | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Bronze corydoras | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Cardinal tetra | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Celestial pearl danio | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Cherry barb | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Cherry shrimp | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Chili rasbora | 6.5-7 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Dwarf gourami | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Dwarf pencilfish | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Ember tetra | 6.5-7 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Fancy goldfish | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Fire-bellied toad | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Guppy | 7-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Harlequin rasbora | 6.5-7 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Honey gourami | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Kribensis | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Kuhli loach | 6.5-7 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Malawi synodontis | 7.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Marbled hatchetfish | 6.5-7 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Neon tetra | 6.5-7 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Otocinclus | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Panda corydoras | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Pearl gourami | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Platy | 7-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Pygmy corydoras | 6.5-7.4 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Reticulated hillstream loach | 6.5-7.5 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Rummy-nose tetra | 6.5-7 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Siamese algae eater | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Sterba's corydoras | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Swordtail | 7-8 | no GH record (Malaysian trumpet snail) | - |
| Malaysian trumpet snail | Zebra danio | 6.5-8 | no GH record (Malaysian trumpet snail) | - |
| Mystery snail | African dwarf frog | 6.5-7.8 | no GH record (African dwarf frog) | - |
| Mystery snail | Amano shrimp | 6.5-8 | 6-15 | - |
| Mystery snail | Betta | 6.5-7.5 | no GH record (Betta) | - |
| Mystery snail | Black molly | 7.5-8 | 10-18 | - |
| Mystery snail | Bolivian ram | 6.5-7.5 | no GH record (Bolivian ram) | - |
| Mystery snail | Bristlenose pleco | 6.5-8 | no GH record (Bristlenose pleco) | - |
| Mystery snail | Bronze corydoras | 6.5-8 | no GH record (Bronze corydoras) | - |
| Mystery snail | Cardinal tetra | 6.5-7.5 | 6-8 | - |
| Mystery snail | Celestial pearl danio | 6.5-7.5 | no GH record (Celestial pearl danio) | - |
| Mystery snail | Cherry barb | 6.5-8 | no GH record (Cherry barb) | - |
| Mystery snail | Cherry shrimp | 6.5-8 | 6-14 | - |
| Mystery snail | Chili rasbora | 6.5-7 | 6-8 | pH tops out at 7 |
| Mystery snail | Dwarf gourami | 6.5-7.5 | no GH record (Dwarf gourami) | - |
| Mystery snail | Dwarf pencilfish | 6.5-7.5 | 6-15 | - |
| Mystery snail | Ember tetra | 6.5-7 | 6-10 | pH tops out at 7 |
| Mystery snail | Guppy | 7-8 | 8-18 | - |
| Mystery snail | Harlequin rasbora | 6.5-7 | 6-12 | pH tops out at 7 |
| Mystery snail | Honey gourami | 6.5-7.5 | no GH record (Honey gourami) | - |
| Mystery snail | Kribensis | 6.5-7.5 | no GH record (Kribensis) | - |
| Mystery snail | Malawi synodontis | 7.5-8 | 10-18 | - |
| Mystery snail | Marbled hatchetfish | 6.5-7 | 6-10 | pH tops out at 7 |
| Mystery snail | Neon tetra | 6.5-7 | 6-10 | pH tops out at 7 |
| Mystery snail | Otocinclus | 6.5-7.5 | no GH record (Otocinclus) | - |
| Mystery snail | Panda corydoras | 6.5-7.5 | no GH record (Panda corydoras) | - |
| Mystery snail | Platy | 7-8 | 9-18 | - |
| Mystery snail | Pygmy corydoras | 6.5-7.4 | no GH record (Pygmy corydoras) | - |
| Mystery snail | Reticulated hillstream loach | 6.5-7.5 | no GH record (Reticulated hillstream loach) | - |
| Mystery snail | Rummy-nose tetra | 6.5-7 | 6-10 | pH tops out at 7 |
| Mystery snail | Siamese algae eater | 6.5-8 | no GH record (Siamese algae eater) | - |
| Mystery snail | Sterba's corydoras | 6.5-8 | 6-18 | - |
| Mystery snail | Swordtail | 7-8 | 9-18 | - |
| Mystery snail | Zebra danio | 6.5-8 | no GH record (Zebra danio) | - |
| Nerite snail (zebra) | African dwarf frog | 7-7.8 | no GH record (African dwarf frog) | - |
| Nerite snail (zebra) | Amano shrimp | 7-8 | 6-15 | - |
| Nerite snail (zebra) | Betta | 7-7.5 | no GH record (Betta) | - |
| Nerite snail (zebra) | Black molly | 7.5-8.5 | 10-18 | - |
| Nerite snail (zebra) | Bolivian ram | 7-7.5 | no GH record (Bolivian ram) | - |
| Nerite snail (zebra) | Bristlenose pleco | 7-8 | no GH record (Bristlenose pleco) | - |
| Nerite snail (zebra) | Bronze corydoras | 7-8 | no GH record (Bronze corydoras) | - |
| Nerite snail (zebra) | Cardinal tetra | 7-7.5 | 6-8 | - |
| Nerite snail (zebra) | Celestial pearl danio | 7-7.5 | no GH record (Celestial pearl danio) | - |
| Nerite snail (zebra) | Cherry barb | 7-8 | no GH record (Cherry barb) | - |
| Nerite snail (zebra) | Cherry shrimp | 7-8 | 6-14 | - |
| Nerite snail (zebra) | Dwarf gourami | 7-7.5 | no GH record (Dwarf gourami) | - |
| Nerite snail (zebra) | Dwarf pencilfish | 7-7.5 | 6-15 | - |
| Nerite snail (zebra) | Guppy | 7-8.3 | 8-18 | - |
| Nerite snail (zebra) | Honey gourami | 7-7.5 | no GH record (Honey gourami) | - |
| Nerite snail (zebra) | Kribensis | 7-7.5 | no GH record (Kribensis) | - |
| Nerite snail (zebra) | Malawi synodontis | 7.5-8.5 | 10-18 | - |
| Nerite snail (zebra) | Otocinclus | 7-7.5 | no GH record (Otocinclus) | - |
| Nerite snail (zebra) | Panda corydoras | 7-7.5 | no GH record (Panda corydoras) | - |
| Nerite snail (zebra) | Platy | 7-8.2 | 9-18 | - |
| Nerite snail (zebra) | Pygmy corydoras | 7-7.4 | no GH record (Pygmy corydoras) | - |
| Nerite snail (zebra) | Reticulated hillstream loach | 7-7.5 | no GH record (Reticulated hillstream loach) | - |
| Nerite snail (zebra) | Siamese algae eater | 7-8 | no GH record (Siamese algae eater) | - |
| Nerite snail (zebra) | Sterba's corydoras | 7-8 | 6-18 | - |
| Nerite snail (zebra) | Swordtail | 7-8 | 9-18 | - |
| Nerite snail (zebra) | Zebra danio | 7-8 | no GH record (Zebra danio) | - |
| Ramshorn snail | African dwarf frog | 7-7.8 | no GH record (African dwarf frog) | - |
| Ramshorn snail | Amano shrimp | 7-8 | 6-15 | - |
| Ramshorn snail | Betta | 7-7.5 | no GH record (Betta) | - |
| Ramshorn snail | Black molly | 7.5-8 | 10-18 | - |
| Ramshorn snail | Bolivian ram | 7-7.5 | no GH record (Bolivian ram) | - |
| Ramshorn snail | Bristlenose pleco | 7-8 | no GH record (Bristlenose pleco) | - |
| Ramshorn snail | Bronze corydoras | 7-8 | no GH record (Bronze corydoras) | - |
| Ramshorn snail | Cardinal tetra | 7-7.5 | 6-8 | - |
| Ramshorn snail | Celestial pearl danio | 7-7.5 | no GH record (Celestial pearl danio) | - |
| Ramshorn snail | Cherry barb | 7-8 | no GH record (Cherry barb) | - |
| Ramshorn snail | Cherry shrimp | 7-8 | 6-14 | - |
| Ramshorn snail | Dwarf gourami | 7-7.5 | no GH record (Dwarf gourami) | - |
| Ramshorn snail | Dwarf pencilfish | 7-7.5 | 6-15 | - |
| Ramshorn snail | Fancy goldfish | 7-8 | no GH record (Fancy goldfish) | - |
| Ramshorn snail | Fire-bellied toad | 7-7.5 | no GH record (Fire-bellied toad) | - |
| Ramshorn snail | Guppy | 7-8 | 8-18 | - |
| Ramshorn snail | Honey gourami | 7-7.5 | no GH record (Honey gourami) | - |
| Ramshorn snail | Kribensis | 7-7.5 | no GH record (Kribensis) | - |
| Ramshorn snail | Malawi synodontis | 7.5-8 | 10-18 | - |
| Ramshorn snail | Otocinclus | 7-7.5 | no GH record (Otocinclus) | - |
| Ramshorn snail | Panda corydoras | 7-7.5 | no GH record (Panda corydoras) | - |
| Ramshorn snail | Platy | 7-8 | 9-18 | - |
| Ramshorn snail | Pygmy corydoras | 7-7.4 | no GH record (Pygmy corydoras) | - |
| Ramshorn snail | Reticulated hillstream loach | 7-7.5 | no GH record (Reticulated hillstream loach) | - |
| Ramshorn snail | Siamese algae eater | 7-8 | no GH record (Siamese algae eater) | - |
| Ramshorn snail | Sterba's corydoras | 7-8 | 6-18 | - |
| Ramshorn snail | Swordtail | 7-8 | 9-18 | - |
| Ramshorn snail | Zebra danio | 7-8 | no GH record (Zebra danio) | - |

122 green snail pairs, 6 with a gap.

## 3. Full matrix under this model

G green, a amber, R red; rows and columns in the same order.

```
               0 1 2 3 4 5 6 7 8 9101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960
 0 neon        . a a a a a G a G a G a a R R R R R R a a a R R a a a R R R R R R R R R R R R G a G G G G G a R G G R G G R G R G G R a G
 1 cardinal    a . G G G G G G G R a G G R R R R R R G G G G a G G G R R R R R R R R R G G R a R G a G G G G G G a R a G G G G G G R R a
 2 ember       a G . G G G G G G R a G G R R R R R R G G G a R G G G R R R R R R R R R R a R a R G a G G G G a G a R a G R G R G G R R a
 3 dwarfpenci  a G G . G G a G a R a G a R a G a R G G G G G a a G G R R R R R R R R R a a R R R a a a G a G G a a R a a G G G G a R R R
 4 sterbai     a G G G . G a G a R a G a R a G a G G G G G G a a G R a a R a G R R R R a a R R R a a a G a G G a a R a a G G G G a R R R
 5 rummynose   a G G G G . a G a R a G a R R R R R R G G G a R a G G R R R R R R R R R a a R R R a a a G a G a a a R a a R G R G a R R R
 6 harlequin   G G G a a a . G G R G a G R R R R R R a a G a R G a a R R R R R R R R R R R R a R G G G G G G a G G R G G R G R G G R R a
 7 chili       a G G G G G G . G R a G G R R R R R R G G G a R G G G R R R R R R R R R R a R a R G a G G G G a G a R a G R G R G G R R a
 8 danio       G G G a a a G G . a G a G R R R G G G R a a a R G a R a a R a G R R R R R R R G a G G G G G G a G G R G G G G G G G R a G
 9 whitecloud  a R R R R R R R a . R R R R R R a R R R R R R R R R R R R R R R R R R R R R R a G R a R R a R R R a R G a R R a a R R G G
10 cpd         G a a a a a G a G R . a a R R a G R G a a a R R a a R R R R R R R R R R R R R a R G G G G G a R G G R G G G G G G G R R a
11 hatchet     a G G G G G a G a R a . a R R R R R R G G G a R a G G R R R R R R R R R a a R R R a a a G a G a a a R a a R G R G a R R R
12 cherrybarb  a G G a a a G G G R a a . R R a G G G a a G a R G a R a a R a G R R R R R R R a R G a G G G G a G a R a G G G G G G R R a
13 tigerbarb   R R R R R R R R R R R R R . R R R R G R R R R R R G R a R a R G G G R G R R R R R R R R R R R R R R a R R R R R R R R R R
14 boesemani   R R R a a R R R R R R R R R . a R a a G a a a R R a R R R R a a R R R R G R a R R R R R a R R G R R R R R a a a a R R R R
15 guppy       R R R G G R R R R R a R a R a . a G R R R G a R a R R R a R a R R R R R R R R R R a a a G a a a a a R a a G G G G a R R R
16 platy       R R R a a R R R G a G R G R R a . G G a a G a R G a R a a R a G R R R R R R R G a G G G G G R a G G R G G G G G G G R a G
17 molly       R R R R G R R R G R R R G R a G G . G R R R G R R R R a a R a G R R R R R R R a R G R R G R R R G R R a G G G G G G R R R
18 swordtail   R R R G G R R R G R G R G G a R G G . R G G a R G G R a a a a G G G G G R R G a R G G G G G R a G G a G G G G G G G R R a
19 betta       a G G G G G a G R R a G a R G R a R R . R G G a a R R R R R R R R R R R R R R R R a a a G a G G a a R a a G G G G a R R R
20 dwarfgoura  a G G G G G a G a R a G a R a R a R G R . G G a a G R R R R R R R R R R R R R R R a a a G a G G a a R a a G G G G a R R R
21 honeygoura  a G G G G G G G a R a G G R a G G R G G G . a R G G R R R R R R R R R R a a R a R G a G G G G a G a R a G G G G G G R R a
22 gourami     R G a G G a a a a R R a a R a a a G a G G a . a a a a a a R a a R R R R a a a R R a R a a a a G a R R R a a a a G a R R R
23 gbr         R a R a a R R R R R R R R R R R R R R a a R a . R R R R R R R R R R R R a G R R R R R R R R R a R R R R R R R R a R R R R
24 bolivianra  a G G a a a G G G R a a G R R a G R G a a G a R . a R R R R R R R R R R R R R a R G a G G G G a G a R a G G G G G G R R a
25 kribensis   a G G G G G a G a R a G a G a R a R G R G G a R a . R R R R R R R R R R R R G R R a a a G a G a a a a a a G G G G a R R R
26 cockatoo    a G G G R G a G R R R G R R R R R R R R R R a R R R . R R R R R R R R R R R R R R R R R R R G a R R R R R R R R R R R R R
27 yellowlab   R R R R a R R R a R R R a a R R a a a R R R a R R R R . a a a a a a a a R R R R R a R R a R R R a R a a a a a a a a R R R
28 peacock     R R R R a R R R a R R R a R R a a a a R R R a R R R R a . R a a R R R R R R a R R a R R a R R R a R R a a a a a a a R R R
29 demasoni    R R R R R R R R R R R R R a R R R R a R R R R R R R R a R . R a a a R a R R R R R R R R R R R R R R a R R R R R R R R R R
30 kadango     R R R R a R R R a R R R a R a a a a a R R R a R R R R a a R . a R R R R R R a R R a R R a R R R a R R R a a a a a a R R R
31 syno        R R R R G R R R G R R R G G a R G G G R R R a R R R R a a a a . G G G G R R G a R G R R G R R R G R a a G G G G G G R R R
32 labeo       R R R R R R R R R R R R R G R R R R G R R R R R R R R a R a R G . G G G R R G R R R R R R R R R R R a R R R R R R R R R R
33 auratus     R R R R R R R R R R R R R G R R R R G R R R R R R R R a R a R G G . G G R R G R R R R R R R R R R R a R R R R R R R R R R
34 livingston  R R R R R R R R R R R R R R R R R R G R R R R R R R R a R R R G G G . G R R G R R R R R R R R R R R R R R R R R R R R R R
35 afra        R R R R R R R R R R R R R G R R R R G R R R R R R R R a R a R G G G G . R R R R R R R R R R R R R R a R R R R R R R R R R
36 angel       R G R a a a R R R R R a R R G R R R R R R a a a R R R R R R R R R R R R . R R R R R R R a R a G R R R R R a a a a R R R R
37 discus      R G a a a a R a R R R a R R R R R R R R R a a G R R R R R R R R R R R R R . R R R R R R a R a G R R R R R R a R a R R R R
38 oscar       R R R R R R R R R R R R R R a R R R G R R R a R R G R R a R a G G G G R R R . a R R R R G R R a G R R R R R R R R R R R R
39 goldfish    G a a R R R a a G a a R a R R R G a a R R a R R a R R R R R R a R R R R R R a . a a G a a G a R a G R G G a a G G a R a G
40 comet       a R R R R R R R a G R R R R R R a R R R R R R R R R R R R R R R R R R R R R R a . R a R R a R R R a R G a R R a a R R G G
41 bronzecory  G G G a a a G G G R G a G R R a G G G a a G a R G a R a a R a G R R R R R R R a R . G G G G G a G G R G G G G G G G R R a
42 pandacory   G a a a a a G a G a G a a R R a G R G a a a R R a a R R R R R R R R R R R R R G a G . G G G a R G G R G G G G G G G R a G
43 pygmycory   G G G a a a G G G R G a G R R a G R G a a G a R G a R R R R R R R R R R R R R a R G G . G G G a G G R G G G G G G G R R a
44 bristlenos  G G G G G G G G G R G G G R a G G G G G G G a R G G R a a R a G R R R R a a G a R G G G . G G a G G R G G G G G G G R R a
45 oto         G G G a a a G G G a G a G R R a G R G a a G a R G a R R R R R R R R R R R R R G a G G G G . G a G G R G G G G G G G R a G
46 kuhli       a G G G G G G G G R a G G R R a R R R G G G a R G G G R R R R R R R R R a a R a R G a G G G . a G a R a G a a a G G R R a
47 clownloach  R G a G G a a a a R R a a R G a a R a G G a G a a a a R R R R R R R R R G G a R R a R a a a a . a R R R a a a R R a R R R
48 sae         G G G a a a G G G R G a G R R a G G G a a G a R G a R a a R a G R R R R R R G a R G G G G G G a . G R G G G G G G G R R a
49 hillstream  G a a a a a G a G a G a a R R a G R G a a a R R a a R R R R R R R R R R R R R G a G G G G G a R G . R G G G G G G G R a G
50 peapuffer   R R R R R R R R R R R R R a R R R R a R R R R R R a R a R a R a a a R a R R R R R R R R R R R R R R . R R R R R R R R R R
51 cherryshri  G a a a a a G a G G G a a R R a G a G a a a R R a a R a a R R a R R R R R R R G G G G G G G a R G G R . G G G G G G R G G
52 amano       G G G a a a G G G a G a G R R a G G G a a G a R G a R a a R a G R R R R R R R G a G G G G G G a G G R G . G G G G G R a G
53 nerite      R G R G G R R R G R G R G R a G G G G G G G a R G G R a a R a G R R R R a R R a R G G G G G a a G G R G G . G G G G R R a
54 mystery     G G G G G G G G G R G G G R a G G G G G G G a R G G R a a R a G R R R R a a R a R G G G G G a a G G R G G G . G G G R R a
55 ramshorn    R G R G G R R R G a G R G R a G G G G G G G a R G G R a a R a G R R R R a R R G a G G G G G a R G G R G G G G . G G R a G
56 trumpet     G G G G G G G G G a G G G R a G G G G G G G G a G G R a a R a G R R R R a a R G a G G G G G G R G G R G G G G G . G R a G
57 adf         G G G a a a G G G R G a G R R a G G G a a G a R G a R a a R a G R R R R R R R a R G G G G G G a G G R G G G G G G . R R a
58 axolotl     R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R . a R
59 firenewt    a R R R R R R R a G R R R R R R a R R R R R R R R R R R R R R R R R R R R R R a G R a R R a R R R a R G a R R a a R a . G
60 firetoad    G a a R R R a a G G a R a R R R G R a R R a R R a R R R R R R R R R R R R R R G G a G a a G a R a G R G G a a G G a R G .
```
