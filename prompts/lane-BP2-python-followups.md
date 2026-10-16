Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane BP2 stub, then in
HANDOFF-archive.md the section "Lane BP: ball python" (its Open list is your scope) and "Lane T3" (scene/anchors.ts).
Memory: shared-folder-commits.md, perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane BP2: ball python follow-ups, from lane BP's own open list. Worktree C:\Users\nreed\Glass-Box-python2, branch
python2, launch config `python2`, port 5703 (npm ci is done). First git fetch + merge origin/main.

Do, in this order, with pictures before shipping each (a snake in the case, front / top / 3/4; wait for Nathan's verdict):
1. Uneven ground: a rigid pose (coiled / ball) over uneven ground or the edge of a cork slab lies on the highest point under
   it. Make it settle: sample the ground / solid under the pose's footprint (scene/anchors.ts rest()) and let it rest so no part
   floats or clips (tilt or bend the pose to the surface where it needs to, constant spine length). Do the same check for
   the extended and serpentine poses.
2. Shared ledge: Shuffle / placeNew must not put two animals on the same ledge or branch spot (hardscape spawns ignore other
   animals); add a clearance check (scene/scatter.ts) that works for every animal on hardscape, not only snakes, and keep
   the anchorbase fixture unchanged.
3. Wrap: `wrap` leaves the tail lying straight along the limb, past its end on a short limb. Wind the tail round the limb or
   shorten the wrap to fit; a sharply bent limb should be followed, not just the local straight cylinder (limbPaths).
4. Life-stage picker: today only a size slider. Add a hatchling / juvenile / sub-adult / adult picker to the animal panel
   for the reptiles and arachnids (snake, gecko, spider, tarantula) that sets the real length for that stage; the size slider
   stays for fine control; the stocking / fit checks use the chosen size. Keep controls >= 38 px at 375 px.
5. The 375 px phone-width check lane BP did not run: the animal panel and the snake poses.
No starter or example placing a snake: that is lane SS2's job; do not add one. No scene version bump without asking Nathan.

Files you own: render/snake3d.ts, art/snakes.ts, the life-stage picker in the animal box of ui/panels.ts / index.html,
the clearance check in scene/scatter.ts. Running at the same time: PG (plant gating: starter-set controls in ui/panels.ts,
lightout, lighting), SS2 (starter styles: starterStyle in scene/items.ts, scene/starter.ts), SB (scatter brush: src/interact,
render/scatter.ts). Keep out of their files; one-line hooks only, say so in your section; merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about an animal / screen WITH its picture.
