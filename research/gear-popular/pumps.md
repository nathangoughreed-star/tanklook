# Popular aquarium pumps (Amazon US, product pages read 2026-10-27, lane GP)

Method: Amazon search results for each brand / product (organic rows), then the product page (`/dp/ASIN`) read for the exact title,
price, rating count, "bought in past month", Best Sellers rank, the bullets and the product-information table. Colours were
sampled from the listing photo (most common non-white colours, `colors.body`); `colorsEst` lists the ones guessed from the listing's
"Color" field instead. No spec was filled in from memory: a figure the page does not give is left out and the product is listed
under "needs spec". Data: `src/data/gear-catalog.json` > `pumps` (34 products), lookups in `src/data/gearCatalog.ts`.

Flow figures: a listing's litres per hour is converted at 3.785 L per gal. Wave controller: only listings that describe a wave / pulse
controller are `kind: 'wavemaker'`; the other "wave maker" listings are plain magnetic / suction-cup pumps and count as powerheads.

## Air pumps (18)
Uniclife UL080 64 GPH (14,747 ratings, #1) · Pawfly dual 50 GPH 1.25 W (1,399) · NICREW nano piezo 1.5 W (3,187) · AQUANEAT 300 GPH 4 outlets
(1,038) · Pawfly 15-40 GPH 2 W (7,993) · Pawfly nano piezo 1.3 W (330) · HITOP 3 W dual (9,429) · HITOP 2 W nano 57 GPH (214) · HITOP 4 W shark
110 GPH (1,927) · AQQA 3.5 W (2,069; depth rating 2 ft) · AQQA 3 W 100 GPH (1,184) · Tetra Whisper 10 and 40 gal (45,002 for the family; watts
2.5 / 2.9 from the page's size table) · hygger 4 W 95 GPH x 2 (361) · hygger 3.5 W 80 GPH under 30 dB (150) · hygger 3 W set 50 GPH (175) ·
AquaMiracle all-in-one 4 W 120 GPH (1,404) and 1 W 50 GPH (1,404).

## Powerheads (14) and wavemakers (2)
AQUANEAT 480 GPH 3 W (2,314) · hygger Mini Wave Maker 530 GPH 3 W (534) · hygger 1050 GPH 5 W (529) · DaToo 3 W (229) · AquaMiracle 135 GPH 4.8 W (980) ·
Sicce Syncra Silent 0.5 and 1.0 (396 / 534) · FREESEA magnetic 8 W 1600 GPH (1,900) and 6 W 1050 GPH (833) · VIVOSUN 800 GPH 50 W (26,255; a fountain /
aquarium pump) · PULACO 95 / 160 / 400 GPH (9,004 / 4,858 / 5,250) · GROWNEER 550 GPH 30 W (11,963) · wavemakers with a controller: hygger cross-flow
18 W (412, $79) and hygger DC 5-10 gal 9 W (149).

## Listing conflicts, and how they were settled
- DaToo "800GPH" title vs the table's 800 liters per hour: 211 gal/h used (a 3 W pump). hygger 1050 title 1050 GPH vs the table's 35 gpm: the title used.
- Uniclife title 5-200 gal vs bullets 10-100 gal, Pawfly dual title 10-200 vs bullets up to 60: the bullets' (smaller) range is `galMax`.
- Sicce Syncra Silent 0.5's listed 5 x 3 x 6 in looks like the pack: drawing only (`est: bodyMm`).

## Needs spec (not entered)
- Marineland Maxi-Jet 600 and 400 (watts not on the page; "160/750 GPH" style) · AQUANEAT 800 GPH circulation pump (watts not on the page) ·
  AQUANEAT 20-210 gal air pump B0BHVZJH93 (watts and air flow not on the page) · FREESEA FS308 B0BX3SBDDL (watts not on the page) ·
  hygger 7 W / 11 W air pumps and AQQA 6 W / 10 W (variant prices, watts and air flow not read) · hygger 1.5 W mini air pump (no listing found) ·
  Pawfly dual's size (not on the page, so no body size; air pumps are not drawn anyway).
- Not listed because the title does not say aquarium or wave maker: the other VIVOSUN / PULACO / GROWNEER sizes.
