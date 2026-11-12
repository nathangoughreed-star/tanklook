# Lane DQ6: evaluate the Discover / Guided / Sandbox redesign against the code (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`; your chat is titled "DQ6: Discover Redesign Evaluation". This lane READS CODE AND WRITES ONE DOC: no source code changes.

## Input
`research/design/discover-redesign-proposal-2026-11-12.md` is Nathan's proposal, pasted 2026-11-12. [User] lines are Nathan's direction. [Assistant] lines are another AI's suggestions and are NOT approved. Keep that distinction everywhere in your output.

## Background (grep by heading; never read HANDOFF.md whole)
- `research/design/da-live-path-map.md` (the live discovery path), `discovery-algorithm-audit-2026-11-11.md`, `discovery-algorithm-fix-plan.md`.
- `research/design/unified-setup-plan.md` (one setup brief in `src/scene/brief.ts`, one feasibility engine), `guided-sandbox-plan.md`, `sandbox-start-and-single-home.md`.
- HANDOFF sections DQ1-DQ5, AB9-AB13, PS1, HM1 and SL2. For the ST1 / FR1 / EQ1 work, use `git log --grep`.
- Code:
  - discovery: `src/ui/discovery/`, `src/ui/discover/`, `src/ui/ab/`, and the generators and scoring the A/B loop calls;
  - shared state: `src/scene/brief.ts`, the scene / editor state and its undo, the Lock / Keep code from AB9 / PS1;
  - checks: `briefFeasibility.ts`, `infeasibleCard.ts`, `pickerStrict.ts`;
  - the Guided and Sandbox entry points.

## Deliverable
Write `research/design/discover-redesign-evaluation-2026-11-12.md`. It answers section 16 of the proposal concretely, with file:line references.
1. **Reuse map:** which generators, scoring, feasibility and lock pieces carry over as they are, which need changes, and which are A/B-only and could be retired.
2. **Partial scenes:** what stops Discover today from generating into a partly finished scene, and what must change.
3. **Feedback model:**
   - a data model for Keep (hard) vs Like / Dislike (soft) at whole-design, category, item and attribute level;
   - where it lives (scene, brief, project or branch);
   - how it maps to the existing DQ1-DQ3 soft / firm preferences and learning.
4. **Regeneration scope and breadth:** how to regenerate broadly or narrowly without touching kept items, and how the feasible space and exploration breadth stay separate.
5. **Guided / Sandbox integration:**
   - one shared design, and how regeneration and the existing checks behave in each mode;
   - the proposal's example of an overcrowded Sandbox tank switched to Guided;
   - what is gated vs informational today.
6. **Not breaking manual editing:** undo (is one generation one undo step?), already chosen gear and animals, saved designs, and AB9 / PS1 preview isolation.
7. **Decisions for Nathan before building:**
   - Take the open questions in section 14. For each, give a recommended answer, the cost of the alternatives, and whether it blocks the first lane.
   - Include only the decisions that change what gets built.
8. **Migration path:**
   - the lowest-risk order of lanes, each a few days at most, with for each: an ID suggestion (DQ7+), the files it touches, and what ships visibly;
   - A/B keeps working until its replacement is live;
   - say which lanes can run in parallel without touching the same files.
9. **Risks:** where the proposal fights the current architecture.

Keep it tight: tables and bullets, and don't restate the proposal. Any question about a screen comes with a screenshot. Use the port from your worktree's launch.json, and stop preview servers when done.

## Done
1. Commit the doc on your branch and rebase on origin/main.
2. Report ONCE to the coordinator with:
   - the branch and sha;
   - the decisions for Nathan, one line each with your recommendation.
3. Don't end a turn with anything running in the background.
