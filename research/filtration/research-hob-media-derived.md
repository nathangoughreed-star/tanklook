# HOB / canister media volumes derived from physical data (2026-10-20)

Conversions: 1 in3 = 0.016387 L. All source dims are RETAILER/aftermarket listings (no manufacturer volumes exist); many retailer "dimensions" are package sizes, flagged below. Searches only (no page-level reads except one 404), so every number is search-summary level.

## Assumptions used
- Ceramic ring (BioMax-type) bulk density 0.5-0.8 g/mL (typical sintered ring media; NOT sourced, no BioMax density published; the Fluval 500 g bag has no litre figure on any listing). Litres = grams / density.
- Activated carbon bulk density ~0.45-0.5 g/mL (typical granular carbon; unsourced).
- Foam: litres = L x W x H (in) x 0.016387, block as sold (uncompressed).

## BioMax net weights per insert (retailer listings)
20 = 60 g (bluebarn.shop; another listing says 42 g / 1.5 oz for "20/30"), 30 = 65 g (joshsfrogs), 50 = 125 g (marketplace, weaker), 70 = 195 g (joshsfrogs; also in prior note), 110 = 390 g (bluebarn). 
Arithmetic (g/0.8 to g/0.5): 20: 0.075-0.12 L; 30: 0.08-0.13; 50: 0.16-0.25; 70: 0.24-0.39; 110: 0.49-0.78.

## Foam per insert (dimension listings)
- AC50: listing A1394 "4.9 H x 5 W x 2.5 D in" = 61.3 in3 = 1.00 L; listing A613 "1.7 x 2.6 x 5.1 in" = 22.5 in3 = 0.37 L (0.64 oz). Range 0.37-1.0 L.
- AC70: thatpetplace 3-pack "5.5 x 3.5 x 2 in" = 38.5 in3 = 0.63 L; generic listing "5.5 x 6.6 x 3.8" = 138 in3 = 2.26 L (almost equals the 141 in3 / 2.31 L aftermarket basket outer envelope, so it is probably the basket, not foam). Range 0.63-1.0 L (upper bound by fit inside 2.31 L gross basket together with BioMax + carbon).
- AC30: one listing 5.1 x 3.8 x 2.3 in = 44.6 in3 = 0.73 L, but it is attached to an A1394/AC70 listing so model label unreliable. Scaled from AC50 by BioMax mass (65/125 = 0.52): 0.19-0.52 L; use 0.2-0.5.
- AC20: scaled by BioMax mass (60/125 = 0.48): 0.18-0.48; use 0.15-0.4 (smallest basket).
- AC110: scaled by mass (390/125 = 3.1 x AC50): 1.2-3.1 L; listing "13.5 x 11 x 4.2 in" is a 3-pack (package or stacked) = 624 in3 = 10.2 L /3 = 3.4 L per insert if it is the pack's outer; consistent with the upper end. Use 1.5-3.2.

## Carbon per insert
No AquaClear/Aqueon/Penguin/Tetra carbon weight published on any listing found (one 0.00 oz placeholder). Estimate: carbon pad occupies a layer comparable to the BioMax bag, 0.8-1.5 x BioMax volume. AC70: 0.2-0.5 L. Confidence low. Cascade: Penn-Plax Pro-Carb 8 oz 2-pack fits Cascade 500-1500 so 1 bag = 4 oz = 113 g; /0.5 to /0.45 = 0.23-0.25 L (assumes one bag = half of that pack).

## Table

| Model | Foam / floss L (low-high) | Ceramic / BioMax L | Carbon L | Method | Source URLs | Confidence |
|---|---|---|---|---|---|---|
| AquaClear 20 | 0.15-0.4 | 0.075-0.12 | 0.06-0.15 | BioMax 60 g / 0.5-0.8; foam scaled by BioMax mass from AC50 (0.48x) | https://bluebarn.shop/product/aquaclear-20-bio-max-filter-insert/ ; https://fishtanksdirect.com/hagen-aquaclear-20-biomax-insert | Low (weight conflict 42 vs 60 g) |
| AquaClear 30 | 0.2-0.5 | 0.08-0.13 | 0.07-0.17 | BioMax 65 g; foam 5.1x3.8x2.3 in = 0.73 L listing (doubtful) vs mass scaling | https://training.joshsfrogs.com/sp/aquaclear-30-bio-max-insert-2-3-oz-pta1371 ; https://www.walmart.com/ip/185259462 | Low |
| AquaClear 50 | 0.37-1.0 | 0.16-0.25 | 0.13-0.3 | foam 4.9x5x2.5 in = 61.3 in3 = 1.0 L (A1394) or 1.7x2.6x5.1 = 0.37 L (A613); BioMax 125 g / 0.5-0.8 | https://www.chewy.com/aquaclear-foam-filter-insert-size-50/dp/128681 ; https://www.ebay.com/p/2254337575 ; https://www.walmart.com/ip/941332002 | Low-Med (foam listings disagree 2.7x) |
| AquaClear 70 | 0.63-1.0 | 0.24-0.39 | 0.2-0.5 | foam 5.5x3.5x2 = 38.5 in3 = 0.63 L; upper bound from basket envelope 7.25x5.375x3.625 = 141 in3 = 2.31 L gross (sum of 3 layers must be below this); BioMax 195 g | https://www.thatpetplace.com/foaminsert-aqua-clear-70-300-3pk ; https://aquariumdepot.ca/products/intank-media-basket-for-fluval-aquaclear-70-hagen-aquaclear-70 ; https://joshsfrogs.com/sp/aquaclear-70-bio-max-insert-6-8-oz-pta1373 | Medium (total 1.1-1.9 L within envelope) |
| AquaClear 110 | 1.5-3.2 | 0.49-0.78 | 0.4-1.0 | BioMax 390 g / 0.5-0.8; foam by mass scaling and 13.5x11x4.2 in 3-pack listing | https://www.bluebarn.shop/product/aquaclear-110-bio-max-filter-insert/ ; https://andoffice.com/products/aquaclear-110-foam-insert-3-pack/209697200/ | Low |
| Tetra Whisper PF10 (medium Bio-Bag) | floss+carbon bag 0.2-0.34 total | 0 | (in bag) | medium cartridge 3.5 in wide x 5.75-6.8 tall x thickness 0.6-1.0 in (thickness ASSUMED) = 12-24 in3 | https://www.thatpetplace.com/whisper-bio-bag-cartridge-medium-3pk-assembled ; https://www.petsmart.com/fish/filters-and-pumps/filter-media/tetra-bio-bag-cartridges-8-ct-5362331.html | Low |
| Tetra Whisper PF20/30/40 (large cartridge; PF20 may be 1, bigger models 1-2 cartridges) | 0.3-0.5 per cartridge (total) | 0 | (in bag) | large measured by buyer: ~4.75 bottom to 5 in top width, ~6.5 tall (assumed), thickness 0.6-1.0 in assumed = 19-32 in3 | same petsmart/thatpetplace pages (buyer measurement via search summary) | Low |
| Marineland Penguin 150 (Rite-Size B) / 200, 350 (Rite-Size C) | no dims found; guess B 0.2-0.35, C 0.3-0.5 per cartridge | BIO-Wheel is not submerged media (surface only) | in cartridge | none derivable; compatibility only | https://aquariumdepot.ca/products/marineland-penguin-power-filter-cartridge-rite-size-b-1pk ; https://aquariumdepot.ca/products/marineland-penguin-power-filter-cartridge-rite-size-c-6pk | Very low (guess by analogy to Whisper) |
| Aqueon QuietFlow 10-75 | cartridge: small ~0.15-0.25, medium ~0.2-0.35, large ~0.3-0.5 | 0 | in cartridge | listed "0.5 x 5.25 x 7.0" (large) / "0.5 x 5 x 4.5" (medium) are package dims; cartridge thickness ~0.5 in x 5.25 x 7 = 18 in3 = 0.30 L gross | https://www.petsmart.com/fish/filters-and-pumps/filter-media/aqueon-aquarium-power-filter-cartridges---replacement-aquarium-filter-media-5161257.html | Very low |
| Penn-Plax Cascade 700 (2 floss, 1 bio-sponge, 1 carbon bag) | floss 2 x 0.15-0.38 = 0.3-0.76; bio-sponge 0.5-0.86 | 0 | 0.23-0.25 (4 oz, assumed half of 8 oz 2-pack) | sponge package 5.25x8x1.25 in = 52.5 in3 = 0.86 L (upper, package); floss 6-pk box 5.75x3x8 = 138 in3 / 6 = 23 in3 = 0.38 L each compressed (upper) | https://penn-plax.focuspointsap.com/ccf229 ; https://penn-plax.focuspointsap.com/ccf231 | Low |
| Penn-Plax Cascade 1000 (3 floss, 1 sponge, 1 carbon) | floss 0.45-1.1; sponge 0.5-0.86 | 0 | 0.23-0.25 | same pad dims, 3 pads | same + https://www.walmart.com/ip/17631372 | Low |
| Marineland Magniflow 220/360 | not derivable (no tray dims anywhere; unit 14 x 11 x 18 in only) | ceramic rings + bio-balls, qty unknown | bag, qty unknown | none | https://www.liveaquaria.com/products/marineland-magniflow-canister-filters | None |
| Fluval C / U series | not searched in this pass (prior note: nothing published) | BioMax 500 g bag known, no litres | | | https://www.gardensite.co.uk/aquatics/fluval-biomax-bio-rings-500-g.htm | None |

## Water through media vs bypass
No measured test found (no "flow with and without media" data for AquaClear, Penguin, Whisper, Aqueon, Cascade). Searches returned only: Hagen manual wording (prior note) that foam must fill the basket bottom with no gap (anti-bypass); AquaClear "up to 50% of water in the chamber is reprocessed" at low flow (marketing, Desertcart listing); a loaches.com thread (https://forums.loaches.com/viewtopic.php?p=85505) showing the intake grate blocks ~70% of intake area and the flow-control plate restricts the impeller, i.e. media is not the dominant restriction. Design logic: AquaClear and Whisper/Aqueon cartridge designs route all water through the media stack in the clean state and only spill over the basket/cartridge lip once clogged (designed overflow). Recommended model values (judgment, not sourced): through-media fraction 0.9-1.0 clean, falling toward 0.5-0.7 near end of the cleaning interval for cartridge HOBs; Fluval canister circulation is 59-68 % of pump rating with no media (prior note, manual sourced), which is hose loss, not bypass.

## Gaps
Fluval, Marineland, Hagen, Tetra, Aqueon manufacturer pages not read. No ring density, carbon weight, or cartridge thickness is published; the conversions above rest on stated assumptions. One thatpetplace page returned 404.
