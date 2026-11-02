# TankLook: "Open to Anything" Guided Discovery (Nathan, design handoff 2026-11-02)

Converted from TankLook_Open_to_Anything_Claude_Handoff.docx (text only; tables flattened to one cell per line).

TankLook — “Open to Anything” Guided Discovery
Design handoff for Claude / CoordinatorStatus: Agreed product behavior with implementation recommendations clearly markedDate: November 2, 2026Scope: The “Open to anything” choice in Guided Setup, through selection of a complete starting design and handoff to Make It Your Own.
1. Executive decision
“Open to anything” should not simply postpone the Aquarium / Terrarium / Paludarium decision. It should launch an adaptive discovery experience that generates multiple complete, stocked, equipped, and feasible enclosures, learns from what the user likes and dislikes, and continues producing better-matched options until they choose a favorite.
The user still passes through the same optional Equipment and Constraints steps as other Guided Setup users. Existing equipment and stated limits govern what can be recommended. The generator must not treat preference feedback as permission to violate those limits.
This is a distinct discovery interaction, not a separate project type, state store, scene editor, or feasibility engine. After choosing a design, the user enters the same Make It Your Own editor used by Animals First and Look First.
Core principle: Constraints determine what the system is allowed to recommend; preferences determine what it should prioritize among those valid recommendations.
2. Placement in the revised Guided Setup
1. World: Aquarium / Terrarium / Paludarium / Open to anything.
2. Equipment (optional): Record existing enclosure and gear, with Required versus Available status; “Starting from scratch” and “Skip for now” remain fast exits.
3. Constraints (optional): Record physical space, startup and ongoing costs, available setup time, maintenance time / care rhythm, and experience; distinguish firm limits from flexible targets. Permit skipping.
4. Branch: If a specific world was selected, offer Animals First or Look First. If Open to anything was selected, enter Explore Complete Setups instead of asking which of those two routes to use.
5. Explore: Generate a diverse batch; inspect each setup; like, pass, or save; optionally give aspect-level feedback; generate more; compare favorites.
6. Choose one: Accept any feasible candidate at any time and open that same candidate in Make It Your Own.
“Open to anything” is not a fourth physical environment type. Each generated candidate must have a real environment classification (e.g., freshwater aquarium, saltwater aquarium, brackish aquarium, terrarium, or paludarium). Ponds and patio tubs remain out of initial scope.
3. What a generated candidate actually is
Each recommendation is a completed candidate setup, not just a decorative image or an aesthetic family name. It must include:
An actual TankLook scene/render and its underlying reusable scene configuration.
Defined enclosure type and dimensions, plus applicable water type.
Proposed inhabitants and counts, with compatibility and welfare checks.
Appropriate plants, hardscape, substrate / décor, and equipment.
Estimated startup and recurring costs; setup time; ongoing care; and difficulty.
A short, candid description of the experience of keeping it.
The assumptions, pricing coverage, and feasibility status needed to support its claims.
Candidates are proposals, not automatically committed edits to the user’s current project. Their state must remain stable so a user can return to a favorite or select it later.
Candidate card — recommended presentation
Large render: An attractive, honest view of the actual generated setup (not an unrelated idealized reference photo).Name and identity: e.g., “The Woodland Creek” — Freshwater · Blackwater community · suggested enclosure size.Ownership rundown (2–4 sentences): What makes it enjoyable to own, daily or weekly life with it, and the one tradeoff a potential owner should know.At-a-glance statistics:
Statistic
Meaning / display rule
Startup cost
Estimated total, net of eligible reused equipment; show range or uncertainty where warranted.
Monthly recurring cost
Energy, food, consumables, and realistic replacement/ongoing costs within modeled coverage.
Weekly upkeep
Estimated routine minutes/week; note less-frequent bigger jobs separately.
Difficulty
Beginner / Intermediate / Advanced, based on husbandry complexity, sensitivity, and consequence of error—not simply minutes/week.
Footprint
Tank/enclosure dimensions and necessary clearances.
Setup time
Hands-on setup effort; separately flag cycling/establishment time where relevant.
Inhabitants
Proposed species and quantities, not just decorative fish silhouettes.
Show roughly four prominent metrics on the compact card; make other metrics and assumptions available in an expanded view. Do not invent precision for costs or upkeep. If pricing, maintenance estimates, or animal support are incomplete, show that explicitly rather than a confident number.
Writing tone
Make each proposal sound like an ownership experience, not a checklist of pros and cons. Be lightly playful, but candid about ongoing responsibility.
Example — Woodland Creek: “A peaceful underwater forest where little schooling fish weave through tangled roots. The drifting leaves and amber tint are part of its charm—not a sign that the water needs polishing. Expect routine water changes, feeding, and occasional botanical upkeep.”
Example — Colorful Reef: “Your own slice of ocean, with electric colors and fascinating behavior. It’s a spectacular display, but corals and marine equipment reward careful monitoring—and can be pricey.”
Example — Desert Gecko Habitat: “A rocky, sun-baked world with a charming little resident. There’s less gardening than in a rainforest, but temperature, lighting, and the animal’s schedule still matter.”
These examples illustrate tone, not validated cost, welfare, or stocking recommendations.
4. Exploration loop: diverse first, more targeted later
First batch: Recommend six meaningfully diverse setups as an initial UI target, spanning available environment types, styles, inhabitants, and ownership experiences to the extent allowed by constraints. Six is a tunable design proposal, not a user requirement.
User reactions: Each card may be Liked, Passed, Saved to Favorites, or left Unrated. A candidate can be selected immediately as the final choice. After a Like or Pass, offer optional details about which aspects drove the reaction; never require a survey on every card.
Next batches: Use explicit reactions to tilt toward preferred attributes, while continuing to show some adjacent and surprising alternatives. As an initial heuristic, reserve about 20–30% of slots for exploration when the eligible pool supports it; validate this through testing rather than hard-coding it as policy.
Between rounds: Offer one short, editable interpretation of what the system learned, such as: “You seem to like lush, colorful habitats, but you prefer easier ongoing care. Want more like that—or something different?” Users should be able to correct the interpretation or explicitly request broader exploration.
Stop condition: There is no fixed number of rounds. Stop when the user selects a candidate, including from the first batch. They may also continue generating or reopen saved favorites later.
Persistent Favorites: Keep liked/saved candidates and their configuration snapshots available for later review and side-by-side comparison. Avoid duplicates and near-identical outputs unless intentionally testing one controlled variation.
5. Preference feedback: what to learn, and what not to learn
Simple signals
Action
Meaning
Like
Positive evidence for some attributes of that candidate; not proof that every element is desired.
Pass / Dislike
Negative evidence for this candidate; not an automatic ban on its whole world or style family.
Unrated / skipped card
Neutral, not a negative signal.
Save to Favorites
Preserve a candidate for comparison; may be a separate weak positive signal, but should not automatically commit it.
Make This Mine
Select that exact candidate for the project/editor handoff.
Optional aspect-level guidance
Offer a lightweight “What caught your eye?” / “What would you change?” panel with context-relevant tags, e.g.:
Visual: overall appearance, colors, natural vs artificial, plant/decor density, layout.
Animals: particular species, behavior, size, number, or visibility.
World: freshwater / marine / brackish / terrestrial / land-and-water.
Ownership experience: daily care, frequency of maintenance, complexity / fragility.
Store likes and dislikes by aspect. For example, “Love the colors, don’t want a reef” should teach “vivid color is attractive; saltwater may not be preferred,” rather than pushing more reefs. A preference for low-maintenance ownership is valid even if the user’s maintenance-time limit has not changed.
Crucial separation: Do not make “Too expensive,” “Too large,” or “Too much upkeep” an alternative hidden method for changing firm constraints. Those belong to Adjust Constraints, not the aesthetic-learning tags. It is fine to learn that someone prefers easier care while still enforcing their separately stated maximum maintenance time.
Do not overinterpret early signals
The recommender should track uncertainty and avoid tunnel vision after one or two selections. Where feasible, refine why a setup was liked (animals vs colors vs composition vs ownership), not merely which archetype it belonged to. Preserve explicit negative reactions and allow undo/clearing feedback.
6. Constraints and feasibility: hard gate, not a suggestion
This point was explicitly settled: If a user states a firm maximum, every recommended setup must stay within it.
Firm limits: Apply before candidates are shown. A $300 startup ceiling means no $330 candidate, even if it is aesthetically ideal; the same principle applies to footprint, care time, and any other firm cap backed by a sufficiently trustworthy estimate.
Flexible targets: Prefer to meet them. Going beyond a flexible target requires the user’s accepted flexibility and visible labeling; it must never be mistaken for satisfying a firm limit.
Skipped/unknown limits: Remain unknown—not zero and not implicitly unlimited. The system can generate proposals with stated assumptions and estimated demands without claiming they satisfy an unstated personal limit.
No valid candidate: State the blocker and offer the user an explicit way to adjust a limit, change required equipment, or broaden the kind of environment. Never silently violate a constraint.
Incomplete estimate: If an essential figure cannot be estimated with adequate confidence, do not certify the candidate as within a firm bound. Request needed information, present a clearly marked provisional/non-confirmed concept outside the eligible recommendation set, or withhold it.
Example: A user sets a firm $300 startup budget. Every eligible generated setup must fit $300, accounting for appropriate costs and reusable equipment. If a $275 setup still feels too expensive, the correct action is Adjust Constraints → lower the budget, then regenerate from the same learned preference profile—not “find me a cheaper version” as a substitute for their stated cap.
If a user marks an owned 20-gallon tank Required, candidates must use that tank and remain suitable for it. If they mark it Available, it may earn cost credit when included but should not prohibit recommending a better-fitting enclosure. This depends on generator support, not merely a UI label.
Animal welfare and husbandry requirements are independent non-negotiable gates: compatible inhabitants, adequate adult dimensions, environment parameters, safe furnishings, and appropriate equipment must be evaluated before labeling a setup feasible.
7. How the setup-ranking and generation system should behave
Use a two-stage pipeline rather than blending feasibility and taste into one uncontrolled score:
Stage A — Generate and validate: Produce candidates across eligible worlds; reject candidates violating hard constraints, unsupported animal welfare rules, or required-equipment compatibility. Track the assumptions/quality of all estimates. Do not use attractive renders to excuse invalid setups.
Stage B — Rank and diversify: Among eligible candidates, rank by accumulated aspect-level preferences, novelty, and usefulness; include some exploratory options; prevent near-duplicates; and render each candidate as its actual proposed configuration.
When new feedback arrives, preserve earlier likes, dislikes, and saved candidates. When a constraint changes, rerun Stage A and recompute eligibility; preserve the preference model and label previously saved candidates that no longer meet the new rules. Do not silently delete them.
Suggested initial iteration (not mandatory algorithm): Generate 6 valid candidates → collect reactions → extract attribute weights → generate and validate next candidates → diversify eligible results → present a brief interpretation → repeat until a candidate is selected.
8. Candidate selection and integration with shared project state
Selecting Make This Mine should carry the actual candidate into the common project, including:
World/water classification, enclosure and geometry.
Stocking roster and counts.
Plants, hardscape, substrate, décor and renderable scene configuration.
Equipment choices, ownership reuse status, and known constraints.
Cost, care, feasibility estimates and their assumptions.
The chosen archetype/density and any accumulated taste profile (where applicable).
Opening a discovery screen, navigating back, or visiting an animal selector must not wipe the existing scene. Candidates remain candidates until chosen; selecting one should be an intentional, recoverable project update. Re-evaluate the design when the user later changes stocking, equipment, tank dimensions, or constraints while preserving unaffected choices.
The previously reported GS1 findings remain relevant: finish() in src/ui/discovery/screens.ts and open() in src/ui/stockPlan.ts reportedly replace/wipe a scene. Treat those as integration hazards to verify against the current branch, not as a request to implement unreviewed changes here.
9. Proposed user experience in three example rounds
Round 1 — Broaden horizons: The user skipped equipment and entered a firm startup budget and space limit. TankLook displays up to six eligible concepts across aquarium, terrarium, and paludarium where feasible. Cards describe what everyday ownership feels like and show measured/estimated stats.
Round 2 — Follow signals: The user likes a lush planted freshwater tank and a vivid marine-style display, passes a desert terrarium, and indicates “colors and plants” as positives. TankLook presents colorful planted freshwater concepts, colorful marine candidates only if feasible within the original limits, and one or two exploratory alternatives.
Round 3 — Refine the experience: The user likes the appearance but prefers lower-complexity upkeep. TankLook favors suitable easy-care planted setups within the unchanged firm constraints, explaining its direction in one short sentence. The user chooses a favorite and opens that precise design in Make It Your Own.
No mandatory third round: This is just an illustration of progressive discovery.
10. Acceptance criteria / test cases for implementation
1. Branch routing: Open to Anything bypasses Animals First / Look First selection but still uses Equipment and Constraints and reaches the common editor.
2. World diversity: Without a restricting world selection, eligible candidates may span aquarium, terrarium, and paludarium; each candidate resolves to a real type, not a placeholder “anything” type.
3. Constraint enforcement: No displayed eligible setup exceeds a firm budget, footprint, or other enforced maximum; no hidden “too expensive” preference route overrides it.
4. Required vs Available gear: Required tank is respected as a binding constraint; Available tank is optional and credited only when used.
5. Welfare checks: Every eligible stocked design passes applicable animal welfare/compatibility checks; uncertain or unsupported species combinations are not labeled confirmed-feasible.
6. Informative cards: Show actual candidate scene, coherent inhabitant roster, compelling ownership description, startup and monthly costs, upkeep, difficulty, and relevant assumptions.
7. Feedback semantics: Like, Pass, Unrated, Favorites, and aspect feedback have distinct behavior. Unrated is neutral; disliking one card does not ban an entire world.
8. Adaptive batches: After feedback, new batches visibly reflect preferences while preserving meaningful exploration; no requirement to complete a predetermined number of rounds.
9. Constraint changes: Lowering a budget revalidates subsequent recommendations and saved candidates without erasing earlier aesthetic preferences.
10. Preserved selection: The chosen candidate loads into Make It Your Own without an unrelated regeneration, livestock reset, or scene wipe.
11. No feasible results: Explain constraints and offer controlled edits; never fabricate a compliant setup.
12. Skip-friendly: Users can bypass equipment/constraint intake and still explore, with unknown fields and model assumptions represented honestly.
11. Implementation follow-up for Claude / Coordinator
Please reconcile this Open to Anything branch with the GS1–GS6 Guided Setup work and the current generation, costing, compatibility, scene, and project-state contracts. Specifically report:
1. What existing generator, scoring, gallery, favorite/history, and project-state code can be reused.
2. Where complete candidate snapshots and their estimate/provenance must live.
3. How firm budget/time/space gating happens before presentation, including uncertainty handling.
4. Whether Required versus Available equipment semantics work in the generator (especially demand/suggest.ts).
5. How feedback preferences and project constraints remain separate in state and logic.
6. How candidates preserve identity when compared, saved, and opened in the editor.
7. What scene/stocking resets must be fixed to make the handoff non-destructive.
8. A staged implementation plan, file ownership, likely blockers, and focused acceptance tests.
Do not implement a new independent project type or quietly merge this into Look First. This is a separate recommendation-driven way to explore complete setups, while sharing the same underlying project and editing architecture.
Status of decisions versus tunable suggestions
Agreed decisions: Shared optional equipment/constraints; Open to Anything as adaptive complete-setup exploration; like/dislike and optional reasons; ownership explanations and estimated stats; firm limits enforced; no fixed number of rounds; shared Make It Your Own handoff.
Initial proposals to validate: Six candidates per batch; ~20–30% exploratory share; four prominent statistics on compact cards; exact tag wording, weighting, and UI placement. These should remain adjustable based on actual usability and performance.