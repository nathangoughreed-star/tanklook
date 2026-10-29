# Lane NG6: Setup effort, care time and confidence (closes gaps 8 and 10)

Coordinator: Coordinator 16, local_543b9920-e805-4bf4-be11-6109c6498477. Report ONCE (send_message) when ready to merge, done, or blocked; questions for Nathan stay in your own chat and come WITH pictures (screenshots, cropped, marked). Read research/design/guided-sandbox-plan.md (whole file, short), HANDOFF.md "Start here" and the lane rules there. Your worktree may start from a stale local main: `git fetch` then `git reset --hard origin/main` in YOUR worktree first.
Rules: touch only the files you own (a one-line hook elsewhere is fine, say so). Sibling lanes running at the same time: NG1 (entry), NG2 (brief v2), NG6 (effort). Never loosen a welfare gate. US units in chat (gal, in, deg F). Before reporting: npm run build + FULL vitest (in the background; end the turn rather than polling), browser check with preview_start, screenshots. Do not push: send the sha(s), suite result and screenshots; the coordinator merges. Stop your preview servers when done.

Owns: src/demand/effort.ts (new), src/demand/rhythm.ts, src/demand/buildplan.ts, src/ui/buildPlanSheet.ts, their tests (and data/rhythm.json).
Do:
- Setup hours per build derived from its parts (tank prep, hardscape, planting, plumbing / sump, cycling hands-on time), one quoted source or a stated assumption per figure.
- Care minutes per week derived from rhythm beats (water changes by gallons, glass, plant trims, feeding, tests), replacing the flat "assumption" values where a derivation exists.
- Every effort / care / cost figure carries validated or provisional; the build plan sheet and the Suggest card numbers show a small badge (provisional = dotted underline + tooltip with why). Card display hook in ui/suggest.ts is ONE line; NG3 owns that file later.
- Build plan: readiness gate per step (e.g. "ammonia 0, nitrite 0 for 7 days before fish") and one care-commitment line ("about 35 min / week, 1 x 5 gal water change").
- Do not change brief fields (NG2) and do not make the generator read setupHours yet (NG3 will); if care minutes feed any score, list moved numbers and regenerate calib tables per the lane rules.
Report: shas, suite, moved-numbers table (or "none"), screenshots of the build plan sheet with gates, care line and badges.
