# Lane DX1: one verdict for the current project + read-only Checks strip

Follow `prompts/lane-common-c20.md` (report ONCE to Coordinator 21, `local_94b0b16c-78cc-4537-b306-4baa170900b2`; never push).
Read: `research/design/discovery-architecture-plan.md` (you are row DX1), `research/design/discovery-architecture-handoff.md` sections 4 and 9 (items 6, 7, 10), `research/design/da-survey.md` sections 4 and 8.

Build:
1. NEW `src/scene/verdict.ts`: `verdictOf(tank, brief)` composing the existing checks (stockingOf, stockSummary summaryOf, ownedFit, herpCheck, growthCheck, constraints compliance, conflictsOf; reuse, don't re-implement) into `{ gates: Issue[] (welfare + physical: never feasible), hard: Issue[] (user hard limits: budget / space / no-new-gear; separate from gates), targets: Issue[] (soft preferences: ranking only), advisories: Issue[] (experience etc.) , feasible: boolean }`. Each Issue: tab, uids involved, one short line, and where useful the smallest relaxation (e.g. "raise budget by $40", "drop to 6 kuhli").
   A budget overrun and a welfare conflict must never land in the same bucket.
2. Make it cheap enough to run on every store change (memo by `rev` if DX0 has landed, else by JSON hash).
3. NEW `src/ui/checksStrip.ts`: small read-only strip (one line per gate / hard issue, collapsed advisories) visible in every mode, with one hook line in `panels.ts`. It changes nothing in the scene.
4. Tests `test/dx1.test.ts`: journey C from the spec (40 gal breeder + a proposed stocking: verdict reports suitability / compatibility without any generator), budget vs welfare buckets, a mandatory weak light vs a demanding plant list = gate (CO2 / ferts do not fix it).
Do not touch generators, locks, the cost engine credit path (DX3) or start flows.
