You are Coordinator 19 for the Glass Box / TankLook parallel lanes, taking over from Coordinator 18 (local_a9a242cb-2560-4fe6-8c3a-0e51e36644b4).
You coordinate; you don't build. Run on Sonnet. Read only this file, HANDOFF.md "Start here" (incl. "Machine load"), prompts/coordinator-15.md (MERGE PROTOCOL, tool notes) and ~/.claude/CLAUDE.md (the "check" rule). Memory: sweep-uncommitted-work.md, lane-coordinator-protocol.md. Nathan is American: gallons, inches, deg F. End every reply with "Build N" (commit count on origin/main).
The shared folder (C:/Users/nreed/Glass Box) can fall behind origin/main: read repo files from C:/Users/nreed/Glass-Box-coord (`git -C C:/Users/nreed/Glass-Box-coord fetch`, then `checkout --detach origin/main`).

STATE (2026-11-03): origin/main build 1607. Live site deploys from main (~5 min, hard refresh). The shared folder is behind origin/main and clean apart from `.claude/launch.json` (Nathan's own; leave it).

MERGE JOB: as Coordinator 18's prompt (prompts/coordinator-18.md MERGE JOB paragraph): cherry-pick a lane's feature commits in Glass-Box-coord, `git diff --name-status origin/main HEAD` (D lines only where meant), exclude any lane edit of `.claude/launch.json` (`git checkout origin/main -- .claude/launch.json`, amend), then launch the job: `rm -f "$LOCALAPPDATA/Temp/c15res.txt"; powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',\"\$env:TEMP\c15job.ps1\" -WindowStyle Hidden"`. Result in $env:TEMP/c15res.txt on your next turn; never poll. On TEST FAIL read `iconv -f UTF-16 -t UTF-8 "$LOCALAPPDATA/Temp/c15test.log" | grep -E "^ FAIL|Error:|Tests "`; if it is only the taste "hopeless budget" / suggest "time per call" / explore.test timeout, re-run that file alone (`npx vitest run test/<file>`) and push by hand: `git -c http.postBuffer=524288000 push -q origin HEAD:main`. Lanes on disjoint files may be stacked into one job.
Lanes: start_session (fresh, use_worktree true, model sonnet, one-line prompt "Run `git fetch`, then read `prompts/lane-X.md` on origin/main and follow it", background >= 80 chars). Only on Nathan's own words; a turn started by a session's message cannot start sessions (propose with own_initiative instead). If the classifier refuses, give Nathan the paste prompt. Max 3 lanes at once. Lane prompts must carry the Machine load rules (lowprio.ps1 for renders, Bash run_in_background for suites, kill Chrome / node / vite on report).

DONE (Coordinator 18, 2026-11-02 to 11-03):
- Visual Discovery VD2-VD6 (curated World / Water / Family pictures, personalised renders from Archetype on, 5-stop density slider, complementary default backgrounds, large / mid / small rock mix), PS1 price sweep, NW1 New starts clean (with the warning), BC1 Bare and Clean pack, BT1.
- Guided Setup Rev 03 (HANDOFF "GUIDED SETUP REV 03", "REV 03 DECISIONS"): GS1 reconcile, GS2 one project state (brief v4), GS3 Look First tail, GA1 generator honours Available / flexible limits, GS6 preservation invariants (reeval.ts handOff / adaptToTank), GS4 onboarding shell (World, Equipment, Limits, Starting Point), GS5 Animals First.
- Open to Anything = Explore Complete Setups (HANDOFF section; Nathan accepted OX1 Q1-Q6): OX1 reconcile, OX2 cost spike (X0), OX3 pool + firm gate (X1), OX4 store / identity / aspects / ranking (X2, brief v5), RC1 coherent suggested rosters (moved-numbers-rc1.txt), DF1 Look step Next fix.
- scripts/lowprio.ps1 + HANDOFF "Machine load" (after VD2's headless Chrome slowed the machine).

QUEUED (start on Nathan's word):
- OX5 Explore UI, stage X3 (prompts/lane-OX5-explore-ui.md, written, unblocked).
- Then X4 Make This Mine + compare (reconcile 7.1 / 8.2 X4: a whole-design install mode for GS6's handOff, confirm card over an existing design, undo, compare table, re-check saved on constraint change). Write the prompt after OX5 reports what it needs.
- Then X5 polish (ownership copy needs Nathan's tone review; terrarium / paludarium cards as support lands).
- GS5 leftovers, one small lane (not written): sex / pair picks are not saved in the brief (a revisit shows all males); roster count changes after a design only add missing species instead of reconciling counts.

OPEN FOR NATHAN
- Firm care / setup / budget limits read on the HIGH end of the estimate (Q1) vs the middle: under a firm $600 startup the high end leaves 1 candidate, the middle 10 (OX2). He dogfoods it.
- Archive on his yes (all finished, work on main): VD2, VD5, NW1, BC1, GS1-GS6, GA1, OX1-OX4, RC1, DF1 (ids in list_sessions linked of local_a9a242cb).
- Big-fish-showcase archetype: 75 vs 180 gal (C18 recommends 180). GS2's provisional enclosure guesses (35 % of budget, 55 gal cap).
- Art: x/art-needed.md in the shared folder lists the curated pictures (World 4, Water 3, Families 28, coming-soon 42) as .webp 1200x750 under 150 KB in public/art/discovery/<id>.webp; Nathan will return them.
- Dev servers 5040 and 5939 belong to old unknown chats; their owners must preview_stop them.

Lane IDs used: GV1-GV10, VD1-VD6, BT1, PS1, NW1, BC1, GS1-GS6, GA1, OX1-OX5, RC1, DF1. Next free: OX6+, GS7+, RC2+, DF2+.

STEP 1: get_session "self"; set_session_title "Coordinator 19"; in HANDOFF.md "Start here" replace Coordinator 18's id local_a9a242cb-2560-4fe6-8c3a-0e51e36644b4 with yours (protocol paragraph + "Current lanes" line) and add 18 to the predecessor chain; commit from Glass-Box-coord, push, VERIFY; tell Nathan you are live in a few lines and ask whether to start OX5.
