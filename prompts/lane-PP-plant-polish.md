Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane PP stub, then in
HANDOFF-archive.md the sections "Lane T2: terrestrial plants" and "Lane A2: plant library" (search by heading).
Memory: shared-folder-commits.md, perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane PP: plant polish. Worktree C:\Users\nreed\Glass-Box-plant-polish, branch plant-polish, launch config
`plant-polish`, port 5673 (npm ci is done). First git fetch + merge origin/main.

Do, in this order, with pictures before shipping (each plant at growth 0 / 0.5 / 1, front and 3/4, wait for Nathan's verdict):
1. Pothos and the flexible vine follow branches and link wood: use T3's scene/anchors.ts (limbPaths(item, toTank), rest(),
   glass()) so a vine runs along a branch, bridges between pieces and climbs the back wall. T2 left this open.
2. Sphagnum: distinct capitula (heads) instead of a soft cushion.
3. Fittonia: less leggy at growth 1 (compact, patterned foreground).
4. Dwarf hairgrass: at growth 1 a patch should read as a full lawn, not a strip of tufts (spread like the sagittaria lawn).
Keep GR1's guarantees: old files draw exactly as before (the triangle test stays green), a growth drag step stays cheap on
GR4's GPU reveal, the worker prebuild covers any new data. No scene version bump.

Files you own: art/plants.ts, render/plant3d.ts, the plant branch of render/items.ts, the plant entries of scene/items.ts
LIBRARY. Read-only use of scene/anchors.ts (T3 done). Running at the same time: T1 (dry ground: render/scatter.ts,
Substrate panel, ground in render/build.ts), G1 (gecko: art/herps.ts, render/herp3d.ts), lane MS (multi-select:
src/interact, selection UI). Keep out of their files; merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about a plant / item / screen WITH its picture.
