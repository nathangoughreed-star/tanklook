You are lane HB: Habitat Model, one stocking engine (Coordinator 7 starts you; never rename the chat). Work in your own worktree:
from "C:\Users\nreed\Glass Box" run git fetch origin; git worktree add ".claude/worktrees/hb" -b hb origin/main; then work only in
.claude/worktrees/hb. If this file is missing there, git show origin/main:prompts/lane-HB-habitat-model.md. Reply in US units.

Origin: Nathan, 2026-10-21 (chat in Glass-Box-stocking), on learning that the zone / floor-area check lives only in tankfit.ts:
"The tank fit engine should use the stocking bar(s), and the stocking bars should be the 'engine'." He agreed to these four points:
  1. The bottom-vs-water-column split moves into the stocking engine (stockingOf / tankMin), not tankfit.
  2. The Fullness tile shows it, so the user sees the same limit the picker applies.
  3. tankfit only READS the engine: a tank fits when every engine limit holds; no limit math of its own.
  4. Length / depth / minimum checks that tankfit still does itself move into the engine as pass / fail limits.
  Plus: the floor coefficients (FLOOR_K 4 / 1.5 / 2.5 x tl^2, "a documented rule of thumb, not a source of record") need a source or
  a calibration before users see them as a bar.

Read first: HANDOFF.md "Start here", sections "Lane MA" (Space-bar audit, Decision 6) and "Lane MM" (gap 1: "Space bar habitat model
(MA item 7) untouched"); research/space-audit.md; research/tank-minimum-first-principles.md (Decisions are binding);
src/scene/stocking.ts, src/scene/tankMin.ts, src/scene/tankfit.ts (fitOf, needsOf, FLOOR_K, zoneOf), src/ui/fullnessTile.ts.

State on main (checked 2026-10-21): the tile has Space, Filtration and the tank-minimum bar (tankMin.ts, Nathan's red / green lines,
already shared with tankfit). Still tankfit-only: the zone floor sum (`zones.bottom > floor || all zones > 2 x floor`, FLOOR_K), the
`depth` fail from needs.maxDepthMm, and `length` from needs.minLengthMm. Space (stocking.ts spaceOf: mass^0.45 x AqAdvisor-fitted
factor, per litre) is shape-blind: equal water = equal Space, and height is credited to bottom dwellers (MA: 10 cories on a 30 x 12 in
floor read 95 % at 12 in high, 32 % at 36 in). Activity class (MET_CLASS) only feeds Filtration.

Work unit:
A. Evidence first (no code): what do sources say about floor need for bottom dwellers and run length / swimming room for midwater fish,
   and does activity level change space? Write research/habitat-model.md with candidate coefficients, each sourced or marked (est), and
   a calibration option (AqAdvisor gives no zone split; say what else could anchor it). Bring Nathan ONE table to approve before step B.
   Max 3 Sonnet subagents for the reading; quote the cost first per the usage rules.
B. Engine: stockingOf (or tankMin, whichever owns it cleanly) gets a zone-aware habitat limit: bottom dwellers against floor area (shared
   with the floor-touching share of swimmers), swimmers against water / run length, so the 5 `it.todo` in test/spaceaudit.test.ts (A-E)
   become plain passing tests. Keep the AqAdvisor calibration of the per-litre number (median ours / AqAdvisor 1.00 on the 24 mixes) or
   re-fit it and say so. Snails stay at zero swimming room; their floor use is your call, sourced.
C. One evaluation: move tankfit's floor / depth / length checks into the engine; fitOf only reads engine results (keep return shapes,
   `fails` names may stay). Every consumer reads the same result: Fullness tile, tankfit, starters (litresPerAnimal), whyAnimal, hard
   truths, swaps.
D. The tile: how the new limit shows (a Floor bar beside Space, or Space split into floor / water, or Space taking the larger) is a
   screen question for Nathan: ask it WITH screenshots of each option on a real cory-heavy stock, before building the UI.

Files you own: src/scene/tankfit.ts (limit code), the space / habitat parts of src/scene/stocking.ts, test/spaceaudit.test.ts,
test/tankfit.test.ts, the bar rows of src/ui/fullnessTile.ts, research/habitat-model.md. NOT yours: nitrogen.ts and the water-change
lines of stocking.ts (lane NB), tankMin's red / green data (lane source-combine may be regenerating tankmin.json: coordinate first).
Re-blesses are deliberate: list every moved number (starter counts, tank-fit picks, example demand) in your HANDOFF section.
Provenance: every new constant gets a src/data/provenance.ts entry; the test/sources.test.ts ratchet stays green.

Done = `npm run build` and the full suite pass, pushed (git fetch; git rebase origin/main; git push origin HEAD:main), a "## Lane HB"
HANDOFF section with decisions and gaps, then send_message the coordinator (local_c5a46899-38c9-4c95-9310-9f70ff941a97) a short
report with the build number. preview_stop when done.
