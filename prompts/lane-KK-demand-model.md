Read HANDOFF.md "Start here" first, then research/plan-guided-start-kits.md IN FULL (decisions, "Demand profile", "L0 audit and
schema", "Amendments" including the cost-distribution and budget-meaning sections). You are lane KK (demand model). Worktree, branch
and port: the coordinator assigns them (../Glass-Box-demand, branch demand). Run on Sonnet; the numbers' design is the hard part, so
write your proposals to Nathan with worked examples.

Work unit: three live global readouts for the current tank, always visible in a collapsible panel on the main viewing screen:
- MONEY: setup $ and upkeep $/month. Each an EXPECTED value with a likely range (10th-90th percentile), never a bare number.
- TIME: minutes per week, a weekly average that includes everything (even yearly jobs).
- RISK: a 0-10 score shown as safe / moderate / demanding, computed for the user's declared skill PER DOMAIN
  (fundamentals + fish / planted / salt / terrarium; new / some / experienced; unset = new).
The user may leave them as a readout or set limits (setup $ ; upkeep chip near-free / low / flexible ; minutes per week ; risk
ceiling). A $ limit asks once: "what you expect to spend" (checked against the expected value) or "the most you can spend" (checked
against the 85th percentile). Clicking a bar lists what drives it and which swap lowers it, with the effect on the other two bars and
each item's share of the cost uncertainty.

Phases (report to the coordinator after each; ask Nathan at the marked points):
1. Engine, no UI. src/demand/: types (DemandAdd with Range3 = { lo, mode, hi } or a plain number; UserProfile; Factors), `demandOf(setup, profile)`
   returning per-item contributions and totals, `costDistribution()` (triangular per item: mean = (lo+mode+hi)/3, variance =
   (lo^2+mode^2+hi^2-lo*mode-lo*hi-mode*hi)/18; totals via a few shared factors with partial correlation by Monte Carlo, about 2000 draws,
   seeded so results are stable; run when the scene settles, not per frame; or a single-rho analytic version first, behind the same
   interface). Derive from the scene, not from new fields: volume() for water changes, wattsOf() for electricity (watts x hours x kWh
   rate), growth speed (PLANT3D[].grow.speed, src/scene/growtime.ts) for trimming minutes, outcomeOf() struggle counts and animalfit
   warnings plus CARE[id].care (src/data/care.ts) for risk, water.salt for the saltwater multiplier (carry it in the data now; unused
   until the reef release). Plant difficulty is DERIVED from NEEDS (co2 required, high band = hard; floaters, epiphytes = easy), not
   hand-labelled. Test with fixed scenes (the 4 starter examples in src/examples/) and assert plausible ranges.
2. Data. src/data/demand*.json: per-item DemandAdd tables (tank/kit price comes from lane KA / KB data via a lookup, so don't duplicate;
   gear, consumables, plants, animals, hardscape here), factors.json (price level, kWh rate band, loss rate by domain and skill, water
   source cost per gallon: tap / well / bought RO / own RO). Every number carries a source or a "rule of thumb" note and an asOf date; use
   ranges wide enough to be honest. Quote the cost of any research fan-out to Nathan first (one batch measured, wait for his yes).
3. ASK NATHAN (with a worked example screenshot or table): the risk cut points, and which existing collapsible window hosts the panel.
4. Panel UI: three compact bars with limit ticks, red when over; click a bar for the driver list; hover for the range; limits form with
   the expected / most-I-can-spend question; "your situation" settings (skill by domain, water source, kWh rate). Plain wording, no
   jargon. Do not redesign the left panel; add into the window Nathan picks, after lane KA's panels.ts change has landed (the
   coordinator tells you).
5. Shuffle / Quick Setup respect the limits (a build that goes over is swapped toward cheaper / easier choices using the same driver
   list); keep the care-tier slider as a shortcut that sets all limits at once.

Files you own: src/demand/, src/data/demand*.json, src/data/factors.json, test/demand*.test.ts, and the panel hook in src/ui/panels.ts
(after KA). Read-only: lightout.ts, lightneeds.ts, plantfit.ts, growtime.ts, care.ts, setupsheet.ts (the setup sheet is the natural
place to print the cost summary later; coordinate before editing it). No scene version bump; the profile lives in app prefs.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check, git push origin HEAD:main, then
git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Stage by path, never commit -a. Add your own dated section under
"Lane sections (current)" in HANDOFF.md. Record model changes on /review.html.

Coordinator protocol: message the coordinator COORD_ID (send_message) when each phase lands and when you are done: commit hash, what's
open, which files are free. preview_stop when finished. Questions for Nathan stay in your own chat, with pictures for anything about a
drawing, unit or screen. If the chat gets long, hand off to a fresh chat at a phase boundary after writing your state into your HANDOFF
section.
