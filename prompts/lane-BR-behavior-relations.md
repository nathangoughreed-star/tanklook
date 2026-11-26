# Lane BR: behavior relations: animals notice each other, and trouble shows only where the verdict flags it

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-br -b br-behavior-relations origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's strategy review, 2026-11-25. Read first, in this order: `research/fable/3-strategy-answer.md` (two-minute summary, tier-1 table, section 3 "Lane BR"), then `research/fable/7-aliveness-answer.md` (phases 0-3, the word list), `research/fable/7-aliveness-brief.md` section 3 for how animals move today, and the contact sheets in `research/fable/7-alive/`. Those answers are judgment from screenshots and docs; no code was run. Where the code disagrees with them, the code wins: say so in your report.
Usage: this lane is two work units (week 1, week 2). After unit 1, report its token cost and wait for a yes before unit 2.

## Goal
Animals notice each other, and unfriendly behavior appears only where the plan has a flagged pair. The category's top complaint is that every fish behaves the same. A per-species swim sim already exists (school / shoal, water bands, hover, rest, dig), but nothing reacts to anything, and `care.temper`, `nip`, `guard`, `cover` and `prey` are never read by the animation. The unique version here is behavior as evidence for the verdict: the angelfish rushes the neons, and tapping it quotes the rule.

## Before you build (an hour)
With a short script, count how many real water species are still on plain roam (answer 7 estimates 13; the brief's regex pass said 92 of 175 use the default). Put the true number in your report.

## Unit 1 (week 1): phases 0 and 1
In `swimTypes.ts`, `swimSim.ts`, `swimHome.ts`, `build.ts`:
1. Phase 0: add `tall` (half body height) to the spec and use it in the surface clamp, the band and `pickGoal`, so no fin rises above the water line. `PAIR_FORMERS` (`groups.ts`) share one home when exactly two are present. Soft separation between groups of different species.
2. Phase 1, in this order: give way to fish 2.5 times longer; startle (seeded, plus a click on open water outside edit mode); chase and flee driven by a foe list that `build.ts` builds by CALLING the same pair rule `animalfit.ts` uses (never copy its thresholds); guard for home keepers.

## Unit 2 (week 2): phase 2, then phase 3 if time
1. `SwimPose.act`; a hover / tap label from answer 7's fixed word list; a why line quoting the verdict's sentence, with a link to its chip (`roam.ts`, one small shell component). No pause on tap outside edit mode.
2. Thin Watch mode beside Full screen: UI hidden, sway, wake lock, no sound (R158).

## Done when (on a named live build, with re-shot contact sheets in the report)
- No fin above the water line in 60 s; both ocellaris within 3 body lengths in every frame; neons and harlequins readable as two groups.
- A 20 gal with a betta and guppies shows a rush within 2 minutes; the planted example with no flagged pair shows zero chases in 10 minutes.
- A test asserts every flagged pair yields a foe entry and no unflagged pair does.
- The steering step is timed at 50, 200 and 500 fish, A/B alternated per frame.
- Tapping ten fish gives a word that matches what each is doing.

## Must not touch
`animalfit.ts` (read only), `stockSummary.ts` (lane HV); the shell start files and `main.ts` (lane FD); any art or shader file. No feeding, hunger, health, damage or death.

## Rules
- US units (gallons, inches, deg F, US $); US spelling in UI text.
- `npm run build` (includes tsc) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Perf claims: alternate A/B per frame (sequential timings lie on this machine).
- Verify on screen or a saved screenshot before saying done; say merged vs live separately.
- Any question for Nathan about a screen comes with a cropped, labelled picture.
- Add a dated BR section to HANDOFF.md and set your rows in `research/requests.md` (R164, R154, R158).
