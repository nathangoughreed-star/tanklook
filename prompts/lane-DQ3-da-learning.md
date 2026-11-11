# DQ3: Discovery learning and targeted challengers (Coordinator 22)

Follow `prompts/lane-DQ-common.md`. Your section: spec section 6 (patch 3). START ONLY after Coordinator 22 says DQ2 is merged.

## Task
- **Evidence from votes:**
  - Prefer A/B, Like both, Like neither and Skip give holistic pairwise evidence, per the spec 6.1 list.
  - Cost and upkeep reasons teach only the practical dimensions.
  - Lock and Combine are not taste.
- **Attribute contract:** the A / No opinion / B attribute learning contract. The AB13 UI already exists in `src/ui/ab/`; touch it only to wire events.
- **Targeted challengers:**
  - Follow the spec 6.3 strategy order.
  - Show a visible one-line purpose, e.g. "Testing B-inspired planting with A's rocky layout; equipment and cost recalculated".
  - Vary only a small subset within the authorised scope.
  - An infeasible recombination explains why and never breaks locks or held tabs.

## Done when
- Tests for scenarios 5, 9, 13, 14, 15, 17 and 18.
- A real "A overall, B's plants" example with screenshots.
- The build is clean and full vitest passes.
