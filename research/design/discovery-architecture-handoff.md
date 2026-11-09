# TankLook — Unified Project, Discovery, and Equipment Architecture

**Implementation handoff for Claude**  
**Status:** Product behavior and acceptance criteria agreed in design discussion. Inspect the existing repository before choosing implementation details; reuse existing project, validation, stocking, renderer, and cost systems wherever possible. This is a proposed direction, not an assertion that the current code already supports it.

## 1. Product objective

TankLook takes **whatever the user already has, wants, or is constrained by** and bridges the gaps to a complete, visually compelling, buildable setup that meets animal welfare requirements and the user's practical constraints.

Users can arrive with no concept, one desired species, existing equipment, an aesthetic reference, or a nearly finished project. The app should do **as much design work as needed and as little as the user does not want**.

**Replace the fundamental “Guided vs. Sandbox” split with one persistent project/workspace and an optional Discovery Algorithm (DA).** Manual editing, discovery, and evaluation are not separate project types or irreversible paths. The user can invoke or exit DA at any point, work manually, then invoke it again without resetting the design.

Core capabilities:

1. **Workspace / project model:** Record specified design elements, equipment, constraints, preferences, and persistent fine-grained locks.
2. **Validation:** Continuously check animal welfare, compatibility, physical suitability, equipment sufficiency, and user-defined constraints, independently of DA.
3. **Discovery:** Generate, screen, diversify, and propose alternatives that honor current locks and the *temporary scope* selected for that run.
4. **Completion / planning:** Determine missing items, supporting equipment, costs, setup effort, care requirements, and implementation details for proposed or selected designs.

The DA is **not an all-or-nothing tank generator**. It can complete a whole tank, revise selected tabs, or fill one specific gap.

## 2. Two distinct controls: persistent locks vs. discovery scope

This is the critical invariant.

### Persistent locks — “Keep this”

Locks are stored with the project and persist across sessions. They can apply to entire objects or individual fields: tank dimensions; a substrate arrangement or zone; a plant group or placement; a hardscape object and its position; a livestock species and/or quantity; particular equipment usage.

- A locked detail cannot be modified, removed, repositioned, or silently reinterpreted by DA.
- Accepting a suggestion **does not automatically lock it**. “Use this in my current design” and “never change this unless I unlock it” are separate actions.
- The UI should clearly distinguish committed/locked design elements from the current but flexible design.
- For animal counts, support meaningful semantics such as **exactly 7** versus **at least 7** (and, where useful, locking only the species). “At least 7” allows the DA to increase the group but not shrink it below seven; “exactly 7” preserves the count.

### Temporary DA scope — “You may work on this now”

On each DA invocation, the user selects checkboxes beside **creative design tabs** such as Tank, Animals, Plants, Hardscape, and Substrate. The exact tab taxonomy should follow the existing app. Checkboxes select where DA **may** make changes *in this run only*.

- An **unchecked tab is immutable for the current DA run**, whether or not any contents are locked.
- Within a checked tab, persistent locks still hold. Only unlocked variables are eligible to change.
- Checking a tab specifies **maximum permission**, not a requirement to regenerate everything in it.
- A narrow request (“add some height to the back-left plant cluster”) should lead to narrow proposals even when a whole tab is checked.
- The DA must read the **entire current project as context**, including unchecked tabs. “Cannot edit” does not mean “ignore for compatibility.”
- A run is complete when the user exits the DA; the project remains and manual editing is immediately available.

Formally: `editable_fields = selected_design_tabs ∩ unlocked_fields`. Everything else is read-only for the proposed design changes. Derived measurements, warnings, and totals may recalculate, but protected design state cannot be rewritten.

**Example:** Animals contains 7 locked kuhlis plus a flexible school of ember tetras. If Animals is checked, DA must retain the locked kuhlis while potentially varying the ember tetras and proposing additions. If Animals is unchecked, the **entire existing stocking stays identical**, including the otherwise flexible tetras.

## 3. Equipment is different: resources and requirements, not another creative shuffle tab

**Do not treat Equipment as an ordinary DA tab that randomly swaps gear.** Equipment is primarily the input inventory/capabilities and the calculated supporting system for a design.

Organize the Equipment area conceptually into these groups (labels may be refined):

| Group | Meaning | Discovery behavior |
|---|---|---|
| **Must use** | Specific equipment the user definitely wants incorporated | Every proposed setup must use it; never silently replace or omit it. It need not be the *only* equipment unless the user separately specifies that. |
| **Have available** | Owned/accessible gear the user could use | Prefer to reuse when appropriate because it has zero *new purchase* cost; may leave unused or recommend replacing if the tradeoff is worthwhile. |
| **To purchase** | Items needed for the currently chosen design and not already supplied | Primarily a **derived shopping list**, not an inventory requirement. It updates with the chosen design and its supporting gear. |

The interface may support drag/move between groups, but **ownership and obligation are separate facts**: “I own it” must not imply “I must use it.” If necessary, model these as separate fields behind the interface to avoid losing information when an item moves.

Important equipment behavior:

- For each proposed design, DA determines **what equipment is required** for animal welfare, plant performance, and general operation. It then tries suitable available equipment, honors must-use equipment, and calculates purchases to fill remaining gaps.
- Equipment requirements and design choices affect each other. Evaluate iteratively rather than adding gear only after all design decisions are frozen.
- A mandatory light that is too weak should constrain plant recommendations. CO₂ and fertilizer do not substitute for adequate light; don't label a demanding plant layout viable just because those were added.
- “Must use this filter” does not automatically mean “no second filter allowed.” If extra equipment is needed and permitted, show that added cost; if the user also forbids extra equipment, report the design as infeasible instead of pretending the gear is sufficient.
- Offer a separate **no new equipment** requirement/constraint where useful. Without it, candidate proposals may include equipment upgrades, but **no purchase or existing-item replacement is committed without the user's acceptance**.
- Let users intentionally compare or optimize equipment if requested, but do not make arbitrary equipment changes a default part of the creative DA scope.
- Costs must reflect the user's actual **remaining acquisition cost**, not the theoretical price of all components. Include animals, plants, hardscape, consumables, and required gear as relevant. Separately show ongoing expense and reasonably explain uncertainty.

The user's choice between “low-tech” and “high-tech” should usually **emerge from the candidate comparison**, not be an up-front forced branch. Show what extra visual options are unlocked by lighting, CO₂, fertilizers, and other gear, and let the user judge whether the appearance is worth the extra upfront cost, ongoing cost, maintenance, and difficulty. High-tech is not inherently aesthetically superior.

## 4. Project inputs, constraints, and welfare

The workspace should be capable of representing:

- **What I have:** tank, dimensions, equipment inventory, existing livestock/plants/hardscape, existing custom geometry and arrangements.
- **What I want:** species/groups and counts, visual style, substrate concept, hardscape, plant aesthetic, overall experience.
- **What constrains me:** startup/remaining-spend budget, space, upkeep time, experience, setup labor, and other relevant conditions.
- **What can change:** individual locks plus flexible/unspecified attributes, with DA scope chosen anew each time.

Distinguish **hard constraints** (must not exceed), **targets/preferences** (rank accordingly but can show tradeoffs), and **welfare/physical feasibility gates** (always evaluated). A budget overrun and a dangerous stocking conflict must not be represented as equivalent failures. Experience generally informs difficulty/advisory messaging unless the user explicitly treats it as a firm limit.

The app must be able to say **no viable design exists under the current locks and constraints**. When that happens, explain the specific conflict and propose the smallest relevant constraint or lock relaxations, without changing them automatically.

## 5. Discovery workflow

1. **Start with the current project.** Users may create a blank project or enter known ideas, owned gear, existing animals, physical setup, constraints, and aesthetic preferences before invoking DA. Do not require a preselected Guided/Sandbox mode.
2. **Choose scope.** DA offers temporary checkboxes for the creative tabs. It can also accept a focused objective (e.g. “make the back-left corner taller,” “find compatible fish additions,” “complete my tank”).
3. **Understand fixed context.** Collect locked items, all unchecked tab contents, must-use gear, inventory, hard limits, soft preferences, and current validation results.
4. **Ask only useful questions.** For blank/slate projects, discovery can progressively ask broad questions: aquarium/terrarium/paludarium; then freshwater/saltwater/brackish where applicable; then visual families, stocking emphasis, care/tech tradeoffs. Skip what is already known. Choose questions that materially discriminate among remaining viable candidates, rather than using a rigid wizard for everyone.
5. **Generate and screen candidates.** Explore permitted combinations of unlocked design elements plus the necessary supporting equipment. Apply welfare, physical, compatibility, and hard-constraint gates before treating a proposal as feasible.
6. **Compare meaningfully different alternatives.** Do not return three near-duplicates merely because they rank highest. Show images/previews and grounded differences in **incremental startup cost, recurring cost, estimated maintenance time, difficulty, and design/stocking character**. Include relevant setup effort when available. Avoid invented precision.
7. **Preview changes, don't silently apply.** Present each option as a proposal/diff against the current project. Users can compare, accept, reject, or ask for variations. Applying a proposal must not automatically lock it.
8. **Allow partial acceptance when dependencies permit.** A plant selection requiring a particular lighting system cannot be accepted as a fully viable bundle without resolving that dependency; present linked changes explicitly. Users must not accidentally accept only half of a required system without seeing the consequence.
9. **Exit and return anytime.** Save accepted changes to the same project. Manual editing, validation, and later re-entry to DA continue with the new current state.

Support both **broad exploration** and **incremental refinement** in the same engine. The checkbox scope defines authorization; the user's objective governs how aggressively to propose changes.

## 6. Proposed UX

- **One project/workspace**, not “Guided project” versus “Sandbox project.” New users can be offered approachable start prompts such as “Just exploring,” “I have some ideas,” and “I have an existing setup/plan,” but these are **entry shortcuts into the same project**, not divergent modes.
- Each creative tab supports manual editing and **fine-grained locks**. For Animals, a clear “locked/keep” section plus “current flexible” items and suggestions is promising; allow individual suggested animals/groups to be promoted to the locked set. Treat dragging into the design and locking as distinguishable operations.
- DA is accessible globally and contextually from tabs. The global entry shows editable-tab checkboxes; contextual entry can preselect the relevant tab(s).
- DA is **non-destructive and resumable** at any point. Don't replace the working scene, erase earlier decisions, or force users back through old questions.
- Equipment tab emphasizes **Must use / Have available / To purchase**, with capabilities and cost consequences; it does not need a standard creative DA checkbox.
- Show a before/after diff and preserved-lock summary before applying. Keep undo/history/versioning where feasible.
- “Make it yours” is not a final one-time step: manually edit, keep/lock individual discoveries, and explore further at any point.

## 7. Four user journeys to support

### A. Blank slate, $300 budget

User knows only they have a **$300 remaining-spend cap**, no equipment, no animal preference. DA starts with large differentiating choices and images; filters/gates the viable branches by cost and welfare; asks increasingly specific questions; compares several complete, *actually affordable* setups with cost, upkeep, difficulty, and visuals. The user adopts and locks some details, makes manual changes, and can re-enter DA. Do not show infeasible saltwater setups as viable just to keep the world-choice menu symmetrical.

### B. Lush planted aquarium with kuhli loaches

User adds the recommended starting group (illustratively seven kuhlis) in Animals and locks that requirement, selects/locks a lush aesthetic, leaves tank size/gear/additions open. DA may propose several tank size classes and tech levels, from a comfortable defensible minimum upward, comparing cost/maintenance/appearance. Larger candidates may expand stocking and, depending on whether the lock means **exactly seven** or **at least seven**, may increase the kuhli group. DA can ask whether the user prefers more of the original species or greater diversity. No budget should not mean displaying absurdly large sizes by default; offer meaningful representative classes and expand on request.

### C. Existing 40-gallon breeder plus proposed stocking

User records the tank and locks it for use; enters current proposed fish. Validation immediately reports suitability and compatibility, even without DA. If Animals is checked, unlocked fish/counts may be adjusted while tank size remains fixed. If Animals is unchecked, **all** fish remain as-is while DA designs plants or hardscape. If locked livestock cannot fit or coexist, explain the conflict and request deliberate relaxation rather than quietly removing anything.

### D. Nearly finished expert build

User enters and locks almost everything; DA is optional and may never be used. Validation remains available. Later, user unlocks one detail or checks only Plants/Hardscape and asks for a small enhancement. All other project details remain intact.

### E. Mixed-substrate, multi-session example

User manually constructs and locks a custom sand/aquasoil layout (and perhaps a driftwood centerpiece). DA session 1 checks Animals, Plants, Hardscape. It creates proposals that respect the exact substrate geometry. User accepts a fish group (without locking it), locks a plant arrangement, and manually adjusts some hardscape. DA session 2 checks only Plants and Hardscape: **Animals is untouched**, despite being unlocked. Later DA session 3 checks Animals and may vary the flexible school while retaining a locked kuhli group. All sessions operate on the same project.

## 8. Suggested logical contracts (not prescribed code shape)

```text
Project:
  current design state (stable IDs for objects and properties)
  inventory (owned/available equipment, specs, quantities)
  mandatory equipment usage requirements
  persistent locks (object/property-level; exact vs minimum as relevant)
  hard constraints + targets/preferences
  validation results and derived quantities
  revision/history

DiscoveryRequest:
  project revision snapshot
  selected creative tabs / optional narrow sub-scope
  objective (broad exploration | complete gaps | targeted refinement | solve problem)
  optional design preferences gathered during this run

DiscoveryProposal:
  candidate design delta, not a replacement for the whole project
  preserved-lock / out-of-scope check
  validation outcomes and any unresolved dependencies
  owned equipment utilized + additional equipment needed
  incremental startup and ongoing cost, care, difficulty, setup effort
  preview and explanation of tradeoffs
```

Use stable IDs and structured property locks rather than brittle free-text lists. Preserve shared project state between DA and manual editing. Guard against applying a stale proposal after manual edits: revalidate against the current project revision before commit, and require explicit resolution if it conflicts.

## 9. Non-negotiable invariants and acceptance tests

1. **Unchecked means unchanged:** With Animals unchecked, DA Plants/Hardscape changes cannot add, remove, resize, or change the count of any animal, even unlocked animals.
2. **Locks survive checked scope:** With Animals checked and exactly seven kuhlis locked, every proposed candidate retains precisely those seven; flexible additions may vary. With “at least seven,” count may increase but not decrease.
3. **Fine-grained placement locks:** A locked substrate pattern or fixed hardscape centerpiece remains geometrically unchanged while other design elements are explored.
4. **No silent changes:** Merely previewing or rejecting discovery does not mutate the project; applying does not auto-lock.
5. **Equipment distinction:** Mandatory gear is retained; available gear is preferred when capable and economically advantageous; purchases are derived per candidate and require acceptance.
6. **Constraint conflicts are explicit:** If must-use low-output lighting cannot support a demanded plant arrangement under the user's other limits, DA flags no feasible candidate or proposes a feasible alternative; it never misrepresents the original as supported.
7. **Cross-tab context:** Changes in checked Plants respect unchanged animal behavior, substrate planting zones, and available/required lighting; they do not ignore unchecked tabs.
8. **Actual remaining cost:** Owning a suitable filter reduces the proposed purchase cost; available but inadequate gear cannot be treated as meeting the requirement merely to improve the budget score.
9. **Scoped refinement:** Requesting “add tall plants to the rear” does not wholesale replace otherwise acceptable unlocked fish or hardscape just because those tabs were checked.
10. **No-solution state:** Conflicting user locks produce an explicit conflict explanation and optional user-authorized relaxations, not silent override.
11. **Persistence/re-entry:** Manual edits, acceptance, locks, and later DA sessions all operate on the same saved project and scene, without wiping state.
12. **Proposal integrity:** After a user edits the project, an old candidate cannot silently overwrite newer changes when accepted.

## 10. Implementation approach for Claude

**First inspect and report** how the current start flow, project state, profile-backed limits, stocking validation, equipment/cost estimation, scene renderer, and candidate/swap functions are organized. Identify what can be reused and where existing workflows improperly wipe/replace project state. Avoid a broad rewrite if the current model can be adapted.

Suggested incremental sequence:

1. **Foundation:** unify project identity and persistence; define inventory vs design vs locks vs constraints; protect the current scene and manual edits. Add regression tests around immutability.
2. **Scoped proposal API:** selected creative tabs, fine-grained lock enforcement, candidate deltas/diffs, preview/apply with revision checks, and persistent validation independent of discovery.
3. **Equipment planning:** Must use / Have available / To purchase data and UI, capability checks, existing-item reuse, missing-gear suggestions, marginal startup costs, ongoing costs.
4. **Discovery experience:** global/contextual entry, adaptive questions, diverse ranked alternatives, visual/cost/care comparisons, broad versus refine objectives, partial acceptance with dependencies.
5. **Polish:** per-item drag-to-lock experiences, targeted sub-tab requests, undo/history, advanced hard/soft constraints, and refined candidate-ranking behavior.

Treat the UX descriptions here as intent, not a pixel-perfect mandate. Preserve working features and existing guardrails. Surface assumptions/edge cases in the implementation plan, but do not block basic architecture on unresolved visual-design details.

## 11. Explicit non-goals / cautions

- Do **not** build two different project types or independent Guided and Sandbox state machines.
- Do **not** let DA silently alter unchecked or locked design details, even when it finds a more optimal overall solution.
- Do **not** equate “I own this” with “I must use this.”
- Do **not** make low-tech/high-tech a mandatory global choice or assume more gear always produces a better-looking tank.
- Do **not** present attractive renders as proof of feasibility; use actual compatibility/capability evaluation.
- Do **not** imply all selected tabs must be fully regenerated. They define permission, not an obligation.

**North star:** One persistent, manually editable project. The user specifies and locks whatever matters. For any DA invocation, they choose the temporary parts DA may explore. DA considers the entire project, proposes only authorized changes, automatically plans capable supporting equipment around owned/required gear, communicates cost/care/appearance tradeoffs, and never compromises welfare or the user's protected decisions.
