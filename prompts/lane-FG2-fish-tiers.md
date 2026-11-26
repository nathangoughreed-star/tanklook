# Lane FG2: fish tiers and review log: measure Nathan's minutes, review small fish by contact sheet

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-fg2 -b fg2-fish-tiers origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's fish-pipeline answer (`research/fable/5-fish-pipeline-answer.md`, section 1 tier table and targets, section 2 change 6, section 4 "first thing to measure", section 3 the one experiment) and strategy tier 1 item 14. Read first: that answer, `research/fish-sheets/log.csv`, `research/fish-sheets/HANDOFF-batch-b8.md`, `scripts/fish-batch.py` and `scripts/fish-contact.py`.
Start after FG1 unit 1 (the gate exists in report mode) so the contact sheet can print gate flags; units 1 and 2 can start before that, using blank gate columns.
Nathan decided (2026-11-26): fish batches do NOT pause. Nothing here may block a batch.
Usage: three units. Unit 1 and 2 are small. Report after each; wait for a yes before the next.

## Goal
Find out what a fish costs Nathan, then stop spending his time evenly. Today nothing records it: `nathan_rounds` is "unknown" on all 32 rows of `log.csv`, and the only timings on record are the retired click tool (36 to 129 s per fish) and the dottyback (about 4 hours, 11 rounds). Targets: minutes and rounds recorded for every fish reviewed from now on; the b8 baseline (21 built fish); a tier column in `fishLive.json`'s companion data so each fish says which review it got; small schooling fish approved from one contact sheet per batch at under 1 minute per fish.

## Before you build: could the diagnosis be wrong?
Fable's tier counts (about 40 to 50 tier 1, about 110 tier 2, 5 to 10 tier 3) are its own judgment. Count the real species: from `src/data/species.ts` and `fishLive.json`, how many species are fish, how many have build B, and how many would fall into each tier under the rule below. If tier 1 is over about 70 or tier 2 under about 60, the rule is wrong for this roster: report the real counts with the rule before building.

## Unit 1: log it
Add to `build.json` (written by `fish-batch.py`) and to `log.csv`: `review_minutes`, `review_rounds`, `first_pass` (approved with no change: yes / no), `verdict_date`. A tiny script `scripts/fish-review-log.py <species> --minutes 3 --rounds 1 --first-pass yes` writes them; the coordinator or Nathan's chat calls it as each fish is approved, so Nathan only says numbers aloud. Seed it from what already exists (log.csv, the b6 / b7 / b8 handoffs, `git log` on each fish's spec and anatomy files: commits after first approval count as rounds). Print the baseline for b8's 21 fish as soon as Nathan has reviewed them: median minutes, rounds, first-pass rate.
Needs Nathan: his numbers for the b8 fish (a stopwatch on the next batch, or a rough minutes figure per fish). Never block on it: the script works with partial rows.

## Unit 2: the tier table
Write `research/fish-sheets/tiers.json`: species id, tier (1 close review, 2 batch, 3 old model kept), reason. Rule: tier 1 is fish about 4 in and up, centerpieces, marine showpieces (oscar, angel, discus, tangs, cichlids); tier 2 is small schooling and nano fish and congeners that fit the loft; tier 3 is shapes the loft cannot draw (kuhli, hillstream, fancy goldfish, eels, sharks). New species enter at tier 2. Do NOT add placeholder or re-skin tiers (withdrawn by Fable). Do not change any live fish.

## Unit 3: contact-sheet review for tier 2
One contact sheet per batch (extend `scripts/fish-contact.py`): for each fish the sheet, the real reference photo, the model at tank distance, and the gate flags. Nathan approves tier 2 from this sheet and names exceptions; tier 1 keeps the close one-by-one review. Produce the sheet for the b8 batch as the example, with pictures for Nathan to judge whether it is enough to approve from.
Needs Nathan: one look at the b8 example sheet; his verdict on whether tier 2 can be approved this way.

## The one experiment (optional, only if the coordinator asks)
Fable's answer 5 section 3: put the existing oscar GLB (branch `claude/glbfish-e5`) beside today's `oscarb` in a blind A/B at tank distance and record its file size. Pictures and the size only; Nathan picks. If he still prefers the GLB and it fits in about 400 KB (the largest live fish is 378 KB), GLB earns tier 1 large fish only; otherwise E-GEN closes. No Hugging Face purchase.

## Done when
- Baseline table (b8: minutes, rounds, first-pass) in the report, or an honest "not yet, N of 21 recorded".
- `tiers.json` with real counts per tier.
- The b8 contact sheet picture delivered to Nathan.
- No change to any live fish, `fishLive.json` or `public/art/fish`.

## Must not touch
`photofish.ts`, `liveFish.ts` (FD); `fishLive.json`; the swim files (BR); the verdict files (HV). `fish-batch.py` and `fish-contact.py` are shared with lane FG1 and any running fish batch: small, additive edits, rebased onto their latest.

## Rules
- US units (gallons, inches, deg F, US $); US spelling.
- `npm run build` (includes tsc and the size budget) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Fix a fish through its spec and a rebuild, never by hand-editing generated files.
- Any question for Nathan about a fish comes with cropped, labelled pictures, in the same message.
- Subagents run on Sonnet (Haiku for a grep). Before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote it to the coordinator.
- Add a dated FG2 section to HANDOFF.md and set your row in `research/requests.md` (R174).
