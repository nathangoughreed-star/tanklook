# Answer 7: how TankLook animals should behave, and how that should show

Fable, 2026-11-25. Answers `7-aliveness-brief.md`. Read: the brief, all six contact sheets, `swimSim.ts`, `swimTypes.ts`, `fishBehavior.ts`, `swimHome.ts`, `roam.ts`, `build.ts` (spec assembly), `care.ts` (fields), `species.ts` (look rows), the "not built" list in `fish-habits.md`. Not read: `animalfit.ts` beyond its exports, `crawlSim.ts`, the competitor files (taken from the brief).

## The recommendation in one paragraph

Keep the class-by-data model you already have and stop widening it: solo motion is mostly done. What is missing is **relations**: no animal reacts to another animal, to the user, or to the plan. Add a small reaction layer (give way, startle, chase, pair, guard) and drive the unfriendly reactions **from the same rules that produce the compatibility verdicts**, so the tank shows what the chips say. A well-planned tank is calm; a tank with a red chip shows the angelfish rushing the neons, and tapping the fish says why. No toy competitor can do that, and it makes aggression a planning signal instead of a mood-killer. Then surface the sim's real state as a tap label and add a thin Watch mode. Do not build per-species AI.

## Three things the evidence shows that the brief did not

1. **The "92 species on default roam" figure is mostly an artifact.** Of the uncovered rows, 65 are bare build-B look rows (`neonb`, `angelb`, `ocellarisb`...). `species.ts` keeps those out of `SPECIES`; a live fish keeps its base id (`goLive` only swaps art), so `neon` drawn as `neonb` still gets its HOVER and STYLE rows. Two more are bare new models behind `?photoart` (clownknife, bambooshark). That leaves about 13 onboarded fish with no table row: blackskirt, tigerbarb, boesemani, molly, swordtail, kadango, livingstonii, goldfish, comet, balashark, hillstream, plus oto and bristlenose (which probably cling through `cling.ts`). My count is a regex pass and may be off by a few; a 10-line script should confirm. Coverage is an afternoon of data entry, not a phase.
2. **Tall fish leave the water.** In sheets 2 and 5 an angelfish's dorsal is above the tank rim in at least three frames (t=0, t=6 s, t=24 s). The sim's body radius is `len * 0.12` (0.7 in for a 6 in angel) but the live angel is 1.38 times as tall as it is long (about 8 in). The surface clamp, the band and `pickGoal` all use the radius. One fish sticking out of the water costs more belief than any missing behavior adds.
3. **The clownfish pair is split by design.** Ocellaris has a HABIT row (`host`, leash 2.5 lengths), and `pickHomes` spreads fish over the least-used anchors, so the two take different hosts and sit on opposite sides (sheets 3, 6). Only school and shoal members share a home. `PAIR_FORMERS` (10 species) exists in `groups.ts` and is not read by the sim.

Also: the brief's "schools use only the right 60 %" rests on one seed and 30 s. A 1.5 in tetra cruises at roughly 2 in/s and spends about half its time gliding or hovering, so crossing a 36 in tank takes most of that window. Measure over 5 minutes before fixing it. The stronger finding in sheets 1 and 4 is that neons and harlequins merge into one cloud: other species get separation only, at 0.8 of the summed lengths, so nothing keeps two schools apart.

## (a) Behavior classes

Counts are of the 163 fish rows in `species.json` (about 98 real species once look rows are removed), from a regex pass over `care.ts`; treat them as approximate.

**Motion classes. All eight exist; keep them, derive defaults, keep the tables as the override.**

| Class | Examples | Steering rule | Source today | Default if no row |
|---|---|---|---|---|
| School | neon, harlequin, rummynose | tight cohesion, alignment 1, shared style switches | `group: 'school'` (21) | none needed |
| Shoal | angel, cory, molly | loose cohesion, alignment 0.35, own trips | `group: 'shoal'` (28) | none needed |
| Darter (burst and coast) | danio, tetras, rasboras | pulse, glide, small heading change | STYLE (21 to 24) | grouped and under 2.5 in: `QUICK`; grouped and 2.5 to 4 in: `SLOWER` (catches blackskirt, tigerbarb) |
| Hoverer | betta, gouramis, angel, discus | long holds, pectoral fan | HOVER (66) | `care.slow` or `feelers`: w 0.5 |
| Bottom forager / sifter / burrower | corys, loaches, kuhli | rest share, floor trips, dig or hide events | `zone: 'bottom'` + BENTHIC, DIG | bottom zone with no row: rest 0.75 |
| Home keeper (perch, hug, hover-low on a leash) | gramma, firefish, mbuna, kribs | home anchor, leash, dart, peck, patrol | HABIT (34) | `care.cover: 'cave'` or `guard`: the kribensis row |
| Surface dweller | hatchet, killies | top band | `level: 'top'` (9) | none needed |
| Clinger / grazer | oto, plecos, snails | sticks to glass, wood, rock | `cling.ts`, `crawlPace.ts` | none needed |

With those four derivation rules the real species left on plain roam should be under five (big cruisers such as balashark, goldfish, boesemani, where plain roam in a band is roughly right anyway).

**Relation rules. All new. This is the work.**

| Rule | Who | What happens | Source field | Rows it touches |
|---|---|---|---|---|
| Give way | every fish, toward any fish 2.5 times its length or more | larger separation radius and weight, so a school parts around the angel | `len` (already in the spec) | all |
| Keep schools apart | group vs group of another species | soft push between group centres when they overlap | `group` | 49 |
| Startle | everyone in a radius | schools tighten and turn together, darters run `dart`, bottom fish freeze, hoverers back off; 2 to 4 s | new shared event; HABIT `dart` already exists | all |
| Chase and flee | aggressor toward its victim | short rush (1 to 2 s, stops a length short), victim bursts away, its school startles; every 30 to 120 s | the pair rules in `animalfit.ts` (`temper` 36 rows, `nip` 5 vs `slow` 5 and `feelers`, `prey` 8) | only tanks with a flagged pair |
| Guard | home keepers with `temper >= 1` or `guard` | rush an intruder inside about half the leash, then return to post | HABIT home + `care.guard` (8) | 8 to 20 |
| Pair | pair formers, exactly two present | share one home, stay within 3 lengths | `PAIR_FORMERS` (10) | 10 |
| Under-group nerves | schoolers below `care.group` minimum | hold near cover, tighter, startle more easily | `care.group` number | 49 |
| Shy / nocturnal | pajama cardinal, kuhli, plecos | long hides by day | **new field `shy: 0..1`** | defer until sourced |
| Air gulp (R145) | corys, bettas, gouramis, kuhli, bichir | dash to the surface and back every few minutes | **new table `GULP`** | about 20 |

Rules I would not build: predator stalking or eating (a hunt with no outcome looks broken, and an outcome makes it a game), fighting damage, hunger, health, feeding.

The spec change is small: `SwimmerSpec` gains `tall` (half body height), `pairKey`, `foes?: number[]` or a per-pair matrix built in `build.ts`, and `nerves`. `SwimPose` gains `act` (a small integer for the label). The sim still never reads a species id.

## (b) Surfaces

| Surface | Verdict | Why |
|---|---|---|
| "What is it doing" label on tap or hover | **Keep, phase 2** | It is Fish Game's most praised feature and here it is nearly free: the sim already has the states (`mode`, `subMode`, `digSt`, `hS`). Words must be the sim's real state and only actions: Schooling, Swimming, Hovering, Resting, Foraging, Sifting sand, Burrowed, Hiding, At its cave, Grazing the rock, Patrolling, Startled, Chasing the neon tetras, Fleeing. |
| The "why" line under a reaction | **Keep, with the label** | When the state is a chase, guard, flee or under-group nerves, add the verdict's own sentence and a link to its chip ("angelfish eat fish under 1.5 in"). This is the planner's edge: behavior is evidence for the verdict. |
| Watch mode (R158) | **Keep, thin, phase 3** | Full screen plus a slow camera sway of a few degrees (parallax sells the 3D), hidden cursor, screen wake lock, labels still on tap. No sound yet (assets, autoplay rules, and Fish Game users disagree on what they want). No day and night cycle (it is a lighting project, and nobody asked). |
| Cover warning from `care.cover` | **Keep as is** | It already exists as advice in the fit rules; phase 1 makes it visible (a cave fish with no cave holds at the back glass). Add that sentence to the label's why line. |
| Water-level occupancy readout ("Top 0, Middle 25, Bottom 9") | **Keep, later** | Derived from `level` and `zone`, not from the sim, so it is honest. Underglass ships level-keeping as a headline feature; this is the planning version of it. Flavor text in the stocking panel, not a chip. |
| "Will hide most of the day in this scape" | **Defer** | Needs the `shy` field, which has no source yet. When it exists: a species-card sentence, never a verdict chip. |
| Tank "activity" or "use of space" score | **Drop** | A number measured from a sim whose own header says its numbers "set how often and how hard, not what is true". Showing it as a planning fact spends trust the verdicts need (see brief 6). |
| Behavior inside the Fits / Habitat / Compatible chips | **No** | Chips drive the sim, never the reverse. One source of truth: the care rules. |

Never surface: feelings (happy, stressed, bored) as sim state, health, hunger, hide-time percentages, anything that changes with the random seed, any death or injury.

One snag for the label: `roam.ts` pauses the whole sim while a fish is selected. In edit mode a frozen "Hovering" is acceptable. In Tank only and Watch mode a tap should show the label without pausing.

## (c) Build plan, ranked by aliveness per day

All phases are steering only. None adds a draw call, a particle or a per-fish raycast.

**Phase 0. Stop the three wrongs. About 1.5 days.**
- Ships: `tall` half-height used in the surface clamp, the band and `pickGoal`; pair formers share a home when exactly two are present; soft separation between groups of different species.
- Files: `swimTypes.ts`, `swimSim.ts`, `swimHome.ts`, `build.ts` (one line of spec).
- Frame cost: none (a G by G loop over a handful of groups).
- Risks: tall fish in shallow tanks get no valid goal (keep the existing "keep the old goal" fallback and test a 10 gal with an angel); pairs must not form among three or more clowns.
- Check: re-shoot sheets 2, 5, 6. No fin above the water line in 60 s; the two ocellaris within 3 lengths in every frame; neons and harlequins readable as two groups.

**Phase 1. Reactions. About 3 days. This is the smallest build that changes a first-time viewer's reaction.**
- Ships, in this order: give way to big fish (a change to `sr` and the weight in the existing separation loop, half a day, visible in every community tank every few seconds); startle (a seeded event every 1 to 3 minutes, plus a click on open water in Tank only and Watch mode, plus any chase); verdict-driven chase and flee; guard for home keepers.
- Files: `swimSim.ts` (the bulk), `swimTypes.ts`, `build.ts` (build the foe list by calling the same pair rule `animalfit.ts` uses; do not copy its thresholds), one test file.
- Frame cost: the pair loop already exists; reactions ride on it. Measure the step at 50, 200 and 500 fish before and after, alternating A and B per frame. Expect well under 1 ms at 200. The real exposure is slow devices: at 5 fps the sim runs 6 substeps per frame, so cap substeps at 3 if the measured step is over 1 ms.
- Risks: chase too frequent or too fast ruins the calm (start at one rush per aggressor per minute, tune down, never touch); startle while the user is placing things (never fire it in edit mode while something is selected or dragged); sim and chip disagreeing (prevented by sharing the rule; add a test that every flagged pair yields a foe entry and no unflagged pair does).
- Check: sheet 5's tank must show the school opening around each angel; a 20 gal with a betta and guppies must show a rush inside 2 minutes; the planted example with no angels must show zero chases in 10 minutes.

**Phase 2. Status label and why line. About 1.5 days.**
- Ships: `SwimPose.act`, a tooltip on hover (desktop) and tap (touch, Tank only, Watch), the why line with a link to the chip.
- Files: `swimSim.ts` (one write per fish), `roam.ts`, a small shell component, strings.
- Frame cost: none; one DOM node updated only when the state changes.
- Risks: label flicker on fast state changes (hold each word for at least 1.5 s); a word the sim cannot back (the list above is the whole vocabulary).
- Check: tap ten fish in the community tank; every word matches what the fish is visibly doing.

**Phase 3. Watch mode. About 1 day.**
- Ships: a Watch entry beside Full screen, camera sway, wake lock, cursor hide, Esc to leave; respects reduced-motion.
- Files: `shell/logic/fullscreen.ts`, the viewer camera, one menu item.
- Frame cost: continuous render, which roaming already forces. On battery it is the user's choice.
- Check: ten minutes unattended on a laptop and a phone; no drift out of frame, no sleep.

**Phase 4. Data pass and air gulping (R145). About 2 days.**
- Ships: the four derivation rules, rows for the 13 uncovered fish, the `GULP` table with sources, under-group nerves.
- Files: `fishBehavior.ts`, `build.ts`, `swimSim.ts` (the gulp is a short scripted trip like a habit action).
- Risk: unsourced claims; every `GULP` and `shy` row carries a source note, as the HABIT rows do.

**Phase 5. Level readout, `shy` field and its card sentence. About 1.5 days. After that: sound, day and night, feeding. None before a user asks.**

What to measure throughout: real species still on plain roam (target under 5); steering step time at 50, 200, 500 fish; share of tank length visited by each school in 5 minutes (only act if under 70 %); reactions per minute in a peaceful tank (target: give-way constantly, startle under 1, chase 0).

Order against the brief's suggested order: its step 1 (derive classes for uncovered species) drops to phase 4 because the gap is 13 fish, not 92. Its steps 2 and 3 (startle, chase) move up and merge, led by give-way, which the brief did not list and which is the cheapest visible change of all.

## (d) Verdict and risks

**Classes, not per-species AI.** The tables are already per-species tuning by data, which is the right amount. A per-species brain for 100 fish is months of work nobody can source or review, and the frames show the gap is not that a kribensis moves like a ram; it is that nothing notices anything. Classes for motion, rules for relations, a table row as the exception.

Risks, one line each:
- Realism claims without a source: reactions come only from fields the verdicts already stand on; new fields carry a source note or do not ship.
- Aggression spoiling the calm: it appears only where the plan has a flagged pair, stays short, never lands.
- A label users cannot trust: actions only, real sim state only, why line quotes the verdict.
- Sim and verdict drifting apart: one shared rule and a test.
- Phones: steering is cheap but substeps multiply at low frame rates; measure, cap at 3.
- Scope creep into a game: no feeding, hunger, health or death.

## Summary

1. Keep classes plus override tables; add a relation layer (give way, startle, chase, guard, pair) with the unfriendly reactions driven by the compatibility rules, so the tank shows what the verdict chips say.
2. Smallest build that changes a first look: phase 0 (tall fish stay under water, clown pairs stay together, schools stay separate) plus phase 1 reactions, about 4.5 days, steering only, no new draws.
3. Then the tap label with a why line (1.5 days) and a thin Watch mode (1 day); drop the sim-measured "activity" score, defer sound, day and night, and the shy field; coverage is 13 fish, not 92.
