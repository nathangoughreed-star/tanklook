You are lane TG (tech gear drawn in the tank: the "how it looks in their tank" half of the Tech menu). Worktree
../Glass-Box-techgear, branch techgear, port 5833. Fast-forward to origin/main first. Run on Opus; subagents on Sonnet.

Context: lane TM (prompts/lane-TM-tech-menu.md, read it) builds the Tech menu where the owner picks filter, heater,
lighting, CO2, ferts, aeration, UV and salt gear, Walstad to SPS reef. Nathan wants each choice to show how the tech looks
in THEIR tank. Today nothing but the light fixture is drawn.

Read first: HANDOFF.md "Start here"; the memory rule that art must NOT look cartoony (match the crisp tank render; painted
looks were rejected twice); how hardscape / plants / the light fixture are built and rebuilt (src/render/*, the in-place
patch path from lane J), the glass / water materials, the perf notes (EF lanes: plant / stone shaders are the GPU cost;
keep gear cheap: shared geometries, few draw calls).

Work unit:
1. Procedural models, sized from the real class (gear-models.json gph / watts -> body size): sponge filter + airline,
   internal filter, HOB filter on the back rim (intake tube, spillway, flow ripple), canister (lily pipes in / out in the
   tank, hoses over the rim, the canister in the stand when the stand is shown), heater tube (glass, coil, suction cups),
   air pump + airstone bubbles, CO2 diffuser + drop checker + bubble counter, UV inline unit, powerhead / wavemaker,
   HOB protein skimmer, sump + return nozzle for salt, ATO sensor. Translucent where real (heater glass, diffuser,
   drop checker green / blue / yellow by CO2 level when TM knows it).
2. Placement: back wall, left or right side (default the side away from the scape's focal point when that is known,
   else left), intake low / outlet high; never inside hardscape. A "Show equipment" toggle in Viewer (on by default; off
   for beauty shots and exports).
3. Wiring: draw from `TankSetup.tech` once lane TM pushes its step 1 type; until then build against a local stub list of
   gear ids from gear-models.json. Absent `tech` = draw the inferred defaults (same as the demand engine) or nothing:
   ask Nathan with pictures which.
4. Pictures BEFORE shipping, per model (front, 3/4, the default tank light) and four whole tanks (Walstad, low-tech HOB,
   high-tech canister + CO2, SPS reef with skimmer / powerheads); wait for Nathan's verdict. Record each model on
   /review.html like the other models.

Files you own: src/render/gear3d.ts (new), its build hook (one line in the scene build), the Viewer toggle (one line in
index.html / ui/panels.ts), gear entries in model-versions.json / the review page.

Ship per the lane rules: git fetch + merge origin/main, tsc + the tests you touched (suite: 120 s test timeout, about 90 s),
commit by path only (never -a), git push origin HEAD:main. Do NOT use git stash (shared across worktrees). The main
checkout holds other chats' uncommitted edits: never commit, pull, reset or stash there. Pictures of anything visible
BEFORE shipping, via SendUserFile, and wait for Nathan's verdict. No scene version bump. Fill in your stub section under
"Lane sections (current)" in HANDOFF.md. Subagents on Sonnet only; before any fan-out over 3 subagents or about 1 M tokens,
measure one batch and quote it to Nathan. Keep out of files you do not own; one-line hooks only in shared files, keep both
sides on merge. Perf: measure with alternate A/B frames (perf-baseline.mjs), not sequential runs. preview_stop when done.
preview_start serves the folder the chat was opened in: run this chat inside its worktree. If this chat gets long, hand
off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4") with
send_message when work lands on main and when you are done: commit hash, what landed, what is still open, which files are
free. Questions for Nathan stay in your own chat, with pictures. The coordinator cannot relay approvals.
