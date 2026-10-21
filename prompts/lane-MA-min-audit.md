You are lane MA: Tank Minimum Audit (Coordinator 6, session local_cd7298f9-aef8-4622-b47e-d9f3fcc54479, assigned this ID; never rename
the chat). Work in your own worktree: from "C:\Users\nreed\Glass Box" run
git fetch origin; git worktree add ".claude/worktrees/ma" -b ma origin/main; then work only in .claude/worktrees/ma.
If this file is missing there, git show origin/main:prompts/lane-MA-min-audit.md. Reply in US units (gal, in, sq in, deg F).

Read first: HANDOFF.md "Start here" (lane rules: run `npm run build` before EVERY push) and section "S165: Tank minimum policy";
research/tank-minimum-first-principles.md, all of it, the "Decisions" section is binding (Nathan settled it 2026-10-21 in chat S183).

Scope (work unit 1 of 3: code reading and tests, NO policy migration, no data changes):
1. Space-bar audit (Decision 6). The Space bar (`stockingOf` in src/scene/stocking.ts, `LU_PER_L`) stays a per-litre heuristic for
   now. Write test/spaceaudit.test.ts that runs these cases and records the numbers: 15 cory + 5 danio vs 5 cory + 15 danio in a
   40 breeder; 20 long vs 20 high (same stock); tall-narrow vs shallow-wide of equal volume; same floor, different height; more height,
   same floor; more fish past the viable group. Write the table to research/space-audit.md with a plain verdict per case: where the
   heuristic rewards volume that gives no usable habitat, say so. Lock current behaviour only where it is right; mark the wrong ones
   as `it.todo` / documented, not "fixed".
2. Noncompensation test (overall rule): each measure is held on its own; surplus in one never covers a shortfall in another, and
   filtration, volume and height never rescue geometry. Add cases to test/minimum.test.ts against `src/scene/tankMin.ts`
   (`measureMinimum`, `speciesMinimum`, `tankMinimum`). If the current code compensates (it takes a weighted max today), write the
   failing case as `it.fails` with a comment naming the Decision, and list it for lane MM (migration). Do not change tankMin.ts
   behaviour.
3. Turning-clearance diagnostic sweep (Decision 3): for all 84 species, shortest floor side of the smallest catalogue tank that
   passes today vs adult length, plus extreme shapes (a 36 x 20 x 2 in tray, a 48 x 12 in long, a cube, a bowl). Output
   research/clearance-sweep.md, worst first, flag likely false positives (eel-shaped fish: kuhli, eels). Diagnostic only, not a gate.
4. Pin the nitrogen "2 % a week" water-change result with one regression test only if lane NB has not already (check origin/main
   test/nitrogen.test.ts first); do not touch src/scene/nitrogen.ts (lane NB owns it).

Files you own: test/spaceaudit.test.ts, test/minimum.test.ts (additions), research/space-audit.md, research/clearance-sweep.md, a new
"## Lane MA" section in HANDOFF.md. Read-only: src/scene/tankMin.ts, stocking.ts, tankfit.ts. No subagent fan-out.
Done = tests in, `npm run build` and the full suite pass, pushed (git fetch; git rebase origin/main; git push origin HEAD:main), and
your HANDOFF section lists what MM must change. Then send_message the coordinator (local_cd7298f9-aef8-4622-b47e-d9f3fcc54479) one
short report: findings, commits, build number (git rev-list --count origin/main). Questions for Nathan go in this chat, with pictures
when they are about a layout.
