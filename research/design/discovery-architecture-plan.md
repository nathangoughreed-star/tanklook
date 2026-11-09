# Discovery architecture: implementation plan (Coordinator 21, 2026-11-09)

Source: `research/design/discovery-architecture-handoff.md` (Nathan's spec; the WHAT). Code survey: `research/design/da-survey.md` (the WHERE, path:line). This file is the HOW and the lane split. Lane ids use **DX** (Discovery eXchange) because DA1-DA5 already name the compatibility lanes.

## North star (one line)
One persistent project = the active `TankSetup` + its `brief`. The user locks what matters; each Discovery run gets a temporary tab scope; `editable = scope ∩ unlocked`; proposals are deltas previewed and applied (never auto-locked, never silently), with welfare / physical gates always on.

## Decisions taken (flag to Nathan, not blocking)
1. **Project = active tank.** No new top-level Project object: `TankSetup` gains `locks`, a stable `uid` per item, and `rev` (revision counter bumped by every `Store.update`). Compare mode keys everything on the active tank; compare helpers stay out of project state.
2. **Tabs (scope checkboxes):** Tank, Animals, Plants, Hardscape, Substrate (the existing `Layer`s + tank). Equipment is NOT a scope tab.
3. **Locks:** object or property level, keyed by stable uid: `{ target: uid | 'tank' | 'substrate', props?: string[] }`. Animals use roster locks: species + `count: { mode: 'exact' | 'atLeast' | 'speciesOnly', n }`, reconciled against `Fish` rows by the existing `reconcileRoster`. The brief's old `status: 'locked'` maps to `exact` (migration).
4. **Substrate lock = whole substrate** (settings + terrain grid + painted patches) in this pass. Zone-level locks are polish (DX6).
5. **Equipment: ownership and obligation are separate facts.** Owned gear (EQ1, "available") stays the default; a separate **Must use** checkbox per owned item (the brief's `project.use = 'required'` already exists underneath; EQ1 hid it). Optional project constraint **No new equipment**. Owned gear is credited at $0 ONLY when it is capable (fixes `engine.ts:129`).
6. **Guided / Sandbox / Quick Setup / Explore become entry shortcuts into the same project** ("Just exploring" / "I have some ideas" / "I have an existing setup"). Every wipe point in survey section 2 either becomes a proposal-apply, or asks "Start a new project?" explicitly.

## Phases and lanes

| Wave | Lane | What | Owns (files) | Depends on |
|---|---|---|---|---|
| 1 | **DX0 Foundation** | locks model, stable uids (survive regenerate / shuffle / adapt), `rev`, `scope.ts` (`editableFields(scope, locks)`), `proposal.ts` (Proposal = delta + baseRev; `previewProposal` pure, `applyProposal` checks rev + locks + scope, pushes undo, never locks), `guardLocks` in `Store.update`, save migration (SCENE_VERSION 10), immutability tests for invariants 1, 2, 3, 4, 11, 12 | `src/scene/types.ts`, `src/scene/store.ts`, NEW `src/scene/locks.ts` `scope.ts` `proposal.ts`, `starter.ts` id renumbering only, `brief.ts` lock migration | - |
| 1 | **DX1 Verdict** | one `verdictOf(tank, brief)` = `{ gates: welfare + physical (block), hard: user hard limits (block, separate), targets: soft (rank), advisories }` composing existing checks (stockingOf, summaryOf, ownedFit, herpCheck, growthCheck, compliance, conflictsOf); a read-only "Checks" strip that runs on every change, DA or not (invariant 7 support, journeys C/D) | NEW `src/scene/verdict.ts`, NEW `src/ui/checksStrip.ts`, one hook line in `panels.ts` | - |
| 1 | **DX3 Equipment** | Must use / Have available / To purchase in My equipment (ownership and obligation separate fields; move between groups never loses either); capability-aware credit (owned but inadequate = not credited, flagged); "No new equipment" constraint -> infeasible with reason; remaining-acquisition cost + ongoing cost lines; light caps plant demand (CO2 / ferts never substitute) | `src/scene/project.ts` (use / must-use), `src/demand/engine.ts` credit path, `src/ui/myEquipment*` / `ownedGear*`, `src/scene/ownedFit.ts` | - |
| 2 | **DX2 Scoped generators** | scope + lock aware delta wrappers: `proposeFor(request)` over regenerate-by-layer, handOff / adaptToTank, applySwap, reconcileRoster, Explore candidates; outputs `Proposal[]`, reads the whole project as context, touches only `editable`; narrow objectives ("taller back-left", "fish additions") produce narrow deltas (invariant 9); diversity among returned proposals; no-solution -> conflict + smallest relaxations (invariant 10) | `src/scene/starter.ts`, `reeval.ts`, `swaps.ts`, NEW `src/scene/discover.ts`, `src/explore/*` adapters | DX0 (types), uses DX1 verdict + DX3 equipment planning if landed |
| 3 | **DX4 Discovery UI** | global + per-tab "Discover" entry with tab checkboxes (contextual preselect), objective field, proposal cards (preview, cost / upkeep / difficulty deltas, linked dependencies), before/after diff + preserved-lock summary, Apply / Apply and keep / Reject; per-tab lock toggles ("Keep this", exact / at least for animals); Make This Mine wired as an apply | NEW `src/ui/discover/*`, `panels.ts` hooks, per-tab lock affordances | DX0, DX2 |
| 3 | **DX5 One project start** | New tank menu -> entry shortcuts into one project; retire / gate each wipe point (panels.ts replace calls, putTank, makeItMine, scapePick, tierBox, regenerate('all') warn) behind proposal-apply or an explicit "Start a new project"; Guided coach becomes an optional DA questioner (adaptive questions, skip what is known) | `src/ui/welcome.ts`, `src/ui/guided/*`, `src/ui/coach/*`, wipe-point files | DX0, DX4 |
| 4 | DX6 Polish | substrate zones, per-item drag-to-lock, history list, advanced hard / soft constraints, ranking tuning | - | all |

Wave 1 = DX0 + DX1 + DX3 in parallel (disjoint files; the only shared edits are a hook line in `panels.ts` and HANDOFF.md appends). DX2 starts when DX0 lands. DX4 and DX5 after DX2 (DX4 may start on mock proposals once DX0's types are on main).

## Acceptance (from the spec, section 9) mapped to lanes
1 unchecked unchanged: DX0 (guard) + DX2 (tests). 2 locks survive / exact vs at least: DX0 + DX2. 3 placement locks: DX0. 4 no silent changes, apply never locks: DX0 + DX4. 5 equipment distinction: DX3. 6 explicit capability conflicts: DX3 + DX1. 7 cross-tab context: DX2 (reads whole project) + DX1. 8 actual remaining cost: DX3. 9 scoped refinement: DX2. 10 no-solution state: DX2 + DX1. 11 persistence / re-entry: DX0 + DX5. 12 stale proposals: DX0.

## Open questions for Nathan (none block wave 1)
- Substrate lock granularity: whole substrate now, zones later: OK?
- Must use returns as a separate checkbox (the spec), alongside EQ1's "available is the default": OK?
- GW2's open item: "Set my space" (viewer outline) vs Your limits space: one store (DX1 / DX5 can fold it).
