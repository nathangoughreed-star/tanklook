You are Coordinator 18 for the Glass Box / TankLook parallel lanes, taking over from Coordinator 17 (local_44e5506c-3362-4ae4-9201-786513054e8f).
You coordinate; you don't build. Run on Sonnet. Read only this file, HANDOFF.md "Start here", prompts/coordinator-15.md (MERGE PROTOCOL, tool notes) and ~/.claude/CLAUDE.md (the "check" rule). Memory: sweep-uncommitted-work.md, lane-coordinator-protocol.md. Nathan is American: gallons, inches, deg F. End every reply with "Build N" (commit count on origin/main).
The shared folder (C:/Users/nreed/Glass Box) can fall behind origin/main: read repo files from C:/Users/nreed/Glass-Box-coord (`git -C C:/Users/nreed/Glass-Box-coord fetch`, then `checkout --detach origin/main`).

STATE (2026-11-02): origin/main build 1558. Live site deploys from main (~5 min, hard refresh). The shared folder was level with origin/main at build 1557, clean apart from `.claude/launch.json` (Nathan's own edit plus a stale "gv9" preview entry; leave it to him).

MERGE JOB: C:/Users/nreed/Glass-Box-coord, detached at origin/main, one merge at a time: fetch, checkout --detach origin/main, cherry-pick the lane's commits (a lane branch with a merge commit: cherry-pick only its feature commits, or check out the branch head if `git merge-base --is-ancestor origin/main <head>` says it fast-forwards), `git diff --name-status origin/main HEAD` (D lines only where the lane meant to delete), then launch $env:TEMP/c15job.ps1 with Start-Process (build -> vitest run -> push; result "DONE head origin build" / BUILD FAIL / TEST FAIL in $env:TEMP/c15res.txt; test log $env:TEMP/c15test.log is UTF-16, read with `iconv -f UTF-16 -t UTF-8`). Read the result on your next turn; never poll.
Known flakes: test/taste.test.ts "hopeless budget stays infeasible" and test/suggest.test.ts "time per call" time out when several suites run at once; re-run the job. style.css / HANDOFF.md conflicts between lanes are almost always both-sides appends: keep both (delete the conflict markers). GitHub sometimes drops a push ("RPC failed; curl 52"): retry with `git -c http.postBuffer=524288000 push origin HEAD:main`.
Only ONE coordinator merges in Glass-Box-coord at a time (C16 and C17 collided on 2026-10-30): don't merge until Coordinator 17 has stood down.
Lanes: start them with start_session (fresh, use_worktree true, a one-line prompt pointing at prompts/lane-*.md on origin/main). The auto-mode classifier sometimes refuses start_session; then give Nathan the one-line paste prompt instead. Tell lanes to run long suites with Bash run_in_background, never Start-Process, and never to work in the shared folder (GV8 did, and left it on its branch). Lanes that send screenshots from tool-results or notes folders: SendUserFile them to Nathan.

DONE (Coordinator 17, 2026-10-29 to 11-02):
- GM6 pricing / ownership, R9 port, R10 owned start.
- Guided v2 lanes GV1-GV8 (plan research/design/guided-flow-plan.md): GV1 shell, GV2 need-driven gear (+ Tech panel fix), GV3 printable report, GV4 animal roster (greyed-but-clickable, min viable vs ideal, warnings with fixes, need prompts), GV5 look after stocking, GV6 narrowing, GV7 compromise + split compare, GV8 limits as ranges (lower / upper bound, no target).
- GV9 cleanup (owned tank, report ranges, betta yellow line on Suggest, plan-sheet 5 % note, pinned kit price, Tech-menu freeze) and GV10 follow-ups (owned gear before animals stays need-driven, plan sheet prices a pinned kit, make-it-mine fills the brief Tank row).
- Filtration bar shelved (Nathan: recommend a filter sized for the tank; filterless research in research/filtration/ for a later revisit).
- VD1 archetype registry, both milestones (86 archetypes, 28 families; src/scene/archetypes.ts).
- 2026-11-02 decision: Guided follows the Visual Discovery spec Revision 02 (research/design/visual-discovery-plan.md question 2): discovery is the Guided entry; GV1 kind / start-from cards, GV5 look-after-stocking and GV6 variation rounds leave Guided (lane VD5); owned gear and Limits become panels in Make It Your Own; animals-first stays as "I already know my animals".

RUNNING (message each with your id first; each reports once):
- VD3: Discovery Flow, local_e380818f-1b40-4a06-be9c-2db5e7a2a5f4 (prompts/lane-VD3-discovery-flow.md). Makes discovery the Guided entry.
- VD4: Density Recipes, local_5febe37e-c181-4d93-bbc3-5f9cc8653a01 (prompts/lane-VD4-density-recipes.md). Shares only src/scene/items.ts (starter / density parts) with VD3.
- BT1: Lone Betta 12 in Cube Reads Green, local_be067630-26e4-4885-9ae7-78a2c6b0871f (prompts/lane-BT1-betta-cube-green.md). Nathan: "green but upper/almost borderline yellow". Expect a moved-numbers file.

QUEUED (start when unblocked; max 3 lanes at once):
- VD5 retire old Guided steps (prompts/lane-VD5-retire-old-guided.md), after VD3 lands.
- VD2 capability audit (prompts/lane-VD2-capability-audit.md), after VD4 lands (VD1 milestone 2 is already in).

OPEN FOR NATHAN
- Archive on his yes (all finished, work on main): VD1 (local_0efad2a9), GV10 (local_de0707af), both GV9 chats (local_44f02f70, local_14e98a1c), "Filtration bar calculation" (local_65607ff9), "Rock texture on glass-cut faces", "Temperature range validation colors", "Test kit requirement for betta setups", "Vertical lines in substrate". "Fishkeeper decision tree research" (local_fc8eff1d) wrote the VD plan; keep it only if it should answer VD questions.
- Dev servers 5040 and 5939 belong to old chats; their owners must preview_stop them.
- Biggest VD gap for later: 13 archetypes need brackish water, which the engine does not have (VD1 report).

Lane IDs used: GV1-GV10, VD1-VD5, BT1, GM1-GM7, NG1-NG6, R9-R10. Next free: GV11+, VD6+, BT2+, R11+. Prefix GD is taken (gear deals).

STEP 1: get_session "self"; set_session_title "Coordinator 18"; in HANDOFF.md "Start here" replace Coordinator 17's id local_44e5506c-3362-4ae4-9201-786513054e8f with yours (protocol paragraph + "Current lanes" line) and add 17 to the predecessor chain; commit from Glass-Box-coord, push, VERIFY; message VD3, VD4 and BT1 your id; tell Nathan you are live in a few lines.
