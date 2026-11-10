# Lane AB0: Discovery Session (Discovery v2, Coordinator 21, 2026-11-09)

Start with `prompts/lane-AB-common.md`. Spec sections for you: 3, 5.1-5.2, 6.2, 10, and journeys E and F.

## Build
Write `src/scene/discoverySession.ts`. It is pure: no DOM and no store writes. It is the A/B session state machine over the `DiscoverySession`, `Comparison` and `TabFreeze` types.

1. **Lifecycle:**
   - `startSession(rev, scope, direction)`, `pause`, `resume(session, currentRev)`.
   - If the project changed since `baseRev`, `resume` returns `{ needsRebase: true }`. The caller then offers "Continue (re-check)" or "New session" (spec 6.2).
   - `rebase(session, rev)` keeps the champion, comparisons and ids. It drops freezes whose source is `'working'` at the old rev, and says so.
2. **`record(session, outcome, why?, otherGood?)`** applies the champion rules:
   - **First pair:** the winner becomes the champion.
   - **Champion vs challenger:** the challenger replaces the champion only by winning.
   - **Fresh pair:** the winner goes to `pendingFreshId`, never to the champion. The next pair must be type `'final'`, that winner vs the champion.
   - **Like both, Like neither and Skip** never change the champion (plan decision 4).
   - It returns the new session plus `next: { type, keep?: string }` for the generator.
   - `setFavourite(id)` is the explicit override.
3. **Freezes:**
   - `freeze(session, tab, source)`. Unchecking a tab uses the champion as the source, or `'working'` before a champion exists. "Keep A's hardscape" passes A's id.
   - `unfreeze(session, tab)`.
   - Effective scope = scope minus frozen tabs.
   - This file never writes a lock. Locks stay DX0's.
4. **Persistence:**
   - `saveSession` / `loadSession` per project, in a sibling localStorage key tied to the scene's identity. It is not a brief field, so it never marks the tank unsaved.
   - Wrap every storage call in try/catch, with an in-memory fallback.
   - The session survives a reload and is not in share links.
5. **Tests (`test/ab0.test.ts`):**
   - Journey F step by step: A beats B, C beats A, C beats D; fresh E/F, E wins; then E vs C, both ways.
   - Spec 12 items 5-8, 11 (state side), 13 (the freeze source is A even with B on screen), 14 and 17.
   - Skip leaves no taste record.
   - `record` never mutates its input.
