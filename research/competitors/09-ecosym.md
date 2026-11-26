# 09. EcoSym (web)
Researched 2026-11-25. Confidence: low (product found and described from its own pages; no user feedback found anywhere).

## Snapshot
- URL: https://ecosym.io/ . Tagline "Plan your aquarium". No maker or company is named on the home page or docs (https://ecosym.io/, https://ecosym.io/docs).
- Platform: browser only. Price: not stated (no pricing page seen; unclear if free). Last update or version: none shown.
- Audience size: unknown. Web searches for "ecosym.io", "EcoSym" plus aquarium, simulator or Reddit returned nothing about it. No Reddit, forum, YouTube, Product Hunt or app-store traces found. The only feedback route is a "Submit feedback" email link in the footer (https://ecosym.io/).
- Do not confuse with EcoSystem Aquarium (Miracle Mud, filtration products): https://www.marinedepot.com/EcoSystem_Aquarium-EC-vd.html

## What it does
From https://ecosym.io/ and https://ecosym.io/docs:
- Stocking Planner: pick a tank size, see which fish and inverts fit, using shared water chemistry, species compatibility and bioload. Data is built on The Fishkeeping Network and The Aquarium Wiki.
- Ecosystem Simulator: enter water, substrate, plants, filter, lighting etc.; it models whether and roughly when the tank cycles and how parameters drift under water-change and maintenance schedules. Adapted from lake models AED2 and CAEDYM (partitioned ODE solver).
- Models producers (plants, algae), bacteria, nutrient cycling, then grazers, predators, detritivores. Advanced bits: Droop quotas, anoxic substrate chemistry, heavy-metal chelation, allelopathy against algae.
- Optional maintenance inputs (water changes, dosing, trimming); results as graphs plus a visual tank rendering; CSV download, duplicate a run, side-by-side run comparison.
- "Tank Challenges": short game levels (fix a tank problem, keep every animal alive, stay under budget).
- Extensive science docs and a parameter-reference page listing constant sources.
- Self-stated limits: cannot capture random factors (which microbes arrive, exact water minerals, animal behavior); aims for realistic qualitative dynamics, not exact timing or magnitude (https://ecosym.io/docs).

## What users love
Nothing found. No sourced user praise exists that I could locate.

## Complaints and weak spots
No user complaints found. Weak spots visible from its own pages only:
- Anonymous maker, no pricing, no dates or changelog: hard to judge whether it is maintained (https://ecosym.io/).
- Results are explicitly qualitative; the maker says exact timing is not predicted (https://ecosym.io/docs).
- Heavy on inputs and science; likely a steep learning curve for casual hobbyists (inference from the docs page, not user-reported).
- Stocking data comes from two public wikis; no real product catalogue, prices, or gear brands mentioned.

## What users wish it had
Nothing found.

## vs YourArium
- They have, we lack: a water-chemistry / nitrogen-cycle simulation over time (cycle timing, parameter drift under water changes), run comparison with CSV export, game-style challenges. Note our brief puts cycling schedules out of scope.
- We have, they lack: a 3D tank you orbit with real gear and animated fish, tank catalogue, calibrated stocking engine with outgrow-in-N-months, herps/terrariums, marine/reef, prices and deals, guided setup, scape generator, split compare, printable report.
- Ideas worth taking (ranked):
  1. A lightweight "will this tank be stable" indicator tied to filtration and plant mass, only if it can stay honest (low priority; chatbots cover cycling advice).
  2. Show data provenance for stocking numbers (their parameter-reference page builds trust).
  3. Compare two runs over time, a natural fit for our growth timeline.
- Threat level: low. Tiny, anonymous, no traction found, different niche (simulation rather than visual design and shopping).
