# Calibration review, survey v4: synth-agree

Build cba9d609. Engine readings: the current engine (research/calib/tables/v4.json, 2026-10-26). 1 expert (synth-agree (an AI model): modules A, B, C, D). With more than one expert each tank reads their median. The app's overall verdict is src/calib/v4.ts verdictOf, from its parts (space band, tank minimum, fighting warnings, compatibility, temperature, herp checks, group bands); "milder" means the experts judge the tank less severely than the app.

## Verdict per tag

Flagged: half or more of the tag's answered tanks a band off the app, all in the same direction.

| tag | tanks | app | experts | agree | milder | harsher | |
|---|---|---|---|---|---|---|---|
| compat.betta-community | A14 | caution | caution | 1 | 0 | 0 |  |
| compat.breeding-pair-floor | A08 B10 B14 | problems, unworkable, problems | problems, unworkable, problems | 3 | 0 | 0 |  |
| compat.coolwater-mates | B04 | caution | caution | 1 | 0 | 0 |  |
| compat.coral-nipper | C04 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.cover-cave | B10 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.fish-in-shrimp-tank | B16 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.hermits-vs-snails | C03 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.nip-no-target | A12 | caution | caution | 1 | 0 | 0 |  |
| compat.nip-vs-fins | A07 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.prey-shrimp | A03 A15 B11 | problems, caution, unworkable | problems, caution, unworkable | 3 | 0 | 0 |  |
| compat.prey-size | A08 A09 B02 | problems, unworkable, unworkable | problems, unworkable, unworkable | 3 | 0 | 0 |  |
| compat.prey-sw-inverts | C03 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.species-only | B13 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.temper | B09 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.temper-vs-school | A02 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.temperature-cool | D11 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.temperature-narrow | A02 A06 B12 | unworkable, unworkable, caution | unworkable, unworkable, caution | 3 | 0 | 0 |  |
| compat.temperature-none | B11 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.temperature-warm | B06 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.two-tangs | C07 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.water-chemistry | B09 | unworkable | unworkable | 1 | 0 | 0 |  |
| gap.toxins | D10 | unworkable | unworkable | 1 | 0 | 0 |  |
| golden.discus-85 | B05 | caution | caution | 1 | 0 | 0 |  |
| groups.chromis | C04 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.chromis-under-min | C07 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.clown-max-2 | C12 | problems | problems | 1 | 0 | 0 |  |
| groups.demasoni | B07 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.firefish-pair | C11 | problems | problems | 1 | 0 | 0 |  |
| groups.grazer-density | B15 | caution | caution | 1 | 0 | 0 |  |
| groups.males-rule | B12 | caution | caution | 1 | 0 | 0 |  |
| groups.sae | A11 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.sexed | A03 A16 | problems, problems | problems, problems | 2 | 0 | 0 |  |
| groups.syno | B08 | caution | caution | 1 | 0 | 0 |  |
| groups.territory-banggai | C10 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-bolivian | B14 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-gramma | C11 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-krib | B10 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.territory-puffer | B13 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.yellowlab-min | B09 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.adf-min | D12 | problems | problems | 1 | 0 | 0 |  |
| herp.adf-with-betta | D12 | problems | problems | 1 | 0 | 0 |  |
| herp.anole-group | D15 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.arboreal-min | D03 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.axolotl-min | D13 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.axolotl-pair | D14 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.axolotl-with-fish | D14 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.cohab-sex-rule | D02 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.cross-species | D04 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.dartfrog-group | D07 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.each-extra | D02 D05 | unworkable, unworkable | unworkable, unworkable | 2 | 0 | 0 |  |
| herp.female-aggression | D07 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.floor-min-bp | D06 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.floor-min-leo | D01 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.height | D03 D09 | unworkable, unworkable | unworkable, unworkable | 2 | 0 | 0 |  |
| herp.height-bp | D06 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.mixed-pair | D05 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.newt-group | D11 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.newt-with-shrimp | D11 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.one-male | D15 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.prey-amphibian | D08 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.toad-group | D10 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.toad-with-fish | D10 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.treefrog-each-extra | D09 | unworkable | unworkable | 1 | 0 | 0 |  |
| limits.food-not-room | B15 C09 | caution, unworkable | caution, unworkable | 2 | 0 | 0 |  |
| space.big-class | B02 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.big-class-mass | B04 | caution | caution | 1 | 0 | 0 |  |
| space.canonical-20 | A04 | problems | problems | 1 | 0 | 0 |  |
| space.chili-refit | A15 | caution | caution | 1 | 0 | 0 |  |
| space.community-29 | A06 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.coolwater | A12 | caution | caution | 1 | 0 | 0 |  |
| space.discus-community | B06 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.floor | A04 | problems | problems | 1 | 0 | 0 |  |
| space.footprint-vs-height | A05 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.full-community | A10 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.invert-class | A15 B16 | caution, unworkable | caution, unworkable | 2 | 0 | 0 |  |
| space.kuhli-floor-factor | A11 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.livebearer-nano | A03 | problems | problems | 1 | 0 | 0 |  |
| space.livebearers | A16 | problems | problems | 1 | 0 | 0 |  |
| space.malawi-mix | B08 | caution | caution | 1 | 0 | 0 |  |
| space.mbuna-convention | B07 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.mid-class | A11 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.nano | A01 A02 | caution, unworkable | caution, unworkable | 2 | 0 | 0 |  |
| space.nano-reef | C02 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.reef-125 | C08 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.reef-40 | C04 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.salt-load | C01 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.salt-scale | C05 C08 | unworkable, unworkable | unworkable, unworkable | 2 | 0 | 0 |  |
| space.school-curve | A10 A13 | unworkable, problems | unworkable, problems | 2 | 0 | 0 |  |
| space.swordtail-refit | A16 | problems | problems | 1 | 0 | 0 |  |
| space.tiny-class | A14 | caution | caution | 1 | 0 | 0 |  |
| space.water | A04 | problems | problems | 1 | 0 | 0 |  |
| space.water-small | A13 | problems | problems | 1 | 0 | 0 |  |
| tankmin.angel-height | A08 | problems | problems | 1 | 0 | 0 |  |
| tankmin.betta | A01 | caution | caution | 1 | 0 | 0 |  |
| tankmin.bluetang | C07 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.clownloach | B02 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.coralbeauty | C04 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.coralbeauty-width | C05 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.demasoni-width | B07 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.goldfish | B03 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.mandarin | C09 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.ocellaris | C01 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.oscar | B01 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.royalgramma | C02 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.sixline | C03 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.tarantula-row | D16 | ideal | ideal | 1 | 0 | 0 |  |
| tankmin.yellowlab | B09 | unworkable | unworkable | 1 | 0 | 0 |  |
| tankmin.yellowtang | C06 | caution | caution | 1 | 0 | 0 |  |

### Agreement by family (rows the app, columns the experts' median, tanks)

**compat** (23 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 5 | 0 | 0 |
| problems | 0 | 0 | 3 | 0 |
| unworkable | 0 | 0 | 0 | 15 |

**gap** (1 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 0 | 0 | 0 |
| problems | 0 | 0 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 1 |

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
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 3 | 0 | 0 |
| problems | 0 | 0 | 6 | 0 |
| unworkable | 0 | 0 | 0 | 7 |

**herp** (15 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 0 | 0 | 0 |
| problems | 0 | 0 | 1 | 0 |
| unworkable | 0 | 0 | 0 | 14 |

**limits** (2 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 1 | 0 | 0 |
| problems | 0 | 0 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 1 |

**space** (24 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 6 | 0 | 0 |
| problems | 0 | 0 | 4 | 0 |
| unworkable | 0 | 0 | 0 | 14 |

**tankmin** (16 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 1 | 0 | 0 | 0 |
| caution | 0 | 2 | 0 | 0 |
| problems | 0 | 0 | 1 | 0 |
| unworkable | 0 | 0 | 0 | 12 |

## Count fix per tank

Each count read on the dimension its species fills today (as calib-fit.mjs does). "fix" is the multiplier the engine's reading needs (below 0 % the engine reads the tank too full); "least" is the smallest move that makes the expert's count the engine's own nearest count, so a rounded small count is not a disagreement. A tank's fix pools its counted species and its second counted species (the bottom dweller of six tanks, the line below it, marked †). Fitted (calib-fit.mjs): the tanks with a space.* or golden.* tag.

| tank | counted | shown -> engine | ideal -> engine | limit -> engine | fix | least | fitted |
|---|---|---|---|---|---|---|---|
| A02 | neon (water) | 6 -> 68 % | 7 -> 76 % | 10 -> 100 % | -1 % | +0 % | yes |
| A03 | guppy (water) | 8 -> 131 % | 4 -> 73 % | 6 -> 102 % | 0 % | +0 % | yes |
| A04 | neon (water) | 10 -> 101 % | 2 -> 73 % | 10 -> 101 % | +2 % | +0 % | yes |
|  | bronzecory † (floor) | 6 -> 81 % | 5 -> 70 % | 8 -> 102 % |  |  |  |
| A05 | neon (water) | 10 -> 119 % | 0 | 4 -> 99 % | +0 % | +0 % | yes |
|  | bronzecory † (floor) | 6 -> 101 % | 4 -> 74 % | 6 -> 101 % |  |  |  |
| A06 | harlequin (water) | 12 -> 78 % | 11 -> 76 % | 22 -> 101 % | -1 % | +0 % | yes |
| A08 | rummynose (water) | 15 -> 122 % | 0 | 1 -> 100 % | +0 % | +0 % | no |
| A10 | neon (water) | 20 -> 122 % | 0 | 0 | +3 % | +0 % | yes |
|  | bronzecory † (floor) | 12 -> 91 % | 9 -> 72 % | 13 -> 97 % |  |  |  |
| A11 | boesemani (water) | 8 -> 113 % | 0 | 4 -> 99 % | +0 % | +0 % | yes |
|  | kuhli † (max) | 10 -> 113 % | 0 | 3 -> 100 % |  |  |  |
| A12 | danio (water) | 12 -> 99 % | 7 -> 73 % | 12 -> 99 % | +2 % | +0 % | yes |
| A13 | neon (water) | 20 -> 142 % | 9 -> 78 % | 12 -> 99 % | -1 % | +0 % | yes |
| A14 | ember (water) | 10 -> 85 % | 4 -> 75 % | 20 -> 101 % | 0 % | +0 % | yes |
| A15 | chili (water) | 12 -> 92 % | 6 -> 73 % | 15 -> 100 % | +1 % | +0 % | yes |
| A16 | platy (water) | 6 -> 102 % | 0 | 5 -> 99 % | -1 % | +0 % | yes |
|  | bronzecory † (floor) | 8 -> 47 % | 13 -> 77 % | 17 -> 101 % |  |  |  |
| B02 | clownloach (floor) | 5 -> 50 % | 8 -> 72 % | - | +4 % | +0 % | yes |
| B04 | goldfish (max) | 3 -> 82 % | 3 -> 82 % | 4 -> 107 % | -8 % | +0 % | yes |
| B05 | discus (water) | 6 -> 82 % | 6 -> 82 % | 7 -> 95 % | -2 % | +0 % | yes |
| B06 | discus (water) | 6 -> 102 % | 3 -> 77 % | 6 -> 102 % | -1 % | +0 % | yes |
|  | sterbai † (floor) | 8 -> 35 % | 17 -> 74 % | 23 -> 100 % |  |  |  |
| B07 | yellowlab (max) | 8 -> 85 % | 5 -> 74 % | 12 -> 100 % | +1 % | +0 % | yes |
| B08 | peacock (water) | 5 -> 95 % | 1 -> 78 % | 6 -> 99 % | -2 % | 0 % | yes |
| B15 | oto (max) | 8 -> 98 % | 5 -> 73 % | 8 -> 98 % | +2 % | +0 % | no |
| B16 | cherryshrimp (max) | 30 -> 104 % | 6 -> 75 % | 27 -> 100 % | 0 % | +0 % | yes |
| C03 | hermit (max) | 10 -> 118 % | 1 -> 79 % | 5 -> 100 % | -2 % | -1 % | no |
| C04 | chromis (water) | 6 -> 126 % | 1 -> 80 % | 3 -> 99 % | -3 % | 0 % | yes |
| C05 | chromis (water) | 6 -> 122 % | 1 -> 80 % | 3 -> 97 % | -2 % | 0 % | yes |
| C08 | chromis (water) | 9 -> 91 % | 4 -> 75 % | 12 -> 99 % | +0 % | +0 % | yes |

### Count fix per tag

Flagged: the median least fix of the tag's count tanks more than 15 % off.

| tag | tanks | median fix | median least | |
|---|---|---|---|---|
| compat.betta-community | A14 | 0 % | +0 % |  |
| compat.breeding-pair-floor | A08 | +0 % | +0 % |  |
| compat.coolwater-mates | B04 | -8 % | +0 % |  |
| compat.coral-nipper | C04 | -3 % | 0 % |  |
| compat.fish-in-shrimp-tank | B16 | 0 % | +0 % |  |
| compat.hermits-vs-snails | C03 | -2 % | -1 % |  |
| compat.nip-no-target | A12 | +2 % | +0 % |  |
| compat.prey-shrimp | A03 A15 | +1 % | +0 % |  |
| compat.prey-size | A08 B02 | +2 % | +0 % |  |
| compat.prey-sw-inverts | C03 | -2 % | -1 % |  |
| compat.temper-vs-school | A02 | -1 % | +0 % |  |
| compat.temperature-narrow | A02 A06 | -1 % | +0 % |  |
| compat.temperature-warm | B06 | -1 % | +0 % |  |
| golden.discus-85 | B05 | -2 % | +0 % |  |
| groups.chromis | C04 | -3 % | 0 % |  |
| groups.demasoni | B07 | +1 % | +0 % |  |
| groups.grazer-density | B15 | +2 % | +0 % |  |
| groups.sae | A11 | +0 % | +0 % |  |
| groups.sexed | A03 A16 | -1 % | +0 % |  |
| groups.syno | B08 | -2 % | 0 % |  |
| limits.food-not-room | B15 | +2 % | +0 % |  |
| space.big-class | B02 | +4 % | +0 % |  |
| space.big-class-mass | B04 | -8 % | +0 % |  |
| space.canonical-20 | A04 | +2 % | +0 % |  |
| space.chili-refit | A15 | +1 % | +0 % |  |
| space.community-29 | A06 | -1 % | +0 % |  |
| space.coolwater | A12 | +2 % | +0 % |  |
| space.discus-community | B06 | -1 % | +0 % |  |
| space.floor | A04 | +2 % | +0 % |  |
| space.footprint-vs-height | A05 | +0 % | +0 % |  |
| space.full-community | A10 | +3 % | +0 % |  |
| space.invert-class | A15 B16 | +0 % | +0 % |  |
| space.kuhli-floor-factor | A11 | +0 % | +0 % |  |
| space.livebearer-nano | A03 | 0 % | +0 % |  |
| space.livebearers | A16 | -1 % | +0 % |  |
| space.malawi-mix | B08 | -2 % | 0 % |  |
| space.mbuna-convention | B07 | +1 % | +0 % |  |
| space.mid-class | A11 | +0 % | +0 % |  |
| space.nano | A02 | -1 % | +0 % |  |
| space.reef-125 | C08 | +0 % | +0 % |  |
| space.reef-40 | C04 | -3 % | 0 % |  |
| space.salt-scale | C05 C08 | -1 % | 0 % |  |
| space.school-curve | A10 A13 | +1 % | +0 % |  |
| space.swordtail-refit | A16 | -1 % | +0 % |  |
| space.tiny-class | A14 | 0 % | +0 % |  |
| space.water | A04 | +2 % | +0 % |  |
| space.water-small | A13 | -1 % | +0 % |  |
| tankmin.angel-height | A08 | +0 % | +0 % |  |
| tankmin.clownloach | B02 | +4 % | +0 % |  |
| tankmin.coralbeauty | C04 | -3 % | 0 % |  |
| tankmin.coralbeauty-width | C05 | -2 % | 0 % |  |
| tankmin.demasoni-width | B07 | +1 % | +0 % |  |
| tankmin.sixline | C03 | -2 % | -1 % |  |

## The first thing to change, against the app

fewer X: the app's biggest contributor on its binding dimension, or a fighting warning on X; bigger: a tank-minimum or herp floor line; drop X: a compatibility, temperature or herp line naming X; ratio: a group band, sex mix or males line; nothing: the app's ideal. notroom (food, maturity, habitat) and other have no app part to hold against.

| tank | app's reading | experts | fits the app | |
|---|---|---|---|---|
| A01 | caution: tankmin yellow: betta | bigger | yes |  |
| A02 | unworkable: compat high | drop nerite | yes |  |
| A03 | problems: space 131 %; group too small: cherryshrimp | fewer guppy | yes |  |
| A04 | problems: space 101 % | fewer bronzecory | yes |  |
| A06 | unworkable: compat high | drop nerite | yes |  |
| A07 | unworkable: compat high | drop betta | yes |  |
| A08 | problems: space 122 % | fewer sterbai | yes |  |
| A09 | unworkable: tankmin red: angel; temperature none | bigger | yes |  |
| A10 | unworkable: temperature single | drop | yes |  |
| A11 | unworkable: compat high; temperature single | drop kuhli | yes |  |
| A12 | caution: space 99 %; tankmin yellow: danio; temperature narrow | fewer danio | yes |  |
| A13 | problems: space 142 % | fewer neon | yes |  |
| A14 | caution: space 85 %; tankmin yellow: kuhli; temperature narrow | fewer kuhli | yes |  |
| A15 | caution: space 92 %; temperature narrow | fewer chili | yes |  |
| A16 | problems: space 102 % | fewer swordtail | yes |  |
| B01 | unworkable: tankmin red: oscar | bigger | yes |  |
| B02 | unworkable: tankmin red: oscar | bigger | yes |  |
| B03 | unworkable: tankmin red: goldfish | bigger | yes |  |
| B04 | caution: space 82 %; temperature narrow | fewer goldfish | yes |  |
| B05 | caution: space 82 %; tankmin yellow: discus | fewer discus | yes |  |
| B06 | unworkable: temperature outside | drop | yes |  |
| B07 | unworkable: tankmin red: demasoni | bigger | yes |  |
| B08 | caution: space 95 %; temperature narrow | fewer syno | yes |  |
| B09 | unworkable: compat high; tankmin red: yellowlab | drop yellowlab | yes |  |
| B10 | unworkable: tankmin red: kribensis | bigger | yes |  |
| B11 | unworkable: compat high; temperature none | drop cherryshrimp | yes |  |
| B12 | caution: temperature narrow | drop | yes |  |
| B13 | unworkable: compat high | drop oto | yes |  |
| B14 | problems: crowd: 4 Bolivian rams | fewer bolivianram | yes |  |
| B15 | caution: space 98 % | fewer oto | yes |  |
| B16 | unworkable: compat high | drop chili | yes |  |
| C01 | unworkable: tankmin red: ocellaris | bigger | yes |  |
| C02 | unworkable: tankmin red: royalgramma; tankmin red: firefish; tankmin red: ocellaris | bigger | yes |  |
| C03 | unworkable: compat high; tankmin red: sixline; tankmin red: ocellaris; tankmin red: watchman | drop hermit | yes |  |
| C04 | unworkable: tankmin red: coralbeauty | bigger | yes |  |
| C06 | caution: space 91 %; tankmin yellow: yellowtang; temperature narrow | fewer chromis | yes |  |
| C07 | unworkable: compat high; tankmin red: bluetang | drop bluetang | yes |  |
| C08 | unworkable: compat high | drop bluetang | yes |  |
| C09 | unworkable: tankmin red: mandarin; tankmin red: ocellaris | bigger | yes |  |
| C10 | problems: crowd: 5 Banggai cardinalfish | fewer banggai | yes |  |
| C11 | problems: crowd: Royal gramma is best kept one to a tank | fewer royalgramma | yes |  |
| C12 | problems: crowd: 3 Ocellaris clownfish | fewer ocellaris | yes |  |
| D01 | unworkable: herp: Leopard gecko: floor 1 | bigger | yes |  |
| D02 | unworkable: herp: Leopard gecko: floor 4 | bigger | yes |  |
| D03 | unworkable: herp: Crested gecko: floor 1 sq ft (0; herp: Crested gecko: enclosure 18 in tall; it needs at least 24 in | bigger | yes |  |
| D04 | unworkable: herp: Crested gecko: not with Green anole; herp: Green anole: not with Crested gecko (flame) | drop greenanole | yes |  |
| D05 | unworkable: herp: Crested gecko: floor 2 | bigger | yes |  |
| D06 | unworkable: herp: Ball python: enclosure 16 in tall; it needs at least 18 in | bigger | yes |  |
| D07 | unworkable: herp: Dyeing dart frog: floor 2 | bigger | yes |  |
| D08 | unworkable: herp: White's tree frog: floor 2; herp: White's tree frog: not with Dyeing dart frog; herp: Dyeing dart frog: floor 2; herp: Dyeing dart frog: not with White's tree frog | bigger | yes |  |
| D09 | unworkable: herp: White's tree frog: floor 2 | bigger | yes |  |
| D10 | unworkable: herp: Fire-bellied toad: floor 2; herp: Fire-bellied toad: not with White cloud mountain minnow | bigger | yes |  |
| D11 | unworkable: temperature single | drop | yes |  |
| D12 | problems: space 107 % | fewer adf | yes |  |
| D13 | unworkable: tankmin red: axolotl | bigger | yes |  |
| D14 | unworkable: compat high; tankmin red: axolotl; herp: Axolotl: not with White cloud mountain minnow | drop whitecloud | yes |  |
| D15 | unworkable: herp: Green anole: floor 2 | bigger | yes |  |
| D16 | ideal: - | nothing | yes |  |

## Keep together, and why, against compatRisks

The app's answer: no for a blocked pair, no shared temperature, or a herp that must not share; caution for a concern or a narrow shared temperature. Reasons in the survey's categories (eat = prey, nip, aggression = temper / territory / guard, chemistry, temperature, habitat = herp mates); "disease" has no rule (a gap, design section 6.4).

| tank | app | app's lines | experts | app reasons | expert reasons | |
|---|---|---|---|---|---|---|
| A02 | no | Neon tetra with Nerite snail (zebra): water chemistry: pH 5.0-7.0 against its 7.0-8.5 (Nerite snail (zebra)); temperature narrow | no | chemistry, temperature | chemistry, temperature |  |
| A03 | caution | temperature narrow | caution | temperature | temperature |  |
| A06 | no | Harlequin rasbora with Nerite snail (zebra): water chemistry: pH 5.0-7.0 against its 7.0-8.5 (Nerite snail (zebra)); temperature narrow | no | chemistry, temperature | chemistry, temperature |  |
| A07 | no | Tiger barb with Betta: would harass its long fins | no | nip | nip |  |
| A08 | caution | Angelfish breeding pair defends much of this floor (648 sq in): tankmates need caves and sight breaks elsewhere; temperature narrow | caution | aggression, temperature | aggression, temperature |  |
| A09 | no | Angelfish breeding pair defends much of this floor (624 sq in): tankmates need caves and sight breaks elsewhere; temperature none | no | aggression, temperature | aggression, temperature |  |
| A14 | caution | temperature narrow | caution | temperature | temperature |  |
| A15 | caution | temperature narrow | caution | temperature | temperature |  |
| B02 | caution | temperature narrow | caution | temperature | temperature |  |
| B04 | caution | temperature narrow | caution | temperature | temperature |  |
| B06 | no | temperature narrow | no | temperature | temperature |  |
| B07 | caution | temperature narrow | caution | temperature | temperature |  |
| B09 | no | Neon tetra with Yellow lab cichlid: water chemistry: pH 5.0-7.0 against its 7.6-8.6; Neon tetra with Yellow lab cichlid: water hardness: GH 1-10 against its 10-20; temperature narrow | no | chemistry, temperature | chemistry, temperature |  |
| B10 | caution | Kribensis breeding pair defends much of this floor (360 sq in): tankmates need caves and sight breaks elsewhere; temperature narrow | caution | aggression, temperature | aggression, temperature |  |
| B11 | no | German blue ram with Cherry shrimp: would eat it; temperature none | no | eat, temperature | eat, temperature |  |
| B12 | caution | temperature narrow | caution | temperature | temperature |  |
| B13 | no | Pea puffer with Otocinclus: too aggressive for it; temperature narrow | no | aggression, temperature | aggression, temperature |  |
| C02 | caution | temperature narrow | caution | temperature | temperature |  |
| C03 | no | Six-line wrasse with Blue-leg hermit crab: would eat it; temperature narrow | no | eat, temperature | eat, temperature |  |
| C04 | caution | temperature narrow | caution | temperature | temperature |  |
| C07 | no | Yellow tang with Blue tang: rivals of its look-alike, keep one tang; Blue tang with Yellow tang: rivals of its look-alike, keep one tang; temperature narrow | no | aggression, temperature | aggression, temperature |  |
| C11 | caution | temperature narrow | caution | temperature | temperature |  |
| D02 | yes | - | yes | - | - |  |
| D04 | no | Crested gecko: not with Green anole; Green anole: not with Crested gecko (flame) | no | habitat | habitat |  |
| D05 | yes | - | yes | - | - |  |
| D07 | yes | - | yes | - | - |  |
| D08 | no | White's tree frog: not with Dyeing dart frog; Dyeing dart frog: not with White's tree frog | no | habitat | habitat |  |
| D10 | no | Fire-bellied toad: not with White cloud mountain minnow | no | habitat | habitat |  |
| D11 | no | temperature single | no | temperature | temperature |  |
| D12 | caution | temperature narrow | caution | temperature | temperature |  |
| D14 | no | Axolotl with White cloud mountain minnow: would eat it; temperature narrow; Axolotl: not with White cloud mountain minnow | no | eat, habitat, temperature | eat, habitat, temperature |  |

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
| synth-agree | A | 16 | 0 | 0 | 0 |
| synth-agree | B | 16 | 0 | 0 | 0 |
| synth-agree | C | 12 | 0 | 0 | 0 |
| synth-agree | D | 16 | 0 | 0 | 0 |

Confidence: low 0, medium 60, high 0. A module a keeper mostly skips is outside their domain; one an LLM skips is a prompt problem (design section 5).

## Flags

None: the answers agree with the app on every tag, count, change, pair, minimum and maximum asked.

## Findings

(hand-written: the flagged tags, the change each suggests, and what round B should ask)
