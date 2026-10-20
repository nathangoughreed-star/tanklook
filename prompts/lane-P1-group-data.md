You are lane P1 (group data for path 1). Worktree ../Glass-Box-p1groups, branch p1groups, port 5863. Fast-forward to origin/main first. Run on Sonnet.

Read first: HANDOFF.md "Start here" (lane rules, coordinator protocol, deploy-health note) and the HANDOFF section "User flow: paths,
budget, deals" (the whole design), then research/plan-path1-animal-first.md (the build split, the shared schema, the lane table).
Nathan 2026-10-20: "build path 1 fully, I'll dogfood it first." The design chat that wrote the plan is local_eda2d645 (read-only
context: do not ask it to build; questions for Nathan stay in your own chat). Memory: shared-folder-commits.md, push-live-is-fine.md,
fish-art-not-cartoony.md.

Work unit: the per-species group data of the plan's shared schema (GroupCare): new src/data/groups.ts (typed, one entry per species id in
src/data/species.json, 84 species), merged into CARE by a short loop at the end of src/data/care.ts the way WATER / CHEM are (read
how waterchem.ts was merged; lane CG built it), test/groups.test.ts, research/groups-sources.md (one source line per species).
Per species: bands {ok, good, great} (counts where each band starts; below ok = avoid), optional per-band messages (defaults are
generated from the numbers), max per tank (solo = 1, a bonded pair = 2), sexed {ratio [males, females], note} where the hobby keeps them by
sex, maxDepthMm, flow, zone, minLengthMm, appeal tags (personality, showpiece, colour, size, shoal, oddball, ...). Recommended minimum =
bands.ok, else today's CARE.group, else 1 (keep the existing group minimums from lane CG's waterchem data consistent: do not contradict
them without saying so). Nathan's worked example: dwarf frog 1 = avoid (lonely), 2-4 doable, 5-6 good, 7+ great; shallow (about 30-45 cm),
gentle flow.
Method: research per species with Sonnet / Haiku agents (hobby sources, FishBase, keeper guides; one URL per row; mark `est` where the
numbers are judgement). FIRST measure one batch (say 6 species spanning a schooling fish, a solo cichlid, a shrimp, a snail, a frog, a
gecko), quote the per-species cost and the total for all 84 to Nathan in your chat, and wait for his yes before the fan-out. The
test must fail any species without an entry or with bands out of order; a coverage test like lane CG's compatgates test is the model.
Lane P2 (tank fit) codes against the schema with defaults until you land; keep the exported shape exactly as in the plan file. Lane SE2
owns src/scene/stocking.ts and spacefactor.ts: read only.
Files you own: src/data/groups.ts, the one merge loop in src/data/care.ts, test/groups.test.ts, research/groups-sources.md.

Ship per the lane rules: work ONLY in your worktree (not the shared "Glass Box" checkout: the git guard blocks stash, push, pull,
reset --hard there); git fetch + merge origin/main, tsc + the tests you touched (full suite about 930 tests, about 90 s; CI has a
120 s test timeout), commit by path only (never -a), git push origin HEAD:main. Do NOT use git stash. No scene version bump without
asking Nathan. Pictures of anything visible BEFORE shipping, via SendUserFile, and wait for Nathan's verdict in your own chat.
Subagents on Sonnet (Haiku for lookups) only; before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote
per-item cost and total to Nathan and wait for his yes. Lanes P2, P3, P4 run at the same time: stay out of their files.
Add your own dated section under "Lane sections (current)" in HANDOFF.md (a stub exists: fill it in). preview_start serves the folder the
chat was opened in: open this chat inside the worktree. preview_stop when done. If this chat gets long, hand off to a fresh chat at a
work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4"; if that chat has handed off, the HANDOFF "Start here"
paragraph names the current one) with send_message when work lands on main and when you are done: commit hash, what landed, what is still
open, which files are free. The coordinator cannot relay approvals.
