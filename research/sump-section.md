# Lane SU: the sump as a Tech section (2026-10-22)

Nathan 2026-10-22: "yea this should be an additional section in the 'tech'. Reuse the same presets or custom size tanks for it."

## What the engine does now (branch `su`)
- `tech.sump = { model?, L, D, H }` (interior mm; `model` = a plain catalogue size, its size re-read on load; custom sides 50-3000 mm). Older files load as before; a sump filter with no size gets **the default sump**: the smallest plain catalogue size of at least 25 % of the display volume (SUMP_SHARE) that is no longer than the display, else the largest that fits.
- **Its water**: volume x 0.5 (SUMP_FILL: half full, the rest is drain-down room) is added to the litres the nitrogen budget works on (filtration %, nitrate, sump media). **Not** to Space or the tank minimum (no fish swims in the sump). The weekly water change is a share of display + sump water (the gallons changed come out about the same: more water at a lower share).
- **Price**: three gear rows in the Filtration line: sump tank (a bare glass tank of its gallons, the tank:N rows; not the catalogue listings, which are display tanks), sump plumbing (new row gear:sump-plumbing, $69.95 cited: Custom Aquariums Ultimate 4 Hole 3600GPH Plumbing Kit, https://www.customaquariums.com/?p=11463; lo $40 = their 2 hole kit, hi $150 = with an overflow box, judgement), return pump (as before). Before, the sump was the gear:sump "sump box" row ($300 at 55 gal, scaled).
- **Offered** (`sumpOffered`, one rule for tankfit and builds): salt from 29 gal (the option's minGal already in tech.json), fresh from 75 gal (proposal; the catalogue's reef-ready tanks start at 65 gal). Before: tankfit allowed a sump on any tank, builds never offered one.
- **Sizes**: the sump picker and the default start at 10 gal (SUMP_MIN_GAL); a typed custom size can be anything 50-3000 mm a side.
- **Counted once**: the sump tank, plumbing and pump are one unit of the Filtration row (its total includes them); the Sump row reads "in Filtration" (test: canister + sump costs the canister plus the sump unit).
- New constants SUMP_MIN_GAL, SUMP_FILL, SUMP_SHARE, SUMP_FRESH_GAL are assumptions in provenance.ts FORMULAS (ratchet passes).

## Tank picks that move (tankFor, 73 water species x 1/3/6/12/25/50 = 438 cases)
| species x count | before tank | filtration | fails | after tank | filtration | fails |
|---|---|---|---|---|---|---|
| mystery x50 | g10 | 98 % | - | g2_5 | 80 % | - |
| bluetang x12 | g300 | 85 % | - | c6 | 99 % | - |
| turbo x12 | g15 | 97 % | - | g29 | 44 % | - |
| turbo x25 | g37 | 85 % | - | g29 | 92 % | - |
| turbo x50 | g75 | 81 % | - | g55 | 99 % | - |
| axolotl x6 | g60b | 40 % | - | g75 | 26 % | - |

Notes: 12 turbo snails now need 29 gal (no sump under 29 gal), but 25 and 50 drop a size because a 29 / 55 gal salt tank now counts its sump water. 6 axolotls: a fresh 60 gal breeder gets no sump. 12 blue tangs: the 6 ft custom (205 gal) now passes with its sump water (before: 300 gal). **50 mystery snails drop to 2.5 gal**: the sumpOffered gate already covers tankfit's strongest-filter fallback (the filter loop skips the sump before "strongest" is chosen). On main, that fallback took a sump on the 2.5-8 gal tanks (by its 1.3 capacity, though its media is 5 % of a few litres) and judged 2.5 gal at 426 %, while main's own builds for 2.5 gal already gave a canister at 80 %. Now tankfit agrees with the builds (80 %). The 2.5 gal answer is the snail bioload question (CF: "looks too low"), for Nathan, not changed here.

## Filtration % that moves with the same tank (54 cases; the tank pick holds)
Large tanks read lower (their sump water dilutes); fresh 40-60 gal tanks that used to count a sump read higher (no sump offered there). Every one still fits.

| species x count | before tank | filtration | fails | after tank | filtration | fails |
|---|---|---|---|---|---|---|
| gourami x50 | g150 | 27 % | - | g150 | 24 % | - |
| peacock x50 | g180 | 19 % | - | g180 | 17 % | - |
| kadango x12 | g55 | 22 % | - | g55 | 72 % | - |
| kadango x25 | g120 | 23 % | - | g120 | 20 % | - |
| kadango x50 | g210 | 26 % | - | g210 | 23 % | - |
| livingstonii x3 | g55 | 26 % | - | g55 | 87 % | - |
| livingstonii x6 | g90 | 32 % | - | g90 | 27 % | - |
| livingstonii x12 | g180 | 35 % | - | g180 | 31 % | - |
| livingstonii x25 | c8 | 36 % | - | c8 | 31 % | - |
| livingstonii x50 | c8 | 71 % | space | c8 | 62 % | space |
| syno x25 | g240 | 21 % | - | g240 | 18 % | - |
| syno x50 | c8 | 27 % | space | c8 | 24 % | space |
| angel x6 | g40b | 35 % | - | g40b | 93 % | - |
| angel x12 | g90 | 32 % | - | g90 | 28 % | - |
| angel x25 | g180 | 37 % | - | g180 | 32 % | - |
| angel x50 | c8 | 36 % | - | c8 | 31 % | - |
| discus x6 | g55 | 26 % | - | g55 | 84 % | - |
| discus x12 | g75 | 36 % | - | g75 | 32 % | - |
| discus x25 | g135 | 48 % | - | g135 | 42 % | - |
| discus x50 | g240 | 54 % | - | g240 | 47 % | - |
| oscar x3 | g180 | 33 % | - | g180 | 29 % | - |
| oscar x6 | g180 | 66 % | - | g180 | 58 % | - |
| oscar x12 | c8 | 65 % | - | c8 | 56 % | - |
| oscar x25 | c8 | 134 % | space,filtration | c8 | 117 % | space,filtration |
| oscar x50 | c8 | 269 % | space,filtration | c8 | 234 % | space,filtration |
| goldfish x25 | g300 | 22 % | - | g300 | 19 % | - |
| goldfish x50 | c8 | 35 % | space | c8 | 31 % | space |
| comet x3 | g50b | 27 % | - | g50b | 83 % | - |
| comet x6 | g120 | 25 % | - | g120 | 21 % | - |
| comet x12 | g210 | 28 % | - | g210 | 25 % | - |
| comet x25 | c8 | 33 % | space | c8 | 29 % | space |
| comet x50 | c8 | 66 % | space | c8 | 58 % | space |
| clownloach x6 | g180 | 20 % | - | g180 | 18 % | - |
| clownloach x12 | c8 | 20 % | - | c8 | 17 % | - |
| clownloach x25 | c8 | 41 % | space | c8 | 36 % | space |
| clownloach x50 | c8 | 82 % | space | c8 | 72 % | space |
| ocellaris x50 | g210 | 16 % | - | g210 | 14 % | - |
| yellowtang x3 | g55 | 27 % | - | g55 | 24 % | - |
| yellowtang x6 | g55 | 55 % | - | g55 | 48 % | - |
| yellowtang x12 | g90 | 67 % | - | g90 | 57 % | - |
| yellowtang x25 | g180 | 76 % | - | g180 | 67 % | - |
| yellowtang x50 | c8 | 74 % | - | c8 | 64 % | - |
| bluetang x3 | g125 | 50 % | - | g125 | 43 % | - |
| bluetang x6 | g125 | 100 % | - | g125 | 87 % | - |
| bluetang x25 | c8 | 139 % | filtration | c8 | 121 % | filtration |
| bluetang x50 | c8 | 279 % | space,filtration | c8 | 243 % | space,filtration |
| banggai x50 | g120 | 21 % | - | g120 | 18 % | - |
| coralbeauty x12 | g60b | 28 % | - | g60b | 24 % | - |
| coralbeauty x25 | g180 | 20 % | - | g180 | 18 % | - |
| coralbeauty x50 | c8 | 20 % | space | c8 | 17 % | space |
| axolotl x3 | g40b | 28 % | - | g40b | 73 % | - |
| axolotl x12 | g180 | 28 % | - | g180 | 24 % | - |
| axolotl x25 | c8 | 28 % | space | c8 | 24 % | space |
| axolotl x50 | c8 | 56 % | space | c8 | 49 % | space |

## Builds: the mismatch is gone
Every tankFor pick that fits (412) now has a build at or under 100 % filtration (before, picks like 3 oscars in 180 gal had only builds at 130 %). 101 picks get a sump build. Balanced builds that switch to a sump (same tank), before -> after (filter, set-up $, filtration):

| species x count | tank | before | after |
|---|---|---|---|
| gourami x25 | g75 | canister $1200 63% | sump $1195 21% |
| gourami x50 | g150 | canister $2246 110% | sump $2366 24% |
| peacock x50 | g180 | hob $3192 75% | sump $3523 17% |
| kadango x25 | g120 | canister $2152 78% | sump $2222 20% |
| kadango x50 | g210 | hob $3587 114% | sump $3983 23% |
| livingstonii x6 | g90 | canister $1112 95% | sump $1161 27% |
| livingstonii x12 | g180 | hob $2282 138% | sump $2613 31% |
| livingstonii x25 | c8 | canister $4604 166% | sump $4924 31% |
| livingstonii x50 | c8 | canister $5260 331% | sump $5580 62% |
| syno x25 | g240 | canister $3551 72% | sump $3469 18% |
| syno x50 | c8 | canister $5024 126% | sump $5344 24% |
| angel x12 | g90 | canister $1202 96% | sump $1251 28% |
| angel x25 | g180 | hob $2484 145% | sump $2815 32% |
| angel x50 | c8 | canister $4981 167% | sump $5301 31% |
| discus x12 | g75 | canister $1803 95% | sump $1797 32% |
| discus x25 | g135 | canister $3489 177% | sump $3574 42% |
| discus x50 | g240 | canister $6689 183% | sump $6607 47% |
| oscar x3 | g180 | hob $2082 130% | sump $2414 29% |
| oscar x6 | g180 | hob $2198 261% | sump $2529 58% |
| oscar x12 | c8 | canister $4410 301% | sump $4730 56% |
| oscar x25 | c8 | canister $4910 626% | sump $5231 117% |
| oscar x50 | c8 | canister $5873 1252% | sump $6193 234% |
| goldfish x25 | g300 | canister $3781 88% | sump $3977 19% |
| goldfish x50 | c8 | canister $4762 163% | sump $5082 31% |
| comet x6 | g120 | canister $1473 84% | sump $1542 21% |
| comet x12 | g210 | hob $2222 123% | sump $2618 25% |
| comet x25 | c8 | canister $3996 154% | sump $4316 29% |
| comet x50 | c8 | canister $4087 308% | sump $4407 58% |
| clownloach x6 | g180 | hob $2099 80% | sump $2430 18% |
| clownloach x12 | c8 | canister $4212 92% | sump $4532 17% |
| clownloach x25 | c8 | canister $4499 191% | sump $4819 36% |
| clownloach x50 | c8 | canister $5050 383% | sump $5370 72% |
| ocellaris x50 | g210 | hob $5097 71% | sump $5493 14% |
| yellowtang x3 | g55 | sponge $2193 82% | sump $2418 24% |
| yellowtang x6 | g55 | sponge $3074 164% | sump $3299 48% |
| yellowtang x12 | g90 | canister $5496 197% | sump $5545 57% |
| yellowtang x25 | g180 | hob $10341 298% | sump $10672 67% |
| yellowtang x50 | c8 | canister $20001 344% | sump $20321 64% |
| bluetang x3 | g125 | canister $3228 176% | sump $3304 43% |
| bluetang x6 | g125 | canister $3826 352% | sump $3902 87% |
| bluetang x25 | c8 | canister $10302 649% | sump $10622 121% |
| bluetang x50 | c8 | canister $15289 1297% | sump $15609 243% |
| banggai x50 | g120 | canister $4796 72% | sump $4866 18% |
| coralbeauty x12 | g60b | sponge $2400 87% | sump $2629 24% |
| coralbeauty x25 | g180 | hob $5230 80% | sump $5561 18% |
| coralbeauty x50 | c8 | canister $9778 92% | sump $10099 17% |
| axolotl x12 | g180 | hob $3029 109% | sump $3360 24% |
| axolotl x25 | c8 | canister $6193 130% | sump $6513 24% |
| axolotl x50 | c8 | canister $8469 261% | sump $8789 49% |

Example scenes as saved: no number moves (none uses a sump). With the SPS preset (a sump) the reef scene's set-up drops $4847 -> $4415 and clownnano's $2616 -> $2478 (filtration 4 -> 3 %) (a plain tank + plumbing is cheaper than the old sump-box row); stocking, filtration and $/month unchanged.
