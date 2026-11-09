# Lane DX0: discovery foundation (locks, stable ids, revisions, scope, proposals)

Follow `prompts/lane-common-c20.md` (report ONCE to Coordinator 21, `local_94b0b16c-78cc-4537-b306-4baa170900b2`; never push).
Read: `research/design/discovery-architecture-plan.md` (whole; you are row DX0 and decisions 1-4), `research/design/discovery-architecture-handoff.md` sections 2, 8, 9, `research/design/da-survey.md` sections 1, 3, 5, 8.

Build (pure model + store; NO new UI beyond what tests need):
1. `TankSetup.locks` (decision 3), a stable `uid` on every fish group / plant / hardscape piece / garden piece that survives `regenerate` (any layer), `shuffleHard`, `adaptToTank`, save / load, undo. Migration to SCENE_VERSION 10 (old saves get uids; the brief's `status: 'locked'` roster rows become `exact` roster locks).
2. `rev` on the active tank, bumped by every `Store.update` / `replace`.
3. NEW `src/scene/scope.ts`: `type Tab = 'tank'|'animals'|'plants'|'hardscape'|'substrate'`; `editableFields(tank, scope, locks)`; `diffTouches(before, after)` -> which tabs / uids / props changed.
4. NEW `src/scene/proposal.ts`: `Proposal = { baseRev, scope, delta, summary }`; `previewProposal(tank, p)` returns a new tank (pure, never mutates the store); `applyProposal(store, p)` refuses when `rev` moved (stale; return the conflict), when the delta touches an unchecked tab or a locked uid / prop / roster floor, pushes ONE undo step, and never adds locks.
5. NEW `src/scene/locks.ts`: `lockViolations(before, after, locks)` incl. roster `exact` / `atLeast` / `speciesOnly`, whole-substrate lock (settings + terrain + patches), hardscape position lock.
6. Tests (new `test/dx0.test.ts`): spec invariants 1, 2, 3, 4, 11, 12 at the model level, plus uid stability across every regenerate layer and a save round-trip.
Do not change generators' behaviour (DX2 does), the cost engine (DX3) or start flows (DX5). Keep existing tests green.
