# Water-chemistry audit: kuhli data fix + narrow-overlap amber rule

Generated 2026-10-26 by a throwaway vitest script against main. 61 freshwater species with a pH record, 1830 pairs.
Grades come from the full engine (whysAnimal both ways, compat reasons only; size and expertise ignored), so pairs already red for predation,
aggression or temperature stay red and are not counted against the rule.

Kuhli before: pH 5.5-6.5, GH 1-6. After: pH 5.5-7.5, GH 1-10.

## 1. Kuhli data fix alone

Totals before {"green":501,"amber":410,"red":919}, after {"green":509,"amber":413,"red":908}.

| Pair | Before | After | Before reasons |
|---|---|---|---|
| Celestial pearl danio + Kuhli loach | red | amber | compatibility: water chemistry: pH 6.5-7.5 against its 5.5-6.5 (Kuhli loach); compatibility: water chemistry: pH 5.5-6.5 against its 6.5-7.5 (Celestial pearl danio) |
| Guppy + Kuhli loach | red | green | compatibility: water chemistry: pH 7.0-8.3 against its 5.5-6.5 (Kuhli loach); compatibility: water hardness: GH 8-25 against its 1-6 (Kuhli loach); compatibility: water chemistry: pH 5.5-6.5 against its 7.0-8.3 (Guppy); compatibility: water hardness: GH 1-6 against its 8-25 (Guppy) |
| Pygmy corydoras + Kuhli loach | red | green | compatibility: water chemistry: pH 6.4-7.4 against its 5.5-6.5 (Kuhli loach); compatibility: water chemistry: pH 5.5-6.5 against its 6.4-7.4 (Pygmy corydoras) |
| Kuhli loach + Siamese algae eater | red | green | compatibility: water chemistry: pH 5.5-6.5 against its 6.5-8.0 (Siamese algae eater); compatibility: water chemistry: pH 6.5-8.0 against its 5.5-6.5 (Kuhli loach) |
| Kuhli loach + Cherry shrimp | red | amber | compatibility: water chemistry: pH 5.5-6.5 against its 6.5-8.0 (Cherry shrimp); compatibility: water chemistry: pH 6.5-8.0 against its 5.5-6.5 (Kuhli loach) |
| Kuhli loach + Nerite snail (zebra) | red | green | compatibility: water chemistry: pH 5.5-6.5 against its 7.0-8.5 (Nerite snail (zebra)); compatibility: water hardness: GH 1-6 against its 6-18 (Nerite snail (zebra)); compatibility: water chemistry: pH 7.0-8.5 against its 5.5-6.5 (Kuhli loach); compatibility: water hardness: GH 6-18 against its 1-6 (Kuhli loach) |
| Kuhli loach + Mystery snail | red | green | compatibility: water chemistry: pH 5.5-6.5 against its 6.5-8.0 (Mystery snail); compatibility: water hardness: GH 1-6 against its 6-18 (Mystery snail); compatibility: water chemistry: pH 6.5-8.0 against its 5.5-6.5 (Kuhli loach); compatibility: water hardness: GH 6-18 against its 1-6 (Kuhli loach) |
| Kuhli loach + Ramshorn snail | red | green | compatibility: water chemistry: pH 5.5-6.5 against its 7.0-8.0 (Ramshorn snail); compatibility: water hardness: GH 1-6 against its 6-18 (Ramshorn snail); compatibility: water chemistry: pH 7.0-8.0 against its 5.5-6.5 (Kuhli loach); compatibility: water hardness: GH 6-18 against its 1-6 (Kuhli loach) |
| Kuhli loach + Malaysian trumpet snail | red | green | compatibility: water chemistry: pH 5.5-6.5 against its 6.5-8.0 (Malaysian trumpet snail); compatibility: water chemistry: pH 6.5-8.0 against its 5.5-6.5 (Kuhli loach) |
| Kuhli loach + African dwarf frog | red | green | compatibility: water chemistry: pH 5.5-6.5 against its 6.5-7.8 (African dwarf frog); compatibility: water chemistry: pH 6.5-7.8 against its 5.5-6.5 (Kuhli loach) |
| Kuhli loach + Fire-bellied toad | red | amber | compatibility: water chemistry: pH 5.5-6.5 against its 6.5-7.5 (Fire-bellied toad); compatibility: water chemistry: pH 6.5-7.5 against its 5.5-6.5 (Kuhli loach) |

## 2. Narrow-overlap rule, threshold sensitivity (on top of the kuhli fix)

Green pairs that would turn amber. Inclusive thresholds: shared pH <= X or shared GH <= Y.

| pH <= | GH <= | green -> amber | by pH | by GH | by both |
|---|---|---|---|---|---|
| 0.5 | 4 | 117 | 105 | 2 | 10 |
| 0.5 | 3 | 116 | 111 | 1 | 4 |
| 0.3 | 4 | 14 | 2 | 12 | 0 |
| 0.3 | 3 | 7 | 2 | 5 | 0 |
| 0.5 | 2 | 116 | 111 | 1 | 4 |

## 3. Every green -> amber change at pH <= 0.5, GH <= 4 (the thresholds that catch kuhli + nerite)

| Pair | Limiting parameter (shared interval) |
|---|---|
| Betta + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Betta + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Black molly + African dwarf frog | pH 7.5-7.8 (0.3 wide) |
| Black molly + Amano shrimp | pH 7.5-8 (0.5 wide) |
| Black molly + Bristlenose pleco | pH 7.5-8 (0.5 wide) |
| Black molly + Bronze corydoras | pH 7.5-8 (0.5 wide) |
| Black molly + Malaysian trumpet snail | pH 7.5-8 (0.5 wide) |
| Black molly + Mystery snail | pH 7.5-8 (0.5 wide) |
| Black molly + Pearl gourami | pH 7.5-8 (0.5 wide) |
| Black molly + Ramshorn snail | pH 7.5-8 (0.5 wide) |
| Black molly + Siamese algae eater | pH 7.5-8 (0.5 wide) |
| Black molly + Swordtail | pH 7.5-8 (0.5 wide) |
| Blue-nosed mbuna + Oscar | pH 7.6-8 (0.4 wide) |
| Boeseman's rainbowfish + Angelfish | pH 7-7.5 (0.5 wide) |
| Boeseman's rainbowfish + Betta | pH 7-7.5 (0.5 wide) |
| Boeseman's rainbowfish + Clown loach | pH 7-7.5 (0.5 wide) |
| Bolivian ram + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Bolivian ram + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Cardinal tetra + Mystery snail | GH 6-8 (2 dGH wide) |
| Cardinal tetra + Nerite snail (zebra) | pH 7-7.5 (0.5 wide); GH 6-8 (2 dGH wide) |
| Cardinal tetra + Ramshorn snail | pH 7-7.5 (0.5 wide); GH 6-8 (2 dGH wide) |
| Celestial pearl danio + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Celestial pearl danio + Platy | pH 7-7.5 (0.5 wide) |
| Celestial pearl danio + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Celestial pearl danio + Swordtail | pH 7-7.5 (0.5 wide) |
| Cherry barb + Black molly | pH 7.5-8 (0.5 wide) |
| Cherry barb + Malawi synodontis | pH 7.5-8 (0.5 wide) |
| Chili rasbora + African dwarf frog | pH 6.5-7 (0.5 wide) |
| Chili rasbora + Malaysian trumpet snail | pH 6.5-7 (0.5 wide) |
| Chili rasbora + Mystery snail | pH 6.5-7 (0.5 wide); GH 6-8 (2 dGH wide) |
| Chili rasbora + Siamese algae eater | pH 6.5-7 (0.5 wide) |
| Cockatoo dwarf cichlid + Kuhli loach | pH 5.5-6 (0.5 wide) |
| Dwarf gourami + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Dwarf gourami + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Dwarf pencilfish + Guppy | pH 7-7.5 (0.5 wide) |
| Dwarf pencilfish + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Dwarf pencilfish + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Dwarf pencilfish + Swordtail | pH 7-7.5 (0.5 wide) |
| Ember tetra + African dwarf frog | pH 6.5-7 (0.5 wide) |
| Ember tetra + Malaysian trumpet snail | pH 6.5-7 (0.5 wide) |
| Ember tetra + Mystery snail | pH 6.5-7 (0.5 wide); GH 6-10 (4 dGH wide) |
| Ember tetra + Siamese algae eater | pH 6.5-7 (0.5 wide) |
| Golden mbuna + Oscar | pH 7.6-8 (0.4 wide) |
| Guppy + Honey gourami | pH 7-7.5 (0.5 wide) |
| Guppy + Kuhli loach | pH 7-7.5 (0.5 wide); GH 8-10 (2 dGH wide) |
| Harlequin rasbora + African dwarf frog | pH 6.5-7 (0.5 wide) |
| Harlequin rasbora + Celestial pearl danio | pH 6.5-7 (0.5 wide) |
| Harlequin rasbora + Cherry shrimp | pH 6.5-7 (0.5 wide) |
| Harlequin rasbora + Malaysian trumpet snail | pH 6.5-7 (0.5 wide) |
| Harlequin rasbora + Mystery snail | pH 6.5-7 (0.5 wide) |
| Harlequin rasbora + Siamese algae eater | pH 6.5-7 (0.5 wide) |
| Honey gourami + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Honey gourami + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Kribensis + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Kribensis + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Kuhli loach + Mystery snail | GH 6-10 (4 dGH wide) |
| Kuhli loach + Nerite snail (zebra) | pH 7-7.5 (0.5 wide); GH 6-10 (4 dGH wide) |
| Kuhli loach + Ramshorn snail | pH 7-7.5 (0.5 wide); GH 6-10 (4 dGH wide) |
| Livingstone's cichlid + Oscar | pH 7.6-8 (0.4 wide) |
| Malawi synodontis + African dwarf frog | pH 7.5-7.8 (0.3 wide) |
| Malawi synodontis + Amano shrimp | pH 7.5-8 (0.5 wide) |
| Malawi synodontis + Bristlenose pleco | pH 7.5-8 (0.5 wide) |
| Malawi synodontis + Bronze corydoras | pH 7.5-8 (0.5 wide) |
| Malawi synodontis + Malaysian trumpet snail | pH 7.5-8 (0.5 wide) |
| Malawi synodontis + Mystery snail | pH 7.5-8 (0.5 wide) |
| Malawi synodontis + Oscar | pH 7.5-8 (0.5 wide) |
| Malawi synodontis + Ramshorn snail | pH 7.5-8 (0.5 wide) |
| Malawi synodontis + Siamese algae eater | pH 7.5-8 (0.5 wide) |
| Marbled hatchetfish + Malaysian trumpet snail | pH 6.5-7 (0.5 wide) |
| Marbled hatchetfish + Mystery snail | pH 6.5-7 (0.5 wide); GH 6-10 (4 dGH wide) |
| Neon tetra + African dwarf frog | pH 6.5-7 (0.5 wide) |
| Neon tetra + Celestial pearl danio | pH 6.5-7 (0.5 wide) |
| Neon tetra + Cherry shrimp | pH 6.5-7 (0.5 wide) |
| Neon tetra + Fire-bellied toad | pH 6.5-7 (0.5 wide) |
| Neon tetra + Malaysian trumpet snail | pH 6.5-7 (0.5 wide) |
| Neon tetra + Mystery snail | pH 6.5-7 (0.5 wide); GH 6-10 (4 dGH wide) |
| Neon tetra + Siamese algae eater | pH 6.5-7 (0.5 wide) |
| Otocinclus + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Otocinclus + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Panda corydoras + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Panda corydoras + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Platy + Bolivian ram | pH 7-7.5 (0.5 wide) |
| Platy + Fire-bellied toad | pH 7-7.5 (0.5 wide) |
| Platy + Honey gourami | pH 7-7.5 (0.5 wide) |
| Platy + Otocinclus | pH 7-7.5 (0.5 wide) |
| Platy + Panda corydoras | pH 7-7.5 (0.5 wide) |
| Platy + Pygmy corydoras | pH 7-7.4 (0.4 wide) |
| Platy + Reticulated hillstream loach | pH 7-7.5 (0.5 wide) |
| Pygmy corydoras + Nerite snail (zebra) | pH 7-7.4 (0.4 wide) |
| Pygmy corydoras + Ramshorn snail | pH 7-7.4 (0.4 wide) |
| Ramshorn snail + Fire-bellied toad | pH 7-7.5 (0.5 wide) |
| Reticulated hillstream loach + Nerite snail (zebra) | pH 7-7.5 (0.5 wide) |
| Reticulated hillstream loach + Ramshorn snail | pH 7-7.5 (0.5 wide) |
| Rummy-nose tetra + Cockatoo dwarf cichlid | pH 5.5-6 (0.5 wide) |
| Rummy-nose tetra + Malaysian trumpet snail | pH 6.5-7 (0.5 wide) |
| Rummy-nose tetra + Mystery snail | pH 6.5-7 (0.5 wide); GH 6-10 (4 dGH wide) |
| Sterba's corydoras + Black molly | pH 7.5-8 (0.5 wide) |
| Sterba's corydoras + Malawi synodontis | pH 7.5-8 (0.5 wide) |
| Swordtail + Blue-nosed mbuna | pH 7.6-8 (0.4 wide) |
| Swordtail + Bolivian ram | pH 7-7.5 (0.5 wide) |
| Swordtail + Dogtooth cichlid | pH 7.6-8 (0.4 wide) |
| Swordtail + Dwarf gourami | pH 7-7.5 (0.5 wide) |
| Swordtail + Golden mbuna | pH 7.6-8 (0.4 wide) |
| Swordtail + Honey gourami | pH 7-7.5 (0.5 wide) |
| Swordtail + Kribensis | pH 7-7.5 (0.5 wide) |
| Swordtail + Livingstone's cichlid | pH 7.6-8 (0.4 wide) |
| Swordtail + Malawi synodontis | pH 7.5-8 (0.5 wide) |
| Swordtail + Otocinclus | pH 7-7.5 (0.5 wide) |
| Swordtail + Panda corydoras | pH 7-7.5 (0.5 wide) |
| Swordtail + Pygmy corydoras | pH 7-7.4 (0.4 wide) |
| Swordtail + Reticulated hillstream loach | pH 7-7.5 (0.5 wide) |
| Tiger barb + Blue-nosed mbuna | pH 7.6-8 (0.4 wide) |
| Tiger barb + Dogtooth cichlid | pH 7.6-8 (0.4 wide) |
| Tiger barb + Golden mbuna | pH 7.6-8 (0.4 wide) |
| Tiger barb + Malawi synodontis | pH 7.5-8 (0.5 wide) |
| Zebra danio + Black molly | pH 7.5-8 (0.5 wide) |
| Zebra danio + Malawi synodontis | pH 7.5-8 (0.5 wide) |

Already-amber pairs that would gain a water advisory too: 107.

## 4. Full matrix after (kuhli fix + rule at pH <= 0.5, GH <= 4)

G green, a amber, R red. Rows and columns in the same order.

```
              0 1 2 3 4 5 6 7 8 9101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960
 0 neon       . a a a a a G a G a a a a R R R R R R a a a R R a a a R R R R R R R R R R R R G a G G G G G a R a G R a G R a R a a R a a
 1 cardinal   a . G G G G G G G R a G G R R R R R R G G G G a G G G R R R R R R R R R G G R a R G a G G G G G G a R a G a a a G G R R a
 2 ember      a G . G G G G G G R a G G R R R R R R G G G a R G G G R R R R R R R R R R a R a R G a G G G G a a a R a G R a R a a R R a
 3 dwarfpenc  a G G . G G a G a R a G a R a a a R a G G G G a a G G R R R R R R R R R a a R R R a a a G a G G a a R a a a G a G a R R R
 4 sterbai    a G G G . G a G a R a G a R a G a a G G G G G a a G R a a R a a R R R R a a R R R a a a G a G G a a R a a G G G G a R R R
 5 rummynose  a G G G G . a G a R a G a R R R R R R G G G a R a G a R R R R R R R R R a a R R R a a a G a G a a a R a a R a R a a R R R
 6 harlequin  G G G a a a . G G R a a G R R R R R R a a G a R G a a R R R R R R R R R R R R a R G G G G G G a a G R a G R a R a a R R a
 7 chili      a G G G G G G . G R a G G R R R R R R G G G a R G G G R R R R R R R R R R a R a R G a G G G G a a a R a G R a R a a R R a
 8 danio      G G G a a a G G . a G a G R R R G a G R a a a R G a R a a R a a R R R R R R R G a G G G G G G a G G R G G G G G G G R a G
 9 whiteclou  a R R R R R R R a . R R R R R R a R R R R R R R R R R R R R R R R R R R R R R a G R a R R a R R R a R G a R R a a R R G G
10 cpd        a a a a a a a a G R . a a R R a a R a a a a R R a a R R R R R R R R R R R R R a R G G G G G a R G G R G G a G a G G R R a
11 hatchet    a G G G G G a G a R a . a R R R R R R G G G a R a G G R R R R R R R R R a a R R R a a a G a G a a a R a a R a R a a R R R
12 cherrybar  a G G a a a G G G R a a . R R a G a G a a G a R G a R a a R a a R R R R R R R a R G a G G G G a G a R a G G G G G G R R a
13 tigerbarb  R R R R R R R R R R R R R . R R R R G R R R R R R G R a R a R a a a R a R R R R R R R R R R R R R R a R R R R R R R R R R
14 boesemani  R R R a a R R R R R R R R R . a R a a a a a a R R a R R R R a a R R R R a R a R R R R R a R R a R R R R R a a a a R R R R
15 guppy      R R R a G R R R R R a R a R a . a G R R R a a R a R R R a R a R R R R R R R R R R a a a G a a a a a R a a G G G G a R R R
16 platy      R R R a a R R R G a a R G R R a . G G a a a a R a a R a a R a G R R R R R R R G a G a a G a R a G a R G G G G G G G R a a
17 molly      R R R R a R R R a R R R a R a G G . a R R R a R R R R a a R a G R R R R R R R a R a R R a R R R a R R a a G a a a a R R R
18 swordtail  R R R a G R R R G R a R G G a R G a . R a a a R a a R a a a a a a a a a R R G a R G a a G a R a G a a G G G G G G G R R a
19 betta      a G G G G G a G R R a G a R a R a R R . R G G a a R R R R R R R R R R R R R R R R a a a G a G G a a R a a a G a G a R R R
20 dwarfgour  a G G G G G a G a R a G a R a R a R a R . G G a a G R R R R R R R R R R R R R R R a a a G a G G a a R a a a G a G a R R R
21 honeygour  a G G G G G G G a R a G G R a a a R a G G . a R G G R R R R R R R R R R a a R a R G a G G G G a G a R a G a G a G G R R a
22 gourami    R G a G G a a a a R R a a R a a a a a G G a . a a a a a a R a a R R R R a a a R R a R a a a a G a R R R a a a a G a R R R
23 gbr        R a R a a R R R R R R R R R R R R R R a a R a . R R R R R R R R R R R R a G R R R R R R R R R a R R R R R R R R a R R R R
24 bolivianr  a G G a a a G G G R a a G R R a a R a a a G a R . a R R R R R R R R R R R R R a R G a G G G G a G a R a G a G a G G R R a
25 kribensis  a G G G G G a G a R a G a G a R a R a R G G a R a . R R R R R R R R R R R R G R R a a a G a G a a a a a a a G a G a R R R
26 cockatoo   a G G G R a a G R R R G R R R R R R R R R R a R R R . R R R R R R R R R R R R R R R R R R R a a R R R R R R R R R R R R R
27 yellowlab  R R R R a R R R a R R R a a R R a a a R R R a R R R R . a a a a a a a a R R R R R a R R a R R R a R a a a a a a a a R R R
28 peacock    R R R R a R R R a R R R a R R a a a a R R R a R R R R a . R a a R R R R R R a R R a R R a R R R a R R a a a a a a a R R R
29 demasoni   R R R R R R R R R R R R R a R R R R a R R R R R R R R a R . R a a a R a R R R R R R R R R R R R R R a R R R R R R R R R R
30 kadango    R R R R a R R R a R R R a R a a a a a R R R a R R R R a a R . a R R R R R R a R R a R R a R R R a R R R a a a a a a R R R
31 syno       R R R R a R R R a R R R a a a R G G a R R R a R R R R a a a a . G G G G R R a a R a R R a R R R a R a a a G a a a a R R R
32 labeo      R R R R R R R R R R R R R a R R R R a R R R R R R R R a R a R G . G G G R R a R R R R R R R R R R R a R R R R R R R R R R
33 auratus    R R R R R R R R R R R R R a R R R R a R R R R R R R R a R a R G G . G G R R a R R R R R R R R R R R a R R R R R R R R R R
34 livingsto  R R R R R R R R R R R R R R R R R R a R R R R R R R R a R R R G G G . G R R a R R R R R R R R R R R R R R R R R R R R R R
35 afra       R R R R R R R R R R R R R a R R R R a R R R R R R R R a R a R G G G G . R R R R R R R R R R R R R R a R R R R R R R R R R
36 angel      R G R a a a R R R R R a R R a R R R R R R a a a R R R R R R R R R R R R . R R R R R R R a R a G R R R R R a a a a R R R R
37 discus     R G a a a a R a R R R a R R R R R R R R R a a G R R R R R R R R R R R R R . R R R R R R a R a G R R R R R R a R a R R R R
38 oscar      R R R R R R R R R R R R R R a R R R G R R R a R R G R R a R a a a a a R R R . a R R R R G R R a G R R R R R R R R R R R R
39 goldfish   G a a R R R a a G a a R a R R R G a a R R a R R a R R R R R R a R R R R R R a . a a G a a G a R a G R G G a a G G a R a G
40 comet      a R R R R R R R a G R R R R R R a R R R R R R R R R R R R R R R R R R R R R R a . R a R R a R R R a R G a R R a a R R G G
41 bronzecor  G G G a a a G G G R G a G R R a G a G a a G a R G a R a a R a a R R R R R R R a R . G G G G G a G G R G G G G G G G R R a
42 pandacory  G a a a a a G a G a G a a R R a a R a a a a R R a a R R R R R R R R R R R R R G a G . G G G a R G G R G G a G a G G R a G
43 pygmycory  G G G a a a G G G R G a G R R a a R a a a G a R G a R R R R R R R R R R R R R a R G G . G G G a G G R G G a G a G G R R a
44 bristleno  G G G G G G G G G R G G G R a G G a G G G G a R G G R a a R a a R R R R a a G a R G G G . G G a G G R G G G G G G G R R a
45 oto        G G G a a a G G G a G a G R R a a R a a a G a R G a R R R R R R R R R R R R R G a G G G G . G a G G R G G a G a G G R a G
46 kuhli      a G G G G G G G G R a G G R R a R R R G G G a R G G a R R R R R R R R R a a R a R G a G G G . a G a R a G a a a G G R R a
47 clownloac  R G a G G a a a a R R a a R a a a R a G G a G a a a a R R R R R R R R R G G a R R a R a a a a . a R R R a a a R R a R R R
48 sae        a G a a a a a a G R G a G R R a G a G a a G a R G a R a a R a a R R R R R R G a R G G G G G G a . G R G G G G G G G R R a
49 hillstrea  G a a a a a G a G a G a a R R a a R a a a a R R a a R R R R R R R R R R R R R G a G G G G G a R G . R G G a G a G G R a G
50 peapuffer  R R R R R R R R R R R R R a R R R R a R R R R R R a R a R a R a a a R a R R R R R R R R R R R R R R . R R R R R R R R R R
51 cherryshr  a a a a a a a a G G G a a R R a G a G a a a R R a a R a a R R a R R R R R R R G G G G G G G a R G G R . G G G G G G R G G
52 amano      G G G a a a G G G a G a G R R a G a G a a G a R G a R a a R a a R R R R R R R G a G G G G G G a G G R G . G G G G G R a G
53 nerite     R a R a G R R R G R a R G R a G G G G a a a a R a a R a a R a G R R R R a R R a R G a a G a a a G a R G G . G G G G R R a
54 mystery    a a a G G a a a G R G a G R a G G a G G G G a R G G R a a R a a R R R R a a R a R G G G G G a a G G R G G G . G G G R R a
55 ramshorn   R a R a G R R R G a a R G R a G G a G a a a a R a a R a a R a a R R R R a R R G a G a a G a a R G a R G G G G . G G R a a
56 trumpet    a G a G G a a a G a G a G R a G G a G G G G G a G G R a a R a a R R R R a a R G a G G G G G G R G G R G G G G G . G R a G
57 adf        a G a a a a a a G R G a G R R a G a G a a G a R G a R a a R a a R R R R R R R a R G G G G G G a G G R G G G G G G . R R a
58 axolotl    R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R R . a R
59 firenewt   a R R R R R R R a G R R R R R R a R R R R R R R R R R R R R R R R R R R R R R a G R a R R a R R R a R G a R R a a R a . G
60 firetoad   a a a R R R a a G G a R a R R R a R a R R a R R a R R R R R R R R R R R R R R G G a G a a G a R a G R G G a a a G a R G .
```

## 5. Alternative: shell-builder advisory (snail with a hardness record + a species whose preferred GH tops out at 10 or less)

11 green -> amber.

| Pair | Why |
|---|---|
| Cardinal tetra + Mystery snail | Cardinal tetra GH 1-8, snail GH 6-18 |
| Cardinal tetra + Nerite snail (zebra) | Cardinal tetra GH 1-8, snail GH 6-18 |
| Cardinal tetra + Ramshorn snail | Cardinal tetra GH 1-8, snail GH 6-18 |
| Chili rasbora + Mystery snail | Chili rasbora GH 1-8, snail GH 6-18 |
| Ember tetra + Mystery snail | Ember tetra GH 1-10, snail GH 6-18 |
| Kuhli loach + Mystery snail | Kuhli loach GH 1-10, snail GH 6-18 |
| Kuhli loach + Nerite snail (zebra) | Kuhli loach GH 1-10, snail GH 6-18 |
| Kuhli loach + Ramshorn snail | Kuhli loach GH 1-10, snail GH 6-18 |
| Marbled hatchetfish + Mystery snail | Marbled hatchetfish GH 1-10, snail GH 6-18 |
| Neon tetra + Mystery snail | Neon tetra GH 1-10, snail GH 6-18 |
| Rummy-nose tetra + Mystery snail | Rummy-nose tetra GH 1-10, snail GH 6-18 |
