# Lane AB2: Proposal History (Discovery v2, Coordinator 21, 2026-11-09)

Start with `prompts/lane-AB-common.md`. Spec sections for you: 6.3, 5.4, 10, and journey G.

## Build
Write `src/scene/proposalHistory.ts`, the store of EVERY shown candidate (A, B, losers and skips) as immutable `CandidateRecord`s, kept per project.

1. **API:**
   - `put`, `get`, and `page(sessionId?, offset, n)`, newest first.
   - `favourite(id, on)`, `markChampion(id)`, and `byKey` for dedupe.
   - Records are never edited in place. Only the flags change: favourite, champion and thumb.
2. **Storage:**
   - Follow the `src/explore/store.ts` pattern: one index key plus one key per snapshot. Wrap every call in try/catch, and fall back to memory with `persisted: false`.
   - Cap: 200 snapshots per project. Favourites and champions are never evicted. The oldest unfavourited records go first, and their index line stays as "design no longer stored" (plan decision 7).
   - Keep thumbnails as small data URLs, set lazily.
3. **`reEvaluate(record, project, brief)`:**
   - Returns, beside the record's historical facts: the current verdict, the current `equipPlan`-based facts, and lock and scope conflicts (DX0 `lockViolations`).
   - Never overwrites the record. The UI shows "then" vs "now", and old costs are never presented as current.
4. **Tests (`test/ab2.test.ts`):**
   - Spec 12 items 23 and 24 (data side), and 26: a record with an old `baseRev` reports stale.
   - Eviction, storage absent, and a reload round-trip through `parseScene`.
   - Journey G: lock pygmy cories, then re-evaluate an old record without cories. The conflict is listed and the record is unchanged.
