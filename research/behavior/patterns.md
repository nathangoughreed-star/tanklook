# Behavior patterns across species (R208, running synthesis)

Species so far: peacock gudgeon (`peacockgudgeon.md`), panda cory (`pandacory.md`), kribensis (`kribensis.md`), bristlenose pleco (`bristlenose.md`). Still to come: rummynose tetra, kuhli loach. Research only: the new behavior system gets designed from this list, not fitted to `swimTypes.ts` (Nathan 2026-11-28).

## Shared by every species so far
- **Stop-go, not cruising.** Short purposeful moves, then pauses (a hover or a settle). None of the three is a continuous cruiser.
- **Dart to cover when startled**, then hide until it calms down.
- **Feeding mode.** Food goes in, activity jumps, fish leave their usual spots, then go back.
- **Investigate objects.** Approach a surface, inspect it, move on.
- **More cover means bolder.**
- **Stress = normal behaviors becoming more frequent or intense** (hiding, darting, surface trips, colour loss), not brand-new behaviors.
- **Breeding is a mode that changes everything** (territory, cave use, aggression, movement).

## Strengthened by the bristlenose (4 species)
- **Home anchor plus defend-and-return** now covers 3 of 4 (gudgeon male, krib pair, pleco male). Only the cory has no home.
- **Brood care in a cave** (fanning plus guarding) is in 3 of 4: one shared behavior with per-species roles (male only for gudgeon and pleco, split roles for krib).
- **Explosive start, no wind-up** when startled or starting off (cory, pleco). The krib's escape dart is also "explosive".
- **Day/night activity differs by species**: pleco much more active after dark, cory more active at dusk, krib and gudgeon by day. So each species needs its own activity curve over the day.
- **Startle has alternatives**: bolt to cover (all), freeze (cory), clamp down tight (pleco).

## New axis from the bristlenose
- **How it attaches to the world: free swimmer / rests on the bottom / clings to surfaces.** For a clinger, the surface (glass, wood, rock, a leaf, a cave ceiling) sets its orientation, not gravity. That's the biggest new requirement so far: the system has to know the surfaces in the scene and their angles, not only open water and the floor.

## Axes along which species differ (the candidate per-species settings)
| Axis | Gudgeon | Panda cory | Kribensis | Bristlenose |
|---|---|---|---|---|
| Rest posture | perches on the bottom or hardscape, or hovers low | belly on the substrate, truly still | hovers near cover (never belly-down) | stuck to any surface at any angle, in a cave, wedged, or flat on the bottom |
| Home anchor | male: a cave he keeps returning to | none | the pair's cave + territory | mature male: an owned cave |
| Home range | close to the cave | whole bottom | one section of the tank, much bigger when breeding | cave plus nearby grazing surfaces |
| Group shape | loose aggregation, keeps spacing | clusters, touching is fine | bonded pair | solitary (ignores others, no following) |
| Aggression | defends the cave when approached, short chase, returns | none (yields) | proximity-triggered charge, turns back; longer chases when breeding | shoves at food, short chase and return, male cave fights with cheek spines |
| Feeding | picks single items, strikes at moving prey | sifts sand, snout buried | picks at the substrate and spits sand + intercepts sinking food | rasps surfaces (algae, wood biofilm, wafers, vegetables) |
| Special | lateral display | air dash, glass and current swimming | digging, female quiver, fry herding and signals | crawls on surfaces with the surface setting its orientation, upside down, backs out of caves |
| Parental care | male guards and fans eggs | none, eats eggs | both parents, split roles | male fans and guards eggs in the cave |

## Structure suggested independently by the answers
1. A **library of shared behaviors** (rest, settle, scoot, hover, pivot, investigate, forage-pick, forage-sift, dart-to-cover, follow, display, chase-and-return, guard, dig, air dash ...), each species switching on a subset with its own tuning.
2. **Drives** per fish (hunger, rest, wanting company, air, breeding readiness) pick the next behavior.
3. **Triggers that override** the current behavior: a threat (escape), food (feeding), air need (dash), an intruder near home (chase-and-return).
4. **Nearby fish influence the switches**: corys get up when companions do; the pair stays loosely together.
5. **Places matter as destinations**: home cave, cover, open sand, the surface, glass, a current.
6. **State changes the settings**: breeding grows the territory, raises aggression and adds cave occupation.
