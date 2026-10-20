You are lane P4 (artificial plants for path 1). Worktree ../Glass-Box-p4artplants, branch p4artplants, port 5893. Fast-forward to origin/main first. Run on Sonnet.

Read first: HANDOFF.md "Start here" (lane rules, coordinator protocol, deploy-health note) and the HANDOFF section "User flow: paths,
budget, deals" (the whole design), then research/plan-path1-animal-first.md (the build split, the shared schema, the lane table).
Nathan 2026-10-20: "build path 1 fully, I'll dogfood it first." The design chat that wrote the plan is local_eda2d645 (read-only
context: do not ask it to build; questions for Nathan stay in your own chat). Memory: shared-folder-commits.md, push-live-is-fine.md,
fish-art-not-cartoony.md.

Work unit: a plant item kind `artificial` (silk vs plastic flag): data, item list entries, drawing through plant3d.ts WITHOUT growth (no
propagation, no leaf algae, no tech-level appearance; a fixed look that reads as artificial in the crisp tank render, silk soft and
draping, plastic stiff and glossy), pickable and scatterable like live plants (check the scatter brush and the plant library), counted as
hardscape-like decoration in the demand model (a one-time price, no light / CO2 / fertiliser need; read how demand rows for plants work in
src/demand and add rows in the existing lo / mode / hi format with one source URL each), no nitrate uptake in the stocking engine. The
stocking hook is a one-line change in src/scene/stocking.ts, which lane SE2 owns: message SE2 (session local_e8574805-583f-4f60-8b1e-549b81216716)
with the exact line, or ask the coordinator. This lane is LOWER priority than P1-P3 (needed by P6): start now but do not rush.
Art: must look like the crisp tank render, not cartoony. Pictures of silk and plastic in a tank (several species shapes: stem, rosette, moss mat),
and on /review.html as models (record only your own models). Tests: save / load round trip, scatter, demand rows, no growth.
Files you own: the artificial plant entries in the plant data / items, the artificial branch in plant3d.ts (a new function; no edits to the live-plant
code), demand rows you add, test/artificialplants.test.ts.

Ship per the lane rules: work ONLY in your worktree (not the shared "Glass Box" checkout: the git guard blocks stash, push, pull,
reset --hard there); git fetch + merge origin/main, tsc + the tests you touched (full suite about 930 tests, about 90 s; CI has a
120 s test timeout), commit by path only (never -a), git push origin HEAD:main. Do NOT use git stash. No scene version bump without
asking Nathan. Pictures of anything visible BEFORE shipping, via SendUserFile, and wait for Nathan's verdict in your own chat.
Subagents on Sonnet (Haiku for lookups) only; before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote
per-item cost and total to Nathan and wait for his yes. Lanes P1, P2, P3 run at the same time: stay out of their files.
Add your own dated section under "Lane sections (current)" in HANDOFF.md (a stub exists: fill it in). preview_start serves the folder the
chat was opened in: open this chat inside the worktree. preview_stop when done. If this chat gets long, hand off to a fresh chat at a
work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4"; if that chat has handed off, the HANDOFF "Start here"
paragraph names the current one) with send_message when work lands on main and when you are done: commit hash, what landed, what is still
open, which files are free. The coordinator cannot relay approvals.
