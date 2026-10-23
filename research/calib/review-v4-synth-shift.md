# Calibration review, survey v4: synth-shift

Build c7cb52e6. Engine readings: the current engine (research/calib/tables/v4.json, 2026-10-23). 1 expert (synth-shift (an AI model): modules A, B, C, D). With more than one expert each tank reads their median. The app's overall verdict is src/calib/v4.ts verdictOf, from its parts (space band, tank minimum, fighting warnings, compatibility, temperature, herp checks, group bands); "milder" means the experts judge the tank less severely than the app.

## Verdict per tag

Flagged: half or more of the tag's answered tanks a band off the app, all in the same direction.

| tag | tanks | app | experts | agree | milder | harsher | |
|---|---|---|---|---|---|---|---|
| compat.betta-community | A14 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.breeding-pair-floor | A08 B10 B14 | problems, unworkable, problems | caution, unworkable, problems | 2 | 1 | 0 |  |
| compat.coolwater-mates | B04 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| compat.coral-nipper | C04 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.cover-cave | B10 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.fish-in-shrimp-tank | B16 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.hermits-vs-snails | C03 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.nip-no-target | A12 | caution | caution | 1 | 0 | 0 |  |
| compat.nip-vs-fins | A07 | unworkable | unworkable | 1 | 0 | 0 |  |
| compat.prey-shrimp | A03 A15 B11 | problems, caution, unworkable | problems, ideal, unworkable | 2 | 1 | 0 |  |
| compat.prey-size | A08 A09 B02 | problems, unworkable, unworkable | caution, unworkable, unworkable | 2 | 1 | 0 |  |
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
| golden.discus-85 | B05 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| groups.chromis | C04 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.chromis-under-min | C07 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.clown-max-2 | C12 | problems | problems | 1 | 0 | 0 |  |
| groups.demasoni | B07 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.firefish-pair | C11 | problems | problems | 1 | 0 | 0 |  |
| groups.grazer-density | B15 | caution | caution | 1 | 0 | 0 |  |
| groups.males-rule | B12 | caution | caution | 1 | 0 | 0 |  |
| groups.sae | A11 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.sexed | A03 A16 | problems, problems | problems, caution | 1 | 1 | 0 | **flag: experts milder** |
| groups.syno | B08 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| groups.territory-banggai | C10 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-bolivian | B14 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-gramma | C11 | problems | problems | 1 | 0 | 0 |  |
| groups.territory-puffer | B13 | unworkable | unworkable | 1 | 0 | 0 |  |
| groups.yellowlab-min | B09 | unworkable | unworkable | 1 | 0 | 0 |  |
| herp.adf-min | D12 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| herp.adf-with-betta | D12 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
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
| space.big-class-mass | B04 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| space.canonical-20 | A04 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.chili-refit | A15 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| space.community-29 | A06 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.coolwater | A12 | caution | caution | 1 | 0 | 0 |  |
| space.discus-community | B06 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.floor | A04 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.footprint-vs-height | A05 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.full-community | A10 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.invert-class | A15 B16 | caution, unworkable | ideal, unworkable | 1 | 1 | 0 | **flag: experts milder** |
| space.kuhli-floor-factor | A11 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.livebearer-nano | A03 | problems | problems | 1 | 0 | 0 |  |
| space.livebearers | A16 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.malawi-mix | B08 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |
| space.mbuna-convention | B07 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.mid-class | A11 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.nano | A01 A02 | caution, unworkable | caution, unworkable | 2 | 0 | 0 |  |
| space.nano-reef | C02 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.reef-125 | C08 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.reef-40 | C04 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.salt-load | C01 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.salt-scale | C05 C08 | unworkable, unworkable | unworkable, unworkable | 2 | 0 | 0 |  |
| space.school-curve | A10 A13 | unworkable, problems | unworkable, problems | 2 | 0 | 0 |  |
| space.swordtail-refit | A16 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.tiny-class | A14 | unworkable | unworkable | 1 | 0 | 0 |  |
| space.water | A04 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
| space.water-small | A13 | problems | problems | 1 | 0 | 0 |  |
| tankmin.angel-height | A08 | problems | caution | 0 | 1 | 0 | **flag: experts milder** |
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
| tankmin.yellowtang | C06 | caution | ideal | 0 | 1 | 0 | **flag: experts milder** |

### Agreement by family (rows the app, columns the experts' median, tanks)

**compat** (23 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 2 | 2 | 0 | 0 |
| problems | 0 | 1 | 2 | 0 |
| unworkable | 0 | 0 | 0 | 16 |

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
| caution | 1 | 0 | 0 | 0 |
| problems | 0 | 0 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 0 |

**groups** (15 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 1 | 2 | 0 | 0 |
| problems | 0 | 1 | 5 | 0 |
| unworkable | 0 | 0 | 0 | 6 |

**herp** (15 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 0 | 0 | 0 | 0 |
| caution | 0 | 0 | 0 | 0 |
| problems | 0 | 1 | 0 | 0 |
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
| caution | 3 | 2 | 0 | 0 |
| problems | 0 | 2 | 2 | 0 |
| unworkable | 0 | 0 | 0 | 15 |

**tankmin** (16 tanks)

| app \ experts | ideal | caution | problems | unworkable |
|---|---|---|---|---|
| ideal | 1 | 0 | 0 | 0 |
| caution | 1 | 1 | 0 | 0 |
| problems | 0 | 1 | 0 | 0 |
| unworkable | 0 | 0 | 0 | 12 |

## Count fix per tank

Each count read on the dimension its species fills (as calib-fit.mjs does). "fix" is the multiplier the engine's reading needs (below 0 % the engine reads the tank too full); "least" is the smallest move that makes the expert's count the engine's own nearest count, so a rounded small count is not a disagreement. Fitted (calib-fit.mjs): the tanks with a space.* or golden.* tag.

| tank | counted | shown -> engine | ideal -> engine | limit -> engine | fix | least | fitted |
|---|---|---|---|---|---|---|---|
| A02 | neon (water) | 6 -> 68 % | 10 -> 100 % | 15 -> 129 % | -24 % | -22 % | yes |
| A03 | guppy (water) | 8 -> 131 % | 6 -> 102 % | 8 -> 131 % | -25 % | -20 % | yes |
| A04 | neon (water) | 10 -> 101 % | 9 -> 98 % | 21 -> 131 % | -23 % | -22 % | yes |
| A05 | neon (water) | 10 -> 119 % | 4 -> 99 % | 13 -> 129 % | -23 % | -22 % | yes |
| A06 | harlequin (water) | 12 -> 78 % | 20 -> 97 % | 36 -> 129 % | -23 % | -22 % | yes |
| A08 | rummynose (water) | 15 -> 122 % | 0 | 21 -> 130 % | -23 % | -23 % | no |
| A10 | neon (water) | 20 -> 122 % | 0 | 29 -> 130 % | -23 % | -23 % | yes |
| A11 | boesemani (water) | 8 -> 113 % | 4 -> 99 % | 14 -> 130 % | -24 % | -23 % | yes |
| A12 | danio (water) | 12 -> 99 % | 12 -> 99 % | 19 -> 129 % | -23 % | -22 % | yes |
| A13 | neon (water) | 20 -> 142 % | 12 -> 99 % | 18 -> 132 % | -24 % | -22 % | yes |
| A14 | ember (water) | 10 -> 85 % | 18 -> 98 % | 42 -> 130 % | -23 % | -23 % | yes |
| A15 | chili (water) | 12 -> 92 % | 14 -> 97 % | 27 -> 130 % | -23 % | -22 % | yes |
| A16 | platy (water) | 6 -> 102 % | 4 -> 97 % | 20 -> 130 % | -23 % | -22 % | yes |
| B02 | clownloach (floor) | 5 -> 50 % | cant-say | cant-say | - | - | yes |
| B04 | goldfish (max) | 3 -> 82 % | 4 -> 107 % | 5 -> 130 % | -27 % | -18 % | yes |
| B05 | discus (water) | 6 -> 82 % | 7 -> 95 % | 10 -> 136 % | -24 % | -19 % | yes |
| B06 | discus (water) | 6 -> 102 % | 5 -> 94 % | 9 -> 127 % | -21 % | -17 % | yes |
| B07 | yellowlab (max) | 8 -> 85 % | 11 -> 96 % | 21 -> 130 % | -23 % | -21 % | yes |
| B08 | peacock (water) | 5 -> 95 % | 6 -> 99 % | 15 -> 130 % | -24 % | -23 % | yes |
| B15 | oto (max) | 8 -> 98 % | 8 -> 98 % | 13 -> 130 % | -23 % | -21 % | no |
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
| compat.temperature-warm | B06 | -21 % | -17 % | **flag: engine reads too full** |
| golden.discus-85 | B05 | -24 % | -19 % | **flag: engine reads too full** |
| groups.chromis | C04 | -25 % | -22 % | **flag: engine reads too full** |
| groups.demasoni | B07 | -23 % | -21 % | **flag: engine reads too full** |
| groups.grazer-density | B15 | -23 % | -21 % | **flag: engine reads too full** |
| groups.sae | A11 | -24 % | -23 % | **flag: engine reads too full** |
| groups.sexed | A03 A16 | -24 % | -21 % | **flag: engine reads too full** |
| groups.syno | B08 | -24 % | -23 % | **flag: engine reads too full** |
| limits.food-not-room | B15 | -23 % | -21 % | **flag: engine reads too full** |
| space.big-class-mass | B04 | -27 % | -18 % | **flag: engine reads too full** |
| space.canonical-20 | A04 | -23 % | -22 % | **flag: engine reads too full** |
| space.chili-refit | A15 | -23 % | -22 % | **flag: engine reads too full** |
| space.community-29 | A06 | -23 % | -22 % | **flag: engine reads too full** |
| space.coolwater | A12 | -23 % | -22 % | **flag: engine reads too full** |
| space.discus-community | B06 | -21 % | -17 % | **flag: engine reads too full** |
| space.floor | A04 | -23 % | -22 % | **flag: engine reads too full** |
| space.footprint-vs-height | A05 | -23 % | -22 % | **flag: engine reads too full** |
| space.full-community | A10 | -23 % | -23 % | **flag: engine reads too full** |
| space.invert-class | A15 B16 | -23 % | -22 % | **flag: engine reads too full** |
| space.kuhli-floor-factor | A11 | -24 % | -23 % | **flag: engine reads too full** |
| space.livebearer-nano | A03 | -25 % | -20 % | **flag: engine reads too full** |
| space.livebearers | A16 | -23 % | -22 % | **flag: engine reads too full** |
| space.malawi-mix | B08 | -24 % | -23 % | **flag: engine reads too full** |
| space.mbuna-convention | B07 | -23 % | -21 % | **flag: engine reads too full** |
| space.mid-class | A11 | -24 % | -23 % | **flag: engine reads too full** |
| space.nano | A02 | -24 % | -22 % | **flag: engine reads too full** |
| space.reef-125 | C08 | -23 % | -22 % | **flag: engine reads too full** |
| space.reef-40 | C04 | -25 % | -22 % | **flag: engine reads too full** |
| space.salt-scale | C05 C08 | -23 % | -21 % | **flag: engine reads too full** |
| space.school-curve | A10 A13 | -24 % | -23 % | **flag: engine reads too full** |
| space.swordtail-refit | A16 | -23 % | -22 % | **flag: engine reads too full** |
| space.tiny-class | A14 | -23 % | -23 % | **flag: engine reads too full** |
| space.water | A04 | -23 % | -22 % | **flag: engine reads too full** |
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
| A02 | unworkable: compat high | drop nerite | yes |  |
| A03 | problems: space 131 %; group too small: cherryshrimp | fewer guppy | yes |  |
| A04 | problems: space 101 % | fewer bronzecory | yes |  |
| A06 | unworkable: compat high | drop nerite | yes |  |
| A07 | unworkable: compat high | drop betta | yes |  |
| A08 | problems: space 122 % | fewer sterbai | yes |  |
| A09 | unworkable: tankmin red: angel; temperature none | bigger | yes |  |
| A10 | unworkable: temperature single | drop | yes |  |
| A11 | unworkable: compat high; temperature single | drop sae | yes |  |
| A12 | caution: space 99 %; tankmin yellow: danio; temperature narrow | fewer danio | yes |  |
| A13 | problems: space 142 % | fewer neon | yes |  |
| A14 | unworkable: compat high | drop kuhli | yes |  |
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
| A02 | no | Neon tetra with Nerite snail (zebra): water chemistry: pH 5.0-7.0 against its 7.0-8.5 (Nerite snail (zebra)); temperature narrow | caution | chemistry, temperature | chemistry, temperature | **flag** |
| A03 | caution | temperature narrow | yes | temperature | - | **flag** |
| A06 | no | Harlequin rasbora with Nerite snail (zebra): water chemistry: pH 5.0-7.0 against its 7.0-8.5 (Nerite snail (zebra)); temperature narrow | caution | chemistry, temperature | chemistry, temperature | **flag** |
| A07 | no | Tiger barb with Betta: would harass its long fins | caution | nip | nip | **flag** |
| A08 | caution | Angelfish breeding pair defends much of this floor (648 sq in): tankmates need caves and sight breaks elsewhere; temperature narrow | yes | aggression, temperature | - | **flag** |
| A09 | no | Angelfish breeding pair defends much of this floor (624 sq in): tankmates need caves and sight breaks elsewhere; temperature none | caution | aggression, temperature | aggression, temperature | **flag** |
| A14 | no | Kuhli loach with Pygmy corydoras: water chemistry: pH 5.5-6.5 against its 6.4-7.4; temperature narrow | caution | chemistry, temperature | chemistry, temperature | **flag** |
| A15 | caution | temperature narrow | yes | temperature | - | **flag** |
| B02 | caution | temperature narrow | yes | temperature | - | **flag** |
| B04 | caution | temperature narrow | yes | temperature | - | **flag** |
| B06 | no | temperature narrow | caution | temperature | temperature | **flag** |
| B07 | caution | temperature narrow | yes | temperature | - | **flag** |
| B09 | no | Neon tetra with Yellow lab cichlid: water chemistry: pH 5.0-7.0 against its 7.6-8.6; Neon tetra with Yellow lab cichlid: water hardness: GH 1-10 against its 10-20; temperature narrow | caution | chemistry, temperature | chemistry, temperature | **flag** |
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

- verdict compat.coolwater-mates: milder (1 of 1 tanks)
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
- count compat.temperature-warm: engine too full (-17 %)
- count golden.discus-85: engine too full (-19 %)
- count groups.chromis: engine too full (-22 %)
- count groups.demasoni: engine too full (-21 %)
- count groups.grazer-density: engine too full (-21 %)
- count groups.sae: engine too full (-23 %)
- count groups.sexed: engine too full (-21 %)
- count groups.syno: engine too full (-23 %)
- count limits.food-not-room: engine too full (-21 %)
- count space.big-class-mass: engine too full (-18 %)
- count space.canonical-20: engine too full (-22 %)
- count space.chili-refit: engine too full (-22 %)
- count space.community-29: engine too full (-22 %)
- count space.coolwater: engine too full (-22 %)
- count space.discus-community: engine too full (-17 %)
- count space.floor: engine too full (-22 %)
- count space.footprint-vs-height: engine too full (-22 %)
- count space.full-community: engine too full (-23 %)
- count space.invert-class: engine too full (-22 %)
- count space.kuhli-floor-factor: engine too full (-23 %)
- count space.livebearer-nano: engine too full (-20 %)
- count space.livebearers: engine too full (-22 %)
- count space.malawi-mix: engine too full (-23 %)
- count space.mbuna-convention: engine too full (-21 %)
- count space.mid-class: engine too full (-23 %)
- count space.nano: engine too full (-22 %)
- count space.reef-125: engine too full (-22 %)
- count space.reef-40: engine too full (-22 %)
- count space.salt-scale: engine too full (-21 %)
- count space.school-curve: engine too full (-23 %)
- count space.swordtail-refit: engine too full (-22 %)
- count space.tiny-class: engine too full (-23 %)
- count space.water: engine too full (-22 %)
- count space.water-small: engine too full (-22 %)
- count tankmin.angel-height: engine too full (-23 %)
- count tankmin.coralbeauty: engine too full (-22 %)
- count tankmin.coralbeauty-width: engine too full (-20 %)
- count tankmin.demasoni-width: engine too full (-21 %)
- count tankmin.sixline: engine too full (-23 %)
- compat A02: milder (app no, experts caution)
- compat A03: milder (app caution, experts yes)
- compat A06: milder (app no, experts caution)
- compat A07: milder (app no, experts caution)
- compat A08: milder (app caution, experts yes)
- compat A09: milder (app no, experts caution)
- compat A14: milder (app no, experts caution)
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
