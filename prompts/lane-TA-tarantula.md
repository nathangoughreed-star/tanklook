Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane TA stub, then in
HANDOFF-archive.md the sections "Lane JS: regal jumping spider" (your pattern, and render/limbs.ts: IK, surfaces, fuzz
hair, banded chain, shared with you) and "Lane G1: lizard body plan" (poses, anchors, perch), and "Lane T3" (scene/anchors.ts).
reference/roadmap/TankLook_Roadmap.txt section 4. Memory: shared-folder-commits.md, fish-art-not-cartoony.md,
perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane TA: tarantula, the large arachnid body plan. Worktree C:\Users\nreed\Glass-Box-tarantula, branch
tarantula, launch config `tarantula`, port 5683 (npm ci is done). First git fetch + merge origin/main.

Pick the species: a terrestrial New World tarantula that reads clearly and is common in the hobby, Grammostola pulchripes
(Chaco golden knee) as the default (its pale knee bands and rose-brown fuzz show off the leg segments), unless Nathan
says otherwise. Build `render/tarantula3d.ts` + `art/tarantulas.ts` on the JS spider's pattern and render/limbs.ts, but a
different animal, not a scaled-up jumping spider: a heavy rounded carapace with a central fovea, eyes in a small tubercle
on the front, large chelicerae with visible fangs, thick palps, a big rounded abdomen carrying urticating hair patches,
8 stout legs of real segments (coxa, trochanter, femur, patella, tibia, metatarsus, tarsus with scopulae pads and tiny
claws) with a leg-span about 3x the body length, and dense hair coverage (the fuzz helper) with the knee bands. A
walking leg order (alternating tetrapod) and a floor "ground-contact stance" with the abdomen carried clear of the
substrate; poses through scene/anchors.ts: floor / ledge / cork walking, a hide mouth (half-log, cork tube: partly in), up
a wall / glass (any heading), the threat pose (front legs raised, fangs shown), and resting with legs tucked. Adult 12-15 cm leg span down to
a juvenile: sizes by life stage. Males and females differ in colour and tibial hooks only. Species entry in
data/species.json (not aqadvisor), 2D card + meta in art/herps.ts, dispatch in render/herp3d.ts, Shuffle hooks in
scene/scatter.ts (prefers a hide and the floor). Tests like test/spider.test.ts; the anchorbase fixture must stay
unchanged. Pictures before shipping (floor walk, threat, in a hide, up the glass; top / front / 3/4, a hair close crop);
wait for Nathan's verdict. No scene version bump.

Files you own: new render/tarantula3d.ts, art/tarantulas.ts; one-line hooks (say so in your section) in render/herp3d.ts,
art/herps.ts, animal() in render/build.ts, scene/scatter.ts, data/species.json, data/species.ts. Read-only use of
render/limbs.ts (add helpers there only if both new lanes can use them; tell lane BP). Running at the same time: T1 (ground
build, render/scatter.ts, Substrate panel), lane BP (ball python: same hook files). Hook-file conflicts: keep both sides;
merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about an animal / item / screen WITH its picture.
