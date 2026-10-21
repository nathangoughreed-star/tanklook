You are lane NB: Nitrogen Balance (Coordinator 6, session local_cd7298f9-aef8-4622-b47e-d9f3fcc54479, assigned this ID; never rename
the chat). Work in your own worktree: from "C:\Users\nreed\Glass Box" run
git fetch origin; git worktree add ".claude/worktrees/nb" -b nb origin/main; then work only in .claude/worktrees/nb.
If this file is missing there, git show origin/main:prompts/lane-NB-nitrogen-balance.md. Reply in US units (gal, in, ppm, deg F).

Read first: HANDOFF.md "Start here" (lane rules; run `npm run build` before EVERY push), the SE2 / S164 / Lane MW sections (nitrogen
engine, water-change schedule); research/tank-minimum-first-principles.md "Decisions" 2 (binding); src/scene/nitrogen.ts
(`nitrogenBudget`), src/scene/stocking.ts (water-change floor 10 % / cap 50 %), test/nitrogen.test.ts.
Background: an external review flagged a "2 % water change a week" result (13 barbs, planted, about 18.5 gal). Chats S183 and S185
traced it by hand: units are mg N throughout (9 mg N/L = 40 ppm NO3), plants share one budget (TAN uptake capped at 60 %, the spare
takes nitrate), so the 2 % is real arithmetic. The weak point is the input (plant uptake from one Egeria study, extrapolated).

Scope:
1. Tests first (test/nitrogen.test.ts): ledger balance (animals' N = plants + water change + any other sink, per day); a known case
   4 ppm/week of nitrate -> 10 %; pin the 13-barb case's figure; plants removed -> the plant-free figure.
2. Source-water nitrate: an input (default 0, or a setting if one exists) and an "environmental failure" state when tap nitrate is at
   or above the target, instead of a normal percentage (Decision 2 state c).
3. Decision 2's three states for water changes: (a) within the default schedule, (b) high maintenance (over 50 % in one change: show
   the uncapped figure, suggest two smaller changes a week, or less stock), (c) environmental failure.
4. Wording: label the computed figure "nitrate-only" beside the 10 % routine floor; show the plant-free filter load beside the
   plant-assisted one (for the 13 barbs, 34 % vs 14 %); a "cycle a new filter first" note; soften the fertilizer line; make the
   "mg ammonia" label say mg N (TAN). The Filtration bar claims only ammonia processing.
Out of scope: the mobile drawer layout, a plant-uptake uncertainty range (note them as gaps).
Files you own: src/scene/nitrogen.ts, test/nitrogen.test.ts, the water-change lines of src/scene/stocking.ts and the nitrogen text in
the UI panels (say which in your HANDOFF section; lanes MA and MX do not touch these). No subagent fan-out.
Questions about how the panel looks go to Nathan in this chat WITH screenshots (before / after).
Done = `npm run build` and the full suite pass, pushed (git fetch; git rebase origin/main; git push origin HEAD:main), a "## Lane NB"
HANDOFF section, then send_message the coordinator (local_cd7298f9-aef8-4622-b47e-d9f3fcc54479) a short report with the build number.
