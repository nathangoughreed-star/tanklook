# Reviewer handoff (pasted by Nathan 2026-11-10; text extracted from docx, figures omitted)

YourArium — A/B Discovery UI Cleanup and Verification Handoff
For: Claude implementation coordinatorBasis: Current Discovery screenshot supplied by user (November 10, 2026; displayed build 1733).Relationship to existing work: A focused UI/quality addendum to the unified project and Discovery v2 specifications. Do not rebuild Discovery, its pair generator, or the main-view split renderer.Status: Proposed changes and verification tasks, not a claim that existing functionality is broken.
Executive decision
Keep the A/B comparison in the existing main 3D viewport. The split-view approach is correct, but the current screenshot devotes too much attention and vertical space to attribute-by-attribute controls. Simplify the default interface around seeing the two habitats, comparing practical tradeoffs, and making one A/B decision. Keep targeted component selection, locks, history, and details accessible when requested.
Two screenshot observations require investigation before polishing: a toast claiming that lighting was copied into the working design during Discovery, and both incompatible backdrop alternatives appearing as “Locked.” A separate biological-quality check is warranted for the generated Siamese algae eater groups.
Figure 1 — Current state (source screenshot)

Current screenshot of A/B Discovery with expanded attribute matrix
What the screenshot establishes: A/B tanks render in the main view; the left tab scopes are visible; the expanded attribute matrix consumes roughly half the available main-view height; several actions compete for attention. The screenshot does not establish whether the expanded panel is the default state, or whether the toast and lock indicators reflect genuine state mutations. Verify these points in the live application.
Figure 2 — Proposed default comparison hierarchy

Illustrative conceptual default Discovery UI
Visual reference, not pixel-accurate implementation. The mockup illustrates larger habitat imagery, unambiguous A/Favourite and B/Challenger labels, concise cost/upkeep data, and a compact voting dock. It intentionally uses a more modern skin and rearranged navigation; do not replace YourArium’s existing left menus or navigation merely to copy the picture. Species, costs, tanks, and labels in the illustration are not validated application data.
Design requirements for the default state
Preserve the existing main-view 3D A/B split and the existing left menu/tab structure.
Keep both habitats visually prominent. Target roughly 65–70% or more of the main comparison area’s usable height for 3D imagery when details are collapsed, if feasible without covering key controls. Treat this as a design target rather than a strict test assertion.
The default bottom strip should contain: Prefer A / Prefer B, Like both, Like neither, Skip, concise new spend / weekly upkeep / difficulty for each candidate, and a clear More / Details affordance. Keep Make It Yours discoverable, either directly in the strip if it fits or one obvious action away.
A and B labels should distinguish Favourite, Challenger, and special states such as fresh-pair comparison without implying an unestablished favourite. Favor an understandable habitat title over technical labels like “First pair” or “7 diffs.”
Move attribute-level differences, item counts, full price list, history, Combine, and precise lock controls to an expandable drawer/detail view, not the default canvas. Its opening and closing should be reliable and should never silently modify a proposal.
Preserve the left-hand Discovery can change this toggles; they remain the broad temporary shuffle scope. The controls should be easy to reach without taking over the 3D comparison.
For 375 px mobile, use the existing A/B toggle or equivalent one-tank-at-a-time preview, with the decision dock always legible and secondary tools tucked away.
1. Replace the per-attribute thumb matrix as the primary workflow
The current expanded panel displays two reactions plus a lock control for nearly every attribute on both sides. This competes with the global vote and the separate left-hand shuffle settings. It imposes excessive decision work when the intended interaction is often simply “I like B’s plants.”
Recommended primary component action: Select a category/attribute (for example Plants), compare A and B’s actual selections, and choose Use A’s plants or Use B’s plants (or Keep / Lock as the user intends). Offer optional “why” feedback rather than a mandatory thumbs up/down on every row.
Keep individual item-level locks in the existing menus for advanced users. If attribute feedback currently powers the learning algorithm, do not silently delete that capability: preserve it as optional detailed feedback or map component choice to preference signals appropriately.
Figure 3 — Focused component selection

Conceptual Plants comparison with A and B selection controls
Visual reference, not pixel-accurate implementation. The example is a focused Plants choice, not a demand to show a central modal for every attribute. A bottom sheet, popover, or existing details drawer could be a better fit. Selection must respect the existing Combine proposal/approval behavior; choosing B’s plants must not silently replace the working design. Example plant metadata and appearance are illustrative.
Semantics that must remain distinct
Prefer A / Prefer B: Records an overall pairwise preference; updates the favourite according to the existing session rules.
Like both / Like neither / Skip: Follow current session semantics; Skip must not train the preference model.
Use B’s plants in favourite: Creates a proposed combination, validates it, shows necessary changes/costs, and requires approval.
Uncheck Plants in left shuffle controls: Temporarily holds the chosen reference Plants state; it does not create a persistent lock.
Lock specific plant/item/attribute: Adds an explicit persistent requirement for future generation, subject to welfare/conflict handling.
Make It Yours: Commits a chosen generated design to the editable working design using established undo/history semantics.
2. Verify working-design isolation and feedback wording — P0
The visible toast reads approximately: “The lighting copied into your design and kept (undo steps back).” This is concerning during Discovery because preview actions must not modify the working tank.
Investigate the actual event path, not merely the wording:
Begin with a saved working design and record a stable snapshot/hash of the design state and undo depth.
Enter Discovery and interact with A/B details, component Keep/Lock, and several comparisons.
Close Discovery without Make It Yours. Confirm the working design itself and its design undo stack are unchanged; separate Discovery preferences/requirements may appropriately persist.
If a button intentionally proposes copying lighting, ensure it applies only to the appropriate Discovery/Combine proposal until the user explicitly approves a commit. Fix the toast to identify what happened accurately.
If the working design really changes, treat it as a correctness regression rather than a cosmetic copy issue.
Do not fix this only by hiding the notification.
3. Verify contradictory lock presentation — P0
The Background row appears to show A: Rock wall — Locked and B: None — Locked simultaneously. If these refer to the same persistent project-level background requirement, both cannot be true.
Investigate whether the visual state is stale, candidate-specific, or actually stored as conflicting locks. A persistent lock should identify one required property/selection (or an explicitly supported constraint), not two mutually exclusive outcomes. If the two “Locked” badges describe candidate-local states, label them differently to avoid suggesting global commitments.
Tests should cover: locking A’s background, regenerating B, viewing history, closing/reopening Discovery, and attempting to lock B’s incompatible background. The app should resolve/replace a prior lock explicitly or report a conflict; it must not imply both coexist.
4. Audit the generated livestock, especially Siamese algae eaters — P0
The screenshot lists approximately:
A: 42.5 gal; 12 celestial pearl danios, 16 ember tetras, 6 Siamese algae eaters.
B: 50.6 gal; 2 dwarf gourami, 12 neon tetras, 9 other tetras, 5 Siamese algae eaters.
These are red flags requiring review, not definitive failure claims based on the screenshot. Investigate the species identification, adult size, activity, social grouping, space/footprint and straight-run suitability, habitat compatibility, and why the welfare/stocking model accepted each candidate. A visible 88–89% stocking score is not equivalent to species-specific welfare validation.
Deliver a short audit with candidate IDs/species records, which specific gates passed, any missing or incorrect data, and an appropriate model/data correction if the designs are not defensible. Then add regression tests to the generator so similar problems do not recur. Do not conceal the issue by merely reducing the displayed stocking percentage or hiding the animals.
5. Improve information hierarchy and data clarity — P1
Prefer a readable habitat name/descriptor (e.g. “Rocky stream community”) over prominent development labels (“First pair”).
Keep new purchases visually distinct from total retail value; retain ranges where uncertain. Show which owned equipment reduces new spend in details.
Weekly care and difficulty remain visible near the choice. Use consistent units and understandable ranges.
Round display gallons sensibly without losing exact dimensions/specifications in details.
Move “7 diffs,” detailed stocking percentage, full price rows and per-attribute diagnostics to secondary content unless one is an actionable welfare warning.
Make actual welfare warning / provisional / validated states more prominent than a generic capacity percentage. Don’t imply all care systems have been verified when crucial capabilities are unknown.
Check display fidelity: candidate visuals should correspond to the generated tank size, fish groups, plants, substrate, and hardscape—not merely a visually attractive approximation.
6. Prioritized implementation order
P0 — Correctness gates
Investigate lighting-copy toast and confirm immutable working design throughout preview.
Investigate simultaneous conflicting “Locked” indicators.
Audit the pictured Siamese algae eater stocking and correct model issues if found.
P1 — UX simplification
Keep the expanded attribute matrix behind Details/More by default; preserve large 3D previews and a compact decision dock.
Introduce focused component selection (“Use A/B’s plants,” etc.) while retaining Combine validation and fine-grained locks.
Clarify favourite/challenger labels, basic cost/care/difficulty and Make It Yours placement.
P2 — Polish/validation
Check 375 px mobile and desktop with collapsed and expanded details; avoid covering essential 3D content with controls.
Verify real species and plant render fidelity, accessibility labels, and tooltips where Hold vs Lock still creates confusion.
7. Acceptance criteria
AC01: Entering Discovery initially shows the split 3D tanks and a compact decision strip, not an expanded multi-row attribute matrix.
AC02: Closing Details restores the visually dominant 3D comparison without changing project state.
AC03: Prefer A/B, Like both/neither, and Skip continue to follow the established session rules; Skip trains no preference.
AC04: Selecting a component from either candidate triggers the correct Keep / Combine / Lock semantics, with approval and validations where required.
AC05: Holding a tab is temporary and distinct from a persistent lock; the wording communicates that distinction.
AC06: Five or more pair comparisons followed by Close leave the working design and undo history unchanged unless a user explicitly committed a design; Discovery requirements can persist independently.
AC07: There is no route to two mutually contradictory global locks of the same background property; the UI is unambiguous.
AC08: Generated candidates with large Siamese algae eater groups receive an auditable species-specific welfare decision; regression tests cover any discovered model issue.
AC09: Per-candidate prices, estimated upkeep, and difficulty match the corresponding candidate specification and are not the frozen working-tank values.
AC10: At desktop and 375 px mobile width, the primary A/B decision is easy to find and the detailed pane is usable without blocking all meaningful visual comparison.
AC11: “Make It Yours” is available through an obvious action, and accepting a proposal preserves coherent project/undo behavior.
AC12: Existing main split-view renderer, tab scope controls, preview isolation, history, and Combine flow are reused; no second Discovery interface is introduced.
8. Requested Claude response
Inspect the relevant current files and confirm which issues are real defects versus confusing UI states.
Propose the smallest implementation plan; keep UI changes and correctness fixes in reviewable commits.
Produce before/after screenshots of default collapsed, expanded Details, and component-choice states at desktop and 375 px mobile. Use real app state, not forced CSS state, for workflow acceptance screenshots.
Include the Siamese algae eater model audit and test results.
Report any deviation from the behavior contract before changing lock, Combine, or persistence semantics.
Non-goals: Another onboarding redesign; a new A/B generator; changes to the winner-versus-challenger algorithm; broad rebranding or navigation rewrite; rendering an image as a substitute for a real 3D habitat implementation.
