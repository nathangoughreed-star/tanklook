# Water-chemistry audit: soft-water fish acceptable ranges

Generated 2026-10-26 (branch S226). 61 freshwater species with a pH record, 1830 pairs, graded by the real engine
(whysAnimal both ways, compatibility reasons only; size and expertise ignored), so a pair already red for predation, aggression or
temperature stays red whatever its water. Before = live main's src/data/waterchem.ts, after = this branch's.

Model (Nathan 2026-10-26): preferred ranges share at least 0.2 pH and 2 dGH = green; only the documented acceptable ranges do = amber;
not even those = red. Nothing is widened automatically.

Totals: live main green 498, amber 424, red 908; this step green 498, amber 443, red 889.

## Records changed by this step

| Species | Preferred pH / GH | Acceptable pH / GH, live main | Acceptable pH / GH, this step |
|---|---|---|---|
| Neon tetra | 5-7 / 1-10 | none | 4-7.5 / 1-12 |
| Ember tetra | 5-7 / 1-10 | none | 5-7.5 / 1-10 |
| Rummy-nose tetra | 5.5-7 / 1-10 | none | 5.5-7.5 / 1-10 |
| Harlequin rasbora | 5-7 / 1-12 | none | 5-7.5 / 1-12 |
| Marbled hatchetfish | 5-7 / 1-10 | none | 5-8 / 1-10 |

## 1. Every pair whose grade or reasons change (live main -> this step)

95 pairs: red -> red 71, red -> amber 19, amber -> amber 5.

Biggest groups (colour changes per changed species): Neon tetra 5, Harlequin rasbora 5, Ember tetra 3, Rummy-nose tetra 3, Marbled hatchetfish 3.

Colour changes:

| Pair | Live main | This step | This step's reasons |
|---|---|---|---|
| Neon tetra + Guppy | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.3; both accept 7.0-7.5, a compromise; temperature: shared range 24–25 °C, a narrow margin (2 °C or less), not an incompatibility; water chemistry: prefers pH 7.0-8.3, it 5.0-7.0; both accept 7.0-7.5, a compromise |
| Neon tetra + Platy | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.2; both accept 7.0-7.5, a compromise; water hardness: prefers GH 1-10, it 9-25; both accept 9-12, a compromise; water chemistry: prefers pH 7.0-8.2, it 5.0-7.0; both accept 7.0-7.5, a compromise; water hardness: prefers GH 9-25, it 1-10; both accept 9-12, a compromise |
| Neon tetra + Swordtail | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.0; both accept 7.0-7.5, a compromise; water hardness: prefers GH 1-10, it 9-25; both accept 9-12, a compromise; water chemistry: prefers pH 7.0-8.0, it 5.0-7.0; both accept 7.0-7.5, a compromise; water hardness: prefers GH 9-25, it 1-10; both accept 9-12, a compromise |
| Neon tetra + Nerite snail (zebra) | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.5; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps (Nerite snail (zebra)); water chemistry: prefers pH 7.0-8.5, it 5.0-7.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |
| Neon tetra + Ramshorn snail | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps; water chemistry: prefers pH 7.0-8.0, it 5.0-7.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |
| Ember tetra + Guppy | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.3; both accept 7.0-7.5, a compromise; water chemistry: prefers pH 7.0-8.3, it 5.0-7.0; both accept 7.0-7.5, a compromise |
| Ember tetra + Nerite snail (zebra) | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.5; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps (Nerite snail (zebra)); water chemistry: prefers pH 7.0-8.5, it 5.0-7.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |
| Ember tetra + Ramshorn snail | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps; water chemistry: prefers pH 7.0-8.0, it 5.0-7.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |
| Rummy-nose tetra + Guppy | red | **amber** | water chemistry: prefers pH 5.5-7.0, it 7.0-8.3; both accept 7.0-7.5, a compromise; water chemistry: prefers pH 7.0-8.3, it 5.5-7.0; both accept 7.0-7.5, a compromise |
| Rummy-nose tetra + Nerite snail (zebra) | red | **amber** | water chemistry: prefers pH 5.5-7.0, it 7.0-8.5; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps (Nerite snail (zebra)); water chemistry: prefers pH 7.0-8.5, it 5.5-7.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |
| Rummy-nose tetra + Ramshorn snail | red | **amber** | water chemistry: prefers pH 5.5-7.0, it 7.0-8.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps; water chemistry: prefers pH 7.0-8.0, it 5.5-7.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |
| Harlequin rasbora + Guppy | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.3; both accept 7.0-7.5, a compromise; temperature: shared range 24–26 °C, a narrow margin (2 °C or less), not an incompatibility; water chemistry: prefers pH 7.0-8.3, it 5.0-7.0; both accept 7.0-7.5, a compromise |
| Harlequin rasbora + Platy | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.2; both accept 7.0-7.5, a compromise; water chemistry: prefers pH 7.0-8.2, it 5.0-7.0; both accept 7.0-7.5, a compromise |
| Harlequin rasbora + Swordtail | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.0; both accept 7.0-7.5, a compromise; water chemistry: prefers pH 7.0-8.0, it 5.0-7.0; both accept 7.0-7.5, a compromise |
| Harlequin rasbora + Nerite snail (zebra) | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.5; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps (Nerite snail (zebra)); water chemistry: prefers pH 7.0-8.5, it 5.0-7.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |
| Harlequin rasbora + Ramshorn snail | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps; water chemistry: prefers pH 7.0-8.0, it 5.0-7.0; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |
| Marbled hatchetfish + Guppy | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.3; both accept 7.0-8.0, a compromise; water chemistry: prefers pH 7.0-8.3, it 5.0-7.0; both accept 7.0-8.0, a compromise |
| Marbled hatchetfish + Nerite snail (zebra) | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.5; both accept 7.0-8.0, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps (Nerite snail (zebra)); water chemistry: prefers pH 7.0-8.5, it 5.0-7.0; both accept 7.0-8.0, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |
| Marbled hatchetfish + Ramshorn snail | red | **amber** | water chemistry: prefers pH 5.0-7.0, it 7.0-8.0; both accept 7.0-8.0, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps; water chemistry: prefers pH 7.0-8.0, it 5.0-7.0; both accept 7.0-8.0, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps |

Same colour, reasons reworded (the quoted acceptable range changes), 76 pairs: Neon tetra + Boeseman's rainbowfish (red), Neon tetra + Black molly (red), Neon tetra + Yellow lab cichlid (red), Neon tetra + Peacock cichlid (red), Neon tetra + Demasoni cichlid (red), Neon tetra + Kadango (red-fin) cichlid (red), Neon tetra + Malawi synodontis (red), Neon tetra + Blue-nosed mbuna (red), Neon tetra + Golden mbuna (red), Neon tetra + Livingstone's cichlid (red), Neon tetra + Dogtooth cichlid (red), Neon tetra + Pea puffer (red), Neon tetra + Mystery snail (amber), Neon tetra + Axolotl (red), Ember tetra + Boeseman's rainbowfish (red), Ember tetra + Platy (red), Ember tetra + Black molly (red), Ember tetra + Swordtail (red), Ember tetra + Yellow lab cichlid (red), Ember tetra + Peacock cichlid (red), Ember tetra + Demasoni cichlid (red), Ember tetra + Kadango (red-fin) cichlid (red), Ember tetra + Malawi synodontis (red), Ember tetra + Blue-nosed mbuna (red), Ember tetra + Golden mbuna (red), Ember tetra + Livingstone's cichlid (red), Ember tetra + Dogtooth cichlid (red), Ember tetra + Pea puffer (red), Ember tetra + Mystery snail (amber), Ember tetra + Axolotl (red), Rummy-nose tetra + Boeseman's rainbowfish (red), Rummy-nose tetra + Platy (red), Rummy-nose tetra + Black molly (red), Rummy-nose tetra + Swordtail (red), Rummy-nose tetra + Yellow lab cichlid (red), Rummy-nose tetra + Peacock cichlid (red), Rummy-nose tetra + Demasoni cichlid (red), Rummy-nose tetra + Kadango (red-fin) cichlid (red), Rummy-nose tetra + Malawi synodontis (red), Rummy-nose tetra + Blue-nosed mbuna (red), Rummy-nose tetra + Golden mbuna (red), Rummy-nose tetra + Livingstone's cichlid (red), Rummy-nose tetra + Dogtooth cichlid (red), Rummy-nose tetra + Pea puffer (red), Rummy-nose tetra + Mystery snail (amber), Rummy-nose tetra + Axolotl (red), Harlequin rasbora + Boeseman's rainbowfish (red), Harlequin rasbora + Black molly (red), Harlequin rasbora + Yellow lab cichlid (red), Harlequin rasbora + Peacock cichlid (red), Harlequin rasbora + Demasoni cichlid (red), Harlequin rasbora + Kadango (red-fin) cichlid (red), Harlequin rasbora + Malawi synodontis (red), Harlequin rasbora + Blue-nosed mbuna (red), Harlequin rasbora + Golden mbuna (red), Harlequin rasbora + Livingstone's cichlid (red), Harlequin rasbora + Dogtooth cichlid (red), Harlequin rasbora + Pea puffer (red), Harlequin rasbora + Mystery snail (amber), Harlequin rasbora + Axolotl (red), Marbled hatchetfish + Boeseman's rainbowfish (red), Marbled hatchetfish + Platy (red), Marbled hatchetfish + Black molly (red), Marbled hatchetfish + Swordtail (red), Marbled hatchetfish + Yellow lab cichlid (red), Marbled hatchetfish + Peacock cichlid (red), Marbled hatchetfish + Demasoni cichlid (red), Marbled hatchetfish + Kadango (red-fin) cichlid (red), Marbled hatchetfish + Malawi synodontis (red), Marbled hatchetfish + Blue-nosed mbuna (red), Marbled hatchetfish + Golden mbuna (red), Marbled hatchetfish + Livingstone's cichlid (red), Marbled hatchetfish + Dogtooth cichlid (red), Marbled hatchetfish + Pea puffer (red), Marbled hatchetfish + Mystery snail (amber), Marbled hatchetfish + Axolotl (red).

## 2. Lake Malawi check

No pair with a Lake Malawi species (9 species) leaves red.

## 3. Shell-builders with soft-water fish

Soft-water fish here = preferred pH tops out at 7.0 or lower, or preferred GH at 8 or lower. R red, a amber, G green; "was -> now" where it moves.

| Fish (preferred pH / GH; acceptable) | Nerite snail (zebra) | Mystery snail | Ramshorn snail | Malaysian trumpet snail |
|---|---|---|---|---|
| Neon tetra (5-7 / 1-10; 4-7.5 / 1-12) | red -> **amber** | amber | red -> **amber** | green |
| Cardinal tetra (3.5-7.5 / 1-8) | green | amber | green | green |
| Ember tetra (5-7 / 1-10; 5-7.5 / 1-10) | red -> **amber** | amber | red -> **amber** | green |
| Rummy-nose tetra (5.5-7 / 1-10; 5.5-7.5 / 1-10) | red -> **amber** | amber | red -> **amber** | green |
| Harlequin rasbora (5-7 / 1-12; 5-7.5 / 1-12) | red -> **amber** | amber | red -> **amber** | green |
| Chili rasbora (5-7 / 1-8) | red | amber | red | green |
| Marbled hatchetfish (5-7 / 1-10; 5-8 / 1-10) | red -> **amber** | amber | red -> **amber** | green |
| German blue ram (4-7 / 1-8) | red | red | red | amber |
| Cockatoo dwarf cichlid (5-6 / 2-15) | red | red | red | red |
| Discus (5-7 / 1-8) | red | amber | red | amber |
| Kuhli loach (5.5-7 / 1-6; 5.5-7.5 / 1-10) | amber | amber | amber | green |

## 4. Full matrix under this step

G green, a amber, R red; rows and columns in the same order.

```
               0 1 2 3 4 5 6 7 8 9101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960
 0 neon        . a a a a a G a G a G a a R R a a R a a a a R R a a a R R R R R R R R R R R R G a G G G G G a R G G R G G a a a G G R a G
 1 cardinal    a . G G G G G G G R a G G R R R R R R G G G G a G G G R R R R R R R R R G G R a R G a G G G G G G a R a G G a G G G R R a
 2 ember       a G . G G G G G G R a G G R R a R R R G G G a R G G G R R R R R R R R R R a R a R G a G G G G a G a R a G a a a G G R R a
 3 dwarfpenci  a G G . G G a G a R a G a R a G a R G G G G G a a G G R R R R R R R R R a a R R R a a a G a G G a a R a a G G G G a R R R
 4 sterbai     a G G G . G a G a R a G a R a G a G G G G G G a a G R a a R a G R R R R a a R R R a a a G a G G a a R a a G G G G a R R R
 5 rummynose   a G G G G . a G a R a G a R R a R R R G G G a R a G G R R R R R R R R R a a R R R a a a G a G a a a R a a a a a G a R R R
 6 harlequin   G G G a a a . G G R G a G R R a a R a a a G a R G a a R R R R R R R R R R R R a R G G G G G G a G G R G G a a a G G R R a
 7 chili       a G G G G G G . G R a G G R R R R R R G G G a R G G G R R R R R R R R R R a R a R G a G G G G a G a R a G R a R G G R R a
 8 danio       G G G a a a G G . a G a G R R R G G G R a a a R G a R a a R a G R R R R R R R G a G G G G G G a G G R G G G G G G G R a G
 9 whitecloud  a R R R R R R R a . R R R R R R a R R R R R R R R R R R R R R R R R R R R R R a G R a R R a R R R a R G a R R a a R R G G
10 cpd         G a a a a a G a G R . a a R R a G R G a a a R R a a R R R R R R R R R R R R R a R G G G G G a R G G R G G G G G G G R R a
11 hatchet     a G G G G G a G a R a . a R R a R R R G G G a R a G G R R R R R R R R R a a R R R a a a G a G a a a R a a a a a G a R R R
12 cherrybarb  a G G a a a G G G R a a . R R a G G G a a G a R G a R a a R a G R R R R R R R a R G a G G G G a G a R a G G G G G G R R a
13 tigerbarb   R R R R R R R R R R R R R . R R R R G R R R R R R G R a R a R G G G R G R R R R R R R R R R R R R R a R R R R R R R R R R
14 boesemani   R R R a a R R R R R R R R R . a R a a G a a a R R a R R R R a a R R R R G R a R R R R R a R R G R R R R R a a a a R R R R
15 guppy       a R a G G a a R R R a a a R a . a G R R R G a R a R R R a R a R R R R R R R R R R a a a G a a a a a R a a G G G G a R R R
16 platy       a R R a a R a R G a G R G R R a . G G a a G a R G a R a a R a G R R R R R R R G a G G G G G R a G G R G G G G G G G R a G
17 molly       R R R R G R R R G R R R G R a G G . G R R R G R R R R a a R a G R R R R R R R a R G R R G R R R G R R a G G G G G G R R R
18 swordtail   a R R G G R a R G R G R G G a R G G . R G G a R G G R a a a a G G G G G R R G a R G G G G G R a G G a G G G G G G G R R a
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
53 nerite      a G a G G a a R G R G a G R a G G G G G G G a R G G R a a R a G R R R R a R R a R G G G G G a a G G R G G . G G G G R R a
54 mystery     a a a G G a a a G R G a G R a G G G G G G G a R G G R a a R a G R R R R a a R a R G G G G G a a G G R G G G . G G G R R a
55 ramshorn    a G a G G a a R G a G a G R a G G G G G G G a R G G R a a R a G R R R R a R R G a G G G G G a R G G R G G G G . G G R a G
56 trumpet     G G G G G G G G G a G G G R a G G G G G G G G a G G R a a R a G R R R R a a R G a G G G G G G R G G R G G G G G . G R a G
57 adf         G G G a a a G G G R G a G R R a G G G a a G a R G a R a a R a G R R R R R R R a R G G G G G G a G G R G G G G G G . R R a
58 axolotl     R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R . a R
59 firenewt    a R R R R R R R a G R R R R R R a R R R R R R R R R R R R R R R R R R R R R R a G R a R R a R R R a R G a R R a a R a . G
60 firetoad    G a a R R R a a G G a R a R R R G R a R R a R R a R R R R R R R R R R R R R R G G a G a a G a R a G R G G a a G G a R G .
```
