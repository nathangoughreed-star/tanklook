# Snail waste and space (lane SN, 2026-10-22; Nathan's yes in chat SN the same day)

Problem: on main 50 mystery snails passed a 2.5 gal (10 gal with sumps): snails had zero Space (S187) and the shell waste class.

Nathan (2026-10-22): "realistically they dont need much space, I feel like most fish probably treat them as hardscape. But the waste
production is real. Also yes they should take up SOME space, relative to their adult size." He picked room factor 3 and mystery x1 below.

## Space (floor side of the habitat model, scene/stocking.ts snailFloorCm2)
- Footprint = SNAIL_FOOT_K x mass^(2/3) cm2, K = 3.2 so a 51 mm mystery snail (14.4 g) is 19 cm2 (about 51 x 38 mm, its shell's ground
  plan) and a 19 mm trumpet snail 1.3 cm2 (19 x 6 mm). Area by mass^(2/3), so small snails stay nearly free (S187's intent).
- SNAIL_ROOM = 3 footprints of floor each (assumption; they also roam the glass, which the factor absorbs). Water space stays 0.
- Result: 10 trumpet snails in a 5 gal use about 4 % of the floor; one mystery snail about 4 % of a 10 gal's floor.

## Waste (MET_CLASS applesnail)
- Mystery snails (Pomacea) waste like a fish of the same mass (x1, was x0.5 by the shell class): 2.73 -> 5.45 mg TAN/day at 25 C,
  normal feeding. Other snails keep the shell class.
- Sources (research agent, 2026-10-22; most primary papers paywalled):
  - furrycritter.com/pages/articles/fish/freshwater_snails.htm: mystery snails "produce waste equivalent to several small fish"; nerites
    "produce minimal waste".
  - petfishonline.com/how-many-mystery-snails/: "Each mystery snail requires two and a half gallons of water"; they "excrete a lot of waste".
  - P. maculata ammonia excretion 1.1 +- 0.5 umol/g/day at 20 C (ESA 2014 abstract, eco.confex.com/eco/2014/webprogram/Paper49670.html;
    search snippet only, mass basis unknown): per gram about 10x below a fish's fasted rate, so hobby bioload is mostly feeding and
    faeces, which the feed term of tanOf carries. Leads not read: Springer 10.1007/s10452-025-10171-4 (Pomacea 6-30 C), Vanni 2017 database.
- With the floor limit, tankFor does not move on the waste change (the floor binds first); it shows in Filtration %.

## Moved numbers (tankFor, n = 1/3/6/12/25/50)
mystery 2.5 x5, 10 -> 2.5 2.5 2.5 5 15 30b; nerite 2.5 all -> 2.5 2.5 2.5 3c 8c 20L; ramshorn 2.5 all -> 2.5 x5, 5; trumpet unchanged;
turbo 2.5 2.5 2.5 15 37 75 -> 2.5 3c 8c 20L 60b 180. Shrimp and hermits unchanged. Starters at Full: max unchanged, mean <= 0.7 pt.
Examples: no change.

## Masses (follow-up, 2026-10-22, coordinator 8's request; notes in side-session-notes SN-snail-mass-research.md)
The "25 g" / "4 g" notes were for the lengths before lane CB (91c4289: turbo 50 -> 70 mm, nerite 25 -> 32); mass scales with length cubed,
so 68.6 g and 8.4 g were not inflated. Turbo now uses the congener Turbo cornutus relation (SeaLifeBase a 0.25579, b 2.94, 4.9-11.2 cm):
28 g at 50 mm, 78 g at 70 mm; tankFor moves only at n = 3 (3 gal cube -> 5 gal). Nerite, ramshorn: no length-weight source found, kept.
Mystery: Pomacea congeners give 23-35 g at 51 mm (P. urceus, P. canaliculata) vs our 14.4 g; Nathan kept 14.4 g (P. diffusa is the
slighter species; 24 g would move 50 snails from a 30 to a 40 breeder).
