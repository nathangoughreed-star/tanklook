# Lane AB5: Combine, adaptive breadth, loop measurement (Discovery v2, Coordinator 21, 2026-11-10)

Start with `prompts/lane-AB-common.md`. The A/B screen (AB0-AB4) is live, as of build 1717.

Read first:
- `research/design/discovery-v2-plan.md`
- `src/scene/discoveryTypes.ts`
- `src/scene/pairGen.ts` and `src/scene/discoverySession.ts`
- `src/scene/proposalHistory.ts` and `src/ui/ab/*`
- the test `test/ab-integration.test.ts`

Nathan's review (2026-11-10): "Combine is the strongest improvement", then adaptive narrowing. He does NOT want a progress panel yet, and he does not want a fixed round count that switches modes.

## Milestone 1: Combine (priority)
1. **What the user can do.** The user takes one part of either card into the other card, most often into the favourite. For example: "Use B's plants in A", "Use A's hardscape in B", "Use B's animals in A".
   - The parts are the five tabs: tank, animals, plants, hardscape, substrate.
   - Offer it on each card's quick sheet, as one short action per tab: "Use these <plants> in your favourite". On the challenger, it can also go the other way.
2. **Engine.** Add `combine(target, donor, tab, project, brief)` in `src/scene/pairGen.ts`, or in a new `src/scene/combine.ts`.
   - It builds a NEW `CandidateRecord`: purpose `'adapted'`, `parentId` = target, and the donor recorded in `assumptions` / provenance.
   - Copy the donor's tab into the target with stable uids, then put it through the full pipeline:
     - lock confinement;
     - `verdictOf` and the Explore gate;
     - `equipPlan` (re-derive the gear: Must use always in, Have available only when capable, To purchase derived);
     - facts recomputed the same way as for any candidate.
   - Splicing is never enough on its own. Plants need light, and animals need tank fit and the water.
   - When the parts don't work together, try the smallest repair inside the combined tabs only: fewer fish, a stronger light purchase, plants matched to the light. Then say what changed. If no repair works, return `ok:false` with a plain reason and the relaxations. Never return an invalid design.
3. **What happens next.**
   - The combined design is new. The original favourite and the donor stay in history unchanged.
   - Present the combined design straight away as the next pair: combined vs the current favourite, type `'champion'`. The user confirms it by picking it. "Set as favourite" is also there.
   - Combining never writes the working project and never adds a lock.
   - Record a taste event: the donor's tab is liked. It is never a lock.
4. **Tests.** Add `test/ab5.test.ts`, and extend `test/ab-integration.test.ts`:
   - A's rocks plus B's plants gives a valid new record, and A and B are byte-identical afterwards.
   - High-light plants from B moved into a low-light A make A's facts add a light purchase.
   - B's animals in a too-small A trim or refuse with a reason.
   - Locks are respected: combining can't override a locked tab.
   - Gear is re-derived.

**When Milestone 1 is committed**, send the coordinator a SHORT milestone message (sha, tests, 2 screenshots at desktop and 375 px) so it can ship. Then continue.

## Milestone 2: Adaptive breadth (no fixed round count)
1. **The engine decides how far apart a pair should be**, using:
   - **Explicit structure first:** what is locked, frozen or switched off. More fixed means narrower.
   - **Then the learned confidence:** consistent wins for one world or style narrow within it. Contradictory, `neither` or skipped rounds keep it broad.
2. **Learned preference narrows ranking, never eligibility.** Nothing inferred becomes a constraint, and the user's switches always win. "Explore Something Different" always goes broad.
3. **Two objectives in the same engine:**
   - **Exploration:** candidates visibly and functionally different.
   - **Refinement:** controlled contrasts that vary one tab, or a tight group of tabs, while holding the rest close to the favourite.
   Pick adaptively. Mark the purpose on the record (`'contrast'` vs `'challenger'`).
4. **Optional suggestion.** The screen may SUGGEST narrowing in one line, for example: "You've picked freshwater 4 times. Switch Tank off to focus on the inside?" It never flips a switch itself.
5. **Visual distinctness.** Exploration pairs must look different at a glance: the world, the look family, or the hardscape-to-plant balance. Add a check, and re-draw a pair that is too alike.
6. **Tests:** a consistent-preference run narrows, a contradictory run stays broad, switches always override, and nothing inferred ever blocks a candidate.

## Milestone 3: Measure the loop (local only)
1. Write a small local event log (`src/ui/ab/metrics.ts`) covering:
   - comparisons by type and outcome;
   - reasons given;
   - combines;
   - keeps and locks from a card;
   - freezes;
   - history reopen / bring back / set favourite;
   - Make It Yours;
   - closing Discover without adopting;
   - time per comparison.
2. Store it in localStorage, capped, with nothing sent anywhere.
3. Add a "Discovery stats" view behind `?debug` that summarizes it: rounds to Make It Yours, abandon points, combine and lock rates.
4. Tests for the counters.

## Not in scope
- The progress panel: on hold by Nathan's word.
- Renaming the product.

## Owns
- `src/scene/pairGen.ts`, `pairFacts.ts`, NEW `combine.ts`
- `src/ui/ab/*`
- `src/scene/discoverySession.ts`: additive only
- `src/explore/aspects.ts` / `rank.ts`: additive only
- tests `ab5*`

## Report
1. The milestone message after Milestone 1.
2. ONE final report after Milestones 2 and 3, with:
   - commit shas;
   - test counts;
   - first-pair and combine timings;
   - screenshots in `research/screens/ab5/` (about 60 KB each, desktop and 375 px), committed.

Never push.
