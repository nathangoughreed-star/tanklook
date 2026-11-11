# DQ1: Discovery correctness, preferences and descriptors (Coordinator 22)

Follow `prompts/lane-DQ-common.md`. Your section: spec section 4 (patch 1).

## Task
1. FIRST, write and commit `research/design/da-live-path-map.md`.
   - It traces the live path from the quick-preference cards through the brief, search rules, tank catalogue, candidate build, features, score, pair selection and session feedback.
   - Name the exact functions, files and tests.
   - Lanes DQ2-DQ5 read it instead of re-exploring.
2. **P1:**
   - A preferred size, care or cost only changes ranking; firm bounds filter.
   - Check how the UI marks "firm". If no firm control exists, keep the current firm path where one is explicit and report the gap to the coordinator.
3. **P2:** Avoid lowers priority but stays reachable. No starvation through ordered catalogues plus early stop.
4. **P3:** design-derived descriptors, computed from the actual generated spec with modest, documented heuristics.
   - The descriptors: natural vs stylized, sparse vs lush, muted vs vivid, ordered vs organic, rock vs wood, and live vs artificial planting.
   - Never compute them from the archetype label.
   - Wire them into the LIVE scorer, or trim the archetype card mapping to what is really modelled.
5. **P4:** one learning event per attribute A/B choice, not a thumb plus a like.
6. One coherent scoring policy:
   - stated preferences outrank learned ones;
   - soft preferences never filter;
   - a per-candidate score breakdown under `?debug`.

## Done when
- Tests for spec scenarios 1-6 and 16 against the live path.
- The map file is committed.
- The build is clean and full vitest passes.
