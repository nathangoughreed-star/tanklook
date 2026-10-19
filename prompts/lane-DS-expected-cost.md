You are lane DS (one expected-cost number). Worktree ../Glass-Box-expectedcost, branch expectedcost, port 5793. Fast-forward to
origin/main first. Run on Sonnet.

Nathan 2026-10-19 (decision): do not ask users for a percentile or a range. Just ask: "What do you want your expected cost to be?"
Eliminate the multi values. Today the demand engine (src/demand/*, built by lane KK; see its archived section in HANDOFF-archive.md and
research/plan-guided-start-kits.md "Demand profile / Cost spread") carries Range3 {lo, mode, hi} on every cost contributor, a
budgetMode ('expected' | 'cap') on the limits, a budgetCapPercentile (85) in factors.json, a "likely range" (p10-p90) on the bar's
hover, and the user-gateable limit is checked against the expected value or the 85th percentile.
Work unit:
1. User-facing: ONE number per limit, checked against the expected value. Remove the budgetMode / cap choice and the
   percentile setting from the limits form and the saved profile (migrate old saves: ignore the field, keep the number), remove the
   "likely range" hover text and any min / max / percentile wording from the demand panel, deal lines and the swaps list. The bar still
   shows how the expected value compares with the limit.
2. Engine: simplify where it is cheap and safe: if the Range3 spread data is only used for the percentile / likely range,
   drop the Monte Carlo / distribution code (cost.ts) and read the expected value (mean) directly. KEEP the lo / mode / hi columns
   in demand-items.json and demand-defaults.json for now (lane TM is adding rows in that same format right now; removing them would
   break its merge): the data stays, only the user-facing range, percentile and cap go. If the
   spread data also drives something else (risk, upkeep expectation, loss replacement), keep that and say so. Do not drop the
   expected-loss replacement in upkeep (KK phase 5 relies on it). Results for the expected value must not change: add a test that
   the old mean for a set of fixed setups equals the new expected value, then delete the superseded tests.
3. Update research/plan-guided-start-kits.md's cost section with the decision (dated), and the HANDOFF section.
Lane KW (start wizard) runs at the same time and calls your API: keep demandOf / profile limits signatures stable (rename nothing
public without messaging the coordinator; the budget input is the existing setupUsd / upkeep limits).
Update 2026-10-19: lane TM (tech menu) adds a new src/demand/tech.ts with ONE-LINE hooks into the engine (its step 3). Land your
simplification early and push; keep demandOf / limits signatures stable; if TM's hook conflicts on merge, keep both sides and tell
the coordinator. Do not edit tech.ts.
Pictures of the panel and limits form (before and after) before shipping; wait for Nathan's verdict.

Files you own: src/demand/*, src/data/demand-defaults.json, factors.json, demand-items.json (values only, columns stay), src/ui/demandPanel.ts, test/demand*.test.ts. Lane KW owns the wizard; lane CS owns .github/ and vite.config.ts.

Ship per the lane rules: git fetch + merge origin/main, tsc + the tests you touched (the suite has a 120 s test timeout and
takes about 90 s), commit by path only (never -a), git push origin HEAD:main. Do NOT use git stash (shared across all
worktrees). The main checkout holds other chats' uncommitted edits: never commit, pull, reset or stash there. Pictures of
anything visible BEFORE shipping, via SendUserFile, and wait for Nathan's verdict. Model changes are recorded on /review.html.
No scene version bump. Add your own dated section under "Lane sections (current)" in HANDOFF.md (a stub exists: fill it in).
Subagents on Sonnet only; before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote it to Nathan.
Keep out of files you do not own; one-line hooks only in shared files, keep both sides on merge. 
preview_stop when done. preview_start serves the folder the chat was opened in: run this chat inside its worktree.
If this chat gets long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4") with send_message when work lands on main and
when you are done: commit hash, what landed, what is still open, which files are free. Questions for Nathan stay in your own
chat, with pictures. The coordinator cannot relay approvals.
