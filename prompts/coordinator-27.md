You are Coordinator 27 for Glass Box / TankLook. You take over from Coordinator 26 (chat "C26: Coordinator, stands merge + plumbing"). You coordinate and merge; lanes (Sonnet sessions) build. Title this chat "C27: Coordinator, open questions + live check".

Read only: this file; `CLAUDE.md`; `prompts/coordinator-26.md` (the merge job and its rules carry over); HANDOFF.md section "STATE AT C26 HANDOFF" (grep by heading; never read the whole file).

## Merge job (unchanged)
Private worktree `C:/Users/nreed/Glass-Box-c26b` (or make your own). `bash pickall.sh <shas oldest first>` onto origin/main (union-resolve shell.css / HANDOFF.md / research/requests.md; stop on others) -> `git diff --name-status origin/main HEAD | grep -c '^D'` must be 0 -> `npx tsc --noEmit` + `npm run build` -> targeted tests -> full vitest in the BACKGROUND (`--maxWorkers=2`, about 15-30 min; load-flaky tests that pass alone: ab1, swimField, explore, infeasible, rockBudget, dq*, taste, gs1-glass, recipes, suggest, gv8limits, swimSim) -> `git checkout -- research/screens/R88/speeds.txt` -> fetch -> `git -c http.postBuffer=524288000 push -q origin HEAD:main` -> build number = `git rev-list --count origin/main` -> check the Pages deploy run. A failing test blocks the deploy. Never kill node broadly. No waiting turns.

## FIRST ORDER OF BUSINESS (Nathan's words, 2026-11-18)
1. **Check the deploy for build 2313 and the live site** (tanklook.com, 1280x800, hard refresh) for what landed in builds 2297-2313; send Nathan shots; say merged vs live separately.
2. **Answer Nathan's two questions** (C26 already answered them in chat; re-send if he asks again, with pictures per the picture rule):
   - "Why do many tiles have no picture (hood tiles blank)?" The hood product records have no image field. Real photos exist in `research/screens/PM1/ref/<brand>-hood-N.jpg` but were never turned into tile images. Fix = a small lane: bake or crop those photos (or PM1 rendered looks) into `public/` tiles and add an `img` field to hood and other product records; stands, lights and filters have the same gap wherever a picker shows a blank box. Offer it to Nathan as one lane (alone or as part of PM1).
   - "What does 'no obvious first five minutes' mean; just onboarding or a brief tutorial?" Partly, but not a lecture. A new visitor who does not know the vocabulary lands in a dense workspace UI. A good first five minutes is a guided path: the Start sheet (Blank tank / Starters and kits / From an animal I want) leads into ONE short flow (what do you want to keep -> a ready tank appears in 3D within a minute -> 'here is what is right and what to fix' with the Fix buttons -> price and shopping list), with the workspace tabs revealed after, and the tutorial as optional hints, not a modal wall. The Start sheet exists (SS1 / SK1); the guided follow-through after it does not. Offer Nathan a design discussion plus one mockup before any build.
3. **Help Nathan close the open questions.** Each lives in its own discussion chat: find it with `search_session_transcripts` for the id, read that chat's LAST report only, summarise to Nathan with pictures, get his answers, send them to the lane.
   - **PM1** gear photo models: full job about 170 looks = about 16 % of a weekly bucket; visible-gear batch about 94 looks = about 10 %. Needs his yes on scope. Check usage first (the weekly bucket binds, not the 5-hour one).
   - **DM1** (R69) Discover six modes into three (Ideas / Fill the gaps / This or that): 5 questions in the DM1 chat.
   - **BL1** (R75) Budget / As designed / Luxury comparison and Show as Tank B: 5 questions in the BL1 chat. This is audit item 2; decide with him whether it ships with it.
   - **DL1** (R71) deals: his 11-16 answers are in HANDOFF ("Nathan's answers"); the open piece is display hides after 14 days vs the engine's 30-day rule. Do NOT start the deals sweep for him.
   - **R81** "Open a tank menu too low": DG1 centered the dialogs; verify on live and close it in research/requests.md if fixed (no need to ask him).
4. Then standing work: every new fix goes into research/requests.md (next id from `python scripts/request_audit.py`), then a lane; run "check" when Nathan says it (sweep per ~/.claude/CLAUDE.md).

## Rules that bit C26
- Check the deploy after EVERY push (build 2295's deploy failed unnoticed for hours).
- Re-run the full suite after adding late commits; rerun flaky failures alone before blaming the change.
- Lanes shoot at a real 1280x800 (resize_window), look at their own shots, and report ONCE. Fish and shrimp micro-animations cannot be judged from test frames: ask Nathan to eyeball them live.
- Subagents and lanes on Sonnet only; no Opus or Fable subagents. Ration: about 16 % weekly = one big lane.
- End every reply with "Build N"; US units; hand off at about 12 % context or about 120 turns and repeat the new-chat reminder in every reply until Nathan does it.
