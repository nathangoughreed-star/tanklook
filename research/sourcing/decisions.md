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

## Proposed: tank-minimum geometry (lane MX, 2026-10-21; WAITING for Nathan)

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
- **MX2 Sourced length is LONGER than ours (new failures).** Neon 17.5 -> 23.5 in (SF 60 x 30 cm, "recommended", see MX1); betta
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


## R3 (2)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|
| harlequin.minL | 40 | Seriously Fish: base 60 x 30 cm, ~54 litres (~14 US gal); Fishkeeping World: 15 gallons (56.8 L) for a school of 8-10; 20 gallons better | **54** | Both sources ~54-57 L; ours 40 is below 75% of the lowest (54 L stated by page, 15 gal = 56.8 L). |
| syno.minL | 200 | Seriously Fish: 120 x 30 x 30 cm, ~108 litres (~29 US gal) | **108** | Only one care source found (Fishkeeping World 404, Planet Catfish forum 403). Page minimum 108 L; ours 200 is almost double. A forum thread (not fetched) suggests larger tanks for breeding groups. |

## R4 (5)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|
| mandarin.max | 1 | Fishkeeping World: pair allowed (75 gal) | **2** | Source allows a male/female pair; ours is 1. |
| discus.temp | [28,30] | Seriously Fish: 26-30 C | **[26,30]** | Lo end 26 vs ours 28. |
| comet.temp | [16,22] | Berry Patch Farms: 18-22 C ideal | **[18,22]** | Lo end 18 vs ours 16. |
| comet.tol | [10,26] | Berry Patch Farms: 60-80 F for limited periods (15.6-26.7 C) | **[16,27]** | Lo 15.6 vs ours 10; FishBase gives 0-41 C for goldfish generally but was not quoted. |
| axolotl.temp | [16,20] | Swell UK: 15-18 C | **[15,18]** | Hi 18 vs ours 20. |

## other/C (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## other/E1 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|


## other/E2 (0)

| field | ours | pages say | suggest | note |
|---|---|---|---|---|

