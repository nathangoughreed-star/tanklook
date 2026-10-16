Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane BP stub, then in
HANDOFF-archive.md the sections "Lane JS: regal jumping spider" (your pattern, and render/limbs.ts: IK, surfaces, fuzz
hair, banded chain, shared with you) and "Lane G1: lizard body plan" (poses, anchors, perch), and "Lane T3" (scene/anchors.ts).
reference/roadmap/TankLook_Roadmap.txt section 4. Memory: shared-folder-commits.md, fish-art-not-cartoony.md,
perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane BP: ball python (Python regius), the serpentine body plan. Worktree C:\Users\nreed\Glass-Box-python, branch
python, launch config `python`, port 5673 (npm ci is done). First git fetch + merge origin/main.

Build a new `render/snake3d.ts` + `art/snakes.ts` (a limbless body, not an adapted lizard): a spine curve loft with a
small head distinct from the neck (heat pits along the upper lip, round pupils, nostrils, forked tongue tip optional), the
body a rounded-triangle cross-section (flat belly, ridged back), scale texture and the species' blotch pattern (dark
brown with light tan blotches / "alien head" markings along the sides, cream belly) painted so it reads crisp, not cartoony,
a short thin tail. Pose families through scene/anchors.ts: (1) coiled (resting, head laid on the coils), (2) extended along
the floor / a ledge / cork in an S curve, (3) draped over a branch, wrapped round a limb (use limbPaths), (4) the
"ball" defensive pose (head tucked in the centre), plus a raised-head alert. Spine length is constant (like G1's lizard
spine in steps of 1/280): a pose bends, never stretches. Never clips into the ground or a hardscape piece: rest on the top
of the solid under it. Adult ~1.0-1.5 m is unrealistic for most tanks: set sizes by life stage (hatchling to adult) with
the real length, and let the Shuffle pick sizes that fit the tank. Male and female differ only slightly (spurs): keep one
sex or a small spur. Species entry in data/species.json (not aqadvisor), the 2D card + meta in art/herps.ts, dispatch in
render/herp3d.ts, Shuffle hooks in scene/scatter.ts. Tests like test/lizard.test.ts / test/spider.test.ts; the anchorbase
fixture must stay unchanged. Pictures before shipping (each pose, front / top / 3/4, a close crop of the head and a scale
detail); wait for Nathan's verdict. No scene version bump.

Files you own: new render/snake3d.ts, art/snakes.ts; one-line hooks (say so in your section) in render/herp3d.ts,
art/herps.ts, animal() in render/build.ts, scene/scatter.ts, data/species.json, data/species.ts. Read-only use of
render/limbs.ts (add helpers there only if both new lanes can use them; tell lane TA). Running at the same time: T1 (ground
build, render/scatter.ts, Substrate panel), lane TA (tarantula: same hook files). Hook-file conflicts: keep both sides;
merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about an animal / item / screen WITH its picture.
