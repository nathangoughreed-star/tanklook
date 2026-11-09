# Lane DX3: equipment = Must use / Have available / To purchase, capability-aware cost

Follow `prompts/lane-common-c20.md` (report ONCE to Coordinator 21, `local_94b0b16c-78cc-4537-b306-4baa170900b2`; never push).
Read: `research/design/discovery-architecture-plan.md` (you are row DX3, decision 5), `research/design/discovery-architecture-handoff.md` section 3 and invariants 5, 6, 8, `research/design/da-survey.md` section 6, HANDOFF.md EQ1 section (Nathan 2026-11-07: owned gear is "available" by default, used when cheapest, popup warning when it no longer suits; keep that).

Build:
1. Ownership and obligation as separate fields (the brief's `project.use` already has `required`): My equipment shows three groups, **Must use** (owned or to-buy items the user requires), **Have available** (owned, may go unused or be replaced if worth it), **To purchase** (derived from the current design's needs minus capable owned / must-use gear; not an inventory). Moving an item between Must use and Have available never loses ownership; un-owning never loses must-use.
2. Capability-aware credit: fix `src/demand/engine.ts` (~line 129) so owned gear is $0 only when it meets the requirement (rated gallons, light PAR / length, heater watts, ...; reuse `ownedFit`). Inadequate owned gear is NOT credited and is flagged; if it is Must use and extra gear is allowed, add the supplement and show its cost; if the project says **No new equipment** (new constraint in the brief), the design is infeasible with the reason.
3. A Must use light that is too weak caps plant demand (feed this into whatever DX1's verdict reads: expose a `lightCapacity(tank, brief)` helper).
4. Cost lines: remaining acquisition cost (what still has to be bought, incl. animals / plants / hardscape / consumables) and ongoing monthly cost, with uncertainty as a range not false precision. Reuse `toBuy` / `buyGroups` / finishedRange.
5. Tests `test/dx3.test.ts` for invariants 5, 6, 8: owning a suitable filter lowers the purchase cost; an inadequate owned filter does not; Must use + No new equipment + undersized = infeasible with reason; Must use filter still allows a second filter when needed.
Keep EQ1's warning popup. Do not touch generators, locks or start flows.
