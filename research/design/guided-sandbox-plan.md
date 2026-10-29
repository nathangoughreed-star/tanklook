# New tank: Guided or Sandbox (plan, 2026-10-29, Coordinator 16)

Source: Nathan's "TankLook Product Design Plan" PDF (Oct 2026) + survey of main at build 1486.
Ask: clicking **New** offers two options, **Guided** or **Sandbox**. Close the gaps between the PDF and today's tool.

## Today (build 1486)
- **New** opens the Welcome dialog "What do you have in mind?": four tiles (Animals, Appearance, Tank or equipment,
  I'm open to ideas), a "Your resources and limits" column, "Explore setup ideas", and a small
  "Build manually: an empty tank" link at the bottom right. The older chooser `#startDlg` (scratch / animal / look / deals /
  Suggest, `#startGuided` empty hidden slot) still exists in `src/ui/panels.ts` ~240-310.
- Most of the PDF's engine already exists:
  - **Intent model:** `scene/brief.ts` (`hard` / `preference` / `locked` items, saved per tank).
  - **Candidates:** `demand/suggest.ts`, up to 3 diverse proposals, each with its tradeoff.
  - **Feasibility vs ranking:** welfare gates filter candidates before the score ranks them.
  - **Infeasible handling:** `demand/infeasible.ts` lists verified alternatives instead of substituting.
  - **Costs:** startup and monthly costs, the care rhythm, and the build plan with cycling.

## Gaps vs the PDF
| # | PDF section | Gap today |
|---|---|---|
| 1 | 08 entry prompts | New is not a clean Guided / Sandbox choice: Guided is the default and Sandbox is a footer link; two start dialogs (Welcome + old chooser) coexist. |
| 2 | 01 hard vs flexible; 07 hard vs flexible goals | Budget is a ceiling only: no "target $200" vs "max $200". No "willing to change" per item. |
| 3 | 07 environment | No room temperature (deg F) or tap-water hardness / pH input; `waterSource` sits in the profile, not the brief. |
| 4 | 08 persistent state; 01 decision rule | Open questions, answered questions and the chosen direction live in session memory; lost on reload / share. |
| 5 | 02 live loop; 08 propagation | Suggest does not recompute when the brief or tank changes; no "budget $300 -> $450: now possible" highlights; 20 high -> 20 long does not re-propose. |
| 6 | 05 conflict paths | Alternatives exist but are not framed as the four paths (keep vision / keep limits / keep look / save future ambition); no saved "future ambition"; the animal screen (stockPlan) ignores the budget. |
| 7 | 06 taste; 09.03 preference learning | 12 look tiles, but picks and rejections teach nothing; no seeded variant tiles filtered by cost / care. |
| 8 | 07 setup effort, confidence | `setupHours` unused; care minutes all "assumption"; no validated-vs-provisional badge on cards or plan. |
| 9 | Sandbox itself | No sandbox contract: welfare checks should flag, not block, and must never read as a valid tradeoff. No Guardrails view of the per-item `off` flags. |
| 10 | 09.04 handoff | Mostly done (build plan, cycling, staged stocking). Small: readiness gates per step and one care-commitment summary. Folded into lane 8. |

## Lanes (non-interfering: each owns its files; others add at most a one-line hook and say so)
Order: **NG1, NG2, NG6 now** (3 lanes max). **NG3, NG4, NG5 after NG2 lands** (they read its schema).

| Lane | Closes | Owns (only these) | Done when |
|---|---|---|---|
| **NG1 Entry: Guided / Sandbox** | 1, 9 | `src/ui/startMode.ts` (new), New / Open / chooser block of `src/ui/panels.ts` (~140-310 only), `#welcomeDlg` / `#startDlg` in `index.html`, `src/ui/welcome.ts`, a `.start-mode` block in `src/style.css` | New shows two equal cards, **Guided** (into today's Welcome workspace) and **Sandbox** (empty tank + tank-type picker, all checks shown as flags, never block). Old `#startDlg` retired or folded in; deals and starters become links under Guided. First launch shows the same two cards. Sandbox has a Guardrails view listing the brief `off` flags. Welfare failures always red, labelled "not a valid tradeoff". |
| **NG2 Brief v2 (state)** | 2, 3, 4 | `src/scene/brief.ts`, `src/scene/validate.ts` (`parseBrief`), `src/ui/setupBrief.ts`, `src/ui/welcomeGuard.ts`, `src/ui/briefBar.ts` | Each limit stores `max` vs `target` and "willing to change". New items: room temp (deg F), tap water (source, hardness, pH), desired experience, future ambition (empty slot NG4 fills). Open / answered questions and the chosen direction persist in the brief (save, share, undo). Old saves load unchanged. No engine number moves. |
| **NG6 Effort and confidence** | 8, 10 | `src/demand/effort.ts` (new), `src/demand/rhythm.ts`, `src/demand/buildplan.ts`, `src/ui/buildPlanSheet.ts` | Setup hours derived per build; care min / week derived from rhythm beats; every number carries `validated` or `provisional`; the build plan shows readiness gates per step and one care-commitment line. |
| **NG3 Live loop** (after NG2) | 5 | `src/ui/suggest.ts` (except the infeasible card), `src/demand/suggest.ts`, `src/demand/refine.ts`, `src/demand/propagate.ts` (new) | Brief or tank edits re-run Suggest (debounced), keeping locked picks. A "what changed" strip: "Budget $300 -> $450: 2 upgrades now fit", "20 high -> 20 long: more swim length, 4 more neons". Generator reads target vs max (a target ranks, a max filters). |
| **NG4 Conflict paths** (after NG2) | 6 | `src/demand/infeasible.ts`, `src/ui/infeasibleCard.ts` (new; moved out of ui/suggest.ts with a one-line hook), `src/ui/stockPlan.ts`, `src/ui/stockPlanLogic.ts` | Every conflict offers the four paths, each verified: keep the vision (true tank, gear, $, care), keep the limits (nearest animals keeping the look / behaviour), keep the look (welfare intact), save the ambition (stored in the brief, a smaller project now). The animal screen checks the budget. Never a silent swap. |
| **NG5 Taste** (after NG2) | 7 | `src/demand/taste.ts` (new), `src/ui/lookPick.ts`, `src/scene/looks.ts` | Seeded variant tiles per look, filtered by cost and care. Picks, rejections and refinements write preference weights into the brief. The scorer reads them through a one-line hook at `demand/suggest.ts` ~507 (owned by NG3, coordinate). Shown as "because you picked ...". |

## Collision notes
- `src/ui/panels.ts` (2,426 lines): only NG1 touches it, and only the New / Open / chooser block.
- `index.html` and `style.css`: only NG1, apart from NG5's `.look-*` block in `style.css`.
- `demand/suggest.ts`: owned by NG3, with one hook line from NG5.
- The brief schema is NG2's alone. NG3, NG4 and NG5 start only after it lands.
- No lane moves welfare gates or engine numbers except NG3. NG3 moves only the ranking, with a moved-numbers table and calib regen per the lane rules.
- Gear lanes G1-G3 are also waiting. G1 owns `ui/techMenu.ts` and `ui/gearCard.ts`, and G2 owns `demand/*` pricing. G2 collides with NG3 and NG6 on `demand/`, so run G2 after them or split by file.
