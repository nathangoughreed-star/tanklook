# Tank minimum and stocking from first principles (brief, 2026-10-21)

Written for a fresh session. Nathan wants stocking and minimum-tank-size rethought from the ground up: what the numbers mean, the
fundamentals, what works and what does not. Not a patch of the current weights.

## What Nathan has said (2026-10-20/21)
- "Volume recommendations" ("a kuhli needs 21 gal") are a crude shorthand for length and floor area. A kuhli loach would thrive for life
  in a 36" x 20" tray with 2" of water. Length and floor area do not lie; interrogate every volume claim.
- Extra volume, apart from looks, changes mainly stability (dilution of waste, temperature swings), which lowers risk and difficulty. It
  should not raise or lower whether the animal has enough room.
- Wants the AqAdvisor shape: say nothing when every species has its minimum; otherwise name the species and the unmet measure; plus an
  amber "cramped" note. (Built, build 1047.)
- Wants US units in every chat reply (gallons, inches, sq in, deg F).

## What exists now (build 1047)
- One evaluation, `src/scene/tankMin.ts` (`speciesMinimum`, `measureMinimum`, `tankMinimum`, `minFit`), read by the Fullness tile,
  `tankfit.ts` (More room list, tank choice), `whyAnimal`, hard truths, demand warnings, swaps, starter stocking. Percent is the largest
  of: water x weight, floor area x weight, length x weight, stated width x 1. Weights by habitat (`MIN_WEIGHTS`) are my estimates.
- Per-species data: `CARE.minL` (litres, all 84), `minLengthMm` (all 84, many marked estimate in `research/groups-sources.md`),
  `minAreaCm2` (swordtail only: 120 x 30 cm "or equivalent", Seriously Fish), `minWidthMm` (nobody), `TIERS` floor/comfort (7 species).
- Floor area is otherwise ESTIMATED as litres over 30 cm of water. Bottom dwellers ignore stored length (weight 0).
- Known conflict: swordtail length is 80 cm in FishBase and 120 x 30 cm in Seriously Fish (equivalent shapes allowed).
- Known data doubts: kuhli loach 80 L / 24" (source page never fetched, "est"); cleaner shrimp and royal gramma have no footprint
  sources found (Seriously Fish has no gramma page; shrimp sources disagree 10-40 gal).
- The clownfish nano example's locked risk moved 6.326 -> 6.998 because of the cleaner shrimp's estimated floor area.

## Questions to settle first (policy, then data)
1. What does 100% promise: the strictest source, the most lenient, or a "minimum acceptable" / "recommended" pair? (TIERS already has
   floor / comfort for 7 species.)
2. What is each measure FOR? Length: swimming run and turning. Width: turning room for big or long bodies. Floor area: territory,
   bottom-dweller space, surface gas exchange (surface area, not volume). Depth: coverage, vertical movement (tall-bodied fish,
   midwater species). Volume: dilution and stability only, which the Space and Filtration bars already model; do not count it twice.
3. Which species classes need which measures: active schooling swimmers, bottom dwellers, large-bodied fish, sedentary or ambush
   species, surface fish, anabantoids, aquatic amphibians, invertebrates (shrimp, snails), semi-aquatic / paludarium.
4. A water-depth minimum field does not exist yet; needed for the shallow-tray case (kuhli at 2") and for tall-bodied fish.
5. Source hierarchy for conflicts (Seriously Fish, FishBase, Aquarium Co-Op, keeper consensus) and how each value is marked
   (sourced / estimated) in `provenance.ts`.
6. Whether stocking density (count of animals) should also move from litres to floor area for bottom dwellers and to length for
   swimmers, or stay a volume / bioload model (it reads `stockingOf`, nitrogen budget).

## Suggested approach
- Write the principles first (a page: what each measure means, which species class uses which), get Nathan's yes.
- Then a research pass for footprints by species, in batches. Measure one batch's cost and quote it before fanning out (Sonnet
  subagents only, per CLAUDE.md); keep sources and the est / sourced flag.
- Then migrate: drop volume from bottom dwellers' minimum, add a depth minimum, convert each litre figure to the footprint of the
  standard tank it came from where no source exists, keep volume as a stability / difficulty input only.
- Keep the invariant tests (`test/minimum.test.ts`) and add depth cases.
