# Lane DQ7: candidate API, Discover on partial scenes (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "DQ7: Candidate API". Wave 1 of the Discover redesign; lane DQ8 runs at the same time on other files.

## Read first
- `research/design/discover-redesign-evaluation-2026-11-12.md`: sections 0, 1, 2, 4 and 8 (your row). Nathan ACCEPTED all decisions D1-D11 there.
- HANDOFF sections DQ6, DQ2 and DQ4 (grep by heading; never read HANDOFF.md whole).
- `research/design/da-live-path-map.md`.

## Task
1. Pull a candidate generator out of `nextPair` in `src/scene/pairGen.ts`, into a new `src/scene/candidates.ts`:
   - `nextCandidates(project, brief, { objective, scope, focus, breadth, n })` returns the top-N diverse candidates;
   - it uses the existing `ingest` pipeline, the pool and `diversify`;
   - the A/B loop then calls it. **A/B must behave identically:** prove it with tests (same pairs for the same seeds and inputs).
2. Add `handOff` `mode: 'fill'` in `src/scene/reeval.ts` (evaluation section 2, blocker 3). It keeps the existing items and adds only what a region or category lacks.
3. Decision D2:
   - the default scope is everything not kept, within the checked tabs;
   - a "fill only the gaps" path uses the `complete` objective;
   - hand-added items are NOT kept automatically.
   - When the `complete` objective can't fill a gap without changing a non-kept item, return a clear result that says so (evaluation section 2, blocker 5).
4. "Finish my setup" with an existing tank: tank out of scope, look made with `adaptToTank` (evaluation section 2, blocker 6).
5. Tests for each, including a partial scene (tank + stocking kept: the result fills the layout and the remaining gear and never touches kept items).

## Files
- Yours: `src/scene/pairGen.ts`, `src/scene/reeval.ts`, new `src/scene/candidates.ts`, and tests.
- Don't touch DQ8's files: `scene/attrs.ts`, `scene/scorePolicy.ts`, `scene/brief.ts`, `scene/validate.ts`. If you need a type from them, ask the coordinator.
- No visible UI change in this lane.

## Done
1. Run `npm run build` and the full vitest; known load-timeout flakes are listed in the common rules.
2. Add your HANDOFF section "DQ7: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator: sha, build and test result, and anything DQ10 needs to know about the API.
5. Never end a turn with a test run in the background.
