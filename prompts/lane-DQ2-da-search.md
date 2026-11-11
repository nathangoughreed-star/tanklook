# DQ2: Discovery search quality, stratified pool (Coordinator 22)

Follow `prompts/lane-DQ-common.md`. Your section: spec 5.1 and finding I3 (patch 2). START ONLY after Coordinator 22 says DQ1 is merged.

## Task
- Replace first-four-found with a bounded, diversity-aware, stratified pool before pair selection. Strata: habitat (only if the user chose unsure), visual family, size class, and layout / stocking pattern.
- For established champions, use these challenger strategies: direct improvement, a controlled alternate, and occasional out-of-family.
- No near-duplicates.
- Apply cheap hard exclusions (no snails, shrimp or large animals) before roster construction. Final validation stays unchanged.
- Measure and re-validate the 0.12 distance and the 2.2 s soft and 8.8 s hard deadlines. Never fall back silently to a near-identical pair.
- Instrument diversity, latency, yield and rejection reasons.

## Done when
- Tests for scenarios 6 (pre-constraint), 7, 8, 10 and 12.
- Scenario 24 measurements are reported.
- A visual check that the first pairs look distinct at the same physical scale.
- The build is clean and full vitest passes.
