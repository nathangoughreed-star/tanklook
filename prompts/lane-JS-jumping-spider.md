Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane JS stub, then in
HANDOFF-archive.md the section "Lane G1: lizard body plan" (search by heading: it is your pattern for a new body plan,
poses and anchors) and "Lane T3" (scene/anchors.ts). reference/roadmap/TankLook_Roadmap.txt section 4. Memory:
shared-folder-commits.md, fish-art-not-cartoony.md, perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane JS: regal jumping spider (Phidippus regius), the first arthropod body plan. Worktree
C:\Users\nreed\Glass-Box-spider, branch spider, launch config `spider`, port 5673 (npm ci is done). First git fetch +
merge origin/main.

Build a new `render/spider3d.ts` + `art/spiders.ts` (not an adapted lizard or shrimp): cephalothorax with the raised
eye region and 8 eyes (the big forward-facing anterior median pair, the others in their real arrangement), chelicerae and
short pedipalps, an oval abdomen with the species' white spots / bands, 8 legs of real segments (coxa, femur, patella,
tibia, metatarsus, tarsus) as IK chains like G1's limbs, fine leg hair / fuzz that still reads crisply (same crisp
render as the tank, never cartoony). Male and female look (the male's black body with white palps and abdomen bands, the
female's grey-brown). Poses through scene/anchors.ts: floor / ledge / cork (walking), glass or 3D wall (clinging, any
heading), branch (on top and along the limb), plus a raised "alert" front pair. Add the species entries to
data/species.json (not aqadvisor), the 2D card + meta in art/herps.ts, a dispatch in render/herp3d.ts, the Shuffle
placement hooks in scene/scatter.ts like G1's GECKO_HEAD_DOWN. Size is true to life (about 12-18 mm body): check it reads
at tank scale and in a close crop.
Tests like test/lizard.test.ts; the anchorbase fixture must stay unchanged. Pictures before shipping (front, 3/4 and top,
each pose, both sexes, and a close crop); wait for Nathan's verdict. No scene version bump.

Files you own: new render/spider3d.ts, art/spiders.ts; hooks (one-line, say so in your section) in render/herp3d.ts,
art/herps.ts, the animal() part of render/build.ts, scene/scatter.ts, data/species.json. Running at the same time: T1 (dry
ground: render/build.ts ground build, render/scatter.ts, Substrate panel), MS (multi-select: src/interact, ui/group.ts),
lane SH (setup sheet: new files + one hook in panels.ts). Keep out of their files; merge origin/main often.
Later lanes (ball python, tarantula) reuse your IK-chain / hair code: keep it in a shared helper, not spider-only.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about an animal / item / screen WITH its picture.
