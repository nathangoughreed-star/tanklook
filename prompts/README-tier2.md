# Tier 2 lane briefs (from Fable's strategy review, written 2026-11-26)

Running lanes FD (front door), HV (honest verdict) and BR (behavior relations) are not repeated here. Nathan decided on 2026-11-26 that fish batches, new plant families and the R147 colour work do NOT pause; every brief below is built to run beside them. Each brief opens with a check that could show its diagnosis is wrong.

## Briefs

| ID | Goal | Size | Needs Nathan? | Can start when | Conflicts |
|---|---|---|---|---|---|
| ART1 (R169) `lane-ART1-plant-style.md` | Plant colour and light to the one-style spec (green S at most 0.60, L at most 0.45); first re-shoot may show it is already fixed | S | Yes, at the end: approve 4 before / after pictures | Now | PT (`plant3d.ts`, `items.ts`: ART1 owns the colour constants, PT owns shape and atlas; ask if PT is running); BR/HV/FD none |
| FG1 (R173) `lane-FG1-fish-gate.md` | Printed fish checks become a gate (report mode first), fin-map and proxy-depth tests on the 81 stored sheets, backup of `C:/Users/nreed/fish-sheets` | M | One line: where the backup goes. Later: yes to block mode | Now (backup in the first hour) | Any running fish batch lane (`fish-batch.py`, `fish-build.py`: small additive edits); FD `photofish.ts` not touched |
| EX (R175) `lane-EX-examples-deals.md` | The 11 examples pass their own check, one neutral room, "checked on" dates, one deals sweep | S-M | Unit 2: approve one room picture; unit 3: yes to token cost | Units 1-2 after FD unit 2 merges (it swaps example fish); unit 3 only when outreach is near | FD unit 2 (`src/examples/*`, start files); lane DM if running (deals); ART3 (room is here, not there) |
| LZ (R172) `lane-LZ-lazy-code.md` | JS before first tank from 1,350 KB to 800 KB gzip or less by deferring Discover / Explore, herp renderers, tank catalogue, closed shell panels; gate lowered | M | No | After FD unit 2 merges | FD (`main.ts`, `boot.tsx`, `App.tsx`); HV drawer files (import sites only); BR none |
| ART2 (R170) `lane-ART2-reef-style.md` | Reef rock and coral to the spec (coralline V at most 0.50, shared light term) before any reef outreach | S-M | Yes, at the end: approve 4 pictures (marine colour is his call) | Week 3, or earlier if the coordinator has a free lane | ART1 none; `coral3d.ts` not touched by PT |
| FG2 (R174) `lane-FG2-fish-tiers.md` | Log Nathan's minutes and rounds per fish, tier table, contact-sheet review for small fish; optional oscar GLB blind A/B | S-M | Yes: his b8 numbers (partial is fine), one look at the example contact sheet | Units 1-2 now; unit 3 after FG1 unit 1 | FG1 (`fish-batch.py`, `fish-contact.py`) and running fish batches |
| ART3 (R171) `lane-ART3-scenery-finish.md` | Sand, gear finish and stone detail to the spec | M | Yes: approve pictures per unit | After BR unit 2, ART1 and ART2 | `gear/common.ts`, `gearCatalog.ts` (check any gear lane), `placeholder.ts`, `gritTex.ts`; ART2 (`gritTex.ts` shared: serialize) |

## Start order

Can run now, no Nathan input needed to start: **ART1** (his only job is approving pictures at the end), **FG1** (backup location is one line, not a blocker), **FG2** units 1-2 (works with partial numbers).
Blocked on another lane: **LZ** and **EX** (waiting for FD unit 2). **ART3** waits for BR unit 2 by Fable's order.
Blocked on Nathan: nothing blocks a start. What waits on him later: ART1 / ART2 / ART3 pictures, FG2's b8 numbers and sheet verdict, EX's room picture and deals token yes, FG1's switch to block mode.
Suggested order: ART1 + FG1 now; FG2 beside FG1; when FD unit 2 merges, LZ then EX units 1-2; ART2 in week 3; ART3 after BR; EX unit 3 when outreach is near.
Ordered pairs that must not overlap: PT and ART1 (plant material); FG1 and FG2 and any fish batch (`fish-batch.py`); ART2 and ART3 (`gritTex.ts`); FD and LZ and EX (boot and start files).

## Strategy items deliberately left without a brief

| Item | Why |
|---|---|
| Shader link time (wait inventory) | Answer 4 cut "any new shader-link work" and gave no concrete approach; FD's wait inventory (unit 2 item 7) does not exist yet. LZ's measure step splits JS time from link time on throttled LTE; if link time dominates and the FD done-when (first part 8 s throttled) fails, write a brief from FD's inventory then. |
| 16 fix buttons, 17 source on every Issue, 25 sourced behavior caps | Same files as lane HV (`stockSummary.ts`, `stocking.ts`, `verdict.ts`, drawer). They are HV's unit 2 and a follow-up; write after HV closes, to avoid two lanes in the verdict engine. |
| 18 owner door | FD unit 2 gives a plain route; the real design waits for Fable's own condition: after someone has looked at "Fill only the gaps", and after the five watched sessions say which job people bring. |
| 19 rename (R168) | Nathan's call on spelling and domain (Urquarium vs Yourarium); no lane until he confirms. Do it before the first public post. |
| 20 Watch mode, 24 behavior data pass (13 fish, R145), tap label | Lane BR's files; BR unit 2 carries Watch mode and the tap label; the data pass after BR closes. |
| 23 search pages | Slow channel; needs the share landing (FD) and method page (HV, merged). Write after the first 20 users. |
| 26 growth preview (R157) | Probably a surfacing job over the landed growth timeline: a 10-minute check by the coordinator, not a lane. |
| 28 R150 yellow lab roll | Built; needs Nathan's look on live, then close or reopen. |
| 14 b8 review by Nathan | Folded into FG2 unit 1 (minutes and rounds); the review itself is his time. |
| Items 1-9, 12-13 | Already in lanes FD, HV and BR. |
| Tier 3 and "Cut or close" (R98, R147 colour, R149, E-GEN, R159, apps, AR, herps) | Deferred or cut by the strategy. Nathan's decision on R147 and new fish and plant batches is that they keep running; they stay in their own lanes (PT, the fish batch lanes). The E-GEN blind A/B is an optional experiment inside FG2. |
