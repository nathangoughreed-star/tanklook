# Calibration review, survey v4: synth-shift

Build cba9d609. Engine readings: the current engine (research/calib/tables/v4.json, 2026-10-26). 1 expert (synth-shift (an AI model): modules A, B, C, D). With more than one expert each tank reads their median. The app's overall verdict is src/calib/v4.ts verdictOf, from its parts (space band, tank minimum, fighting warnings, compatibility, temperature, herp checks, group bands); "milder" means the experts judge the tank less severely than the app.

## Verdict per tag

Flagged: half or more of the tag's answered tanks a band off the app, all in the same direction. A tank the app calls "too small" is shown but not counted here (its own section below).

| tag | tanks | app | experts | agree | milder | harsher | |
|---|---|---|---|---|---|---|---|
| compat.betta-community | A14 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| compat.breeding-pair-floor | A08 B10 B14 | problems, too small, problems | caution, caution, problems | 1 | 1 | 0 | **flag: experts milder** |
| compat.coolwater-mates | B04 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| compat.coral-nipper | C04 | too small | problems | 0 | 0 | 0 |  |
| compat.cover-cave | B10 | too small | caution | 0 | 0 | 0 |  |
| compat.fish-in-shrimp-tank | B16 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.hermits-vs-snails | C03 | too small | unworkable | 0 | 0 | 0 |  |
| compat.nip-no-target | A12 | caution | caution | 1 | 0 | 0 |  |
| compat.nip-vs-fins | A07 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.prey-shrimp | A03 A15 B11 | problems, caution, unworkable | problems, ideal, unworkable | 2 | 1 | 0 |  |
| compat.prey-size | A08 A09 B02 | problems, too small, too small | caution, unworkable, problems | 0 | 1 | 0 | **flag: experts milder** |
| compat.prey-sw-inverts | C03 | too small | unworkable | 0 | 0 | 0 |  |
| compat.species-only | B13 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.temper | B09 | too small | unworkable | 0 | 0 | 0 |  |
| compat.temper-vs-school | A02 | problems | problems | 1 | 0 | 0 |  |
| compat.temperature-cool | D11 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.temperature-narrow | A02 A06 B12 | problems, problems, caution | problems, problems, caution | 3 | 0 | 0 |  |
| compat.temperature-none | B11 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.temperature-warm | B06 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.two-tangs | C07 | too small | unworkable | 0 | 0 | 0 |  |
| compat.water-chemistry | B09 | too small | unworkable | 0 | 0 | 0 |  |
| gap.toxins | D10 | too small | unworkable | 0 | 0 | 0 |  |
| golden.discus-85 | B05 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| groups.chromis | C04 | too small | problems | 0 | 0 | 0 |  |
| groups.chromis-under-min | C07 | too small | unworkable | 0 | 0 | 0 |  |
| groups.clown-max-2 | C12 | problems | problems | 1 | 0 | 0 |  |
| groups.demasoni | B07 | too small | caution | 0 | 0 | 0 |  |
| groups.firefish-pair | C11 | problems | problems | 1 | 0 | 0 |  |
| groups.grazer-density | B15 | ideal | ideal | 1 | 0 | 0 |  |
| groups.males-rule | B12 | caution | caution | 1 | 0 | 0 |  |
| groups.sae | A11 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.sexed | A03 A16 | problems, problems | problems, caution | 1 | 1 | 0 | **flag: experts milder** |
| groups.syno | B08 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| groups.territory-banggai | C10 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-bolivian | B14 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-gramma | C11 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-krib | B10 | too small | caution | 0 | 0 | 0 |  |
| groups.territory-puffer | B13 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.yellowlab-min | B09 | too small | unworkable | 0 | 0 | 0 |  |
| herp.adf-min | D12 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| herp.adf-with-betta | D12 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| herp.anole-group | D15 | too small | ideal | 0 | 0 | 0 |  |
| herp.arboreal-min | D03 | too small | ideal | 0 | 0 | 0 |  |
| herp.axolotl-min | D13 | too small | ideal | 0 | 0 | 0 |  |
| herp.axolotl-pair | D14 | too small | unworkable | 0 | 0 | 0 |  |
| herp.axolotl-with-fish | D14 | too small | unworkable | 0 | 0 | 0 |  |
| herp.cohab-sex-rule | D02 | too small | ideal | 0 | 0 | 0 |  |
| herp.cross-species | D04 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.dartfrog-group | D07 | too small | problems | 0 | 0 | 0 |  |
| herp.each-extra | D02 D05 | too small, too small | ideal, ideal | 0 | 0 | 0 |  |
| herp.female-aggression | D07 | too small | problems | 0 | 0 | 0 |  |
| herp.floor-min-bp | D06 | too small | caution | 0 | 0 | 0 |  |
| herp.floor-min-leo | D01 | too small | ideal | 0 | 0 | 0 |  |
| herp.height | D03 D09 | too small, too small | ideal, ideal | 0 | 0 | 0 |  |
| herp.height-bp | D06 | too small | caution | 0 | 0 | 0 |  |
| herp.mixed-pair | D05 | too small | ideal | 0 | 0 | 0 |  |
| herp.newt-group | D11 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.newt-with-shrimp | D11 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.one-male | D15 | too small | ideal | 0 | 0 | 0 |  |
| herp.prey-amphibian | D08 | too small | unworkable | 0 | 0 | 0 |  |
| herp.toad-group | D10 | too small | unworkable | 0 | 0 | 0 |  |
| herp.toad-with-fish | D10 | too small | unworkable | 0 | 0 | 0 |  |
| herp.treefrog-each-extra | D09 | too small | ideal | 0 | 0 | 0 |  |
| limits.food-not-room | B15 C09 | ideal, too small | ideal, ideal | 1 | 0 | 0 |  |
| space.big-class | B02 | too small | problems | 0 | 0 | 0 |  |
| space.big-class-mass | B04 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| space.canonical-20 | A04 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.chili-refit | A15 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| space.community-29 | A06 | problems | problems | 1 | 0 | 0 |  |
| space.coolwater | A12 | caution | caution | 1 | 0 | 0 |  |
| space.discus-community | B06 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.floor | A04 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.footprint-vs-height | A05 | too small | problems | 0 | 0 | 0 |  |
| space.full-community | A10 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.invert-class | A15 B16 | caution, unworkable | ideal, unworkable | 1 | 1 | 0 | **flag: experts milder** |
| space.kuhli-floor-factor | A11 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.livebearer-nano | A03 | problems | problems | 1 | 0 | 0 |  |
| space.livebearers | A16 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.malawi-mix | B08 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| space.mbuna-convention | B07 | too small | caution | 0 | 0 | 0 |  |
| space.mid-class | A11 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.nano | A01 A02 | caution, problems | caution, problems | 2 | 0 | 0 |  |
| space.nano-reef | C02 | too small | caution | 0 | 0 | 0 |  |
| space.reef-125 | C08 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.reef-40 | C04 | too small | problems | 0 | 0 | 0 |  |
| space.salt-load | C01 | too small | caution | 0 | 0 | 0 |  |
| space.salt-scale | C05 C08 | too small, unworkable | problems, unworkable | 1 | 0 | 0 |  |
| space.school-curve | A10 A13 | unworkable, problems | unworkable, problems | 2 | 0 | 0 |  |
| space.swordtail-refit | A16 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.tiny-class | A14 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| space.water | A04 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.water-small | A13 | problems | problems | 1 | 0 | 0 |  |
| tankmin.angel-height | A08 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| tankmin.betta | A01 | caution | caution | 1 | 0 | 0 |  |
| tankmin.bluetang | C07 | too small | unworkable | 0 | 0 | 0 |  |
| tankmin.clownloach | B02 | too small | problems | 0 | 0 | 0 |  |
| tankmin.coralbeauty | C04 | too small | problems | 0 | 0 | 0 |  |
| tankmin.coralbeauty-width | C05 | too small | problems | 0 | 0 | 0 |  |
| tankmin.demasoni-width | B07 | too small | caution | 0 | 0 | 0 |  |
| tankmin.goldfish | B03 | too small | problems | 0 | 0 | 0 |  |
| tankmin.mandarin | C09 | too small | ideal | 0 | 0 | 0 |  |
| tankmin.ocellaris | C01 | too small | caution | 0 | 0 | 0 |  |
| tankmin.oscar | B01 | too small | ideal | 0 | 0 | 0 |  |
| tankmin.royalgramma | C02 | too small | caution | 0 | 0 | 0 |  |
| tankmin.sixline | C03 | too small | unworkable | 0 | 0 | 0 |  |
| tankmin.tarantula-row | D16 | ideal | ideal | 1 | 0 | 0 |  |
| tankmin.yellowlab | B09 | too small | unworkable | 0 | 0 | 0 |  |
| tankmin.yellowtang | C06 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |

### Agreement by family (rows the app, columns the experts' median, tanks)

**compat** (23 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 3 | 2 | 0 | 0 |
| problems | 0 | 1 | 4 | 0 |
| unworkable | 0 | 0 | 0 | 6 |

**golden** (1 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 1 | 0 | 0 | 0 |
| problems | 0 | 0 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 0 |

**groups** (16 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 1 | 0 | 0 | 0 |
| caution | 1 | 1 | 0 | 0 |
| problems | 0 | 1 | 5 | 0 |
| unworkable | 0 | 0 | 0 | 2 |

**herp** (15 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 0 | 0 | 0 |
| problems | 0 | 1 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 2 |

**limits** (2 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 1 | 0 | 0 | 0 |
| caution | 0 | 0 | 0 | 0 |
| problems | 0 | 0 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 0 |

**space** (24 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 4 | 2 | 0 | 0 |
| problems | 0 | 2 | 4 | 0 |
| unworkable | 0 | 0 | 0 | 5 |

**tankmin** (16 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 1 | 0 | 0 | 0 |
| caution | 1 | 1 | 0 | 0 |
| problems | 0 | 1 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 0 |


## Too small (the app's own verdict)

A species under its red-line tank minimum, or a herp under its bare floor or height. Read against the experts' first change ("Bigger tank") and "big enough" answers; their 4-step verdict is shown beside it. Flagged: fewer than half the experts who answered ask for a bigger tank.

| tank | app's lines | the rest, on 4 steps | experts' verdict | experts: bigger tank / not big enough | |
|---|---|---|---|---|---|
| A05 | tankmin red: bronzecory | problems (space 119 %) | problems | not asked |  |
| A09 | tankmin red: angel | unworkable (temperature none) | unworkable | 1 of 1 |  |
| B01 | tankmin red: oscar | ideal | ideal | 1 of 1 |  |
| B02 | tankmin red: oscar | problems (space 107 %) | problems | 1 of 1 |  |
| B03 | tankmin red: goldfish | problems (space 103 %; group too small: goldfish) | problems | 1 of 1 |  |
| B07 | tankmin red: demasoni | caution (space 85 %; temperature narrow) | caution | 1 of 1 |  |
| B09 | tankmin red: yellowlab | unworkable (compat high) | unworkable | 1 of 1 |  |
| B10 | tankmin red: kribensis | caution (space 78 %; compat concern; temperature narrow) | caution | 1 of 1 |  |
| C01 | tankmin red: ocellaris | caution (space 82 %) | caution | 1 of 1 |  |
| C02 | tankmin red: royalgramma; tankmin red: firefish; tankmin red: ocellaris | caution (space 99 %; temperature narrow) | caution | 1 of 1 |  |
| C03 | tankmin red: sixline; tankmin red: ocellaris; tankmin red: watchman | unworkable (compat high) | unworkable | 1 of 1 |  |
| C04 | tankmin red: coralbeauty | problems (space 126 %) | problems | 1 of 1 |  |
| C05 | tankmin red: coralbeauty | problems (space 122 %) | problems | not asked |  |
| C07 | tankmin red: bluetang | unworkable (compat high) | unworkable | 1 of 1 |  |
| C09 | tankmin red: mandarin; tankmin red: ocellaris | ideal | ideal | 1 of 1 |  |
| D01 | herp: Leopard gecko: floor 1 | ideal | ideal | 1 of 1 |  |
| D02 | herp: Leopard gecko: floor 4 | ideal | ideal | 1 of 1 |  |
| D03 | herp: Crested gecko: floor 1 sq ft (0; herp: Crested gecko: enclosure 18 in tall | ideal | ideal | 1 of 1 |  |
| D05 | herp: Crested gecko: floor 2 | ideal | ideal | 1 of 1 |  |
| D06 | herp: Ball python: enclosure 16 in tall | caution (herp floor under recommended: Ball python) | caution | 1 of 1 |  |
| D07 | herp: Dyeing dart frog: floor 2 | problems (herp: Dyeing dart frog: 2 females) | problems | 1 of 1 |  |
| D08 | herp: White's tree frog: floor 2; herp: Dyeing dart frog: floor 2 | unworkable (herp: White's tree frog: not with Dyeing dart frog; herp: Dyeing dart frog: not with White's tree frog) | unworkable | 1 of 1 |  |
| D09 | herp: White's tree frog: floor 2 | ideal | ideal | 1 of 1 |  |
| D10 | herp: Fire-bellied toad: floor 2 | unworkable (herp: Fire-bellied toad: not with White cloud mountain minnow) | unworkable | 1 of 1 |  |
| D13 | tankmin red: axolotl | ideal | ideal | 1 of 1 |  |
| D14 | tankmin red: axolotl | unworkable (compat high; herp: Axolotl: not with White cloud mountain minnow) | unworkable | 1 of 1 |  |
| D15 | herp: Green anole: floor 2 | ideal | ideal | 1 of 1 |  |
## Count fix per tank

Each count read on the dimension its species fills today (as calib-fit.mjs does). "fix" is the multiplier the engine's reading needs (below 0 % the engine reads the tank too full); "least" is the smallest move that makes the expert's count the engine's own nearest count, so a rounded small count is not a disagreement. A tank's fix pools its counted species and its second counted species (the bottom dweller of six tanks, the line below it, marked †). Fitted (calib-fit.mjs): the tanks with a space.* or golden.* tag.

| tank | counted | shown -> engine | ideal -> engine | limit -> engine | fix | least | fitted |
|---|---|---|---|---|---|---|---|
| A02 | neon (water) | 6 -> 68 % | 10 -> 100 % | 15 -> 129 % | -24 % | -22 % | yes |
| A03 | guppy (water) | 8 -> 131 % | 6 -> 102 % | 8 -> 131 % | -25 % | -20 % | yes |
| A04 | neon (water) | 10 -> 101 % | 9 -> 98 % | 21 -> 131 % | -25 % | -22 % | yes |
|  | bronzecory † (floor) | 6 -> 81 % | 8 -> 102 % | 11 -> 134 % |  |  |  |
| A05 | neon (water) | 10 -> 119 % | 4 -> 99 % | 13 -> 129 % | -23 % | -20 % | yes |
|  | bronzecory † (floor) | 6 -> 101 % | 6 -> 101 % | 8 -> 127 % |  |  |  |
| A06 | harlequin (water) | 12 -> 78 % | 20 -> 97 % | 36 -> 129 % | -23 % | -22 % | yes |
| A08 | rummynose (water) | 15 -> 122 % | 0 | 21 -> 130 % | -23 % | -23 % | no |
| A10 | neon (water) | 20 -> 118 % | 0 | 33 -> 130 % | -24 % | -22 % | yes |
|  | bronzecory † (floor) | 12 -> 87 % | 14 -> 99 % | 19 -> 130 % |  |  |  |
| A11 | boesemani (water) | 8 -> 113 % | 4 -> 99 % | 14 -> 130 % | -23 % | -22 % | yes |
|  | kuhli † (max) | 10 -> 113 % | 1 -> 97 % | 21 -> 130 % |  |  |  |
| A12 | danio (water) | 12 -> 99 % | 12 -> 99 % | 19 -> 129 % | -23 % | -22 % | yes |
| A13 | neon (water) | 20 -> 142 % | 12 -> 99 % | 18 -> 132 % | -24 % | -22 % | yes |
| A14 | ember (water) | 10 -> 85 % | 18 -> 98 % | 42 -> 130 % | -23 % | -23 % | yes |
| A15 | chili (water) | 12 -> 92 % | 14 -> 97 % | 27 -> 130 % | -23 % | -22 % | yes |
| A16 | platy (water) | 6 -> 102 % | 4 -> 97 % | 20 -> 130 % | -22 % | -21 % | yes |
|  | bronzecory † (floor) | 8 -> 47 % | 16 -> 95 % | 22 -> 130 % |  |  |  |
| B02 | clownloach (floor) | 5 -> 50 % | cant-say | cant-say |  |  | yes |
| B04 | goldfish (max) | 3 -> 82 % | 4 -> 107 % | 5 -> 130 % | -27 % | -18 % | yes |
| B05 | discus (water) | 6 -> 82 % | 7 -> 95 % | 10 -> 136 % | -24 % | -19 % | yes |
| B06 | discus (water) | 6 -> 102 % | 5 -> 94 % | 9 -> 127 % | -22 % | -19 % | yes |
|  | sterbai † (floor) | 8 -> 35 % | 22 -> 96 % | 30 -> 131 % |  |  |  |
| B07 | yellowlab (max) | 8 -> 85 % | 11 -> 96 % | 21 -> 130 % | -23 % | -21 % | yes |
| B08 | peacock (water) | 5 -> 95 % | 6 -> 99 % | 15 -> 130 % | -24 % | -23 % | yes |
| B15 | oto (max) | 8 -> 72 % | 14 -> 96 % | 23 -> 130 % | -22 % | -21 % | no |
| B16 | cherryshrimp (max) | 30 -> 104 % | 24 -> 97 % | 57 -> 130 % | -23 % | -22 % | yes |
| C03 | hermit (max) | 10 -> 118 % | 5 -> 100 % | 14 -> 131 % | -24 % | -23 % | no |
| C04 | chromis (water) | 6 -> 126 % | 3 -> 99 % | 7 -> 133 % | -25 % | -22 % | yes |
| C05 | chromis (water) | 6 -> 122 % | 3 -> 97 % | 7 -> 129 % | -23 % | -20 % | yes |
| C08 | chromis (water) | 9 -> 91 % | 11 -> 96 % | 24 -> 130 % | -23 % | -22 % | yes |

### Count fix per tag

Flagged: the median least fix of the tag's count tanks more than 15 % off.

| tag | tanks | median fix | median least | |
|---|---|---|---|---|
| compat.betta-community | A14 | -23 % | -23 % | **flag: engine reads too full** |
| compat.breeding-pair-floor | A08 | -23 % | -23 % | **flag: engine reads too full** |
| compat.coolwater-mates | B04 | -27 % | -18 % | **flag: engine reads too full** |
| compat.coral-nipper | C04 | -25 % | -22 % | **flag: engine reads too full** |
| compat.fish-in-shrimp-tank | B16 | -23 % | -22 % | **flag: engine reads too full** |
| compat.hermits-vs-snails | C03 | -24 % | -23 % | **flag: engine reads too full** |
| compat.nip-no-target | A12 | -23 % | -22 % | **flag: engine reads too full** |
| compat.prey-shrimp | A03 A15 | -24 % | -21 % | **flag: engine reads too full** |
| compat.prey-size | A08 | -23 % | -23 % | **flag: engine reads too full** |
| compat.prey-sw-inverts | C03 | -24 % | -23 % | **flag: engine reads too full** |
| compat.temper-vs-school | A02 | -24 % | -22 % | **flag: engine reads too full** |
| compat.temperature-narrow | A02 A06 | -23 % | -22 % | **flag: engine reads too full** |
| compat.temperature-warm | B06 | -22 % | -19 % | **flag: engine reads too full** |
| golden.discus-85 | B05 | -24 % | -19 % | **flag: engine reads too full** |
| groups.chromis | C04 | -25 % | -22 % | **flag: engine reads too full** |
| groups.demasoni | B07 | -23 % | -21 % | **flag: engine reads too full** |
| groups.grazer-density | B15 | -22 % | -21 % | **flag: engine reads too full** |
| groups.sae | A11 | -23 % | -22 % | **flag: engine reads too full** |
| groups.sexed | A03 A16 | -24 % | -21 % | **flag: engine reads too full** |
| groups.syno | B08 | -24 % | -23 % | **flag: engine reads too full** |
| limits.food-not-room | B15 | -22 % | -21 % | **flag: engine reads too full** |
| space.big-class-mass | B04 | -27 % | -18 % | **flag: engine reads too full** |
| space.canonical-20 | A04 | -25 % | -22 % | **flag: engine reads too full** |
| space.chili-refit | A15 | -23 % | -22 % | **flag: engine reads too full** |
| space.community-29 | A06 | -23 % | -22 % | **flag: engine reads too full** |
| space.coolwater | A12 | -23 % | -22 % | **flag: engine reads too full** |
| space.discus-community | B06 | -22 % | -19 % | **flag: engine reads too full** |
| space.floor | A04 | -25 % | -22 % | **flag: engine reads too full** |
| space.footprint-vs-height | A05 | -23 % | -20 % | **flag: engine reads too full** |
| space.full-community | A10 | -24 % | -22 % | **flag: engine reads too full** |
| space.invert-class | A15 B16 | -23 % | -22 % | **flag: engine reads too full** |
| space.kuhli-floor-factor | A11 | -23 % | -22 % | **flag: engine reads too full** |
| space.livebearer-nano | A03 | -25 % | -20 % | **flag: engine reads too full** |
| space.livebearers | A16 | -22 % | -21 % | **flag: engine reads too full** |
| space.malawi-mix | B08 | -24 % | -23 % | **flag: engine reads too full** |
| space.mbuna-convention | B07 | -23 % | -21 % | **flag: engine reads too full** |
| space.mid-class | A11 | -23 % | -22 % | **flag: engine reads too full** |
| space.nano | A02 | -24 % | -22 % | **flag: engine reads too full** |
| space.reef-125 | C08 | -23 % | -22 % | **flag: engine reads too full** |
| space.reef-40 | C04 | -25 % | -22 % | **flag: engine reads too full** |
| space.salt-scale | C05 C08 | -23 % | -21 % | **flag: engine reads too full** |
| space.school-curve | A10 A13 | -24 % | -22 % | **flag: engine reads too full** |
| space.swordtail-refit | A16 | -22 % | -21 % | **flag: engine reads too full** |
| space.tiny-class | A14 | -23 % | -23 % | **flag: engine reads too full** |
| space.water | A04 | -25 % | -22 % | **flag: engine reads too full** |
| space.water-small | A13 | -24 % | -22 % | **flag: engine reads too full** |
| tankmin.angel-height | A08 | -23 % | -23 % | **flag: engine reads too full** |
| tankmin.coralbeauty | C04 | -25 % | -22 % | **flag: engine reads too full** |
| tankmin.coralbeauty-width | C05 | -23 % | -20 % | **flag: engine reads too full** |
| tankmin.demasoni-width | B07 | -23 % | -21 % | **flag: engine reads too full** |
| tankmin.sixline | C03 | -24 % | -23 % | **flag: engine reads too full** |

## The first thing to change, against the app

fewer X: the app's biggest contributor on its binding dimension, or a fighting warning on X; bigger: a tank-minimum or herp floor line; drop X: a compatibility, temperature or herp line naming X; ratio: a group band, sex mix or males line; nothing: the app's ideal. notroom (food, maturity, habitat) and other have no app part to hold against.

| tank | app's reading | experts | fits the app | |
|---|---|---|---|---|
| A01 | caution: tankmin yellow: betta | bigger | yes |  |
| A02 | problems: group too small: neon | ratio | yes |  |
| A03 | problems: space 131 %; group too small: cherryshrimp | fewer guppy | yes |  |
| A04 | problems: space 101 % | fewer bronzecory | yes |  |
| A06 | problems: group too small: amano | ratio | yes |  |
| A07 | unworkable: compat high | drop betta | yes |  |
| A08 | problems: space 122 % | fewer sterbai | yes |  |
| A09 | too-small: tankmin red: angel | bigger | yes |  |
| A10 | unworkable: temperature single | drop | yes |  |
| A11 | unworkable: compat high; temperature single | drop kuhli | yes |  |
| A12 | caution: space 99 %; tankmin yellow: danio; temperature narrow | fewer danio | yes |  |
| A13 | problems: space 142 % | fewer neon | yes |  |
| A14 | caution: space 85 %; tankmin yellow: kuhli; temperature narrow | fewer kuhli | yes |  |
| A15 | caution: space 92 %; temperature narrow | fewer chili | yes |  |
| A16 | problems: space 102 % | fewer swordtail | yes |  |
| B01 | too-small: tankmin red: oscar | bigger | yes |  |
| B02 | too-small: tankmin red: oscar | bigger | yes |  |
| B03 | too-small: tankmin red: goldfish | bigger | yes |  |
| B04 | caution: space 82 %; temperature narrow | fewer goldfish | yes |  |
| B05 | caution: space 82 %; tankmin yellow: discus | fewer discus | yes |  |
| B06 | unworkable: temperature outside | drop | yes |  |
| B07 | too-small: tankmin red: demasoni | bigger | yes |  |
| B08 | caution: space 95 %; temperature narrow | fewer syno | yes |  |
| B09 | too-small: tankmin red: yellowlab | bigger | yes |  |
| B10 | too-small: tankmin red: kribensis | bigger | yes |  |
| B11 | unworkable: compat high; temperature none | drop cherryshrimp | yes |  |
| B12 | caution: temperature narrow | drop | yes |  |
| B13 | unworkable: compat high | drop oto | yes |  |
| B14 | problems: crowd: 4 Bolivian rams | fewer bolivianram | yes |  |
| B15 | ideal: - | nothing | yes |  |
| B16 | unworkable: compat high | drop chili | yes |  |
| C01 | too-small: tankmin red: ocellaris | bigger | yes |  |
| C02 | too-small: tankmin red: royalgramma; tankmin red: firefish; tankmin red: ocellaris | bigger | yes |  |
| C03 | too-small: tankmin red: sixline; tankmin red: ocellaris; tankmin red: watchman | bigger | yes |  |
| C04 | too-small: tankmin red: coralbeauty | bigger | yes |  |
| C06 | caution: space 91 %; tankmin yellow: yellowtang; temperature narrow | fewer chromis | yes |  |
| C07 | too-small: tankmin red: bluetang | bigger | yes |  |
| C08 | unworkable: compat high | drop bluetang | yes |  |
| C09 | too-small: tankmin red: mandarin; tankmin red: ocellaris | bigger | yes |  |
| C10 | problems: crowd: 5 Banggai cardinalfish | fewer banggai | yes |  |
| C11 | problems: crowd: Royal gramma is best kept one to a tank | fewer royalgramma | yes |  |
| C12 | problems: crowd: 3 Ocellaris clownfish | fewer ocellaris | yes |  |
| D01 | too-small: herp: Leopard gecko: floor 1 | bigger | yes |  |
| D02 | too-small: herp: Leopard gecko: floor 4 | bigger | yes |  |
| D03 | too-small: herp: Crested gecko: floor 1 sq ft (0; herp: Crested gecko: enclosure 18 in tall | bigger | yes |  |
| D04 | unworkable: herp: Crested gecko: not with Green anole; herp: Green anole: not with Crested gecko (flame) | drop greenanole | yes |  |
| D05 | too-small: herp: Crested gecko: floor 2 | bigger | yes |  |
| D06 | too-small: herp: Ball python: enclosure 16 in tall | bigger | yes |  |
| D07 | too-small: herp: Dyeing dart frog: floor 2 | bigger | yes |  |
| D08 | too-small: herp: White's tree frog: floor 2; herp: Dyeing dart frog: floor 2 | bigger | yes |  |
| D09 | too-small: herp: White's tree frog: floor 2 | bigger | yes |  |
| D10 | too-small: herp: Fire-bellied toad: floor 2 | bigger | yes |  |
| D11 | unworkable: temperature single | drop | yes |  |
| D12 | problems: space 107 % | fewer adf | yes |  |
| D13 | too-small: tankmin red: axolotl | bigger | yes |  |
| D14 | too-small: tankmin red: axolotl | bigger | yes |  |
| D15 | too-small: herp: Green anole: floor 2 | bigger | yes |  |
| D16 | ideal: - | nothing | yes |  |

## Keep together, and why, against compatRisks

The app's answer: no for a blocked pair, no shared temperature, or a herp that must not share; caution for a concern or a narrow shared temperature. Reasons in the survey's categories (eat = prey, nip, aggression = temper / territory / guard, chemistry, temperature, habitat = herp mates); "disease" has no rule (a gap, design section 6.4).

| tank | app | app's lines | experts | app reasons | expert reasons | |
|---|---|---|---|---|---|---|
| A02 | caution | Neon tetra with Nerite snail (zebra): water chemistry: prefers pH 5.0-7.0, it 7.0-8.5; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps (Nerite snail (zebra)); temperature narrow | yes | chemistry, temperature | - | **flag** |
| A03 | caution | temperature narrow | yes | temperature | - | **flag** |
| A06 | caution | Harlequin rasbora with Nerite snail (zebra): water chemistry: prefers pH 5.0-7.0, it 7.0-8.5; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps (Nerite snail (zebra)); temperature narrow | yes | chemistry, temperature | - | **flag** |
| A07 | no | Tiger barb with Betta: would harass its long fins | caution | nip | nip | **flag** |
| A08 | caution | Angelfish breeding pair defends much of this floor (648 sq in): tankmates need caves and sight breaks elsewhere; temperature narrow | yes | aggression, temperature | - | **flag** |
| A09 | no | Angelfish breeding pair defends much of this floor (624 sq in): tankmates need caves and sight breaks elsewhere; temperature none | caution | aggression, temperature | aggression, temperature | **flag** |
| A14 | caution | temperature narrow | yes | temperature | - | **flag** |
| A15 | caution | temperature narrow | yes | temperature | - | **flag** |
| B02 | caution | temperature narrow | yes | temperature | - | **flag** |
| B04 | caution | temperature narrow | yes | temperature | - | **flag** |
| B06 | no | temperature narrow | caution | temperature | temperature | **flag** |
| B07 | caution | temperature narrow | yes | temperature | - | **flag** |
| B09 | no | Neon tetra with Yellow lab cichlid: water chemistry: pH 4.0-7.5 against its 7.6-8.6; temperature narrow | caution | chemistry, temperature | chemistry, temperature | **flag** |
| B10 | caution | Kribensis breeding pair defends much of this floor (360 sq in): tankmates need caves and sight breaks elsewhere; temperature narrow | yes | aggression, temperature | - | **flag** |
| B11 | no | German blue ram with Cherry shrimp: would eat it; temperature none | caution | eat, temperature | eat, temperature | **flag** |
| B12 | caution | temperature narrow | yes | temperature | - | **flag** |
| B13 | no | Pea puffer with Otocinclus: too aggressive for it; temperature narrow | caution | aggression, temperature | aggression, temperature | **flag** |
| C02 | caution | temperature narrow | yes | temperature | - | **flag** |
| C03 | no | Six-line wrasse with Blue-leg hermit crab: would eat it; temperature narrow | caution | eat, temperature | eat, temperature | **flag** |
| C04 | caution | temperature narrow | yes | temperature | - | **flag** |
| C07 | no | Yellow tang with Blue tang: rivals of its look-alike, keep one tang; Blue tang with Yellow tang: rivals of its look-alike, keep one tang; temperature narrow | caution | aggression, temperature | aggression, temperature | **flag** |
| C11 | caution | temperature narrow | yes | temperature | - | **flag** |
| D02 | yes | - | yes | - | - |  |
| D04 | no | Crested gecko: not with Green anole; Green anole: not with Crested gecko (flame) | caution | habitat | habitat | **flag** |
| D05 | yes | - | yes | - | - |  |
| D07 | yes | - | yes | - | - |  |
| D08 | no | White's tree frog: not with Dyeing dart frog; Dyeing dart frog: not with White's tree frog | caution | habitat | habitat | **flag** |
| D10 | no | Fire-bellied toad: not with White cloud mountain minnow | caution | habitat | habitat | **flag** |
| D11 | no | temperature single | caution | temperature | temperature | **flag** |
| D12 | caution | temperature narrow | yes | temperature | - | **flag** |
| D14 | no | Axolotl with White cloud mountain minnow: would eat it; temperature narrow; Axolotl: not with White cloud mountain minnow | caution | eat, habitat, temperature | eat, habitat, temperature | **flag** |

## Big enough and smallest size, against tankmin red / green

The app's smallest is the first offered size it calls green (Recommended) for the species as stocked; "not big enough" is its red line at this tank (for a land animal, herpcheck's bare floor or height).

| tank | species | app at the four sizes | app smallest | experts smallest | app big enough | experts | |
|---|---|---|---|---|---|---|---|
| A01 | betta | red, yellow, green, green | 10 gal (20 x 10 x 12 in) | 10 gal (20 x 10 x 12 in) | yes | yes |  |
| A08 | angel | red, yellow, red, green | 75 gal (48 x 18 x 21 in) | 75 gal (48 x 18 x 21 in) | yes | yes |  |
| B01 | oscar | red, red, red, green | 180 gal (72 x 24 x 24 in) | 180 gal (72 x 24 x 24 in) | no | no |  |
| B03 | goldfish | red, red, yellow, green | 40 gal breeder (36 x 18 x 16 in) | 40 gal breeder (36 x 18 x 16 in) | no | no |  |
| C01 | ocellaris | red, yellow, yellow, green | 29 gal (30 x 12 x 18 in) | 29 gal (30 x 12 x 18 in) | no | no |  |
| C02 | royalgramma | red, red, green, green | 40 gal breeder (36 x 18 x 16 in) | 40 gal breeder (36 x 18 x 16 in) | no | no |  |
| C06 | yellowtang | yellow, yellow, yellow, green | 125 gal (72 x 18 x 21 in) | 125 gal (72 x 18 x 21 in) | yes | yes |  |
| C07 | bluetang | red, yellow, yellow, green | 240 gal (96 x 24 x 24 in) | 240 gal (96 x 24 x 24 in) | no | no |  |
| D01 | leopardgecko | red, red, yellow, green | 4 x 2 x 2 ft (48 x 24 x 24 in) | 4 x 2 x 2 ft (48 x 24 x 24 in) | no | no |  |
| D03 | crestedgecko | , , ,  | larger | larger | no | no |  |
| D06 | ballpython | red, red, green, green | 4 x 2 x 2 ft (48 x 24 x 24 in) | 4 x 2 x 2 ft (48 x 24 x 24 in) | no | no |  |
| D09 | treefrog | , , ,  | larger | larger | no | no |  |
| D13 | axolotl | red, red, yellow, green | 40 gal breeder (36 x 18 x 16 in) | 40 gal breeder (36 x 18 x 16 in) | no | no |  |
| D16 | chacogoldenknee | , , , green | 20 gal long (30 x 12 x 12 in) | 20 gal long (30 x 12 x 12 in) | yes | yes |  |

## The most of a species, against groups.ts and herpstock.ts

The app's figure for this tank (groups.ts territory or max, one for a solo species; herpstock max and the floor per extra animal), placed among the offered counts.

| tank | question | app figure | app option | experts | |
|---|---|---|---|---|---|
| B07 | max demasoni | no limit (no limit) | 16+ | 16+ |  |
| B10 | max kribensis | 2 (groups.ts territory) | 2 | 2 |  |
| B12 | maxMales dwarfgourami | 2 (groups.ts territory) | 2 | 2 |  |
| B13 | max peapuffer | 2 (groups.ts territory) | 2 | 2 |  |
| B14 | max bolivianram | 2 (groups.ts territory) | 2 | 2 |  |
| C10 | max banggai | 2 (groups.ts territory) | 2 | 2 |  |
| C11 | max royalgramma | 1 (groups.ts territory) | 1 | 1 |  |
| C11 | max firefish | 2 (groups.ts max) | 2 | 2 |  |
| C12 | max ocellaris | 2 (groups.ts max) | 2 | 2 |  |
| D02 | max leopardgecko (if they all turn out female) | 1 (herpstock max 2, floor fits 1 (4.5 + 3 sq ft each, 4.73 sq ft)) | 1 | 1 |  |
| D05 | max crestedgecko | 1 (herpstock max 3, floor fits 1 (2.25 + 2.25 sq ft each, 2.36 sq ft)) | 1 | 1 |  |
| D07 | max dartfrog | 1 (herpstock max 3, floor fits 1 (1.5 + 1 sq ft each, 2.36 sq ft)) | 1 | 1 |  |
| D09 | max treefrog | 1 (herpstock max none, floor fits 1 (2.25 + 0.75 sq ft each, 2.36 sq ft)) | 1 | 1 |  |
| D10 | max firetoad | 3 (herpstock max none, floor fits 3 (1.4 + 0.5 sq ft each, 2.63 sq ft)) | 3 | 3 |  |
| D11 | max firenewt | 3 (herpstock max none, floor fits 3 (1.4 + 0.6 sq ft each, 2.63 sq ft)) | 3 | 3 |  |
| D12 | max adf | 0 (herpstock max none, floor fits 0 (1.25 + 0.4 sq ft each, 0.93 sq ft)) | 0 | 0 |  |
| D14 | max axolotl | 1 (herpstock max 3, floor fits 1 (2.5 + 1.25 sq ft each, 2.63 sq ft)) | 1 | 1 |  |
| D15 | max greenanole | 2 (herpstock max 4, floor fits 2 (1.5 + 0.75 sq ft each, 2.36 sq ft)) | 2 | 2 |  |
| D15 | maxMales greenanole | 1 (herpstock max 4, floor fits 2 (1.5 + 0.75 sq ft each, 2.36 sq ft)) | 1 | 1 |  |

## About the answers

| expert | module | answered | skipped | open | set aside |
|---|---|---|---|---|---|
| synth-shift | A | 16 | 0 | 0 | 0 |
| synth-shift | B | 16 | 0 | 0 | 0 |
| synth-shift | C | 12 | 0 | 0 | 0 |
| synth-shift | D | 16 | 0 | 0 | 0 |

Confidence: low 0, medium 60, high 0. A module a keeper mostly skips is outside their domain; one an LLM skips is a prompt problem (design section 5).

## Flags

- verdict compat.betta-community: milder (1 of 1 tanks)
- verdict compat.breeding-pair-floor: milder (1 of 2 tanks)
- verdict compat.coolwater-mates: milder (1 of 1 tanks)
- verdict compat.prey-size: milder (1 of 1 tanks)
- verdict golden.discus-85: milder (1 of 1 tanks)
- verdict groups.sexed: milder (1 of 2 tanks)
- verdict groups.syno: milder (1 of 1 tanks)
- verdict herp.adf-min: milder (1 of 1 tanks)
- verdict herp.adf-with-betta: milder (1 of 1 tanks)
- verdict space.big-class-mass: milder (1 of 1 tanks)
- verdict space.canonical-20: milder (1 of 1 tanks)
- verdict space.chili-refit: milder (1 of 1 tanks)
- verdict space.floor: milder (1 of 1 tanks)
- verdict space.invert-class: milder (1 of 2 tanks)
- verdict space.livebearers: milder (1 of 1 tanks)
- verdict space.malawi-mix: milder (1 of 1 tanks)
- verdict space.swordtail-refit: milder (1 of 1 tanks)
- verdict space.tiny-class: milder (1 of 1 tanks)
- verdict space.water: milder (1 of 1 tanks)
- verdict tankmin.angel-height: milder (1 of 1 tanks)
- verdict tankmin.yellowtang: milder (1 of 1 tanks)
- count compat.betta-community: engine too full (-23 %)
- count compat.breeding-pair-floor: engine too full (-23 %)
- count compat.coolwater-mates: engine too full (-18 %)
- count compat.coral-nipper: engine too full (-22 %)
- count compat.fish-in-shrimp-tank: engine too full (-22 %)
- count compat.hermits-vs-snails: engine too full (-23 %)
- count compat.nip-no-target: engine too full (-22 %)
- count compat.prey-shrimp: engine too full (-21 %)
- count compat.prey-size: engine too full (-23 %)
- count compat.prey-sw-inverts: engine too full (-23 %)
- count compat.temper-vs-school: engine too full (-22 %)
- count compat.temperature-narrow: engine too full (-22 %)
- count compat.temperature-warm: engine too full (-19 %)
- count golden.discus-85: engine too full (-19 %)
- count groups.chromis: engine too full (-22 %)
- count groups.demasoni: engine too full (-21 %)
- count groups.grazer-density: engine too full (-21 %)
- count groups.sae: engine too full (-22 %)
- count groups.sexed: engine too full (-21 %)
- count groups.syno: engine too full (-23 %)
- count limits.food-not-room: engine too full (-21 %)
- count space.big-class-mass: engine too full (-18 %)
- count space.canonical-20: engine too full (-22 %)
- count space.chili-refit: engine too full (-22 %)
- count space.community-29: engine too full (-22 %)
- count space.coolwater: engine too full (-22 %)
- count space.discus-community: engine too full (-19 %)
- count space.floor: engine too full (-22 %)
- count space.footprint-vs-height: engine too full (-20 %)
- count space.full-community: engine too full (-22 %)
- count space.invert-class: engine too full (-22 %)
- count space.kuhli-floor-factor: engine too full (-22 %)
- count space.livebearer-nano: engine too full (-20 %)
- count space.livebearers: engine too full (-21 %)
- count space.malawi-mix: engine too full (-23 %)
- count space.mbuna-convention: engine too full (-21 %)
- count space.mid-class: engine too full (-22 %)
- count space.nano: engine too full (-22 %)
- count space.reef-125: engine too full (-22 %)
- count space.reef-40: engine too full (-22 %)
- count space.salt-scale: engine too full (-21 %)
- count space.school-curve: engine too full (-22 %)
- count space.swordtail-refit: engine too full (-21 %)
- count space.tiny-class: engine too full (-23 %)
- count space.water: engine too full (-22 %)
- count space.water-small: engine too full (-22 %)
- count tankmin.angel-height: engine too full (-23 %)
- count tankmin.coralbeauty: engine too full (-22 %)
- count tankmin.coralbeauty-width: engine too full (-20 %)
- count tankmin.demasoni-width: engine too full (-21 %)
- count tankmin.sixline: engine too full (-23 %)
- compat A02: milder (app caution, experts yes)
- compat A03: milder (app caution, experts yes)
- compat A06: milder (app caution, experts yes)
- compat A07: milder (app no, experts caution)
- compat A08: milder (app caution, experts yes)
- compat A09: milder (app no, experts caution)
- compat A14: milder (app caution, experts yes)
- compat A15: milder (app caution, experts yes)
- compat B02: milder (app caution, experts yes)
- compat B04: milder (app caution, experts yes)
- compat B06: milder (app no, experts caution)
- compat B07: milder (app caution, experts yes)
- compat B09: milder (app no, experts caution)
- compat B10: milder (app caution, experts yes)
- compat B11: milder (app no, experts caution)
- compat B12: milder (app caution, experts yes)
- compat B13: milder (app no, experts caution)
- compat C02: milder (app caution, experts yes)
- compat C03: milder (app no, experts caution)
- compat C04: milder (app caution, experts yes)
- compat C07: milder (app no, experts caution)
- compat C11: milder (app caution, experts yes)
- compat D04: milder (app no, experts caution)
- compat D08: milder (app no, experts caution)
- compat D10: milder (app no, experts caution)
- compat D11: milder (app no, experts caution)
- compat D12: milder (app caution, experts yes)
- compat D14: milder (app no, experts caution)

## Findings

(hand-written: the flagged tags, the change each suggests, and what round B should ask)
