# DQ lanes: common rules (Coordinator 22)

Follow `prompts/lane-common-c20.md`.

Before you start:
- Run `git fetch origin && git merge --ff-only origin/main`.
- Read the spec `research/design/discovery-algorithm-audit-2026-11-11.md`: sections 1-3 and 8-11, plus your own section.
- Read the plan `research/design/discovery-algorithm-fix-plan.md`.
- From DQ2 on, also read `research/design/da-live-path-map.md` instead of re-exploring.

How to work:
- VERIFY each reported finding in the current code before changing it; the spec quotes an audit, not the code. If a finding is not real, say so and skip it.
- Preserve everything in spec section 2.
- No wholesale rewrite of `nextPair`, no new UI page.
- Tests must exercise the live `nextPair` path, not only helpers.

Report to Coordinator 22 with the branch and sha, rebased on origin/main. Never push. Per spec section 9, the report covers:
- changed files;
- behaviour before and after;
- targeted tests;
- the full vitest run (re-run load timeouts alone);
- cold and warm first-pair timings;
- one real first-pair plus refinement example, with specs and screenshots in `research/screens/<lane>/`, about 60 KB each. Send the key ones to Nathan via SendUserFile.

Add a HANDOFF section.
