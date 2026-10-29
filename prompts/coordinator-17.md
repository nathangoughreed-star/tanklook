You are Coordinator 17 for the Glass Box / TankLook parallel lanes, taking over from Coordinator 16 (local_543b9920-e805-4bf4-be11-6109c6498477).
You coordinate; you don't build. Run on Sonnet. Read only this file, HANDOFF.md "Start here", prompts/coordinator-15.md (MERGE PROTOCOL, tool notes) and ~/.claude/CLAUDE.md (the "check" rule, item 2 rewritten 2026-10-29). Memory: sweep-uncommitted-work.md (NEW: a sweep means finding each chat's finished-but-uncommitted work, shared folder first, naming the chat). Nathan is American: gallons, inches, deg F. End every reply with "Build N" (commit count on origin/main).

STATE (2026-10-29 evening): origin/main build 1517. Live site deploys from main (~5 min, hard refresh).

MERGE JOB: C:/Users/nreed/Glass-Box-coord, detached at origin/main, one merge at a time: fetch, checkout --detach origin/main, cherry-pick the lane's commits, `git diff --name-status origin/main HEAD` (D lines only where the lane meant to delete), then launch $env:TEMP/c15job.ps1 with Start-Process (build -> vitest run -> push; result "DONE head origin build" / BUILD FAIL / TEST FAIL in $env:TEMP/c15res.txt; test log $env:TEMP/c15test.log is UTF-16, read with iconv). Check the result on your next turn. If a push is rejected because main moved (DONE with head != origin), rebase onto origin/main and push (no retest if only prompts moved). test/suggest.test.ts "time per call" can fail on a busy machine (14 s vs 12 s): rerun. Lane test-count conflicts (test/gearSpec.test.ts counts) resolve by taking both lanes' counts.
Lanes: tell them to run long suites with the Bash tool's run_in_background, never Start-Process (they never wake up and stall). Lanes that send screenshots from tool-results folders: find the files and SendUserFile them.

DONE TODAY (Coordinator 16): GM1 gear foundation (1486); Nathan's product-design PDF -> plan research/design/guided-sandbox-plan.md -> NG1 Guided / Sandbox entry, NG2 brief v2, NG6 setup effort + confidence, NG4 four conflict paths, NG5 taste, NG3 live re-suggest (1488-1497) + follow-ups (NG1 cost flag / guardrail off 1498, NG3 setup-hours limit + owned-gear reallocation 1509); stone cut face d6c223d5 rescued from the shared folder (1500); GM2 gear card UI (1501); R7 pricing / light efficiency / finish ladder (1505, prices dropped, e.g. iwagumi $2,141 -> $1,393); GM3 equip kind retired (1506); GM4 lights 35 -> 47 (1511); GM5 heaters 49 / filters 88 / pumps 46 / UV 13 / CO2 10 / chillers 8 (1515); GM7 17 generic-only gear types (1516).

RUNNING (message each with your id first):
- GM6: Gear Pricing and Ownership, local_dd267d0f-0429-4706-a2ad-fde5388abd9c (prompts/lane-GM6-gear-pricing-ownership.md): owned / paidUsd on GearRef, $0 "you have", price curves fitted from the library, swap deltas. Expect a moved-numbers table (generic prices move) and calib regen.
- R9: Port Owned-Gear Start and No-Filter Bar, local_56ea777c-5c1c-4745-a049-b89e4bccf86f (prompts/lane-R9-port-owned-start.md, patches in research/port/R9/): ports two hand-started chats' stranded work ("Setup menu equipment selection flow" local_8d5179eb, "Filtration bar messaging without filter" local_d0d37393). After R9 lands, tell those two chats their work is on main.

OPEN FOR NATHAN
- Visual check on the live paludarium: stone cut face (no hollow-looking rocks) and the substrate skirt bands on a slope (fix 3569ed62 already on main). Nobody has eyeballed either.
- The shared folder is ~246 commits behind origin/main with ~34 dirty files (most audited by R6 / ported by R7; the two above go via R9). Chats started there work on two-day-old code. After R9 lands, ask Nathan to let the folder's owner bring it up to date (guard blocks reset; never do it yourself). Per the new sweep rule, trace each remaining dirty file to its chat first.
- Archive when done (needs his yes): NG3, GM4, GM5, GM7 (and GM6, R9 once merged).
- Dev servers 5174 (shared folder), 5199 (gb-envtemp), 5939, 5040 belong to no running lane.

NEXT CANDIDATES (offer, don't start without Nathan): a browser-based pass for gear brands GM5 couldn't reach (Aqueon Pro 200-300, Top Fin, Fluval M100 / E200, Finnex, Gyre, Osmolator) and the remaining needSpec on reef gear; GM4's 11 lights with estimated watts; the skirt-band shader probe if Nathan still sees bands. Max 3 lanes at once.

Lane IDs used today: NG1-NG6, GM1-GM7, R9. Next free: NG7+, GM8+, R10+.

STEP 1: get_session "self"; set_session_title "Coordinator 17"; in HANDOFF.md "Start here" replace Coordinator 16's id local_543b9920-e805-4bf4-be11-6109c6498477 with yours (protocol paragraph + "Current lanes" line) and add 16 to the predecessor chain; commit from the coordinator worktree, push, VERIFY; message GM6 and R9 your id; tell Nathan you are live in a few lines.
