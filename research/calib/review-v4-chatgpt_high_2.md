# Calibration review, survey v4: chatgpt high 2

Build cba9d609. Engine readings: the current engine (research/calib/tables/v4.json, 2026-10-26). 1 expert (chatgpt high 2 (an AI model): modules A, B, C, D). With more than one expert each tank reads their median. The app's overall verdict is src/calib/v4.ts verdictOf, from its parts (space band, tank minimum, fighting warnings, compatibility, temperature, herp checks, group bands); "milder" means the experts judge the tank less severely than the app.

## Verdict per tag

Flagged: half or more of the tag's answered tanks a band off the app, all in the same direction. A tank the app calls "too small" is shown but not counted here (its own section below).

| tag | tanks | app | experts | agree | milder | harsher | |
|---|---|---|---|---|---|---|---|
| compat.betta-community | A14 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| compat.breeding-pair-floor | A08 B10 B14 | problems, too small, problems | caution, problems, caution | 0 | 2 | 0 | **flag: experts milder** |
| compat.coolwater-mates | B04 | caution | problems | 0 | 0 | 1 | **flag: experts harsher** |
| compat.coral-nipper | C04 | too small | problems | 0 | 0 | 0 |  |
| compat.cover-cave | B10 | too small | problems | 0 | 0 | 0 |  |
| compat.fish-in-shrimp-tank | B16 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| compat.hermits-vs-snails | C03 | too small | problems | 0 | 0 | 0 |  |
| compat.nip-no-target | A12 | caution | caution | 1 | 0 | 0 |  |
| compat.nip-vs-fins | A07 | unworkable | problems | 0 | 1 | 0 | **flag: experts milder** |
| compat.prey-shrimp | A03 A15 B11 | problems, caution, unworkable | caution, caution, caution | 1 | 2 | 0 | **flag: experts milder** |
| compat.prey-size | A08 A09 B02 | problems, too small, too small | caution, problems, problems | 0 | 1 | 0 | **flag: experts milder** |
| compat.prey-sw-inverts | C03 | too small | problems | 0 | 0 | 0 |  |
| compat.species-only | B13 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| compat.temper | B09 | too small | unworkable | 0 | 0 | 0 |  |
| compat.temper-vs-school | A02 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| compat.temperature-cool | D11 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| compat.temperature-narrow | A02 A06 B12 | problems, problems, caution | caution, ideal, problems | 0 | 2 | 1 |  |
| compat.temperature-none | B11 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| compat.temperature-warm | B06 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| compat.two-tangs | C07 | too small | unworkable | 0 | 0 | 0 |  |
| compat.water-chemistry | B09 | too small | unworkable | 0 | 0 | 0 |  |
| gap.toxins | D10 | too small | problems | 0 | 0 | 0 |  |
| golden.discus-85 | B05 | caution | caution | 1 | 0 | 0 |  |
| groups.chromis | C04 | too small | problems | 0 | 0 | 0 |  |
| groups.chromis-under-min | C07 | too small | unworkable | 0 | 0 | 0 |  |
| groups.clown-max-2 | C12 | problems | problems | 1 | 0 | 0 |  |
| groups.demasoni | B07 | too small | caution | 0 | 0 | 0 |  |
| groups.firefish-pair | C11 | problems | problems | 1 | 0 | 0 |  |
| groups.grazer-density | B15 | ideal | problems | 0 | 0 | 1 | **flag: experts harsher** |
| groups.males-rule | B12 | caution | problems | 0 | 0 | 1 | **flag: experts harsher** |
| groups.sae | A11 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| groups.sexed | A03 A16 | problems, problems | caution, caution | 0 | 2 | 0 | **flag: experts milder** |
| groups.syno | B08 | caution | caution | 1 | 0 | 0 |  |
| groups.territory-banggai | C10 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-bolivian | B14 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| groups.territory-gramma | C11 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-krib | B10 | too small | problems | 0 | 0 | 0 |  |
| groups.territory-puffer | B13 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| groups.yellowlab-min | B09 | too small | unworkable | 0 | 0 | 0 |  |
| herp.adf-min | D12 | problems | problems | 1 | 0 | 0 |  |
| herp.adf-with-betta | D12 | problems | problems | 1 | 0 | 0 |  |
| herp.anole-group | D15 | too small | problems | 0 | 0 | 0 |  |
| herp.arboreal-min | D03 | too small | unworkable | 0 | 0 | 0 |  |
| herp.axolotl-min | D13 | too small | unworkable | 0 | 0 | 0 |  |
| herp.axolotl-pair | D14 | too small | unworkable | 0 | 0 | 0 |  |
| herp.axolotl-with-fish | D14 | too small | unworkable | 0 | 0 | 0 |  |
| herp.cohab-sex-rule | D02 | too small | unworkable | 0 | 0 | 0 |  |
| herp.cross-species | D04 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.dartfrog-group | D07 | too small | problems | 0 | 0 | 0 |  |
| herp.each-extra | D02 D05 | too small, too small | unworkable, unworkable | 0 | 0 | 0 |  |
| herp.female-aggression | D07 | too small | problems | 0 | 0 | 0 |  |
| herp.floor-min-bp | D06 | too small | unworkable | 0 | 0 | 0 |  |
| herp.floor-min-leo | D01 | too small | unworkable | 0 | 0 | 0 |  |
| herp.height | D03 D09 | too small, too small | unworkable, caution | 0 | 0 | 0 |  |
| herp.height-bp | D06 | too small | unworkable | 0 | 0 | 0 |  |
| herp.mixed-pair | D05 | too small | unworkable | 0 | 0 | 0 |  |
| herp.newt-group | D11 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| herp.newt-with-shrimp | D11 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| herp.one-male | D15 | too small | problems | 0 | 0 | 0 |  |
| herp.prey-amphibian | D08 | too small | unworkable | 0 | 0 | 0 |  |
| herp.toad-group | D10 | too small | problems | 0 | 0 | 0 |  |
| herp.toad-with-fish | D10 | too small | problems | 0 | 0 | 0 |  |
| herp.treefrog-each-extra | D09 | too small | caution | 0 | 0 | 0 |  |
| limits.food-not-room | B15 C09 | ideal, too small | problems, unworkable | 0 | 0 | 1 | **flag: experts harsher** |
| space.big-class | B02 | too small | problems | 0 | 0 | 0 |  |
| space.big-class-mass | B04 | caution | problems | 0 | 0 | 1 | **flag: experts harsher** |
| space.canonical-20 | A04 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.chili-refit | A15 | caution | caution | 1 | 0 | 0 |  |
| space.community-29 | A06 | problems | ideal | 0 | 1 | 0 | **flag: experts milder** |
| space.coolwater | A12 | caution | caution | 1 | 0 | 0 |  |
| space.discus-community | B06 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.floor | A04 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.footprint-vs-height | A05 | too small | caution | 0 | 0 | 0 |  |
| space.full-community | A10 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.invert-class | A15 B16 | caution, unworkable | caution, caution | 1 | 1 | 0 | **flag: experts milder** |
| space.kuhli-floor-factor | A11 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.livebearer-nano | A03 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.livebearers | A16 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.malawi-mix | B08 | caution | caution | 1 | 0 | 0 |  |
| space.mbuna-convention | B07 | too small | caution | 0 | 0 | 0 |  |
| space.mid-class | A11 | unworkable | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.nano | A01 A02 | caution, problems | ideal, caution | 0 | 2 | 0 | **flag: experts milder** |
| space.nano-reef | C02 | too small | problems | 0 | 0 | 0 |  |
| space.reef-125 | C08 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.reef-40 | C04 | too small | problems | 0 | 0 | 0 |  |
| space.salt-load | C01 | too small | problems | 0 | 0 | 0 |  |
| space.salt-scale | C05 C08 | too small, unworkable | problems, unworkable | 1 | 0 | 0 |  |
| space.school-curve | A10 A13 | unworkable, problems | caution, problems | 1 | 1 | 0 | **flag: experts milder** |
| space.swordtail-refit | A16 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.tiny-class | A14 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| space.water | A04 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.water-small | A13 | problems | problems | 1 | 0 | 0 |  |
| tankmin.angel-height | A08 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| tankmin.betta | A01 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| tankmin.bluetang | C07 | too small | unworkable | 0 | 0 | 0 |  |
| tankmin.clownloach | B02 | too small | problems | 0 | 0 | 0 |  |
| tankmin.coralbeauty | C04 | too small | problems | 0 | 0 | 0 |  |
| tankmin.coralbeauty-width | C05 | too small | problems | 0 | 0 | 0 |  |
| tankmin.demasoni-width | B07 | too small | caution | 0 | 0 | 0 |  |
| tankmin.goldfish | B03 | too small | unworkable | 0 | 0 | 0 |  |
| tankmin.mandarin | C09 | too small | unworkable | 0 | 0 | 0 |  |
| tankmin.ocellaris | C01 | too small | problems | 0 | 0 | 0 |  |
| tankmin.oscar | B01 | too small | unworkable | 0 | 0 | 0 |  |
| tankmin.royalgramma | C02 | too small | problems | 0 | 0 | 0 |  |
| tankmin.sixline | C03 | too small | problems | 0 | 0 | 0 |  |
| tankmin.tarantula-row | D16 | ideal | caution | 0 | 0 | 1 | **flag: experts harsher** |
| tankmin.yellowlab | B09 | too small | unworkable | 0 | 0 | 0 |  |
| tankmin.yellowtang | C06 | caution | unworkable | 0 | 0 | 1 | **flag: experts harsher** |

### Agreement by family (rows the app, columns the experts' median, tanks)

**compat** (23 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 1 | 2 | 2 | 0 |
| problems | 1 | 4 | 0 | 0 |
| unworkable | 0 | 5 | 1 | 0 |

**golden** (1 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 1 | 0 | 0 |
| problems | 0 | 0 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 0 |

**groups** (16 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 1 | 0 |
| caution | 0 | 1 | 1 | 0 |
| problems | 0 | 3 | 3 | 0 |
| unworkable | 0 | 2 | 0 | 0 |

**herp** (15 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 0 | 0 | 0 |
| problems | 0 | 0 | 1 | 0 |
| unworkable | 0 | 1 | 0 | 1 |

**limits** (2 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 1 | 0 |
| caution | 0 | 0 | 0 | 0 |
| problems | 0 | 0 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 0 |

**space** (24 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 2 | 3 | 1 | 0 |
| problems | 1 | 4 | 1 | 0 |
| unworkable | 0 | 4 | 0 | 1 |

**tankmin** (16 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 1 | 0 | 0 |
| caution | 1 | 0 | 0 | 1 |
| problems | 0 | 1 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 0 |


## Too small (the app's own verdict)

A species under its red-line tank minimum, or a herp under its bare floor or height. Read against the experts' first change ("Bigger tank") and "big enough" answers; their 4-step verdict is shown beside it. Flagged: fewer than half the experts who answered ask for a bigger tank.

| tank | app's lines | the rest, on 4 steps | experts' verdict | experts: bigger tank / not big enough | |
|---|---|---|---|---|---|
| A05 | tankmin red: bronzecory | problems (space 119 %) | caution | not asked |  |
| A09 | tankmin red: angel | unworkable (temperature none) | problems | 0 of 1 | **flag: experts accept the tank** |
| B01 | tankmin red: oscar | ideal | unworkable | 1 of 1 |  |
| B02 | tankmin red: oscar | problems (space 107 %) | problems | 1 of 1 |  |
| B03 | tankmin red: goldfish | problems (space 103 %; group too small: goldfish) | unworkable | 1 of 1 |  |
| B07 | tankmin red: demasoni | caution (space 85 %; temperature narrow) | caution | 0 of 1 | **flag: experts accept the tank** |
| B09 | tankmin red: yellowlab | unworkable (compat high) | unworkable | 0 of 1 | **flag: experts accept the tank** |
| B10 | tankmin red: kribensis | caution (space 78 %; compat concern; temperature narrow) | problems | 0 of 1 | **flag: experts accept the tank** |
| C01 | tankmin red: ocellaris | caution (space 82 %) | problems | 1 of 1 |  |
| C02 | tankmin red: royalgramma; tankmin red: firefish; tankmin red: ocellaris | caution (space 99 %; temperature narrow) | problems | 1 of 1 |  |
| C03 | tankmin red: sixline; tankmin red: ocellaris; tankmin red: watchman | unworkable (compat high) | problems | 0 of 1 | **flag: experts accept the tank** |
| C04 | tankmin red: coralbeauty | problems (space 126 %) | problems | 1 of 1 |  |
| C05 | tankmin red: coralbeauty | problems (space 122 %) | problems | not asked |  |
| C07 | tankmin red: bluetang | unworkable (compat high) | unworkable | 1 of 1 |  |
| C09 | tankmin red: mandarin; tankmin red: ocellaris | ideal | unworkable | 0 of 1 | **flag: experts accept the tank** |
| D01 | herp: Leopard gecko: floor 1 | ideal | unworkable | 1 of 1 |  |
| D02 | herp: Leopard gecko: floor 4 | ideal | unworkable | 0 of 1 | **flag: experts accept the tank** |
| D03 | herp: Crested gecko: floor 1 sq ft (0; herp: Crested gecko: enclosure 18 in tall | ideal | unworkable | 1 of 1 |  |
| D05 | herp: Crested gecko: floor 2 | ideal | unworkable | 0 of 1 | **flag: experts accept the tank** |
| D06 | herp: Ball python: enclosure 16 in tall | caution (herp floor under recommended: Ball python) | unworkable | 1 of 1 |  |
| D07 | herp: Dyeing dart frog: floor 2 | problems (herp: Dyeing dart frog: 2 females) | problems | 0 of 1 | **flag: experts accept the tank** |
| D08 | herp: White's tree frog: floor 2; herp: Dyeing dart frog: floor 2 | unworkable (herp: White's tree frog: not with Dyeing dart frog; herp: Dyeing dart frog: not with White's tree frog) | unworkable | 0 of 1 | **flag: experts accept the tank** |
| D09 | herp: White's tree frog: floor 2 | ideal | caution | 1 of 1 |  |
| D10 | herp: Fire-bellied toad: floor 2 | unworkable (herp: Fire-bellied toad: not with White cloud mountain minnow) | problems | 0 of 1 | **flag: experts accept the tank** |
| D13 | tankmin red: axolotl | ideal | unworkable | 1 of 1 |  |
| D14 | tankmin red: axolotl | unworkable (compat high; herp: Axolotl: not with White cloud mountain minnow) | unworkable | 1 of 1 |  |
| D15 | herp: Green anole: floor 2 | ideal | problems | 1 of 1 |  |
## Count fix per tank

Each count read on the dimension its species fills today (as calib-fit.mjs does). "fix" is the multiplier the engine's reading needs (below 0 % the engine reads the tank too full); "least" is the smallest move that makes the expert's count the engine's own nearest count, so a rounded small count is not a disagreement. A tank's fix pools its counted species and its second counted species (the bottom dweller of six tanks, the line below it, marked †). Fitted (calib-fit.mjs): the tanks with a space.* or golden.* tag.

| tank | counted | shown -> engine | ideal -> engine | limit -> engine | fix | least | fitted |
|---|---|---|---|---|---|---|---|
| A02 | neon (water) | 6 -> 68 % | - | - |  |  | yes |
| A03 | guppy (water) | 8 -> 131 % | 4 -> 73 % | 6 -> 102 % | 0 % | +0 % | yes |
| A04 | neon (water) | 10 -> 101 % | 10 -> 101 % | 15 -> 115 % | -12 % | -10 % | yes |
|  | bronzecory † (floor) | 6 -> 81 % | 6 -> 81 % | 8 -> 102 % |  |  |  |
| A05 | neon (water) | 10 -> 119 % | 10 -> 119 % | 12 -> 125 % | -24 % | -21 % | yes |
|  | bronzecory † (floor) | 6 -> 101 % | 6 -> 101 % | 7 -> 114 % |  |  |  |
| A06 | harlequin (water) | 12 -> 78 % | 12 -> 78 % | 18 -> 92 % | +2 % | +2 % | yes |
| A08 | rummynose (water) | 15 -> 122 % | 15 -> 122 % | 20 -> 128 % | -31 % | -30 % | no |
| A10 | neon (water) | 20 -> 118 % | 12 -> 110 % | 20 -> 118 % | -6 % | -7 % | yes |
|  | bronzecory † (floor) | 12 -> 87 % | 8 -> 63 % | 12 -> 87 % |  |  |  |
| A11 | boesemani (water) | 8 -> 113 % | 8 -> 113 % | 10 -> 119 % | -25 % | -24 % | yes |
|  | kuhli † (max) | 10 -> 113 % | 10 -> 113 % | 14 -> 119 % |  |  |  |
| A12 | danio (water) | 12 -> 99 % | 8 -> 79 % | 12 -> 99 % | -2 % | -1 % | yes |
| A13 | neon (water) | 20 -> 142 % | 8 -> 69 % | 10 -> 86 % | +12 % | +7 % | yes |
| A14 | ember (water) | 10 -> 85 % | 12 -> 88 % | 20 -> 101 % | -8 % | -7 % | yes |
| A15 | chili (water) | 12 -> 92 % | 15 -> 100 % | 20 -> 113 % | -18 % | -17 % | yes |
| A16 | platy (water) | 6 -> 102 % | 4 -> 97 % | 6 -> 102 % | +19 % | +17 % | yes |
|  | bronzecory † (floor) | 8 -> 47 % | 8 -> 47 % | 10 -> 59 % |  |  |  |
| B02 | clownloach (floor) | 5 -> 50 % | no-valid-count | no-valid-count |  |  | yes |
| B04 | goldfish (max) | 3 -> 82 % | 1 -> 34 % | 2 -> 58 % | +94 % | +56 % | yes |
| B05 | discus (water) | 6 -> 82 % | - | 6 -> 82 % | +22 % | +13 % | yes |
| B06 | discus (water) | 6 -> 102 % | 6 -> 102 % | 7 -> 110 % | +13 % | +13 % | yes |
|  | sterbai † (floor) | 8 -> 35 % | 10 -> 44 % | 16 -> 70 % |  |  |  |
| B07 | yellowlab (max) | 8 -> 85 % | - | 10 -> 93 % | +8 % | +6 % | yes |
| B08 | peacock (water) | 5 -> 95 % | 4 -> 91 % | 6 -> 99 % | -9 % | -8 % | yes |
| B15 | oto (max) | 8 -> 72 % | - | - |  |  | no |
| B16 | cherryshrimp (max) | 30 -> 104 % | 40 -> 114 % | 80 -> 149 % | -34 % | -33 % | yes |
| C03 | hermit (max) | 10 -> 118 % | no-valid-count | no-valid-count |  |  | no |
| C04 | chromis (water) | 6 -> 126 % | no-valid-count | no-valid-count |  |  | yes |
| C05 | chromis (water) | 6 -> 122 % | 0 | 0 |  |  | yes |
| C08 | chromis (water) | 9 -> 91 % | no-valid-count | no-valid-count |  |  | yes |

### Count fix per tag

Flagged: the median least fix of the tag's count tanks more than 15 % off.

| tag | tanks | median fix | median least | |
|---|---|---|---|---|
| compat.betta-community | A14 | -8 % | -7 % |  |
| compat.breeding-pair-floor | A08 | -31 % | -30 % | **flag: engine reads too full** |
| compat.coolwater-mates | B04 | +94 % | +56 % | **flag: engine reads too empty** |
| compat.fish-in-shrimp-tank | B16 | -34 % | -33 % | **flag: engine reads too full** |
| compat.nip-no-target | A12 | -2 % | -1 % |  |
| compat.prey-shrimp | A03 A15 | -9 % | -9 % |  |
| compat.prey-size | A08 | -31 % | -30 % | **flag: engine reads too full** |
| compat.temperature-narrow | A06 | +2 % | +2 % |  |
| compat.temperature-warm | B06 | +13 % | +13 % |  |
| golden.discus-85 | B05 | +22 % | +13 % |  |
| groups.demasoni | B07 | +8 % | +6 % |  |
| groups.sae | A11 | -25 % | -24 % | **flag: engine reads too full** |
| groups.sexed | A03 A16 | +10 % | +8 % |  |
| groups.syno | B08 | -9 % | -8 % |  |
| space.big-class-mass | B04 | +94 % | +56 % | **flag: engine reads too empty** |
| space.canonical-20 | A04 | -12 % | -10 % |  |
| space.chili-refit | A15 | -18 % | -17 % | **flag: engine reads too full** |
| space.community-29 | A06 | +2 % | +2 % |  |
| space.coolwater | A12 | -2 % | -1 % |  |
| space.discus-community | B06 | +13 % | +13 % |  |
| space.floor | A04 | -12 % | -10 % |  |
| space.footprint-vs-height | A05 | -24 % | -21 % | **flag: engine reads too full** |
| space.full-community | A10 | -6 % | -7 % |  |
| space.invert-class | A15 B16 | -26 % | -25 % | **flag: engine reads too full** |
| space.kuhli-floor-factor | A11 | -25 % | -24 % | **flag: engine reads too full** |
| space.livebearer-nano | A03 | 0 % | +0 % |  |
| space.livebearers | A16 | +19 % | +17 % | **flag: engine reads too empty** |
| space.malawi-mix | B08 | -9 % | -8 % |  |
| space.mbuna-convention | B07 | +8 % | +6 % |  |
| space.mid-class | A11 | -25 % | -24 % | **flag: engine reads too full** |
| space.school-curve | A10 A13 | +3 % | 0 % |  |
| space.swordtail-refit | A16 | +19 % | +17 % | **flag: engine reads too empty** |
| space.tiny-class | A14 | -8 % | -7 % |  |
| space.water | A04 | -12 % | -10 % |  |
| space.water-small | A13 | +12 % | +7 % |  |
| tankmin.angel-height | A08 | -31 % | -30 % | **flag: engine reads too full** |
| tankmin.demasoni-width | B07 | +8 % | +6 % |  |

## The first thing to change, against the app

fewer X: the app's biggest contributor on its binding dimension, or a fighting warning on X; bigger: a tank-minimum or herp floor line; drop X: a compatibility, temperature or herp line naming X; ratio: a group band, sex mix or males line; nothing: the app's ideal. notroom (food, maturity, habitat) and other have no app part to hold against.

| tank | app's reading | experts | fits the app | |
|---|---|---|---|---|
| A01 | caution: tankmin yellow: betta | nothing | no | **flag** |
| A02 | problems: group too small: neon | fewer | no | **flag** |
| A03 | problems: space 131 %; group too small: cherryshrimp | fewer guppy | yes |  |
| A04 | problems: space 101 % | drop bristlenose | no | **flag** |
| A06 | problems: group too small: amano | nothing | no | **flag** |
| A07 | unworkable: compat high | drop betta | yes |  |
| A08 | problems: space 122 % | bigger | yes |  |
| A09 | too-small: tankmin red: angel | drop neon | yes |  |
| A10 | unworkable: temperature single | fewer neon | no | **flag** |
| A11 | unworkable: compat high; temperature single | bigger | no | **flag** |
| A12 | caution: space 99 %; tankmin yellow: danio; temperature narrow | bigger | yes |  |
| A13 | problems: space 142 % | bigger | yes |  |
| A14 | caution: space 85 %; tankmin yellow: kuhli; temperature narrow | nothing | no | **flag** |
| A15 | caution: space 92 %; temperature narrow | fewer honeygourami | no | **flag** |
| A16 | problems: space 102 % | bigger | yes |  |
| B01 | too-small: tankmin red: oscar | bigger | yes |  |
| B02 | too-small: tankmin red: oscar | bigger | yes |  |
| B03 | too-small: tankmin red: goldfish | bigger | yes |  |
| B04 | caution: space 82 %; temperature narrow | fewer goldfish | yes |  |
| B05 | caution: space 82 %; tankmin yellow: discus | bigger | yes |  |
| B06 | unworkable: temperature outside | other | not checked |  |
| B07 | too-small: tankmin red: demasoni | ratio | no | **flag** |
| B08 | caution: space 95 %; temperature narrow | bigger | no | **flag** |
| B09 | too-small: tankmin red: yellowlab | drop yellowlab | yes |  |
| B10 | too-small: tankmin red: kribensis | drop kribensis | yes |  |
| B11 | unworkable: compat high; temperature none | drop cherryshrimp | yes |  |
| B12 | caution: temperature narrow | fewer dwarfgourami | no | **flag** |
| B13 | unworkable: compat high | bigger | no | **flag** |
| B14 | problems: crowd: 4 Bolivian rams | fewer bolivianram | yes |  |
| B15 | ideal: - | notroom | not checked |  |
| B16 | unworkable: compat high | fewer nerite | no | **flag** |
| C01 | too-small: tankmin red: ocellaris | bigger | yes |  |
| C02 | too-small: tankmin red: royalgramma; tankmin red: firefish; tankmin red: ocellaris | bigger | yes |  |
| C03 | too-small: tankmin red: sixline; tankmin red: ocellaris; tankmin red: watchman | drop sixline | yes |  |
| C04 | too-small: tankmin red: coralbeauty | bigger | yes |  |
| C06 | caution: space 91 %; tankmin yellow: yellowtang; temperature narrow | bigger | yes |  |
| C07 | too-small: tankmin red: bluetang | bigger | yes |  |
| C08 | unworkable: compat high | drop bluetang | yes |  |
| C09 | too-small: tankmin red: mandarin; tankmin red: ocellaris | notroom | not checked |  |
| C10 | problems: crowd: 5 Banggai cardinalfish | fewer banggai | yes |  |
| C11 | problems: crowd: Royal gramma is best kept one to a tank | fewer royalgramma, firefish | yes |  |
| C12 | problems: crowd: 3 Ocellaris clownfish | fewer ocellaris | yes |  |
| D01 | too-small: herp: Leopard gecko: floor 1 | bigger | yes |  |
| D02 | too-small: herp: Leopard gecko: floor 4 | fewer leopardgecko | yes |  |
| D03 | too-small: herp: Crested gecko: floor 1 sq ft (0; herp: Crested gecko: enclosure 18 in tall | bigger | yes |  |
| D04 | unworkable: herp: Crested gecko: not with Green anole; herp: Green anole: not with Crested gecko (flame) | drop greenanole | yes |  |
| D05 | too-small: herp: Crested gecko: floor 2 | fewer crestedgecko | yes |  |
| D06 | too-small: herp: Ball python: enclosure 16 in tall | bigger | yes |  |
| D07 | too-small: herp: Dyeing dart frog: floor 2 | ratio | yes |  |
| D08 | too-small: herp: White's tree frog: floor 2; herp: Dyeing dart frog: floor 2 | drop treefrog | yes |  |
| D09 | too-small: herp: White's tree frog: floor 2 | bigger | yes |  |
| D10 | too-small: herp: Fire-bellied toad: floor 2 | drop whitecloud | yes |  |
| D11 | unworkable: temperature single | drop nerite | yes |  |
| D12 | problems: space 107 % | drop adf | yes |  |
| D13 | too-small: tankmin red: axolotl | bigger | yes |  |
| D14 | too-small: tankmin red: axolotl | bigger | yes |  |
| D15 | too-small: herp: Green anole: floor 2 | bigger | yes |  |
| D16 | ideal: - | bigger | no | **flag** |

## Keep together, and why, against compatRisks

The app's answer: no for a blocked pair, no shared temperature, or a herp that must not share; caution for a concern or a narrow shared temperature. Reasons in the survey's categories (eat = prey, nip, aggression = temper / territory / guard, chemistry, temperature, habitat = herp mates); "disease" has no rule (a gap, design section 6.4).

| tank | app | app's lines | experts | app reasons | expert reasons | |
|---|---|---|---|---|---|---|
| A02 | caution | Neon tetra with Nerite snail (zebra): water chemistry: prefers pH 5.0-7.0, it 7.0-8.5; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps (Nerite snail (zebra)); temperature narrow | caution | chemistry, temperature | - |  |
| A03 | caution | temperature narrow | caution | temperature | eat | **not in the app: eat** |
| A06 | caution | Harlequin rasbora with Nerite snail (zebra): water chemistry: prefers pH 5.0-7.0, it 7.0-8.5; both accept 7.0-7.5, a compromise; snail shells need calcium and buffering (KH): crushed coral or a mineral supplement helps (Nerite snail (zebra)); temperature narrow | yes | chemistry, temperature | - | **flag** |
| A07 | no | Tiger barb with Betta: would harass its long fins | no | nip | nip |  |
| A08 | caution | Angelfish breeding pair defends much of this floor (648 sq in): tankmates need caves and sight breaks elsewhere; temperature narrow | caution | aggression, temperature | aggression |  |
| A09 | no | Angelfish breeding pair defends much of this floor (624 sq in): tankmates need caves and sight breaks elsewhere; temperature none | no | aggression, temperature | eat | **not in the app: eat** |
| A14 | caution | temperature narrow | yes | temperature | - | **flag** |
| A15 | caution | temperature narrow | caution | temperature | breeding, eat | **not in the app: breeding, eat** |
| B02 | caution | temperature narrow | caution | temperature | aggression, other | **not in the app: aggression, other** |
| B04 | caution | temperature narrow | caution | temperature | eat, other | **not in the app: eat, other** |
| B06 | no | temperature narrow | caution | temperature | temperature | **flag** |
| B07 | caution | temperature narrow | caution | temperature | aggression | **not in the app: aggression** |
| B09 | no | Neon tetra with Yellow lab cichlid: water chemistry: pH 4.0-7.5 against its 7.6-8.6; temperature narrow | no | chemistry, temperature | aggression | **not in the app: aggression** |
| B10 | caution | Kribensis breeding pair defends much of this floor (360 sq in): tankmates need caves and sight breaks elsewhere; temperature narrow | no | aggression, temperature | aggression | **flag** |
| B11 | no | German blue ram with Cherry shrimp: would eat it; temperature none | caution | eat, temperature | eat, temperature | **flag** |
| B12 | caution | temperature narrow | no | temperature | aggression, nip | **flag** **not in the app: aggression, nip** |
| B13 | no | Pea puffer with Otocinclus: too aggressive for it; temperature narrow | caution | aggression, temperature | aggression, food, nip | **flag** **not in the app: food, nip** |
| C02 | caution | temperature narrow | caution | temperature | aggression, food | **not in the app: aggression, food** |
| C03 | no | Six-line wrasse with Blue-leg hermit crab: would eat it; temperature narrow | caution | eat, temperature | aggression, food | **flag** **not in the app: aggression, food** |
| C04 | caution | temperature narrow | caution | temperature | aggression, food | **not in the app: aggression, food** |
| C07 | no | Yellow tang with Blue tang: rivals of its look-alike, keep one tang; Blue tang with Yellow tang: rivals of its look-alike, keep one tang; temperature narrow | caution | aggression, temperature | aggression | **flag** |
| C11 | caution | temperature narrow | caution | temperature | aggression, breeding | **not in the app: aggression, breeding** |
| D02 | yes | - | no | - | - | **flag** |
| D04 | no | Crested gecko: not with Green anole; Green anole: not with Crested gecko (flame) | no | habitat | aggression, temperature | **not in the app: aggression, temperature** |
| D05 | yes | - | no | - | aggression, breeding | **flag** **not in the app: aggression, breeding** |
| D07 | yes | - | no | - | aggression | **flag** **not in the app: aggression** |
| D08 | no | White's tree frog: not with Dyeing dart frog; Dyeing dart frog: not with White's tree frog | no | habitat | eat, habitat, temperature | **not in the app: eat, temperature** |
| D10 | no | Fire-bellied toad: not with White cloud mountain minnow | caution | habitat | - | **flag** |
| D11 | no | temperature single | caution | temperature | eat, temperature | **flag** **not in the app: eat** |
| D12 | caution | temperature narrow | caution | temperature | nip | **not in the app: nip** |
| D14 | no | Axolotl with White cloud mountain minnow: would eat it; temperature narrow; Axolotl: not with White cloud mountain minnow | no | eat, habitat, temperature | eat |  |

## Big enough and smallest size, against tankmin red / green

The app's smallest is the first offered size it calls green (Recommended) for the species as stocked; "not big enough" is its red line at this tank (for a land animal, herpcheck's bare floor or height).

| tank | species | app at the four sizes | app smallest | experts smallest | app big enough | experts | |
|---|---|---|---|---|---|---|---|
| A01 | betta | red, yellow, green, green | 10 gal (20 x 10 x 12 in) | 5 gal (16 x 8 x 10 in) | yes | yes | **flag** |
| A08 | angel | red, yellow, red, green | 75 gal (48 x 18 x 21 in) | 55 gal (48 x 13 x 21 in) | yes | yes | **flag** |
| B01 | oscar | red, red, red, green | 180 gal (72 x 24 x 24 in) | 75 gal (48 x 18 x 21 in) | no | no | **flag** |
| B03 | goldfish | red, red, yellow, green | 40 gal breeder (36 x 18 x 16 in) | 29 gal (30 x 12 x 18 in) | no | no | **flag** |
| C01 | ocellaris | red, yellow, yellow, green | 29 gal (30 x 12 x 18 in) | 20 gal (24 x 12 x 16 in) | no | yes | **flag** **flag: big enough** |
| C02 | royalgramma | red, red, green, green | 40 gal breeder (36 x 18 x 16 in) | 40 gal breeder (36 x 18 x 16 in) | no | yes | **flag: big enough** |
| C06 | yellowtang | yellow, yellow, yellow, green | 125 gal (72 x 18 x 21 in) | 125 gal (72 x 18 x 21 in) | yes | no | **flag: big enough** |
| C07 | bluetang | red, yellow, yellow, green | 240 gal (96 x 24 x 24 in) | 240 gal (96 x 24 x 24 in) | no | no |  |
| D01 | leopardgecko | red, red, yellow, green | 4 x 2 x 2 ft (48 x 24 x 24 in) | 40 gal breeder (36 x 18 x 16 in) | no | no | **flag** |
| D03 | crestedgecko | , , ,  | larger | 18 x 18 x 36 in | no | no | **flag** |
| D06 | ballpython | red, red, green, green | 4 x 2 x 2 ft (48 x 24 x 24 in) | 4 x 2 x 2 ft (48 x 24 x 24 in) | no | no |  |
| D09 | treefrog | , , ,  | larger | 36 x 18 x 36 in | no | yes | **flag** **flag: big enough** |
| D13 | axolotl | red, red, yellow, green | 40 gal breeder (36 x 18 x 16 in) | 40 gal breeder (36 x 18 x 16 in) | no | no |  |
| D16 | chacogoldenknee | , , , green | 20 gal long (30 x 12 x 12 in) | 12 x 12 x 12 in | yes | yes | **flag** |

## The most of a species, against groups.ts and herpstock.ts

The app's figure for this tank (groups.ts territory or max, one for a solo species; herpstock max and the floor per extra animal), placed among the offered counts.

| tank | question | app figure | app option | experts | |
|---|---|---|---|---|---|
| B07 | max demasoni | no limit (no limit) | 16+ | 12 | **flag** |
| B10 | max kribensis | 2 (groups.ts territory) | 2 | 2 |  |
| B12 | maxMales dwarfgourami | 2 (groups.ts territory) | 2 | 1 | **flag** |
| B13 | max peapuffer | 2 (groups.ts territory) | 2 | 3 | **flag** |
| B14 | max bolivianram | 2 (groups.ts territory) | 2 | 4 | **flag** |
| C10 | max banggai | 2 (groups.ts territory) | 2 | 2 |  |
| C11 | max royalgramma | 1 (groups.ts territory) | 1 | 1 |  |
| C11 | max firefish | 2 (groups.ts max) | 2 | 1 | **flag** |
| C12 | max ocellaris | 2 (groups.ts max) | 2 | 2 |  |
| D02 | max leopardgecko (if they all turn out female) | 1 (herpstock max 2, floor fits 1 (4.5 + 3 sq ft each, 4.73 sq ft)) | 1 | 1 |  |
| D05 | max crestedgecko | 1 (herpstock max 3, floor fits 1 (2.25 + 2.25 sq ft each, 2.36 sq ft)) | 1 | 1 |  |
| D07 | max dartfrog | 1 (herpstock max 3, floor fits 1 (1.5 + 1 sq ft each, 2.36 sq ft)) | 1 | 2 | **flag** |
| D09 | max treefrog | 1 (herpstock max none, floor fits 1 (2.25 + 0.75 sq ft each, 2.36 sq ft)) | 1 | 2 | **flag** |
| D10 | max firetoad | 3 (herpstock max none, floor fits 3 (1.4 + 0.5 sq ft each, 2.63 sq ft)) | 3 | 4 | **flag** |
| D11 | max firenewt | 3 (herpstock max none, floor fits 3 (1.4 + 0.6 sq ft each, 2.63 sq ft)) | 3 | 4 | **flag** |
| D14 | max axolotl | 1 (herpstock max 3, floor fits 1 (2.5 + 1.25 sq ft each, 2.63 sq ft)) | 1 | 0 | **flag** |
| D15 | max greenanole | 2 (herpstock max 4, floor fits 2 (1.5 + 0.75 sq ft each, 2.36 sq ft)) | 2 | 2 |  |
| D15 | maxMales greenanole | 1 (herpstock max 4, floor fits 2 (1.5 + 0.75 sq ft each, 2.36 sq ft)) | 1 | 1 |  |

## About the answers

| expert | module | answered | skipped | open | set aside |
|---|---|---|---|---|---|
| chatgpt high 2 | A | 16 | 0 | 0 | 0 |
| chatgpt high 2 | B | 16 | 0 | 0 | 1 |
| chatgpt high 2 | C | 12 | 0 | 0 | 0 |
| chatgpt high 2 | D | 16 | 0 | 0 | 0 |

Confidence: low 1, medium 29, high 29. A module a keeper mostly skips is outside their domain; one an LLM skips is a prompt problem (design section 5).

## Each noted tank, read through its note

The expert's words, what the reader took from them, and every answer the note changed. Answers not listed were read as clicked, after reading the note. The tables above already use these readings.

**A01** (chatgpt high 2, high confidence): Optional note: Five gallons is a reasonable minimum for a single male betta, assuming adequate filtration, heating, and appropriate furnishings. The 16-inch horizontal length and shallow water column are favorable. A larger tank provides more room, but isn't necessary for acceptable long-term welfare. This matches the common 5-gallon minimum recommended by Aquarium Co-Op and the betta-keeping community.  Aquarium Co-Op +1 Calibration distinction: I interpret Ideal as a healthy, appropriate long-term setup—not necessarily the largest or most enriching possible enclosure. Under that definition, this qualifies.

- Read as: A 5 gal is an acceptable long-term minimum for one male betta; "ideal" read as healthy and appropriate, not the largest possible.
- Claim (tankmin.betta, firm): A 5 gal (16 x 8 in) is a reasonable minimum for one male betta; larger is not needed for acceptable long-term welfare. ("Five gallons is a reasonable minimum for a single male betta")

**A03** (chatgpt high 2, medium confidence): Optional note: Eight adult guppies, especially six large females, make this 20-inch tank crowded for active swimming. Four (1M/3F) would be comfortably stocked; six is a reasonable upper limit with good care. The shrimp and nerite add little spatial pressure. Adults are generally compatible, although guppies will prey on shrimplets. Mixed-sex guppies will also reproduce, requiring population control in practice. Water hardness should suit all three species. Calibration distinction: This is yellow, not red. The adult population can remain healthy under the stated assumptions, but eight guppies exceed what I'd consider comfortable stocking. Aquarium Co-Op also identifies six fancy guppies as a viable 10-gallon stocking option.

- Read as: Eight adult guppies crowd a 20 in tank; 4 comfortable, 6 the upper limit; guppies eat shrimplets, not adult shrimp; mixed sexes breed.
- Claim (compat.prey-shrimp, firm): Guppies eat shrimplets; adult cherry shrimp are generally safe with them. ("Adults are generally compatible, although guppies will prey on shrimplets")
- Claim (groups.sexed, firm): Mixed-sex guppies breed, so a mixed group needs population control. ("Mixed-sex guppies will also reproduce, requiring population control in practice")

**A04** (chatgpt high 2, medium confidence): Optional note: The neon school is appropriately sized, and six bronze corydoras form a suitable social group. The concern is the fully grown 5-inch bristlenose sharing a 30 × 12-inch footprint with six relatively large corydoras. This is near the lower acceptable enclosure size for the pleco, and territorial displacement may occur. The arrangement can work, but removing the pleco or upgrading to a larger tank would provide better long-term spatial margins. Hobbyist experiences with this combination vary substantially.  Reddit +2 Calibration distinction: Yellow, but closer to green than red. I wouldn't expect chronic problems in a well-managed aquarium with compatible individuals. The concern is limited bottom-area margin, not the number of neon tetras or overall filtration capacity.

- Read as: Neons and corys are fine; the concern is a 5 in bristlenose sharing a 30 x 12 floor with six corys: bottom margin, not neon count.
- Claim (space.floor): A grown bristlenose with six bronze corys is near the floor limit of a 30 x 12 in tank; the floor, not the neons, sets the margin. ("The concern is limited bottom-area margin, not the number of neon tetras")

**A05** (chatgpt high 2, medium confidence): Optional note: Compared with the 20-gallon long, this tank has 20% less floor area despite similar volume. Six adult bronze corydoras sharing a 24 × 12-inch bottom with a mature bristlenose pleco is the main concern. Ten neon tetras remain reasonable, but the shorter swimming length reduces their margin as well. The setup is workable with appropriate shelter and compatible individuals, although a 20-gallon long or larger would be preferable. Calibration distinction: Still yellow, but noticeably closer to red than the preceding 20-gallon long. The difference is driven primarily by reduced horizontal space and bottom-dweller crowding, not waste production. The numerical limits are approximate rather than sharp biological thresholds.

- Read as: The 20 high has 20 % less floor than the 20 long; bottom-dweller crowding makes it closer to red than A04.
- Claim (space.floor, firm): Same stock on less floor reads worse: the difference is horizontal space and bottom crowding, not volume. ("The difference is driven primarily by reduced horizontal space and bottom-dweller crowding")

**A06** (chatgpt high 2, high confidence): Optional note: Well-balanced community with appropriately sized schools, distinct habitat use, and no substantial spatial conflicts. Twelve harlequins provide a strong school without overwhelming the swimming area. Eight panda corydoras comfortably occupy the bottom, while the single dwarf gourami provides a centerpiece. Adult Amano shrimp and nerites are compatible. At 25°C, panda corydoras are at the upper end of their recommended temperature range; 24°C would provide slightly more margin. Individual dwarf gourami temperament remains a consideration.  Seriously Fish +2 Calibration distinction: Solid green. This is close to what I'd consider a well-stocked, attractive 29-gallon community aquarium. The 18-rasbora maximum is an approximate upper boundary, not the preferred stocking target.

- Read as: A well-balanced 29 community, solid green; pandas at the top of their temperature range; amanos and nerites compatible.
- Claim (compat.nerite-ph, firm): Nerites and amano shrimp are compatible with harlequins and pandas in this community. ("Adult Amano shrimp and nerites are compatible")
- Claim (compat.temperature-narrow): 25 C is the upper end for panda corys; 24 C gives more margin, but 25 C still works. ("panda corydoras are at the upper end of their recommended temperature range")

**A07** (chatgpt high 2, high confidence): Optional note: Tiger barbs are active, persistent fin nippers, making them poor companions for slower, long-finned male bettas. A group of eight reduces aggression among the barbs but does not reliably prevent harassment of the betta. The 29-gallon tank provides reasonable space for the tiger barbs themselves; the problem is behavioral incompatibility, not stocking density. Removing the betta would make this a substantially better arrangement.  Aquarium Co-Op Calibration distinction: This is a clear behavioral failure that additional filtration or water changes cannot resolve. I selected Problems likely rather than Not workable because individual fish may coexist temporarily, but I would not recommend the combination for long-term housing.

- Read as: Tiger barbs reliably harass a long-finned betta; a behavioural failure, problems rather than unworkable only because they may coexist for a while.
- Claim (compat.nip-vs-fins, firm): Tiger barbs are persistent fin nippers; a group of eight does not protect a male betta. ("A group of eight reduces aggression among the barbs but does not reliably prevent harassment of the betta")

**A08** (chatgpt high 2, medium confidence): Optional note: This is a fairly heavily occupied community, but the main limitation is the 16-inch tank height for fully grown angelfish. Adult angelfish can exceed 8 inches in total vertical height, and a 20-inch-tall aquarium is preferable. A bonded pair may also defend spawning territory aggressively. Two adult bristlenose plecos add potential territorial conflict at the bottom, although the 18-inch tank width helps. The rummy-nose and Sterba's corydoras groups are appropriately sized. A 55-gallon would address the height and swimming-length concerns, while a 75-gallon would be substantially more comfortable.  Seriously Fish +1 Calibration distinction: Upper yellow. This could remain functional long term, but it has limited behavioral and spatial margins. I would not classify it as red solely because of the number of fish.

- Read as: The limit is the 16 in height for adult angels (they want a 20 in tall tank); a bonded pair defends spawning sites; two plecos may squabble.
- Claim (tankmin.angel-height, firm): Adult angelfish need a tank about 20 in tall; 16 in is limiting. ("a 20-inch-tall aquarium is preferable")

**A09** (chatgpt high 2, high confidence): Optional note: The 55-gallon dimensions are appropriate for a bonded pair of adult angelfish, and eight bronze corydoras are a suitable bottom-dwelling group. The primary problem is predation: fully grown angelfish can swallow adult neon tetras. Some individuals coexist peacefully, particularly when raised together, but this is not a reliably safe long-term pairing. At 26°C, the water is also somewhat warm for neons. Replacing them with larger-bodied, peaceful schooling fish would substantially improve compatibility.  Aquario +2 Calibration distinction: Red despite having ample tank volume and otherwise modest stocking. This is a species-compatibility failure rather than an overcrowding problem. A larger aquarium would not reliably eliminate the predation risk.

- Read as: A 55 suits an adult angel pair; adult angels eat neons, so the pairing fails on predation, not room.
- Claim (compat.prey-size, firm): Adult angelfish can swallow adult neon tetras; not a reliably safe long-term pairing. ("fully grown angelfish can swallow adult neon tetras")
- Claim (tankmin.angel, firm): A standard 55 (48 x 13 x 21 in) is appropriate for a bonded adult angelfish pair. ("The 55-gallon dimensions are appropriate for a bonded pair of adult angelfish")

**A10** (chatgpt high 2, medium confidence): Optional note: Heavily stocked but generally compatible community. The 48-inch swimming length accommodates the three tetra schools, although 38 midwater tetras create substantial activity alongside two adult pearl gouramis. Twelve bronze corydoras plus a bristlenose also make for a busy 13-inch-wide bottom. The otocinclus are appropriately grouped. Reducing the neons to approximately 12 would improve swimming space without compromising schooling behavior. Pearl gourami territorial behavior during breeding is a secondary concern.  Seriously Fish Calibration distinction: Upper yellow, approaching the stocking limit I'd recommend for this community. No individual species is fundamentally unsuitable, and serious long-term problems aren't inevitable. The primary issue is cumulative crowding across several otherwise reasonable groups. The numerical limits are approximate judgments, not sharp biological thresholds.

- Read as: A heavily stocked but compatible 55; cumulative crowding, mostly the neons; reduce neons to about 12. No temperature concern raised.

**A11** (chatgpt high 2, medium confidence): Optional note: The rainbowfish group and sex ratio are appropriate, as are the cherry barb and kuhli loach groups. The main concern is four mature 6-inch Siamese algae eaters sharing a 48-inch tank with eight highly active rainbowfish. Siamese algae eaters are strong swimmers, can become competitive with maturity, and benefit from more horizontal space. A 60-inch or longer tank would be preferable. Water chemistry is another consideration: Boesemani rainbowfish favor harder, more alkaline water than kuhli loaches generally prefer.  Seriously Fish +2 Calibration distinction: Upper yellow. The aquarium has adequate overall volume, and the species are not inherently aggressive toward one another. However, adult swimming-space demands and differing water preferences prevent an Ideal rating. The suggested numerical limits assume the other populations remain unchanged; they do not resolve the Siamese algae eater concern.

- Read as: Four grown SAEs want more than 48 in alongside eight rainbows; boesemani vs kuhli water preference is a consideration, not a block.
- Claim (tankmin.sae): Adult Siamese algae eaters are strong swimmers that want a tank of 60 in or longer when kept as a group of four. ("A 60-inch or longer tank would be preferable")
- Claim (compat.water-chemistry, firm): Boesemani prefer harder, more alkaline water than kuhlis: a reason for caution, not for calling the tank unworkable. ("Boesemani rainbowfish favor harder, more alkaline water than kuhli loaches generally prefer")

**A12** (chatgpt high 2, medium confidence): Optional note: Both species are compatible at 20°C, and their social groups are appropriately sized. The concern is swimming space. Zebra danios are exceptionally active, and 12 adults sharing a 30-inch tank with eight similarly active minnows is crowded. A 36-inch or longer aquarium would be preferable. Reducing the danios to eight would help, but increasing swimming length is the better solution. Seriously Fish recommends a minimum 36 × 12-inch footprint for zebra danios.  Seriously Fish Calibration distinction: Yellow, primarily because of activity density rather than bioload or incompatibility. The existing 12 danios are at my approximate upper limit for this particular arrangement. The 8-fish ideal is a compromise within the existing footprint, not an assertion that eight danios in 30 inches is optimal.

- Read as: Twelve danios and eight minnows crowd a 30 in tank by activity; danios want a 36 x 12 footprint; the ideal of 8 is a compromise within this footprint.
- Claim (tankmin.danio, firm): Zebra danios want at least a 36 x 12 in footprint. ("Seriously Fish recommends a minimum 36 × 12-inch footprint for zebra danios")

**A13** (chatgpt high 2, medium confidence): Optional note: Twenty adult neon tetras are substantially overcrowded in a 20 × 10-inch footprint, even with excellent filtration and water quality. Their schooling and swimming behavior requires more horizontal space. Eight is a reasonable target for a species-only 10-gallon under more permissive husbandry guidance, with ten as my approximate upper limit. A 20-gallon long would be considerably better for a school of twenty. Calibration distinction: Red due to spatial crowding rather than bioload. The 10-gallon recommendation is somewhat contested: Aquarium Co-Op supports 6–8 neons in a 10-gallon, while Seriously Fish recommends a minimum 24 × 12-inch footprint.  Aquarium Co-Op +1  The numerical answers reflect the more permissive interpretation; I'd prefer the larger footprint for optimal welfare.

- Read as: Twenty neons in a 10 is red by space; the counts are the permissive reading (Aquarium Co-Op), the expert would prefer a 24 x 12 footprint.
- Claim (tankmin.neon): Neon tetra minimum is contested: 6-8 in a 10 gal (Aquarium Co-Op) against a 24 x 12 in footprint (Seriously Fish); the expert prefers the larger. ("The 10-gallon recommendation is somewhat contested")

**A14** (chatgpt high 2, medium confidence): Optional note: Well-balanced planted community with adequate schooling groups and complementary habitat use. Ten ember tetras are already a good group; twelve would be my preferred target, and approximately twenty is a reasonable upper limit with the other inhabitants unchanged. Pygmy corydoras occupy both the bottom and lower water column, while kuhli loaches primarily use the substrate and cover. The 26°C temperature is near the warm end for pygmy corydoras but acceptable. Betta temperament introduces some uncertainty, although the tank provides sufficient room for separation. Calibration distinction: Solid green. All four species have appropriate space, group sizes, and broadly compatible environmental requirements. The possibility of an unusually aggressive betta doesn't, by itself, justify downgrading an otherwise appropriate community to yellow.

- Read as: Solid green betta community; embers 12 ideal, about 20 at most; pygmies use the lower column, kuhlis the substrate; betta temperament alone is no downgrade.
- Claim (compat.betta-community, firm): A male betta with embers, pygmy corys and kuhlis is an appropriate community; an aggressive individual betta is not a reason to downgrade it. ("The possibility of an unusually aggressive betta doesn't, by itself, justify downgrading")

**A15** (chatgpt high 2, medium confidence): Optional note: The chili rasbora school is appropriately sized, and the overall stocking density is reasonable. The main uncertainty is the honey gourami trio: a breeding male can become territorial and harass females, even with a 1M/2F ratio. Keeping one honey gourami would be more predictable. Adult cherry shrimp can coexist, but juvenile shrimp are vulnerable to predation. The planted 30-inch tank provides useful separation, although individual temperament remains important.  Reddit +2 Calibration distinction: Lower yellow, close to green. This is not overcrowded, and all three species can coexist successfully. The caution reflects the possibility of breeding-related territorial behavior, rather than insufficient tank capacity.

- Read as: Space is fine; the caution is the honey gourami male harassing his own females, and shrimplets being eaten; one gourami is more predictable.
- reasons: restated ["aggression"] -> ["breeding","eat"]: the note names breeding-related behaviour within the gourami trio and shrimplet predation, not aggression between species ("a breeding male can become territorial and harass females")
- problem: restated ["honeygourami"] -> ["honeygourami","cherryshrimp"]: the note names the shrimp as the second party (shrimplets eaten) ("juvenile shrimp are vulnerable to predation")
- Claim (groups.sexed): A honey gourami trio (1M/2F) risks the breeding male harassing the females even at that ratio. ("a breeding male can become territorial and harass females, even with a 1M/2F ratio")

**A16** (chatgpt high 2, medium confidence): Optional note: Seventeen adult livebearers, including six large mollies and five swordtails, create substantial swimming-space competition in a 36-inch tank. Swordtails are the primary limitation; a 48-inch or longer aquarium would better accommodate their activity. The eight bronze corydoras are appropriately grouped, and the 18-inch tank depth provides adequate foraging space. The sex ratios are reasonable, and all species can coexist in sufficiently hard, alkaline freshwater, although bronze corydoras generally prefer less alkaline conditions than mollies.  Seriously Fish +1 Calibration distinction: Upper yellow, approaching red. The bottom population is reasonable; the primary problem is crowding among three relatively active livebearer species. Removing the swordtails would substantially improve this arrangement without requiring a larger tank.

- Read as: Seventeen adult livebearers crowd a 36 in tank; swordtails are the limit and want 48 in or more; the corys are fine.
- Claim (tankmin.swordtail, firm): Swordtails want a tank of 48 in or longer. ("a 48-inch or longer aquarium would better accommodate their activity")

**B01** (chatgpt high 2, high confidence): Optional note: A 12-inch Oscar in a tank only 13 inches front-to-back has severely restricted turning and maneuvering space. The 48-inch length is also limiting. A 75-gallon tank is a commonly accepted minimum for one adult, although 125 gallons or larger is preferable for comfortable long-term housing. Excellent filtration cannot compensate for inadequate physical dimensions.  Aquarium Co-Op +1 Calibration distinction: This crosses from Problems likely into Not workable because the enclosure's physical dimensions are fundamentally unsuitable for the adult fish. The 75-gallon recommendation is a lower acceptable boundary, not an optimal target.

- Read as: An adult oscar in a 13 in deep 55 is unworkable; 75 gal (48 x 18) is the lower bound, 125 preferable.
- Claim (tankmin.oscar, firm): A 75 gal (48 x 18 in) is the commonly accepted minimum for one adult oscar; 125 gal is preferable. ("A 75-gallon tank is a commonly accepted minimum for one adult")

**B02** (chatgpt high 2, high confidence): Optional note: The 72-inch length is good, but the 18-inch width becomes restrictive for five mature 9-inch clown loaches sharing space with a 12-inch Oscar. Clown loaches require groups of at least five, so reducing their number isn't a satisfactory solution. Seriously Fish recommends a minimum 72 × 24-inch footprint for a group. The Oscar and bristlenose introduce additional competition for space and potential behavioral conflicts. A 180-gallon (72 × 24 × 24-inch) or larger aquarium would be substantially more appropriate.  Seriously Fish Calibration distinction: Red primarily because of the combined spatial demands of large adult fish, not an inherent incompatibility between the species. The Oscar itself is appropriately housed in a 125-gallon tank. The clown loaches are the limiting factor, and reducing their group below five would create a separate welfare problem.

- Read as: Red from the space five grown clown loaches need beside an oscar on an 18 in wide floor; not an inherent incompatibility; the oscar alone is fine in a 125.
- Claim (tankmin.clownloach, firm): A group of clown loaches needs at least a 72 x 24 in footprint; groups under five are a welfare problem of their own. ("Seriously Fish recommends a minimum 72 × 24-inch footprint for a group")
- Claim (tankmin.oscar, firm): An oscar is appropriately housed in a 125 gal. ("The Oscar itself is appropriately housed in a 125-gallon tank")

**B03** (chatgpt high 2, high confidence): Optional note: An 8-inch adult fancy goldfish has inadequate swimming and turning space in a 20 × 10-inch footprint. Excellent filtration cannot resolve this physical limitation. A 29-gallon is my lower acceptable boundary for one adult, though the 40-gallon breeder is substantially preferable because of its 36 × 18-inch footprint. The 21°C temperature is appropriate. Minimum-size recommendations vary, with Aquarium Co-Op suggesting at least 20 gallons per fancy goldfish.  Aquarium Co-Op +1 Calibration distinction: Clear red, specifically Not workable. An adult fish occupying 40% of the tank's length has fundamentally inadequate room to maneuver. The issue persists regardless of water quality.

- Read as: An adult fancy goldfish in a 10 is unworkable; 29 gal is the lower bound for one, a 40 breeder better.
- Claim (tankmin.goldfish, firm): A 29 gal is the lower acceptable boundary for one adult fancy goldfish; a 40 breeder is substantially better. ("A 29-gallon is my lower acceptable boundary for one adult")

**B04** (chatgpt high 2, high confidence): Optional note: Three fully grown 8-inch fancy goldfish are too crowded for comfortable long-term housing in a 36 × 18-inch footprint. One would be comfortable; two are plausible but approaching the spatial limit. White cloud minnows share suitable temperature requirements at 21°C, but mature goldfish can swallow them. Fancy goldfish are slower than common goldfish, so coexistence is possible, but predation remains unpredictable.  Aquarium Co-Op +2 Calibration distinction: Red due to cumulative adult crowding and predation risk, not water quality. Reducing the goldfish population improves spatial conditions but doesn't eliminate the risk to the minnows.

- Read as: Three grown fancy goldfish crowd a 40 breeder (one comfortable, two near the limit); mature goldfish may swallow white clouds.
- Claim (compat.coolwater-mates): Mature fancy goldfish can swallow white cloud minnows; coexistence is possible but predation is unpredictable. ("mature goldfish can swallow them")

**B05** (chatgpt high 2, medium confidence): Six adult 15 cm discus represent a workable but cramped group in a standard 55-gallon aquarium. The 48-inch length and 21-inch height are adequate, but the 13-inch front-to-back dimension restricts maneuvering and avoidance between individuals. A 75-gallon (48 × 18-inch footprint) is substantially preferable. Reducing the school below 5–6 risks worsening social dynamics, so there is no count I would call truly ideal in this footprint. Six is approximately the upper workable limit under the stipulated excellent care. The 29°C temperature is appropriate.  Aquarium Co-Op +2 Calibration note: The ideal count of zero is deliberate. It means no socially appropriate group achieves my preferred comfort standard in this aquarium. The problem is better addressed by increasing tank width than reducing the school size.

- Read as: Six adult discus are workable but cramped in a 13 in deep 55; six is the upper limit; the ideal of 0 means no socially sound group is ideal here, not "no discus".
- ideal: restated 0 -> null: the 0 is not a room count: no group size reads ideal because groups under 5-6 fail socially; there is no ideal count to fit ("The ideal count of zero is deliberate. It means no socially appropriate group achieves my preferred comfort standard in this aquarium")
- Claim (tankmin.discus, firm): Discus want an 18 in deep tank; the 55 is cramped by its 13 in width, and width is the fix, not fewer fish. ("The problem is better addressed by increasing tank width than reducing the school size")
- Claim (groups.discus, firm): Discus groups under 5-6 worsen social dynamics. ("Reducing the school below 5–6 risks worsening social dynamics")

**B06** (chatgpt high 2, medium confidence): The 48 × 18-inch footprint is adequate for six adult discus, and the 15 cardinals and 8 Sterba's corydoras add relatively little spatial competition. This is a conventional, reasonable discus community rather than a significantly overstocked aquarium. My caution concerns the 29°C temperature: cardinals tolerate it, but it exceeds the commonly cited 24–28°C range for Sterba's corydoras. Lowering to approximately 28°C would provide a better compromise for all three species. At that temperature, I would classify the existing stocking as Ideal, albeit toward the upper end for discus.  The Fish Collection +2 Calibration distinction: The Caution verdict is driven by temperature, not physical stocking. Six discus represent a sensible adult group in this footprint; adding one is potentially workable, but eight would push beyond my preferred limit. The corydoras have more numerical expansion room than the discus.

- Read as: A conventional discus community; the only caution is 29 C for sterbai (24-28 C); at 28 C the expert would call it ideal. Counts are room counts at the stock shown.
- Claim (compat.temperature-warm, firm): 29 C is above sterbai's 24-28 C range; at about 28 C discus, cardinals and sterbai all fit and the tank is ideal. ("At that temperature, I would classify the existing stocking as Ideal")

**B07** (chatgpt high 2, medium confidence): The water conditions and species pairing are appropriate. Eight yellow labs at 2M:6F is reasonable, but eight demasoni at 2M:6F creates a significant aggression-management risk. Many keepers recommend groups of 12 or more demasoni to disperse aggression, although smaller groups can succeed. Increasing the demasoni group toward 12, maintaining a female majority, or choosing a less aggressive mbuna would improve the setup. The 13-inch tank depth restricts territorial separation. No yellow lab count makes the unchanged demasoni group confidently ideal. Calibration note This case exposes a limitation of conventional stocking calculations: adding demasoni can sometimes improve welfare despite increasing physical stocking density. Sources differ on the minimum group size. Practical Fishkeeping describes successful smaller groups, while other care references recommend 12 or more. That disagreement warrants a Caution verdict rather than automatically classifying eight demasoni as unworkable.  Practical Fishkeeping +2 The ideal yellow lab answer is intentionally No count works as described, because the uncertainty comes from the fixed demasoni group, not excessive yellow lab numbers.

- Read as: Labs fine; eight demasoni at 2M:6F are an aggression risk, groups of 12+ spread it; no lab count makes it ideal (ideal left blank on purpose); the 13 in depth limits territories.
- Claim (groups.demasoni): Demasoni are usually kept in groups of 12 or more to spread aggression; smaller groups sometimes succeed. ("Many keepers recommend groups of 12 or more demasoni to disperse aggression")
- Claim (space.mbuna-convention, firm): Adding mbuna can improve welfare despite higher density; plain stocking arithmetic misses this. ("adding demasoni can sometimes improve welfare despite increasing physical stocking density")

**B08** (chatgpt high 2, medium confidence): This is a plausible but fairly crowded Malawi community. The peacock and yellow lab sex ratios are favorable, and yellow labs are among the mbuna most likely to coexist successfully with peacocks. However, five adult peacocks, six yellow labs, and three 19 cm Synodontis put substantial demands on a 48 × 18-inch footprint. The catfish also require adequate bottom retreats. A 6-foot aquarium would provide meaningfully better territorial separation. Four peacocks (1M, 3F) would be my preferred count with the other animals unchanged; six is approximately the upper workable limit.  WetWebMedia +3 Calibration note: This is primarily a spatial and territorial Caution, not a water-chemistry issue. The yellow labs are relatively peaceful for mbuna, but they can still outcompete or harass peacocks. The three large Synodontis are an important contributor to the limited available space. I am assuming the listed Malawi synodontis are Synodontis njassae, consistent with the stated adult length.

- Read as: A plausible but crowded Malawi 75; three big synodontis take real space and need retreats; a 6 ft tank would separate territories. Assumes Synodontis njassae.
- Claim (space.malawi-mix): Three adult Malawi synodontis are an important share of the space in a 48 x 18 in Malawi tank and need bottom retreats. ("The three large Synodontis are an important contributor to the limited available space")

**B09** (chatgpt high 2, high confidence): Yellow labs are comparatively peaceful mbuna, but still require substantially more territorial space than a 30 × 12-inch aquarium provides. A 1M:1F pair also creates harassment risk, particularly for the female. Most established husbandry recommendations favor at least a 36–48-inch tank with one male and several females. Their preference for hard, alkaline Malawi water additionally conflicts with the softer-water preferences of neon tetras and bronze corydoras. The small, peaceful tankmates risk harassment or injury. Removing both yellow labs leaves a reasonable 29-gallon community.  Practical Fishkeeping +2 Calibration note: This is not a bioload problem. Even with ideal filtration and rockwork, the combination fails due to territorial behavior, social structure, and water chemistry. Increasing the tank size alone would not resolve every incompatibility.

- Read as: Yellow labs need far more territory than a 30 x 12 in tank; a pair is a harassment risk; hard-water needs conflict with neons and corys; remove the labs.
- Claim (tankmin.yellowlab, firm): Yellow labs want a 36-48 in tank, one male with several females. ("Most established husbandry recommendations favor at least a 36–48-inch tank with one male and several females")
- Claim (groups.yellowlab-min, firm): A 1M:1F yellow lab pair risks the male harassing the female. ("A 1M:1F pair also creates harassment risk, particularly for the female")

**B10** (chatgpt high 2, high confidence): A kribensis pair can inhabit a 20-gallon-long aquarium, but combining them with six bottom-foraging panda corydoras is risky. Kribensis become strongly territorial during spawning, and the corydoras will repeatedly enter defended areas while foraging. The 30 × 12-inch footprint offers insufficient separation to reliably protect them. The neon tetras are comparatively suitable tankmates because they occupy the water column. Temperature is acceptable for all three species. I would keep the kribensis pair without other bottom dwellers or remove the pair to retain the peaceful community.  Seriously Fish +2 Calibration note: The two kribensis aren't excessive by themselves. The problem is territorial overlap with the panda corydoras, especially during spawning. Since spawning behavior can occur even when offspring aren't counted, the compatibility risk remains.

- Read as: A krib pair can live in a 20 long, but not with six pandas foraging through its spawning territory on a 30 x 12 floor.
- Claim (compat.breeding-pair-floor, firm): A spawning krib pair and bottom-foraging corys on a 30 x 12 in floor do not separate reliably. ("The 30 × 12-inch footprint offers insufficient separation to reliably protect them")
- Claim (tankmin.kribensis, firm): A kribensis pair can live in a 20 gal long. ("A kribensis pair can inhabit a 20-gallon-long aquarium")

**B11** (chatgpt high 2, medium confidence): The 24 × 12-inch footprint is adequate for an established ram pair, and 10 ember tetras add little spatial pressure. The primary concern is the cherry shrimp. At 30 mm, healthy adults may survive alongside rams, especially with dense cover, but predation remains a significant risk, particularly during molting. The 28°C temperature is appropriate for rams and acceptable for ember tetras, but sits at the upper tolerance limit for cherry shrimp, potentially shortening their lifespan. Removing the shrimp would make this a comfortable, lightly stocked community.  Seriously Fish +3 Calibration note: Spatial stocking is firmly Ideal. Caution comes exclusively from shrimp predation risk and temperature suitability, not crowding. I would not classify this as Problems likely solely because the rams might eat shrimp, given that the survey explicitly specifies large adults and adequate cover.

- Read as: Space is ideal; caution from rams eating shrimp (adults may survive with cover) and 28 C at the top of shrimp tolerance; 28 C is fine for embers.
- Claim (compat.temperature-none, firm): 28 C is appropriate for German blue rams and acceptable for ember tetras. ("The 28°C temperature is appropriate for rams and acceptable for ember tetras")
- Claim (compat.prey-shrimp): Rams may eat adult cherry shrimp, especially when molting; with dense cover some survive: a caution, not a block. ("healthy adults may survive alongside rams, especially with dense cover")

**B12** (chatgpt high 2, high confidence): The tank is comfortably stocked in terms of physical space, but two male dwarf gouramis present a significant territorial aggression risk in a 30-inch aquarium. Dense planting and sight breaks help, but don't reliably prevent one male from dominating or injuring the other. A single male dwarf gourami alongside ten harlequin rasboras and six panda corydoras would make a reasonable community. The 25°C temperature is acceptable, although toward the warm end for panda corydoras.  Seriously Fish +1 Calibration note: Problems likely is driven entirely by male-male aggression, not stocking density. Two males can occasionally coexist, but the failure risk is sufficiently high that I wouldn't recommend this arrangement for long-term keeping.

- Read as: Two male dwarf gouramis in a 30 in tank fight; one male per tank; space is fine.
- Claim (groups.males-rule, firm): Keep one male dwarf gourami in a 29 gal; two males risk one dominating or injuring the other. ("two male dwarf gouramis present a significant territorial aggression risk in a 30-inch aquarium")

**B13** (chatgpt high 2, medium confidence): Three pea puffers at a 1M:2F ratio can be maintained in a densely planted 10-gallon aquarium, although this is a relatively tight arrangement. Otocinclus are among the more plausible pea puffer tankmates, but fin-nipping remains possible. The six otos also require dependable grazing and supplemental feeding. A 20-gallon long would provide more territorial separation and grazing surfaces. A species-only puffer aquarium would be more predictable.  Aquarium Co-Op +2 Calibration note: I wouldn't automatically classify this combination as unworkable. The favorable sex ratio and dense planting materially improve its prospects. However, three puffers represent my upper limit for this 10-gallon footprint, not an ideal social group size. Specialist guidance increasingly favors larger groups of six or more in larger aquariums.

- Read as: Three pea puffers (1M:2F) in a densely planted 10 is tight but workable; otos are among the more plausible tankmates; three is the upper limit.
- Claim (compat.species-only): Otocinclus are among the more plausible pea puffer tankmates in a dense planted tank; species-only is more predictable. ("Otocinclus are among the more plausible pea puffer tankmates")
- Claim (groups.territory-puffer, firm): Three pea puffers are the upper limit for a 10 gal footprint. ("three puffers represent my upper limit for this 10-gallon footprint")

**B14** (chatgpt high 2, medium confidence): The 36 × 18-inch footprint provides reasonable space for four Bolivian rams, but two males and two females may form two territorial breeding pairs. Eight Sterba's corydoras continually foraging across the substrate could intrude into those territories, particularly during spawning. Bolivian rams are relatively peaceful cichlids, so this is workable with good sight breaks, but a single established pair would be more predictable. The 12 rummy-nose tetras add little territorial pressure, and 25°C is suitable for all three species.  Aquarist Atlas +2 Calibration note: Four Bolivian rams is my upper workable count in this footprint, not an ideal target with other bottom dwellers present. This is a moderate Caution driven by territorial interactions, rather than excessive bioload or insufficient swimming volume.

- Read as: Four Bolivian rams (2M:2F) in a 40 breeder is the upper workable count; two pairs plus foraging sterbai risk territorial clashes; a single pair is more predictable.
- Claim (groups.territory-bolivian): Four Bolivian rams in a 36 x 18 in footprint is the upper workable count, not ideal with other bottom dwellers; one pair is more predictable. ("Four Bolivian rams is my upper workable count in this footprint")

**B15** (chatgpt high 2, high confidence): The tank has sufficient physical space for these animals, and the species are generally compatible. However, a six-week-old aquarium without visible algae is unlikely to have a sufficiently established grazing ecosystem for eight otocinclus, particularly alongside a bristlenose pleco and six Amano shrimp. Otocinclus are vulnerable to starvation in immature aquariums and may initially reject supplemental foods. I would postpone introducing them until the tank has matured and reliable feeding is established. Once mature, six to eight otos could be reasonable with deliberate supplemental feeding.  Aquarium Co-Op +1 Calibration note: This should trigger a food/maturity warning, not a spatial stocking penalty. Zero is a temporary recommendation based on the aquarium's immaturity, not an assertion that the tank can never support otocinclus. A lack of visible algae doesn't prove a lack of biofilm, but it's an important warning sign in such a young aquarium.

- Read as: Room is fine; a six-week tank with no visible algae cannot feed eight otos; postpone them; this is a food and maturity warning, not a space one.
- Claim (limits.food-not-room, firm): Otocinclus starve in an immature tank; a six-week-old tank with no visible algae should trigger a food and maturity warning, not a space penalty. ("This should trigger a food/maturity warning, not a spatial stocking penalty")

**B16** (chatgpt high 2, medium confidence): Optional note: Physical stocking is comfortable. Eight chili rasboras and 30 cherry shrimp are reasonable in a planted 10-gallon. The main concern is supporting three adult nerite snails with adequate grazing food. Reducing to one or two nerites would make the setup more robust. Cherry shrimp can tolerate relatively high densities with adequate supplemental feeding and surfaces. Calibration note: The caution is primarily a food-availability issue, not a spatial stocking issue. Increasing shrimp numbers should not automatically trigger spatial crowding warnings at the same rate as adding fish. The 40/80 thresholds are approximate and assume reliable supplemental feeding.

- Read as: Physical stocking is comfortable; the caution is food for three nerites; shrimp counts assume supplemental feeding; shrimp should not count against space at fish rates.
- Claim (space.invert-class, firm): Adding shrimp should not raise space warnings at the rate fish do; 40 ideal and 80 at most in a planted 10 with supplemental feeding. ("Increasing shrimp numbers should not automatically trigger spatial crowding warnings at the same rate as adding fish")
- Claim (limits.food-not-room, firm): Three nerites can run out of grazing in a 10 gal; one or two is more robust. ("The main concern is supporting three adult nerite snails with adequate grazing food")

**C01** (chatgpt high 2, medium confidence): Optional note: A single adult ocellaris can potentially be maintained in a well-designed 10-gallon aquarium, but two adults approaching 4 inches each make the 20 × 10-inch footprint uncomfortably restrictive. A bonded pair is less problematic than two unpaired fish, but still needs room for territorial behavior and movement. A 20-gallon is a defensible minimum for the pair; 29 gallons would be more comfortable. The hermit crabs are not a meaningful constraint.  coralifeproducts.com +2 Calibration note: This is a useful test of pair stocking versus individual minimum tank size. A 10-gallon can be marginally acceptable for one ocellaris without being acceptable for two. Pair bonding reduces aggression concerns but does not eliminate space requirements.

- Read as: One ocellaris can live in a 10 gal; a pair of adults needs a 20 gal at least, 29 more comfortable.
- Claim (tankmin.ocellaris, firm): A 10 gal is marginally acceptable for one ocellaris but not for a pair; a pair needs 20 gal. ("A 10-gallon can be marginally acceptable for one ocellaris without being acceptable for two")

**C02** (chatgpt high 2, medium confidence): Optional note: Four adult reef fish totaling approximately 15 inches in an 18-inch cube create significant territorial crowding. The bonded clownfish pair may defend a substantial portion of the aquarium, while the royal gramma and timid firefish need separate retreats. These species can coexist in a larger aquarium. Three adult Mexican turbo snails also represent considerable grazing demand for a small reef. A 40 breeder provides a substantially better footprint for this community.  LiveAquaria +2 Calibration note: This case is limited by the combination of territorial space and adult fish size, not filtration capacity. The 18 × 18-inch footprint is particularly important: 22 gallons in a cube does not provide the same territorial separation as a longer aquarium. The 40 breeder recommendation is for the entire community as stocked, not the royal gramma alone. The three large turbo snails warrant a separate food-availability caution, even after upgrading, unless supplemental feeding is reliable.  Reef2Reef +1

- Read as: Four adult reef fish crowd an 18 x 18 cube by territory; the 40 breeder is the size for this whole community, not for the gramma alone; three turbos strain the grazing.
- Claim (space.salt, firm): An 18 x 18 in cube gives less territorial separation than a longer tank of the same volume; footprint shape matters for reef fish. ("22 gallons in a cube does not provide the same territorial separation as a longer aquarium")
- Claim (limits.food-not-room, firm): Large turbo snails need their grazing checked separately in a small reef. ("The three large turbo snails warrant a separate food-availability caution")

**C03** (chatgpt high 2, medium confidence): Optional note: The 18 × 18-inch footprint is restrictive for four adult fish, particularly an active, potentially aggressive six-line wrasse sharing space with a territorial clownfish pair. Five large Mexican turbo snails also present substantial grazing demands. The ten blue-leg hermit crabs are not the primary problem, although competition for food and shells deserves attention.  LiveAquaria +1 Calibration note: This has the same 18 × 18-inch footprint as the previous 20-gallon cube. The additional water height does little to improve territorial separation or swimming room. Removing hermit crabs alone would not resolve the problems, so No count works as described is the appropriate survey response. For separate hermit-crab density calibration, I'd tentatively target 5–8 ideal, 15 at most in a comparable mature 29-gallon reef after correcting the fish and snail issues. Those are low-confidence estimates, not established biological limits.

- Read as: Four adult fish crowd an 18 x 18 cube; the sixline with a clown pair is the risk; five turbos strain the grazing; hermit counts cannot fix it. Gives a low-confidence hermit density for a corrected 29.
- Claim (space.invert-class): Blue-leg hermits: about 5-8 ideal and 15 at most in a mature 29 gal reef once the fish and snails are right (low confidence). ("I'd tentatively target 5–8 ideal, 15 at most in a comparable mature 29-gallon reef")
- Claim (gap.hermit-shells): Hermit crabs compete with snails for food and shells. ("competition for food and shells deserves attention")

**C04** (chatgpt high 2, medium confidence): Optional note: Six adult blue-green chromis require more open swimming space than this 36-inch aquarium provides, especially alongside five other adult fish. Chromis also develop dominance hierarchies that can lead to persistent harassment. The coral beauty is another major constraint: commonly recommended minimums are 50–70 gallons, and it may nip LPS and soft corals. Five large Mexican turbo snails create additional grazing competition.  The Ornamental Aquatic Trade Association +3 Calibration note: Even removing every chromis would leave the adult coral beauty in an undersized aquarium, so No count works as described is more appropriate than returning zero. This is an important distinction between an individual species' stocking capacity and the suitability of the fixed community. Also, reducing six chromis to two or three is not necessarily a safe compromise: smaller groups can concentrate aggression on subordinate individuals.  CORAL Magazine +1

- Read as: Six chromis plus five other fish crowd a 36 in tank; chromis hierarchies harass; the coral beauty needs 50-70 gal and may nip corals; no chromis count fixes it.
- Claim (tankmin.coralbeauty, firm): Coral beauty minimums are commonly 50-70 gal. ("commonly recommended minimums are 50–70 gallons")
- Claim (groups.chromis, firm): Cutting a chromis group to two or three can concentrate aggression on the weakest; small groups are not a safe compromise. ("reducing six chromis to two or three is not necessarily a safe compromise")
- Claim (compat.coral-nipper): A coral beauty may nip LPS and soft corals. ("it may nip LPS and soft corals")

**C05** (chatgpt high 2, medium confidence): Optional note: The 48-inch length is a meaningful improvement over the 40 breeder, making the coral beauty more defensible, although it remains borderline and potentially prone to coral nipping. However, six adult chromis alongside four other adult fish create a crowded community. Chromis are best maintained in groups of approximately five or more, but this aquarium has insufficient spare capacity for a comfortable group. Reducing them to two or three risks concentrating aggression among the remaining fish.  The Ornamental Aquatic Trade Association +2 Calibration note: Zero is intentional rather than selecting No count works as described. Without chromis, the remaining four fish are a defensible, though somewhat borderline, 55-gallon community. The problem is that a suitable chromis group would push this particular community beyond a comfortable stocking level, while smaller groups introduce social risks. The zero thresholds are husbandry judgments, not hard physical limits. A chromis group of five or six in a less heavily occupied 55-gallon aquarium would be a different assessment.

- Read as: The 55 makes the coral beauty borderline-defensible; six chromis crowd it; the expert meant 0 chromis (ideal and at most), not "no count works", though the export says no-valid-count.
- countStatus: restated "no-valid-count" -> null: the note says the answer is zero chromis, not "no count works"; the click says the other ("Zero is intentional rather than selecting No count works as described")
- ideal: restated null -> 0: zero chromis is the ideal count the note gives ("Without chromis, the remaining four fish are a defensible, though somewhat borderline, 55-gallon community")
- limit: restated null -> 0: the note gives zero for both thresholds ("The zero thresholds are husbandry judgments")
- Claim (tankmin.coralbeauty): A 48 in 55 gal makes a coral beauty borderline-defensible. ("making the coral beauty more defensible, although it remains borderline")

**C06** (chatgpt high 2, high confidence): Optional note: An adult 8-inch yellow tang is fundamentally unsuited to the 48 × 13-inch footprint, particularly alongside nine other fish. The narrow front-to-back dimension restricts turning and maneuvering, while the four-foot length provides inadequate sustained swimming space. A six-foot 125-gallon aquarium is a defensible minimum for this community, although larger would be preferable. Adult yellow tang recommendations vary from approximately 100 to 180 gallons, with Biota specifically recommending 125 gallons or more.  The Biota Group +2 Calibration note: This is a clear example of a species-specific minimum footprint overriding otherwise reasonable community stocking calculations. Even removing all six chromis would not make this aquarium appropriate for the adult tang. The restriction is primarily swimming geometry, not bioload.

- Read as: An adult yellow tang does not belong in a 48 x 13 in footprint; a 6 ft 125 is the minimum for this community; removing the chromis would not fix it.
- Claim (tankmin.yellowtang, firm): An adult yellow tang needs a 6 ft tank, about 125 gal; recommendations run 100-180 gal. ("A six-foot 125-gallon aquarium is a defensible minimum for this community")

**C07** (chatgpt high 2, high confidence): Optional note: An adult 12-inch blue tang requires substantially more swimming length than this 48-inch aquarium offers. A 180-gallon, six-foot aquarium is a commonly recommended minimum for the species alone. With an adult yellow tang and eight additional fish, I would prefer the eight-foot 240-gallon option. Yellow and blue tangs can coexist, but territorial conflicts remain possible. The chromis also introduce some within-group aggression risk.  LiveAquaria +2 Calibration note: This reinforces the distinction between current juvenile size and adult requirements. The blue tang should fail the 75-gallon assessment independently of total stocking density. The 240-gallon recommendation is specific to this entire community; an adult blue tang alone could reasonably be accommodated in a 180-gallon aquarium with suitable dimensions.

- Read as: An adult blue tang needs about 180 gal alone; with a yellow tang and eight more fish, 240 gal; tangs can coexist with territorial risk. Judged for the adult, as the card asks.
- Claim (tankmin.bluetang, firm): An adult blue tang needs about a 180 gal, 6 ft tank on its own. ("A 180-gallon, six-foot aquarium is a commonly recommended minimum for the species alone")
- Claim (compat.two-tangs): Yellow and blue tangs can coexist, with territorial conflict possible. ("Yellow and blue tangs can coexist, but territorial conflicts remain possible")

**C08** (chatgpt high 2, high confidence): Optional note: The principal issue is the adult 12.2-inch blue tang in a 72 × 18-inch aquarium, particularly alongside an 8-inch yellow tang. The six-foot length is an improvement over the previous scenarios, but the narrow footprint and extensive community make this unsuitable for comfortable long-term housing. A 180-gallon aquarium is a widely recommended minimum for adult blue tangs.  Quality Marine +1  Nine adult chromis add substantial swimming-space demand, while ten large Mexican turbo snails create significant grazing competition. The mature refugium makes the mandarin considerably more defensible. Calibration note: No count of chromis resolves the underlying adult blue tang constraint. This is why No count works as described is preferable to zero. Removing the blue tang would substantially change the assessment and make a moderate chromis group potentially reasonable. A separate concern is the ten turbo snails: food availability should be evaluated independently of fish stocking, since a mature 125-gallon reef may not sustain that many large grazers without supplemental feeding

- Read as: The adult blue tang in a 72 x 18 in tank is the problem; no chromis count fixes it; the refugium makes the mandarin defensible; ten turbos need food checked.
- Claim (limits.food-not-room, firm): A mature refugium makes a mandarin defensible; ten large turbos need their food checked apart from fish stocking. ("The mature refugium makes the mandarin considerably more defensible")

**C09** (chatgpt high 2, high confidence): Optional note: A three-month-old, 20-gallon aquarium without a refugium is unlikely to sustain the copepod population required by a typical mandarin dragonet. Chronic starvation is the primary concern, not swimming space or aggression. The clownfish pair is reasonably accommodated in this footprint, but the mandarin should be removed unless a reliable, independently verified feeding strategy is established. Captive-bred mandarins already eating prepared foods are an important exception, although even Biota recommends at least 30 gallons.  The Ornamental Aquatic Trade Association +2 Calibration note: This is a strong test of habitat and food suitability independent of spatial stocking. The engine should recognize the combination of small volume, immature aquarium, no refugium, and specialized feeding requirements as a severe husbandry problem. Captive-bred, prepared-food-trained mandarins should receive different treatment from specimens dependent on naturally reproducing copepods.

- Read as: A three-month 20 gal cube with no refugium cannot feed a mandarin; starvation, not room; captive-bred, prepared-food-trained mandarins are an exception, still 30 gal or more.
- Claim (limits.food-not-room, firm): Small, immature tanks without a refugium starve copepod-dependent mandarins; captive-bred fish trained on prepared food are the exception. ("Captive-bred, prepared-food-trained mandarins should receive different treatment from specimens dependent on naturally reproducing copepods")

**C10** (chatgpt high 2, high confidence): Optional note: Five juvenile Banggai cardinalfish may coexist temporarily, but as they mature, pair formation can trigger serious aggression toward other cardinals. In a 30-inch aquarium, subordinate individuals have little opportunity to escape. A single Banggai or a confirmed compatible pair is appropriate alongside the bonded clownfish pair. Two randomly selected adults are not necessarily compatible. NOAA's captive-breeding guidance specifically documents potentially fatal social stress when pairs form in groups.  NOAA Institutional Repository +1 Calibration note: Banggai cardinalfish should not be treated as conventional schooling fish. Their long-term stocking limits are governed primarily by pair formation and conspecific territorial aggression, not swimming-space demand. Five juveniles can be temporarily acceptable while five adults in the same tank are problematic, even without population growth.

- Read as: Banggai pairs turn on the other cardinals as they mature; five juveniles may coexist for a while, five adults do not; a single or a proven pair.
- Claim (groups.territory-banggai, firm): Keep one Banggai or a proven pair; pair formation in a group causes serious, sometimes fatal aggression. ("Their long-term stocking limits are governed primarily by pair formation and conspecific territorial aggression")

**C11** (chatgpt high 2, high confidence): Optional note: Both royal grammas and firefish are generally peaceful toward other species but can be strongly territorial toward their own kind. Two separately purchased royal grammas may fight over caves, while two unpaired firefish can harass one another, sometimes severely. Confirmed compatible pairs are exceptions. A single royal gramma, single firefish, and bonded clownfish pair would make a comfortable community in this 36-inch aquarium.  LiveAquaria +3 Calibration note: This is primarily an intraspecific aggression problem, not spatial overstocking. The engine should distinguish established pairs from two independently acquired individuals. Both species can be housed singly without compromising their welfare, so reducing each to one is an appropriate solution rather than requiring a larger tank.

- Read as: Royal grammas and firefish fight their own kind; one each (or proven pairs) with the clown pair is comfortable in a 40 breeder.
- Claim (groups.territory-gramma, firm): Two royal grammas or two unpaired firefish bought separately fight; proven pairs are the exception. ("The engine should distinguish established pairs from two independently acquired individuals")

**C12** (chatgpt high 2, high confidence): Optional note: Three juvenile ocellaris may initially coexist, but as they mature, a dominant female and breeding male typically establish themselves. The third fish risks persistent harassment, exclusion from feeding, and potentially death. A bonded pair is appropriate for this 24 × 12-inch aquarium. Larger clownfish social groups can sometimes work, but they require substantially more favorable conditions and are not reliably sustainable here.  Practical Fishkeeping +1 Calibration note: This is a social-structure limitation rather than a simple stocking-density problem. The engine should strongly discourage three adult clownfish in a small aquarium, even if they were introduced simultaneously as juveniles. Two is a meaningful social threshold; adding a third can substantially increase aggression rather than merely increasing stocking pressure by 50%.

- Read as: Three ocellaris become a pair plus an outcast as they mature; two in this tank.
- Claim (groups.clown-max-2, firm): Three clownfish in a small tank become a pair and a harassed third, even if bought together as juveniles. ("The engine should strongly discourage three adult clownfish in a small aquarium")

**D01** (chatgpt high 2, high confidence): Optional note: A 20 × 10-inch footprint is substantially too small for a 10-inch adult leopard gecko. It restricts exercise, exploration, and establishing meaningful thermal zones. A 36 × 18-inch footprint is a reasonable modern minimum, providing 3.24 times the floor area. A 4 × 2-foot enclosure would be preferable, but isn't necessary for an acceptable long-term setup.  Leopard Gecko Care Sheet +1 Calibration note: Leopard geckos should be evaluated primarily on usable floor area rather than enclosure volume. A 10-gallon enclosure fails even for a single adult, regardless of otherwise excellent husbandry. A 20-long represents an improvement but remains below the preferred modern minimum.

- Read as: A 10 gal is far too small for an adult leopard gecko; 36 x 18 in is a reasonable minimum; judge by floor area.
- Claim (herp.floor-min-leo, firm): An adult leopard gecko needs at least a 36 x 18 in floor; a 10 gal fails. ("A 36 × 18-inch footprint is a reasonable modern minimum")

**D02** (chatgpt high 2, high confidence): Optional note: Leopard geckos are best housed individually. Two males risk serious fighting; a male-female combination introduces persistent mating pressure; and even two females can compete for territory and resources or injure one another. Successful female cohabitation is possible, but not reliably safe, especially in a 36 × 18-inch enclosure. The RSPCA recommends solitary housing, and ReptiFiles discourages cohabitation even among females.  RSPCA +1 Calibration note: The 40 breeder is appropriate for one adult leopard gecko, but not a recommended permanent enclosure for two. The all-female maximum of 1 reflects responsible long-term husbandry rather than an absolute biological limit. Sexing the animals does not fully resolve the cohabitation risk.

- Read as: Leopard geckos are best kept alone, females included; a 40 breeder suits one adult, not two. Judged for adults, as the survey asks.
- Claim (herp.cohab-sex-rule, firm): Leopard geckos are best housed singly; two females are not reliably safe either. ("Leopard geckos are best housed individually")

**D03** (chatgpt high 2, high confidence): Optional note: A 12 × 12 × 18-inch enclosure is appropriate for a growing juvenile but substantially undersized for a 9-inch adult. Crested geckos are arboreal and need both vertical climbing room and horizontal space for jumping and exploration. An 18 × 18 × 24-inch enclosure is accepted as a minimum by some husbandry authorities, but the more generous 18 × 18 × 36-inch size matches current ReptiFiles guidance and is my preferred long-term standard.  ReptiFiles +1 Calibration note: Arboreal enclosure suitability should account for height, horizontal dimensions, and usable climbing volume. A 12 × 12 × 18-inch enclosure fails for an adult, while 18 × 18 × 24 inches represents a defensible lower boundary and 18 × 18 × 36 inches a stronger ideal-minimum target.

- Read as: An 18 in tall cube is for a juvenile crested gecko; an adult needs 18 x 18 x 24 at least, 18 x 18 x 36 preferred.
- Claim (herp.arboreal-min, firm): An adult crested gecko needs at least 18 x 18 x 24 in; 18 x 18 x 36 in is the stronger target. ("18 × 18 × 24 inches represents a defensible lower boundary and 18 × 18 × 36 inches a stronger ideal-minimum target")

**D04** (chatgpt high 2, high confidence): Optional note: These species have different thermal requirements. Green anoles require a daytime basking area around 85–95°F, whereas crested geckos are vulnerable to prolonged high temperatures, particularly above 85°F. Both are arboreal and would compete for limited climbing and retreat space in this enclosure. The territorial male anole presents an additional harassment risk. Separate housing is strongly recommended.  ReptiFiles +2 Calibration note: This should trigger a severe interspecies compatibility failure independently of enclosure capacity. Both animals could potentially be maintained individually in an 18 × 18 × 24-inch enclosure under some husbandry standards, although larger enclosures are preferable. Increasing the enclosure size alone would not reliably resolve the thermal and behavioral incompatibilities.

- Read as: Crested gecko and green anole fail on temperature (anole basks 85-95 F, the gecko suffers above 85 F) and on competition; a bigger enclosure does not fix it.
- Claim (herp.cross-species, firm): Crested geckos and green anoles need incompatible temperatures and compete for climbing space. ("Increasing the enclosure size alone would not reliably resolve the thermal and behavioral incompatibilities")

**D05** (chatgpt high 2, high confidence): Optional note: Permanent male-female cohabitation is not recommended, particularly in an 18 × 18 × 24-inch enclosure. The male will likely attempt repeated mating, potentially causing female stress, injuries, and repeated egg production. Even though offspring aren't counted, reproductive behavior remains a significant concern. Some breeders successfully house compatible pairs temporarily, but that is different from recommended permanent housing. The RSPCA specifically advises against permanently keeping males with other crested geckos.  RSPCA +2 Calibration note: This is primarily a reproductive and social compatibility failure rather than ordinary spatial overcrowding. Even a larger enclosure would not make permanent male-female cohabitation ideal. A single adult is the appropriate long-term stocking target, preferably in an enclosure at least 18 × 18 × 36 inches.

- Read as: A male and female crested gecko should not live together permanently: mating stress and repeated eggs.
- Claim (herp.mixed-pair, firm): Permanent male-female crested gecko cohabitation is not recommended at any enclosure size. ("Permanent male-female cohabitation is not recommended")

**D06** (chatgpt high 2, high confidence): Optional note: A 36 × 18 × 16-inch enclosure is too restrictive for a 4.5-foot adult female ball python. The 36-inch length prevents her from fully extending along the enclosure, while the limited footprint and height constrain exploration, thermoregulation, and climbing opportunities. A 4 × 2 × 2-foot enclosure is a commonly accepted modern minimum, although a 6 × 2 × 2-foot enclosure would better accommodate this particular snake's length.  ReptiFiles +2 Calibration note: Snake enclosure requirements should scale with individual adult length rather than relying exclusively on species-wide minimums. The 4 × 2 × 2-foot option represents a defensible practical minimum, but a stricter full-body-length criterion would favor the 6-foot enclosure for this 4.5-foot female. Both approaches clearly reject the 40 breeder for permanent housing.

- Read as: A 4.5 ft ball python cannot stretch out in a 36 in enclosure; 4 x 2 x 2 ft is the practical minimum, 6 x 2 x 2 ft better for this length.
- Claim (herp.floor-min-bp, firm): Snake enclosures should scale with the individual snake's length; 4 x 2 x 2 ft is a practical minimum for an adult ball python. ("Snake enclosure requirements should scale with individual adult length rather than relying exclusively on species-wide minimums")

**D07** (chatgpt high 2, high confidence): Optional note: Dendrobates tinctorius females can be highly territorial toward one another, particularly when competing for access to a male. In an 18 × 18-inch footprint, two adult females present a substantial risk of fighting, chronic stress, and exclusion from feeding. A compatible male-female pair is the more reliable arrangement. Groups with multiple males and one female can sometimes succeed, but require careful management.  PMC +2 Calibration note: This is primarily a sex-ratio and territoriality constraint rather than physical crowding. The enclosure has reasonable space for two adults, but introducing a second female substantially increases conflict risk. TankLook should distinguish a 1M/2F trio from a compatible 1M/1F pair rather than treating both as simple stocking-density increments.

- Read as: Two female D. tinctorius fight over the male; a pair is the reliable arrangement; space is fine for two.
- Claim (herp.female-aggression, firm): A 1M/2F tinctorius trio risks female fighting; a pair is reliable; the app should tell the trio from a pair. ("should distinguish a 1M/2F trio from a compatible 1M/1F pair")

**D08** (chatgpt high 2, high confidence): Optional note: Adult White's tree frogs are large, opportunistic predators capable of consuming smaller amphibians, making the 1.8-inch dart frogs potential prey. The species also have different preferred environmental conditions: White's tree frogs benefit from warmer basking areas and periodic drying, whereas dyeing dart frogs require consistently humid conditions and generally cooler temperatures. Their preferred ranges overlap somewhat, but this does not resolve the predation risk.  Litoria caerulea +2 Calibration note: This is a clear interspecies predation failure, not a spatial stocking problem. Even a much larger enclosure would not make this combination reliably safe. TankLook should flag large, opportunistic amphibians housed with sufficiently small frogs, regardless of whether the species normally occupy different vertical zones.

- Read as: Adult White's tree frogs eat small frogs; dart frogs are prey; a bigger enclosure does not help.
- Claim (herp.prey-amphibian, firm): Large opportunistic frogs eat small frogs whatever zone each uses. ("TankLook should flag large, opportunistic amphibians housed with sufficiently small frogs")

**D09** (chatgpt high 2, medium confidence): Optional note: White's tree frogs tolerate group housing well, so aggression is not the primary concern. However, three large, 5-inch adults in an 18 × 18 × 24-inch enclosure have limited climbing and perching space. Long-term success is possible with well-distributed sturdy branches and resting sites, but I would prefer a larger enclosure. A 36 × 18 × 36-inch terrarium offers comfortable room for three adults. Published recommendations vary, with some permitting three in this enclosure and others recommending substantially larger group housing.  The Bio Dude +2 Calibration note: This is a useful distinction between acceptable and ideal group density. Three White's tree frogs are socially compatible, and the current enclosure is not automatically dangerous, but it is more crowded than desirable. Two adults represent my comfortable upper target for this footprint; three warrant caution rather than an automatic severe failure.

- Read as: Three adult White's tree frogs are socially fine but cramped in 18 x 18 x 24; two is comfortable; caution, not failure.
- Claim (herp.treefrog-each-extra): Three adult White's tree frogs in 18 x 18 x 24 in is crowded but not a failure; two is a comfortable upper target. ("Two adults represent my comfortable upper target for this footprint")

**D10** (chatgpt high 2, low confidence): The four fire-bellied toads are reasonably accommodated, but the shallow aquatic section is unsuitable for six adult white cloud mountain minnows. Its exact volume and swimming footprint are unknown, although the 4-inch depth imposes a substantial limitation. Removing the minnows would be my first change. Calibration implication: TankLook shouldn't infer an exact aquatic footprint from a qualitative description like "half land, half water." It can establish an upper bound from known dimensions, but should otherwise acknowledge uncertainty rather than inventing geometry.

- Read as: Four toads are fine; the 4 in deep water is no place for six white clouds; remove the minnows first. Low confidence: the water area is not described exactly.
- change: restated null -> "drop": the note gives the first change; the export has none ("Removing the minnows would be my first change")
- changeSp: restated null -> ["whitecloud"]: the species the note would drop ("Removing the minnows would be my first change")
- Claim (gap.paludarium-water): A paludarium's water section should be judged on its own area and depth; 4 in deep is too shallow for six white clouds. ("the 4-inch depth imposes a substantial limitation")

**D11** (chatgpt high 2, medium confidence): Optional note: Four adult Chinese fire-bellied newts are reasonably accommodated by the 30 × 12-inch footprint, although the 8-inch water depth provides only approximately 12.5 gallons before displacement. The 18°C temperature is excellent for the newts and tolerable for cherry shrimp. Some shrimp may be eaten, but coexistence is possible with sufficient cover. Nerite snails are the least suitable inhabitants because 18°C is at the lower edge of their reported tolerance and below their usual preferred range.  Hypselotriton orientalis (Captive Bred) +3 Calibration note: This is a borderline compatibility case rather than severe overcrowding. Four newts represent a defensible upper stocking target for this shallow setup, while shrimp predation and suboptimal nerite temperature warrant separate cautions. Neither should automatically produce a severe spatial stocking penalty.

- Read as: Four newts fit; 18 C suits newts, is tolerable for shrimp and too cold for nerites; some shrimp get eaten; borderline, not severe.
- Claim (compat.temperature-cool, firm): 18 C is below nerites' usual range; newts and cherry shrimp manage it. ("Nerite snails are the least suitable inhabitants because 18°C is at the lower edge of their reported tolerance")
- Claim (herp.newt-with-shrimp): Fire-bellied newts eat some shrimp; with cover they can coexist. ("Some shrimp may be eaten, but coexistence is possible with sufficient cover")

**D12** (chatgpt high 2, medium confidence): Optional note: Three African dwarf frogs and a male betta are too much for this 16 × 8-inch footprint. The frogs are social and benefit from groups, but their poor eyesight and slow feeding create risks when housed with a betta, which may monopolize food or harass them. Accidental fin biting is also possible. Compatibility varies with individual temperament, and successful mixed housing does occur, but a 5-gallon aquarium leaves little margin for conflict.  Reddit +2 Calibration note: The maximum of zero frogs applies specifically to this aquarium with the betta remaining. A species-only 5-gallon aquarium containing two or three African dwarf frogs is substantially more defensible. The limitation here is cumulative spatial pressure and interspecies feeding/behavioral risks, not an absolute incompatibility between the species.

- Read as: Three ADFs and a betta are too much for a 5 gal; the max of 0 frogs is with the betta kept; frogs alone, two or three would be defensible.
- max.adf: aside ("0" not read): the 0 answers a different question (frogs with the betta kept) from the most frogs this tank holds; the note puts frogs-only at two or three ("The maximum of zero frogs applies specifically to this aquarium with the betta remaining")
- Claim (herp.adf-min): Two or three African dwarf frogs alone in a 5 gal is defensible. ("A species-only 5-gallon aquarium containing two or three African dwarf frogs is substantially more defensible")
- Claim (herp.adf-with-betta): A betta outcompetes ADFs for food and may harass them; risky in a small tank, not an absolute incompatibility. ("not an absolute incompatibility between the species")

**D13** (chatgpt high 2, high confidence): Optional note: The 17°C water temperature is excellent, but the 20 × 10-inch footprint is unsuitable for an adult axolotl approaching 12 inches long. It severely restricts turning, walking, and exploration. A 29-gallon aquarium is considered an acceptable minimum by some keepers, but its 12-inch width remains restrictive. I would choose a 40 breeder for comfortable permanent housing, providing substantially more usable floor area.  Reddit +2 Calibration note: This is a clear floor-space failure, independent of filtration or water quality. A 29-gallon aquarium is a defensible borderline minimum, while the 40 breeder is a stronger target for comfortable adult housing. TankLook should place greater weight on footprint, particularly front-to-back width, than water volume for axolotls.

- Read as: An adult axolotl in a 10 gal fails on floor; 29 gal borderline; a 40 breeder for comfort; weight width over volume.
- Claim (herp.axolotl-min, firm): An adult axolotl needs a 40 breeder for comfort; a 29 gal is borderline; front-to-back width matters more than volume. ("TankLook should place greater weight on footprint, particularly front-to-back width, than water volume for axolotls")

**D14** (chatgpt high 2, high confidence): Optional note: Two 12-inch adult axolotls are severely cramped in a 30 × 12-inch footprint. Even one adult would be inadequately accommodated under our established standards. The 17°C temperature suits both species, but white cloud minnows may be eaten by the axolotls or occasionally nip their exposed gills. A larger, preferably 48 × 24-inch enclosure would be much more appropriate for two similarly sized axolotls, with the minnows housed separately.  MyAxolotl +1 Calibration note: Zero is appropriate because the enclosure is too small for even one adult axolotl, regardless of the minnows. The mixed-species predation risk is an independent compatibility concern. Increasing enclosure size resolves the spatial limitation but does not eliminate the risks of housing minnows with axolotls.

- Read as: A 20 long is too small for even one adult axolotl (so 0); minnows may be eaten or nip gills, which a bigger tank does not fix.
- Claim (herp.axolotl-with-fish, firm): Axolotls may eat white clouds, and the minnows may nip their gills. ("white cloud minnows may be eaten by the axolotls or occasionally nip their exposed gills")

**D15** (chatgpt high 2, medium confidence): Optional note: The 1M/3F ratio is sensible for group housing, but four adult green anoles are crowded in an 18 × 18 × 24-inch terrarium. Competition for basking positions, visual territories, and escape routes can cause chronic stress. One male with three females can succeed in larger, densely planted enclosures, but the available space here is restrictive. Two compatible adults are more defensible, although solitary housing is the safer standard. Husbandry recommendations vary considerably on communal housing.  ReptiFiles +2 Calibration note: Green anoles are not strictly incompatible with conspecifics, but territorial pressure increases with density. A single male is the appropriate maximum regardless of total group size. The 1M/3F ratio reduces male-male aggression but does not eliminate competition or reproductive harassment. TankLook should treat two compatible animals as potentially workable with caution, while four in this footprint cross into likely long-term problems.

- Read as: One male anole at most; four adults crowd 18 x 18 x 24; two compatible adults are more defensible; solitary safest.
- Claim (herp.one-male, firm): One male green anole per enclosure, whatever the group size. ("A single male is the appropriate maximum regardless of total group size")
- Claim (herp.anole-group): Four adult anoles in 18 x 18 x 24 in is likely trouble; two compatible adults are workable with caution. ("four in this footprint cross into likely long-term problems")

**D16** (chatgpt high 2, medium confidence): Optional note: A 12 × 12-inch footprint provides twice the spider's 6-inch leg span in each direction. This is at the lower end of commonly accepted terrestrial tarantula housing recommendations, but remains workable. An 18 × 18 × 12-inch enclosure would offer more comfortable floor space. Deep substrate is particularly important to minimize dangerous falling distances for this heavy-bodied terrestrial species.  nwzoo.com +1 Calibration note: Tarantula enclosure sizing should primarily use diagonal leg span, not body length. For terrestrial species, approximately 2× leg span in horizontal dimensions is a defensible lower boundary, while 3× provides more comfortable room. Excessive unobstructed vertical height can actually increase injury risk, so larger enclosure volume is not automatically better.

- Read as: A 12 x 12 in floor is about 2x the leg span: the lower end, workable; 18 x 18 better; size tarantulas by leg span, not volume; height is a fall risk.
- Claim (herp.tarantula-min, firm): Size terrestrial tarantula enclosures by diagonal leg span: about 2x the span is a lower bound, 3x comfortable; extra height adds fall risk. ("For terrestrial species, approximately 2× leg span in horizontal dimensions is a defensible lower boundary")


## What the notes claim, by rule

Raised: two or more experts make the claim, or one keeper or professional makes it firmly with high confidence. A raised rule is a proposal whether or not a tag above was flagged; a single claim is kept for round B.

**compat.betta-community** (chatgpt high 2)

- A14, chatgpt high 2 on betta, ember, pygmycory, kuhli: A male betta with embers, pygmy corys and kuhlis is an appropriate community; an aggressive individual betta is not a reason to downgrade it. ("The possibility of an unusually aggressive betta doesn't, by itself, justify downgrading")

**compat.breeding-pair-floor** (chatgpt high 2)

- B10, chatgpt high 2 on kribensis, pandacory: A spawning krib pair and bottom-foraging corys on a 30 x 12 in floor do not separate reliably. ("The 30 × 12-inch footprint offers insufficient separation to reliably protect them")

**compat.coolwater-mates** (chatgpt high 2)

- B04, chatgpt high 2 on goldfish, whitecloud: Mature fancy goldfish can swallow white cloud minnows; coexistence is possible but predation is unpredictable. ("mature goldfish can swallow them")

**compat.coral-nipper** (chatgpt high 2)

- C04, chatgpt high 2 on coralbeauty: A coral beauty may nip LPS and soft corals. ("it may nip LPS and soft corals")

**compat.nerite-ph** (chatgpt high 2)

- A06, chatgpt high 2 on nerite, amano, harlequin, pandacory: Nerites and amano shrimp are compatible with harlequins and pandas in this community. ("Adult Amano shrimp and nerites are compatible")

**compat.nip-vs-fins** (chatgpt high 2)

- A07, chatgpt high 2 on tigerbarb, betta: Tiger barbs are persistent fin nippers; a group of eight does not protect a male betta. ("A group of eight reduces aggression among the barbs but does not reliably prevent harassment of the betta")

**compat.prey-shrimp** (chatgpt high 2)

- A03, chatgpt high 2 on guppy, cherryshrimp: Guppies eat shrimplets; adult cherry shrimp are generally safe with them. ("Adults are generally compatible, although guppies will prey on shrimplets")
- B11, chatgpt high 2 on gbr, cherryshrimp: Rams may eat adult cherry shrimp, especially when molting; with dense cover some survive: a caution, not a block. ("healthy adults may survive alongside rams, especially with dense cover")

**compat.prey-size** (chatgpt high 2)

- A09, chatgpt high 2 on angel, neon: Adult angelfish can swallow adult neon tetras; not a reliably safe long-term pairing. ("fully grown angelfish can swallow adult neon tetras")

**compat.species-only** (chatgpt high 2)

- B13, chatgpt high 2 on peapuffer, oto: Otocinclus are among the more plausible pea puffer tankmates in a dense planted tank; species-only is more predictable. ("Otocinclus are among the more plausible pea puffer tankmates")

**compat.temperature-cool** (chatgpt high 2)

- D11, chatgpt high 2 on nerite, firenewt: 18 C is below nerites' usual range; newts and cherry shrimp manage it. ("Nerite snails are the least suitable inhabitants because 18°C is at the lower edge of their reported tolerance")

**compat.temperature-narrow** (chatgpt high 2)

- A06, chatgpt high 2 on pandacory: 25 C is the upper end for panda corys; 24 C gives more margin, but 25 C still works. ("panda corydoras are at the upper end of their recommended temperature range")

**compat.temperature-none** (chatgpt high 2)

- B11, chatgpt high 2 on gbr, ember: 28 C is appropriate for German blue rams and acceptable for ember tetras. ("The 28°C temperature is appropriate for rams and acceptable for ember tetras")

**compat.temperature-warm** (chatgpt high 2)

- B06, chatgpt high 2 on sterbai, cardinal, discus: 29 C is above sterbai's 24-28 C range; at about 28 C discus, cardinals and sterbai all fit and the tank is ideal. ("At that temperature, I would classify the existing stocking as Ideal")

**compat.two-tangs** (chatgpt high 2)

- C07, chatgpt high 2 on yellowtang, bluetang: Yellow and blue tangs can coexist, with territorial conflict possible. ("Yellow and blue tangs can coexist, but territorial conflicts remain possible")

**compat.water-chemistry** (chatgpt high 2)

- A11, chatgpt high 2 on boesemani, kuhli: Boesemani prefer harder, more alkaline water than kuhlis: a reason for caution, not for calling the tank unworkable. ("Boesemani rainbowfish favor harder, more alkaline water than kuhli loaches generally prefer")

**gap.hermit-shells** (chatgpt high 2)

- C03, chatgpt high 2 on hermit, turbo: Hermit crabs compete with snails for food and shells. ("competition for food and shells deserves attention")

**gap.paludarium-water** (chatgpt high 2)

- D10, chatgpt high 2 on whitecloud: A paludarium's water section should be judged on its own area and depth; 4 in deep is too shallow for six white clouds. ("the 4-inch depth imposes a substantial limitation")

**groups.chromis** (chatgpt high 2)

- C04, chatgpt high 2 on chromis: Cutting a chromis group to two or three can concentrate aggression on the weakest; small groups are not a safe compromise. ("reducing six chromis to two or three is not necessarily a safe compromise")

**groups.clown-max-2** (chatgpt high 2)

- C12, chatgpt high 2 on ocellaris: Three clownfish in a small tank become a pair and a harassed third, even if bought together as juveniles. ("The engine should strongly discourage three adult clownfish in a small aquarium")

**groups.demasoni** (chatgpt high 2)

- B07, chatgpt high 2 on demasoni: Demasoni are usually kept in groups of 12 or more to spread aggression; smaller groups sometimes succeed. ("Many keepers recommend groups of 12 or more demasoni to disperse aggression")

**groups.discus** (chatgpt high 2)

- B05, chatgpt high 2 on discus: Discus groups under 5-6 worsen social dynamics. ("Reducing the school below 5–6 risks worsening social dynamics")

**groups.males-rule** (chatgpt high 2)

- B12, chatgpt high 2 on dwarfgourami: Keep one male dwarf gourami in a 29 gal; two males risk one dominating or injuring the other. ("two male dwarf gouramis present a significant territorial aggression risk in a 30-inch aquarium")

**groups.sexed** (chatgpt high 2)

- A03, chatgpt high 2 on guppy: Mixed-sex guppies breed, so a mixed group needs population control. ("Mixed-sex guppies will also reproduce, requiring population control in practice")
- A15, chatgpt high 2 on honeygourami: A honey gourami trio (1M/2F) risks the breeding male harassing the females even at that ratio. ("a breeding male can become territorial and harass females, even with a 1M/2F ratio")

**groups.territory-banggai** (chatgpt high 2)

- C10, chatgpt high 2 on banggai: Keep one Banggai or a proven pair; pair formation in a group causes serious, sometimes fatal aggression. ("Their long-term stocking limits are governed primarily by pair formation and conspecific territorial aggression")

**groups.territory-bolivian** (chatgpt high 2)

- B14, chatgpt high 2 on bolivianram: Four Bolivian rams in a 36 x 18 in footprint is the upper workable count, not ideal with other bottom dwellers; one pair is more predictable. ("Four Bolivian rams is my upper workable count in this footprint")

**groups.territory-gramma** (chatgpt high 2)

- C11, chatgpt high 2 on royalgramma, firefish: Two royal grammas or two unpaired firefish bought separately fight; proven pairs are the exception. ("The engine should distinguish established pairs from two independently acquired individuals")

**groups.territory-puffer** (chatgpt high 2)

- B13, chatgpt high 2 on peapuffer: Three pea puffers are the upper limit for a 10 gal footprint. ("three puffers represent my upper limit for this 10-gallon footprint")

**groups.yellowlab-min** (chatgpt high 2)

- B09, chatgpt high 2 on yellowlab: A 1M:1F yellow lab pair risks the male harassing the female. ("A 1M:1F pair also creates harassment risk, particularly for the female")

**herp.adf-min** (chatgpt high 2)

- D12, chatgpt high 2 on adf: Two or three African dwarf frogs alone in a 5 gal is defensible. ("A species-only 5-gallon aquarium containing two or three African dwarf frogs is substantially more defensible")

**herp.adf-with-betta** (chatgpt high 2)

- D12, chatgpt high 2 on adf, betta: A betta outcompetes ADFs for food and may harass them; risky in a small tank, not an absolute incompatibility. ("not an absolute incompatibility between the species")

**herp.anole-group** (chatgpt high 2)

- D15, chatgpt high 2 on greenanole: Four adult anoles in 18 x 18 x 24 in is likely trouble; two compatible adults are workable with caution. ("four in this footprint cross into likely long-term problems")

**herp.arboreal-min** (chatgpt high 2)

- D03, chatgpt high 2 on crestedgecko: An adult crested gecko needs at least 18 x 18 x 24 in; 18 x 18 x 36 in is the stronger target. ("18 × 18 × 24 inches represents a defensible lower boundary and 18 × 18 × 36 inches a stronger ideal-minimum target")

**herp.axolotl-min** (chatgpt high 2)

- D13, chatgpt high 2 on axolotl: An adult axolotl needs a 40 breeder for comfort; a 29 gal is borderline; front-to-back width matters more than volume. ("TankLook should place greater weight on footprint, particularly front-to-back width, than water volume for axolotls")

**herp.axolotl-with-fish** (chatgpt high 2)

- D14, chatgpt high 2 on axolotl, whitecloud: Axolotls may eat white clouds, and the minnows may nip their gills. ("white cloud minnows may be eaten by the axolotls or occasionally nip their exposed gills")

**herp.cohab-sex-rule** (chatgpt high 2)

- D02, chatgpt high 2 on leopardgecko: Leopard geckos are best housed singly; two females are not reliably safe either. ("Leopard geckos are best housed individually")

**herp.cross-species** (chatgpt high 2)

- D04, chatgpt high 2 on crestedgecko, greenanole: Crested geckos and green anoles need incompatible temperatures and compete for climbing space. ("Increasing the enclosure size alone would not reliably resolve the thermal and behavioral incompatibilities")

**herp.female-aggression** (chatgpt high 2)

- D07, chatgpt high 2 on dartfrog: A 1M/2F tinctorius trio risks female fighting; a pair is reliable; the app should tell the trio from a pair. ("should distinguish a 1M/2F trio from a compatible 1M/1F pair")

**herp.floor-min-bp** (chatgpt high 2)

- D06, chatgpt high 2 on ballpython: Snake enclosures should scale with the individual snake's length; 4 x 2 x 2 ft is a practical minimum for an adult ball python. ("Snake enclosure requirements should scale with individual adult length rather than relying exclusively on species-wide minimums")

**herp.floor-min-leo** (chatgpt high 2)

- D01, chatgpt high 2 on leopardgecko: An adult leopard gecko needs at least a 36 x 18 in floor; a 10 gal fails. ("A 36 × 18-inch footprint is a reasonable modern minimum")

**herp.mixed-pair** (chatgpt high 2)

- D05, chatgpt high 2 on crestedgecko: Permanent male-female crested gecko cohabitation is not recommended at any enclosure size. ("Permanent male-female cohabitation is not recommended")

**herp.newt-with-shrimp** (chatgpt high 2)

- D11, chatgpt high 2 on firenewt, cherryshrimp: Fire-bellied newts eat some shrimp; with cover they can coexist. ("Some shrimp may be eaten, but coexistence is possible with sufficient cover")

**herp.one-male** (chatgpt high 2)

- D15, chatgpt high 2 on greenanole: One male green anole per enclosure, whatever the group size. ("A single male is the appropriate maximum regardless of total group size")

**herp.prey-amphibian** (chatgpt high 2)

- D08, chatgpt high 2 on treefrog, dartfrog: Large opportunistic frogs eat small frogs whatever zone each uses. ("TankLook should flag large, opportunistic amphibians housed with sufficiently small frogs")

**herp.tarantula-min** (chatgpt high 2)

- D16, chatgpt high 2 on chacogoldenknee: Size terrestrial tarantula enclosures by diagonal leg span: about 2x the span is a lower bound, 3x comfortable; extra height adds fall risk. ("For terrestrial species, approximately 2× leg span in horizontal dimensions is a defensible lower boundary")

**herp.treefrog-each-extra** (chatgpt high 2)

- D09, chatgpt high 2 on treefrog: Three adult White's tree frogs in 18 x 18 x 24 in is crowded but not a failure; two is a comfortable upper target. ("Two adults represent my comfortable upper target for this footprint")

**limits.food-not-room** (chatgpt high 2)

- B15, chatgpt high 2 on oto, bristlenose, amano: Otocinclus starve in an immature tank; a six-week-old tank with no visible algae should trigger a food and maturity warning, not a space penalty. ("This should trigger a food/maturity warning, not a spatial stocking penalty")
- B16, chatgpt high 2 on nerite: Three nerites can run out of grazing in a 10 gal; one or two is more robust. ("The main concern is supporting three adult nerite snails with adequate grazing food")
- C02, chatgpt high 2 on turbo: Large turbo snails need their grazing checked separately in a small reef. ("The three large turbo snails warrant a separate food-availability caution")
- C08, chatgpt high 2 on mandarin, turbo: A mature refugium makes a mandarin defensible; ten large turbos need their food checked apart from fish stocking. ("The mature refugium makes the mandarin considerably more defensible")
- C09, chatgpt high 2 on mandarin: Small, immature tanks without a refugium starve copepod-dependent mandarins; captive-bred fish trained on prepared food are the exception. ("Captive-bred, prepared-food-trained mandarins should receive different treatment from specimens dependent on naturally reproducing copepods")

**space.floor** (chatgpt high 2)

- A04, chatgpt high 2 on bristlenose, bronzecory: A grown bristlenose with six bronze corys is near the floor limit of a 30 x 12 in tank; the floor, not the neons, sets the margin. ("The concern is limited bottom-area margin, not the number of neon tetras")
- A05, chatgpt high 2 on bronzecory, bristlenose: Same stock on less floor reads worse: the difference is horizontal space and bottom crowding, not volume. ("The difference is driven primarily by reduced horizontal space and bottom-dweller crowding")

**space.invert-class** (chatgpt high 2)

- B16, chatgpt high 2 on cherryshrimp: Adding shrimp should not raise space warnings at the rate fish do; 40 ideal and 80 at most in a planted 10 with supplemental feeding. ("Increasing shrimp numbers should not automatically trigger spatial crowding warnings at the same rate as adding fish")
- C03, chatgpt high 2 on hermit: Blue-leg hermits: about 5-8 ideal and 15 at most in a mature 29 gal reef once the fish and snails are right (low confidence). ("I'd tentatively target 5–8 ideal, 15 at most in a comparable mature 29-gallon reef")

**space.malawi-mix** (chatgpt high 2)

- B08, chatgpt high 2 on syno, peacock, yellowlab: Three adult Malawi synodontis are an important share of the space in a 48 x 18 in Malawi tank and need bottom retreats. ("The three large Synodontis are an important contributor to the limited available space")

**space.mbuna-convention** (chatgpt high 2)

- B07, chatgpt high 2 on demasoni, yellowlab: Adding mbuna can improve welfare despite higher density; plain stocking arithmetic misses this. ("adding demasoni can sometimes improve welfare despite increasing physical stocking density")

**space.salt** (chatgpt high 2)

- C02, chatgpt high 2 on ocellaris, royalgramma, firefish: An 18 x 18 in cube gives less territorial separation than a longer tank of the same volume; footprint shape matters for reef fish. ("22 gallons in a cube does not provide the same territorial separation as a longer aquarium")

**tankmin.angel** (chatgpt high 2)

- A09, chatgpt high 2 on angel: A standard 55 (48 x 13 x 21 in) is appropriate for a bonded adult angelfish pair. ("The 55-gallon dimensions are appropriate for a bonded pair of adult angelfish")

**tankmin.angel-height** (chatgpt high 2)

- A08, chatgpt high 2 on angel: Adult angelfish need a tank about 20 in tall; 16 in is limiting. ("a 20-inch-tall aquarium is preferable")

**tankmin.betta** (chatgpt high 2)

- A01, chatgpt high 2 on betta: A 5 gal (16 x 8 in) is a reasonable minimum for one male betta; larger is not needed for acceptable long-term welfare. ("Five gallons is a reasonable minimum for a single male betta")

**tankmin.bluetang** (chatgpt high 2)

- C07, chatgpt high 2 on bluetang: An adult blue tang needs about a 180 gal, 6 ft tank on its own. ("A 180-gallon, six-foot aquarium is a commonly recommended minimum for the species alone")

**tankmin.clownloach** (chatgpt high 2)

- B02, chatgpt high 2 on clownloach: A group of clown loaches needs at least a 72 x 24 in footprint; groups under five are a welfare problem of their own. ("Seriously Fish recommends a minimum 72 × 24-inch footprint for a group")

**tankmin.coralbeauty** (chatgpt high 2)

- C04, chatgpt high 2 on coralbeauty: Coral beauty minimums are commonly 50-70 gal. ("commonly recommended minimums are 50–70 gallons")
- C05, chatgpt high 2 on coralbeauty: A 48 in 55 gal makes a coral beauty borderline-defensible. ("making the coral beauty more defensible, although it remains borderline")

**tankmin.danio** (chatgpt high 2)

- A12, chatgpt high 2 on danio: Zebra danios want at least a 36 x 12 in footprint. ("Seriously Fish recommends a minimum 36 × 12-inch footprint for zebra danios")

**tankmin.discus** (chatgpt high 2)

- B05, chatgpt high 2 on discus: Discus want an 18 in deep tank; the 55 is cramped by its 13 in width, and width is the fix, not fewer fish. ("The problem is better addressed by increasing tank width than reducing the school size")

**tankmin.goldfish** (chatgpt high 2)

- B03, chatgpt high 2 on goldfish: A 29 gal is the lower acceptable boundary for one adult fancy goldfish; a 40 breeder is substantially better. ("A 29-gallon is my lower acceptable boundary for one adult")

**tankmin.kribensis** (chatgpt high 2)

- B10, chatgpt high 2 on kribensis: A kribensis pair can live in a 20 gal long. ("A kribensis pair can inhabit a 20-gallon-long aquarium")

**tankmin.neon** (chatgpt high 2)

- A13, chatgpt high 2 on neon: Neon tetra minimum is contested: 6-8 in a 10 gal (Aquarium Co-Op) against a 24 x 12 in footprint (Seriously Fish); the expert prefers the larger. ("The 10-gallon recommendation is somewhat contested")

**tankmin.ocellaris** (chatgpt high 2)

- C01, chatgpt high 2 on ocellaris: A 10 gal is marginally acceptable for one ocellaris but not for a pair; a pair needs 20 gal. ("A 10-gallon can be marginally acceptable for one ocellaris without being acceptable for two")

**tankmin.oscar** (chatgpt high 2)

- B01, chatgpt high 2 on oscar: A 75 gal (48 x 18 in) is the commonly accepted minimum for one adult oscar; 125 gal is preferable. ("A 75-gallon tank is a commonly accepted minimum for one adult")
- B02, chatgpt high 2 on oscar: An oscar is appropriately housed in a 125 gal. ("The Oscar itself is appropriately housed in a 125-gallon tank")

**tankmin.sae** (chatgpt high 2)

- A11, chatgpt high 2 on sae: Adult Siamese algae eaters are strong swimmers that want a tank of 60 in or longer when kept as a group of four. ("A 60-inch or longer tank would be preferable")

**tankmin.swordtail** (chatgpt high 2)

- A16, chatgpt high 2 on swordtail: Swordtails want a tank of 48 in or longer. ("a 48-inch or longer aquarium would better accommodate their activity")

**tankmin.yellowlab** (chatgpt high 2)

- B09, chatgpt high 2 on yellowlab: Yellow labs want a 36-48 in tank, one male with several females. ("Most established husbandry recommendations favor at least a 36–48-inch tank with one male and several females")

**tankmin.yellowtang** (chatgpt high 2)

- C06, chatgpt high 2 on yellowtang: An adult yellow tang needs a 6 ft tank, about 125 gal; recommendations run 100-180 gal. ("A six-foot 125-gallon aquarium is a defensible minimum for this community")


## Flags

- verdict compat.betta-community: milder (1 of 1 tanks)
- verdict compat.breeding-pair-floor: milder (2 of 2 tanks)
- verdict compat.coolwater-mates: harsher (1 of 1 tanks)
- verdict compat.fish-in-shrimp-tank: milder (1 of 1 tanks)
- verdict compat.nip-vs-fins: milder (1 of 1 tanks)
- verdict compat.prey-shrimp: milder (2 of 3 tanks)
- verdict compat.prey-size: milder (1 of 1 tanks)
- verdict compat.species-only: milder (1 of 1 tanks)
- verdict compat.temper-vs-school: milder (1 of 1 tanks)
- verdict compat.temperature-cool: milder (1 of 1 tanks)
- verdict compat.temperature-none: milder (1 of 1 tanks)
- verdict compat.temperature-warm: milder (1 of 1 tanks)
- verdict groups.grazer-density: harsher (1 of 1 tanks)
- verdict groups.males-rule: harsher (1 of 1 tanks)
- verdict groups.sae: milder (1 of 1 tanks)
- verdict groups.sexed: milder (2 of 2 tanks)
- verdict groups.territory-bolivian: milder (1 of 1 tanks)
- verdict groups.territory-puffer: milder (1 of 1 tanks)
- verdict herp.newt-group: milder (1 of 1 tanks)
- verdict herp.newt-with-shrimp: milder (1 of 1 tanks)
- verdict limits.food-not-room: harsher (1 of 1 tanks)
- verdict space.big-class-mass: harsher (1 of 1 tanks)
- verdict space.canonical-20: milder (1 of 1 tanks)
- verdict space.community-29: milder (1 of 1 tanks)
- verdict space.discus-community: milder (1 of 1 tanks)
- verdict space.floor: milder (1 of 1 tanks)
- verdict space.full-community: milder (1 of 1 tanks)
- verdict space.invert-class: milder (1 of 2 tanks)
- verdict space.kuhli-floor-factor: milder (1 of 1 tanks)
- verdict space.livebearer-nano: milder (1 of 1 tanks)
- verdict space.livebearers: milder (1 of 1 tanks)
- verdict space.mid-class: milder (1 of 1 tanks)
- verdict space.nano: milder (2 of 2 tanks)
- verdict space.school-curve: milder (1 of 2 tanks)
- verdict space.swordtail-refit: milder (1 of 1 tanks)
- verdict space.tiny-class: milder (1 of 1 tanks)
- verdict space.water: milder (1 of 1 tanks)
- verdict tankmin.angel-height: milder (1 of 1 tanks)
- verdict tankmin.betta: milder (1 of 1 tanks)
- verdict tankmin.tarantula-row: harsher (1 of 1 tanks)
- verdict tankmin.yellowtang: harsher (1 of 1 tanks)
- tooSmall A09: experts accept the tank (0 of 1 ask for bigger)
- tooSmall B07: experts accept the tank (0 of 1 ask for bigger)
- tooSmall B09: experts accept the tank (0 of 1 ask for bigger)
- tooSmall B10: experts accept the tank (0 of 1 ask for bigger)
- tooSmall C03: experts accept the tank (0 of 1 ask for bigger)
- tooSmall C09: experts accept the tank (0 of 1 ask for bigger)
- tooSmall D02: experts accept the tank (0 of 1 ask for bigger)
- tooSmall D05: experts accept the tank (0 of 1 ask for bigger)
- tooSmall D07: experts accept the tank (0 of 1 ask for bigger)
- tooSmall D08: experts accept the tank (0 of 1 ask for bigger)
- tooSmall D10: experts accept the tank (0 of 1 ask for bigger)
- count compat.breeding-pair-floor: engine too full (-30 %)
- count compat.coolwater-mates: engine too empty (+56 %)
- count compat.fish-in-shrimp-tank: engine too full (-33 %)
- count compat.prey-size: engine too full (-30 %)
- count groups.sae: engine too full (-24 %)
- count space.big-class-mass: engine too empty (+56 %)
- count space.chili-refit: engine too full (-17 %)
- count space.footprint-vs-height: engine too full (-21 %)
- count space.invert-class: engine too full (-25 %)
- count space.kuhli-floor-factor: engine too full (-24 %)
- count space.livebearers: engine too empty (+17 %)
- count space.mid-class: engine too full (-24 %)
- count space.swordtail-refit: engine too empty (+17 %)
- count tankmin.angel-height: engine too full (-30 %)
- change A01: nothing (app: bigger)
- change A02: fewer (app: ratio)
- change A04: drop (app: fewer bronzecory)
- change A06: nothing (app: ratio)
- change A10: fewer (app: drop)
- change A11: bigger (app: drop kuhli)
- change A14: nothing (app: fewer kuhli)
- change A15: fewer (app: fewer chili)
- change B07: ratio (app: bigger)
- change B08: bigger (app: fewer syno)
- change B12: fewer (app: drop)
- change B13: bigger (app: drop oto)
- change B16: fewer (app: drop chili)
- change D16: bigger (app: nothing)
- reasons A03: expert-only (eat)
- compat A06: milder (app caution, experts yes)
- reasons A09: expert-only (eat)
- compat A14: milder (app caution, experts yes)
- reasons A15: expert-only (breeding, eat)
- reasons B02: expert-only (aggression, other)
- reasons B04: expert-only (eat, other)
- compat B06: milder (app no, experts caution)
- reasons B07: expert-only (aggression)
- reasons B09: expert-only (aggression)
- compat B10: harsher (app caution, experts no)
- compat B11: milder (app no, experts caution)
- compat B12: harsher (app caution, experts no)
- reasons B12: expert-only (aggression, nip)
- compat B13: milder (app no, experts caution)
- reasons B13: expert-only (food, nip)
- reasons C02: expert-only (aggression, food)
- compat C03: milder (app no, experts caution)
- reasons C03: expert-only (aggression, food)
- reasons C04: expert-only (aggression, food)
- compat C07: milder (app no, experts caution)
- reasons C11: expert-only (aggression, breeding)
- compat D02: harsher (app yes, experts no)
- reasons D04: expert-only (aggression, temperature)
- compat D05: harsher (app yes, experts no)
- reasons D05: expert-only (aggression, breeding)
- compat D07: harsher (app yes, experts no)
- reasons D07: expert-only (aggression)
- reasons D08: expert-only (eat, temperature)
- compat D10: milder (app no, experts caution)
- compat D11: milder (app no, experts caution)
- reasons D11: expert-only (eat)
- reasons D12: expert-only (nip)
- tankmin A01 betta: experts accept smaller (app 10 gal (20 x 10 x 12 in), experts 5 gal (16 x 8 x 10 in))
- tankmin A08 angel: experts accept smaller (app 75 gal (48 x 18 x 21 in), experts 55 gal (48 x 13 x 21 in))
- tankmin B01 oscar: experts accept smaller (app 180 gal (72 x 24 x 24 in), experts 75 gal (48 x 18 x 21 in))
- tankmin B03 goldfish: experts accept smaller (app 40 gal breeder (36 x 18 x 16 in), experts 29 gal (30 x 12 x 18 in))
- tankmin C01 ocellaris: experts accept smaller (app 29 gal (30 x 12 x 18 in), experts 20 gal (24 x 12 x 16 in))
- bigEnough C01 ocellaris: yes (app no)
- bigEnough C02 royalgramma: yes (app no)
- bigEnough C06 yellowtang: no (app yes)
- tankmin D01 leopardgecko: experts accept smaller (app 4 x 2 x 2 ft (48 x 24 x 24 in), experts 40 gal breeder (36 x 18 x 16 in))
- tankmin D03 crestedgecko: experts accept smaller (app larger, experts 18 x 18 x 36 in)
- tankmin D09 treefrog: experts accept smaller (app larger, experts 36 x 18 x 36 in)
- bigEnough D09 treefrog: yes (app no)
- tankmin D16 chacogoldenknee: experts accept smaller (app 20 gal long (30 x 12 x 12 in), experts 12 x 12 x 12 in)
- max B07 demasoni: experts allow fewer (app 16+, experts 12)
- maxMales B12 dwarfgourami: experts allow fewer (app 2, experts 1)
- max B13 peapuffer: experts allow more (app 2, experts 3)
- max B14 bolivianram: experts allow more (app 2, experts 4)
- max C11 firefish: experts allow fewer (app 2, experts 1)
- max D07 dartfrog: experts allow more (app 1, experts 2)
- max D09 treefrog: experts allow more (app 1, experts 2)
- max D10 firetoad: experts allow more (app 3, experts 4)
- max D11 firenewt: experts allow more (app 3, experts 4)
- max D14 axolotl: experts allow fewer (app 1, experts 0)

## Findings

S227, 2026-10-26, one AI expert (chatgpt high 2, all 60 tanks, every note read; readings in answers/v4-chatgpt_high_2.notes.json).
One expert has no disagreement estimate and an AI shares one bias across all its answers, so nothing here is applied: these are the
patterns to test when the human experts' answers arrive. Every answer is an adult judgement, read against the app at adult size.

1. **The app calls tanks unworkable that the expert calls caution or ideal, mostly through two rules.** The nerite pH gate (A02, A06,
   B16: the expert says nerites and amanos are compatible, A06 ideal) is S226's open question. The temperature rule that reads one shared
   degree, or a tank set outside a range, as unworkable (A10, A11, B06, B11, D11) is read by the expert as a caution at most; B06's note says
   28 C fits discus, cardinals and sterbai. Proposal to test: a narrow or single shared degree is caution, not unworkable.
2. **Tank minimums for big animals read harsher than the expert.** Smallest size: oscar app 180 gal vs 75; goldfish 40 breeder vs 29;
   angel 75 vs the 55 (A09's note: a standard 55 suits an adult pair); betta 10 vs 5; ocellaris 29 vs 20 (one ocellaris marginal in a
   10); leopard gecko 4 x 2 x 2 ft vs 40 breeder (36 x 18, the app's own min of 4.5 sq ft, so the app's green line, not its red, is the
   gap); tarantula 20 long vs 12 x 12. Yellow tang reads milder in the app (yellow at a 55; the expert: not big enough, 125 gal).
3. **Rules the app lacks, each named by the expert's notes.** Cohabitation of leopard geckos (D02) and a male with a female crested gecko
   (D05): app yes, expert no. A tinctorius trio vs a pair (D07). Food and maturity: the grazer rule did not fire on B15 (app ideal, expert
   problems: otos in a six-week tank) and the mandarin in a young cube without refugium (C09) reads only as too small. Large turbo snails
   and nerites eating out a small tank (B16, C02, C03, C08). Hermits vs snail shells (C03, gap).
4. **Herp group counts read stricter in the app than the expert**: most dart frogs, White's tree frogs, fire-bellied toads and newts
   the expert would keep is one more than herpstock's floor rule allows (D07, D09, D10, D11); D09 ends at "caution, not failure".
5. **Counts (the fit).** Water x0.93, floor x1.17, mid class -17 %, big class +24 % (goldfish +43 %): the expert keeps fewer mid fish
   and more floor-heavy animals than the engine at its 75 / 100 anchors. Error 0.289 -> 0.205 on 22 tanks. A single AI's counts carry its
   own bias; with no second expert the fit cannot separate it from the scale. Not applied.
6. **Males and maxima.** One male dwarf gourami in a 29 (B12; groups.ts allows two); one firefish unless a proven pair (C11); four
   Bolivian rams workable but not ideal (B14; groups.ts 2); three pea puffers in a planted 10 (B13; groups.ts 2).
7. **For the juvenile-size timeline (S228), not calibration:** five juvenile Banggai coexist for a while, five adults do not (C10);
   three ocellaris bought as juveniles end as a pair plus an outcast (C12); a 12 x 12 x 18 suits a growing crested gecko, not an adult
   (D03); a juvenile blue tang is judged for the adult (C07).

Round B: ask the temperature rule (one shared degree, a tank 1 C outside) and the big-animal minimums (oscar, goldfish, angel,
leopard gecko) of human keepers first; they decide most of the flags above.
