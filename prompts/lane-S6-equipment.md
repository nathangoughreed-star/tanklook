# Lane S6: Equipment and Lighting in the new shell (Coordinator 24, 2026-11-14; UI2 §7 step 6; request R27)

Rules: `prompts/ui-build-common.md` (shell lane). Follow the S1 / S3 / S4 / S7 template (HANDOFF "S1", "S3", "S4", "S7").

## Base
Branch `origin/claude/p8-gear-own-lock-v2` (P8, being merged to main now). Reset your branch to it before you start; if P8 lands on main first, it's the same commits.

## Read first
- UI2 §2a row "Section Equipment"; inventory rows 15, 31, 146, 147; mockup `research/screens/UI2/05-equipment-heater.png` (Nathan approved: "Yes, matches").
- HANDOFF "P4" (`scene/techEdit.ts`, `src/units.ts`), "P8" (`scene/gearOwn.ts`: owned list, in use, lock; Discover locks via the PS1 store), "HD1" (hoods are real products with their light built in), "GM8" (suction mounts) as needed.

## Job (behind ?ui=2 only)
- **Equipment section:**
  - the preset ladder (Walstad ... high-tech) at the top;
  - then **one sub-menu per category** (Filter, Heater, Light, CO2, Air, UV, ...; saltwater adds its own).
- **Each category** has two groups:
  - an **I own** group (the owned list; owned costs $0 and doesn't mean in use);
  - a **Buy** group (catalogue products and generic types that fit this tank).
  - The item **in use** is marked.
  - An independent **"Use this one for sure" lock** per item, owned or not, sits on the item's row (a design edit with undo; P8).
  - Each row has a one-line fit / why.
- **Lighting:** the light products, hoods with built-in lights (HD1), and the light map / PAR view (it starts closed).
- **Heater row:** shows room temperature read-only ("room 70 deg F, edit") and links to Constraints > Your home (lane S5 builds it: target `section 'constraints', group 'home'`).
- **Tank section follow-up from S3:** the **Owned** pill on commercial tank rows (P8's owned list for Tank / Stand). Touch only that row in `src/shell/tank.tsx`.
- **Engine calls** go only through P4 `techEdit.ts`, P8 `gearOwn.ts` and `src/units.ts`. If something is missing, add it there with tests and name it.
- **Your files:**
  - new `src/shell/equipment.tsx`, `lighting.tsx`, `src/shell/logic/{equipment,lighting}.ts` and new tests;
  - the Owned pill in `tank.tsx`;
  - registration lines in `App.tsx` / `sections.ts` / `shell.css`.
  - Lane S5 (Constraints / Preferences) runs at the same time.
  - Do not edit `panels.ts` or `techMenu.ts`.
- **Proof:**
  - 1600x900 shots next to UI2 shot 05: Equipment > Heater with I own / Buy and one locked item;
  - Filter and Light (with a hood);
  - the light map;
  - the preset ladder applied;
  - the Owned pill on a commercial tank row;
  - phone shots at 390x844;
  - gear chosen in `?ui=2` shows the same in the old UI's Equipment menu;
  - the old site (no `?ui=2`) unchanged.
