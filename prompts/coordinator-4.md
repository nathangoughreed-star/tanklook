You are the new coordinator for the Glass Box parallel lanes, taking over from session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"). You coordinate; you don't build features. Run on
Sonnet unless Nathan says otherwise; coordination is routing and bookkeeping.

Read first: HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes). History is in HANDOFF-archive.md,
search it by heading only when you need it. Memory: lane-coordinator-protocol.md, shared-folder-commits.md,
build-number-footer.md. The "check" rule is in ~/.claude/CLAUDE.md.

Step 1, take over:
- get_session "self"; rename this chat "Lanes coordinator 4".
- In HANDOFF.md "Start here", replace the coordinator id local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b / "Lanes coordinator 3"
  with yours (both places: the protocol paragraph and the "Current lanes" line). Commit by path, push. If the main checkout
  has another chat's uncommitted edits, commit from the detached worktree ../Glass-Box-coord (git -C ../Glass-Box-coord fetch;
  checkout --detach origin/main; edit; commit; push origin HEAD:main).
- send_message the one lane that is still open (EN, below) your id, one line.
- Tell Nathan you're live and that the old coordinator chat can be archived. Say that archiving saves nothing on usage
  (idle chats cost nothing); it only stops processes, frees ports and tidies the sidebar.

State (2026-10-19, build 698):
- NO lane is running. All lane chats are archived except EN. Everything from the roadmap's P0 list is built: dry
  terrestrial grounds + leaf litter + 3D grains (T1), swamp as editable terrain with pools (SW), terrestrial plants (T2, PP),
  dry hardscape + surface anchors (T3), aquatic roster + reef pieces (T4), all five animals (G1 crested + leopard gecko, JS
  regal jumping spider, TA Chaco golden knee tarantula, BP ball python, BP2 follow-ups with a life-stage picker), multi-select
  / duplicate / seeded copies (MS), scatter brush with seeded patches (SB), setup sheet (SH), plant / coral light + care
  gating with shade toggle, badges and auto-populate (PG), 14 new starter styles (SS2), enclosure presets + mesh lid + doors
  (EN batch 1), water dish + succulents + Malawi fish (CP). Nathan's own side chats (cling / perch on leaves and undersides
  CL, Quick Setup, plant propagation PR step 1, plant appearance, hollow rock) landed on main without a lane.
- STILL OPEN LANE: EN enclosure (`local_b3dafda6-8ce2-46ca-b673-6df13127d1c9`, worktree ../Glass-Box-enclosure, branch
  `enclosure`, port 5673). Batch 1 is on main. Batch 2, equipment pieces (heater, filter, mister nozzle, light bar), is ON HOLD
  at Nathan's call ("models not good enough"); one local unpushed commit 6f5f307. Waiting for Nathan: better models, a
  different gap (light mood / direction, botanical / plain backdrop), or stop. Do not push its branch.
- Open for Nathan (ask once, in the right chat, with pictures per the rule): PG's Light map eyeball with the aquascape
  toggle, "does care also set dosing advice?", the stretch slider, the estimate numbers listed in HANDOFF's "Plant / coral
  light-and-care advice" section; the ADF record press on the review sheet.
- Open work that could become lanes (offer, don't open without Nathan): cling / perch leftovers (leaf sway, thin stems give
  no faces, floating plants, CL section); plant propagation step 2 (competition, shading, light-map scaling, rhizome and mat
  limits; PR section); re-record the ~70 "changed" older models on /review.html after checking each change is intended; re-run
  scripts/aqadvisor-ids.py (CP's new cichlids use stand-in ids) and add them to the Malawi starter pool; scatter brush cursor
  ring and box-select of patches; snake tongue; group item sliders edit only the lead piece; PNG import (roadmap rank 7,
  queued); reusable saved groups; LAST: build.ts / panels.ts splits (plan in research/efficiency/E2-code-audit.md; do it with
  no other lane running). Nathan dropped "precise controls" (fish pose / size, finer growth slider, exact seed / raise) as
  not important right now. W Android app is PAUSED (session local_0827844e, one uncommitted shortcuts.xml): do not message.
  iPhone AR stays hidden behind ?ar=ios until Nathan has an iPhone (IOS_FLAG in render/ar.ts).
- Cleanup waiting on Nathan (auto mode blocks the forced delete; ask him to run it): worktrees ../Glass-Box-python,
  ../Glass-Box-spider, ../Glass-Box-tarantula, ../Glass-Box-content hold untracked scratch files (check the two
  regaljumper model-sheet JPGs in content first), then delete the merged branches python, spider, tarantula, content-pack.
  git -C "C:/Users/nreed/Glass Box" worktree remove --force ../Glass-Box-<name>
- The main checkout may hold another chat's uncommitted edits (src/render/plant3d.ts at 07:53 on 2026-10-19): commit by
  path only, never -a; leave other chats' files alone.
- The usage buckets: read get_usage before opening lanes. Weekly all-models sat at 87 % on 2026-10-16 and resets each Friday
  night; check it at the start of a work unit and quote it to Nathan before a fan-out.

How you work (efficiency rules, Nathan 2026-10-16):
- Lane prompts are written to prompts/lane-<X>.md; give Nathan ONE line per chat to paste: "You are lane X. Read
  prompts/lane-X.md and follow it." plus the folder to open it in. Never paste full prompts into chat. Examples to copy the
  shape of: prompts/lane-EN-enclosure.md, lane-SB-scatter-brush.md, lane-BP2-python-followups.md.
- Every prompt: worktree / branch / port, owned files and who shares files (one-line hooks only, keep both sides on
  merge), ship per the lane rules, pictures before shipping and wait for Nathan's verdict, its own dated HANDOFF section
  under "Lane sections (current)" (write the stub yourself so the lane fills it in), model changes recorded on
  /review.html, preview_stop when done, the report-to-coordinator line with your id, and: "if this chat gets long, hand off
  to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section".
- Set up worktrees yourself: git worktree add ../Glass-Box-<name> -b <name> origin/main, npm ci (background), a launch.json
  entry (ports are free from 5673 up in steps of 10), a row in the Current lanes table, the stub section. Writing the prompt
  files and the launch / HANDOFF edits from a Python script in the scratchpad is much faster and avoids shell-quoting
  errors (heredocs with prose break; write the script with the Write tool, then run it).
- When a lane reports done: verify its worktree is clean and has nothing unpushed, then run
  python scripts/coord-close.py "## Lane XX" "| XX " <launch-config> (moves its HANDOFF section to HANDOFF-archive.md
  with an index line, drops its row and launch entry), git worktree remove the worktree and delete its branch, commit by
  path, push, archive its chat (the app refuses while it is mid-turn or open on screen: retry later), and check its dev
  server is stopped. Relay what landed in plain words, with what is still open. No hourly cron sweep.
- Before saying anything is waiting or done, sweep: list_sessions; git status / ahead / behind per worktree; list_events
  on idle lanes for the question they're stuck on; listening ports 5170-5990 (5173-5175 and others may be Nathan's own
  chats, 5939 is TeamViewer).
- Lanes refuse approvals relayed by you: tell Nathan to answer in the lane's own chat. Nathan's side chats that are not
  lanes (fixes he asked for directly) are his: don't close or direct them.
- End every reply with "Build N" (git rev-list --count origin/main after a fetch).
- Hand yourself off to a fresh coordinator once this chat gets long (about a third of the context): rewrite this file as
  prompts/coordinator-5.md with the current state first.
