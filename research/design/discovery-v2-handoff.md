# YourArium — Discovery Experience v2
## Product decisions, implementation requirements, and acceptance tests for Claude

**Prepared:** 2026-11-09  
**Product:** YourArium (formerly TankLook)  
**Purpose:** Implementation handoff covering all decisions and useful details established **after** `tanklook-discovery-architecture-handoff.md`. This document is written so it can be read on its own, but should be reviewed alongside the previous handoff. Where they differ, **this v2 handoff supersedes the earlier discovery/onboarding interaction design**. The earlier document's persistent project model, lock/scope invariants, equipment semantics, and welfare rules remain in force unless explicitly revised here.

**Status legend:**
- **Agreed requirement:** Established behavior to implement.
- **Recommended implementation:** Strong proposal from discussion; use unless inspection of the repository suggests a demonstrably better method.
- **Deferred / not agreed:** An idea discussed but not a current requirement. Do not implement it merely because it appeared in earlier brainstorming.

> **Primary direction:** An optional, repeatable, visual A/B discovery experience. The user compares two **validated, complete habitat proposals**, selects a preferred one, and normally pits that winner against a new challenger. They can optionally explain their choice, lock appealing aspects of either proposal, temporarily freeze whole tabs from shuffling, revisit every generated proposal, and adopt any suitable proposal into the persistent manual workspace at any time. Equipment is specified as inventory and requirements, not randomly shuffled as another creative tab.

---

# 1. Product model that must remain intact

YourArium bridges the gap between **what the user has**, **what they want**, and **what is practically and biologically feasible**. A new user may know nothing, own equipment, have a particular animal or aesthetic in mind, or have a nearly complete design. The application should do only as much design work as the user delegates to it.

There is **one persistent project**, not separate Guided and Sandbox project types:

1. **Manual workspace:** Users can edit livestock, tank, plants, hardscape, substrate, equipment, and constraints directly.
2. **Validation:** Welfare, compatibility, capacity, physical feasibility, and equipment suitability checks operate regardless of discovery state.
3. **Discovery Algorithm (DA):** Optional; generates alternatives under explicit constraints, persistent locks, and temporary shuffle scope. Can be entered, exited, and re-entered at any time.
4. **Planning:** Derives remaining purchases, upfront and ongoing cost, care time, difficulty, and implementation needs for a given candidate.

A user must be able to make a custom mixed-substrate design, lock its geometry, run DA for plants and animals, manually edit some results, and later run DA for a different subset. Nothing about discovery should force a reset of the project or a fresh questionnaire.

**New emphasis:** The DA's primary user-facing interaction is **pairwise comparison**, not a predetermined question tree or a one-by-one thumbs-up/down feed. Those were considered; they are no longer the intended main loop.

---

# 2. New-project entry: minimal, deliberate onboarding

## 2.1 Start flow (agreed)

On launch, retain the initial **Start New / Open Existing** choice.

Upon **Start New**:

1. Ask **one broad habitat-direction question** first, with visually understandable options such as:
   - Freshwater aquarium
   - Saltwater aquarium
   - Terrarium
   - Paludarium
   - **I don't know yet**
2. Do not trap the user in a lengthy hierarchical questionnaire. The selection is an **initial direction/preference**, not necessarily a permanent lock. If the user explicitly locks the habitat class or makes mandatory species/equipment choices implying a habitat, subsequent candidates must honor that. An undecided user can explore multiple habitat types subject to feasibility. A future brackish option may be supported by the underlying model, but do not add more onboarding just to expose it.
3. Give the user the opportunity to provide **anything already known**—tank, equipment, desired animals, plants, hardscape/substrate ideas, budget, space, time, experience, other constraints—through the **existing tabs/menus**. They can lock choices they are sure about or mark available equipment. This step is entirely optional; it is valid to start DA with no entries.
4. The user may start discovery at any time. They do **not** need to populate all tabs, validate a completed plan, or finish a separate intake flow first.

## 2.2 Small introductory popup (agreed)

Show a short, easily dismissible instruction **every time** the user creates a new project (not when merely opening an existing project). Do **not** add “show only once” logic unless a real usability need emerges.

Suggested copy, preserving the user's preferred wording:

> **Let's build your habitat.**  
> If you already have equipment or ideas in mind, add them using the tabs on the left. **Lock anything you're sure about.**  
> When you're ready, hit **Discover** to explore setups built around your choices. If you're starting from scratch, you can jump straight into Discover!

A single **OK / Start Building** dismisses it. The popup may come immediately after the broad habitat choice as the interface opens; don't create an additional onboarding step just to collect every input. The relevant tabs and Discover action should be easy to identify once dismissed.

**Explicitly rejected as default:** Mandatory multi-page intake forms, a separate AI/free-text parser requiring a review step, asking everyone for budget/experience/equipment up front, or separate “Add What I Know” and “Discover Ideas” project modes. Those might be explored later if testing demonstrates a real need, but they are not part of the agreed simple start experience.

---

# 3. The main DA experience: two real proposals at a time

## 3.1 Start a discovery session (agreed)

The user turns on DA from the workspace. A **Shuffle / Explore** control panel becomes available with checkboxes for the creative areas, following the existing app's taxonomy, e.g.:

- Tank / dimensions
- Animals / stocking
- Plants
- Hardscape
- Substrate

Equipment is **not** a normal shuffle checkbox (see §7). Existing locks, scope freezes, constraints, and owned/required equipment apply automatically.

The first discovery round presents **two visually distinct, feasible, complete proposed habitats side by side** (responsive design on narrow screens). They are generated from the current project and its constraints, rather than by arbitrary random mixing. Each proposal has a stable specification, not merely a render.

If the user chose “I don't know yet,” early comparisons can span the plausible habitat types. If the user has fixed freshwater livestock, no terrarium or saltwater proposal is feasible unless relevant locks are changed. If a starting habitat direction is only a soft preference, honor it in ordinary comparisons and let the user deliberately broaden exploration.

## 3.2 First comparison, then winner vs. challenger (agreed)

**Default mechanism:**

```text
Round 1: A vs B                 -> user picks A
Round 2: A vs C                 -> user picks C
Round 3: C vs D                 -> user picks C
Round 4: C vs E                 -> user picks C
... current favorite vs a new challenger ...
```

The current **winner/champion is a specific saved candidate specification**, not an automatically assembled mix of whichever individual attributes scored highest. It does not change merely because the DA computes a new proposal. A challenger replaces it only after the user selects that challenger over it (or explicitly chooses a saved candidate as the favorite).

This gives a stable benchmark and a sense of forward progress. Avoid replacing the favorite with two unrelated proposals every round: the user loses continuity.

## 3.3 Deliberate exploration of two entirely new directions (agreed as action; automatic schedule deferred)

Provide a visible **Explore Something Different** / **Try Two New Ideas** action. It intentionally compares two new candidates outside the immediate favorite's neighborhood while still honoring hard constraints, locks, and current shuffle restrictions.

```text
Current favorite: C
Explore something different: E vs F -> E wins this local comparison
Compare E vs C                 -> user picks overall winner
```

**Critical:** E does **not** become overall favorite solely because it beat F. It must beat C (or be explicitly set as favorite). The system must distinguish a **winner of a local exploratory pair** from the **overall project favorite**.

An approximately 80/20 champion-challenger vs. fresh-pair mixture was floated as a tuning hypothesis. **It was not agreed as a fixed requirement.** Start with a predictable favorite-versus-challenger loop plus the explicit exploration action. Consider automatic exploration later if evidence shows anchoring or repetitive output.

## 3.4 Comparison feedback (agreed)

In each A/B round the user can choose:

- **Prefer A**
- **Prefer B**
- **Like both**
- **Like neither**
- **Skip**

After an A or B choice, allow **optional reasons** for the preference: animals, plants, hardscape, substrate, tank size, overall look, upfront cost, ongoing cost, maintenance, difficulty, etc. The user may cite several reasons and may optionally identify positives of the losing design as well. **Never require a questionnaire after each choice.**

A full mandatory list asking the user to vote A/B separately for *every* variable on *every* comparison was considered and **not recommended**. It creates excessive effort and can turn discovery into a survey. An advanced or contextual variable comparison could be supported later, but **one overall selection + optional reasons** is the primary interaction.

Interpret response semantics carefully:

- **A/B selection:** Strong pairwise preference signal under this context; update favorite appropriately.
- **Like both:** Both are appealing; no forced rank order. If a current overall favorite exists, do not silently replace it without a head-to-head win or explicit selection.
- **Like neither:** Negative feedback about the pair, potentially a signal to broaden search; do not crown a new favorite.
- **Skip:** No strong evidence; avoid treating it as a dislike.
- **Optional reasons:** More informative than the raw preference; use to tune the relevant characteristics or tradeoffs.

**Important:** Selecting a candidate or preferring an attribute is **not** the same as locking it. The model may increasingly favor a characteristic, but must **never automatically create a persistent lock** from feedback alone.

The earlier one-at-a-time thumbs-up/thumbs-down/skip feed is **superseded as the primary DA UI**. Its useful concepts—quick reactions, optional “what I liked/disliked,” and preserving feedback—are folded into this A/B system.

---

# 4. What the algorithm is trying to learn

## 4.1 Seek information and good designs, not just randomness

The user initially suggested high-variance random shuffling. The refined direction is **deliberately diverse sampling from the feasible design space**, especially at the beginning. Do not waste time generating invalid random combinations and then treating them as finished options.

- At the start, propose meaningfully different viable design families, price/care levels, aesthetics, animals, and scales within the supplied bounds.
- As preference evidence accumulates, present more relevant challengers without collapsing prematurely into near-duplicates.
- When the DA is trying to learn about a particular variable, prefer a **controlled contrast**: hold most properties comparable while varying the relevant factor(s).
- Include deliberate cost-vs-appearance, care-vs-complexity, or stocking-diversity tradeoffs when those are uncertain.
- Keep some potential for surprise via **Explore Something Different**, especially early on. Variance naturally decreases as the user locks and freezes more of the design.
- Do not pretend an A/B selection identifies *why* the user preferred A when 10 factors changed. Reason feedback is optional; without it, treat inferred factor preferences as uncertain.

Examples of informative pairs:

1. Two very different valid habitats for a blank slate user who chose “I don't know yet.”
2. Same tank, animals, and cost tier, but wood-heavy jungle vs. open rocky riverbank hardscape.
3. Two planted aquariums with different lighting, CO₂, startup cost, maintenance, and resulting visual potential.
4. A locked school of kuhli loaches, with a higher-count original-species focus vs. a more diverse compatible community—if quantity-lock semantics allow an increase.

## 4.2 Keep preference-learning modest in v1

**Recommended implementation:** Start with a transparent, testable preference record and candidate ranking/diversification scheme rather than jumping straight into a large machine-learning stack.

Store pairwise outcomes, optional reasons, comparison context, and relevant attribute summaries. Weight explicit explanations more strongly than speculative inferences. Avoid inferring hard constraints from a few votes. Candidate generation and validation should work even with zero preference history.

Preference history should logically belong to the project/discovery context unless a separate account-wide preference feature is deliberately designed. No automatic cross-project lock transfer.

---

# 5. Shuffle controls, persistent locks, and candidate sources

This section preserves the strongest architectural invariant from the previous handoff, adapted to A/B discovery.

## 5.1 Three separate concepts

| Concept | Meaning | Duration |
|---|---|---|
| **Persistent lock** | This object/field must be kept; DA cannot alter it without explicit unlock | Stored with the project |
| **Shuffle checkbox** | This tab is allowed to vary in current discovery. Unchecked = keep unchanged *for now* | Discovery session / until user toggles it |
| **Preference signal** | Evidence the user likes a characteristic; influences ranking | Session/project history, never hard constraint |

A checked tab defines **permission to change**, not a command to regenerate everything inside it. Unchecked tabs are read-only for the current discovery continuation, including their otherwise unlocked details. Fine-grained locks remain binding even when their tab is checked.

**Effective editable region:** `enabled_shuffle_fields ∩ nonlocked_fields`, with further restrictions from habitat feasibility and hard constraints. Validation considers **the entire candidate**, including protected/out-of-scope information.

## 5.2 Clarify which candidate an unchecked tab preserves

**New issue introduced by pairwise proposals:** When A and B differ, “uncheck Hardscape” is ambiguous unless there is a known source.

**Recommended explicit rule:** The current **overall favorite** is the default source of session-temporary preserved tab values. If the user is looking at the challenger or an older proposal and wants *that proposal's* hardscape, offer a direct **Keep this hardscape for now** action that records the chosen source before freezing the tab.

- Before there is a favorite, session freezes refer to the current working-project snapshot or an explicitly selected proposal.
- After a favorite exists, an unchecked tab freezes the value shown in the selected source/favorite, **for future DA candidates only**.
- This should **not** silently mutate the persistent working design. It is a session constraint, not an adoption operation.
- The UI should make the selected freeze source obvious if two proposals have different values: e.g. “Keep A's hardscape” rather than a contextless checkbox.
- Unfreeze by rechecking the tab. A persistent lock remains active even if the tab is rechecked.
- Revisited history items may be read-only; importing a component into the current session/design requires checking conflicts.

This reconciles the original invariant (“don't change unchecked tabs”) with the new proposal gallery: the **temporary DA baseline** can be a selected proposal, while the underlying **saved working project remains unchanged until explicit adoption**.

## 5.3 Fine-grained locks / dragging from a proposal (agreed)

At any time, a user can transfer something they like from a displayed proposal into **Locked / Keep** within its relevant tab. Examples:

- A school of pygmy corydoras from candidate B → locked Animal entry.
- A particular driftwood centerpiece and its placement → locked hardscape object.
- A mixed sand/aquasoil zone arrangement → locked substrate geometry.
- A particular plant cluster → locked species/placement/size as explicitly selected.
- A tank dimension → locked tank field.

The following must remain distinguishable:

1. **Reacting to a candidate** = preference signal.
2. **Temporarily unchecking a shuffle tab** = preserve this attribute for present exploration.
3. **Locking an item** = persistent design commitment.
4. **Adopting a proposal (“Make It Yours”)** = copy selected proposal into editable working design, **without automatically locking** all its attributes.

Drag/drop is a desirable interaction for the proposal-to-locked-list workflow. **Also provide an explicit “Keep / Lock” action** for touch, accessibility, and discoverability. Dragging to the current flexible selection is not the same as dragging to the locked group.

### Locked livestock quantity semantics

A lock on “7 kuhli loaches” can represent **exactly 7**, **at least 7**, or potentially **species required, quantity flexible**. These are not equivalent. Exact count cannot change; minimum count may grow (e.g. in a much larger tank) but cannot shrink; species-only requirement allows the DA to propose a biologically appropriate count.

For a source proposal that includes 6 pygmy corydoras, “Keep these” should not ambiguously mean either exact or minimum. The UI needs a clear default and an affordance to change it. Claude should review the existing lock model and propose the smallest defensible UX; do not silently change quantities contrary to user expectations.

## 5.4 Conflict handling

New locks can make the current favorite, older proposals, or even the current working project incompatible. Never silently mutate the locked species, equipment, or geometry to make a candidate pass.

When a saved proposal is recalled or imported:

- Evaluate it against **current** locks, scope, equipment requirements, and hard constraints.
- If inconsistent, show why. Offer an explicitly user-approved **adapt this proposal** operation, or block adoption until the conflict is resolved.
- Do not retroactively rewrite the original history record or quietly mark an invalid design as viable.

**No-solution state:** If no feasible candidate exists under the selected constraints, explain the bottleneck and smallest meaningful changes that could restore feasibility; do not return attractive but invalid tanks.

---

# 6. Separate working project, discovery session, and proposal history

This separation was surfaced repeatedly in discussion and is crucial to preventing destructive behavior.

## 6.1 Working design (persistent)

The manually editable, saved project design. It stores its own objects, locks, input constraints, inventory, and revision ID. The DA can be invoked from it at any time. Merely previewing a generated candidate cannot overwrite it.

## 6.2 Discovery session / favorite (temporary but preservable)

A DA session has its own selected shuffle tabs, temporary freezes, favorite/champion candidate, optional preference state, and comparison progress. It may be based on a snapshot of the working design. It must not mutate the working project merely by producing candidates or by recording a winner.

A session can be exited and re-entered without data loss. If the user returns after manually editing the working design, offer to continue with appropriate revalidation/rebasing or begin a new discovery session from the updated design. Do not silently apply stale generated content over later edits.

## 6.3 Proposal history (all generated candidates, not just winners)

Every presented habitat—A, B, challengers, and unsuccessful or skipped candidates—should be retained in an accessible **bottom-of-screen history drawer/strip**.

History should support:

- Reopening any earlier candidate with the same underlying design and the associated costs/feasibility information from that run.
- Favorite/bookmark and quick retrieval.
- Inspecting the proposal's stocking list, equipment list, hardscape/plant composition, dimensions, cost and care estimates.
- Bringing a past proposal back as a challenger or explicitly setting it as the discovery favorite (subject to current locks/feasibility).
- Importing individual compatible components of older proposals with validation and explicit user consent.
- Comparing promising designs.

Save a **structured design specification with stable IDs** plus suitable render assets/state, provenance, source project revision, validation/cost snapshots, and feedback. A screenshot alone is insufficient: it cannot reliably be edited, re-evaluated, or composed with other design components.

When reopened later, distinguish the **historical snapshot** from a **current re-evaluation**, since inventory, prices, locks, or manual design may have changed. Do not present old cost figures as refreshed/current without recalculation.

Recommended practical cautions: lazy-render thumbnails as needed, deduplicate near-identical candidates, and use storage limits/paging so unbounded history doesn't degrade performance. Do not silently discard all old generated designs.

## 6.4 “Make It Yours” (agreed)

At any point, the user may select a displayed candidate (including an older one) and choose **Make It Yours** / **Use This Design**:

1. Validate/reconcile it against the latest project revision, persistent locks, and any changes made since the proposal was generated.
2. Preview the affected changes, especially any changes that reach beyond the chosen scope or have equipment dependencies.
3. On explicit acceptance, adopt the candidate as the editable **working design**.
4. Preserve locks, user inventory, and project identity; do **not** auto-lock everything because it was accepted.
5. The user can now edit anything unlocked manually and re-enter DA later.

Because discovery should propose **complete** habitats, “Make It Yours” can adopt a full candidate. A later fine-grained acceptance/edit capability remains important; no need to force every candidate selection to overwrite an entire project.

---

# 7. Equipment remains fundamentally different from creative shuffle tabs

This behavior was agreed in the previous handoff and affirmed in the newer discussion. **Do not regress it just because A/B comparison needs different costs or tech levels.**

## 7.1 Equipment roles

| UI group | Meaning | Constraint behavior |
|---|---|---|
| **Must use** | Gear the user insists is incorporated | Every candidate must include it; does not imply *only this* unless explicitly stated |
| **Have available** | Owned/accessible gear, not necessarily required | Prefer if suitable and economical; $0 additional purchase cost, but can leave unused or recommend a better option |
| **To purchase** | Missing gear required by a specific proposed or working setup | **Derived from candidate**, not random inventory shuffle; shown with price |

Ownership and usage obligation should be modeled separately even if the UI organizes items by drag/drop groups. The user may own a light without requiring its use; “must use this filter” need not prohibit a second filter.

## 7.2 Equipment is solved jointly with candidate design

For each candidate, the engine:

1. Understands required animal and plant conditions, tank geometry, habitat needs, etc.
2. Honors must-use gear and any explicit **no new equipment** cap.
3. Uses appropriate owned gear when beneficial.
4. Derives additional items needed to make the candidate viable.
5. Includes those items in the **price list** and evaluates their consequences for operating cost, upkeep, and complexity.

These steps may need iteration: the design drives equipment, and equipment capability constrains possible designs. Do not randomly shuffle lamps/filters as independent aesthetic variables.

- Weak must-use light limits demanding planted options. CO₂ injection and fertilizers **cannot compensate for inadequate light**.
- A high-tech-looking candidate may need stronger light/CO₂/fertilizer and more maintenance, but high-tech is **not inherently better-looking**.
- The user should normally **see visually different viable proposals and decide** whether the result is worth the incremental purchase cost, recurring cost, care, and difficulty; avoid forcing “low-tech or high-tech?” as an obligatory early question.
- Equipment upgrades in candidates are **proposals**, not purchases/changes silently applied to the working project.

## 7.3 Cost accounting

Lead each candidate with **remaining acquisition cost**: what this user would actually need to spend given their owned equipment and inventory. Also distinguish:

- Estimated total retail/build value (optional secondary figure)
- Incremental purchases by line item: tank, animals, plants, substrate, hardscape, lighting, filtration, heating, CO₂, fertilizers, other essential supplies where relevant
- Owned/available gear reused: $0 incremental acquisition, but show usage explicitly
- Estimated ongoing costs (electricity, CO₂, consumables, etc.)
- Estimated weekly maintenance minutes and difficulty
- Setup work/effort when available

A budget target should rank options; a hard budget cap filters/rules them out unless the user explicitly chooses to relax it. Uncertain model numbers/prices should be marked as estimates or require identification before a firm claim. Do **not** invent precise cost estimates or use pretty renders as proof a setup is achievable.

---

# 8. What each comparison card must show

A/B comparison is not only about an image. Users should judge visual appeal against realistic practical tradeoffs.

**At-a-glance on both cards:**

- A high-quality, grounded visualization of the proposed habitat
- Descriptive title / habitat type / tank size
- **Estimated new spending** after crediting owned gear
- **Estimated weekly upkeep time**
- **Estimated difficulty**
- An obvious control to select A or B, and easy access to deeper details

**Expandable quick sheet / price list:**

- Full stocking list: species and counts (plus plants/invertebrates as appropriate)
- Main plant, substrate, and hardscape components
- Equipment: must-use gear, reused available gear, required purchases, with prices
- Itemized cost subtotal and total (and ongoing cost if supported)
- Relevant care conditions, limitations, and validated welfare/compatibility status
- What differs materially from the other option, especially when a controlled comparison is intended

Costs and care estimates must be consistent between A and B (same scope, accounting convention, units, and owned-equipment assumptions). If some estimates are provisional, label them; don’t use false precision.

Responsive UI: side-by-side on desktop if detailed images remain legible; mobile may use swipe/toggle A vs B with comparison metrics retained. The history drawer sits near the bottom. Persistent shuffle controls and quick access to relevant locks must remain understandable without overpowering the designs.

---

# 9. Welfare, feasibility, and cross-tab constraints are non-negotiable

Every displayed candidate presented as a viable build must go through the existing credible welfare/capacity/compatibility, physical, and equipment checks, not simply an aesthetic generator.

- Respect existing species welfare gates, footprint/length/turning or other geometric limitations, habitat requirements, temperature/chemistry compatibility, group-size recommendations, plant/equipment sufficiency, etc., to the extent those models already exist and are validated.
- Hardscape and plant layouts must not invalidate animal space or obstruct necessary access just because an image looks good.
- An unchecked Animals tab can freeze stocking for a session, but animals still affect the suitability of checked Plants or Hardscape.
- If a user locks seven kuhli loaches, every relevant proposed freshwater tank must support them appropriately. For exact/minimum count, preserve the actual chosen semantics.
- Changing tank/habitat class may invalidate animals, plants, or equipment; do not invent cross-world combinations to satisfy a visual preference.
- If constraints are mutually infeasible, return a **specific conflict state and actionable relaxation suggestions**, not a fake finished design.
- A candidate with unresolved essential facts (e.g. unknown filter specification) should not be given the same confidence as one thoroughly checked; mark estimates and ask for precise data only when it materially affects an important decision.

A beautiful image is a **visualization of structured candidate data**, not the source of truth for stocking, purchases, or feasibility.

---

# 10. Proposed conceptual data / API contracts

These are logical contracts, **not an instruction to force an incompatible schema into the existing codebase**. Claude should map them onto the actual architecture after inspection.

```text
Project
  id, revision
  workingDesign (structured tank/animals/plants/hardscape/substrate etc.)
  ownedInventory, mandatoryEquipmentRequirements
  persistentLocks (object- and field-level, exact/minimum/species-only as relevant)
  hardConstraints, softTargets, initialHabitatDirection
  validationResults

DiscoverySession
  id, projectId, baseProjectRevision
  shuffleEnabledTabs
  sessionFrozenFields (value + sourceProposalId or workingDesignRevision)
  championProposalId?               // overall favorite
  pendingExplorationWinnerId?       // local fresh-pair winner awaiting champion challenge
  preferenceEvidence / pairwiseResults
  status (active/paused/completed)

Proposal
  id, discoverySessionId, createdAt, sourceProjectRevision
  candidateStructuredDesign (or immutable delta + stable base)
  renderSnapshot/thumbnail (optional, derived)
  equipmentAllocation (required/reused/new purchases)
  validationStatus, issues, assumptions
  acquisitionCost, ongoingCost, upkeepTime, difficulty, priceBreakdown
  generatedPurpose (broad exploration / focused contrast / champion challenger)

Comparison
  id, proposalAId, proposalBId, type
  outcome (A / B / both / neither / skip)
  optionalPositiveReasons, optionalNegativeReasons
  championBefore, championAfter
```

**Generation preconditions:** Proposed candidates must be compatible with the current relevant project snapshot, locks, and scope. If a session resumes after project edits, rebase or explicitly fork; don't use stale proposals as if still valid.

**Proposal identity:** History should store immutable candidate snapshots. Do not mutate the old proposal in place when a user selects it, locks part of it, or asks to adapt it; create a derived candidate/new revision.

**Candidate completeness:** A candidate is a complete feasible habitat concept with equipment/purchase plan, not merely a pretty theme. It may expose honest uncertainty in cost or precise model selection, but must not present unresolved welfare as validated.

---

# 11. Walkthroughs Claude should use to validate the design

## Journey A — Blank slate

User selects **Start New → I don't know yet**, dismisses the brief popup, enters no equipment or constraints, and invokes DA. It shows A and B from meaningfully different feasible directions, with images, spending, upkeep, difficulty, and expandable component sheets. The user prefers B for aesthetics, then sees B vs C. The user can at any time lock a liked animal or style feature, uncheck a tab for temporary preservation, or choose Make It Yours. If they later add a $300 *hard* budget, future viable candidates must honor it or show a clear conflict if none can.

## Journey B — Kuhli-loach idea

User selects Freshwater, adds a locked group of seven kuhlis, wants a lush plant aesthetic, and leaves tank/other stocking/gear open. Early proposals explore comfortable tank sizes, low-/high-tech plant approaches, and more of the original group vs more compatible species. If the lock is **exactly seven**, don't increase it; if **at least seven**, a larger suitable tank may propose more. The user may select pygmy cories from the *losing* tank and lock a suitable school; all future candidates must preserve that requirement and still pass habitat checks. The user can uncheck Animals and focus comparisons on hardscape and plants without locking every flexible animal.

## Journey C — Existing 40-gallon breeder / available gear

User owns a breeder and Oase canister filter, places them in **Have Available**, and enters a preferred stocking list. The DA must show viable options and favor reuse where appropriate, but may propose a new filter if justified. If they move the tank into Must Use/lock it, all subsequent proposals preserve that vessel. It should never count an insufficient filter as fully adequate just to hit the price cap. Card costs reflect gear already owned.

## Journey D — Nearly finished expert design

User enters a complete manual setup and locks most details. DA remains optional. Later the user checks only Plants and Hardscape and requests alternative arrangements; the incumbent stocking and tank are unchanged. A/B comparisons can be controlled contrasts varying only that authorized subset. Returning to manual editing does not wipe any work.

## Journey E — Mixed substrate, successive sessions

User manually constructs a custom sand + aquasoil pattern, locks it, and opens DA with Animals/Plants/Hardscape checked. Candidate A has a liked hardscape; they freeze it temporarily by unchecking Hardscape (or explicitly keep A's source), then continue to compare plants/animals. They lock a plant group, adopt a proposal, manually tweak the layout, and later relaunch discovery. All locked geometry survives. Session freeze does not silently turn into a persistent lock or overwrite the working design.

## Journey F — Champion and deliberate fresh exploration

Round 1 A beats B. Round 2 C beats A. Round 3 C beats D. The user chooses **Explore Something Different** and sees E vs F. E wins **only that exploratory pair**. Next they compare E vs C. If E wins, it becomes overall champion; if C wins, C stays. Both E and F remain in history regardless. A later lock acquired from F must be validated against the incumbent champion before further candidates are proposed.

## Journey G — Revisiting a history candidate after changes

After locking pygmy cories, the user reopens an old proposal consisting of an incompatible setup. The history view retains its exact original form and prior estimates; it must not silently become the current valid champion or edit the project. **Use this design** triggers current validation and reports the conflict, offering user-approved adaptation or refusal. All saved manual edits remain intact until explicit acceptance.

---

# 12. Acceptance criteria / regression tests

The following should be turned into UI/integration/engine tests where practical.

### Start / onboarding
1. Start New shows the broad habitat question with **I don't know yet**; a selection is not automatically a permanent hard lock.
2. Each Start New invokes the short instructional popup with **“Lock anything you're sure about.”** Open Existing does not.
3. User can dismiss popup, enter nothing, launch DA, and see candidates; no mandatory form or tab entry.
4. User can record available/required equipment and constraints directly in existing tabs before or after starting discovery.

### Pairwise loop / learning
5. First round is two candidate designs A/B; choosing A produces A vs a new challenger, not two unrelated designs by default.
6. If challenger C beats champion A, C becomes new champion; earlier A and B remain in history.
7. **Explore Something Different** produces a fresh pair E/F; local E/F winner cannot displace champion unless compared to champion or explicitly selected.
8. A/B, both, neither, and skip have distinct behaviors. Skip does not become a dislike; feedback reasons are optional.
9. Pairwise feedback influences ranking but never creates a hard lock or mutates the saved working project.
10. Broad early comparisons are diverse and valid; focused comparisons may vary one or a few dimensions without necessarily changing all editable tabs.

### Scope / locking
11. With Animals unchecked in the active session, subsequent candidates preserve the designated session-source stocking, including unlocked species and quantities.
12. With Animals checked and exact 7 kuhlis locked, no candidate removes, swaps, or changes that group; an “at least 7” lock permits larger quantities, not smaller.
13. “Keep A's hardscape for now” must preserve **A's** hardscape, even when B is also visible. It must not accidentally freeze B's geometry.
14. Rechecking an unchecked tab makes its otherwise unlocked details eligible for later shuffles; any persistent object locks still hold.
15. Locking a species/item from the losing candidate persists across future rounds and still requires full compatibility validation.
16. User accepting a full proposal does not auto-lock all of its parts; mere preference feedback does not adopt the proposal.
17. Scope changes and freezes do not overwrite the working project while DA proposals are being previewed.

### Gear, cost, feasibility
18. **Must Use** equipment is always incorporated; **Have Available** is reused only when suitable; **To Purchase** derives from the specific candidate.
19. When appropriate owned gear is reused, incremental upfront cost is lower; the candidate still shows what items it needs. No fictional ownership, capability, or precise pricing.
20. High-light-demanding plants are not labeled supported by weak locked lighting merely because CO₂/fertilizers are proposed.
21. Pairwise cards consistently show estimated incremental cost, weekly care, difficulty, essential species counts, and itemized equipment/purchases.
22. No invalid animal-welfare combination is knowingly presented as a viable complete design. Impossible locks/limits produce an actionable no-solution state.

### History / adoption / persistence
23. Every displayed proposal, including losing/skipped ones, remains retrievable with structured data, not screenshot only.
24. History revisit is non-destructive; current lock and constraint conflicts block/adapt adoption with explicit user approval.
25. **Make It Yours** transfers a selected compatible candidate into the manually editable working design; preserves project locks and inventory and supports later DA re-entry.
26. A stale proposal cannot overwrite manual changes made after its base revision without revalidation/reconciliation.
27. Mobile/keyboard users can lock items without relying solely on drag/drop; two-tank comparison remains understandable on narrow screens.

---

# 13. Implementation order recommended to Claude

**Do not immediately rebuild the whole application. Start with a codebase assessment and map each feature to existing systems.** In particular, audit current project/scene persistence and whether entering/exiting the old guided flow wipes or replaces scene state. Retain existing validators, species catalog, equipment metadata, price models, rendering and comparison primitives if feasible.

**Phase 0 — Audit / brief plan**
- Identify current New/Open flow, guided/sandbox state and scene lifecycle, project persistence, locking and constraints, render path, validation, stocking models, equipment data, and cost/care estimation.
- State what exists, what is missing, likely migration concerns, and a phased implementation strategy. Verify that the new UI can be implemented without duplicate project types.

**Phase 1 — Strong state boundaries**
- Separate immutable candidate snapshots and session state from the persistent working design.
- Implement/preserve locks, temporary freeze origins, tab scope, revision-safe proposal application, historical snapshots, and regression tests.

**Phase 2 — Viable candidate pairs and A/B engine**
- Generate two distinct, validated, *complete* candidates from the project constraint state.
- Implement champion vs challenger, explicit fresh-pair exploration, proper pairwise outcomes, and a first-pass ranking/diversification strategy.
- Start with simple preference scoring; instrument results for tuning rather than overbuilding ML.

**Phase 3 — Comparison UI + history + adoption**
- Desktop/mobile A/B cards with images, cost/care/difficulty, expandable component/price lists, optional reasons, easy lock/keep actions, current shuffle scope, and bottom history drawer.
- History recall, favoriting, conflict handling, Make It Yours, and manual editing/re-entry.

**Phase 4 — Equipment and estimate quality**
- Fully integrate Must Use / Have Available / To Purchase with candidate capability, marginal acquisition costs, ongoing cost, upkeep/difficulty, and no-new-gear limits.
- Verify necessary equipment is included before candidates pass feasibility gates. Improve price coverage and uncertainty handling.

**Phase 5 — Improve search quality**
- Controlled contrasts, adaptive comparison choice, stronger visual differentiation, cost/care tradeoffs, targeted exploration/partial adoption, renderer optimization, storage/performance tuning, and usability tests.

Work in coherent, testable increments and report which acceptance criteria each phase satisfies. This sequence is a **recommendation**, not a mandate to ignore existing components that allow a different implementation order.

---

# 14. Unresolved choices: do not silently hard-code assumptions

The discussion deliberately did **not** settle every low-level behavior. Claude should expose reasonable defaults and explain major tradeoffs during implementation planning, without turning these into blocking questions if existing code suggests a sensible solution.

1. **How best to represent lock quantity semantics** in the current stocking UI: exactly / at least / species only. The distinction is mandatory; the presentation is not specified.
2. **Session freeze provenance when two proposals are shown.** The recommended explicit source rule in §5.2 resolves the ambiguity, but exact control placement is up to design.
3. **Storage limits** for full proposal history and thumbnails. Preserve access to meaningful history without degrading performance; pagination and compression are implementation details.
4. **Exact aesthetic preference-learning method.** No specific ML model, fixed exploration fraction, ranking weights, or automatic convergence threshold has been agreed.
5. **What “Like both” or “Like neither” does to a champion in nuanced cases.** The non-destructive defaults in §3.4 are recommended; confirm in behavior tests rather than treating votes as hard design edits.
6. **Whether high-level habitat choice is initially soft or explicit must-use.** Treat it as an initial preference by default, with easy explicit lock. If existing world models require stronger compatibility boundaries, disclose them without silently treating a casual choice as immutable.
7. **Exact UI implementation of “To Purchase.”** It should be derived from the selected design, but a manually entered planned purchase may be stored separately as an intention if needed.
8. **Whether every equipment model and care estimate can be precisely validated in v1.** Use confidence/unknown status rather than false precision or unverified “fully viable” claims.

---

# 15. Do / don't summary (for quick reference)

**Do:**
- Keep the unified project and manual workspace.
- Ask a broad habitat question with “I don't know yet,” then show a short popup **on every New Project**.
- Let users add/lock anything they already know through existing tabs, or skip intake entirely.
- Make **A/B comparison** the primary discovery interaction.
- Default to **winner vs new challenger**; let users deliberately **Explore Something Different** using a fresh pair.
- Let users choose A/B/both/neither/skip and optionally explain what they like/dislike.
- Make early feasible candidates visibly diverse; later comparisons more targeted without tunnel vision.
- Allow per-tab temporary shuffle freezes plus persistent fine-grained locks, including **locking from either A or B**.
- Keep all proposals in a bottom history drawer as structured, revisitable candidates.
- Show estimated incremental spending, ongoing cost, maintenance, difficulty, detailed stocking/equipment price list for every candidate.
- Let users **Make It Yours**, manually edit, and return to DA freely.
- Enforce welfare, capability, hard constraints and project revision integrity across every path.

**Don't:**
- Reintroduce mandatory separate Guided vs Sandbox modes or a lengthy up-front questionnaire.
- Randomly shuffle equipment like plants/hardscape, or conflate owned with must-use.
- Overwrite working design while presenting comparisons or recording preferences.
- Automatically lock something because it won a vote or was accepted.
- Treat winning a fresh E-vs-F side comparison as beating incumbent C.
- Make users rate 7+ variables every round, require explanations, or force a fixed 80/20 pattern.
- Silently change unchecked/locked fields, ignore cross-tab requirements, or show invalid candidates as viable.
- Store only screenshots of generated designs, or overwrite older history specs when adapting them.

**North star:** Users should be able to discover their preferences by **choosing between actual, buildable habitats**, while progressively preserving the animals, visuals, dimensions, and other details they love. They retain control through locks and shuffle scopes, see the real practical tradeoffs, and can move seamlessly between generating ideas and manually constructing their own habitat.
