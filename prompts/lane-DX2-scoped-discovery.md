# Lane DX2: scoped, lock-aware discovery engine (proposals, not replacements)

Follow `prompts/lane-common-c20.md` (report ONCE to Coordinator 21, `local_94b0b16c-78cc-4537-b306-4baa170900b2`; never push).
Read: `research/design/discovery-architecture-plan.md` (you are row DX2), `research/design/discovery-architecture-handoff.md` sections 2, 5, 9 (invariants 1, 2, 7, 9, 10), `research/design/da-survey.md` section 5, HANDOFF.md sections DX0, DX1 (and DX3 if on main).

On main already: DX0 (`src/scene/uid.ts`, `locks.ts`, `scope.ts` with `editableFields` / `diffTouches`, `proposal.ts` with `previewProposal` / `checkProposal` / `applyProposal` / `deltaBetween`, `store.rev`), DX1 (`src/scene/verdict.ts` `verdictOf`). DX3 (equipment: `equipPlan`, `lightCapacity`, `capableCredit`, Must use) may land while you work: rebase and use it if it is there.

Build NEW `src/scene/discover.ts`:
1. `DiscoveryRequest = { scope: Tab[], objective: 'explore' | 'complete' | 'refine' | 'solve', focus?: { tab, uids?, region?: 'back-left' | ... , text? } }`; `propose(store/tank, brief, request, n=3): { proposals: Proposal[], noSolution?: { conflicts: Issue[], relaxations: string[] } }`.
2. Wrap the existing generators as delta producers (do NOT rewrite them): regenerate-by-layer (`starter.ts`), `handOff` / `adaptToTank` (`reeval.ts`), `applySwap` (`swaps.ts`), `reconcileRoster`, and Explore candidates (`src/explore/*`) as sources. Each candidate: run on a copy, then build the Proposal with `deltaBetween`, then reject it if `checkProposal` fails (scope / locks). Never touch the live store.
3. Context: the generators read the WHOLE tank (unchecked tabs included) so plants respect the animals, substrate zones and light (invariant 7). Unchecked tabs are restored from the original before the delta is taken (belt and braces with checkProposal).
4. Roster locks: exact keeps the count; atLeast may grow; speciesOnly may change count; flexible rows may change only when Animals is checked.
5. Proposals must NEVER change the user's brief constraints (budget, limits, space, experience, no-new-equipment) or add locks. Equipment / light / tech may change only as the supporting system a candidate needs, and every gear change is listed in the proposal (purchase needs acceptance). If DX3 is on main, cost each proposal with `equipPlan` (remaining + monthly) and respect Must use / No new equipment.
6. Narrow objectives give narrow deltas (invariant 9): 'refine' with a focus changes only the focused tab / uids / region; prefer the smallest delta that meets the objective.
7. Diversity: the n proposals must differ meaningfully (different style / size class / stocking emphasis / tech level), not near-duplicates; rank by `verdictOf` (gates and hard issues exclude; targets rank).
8. No solution: when nothing passes the gates under the locks, return the blocking conflicts and the smallest relaxations as text (never relax automatically) (invariant 10).
9. DX3 note: the old `requiredOwned` generator branches now wake for Must-use items: check they keep Must-use gear and do not lock it.
10. Tests `test/dx2.test.ts`: spec invariants 1, 2 (exact and atLeast 7 kuhli), 7, 9 (rear tall plants keeps fish and hardscape), 10, plus journeys B, C, E from the spec at the engine level; no proposal ever mutates the store.
No UI (DX4 builds the Discovery screen on your API). Do not change start flows (DX5).
