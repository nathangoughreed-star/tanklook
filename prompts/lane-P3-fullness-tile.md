You are lane P3 (fullness tile for path 1). Worktree ../Glass-Box-p3fullness, branch p3fullness, port 5883. Fast-forward to origin/main first. Run on Sonnet.

Read first: HANDOFF.md "Start here" (lane rules, coordinator protocol, deploy-health note) and the HANDOFF section "User flow: paths,
budget, deals" (the whole design), then research/plan-path1-animal-first.md (the build split, the shared schema, the lane table).
Nathan 2026-10-20: "build path 1 fully, I'll dogfood it first." The design chat that wrote the plan is local_eda2d645 (read-only
context: do not ask it to build; questions for Nathan stay in your own chat). Memory: shared-folder-commits.md, push-live-is-fine.md,
fish-art-not-cartoony.md.

Work unit: a minimizable FULLNESS TILE on the viewer: two bars (space, filtration) from stockingOf (src/scene/stocking.ts; lane SE2 owns it:
read only), the top contributors on hover, and "Set my space": the owner draws a dashed outline of the area they have, shown in the viewer;
going past it opens the fork card hook (make room / swap: the card itself belongs to lane P5; give it a clean callback). The plan calls
this lane SE's unbuilt step 4 UI, but SE's step 4 is DONE (the sidebar stocking line, merge 1b551b2): the tile is a NEW viewer overlay
and the sidebar line stays; reuse stockingLine / stockingDetail where they fit. New src/ui/fullnessTile.ts, the dashed outline drawing in
the viewer (src/render, one-line hooks in viewer / build), `layout.space` in the scene (optional field; no scene version bump without
asking Nathan; parseSetup tolerant of old files), tests (tile state logic as pure functions; layout.space round trip; old files parse),
CSS appended to style.css (.ft* rules). Show Boxes and the menu focus fade (lane TG, render/menuFocus.ts) already hide / fade things: the
tile must respect them. Pictures at desktop and 375 px (tile open, minimized, over-limit with the outline) before shipping.
Files you own: src/ui/fullnessTile.ts, its CSS, the outline drawing, layout.space (types.ts optional field + parse hook), test/fullnessTile.test.ts.

Ship per the lane rules: work ONLY in your worktree (not the shared "Glass Box" checkout: the git guard blocks stash, push, pull,
reset --hard there); git fetch + merge origin/main, tsc + the tests you touched (full suite about 930 tests, about 90 s; CI has a
120 s test timeout), commit by path only (never -a), git push origin HEAD:main. Do NOT use git stash. No scene version bump without
asking Nathan. Pictures of anything visible BEFORE shipping, via SendUserFile, and wait for Nathan's verdict in your own chat.
Subagents on Sonnet (Haiku for lookups) only; before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote
per-item cost and total to Nathan and wait for his yes. Lanes P1, P2, P4 run at the same time: stay out of their files; one-line hooks only in viewer.ts / panels.ts / index.html.
Add your own dated section under "Lane sections (current)" in HANDOFF.md (a stub exists: fill it in). preview_start serves the folder the
chat was opened in: open this chat inside the worktree. preview_stop when done. If this chat gets long, hand off to a fresh chat at a
work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4"; if that chat has handed off, the HANDOFF "Start here"
paragraph names the current one) with send_message when work lands on main and when you are done: commit hash, what landed, what is still
open, which files are free. The coordinator cannot relay approvals.
