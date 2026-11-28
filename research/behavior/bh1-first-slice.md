# BH1: behavior system, first slice (R208). Design only, nothing built.

Chat BH1, 2026-11-28. Inputs: `design-summary.md` (Nathan's priorities and answers win), `patterns.md` (11 species), the species digests here, and a look at what today's swim world knows (`src/render/swimField.ts`, `src/scene/swimSim.ts`, `swimHome.ts`, `fishBehavior.ts`). Pictures: `bh1/*.png` (sources `bh1/*.svg`).

## The slice in one paragraph
Five pilot species, chosen so each covers a different body and a different way of using the scape, get a new brain and body while every other species keeps today's swim code untouched. The new system has three layers: a **world map of what the scape offers** (places, surfaces, insides, food patches), a **per-fish mind** (drives plus personality pick one behavior at a time from a shared library), and a **body** (three locomotion modes on one burst / glide / pause clock, rest poses that take the shape of the surface, secondary motion). Displays (courting, dominance) sit on top as two shared encounter scripts. No species-specific code: a species is a data file written from its ethogram.

Out of scope, as Nathan set: tank events (water change, lights, keeper), day/night, breeding mechanics (eggs, fry, brood care). Colour states only where a display needs them (one tint, see decision 3).

## Pilot species (all five already have a live build-B model)
| Species | Body mode | Attaches as | Scape use it proves | Display it proves |
|---|---|---|---|---|
| Panda cory | tail swimmer, explosive start | rests belly-down | open sand, sifting snout-in, resting piles (contact), loose group | male following a female |
| Bristlenose | surface crawler | clings at any angle | glass, wood, rock, cave ceiling upside down, owned cave, grazing patches | cheek-spine fin spread, short chase and return |
| Kuhli | whole-body undulator | lies curved, drapes | roots, crevices, burying in sand, communal knots, full concealment | none (control: no aggression) |
| Peacock gudgeon | tail swimmer, hover-perch | perches | home cave, perching on rock and wood, picking | lateral display, male courting at the cave |
| Kribensis (pair) | tail swimmer, hover | hovers near cover | pair cave and territory, digging, under-wood rest | frontal threat, charge and turn back, female quiver + male fin spread |

Rummynose stays on the old sim in slice 1 as the free-water control (its school already works). Betta, angelfish, oto, Amano and nerite are slice 2: they need the leaf perch and food-field pieces proven first, and fin secondary motion for the long-finned ones.

## Layer 1: the world, what the scape offers (`bh1/02-scape-affordances.png`)
Today's swim field is a coarse distance grid where caves are solid boxes, rocks are their bounding boxes and plants are soft cylinders. That's fine for not bumping into things and useless for using them. The slice adds an **affordance map** built from the same scene data (never from meshes), once per scene change:

1. **Places**: sampled spots, each with a tag, a position, a facing, a cover score and a capacity. Tags: `cave-in`, `cave-mouth`, `overhang` (under wood or a ledge), `crevice` (narrow gap between two solids), `root-mass`, `stem-thicket`, `open-sand`, `open-gravel`, `glass`, `leaf-top`, `leaf-under`, `surface`. A fish asks "nearest `cave-mouth` within 300 mm with cover > 0.6, not owned" and gets an answer in microseconds (spatial hash).
2. **Surfaces at any angle**: the distance grid already gives a surface normal (its gradient), so a crawler walks the `clearance = body radius` shell with its belly along the normal. The grid is too coarse at rock and wood (5 mm+ cells, boxes), so each hardscape item also gets a **local exact shape** (oriented box with rounded edges, wood limb capsules, a cave as a hollow shell) that a crawler queries when it's within one body length. Corners and edges come for free from the rounded shapes: the nerite-style "reach across, shift over" is the normal turning through the rounding.
3. **Insides**: caves become hollow (outer shell minus inner box minus a mouth on the side the art opens); root masses, leaf litter and dense carpets become **permeable volumes** (a fish can be inside, moves at a fraction of its speed, and is hidden); soft sand becomes a **buryable layer** whose depth comes from the substrate (sand only, from `substrateTraits`, deep enough for the body).
4. **Food patches** (simple version): grazable spots on glass, wood, rock and broad leaves, each with an amount that drops while grazed and regrows over minutes; sand patches with a "sift value". No visible algae, no trails in slice 1.

What the art has to export: each cave's mouth direction and inner size (the cave art already knows it), and later each broad-leaved plant's leaf quads for perching (slice 2, see decision 4).

## Layer 2: the mind (`bh1/01-architecture.png`)
**Drives** per fish, each 0..1, rising and falling over time: *rest*, *forage*, *explore*, *company* (wants neighbours), *security* (built from nearby cover and companions; low = skittish), *air* (cory only), *social* (readiness to display, rises near a rival or a female). No hunger clock tied to feedings, no day/night.

**Behavior library** (shared; a species switches on a subset with its own tuning). Every behavior is a small script with phases *approach, do, leave*, and it names the place tags it needs:
- *travel* (to a place), *explore* (inspect a surface: approach, face it, move on), *hover*, *patrol home*.
- *rest at a place*: perch, belly-down, cling, lie curved / drape, wedge in crevice, hover under overhang, sit in cave mouth half out.
- *forage*: pick (gudgeon, krib), sift snout-in (cory, kuhli), dig head-down (kuhli, krib carrying sand), graze a surface patch (pleco), air dash (cory).
- *hide*: go inside (cave, roots, sand) and stay until security recovers.
- *group*: follow a neighbour, join a pile or knot, leave one after another.
- *display* and *encounter* scripts (below).

**Picking the next behavior**: each candidate scores *drive x personality x whether a fitting place is near*, with a bonus for staying in the current one (no flicker) and a little noise. Re-picked at the end of each behavior, or when an **override** fires: *startle* (a chasing fish, a fish bolting next to it: dart into the nearest cover of the species' escape kind, freeze, or clamp down; it spreads to neighbours), *intruder near home* (starts a dominance encounter), *air need*.

**Personality** per fish, rolled once and kept: activity, boldness, curiosity, aggression, sociability, plus a favourite rest place it returns to. Rank between fish of one species builds from encounter outcomes and is kept (the winner wins the next one more easily; the loser yields on approach).

**Home**: none (cory), shared spots (kuhli knots, cory piles: places with capacity, first come), owned (gudgeon male, krib pair, pleco male: a `cave-in`/`cave-mouth` claimed for good, with a home range radius from the species file).

## Layer 3: the body (`bh1/03-movement-cycle.png`, `bh1/04-surface-crawl.png`)
**One movement clock**: burst (1-3 tail beats, or a crawl step), glide (speed decays), pause (still, pectorals only). Each species sets the three lengths and how variable they are; the dart is the burst with no glide and no wind-up. This replaces today's steady cruise with steering, which is the biggest "doesn't look real" cause in every ethogram's "generic animation gets wrong" list.

**Three body modes**, chosen per species:
- *Tail swimmer*: today's spine bend during the burst only; body still in glide and pause, pectorals fanning in the pause.
- *Surface crawler*: the body is glued to the surface shell; it moves in steps (release, slide 0.1-0.2 body lengths, reattach, pause), turns by swinging the rear round the mouth, no tail wag while attached, mouth working while grazing and still while resting. Longer trips let go, swim a few strong strokes and reattach on the target surface.
- *Whole-body undulator*: a travelling wave down the whole spine at every speed; at rest the spine is bent to lie along what it's on (curved, sideways, draped), not straightened.

**Rest poses that fit the surface**: the pose solver takes the place's surface normal and shape and sets body roll / pitch / spine curve so the belly meets it (cling upside down under wood, lie along a root, perch level on a rock top, belly in the sand, cory pile with bodies overlapping, kuhli knot).

**Secondary motion** (slice 1 only what the pilots need): pectoral fanning in pauses, barbels for cory and kuhli (rigid with the head is acceptable for now), the pleco's mouth. Fin trailing for long fins waits for slice 2 (betta, angel).

## Displays on top (`bh1/05-displays.png`)
Two shared encounter scripts, each a short sequence of poses on the same body, with per-species pose choices from the shared repertoire (lateral display, frontal threat, fin spread, quiver, colour-up):

**Dominance** (rival = same species, same sex, or the species' intruder class, e.g. kribs charge bottom fish and ignore tetras overhead):
approach -> display (lateral or frontal, fins up, 1-4 s) -> the other yields, or answers with its own display -> a short charge -> **break off, return home**. Chases are capped in length; rank decides who yields next time. Pleco: fins spread, cheek spines out, a shove. Kuhli and cory: no dominance at all (they slide over each other).

**Courting** (male toward female; Nathan: no breeding mechanics):
male notices female -> follows at one body length -> colour-up and fin spread (krib female quivers and arches toward him) -> gudgeon / krib male leads toward his cave and displays at the mouth -> **she inspects the mouth and drifts off; it ends there**. No eggs, no cave occupation, no fanning. Cory: males follow a female in a short line, then the group breaks up.

## How it ships without breaking anything
- New code lives apart (`src/behavior/`), plain numbers, no three.js, testable in node like `swimSim.ts`.
- A species uses the new system only when its id is in `src/data/behaviorLive.json` (same pattern as `fishLive.json`); `?bh` turns it on for all five pilots for review. Every other fish keeps today's sim, so nothing regresses.
- One review tank (`?scene=bh1`): 30 gal, sand, one cave, one wood piece with an overhang, one rock pile with a crevice, a root mass, a sword and an anubias, the five pilots. Each step below is shown to Nathan in chat (stills plus a short screen recording per species) and approved before the next.

## Steps, each with its gate
| Step | Builds | Gate (what Nathan sees) |
|---|---|---|
| S1 | Affordance map: places, hollow caves, local exact hardscape shapes, permeable roots, sand layer. Debug overlay (`?bh&places`) draws the places as coloured dots. | Overlay screenshot of the review tank: caves, crevices, overhangs and sand marked where he'd expect them. |
| S2 | Movement clock + tail swimmer + rest poses (cory, gudgeon, krib). | Side by side, old vs new: corys scoot-and-settle, gudgeon hovers and perches, krib hovers under the wood. |
| S3 | Surface crawler (pleco) and undulator (kuhli), hiding inside caves, roots and sand. | Pleco crawls up glass, over wood, upside down in the cave; kuhli threads roots, buries, lies in a knot. |
| S4 | Mind: drives, personality, homes, startle, grouping, foraging (sift, pick, dig, graze). | A 5-minute recording of the review tank: an everyday mix, not one behavior on loop. |
| S5 | Displays: dominance and courting scripts, rank memory. | Clips: gudgeon lateral display and return, krib charge-and-turn, pleco cheek spines, krib quiver, cory following. |
| S6 | `behaviorLive.json` turned on for the approved pilots; the species file template written from these five. | Live check on the site. Then the onboarding ethogram step (already requested) gets its output format from this template. |

Slice 2 (proposed, not designed in detail): broad-leaf perches from plant art, fin secondary motion, betta / angel / oto / Amano / nerite, visible grazing, the old sim's free-water species moved over one archetype at a time.

## Species file (what an ethogram becomes)
One JSON per species, read by the system, written by hand for the five pilots and from the ethogram prompt later. Sketch for the panda cory:
```json
{
  "body": "tail", "attach": "bottom",
  "clock": { "burst": [0.15, 0.4], "glide": [0.2, 0.6], "pause": [2, 12], "explosive": true },
  "rest": [ ["belly-sand", 6], ["belly-pile", 4], ["leaf-top", 1] ],
  "cohesion": { "strength": 0.5, "contact": true, "leaveInTurn": true },
  "home": "none",
  "forage": [ ["sift", 8], ["pick", 2] ],
  "escape": "scatter-then-freeze",
  "air": { "every": [600, 1800] },
  "displays": { "dominance": null, "courting": "follow-line" }
}
```
Numbers are judgement tuned on screen, not measurements (every ethogram says the measurements don't exist).

## Decisions for Nathan
1. **Pilots**: the five above (cory, pleco, kuhli, gudgeon, krib pair), rummynose left on the old sim as the control. OK, or swap one?
2. **Rollout**: per species on `behaviorLive.json` after his approval (recommended), or one switch for the whole tank once all five pass?
3. **Colour-up in displays**: one tint on the existing fish texture (male brightens while displaying, about 1 s in and out) in S5, or leave colour out of slice 1?
4. **Leaf perching** (betta on a leaf, oto on top of a leaf, kuhli draped): needs each broad-leaved plant's leaves exported as perch quads. Slice 2 as proposed, or pull it into slice 1 (adds a step, touches the plant code another lane may own)?
