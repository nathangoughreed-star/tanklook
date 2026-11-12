# Lane DQ8: Like / Dislike feedback model (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "DQ8: Feedback Model". Wave 1 of the Discover redesign; lane DQ7 runs at the same time on other files.

## Read first
- `research/design/discover-redesign-evaluation-2026-11-12.md`: sections 0, 3, 6 and 7 (D5, D6) and section 8 (your row). Nathan ACCEPTED all decisions D1-D11 there.
- HANDOFF sections DQ6, DQ1, DQ3 and DQ4 (grep by heading; never read HANDOFF.md whole).

## Task
1. Add `brief.project.feedback`, using the `Feedback` interface in evaluation section 3:
   - fields: `v`, `level` (design / category / item / attr), `cat`, `target`, `attr`, `elements` and `at`;
   - a FIFO bound, like `MAX_THUMBS`.
   - Keep (hard) stays the existing `locks`. Don't add a Keep field.
2. Migrate `thumbs` into `level:'attr'` entries on read. Old saves and share links load unchanged; validate in `scene/validate.ts`.
3. Scoring (D5) in `scene/scorePolicy.ts`:
   - direct feedback gets its own capped term (cap 0.8), separate from the A/B-learned cap;
   - it only ranks candidates, never filters them;
   - a Dislike steers away from that one element, never bans a category.
   - Show it in the `?debug` breakdown.
4. AB13's A / B attribute picks now write Like entries, with the same behavior as today.
5. `resetLearning()` clears the new list too; locks and stated preferences are kept (DQ4 behavior).
6. Persistence (D6): per project, saved with the tank and in share links. No cross-project profile.
7. Tests:
   - migration round-trip;
   - the cap;
   - ranking only, never filtering;
   - a Dislike doesn't ban a category;
   - reset;
   - A/B results unchanged for an unchanged brief.

## Files
- Yours: `src/scene/attrs.ts`, `src/scene/scorePolicy.ts`, `src/scene/brief.ts`, `src/scene/validate.ts`, and tests.
- Don't touch DQ7's files: `scene/pairGen.ts`, `scene/reeval.ts`, `scene/candidates.ts`.
- No new UI in this lane (DQ11 adds the buttons).

## Done
1. Run `npm run build` and the full vitest; known load-timeout flakes are listed in the common rules.
2. Add your HANDOFF section "DQ8: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator: sha, build and test result, and the API DQ11 should call (add / remove feedback).
5. Never end a turn with a test run in the background.
