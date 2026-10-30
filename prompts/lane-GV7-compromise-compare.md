# Lane GV7: Compromise and compare

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked.
Start: `git fetch`, then `git checkout -b gv7-compromise-compare origin/main` in your own worktree. Read HANDOFF.md "Start here" + lane rules, then research/design/guided-flow-plan.md (the Guided v2 plan: Nathan's spec verbatim at the bottom, the lane table and the shared contracts). Beyond that read only your own files; grep, don't read whole.
Rules: touch only the files you own (below); a one-line hook elsewhere is fine, name it in the report. Nothing hard-gates in Guided: warnings with fixes, never disabled buttons; animal-welfare problems stay red and say "not a valid tradeoff". Units in UI and reports: gallons, inches, deg F, US $.
Questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, sent with SendUserFile, the items in question marked).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (never Start-Process; end the turn and wait for the notification, no polling), a browser check of your step, screenshots SAVED AS FILES. Don't push: send branch, sha(s), suite result (files / tests passed), moved numbers if any, screenshot paths. Stop preview servers when done.

Start only after lanes GV4 and GV5 are on main; the coordinator will tell you.
Nathan: "the user may realize they really want a certain style but it isn't in the budget. The tool should offer them a way to compromise, like 'keep this style in your budget by removing the school of neon tetras and downsizing from 75g to a 40g breeder'. This would be a great use of the comparison tool as well, where they can split the tank view into two and compare if they want to keep the style and do the downsize or if they'd rather go with a cheaper (or whatever other metric was being limited) style."
Today: src/demand/infeasible.ts has four verified paths, each a single edit; src/ui/infeasibleCard.ts shows them. The editor has a split view (store.splitTank, src/ui/diff.ts lists A vs B differences).
Build:
1. `src/demand/compromise.ts` (new): when a limit (budget, monthly, care, space) is broken with a chosen look, search small compound edits (drop / shrink a species group, next smaller tank, lower finish tier, fewer high-light plants) that keep the look and meet the limit; return the 1-2 smallest, verified (welfare intact), each as one sentence with the numbers: "Keep this style within $400: drop the 10 neon tetras and go 75 gal -> 40 gal breeder (-$310)".
2. Beside it: the cheapest other style that meets the limit with the roster kept.
3. "Compare": opens both in the split view (A = compromise, B = other style), with diff.ts showing the limit metric and set-up / monthly / care differences at the top.
4. Show the compromise on the infeasible card as the "keep the look" path's compound option, and in the Guided look step when over a limit.
Owns: `src/demand/compromise.ts` + test, `src/demand/infeasible.ts`, `src/ui/infeasibleCard.ts`, `src/ui/diff.ts`, one hook line in `src/ui/panels.ts` for opening the compare.
Tests: an over-budget iwagumi 75 gal with a neon school gets a compound compromise that meets the budget and keeps the look; welfare never broken; Compare opens two tanks with the right diffs.
Screenshots: the compromise card, the split compare.

Note (Nathan 2026-10-30, lane GV8): limits are ranges (optional lower and upper bound per parameter; no separate target). "Breaks a limit" means outside a set range, above or below; read the bounds through GV8's brief helpers.
