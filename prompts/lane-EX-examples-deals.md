# Lane EX: example tanks and deals: the landing examples are checked, calm and current

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-ex -b ex-examples-deals origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's strategy review (`research/fable/3-strategy-answer.md`, tier 1 items 11 and 15), art-direction answer rows 1 and 6 (`research/fable/1-art-direction-answer.md`, section 3), and `prompts/deals-sweep.md` (how to refresh `src/data/deals.json`).
Before you start, ask the coordinator whether any running lane owns deals (the untracked `prompts/lane-DM-deal-match.md` in the shared folder suggests lane DM) or the example scenes. If lane DM owns deal matching, you take only the sweep and the date display, not its code.
Split with lane FD: FD unit 2 item 5 already makes the house examples use approved (fishLive) fish only. This lane takes what FD does not: each example's own verdict, the one neutral room, and deals freshness. Do not repeat FD's species swap; read it on origin/main first (`src/examples/index.ts`, `src/examples/scenes.ts`).
Usage: three small units. Report after each; wait for a yes before unit 3 (it spends web searches).

## Goal
The example tanks are what a cold visitor sees first and what every share link looks like, so each one must be honest and calm. Numbers: all 11 examples in `src/examples/index.ts` (planted, iwagumi, betta, paludarium, terrarium, reef, rainforest, arid, python, blackwater, clownnano) pass their own check or the card says why in one sentence; every in-tank example uses one room (saturation at most 0.12, luminance 0.70 to 0.85; today 02 and 04 are cream and 03 is a lavender gradient, plus a loud baby-blue side pane); the scale person is no longer a flat slate-blue cut-out; deals show a "checked on <date>" and none is older than 28 days at the time of the first outreach post (today's `asOf` is 2026-11-18 in `deals.json` and `gear-deals.json`).

## Before you build: could the diagnosis be wrong?
For each example, open it on current origin/main and read its verdict, Habitat pill and checklist (HV unit 1 changed these). List which examples carry a Caution or a missing item and what it is. If none does, unit 1 is only the one-line "why" text, and may be skipped. Also check where `asOf` is already displayed (grep `asOf` in `src/data/deals.ts`, `gearDeals.ts`, `src/demand/`): if the date already shows on every price surface, unit 2 shrinks to the surfaces that do not.

## Unit 1: examples pass their own check
For each example with a flag: fix the example (stock, equipment, heater) so it passes, or, where the tank is deliberately special (paludarium, terrarium, python), make the card say why in one sentence. Use `lifeSupportOf` (`src/scene/lifeSupport.ts`) for the life-support part; do not write a second one. A test over all examples: none renders green with a missing heater or filter.

## Unit 2: one neutral room, and the date on prices
1. `src/render/backdrop.ts` and the example definitions: one neutral room for every example; replace the baby-blue side pane and the lavender gradient; soft floor shadow under the stand; the scale person drawn in the same muted range.
2. Show "checked on <date>" beside deal and gear prices wherever a price is shown (the retailer note already says "as of <date>, check current price"; make it consistent and visible).
Needs Nathan: approve the room picture (one picture of two examples before / after).

## Unit 3: one deals sweep before outreach
Follow `prompts/deals-sweep.md` exactly: Sonnet subagents, at most 3 at once, one web search at a time each, never invent a price. Measure ONE batch first and quote per-row and total tokens to the coordinator; wait for a yes before more. Run this unit only when the coordinator says outreach is near (the strategy says "before outreach"), so the dates are fresh when it matters.
Needs Nathan: his yes to the token cost (one line).

## Done when (on a named live build, with screenshots)
- All 11 example thumbnails and first-paint views, before and after, in one contact sheet; verdicts readable; same room in every one.
- The test passes; no example green without life support.
- A screenshot of a price with its checked date; for unit 3, `deals.json` and `gear-deals.json` `asOf` updated and the number of rows changed reported.
- Frame time unchanged within 0.5 ms (A/B alternating frames) on the planted example.

## Must not touch
`start.tsx`, `logic/start.ts`, `App.tsx`, `boot.tsx`, `main.ts` (lane FD); `stockSummary.ts`, `verdict.ts`, `stocking.ts`, `animalfit.ts`, `lifeSupport.ts` (lane HV; call, do not edit); the swim files (BR); plant, coral and gear materials (ART1 to ART3); fish art.

## Rules
- US units (gallons, inches, deg F, US $); US spelling in UI text.
- `npm run build` (includes tsc and the size budget) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Verify on screen or a saved screenshot before saying done; say merged vs live separately.
- Any question for Nathan about a screen comes with a cropped, labelled picture, in the same message.
- Subagents run on Sonnet (Haiku for a grep). Before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote it to the coordinator.
- Add a dated EX section to HANDOFF.md and set your row in `research/requests.md` (R175).
