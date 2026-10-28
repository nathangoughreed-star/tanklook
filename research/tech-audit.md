# Tech catalogue audit: where real products should go next (2026-10-27)

Method: Amazon US Best Sellers pages (air pumps 2975471011, water pumps 2975475011, lights 2975458011, feeders 2975462011,
accessories 205727370011) and Amazon search results (organic rows only, "bought in past month" shown where Amazon gives it) for
skimmers, CO2, UV, chillers, reef LEDs, ATO. Read in the built-in browser today. Heaters, filters and lights were first
researched 2026-10-20 (research/gear-popular/).

## What the tool models today

| Row | Real products picked by name? | Count | State |
|---|---|---|---|
| Filter (sponge / internal / HOB / canister) | yes (gearCatalog `filters`) | 79 | good; Amazon top sellers covered |
| Heater | yes (`heaters`) | 40 | good |
| Light | yes (`lights`) | 18 | partial: freshwater clip-ons mostly; reef lights almost absent |
| Air pump, powerhead, wavemaker | yes (gearCatalog `pumps`, lane GP 2026-10-27) | 34 (18 air, 14 powerhead, 2 wavemaker) | done on branch `gp-pumps`; 5 products listed "needs spec" (research/gear-popular/pumps.md) |
| Protein skimmer (HOB, in-sump) | generic only | 0 | **gap** |
| UV sterilizer | generic only | 0 | **gap** |
| CO2 (regulator kit, DIY) | generic only | 0 | **gap** |
| Chiller | generic only | 0 | **gap** |
| ATO, auto feeder | generic only | 0 | **gap** |
| Return pump, sump, RO/DI, doser | generic only | 0 | lower demand on Amazon |

## Ranked recommendation (demand x how much the pick changes the model)

1. **Air pumps** (~12 products). Highest volume of any gap: Uniclife dual outlet 14,747 ratings (#1), Tetra Whisper 45,002,
   HITOP 9,429, Pawfly 15-40 GPH 7,993, hygger mini 5,676, NICREW nano piezo 3,187, AQUANEAT 2,210, AQQA 2,069 / 1,184,
   AquaMiracle 1,403, Pawfly dual 1,399. Cheap ($7-28), specs are simple (watts, outlets, GPH). Pairs with the sponge filter.
2. **Reef LED lights** (~10). NICREW HyperReef Gen 2 100/150/200 W ($200/$250/$320), NavaReef 65 / 135 W ($96/$166),
   ClassicLED Marine 48 W (1.8K ratings; the 36 W is already in), VIPARSPECTRA 165 W (1.1K), Pawfly 48 W, 95 W / 140 W
   generics. Reef is where light choice decides coral survival, and the catalogue has one marine light. Needs PAR / spectrum
   data, which the light check already uses for freshwater.
3. **Freshwater lights, fill-in** (~10). Missing from the Amazon top 30: NEOAQLUX 24/7 12-18 in, AQQA 24/7 (two), Pawfly 5 W
   8 in and 6 W clip, MQ 8 in submersible, COVOART 15 in, AQUANEAT 7.5 in submersible, SEAOURA 27 in and 11 in submersible,
   Novique 8 W clip, fishkeeper clip, hygger 8 W submersible, hygger multi-channel clip.
4. **Powerheads and wavemakers** (~12). VIVOSUN 800 GPH (26,255), PULACO 95 / 160 / 400 GPH, GROWNEER 550, hygger Mini Wave
   Maker 15-40 gal (534), hygger cross-flow 18 W with controller (412, $79), hygger 5-10 gal DC (149), AQUANEAT 800 GPH
   (1,063), DaToo 800 GPH, AquaMiracle 135 GPH, Marineland Maxi-Jet 600, Sicce Syncra, FREESEA magnetic mount. Many "fountain
   pumps" are used as powerheads, so list only those that say aquarium or wave maker.
5. **Protein skimmers** (~9). Coralife Biocube (896, 100+/mo, $45), M-50 mini HOB 53 gal (1.1K, $70), AQQA HOB ($37), IOAOI
   HOB ($100, 259) and in-sump ($140), MagTool DC N100 / N130 / N170 Plus ($160-280), OASE CrystalSkim 350 / 600 (freshwater
   surface skimmers, 586 / 257). Reef Octopus Classic 110-INT is the community pick but its Amazon rows were not in the first
   page; add by hand.
6. **UV sterilizers** (~8). Internal green-water killer pump 7.4K ratings (600+/mo), AquaMiracle filter + UV (500+/mo),
   200 GPH UV filter (600+/mo, already in as coospider-repta), 158 GPH UV filter, hygger UV with timer (400+/mo), Fluval
   in-line UVC ($102), 13 W clarifier ($20). Several are filter-with-UV: catalogue them as filters with a UV flag.
7. **CO2** (~8). FZONE CGA320 dual-stage ($136, 669), FZONE single-stage ($55, 1.3K, 100+/mo), FZONE mini dual-stage ($95,
   558), FZONE mini kit ($48), 45 g / 80 g disposable-cartridge desktop kits ($47-70), 2 L DIY generator ($86). Nearly one
   brand, so a short list covers it.
8. **ATO** (~6). Useek / generic dual-sensor ATO ($40, 891 ratings, 800+/mo), FZONE QST2.0 ($59, 460), FZONE dual optical
   ($40, 1K), MagTool ($59). Safety-relevant: a bad ATO floods a tank, so naming the unit lets the tool say which have two
   sensors.
9. **Chillers and chiller fans** (~6). PAIZOO fan ($26, 300+/mo), chiller fan ($46, 600+/mo), 1/10 HP 42 gal ($220-280) and 1/3
   HP 79-110 gal ($280-400). Fans matter for the temperature check (evaporative cooling is a few degrees, not a chiller).
10. **Automatic feeders** (~6). Petbank 200 ml (6,452 and 3,324), Fish Mate F14 (7,838), Freesea (5,003), FISHNOSH (1,836),
    generic 200 ml (1,768). Cheap, low model impact (price, battery, vacation days).

Skip for now: return pumps, RO/DI, dosers, test kits, substrate, conditioners (consumables, not modelled as products; Prime
43,796 and API Master Test Kit 31,515 are the real volume there if the tool ever prices consumables by name).

**Lane G-C status (GX, 2026-10-27):** built on branch `gx` (worktree `.claude/worktrees/gx`): 42 products entered (12 skimmers incl. 2 OASE surface skimmers, 9 UV, 8 CO2, 6 ATO, 7 chillers / fans), a picker per row in the Tech menu, under-sized warnings (`reefChecks`), 3D parts tinted by listing colour plus new surface-skimmer and chiller-fan parts. Specs the listings do not state are left out and named per product (research/gear-popular/reef-planted.md on the branch). Not done: product-photo colour check, the Fluval in-line UVC's watts / gallons, all compressor-chiller watts.

## Suggested lanes (three, files disjoint)

- **Lane G-A: pumps** (air pump, powerhead, wavemaker; picker UI like filters). ~35 products. **Status 2026-10-27: done on branch `gp-pumps` (34 products, picker in the Tech menu, a 3D part per product); see research/gear-popular/pumps.md.**
- **Lane G-B: lights** (reef LEDs + freshwater fill-in; spectrum / PAR fields). ~20 products.
- **Lane G-C: reef and planted gear** (skimmer, UV, CO2, ATO, chiller). ~35 products.
Feeders after those. Each lane follows the filters/heaters pattern: `gear-catalog.json` rows, a product lookup in
`gearCatalog.ts`, a picker in the Tech menu, a price in `gear-deals`, and a 3D part colour set per product (true colours rule).

Caveats: Amazon shows "bought in past month" only for some rows; ratings are lifetime, so old products rank high. Sponsored
rows excluded. Specs (watts, GPH, dimensions) still need a product-page read per item before any entry.

**Lane GL2 status (2026-10-28):** lights 33 -> 35: Kessil A80 Tuna Blue and Tuna Sun (15 W, 4.88 in x 0.98 in, 'hanging', coverage 18 in of the maker's 14-24 in; maker spec from retailer listings, Kessil's own page 404s). Still needs spec (Amazon pages give no watts or fixture size): AquaIllumination Prime 16 HD, SMATFARM 60 W (60 W read, size not), NEOAQLUX 24/7 x2, AQQA 24/7 x3, SEAOURA 11 and 27 in, COVOART 15 in, AQUANEAT 7.5 in, hygger multi-channel clip.
