# Lane P1: tank edit rules out of panels.ts (Coordinator 24, 2026-11-13; UI2 §7 P1)

Rules: `prompts/ui-build-common.md` (P lane).

## Job
Move the tank edit rules from `src/ui/panels.ts` (about lines 494-724 and 838 at build 1973: `setTank`, `setKind`, shape dims, flat-end, lid / door locks, table geometry, and whatever helpers only they use) into a new plain module `src/scene/tankEdit.ts` (no DOM, pure functions on the scene / store data). `panels.ts` then calls the module; the old shell behaves exactly as before.

- Your files: `src/scene/tankEdit.ts` (new), `src/ui/panels.ts` (only the moved block and its call sites), new tests `test/p1-tankedit.test.ts`.
- Write node tests for each moved rule (shape changes, lid / door locks, flat-end, table geometry, kind switch), including edge cases you find in the old code.
- Proof there is no change: the existing tests that touch tank editing pass, and before / after real-app shots of the Tank section and three tank edits (size, shape to bow, lid change) look identical.
- Note for P9 / shell step 3: list which functions the custom tank maker will need (`research/screens/P1/` not needed beyond the identical-shots check).
