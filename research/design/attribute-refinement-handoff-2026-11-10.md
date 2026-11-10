# YourArium — Discovery Attribute Feedback Simplification

**Implementation handoff for Claude**  
**Status:** Proposed product/UX change; inspect the current code before modifying it  
**Scope:** Discovery comparison feedback and refinement controls; retain the established A/B session, locks, constraints, proposal validation, and main-view rendering architecture.

## 1. Decision and rationale

Replace the **per-attribute thumbs-up/thumbs-down matrix** with an **optional comparative selection of A versus B** for each meaningfully different design attribute. Preserve:

- The principal **Prefer A / Prefer B / Like both / Like neither / Skip** controls.
- Fine-grained **persistent locks** for commitments the user is sure about.
- **Shuffle/tab-scope controls** for what can change during the current discovery run.
- Explicit **Combine / Try in favorite** actions, which generate a new, validated candidate rather than mutating the current favorite or working design.
- Discovery history, preference learning, feasibility checks, cost/equipment derivation, and **Make It Yours**.

The motivation is **not** that granular feedback has no value. It is that two independent thumbs per side produce redundant actions and ambiguous feedback. The natural user thought is often *“I prefer A overall, but I like B’s plants.”* The UI should represent that directly and with fewer clicks.

**Design principle:** Don't require the user to explain why a feature appeals to them when they can identify which of two visible alternatives they prefer. And don't confuse *preference*, *trying a combination*, and *committing a lock*.

## 2. Desired default user journey

1. The user sees candidates **A and B in the existing main 3D comparison view**, at a shared physical scale, with the compact decision dock visible.
2. The user may simply click **Prefer A**, **Prefer B**, **Like both**, **Like neither**, or **Skip** and advance. **One click remains sufficient.** No attribute review is mandatory.
3. **Optionally, before voting**, they open **Details / What stood out?** and select the side they prefer for any individual attributes that matter to them.
4. They may also select **Try B's plants in A** (or the reverse), which launches the existing Combine proposal and approval process. This is a *design experiment*, not merely a preference rating.
5. If certain about a characteristic, they may explicitly **Lock** that item/attribute through the existing fine-grained lock controls. Locking is not inferred from votes or repeated selection.
6. When the user votes, the DA records the overall result and any optional attribute choices, then selects the next challenger according to the learned preferences, available shuffle scope, locks, and feasibility rules.

**Do not:** force users to complete all attribute rows, automatically lock a liked feature, or silently splice A/B components into the current favorite.

## 3. Replace the attribute matrix

### Old control model (remove from the main feedback flow)

For each attribute on each candidate: independent thumb-up, thumb-down, and lock. For instance, liking B's plants more than A's could require a thumbs-up on B and a thumbs-down on A, plus an optional lock. That is disproportionate to the underlying choice.

### Proposed control model

In the **expanded** Details/Refinement section, show rows such as:

| Attribute | A | No opinion | B |
|---|---|---|---|
| Animals / stocking | Select A | — | Select B |
| Plants | Select A | — | Select B |
| Hardscape | Select A | — | Select B |
| Substrate | Select A | — | Select B |
| Tank size / shape | Select A | — | Select B |

Use **mutually exclusive segmented selections** per row. A, B, or an unselected state; default is **no opinion**. A dash/unselected must mean *not evaluated*, **not** dislike, indifference proven, or equal appeal. If an optional expanded distinction between **both** and **neither** is useful later, keep it secondary; do not turn it into a mandatory five-way answer for each row.

- **Only surface meaningful differences by default.** Unchanged or effectively equivalent attributes do not need comparative feedback controls. They can remain accessible in technical details.
- When a row is selected, provide a concise clear state: e.g. **“Plants: prefer B.”** It is *soft feedback* only.
- A selected row can be changed or cleared before the overall vote; no preference should be recorded until the user submits the comparison. Avoid unintended intermediate DA changes as buttons are clicked.
- Preserve easy access to individual candidate details and fine-grained locks. Do **not** replace all item-level locking with a coarse tab-level lock.
- Prefer labels that identify the actual difference when concise: for instance **“Rock-heavy (A)”** and **“Wood-heavy (B)”**, rather than forcing users to remember which side is which. Keep A/B identifiers unambiguous.

The panel must remain **collapsed by default** so the 3D habitats dominate the screen. The compact A/B decision strip remains the primary interaction.

## 4. Keep three concepts distinct

| Action | Meaning | Behavioral effect |
|---|---|---|
| **Prefer A/B overall** | “I like this complete design more.” | Determines the pair winner according to existing session rules; contributes overall taste evidence. |
| **Prefer A/B for Plants, etc.** | “This aspect appeals more in this comparison.” | Updates attribute-level preference evidence; biases future challenger generation/ranking but does **not** lock, combine, or make the chosen side the global winner. |
| **Try/Combine component** | “Show me a version that uses this part from the other design.” | Creates a **new proposal**, fully validated with derived equipment/costs; disclose adjustments; approval/competition as existing Combine contract specifies. |
| **Lock an item/attribute** | “This is a requirement I’m sure about.” | Persistent constraint; future candidate generation must honor it until explicitly changed. |
| **Uncheck Shuffle tab** | “Don't change this area for now.” | Temporary hold of the chosen comparison baseline/current favorite per the existing scope contract; not a persistent lock. |

These should be labeled and visually separated to prevent confusion.

### Example

The user prefers A overall because of its rocky composition, but prefers B's lush planting:

- Overall: **Prefer A**.
- Hardscape: **A** (optional).
- Plants: **B** (optional).
- Result: A remains favorite. DA learns a relative preference for B's planting and can make a future *challenger* exploring a similar planting strategy around A's characteristics, if allowed and feasible.
- If the user chooses **Try B's plants in A**, that invokes Combine and presents a concrete new design for approval. This direct command is higher intent than a mere preference selection.
- If they **Lock A's centerpiece hardscape**, that becomes a persistent requirement; nothing else in the row becomes implicitly locked.

## 5. How attribute selections should guide refinement

The comparative selector is useful only if it influences subsequent proposals in a visible and predictable way.

**Priority ordering for new challengers:**

1. **Respect immovable requirements:** user locks, welfare, physical feasibility, hard limits, and current shuffle scope. An inferred preference must never override these.
2. **Act on explicit design requests:** a user-approved Combine/Try request is more specific than a thumb or general preference.
3. **Use specific comparative feedback:** if the user favored B's plants but A overall, explore a feasible planting variant in an A-like challenger, without automatically copying B's exact plants or changing A in history.
4. **Explore uncertain attributes:** prefer controlled A/B tests varying one attribute or a closely coupled subset when this yields informative comparisons.
5. **Retain broad exploration:** if user preferences are weak, or the user chooses **Explore Something Different**, show meaningfully varied candidates; don't force convergence from a small number of votes.

**Do not** treat a single attribute selection as a prohibition on the losing attribute or all of its underlying species/materials. E.g. “prefer B's stocking” may refer to school size, species mix, density, or appearance. It is evidence, not an explanation of causality.

**Do not** automatically uncheck shuffle tabs as confidence grows. The DA may choose to vary fewer things *within the user's authorized scope*, and may suggest narrowing, but the user controls the switches.

If feasible and cheap to implement, show a concise reason for targeted challengers, for example: **“Trying denser planting around the rocky layout you liked.”** This should reflect actual proposed differences, not invented algorithm intent.

## 6. Working design and history invariants

Prior work exposed a real regression where **Keep** or **Lock** modified the working design during Discovery. Do not recreate it.

- A and B are **preview candidates**, not working-design mutations.
- Attribute votes and preference edits change only discovery/persistent preference data as appropriate.
- Locks affect the discovery requirements layer; they must not silently insert new livestock, lighting, substrate, or hardscape into the saved working design.
- **Combine** is a separately evaluated candidate, with explicit disclosure of compatibility fixes and added costs; it must not override locked data.
- Historical candidate specifications remain immutable and accessible.
- **Make It Yours** alone commits the selected candidate as the working design, as one undoable operation.
- **Close** restores the working design and undo history unchanged while retaining explicitly saved preferences/locks per the existing contract.

Where an attribute from a losing proposal is selected as preferred, do **not** silently convert it into the current favorite's state. Only explicit Combine/Make It Yours actions adopt a new actual design.

## 7. Data/compatibility implications

Claude should inspect the existing AB7 thumbs data, current preference model, AB5 adaptive challenger generation, scope/lock interfaces, and Combine/session handlers before modifying them.

- Define the new input as a **relative preference**: `{pair_id, attribute_id, preferred_side: 'A'|'B'}` (illustrative only; use repo conventions).
- Preserve the overall vote independently.
- Where sensible, preserve existing recorded thumbs as historical soft feedback; do not infer locks from them or silently rewrite old candidate history. A compatibility/migration layer may be preferable to destroying stored taste signals.
- Ensure optional attribute feedback is incorporated at the same decision boundary as the overall vote, or via an explicitly saved action. Avoid inconsistent partially recorded preferences when the user closes the panel or skips.
- Skip means **no overall or attribute preference evidence for that comparison** unless the user has explicitly committed separate feedback; make this rule consistent and test it.
- Don't ask users to rate two equal values. Meaningful-difference detection should compare structured candidate fields, not just labels or render appearances.

Implementation design, exact types, and UI positioning remain for Claude to determine after inspecting the codebase. This is a targeted refinement, not a request to rewrite the DA.

## 8. Acceptance tests

1. **One-click flow:** With Details closed, user can choose Prefer A or B and advance with no attribute selections.
2. **Opt-in comparison:** Open Details, choose **Plants = B**, **Hardscape = A**, submit Prefer A. A remains favorite; both attribute preferences record without locks.
3. **Clear:** An attribute selection can return to **No opinion** before submission, resulting in no preference evidence for that attribute.
4. **No implicit dislike:** Choosing Plants = B does not hard-ban A's plants or all their species.
5. **No implicit lock:** Repeated preference selections never create a lock.
6. **Preserve lock controls:** User can still lock an individual species/count, hardscape centerpiece, or other supported fine-grained property independent of the row choice.
7. **Combine remains separate:** Try B's plants in A generates a validated candidate and lists needed substitutions/gear/costs; cancellation leaves design, favorite, and history unchanged per established contract.
8. **Preview isolation:** After several rounds, attribute selections and locks, Close leaves working design and undo history identical; explicitly saved requirements persist.
9. **History:** Original A and B are never rewritten by comparative feedback or Combine.
10. **Useful differences:** Equivalent filters or identical substrate configurations don't show redundant preference rows by default.
11. **Targeted learning:** In a controlled fixture, Plants = B measurably increases preference/ranking for similar plant characteristics in later compatible challengers, without filtering out alternatives.
12. **Hard-rule precedence:** A/B attribute preference cannot override an animal welfare gate, hard size/budget limit, or lock.
13. **Scope precedence:** A temporarily held tab stays unchanged despite attribute-level preference for that tab until the user re-enables it, while the preference may remain stored as soft evidence.
14. **Skip semantics:** Skipping a comparison doesn't accidentally record unsent attribute choices or change favorite.
15. **Responsive UI:** Desktop and 375 px phone retain dominant 3D comparison, usable main decision buttons, and accessible optional Details panel.
16. **Regression coverage:** Run relevant AB/DX integration tests and the real UI journey after removing/replacing thumb controls, especially lock/unlock and Close-without-adopting behavior.

## 9. Suggested implementation sequence

**Phase 1 — Inspect and propose minimal modifications.** Identify exact AB7 attribute-thumb UI/actions, preference-write boundaries, existing Combine/Lock behavior, and differences calculation. Report any conflicts with this spec before rebuilding functionality.

**Phase 2 — Replace the presentation.** Remove per-attribute thumb-up/thumb-down controls from the expanded matrix. Add optional comparative A / No opinion / B selection. Keep default panel collapsed and all existing overall votes.

**Phase 3 — Integrate preference interpretation.** Capture relative attribute choices alongside overall votes and feed into the existing preference/adaptive-challenger system. Preserve distinct intentions for locking and combining.

**Phase 4 — Verify end to end.** Test preview isolation, history, favorite logic, fine-grained locks, constrained generation, viewport behavior and backward compatibility. Supply desktop/mobile screenshots of the new expanded Details panel and the compact default comparison screen.

### Success criterion

The user can say **“I like A better overall, but I prefer B's plants”** with one optional attribute click plus the normal overall vote. The DA should make that preference useful in subsequent proposals—without silently changing, combining, or locking the working design. Users who don't care to give granular feedback still proceed with a single click.
