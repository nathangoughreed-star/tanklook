You are lane KW (start wizard). Worktree ../Glass-Box-wizard, branch wizard, port 5783. Fast-forward to origin/main first.
Run on Sonnet.

Read: HANDOFF.md "Start here" (lane rules), research/plan-guided-start-kits.md (the plan: "Lanes" D, the schema, the amendments, and
the demand sections), the archived sections for lanes KA, KB, KC, KK, SD (HANDOFF-archive.md, search by heading). What exists:
src/data/tanks.ts (50-tank catalog, tankChoices(), tankFromModel / tankFromOuter), src/data/kits.ts (32 kits), src/scene/kitlight.ts
(applyKitToStore, kitCapability, upgradePath, setUpgradePriceHook), src/demand/* + src/ui/demandPanel.ts (three bars, limits,
swaps), src/ui/startEntries.ts + the single #startDlg with a `#startGuided` slot reserved for this wizard.

Work unit: the guided start, plan lane D. It lives in the start dialog (#startGuided) and feeds the existing editor: it never
replaces it. Flow, kept short and phone-friendly (375 px):
1. Stage question: new to this / already have gear / know what I want (the last two can jump straight to the catalogs or the chooser's other tabs).
2. Goal and budget: what are you making (freshwater planted / community, terrarium for a named animal, ...) and ONE budget number:
   "What do you want your expected cost to be?" (Nathan 2026-10-19: no percentiles, no ranges, no min / max choice: a single
   expected-cost figure; lane DS is removing the cap / range modes from the demand engine at the same time, see below.) Setup
   cost and upkeep per month may be two inputs, each a single number.
3. Bare tank vs kit toggle, with size bands (nano / small / mid / large / monster, from tanks.ts) and the tanks / kits that fit
   the budget (kit prices from kits.ts, deals from deals.ts when running).
4. Result: open the scene with that tank or kit applied (applyKitToStore), the demand panel showing the numbers, and an
   upgrade-path summary (kitlight upgradePath: swap light vs new build) in plain words. Skipping the wizard must stay one click.
Use the existing demand API (src/demand) to price and check; do not edit src/demand/* (lane DS owns it): need a change there?
message the coordinator. Freshwater and the existing terrarium first; the data model already carries salt.
Tests: the wizard's picking / filtering logic (pure functions, like startEntries.ts); no regressions.
Browser-check desktop and 375 px; pictures of every step before shipping.

Files you own: new src/ui/wizard.ts (+ test), the #startGuided slot content in index.html, wizard CSS in style.css (.wz* rules),
a one-line hook in the start handlers in src/ui/panels.ts. Lane DS (expected cost) runs at the same time in src/demand/* and
src/ui/demandPanel.ts: do not touch those.

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
