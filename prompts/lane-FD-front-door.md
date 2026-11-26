# Lane FD: front door: fast cold load, a landing screen that shows the product, working share link

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-fd -b fd-front-door origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's strategy review, 2026-11-25. Read first, in this order: `research/fable/3-strategy-answer.md` (two-minute summary, tier-1 table, section 3 "Lane FD"), then `research/fable/4-perf-load-answer.md` (steps 1-5), `research/fable/2-first-visit-answer.md` (changes 1 and 3, the defect table), and the `research/fable/2-first-visit/` screenshots. Those answers are judgment from screenshots and docs; no code was run. Where the code disagrees with them, the code wins: say so in your report.
Usage: this lane is two work units (week 1, week 2). After unit 1, report its token cost and wait for a yes before unit 2.

## Goal
A cold visitor sees a living, priced, checked tank within a few seconds and can name a door for their situation. Today boot waits on about 6.1 MB of fish art (221 WebP files for 45 live looks) before the shell appears, first-load JS is about 1,175 KB gzip (349 KB on 10-15), and the Start sheet shows no fish, no price and no verdict.

## Before you build (half a day)
Record one cold trace (desktop throttled to LTE, and Nathan's phone if he can run it) and write the numbers down: time to shell, time to first tank part, bytes before first tank. If the blank page is already under 1 second on LTE, Fable's diagnosis is wrong: start with the old-UI split and tell the coordinator.

## Unit 1 (week 1): load path
1. `src/main.ts`: start `bootShell()` at once; nothing in the boot path awaits fish art.
2. `src/art/photofish.ts`: replace load-all with a per-look loader that fetches only the live species in the opened scene, in parallel with shader link. Hold only the animals reveal (`viewer.ts` `revealTick`) with a timeout that falls back to the old model. Check `species.ts` `goLive` and the picker thumbnails still work.
3. Move the old UI behind a dynamic `import()`; delete it on or after 11-29 (already promised; confirm the date with the coordinator before deleting).
4. `public/sw.js`: versioned fish art is cache-first.
5. `scripts/size-budget.mjs`, run by `npm run build`: fails when JS + CSS before first tank exceeds the budget (provisional 800 KB gzip; set it from your trace).

## Unit 2 (week 2): landing and share
1. `src/shell/start.tsx`, `logic/start.ts`: headline "Build your aquarium in 3D before you buy anything, and see whether the fish will thrive, what it will cost, and exactly what to buy." Sub-line "Free, no account. Calculated by fixed rules on published care data." Four doors named by job, each with a picture: "Show me tanks I could build", "Start from a fish I want", "I already have a tank or gear" (a plain route to the tank picker for now), "Build my own from scratch". Bundles become a link.
2. First paint behind the sheet is a stocked example with no panel open (`App.tsx`, near line 214).
3. Examples and animal-door results open full-width with one card: name, cost, verdict with its reason, "Make it mine" / "See another". Blank lands on the tank picker, not a settings form.
4. Dock the checklist line in the panel header (`checklist.tsx`, `shell.css` near line 688). It reads lane HV's "what is missing" function; do not write your own. Until HV lands it, keep the current source.
5. Defects from answer 2's table: the "Replace your project?" dialog hidden behind the first dialog, the wrong Cardinal tetra tile, "40 breeder" opening as Custom 45 gal, the clipped phone strip, UK spellings. House examples use approved (fishLive) fish only.
6. Share link (R155 part 1): verify the existing `#tank=` link on a cold load in a fresh profile (`boot.tsx`), land it the same full-width way, put the URL on the PNG export.
7. Loading states (R165, Nathan 2026-11-26: "better loading icons or bars instead of the tool getting stuck. Maybe with tips or fun facts"). Measure first: with the trace script from unit 1, time every wait a user meets (cold boot, opening an example, the animal door's "Plan a tank for these", Discover / Explore generation, switching tanks, the plant worker, fish art arriving, export and print) on desktop and throttled phone, and list them longest first. Add a loading state only where the wait is over about 1 s on the throttled phone: real progress where progress is known (bytes or steps), otherwise a quiet indeterminate bar; never a frozen screen. Where the wait is over about 3 s, show one short line under it from a small hand-checked list (a fact about a species in the tank being loaded, or a tip about the tool); the list lives in one data file, each line with its source, no care-guide advice. Under 1 s gets nothing. Hand-drawn, in the app's own style: no stock spinner, no sparkle icons, no emoji (see R167). Pictures of each state for Nathan.

## Done when (on a named live build, with screenshots in the report)
- Cold phone load on LTE shows the first tank part in 5 s or less (8 s throttled); no fish art is fetched before the shell; the size budget passes.
- A screenshot of the landing screen shows moving fish, a price and a verdict at zero clicks.
- A share link opened in a fresh profile shows the same tank.

## Must not touch
`swimSim.ts` and the swim files (lane BR); `stockSummary.ts`, `verdict.ts`, `stocking.ts`, `animalfit.ts` (lane HV); `items.ts`; the fish build scripts.

## Rules
- US units (gallons, inches, deg F, US $); US spelling in UI text.
- `npm run build` (includes tsc) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Perf claims: alternate A/B per frame (sequential timings lie on this machine).
- Verify on screen or a saved screenshot before saying done; say merged vs live separately.
- Any question for Nathan about a screen comes with a cropped, labelled picture.
- Add a dated FD section to HANDOFF.md and set your rows in `research/requests.md` (R162, R155 part 1, R165).
