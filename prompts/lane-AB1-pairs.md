# Lane AB1: Pair Generator (Discovery v2, Coordinator 21, 2026-11-09)

Start with `prompts/lane-AB-common.md`. Spec sections for you: 3, 4, 5, 7, 9, 10, and journeys A-D.

## Build
Write `src/scene/pairGen.ts`, with helpers in `src/scene/pairFacts.ts` if useful.

1. **`nextPair(project, brief, session, lookup, opts)` returns a `PairResult`.**
   - `project` is the working `TankSetup` plus its `rev`.
   - `lookup(id)` returns a `CandidateRecord` from AB2's history. It is passed in, so you don't import AB2.
   - **Baseline** = the working project, with each frozen tab copied from its source record.
   - The pair type comes from `session.current` / the `next` hint:
     - `first`: two meaningfully different candidates.
     - `champion`: the champion plus one new challenger.
     - `fresh`: two new candidates far from the champion.
     - `final`: the fresh winner vs the champion. Both are existing records, so generate nothing.
2. **Sources:**
   - DX2's `propose()` (`src/scene/discover.ts`) on the baseline, with the effective scope and the locks.
   - When Tank is in scope and the habitat is not locked, also Explore recipes (`src/explore/pool.ts`, the archetype registry) across worlds and families. The direction is soft: prefer it, and cross it only for `'unsure'` or a fresh pair.
3. **Speed.** A whole Explore pool takes MINUTES (see `src/ui/explore/session.ts`), so the first pair must not wait for it:
   - The first pair must appear in about 3 seconds on this machine.
   - Build just enough candidates on demand, and cache them for later challengers.
   - Report the measured first-pair time.
4. **Every candidate:**
   - Confine it to locks, scope and freezes, reusing discover.ts's confine and `checkProposal`. A lock breaker is dropped, never shown.
   - Run `verdictOf`, the Explore gate (`gate.ts`) and `equipPlan`. Must-use gear is always in. Owned gear is credited only when capable. "No new equipment" makes a candidate infeasible. Weak locked light caps plant demand, and CO2 or ferts never make up for it.
   - Only feasible candidates make a pair. When none qualify, return `{ ok: false, conflicts, relaxations }` (reuse `NoSolution`).
5. **Facts.** Fill `CandidateFacts` identically for A and B:
   - same accounting, US units;
   - new spend = remaining acquisition cost after owned gear;
   - Explore's `estimate.ts` ranges and `difficulty.ts`, with estimates marked;
   - honest `assumptions`.
6. **Diversity:**
   - Use Explore `candidate.ts` keys and dedupe against the champion and everything already shown (`opts.shownKeys`).
   - Spread early pairs widely, and keep later challengers nearer the champion.
   - When the effective scope is one or two tabs, use a controlled contrast: vary those tabs and hold the rest.
7. **`adapt(record, project, brief)`** returns a NEW record (purpose `'adapted'`, with `parentId`) that fits the current locks. It never edits the old one.
8. **Preference:**
   - Add pairwise outcomes and reasons to `src/explore/aspects.ts` as events (plan decision 6). Keep the existing API working, and make only additive changes to `rank.ts`.
   - Ranking orders only gate-eligible candidates.
   - Feedback never creates a lock.
9. **Tests (`test/ab1.test.ts`):**
   - Spec 12 items 10, 12 (an exact lock of 7 kuhlis never changes; "at least 7" only grows), 15, 18, 19, 20, 21 (facts present and consistent) and 22.
   - A frozen Animals tab keeps the source's unlocked species and counts.
   - First-pair timing.
