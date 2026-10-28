# One aquarium project, one setup brief (plan v2, 2026-10-28, Coordinator 14)

Sources: Nathan's two pasted design notes, merged here. v1 note = architecture (one brief, entry points pre-fill it, constraints vs preferences vs locks, diverse generator, infeasibility, refinement). v2 note = product stance (discover the vision, adapt to the person, maximize satisfaction, design vs build plan).

## Product definition (use this wording)
TankLook helps you turn your aquarium ideas into reality. Whether you start with a favorite animal, a particular look, an existing tank, or just a budget, it helps you discover what's possible and design a complete, healthy aquarium that fits your space, resources, experience, and lifestyle.

## Principles
1. **Discover, don't require.** "I have $200 and want something cool" is as valid a start as a named fish. Questions exist only when they change the design (progressive discovery).
2. **Welfare is non-negotiable; budget, space and time are constraints; the user's vision is the objective.** Maximize satisfaction inside defensible boundaries. Show the tradeoffs between them instead of hiding them. Welfare is an independent gate (the stocking gates), never a user toggle, never traded for price, never satisfied by swapping a locked animal.
3. **Adapt to the person.** Experience level shapes the COMPLEXITY of concepts and the guidance, never a prohibition (a demanding build can be a great fit for someone who enjoys maintenance, a poor one for 15 min/week). Owned / spare equipment changes what a budget buys.
4. **One project, one brief, many ways in.** Animal / look / existing tank / Sandbox / Suggest all fill the same brief; Sandbox stays zero-question; constraints are available everywhere, mandatory nowhere.
5. **Two product levels.** (a) DESIGN: a tank configuration. (b) BUILD PLAN: what to buy and in what order, what to reuse, what to do first, how to set up and cycle, when to add animals, how to maintain. Level (b) is where the product is most useful ("I think I want an aquarium" -> "I have the one I wanted and know how to keep it thriving").

## Target model
Five input groups, all optional, any order: Animals, Appearance, Tank and equipment, Constraints, Preferences. Each item has a STATUS: hard constraint (budget ceiling, max length, max care time, existing tank; valid solutions must satisfy), preference (ranks valid solutions), locked (generator may not change without asking). Animal welfare is not an item status.
Generator objective: broad candidate pool -> drop invalid (welfare + hard) -> pick the strongest meaningfully DIFFERENT 2-3 concepts (named strategies: size-first / look-first / balanced; with a locked animal: economy / aquascape / equipment quality). Budget is a CEILING: a $145 concept under $200 is not penalised for leaving money unspent; C9's finish ladder stays and only decides how far UP a concept climbs when the user wants to spend more (Nathan approved 2026-10-28). All-in cost incl. tax (editable %, default 0) and necessary supplies. Finished = display-quality baseline (labelled; bare-bottom allowed when chosen), compromises stated, never silently stripped. Infeasible = name the limiting factor + alternatives (raise budget, use owned tank/gear, change species, phased purchase "unstocked until essentials are in"); never silently cut welfare or swap a locked animal. Refinement ("more planted", "larger tank", "I own a filter", "add 6 pygmy corydoras", "cut $40") edits the same brief, keeps locks, recomputes cost + checks, explains the tradeoff.

## Today (code, build 1408)
`src/ui/welcome.ts` tiles (animal/look/sandbox) + Suggest action; `src/demand/suggest.ts` (`Wants` -> `Suggestions`, `USES_BUDGET = 0.85` target); `src/scene/finish.ts` ladder; `builds.ts`, `plan.ts`, `tankfit.ts`; UIs `stockPlan.ts`, `lookPick.ts`, `buildPick.ts`, `ui/suggest.ts`. LANDED: U1 `src/scene/brief.ts` (Brief = {v, items{id: {value, status, off?}}}; adapter briefFromWants/briefToWants; saved as `TankSetup.brief`, per tank, undo-safe). Brief wins over `Constraints.startupUsd` (UI syncs it so the compliance line works).

## Lanes (Sonnet each; max 3 parallel; one merge at a time in the coordinator worktree)
| ID | Lane | State |
|---|---|---|
| U1 | Setup brief model + persistence | DONE, on main (build 1408) |
| U2 | Generator: pool, welfare/constraint filter, diversity, ceiling budget, all-in cost, experience-scaled complexity, owned equipment | running (`local_18d302da`) |
| U3 | UI: brief bar in every entry point, progressive questions (`nextQuestions`), tiles pre-fill, Suggest = "fill in what I left open", experience question, tradeoff display | running (`local_b35381bb`) |
| U4 | Infeasibility as a first-class result + alternatives incl. phased purchase | after U2 |
| U5 | Display-quality baseline vs welfare vs complete setup vs enhancements; transparent compromises (`finish.ts`, `costlines.ts`) | after U2 (parallel with U4) |
| U6 | Continuous refinement chips on the brief | after U2 + U3 |
| U7 | BUILD PLAN: ordered buy list (reuse owned first), setup + cycling steps, when to add animals (stocking in stages), maintenance rhythm; reuse the existing cycling / rhythm / stand / testing rows | after U2; Nathan to say start |
Merge hazards: `src/demand/suggest.ts` (U2, U4, U6; price-audit and terrarium chats), `panels.ts` / `style.css` (U3).

## Open items
- Tax rate source (U2 reports options; default editable %).
- Care time (min/week) has no model yet (field exists; a later lane derives it; feeds U7).
- Terrarium Environment line from land air bands (lane E1, queued; independent).
