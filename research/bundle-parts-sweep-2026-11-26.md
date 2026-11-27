# Bundle parts sweep (2026-11-26)

Every bundle in `src/data/deals.json` (37 rows), part by part: what it is, whether it is sold alone, the price the "Saves vs the parts" comparison now uses, and whether a model was added.
Commits: 934669fb (pilot), 75f00852 (batch 1), 021609ec (batch 2). Research notes per retailer: the side-session notes folder of this sweep (parts-*.md, chrome-prices.md).

**How the parts side is priced:**
- **Tank:** priced by gallons, or by a bare-tank sale running now. Never from the bundle's own tank, which is never sold alone.
- **Stand:** a real product, or a bundle-only stand priced as its cheapest real equivalent (new `kitOnly` / `equiv`). Otherwise the generic estimate.
- **Hood:** the cheapest real hood sold for the size.
- **Lid:** the cheapest real glass lid that fits, else the estimate.
- **Light:** a kit-only light is priced as a basic LED bar.
- **Filter / heater:** matched to catalogued models.

**Sources:** O = page opened (fetched or read in a browser); S = search snippet; L = already in the library.

## Ensembles (tank + stand)
| Bundle | Part | Product | Sold alone? | Price used | Model |
|---|---|---|---|---|---|
| Marineland HD 45 ($549.99) | stand | HD 45 ensemble stand, 37.75x14.125x29.25, black + grey wood doors | no | Aqueon 30/38/45 cabinet 36x12 $269.99 (Blue Fish, S) | yes `marineland-hd-45-stand` |
| | light | hidden LED, white + blue | no | basic LED bar | yes `marineland-hd-45-kit-led` (kitOnly) |
| | canopy | glass, kit-only | no | glass lid estimate; Marineland Perfecto 36x13 $51.99 (O) added to lids but too deep to fit-match | no |
| | tank | HD extra-tall 45 | no | by gallons | existing |
| Marineland Modern 60 ($349.99) | stand / light | done earlier (R183): Marineland Modern 48x13 $263.99; kit-only LED | stand yes | as before | existing |
| Marineland HD 75 ($449.99 to 11/29) | stand | HD 75 ensemble stand 50x20x28, grey farmhouse, barn doors | no | Top Fin Raven Oak 55-75 $254.99 sale (PetSmart, O) | yes `marineland-hd-75-stand` (new doorStyle 'barn') |
| | light | hidden LED | no | basic LED bar | yes `marineland-hd-75-kit-led` (kitOnly) |
| | canopy | glass | no | Marineland Perfecto 48x18 $79.99 (L) | no |
| Top Fin 36 ensemble ($199.99 to 11/29) | tank | bow front 36 (row moved from g37 to bow36) | no | by gallons | existing |
| | stand | bow cabinet 30.7x15.7x30.7, dark grey wood, plank doors | no | generic estimate (no bow-shaped stand model; nearest sold alone: Top Fin bowfront 36 stand $157.24 sale, O) | no |
| | hood / light | hood with LED | no | cheapest fitting hood | no |

## Aquarium starter kits (hood + LED + filter + heater)
In all of these, the kit's hood with its LED is **kit-only**. The parts side prices it as the cheapest real hood sold for the size, which the hoods library already has: Top Fin LED hood 20H $49.99, Aqueon Deluxe LED 20 in $54.95, Imagitarium LED hood 24 $59.99, and others. The filters and heaters below are in the library unless noted.
| Bundle | Price now | Filter | Heater | Notes |
|---|---|---|---|---|
| PetSmart Top Fin Essentials 20 | $74.99 to 11/29 (O) | Silenstream PF20 (L) | 100 W Top Fin (L) | |
| PetSmart Top Fin Essentials 29 | $82.99 to 11/29 (O) | not named | not named | |
| PetSmart Top Fin Essentials 55 | $124.99 to 11/29 (O) | not named | not named | |
| PetSmart Captivate hex 20 | $74.99 to 11/29 (O) | PF20 | 100 W | hex: no catalogue tank, no scene |
| PetSmart Bow Front 36 | $89.99 to 11/29 (O) | PF40 | 200 W | |
| PetSmart Cube 10 | $45 to 11/29 (O) | PF10 | 50 W | |
| PetSmart Bubble Wall 20 | $149.99 (O) | internal, not named | none | bubble wand + air-1000 pump kit-only |
| PetSmart Black Glass 10 | $71.99 to 11/29 (O) | not named | none | blue + white LED |
| PetSmart Fluval Plant 9 | $139.99 (O) | AquaClear 20 | none | 7000K plant LED kit-only; nearest Fluval Plant 3.0 15-24 in $149.99 (S) |
| Petco Imagitarium 10 / 20 / 29 / 40 / 55 | $69.74 / $110.99 / $122.24 / $134.99 / $187.49, 25 % off (O) | HOB, model not named (EXFIL in library) | adjustable, watts not named | 29 pickup only; 20, 40, 55 "only 1 left" |
| Walmart Aqua Culture 5 | out of stock (O) | Tetra internal | none | |
| Walmart Vibrant Life 10 / 20 | $52.97 / $108 (O) | VL 75 / 125 GPH (125: ~$24 alone, S) | none | |
| Walmart Tetra Complete 20 | $142.97 (O) | Whisper on file; page says internal | yes, watts not named | |
| Walmart Aqueon LED 20H | $158.42 (O) | QuietFlow 10 ($24.95 alone, S) | 100 W preset | |
| Walmart Tetra LED 10 | $53.71, out of stock (O) | Whisper PF10 | not confirmed | |
| Chewy Tetra Complete 10 / 29 | $76.74 / $190.69 (O) | internal / Whisper | 29: 200 W in some listings (S) | Tetra LED hood 30x12 $79.99 alone (O) |
| Chewy Tetra LED + Decor 20 | $119.14 (O) | Whisper | Tetra mini | Tetra LED hood 24x12 $89.99 alone (O), not yet in library |
| Chewy / Amazon Aqueon SmartClean 10, Amazon 20 | $103.99 / $103.99 / $151.99 (O) | SmartClean Small ($20.88 alone, S) | 50 W preset (aqueon.com, O) | |
| Amazon Tetra 20 | currently unavailable (O) | Whisper | yes | |

## Terrarium kits
The terrarium parts (domes, bulbs, UVB, gauges) are priced by the dry-gear rows, not by products. None were added to a library in this sweep.
| Kit | Price now | Sold alone |
|---|---|---|
| PetSmart Thrive Desert 40 | $129.99 to 11/29 (O) | Thrive Open Glass 40 $114.99 (not front-opening); Zoo Med Deep Dome 8.5 in $29.98 |
| PetSmart Zoo Med gecko 20 | $109.99 to 11/29 (O) | Mini Deep Dome $21.99; Basking Spot 75 W $10.98; the 30x12x12 is not sold alone |
| Tractor Supply Zoo Med beardie 40 | $291.99 (S, not updated) | the same kit is $139.99 at PetSmart (O). Front Opening 40 $134.99, ReptiSun 10.0 mini $34.99, Basking Spot 100 W $10.98 |
| Petco Imagitarium breeder 40 | $75, reg $150 (O) | tank only |
| Target Repti Zoo 40 | $199.99, was $299.99 (O); confidence now medium | the terrarium itself |
| Josh's Frogs beardie 24x18x18 | $341.06 (O) | every part sold alone at Josh's Frogs; parts sum $286.01, so the kit costs $55 more |

## Saving vs the parts, before -> after (default profile, priced 2026-11-26)
| Bundle | Before | After |
|---|---|---|
| Marineland HD 45 | -$194 | -$73 |
| Marineland HD 75 | -$1 | $80 |
| Top Fin 36 ensemble | $99 | $133 |
| Top Fin Essentials 20 / 29 / 55 | $46 / $96 / $228 | $81 / $148 / $307 |
| Top Fin Bow Front 36 | $198 | $254 |
| Imagitarium 10 / 20 / 29 / 40 / 55 | $55 / $16 / $116 / $73 / $208 | $80 / $55 / $159 / $120 / $274 |
| Walmart Tetra Complete 20 | $17 | -$8 |
| Walmart Tetra LED 10 | -$92 | $51 (out of stock) |
| Aqueon SmartClean 10 Chewy / Amazon, 20 Amazon | -$11 / -$1 / -$15 | $17 / $17 / $16 |
| Unchanged | | Modern 60 $103, Cube 10 $122, Bubble Wall 20 -$13, Black Glass 10 $61, Fluval Plant 9 -$54, Aqua Culture 5 $36, Vibrant Life 10 $81 / 20 $13, Aqueon 20H $15, Chewy Tetra 10 $15 / 29 -$13 / Decor 20 $17, Amazon Tetra 20 -$40 |

## Found, not fixed (follow-ups)
- **Fixed (same day):** six aquarium bundles were never offered, because `dealsFor` allowed a measured tank only 7 % over its rated gallons (the bow 36 measures 40.4 to 41.1 gal; the Imagitarium 29 / 40 / 55 measure 31.6 / 43.4 / 61). `dealsFor` now also offers a bundle whose own tank size (`dims`) matches the build's tank within 1.5 in each way.
- The Captivate hex 20 and all terrarium kits have no deal scene (no catalogue tank), so they have no saving line.
- The Tetra LED hood 24x12 ($89.99) needs its photo look and a baked gear tile before it can go in hoods.json. The pm1 and eq2 tests require both.
- The kit stands of the HD 45 and HD 75 have estimated trim sizes (base, top, frame); the HD 45 base reads lighter than the real black plinth.
