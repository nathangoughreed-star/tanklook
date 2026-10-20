You are lane P2 (tank fit engine for path 1). Worktree ../Glass-Box-p2tankfit, branch p2tankfit, port 5873. Fast-forward to origin/main first. Run on Sonnet.

Read first: HANDOFF.md "Start here" (lane rules, coordinator protocol, deploy-health note) and the HANDOFF section "User flow: paths,
budget, deals" (the whole design), then research/plan-path1-animal-first.md (the build split, the shared schema, the lane table).
Nathan 2026-10-20: "build path 1 fully, I'll dogfood it first." The design chat that wrote the plan is local_eda2d645 (read-only
context: do not ask it to build; questions for Nathan stay in your own chat). Memory: shared-folder-commits.md, push-live-is-fine.md,
fish-art-not-cartoony.md.

Work unit: new src/scene/tankfit.ts (pure, no UI) + test/tankfit.test.ts, coded against the plan's GroupCare schema (lane P1 lands the data later:
until then use defaults: recommended minimum = CARE.group else 1, and no depth / length limits) and READING, never editing,
stockingOf (src/scene/stocking.ts: lane SE2 owns it; stockingMemo / stockingLine / stockingDetail exist), data/tanks.ts (the 50-tank
catalogue, tankChoices, tankFromModel) and the demand model (src/demand: demandOf, kit and deal prices) for cost deltas. API (names
fixed by the plan):
- tankFor(animals): the smallest catalogue tank that meets the SPACE limit (stockingOf space <= 100 %), plus the species' floor-area need by zone
  (bottom / middle / top / all: new, SPACE today is per litre), minLengthMm and maxDepthMm where P1 gives them.
- stepUps(animals, current, n): the next n good sizes up from the current tank, each { tank, costDeltaUsd, spacePct, filtrationPct }.
- buildSpan(animals, tank): setup $ from the cheapest to the balanced build plus minutes a week (from the demand model / tech presets);
  a single expected value per number is Nathan's rule for costs elsewhere, but the cheapest-to-balanced span is the shape the plan asks for here.
Tests with real cases: 2 dwarf frogs, 6 neons, a pair of kribensis, an oscar, a shoal of danios plus a pleco, a reef pair; steps are
monotonic (bigger tank, lower space %), sizes come from the catalogue only, a species needing a long tank skips short ones.
Pictures: a small table of inputs and outputs (an image) is enough before shipping; no UI in this lane. Lane P5 (stocking screen) consumes
your API: send the coordinator the exact signatures as soon as they are on main. Files you own: src/scene/tankfit.ts, test/tankfit.test.ts.

Ship per the lane rules: work ONLY in your worktree (not the shared "Glass Box" checkout: the git guard blocks stash, push, pull,
reset --hard there); git fetch + merge origin/main, tsc + the tests you touched (full suite about 930 tests, about 90 s; CI has a
120 s test timeout), commit by path only (never -a), git push origin HEAD:main. Do NOT use git stash. No scene version bump without
asking Nathan. Pictures of anything visible BEFORE shipping, via SendUserFile, and wait for Nathan's verdict in your own chat.
Subagents on Sonnet (Haiku for lookups) only; before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote
per-item cost and total to Nathan and wait for his yes. Lanes P1, P3, P4 run at the same time: stay out of their files.
Add your own dated section under "Lane sections (current)" in HANDOFF.md (a stub exists: fill it in). preview_start serves the folder the
chat was opened in: open this chat inside the worktree. preview_stop when done. If this chat gets long, hand off to a fresh chat at a
work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4"; if that chat has handed off, the HANDOFF "Start here"
paragraph names the current one) with send_message when work lands on main and when you are done: commit hash, what landed, what is still
open, which files are free. The coordinator cannot relay approvals.
