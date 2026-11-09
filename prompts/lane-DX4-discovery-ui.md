# Lane DX4: the Discovery screen (scope checkboxes, proposal cards, diff, Apply / Keep)

Follow `prompts/lane-common-c20.md` (report ONCE to Coordinator 21, `local_94b0b16c-78cc-4537-b306-4baa170900b2`; never push). Screenshots at desktop and 375 px are required before reporting.
Read: `research/design/discovery-architecture-plan.md` (row DX4), `research/design/discovery-architecture-handoff.md` sections 2, 5, 6 and invariants 4, 9, 12, HANDOFF.md sections DX0, DX1, DX2, DX3 (the APIs you build on: `propose` in `src/scene/discover.ts`, `previewProposal` / `checkProposal` / `applyProposal` in `src/scene/proposal.ts`, locks in `src/scene/locks.ts`, `verdictOf`, `equipPlan`).

Build (NEW `src/ui/discover/*`; hooks in `panels.ts` kept to a few lines):
1. Global "Discover" button (main screen) + a contextual "Discover" in each creative section (Tank, Animals = fish, Plants, Hardscape, Substrate) that preselects its tab.
2. Discovery panel: tab checkboxes (temporary, this run only; default = the contextual tab, or all unlocked tabs for the global entry), objective chips (Explore / Complete my tank / Refine / Solve a problem) + an optional focus line, and a small "Locked: ..." summary of what will be kept.
3. Proposal cards (n=3 from `propose`): preview render (reuse the existing thumbnail / offscreen renderer the Suggest / Explore cards use; previews must not mutate the live store), one-line character, incremental startup cost and monthly cost (ranges), upkeep / difficulty, gear to buy (each listed, needs acceptance), linked dependencies ("these plants need this light") shown together.
4. Before / after diff per card (what changes, by tab) + preserved-lock summary. Actions: Apply (one undo step, does NOT lock), Apply and keep (applies then locks the applied items, explicit), Reject, More like this.
5. Stale: if the project changed since the proposals were made (`store.rev`), Apply shows the conflict and offers Refresh, never silently overwrites (invariant 12).
6. No solution: show DX2's conflicts and relaxations as text with buttons that only open the relevant setting (never change it automatically).
7. Per-section "Keep this" lock toggles on items (fish rows: Keep exact / Keep at least / Keep species; plants / hardscape pieces: Keep; substrate: Keep whole substrate), with a visible locked style. Manual edits stay free (locks bind discovery only).
8. Exiting the panel leaves the project as is; reopening starts fresh with the current state.
Tests `test/dx4.test.ts` (DOM-level where practical): preview never mutates the store, Apply does not lock, Apply and keep locks exactly the applied uids, stale Apply refused.
Do not change the New tank menu / Guided / start flows (DX5 does); coordinate via the coordinator if you need a hook there.
