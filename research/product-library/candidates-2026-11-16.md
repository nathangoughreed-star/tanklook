# Candidates: popular products seen, not yet in the JSON catalogues (PL1, 2026-11-16)

These need spec data (watts, GPH, mm dims, colours) before they can be rows, because filters / heaters / lights rows feed the 3D model and checks.
Prices are live list prices read from That Pet Place (TPP) listing pages on 2026-11-16 unless named. Check each against `node scripts/product-sweep-check.mjs` before adding; the checker's MAYBE lines cross types (a stand can match a light), read them by eye.

## Filters (TPP, https://www.thatpetplace.com/aquarium-supplies/aquarium-filters, pages 1-3 of 6 read)
- Fluval AC20 $43.99, AC30 $52.99, AC50 $61.99, AC70 $72.99, AC110 $114.99 (the AquaClear line under the Fluval name; we hold the same units as "AquaClear 20..110", check for the Fluval AC names)
- Fluval FX2 canister $296.99 (we have FX4, FX6)
- Marineland Penguin Pro 125 $33.92 / 175 $43.19 / 275 $51.29 / 375 $64.89 / 450 $94.72 (we hold Penguin 150/200/350, not the Pro line)
- Aqueon QuietFlow canister 200 $139.99 / 300 $209.99 / 400 $249.99 (we hold the QuietFlow HOB 10-75, not the canisters)
- Tetra Whisper IQ 60 $50.79 (IQ 20 and 45 exist)
- Sicce Aqua Filtra 10/20/40 gal $38.24 / $48.44 / $59.49; Aquael Versa Pro 20 / 60 / 80 $27.99 / $62.99 / $79.99; Aquael Hypermax 4500 $499.99; Aquatop Forza single 317 GPH $43.99 / double 500 GPH $66.99; Aquatop submersible with UV $96.99; Zoo Med Betta Clean $15.99, Paludarium 10 / 20 $19.99 / $21.99; Ziss Bubble Bio $32.99; Red Sea ReefMat 500 / 1200 $399.99 / $449.99

## Heaters (TPP page 1 of 2)
- Fluval M 50 / 100 / 150 / 200 / 300 W $32.99 / $35.99 / $36.99 / $39.99 / $42.99 (we hold M50 only; verify)
- Fluval T150 / T200 / T300 safety heater $67.99 / $69.99 / $62.99
- Zoo Med programmable 50 W $19.99 / 100 W $25.99; Hygger Titanium 100 W controller $41.99; Aquael Flow 300 W $114.99; Aquatop Nano 10 W $18.99 / Pisces 25 W $17.99; Aqueon Flat Mini 5 W $14.49

## Lights (TPP page 1 of 2)
- Finnex HLC RGBW 24/7 Auto 20 / 24 / 30 / 36 / 48 in $65.99 / $72.99 / $83.99 / $105.99 / $129.99
- Fluval Marine 4.0 22 W (15-24 in) $199.99, 32 W (23-35 in) $229.99; Marine 3.0 Nano 20 W $134.99; Plant 4.0 59 W (48-60 in) $259.99
- GloFish Magenta LED light stick 5 / 20 / 55-75 gal $32.19 / $34.79 / $51.89; Coralife Marine clip-on LED $54.99; Aqueon Planted clip-on LED $44.99; Zoo Med Betta LED lamp 5 W $10.99

## Petco (2026-11-16)
- Aqueon OptiBright Plus LED fixture $74.99 (111 reviews), OptiBright $59.99 (69), LED strip $44.99 (60); Imagitarium freshwater LED strip $59.99, planted LED strip $69.99, marine clip-on $29.99, mini betta clip-on $19.99; Fluval Aqua Sky 30 $99.99
- Aqueon Deluxe LED full hood $52.49 (288 reviews; size not read, ours is $54.95 Walmart / $64.95 PetSmart)

## Stands not added (no dimensions or footprint ambiguous)
Unipaws 20-40 $169.99 and Fluted Doors $199.99 (Chewy); GloFish Modern Farmhouse 20 gal $149.99 (Chewy); Bestier 10 gal 20x11 $79.99 and 20-29-37 $79.96 (Amazon / Walmart, height not read); Imagitarium Brooklyn 20 gal $79.99 and Newport 20 gal $89.99 (20 high vs 20 long); Aqueon black pedestal $89.99 (Petco); Aquatop Recife Eco 24 / 40 gal $137.99 / $207.99, Fluval Flex 15 / 32.5 $139.99 / $285.99, Coralife BioCube 16 / 29-32 $159.99 / $219.99, Red Sea Max Nano cabinets (nano-cube footprints we do not model).
