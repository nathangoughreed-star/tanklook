# Lane SU: the sump as a Tech section (2026-10-22)

Nathan 2026-10-22: "yea this should be an additional section in the 'tech'. Reuse the same presets or custom size tanks for it."

## What the engine does now (branch `su`)
- `tech.sump = { model?, L, D, H }` (interior mm; `model` = a plain catalogue size, its size re-read on load; custom sides 50-3000 mm). Older files load as before; a sump filter with no size gets **the default sump**: the smallest plain catalogue size of at least 25 % of the display volume (SUMP_SHARE) that is no longer than the display, else the largest that fits.
- **Its water**: volume x 0.5 (SUMP_FILL: half full, the rest is drain-down room) is added to the litres the nitrogen budget works on (filtration %, nitrate, sump media). **Not** to Space or the tank minimum (no fish swims in the sump). The weekly water change is a share of display + sump water (the gallons changed come out about the same: more water at a lower share).
- **Price**: three gear rows in the Filtration line: sump tank (a bare glass tank of its gallons, the tank:N rows; not the catalogue listings, which are display tanks), sump plumbing (new row gear:sump-plumbing, $69.95 cited: Custom Aquariums Ultimate 4 Hole 3600GPH Plumbing Kit, https://www.customaquariums.com/?p=11463; lo $40 = their 2 hole kit, hi $150 = with an overflow box, judgement), return pump (as before). Before, the sump was the gear:sump "sump box" row ($300 at 55 gal, scaled).
- **Offered** (`sumpOffered`, one rule for tankfit and builds): any wet tank (Nathan 2026-10-23: "offer it on any tank. Why not?"). Before: tankfit allowed a sump on any tank, builds never offered one.
- **Sizes**: the sump picker and the default start at 10 gal (SUMP_MIN_GAL); a typed custom size can be anything 50-3000 mm a side.
- **Counted once**: the sump tank, plumbing and pump are one unit of the Filtration row (its total includes them); the Sump row reads "in Filtration" (test: canister + sump costs the canister plus the sump unit).
- New constants SUMP_MIN_GAL, SUMP_FILL, SUMP_SHARE are assumptions in provenance.ts FORMULAS (ratchet passes).

## Tank picks that move (tankFor, 73 water species x 1/3/6/12/25/50 = 438 cases)
| species x count | before tank | filtration | fails | after tank | filtration | fails |
|---|---|---|---|---|---|---|
| bluetang x12 | g240 | 94 % | - | g210 | 95 % | - |

Against main 516482e, after Nathan's answers (2026-10-23): a sump is offered on **any** wet tank ("offer it on any tank. Why not?"), it is one filter unit among the others (one sump per tank), and tankfit's fallback filter (when none meets the target) is now the one leaving the lowest filtration, as the builds' (before: the highest rated capacity, which picked a sump on nanos whose media is a few litres). Only 12 blue tangs move: the 210 gal now holds them with its sump water. The mystery snail, turbo and axolotl moves of the earlier tables are gone (main already counted a sump on those tanks; now the builds offer it too).

On nanos a sump can now be the cheapest filter under 70 % (a 10 gal sump tank, $70 plumbing and a return pump priced down to the tank): 6 small-tank balanced builds switch to one, each a 10 gal sump (12 mystery snails / 5 gal, 25 / 15 gal, 3 turbos / 5 gal, 6 / 8 gal cube, 12 / 20 gal long, 3 axolotls / 20 gal long); picture SU-small-tank-sumps.png; kept by Nathan 2026-10-23: the builds pick a sump wherever it is the best option, any size ("you can make it default to where it would be the best option"). On 12 mystery snails / 5 gal the sump is $167 (tank $34, plumbing $87, return pump $46) against a $203 canister.

## Filtration % that moves with the same tank (62 cases; the tank pick holds)
Large tanks read lower (their sump water dilutes); fresh 40-60 gal tanks that used to count a sump read higher (no sump offered there). Every one still fits.

| species x count | before tank | filtration | fails | after tank | filtration | fails |
|---|---|---|---|---|---|---|
| gourami x25 | g60b | 29 % | - | g60b | 26 % | - |
| gourami x50 | g120 | 31 % | - | g120 | 27 % | - |
| peacock x50 | g180 | 17 % | - | g180 | 15 % | - |
| kadango x12 | g60b | 32 % | - | g60b | 28 % | - |
| kadango x25 | g120 | 35 % | - | g120 | 31 % | - |
| kadango x50 | g180 | 46 % | - | g180 | 41 % | - |
| livingstonii x3 | g55 | 24 % | - | g55 | 21 % | - |
| livingstonii x6 | g75 | 34 % | - | g75 | 30 % | - |
| livingstonii x12 | g180 | 32 % | - | g180 | 28 % | - |
| livingstonii x25 | g300 | 41 % | - | g300 | 36 % | - |
| livingstonii x50 | c8 | 64 % | space | c8 | 56 % | space |
| syno x50 | c8 | 24 % | space | c8 | 21 % | space |
| angel x6 | g40b | 32 % | - | g40b | 28 % | - |
| angel x12 | g75 | 34 % | - | g75 | 30 % | - |
| angel x25 | g150 | 40 % | - | g150 | 35 % | - |
| angel x50 | g240 | 50 % | - | g240 | 45 % | - |
| discus x6 | g55 | 23 % | - | g55 | 20 % | - |
| discus x12 | g90 | 28 % | - | g90 | 24 % | - |
| discus x25 | g180 | 32 % | - | g180 | 28 % | - |
| discus x50 | g300 | 39 % | - | g300 | 34 % | - |
| oscar x3 | g180 | 30 % | - | g180 | 27 % | - |
| oscar x6 | g180 | 60 % | - | g180 | 53 % | - |
| oscar x12 | c8 | 58 % | - | c8 | 51 % | - |
| oscar x25 | c8 | 121 % | space,filtration | c8 | 107 % | space,filtration |
| oscar x50 | c8 | 242 % | space,filtration | c8 | 214 % | space,filtration |
| goldfish x12 | g150 | 19 % | - | g150 | 16 % | - |
| goldfish x25 | g240 | 25 % | - | g240 | 22 % | - |
| goldfish x50 | c8 | 32 % | space | c8 | 28 % | space |
| comet x3 | g40b | 29 % | - | g40b | 26 % | - |
| comet x6 | g90 | 27 % | - | g90 | 23 % | - |
| comet x12 | g180 | 29 % | - | g180 | 26 % | - |
| comet x25 | c8 | 30 % | - | c8 | 26 % | - |
| comet x50 | c8 | 59 % | space | c8 | 52 % | space |
| clownloach x25 | c8 | 18 % | space | c8 | 16 % | space |
| clownloach x50 | c8 | 36 % | space | c8 | 32 % | space |
| mystery x12 | g5 | 38 % | - | g5 | 43 % | - |
| mystery x25 | g15 | 60 % | - | g15 | 45 % | - |
| mystery x50 | g30b | 60 % | - | g30b | 51 % | - |
| ocellaris x50 | g180 | 17 % | - | g180 | 15 % | - |
| yellowtang x3 | g55 | 25 % | - | g55 | 22 % | - |
| yellowtang x6 | g55 | 49 % | - | g55 | 43 % | - |
| yellowtang x12 | g90 | 60 % | - | g90 | 52 % | - |
| yellowtang x25 | g180 | 69 % | - | g180 | 61 % | - |
| yellowtang x50 | g300 | 84 % | - | g300 | 74 % | - |
| bluetang x3 | g125 | 45 % | - | g125 | 40 % | - |
| bluetang x6 | g125 | 90 % | - | g125 | 79 % | - |
| bluetang x25 | c8 | 125 % | filtration | c8 | 111 % | filtration |
| bluetang x50 | c8 | 251 % | space,filtration | c8 | 221 % | space,filtration |
| banggai x50 | g90 | 23 % | - | g90 | 20 % | - |
| chromis x50 | g210 | 16 % | - | g210 | 14 % | - |
| coralbeauty x25 | g180 | 18 % | - | g180 | 16 % | - |
| coralbeauty x50 | c8 | 18 % | - | c8 | 16 % | - |
| turbo x3 | g5 | 32 % | - | g5 | 37 % | - |
| turbo x6 | g8c | 63 % | - | g8c | 57 % | - |
| turbo x12 | g20l | 73 % | - | g20l | 58 % | - |
| turbo x25 | g60b | 55 % | - | g60b | 48 % | - |
| turbo x50 | g180 | 38 % | - | g180 | 34 % | - |
| axolotl x3 | g20l | 50 % | - | g20l | 39 % | - |
| axolotl x6 | g60b | 36 % | - | g60b | 31 % | - |
| axolotl x12 | g180 | 25 % | - | g180 | 22 % | - |
| axolotl x25 | c8 | 25 % | space | c8 | 22 % | space |
| axolotl x50 | c8 | 50 % | space | c8 | 44 % | space |

## Builds: the mismatch is gone
Every tankFor pick that fits (427) now has a build at or under 100 % filtration (before, picks like 3 oscars in 180 gal had only builds at 130 %). 105 picks get a sump build. Balanced builds that switch to a sump (same tank), before -> after (filter, set-up $, filtration):

| species x count | tank | before | after |
|---|---|---|---|
| gourami x25 | g60b | sponge $837 98% | sump $1066 26% |
| gourami x50 | g120 | canister $2030 114% | sump $2099 27% |
| peacock x50 | g180 | hob $3192 73% | sump $3523 15% |
| kadango x12 | g60b | sponge $885 106% | sump $1113 28% |
| kadango x25 | g120 | canister $2152 128% | sump $2222 31% |
| kadango x50 | g180 | hob $3332 194% | sump $3663 41% |
| livingstonii x3 | g55 | sponge $616 77% | sump $840 21% |
| livingstonii x6 | g75 | canister $1078 96% | sump $1072 30% |
| livingstonii x12 | g180 | hob $2282 134% | sump $2613 28% |
| livingstonii x25 | g300 | canister $4052 173% | sump $4248 36% |
| livingstonii x50 | c8 | canister $5260 319% | sump $5580 56% |
| syno x50 | c8 | canister $5024 121% | sump $5344 21% |
| angel x6 | g40b | sponge $638 82% | sump $832 28% |
| angel x12 | g75 | canister $1168 97% | sump $1163 30% |
| angel x25 | g150 | canister $2203 173% | sump $2323 35% |
| angel x50 | g240 | canister $4046 186% | sump $3964 45% |
| discus x6 | g55 | sponge $979 74% | sump $1204 20% |
| discus x12 | g90 | canister $1861 89% | sump $1910 24% |
| discus x25 | g180 | hob $3805 134% | sump $4136 28% |
| discus x50 | g300 | canister $7072 167% | sump $7268 34% |
| oscar x3 | g180 | hob $2082 126% | sump $2414 27% |
| oscar x6 | g180 | hob $2198 252% | sump $2529 53% |
| oscar x12 | c8 | canister $4410 289% | sump $4730 51% |
| oscar x25 | c8 | canister $4910 603% | sump $5231 107% |
| oscar x50 | c8 | canister $5873 1206% | sump $6193 214% |
| goldfish x12 | g150 | canister $1848 81% | sump $1968 16% |
| goldfish x25 | g240 | canister $3398 91% | sump $3316 22% |
| goldfish x50 | c8 | canister $4762 157% | sump $5082 28% |
| comet x3 | g40b | sponge $507 76% | sump $701 26% |
| comet x6 | g90 | canister $957 86% | sump $1006 23% |
| comet x12 | g180 | hob $1967 124% | sump $2298 26% |
| comet x25 | c8 | canister $3996 148% | sump $4316 26% |
| comet x50 | c8 | canister $4087 296% | sump $4407 52% |
| clownloach x25 | c8 | canister $4499 89% | sump $4819 16% |
| clownloach x50 | c8 | canister $5050 179% | sump $5370 32% |
| mystery x12 | g5 | canister $512 38% | sump $474 43% |
| mystery x25 | g15 | canister $603 74% | sump $602 45% |
| mystery x50 | g30b | canister $853 136% | sump $886 51% |
| ocellaris x50 | g180 | hob $4784 72% | sump $5115 15% |
| yellowtang x3 | g55 | sponge $2193 80% | sump $2418 22% |
| yellowtang x6 | g55 | sponge $3074 160% | sump $3299 43% |
| yellowtang x12 | g90 | canister $5496 192% | sump $5545 52% |
| yellowtang x25 | g180 | hob $10341 289% | sump $10672 61% |
| yellowtang x50 | g300 | canister $19440 360% | sump $19637 74% |
| bluetang x3 | g125 | canister $3228 171% | sump $3304 40% |
| bluetang x6 | g125 | canister $3826 342% | sump $3902 79% |
| bluetang x25 | c8 | canister $10302 625% | sump $10622 111% |
| bluetang x50 | c8 | canister $15289 1250% | sump $15609 221% |
| banggai x50 | g90 | canister $4282 73% | sump $4331 20% |
| chromis x50 | g210 | hob $4145 76% | sump $4541 14% |
| coralbeauty x25 | g180 | hob $5230 78% | sump $5561 16% |
| coralbeauty x50 | c8 | canister $9778 89% | sump $10099 16% |
| turbo x3 | g5 | canister $936 32% | sump $897 37% |
| turbo x6 | g8c | canister $978 63% | sump $953 57% |
| turbo x12 | g20l | canister $1235 118% | sump $1247 58% |
| turbo x25 | g60b | sponge $1487 184% | sump $1716 48% |
| turbo x50 | g180 | hob $3288 162% | sump $3620 34% |
| axolotl x3 | g20l | canister $806 79% | sump $817 39% |
| axolotl x6 | g60b | sponge $1097 120% | sump $1326 31% |
| axolotl x12 | g180 | hob $3029 105% | sump $3360 22% |
| axolotl x25 | c8 | canister $6193 126% | sump $6513 22% |
| axolotl x50 | c8 | canister $8469 251% | sump $8789 44% |

Example scenes as saved: no number moves (none uses a sump). With the SPS preset (a sump) the reef scene's set-up drops $4847 -> $4415 and clownnano's $2616 -> $2478 (filtration 4 -> 3 %) (a plain tank + plumbing is cheaper than the old sump-box row); stocking, filtration and $/month unchanged.
