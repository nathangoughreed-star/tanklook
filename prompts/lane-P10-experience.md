# Lane P10: one optional experience constraint (Coordinator 24, 2026-11-14; UI2 §7 P10, decision 14 revised; request R27)

Rules: `prompts/ui-build-common.md` (P lane). Unblocks shell step 5 (Constraints). Read UI2 §3 row "Experience" and §7 row P10 in full (`research/design/ui2-screen-map.md`), plus memory `product-vision.md`.

## The model (Nathan 2026-11-13)
- Experience is ONE **optional constraint, off by default**: "a possible constraint that the user can set if they choose to".
- **Off:** nothing is gated by experience. The difficulty bar and expected losses are computed for an average keeper ("Some") and say so.
- **On:** there are per-area levels (fundamentals, fish, planted, salt; terrarium hidden for aquariums), each New to it / Some / Experienced. One answer sets every area; "More detail" sets each one.
- It gates **animals, plants and gear**: gated items show grey with a one-line why, and Discover / Suggest leave them out. The difficulty bar and losses use the real levels.
- It is stored once per browser (it describes the person, not the tank).

## Job
- Create `src/demand/experience.ts`:
  - the switch, the per-area levels, and storage;
  - `experienceOf(area)`, which returns "no gate" when off;
  - migration:
    - a saved profile with any non-zero `skill` keeps it and turns the switch on;
    - otherwise a scene's `preferences.experience` > 0 sets every area and turns it on;
    - otherwise it stays off;
    - old share links read `preferences.experience` as a fallback for one release.
- Repoint every consumer to `experienceOf(area)`:
  - `whyAnimal` gating;
  - starter / Another moment stocking;
  - Suggest ranking and `experienceNote`;
  - `skillMul` and losses (`demand/engine.ts`);
  - the P2 gate input (`ui/logic/animalPicker.ts`) and the P3 plant gate (`ui/logic/plantGate.ts`), each of which takes one experience parameter.
- Delete brief `preferences.experience` and `layout.expertise` as stored values.
- **Wire the gating data** made by lane CL1:
  - plants: `src/data/plantCare.ts` (per-plant keeper difficulty 1-3);
  - gear: `src/data/gearCare.ts` (per gear kind / type).
  - Plants and gear are gated only when the switch is on.
- **Old UI:** it keeps working with its current controls, now reading and writing the new store. Its experience control sets "one answer for every area". Choose how it maps to the switch so that an old UI user sees the same greying as before for the same setting, and write the mapping in your HANDOFF section.
- **Locked numbers:** the demand / cost tests run with the switch OFF on the examples, so the difficulty and losses for an average keeper must equal today's numbers at `skill` 1 ("Some"). If any locked number moves, stop and report it with the before / after values; do not re-bless.
- **Tests:** `test/p10-experience.test.ts`, covering off = no gate, on per area, the migration cases, the share-link fallback, plant and gear gating, and Discover / Suggest leaving out gated items.
- **Your files:**
  - new `src/demand/experience.ts`;
  - `src/demand/engine.ts`, `demand/suggest.ts` (the experience parts only), `src/ui/demandPanel.ts`;
  - `src/scene/brief.ts`, the `scene/layout` experience fields;
  - `src/ui/logic/animalPicker.ts`, `src/ui/logic/plantGate.ts`;
  - the `whyAnimal` site;
  - save / validate migration.
  - Lane P8 runs at the same time (gear owned / lock: `scene/gearOwn.ts`, ownedGear, techMenu, and the Discover / Suggest owned-lock read). If you both need `demand/suggest.ts`, keep your edit to the experience parts.
- **Proof:**
  - the full set of demand / suggest / stocking / plant tests pass with locked numbers unchanged;
  - before / after shots of the old UI's experience control at each value, with the same animals greyed.
