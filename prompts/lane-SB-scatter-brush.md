Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane SB stub, then in
HANDOFF-archive.md the sections "Lane T1: dry ground" (render/scatter.ts, render/grains.ts) and "Lane MS" (selection,
duplicate, seeded variation in scene/duplicate.ts). reference/roadmap/TankLook_Roadmap.txt section 5. Memory:
shared-folder-commits.md, perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane SB: the scatter brush. Worktree C:\Users\nreed\Glass-Box-brush, branch scatter-brush, launch config
`scatter-brush`, port 5693 (npm ci is done). First git fetch + merge origin/main.

Build a paint-on placement tool: pick a brush, drag across the ground (or a hardscape top), and it drops many small things
at once with seeded variation in angle, size and spacing so it does not look copied:
- Brushes: leaf litter (the T1 leaf kinds), pebbles / gravel, moss patches, small carpeting plants (reuse the plant
  entries, e.g. hairgrass / java moss / sphagnum), and optionally fallen twigs. Size, density and erase (a second mode that
  removes what the brush covers) as controls; touch works (a brush toggle in the view toolbar, controls >= 38 px at 375 px).
- Surface-aware: points land on the floor or on the solid piece under them through scene/anchors.ts (rest()), never
  inside rock or glass; shape follows the ground height.
- Cheap: instanced drawing like T1's litter and grains; a hundred pebbles cost little GPU; a drag stroke stays interactive.
- Storage: DECISION for you to bring to Nathan with a picture early: strokes saved as a lightweight "patch" (a seed + a
  stroke path + brush settings, moved / erased / copied as a unit, tiny in the scene file), which is the recommendation, or
  as individual items. Seeded so save / load / share URL rebuild the same patch exactly. Undo / redo and the group
  select / Copies tool must work with patches. No scene version bump without asking Nathan.
Pictures before shipping: a litter edge, a pebble beach, a moss patch, a hairgrass lawn painted, and an erase; wait for
Nathan's verdict.

Files you own: new scene/brush.ts + ui/brush.ts (+ tests), src/interact brush mode, render/scatter.ts additions (T1 is
done; you may extend it). One-line hooks (say so in your section) in render/build.ts, main.ts, index.html, style.css. Lane
SS2 (starter styles) and lane PG (plant gating) run at the same time: keep out of items.ts. Merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about a plant / item / screen WITH its picture.
