# Feature ideas from other aquarium tools (2026-10-15)

Three Sonnet research agents covered three areas: hardscape and design tools, stocking and compatibility tools, and sims and planner apps.
Their full notes are in `research-hardscape.md`, `research-stocking.md` and `research-sims.md`. The searches were thin and full
of spam mirrors. Many app claims come from search snippets only and have not been checked. Before acting on an idea, check its source tool.
"Not in src" means a grep of `src/` found nothing for it.

## Closest competitors
- **Aquascape** (github.com/joebarbere/aquascape, MIT, three.js PWA + Electron). It has a 2D editor, a 3D view, a substrate
  profile curve, a 0-52 week growth slider, stocking rules with reasons, real LED specs, a nitrogen-cycle sim and a setup-sheet export.
  This is the nearest peer. Clone it and look at it before designing any of the ideas below.
- **Behind Glass: Aquarium Simulator** (Steam, 1.0 Jan 2025, ~$15). It has a Designer sandbox and a Simulator with temperature, pH, flow,
  O2 and salinity, plus 260-280 species.
- **Aquarium Planner AR** (iOS, $1.99). It has AR walk-around, procedural rock, LED blue/white ratio, side-by-side design compare
  and glass thickness.
- No tool found combines a browser 3D designer, light coverage, a stocking check and AR. There is no reef-specific 3D planner
  and no paludarium or vivarium planner (hobbyists use SketchUp).

## Ranked ideas (value, rough effort)
1. **Shopping list / setup sheet.** Substrate bags from the actual slope, rock and wood count and weight, plants, fixture,
   water volume and total mass, as a printable or exportable list. `scene/weight.ts` already computes the substrate mass, so the
   bag count is a small step from there. Sources: D-D Aquarium Builder (priced list), Aquascape (sheet). *Small.* Not in src.
2. **A reason and a fix on every stocking warning**, rated Compatible / Caution / Not for each pair of species. The three-level pair rating
   also gives salt tanks a check without needing a bioload model (Lane H left salt off). Sources: App-aquatic, Saltwater Aquarium
   Blog, Live Aquaria. *Small to medium.*
3. **Reef-safe / invert-safe / coral-safe flags**, graded rather than yes/no, plus an "undersized tank" flag per species and a
   "suitable species only" filter in the picker. Sources: Saltwater Blog, AqAdvisor. *Small, mostly data.* Not in src.
4. **Day/night photoperiod slider** with sunrise and sunset ramps that drive the existing light rendering. It could also
   feed the planned GR3 timeline. Sources: Chihiros, Fluval and Dream Aquarium. *Small to medium.* Not in src.
5. **Plant demand against the tank's light**: show low/med/high light and CO2 demand per plant next to the PAR the tank actually
   gets, and warn about shaded plants. Source: Tropica's plant fields. This pairs with the light map and GR3. *Small to medium.*
6. **Rule-of-thirds / golden-ratio overlay** on the front view. No tool does this, so it would be distinctive and cheap. *Small.* Not in src.
7. **Equipment sizing and placement**: filter turnover %, heater wattage, and powerhead / overflow placement with flow arrows.
   Sources: AqAdvisor (filters derated to 65%), Aquarimate, Aquarium Planner AR. *Small for the maths, medium for placement.* Not in src.
8. **Named layout variants**, compared side by side, plus high-res PNG export. Sources: Aquarium Planner AR and Aquascape. *Medium.*
9. **Juvenile vs adult stocking check**: run the check at the fish's current size and at adult size. Items already carry a
   custom length (`scene/types.ts`). Source: AqAdvisor. *Small.*
10. **Time-based simulation** on the timeline: the nitrogen cycle with a "safe to stock" coach, and algae driven by light, nutrients
   and plant mass, shown in 3D. Sources: Biotope, Behind Glass, Aquarium Manager. *Large.* This is the biggest gap in the
   field, but it would change what the tool is.

Lower priority: a follow-a-fish camera, a photo overlay for tracing real stones, user templates, land/water zone readouts
for paludariums (an open niche), flow particles and dead zones, and a community gallery (needs a backend).

## Species data licences
There is no open aquarium-care dataset (temperament, temp/pH, tank size). Seriously Fish, AqAdvisor and the Saltwater Blog data are
not openly licensed. FishBase and SeaLifeBase are CC BY-NC: use them only for size and temperature ranges, with attribution, and
only while the project stays non-commercial. WoRMS text is CC BY. FISHMORPH (morphology) is CC BY 4.0. Hand-curate the care fields.

## Added 2026-10-16 (Nathan)
- **"Show Expected Plant Outcomes" toggle + light/tech warning.** Warn when a plant's light/CO2/tech tier is below what the species
  needs. If the user keeps it anyway, and the toggle is on, render the plant as it would really look at that tier (leggy, stretched,
  pale, smaller leaves, melted, compact vs. lush, red vs. green tint), since many plants survive in very different setups but look
  very different. Needs per-species tier-to-appearance params (color, internode stretch, leaf scale, density) feeding `plant3d.ts`,
  and a tank tech tier (light + CO2 + ferts) in the scene. Ties into the plant-advice and growth lanes.
  **Refinement (Nathan, same day):** two messages per species, not one. Hardy plants that live fine across tiers get no warning, only a
  soft recommendation ("thrives best at X, but will live fine in your current setup"). Only plants that really struggle below their
  minimum get a true warning ("this plant will struggle at this level"), and only those change appearance when the toggle is on.
  So each species needs an ideal tier, a minimum survivable tier, and a "struggles below" tier.
