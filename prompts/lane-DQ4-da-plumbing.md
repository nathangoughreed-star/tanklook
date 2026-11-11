# DQ4: Discovery cache, history and end-to-end demo (Coordinator 22)

Follow `prompts/lane-DQ-common.md`. Your section: spec section 7 (patch 4). START ONLY after Coordinator 22 says DQ3 is merged.

## Task
- Split the cache key into feasibility context vs ranking context: taste changes rerank, structural changes revalidate.
- The next-pair path reads Like neither's broaden flag. Verify this after DQ3.
- Wire reset / undo learned taste into the live A/B state, or hide those controls. They must never clear stated preferences, locks, history or the saved design.
- Keep exposure history across reloads: no immediate repeats, and history can still reopen a design.
- Then run the spec section 10 product demo end to end in the real UI at desktop and 375 px (extend `scripts/ab-journey.mjs`). Compare the pictures AND the generated specs.

## Done when
- Tests for scenarios 19-23.
- The section 10 demo passes, with screenshots.
- Scenario 24 timings, before and after.
- The build is clean and full vitest passes.
