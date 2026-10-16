Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane MS stub, then
reference/roadmap/TankLook_Roadmap.txt section 5 (Composition tools: multi-select and duplication, brush / scatter,
controlled random variation). Memory: shared-folder-commits.md, perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane MS: multi-select, duplicate and controlled variation. Worktree C:\Users\nreed\Glass-Box-multiselect, branch
multiselect, launch config `multiselect`, port 5683 (npm ci is done). First git fetch + merge origin/main.

Build (roadmap P0, composition tools):
1. Multi-select: shift / ctrl-click and a box-select add to the selection; move, turn, resize and delete act on the whole
   group (relative layout kept); the colour sliders and the group frame show something sensible. Touch works too (a toggle
   button, not only modifier keys; keep controls >= 38 px at 375 px).
2. Duplicate: copy the selection (fish schools, repeated plants, rock clusters) with a small offset, new items selected.
   Animals keep their species and sex rules; duplicated animals/items go through the same placement code as Shuffle so
   nothing sits in rock or glass (scene/scatter.ts, scene/anchors.ts).
3. Controlled random variation: a "Duplicate N" (or Array) option placing N copies with a seeded jitter in angle, scale and
   spacing (sliders for the amounts), so repeats don't look cloned. Seeded and saved with the scene like other random data.
The scatter BRUSH (paint litter / moss / pebbles) is NOT in this lane: it builds on T1's render/scatter.ts and waits for T1.
Undo/redo, share URL and scene save/load must keep working with groups; no scene version bump without asking Nathan.
Pictures: a before/after of a duplicated school, a rock cluster and a plant row; wait for Nathan's verdict.

Files you own: src/interact/*, the selection / item-edit part of ui/panels.ts and index.html, scene/ selection + duplicate
helpers (new scene/duplicate.ts). Running at the same time: T1 (dry ground: Substrate section of ui/panels.ts / index.html,
render/scatter.ts, ground build), G1 (gecko), lane PP (plants: art/plants.ts, render/plant3d.ts). Keep out of their files;
one-line hooks only, say so in your section; merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about a plant / item / screen WITH its picture.
