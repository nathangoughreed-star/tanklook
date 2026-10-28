# Pet arthropods: research and build proposal (2026-10-28)

Data: `arthropods.json` (48 species; per-number `{v, src, status}` with status `sourced` / `derived` / `assumption`).
Per-group raw parts live in `parts/`. Method: Sonnet agents, round 1 (snippets only: too thin) then round 2 (full pages fetched
for the 24 shortlisted species; dubiaroaches, tydyeexotic, reptilesupply, usmantis returned HTTP 429 and could not be used).
Species outside round 2 (15 of 48) are still mostly `assumption`: do not build them without another pass.

## Honest data-quality notes
- **Popularity is always `assumption`** (judged from how widely dealers stock the species, 1-5); no retailer sales ranking was found.
- **Fast tolerance** (days without food) is `assumption` for nearly all species; it feeds the demand model's away-days. Tarantulas
  and scorpions really do tolerate weeks to months; mantises, stick insects, isopods, millipedes, hermit crabs do not (days).
- **Tarantula humidity** is "moderate" in the care sheets, not a number: ranges are assumptions.
- `adult_mm` is body length for most entries; some round-1 tarantula entries (redrump, fireleg, salmon pink) hold leg span: not yet normalised.
- Isopod / roach prices are per animal; most species are sold in groups of 5-10.

## Ranking of round-2 species (commonness 5 = in nearly every shop)
| Rank | Species | Group | Why it ranks | Build? |
|---|---|---|---|---|
| 1 | Mexican red knee (*Brachypelma hamorii*) | tarantula, burrower | the stereotypical pet tarantula | yes |
| 2 | Chilean rose (*Grammostola rosea*) | tarantula, terrestrial | classic beginner | yes |
| 3 | Curly hair (*Tliltocatl albopilosus*) | tarantula, terrestrial | classic beginner, common and cheap | yes |
| 4 | Pinktoe (*Avicularia avicularia*) | tarantula, arboreal | the arboreal beginner species | yes (new arboreal behavior) |
| 5 | Emperor scorpion | scorpion | by far the commonest pet scorpion | yes |
| 6 | Giant African millipede | millipede | the commonest pet millipede | yes |
| 7 | Madagascar hissing roach | roach | commonly a pet, not just feeder | yes |
| 8 | Zebra isopod | isopod | most popular isopod; colony | yes |
| 9 | Powder blue isopod | isopod | very common, cheap; same art as zebra with new colours | yes (cheap) |
| 10 | Orchid mantis | mantis | the showpiece mantis | yes |
| 11 | Indian stick insect | phasmid | commonest stick insect | yes |
| 12 | Purple pincher hermit crab | crab | most popular crab pet; but needs shell art, heavy water/salt care | optional |
Runners-up (not proposed): Brazilian black, greenbottle blue, dubia (feeder), rubber ducky and dwarf white isopods (tiny, colony), ivory millipede, ghost mantis, giant prickly stick insect, Asian forest scorpion, vinegaroon.

## Proposal: build 11 (12 with the hermit crab)
Art cost is dominated by new body plans; the list reuses plans: 4 tarantulas = one spider builder (existing `gpulchripes`) with colour/proportions;
2 isopods = one body plan; the rest are one new body plan each (scorpion, millipede, roach, mantis, stick insect, hermit crab).
So about 8 new plans, 11-12 species.

## Round-2 values for the proposed species (US units are applied by the app)
See `arthropods.json` for sources. Quick look: (T = C, RH = %, floor = cm L x W, h = cm)
| id | adult mm | life yr | T | RH | floor | h | feed d | $ typical |
|---|---|---|---|---|---|---|---|---|
| mexican-red-knee | 53 | 27 (F, derived) | 21-25 | 50-65 (a) | 42x21 | 15 (a) | 17 | 100 |
| chilean-rose | 60 (a) | 20 | 20-25 | 40-60 (a) | 45x22 | 15 (a) | 17 | 75 |
| curly-hair | 80 | 22 | 20-24 | 50-65 (a) | 51x26 | 15 (a) | 17 | 42 |
| pinktoe | 70 | 12 | 21-27 | 60-70 | 20x20 (a) | 30 (a) | 17 | 35 |
| emperor-scorpion | 165 | 7 | 22-28 | 75-80 | 46x30 (a) | 25 (a) | 10 | 60 |
| giantafricanmillipede | 250 | 8.5 | 22-26 | 70-80 | 91x46 | 46 | 2.5 | 85 |
| madagascarhissingroach | 70 | 3 | 25-28 | 60-70 | 51x26 | 31 | 3 | 5 |
| zebraisopod | 18 | 3 (a) | 18-25 | 40-75 (a) | 25x15 (a) | 10 (a) | 4 | 3 |
| powderblueisopod | 11 | 2.5 | 21-27 | 50-75 | 20x15 (a) | 10 (a) | 3 | 1.1 |
| orchid_mantis | 70 | 0.6 | 25-35 | 60-80 | 16x24 | 24 | 2.5 | 60 |
| indian_stick_insect | 80 | 1.25 | 18-25 | 60-75 | 25x25 | 38 | 1 | 3.4 |
| purplepincherhermitcrab | 75 | 12 | 24-29 | 70-80 | 51x26 | 31 | 1 | 10 |
(a) = assumption. Everything not marked is sourced or derived; see JSON.

## Risks to the strict rule (no Caution / Problem)
- Mantis lifespans (~7 months) and stick-insect lifespans will trip any "lifespan" or "years of care" category if the model has one: check on wiring.
- Hermit crab needs a heated humid enclosure and salt/fresh water dishes; terrarium stocking may flag water/humidity: likely the hardest to pass.
- Groups: tarantulas, scorpions (emperor can be kept in groups, but one per enclosure is the safe rule), mantises are solitary; isopods, millipedes (1-2), roaches, stick insects are colony/group.
- Mantis and stick insects need height (38-45 cm): verify against terrarium catalogue heights in tankfit.
