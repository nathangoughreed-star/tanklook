# YourArium — Discovery Algorithm Audit & Corrective Implementation Handoff

**Reference:** Claude's report of live `origin/main`, build 1767, as supplied by the product owner  
**Purpose:** Correct the *behavior* of the existing A/B Discovery Algorithm (DA) so it matches the design decisions reached in the YourArium discussions.  
**Scope:** Candidate search, stated and learned preferences, refinement objectives, meaningful design diversity, and related correctness/performance tests.  
**Out of scope:** A new Discovery UI, new onboarding flow, wholesale replacement of `nextPair`, major changes to the project/lock model, or reintroducing the old Explore-grid interface.

> **Evidence status:** The findings below reflect the supplied audit of `origin/main`, not an independent inspection of the repository. Claude should confirm the relevant behavior in the current code before changing it. Source paths and numerical weights are quoted from the supplied audit and may have moved since build 1767.

## 1. Executive decision

The **architecture is right; the behavior is incomplete**. Preserve the existing A/B comparison in the main 3D view, champion-versus-challenger sessions, persistent locks, temporary shuffle/freeze scope, equipment reuse, whole-candidate welfare checks, history, Combine, and Make It Yours.

Fix the DA in this order:

1. **Correct preference semantics and representation.** Soft preferences must never silently act as hard exclusions. Generated designs must actually report the aesthetic attributes the onboarding cards and learned taste model use.
2. **Improve feasible-space coverage.** Selecting the first viable pair from the first few generated looks biases discovery toward catalogue order and current-project variations. Deliberately sample distinct viable design families, sizes, and stocking philosophies before choosing a pair, within a measured latency budget.
3. **Make refinement intentional.** Overall A/B votes express a *relative whole-design preference*, not dislike of every attribute in the losing design. Explicit attribute-level A/B choices should guide targeted challengers that test incorporation of preferred components.
4. **Improve generation/caching and remaining feedback plumbing.** Avoid wasteful candidates that violate easy-to-predict constraints, separate cache invalidation from taste updates, and finish or remove disconnected feedback actions.

**Success criterion:** The DA shows feasible, visibly meaningful alternatives and a user can say, in effect, **“I prefer A overall but B's plants”** and receive a justified challenger that tests that preference, *without* silently modifying A, violating locks, or teaching itself unrelated dislikes.

## 2. Established behavior to preserve

The following are product decisions, not proposals to revisit:

- **A/B is the primary discovery loop:** first pair, then current champion versus challenger. Overall actions: Prefer A, Prefer B, Like both, Like neither, Skip, Explore Something Different.
- **Two separate concepts:** persistent fine-grained **locks** versus temporary tab-level **shuffle/freeze scope**. Locked values cannot change; unchecked tabs remain unchanged for that discovery operation even if unlocked. All candidates still consider the entire project for feasibility.
- **A saved working design is not a preview.** Discovery proposals are separate; only an explicit adoption (Make It Yours) commits a design, as one undoable action. Keep/Lock must not leak mutations into the saved working tank.
- **Equipment is derived from the proposed design:** Must use is mandatory; Have available is reused only when suitable; To purchase fills gaps, with additional spend, care, and difficulty shown. Equipment is not randomly shuffled independently of the design.
- **Welfare, compatibility, hard constraints, and feasibility remain authoritative.** Never invent a second feasible candidate to manufacture an A/B pair. Support zero, one, or multiple valid results with honest explanations.
- **Survey/archetype responses are preferences unless explicitly marked as requirements/prohibitions.** “Interested” and “Avoid” are soft signals. Stated preferences outrank inferred tastes, but neither becomes a lock by repetition.
- **Image-based visual archetypes** are the quick visual-language input; they must connect to actual generatable designs and their underlying visual attributes. A user may change them in Constraints during Discovery.
- **No forced survey or mandatory per-attribute feedback.** Overall voting must remain a one-click path. Component preference, Combine, and locks are optional refinements.
- **The visible A/B scenes remain at a common physical scale**; no return to individually zooming each tank to fit.
- **Physical habitat backdrops** are hardscape; external room backgrounds are presentation. Keep existing separation.

## 3. Confirmed or reported divergences — classification

| ID | Finding in build 1767 audit | Classification | Requested outcome |
|---|---|---|---|
| P1 | A preferred tank-size range is copied into hard search rules and filters out-of-range designs. | **Reported correctness defect** | “Preferred” affects ranking only; explicit firm bounds filter. |
| P2 | “Avoid” archetypes are ordered last, and early stopping means they rarely get generated. | **Reported sampling/semantics defect** | Avoid reduces priority but doesn't make the family unreachable. |
| P3 | Generated features report `live-planted=true` and `vivid=false` nearly universally; `natural`, `colourful`, `ordered` axes are computed but unused. | **Reported feature-representation defect** | Accurate design-derived descriptors used in preference ranking and diagnostics. |
| P4 | A choice on an attribute row is learned twice (as a thumb and a like). | **Reported feedback duplication** | One event, one intentional weighting rule. |
| G1 | First-pair search favors up to 10 variations of current project and stops at 4 usable designs; catalogue ordering can dominate. | **Design/generation weakness** | Representative candidate sampling before pair selection, with bounded work. |
| G2 | Stocking recipes use 2/3/4 species ladders; tanks near 1×/2×/4× minimum size. | **Design limitation, not necessarily a bug** | Support meaningful stocking philosophies and size choices, not mechanical species escalation. |
| L1 | Overall winner is liked; losing design's non-world features receive a pass. Money/time reasons teach nothing. | **Modeling weakness needing controlled correction** | Treat whole-design wins as relative evidence; explicit reasons teach the relevant dimensions. |
| L2 | Breadth reduction mainly controls distance; attribute feedback doesn't reliably produce a targeted challenger. | **Product gap** | Generate challengers with an explicit improvement hypothesis. |
| I1 | Each vote clears the candidate cache because taste weights are persisted in the project. | **Reported performance/architecture defect** | Reuse valid design specs; rerank on taste changes, invalidate on structural changes. |
| I2 | `Like neither` broadening flag is never read; reset/undo learned taste disconnected; seen designs can repeat after reload. | **Reported incomplete wiring** | Make controls effective; persist exposure/history appropriately. |
| I3 | Snails, shrimp, adult-size exclusions are checked only after stocking assembly. | **Search-efficiency weakness** | Pre-constrain generation where cheap, with final validation unchanged. |

**Note:** The live `scene/pairGen.ts` path is the relevant target per the audit; older Explore-grid flows and `demand/taste.ts` are not automatically part of the live A/B implementation. Do not spend effort fixing inactive systems unless reuse is justified.

## 4. Priority 1 — Fix stated preferences and feature representation

### 4.1 Explicit preference strength must survive end-to-end

Represent all relevant values distinctly as:

- **Hard requirement / prohibition:** filters infeasible candidates (e.g., no injected CO₂, no snails, firm maximum spend, fixed tank).
- **Stated preference / avoidance:** ranks candidates only (e.g., prefer 20–40 gal, interested in Dutch Garden, avoid Iwagumi). Does not prohibit valid alternatives.
- **Learned preference:** weaker, revisable evidence from comparison choices and actions.
- **Unspecified:** no preference inferred.

**Fix P1:** Inspect the Quick Preferences → brief → search rules → tank catalogue → final gate path. A **preferred** 20–40 gal should favor tanks in that range while still permitting viable 55-gal alternatives, for example. An explicitly **firm** 20–40 gal constraint must reject 55 gal. The same distinction applies to size, care, cost, and other properties.

**Fix P2:** “Avoid” is not “Don't want.” Avoided visual families should still be reachable through broad exploration and “Explore Something Different.” If the user specifies a genuine hard exclusion, enforce it. Do not make early return plus ordered catalogues turn a negative preference into a de facto filter.

### 4.2 Make the visual preference axes real

Inspect how the generator describes each finished design, including its plant list, geometry, colors, composition, physical materials, stocking, and lighting. Correct unsupported/constant feature labels so that important distinctions can be represented:

- naturalistic ↔ deliberately artificial/stylized;
- sparse/open ↔ dense/lush;
- muted ↔ colorful/vivid;
- ordered/geometric ↔ wild/organic;
- rock-heavy ↔ wood-heavy and other relevant hardscape descriptors;
- live/artificial planting and planting distribution, where applicable.

Do **not** assume an archetype name proves the rendered outcome. A declared “vivid” visual family with dull generated plants should not be marked vivid merely because of its label. Conversely, do not claim visual precision beyond the assets and scene data; use modest, inspectable heuristics and document their limitations.

**Connect all applicable axes to actual preference scoring.** The supplied audit says `natural`, `colourful`, and `ordered` are calculated but ignored; verify this and wire them into the *live* candidate scorer, or remove unsupported dimensions from the user-facing card mapping until genuinely modeled.

For any image-based archetype input, verify an actual response: selecting Interested/Avoid changes comparative candidate rankings without silently becoming a hard filter.

### 4.3 Keep scoring intelligible

Do not fix missing axes simply by adding arbitrary large bonuses. Inspect the existing +/−1 stated weights, capped learned weights, and size/plant bonuses together. Establish one coherent scoring policy so an explicit stated preference is normally more influential than a weak inference, while allowing all feasible candidates to remain discoverable under soft preferences. Provide diagnostic score breakdowns in development/debug output.

## 5. Priority 2 — Deliberately search the feasible design space

### 5.1 The early-stop problem

The audit reports that candidate generation considers up to ten variations of the current project, then one Explore look at a time, and stops once four usable designs and a valid pair are found. That favors whatever the generator happens to try first, even when better-matched or more informative alternatives exist later.

**Requested fix:** Use a **bounded, diversity-aware candidate pool** rather than a first-four-found pool.

- For an unconstrained first pair, sample across eligible habitat worlds (if the user truly selected “unsure”), visual families, approximate size classes, and meaningful layout/stocking patterns before picking the pair.
- When the user explicitly prefers a habitat, rank that habitat strongly, but honor whether it is soft or hard. “Explore Something Different” may broaden soft habitat preference, never hard exclusions.
- For established champions, sample challenger strategies deliberately: direct improvement, controlled alternate composition, and occasional out-of-family exploration.
- Prevent near-duplicates and repeats, including across reloads where exposure history exists.
- Balance **coverage and latency**. Do not turn candidate generation into an exhaustive combinatorial search; use stratified sampling, limited proposals per bucket, incremental ranking, and/or warm-cache reuse. Instrument quality and latency together.
- Do not weaken welfare checks or hard constraints for variety or speed.

The current 0.12 minimum distance, visually distinct first-pair rule, 2.2-second soft deadline, and 8.8-second hard stop are useful implementation context, but should be **validated rather than treated as sacred constants**. Avoid falling back to a visibly near-identical pair solely because the soft deadline elapsed; if necessary show the best valid available option, acknowledge limited alternatives, or continue a bounded attempt with clear feedback.

### 5.2 Multiple stocking philosophies, not just species ladders

Retain recipe-based generation, but add **genuinely different viable stocking approaches** rather than treating 2, 3, and 4 species as universal progression:

- species-focused community or large single-species school;
- mixed-zone community with several compatible groups;
- light/understocked display with more swimming space;
- other habitat-appropriate compositions (where defensible).

Size-tier changes should exploit additional space meaningfully (larger groups, different species, layout freedom, habitat complexity, or open swimming room), **not require monotonically larger fish counts**. Actual dimensions and species behavior remain decisive; volume alone is not sufficient.

Generation should account for hard “no snails/shrimp/large animals” and similar exclusions *before* constructing unsuitable rosters where inexpensive. Keep full final welfare/hard-limit checks as authoritative.

## 6. Priority 3 — Learn from comparisons without false inference

### 6.1 Separate whole-design preference from attribute-level preference

An overall “Prefer A” means **A is preferable to B as presented**. It does *not* establish that every plant, animal, rock, or piece of equipment in B is disliked. This is especially important when the designs differ in cost, size, upkeep, and appearance simultaneously.

Keep holistic pairwise evidence for ranking complete proposals. When reasons are supplied (e.g., cost, upkeep, plants, hardscape), connect them to the corresponding dimensions. Do not silently turn an overall loss into multiple independent negative attribute labels.

- **Prefer A/B:** relative whole-candidate evidence; update champion per established session rules.
- **Like both:** positive holistic evidence for both; champion behavior unchanged per current session contract.
- **Like neither:** negative holistic evidence for both; broaden the next search and explore a different direction. Do not make arbitrary permanent exclusions.
- **Skip:** no taste evidence and no champion change; advance.
- **Cost/upkeep reason:** learn price/maintenance sensitivity, where attributable, rather than penalizing unrelated fish/plant features.
- **Attribute A/B preference:** explicit, stronger evidence about that *specific attribute*; exactly one learning event, not both a thumb and a like.
- **Lock or Combine:** an action about project design/authorization; not equivalent to a generic taste rating. Respect current semantics and avoid double-counting.

The specific numerical weights should be selected after reviewing the existing model and tests. Prefer clarity and traceable event semantics over hand-tuning many overlapping bonuses.

### 6.2 Replace the old per-attribute thumbs interpretation

The newer product decision is **optional comparative A/B attribute selection**, not independent thumbs-up/down on every attribute. Preserve the compact primary A/B decision and the collapsible details panel. In details, show only meaningfully differing attributes first, each with **A / No opinion / B** (or equivalent). Do not force users to answer every row.

**Separate the actions explicitly:**

- “Prefer B's plants” is a **soft preference**, not a lock or a copy operation.
- “Try B's plants in A” is a **Combine proposal**; it must be validated and approved before being adopted as a candidate.
- “Lock B's plants” is a **persistent constraint**; it controls future proposals until unlocked.
- Turning a tab's shuffle switch off is a **temporary hold**, not a permanent lock.

If the comparative-attribute UI is being implemented in another lane, provide a compatible learning contract here rather than building duplicate UI. Do not introduce a new standalone Discover page.

### 6.3 Targeted improvement hypotheses

When the user chooses A overall but prefers B's plants, the next challenger should **preferentially test** an A-inspired design with a feasible interpretation of B's plant composition. It should preserve what cannot change and recalculate livestock/environment/equipment/cost as required by authorized scope.

Suggested strategy order:

1. Respond to **explicit, recent component preferences** with a feasible targeted challenger.
2. Address **explicit negative feedback** by testing alternatives to the complained-about characteristic, not by globally banning associated species/styles.
3. Explore the **most uncertain meaningful remaining variables** with controlled A/B contrasts.
4. Periodically challenge the prevailing direction with broad exploration while respecting locks and hard constraints.

The DA should not change every enabled variable simply because it may. Shuffle switches define *maximum authorized scope*; refinement can vary only a small subset to create a more informative comparison. A focused challenger should visibly explain its purpose, e.g., “Testing B-inspired planting with A's rocky layout; equipment and cost recalculated.”

If a desired recombination is infeasible, return a reason and permitted alternatives; **never** silently break locks or edit an out-of-scope tab. An explicit Combine operation still requires user review/approval of adjustments.

## 7. Priority 4 — Complete feedback and performance plumbing

- **Cache:** A change only to learned/stated taste should normally rerank already-valid candidate specifications, not force rebuilding every tank. Structural changes (locks, firm constraints, tank/equipment requirements, frozen-tab source, or relevant project state) must invalidate or revalidate affected candidates. Ensure the cache key distinguishes candidate *feasibility context* from *ranking context*.
- **Seen-design history:** Honor exposure history across sessions/reloads when available. Avoid repetitive identical proposals, while permitting an explicit revisit from history.
- **Like neither:** Verify the broaden signal is read by the actual next-pair path, not just written.
- **Undo / reset learned taste:** Either wire the controls into the live A/B state consistently or temporarily hide/disable them. Clearing learned preferences must not clear explicit stated preferences, locks, or saved designs.
- **Inactive code:** Keep the old grid/legacy preference pipeline untouched unless there is a specific migration reason; identify any dead code separately for later cleanup.

## 8. Required acceptance and regression scenarios

Tests should exercise the *live* `nextPair` / browser experience, not just isolated helpers. Use deterministic seeds/fixtures where appropriate, plus a small visual/browser audit.

### Preference correctness

1. **Soft size:** user prefers 20–40 gal; viable 55 gal can still appear (though ranked lower), with no other firm bound.
2. **Hard size:** user imposes firm 20–40 gal; 55 gal never appears.
3. **Soft Avoid:** an avoided archetype ranks lower but remains eligible in broad exploration; a true “Don't want” prohibition filters matching candidates.
4. **All style axes:** Natural, Lush, Colourful/Vivid, Minimal/Ordered, and Stylized preferences have observable, correctly explained effects on eligible candidates; unsupported distinctions do not generate false labels.
5. **Stated over learned:** a few A/B votes do not silently supersede a clear stated preference; only hard requirements prohibit outcomes.
6. **Easy exclusions:** no snails, shrimp, or large animals avoids wasteful invalid roster construction and is enforced again by final validation.

### Candidate quality

7. **Unconstrained first pair:** samples distinct feasible families, not just the first catalogue looks or variations. Compare meaningful visual differences at the same physical scale.
8. **Catalogue-order independence:** reordering otherwise-equivalent look entries does not systematically collapse diversity or starve later families.
9. **Champion refinement:** challengers become more controlled as requirements/preferences strengthen, without auto-switching shuffle checkboxes.
10. **Explore Something Different:** broadens soft preference sampling but never breaks locks, scope, or hard limits.
11. **Size tiers:** larger viable enclosures can yield different stocking philosophies/layouts; do not require animal counts to increase monotonically.
12. **Zero/one/many feasible:** remains explicitly handled without invented pairs.

### Learning and targeted refinement

13. **Whole vote ambiguity:** A wins largely for lower spend; B's plants/hardscape are *not* independently recorded as dislikes.
14. **Economic reasons:** explicit “lower cost” or “less upkeep” informs the relevant practical preference.
15. **Attribute A/B:** “A overall, B's plants” registers one explicit plant preference event, not two, and preferentially yields a feasible A-inspired challenger testing B's planting.
16. **No-opinion attribute:** leaving a row blank records nothing about that attribute.
17. **Locked/out-of-scope dependencies:** targeted changes do not overwrite frozen tabs or locks; infeasible combinations explain the conflict.
18. **Like neither and Skip:** Like neither actually broadens subsequent candidates; Skip advances without taste change.

### State, cache, and UI

19. **Taste update:** voting can rerank compatible cached designs without needlessly regenerating their specs; firm structural changes properly revalidate/invalidate.
20. **Reload:** previously exposed designs are not unintentionally repeated immediately, and history can still reopen them.
21. **Reset learning:** learned preference state resets without losing explicit preferences, locks, history, or saved tank.
22. **Preview isolation:** after multiple pairs, a component preference, Keep/Lock, and Close, the working design and undo state remain intact; Make It Yours commits a proposal as one undoable action.
23. **Desktop/mobile:** the default comparison stays visually dominant; attribute feedback is optional/collapsed and operable at 375 px.
24. **Performance:** measure cold/warm first-pair time, render latency, valid-candidate yield, rejection reasons, pair diversity, and cache reuse. Report tradeoffs rather than only pass/fail.

For any requirement that current model coverage cannot support (e.g., dry-habitat humidity/ventilation), maintain the existing **provisionally feasible / unknown** distinction rather than claiming complete validation.

## 9. Implementation guidance and sequence

**First inspect the current `origin/main` code** and map the live path from quick-preference cards through brief/search to finished candidate, score, pair selection, and session feedback. Identify the precise responsible functions, tests, and current behavior. The handoff refers to the reported build 1767 state, not a guaranteed current checkout.

Recommended order of small, independently testable changes:

1. **Correctness patch:** soft-size filtering; Avoid handling; incorrect aesthetic descriptors/missing axes; attribute double counting. Add focused tests.
2. **Search-quality patch:** bounded stratified candidate pool and better pair selection; diagnostic diversity metrics; candidate construction respects cheap hard exclusions.
3. **Learning/refinement patch:** semantic pairwise updates; practical tradeoff feedback; comparative-attribute contract; targeted challenger strategy.
4. **Stability/performance patch:** cache separation, broaden/reset/history wiring, end-to-end browser and regression tests.
5. **Optional recipe-quality expansion:** additional stocking philosophies and richer size-dependent compositions where existing data supports them; this should not delay the correctness fixes.

For each patch report: changed files, behavior before/after, targeted tests, full-suite status when relevant, cold/warm timings, and a real first-pair plus refinement example with the generated specs and screenshots. Avoid concurrent uncoordinated changes to the same live `pairGen`/scoring/session files; use shared contracts and integrate in order.

## 10. Product-level acceptance demo

Run this scenario using the real onboarding and real A/B screen:

1. Start a new **Freshwater** project. State **Medium**, express interest in a **Lush** archetype, and set **No injected CO₂** as a firm exclusion. Do not manually inject preferences into memory.
2. First A/B pair: two viable, visually distinct planted freshwater designs. Their tank sizes should reflect Medium as a **preference**, not a hidden hard upper/lower bound. Neither has injected CO₂; cost/equipment/upkeep estimates are coherent.
3. User prefers **A overall** but selects **B's Plants** in the optional attribute comparison. No locks are added and the working design remains unchanged.
4. Next challenger intentionally tests feasible B-inspired planting in A's broader design. It explains what it is trying and recalculates equipment/price. If the exact combination is impossible, it produces a credible constrained alternative or explains why.
5. User locks one specific animal group, turns off Hardscape shuffling, and generates again. Every proposal preserves the lock and the held hardscape; other permitted variables can vary.
6. User chooses **Explore Something Different**. It broadens exploration without breaking CO₂ prohibition, locked species, or tab holds.
7. User removes the CO₂ prohibition. Low-tech candidates remain eligible and high-tech candidates now become eligible where justified. No forced all-high-tech selection.
8. User closes Discovery without adopting. Saved working design is unchanged. User then chooses Make It Yours on a valid candidate; it commits as a single undoable design change.

**Important:** Compare both the visual scenes **and the underlying generated specifications**. Do not call a design distinct solely because its metadata differs when the actual 3D pictures look virtually identical.

## 11. Questions requiring a design judgment (not license to silently change scope)

- **How many candidate families before the first pair?** Choose an adaptive bounded strategy using latency and coverage diagnostics, not a fixed universal count imposed without measurement.
- **How should holistic pairwise choices update taste?** Keep evidence conservative and inspectable; do not automatically give every losing component a negative label. Compare a simple baseline with more sophisticated alternatives before committing weights.
- **When does a targeted challenger override general exploration?** Prioritize explicit recent component preferences, but retain deliberate broad challenges and user scope controls. Document any heuristic and show an example.
- **How should an archetype's visual descriptors be computed?** Favor attributes supported by scene/spec data, not imaginary fidelity or a label-only classifier.

Do **not** launch a wholesale DA rewrite. The priority is to make the current implementation behave like the product we already specified.

---

### One-sentence implementation brief

**Keep the existing A/B Discovery experience, but stop letting candidate order and misleading preference signals control it: search a representative feasible space, honor soft-versus-hard intent, and turn explicit component preferences into targeted, validated challengers.**
