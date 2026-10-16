Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane EN stub, then
reference/roadmap/TankLook_Roadmap.txt section 7 ("The enclosure itself") and section 2 (environment capabilities). In
HANDOFF-archive.md search "backdrop", "tank shape" and "Lane T3" (anchors). Memory: shared-folder-commits.md,
perf-ab-alternate-frames.md, push-live-is-fine.md.

You are lane EN: enclosure presentation. Worktree C:\Users\nreed\Glass-Box-enclosure, branch enclosure, launch config
`enclosure`, port 5673 (npm ci is done). First git fetch + merge origin/main.

Step 1, the audit (do it first, short, and report it to Nathan in your chat as a table, then wait for his pick of what to build):
for each roadmap section 7 / section 2 item say DONE (where, how a user reaches it), PARTIAL (what is missing) or NOT
BUILT: tall / horizontal / portrait / landscape presets (P1); background panels and wall textures (P1; a 3D wall exists in
render/backdrop.ts, check cork, rock, botanical, plain colour, printed backgrounds); mesh lids and front doors (P2);
equipment models: light fixtures, filter, heater, mister line, feeding / water dish (P2); lighting direction and intensity
as scene mood (P2); cylinders and bowls (P3; tank shapes exist in scene/shape.ts); irregular geometry (P3, deferred by the
roadmap: leave). Check the live editor, not only the code.
Step 2, build what Nathan picks from the gaps, one batch per push with pictures first. Likely candidates: tank presets
(tall arboreal, wide terrestrial, cube, nano) in the tank setup UI with correct viewport; mesh top and sliding / hinged
front doors drawn as see-through frames (a screen lid with a fine mesh that does not hurt the render cost); equipment
as placeable pieces (heater, hang-on filter, canister outlet, mister nozzle, light bar) with true sizes, in a NEW file pair
scene/equipment.ts + render/equipment.ts and ONE hook line in the LIBRARY of scene/items.ts. A feeding / water dish piece
is lane CP's job: do not build it. Old files draw exactly as before; no scene version bump without asking Nathan.

Files you own: tank presets and the tank section of ui/panels.ts / index.html, new scene/equipment.ts + render/equipment.ts,
lids / doors in render/build.ts (their own block), scene/defaults.ts (presets only). Running at the same time: lane CP
(content pack: scene/items.ts LIBRARY pieces, art/plants.ts, species data). Keep out of their files; one-line hooks only,
say so in your section; merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about an item / screen WITH its picture.
