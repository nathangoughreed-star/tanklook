# One aquarium project, one setup brief (plan, 2026-10-28, Coordinator 14)

Source: Nathan's pasted design note. Goal: "An animal I want", "A look I want", Sandbox and "Suggest a setup" stop being separate workflows. They become different ways to fill in the SAME setup brief; one feasibility engine; several design strategies.

## Today (read from the code, build 1405)
- `src/ui/welcome.ts`: three tiles (animal / look / sandbox) plus a Suggest action; each routes to a different flow.
- `src/demand/suggest.ts` (289 lines): `Wants` in, `Suggestions` out (archetypes x tiers, `USES_BUDGET = 0.85`: budget is a TARGET with a finish tier), `OwnedMap` credits, `Kind` / `Family` / `Tag`.
- `src/scene/finish.ts`: finish tiers (equipment ladder, C9). `builds.ts`, `plan.ts`, `tankfit.ts`: archetype builds, scape, tank fit.
- `src/ui/stockPlan.ts`, `lookPick.ts`, `buildPick.ts`, `suggest.ts`: the separate UIs.

## Target model
Five input groups, all optional, any order: Animals, Appearance, Tank and equipment, Constraints, Preferences.
Each item in the brief carries a STATUS:
- hard constraint (budget ceiling, max length, max care time, existing tank): valid solutions must satisfy;
- preference (ranks valid solutions);
- locked (a chosen animal / tank / look the generator may not change without asking);
- welfare: not user-settable; a feasibility gate (the existing stocking gates: size, environment, fullness, compat).
Brief travels with the project (stocking builder, scape builder, tank picker, Sandbox). Entry points only PRE-FILL it. Sandbox stays zero-question; constraints are available, never mandatory.

## Lanes (Sonnet each; max 3 parallel; one merge at a time via the coordinator worktree)
| ID | Lane | Depends on | Files (main) |
|---|---|---|---|
| U1 | Setup brief model + persistence: `Brief` type (groups, status per item), migrate `Wants` to it, save/load with the project, pure functions + tests, NO UI | none | new `src/scene/brief.ts`, types.ts, suggest.ts (adapter) |
| U2 | Generator: candidate pool -> welfare/constraint filter -> diversity selection (distinct strategies: size-first, look-first, balance; locked items preserved); budget is a CEILING (no penalty for leaving money unspent); all-in cost incl. tax and necessary supplies | U1 | `src/demand/suggest.ts`, `finish.ts`, `builds.ts` |
| U3 | UI: one "setup brief" bar shown in every entry point; progressive questions (ask only what changes the design); entry tiles pre-fill the brief; Suggest becomes "fill in what I left open" | U1 | `welcome.ts`, `ui/suggest.ts`, `stockPlan.ts`, `lookPick.ts`, `buildPick.ts`, `panels.ts` |
| U4 | Infeasibility as a first-class result: name the limiting factor, offer alternatives (raise budget, use existing gear/tank, change species, phased purchase "unstocked until essentials are in"); never silently cut welfare or swap a locked animal | U2 | suggest.ts, ui |
| U5 | Display-quality baseline vs welfare vs complete setup vs enhancements (labels on the cost lines; transparent compromises instead of silently stripping items; bare-bottom allowed when chosen) | U2 | `finish.ts`, `costlines.ts` |
| U6 | Continuous refinement: "more planted", "larger tank", "I own a filter", "add 6 pygmy corydoras", "cut $40": edit the brief/design, keep locks, recompute cost + checks, explain the tradeoff | U2, U3 | ui + suggest.ts |

Order: U1 now. Then U2 and U3 in parallel (disjoint files: engine vs UI). Then U4 and U5 (parallel), then U6.
Known merge hazards: `src/demand/suggest.ts` (U2, U4, U6; also price-audit and terrarium-bundles chats); `panels.ts` / `style.css` (U3, S252 just landed).

## Decision needed from Nathan before U2
Budget semantics. Your note: "the budget is a ceiling, not a target". C9's finish ladder (just shipped, your yes) treats the budget as a TARGET with a finish tier and a "most this kind needs" cap. Proposed reconciliation (my rec): keep the tier ladder but let the generator return candidates that spend LESS (a $145 option is not penalised); the "target" behaviour only decides how far UP a given concept's finish tier climbs when the user says they want to spend it. Needs your yes.

## Open design questions (small)
1. Where does the brief live today? U1 finds out (profile vs project file) and reports; the note wants it with the project, not only in a browser profile.
2. Tax: all-in cost "including tax" needs a rate source (state? zip?). U2 reports options; default = an editable % in the brief.
3. Care time (min/week) has no model yet; U1 adds the field only, a later lane derives it.
