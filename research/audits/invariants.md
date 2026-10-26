# Stocking-engine invariants (lane S244, 2026-10-26)

Tests: `test/invariants.test.ts` (22 tests, about 3 s, seeded, over every aquatic species and 300 + 80 + 60 random tanks).
**Update S245 (2026-10-26, Nathan approved): F1, F2, F3, F4 are FIXED and their tests are plain `it`; F5 is documented-intended (Nathan accepted it) and stays `it.fails` so any change shows.** Fixes: `whysAnimal` with no care entry returns "not enough information"; `stockingOf` says "Not enough information: no data for <id>" instead of "No animals in the water"; `bandOf` returns `'unknown'` with no bands (message "Not enough information: no group-size data"); `tankOptions` / `planFor` mark every size `temperature` when the animals share no range (no `need`, `problem` line names the clash). Original text follows.

Nothing in the engine was changed (at S244). A violated invariant is an `it.fails` test named FINDING Fn, so the suite is green and a fix turns
that test red ("expected to fail") until the marker is removed.

## Results

| # | Invariant | Result |
|---|-----------|--------|
| 1 | Adding an animal never lowers fullness | space / water / floor / overall hold. **Filtration does not hold when the water temperature is inferred (F5).** |
| 2 | Taller tank, same floor capacity for bottom dwellers | holds (floor identical, space within 5 %, every bottom dweller and 80 seeded mixes) |
| 3 | 4 -> 6 of a social species | holds: group band never worse (96 species with bands), spatial fullness strictly rises |
| 4 | Bonded pair vs two unpaired | holds, trivially: `stockingOf` and `planFor` have no pairing input, so occupancy cannot change |
| 5 | Missing requirements cannot confirm compatibility | temperature: holds (unknown stays unknown). **Unknown species id: F1, F2.** |
| 6 | Bad temperature not rescued by space | holds at the gate (`whysAnimal`, to 100,000 L). **Plan sheet tank list ignores it: F4.** |

## APIs that do not exist (not invented)

- There is no "social result" object. The nearest are `notesOf(pk).band` (group-size band by count only, never the tank), its
  pairing line, and `overWarn` (the fighting limit). Invariant 3 tests the band; the fighting limit is a separate warning and is
  not part of "may improve".
- Pairing is not an input to any physical number (invariant 4 therefore proves only that nothing reads it).
- Temperature has no entry in `Fit.fails` (`space | minimum | length | depth | floor | filtration | height`): it lives in
  `whysAnimal` / `rangeVerdict` / `tempLinesOf`, not in the tank verdict.

## Findings (each is an `it.fails` in the file)

**F5 (documented-intended, Nathan 2026-10-26: accepted as is). Adding an animal can lower filtration when the water temperature is not set.** With no `tech.targetC`, `capacityOf` reads the
water temperature from `climateOf(S)`, which follows the stocking, so a new species can move the modelled temperature and with it every
animal's load (`tempFactor`) and the inferred filter size. 33 of 4,422 ordered species pairs (one A, then A + one B) lower
`filtrationPercent`, e.g. 1 syno -> 1 syno + 1 harlequin (48 x 18 x 20 in): `tan` 0.2664 -> 0.2585, filtration 58.13 % -> 58.01 %;
11 boesemani + 1 merah in 71x12x16: 18.74 % -> 17.41 %. Size: 0.1 to 1.3 points in the 300-tank sample, no sign flip at 100 %
seen. With the target set (24 C / 25.5 C salt) there are 0 violations in 4,422 pairs and 300 tanks: the cause is the inferred
temperature, not the nitrogen model. Whether this is a bug or "a different animal needs a different temperature" is Nathan's call.

**F1. `whysAnimal` returns `[]` for a species with no care entry** (`if (!c) return []`), the same answer as "suits". The
catalogue has none today (`compatgates.test.ts` enforces care data), so it is latent: a new species id added half-done is read as
compatible with everything. Minimal: `whysAnimal({ ...species, id: 'nosuchfish' }, 1000, 3, [])` -> `[]`.

**F2. `stockingOf` skips an unknown species id** (`getSpecies` undefined -> `continue`): 5 animals of an unknown id read 0 %,
reason "No animals in the water." Latent for the same reason.

**F4. The plan sheet's tank verdict ignores a temperature conflict.** `planFor` for 1 axolotl (15-18 C) + 1 boesemani (26-29 C),
shared range `none`, returns `need` = 55 gal with `problem` undefined: more space produces a fitting tank. `rangeVerdict` does mark
the pair "bad" and `whysAnimal` blocks it, so the information exists, but the tank list and the `problem` line do not carry it. Whether
the tank list should is a design choice; the invariant as Nathan stated it ("cannot be rescued by excess space") holds at the gate and
fails at the tank verdict.

**F3 (latent hazard, passes today).** `bandOf(undefined, n)` and any species without bands answer `'ok'`, never "unknown". Every
aquatic species currently has bands or a group size (test asserts it), so nothing reads it wrongly yet.

## Notes on test design

- Invariants 1 and 2 pin the water temperature (and the heater row) so "everything else unchanged" is true; F5 is the unpinned case.
- Invariant 2's space check allows 5 %; the engine gives exact equality (the bottom-dweller height credit divides out), so any drift
  shows at once.
- Invariant 5's temperature case temporarily removes one species' `temp` from `CARE` and restores it in `finally`.
