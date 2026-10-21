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
- Depth: a few species should get HARDCODED minimum water depths (tall-bodied fish such as angelfish and discus, vertical midwater
  species, anything the shallow-tray case would wrongly pass). A short override list, not a field researched for all 84 species.
- Wants US units in every chat reply (gallons, inches, sq in, deg F).

## What exists now (build 1047)
- One evaluation, `src/scene/tankMin.ts` (`speciesMinimum`, `measureMinimum`, `tankMinimum`, `minFit`), read by the Fullness tile,
  `tankfit.ts` (More room list, tank choice), `whyAnimal`, hard truths, demand warnings, swaps, starter stocking. Percent is the largest
  of: water x weight, floor area x weight, length x weight, stated width x 1. Weights by habitat (`MIN_WEIGHTS`) are my estimates.
- Per-species data: `CARE.minL` (litres, all 84), `minLengthMm` (all 84, many marked estimate in `research/groups-sources.md`),
  `minAreaCm2` (swordtail only: 120 x 30 cm "or equivalent", Seriously Fish), `minWidthMm` (nobody), `TIERS` floor/comfort (7 species).
- Floor area is otherwise ESTIMATED from litres: spread over 30 cm (11.8 in) of water up to 80 L (21 gal), ramping to 50 cm (19.7 in)
  at 400 L (106 gal) and up (aca371a, `refDepthCm`). Bottom dwellers ignore stored length (weight 0).
- bb778da (build 1053): the mystery snail's volume-only flag was never applied (extra argument ignored, broke tsc); now wired.
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

## Decisions (2026-10-21, chat S165; Nathan worked them through with ChatGPT and relayed its answers)
Overall rule: a hard minimum needs defensible evidence; an estimate can inform a recommendation or advisory but never silently becomes
a failure. Each measure is held on its own (no surplus covers a shortfall); filtration, volume and height never rescue geometry.
1. **What 100 % promises:** the lowest WELL-SUPPORTED minimum (not lowest published), for a full-grown animal in a viable group, after
   normalizing sources (adult vs juvenile, group size, conditions). Above it an OPTIONAL "Recommended" mark with its own justification
   (a stricter source or a stated judgement); never invented to fill the display, never called "comfortable". The amber "cramped" note
   becomes "below the recommended size". Animals past the viable group raise crowding, not the enclosure minimum.
2. **Volume:** advisory only for the enclosure check (a "small volume, swings fast" note + difficulty). It can never fail a species on
   its own. Unsafe conditions are failed by the environmental model (Filtration bar = ammonia the filter cannot process). Open gap: say
   "unmaintainable" when the weekly water change hits its 50 % cap. Species volume figures stay visible as husbandry guidance
   (mystery snail 5 gal = its Recommended mark).
3. **Measures by class:** classes only choose which measures to look for; species' sourced values populate them.
   Swimmers / shoalers: length req. Bottom dwellers: floor area req + length / width where a source states them (30 x 12 vs 60 x 6 in).
   Large-bodied: length + width req. Tall-bodied: length + depth. Territorial / sedentary: footprint. Surface access (labyrinth, lid
   gap) is a per-species flag, not a class; betta and gourami differ by their own data. Amphibians: floor area. Invertebrates: no
   invented grazing-area minimum, clearance only. Every species: a turning-clearance DIAGNOSTIC (shortest floor side >= adult length),
   not a gate until the 84-species sweep + extreme shapes show it is defensible (eel-shaped fish are the likely false positives).
   Maximum depth (ADF) is a species advisory, with the count picker. Kuhli in 2 in of water: not assessed (open question), not a pass.
4. **Depth field:** a source stating a minimum WATER depth = required, can fail. A source recommending tank height = Recommended mark.
   Morphology-only (angelfish, discus) = estimated advisory, never a failure. List starts there; the sourcing pass adds others.
   Usable depth = water level minus substrate; 90 % of height only as a labelled fallback.
5. **Sources:** rank by credibility, then applicability, then specificity (footprint with stated group > length > gallons), not by site.
   One credible applicable source is enough ("single source"); unstated conditions = (est). Conflicts over ~25 %, or any that flip a
   pass / fail, go to research/sourcing/decisions.md. Never average; reconcile each measure on its own. Gallon figures may be converted
   to geometry via a reference tank (ideally the catalogue tank of that volume) by class, marked DERIVED (est) with the volume, url,
   reference tank and logic kept; a derived failure reads differently from a sourced one; one gallon figure never yields several hard
   requirements. Provenance: sourced / derived (est) / advisory.
6. **Stocking (Space bar):** keep the per-litre heuristic for now, label it "Estimated stocking level", and AUDIT it: 15 cory + 5 danio
   vs 5 + 15 in a 40 breeder; 20 long vs 20 high; tall-narrow vs shallow-wide; same floor, different height; more height, same floor;
   more fish past the viable group. Long-term goal: Space measures usable habitat and crowding (bottom habitat for bottom dwellers,
   horizontal run for swimmers, height only where it helps), distinct from filtration and stability. No new per-animal footprint
   coefficients without evidence; document the limits rather than hide them.

## Suggested approach
- Write the principles first (a page: what each measure means, which species class uses which), get Nathan's yes.
- Then a research pass for footprints by species, in batches. Measure one batch's cost and quote it before fanning out (Sonnet
  subagents only, per CLAUDE.md); keep sources and the est / sourced flag.
- Then migrate: drop volume from bottom dwellers' minimum, add a depth minimum, convert each litre figure to the footprint of the
  standard tank it came from where no source exists, keep volume as a stability / difficulty input only.
- Keep the invariant tests (`test/minimum.test.ts`) and add depth cases.
