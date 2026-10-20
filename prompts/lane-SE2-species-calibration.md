You are lane SE2 (stocking engine, per-species calibration). Worktree ../Glass-Box-stocking, branch stocking, port 5843
(add or keep a `stocking` entry in the MAIN checkout's .claude/launch.json, uncommitted; open this chat inside the worktree).
Fast-forward to origin/main first (git fetch + git merge origin/main in the worktree; never stash, never commit in the shared
folder C:/Users/nreed/Glass Box). Run on Sonnet. Subagents on Sonnet or Haiku only; before any fan-out over 3 subagents or about
1 M tokens, measure one batch and quote it to Nathan. Read first: HANDOFF.md section "Lane SE", research/aq-compare.md,
src/scene/stocking.ts (header comment), test/aqcompare.test.ts, scripts/aq-compare.mjs.

State (2026-10-20): our own stocking engine is on main. Mass = FishBase length-weight (src/data/bodymass.json). SPACE =
sum mass^0.45 / (litres x SPACE_PER_L), fitted to 24 AqAdvisor answers (median ours / AqAdvisor 1.00, scatter about +-40 %, because
AqAdvisor rates species individually: goldfish, clown loach, peacock cichlid high; corydoras, harlequin, chili rasbora low).
FILTRATION = waste (mass^0.75 x metabolism class x Q10) / (litres x LU_PER_L 0.3 x filter capacity x plants); LU_PER_L also sizes the
starters (litresFor), so changing it changes the starters. Verdict percent = the larger of space and filtration. AqAdvisor is
demoted to an optional comparison; aqadvisor.com is flaky (scripts/aq-health.mjs shows its up / down log): it was down most of 10-19.

Work, in order, each step pushed on its own when green (tsc + the tests you touched; full suite about 90 s; commit by path, never -a,
git push origin HEAD:main from the worktree; no scene version bump):
1. PER-SPECIES SPACE FACTORS. Probe AqAdvisor with ONE species at a time (12 animals, or the species' usual group, in a 55 gal
   48x13x20 in, filter left on Choose): scripts/aq-compare.mjs is the pattern (30 s apart, resumes, stops when the site is down;
   it keeps answers in a json keyed like aqKey). Add the single-species queries (about 60 fish, skip salt if AqAdvisor's salt page
   gives no percent) to test/aqcompare.test.ts's generator or a sibling, run it. Fit one factor per species (ours / theirs of the
   single-species tank); where the factors cluster by body type (long and slim, deep, bottom sitter, big cichlid) store the factor per
   CLASS with exceptions by id, in a small data table in src/data (new file, each row one line saying why). The engine multiplies the
   space load by it and shows it as an adjustment in the breakdown ("counted 1.4x for a bulky body"); mass^0.45 stays the base. Keep the
   explanations true: the table says "fitted to AqAdvisor", not a biological claim. Then re-run the 24 mixed combinations as the test:
   report median ratio and scatter before / after, and the five worst residuals. Pictures of the table for Nathan before step 2.
2. FILTRATION PROBE. Through Claude in Chrome (Nathan's real browser; the proxy only captured page script), open the AqAdvisor
   calculator for 4 to 6 tanks with a filter chosen (their filter list on the page; pick two or three real models), read the
   filtration figure it prints, and compare with filtrationPercent. Fit LU_PER_L's filtration side only if the two disagree by more than
   about 25 %; if so, split the starter-sizing constant from the filtration constant so the starters keep their counts
   (research/stocking-calibration.md has the before / after table).
3. STARTERS + WIRING. With the new space number, re-run the before / after counts per starter at stops 2 and 4 and the percent each
   reads (the Full stop read 55-65 % before the fit); if Full is far from 85-95 %, say so and ask Nathan before changing starter.ts
   (shared file: keep edits to the bioload helpers). Expose-only so far: wire stockingOf into the demand panel and the Quick Setup
   wizard ONLY if Nathan says so.

Files you own: src/scene/stocking.ts, src/data/bodymass.json, bodyvolume.json, the new species-factor table, test/stocking.test.ts,
test/aqcompare.test.ts, test/bodymass.test.ts, scripts/body-mass.mjs, scripts/aq-compare.mjs, scripts/lw-sources.json, the stocking line
in src/ui/panels.ts (syncStocking, aqChip) and its markup in index.html, litresFor / bioload helpers in src/scene/starter.ts. Read only:
src/scene/tech.ts and tech.json (lane TM), waterchem.ts, animalfit.ts, care.ts, src/render/*3d.ts. Known unrelated: tsc may show errors in
src/ui/demandPanel.ts (missing gearDeals files from another lane); not yours.

Add each result to your dated lines under "Lane SE" in HANDOFF.md as you go. Model changes, if any, are recorded on /review.html.
preview_stop when done. Coordinator protocol: message local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4") with
send_message when work lands on main (commit hash, what landed, what is open, which files are free). Questions for Nathan stay in
your own chat, with pictures (tank, species, numbers); the coordinator cannot relay approvals.
