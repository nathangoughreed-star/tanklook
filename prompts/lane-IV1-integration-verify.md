# IV1: Integration verification of Discovery on main (Coordinator 22)

Follow `prompts/lane-AB-common.md` (and `prompts/lane-common-c20.md`). First `git fetch origin && git merge --ff-only origin/main`. Report once to Coordinator 22; never push. NO new features: verification plus fixes for regressions found.

Context: AB9 (preview isolation) and AB10 (value-aware locks) both changed the lock/unlock code in `src/ui/ab/screen.ts`; the merge was hand-resolved (build 1745). AB7b (collapsed matrix) and AB11 (shared scale) also landed. Reviewer text: `research/design/discovery-ui-review-2026-11-10.md`.

## 1. Mechanism question (answer first, in your report)
Does AB9 PREVENT writes to the working design during Discovery, or does it allow them (e.g. Keep/Lock copying lighting/substrate/tank in via `writing()` / unfreezing `store.frozen`) and roll back on Close? Nathan strongly prefers write prevention, with Make It Yours as the only commit of a generated design, because autosave, persistence, derived calculations and observers can react to an intermediate write even if undone. Check the autosave/persist path too. If it is allow-then-restore, say so plainly and propose (or, if small, implement) a separate preview state so Keep/Lock only change Discovery requirements. Anything bigger than ~1 day: stop and report instead.

## 2. Real-UI scenarios (desktop 1280 and 375 px; drive the actual UI, not store calls)
1. Open Discovery, generate 5 pairs, Close: working tank and undo history unchanged.
2. Keep A's lighting, Close: Discovery preference retained; working tank unchanged.
3. Lock B's hardscape while A is favourite: only B's hardscape locked, no contradictory badges.
4. Replace an existing lock with A's value: old replaced, new shown correctly.
5. Lock several attributes, Close: locks persist; working design unchanged.
6. Make It Yours: proposal becomes the working design as ONE undoable step.
7. Make It Yours, Undo, Redo, reopen Discovery: coherent.
8. Close Discovery, then manual edit: editing, Undo, Redo work normally.
9. Reopen Discovery: requirements honored, no stale proposal state.
Also exercise thumbs and the collapsed/expanded matrix, and shared-scale Fit Both once.

## 3. Tests
Run the FULL vitest suite (not only targeted files) after the merge. Re-run load-timeout suspects (ab1, ab5, explore, suggest, taste, gv8limits, rosters, rockBudget, recipes, tarantula) alone before calling a failure. Report test failures SEPARATELY from browser-journey results. Add a regression test for each defect fixed. Screenshots of key states in `research/screens/IV1/` (~60 KB), key ones to Nathan via SendUserFile. HANDOFF section.
