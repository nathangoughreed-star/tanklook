# Lane P8: gear model: owned list, item in use, "use this one for sure" lock (Coordinator 24, 2026-11-14; UI2 §7 P8; request R27)

Rules: `prompts/ui-build-common.md` (P lane: no visible change in the old UI). Unblocks shell step 6 (Equipment) and S3's Owned pill on commercial tank rows.

## Base
Start from branch `claude/p4-tech-edit-units-76710b` (lane P4, not merged yet). It moved gear-choice code into `src/scene/techEdit.ts` and units into `src/units.ts`, and it will be merged before you. Build on it so you don't conflict with it. If P4's code is wrong for you, say so in your report; don't rewrite it.

## The model (Nathan 2026-11-13; UI2 §2a row "Section Equipment", rows 15 / 31 / 146 / 147, shot `research/screens/UI2/05-equipment-heater.png`)
- **Owned:** per gear category (Filter, Heater, Light, CO2, Air, UV, ...; Tank / Stand too), an **owned list** stored in the brief. It means "I have this", not "use it". Owned items cost $0 in the Cost drawer and appear under Print "Already owned".
- **In use:** the item in use per category, which may be owned or bought.
- **Lock:** an independent **"use this one for sure" lock** per item, owned or not. Discover / Suggest / the generator must use a locked item, and prefer owned items (at $0) over buying.

## Job
- Create `src/scene/gearOwn.ts` (no DOM) with the model and its operations: own / unown, set in use, lock / unlock, query by category, and the reads Discover / Suggest / the generator need (`mustUse(category)` and `ownedFor(category)`).
- Fold in `src/scene/ownedGear.ts` `applyOwned` / `syncEquipment` and the owned flags on scene gear. Fold in the Discover Keep / lock for gear items, so there is one lock.
- Discover, Suggest and the generator read the new model. Their output is unchanged for scenes with no owned items or locks.
- **Migration:** old saves, share links and the per-browser "My equipment" list map into the new model, with a round-trip test.
- **Old UI:** `src/ui/ownedGear.ts`, `techMenu.ts` and the Discover keep buttons keep their DOM and call the module; they look and behave the same.
- **Tests:** `test/p8-gear-own.test.ts`, covering each operation, the migration, a locked unowned item that Discover / Suggest must keep, and an owned heater that Suggest picks at $0 over a bought one.
- **Your files:**
  - new `src/scene/gearOwn.ts` and its test;
  - `src/scene/ownedGear.ts`, `src/ui/ownedGear.ts`, `src/scene/tech*.ts`, `src/ui/techMenu.ts`;
  - the Discover / Suggest / generator read sites;
  - save / validate for the brief field.
  - Lane P10 is editing `src/demand/*`, `scene/brief.ts` experience fields and `scene/plantfit.ts` at the same time. If you need `demand/suggest.ts`, keep your edit to the owned / lock read and name it in your report.
- **Proof:**
  - existing gear / owned / discover / suggest / demand tests pass, with locked numbers unchanged;
  - before / after shots of My equipment, the Equipment menu and a Discover run are identical.
