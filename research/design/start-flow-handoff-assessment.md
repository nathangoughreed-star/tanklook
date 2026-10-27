# Assessment: "TankLook UX & Constraint-Solving Handoff" against the live code (2026-10-27)

Input: `TankLook_UX_Product_Handoff_for_Claude.md` (Nathan: intended direction, not a mandate; keep what the app already
does well). Read against main at build 1336 and against research/design/start-flow.md (sections a-h, R, Revisions 2-3).
No code changed. Answers the handoff's section 11 in its own order.

## 1. Current-state mapping

| Handoff concept | Status | Where (files) / what is missing |
|---|---|---|
| Three entry points (animals / look / sandbox) | **Partial** | Animals: built end to end (ui/stockPlan.ts, ui/buildPick.ts, scene/builds.ts, scene/tankfit.ts, ui/scapePick.ts). Sandbox: = New > Start from scratch (ui/startEntries.ts). Look: no entry; styles reachable only after a build (scene/scapes.ts `scapeSetup` needs a Build). No Welcome screen. |
| "Suggest a setup" (discovery as an action) | **Missing** | Pieces: demand engine, `fitToLimits` (demand/fit.ts), `buildsFor`, examples/*.json. No generator, no archetypes. |
| Existing owner = Sandbox reconstruction | **Supported** | Any scene can be built and assessed; nothing auto-corrects it. Missing only "credit owned gear" (below). |
| Constraints menu, independent toggles | **Partial** | Values exist: `UserProfile.limits` {setupUsd, upkeep 'free'/'low'/'flex', minPerWeek, risk} (demand/types.ts), edited in ui/demandPanel.ts; bars in demand/cost.ts `limitState`. No per-constraint on/off (a value is on when set), upkeep is a 3-step word, not $/mo. |
| Startup $ / monthly $ | **Supported** (as numbers) | demand/engine.ts `demandOf` totals, prices.json with sources + `est` flags, kWh, livestock losses. |
| Setup time (hours) | **Missing** | No data, no model. |
| Maintenance min/week | **Supported** | engine.ts work rows; every minute figure is provenance status `assumption` (research/minutes-a-week.md). |
| Daily frequency, occasional long tasks | **Missing** | Weekly mean only; yearly jobs averaged in (`yearlyJobsMinPerWeek`). The start-flow spec's Chore cadence (d) is the design. |
| Effort / complexity | **Partial** | Risk score (`riskScore`, skill-scaled) and `plantDifficulty`; no "obligations" list (daily tasks, CO2, salt mixing). |
| Experience (advisory) | **Supported** (advisory) | `UserProfile.skill` per domain scales risk (`skillMul`); nothing is gated by it today. |
| Space (max footprint) | **Supported** | scene/space.ts, "Set my space" on ui/fullnessTile.ts; TankSetup `space` (optional field, no version bump). |
| Existing resources / owned gear | **Missing** | Only deal / gear-deal pins (demand/pinned.ts `pinTank`, demand/gearDeals.ts `pinGear`), which pin a purchase, not ownership. |
| Locks (species, dimensions, gear, aesthetic) | **Missing** | No lock fields; deal pins are the nearest pattern. |
| Evaluate all enabled constraints at once | **Partial** | `limitState` computes all four bars together; `fitToLimits` greedy over swaps checks all limits. No single "within your constraints" verdict. |
| Hard limits vs targets | **Missing** | Limits are display bars; nothing distinguishes hard from target. |
| Violation -> "Find solutions", valid mitigations | **Partial** | `swapsFor` / `applySwap` (demand/swaps.ts: animal / plant swaps and removals, with deltas on all four bars), `fitToLimits`, the fork card's step-up sizes (ui/stockPlan.ts). No gear / tech-row levers, no Pareto filter, no "needs relaxing" group. |
| Honest "no feasible solution" | **Missing** | `fitToLimits` returns what is still over (`left`) but no relaxation figures. |
| Husbandry warnings never switchable | **Supported** | Five categories (ui/stockSummary.ts), tank minimum (scene/tankMin.ts), compatibility, herp checks; none tied to limits. |
| Unknown = incomplete, not green | **Supported** (stocking) | stockSummary `CatLevel 'unknown'` ("Not enough information"); S250 unknown-compat lane. Demand totals have no unknown state. |
| Right-hand assessment panel | **Partial** | The facts exist in several places: demand panel, fullness tile, stocking summary, plan sheet (ui/planSheet.ts). No single compact panel. |
| Versions / duplicate, before-after compare | **Partial** | Split view = two independent tanks A / B (store.ts `splitTank`, undoable), tankDiff (ui/diff.ts), deal drift (`changedParts`). Saved tanks in the Open menu. No named versions in one project. |
| Constraints + locks persist with the project | **Missing** | Limits live in the browser profile (localStorage, demandPanel.ts KEY), not in the scene or share link. |

## 2. Minimal architecture (no rewrite) and reconciliation with my spec

Three layers, each with one home:
1. **Project state** = `Store.scene` (scene/store.ts; every mutation through `update()`, one undo history). Unchanged.
2. **Constraint state** = new optional `TankSetup.constraints` (per tank, so a split copies it and A / B compare under the
   same limits): `{ setupUsd?, upkeepUsdMo?, minPerWeek?, space? (already exists, moved under it later), on: {...}, locks: {...} }`.
   Optional field, no version bump (precedent: `space`, `dealPin`, `gearPins`). `UserProfile.limits` becomes the
   *default* for a new project only; `UserProfile.skill` stays per person (experience is about the person).
3. **Assessment** = the existing pure, memoised functions over a TankSetup (`stockingMemo`, `demandOf`, `tankMinimum`,
   `stockSummary`, `buildSheet`). One new pure function `compliance(S, constraints, P)` -> per enabled constraint
   {value, limit, ok | over | unknown} + husbandry verdict from stockSummary, kept as two separate lists (never merged into a score).
4. **Candidates** = new demand/makefit.ts: `findSolutions(S, constraints, P, lastChange)` -> {compliant[], needsRelaxing[]},
   each candidate a scene diff re-assessed with the same functions. Run **on demand** ("Find solutions" click), not on every edit.

**What the handoff changes in my spec** (start-flow.md):
- Welcome: three tiles (animals / look / start empty) + a **Suggest a setup** button (on Welcome and in the builder
  header), replacing my four tiles with Discover as a path. Discover's generator and screens (d) stand, now as that action.
- **Guided / Sandbox mode toggle: gone** (already retired in my section R). "Guidance intensity" is presentation only:
  in v1 nothing to set, the warning line is quiet and "Find solutions" is a button.
- **Constraints persist with the project**, not in the profile (changes R: "profile, not scene").
- **Experience is advisory only**: no greying by experience (changes R, which gated species / gear above the level).
  Effort: v1 advisory (an obligations list), not a cap.
- **No live grey-out in pickers in v1** (changes Revision 3's "one search, three uses"): the search runs on demand;
  pickers show a badge from the cheap per-option delta only. The search stays shared by Find solutions and Suggest a setup.
- **Evaluate my setup** (c) folds into the assessment panel; its "starting point" baseline is the split view (A = as is,
  B = the change) with tankDiff and the demand delta, so `brief.evalBase` is dropped.
- Unchanged: trade-off options as a Pareto set, every option showing all enabled constraints, welfare separate and not
  tradeable, smallest concessions when nothing fits, the rhythm model, Create a look's tiles-first entry.

## 3. Dependencies, technical limits, assumptions to validate

What the models actually represent (checked in code):
| Lever | Represented? | Mechanism in the engine |
|---|---|---|
| Bigger filter | **Not credited for time** (correct) | nitrogen.ts: filter size raises ammonia capacity only (`FILTER_BOOST_MAX` +50 %); water-change share comes from the nitrate budget (`waterChangeFraction`, scene/stocking.ts). Matches the handoff's rule. |
| Live plants | Yes | take up to 60 % of the animals' TAN; cut the water-change share; never add space. |
| Fewer / smaller animals | Yes | stocking + nitrogen + demand rows. |
| Water-change hose | Yes (assumption) | tech row `wcmethod`: lower per-gal and fixed minutes. |
| Automatic feeder | Yes, weekly only | feeding 3.5 -> refill 0.3 min / wk (sourced notes). Daily-attention benefit **not** modelled (needs Chore cadence). |
| Misting system, ATO | Yes (assumption) | net minutes; ATO risk -0.2. |
| Automatic water changer | **Absent** | needs a researched tech row (price, install time, inspection minutes, water / power). Model gap; do not offer. |
| Owned gear credit | **Absent** | needs `locks.owned` parts priced at $0 setup. |
| Setup hours, cycling weeks | **Absent** | research (start-flow d, lane L4). |

Assumptions to validate before relying on them: (a) `parseScene` keeps an unknown optional TankSetup field through save,
load and share link (round-trip test in lane C1); (b) `demandOf` + `stockingMemo` cost per candidate is small enough for
~50 candidates per click (measure in C3); (c) most minute figures are `assumption`: candidates that win only on minutes must
say "estimate" (handoff: "do not make up exact time benefits"); (d) `upkeep` 'free' / 'low' maps to $ / mo via
`FACTORS.limits` — the move to a number must keep current users' setting.

## 4. Staged plan (smallest end-to-end slice first)

Slice = C1 + C2 + C3: edit -> limit exceeded -> real mitigation -> all limits rechecked.

| # | Lane | Files | Done when | Size |
|---|---|---|---|---|
| C1 | Constraint state | scene/types.ts, new scene/constraints.ts, validate.ts (if needed), demandPanel.ts (reads / writes it; profile = default), test | toggles + values per tank; save / load / share round-trip; split copies them; old profile values become a new project's defaults | S |
| C2 | Compliance line | new `compliance()` in scene/constraints.ts, demandPanel.ts, header chip in panels.ts | "Within your constraints" only when every enabled one passes on known data; "1 over: 45 / 30 min a week"; unknown shown as unknown; welfare line separate; all off = numbers only | S-M |
| C3 | Find solutions v1 | new demand/makefit.ts, small card in ui/ | levers: undo last change, fewer of the last-added or another species (swapsFor), hose, auto feeder, next tank size; each re-checked on ALL enabled constraints + stockSummary (no new problem); Pareto filter; compliant vs "needs +$X / +N min"; acceptance scenarios 5-7, 9, 10 of handoff s.9 as tests | M |
| C4 | Welcome: 3 entries + Suggest a setup button | new ui/welcome.ts, startEntries.ts, main.ts, index.html, style.css | start-flow lane L1, adjusted to three tiles; Suggest a setup shows "coming soon" | S |
| C5 | Locks + owned gear | constraints.ts, makefit.ts, Animals / Tank / Tech menus (lock icon) | solver never changes a locked item; owned parts cost $0; "no viable plan" when locks forbid | M |
| C6 | Research: maintenance cadence, setup hours, auto water changer (no code) | research/maintenance/* | start-flow L4 + an auto water-change row with sources | M |
| C7 | Chore cadence + rhythm | demand/engine.ts, types.ts | start-flow L5; feeder credits daily attention separately | M |
| C8 | Concessions | makefit.ts | "keep $500 and allow 45 min, or keep 30 min and spend ~$650" | S-M |
| C9+ | Suggest a setup, Create a look, named versions | start-flow L6-L8; versions = named saved splits | after C1-C3 hold | M each |

C1 then C2 then C3 are sequential (same files); C4 and C6 run beside them (disjoint files).

## 5. Decisions for Nathan (high impact only)

1. **Name: "Design Constraints" or "Guardrails"?** Rec: **Guardrails** in the UI (short, friendly, your word), "constraints" in code.
2. **Constraints per project or per person?** Rec: **per project** (handoff; travels with the share link and the A / B
   split), with your last-used values as the default for a new project.
3. **V1 hard limits:** Rec: startup $, monthly $, minutes a week, space as hard caps; experience and effort advisory only;
   setup hours and daily rhythm after research (C6-C7). Targets later.
4. **How a violation shows:** Rec: a noticeable line in the panel + header chip turning amber, with a **Find solutions**
   button; no auto-opening card (handoff: no constant pop-ups). This replaces my Revision 2's card that opens on the edit.
5. **"Firm" locks on guardrails:** Rec: not in v1. Every enabled limit is hard; options that need a limit raised are
   listed separately as "needs +$X". Add firm vs flexible only if users ask which one to relax.
