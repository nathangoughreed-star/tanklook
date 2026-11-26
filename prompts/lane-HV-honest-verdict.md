# Lane HV: honest verdict: no false green, numbers that say what they are, a public method page

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-hv -b hv-honest-verdict origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's strategy review, 2026-11-25. Read first, in this order: `research/fable/3-strategy-answer.md` (two-minute summary, tier-1 table, section 3 "Lane HV"), then `research/fable/6-trust-verdicts-answer.md` (items 1-5 and its mockups), `research/fable/2-first-visit-answer.md` (change 2), and `research/fable/6-trust-verdicts-brief.md` section 3 for how the engine computes today. Those answers are judgment from screenshots and docs; no code was run. Where the code disagrees with them, the code wins: say so in your report.
Usage: this lane is two work units (week 1, week 2). After unit 1, report its token cost and wait for a yes before unit 2.

## Goal
No screen certifies a tank it has not checked, and every number says what it is. The category's top complaint is stocking numbers people do not trust; ours must show their working.

## Before you build (half a day)
Reproduce "scenario 0" on the live build: 29 gal, 8 neon tetras, 1 bristlenose, one hang-on-back filter, nothing else. Fable saw it in screenshots only: the tank read "Compatible" and "Easy" with no heater, and a 74 deg F chip sat beside text saying "assumed 70 deg F". Save a screenshot. If it does not reproduce, report to the coordinator before unit 1. Also run the existing AqAdvisor Check on 10 cardinal tetras in a 40 breeder and record both numbers (ours read 27% in the brief).

## Unit 1 (week 1): false green and verdict basics
1. One "missing life support" function. The header chip, Habitat drawer, checklist (`src/shell/logic/checklist.ts`), cost drawer and print list (`planSheet` / `buildPlanSheet`) all read it. A missing heater or filter that a stocked animal needs is a Caution with a "Fix it" button: never green, never "Easy". The print list opens with "Not chosen yet" when incomplete.
2. In `stockSummary.ts`, `stocking.ts`, `src/scene/verdict.ts`, `animalfit.ts`, `territory.ts` and the drawer UI (answer 6 items 1-4):
   - "Not checked" never greys the pill.
   - One name, "Room used", with ticks at 75 and 100 and zone words; "Ideal." is retired.
   - A "count as N for room" line per species, and headroom.
   - Unsourced count notes (the neon "max 30") deleted or demoted; a rule with no source can never render red.
   - The gourami line stays amber until sexes are stated.
   - The AqAdvisor Check button moves into the drawer, under our own reasons.

## Unit 2 (week 2): method page, then as time allows
1. A static "How we calculate" page at a real URL (answer 6 mockup g), counts generated from `research/source-baseline.json`, linked from the drawer footer. Wording: "Calculated by fixed rules; no AI model runs when you use TankLook; sources were gathered with AI assistance." Not "no AI". Not "expert-calibrated": the engine is fitted to AqAdvisor at a median ratio of 1.01, so the claim is "we show the working", never "we are less conservative".
2. Then, in order: fix buttons that state their effect; juvenile vs adult size on the animal row (R156); the filtration meter with the plant credit visible, tagged "our judgment" (R153: plants add up to 25% filter capacity today and never move the headline).

## Done when (on a named live build, with screenshots in the report)
- Scenario 0 shows an amber chip naming the heater, with a working fix; checklist, drawer and print list agree.
- 10 cardinals in a 40 breeder opens with a non-grey pill and a labelled Room meter.
- Tests assert that no unsourced rule can render red and that an unheated tropical tank cannot be green.
- The method page loads from a pasted link.

## Must not touch
`main.ts`, `start.tsx`, `photofish.ts` (lane FD); the swim files (lane BR). Keep the exported pair rule in `animalfit.ts` stable: lane BR calls it. Any signature change goes through the coordinator.

## Rules
- US units (gallons, inches, deg F, US $); US spelling in UI text.
- `npm run build` (includes tsc) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Perf claims: alternate A/B per frame (sequential timings lie on this machine).
- Verify on screen or a saved screenshot before saying done; say merged vs live separately.
- Any question for Nathan about a screen comes with a cropped, labelled picture.
- Add a dated HV section to HANDOFF.md and set your rows in `research/requests.md` (R163, R152, R153, R156, R161).
