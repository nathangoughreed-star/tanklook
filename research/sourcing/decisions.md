# Sourcing decisions

Fields where the opened pages disagree with our number. Each waits here until decided: adopt the page's number (then it is
cited), work it out from the stated numbers (derived), or keep ours and say why (assumption). From chat S168 on, the decision
is recorded in the batch file itself (`verdict` agrees / derived / kept, `use` = the source indices an adopted value cites,
`decision` = why); src/data/provenance.ts turns those into rules. Source detail and quotes: the batch file named per row.

## Decided (Nathan, chat SQ)

Rule from Nathan 2026-10-20: he cannot judge the biology; trust the research, especially where independent sources agree. Where sources split or only one retailer speaks, the proposal below stands unless noted.

- 2026-10-20 batch 1, minimum tanks: oscar 540, crested gecko 127, crested harlequin gecko 127, sixline wrasse 208, goldfish 75 (adopted, cited). Ball python kept at 450 L as an assumption: PetSmart and BeWild say 40 gal, Zen Habitats and Reptile Direct say 4x2x2 ft (120 gal) and call 40 gal outdated; the ReptiFiles PDF gives no enclosure size.
- 2026-10-20 batch 2, care levels (all as proposed): easier (2 -> 1) cardinal, rummynose, cpd, hatchet, molly, dwarfgourami, yellowlab, oto, kuhli, sae, hillstream, cleanershrimp, royalgramma, firefish, banggai, sixline, coralbeauty, dartfrog, firenewt, regaljumper, angel, kribensis; bluetang 3 -> 2, gbr 3 -> 2; boesemani 1 -> 2 (harder). Kept with a recorded reason: adf 1, yellowtang 2, betta 1. oto / kuhli / sae / hillstream rest on one page each (low confidence).

## Decided (Nathan, chat S168, 2026-10-20; groups G1-G11, on top of SQ's batches 1-2)

- **Adopted** (cited where a quote checked): minimum tanks bristlenose 80, boesemani 110, molly 80, yellow lab 150, panda cory
  41, tree frog 76, fire-bellied toad 57, axolotl 110, brown anole 40, regal jumper 2, turbo snail 40, bolivian ram 110, chaco
  57; temperament ocellaris 1, GBR 0, yellow lab 1, synodontis 1, hermit 0, royal gramma 0, sixline 1, danio 0 (fin-nipping
  belongs to the `nip` flag), the three anoles 1; adult length = the stated maximum (ocellaris and chromis 100, clown loach
  300, swordtail female 160, molly 85, comet and livingstonii 250, synodontis 190, ADF 55, guppy 30); pH cardinal 3.5-7.5,
  ember 5-7, synodontis 7.5-8.5, nerite 7-8.5 (the planted example's nerite became a Malaysian trumpet), trumpet 6.5-8;
  anole basking 29-32, ball python RH 60-80; reef soft 75-150 and SPS 200-350 PAR (BRS); return pump 23 W, powerhead 3.5 W,
  ATO 8 W, HOB skimmer 11 W at a 55 gal ref; cost bands heater and filter base, tank $/gal for the three classes up to 75 gal,
  fw-fish, easy / medium / land / succulent plants, wood.
- **Derived:** hatchet pH 5-7 (overlap of FishBase and Seriously Fish), axolotl pH 7-7.6 (span), brown-green anole basking
  29-32 (the green anole page), root tabs 12 months (Seachem dose x a 40-pack at 20 gal).
- **Kept, labelled assumption:** hillstream minimum 60; angel, kribensis and swordtail temperament 1; whitecloud / CPD /
  hatchet group 6 (the pages' "ideally" counts go to the count bands); comet 300, mandarin 265, mystery snail 40; mystery
  snail pH; betta female length; chaco tl (body length, the pages give leg span); doser 1 W; tank $/gal over 75 gal and the
  weak bands (lane D); kWh 0.17 (EIA July 18.31 c is the summer high).
- **Overrides SQ batch 2 (settled by Coordinator 5, SQ agreed):** otocinclus care 2 and hillstream care 2 (kept: SQ's 1 rested on
  one genus / group page each), ADF care 2 (adopted: LiveAquaria Moderate); comet stays 300 and mystery snail 40.
- **Follow-up (Nathan 2026-10-20):** a grazer budget instead of a bare minimum tank for algae eaters: research the hobby's
  "grazers per tank size" figures (Top Shelf: 2-3 turbos per 20-30 gal) and how much supplementary feeding (nori, wafers)
  lifts them, for turbo, nerite, trumpet, oto, bristlenose, SAE and amano; only with stated numbers.

## Combined sources (lane CB, 2026-10-21; DECIDED by Nathan the same day)

`node scripts/source-combine.mjs` weighs every opened page (sources.json kind: primary / reference 1, care sheets 0.7, retailers
0.5; a genus-wide or generic page x 0.5; one site once; only re-fetched quotes) and combines them: numbers by weighted median
(ranges end by end), words by weighted vote, tank sizes in two tiers (floor / comfort) when the pages are more than 1.5x apart,
placed by each site's litres. Table: research/sourcing/combine/approved-2026-10-21.md; research/sourcing/combined.md is the table
as it stands now (only the kept rows below differ). Applied by `node scripts/source-combine-apply.mjs` (research/sourcing/combined.json).
- **Applied (Nathan: "apply all except the 11", then the two corrections below):** 139 values: 45 adult lengths (the axolotl as
  picked below), 6 female lengths, 40 minimum volumes (CARE.minL), 17 pH ranges, 10 group minimums (count bands' `ok` moved with
  them), 4 care levels, 4 temperaments, 4 temperature / 3 tolerance bands, mandarin max 2 (a pair), 2 humidity and 1 basking band,
  swordtail's green line 47 x 12 in (MX: the strictest credible). The 7 open R3 / R4 disagreements are settled by it: harlequin 54 L,
  syno 108 L, mandarin pair, discus 26-30 C, comet 18-22 C (tolerance 15.6-26.7), axolotl 15-18 C.
- **Corrections (Nathan 2026-10-21, after Coordinator 7's check):** (1) the table flagged only KEPT decisions; 12 ADOPTED ones it
  overwrote are back (cardinal and hatchet pH, yellow lab temperament, ADF and ocellaris length, minimum tanks of chili, molly, tree
  frog, fire-bellied toad, axolotl, bristlenose, sixline), cited by their batches as before. (2) Tank sizes keep the MX rule (red =
  lowest well-supported, never averaged; the advisory volume = the lowest well-supported gallon figure): kadango's red line and the 41
  advisory volumes the combination moved are back. Two unequal sites: the heavier one wins outright (oscar, axolotl were caught).
- **Kept (an earlier decision, labelled as before):** ball python, comet, mandarin and hillstream minimum tanks; oto, hillstream and
  axolotl care 2; angel and swordtail temperament 1; whitecloud group 6; mystery snail pH.
- **Kept or picked when the tests showed the moves (Nathan 2026-10-21):** kuhli 100 mm (FishBase's 120 would fit only 10 in the S188
  20 gal long), oscar 300 mm (FishBase's 45.7 cm is a record), axolotl 300 mm (Reptile Centre, not Modest Fish's 16 in upper end).
- **Gallon-derived red lines stay** (Nathan: "keep them"): a gallon figure never sets a length, but the MX2 red line (the lower of a
  stated geometry and the gallon figure's catalogue tank) is kept; 36 species.
- Not combined (listed in combined.md): SL / SVL / leg-span lengths (not total length), air zones (cool side, night), yes / no flags.

## Tank-minimum geometry (lane MX, 2026-10-21; MX1-MX9 DECIDED by Nathan the same day)

Data: research/sourcing/tank-minimum/M1-M9.json (quotes re-fetched: <batch>.verify.json), merged by
`node scripts/tank-min-sources.mjs` into summary.json and table.md; write-up research/tank-minimum-sources.md. Picks already
follow Decision 1 (lowest well-supported minimum = 100 %, a stricter credible figure = Recommended candidate) and drop breeding /
juvenile figures. "Ours" = today's `minLengthMm` / `minL`. Each item below either conflicts by more than 25 % or flips pass / fail.

- **MX1 Seriously Fish "recommended" footprints (12 species).** SF writes most footprints as "should be the smallest considered"
  (min), but for neon, discus, bronze cory, hatchet, labeo, livingstonii, afra, panda cory, pygmy cory it writes "is
  recommended"; likewise dart frog, fire-bellied toad, ball python on their pages. Taken literally (Decision 1 / 4) these are
  Recommended marks and cannot fail; the required minimum then falls back to a DERIVED (est) footprint from the gallon figure.
  Proposal: follow the wording (Recommended), because SF uses both phrasings deliberately. Alternative: count SF's aquarium-size
  line as its minimum whatever the verb.
- **MX1 DECIDED (Nathan 2026-10-21):** "recommended gets the bar into the green happy zone, lower than recommended allowed but
  give the yellow bar". So Recommended = the green line; between minimum and Recommended = yellow (allowed); below minimum = red.
  SF "is recommended" footprints are green lines. Their red line is the lowest well-supported figure, which can be another page's
  gallons turned into length via the catalogue tank (derived, est) when no page states a shorter geometry.
- **MX2 REVISED (2026-10-21, after Nathan asked "why such a large change? shouldn't we weight the sources together?").** Why
  large: today's lengths were estimates, and the new ones are mostly ONE Seriously Fish footprint, sometimes for a bigger group.
  Weighting without averaging (Decision 5) = MX1's two lines: lowest well-supported = red line, stricter credible = green line.
  Proposed red / green in inches (ours today): neon 20 derived from 10 gal (FKW) / 23.5 SF (17.5); betta 16 derived from 5 gal /
  17.5 SF (12); bronze cory 30 derived from 20 gal / 31.5 SF (23.5); danio 20 derived from 10 gal for 5 fish / 35.5 SF for 8-10
  (23.5); boesemani 47 (three pages agree) (35.5); honey gourami 16 derived from 5 gal / 23.5 SF (17.5); bolivian ram 35.5 SF pair /
  47 SF group of 6-8 (23.5); clown loach 59 Guidarium / 71 SF (47); yellow tang 48 derived from 100 gal (LiveAquaria) / 72 (Saltwater
  Aquarium Blog) (47); coral beauty 48 derived from 70 gal (two pages); the 47 in page (Gensou) is low-credibility and cannot be
  re-fetched, so it is dropped (35.5).
- **MX2-MX9 DECIDED (Nathan 2026-10-21: "yes, apply that rule and push. I agree with your recommendations for these open
  questions").** Applied in `scripts/tank-min-sources.mjs` (summary.json `lines`: red / green / heightRed / heightGreen / depth):
  the red / green rule above for every species; MX3 adopted by the rule (cockatoo 23.5 for a pair, comet 35.5 derived from 30 gal,
  axolotl 17.5 red / 35.5 green); MX4 swordtail red = 31.5 in length AND 558 sq in floor area, no green; MX5 kuhli 23.5 x 12 red,
  31.5 green; MX6 aquatic invertebrates (shrimp, snails, hermit, turbo, cleaner shrimp) clearance only, royal gramma derived
  35.5 x 17.5; MX7 depth notes only (angel Recommended tank height 19.5 in, discus advisory 18 in, ADF max water 24 in, kuhli not
  assessed); MX8 crested gecko (and the harlequin, same species) 18 x 18 floor with 24 in tall red / 36 in green, green anole
  ReptiFiles 24 x 24 x 24, fire-bellied toad 12 in tall red / 18 green, chaco 20 x 10 red / 28 x 28 derived green, ball python
  48 x 24 x 24; MX9 volume = advisory, the lowest well-supported figure.
  Rule details settled while applying: a gallon figure becomes the SMALLEST catalogue tank holding at least that volume (70 gal ->
  75 gal, 48 in); low-credibility gallon pages never set a line; land animals do not use aquarium tanks once any page states
  geometry; a "recommended"-only page with no minimum gives a green line and no red (dart frog, fire-bellied toad footprint).
  Regal jumper: the only footprint page (PetSmart 4 x 4 in) is low-credibility, so it has no line (MX3's 4 in is NOT adopted).
- **MX2 (first version, superseded by the revision above) Sourced length is LONGER than ours (new failures).** Neon 17.5 -> 23.5 in (SF 60 x 30 cm, "recommended", see MX1); betta
  12 -> 17.5 in (SF 45 x 30); bronze cory 23.5 -> 31.5 in (SF 80 x 30, "recommended"); zebra danio 23.5 -> 35.5 in (SF 90 x 30, for
  a group of 8-10); boesemani 35.5 -> 47 in (SF 120 cm, two more pages say 4 ft); honey gourami 17.5 -> 23.5 in (SF 60 x 30);
  bolivian ram 23.5 -> 35.5 in (SF 90 x 45); clown loach 47 -> 71 in (SF 180 x 60 for an adult group; Guidarium 150 cm = 59 in);
  yellow tang 47 -> 72 in (6 ft, est; another page 120 cm = 47 in, 35 % apart: propose 47 in required, 72 in Recommended); coral
  beauty 35.5 -> 47 in (1.2 m, est). Proposal: adopt each as sourced, single source where marked.
- **MX3 Sourced length is SHORTER than ours (new passes).** Cockatoo 35.5 -> 23.5 in (SF 60 x 30 for a PAIR; a harem needs more,
  FKW 30 gal); comet 59 -> 36 in (one page; ponds advised for groups over 4); axolotl 31.5 -> 19.5 in (axolotl.org 50 x 25 cm
  minimum; Reptile Centre 90 x 45 cm "ideal" = Recommended); regal jumper 10 -> 4 in (a 4 x 4 in floor, est). Proposal: adopt;
  cockatoo's figure is for a pair, so the count picker's harem needs a stated harem figure (none found).
- **MX4 Swordtail (known doubt).** SF: "surface dimensions of 120 x 30 cm ... or equivalent" (47 x 12 in, area 558 sq in).
  FishBase (mirror only, the main site timed out): "minimum aquarium size 80 cm", no conditions (est). 33 % apart. Proposal: keep
  today's pair: length 31.5 in (FishBase, est) AND floor area 558 sq in (SF "or equivalent"), each held on its own.
- **MX5 Kuhli loach (known doubt, settled).** SF 60 x 30 cm footprint and Guidarium "a tank length of at least 60 cm" agree
  (23.5 x 12 in, two sources); Aquariadise's 20 gal long / 80 cm (31.5 in) = Recommended. Matches today's 23.5 in, now sourced.
  No page states a water depth: the 2 in tray stays "not assessed".
- **MX6 Royal gramma and cleaner shrimp (known doubts).** No opened page states a footprint or length for either. Derived (est):
  gramma 30 gal (three pages) -> 30 gal breeder, 35.5 x 17.5 in inner, same length as ours. Shrimp 20 gal (Aquariadise) -> 20 long,
  30 x 13 in, vs ours 23.5 in (flips a 20 high); Quality Marine 40 gal = Recommended; Gensou 60 L could not be re-fetched (403).
  Proposal: shrimp is an invertebrate, so per Decision 3 it gets clearance only, no derived footprint; gramma uses the derived one.
- **MX7 Depth (Decision 4).** No page among 84 species states a required minimum WATER depth. Angelfish: SF "A tall tank of at
  least 50 cm" (19.5 in) recommended for adults = Recommended mark (tank height), body height 20 cm (8 in) on record. Discus: only a
  low-credibility page states height (18-20 in of water) = estimated advisory, as Decision 4 already says. African dwarf frog:
  maximum water depth 24 in (one page) = species advisory. Fire-bellied toad 2 in water (paludarium) on record. Gourami depths found
  were breeding-tank figures and are excluded.
- **MX8 Land animals: height and footprint conflicts.** Crested gecko (and crested harlequin): Reptiles Magazine 36 in tall adult
  minimum vs ReptiFiles 24 in tall "recommended", footprint 18 x 18 in agreed by three pages; propose 18 x 18 x 24 required (two
  pages), 36 in Recommended. Green anole: ReptiFiles 24 x 24 x 24 in (high) vs PetSmart 18 in tall / 10 gal (low credibility):
  propose ReptiFiles as the minimum. Fire-bellied toad: 12 in tall (vet page) vs 18 x 18 x 18 (Josh's Frogs): 12 in required, 18
  Recommended. Chaco tarantula: Dubia Roaches 20 x 10 in vs Josh's Frogs "four times the spider's diagonal leg span" (a rule, about
  28 in for an adult): propose the rule as DERIVED (est) from our adult size, 20 x 10 as the floor. Ball python: ReptiFiles 48 x 24 x
  24 in adult (the S168 decision already kept 4 x 2 x 2 ft over 40 gal): no change.
- **MX9 Gallon figures (advisory only from Decision 2, so no pass / fail).** 31 species' sourced gallons differ from ours by more
  than 25 % (summary.json `flags`). They become the advisory "small volume" note and the Recommended text, not a gate. Proposal:
  MM takes the lowest well-supported figure as the advisory and does not re-decide them one by one.

<!-- GENERATED by scripts/sourcing-decisions.mjs: do not edit below -->

## A1 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## A2 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## A3 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## A4 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## A5 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## A6 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## A7 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## A8 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## A9 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## R1 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## R2 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## R3 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## R4 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## other/C (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## other/E1 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## other/E2 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|

