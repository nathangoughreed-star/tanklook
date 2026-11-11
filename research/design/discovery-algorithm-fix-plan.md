# Plan: Discovery algorithm corrective fixes (Coordinator 22, 2026-11-11)
Spec (the contract): `discovery-algorithm-audit-2026-11-11.md`. Nathan asked to "modify our discovery algorithm as laid out in this writeup".
The architecture stays: A/B in the main view, champion vs challenger, locks vs shuffle scope, Make It Yours, welfare checks. No DA rewrite, no new UI page.

## Lanes
The lanes run SEQUENTIALLY. They all touch the live `src/scene/pairGen.ts`, the scoring code and `src/scene/discoverySession.ts`, so each lane starts from the previous one merged.

1. **DQ1 Correctness** (spec section 4, patch 1).
   - First, map the live path into `research/design/da-live-path-map.md` for the later lanes: quick prefs, brief, search rules, catalogue, candidate, score, pair, session feedback.
   - Then:
     - P1: soft vs firm size, care and cost.
     - P2: Avoid stays reachable.
     - P3: real design-derived descriptors wired into the live scorer, or unsupported card mappings removed.
     - P4: a single learning event per attribute choice.
     - One coherent scoring policy, with a `?debug` score breakdown.
   - Scenarios 1-6 and 16.
2. **DQ2 Search quality** (spec 5.1 and I3, patch 2).
   - A bounded, stratified, diversity-aware pool instead of first-four-found.
   - Challenger strategies: improve, alternate, out-of-family.
   - No near-duplicates.
   - Cheap hard exclusions applied before roster building.
   - Diversity and latency metrics.
   - Validate the 0.12 distance, 2.2 s soft and 8.8 s hard constants.
   - Scenarios 7, 8, 10, 12 and 24.
3. **DQ3 Learning and targeted refinement** (spec 6, patch 3).
   - Holistic pairwise evidence.
   - Reasons teach only the practical dimensions.
   - The A / No opinion / B learning contract (the AB13 UI exists).
   - A targeted challenger with a visible purpose line.
   - Scenarios 5, 9, 13-15, 17 and 18.
4. **DQ4 State / cache / plumbing** (spec 7, patch 4).
   - Split the cache key into feasibility vs ranking.
   - Like neither's broaden flag is read.
   - Reset / undo learned taste.
   - Exposure history across reloads.
   - The spec section 10 demo, end to end in the browser.
   - Scenarios 19-23 and section 10.
5. **DQ5 Stocking philosophies** (spec 5.2, optional).
   - Species-focused, mixed-zone and light display.
   - Size tiers without monotonic counts.
   - Scenario 11.
