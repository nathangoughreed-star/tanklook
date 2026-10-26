You are S216b: Expert Calibration Rounds (continuation of chat S216 / XC, 2026-10-23 to 2026-10-26; set the title "S216b: Expert Calibration Rounds").
Work in your own worktree: `git -C "C:\Users\nreed\Glass Box" fetch origin; git -C "C:\Users\nreed\Glass Box" worktree add ".claude/worktrees/s216b" -b s216b origin/main`,
junction node_modules to the shared checkout's, then the change-directory tool. Never work in the stale C:\Users\nreed\Glass-Box-stocking folder, and never
commit in another lane's worktree. Lanes do not push: send the coordinator (Coordinator 10, local_901f3080, or its successor in HANDOFF "Start here")
a ready sha after fetch, rebase, full suite and build; it pushes with Nathan's yes.

## State first (main, 2026-10-26)

- **What exists.** Rounds 1, 2, 3 and 3a of the expert calibration are on main: research/calib/round-*.json (frozen tanks), survey-round-*.html,
  answers/ (4 files: round-1-ngr = Nathan, 5 tanks, with pictures; round-2-ngr-ai; round-3-chatgpt (answers round 3a); round-3-chatgpt-high,
  all 22 tanks of round 3), review-round-*-*.md, tables/round-*.json, fit-round-1-2-3a-3.{json,md}. Tooling: src/calib/scenario.ts (generator,
  gateOf, floorShareOf = stocking.ts floorShare), scripts/calib-fit.mjs (fit, combine, buildOf / answersFit, withTables / loadTables),
  scripts/calib-review.mjs, scripts/calib-survey.mjs (survey 3.1), scripts/calib-synth.mjs; tests test/calib.test.ts, calibfit.test.ts,
  calibtables.test.ts. The design and every decision: research/expert-calibration.md, sections 0-15 (read 0, 9, 12, 13, 15 first).
- **Survey v4** (S220, the "Stocking compatibility survey redesign" chat) is the live survey now: research/calib/v4, its own tables, parser,
  fit and review; it shares calib-fit.mjs (buildOf / answersFit has a v4 branch) and stocking.ts floorShare. Rounds 1-3 tooling must not break it.
- **Fit on all rounds, today's engine** (after S214's otocinclus change, 08046dc): water x0.876, floor x1.014, classes big +5 %, invert -10 %,
  mid +11 %, tiny -9 %; fitted error falls (0.28 -> 0.21) but the held-out error rises (0.219 -> 0.311). 3 of the 4 experts are AI models and no
  tank has two experts' answers. **Nothing is applied**: no global scale (SPACE_PER_L, floor) without human answers and Nathan's yes
  (Coordinator 9 and 10). Lane SR's re-centre of SPACE_PER_L is the same knob; only one owner, Nathan's call.
- **Findings to carry** (sections 13-15): answers tie to the tanks they answered by build (round 3 was redrawn under the same ids; 3a keeps the
  first build); the max rule held 26 of 26 (overall follows the tighter of floor and water); experts read water fuller and floor emptier than the
  engine (the floor gap closed with S212's and S214's floor changes); panda thresholds 12 / 18 on a 30 x 12 in floor, 15 / 22 on 36 x 12; the AI
  experts split on whether a 1-2 °C shared range is a concern (temprange.ts NARROW_C = 2).

## Decided

- **Rounds 1-3 data stay in and are used** (Nathan 2026-10-26, via Coordinator 10): "keep the old data too, and use it. Its still valuable."
  Their answers are fitted next to v4's, not dropped and not only held out. Whether to keep extending the old round design (round 4 from
  makeRound) was not answered: do not generate new rounds without asking.
- **One fit over rounds 1-3 and v4, old answers at full weight** (Nathan 2026-10-26, via Coordinator 10): "old answers full weight." Rounds 1-3
  rows weigh 1.0 like v4's, despite the rejected round design (random seeded tanks, panda cory in 19 of 90, counts nobody keeps such as 87
  harlequins, freshwater only). Still flag implausible-count tanks in review, and report the fit with and without rounds 1-3 so he sees what
  the old data move.
- **The global water / floor scales belong to this lane** (2026-10-26): lane SR starts without its re-centring step (SPACE_PER_L). Applying
  one still needs human answers, a held-out improvement and Nathan's yes.

- **The three ChatGPT experts count as one source, for now** (Nathan 2026-10-26, via Coordinator 10): "does it matter? If thats all we have
  now, then that single expert is all the data we have other than the research we did and aqadvisor." chatgpt, chatgpt-high and ngr-ai are one
  expert in the fit (one bias term; today each file has its own). Note for the record: round-1-ngr.json is Nathan's own, 5 tanks answered with
  pictures, so it is a second, human source, small. Revisit when a human expert's answers arrive, and ask Nathan before weighting them against the
  AI source.

## Open questions for Nathan

None open. Ask before weighting human answers against the AI source when they arrive.

## Rules of the lane

- Tanks in an answered build never change. An engine change re-reads them: `GEN_RETABLE=1 npx vitest run test/calibtables.test.ts`, then rerun
  the reviews and the fit, and commit research/calib/tables/*.json with the change (HANDOFF lane rule; the lock in calibtables.test.ts fails otherwise).
- Never regenerate a published round (GEN_CALIB_R2 / GEN_CALIB_R3 exist only for a new round).
- Read every answer's note first; it is the lens for its numbers (memory "survey notes are the lens"); reviewer readings go in `review`
  (skip / set / why), never edits of the expert's answer.
- A fit result is decision material only when the held-out error falls and at least two experts (one a person) overlap on tanks.
- Push guard: list origin/main..HEAD before handing a sha over; your commits only.

## Next

Build the combined fit with S220 (it owns the v4 fit): rounds 1-3 and v4 answer files in one run, every row at weight 1.0, implausible-count
tanks flagged in review, the three ChatGPT files as one expert, and the report printed with and without rounds 1-3. Record the 2026-10-26 decisions in research/expert-calibration.md
(a new section) and keep the tables lock for both. No new round from makeRound without asking.
