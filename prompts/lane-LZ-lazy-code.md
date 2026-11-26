# Lane LZ: deferred code loading: the first tank needs less JS, the rest loads when asked

Model: Sonnet. Coordinator: the chat that started you (named in your first message); if none is named, report to Nathan. Report ONCE when ready to merge, done, or blocked.
Own worktree, never the shared folder (its tracked files are about 1,070 commits stale): `git fetch`, `git worktree add ../Glass-Box-lz -b lz-lazy-code origin/main`. Commit on your branch as each unit lands; send the coordinator the sha.
Source of this lane: Fable's strategy review, 2026-11-25 (tier 2; answer 4 steps 3 and 5). Read first: `research/fable/4-perf-load-answer.md` (sections 2 to 4), `research/fd/` (FD's traces), the FD section of HANDOFF.md once it exists (grep "FD"; never read HANDOFF.md whole), and `scripts/size-budget.mjs`.
Usage: a measure step, then one work unit. Report the token cost after the measure step and wait for a yes.
START ONLY AFTER lane FD's unit 2 is merged: both touch `src/main.ts`, `src/shell/boot.tsx` and `src/shell/App.tsx`. FD unit 1 already moved the old UI behind a dynamic import and set the size gate to 1,350 KB gzip (Fable's target was 800).

## Goal
JS + CSS before the first tank drops from the gate's current ceiling (1,350 KB gzip; FD found roughly 300 to 400 KB that can load later) to 800 KB gzip or less, and the gate is lowered to the new measured total plus 5 percent. Candidates, to be confirmed by the measure step: Discover / Explore / suggest code, the reptile and spider renderers plus GLTFLoader, herp art, the tank catalogue (`src/data/tanks.json`, 563 KB raw), and shell panels that are closed at first paint (Habitat drawer, print, files, settings, custom tank maker).

## Before you build (half a day): could the diagnosis be wrong?
1. `ROWS=40 node scripts/size-budget.mjs` on a fresh build: the real before-first-tank table. Write down the total.
2. Chrome coverage (or a resource-timing list) of a cold planted-example load: which of those chunks actually execute before the first tank part. Chunks that do not are the candidates.
3. `scripts/fd-trace.mjs` on throttled LTE with 4x CPU: how much of the time from shell to first tank part is download and parse of JS, and how much is shader link or tank build. FD's gzip-served trace showed the shell at 1.8 s but the first part at 9.8 s, so most of that gap may not be JS at all.
If the loadable-later total is under about 150 KB gzip, or JS download and parse is under about 10 percent of the shell-to-first-part gap on throttled LTE, STOP and report: deferral will not move the first-tank number. What is left is bytes on slow phones, a smaller decision for Nathan.

## Unit 1: defer, in order of bytes saved
For each candidate: the static import becomes `import()` at the point of first use. If the first use takes over 1 s on the throttled phone, show the loading state FD built (R165): read FD's component, do not write a second one. For every move check that the feature still works (a) opened first thing from a cold load, (b) from a saved project that already contains it (a project with a reptile or spider must load its renderer before its first frame), (c) from a `#tank=` share link. Check that `herps` (96 KB gzip) is really absent from the aquarium-only scope's first load. Tank catalogue: the first tank and the picker thumbnails must not wait on it unless they need a model; if the first scene needs it, load only the entry the scene names.
Then lower `BUDGET_KB` in `scripts/size-budget.mjs`.

## Done when (on a named live build, with screenshots)
- The size-budget table before and after in the report; total at or below 800 KB gzip; the gate lowered.
- Cold trace (throttled LTE, fresh profile, median of 3, A/B order alternated): bytes before the first tank part and time to first part, before and after.
- Screenshots of each deferred feature opened cold: Discover, Explore, a saved terrarium or spider project, the custom tank maker, print.
- No visible pop or empty panel on a throttled phone.

## Must not touch
The swim files (lane BR); `stockSummary.ts`, `verdict.ts`, `stocking.ts`, `animalfit.ts`, `lifeSupport.ts` (lane HV); `photofish.ts` and `liveFish.ts` (FD unit 1; read only); the fish build scripts; `items.ts`, `plant3d.ts`; any shader file. `manualChunks` tuning in `vite.config.ts` is cut (answer 4): split by `import()` only.

## Rules
- US units (gallons, inches, deg F, US $); US spelling in UI text.
- `npm run build` (includes tsc and the size budget) plus the tests for what you touched. Never the full local vitest suite. Long runs go in the background and you end the turn; no polling.
- Perf claims: alternate A/B per frame (sequential timings lie on this machine).
- Verify on screen or a saved screenshot before saying done; say merged vs live separately.
- Any question for Nathan about a screen comes with a cropped, labelled picture, in the same message.
- Subagents run on Sonnet (Haiku for a grep). Before any fan-out over 3 subagents or about 1 M tokens, measure one batch and quote it to the coordinator.
- Add a dated LZ section to HANDOFF.md and set your row in `research/requests.md` (R172).
- Needs Nathan: nothing. Runs without him.
