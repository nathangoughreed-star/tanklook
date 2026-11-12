# Discover / Guided / Sandbox redesign proposal (2026-11-12)

Pasted by Nathan to Coordinator 23 on 2026-11-12. It summarizes Nathan's discussion with another AI. Tags: [User] = Nathan's own direction. [Assistant] = the other AI's suggestion, NOT approved unless Nathan confirms it. Nothing here is decided yet.

## 1. Product vision
[User] YourArium bridges what a user already has or envisions and a complete, feasible, healthy, good-looking habitat. A user may arrive with nothing; an existing tank or enclosure; particular animals, plants or equipment; a general look; an almost-finished design; or no plan to build anything real (pure experiment). One continuous workflow, not separate incompatible ones. Budget, maintenance time, experience, equipment and welfare stay relevant throughout.
[Shared] A continuum from fully manual to fully automatic, the user choosing how much help they get.

## 2. Three functions
[User] **Discover**: can be switched on or off at any point. It fills the gap between what the user has and a finished habitat, from any start (nothing -> full habitat; existing tank -> stocking, hardscape, plants, equipment; tank + stocking -> layout + remaining equipment; nearly done -> the last pieces).
[User] **Guided**: one of two manual modes. The user picks; YourArium checks choices against declared constraints, feasibility, welfare and compatibility.
[User] **Sandbox**: the other manual mode, switchable with Guided. Free building, experiments, deliberately unrealistic designs.
[Assistant] Discover is not a third exclusive mode: two independent axes, (1) manual rules Guided / Sandbox, (2) automation Discover usable at any time.
[Shared] Switching between manual editing and generation never loses work.

## 3. Replacing the A/B discovery
[Existing] Today Discovery shows two candidate habitats; comparative votes teach preferences and pick the next candidates.
[User, under serious consideration, NOT confirmed] Scrap A/B and return to iterative generation:
1. Discover generates a habitat from the existing selections and constraints.
2. The user marks what to retain; those elements are locked.
3. Discover generates again, keeping them.
4. As more is retained the design space shrinks.
5. Repeat until satisfied. Must work for a first full habitat and for filling one missing section.
[Assistant] Preferable to A/B as the main interaction: every action advances the real design, works with pre-existing items, preferences come from actual decisions, it unifies generate / customize / complete.

## 4-5. Feedback: Keep this / Like / Dislike
[User] Three contextual actions on each element: **Keep this**, **Like**, **Dislike** (replacing the other AI's Locked / Preferred / Unlocked).
- Keep = hard constraint. [Assistant] Kept items are never silently dropped or replaced unless the user releases them.
- Like = soft positive; steers toward similar features; does NOT mean Keep.
- Dislike = soft negative; steers away; not a permanent category ban (disliking one rock arrangement does not ban rocky scapes).
[Assistant] The three are not mutually exclusive: keep a driftwood piece, dislike its placement, like the overall style.

## 6. Granularity [Assistant]
Feedback at several levels: whole habitat; category (enclosure, inhabitants, plants, hardscape, substrate, equipment, overall layout / look); individual component; attribute or relationship (like the material, dislike the position; keep the animal, dislike the count). Distinguish an object from its attributes.

## 7. Convergence
[User] Early generations are free; as items are kept and preferences pile up, the space narrows.
[Assistant] Keep the feasible space separate from exploration breadth: keeping a 40 gal breeder, a school and one driftwood still allows very different layouts. Proposed Explore / Remix / Refine, ideally one breadth control (not approved).
[Shared] Loop: Generate -> Keep -> Like / Dislike -> Regenerate -> Repeat. Each pass adds kept decisions, improves the preference model, or completes unspecified parts. Earlier decisions stay revisitable.

## 8. Discover any time
[User] Usable at any point however much is designed.
[Assistant] Works on the existing design, not a separate start flow. Example actions (not final): Finish my setup; Fill this section; Show alternatives; Full regeneration. Generation is deliberate, never on every edit.

## 9. Guided and Sandbox share one design [Assistant]
Switching keeps the habitat, selections and preferences. Guided separates genuine welfare / feasibility failures, borderline cases, and recommendations; not every suboptimal choice is a hard gate. Sandbox stays free, with non-blocking feasibility info. Example: an overcrowded Sandbox tank switched to Guided shows the violations and offers fixes; nothing is deleted until the user acts.

## 10. Conflicts during Discover [Assistant]
Kept 20 gal tank + kept Oscar: detect, explain which constraints conflict, offer specific fixes, let the user choose, never silently break kept decisions. OPEN: what Discover does when launched from Sandbox (creative freedom vs a setup presented as fit for real animals).

## 11. A/B comparison
[User] Possibly remove entirely.
[Assistant, optional] Keep an optional 2-3 candidate comparison (pick one, save several, branch), without mandatory repeated voting.

## 12. Architecture [Assistant synthesis]
A. One persistent habitat design shared by manual and automatic operations (enclosure + layout, inhabitants, plants, hardscape + substrate, equipment, constraints, preferences).
B. Guided / Sandbox setting for manual edits.
C. Discover engine: reads the habitat, kept selections, constraints, likes / dislikes; decides which parts are open; generates full or partial alternatives; applies feasibility.
D. Feedback state: hard (kept items, fixed equipment, explicit requirements) vs soft (likes, dislikes). Never conflated.
E. Exploration control (UI undecided).

## 13. Principles
[User] Discover any time; full creation and gap filling; Guided and Sandbox are the two manual behaviors; keep what you like, regenerate the rest; Keep / Like / Dislike; progressive narrowing; (under consideration) replace A/B with iterative generation.
[Assistant] Discover as a capability not a mode; Guided default with easy Sandbox; hard vs soft separate; feedback at several levels; feasibility separate from breadth; preserve the habitat across mode switches; never silently override kept choices; consider optional multi-candidate comparison.

## 14. Open questions
1. Regeneration scope: every unkept element, or only the area being worked on?
2. Keep semantics: identity, quantity, geometry, placement, or some of those; how shown without clutter?
3. Feedback semantics: which characteristics of a liked / disliked item caused it?
4. Preference persistence: project, design branch, or user profile; how long?
5. Breadth: explicit modes, slider, or inferred?
6. Each generation: replaces the current one, optional comparison, or a recoverable version?
7. Discover in Sandbox: always biologically defensible, or may it generate unrealistic setups?
8. Conflict resolution when kept items clash and one fix needs several changes.
9. How Keep / Like / Dislike are presented for whole designs vs individual fish, plants, gear, layout details.
10. Removing A/B: keep any of its preference learning internally, or rebuild around direct feedback on a persistent design?

## 15. Recommended direction [Assistant, not confirmed]
Discover becomes a persistent, constraint-aware refinement system inside the normal editor: start from any amount of information; generate what is missing; show it in the editor; Keep / Like / Dislike at suitable levels; kept = hard; feedback steers; regenerate unkept parts in the remaining feasible space; repeat; manual editing any time under Guided or Sandbox. The design itself is the workspace, not a separate destination with a questionnaire first.

## 16. What Claude is asked to do
Evaluate this against the current implementation, especially the A/B discovery system and the shared scene / editor state:
- which generation capabilities can be reused;
- what must change for Discover to work on partly finished scenes;
- how to represent kept components and scoped positive / negative feedback;
- how to support broad and narrow regeneration without breaking kept choices;
- how to integrate regeneration with Guided / Sandbox and the existing feasibility checks;
- how to avoid disrupting manual editing, undo, and already chosen equipment and inhabitants;
- which decisions must be settled before implementation;
- the lowest-risk migration path.
Don't treat every [Assistant] recommendation as approved; Nathan's proposals are the main direction. Goal: a coherent, intuitive, technically defensible architecture for free exploration, progressively constrained generation and manual building in one workflow.
Central principle: the user specifies as much or as little as they want; YourArium fills the remaining gaps; the user shapes the result by direct editing, keeping, and feedback.
