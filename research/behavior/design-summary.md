# Behavior system: design summary from 6 species (R208)

Status: **research summary for Nathan to react to. Nothing built.** Source: the six ethograms in this folder (peacock gudgeon, panda cory, kribensis, bristlenose, rummynose, kuhli) and `patterns.md`. Per Nathan 2026-11-28, the new system is designed from these patterns, not fitted to the old swim code.

## Nathan's priorities (2026-11-28) — these override the block list below
- **High:** what the animals do in general (their everyday behavior mix); **interaction with substrate, plants, caves and hardscape**; **realism of movement**.
- **Out of scope:** tank events (water change, lights, keeper movement: "this is the kind of stuff I dont really care about"), day vs night behavior, breeding.
- So blocks 4 (darkness part), 8 (tank events), 9 and 11 are dropped. Colour states (10) are low priority, kept only where they show stress.

## The main finding
Six very different fish (a hopper, a sand-sifter, a territorial cichlid pair, a surface crawler, a schooler, a burrower) need **no species-specific code**. Each is a different selection and tuning of about ten shared building blocks. New species become data: an ethogram (the prompt), then a choice of blocks and settings.

## The building blocks
1. **Movement cycle**: burst, glide, pause, with per-species lengths and body mechanics. Body modes: tail-driven swimmer (tetra, krib, gudgeon, cory), surface crawler (pleco), whole-body undulator (kuhli). Starts can be explosive with no wind-up (cory, pleco, all startles).
2. **Rest posture**: hovers in mid water (tetra), hovers near cover (krib), perches (gudgeon), belly on the bottom (cory), clings at any angle (pleco), lies curved, sideways or draped (kuhli). Clingers and lie-down fish take the shape and angle of the surface under them, not of gravity.
3. **Cohesion scale**: one set of neighbor rules (line up, keep spacing, rejoin, copy a neighbor's move), turned from strong (tetra school) through loose (gudgeon, cory, kuhli) to pair (krib) and none (pleco). No leaders: moves pass from fish to fish. A per-species **contact** setting: corys and kuhlis pile up and slide over each other, others keep spacing.
4. **Context changes cohesion**: danger tightens, comfort loosens, feeding breaks it up, darkness dissolves schooling.
5. **Home**: none (tetra, cory) / shared resting spots (kuhli, cory piles) / owned and defended (gudgeon male, krib pair, pleco male), with a range that grows in breeding mode.
6. **Defend and return**: proximity-triggered display or charge, breaks off and returns home. Who counts as an intruder is per species (kribs ignore tetras passing overhead and charge bottom fish).
7. **Drives pick the next behavior**: hunger, rest, company, security, air (cory), breeding readiness. **Security** builds up from cover and companions and is the boldness setting (small groups and bare tanks make fish skittish).
8. **Override triggers**: threat (startle: bolt to cover, freeze, clamp down or bury, and it spreads to neighbors), food (feeding mode, with anticipation when the keeper moves), air need (the cory dash), an intruder near home, **tank events** (lights off and on, water change, which sets off the kuhli dance).
9. **Day/night curve per species**: plecos and kuhlis come out at night, corys pick up at dusk, tetras disperse and hover at night, kribs rest in cover.
10. **Colour states**: night fading (tetra nose), stress fading or mottling (tetra, pleco, krib), courtship colour (gudgeon, krib).
11. **Breeding mode** (later): changes territory, aggression, cave use and colour; cave brood care (fanning plus guarding) is one shared behavior with per-species roles.

## What the world has to offer the fish (the new requirements)
- **Places as destinations**: home cave, cover, open sand, the surface, glass, a current, a feeding spot.
- **Surfaces with angles** (glass, wood, rock, leaves, cave ceilings) that clingers can walk on and that drapers and perchers can rest on.
- **Spaces fish can go inside and disappear into**: caves, crevices, root masses, leaf litter, soft sand (burrowing, needs a substrate type). Fish can be fully hidden.
- **Tank events** the fish can react to: lights, feeding, water changes.

## Decisions for Nathan (updated after his priorities)
Settled: no tank events, no day/night, no breeding.
1. **First slice**, suggested from his priorities: (a) **realistic movement**: the burst / glide / pause cycle per species, the three body modes (tail swimmer, surface crawler, whole-body undulator), explosive starts, real stillness at rest; (b) **interaction with the scape**: places as destinations (caves, cover, plants, open sand, hardscape surfaces), rest postures that use them (perch, lie on sand, cling at any angle, drape over a leaf, wedge in a crevice), substrate foraging (pick, sift, dig head-down), going into caves, roots and sand. Cohesion and home come with it because they decide where fish go.
2. **Hidden fish:** a kuhli in the roots or a pleco in its cave can be fully out of sight. Show a hint (a tail tip sticking out, a "3 hiding" label), or keep it real?
3. **More species first?** Candidates that might add a new scape interaction: betta (rests on leaves near the surface), otocinclus (grazes on leaves and glass in groups), a shrimp or snail (invertebrates walking on everything), angelfish (tall, weaves between stems).
4. **Onboarding:** add the ethogram prompt to the new-species procedure now, or after the design is settled?
