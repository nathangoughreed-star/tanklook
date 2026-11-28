# RX-BICHIR: Senegal bichir onboarding (2026-11-23)

Species id `bichir` (art `bichir`, a drawn `fishgen.ts` plan). The build-B photo-art model (`bichirb`, branch `claude/glbfish-e5`, behind `?photoart`) is separate and was not touched. When that branch merges, its `bichirb` species row will duplicate this species: point `bichir`'s art at the photo model or drop the `bichirb` row. Note the e5 row uses tl 305 mm; this one uses 445 mm (reason below).

**Decided by Nathan 2026-11-24: "B model, keep drawn".** `bichir` shows the B photo model with `?photoart` and this drawn plan without it; the `bichirb` row goes away. Merge step for e5: rename the B model's art key `bichirb` -> `bichir` (anatomy.json `art` and `render.photo.art`, and the four `public/art/fish/bichirb*.webp`), delete the `bichirb` species row. photofish.ts mutates `PLANS[render.photo.art]` in place, so that gives exactly this. Settle tl at the merge (305 vs 445 mm).

## Sources (all opened 2026-11-23)
- Seriously Fish, https://www.seriouslyfish.com/species/polypterus-senegalus/ : max 500 mm SL; base 150 x 60 cm (~540 l, ~143 US gal); 24-28 C; pH 6.2-7.8; 5-20 dGH; tight-fitting cover, "excellent escape artist"; soft substrate, driftwood and smooth rocks for hiding; floor space over depth; predatory, not to be trusted with tankmates it can fit in its mouth, relatively peaceful otherwise; male has a thicker anal fin; nocturnal; can drown without access to air.
- FishBase, https://www.fishbase.se/summary/Polypterus-senegalus.html : 25-28 C; pH 6.0-8.0; dH 5-19; max 70.0 cm SL; max published weight 207 g; dorsal finlets 8-11; facultative air-breather; eats insects, crustaceans, molluscs, frogs, fishes; male's anal fin enlarged and swollen. Length-weight (Bayesian): a 0.00457, b 2.99 (cm TL).
- LiveAquaria (Cuvier bichir = P. senegalus, captive-bred), https://www.liveaquaria.com/products/cuvier-bichir : minimum tank 90 gal; 77-80 F; pH 6.5-7.5; max 18 in; easy; semi-aggressive in that it swallows any fish or invertebrate that fits in its mouth; tight, well-sealed lid; $19.99 at 3-5 in.
- FishLab, https://fishlab.com/senegal-bichir-tank-mates/ : 16-18 in in captivity (38 in wild); at least 55 gal "six feet long, two feet wide and two feet high" (self-conflicting: that is about 180 gal); 77-84 F; pH 6-8; very peaceful; tankmates under six inches are at risk; jumps, tight lid; sand or mud, gravel can be swallowed.
- Aquarium Source (genus page), https://www.aquariumsource.com/bichir/ : 90 gal for one; 74-82 F; pH 6.2-7.8; easy; sand, gravel rough on the belly and swallowed.
- Imperial Tropicals, https://imperialtropicals.com/products/senegal-bichir-polypterus-senegalus : $14.99 (3-4 in), $24.99 (4-5 in), $34.99 (5-6 in); also sells an albino.

## Decisions (every conflicting figure averaged, Nathan 2026-11-19)
- Adult size: 445 mm (17.5 in), the mean of the captive figures (LiveAquaria 18 in, FishLab 16-18 in). Seriously Fish 500 mm SL and FishBase 70 cm SL are wild maxima. Conflict: FishBase's heaviest published fish (207 g) is about 36 cm on its own curve; the table mass at 445 mm is 388 g; the 3D body agrees with the table (x1.05).
- Tank: 94.5 gal mean (143, 90, 90, 55) -> 95 gal, 360 litres. Footprint 144 x 53 cm (57 x 21 in): mean of the stated bases (150 x 60, 183 x 61) and the standard 90 gal tank (122 x 46) for the two volume-only pages.
- Water: 24.5-28 C (mean of five ranges), tolerable 23-29 C (widest stated); pH 6.2-7.8 (mean), acceptable 6.0-8.0; GH 5-20.
- Social: not a schooling fish; fine alone; other bichirs are tolerated with a hiding place each (Seriously Fish lists other Polypterus as tankmates). Bands 1/1/1, no max. Predator: prey up to 150 mm (FishLab's six inches); temper 0 (the "aggressive" labels all mean "eats small fish").
- Sex step: one model. Sexes alike except the male's thicker, broader anal fin (Seriously Fish, FishBase). No source says sex ratio matters outside breeding; no `sexed` rule.
- Needs: tight lid (also in lidNeed REQUIRED), air gap for surface breathing, predator tankmate warning, meaty sinking food at night, cover, adult size. Substrate: prefers sand (DWELLER).

## Photos viewed (scratchpad only)
- Seriously Fish profile photos (JJPhoto): https://www.seriouslyfish.com/images/2012/03/polypterus_senegalus_senegalus_3.jpg (adult, side-on), .../polypterus_senegalus_senegalus_2.jpg (labelled juvenile; plain silver-grey, no stripes visible).
- Wikimedia Commons "Senegal bichir.jpg": https://commons.wikimedia.org/wiki/File:Senegal_bichir.jpg (head-on three-quarter: eyes high on a flat head, pale fleshy pectoral lobes, finlets).
- Written look: plain grey to grey-olive back and flanks, the diagonal rows of diamond scales as a fine darker net, paler cream-grey belly; 9 separate dark dorsal finlets along the rear two thirds; small rounded anal before a rounded tail; pale pectorals on fleshy lobes; small golden-brown eye. Side by side: `bichir-vs-photos.jpg`.

## Lacks
- Only three usable photos (no top-down photo; no second adult side-on).
- The finlets are the generator's notched spiny dorsal, not separate flags; the pectoral lobe is not modelled.
- No albino form (sold in the hobby) in forms.json.
- `research/sourcing/` verbatim-quote batch not written (quotes are in provenance.ts `says`).
