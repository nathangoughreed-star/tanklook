# Filter media volumes: sourced figures (replaces the estimates in research-nitrification.md section 5)

Researched 2026-10-20. "Opened" = I read the primary page/PDF text myself (WebFetch, or pdftotext on the downloaded PDF). "No" = figure comes from a web-search summary of retailer/aggregator pages only.
Unit conversions: 1 US gal = 3.78541 L; 1 in3 = 0.016387 L; 1 gph = 3.785 L/h.

## 0. Models the app carries (gear-catalog.json "filters", 63 entries; gear-models.json has 6 generic classes)
gear-models.json classes: sponge-s, internal-s, hob-s, hob-l, canister-m (aliases fluval 107/207/307, eheim, cascade, sunsun), canister-l (fluval 407/507, fx4, fx6). No media-volume field exists anywhere in either file.
gear-catalog.json brands/models (rated gph in catalog):
- AquaClear 20/30/50/70/110 (100/150/200/300/500); Tetra Whisper PF10/20/30/40 (90/105/145/210); Aqueon QuietFlow LED PRO 10/20/30/50/75 (100/125/200/250/400); Top Fin Silenstream PF10/20/40/75; Seachem Tidal 35/55/75/110 (130/250/350/450); Marineland Penguin 150/200/350 (150/200/350); Imagitarium EX-FIL 10/20/30/55; Vibrant Life medium HOB; Aqueon SmartClean 10-20/20-30/30-50
- Canisters: Fluval 107/207/307/407 (145/206/303/383); Fluval FX4/FX6 (700/925); Eheim Classic 250 (2213)/350 (2215)/600 (2217) (120/164/264); Marineland Magniflow 220/360; SunSun HW-304B/404B (525)
- Sponge: Hygger double sponge S/M; Aquarium Co-Op coarse sponge S/M/L; Aquaneat bio sponge S/M
- Internal: Fluval U1-U4; Tetra Whisper 3i/10i/20i/40i; Top Fin IF20/IF40
Not in the catalog but asked for: Hydro-Sponge 1-5, Oase BioMaster, Penn-Plax Cascade.

## 1. Main table

| Product | Media L total (by type if given) | Rated flow gph (L/h) | Media supplied | Source URL | Opened primary? | Confidence |
|---|---|---|---|---|---|---|
| Fluval 107 | basket volume 1.2 L; total chamber 2.0 L; canister 3.9 L | pump 145 (550); with-hoses circulation 95 (360) | foam + biological + carbon, pre-loaded in upper/mid/lower baskets (quantities not stated in text) | https://manuals.plus/fluval/07-series-canister-filters-manual.pdf (mirror of Fluval 07 manual) | Yes, manual text (mirror host, not fluvalaquatics.com) | High for numbers (manual spec table) |
| Fluval 207 | basket 1.8 L; chamber 3.1 L; canister 5.3 L | 206 (780); circulation 121 (460) | same | same | Yes (mirror) | High |
| Fluval 307 | basket 3.1 L; chamber 4.5 L; canister 7.3 L | 303 (1150); circulation 206 (780) | same | same | Yes (mirror) | High (spec table columns jumbled by PDF extraction; 307 basket 3.1 / chamber 4.5 / canister 7.3 reconciled against retailer table) |
| Fluval 407 | basket 4.2 L; chamber 6.0 L; canister 9.2 L | 383 (1450); circulation 245 (930) | same | same | Yes (mirror) | High |
| Fluval FX4 | "biological volume" 1 gal = 3.8 L (manual states 3.9 L); filtration volume 3.7 gal (14 L) | pump 700 (2650); circulation 450 (1700), measured with no media | mech foam (217 in2 = 1400 cm2), bio-foam, BIOMAX, carbon pad named in maintenance chart; quantities not stated | https://www.manualslib.tech/guide/770574/fluval-fx-series-fx4-fx6-manual.html | Yes (manual mirror via WebFetch) | High |
| Fluval FX6 | biological 1.5 gal = 5.68 L (manual states 5.9 L); filtration volume 5.28 gal (20 L) | pump 925 (3500); circulation 563 (2130), no media | same; mech foam 325.5 in2 = 2100 cm2 | same | Yes (mirror) | High |
| AquaClear 20/30/50/70/110 | NOT published. Manual has no volume/in3 figure. | manual max flow: 20 = 100 (378); 30 = 150 (568); 50 = 200 (757); 70 = 300 (1135); 110 = 500 (1890); min 33/50/66.6/100/166.6 gph | 3 inserts: Foam (stage 1), Activated Carbon (stage 2), BioMax ceramic rings in mesh bag (stage 3); carbon pad placed flat on foam; BioMax weight 195 g (6.9 oz) for the 70 maintenance kit (retailer) | https://www.aquabiotech.com/shop/docs/Aquaclear/Aquaclear_English_all_models.pdf | Yes (Hagen manual, pdftotext) | High for flow/media types; NO volume source. Only bound: aftermarket AC70 basket outer 7.25 x 5.375 x 3.625 in = 141 in3 = 2.3 L gross (retailer, not Hagen) |
| Eheim Classic 250 (2213) | filter volume 3 L (retailer only) | 120 gph per catalog; Eheim product page for 2213 not found (404) | pads (coarse + fine) and/or loose media | https://completeaquatics.co.uk/eheim-classic-250-2213 (via search summary) | No | Medium |
| Eheim Classic 350 (2215) | filter volume 4 L; container 4.8 L | 620 L/h = 164 gph (matches catalog 164) | pads or media: layers = EHEIM MECH, coarse blue pad, SUBSTRATpro, fine white pad, carbon pad (top); pad model = 6 coarse + 1 fine + 1 carbon (EN manual) | https://eheim.com/en_GB/aquatics/technology/external-filters/classic/eheim-classic-350 ; manual https://eheim.com/media/pdf/d1/67/eb/EHEIM_classic_350_600_manual.pdf | Yes (product page and manual, manual has no volumes) | High |
| Eheim Classic 600 (2217) | filter volume 6 L; container 6.6 L | 1000 L/h = 264 gph (matches catalog 264) | same layering as 2215 | https://eheim.com/en_GB/aquatics/technology/external-filters/classic/eheim-classic-600 | Yes | High |
| Seachem Tidal 35 | filter volume 0.2 gal = 0.76 L (Seachem states 0.7 L) | 130 (500 L/h) | foam (bottom) + Matrix, amount not stated; chemical media not included | https://seachem.com/tidal-compare.php | Yes (compare page and Tidal-35 manual PDF) | High for volume |
| Seachem Tidal 55 | 0.32 gal = 1.21 L (states 1.2 L); Matrix 250 mL included | 250 (1000 L/h) | foam + Matrix 250 mL | same + https://www.seachem.com/tidal-filters.php | Yes | High |
| Seachem Tidal 75 | 0.50 gal = 1.89 L (states 1.9 L); Matrix 350 mL | 350 (1500 L/h) | foam + Matrix 350 mL | same | Yes | High |
| Seachem Tidal 110 | 0.85 gal = 3.22 L (states 3.2 L); Matrix 500 mL | 450 (2000 L/h) | foam + Matrix 500 mL | same | Yes | High |
| Hydro-Sponge 1-5 (Aquarium Technology) | NO volume published. Geometric estimate from retailer replacement-sponge dims (width 4.25 in, diameter 2.75/3.75/4.75/5.75 in for II/III/IV/V), solid cylinder, V = pi (d/2)^2 x 4.25 in x 0.016387: II 25.2 in3 = 0.41 L; III 46.9 in3 = 0.77 L; IV 75.3 in3 = 1.23 L; V 110 in3 = 1.80 L, per sponge, lift-tube bore (1 in) not subtracted (about -0.05 L each). Sponge COUNT per unit not confirmed (II-V may have 1 or 2 sponges); Hydro I not found | no gph (air-driven; rated by tank: II 20 gal, III 40 gal, V 125 gal) | reticulated foam only | https://www.thatpetplace.com/replacement-sponge-hydro-iii-pro ; https://www.thatpetplace.com/hydro-ii-sponge-pro-filter-20-gal | Yes (retailer pages, not manufacturer) | LOW (my geometry from retailer dims) |
| Oase BioMaster 250 / 350 / 600 / 850 (Thermo variants identical volumes) | filter volume 4.4 / 5.6 / 6.8 / 8.0 L; plus pre-filter 0.4 / 0.5 / (0.6?) / 0.6 L | 900 / 1100 / 1250 / 1500-1550 L/h = 238 / 291 / 330 / 396-409 gph | Hel-X biomedia, foams 20 ppi and 30 ppi, carbon pre-filter foams (retailer box list) | https://www.oase.com/en-US/aquarium/biomaster-250 (listed, but 429 when fetched); figures via https://www.premiumbuces.com/en/?p=33800 and search summary of Oase pages | No (oase.com returned HTTP 429; retailer 402) | Medium (several sources agree) |
| Penn-Plax Cascade 700 (CCF2UL) | NOT published in L or in3 | 185 | 2 poly floss pads, 1 coarse bio-sponge, 1 bag activated carbon; 2 baskets | https://penn-plax.focuspointsap.com/ccf2ul | Yes (manufacturer listing) | High for flow/media; no volume |
| Penn-Plax Cascade 1000 | NOT published | 265 | 3 floss pads, 1 coarse bio-sponge, 1 carbon bag; 3 stackable baskets (Walmart listing) | https://www.walmart.com/ip/17631372 | No | Medium; no volume |
| Penn-Plax Cascade 1200 / 1500 | NOT found | 315 / 350 (unverified) | not found | https://www.tractorsupply.com/tsc/product/penn-plax-cascade-1200-315-gph-up-to-150-gal-ccf4ul | No | Low |
| Marineland Magniflow 220 / 360 | NOT published. Stack N' Flo trays (3-4); no tray volume in manual or product page | 220 / 360 | filter foam, floss pad, carbon bag, bio-balls, ceramic rings (220 and 360 only) | https://manuals.plus/marineland/magniflow-360-gph-canister-filter-manual.pdf ; https://www.marineland.com/products/filtration-and-water-circulation/magniflow-canister-filter (cert error, only search summary) | Yes (user guide via mirror), no volumes | High for media types; none for volume |
| Marineland Magnifi (the HOB line) | not found; no sources for "Magnifi" specifically | - | - | - | No | none |
| Marineland Penguin 150/200/350 | NOT published | 150 / 200 / 350 | Rite-Size B (150) or C (200, 350) cartridges + BIO-Wheel | https://www.thatpetplace.com/penguin-350-bio-wheel-power-filter-75-gal | No | Medium (flow), none (volume) |
| Tetra Whisper PF10 | NOT published | 90 | 1 medium Bio-Bag cartridge | https://www.thatpetplace.com/whisper-advanced-pf10-power-filter-10-gal | No | Medium |
| Tetra Whisper PF20/30/40 | NOT found | 105 / 145 / 210 (Chewy Q&A; model mapping unconfirmed) | cartridges | https://www.chewy.com/app/product-questions/133164 | No | Low |
| Aqueon QuietFlow 20 | NOT published | 125 | cartridge: dense floss + carbon + bio holster (5-stage claim) | https://www.thatpetplace.com/aqueon-quietflow-20-power-filter | No | Low |
| Fluval U2 (and U series) | NOT published | not reliable (retailers conflict 400 vs 2300 L/h) | 2 foam pads, 2 poly/carbon cartridges, BioMax rings | https://fluvalaquatics.com/ca/?p=60159 | No | Low |
| Top Fin, Imagitarium, Vibrant Life, SunSun, Hygger, Aquaneat, Aquarium Co-Op | not searched or nothing found. Co-Op page gives tank minimums only (Nano 5, Small 10, Medium 20, Large 40 gal) | - | foam | https://www.aquariumcoop.com/blogs/faqs/sponge-filter-sizes | Yes (no volumes) | none |

## 2. Statements about how water passes through the media (bypass)
- AquaClear (Hagen manual, opened): "The intake U tube directs the flow of unfiltered water through filter inserts to trap particles, debris"; the refiltration feature: when flow is turned down, "up to 50% of the water within the filter chamber is processed multiple times". Also "The foam block should totally fill the bottom of the basket leaving no space between the filter basket base and sides" (anti-bypass instruction). No bypass percentage given.
- Seachem Tidal (manual, opened): "The internal basket prevents water bypass"; "do not overfill the filter media basket" (flow interference). Tidal filters page: pump pushes water up through the bottom of the basket; when the media clogs, water is deliberately redirected around the filter (maintenance alert rises); that is a designed overflow bypass.
- Fluval 07 (manual, opened): media sit in stacked baskets in the canister; "Never overfill baskets"; no flow-path or bypass statement. Fluval FX (manual, opened): baskets stack, output tube inside canister, no bypass statement; "filter circulation" quoted with no media (so real flow lower than pump rating).
- Marineland Magniflow (product page via search summary): Stack N' Flo trays "force water through the media layers rather than around them" (not opened because of a certificate error).
- Eheim Classic (manual, opened): layer order and "all media must be rinsed"; no flow-path or bypass wording. No wording quantifying bypass anywhere.

## 3. Rated-flow vs usable-flow notes (relevant to f_flow / through_media_fraction)
- Fluval states filter circulation with intake and output hoses of equal length and no media: 107 = 95 of 145 gph (66 %); 207 = 121 of 206 (59 %); 307 = 206 of 303 (68 %); 407 = 245 of 383 (64 %); FX4 = 450 of 700 (64 %); FX6 = 563 of 925 (61 %). A manufacturer-sourced ratio of about 0.6-0.7 for canisters, hose losses only, before media.
- Seachem Tidal listing: independent review claims real flow is far below rating (not primary; ignore).
- AquaClear max flow is free-flow at max setting; manual gives min (about 1/3 of max).

## 4. Replacement for section 5 of research-nitrification.md
| Filter | Old estimate (L) | Sourced figure (L) |
|---|---|---|
| AquaClear 30 / 50 / 70 / 110 | 0.5 / 0.9 / 1.4 / 2.4 | no manufacturer volume; only a gross-envelope bound of about 2.3 L for AC70 (aftermarket basket). Keep estimates flagged LOW or measure by displacement |
| Fluval 107 / 207 / 307 / 407 | 1.3 / 2.8 / 4 / (n/a) | basket 1.2 / 1.8 / 3.1 / 4.2 (chamber 2.0 / 3.1 / 4.5 / 6.0) |
| Fluval FX4 / FX6 | (FX6 5.9) | 3.9 / 5.9 (manual), HIGH |
| Eheim 2213 / 2215 / 2217 | ~1.0 / (n/a) / ~2.5 | 3 (retailer) / 4 / 6 (Eheim). Old estimates were far too low |
| Seachem Tidal 35 / 55 / 75 / 110 | n/a | 0.7 / 1.2 / 1.9 / 3.2 (Seachem), of which Matrix 250 / 350 / 500 mL (55/75/110) |
| Hydro-Sponge II / III | 0.3 / 0.6 | about 0.4 / 0.8 per sponge by geometry (LOW) |
| Oase BioMaster 250-850 | n/a | 4.4 / 5.6 / 6.8 / 8.0 (MED, retailer) |
Caveat: "filter volume" in Eheim/Seachem/Oase is the media compartment capacity; it includes foam/pad layers and is not all biomedia. Fluval "basket volume" is likewise the whole media basket, with the pre-filter basket extra (chamber minus basket). Type split (foam vs ceramic vs carbon) is given only for Tidal (Matrix mL) and Eheim pad counts; no manufacturer gives a litres split for AquaClear or Fluval.

## 5. Not done / gaps
- oase.com returned HTTP 429, so Oase figures are retailer-sourced.
- Fluval's own site, Marineland's site, Hagen, and Tetra/Aqueon manuals were not readable (403/404/cert); Fluval figures come from a manuals.plus mirror of the Fluval manual, which I read in full text.
- Seachem Tidal 55-75-110 manual PDF exceeded the fetch size limit; the Tidal 35 PDF was read, and the Matrix mL figures come from seachem.com/tidal-filters.php (opened).
