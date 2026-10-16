Read HANDOFF.md "Start here" (lane rules, coordinator protocol, current lanes) and its Lane SH stub, then
research/feature-ideas.md idea 1 (shopping list / setup sheet) and scene/weight.ts. Memory: shared-folder-commits.md,
push-live-is-fine.md.

You are lane SH: setup sheet / shopping list. Worktree C:\Users\nreed\Glass-Box-setup-sheet, branch setup-sheet, launch
config `setup-sheet`, port 5683 (npm ci is done). First git fetch + merge origin/main.

Build a printable, exportable setup sheet for the current tank, from the scene alone (no model calls):
- Tank: shape, size, glass thickness, water volume (litres / gallons by the app's unit setting), total filled weight
  (scene/weight.ts tankWeight), land / water split for a paludarium.
- Substrate: type per layer, volume and bags (state the assumed bag size and make it an editable field), from the real
  ground profile (slope, drainage layer, litter).
- Hardscape: each piece by kind with counts and approximate weight (rock, wood, cork, ledge...), and the plant list
  with counts and light / CO2 demand if the data has it; animals with counts, species and adult size.
- Equipment line items only where the scene has data (light fixture, PAR if computed); no invented prices.
Output: a "Setup sheet" button opens it as a clean printable page (print stylesheet, 375 px safe) with Print and
Download (.txt / .csv) actions; works offline in the single-file build. Seeded random data stays deterministic.
Pictures before shipping: the sheet for 3 example tanks (a planted freshwater tank, a reef, a dry terrarium), as screenshots
of the printable page; wait for Nathan's verdict. No scene version bump.

Files you own: new scene/setupsheet.ts and ui/setupsheet.ts (+ tests). One-line hooks only in ui/panels.ts / index.html
(the export area), main.ts, style.css (print rules): say so in your section. Running at the same time: T1 (Substrate
section of ui/panels.ts / index.html, render/scatter.ts), MS (selection part, ui/group.ts), lane JS (spider: herp files).
Keep out of their files; merge origin/main often.

Ship per the lane rules: git fetch + merge origin/main, tsc + tests + browser check (desktop and 375 px), commit by path
only (never -a), git push origin HEAD:main, then git -C "C:/Users/nreed/Glass Box" merge --ff-only origin/main. Add your
own dated section under "Lane sections (current)" in HANDOFF.md (a stub is already there: fill it in as you go). Any model
change goes on /review.html. When done, preview_stop your dev server. Subagents run on Sonnet only. If this chat gets
long, hand off to a fresh chat at a work-unit boundary after writing your state into your HANDOFF section.

Coordinator protocol: when each batch is pushed to main and when you are done, send_message to the coordinator, session
local_f068e2c9-f5e4-4bb9-ae20-3c37e545df0b ("Lanes coordinator 3"): the commit hash, what landed, what's still open, and
which files are now free. Questions for Nathan stay in your own chat, each about an animal / item / screen WITH its picture.
