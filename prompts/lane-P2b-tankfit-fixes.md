You are lane P2b (follow-up fixes to the path-1 tank fit engine). Worktree ../Glass-Box-p2btankfit, branch p2btankfit, port 5873 (free again). Fast-forward to origin/main first. Run on Sonnet.

Read first: HANDOFF.md "Start here" (lane rules, coordinator protocol, deploy-health note), the HANDOFF section "User flow: paths, budget, deals", research/plan-path1-animal-first.md, and the "Lane P2" section in HANDOFF-archive.md (or HANDOFF.md). Memory: shared-folder-commits.md, push-live-is-fine.md.
Origin: the user-flow design chat (local_eda2d645, read-only context) found two gaps in P2's src/scene/tankfit.ts (d807ba9) that P5 must not build on. Nathan said yes to fixing them.

Work unit (you own src/scene/tankfit.ts and test/tankfit.test.ts):
1. tankFor / stepUps judge SPACE only: an oscar gets the 120 gal with filtrationPct 165 % even with the strongest catalogue filter, so path 1 would call an unbuildable tank "fits". Step up until some catalogue filter brings filtrationPct <= 100 %, or, when no tank in the catalogue can, return a hard `fails` entry saying no filter can (P5 words it). Keep the existing return shapes; add fields only.
2. buildSpan is animal-only, so the cost span is only $10-20 wide on small tanks and looks falsely precise. Include a basic light in both builds, and a heater wherever the animals' temperature band needs one above room temperature (check whether the bare preset already has it, do not double count). P6 still adds plants / CO2.
Tests for both (oscar case; a small-tank case where the span now widens). Full suite green, tsc clean, push to main (git merge-base --is-ancestor check before you report), then message the coordinator.

Coordinator protocol: message the coordinator local_798b4aae-5251-4503-ba6a-cfe4097df2bf ("Lanes coordinator 5") with send_message when work lands on main, when done, and at any milestone. Work only in your worktree; preview_stop when done.
