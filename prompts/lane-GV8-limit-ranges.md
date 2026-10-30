# Lane GV8: Limits as ranges (lower and upper bounds)

Coordinator: Coordinator 17, local_44e5506c-3362-4ae4-9201-786513054e8f (or the newer one named in HANDOFF.md "Start here"). Report ONCE with send_message when ready to merge, done, or blocked.
Start: `git fetch`, then `git checkout -b gv8-limit-ranges origin/main` in your own worktree. Read HANDOFF.md "Start here" + lane rules, then research/design/guided-flow-plan.md. Beyond that read only your own files; grep, don't read whole.
Rules: touch only the files you own (below); a one-line hook elsewhere is fine, name it in the report. Nothing hard-gates in Guided: warnings with fixes, never disabled buttons. Units in UI and reports: gallons, inches, deg F, US $.
Questions for Nathan stay in your own chat and come WITH pictures (screenshots saved as files, sent with SendUserFile).
Before reporting: npm run build + FULL vitest with the Bash tool's run_in_background (never Start-Process; end the turn and wait for the notification, no polling), a browser check, screenshots SAVED AS FILES. Don't push: send branch, sha(s), suite result, moved numbers if any, screenshot paths. Stop preview servers when done.

Nathan (2026-10-30): "instead of having a fixed budget for stuff, lets give the user an upper and lower bound. They dont need to supply both, they can do both, neither, or one or the other, for any parameter." And: "that way if they have a target they can just use a very narrow band."

Today: src/scene/brief.ts (lane NG2) stores each limit as `value` = hard max plus an optional `target` below it (LIMIT_IDS: budget, monthly, careMin, setupHours, maxSpace). The separate target goes away: a narrow band does that job.

Build:
1. **Schema** (src/scene/brief.ts, `parseBrief` in src/scene/validate.ts): every limit is a range with an optional lower bound and an optional upper bound; neither, either or both. Applies to set-up budget, monthly cost, care min / week, setup hours, and tank size in gallons (add that item if it does not exist). The footprint `maxSpace` stays max-only unless a lower bound makes sense (your call; say which). Lower <= upper when both are set (say whether you reject or swap). Retire `target`: old saves load with `value` as the upper bound; an old `target` is dropped or turned into a band (your call, justify it in the report). Bump BRIEF_VERSION if needed.
2. **UI:** every place that edits a limit shows two optional fields, "at least" and "at most" (empty = no bound): the Guided Limits step (src/ui/guided/), src/ui/setupBrief.ts, src/ui/welcomeGuard.ts, src/ui/briefBar.ts, src/ui/briefFeasibility.ts. Chips read "$300-600", "at least $300", "up to $600"; a narrow band like "$400-420" reads fine.
3. **Checks:** above the upper bound and below the lower bound are both flagged, never hard-gated in Guided. This covers the Sandbox cost flags (`costFlags` in src/ui/startMode.ts) and the roster totals strip (src/ui/stockPlan.ts; red outside the band). Suggest and narrowing (src/demand/suggest.ts) keep only options inside every set range, so a lower bound means "don't offer builds below this". When nothing fits, the existing infeasible paths say which bound blocks. Anything that read `target` for ranking now ranks toward the middle of the band. One-line hooks in those consumers are fine; name them.
4. Do not touch src/ui/report.ts (lane GV3). If the report should print the ranges, say so.
Owns: `src/scene/brief.ts`, `src/scene/validate.ts` (parseBrief only), `src/ui/setupBrief.ts`, `src/ui/welcomeGuard.ts`, `src/ui/briefBar.ts`, `src/ui/briefFeasibility.ts`, the Limits part of `src/ui/guided/steps.ts`, `costFlags` in `src/ui/startMode.ts`, plus named hooks in `src/demand/suggest.ts` and `src/ui/stockPlan.ts`.
Tests:
- Each combination (none / lower / upper / both) round-trips through save and parse.
- Lower > upper is handled as stated.
- Old saves load with the same upper bounds.
- Suggest drops options below a set lower budget bound.
- Flags fire both above and below the band.
- A $400-420 band works as a target.
If engine or ranking numbers move, write research/design/moved-numbers-gv8.txt.
Screenshots: the Guided Limits step with a mix of bounds; a chip for each kind (range, at least, up to).
