# Lane S5: Constraints, Preferences, Suggest in the new shell (Coordinator 24, 2026-11-14; UI2 §7 step 5; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Follow the S1 / S3 / S4 / S7 template: pure view-models in `src/shell/logic/*.ts` with node tests; components only draw them (HANDOFF "S1", "S3", "S4", "S7").

## Read first
- UI2 §2a rows "Section Preferences" and "Section Constraints"; §3 "One home per setting" (all of it) and its Experience row; shot `research/screens/UI2/04-constraints-and-cost.png`; decision 14 (revised).
- HANDOFF "P5" (`capsOf` / `withCaps`, `homeOf` / `setHome`, `roomTempC` / `withRoomTempC`, `profileOf`), "P10" (`demand/experience.ts`: `experienceOf(area)`, `profileSkill()`, the store `tanklook.experience`), "CP1" (Constraints vs Preferences split, R26), "DS1" and "DS3" (the styles and their Preferences cards; the full plan is `research/design/ds1-styles-audit.md`).

## Job (behind ?ui=2 only)
- **Constraints** (the one home of every limit):
  - Money and time: budget, monthly limit, time per week, and **No new equipment** as a spending limit.
  - Space.
  - **Experience** as an optional constraint, off by default. When on, it shows per-area levels (New to it / Some / Experienced) with one answer for all and "More detail" per area. The off state says the difficulty bar uses an average keeper.
  - Your home: room temperature, water source, electricity.
  - "If it does not all fit": Suggest, "Fill in what I left open".
  - Every limit line elsewhere in the shell (e.g. the Equipment heater row "room 70 deg F, edit", or the Cost drawer) links here.
- **Preferences** (looks you like and a don't-want list, R26):
  - **Style cards** with "Surprise me" (DS1 plan P3): one card per look, including the naturalistic styles and the decorative / castle look from DS3, built from the existing archetype / recipe data.
  - Browse looks.
  - The don't-want list.
- **Wire experience gating into Discover and Suggest** (left open by P10): when the switch is on, gated plants (`plantCare.ts`) and gear (`gearCare.ts`) are left out of the Discover / Suggest pools, the same as gated animals. Use P10's `leaveOutGated`. Test it, and pass through the shell's Discover (S10) without editing its components beyond the pool call.
- **Engine calls** go only through P5 / P10 modules and `demand/suggest.ts`. If something is missing, add it there with tests and name it.
- **Your files:**
  - new `src/shell/constraints.tsx`, `prefs.tsx`, `src/shell/logic/{constraints,prefs}.ts` and new tests;
  - the Discover / Suggest pool call sites for gating;
  - registration lines in `App.tsx` / `sections.ts` / `shell.css`.
  - Lane S6 (Equipment) runs at the same time in `src/shell/equipment*`; it links its heater row to your Constraints. Agree the link target as `section 'constraints', group 'home'`.
  - Do not edit `panels.ts`.
- **Proof:**
  - 1600x900 shots next to UI2 shot 04: Constraints with experience off and then on with per-area levels, budget set, Your home; Preferences with style cards, Surprise me and the don't-want list;
  - a Suggest run that respects a $300 budget;
  - a Discover run with experience on (New to it) that leaves out a carpet plant and pressurised CO2;
  - phone shots at 390x844;
  - values set in `?ui=2` read the same in the old UI's cost panel;
  - the old site (no `?ui=2`) unchanged.
